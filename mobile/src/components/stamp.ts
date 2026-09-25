import type { Tile } from "../engine";

/**
 * Where the "safe from takeover" stamp lands on a safe company.
 *
 * A company is any connected blob, so its middle is frequently not on it — the
 * centre of an L-shape sits in the notch, over bare board. The rule here is
 * "as central as the shape allows, never floating": start at the centroid of
 * the tiles, and only if the stamp would hang off the company, slide to the
 * nearest position that sits entirely on the company.
 *
 * On a roughly convex company — which is most of them — the first check
 * passes and nothing moves.
 */

/** Coverage counts as complete a hair below 1, since the areas are floats. */
const FULL = 0.9995;
const EPS = 1e-6;

/** Search steps, in points: a pass over the bounding box, then a local refine. */
const COARSE = 2;
const FINE = 0.5;

type Spot = { cx: number; cy: number; cov: number; d: number };

const overlap = (a0: number, a1: number, b0: number, b1: number) =>
  Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

/**
 * Fraction of the stamp's own area that lands on the company.
 *
 * Measured against whole cells, not the inset tile faces: the 3pt seam between
 * two tiles of the same company is internal to the block, not bare board, and
 * counting it as a miss would put a floor of about 11/12 on every result.
 */
export function coverage(
  tiles: Tile[], cell: number, cx: number, cy: number, w: number, h: number,
): number {
  const x = cx - w / 2;
  const y = cy - h / 2;
  let on = 0;
  for (const [r, c] of tiles) {
    on += overlap(x, x + w, c * cell, (c + 1) * cell)
        * overlap(y, y + h, r * cell, (r + 1) * cell);
  }
  return on / (w * h);
}

/** Inclusive positions from lo to hi; a range that has collapsed yields its midpoint. */
function ticks(lo: number, hi: number, step: number): number[] {
  if (hi <= lo) return [(lo + hi) / 2];
  const out: number[] = [];
  for (let v = lo; v < hi; v += step) out.push(v);
  out.push(hi);
  return out;
}

/** More coverage wins; equal coverage goes to whichever sits nearer the centroid. */
const better = (a: Spot, b: Spot) =>
  a.cov > b.cov + EPS || (a.cov > b.cov - EPS && a.d < b.d) ? a : b;

function scan(
  tiles: Tile[], cell: number, w: number, h: number,
  xs: number[], ys: number[], cx0: number, cy0: number,
): Spot {
  let best: Spot | null = null;
  for (const cy of ys) {
    for (const cx of xs) {
      const spot: Spot = {
        cx, cy,
        cov: coverage(tiles, cell, cx, cy, w, h),
        d: Math.hypot(cx - cx0, cy - cy0),
      };
      best = best ? better(spot, best) : spot;
    }
  }
  return best!;
}

/**
 * Centre point for a `w` x `h` stamp over `tiles`, in points from the grid's
 * top-left. Returns the tile centroid when the stamp already sits on ink there.
 */
export function stampCentre(
  tiles: Tile[], cell: number, w: number, h: number,
): { cx: number; cy: number } {
  if (tiles.length === 0) return { cx: 0, cy: 0 };

  let sr = 0, sc = 0;
  let r0 = Infinity, r1 = -Infinity, c0 = Infinity, c1 = -Infinity;
  for (const [r, c] of tiles) {
    sr += r + 0.5; sc += c + 0.5;
    if (r < r0) r0 = r;
    if (r > r1) r1 = r;
    if (c < c0) c0 = c;
    if (c > c1) c1 = c;
  }
  const cx0 = (sc / tiles.length) * cell;
  const cy0 = (sr / tiles.length) * cell;
  if (coverage(tiles, cell, cx0, cy0, w, h) >= FULL) return { cx: cx0, cy: cy0 };

  // Only the bounding box is worth searching: outside it nothing is covered.
  // A stamp wider or taller than the company has no fully-covered position, so
  // `ticks` collapses that axis to the box's centre and the scan does its best.
  const xLo = c0 * cell + w / 2, xHi = (c1 + 1) * cell - w / 2;
  const yLo = r0 * cell + h / 2, yHi = (r1 + 1) * cell - h / 2;

  const coarse = scan(tiles, cell, w, h,
    ticks(xLo, xHi, COARSE), ticks(yLo, yHi, COARSE), cx0, cy0);
  const fine = scan(tiles, cell, w, h,
    ticks(Math.max(xLo, coarse.cx - COARSE), Math.min(xHi, coarse.cx + COARSE), FINE),
    ticks(Math.max(yLo, coarse.cy - COARSE), Math.min(yHi, coarse.cy + COARSE), FINE),
    cx0, cy0);

  const { cx, cy } = better(fine, coarse);
  return { cx, cy };
}
