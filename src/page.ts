/**
 * `Page` — one play page inside a `Playbook`.
 *
 * Extracted from `playbook.ts` because the build logic is a ~160-line component
 * with three pieces of mutable state (`currentImage`, `currentVideoLink`,
 * `videoEditorOpen`) and two sections that rebuild themselves in place
 * (`renderImage` / `renderVideoSection`). Folding it into a class turns the
 * former closure variables into fields and the former closures into methods, so
 * the state and the rebuilds it drives sit next to each other instead of being
 * threaded through a long constructor-style function.
 *
 * The book stays the owner of page navigation and the connected field; a `Page`
 * only knows how to render itself and (when a field is wired) load its moves
 * back into that field via Initialize Play.
 */

import { createButton, createDiv } from './dom.js';
import type { MoveName, Position } from './types.js';
import { POSITIONS } from './types.js';
import type { PlayDisplayer } from './displayer.js';

/** Intrinsic pixel dimensions for play images — also the 4:3 aspect the CSS letterboxes to. */
export const PAGE_IMAGE_WIDTH = 400;
export const PAGE_IMAGE_HEIGHT = 300;

export interface PageConfig {
  /** Initial image source (`data:` or `https:` URL), or `null` for the placeholder. */
  image: string | null;
  title: string;
  /** Initial video URL, or `null` for none. */
  videoLink: string | null;
  /** Move assignments in `POSITIONS` order, or `null` when the page isn't field-connected. */
  moves: MoveName[] | null;
  /**
   * Whether the page renders per-page edit affordances (Add/Replace image,
   * Add/Edit video link). User-saved plays are editable; developer-added ones
   * are read-only.
   */
  editable: boolean;
  /** Connected field, used by the Initialize Play button. `null` = no button. */
  field: PlayDisplayer | null;
  /**
   * Hand back the unsubscribe handle for the playback subscription the page
   * registers on the field, so the book can release it on `destroy()` (the
   * field outlives the book in shared setups, so a dangling sub would pin
   * every detached page).
   */
  registerFieldSub?: (unsub: () => void) => void;
}

export class Page {
  /** Root element to attach into a book slot. */
  readonly element: HTMLDivElement;

  private currentImage: string | null;
  private currentVideoLink: string | null;
  private videoEditorOpen = false;

  private readonly title: string;
  private readonly editable: boolean;

  private readonly imageSection: HTMLDivElement;
  private readonly videoSection: HTMLDivElement;
  private imageEditBtn: HTMLButtonElement | null = null;

  constructor(config: PageConfig) {
    this.title = config.title;
    this.editable = config.editable;
    this.currentImage = config.image;
    this.currentVideoLink = config.videoLink;

    const page = createDiv('page-content');
    this.element = page;

    // --- Image section ---
    this.imageSection = createDiv('page-image-section');
    page.append(this.imageSection);
    this.renderImage();

    // --- Title ---
    const pageTitle = createDiv('page-title');
    pageTitle.innerText = config.title;
    page.append(pageTitle);

    // --- Actions row ---
    const actions = createDiv('page-actions');
    page.append(actions);

    // Initialize Play (when there's a connected field and move data)
    if (config.field && config.moves) {
      const initBtn = createButton('link-button', 'Initialize Play');
      const field = config.field;
      const moves = config.moves;
      initBtn.addEventListener('click', (e) => {
        e.preventDefault();
        field.setFieldName(this.title);
        for (let i = 0; i < POSITIONS.length; i++) {
          const pos = POSITIONS[i] as Position;
          field.setMove(pos, moves[i] ?? 'none');
        }
      });
      actions.append(initBtn);
      // Lock during animation — a wholesale state swap mid-flight would
      // visibly snap players around. Hand the unsubscribe handle to the owner
      // so it can release the sub on teardown.
      const unsub = field.onPlaybackStateChange((state) => {
        initBtn.disabled = state === 'playing';
      });
      config.registerFieldSub?.(unsub);
    }

    // Video section — link / "+ Add video" / inline URL editor
    this.videoSection = createDiv('page-video-section');
    actions.append(this.videoSection);
    this.renderVideoSection();

    // Image upload affordance (editable pages only) — hidden file input
    // triggered by a visible button, FileReader → data: URL so no backend needed.
    if (config.editable) {
      const imageEditBtn = createButton(
        'page-edit-btn',
        this.currentImage ? 'Replace image' : '+ Add image',
      );
      this.imageEditBtn = imageEditBtn;

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.setAttribute('aria-label', 'Upload play image');
      fileInput.hidden = true;

      fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (): void => {
          // readAsDataURL always yields a string; guard instead of casting so a
          // surprise ArrayBuffer can't slip a non-string into the <img src>.
          if (typeof reader.result !== 'string') return;
          this.currentImage = reader.result;
          this.renderImage();
          imageEditBtn.textContent = 'Replace image';
        };
        reader.readAsDataURL(file);
        // Reset so re-picking the same file still fires change.
        fileInput.value = '';
      });

      imageEditBtn.addEventListener('click', () => fileInput.click());
      actions.append(imageEditBtn, fileInput);
    }
  }

  private renderImage(): void {
    this.imageSection.replaceChildren();
    if (this.currentImage) {
      const img = document.createElement('img');
      img.className = 'page-image';
      img.src = this.currentImage;
      img.alt = this.title;
      img.width = PAGE_IMAGE_WIDTH;
      img.height = PAGE_IMAGE_HEIGHT;
      img.loading = 'lazy';
      img.decoding = 'async';
      this.imageSection.append(img);
    } else {
      const placeholder = createDiv('page-image-placeholder');
      placeholder.textContent = this.editable ? 'No image yet' : 'No image';
      this.imageSection.append(placeholder);
    }
  }

  private renderVideoSection(): void {
    this.videoSection.replaceChildren();

    if (this.videoEditorOpen) {
      const editor = createDiv('page-video-editor');

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'YouTube URL';
      input.value = this.currentVideoLink ?? '';
      input.setAttribute('aria-label', 'Video URL');

      const save = createButton('page-edit-btn-primary', 'Save');
      save.addEventListener('click', () => {
        this.currentVideoLink = input.value.trim() || null;
        this.videoEditorOpen = false;
        this.renderVideoSection();
      });

      const cancel = createButton('page-edit-btn', 'Cancel');
      cancel.addEventListener('click', () => {
        this.videoEditorOpen = false;
        this.renderVideoSection();
      });

      editor.append(input, save, cancel);
      this.videoSection.append(editor);
      queueMicrotask(() => input.focus());
      return;
    }

    if (this.currentVideoLink) {
      const link = document.createElement('a');
      link.href = this.currentVideoLink;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'link-button';
      link.textContent = 'Open Video';
      this.videoSection.append(link);
    }

    if (this.editable) {
      const label = this.currentVideoLink ? 'Edit link' : '+ Add video link';
      const editBtn = createButton('page-edit-btn', label);
      editBtn.addEventListener('click', () => {
        this.videoEditorOpen = true;
        this.renderVideoSection();
      });
      this.videoSection.append(editBtn);
    }
  }
}

/**
 * Build a static intro page (cover / instructions) — image-only, no title,
 * actions, or edit affordances. `altText` is the image's alt text. Used for the
 * opt-in `seedPages`.
 */
export function buildDefaultPage(imageUrl: string, altText: string): HTMLDivElement {
  const page = createDiv('page-content');
  const img = document.createElement('img');
  img.className = 'page-image';
  img.src = imageUrl;
  img.alt = altText;
  img.width = PAGE_IMAGE_WIDTH;
  img.height = PAGE_IMAGE_HEIGHT;
  img.loading = 'lazy';
  img.decoding = 'async';
  page.append(img);
  return page;
}
