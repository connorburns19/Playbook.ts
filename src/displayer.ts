/**
 * `PlayDisplayer` — top-down rendering of an offensive formation with animatable players.
 *
 * V2 changes from V1:
 *   - ES class instead of constructor function + prototype assignment
 *   - One `setMove(position, name)` method replaces 11 hardcoded `setLTEMove`/etc.
 *   - Per-position state stored in a `players: Record<Position, PlayerSlot>` map
 *     instead of 22 sibling fields on the instance (`ltemove`, `ltename`, etc.)
 *   - jQuery `.animate()` → Web Animations API (see `animation.ts`)
 *   - Strict TypeScript, no `any`
 */

import { animateInSequence, resetAnimation } from './animation.js';
import { createDiv, createOption, mountInto } from './dom.js';
import { getMove, getMoveCatalog } from './moves.js';
import type { FieldSize, MoveName, MoveStep, Position } from './types.js';
import { POSITIONS, POSITION_LABELS } from './types.js';

export interface PlayDisplayerOptions {
  size: FieldSize;
  name: string;
  parentId?: string | null;
}

/** Internal per-position state: the DOM node plus the currently-assigned move. */
interface PlayerSlot {
  element: HTMLDivElement;
  moveName: MoveName;
  steps: MoveStep[];
}

export class PlayDisplayer {
  readonly size: FieldSize;
  readonly name: string;
  /** Outer wrapper for the field UI. Mounted under the parent passed to the constructor. */
  readonly root: HTMLDivElement;
  /** The header element above the field (shows the current play name). */
  readonly fieldTop: HTMLDivElement;

  private readonly players: Record<Position, PlayerSlot>;

  constructor(options: PlayDisplayerOptions);
  constructor(size: FieldSize, name: string, parentId?: string | null);
  constructor(
    sizeOrOptions: FieldSize | PlayDisplayerOptions,
    name?: string,
    parentId?: string | null,
  ) {
    const opts: PlayDisplayerOptions =
      typeof sizeOrOptions === 'string'
        ? { size: sizeOrOptions, name: name ?? '', parentId: parentId ?? null }
        : sizeOrOptions;

    this.size = opts.size;
    this.name = opts.name;

    const sizeSuffix = opts.size === 'large' ? '-large' : '';

    // Header
    this.fieldTop = createDiv(`field-top${sizeSuffix}`);
    this.fieldTop.innerText = this.name;

    // Field rows
    const field = createDiv(`field${sizeSuffix}`);
    const frontLine = createDiv(`front${sizeSuffix}`);
    const middleLine = createDiv(`mid-back${sizeSuffix}`);
    const backLine = createDiv(`mid-back${sizeSuffix}`);

    // Build a slot for each position
    const players: Partial<Record<Position, PlayerSlot>> = {};
    for (const pos of POSITIONS) {
      const el = createDiv(`player${sizeSuffix}`);
      el.id = `${pos}${this.name}`;
      el.innerText = `\n${POSITION_LABELS[pos]}`;
      players[pos] = { element: el, moveName: 'none', steps: [] };
    }
    this.players = players as Record<Position, PlayerSlot>;

    // Place players into formation rows
    const frontPositions: Position[] = ['lte', 'lt', 'lg', 'c', 'rg', 'rt', 'rte'];
    const backPositions: Position[] = ['lhb', 'fb', 'rhb'];
    for (const pos of frontPositions) frontLine.append(this.players[pos].element);
    middleLine.append(this.players.qb.element);
    for (const pos of backPositions) backLine.append(this.players[pos].element);

    field.append(frontLine, middleLine, backLine);

    // Play / Reset buttons
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.innerText = 'Play Animation';
    playBtn.addEventListener('click', () => {
      void this.playAnimation();
    });

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.innerText = 'Reset';
    resetBtn.addEventListener('click', () => {
      this.reset();
    });

    field.append(playBtn, resetBtn);

    // Outer wrapper
    this.root = document.createElement('div');
    this.root.append(this.fieldTop, field);

    mountInto(this.root, opts.parentId);
  }

  /** Set the move assignment for a position. Pass `'none'` to clear. */
  setMove(position: Position, move: MoveName): void {
    if (move === 'none') {
      this.players[position].moveName = 'none';
      this.players[position].steps = [];
      return;
    }
    const m = getMove(move, this.size);
    if (m) {
      this.players[position].moveName = move;
      this.players[position].steps = m.steps;
    } else {
      // Unknown move name — treat as none, matching V1 behavior.
      this.players[position].moveName = 'none';
      this.players[position].steps = [];
    }
  }

  /** Get the current move name assigned to a position. */
  getMove(position: Position): MoveName {
    return this.players[position].moveName;
  }

  /** Update the title shown above the field. */
  setFieldName(name: string): void {
    this.fieldTop.innerText = name;
  }

  /** Animate all positions through their currently-assigned moves. */
  async playAnimation(): Promise<void> {
    await Promise.all(
      POSITIONS.map((pos) => {
        const slot = this.players[pos];
        return slot.steps.length > 0
          ? animateInSequence(slot.steps, slot.element)
          : Promise.resolve();
      }),
    );
  }

  /** Cancel all animations and return players to their starting positions. */
  reset(): void {
    for (const pos of POSITIONS) {
      resetAnimation(this.players[pos].element);
    }
  }

  /**
   * Spawn a sandbox UI below the field — dropdowns for every position so the end user
   * can compose their own animation. If `allowSave`, also adds a "Set Custom Name" input
   * that updates the field header (used to label plays before saving them to a `Playbook`).
   */
  spawnSandbox(allowSave: boolean = false, parentId?: string | null): HTMLDivElement {
    const shell = createDiv(this.size === 'large' ? 'sandbox-large' : 'sandbox');

    const form = document.createElement('form');
    form.className = 'forms2';
    form.id = `sandboxform${this.name}`;

    const catalog = getMoveCatalog(this.size);
    const selects: Partial<Record<Position, HTMLSelectElement>> = {};

    for (const pos of POSITIONS) {
      const label = document.createElement('label');
      label.innerText = `${POSITION_LABELS[pos]}: `;
      label.htmlFor = `select-${pos}-${this.name}`;

      const select = document.createElement('select');
      select.id = `select-${pos}-${this.name}`;
      select.name = POSITION_LABELS[pos];

      select.append(createOption('none'));
      for (const move of catalog) {
        select.append(createOption(move.name));
      }

      form.append(label, select);
      selects[pos] = select;
    }

    const confirmBtn = document.createElement('input');
    confirmBtn.type = 'submit';
    confirmBtn.value = 'Confirm Animations';
    form.append(confirmBtn);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      for (const pos of POSITIONS) {
        const sel = selects[pos];
        if (sel) this.setMove(pos, sel.value as MoveName);
      }
      this.setFieldName('Sandbox');
    });

    shell.append(form);

    if (allowSave) {
      const nameForm = document.createElement('form');
      nameForm.className = 'forms2';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Name of play';

      const setNameBtn = document.createElement('input');
      setNameBtn.type = 'submit';
      setNameBtn.value = 'Set Custom Name';

      nameForm.append(nameInput, setNameBtn);
      nameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.setFieldName(nameInput.value);
      });

      shell.append(nameForm);
    }

    mountInto(shell, parentId);
    return shell;
  }
}

