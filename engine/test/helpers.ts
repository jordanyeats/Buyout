import {
  aiAction, applyAction, checkInvariants, newGame,
  type Action, type GameState, type PlayerConfig, type PlayerKind, type Tile,
} from "buyout-engine";

export function cfg(...kinds: PlayerKind[]): PlayerConfig[] {
  return kinds.map((k, i) => ({ name: `P${i + 1}`, kind: k }));
}

/** Fresh game with all hands returned to the pool, for hand-built scenarios. */
export function scenario(kinds: PlayerKind[], seed = 42, useCards = false): GameState {
  const g = newGame(cfg(...kinds), seed, useCards);
  for (const p of g.players) {
    g.pool.push(...p.hand);
    p.hand = [];
  }
  g.phase = "place";
  return g;
}

function takeFromPool(g: GameState, tile: Tile): void {
  const before = g.pool.length;
  g.pool = g.pool.filter((t) => !(t[0] === tile[0] && t[1] === tile[1]));
  if (g.pool.length !== before - 1) throw new Error(`tile ${tile} not available in pool`);
}

/** Place a company on the board (tiles leave the pool; status/size maintained). */
export function putCompany(g: GameState, name: string, tiles: Tile[]): void {
  for (const t of tiles) {
    takeFromPool(g, t);
    g.board[t[0]]![t[1]] = name;
  }
  const co = g.cos[name]!;
  co.size = tiles.length;
  co.status = co.size >= 25 ? "safe" : "active";
}

/** Force-mark a company safe (e.g., to model a shrunk-but-sticky safe company). */
export function markSafe(g: GameState, name: string): void {
  g.cos[name]!.status = "safe";
}

export function putSingle(g: GameState, tile: Tile): void {
  takeFromPool(g, tile);
  g.board[tile[0]]![tile[1]] = "*";
}

export function handTile(g: GameState, playerIdx: number, tile: Tile): void {
  takeFromPool(g, tile);
  g.players[playerIdx]!.hand.push(tile);
}

/** Move blocks from market to a player (no cash exchanged — scenario setup). */
export function grantShares(g: GameState, playerIdx: number, co: string, n: number): void {
  if ((g.market[co] ?? 0) < n) throw new Error(`market has only ${g.market[co]} ${co}`);
  g.market[co]! -= n;
  const p = g.players[playerIdx]!;
  p.shares[co] = (p.shares[co] ?? 0) + n;
}

export interface RunResult {
  state: GameState;
  actions: Action[];
  steps: number;
}

/** Drive a game to completion with the AI acting for every seat. */
export function runGame(
  seed: number,
  kinds: PlayerKind[],
  useCards: boolean,
  opts: { checkEveryStep?: boolean; maxSteps?: number; options?: import("buyout-engine").GameOptions } = {},
): RunResult {
  let g = newGame(cfg(...kinds), seed, useCards, opts.options);
  const actions: Action[] = [];
  const max = opts.maxSteps ?? 3000;
  let steps = 0;
  while (!g.over && steps < max) {
    const a = aiAction(g);
    g = applyAction(g, a);
    actions.push(a);
    steps++;
    if (opts.checkEveryStep) {
      const errs = checkInvariants(g);
      if (errs.length)
        throw new Error(`invariants broken at step ${steps} (seed ${seed}): ${errs.join("; ")}`);
    }
  }
  if (!g.over) throw new Error(`game did not terminate in ${max} steps (seed ${seed})`);
  return { state: g, actions, steps };
}
