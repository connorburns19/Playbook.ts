/**
 * Animation primitives backed by the Web Animations API.
 * Replaces V1's jQuery `.animate()` calls with native `Element.animate()`.
 *
 * Implementation notes:
 *
 *   1. We animate `transform: translate(...)` rather than `top/bottom/left/right`.
 *      Layout-based animations re-rasterize the element each frame, which causes
 *      visible edge-clipping on rounded shapes (the player circles). Transforms
 *      run on the compositor with stable anti-aliasing — no jaggies, no clipping,
 *      and the layout isn't invalidated each frame.
 *
 *   2. The MoveStep schema (`{top|bottom|left|right: N}`) is kept identical to V1
 *      for catalog compatibility; we just translate it into transform space:
 *        top: N    →  translateY( +N )
 *        bottom: N →  translateY( -N )   (CSS "bottom" pushes upward when increased)
 *        left: N   →  translateX( +N )
 *        right: N  →  translateX( -N )
 *
 *   3. Steps are played sequentially. After each step we copy the final transform
 *      to inline style and cancel the animation effect, so subsequent steps start
 *      from a known state and `reset()` just clears `style.transform`.
 */

import type { MoveStep } from './types.js';

/** Animate a sequence of move steps on `element`, awaiting each before starting the next. */
export async function animateInSequence(
  steps: ReadonlyArray<MoveStep>,
  element: HTMLElement,
): Promise<void> {
  let tx = 0;
  let ty = 0;

  for (const step of steps) {
    const fromX = tx;
    const fromY = ty;

    if (typeof step.offsets.top === 'number') ty = step.offsets.top;
    if (typeof step.offsets.bottom === 'number') ty = -step.offsets.bottom;
    if (typeof step.offsets.left === 'number') tx = step.offsets.left;
    if (typeof step.offsets.right === 'number') tx = -step.offsets.right;

    // No-op step (offsets resolved to the same point) — skip.
    if (tx === fromX && ty === fromY) continue;

    const animation = element.animate(
      [
        { transform: `translate(${fromX}px, ${fromY}px)` },
        { transform: `translate(${tx}px, ${ty}px)` },
      ],
      {
        duration: step.duration,
        fill: 'forwards',
        easing: 'linear',
      },
    );

    await animation.finished;

    // Persist the end state to inline style so subsequent steps and reset() see a
    // consistent value, then drop the animation effect.
    element.style.transform = `translate(${tx}px, ${ty}px)`;
    animation.cancel();
  }
}

/**
 * Cancel all running animations on `element` and clear the inline transform,
 * returning the element to its base position.
 */
export function resetAnimation(element: HTMLElement): void {
  if (typeof element.getAnimations === 'function') {
    for (const anim of element.getAnimations()) {
      anim.cancel();
    }
  }
  element.style.transform = '';
  // Clear positional inline styles too, in case any code path set them (defensive).
  element.style.top = '';
  element.style.bottom = '';
  element.style.left = '';
  element.style.right = '';
}
