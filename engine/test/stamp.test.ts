import { describe, expect, it } from "vitest";
import type { Tile } from "buyout-engine";
// View geometry rather than game rules, but this is the repo's only test
// runner and the placement search is pure and worth pinning.
import { coverage, stampCentre } from "../../mobile/src/components/stamp";

const CELL = 34;
/** The bar's real measured size at the shipped type spec, near enough. */
const W = 72, H = 27;

const rect = (r0: number, r1: number, c0: number, c1: number): Tile[] => {
  const out: Tile[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push([r, c]);
  return out;
};
const covered = (tiles: Tile[], w = W, h = H) => {
  const { cx, cy } = stampCentre(tiles, CELL, w, h);
  return coverage(tiles, CELL, cx, cy, w, h);
};
const centroid = (tiles: Tile[]) => ({
  cx: (tiles.reduce((a, [, c]) => a + c + 0.5, 0) / tiles.length) * CELL,
  cy: (tiles.reduce((a, [r]) => a + r + 0.5, 0) / tiles.length) * CELL,
});

describe("stampCentre", () => {
  it("leaves a convex company at its centroid", () => {
    const tiles = rect(0, 2, 0, 5);          // 3 x 6
    const got = stampCentre(tiles, CELL, W, H);
    expect(got).toEqual(centroid(tiles));
  });

  it("covers the narrowest company that can reach the threshold", () => {
    // 18 tiles as 3 wide by 6 tall: the tightest shape the bar has to fit.
    expect(covered(rect(0, 5, 0, 2))).toBeGreaterThan(0.999);
  });

  it("moves off the notch of an L, where the centroid would float", () => {
    const tiles = [...rect(0, 3, 0, 1), ...rect(4, 5, 0, 4)];
    const ct = centroid(tiles);
    expect(coverage(tiles, CELL, ct.cx, ct.cy, W, H)).toBeLessThan(0.9);
    expect(covered(tiles)).toBeGreaterThan(0.999);
  });

  it("finds ink on a sprawl with a thin waist", () => {
    const tiles: Tile[] = [
      [0, 0], [0, 1], [0, 2], [0, 3],
      [1, 1],
      [2, 1], [2, 2], [2, 3], [2, 4],
      [3, 3],
      [4, 2], [4, 3], [4, 4], [4, 5], [4, 6],
      [5, 4], [5, 5], [5, 6],
    ];
    expect(covered(tiles)).toBeGreaterThan(0.999);
  });

  it("stays inside the company on every shape a real game produced", () => {
    // Shapes lifted from the shape probe: each is a company that actually
    // went past the threshold in simulation.
    const shapes: Tile[][] = [
      rect(0, 1, 0, 8),                                   // 2 x 9, full width
      [...rect(0, 2, 0, 4), ...rect(3, 3, 1, 3)],
      [...rect(0, 0, 2, 7), ...rect(1, 2, 0, 4), [3, 2]],
    ];
    for (const tiles of shapes) {
      const { cx, cy } = stampCentre(tiles, CELL, W, H);
      const rs = tiles.map(([r]) => r), csx = tiles.map(([, c]) => c);
      expect(cx).toBeGreaterThanOrEqual(Math.min(...csx) * CELL);
      expect(cx).toBeLessThanOrEqual((Math.max(...csx) + 1) * CELL);
      expect(cy).toBeGreaterThanOrEqual(Math.min(...rs) * CELL);
      expect(cy).toBeLessThanOrEqual((Math.max(...rs) + 1) * CELL);
    }
  });

  it("centres on the bounding box when the bar is wider than the company", () => {
    const tiles = rect(0, 8, 0, 1);          // 2 x 9: 68pt wide, bar is 72
    const { cx } = stampCentre(tiles, CELL, W, H);
    expect(cx).toBeCloseTo(CELL, 5);         // middle of two columns
  });

  it("is stable: the same shape always lands in the same place", () => {
    const tiles = [...rect(0, 3, 0, 1), ...rect(4, 5, 0, 4)];
    expect(stampCentre(tiles, CELL, W, H)).toEqual(stampCentre(tiles, CELL, W, H));
  });
});
