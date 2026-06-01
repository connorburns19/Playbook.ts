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
import { createDiv, createOption, mountInto, queryRequired } from './dom.js';
import { FIELD_NATURAL_WIDTH, getMove, getMoveCatalog } from './moves.js';
import type { FieldSize, MoveName, MoveStep, PlayDisplayerSSROptions, Position } from './types.js';
import { POSITIONS, POSITION_LABELS, POSITION_FULL_NAMES } from './types.js';

export interface PlayDisplayerOptions {
  size: FieldSize;
  name?: string;
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

/** Bag of element references shared between the build and adopt paths. */
interface FieldRefs {
  root: HTMLDivElement;
  fieldTop: HTMLDivElement;
  players: Record<Position, PlayerSlot>;
  stage: HTMLDivElement;
  stageInner: HTMLDivElement;
  playBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
}

export class PlayDisplayer {
  readonly size: FieldSize;
  readonly name: string | undefined;
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

    // The `_hydrateRoot` property is a private convention used by the static
    // `hydrate()` factory — it is never part of the public `PlayDisplayerOptions` type.
    const hydrateRoot = (options as PlayDisplayerOptions & { _hydrateRoot?: HTMLElement })
      ._hydrateRoot;

    const refs = hydrateRoot ? this.adoptRefs(hydrateRoot) : this.buildRefs();
    this.root = refs.root;
    this.fieldTop = refs.fieldTop;
    this.players = refs.players;

    this.wire(refs.playBtn, refs.resetBtn);

    if (!hydrateRoot) mountInto(this.root, options.parentId);

    this.setupResizeObserver(refs.stage, refs.stageInner);
  }

  // ---------------------------------------------------------------------------
  // Build path — creates fresh DOM (the default, non-SSR path)
  // ---------------------------------------------------------------------------

  private buildRefs(): FieldRefs {
    const sizeSuffix = this.size === 'large' ? '-large' : '';

    // Header
    const fieldTop = createDiv(`field-top${sizeSuffix}`);
    fieldTop.dataset.pbRole = 'field-top';
    fieldTop.textContent = '';

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
      const labelSpan = document.createElement('span');
      labelSpan.textContent = POSITION_LABELS[pos];
      el.appendChild(labelSpan);
      // a11y: full position name for screen readers (avoids the SR reading "LTE" as letters).
      el.setAttribute('aria-label', POSITION_FULL_NAMES[pos]);
      el.setAttribute('role', 'img');
      players[pos] = { element: el, moveName: 'none', steps: [] };
    }

    // Place players into formation rows
    const frontPositions: Position[] = ['lte', 'lt', 'lg', 'c', 'rg', 'rt', 'rte'];
    const backPositions: Position[] = ['lhb', 'fb', 'rhb'];
    for (const pos of frontPositions) frontLine.append(players[pos]!.element);
    middleLine.append(players.qb!.element);
    for (const pos of backPositions) backLine.append(players[pos]!.element);

    field.append(frontLine, middleLine, backLine);

    // Play / Reset buttons in their own controls bar below the field.
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.textContent = 'Play Animation';
    playBtn.dataset.pbControl = 'play';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.textContent = 'Reset';
    resetBtn.dataset.pbControl = 'reset';

    const controls = createDiv('pb-controls');
    controls.append(playBtn, resetBtn);

    // Responsive stage: holds field-top + field at their natural pixel
    // dimensions; scaled-to-fit by a ResizeObserver (see styles.css for the
    // matching --pb-field-scale custom property).
    // Seed with scale:1 so the renderer and the build path both start from
    // the same baseline; setupResizeObserver overwrites this once clientWidth
    // is available.
    const stage = createDiv('pb-field-stage');
    stage.dataset.size = this.size;
    stage.dataset.pbRole = 'stage';

    const stageInner = createDiv('pb-field-inner');
    stageInner.dataset.pbRole = 'inner';
    stageInner.setAttribute('style', '--pb-field-scale:1');
    stageInner.append(fieldTop, field);
    stage.append(stageInner);

    // Outer wrapper
    const root = createDiv('pb-displayer');
    root.dataset.size = this.size;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', `Play displayer: ${this.name || 'unnamed'}`);
    root.append(stage, controls);

    return { root, fieldTop, players: players as Record<Position, PlayerSlot>, stage, stageInner, playBtn, resetBtn };
  }

  // ---------------------------------------------------------------------------
  // Adopt path — finds existing DOM nodes by stable data-attribute hooks
  // ---------------------------------------------------------------------------

  private adoptRefs(hydrateRoot: HTMLElement): FieldRefs {
    const root = hydrateRoot as HTMLDivElement;
    const fieldTop = queryRequired<HTMLDivElement>(root, '[data-pb-role="field-top"]');
    const stage = queryRequired<HTMLDivElement>(root, '[data-pb-role="stage"]');
    const stageInner = queryRequired<HTMLDivElement>(root, '[data-pb-role="inner"]');
    const playBtn = queryRequired<HTMLButtonElement>(root, '[data-pb-control="play"]');
    const resetBtn = queryRequired<HTMLButtonElement>(root, '[data-pb-control="reset"]');

    const players: Partial<Record<Position, PlayerSlot>> = {};
    for (const pos of POSITIONS) {
      const el = queryRequired<HTMLDivElement>(root, `[data-position="${pos}"]`);
      players[pos] = { element: el, moveName: 'none', steps: [] };
    }

    return { root, fieldTop, players: players as Record<Position, PlayerSlot>, stage, stageInner, playBtn, resetBtn };
  }

  // ---------------------------------------------------------------------------
  // Wire — attaches all event listeners; identical for build and adopt paths
  // ---------------------------------------------------------------------------

  private wire(playBtn: HTMLButtonElement, resetBtn: HTMLButtonElement): void {
    playBtn.addEventListener('click', () => {
      // Swallow the rejection from cancel (Reset hit mid-play). The state
      // machine has already flipped to 'idle' by the time we get here, so
      // the UI is consistent; surfacing the AbortError as an unhandled
      // rejection would just spam the console.
      this.play().catch(() => {
        /* cancelled — state already reset */
      });
    });

    resetBtn.addEventListener('click', () => {
      this.reset();
    });

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
  }

  // ---------------------------------------------------------------------------
  // ResizeObserver — shared setup for build and adopt paths
  // ---------------------------------------------------------------------------

  private setupResizeObserver(stage: HTMLDivElement, stageInner: HTMLDivElement): void {
    // Keep `--pb-field-scale` in sync with the stage's actual width so the
    // inner (at natural pixel dimensions) visually fills the available space.
    // Capped at 1 so we never upscale beyond natural size.
    const naturalWidth = FIELD_NATURAL_WIDTH[this.size];
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

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

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

  /**
   * Get the current move name assigned to a position. Named `getAssignedMove`
   * (not `getMove`) to avoid colliding with the module-level `getMove(name,
   * size)` catalog lookup, which means something different.
   */
  getAssignedMove(position: Position): MoveName {
    return this.players[position].moveName;
  }

  /** Update the title shown above the field. */
  setFieldName(name: string): void {
    this.fieldTop.textContent = name;
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
   *
   * @param idPrefix - When provided, uses this as the unique suffix for label/select ids
   *   instead of the auto-counter. Required for SSR hydration so server and client ids match.
   * @param hydrateShell - When provided, adopts this existing element instead of building
   *   new DOM. The element must have been produced by `renderSandboxHTML` with the same
   *   options. No nodes are created or removed — existing selects/inputs are adopted.
   */
  spawnSandbox(
    allowSave: boolean = false,
    parentId?: string | null,
    saveButton?: HTMLElement | null,
    idPrefix?: string,
    hydrateShell?: HTMLElement | null,
  ): HTMLDivElement {
    const uid = idPrefix ?? String((sandboxIdCounter += 1));

    // Register this sandbox's selects with the displayer so external state
    // changes (e.g. Initialize Play loading a saved play) push back into them.
    const selectsForThisSandbox: Partial<Record<Position, HTMLSelectElement>> = {};
    this.sandboxSelectGroups.push(selectsForThisSandbox);

    let shell: HTMLDivElement;

    if (hydrateShell) {
      // --- Adopt path: wire existing DOM ---
      shell = hydrateShell as HTMLDivElement;

      for (const pos of POSITIONS) {
        const select = queryRequired<HTMLSelectElement>(
          shell,
          `select[data-position="${pos}"]`,
        );
        // Sync to current field state (field may have moves set before hydration).
        select.value = this.players[pos].moveName;
        select.addEventListener('change', () => {
          this.setMove(pos, select.value as MoveName);
        });
        selectsForThisSandbox[pos] = select;
      }

      if (allowSave) {
        const nameInput = queryRequired<HTMLInputElement>(shell, 'input[aria-label="Play name"]');
        nameInput.addEventListener('input', () => {
          this.setFieldName(nameInput.value);
        });
        if (saveButton) {
          const nameWrap = queryRequired<HTMLDivElement>(shell, '.pb-sandbox-rename');
          const placeholder = nameWrap.querySelector('[data-pb-role="save-placeholder"]');
          if (placeholder) {
            nameWrap.replaceChild(saveButton, placeholder);
          } else {
            nameWrap.append(saveButton);
          }
        }
      }
    } else {
      // --- Build path: create fresh DOM ---
      shell = createDiv(this.size === 'large' ? 'sandbox-large' : 'sandbox');

      const grid = createDiv('forms2');
      const catalog = getMoveCatalog(this.size);

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

  // ---------------------------------------------------------------------------
  // Static hydration entry point
  // ---------------------------------------------------------------------------

  /**
   * Adopt a server-rendered `PlayDisplayer` root element and make it interactive.
   * The `root` must have been produced by `renderPlayDisplayerHTML(options)` with
   * the same `size` and `name`. No DOM nodes are created or removed — existing
   * nodes are adopted and event listeners are attached.
   *
   * @example
   * // Server (Next.js RSC or getServerSideProps):
   * const html = renderPlayDisplayerHTML({ size: 'large', name: 'My Play' });
   *
   * // Client (useEffect / 'use client'):
   * const field = PlayDisplayer.hydrate(rootEl, { size: 'large', name: 'My Play' });
   */
  static hydrate(
    root: HTMLElement,
    options: Omit<PlayDisplayerSSROptions, never> & Omit<PlayDisplayerOptions, 'parentId'>,
  ): PlayDisplayer {
    return new PlayDisplayer({
      ...options,
      _hydrateRoot: root,
    } as PlayDisplayerOptions);
  }
}
