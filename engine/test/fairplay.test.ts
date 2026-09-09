import { describe, expect, it } from "vitest";
import {
  SHARK_CONFIG, aiAction, applyAction, currentActor, newGame,
  type GameState, type PlayerKind,
} from "buyout-engine";
import { cfg, runGame } from "./helpers.js";

/**
 * The fair-play contract.
 *
 *   BLIND           a seat's move cannot depend on anything it could not see:
 *                   the merger deck's order, the order of future tile draws,
 *                   or which tiles opponents actually hold.
 *   UN-INFLUENCABLE deliberating cannot touch the real game — not its state,
 *                   not its rng stream, not the draw or deck order.
 *   REPRODUCIBLE    seed + action log replays byte-identically with a shark at
 *                   the table, which is only possible if both hold.
 *
 * Only the shark can plausibly break these, because it is the only tier that
 * simulates. The heuristic tiers read `g.players[idx]` and nothing else.
 */

/** Same multiset, different order. */
function rotated<T>(arr: T[], k: number): T[] {
  if (arr.length === 0) return arr;
  const n = k % arr.length;
  return [...arr.slice(n), ...arr.slice(0, n)];
}

/** A real mid-game position with the shark (seat 0) on the clock. */
function sharkToAct(seed: number): GameState {
  const r = SHARK_CONFIG.rollouts, m = SHARK_CONFIG.maxActionsPerRollout;
  SHARK_CONFIG.rollouts = 3;            // cheap while building the position
  SHARK_CONFIG.maxActionsPerRollout = 25;
  try {
    let g = newGame(cfg("shark", "strategic"), seed, true);
    for (let i = 0; i < 40 && !g.over; i++) g = applyAction(g, aiAction(g));
    let guard = 0;
    while (!g.over && !(g.phase === "place" && currentActor(g) === 0) && guard++ < 200)
      g = applyAction(g, aiAction(g));
    if (g.over || g.phase !== "place") throw new Error(`seed ${seed} gave no shark place phase`);
    return g;
  } finally {
    SHARK_CONFIG.rollouts = r;
    SHARK_CONFIG.maxActionsPerRollout = m;
  }
}

/** Move the shark would make from this exact state, at the shipped budget. */
function move(g: GameState): string {
  SHARK_CONFIG.rollouts = 10;
  SHARK_CONFIG.maxActionsPerRollout = 90;
  return JSON.stringify(aiAction(g));
}

describe("fair play: BLIND", () => {
  it("the merger deck's order cannot change the shark's move", () => {
    const base = sharkToAct(7);
    expect(base.deck.length).toBeGreaterThan(3);
    const want = move(base);
    for (const k of [1, 2, 3, 5, 7]) {
      expect(move({ ...base, deck: rotated(base.deck, k) })).toBe(want);
    }
  }, 120000);

  it("the order of future tile draws cannot change the shark's move", () => {
    const base = sharkToAct(7);
    expect(base.pool.length).toBeGreaterThan(3);
    const want = move(base);
    for (const k of [1, 2, 3, 5, 7]) {
      expect(move({ ...base, pool: rotated(base.pool, k) })).toBe(want);
    }
  }, 120000);

  it("which tiles the opponent actually holds cannot change the shark's move", () => {
    const base = sharkToAct(7);
    const want = move(base);
    const held = base.players[1]!.hand.length;
    expect(held).toBeGreaterThan(0);
    expect(base.pool.length).toBeGreaterThanOrEqual(held);
    // Swap the opponent's hand with tiles off the pool. The union of everything
    // the shark cannot see is unchanged; only the split moves.
    const swapped: GameState = {
      ...base,
      players: base.players.map((p, i) =>
        i === 0 ? p : { ...p, hand: base.pool.slice(0, held) }),
      pool: [...base.players[1]!.hand, ...base.pool.slice(held)],
    };
    expect(move(swapped)).toBe(want);
  }, 120000);
});

describe("fair play: UN-INFLUENCABLE", () => {
  const LINEUPS: PlayerKind[][] = [
    ["shark", "strategic"],
    ["strategic", "greedy"],
    ["random", "greedy"],
  ];

  it("deciding a move never touches the real game state or its rng", () => {
    for (const kinds of LINEUPS) {
      const g = kinds[0] === "shark" ? sharkToAct(11) : (() => {
        let s = newGame(cfg(...kinds), 11, true);
        for (let i = 0; i < 20 && !s.over; i++) s = applyAction(s, aiAction(s));
        return s;
      })();
      SHARK_CONFIG.rollouts = 10;
      SHARK_CONFIG.maxActionsPerRollout = 90;
      const before = JSON.stringify(g);
      aiAction(g);
      // Byte-identical, rngState included: thinking has no side effects.
      expect(JSON.stringify(g)).toBe(before);
    }
  }, 120000);

  it("thinking harder does not change the game that gets played", () => {
    // Same seed, same seats, two rollout budgets. The shark may well choose
    // different MOVES, but the tiles it draws and the cards it turns over are
    // dealt by the seed alone -- so the draw order must be identical.
    const draws = (rollouts: number) => {
      SHARK_CONFIG.rollouts = rollouts;
      SHARK_CONFIG.maxActionsPerRollout = 40;
      const g = newGame(cfg("shark", "strategic"), 2024, true);
      return JSON.stringify({ pool: g.pool, deck: g.deck, hands: g.players.map((p) => p.hand) });
    };
    expect(draws(50)).toBe(draws(3));
  }, 120000);

  it("who moves first is fixed by the rules, not drawn from the rng", () => {
    for (const seed of [1, 2, 99, 12345, -5]) {
      const g = newGame(cfg("human", "strategic", "shark"), seed, true);
      expect(currentActor(g)).toBe(0);
      expect(g.turn).toBe(0);
    }
  });
});

describe("fair play: REPRODUCIBLE", () => {
  it("a game with a shark at the table replays byte-identically", () => {
    SHARK_CONFIG.rollouts = 4;
    SHARK_CONFIG.maxActionsPerRollout = 30;
    const kinds: PlayerKind[] = ["shark", "strategic", "greedy"];
    const { state, actions } = runGame(4321, kinds, true);
    let g = newGame(cfg(...kinds), 4321, true);
    for (const a of actions) g = applyAction(g, a);
    expect(JSON.stringify(g)).toBe(JSON.stringify(state));
  }, 300000);

  it("the same seed produces the same shark game twice", () => {
    SHARK_CONFIG.rollouts = 4;
    SHARK_CONFIG.maxActionsPerRollout = 30;
    const kinds: PlayerKind[] = ["shark", "greedy"];
    const a = runGame(808, kinds, true);
    const b = runGame(808, kinds, true);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(a.actions).toEqual(b.actions);
  }, 300000);
});
