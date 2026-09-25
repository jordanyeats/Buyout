import type { Tile } from "../engine";

/**
 * Where the "safe from takeover" stamp lands on a safe company.
 *
 * A company is any connected blob, so its middle is frequently not on it — the
 * centre of an L-shape sits in the notch, over bare board. The centroid is
 * still the rule; the search only handles the case where the centroid does not
 * work, and it answers to each axis separately:
 *
 *   - vertically, the band nearest the centroid that the stamp can sit on;
 *   - horizontally, the middle of the run of tiles it ends up sitting on.
 *
 * Splitting the two matters. Minimising distance to the centroid in both axes
 * at once slides the bar down onto an L's arm but keeps the centroid's
 * left-leaning x, so it lands off-centre on the very row it is sitting on and
 * reads as though it does not belong there. Once the band is chosen, the
 * centroid has nothing left to say about x.
 *
 * On a roughly convex company — which is most of them — the first check passes
 * and nothing moves at all.
 */

/** Coverage counts as complete a hair below 1, since the areas are floats. */
const FULL = 0.9995;
const EPS = 1e-6;

/** Search steps, in points: a pass over the bounding box, then a local refine. */
const COARSE = 2;
const FINE = 0.5;

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

/**
 * Centre point for a `w` x `h` stamp over `tiles`, in points from the grid's
 * top-left. Returns the tile centroid when the stamp already sits wholly on the
 * company there.
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
  // `ticks` collapses that axis to the box's centre and the search does its best.
  const xLo = c0 * cell + w / 2, xHi = (c1 + 1) * cell - w / 2;
  const yLo = r0 * cell + h / 2, yHi = (r1 + 1) * cell - h / 2;

  // ── vertical: the band nearest the centroid the stamp can sit on ──────────
  const bestOn = (cy: number, step: number) => {
    let top = -1;
    for (const cx of ticks(xLo, xHi, step)) {
      const v = coverage(tiles, cell, cx, cy, w, h);
      if (v > top) top = v;
    }
    return top;
  };
  const pickY = (cands: number[]) => {
    let best = { cy: cy0, cov: -1, d: Infinity };
    for (const cy of cands) {
      const cov = bestOn(cy, COARSE);
      const d = Math.abs(cy - cy0);
      if (cov > best.cov + EPS || (cov > best.cov - EPS && d < best.d)) best = { cy, cov, d };
    }
    return best;
  };
  const coarse = pickY(ticks(yLo, yHi, COARSE));
  const refined = pickY(ticks(
    Math.max(yLo, coarse.cy - COARSE), Math.min(yHi, coarse.cy + COARSE), FINE));
  const best = refined.cov > coarse.cov + EPS
    || (refined.cov > coarse.cov - EPS && refined.d < coarse.d) ? refined : coarse;
  const cy = best.cy;

  // ── horizontal: the middle of the run it is sitting on ────────────────────
  // Every position that ties for best coverage on this band is somewhere the
  // stamp belongs; the middle of that range is the middle of the tiles under
  // it. A band can offer two separate runs (a row with a gap), so they are
  // grouped and the one nearest the centroid's column wins — then centred.
  const xs = ticks(xLo, xHi, FINE);
  const covs = xs.map((cx) => coverage(tiles, cell, cx, cy, w, h));
  const top = Math.max(...covs);

  const runs: number[][] = [];
  for (let i = 0; i < xs.length; i++) {
    if (covs[i]! < top - EPS) continue;
    if (i > 0 && covs[i - 1]! >= top - EPS) runs[runs.length - 1]!.push(xs[i]!);
    else runs.push([xs[i]!]);
  }

  let cx = cx0;
  let nearest = Infinity;
  for (const run of runs) {
    const mid = (run[0]! + run[run.length - 1]!) / 2;
    const d = Math.abs(mid - cx0);
    if (d < nearest) { nearest = d; cx = mid; }
  }
  return { cx, cy };
}
