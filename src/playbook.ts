/**
 * `Playbook` — flippable two-page book of plays, optionally wired to a `PlayDisplayer`.
 *
 * V2 changes from V1:
 *   - ES class instead of constructor function + prototype assignment
 *   - Renamed from `playBook` → `Playbook` (PascalCase)
 *   - Reads field state via the displayer's typed `getMove(position)` API instead of
 *     the V1 pattern of manually checking 11 `field.ltemove[0]` fields with confusing
 *     "undefined?" logic
 *   - Page navigation rewritten — uses references to currently-displayed pages instead
 *     of removing `lastChild` (which broke when an odd-numbered book left an empty right slot)
 *   - Strict TypeScript, no `any`
 */

import { createButton, createDiv, createInput, mountInto } from './dom.js';
import type { MoveName } from './types.js';
import { POSITIONS } from './types.js';
import type { PlayDisplayer } from './displayer.js';

export interface PlaybookOptions {
  title: string;
  field?: PlayDisplayer | null;
  allowSave?: boolean;
  parentId?: string | null;
}

// Default V1 placeholder images, preserved for parity.
const DEFAULT_COVER_IMAGE = 'https://i.ibb.co/hyx1q6c/playbook.png';
const DEFAULT_INSTRUCTIONS_IMAGE = 'https://i.ibb.co/7YhctXj/instructions.png';
const SAVED_PLAY_PLACEHOLDER_IMAGE = 'https://i.ibb.co/cbrDg02/grey.png';

export class Playbook {
  readonly title: string;
  readonly field: PlayDisplayer | null;
  readonly allowSave: boolean;
  /** Outer container appended to the parent at construction time. */
  readonly root: HTMLDivElement;

  private readonly pages: HTMLDivElement[] = [];
  private currentPageIndex = 0;
  private readonly leftSlot: HTMLDivElement;
  private readonly rightSlot: HTMLDivElement;
  private currentLeft: HTMLDivElement | null = null;
  private currentRight: HTMLDivElement | null = null;

  constructor(options: PlaybookOptions);
  constructor(
    title: string,
    field?: PlayDisplayer | null,
    allowSave?: boolean,
    parentId?: string | null,
  );
  constructor(
    titleOrOptions: string | PlaybookOptions,
    field?: PlayDisplayer | null,
    allowSave?: boolean,
    parentId?: string | null,
  ) {
    const opts: PlaybookOptions =
      typeof titleOrOptions === 'string'
        ? {
            title: titleOrOptions,
            field: field ?? null,
            allowSave: allowSave ?? false,
            parentId: parentId ?? null,
          }
        : titleOrOptions;

    this.title = opts.title;
    this.field = opts.field ?? null;
    this.allowSave = opts.allowSave ?? false;

    // Seed with the V1 cover + instructions pages so the book is never empty.
    this.pages.push(buildDefaultPage(DEFAULT_COVER_IMAGE));
    this.pages.push(buildDefaultPage(DEFAULT_INSTRUCTIONS_IMAGE));

    const container = createDiv('pages-container');

    // --- Left page ---
    this.leftSlot = createDiv('page-item');
    const leftTaskbar = createDiv('task-bar');
    const backBtn = createButton('left-button', 'Back');
    leftTaskbar.append(backBtn);

    if (this.field && this.allowSave) {
      const saveBtn = createButton('save-button', 'Save Custom Play to book');
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.saveFieldStateAsPage();
      });
      leftTaskbar.append(saveBtn);
    }

    const titleLeft = createDiv('title');
    titleLeft.innerText = this.title;
    leftTaskbar.append(titleLeft);
    this.leftSlot.append(leftTaskbar);
    container.append(this.leftSlot);

    // --- Right page ---
    this.rightSlot = createDiv('page-item');
    const rightTaskbar = createDiv('task-bar');
    const titleRight = createDiv('title');
    titleRight.innerText = this.title;
    rightTaskbar.append(titleRight);
    const forwardBtn = createButton('right-button', 'Forward');
    rightTaskbar.append(forwardBtn);
    this.rightSlot.append(rightTaskbar);
    container.append(this.rightSlot);

    // Mount initial pair
    this.renderCurrentPages();

    // Navigation
    forwardBtn.addEventListener('click', () => this.goForward());
    backBtn.addEventListener('click', () => this.goBack());

    this.root = container;
    mountInto(container, opts.parentId);
  }

  /**
   * Append a new play to the book. If a `field` is connected and `moves` is provided,
   * an "Initialize Play" button is added that loads those moves back into the field.
   */
  addPage(
    image: string,
    title: string,
    videoLink?: string | null,
    moves?: MoveName[] | null,
  ): void {
    const page = createDiv('page-content');

    const img = document.createElement('img');
    img.className = 'page-image';
    img.src = image;
    img.alt = title;
    page.append(img);

    const pageTitle = createDiv('page-title');
    pageTitle.innerText = title;
    page.append(pageTitle);

    if (videoLink) {
      const linkContainer = createDiv('link-button-container');
      const linkBtn = createButton('link-button', 'Open Video');
      const anchor = document.createElement('a');
      anchor.href = videoLink;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.append(linkBtn);
      linkContainer.append(anchor);
      page.append(linkContainer);
    }

    if (this.field && moves) {
      const initBtn = createButton('link-button', 'Initialize Play');
      initBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const f = this.field;
        if (!f) return;
        f.setFieldName(title);
        for (let i = 0; i < POSITIONS.length; i++) {
          const pos = POSITIONS[i]!;
          const moveName = moves[i] ?? 'none';
          f.setMove(pos, moveName);
        }
      });
      page.append(initBtn);
    }

    this.pages.push(page);

    // If the new page lands on the currently-visible right slot, render it now.
    if (this.currentPageIndex === this.pages.length - 2 && !this.currentRight) {
      this.currentRight = page;
      this.rightSlot.append(page);
    }
  }

  /**
   * Spawn a form below the book that lets the end user enter image/title/link and
   * save them as a new play. If a field is connected, its current move state is
   * captured and stored on the page.
   */
  allowUserCreatePlays(parentId?: string | null): HTMLDivElement {
    const formbox = createDiv('form-box');

    const formTitle = createDiv('form-title');
    formTitle.innerText = 'Save Custom Play';
    formbox.append(formTitle);

    const form = document.createElement('form');
    form.className = 'forms';
    form.id = 'addPlayForm';

    const titleInput = createInput('text', 'Name of play');
    const imageInput = createInput('text', 'Link to image');
    const linkInput = createInput('text', 'Link to video');

    const submit = document.createElement('input');
    submit.type = 'submit';
    submit.value = 'Add Play';

    form.append(titleInput, imageInput, linkInput, submit);
    formbox.append(form);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const moves = this.field ? this.snapshotFieldMoves() : null;
      this.addPage(imageInput.value, titleInput.value, linkInput.value || null, moves);
    });

    mountInto(formbox, parentId);
    return formbox;
  }

  // --- internals ---

  private snapshotFieldMoves(): MoveName[] {
    if (!this.field) return POSITIONS.map(() => 'none');
    return POSITIONS.map((pos) => this.field!.getMove(pos));
  }

  private saveFieldStateAsPage(): void {
    if (!this.field) return;
    const moves = this.snapshotFieldMoves();
    const title = this.field.fieldTop.innerText || 'Untitled Play';
    this.addPage(SAVED_PLAY_PLACEHOLDER_IMAGE, title, null, moves);
  }

  private renderCurrentPages(): void {
    this.currentLeft?.remove();
    this.currentRight?.remove();
    this.currentLeft = this.pages[this.currentPageIndex] ?? null;
    this.currentRight = this.pages[this.currentPageIndex + 1] ?? null;
    if (this.currentLeft) this.leftSlot.append(this.currentLeft);
    if (this.currentRight) this.rightSlot.append(this.currentRight);
  }

  private goForward(): void {
    // Pages display in pairs. Only advance if at least one new page exists.
    if (this.currentPageIndex + 2 > this.pages.length - 1) return;
    this.currentPageIndex += 2;
    this.renderCurrentPages();
  }

  private goBack(): void {
    if (this.currentPageIndex - 2 < 0) return;
    this.currentPageIndex -= 2;
    this.renderCurrentPages();
  }
}

function buildDefaultPage(imageUrl: string): HTMLDivElement {
  const page = createDiv('page-content');
  const img = document.createElement('img');
  img.className = 'page-image';
  img.src = imageUrl;
  page.append(img);
  return page;
}
