import { ROWS, COLS } from "./constants";
import type { Cell, GameState, Tile } from "./types";

export const SINGLE = "*";

export function tileName(t: Tile): string {
  return String.fromCharCode(65 + t[1]) + (t[0] + 1);
}

export function adjacent(r: number, c: number): Tile[] {
  const out: Tile[] = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push([nr, nc]);
  }
  return out;
}

/** Distinct company names adjacent to (r,c). */
export function adjacentCompanies(board: Cell[][], r: number, c: number): string[] {
  const s = new Set<string>();
  for (const [nr, nc] of adjacent(r, c)) {
    const t = board[nr]![nc];
    if (t && t !== SINGLE) s.add(t);
  }
  return [...s];
}

export function adjacentSingles(board: Cell[][], r: number, c: number): Tile[] {
  return adjacent(r, c).filter(([nr, nc]) => board[nr]![nc] === SINGLE);
}

/** All single tiles connected (through singles) to (r,c), including it if single. */
export function connectedSingles(board: Cell[][], r: number, c: number): Tile[] {
  const seen = new Set<string>();
  const out: Tile[] = [];
  const q: Tile[] = [[r, c]];
  while (q.length) {
    const [cr, cc] = q.shift()!;
    const key = cr + "," + cc;
    if (seen.has(key)) continue;
    seen.add(key);
    if (board[cr]![cc] !== SINGLE) continue;
    out.push([cr, cc]);
    for (const [nr, nc] of adjacent(cr, cc)) if (!seen.has(nr + "," + nc)) q.push([nr, nc]);
  }
  return out;
}

export function companyTiles(board: Cell[][], name: string): Tile[] {
  const out: Tile[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r]![c] === name) out.push([r, c]);
  return out;
}

/** True if the named company's tiles form one connected component (or none). */
export function isConnected(board: Cell[][], name: string): boolean {
  const tiles = companyTiles(board, name);
  if (tiles.length <= 1) return true;
  const set = new Set(tiles.map(([r, c]) => r + "," + c));
  const seen = new Set<string>();
  const q: Tile[] = [tiles[0]!];
  while (q.length) {
    const [r, c] = q.shift()!;
    const key = r + "," + c;
    if (seen.has(key) || !set.has(key)) continue;
    seen.add(key);
    for (const [nr, nc] of adjacent(r, c)) q.push([nr, nc]);
  }
  return seen.size === set.size;
}

export type PlacementResult =
  | { type: "illegal" }
  | { type: "none" }
  | { type: "expand"; co: string }
  | { type: "found"; conn: Tile[] }
  | { type: "merger"; cos: string[] };

/**
 * Classify what placing at (r,c) would do.
 * Illegal when: it would merge two safe companies, or it would trigger a merger
 * involving any company already in a pending (Regulatory-delayed) merger.
 */
export function analyzePlacement(g: GameState, r: number, c: number): PlacementResult {
  const ac = adjacentCompanies(g.board, r, c);
  const singles = adjacentSingles(g.board, r, c);
  if (ac.length >= 2) {
    const safe = ac.filter((n) => g.cos[n]!.status === "safe");
    const unsafe = ac.filter((n) => g.cos[n]!.status !== "safe");
    if (safe.length >= 2 && unsafe.length === 0) return { type: "illegal" };
    if (safe.length >= 2) {
      // Multiple safes + at least one unsafe: tile expands the largest safe; no merger.
      const biggest = [...safe].sort((a, b) => g.cos[b]!.size - g.cos[a]!.size)[0]!;
      return { type: "expand", co: biggest };
    }
    if (g.pendingMerger && ac.some((n) => g.pendingMerger!.cos.includes(n)))
      return { type: "illegal" };
    return { type: "merger", cos: ac };
  }
  if (ac.length === 1) return { type: "expand", co: ac[0]! };
  if (singles.length > 0 && Object.values(g.cos).some((co) => co.status === "inactive")) {
    const conn = new Set<string>();
    conn.add(r + "," + c);
    for (const [ar, ac2] of singles)
      for (const t of connectedSingles(g.board, ar, ac2)) conn.add(t.join(","));
    return { type: "found", conn: [...conn].map((k) => k.split(",").map(Number) as unknown as Tile) };
  }
  return { type: "none" };
}

export function canPlay(g: GameState, r: number, c: number): boolean {
  return analyzePlacement(g, r, c).type !== "illegal";
}
