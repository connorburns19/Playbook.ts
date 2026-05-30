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
import { POSITIONS, POSITION_LABELS, POSITION_FULL_NAMES } from './types.js';

export interface PlayDisplayerOptions {
  size: FieldSize;
  name: string;
  parentId?: string | null;
}

/**
 * Monotonic source of unique suffixes for sandbox element IDs. A `<label>`'s
 * `htmlFor` must match its `<select>`'s `id`, and those ids must be unique
 * across the whole document. V1 derived them from the user-supplied `name`,
 * which collides when two displayers share a name (or both are `''`) — two
 * `<label for="select-qb-">` then point at the first matching select. A
 * module counter sidesteps the name entirely (same approach as `layout.ts`).
 */
let sandboxIdCounter = 0;

/**
 * Playback lifecycle:
 *   - 'idle'    — nothing has played since the last reset (Reset hidden,
 *                 controls free, Play enabled).
 *   - 'playing' — `play()` in flight (Reset visible, dropdowns and
 *                 Initialize Play locked, Play disabled).
 *   - 'played'  — last animation completed successfully (Reset visible,
 *                 controls free, Play enabled).
 *
 * Transitions:
 *   idle    → playing   (via play())
 *   playing → played    (animation Promise.all resolves)
 *   playing → idle      (Reset cancels the animation → Promise rejects)
 *   played  → idle      (Reset)
 *   played  → playing   (Play pressed again)
 */
export type PlaybackState = 'idle' | 'playing' | 'played';

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
  /**
   * `<select>` elements from any sandboxes spawned for this displayer.
   * `setMove` writes back to these so Initialize Play / programmatic state
   * changes keep the sandbox UI in sync. Array because more than one
   * sandbox could conceivably be spawned per displayer.
   */
  private readonly sandboxSelectGroups: Array<Partial<Record<Position, HTMLSelectElement>>> = [];

  /** Current playback state — see `PlaybackState` for the lifecycle. */
  private _playbackState: PlaybackState = 'idle';
  /** Subscribers to playback state transitions (Play/Reset UI, dropdowns, Initialize Play). */
  private readonly playbackSubs: Array<(state: PlaybackState) => void> = [];
  /** Subscribers to "any move assignment changed" — separate from playback state. */
  private readonly movesSubs: Array<() => void> = [];
  /** Most recent in-flight `play()` Promise, so re-entrancy returns the same one. */
  private currentPlayPromise: Promise<void> | null = null;

  /**
   * The responsive ResizeObserver, kept so `destroy()` can disconnect it.
   * `null` when ResizeObserver isn't available (SSR / old browsers).
   */
  private resizeObserver: ResizeObserver | null = null;
  /**
   * Sandbox shells spawned for this displayer, removed from the DOM on
   * `destroy()`. They're mounted into arbitrary parents (their own `parentId`),
   * so the displayer has to track them to tear them down.
   */
  private readonly sandboxes: HTMLDivElement[] = [];
  /** Set once `destroy()` runs so the instance is inert and the call is idempotent. */
  private destroyed = false;

  constructor(options: PlayDisplayerOptions) {
    this.size = options.size;
    this.name = options.name;

    const sizeSuffix = options.size === 'large' ? '-large' : '';

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
      // Stable hook for tests/consumers. (V1 set an `id` of `${pos}${name}`
      // here for jQuery `$('#lte' + name)` lookups; V2 holds the element
      // reference directly, so an id is dead weight — and a name-derived id
      // collides across instances. A data attribute carries no uniqueness
      // contract, so it's safe to repeat.)
      el.dataset.position = pos;
      // Plain label — CSS handles centering via flex.
      el.textContent = POSITION_LABELS[pos];
      // a11y: full position name for screen readers (avoids the SR reading "LTE" as letters).
      el.setAttribute('aria-label', POSITION_FULL_NAMES[pos]);
      el.setAttribute('role', 'img');
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

    // Play / Reset buttons in their own controls bar below the field.
    const controls = createDiv('pb-controls');
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.textContent = 'Play Animation';
    playBtn.addEventListener('click', () => {
      // Swallow the rejection from cancel (Reset hit mid-play). The state
      // machine has already flipped to 'idle' by the time we get here, so
      // the UI is consistent; surfacing the AbortError as an unhandled
      // rejection would just spam the console.
      this.play().catch(() => {
        /* cancelled — state already reset */
      });
    });

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => {
      this.reset();
    });

    controls.append(playBtn, resetBtn);

    // Wire Play / Reset to the playback state machine + moves signal.
    // Play disables for two independent reasons:
    //   1. mid-animation ('playing' state)         — prevent re-trigger
    //   2. no positions have any moves assigned    — nothing to play
    // The combined rule + a contextual `title` make the lockout feel
    // intentional rather than broken.
    const updatePlayDisabled = (): void => {
      const playing = this._playbackState === 'playing';
      const noMoves = !this.hasAnyMoves;
      playBtn.disabled = playing || noMoves;
      // Only surface the "set a move first" hint when that's actually
      // why Play is locked — during animation, the disabled state is
      // self-evident from the run itself, so leave the title clean.
      playBtn.title = !playing && noMoves ? 'Set a move using a dropdown first' : '';
    };
    this.onPlaybackStateChange((state) => {
      updatePlayDisabled();
      // visibility (not display) so the controls row doesn't reflow when
      // Reset appears — Play stays exactly where it was.
      resetBtn.style.visibility = state === 'idle' ? 'hidden' : 'visible';
    });
    this.onMovesChange(updatePlayDisabled);

    // Responsive stage: holds field-top + field at their natural pixel
    // dimensions; scaled-to-fit by a ResizeObserver below (see styles.css
    // for the matching --pb-field-scale custom property).
    const stage = createDiv('pb-field-stage');
    stage.dataset.size = options.size;
    const stageInner = createDiv('pb-field-inner');
    stageInner.append(this.fieldTop, field);
    stage.append(stageInner);

    // Outer wrapper
    this.root = createDiv('pb-displayer');
    this.root.dataset.size = options.size;
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', `Play displayer: ${this.name || 'unnamed'}`);
    this.root.append(stage, controls);

    mountInto(this.root, options.parentId);

    // Keep `--pb-field-scale` in sync with the stage's actual width so the
    // inner (at natural pixel dimensions) visually fills the available space.
    // Capped at 1 so we never upscale beyond natural size.
    const naturalWidth = options.size === 'large' ? 854 : 1220;
    const applyScale = (): void => {
      const w = stage.clientWidth;
      if (w > 0) {
        const scale = Math.min(w / naturalWidth, 1);
        stageInner.style.setProperty('--pb-field-scale', String(scale));
      }
    };
    applyScale(); // synchronous initial pass (forces layout via clientWidth)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(applyScale);
      this.resizeObserver.observe(stage);
    }
  }

  /** Set the move assignment for a position. Pass `'none'` to clear. */
  setMove(position: Position, move: MoveName): void {
    if (move === 'none') {
      this.players[position].moveName = 'none';
      this.players[position].steps = [];
    } else {
      const m = getMove(move, this.size);
      if (m) {
        this.players[position].moveName = move;
        this.players[position].steps = m.steps;
      } else {
        // Unknown move name. Keep V1's "treat as none" so a bad name can't
        // crash a render, but surface it — silently blanking the player is how
        // a typo like the old 'pass-1b' stayed hidden. The MoveName type makes
        // this branch unreachable for typed callers; it fires for values cast
        // through `as MoveName` (sandbox <select>, JSON import, etc.).
        console.warn(
          `[playbook] setMove(${position}, "${move}"): unknown move name; treating as 'none'.`,
        );
        this.players[position].moveName = 'none';
        this.players[position].steps = [];
      }
    }
    // Sync any sandbox dropdowns associated with this displayer so external
    // setMove() callers (Initialize Play, programmatic state changes) don't
    // leave the UI showing stale values. Assigning to `select.value`
    // doesn't fire a 'change' event, so this can't loop.
    const synced = this.players[position].moveName;
    for (const group of this.sandboxSelectGroups) {
      const sel = group[position];
      if (sel && sel.value !== synced) {
        sel.value = synced;
      }
    }

    // Notify "moves changed" subscribers (Play button uses this to enable
    // itself once at least one position has a move).
    for (const cb of this.movesSubs) cb();
  }

  /**
   * Has any position got a non-empty move sequence? Used by the Play button
   * to decide whether to disable itself ("nothing to play yet" state).
   */
  get hasAnyMoves(): boolean {
    for (const pos of POSITIONS) {
      if (this.players[pos].steps.length > 0) return true;
    }
    return false;
  }

  /**
   * Subscribe to "any setMove call." Fires once immediately on registration
   * (so the subscriber can sync), then again after every `setMove`. Returns
   * an unsubscribe function. Separate from `onPlaybackStateChange` because
   * the two signals have independent lifecycles.
   */
  onMovesChange(cb: () => void): () => void {
    this.movesSubs.push(cb);
    cb();
    return () => {
      const i = this.movesSubs.indexOf(cb);
      if (i >= 0) this.movesSubs.splice(i, 1);
    };
  }

  /** Get the current move name assigned to a position. */
  getMove(position: Position): MoveName {
    return this.players[position].moveName;
  }

  /** Update the title shown above the field. */
  setFieldName(name: string): void {
    this.fieldTop.innerText = name;
  }

  /** Current playback state (idle / playing / played). */
  get playbackState(): PlaybackState {
    return this._playbackState;
  }

  /**
   * Subscribe to playback state transitions. The callback fires once
   * immediately with the current state (so the subscriber can sync its UI
   * on registration), then again on every transition. Returns an
   * unsubscribe function.
   */
  onPlaybackStateChange(cb: (state: PlaybackState) => void): () => void {
    this.playbackSubs.push(cb);
    cb(this._playbackState);
    return () => {
      const i = this.playbackSubs.indexOf(cb);
      if (i >= 0) this.playbackSubs.splice(i, 1);
    };
  }

  private setPlaybackState(state: PlaybackState): void {
    if (this._playbackState === state) return;
    this._playbackState = state;
    for (const cb of this.playbackSubs) cb(state);
  }

  /**
   * Animate every position through its currently-assigned move. Returns a
   * Promise that resolves when all per-player chains finish painting, or
   * rejects with `AbortError` if `reset()` cancels the run mid-flight.
   *
   * Re-entrant: calling `play()` while one is already running returns the
   * in-flight Promise rather than starting a second overlapping animation
   * (the UI's Play button is disabled during 'playing' anyway, but this
   * keeps programmatic callers safe too).
   */
  play(): Promise<void> {
    if (this._playbackState === 'playing' && this.currentPlayPromise) {
      return this.currentPlayPromise;
    }

    this.setPlaybackState('playing');

    // We use Promise.all over per-player promises rather than computing
    // max(per-player duration) with setTimeout. The async function chain
    // inside `animateInSequence` already tracks each player's completion
    // via `Animation.finished`, which correctly handles reduced-motion,
    // skipped no-op steps, cancellation, and frame-accurate timing — all
    // four of which a duration timer would get wrong.
    const promise = (async () => {
      try {
        await Promise.all(
          POSITIONS.map((pos) => {
            const slot = this.players[pos];
            return slot.steps.length > 0
              ? animateInSequence(slot.steps, slot.element)
              : Promise.resolve();
          }),
        );
        this.setPlaybackState('played');
      } catch (err) {
        // Cancellation path: `reset()` cancelled the running animations,
        // which made the awaited `Animation.finished` Promise reject with
        // AbortError. State is already 'idle' (set by `reset()`'s call to
        // `setPlaybackState`), so we just propagate the error to the
        // caller. Click handler swallows it; `await field.play()` callers
        // can catch as needed.
        this.setPlaybackState('idle');
        throw err;
      } finally {
        this.currentPlayPromise = null;
      }
    })();

    this.currentPlayPromise = promise;
    return promise;
  }

  /**
   * Cancel any running animations and return players to their starting
   * positions. Also transitions state to 'idle' so the Reset button hides
   * itself and any dropdowns / Initialize Play buttons re-enable.
   */
  reset(): void {
    for (const pos of POSITIONS) {
      resetAnimation(this.players[pos].element);
    }
    this.setPlaybackState('idle');
  }

  /**
   * Spawn a sandbox UI below the field — dropdowns for every position so the end user
   * can compose their own animation. Reactive: each select change is applied immediately,
   * no Confirm step. When `allowSave`, also renders a name input whose `input` event
   * updates the field header live (used as the default play name when saving to a `Playbook`).
   */
  spawnSandbox(
    allowSave: boolean = false,
    parentId?: string | null,
    saveButton?: HTMLElement | null,
  ): HTMLDivElement {
    const shell = createDiv(this.size === 'large' ? 'sandbox-large' : 'sandbox');

    const grid = createDiv('forms2');

    const catalog = getMoveCatalog(this.size);
    // Unique per spawnSandbox call so label/select id pairs never collide —
    // even with multiple sandboxes or same-named displayers on one page.
    const uid = String((sandboxIdCounter += 1));

    // Register this sandbox's selects with the displayer so external state
    // changes (e.g. Initialize Play loading a saved play) push back into them.
    const selectsForThisSandbox: Partial<Record<Position, HTMLSelectElement>> = {};
    this.sandboxSelectGroups.push(selectsForThisSandbox);

    for (const pos of POSITIONS) {
      const label = document.createElement('label');
      label.innerText = `${POSITION_LABELS[pos]}: `;
      label.htmlFor = `pb-select-${pos}-${uid}`;

      const select = document.createElement('select');
      select.id = `pb-select-${pos}-${uid}`;
      select.name = POSITION_LABELS[pos];
      // Stable, collision-free hook for querying a specific position's select.
      select.dataset.position = pos;

      select.append(createOption('none'));
      for (const move of catalog) {
        select.append(createOption(move.name));
      }

      // Reflect current displayer state on initial render.
      select.value = this.players[pos].moveName;

      // Reactive: apply the move immediately when the user picks one.
      select.addEventListener('change', () => {
        this.setMove(pos, select.value as MoveName);
      });

      selectsForThisSandbox[pos] = select;
      grid.append(label, select);
    }

    // Lock dropdowns while an animation is running — changing a move
    // mid-flight overwrites the transform target and visibly jumps the
    // player. Name input + Save to Book stay enabled.
    this.onPlaybackStateChange((state) => {
      const disabled = state === 'playing';
      for (const pos of POSITIONS) {
        const sel = selectsForThisSandbox[pos];
        if (sel) sel.disabled = disabled;
      }
    });

    shell.append(grid);

    if (allowSave) {
      // Reactive name input — typing updates the field header live, no "Set" button.
      const nameWrap = createDiv('pb-sandbox-rename');

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Name this play';
      nameInput.setAttribute('aria-label', 'Play name');

      nameInput.addEventListener('input', () => {
        this.setFieldName(nameInput.value);
      });

      nameWrap.append(nameInput);
      if (saveButton) nameWrap.append(saveButton);
      shell.append(nameWrap);
    }

    mountInto(shell, parentId);
    this.sandboxes.push(shell);
    return shell;
  }

  /**
   * Tear down this displayer: cancel any in-flight animation, disconnect the
   * ResizeObserver, drop every subscription, and remove the field + any
   * spawned sandboxes from the DOM. Idempotent — safe to call twice (e.g.
   * React StrictMode's double-invoke or a re-entrant unmount).
   *
   * After `destroy()` the instance is inert; don't call `setMove`/`play` on it.
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // Cancel running animations + clear transforms (also flips state to 'idle',
    // notifying subscribers one last time before we drop them).
    this.reset();

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    // Drop subscriptions so retained callbacks (and whatever they close over)
    // can be garbage-collected. Includes the per-sandbox playback subs.
    this.playbackSubs.length = 0;
    this.movesSubs.length = 0;
    this.sandboxSelectGroups.length = 0;

    // Remove spawned sandboxes, then the field itself.
    for (const shell of this.sandboxes) shell.remove();
    this.sandboxes.length = 0;
    this.root.remove();
  }
}

