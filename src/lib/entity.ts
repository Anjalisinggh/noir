/**
 * The living liquid has two layers of state:
 *
 *  target : where it SHOULD be, resolved purely from the scroll position
 *            (so jumps, links and reverse scrolling can never leave it stale)
 *  entity : what is drawn; the renderer glides it toward `target` every frame.
 *
 *  x, y     centre, as a fraction of the viewport
 *  size     radius, as a fraction of min(viewport width, height)
 *  shape    0 drop · 1 hypercar · 2 watch · 3 ring · 4 jet · 5 vault (fractions blend)
 *  spikes   ferrofluid needles (0..1)
 *  chaos    split into orbiting droplets, surface boils (0..1)
 *  reach    how eagerly it stretches toward the cursor (0..1)
 */
export type EntityShape = {
  x: number;
  y: number;
  size: number;
  shape: number;
  spikes: number;
  chaos: number;
  reach: number;
};

export const target: EntityShape = { x: 0.5, y: 0.52, size: 0.085, shape: 0, spikes: 0, chaos: 0, reach: 0.35 };

/** Drawn state. Starts at size 0 so the drop grows in after the loader. */
export const entity: EntityShape & { pulse: number } = { ...target, size: 0, pulse: 0 };

/** Interaction flags the scroll resolver folds into the target. */
export const flags = {
  /** 0 until the loader lifts, then 1 */
  intro: 0,
  /** vault press-and-hold progress, 0..1 */
  vaultHold: 0,
  vaultOpen: false,
};

/** Glide the drawn state toward the target. Called by the renderer every frame. */
export function settle(dt: number) {
  const k = 1 - Math.exp(-dt * 3.2);
  (Object.keys(target) as (keyof EntityShape)[]).forEach((key) => {
    entity[key] += (target[key] - entity[key]) * k;
  });
  entity.pulse *= Math.exp(-dt * 2.2);
}

/** Entity centre and radius in CSS pixels (drawn state). */
export function entityScreen() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return { x: entity.x * w, y: entity.y * h, r: entity.size * Math.min(w, h) };
}
