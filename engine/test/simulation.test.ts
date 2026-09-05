import { describe, expect, it } from "vitest";
import type { PlayerKind } from "buyout-engine";
import { runGame } from "./helpers.js";

/**
 * Mass simulation: full AI games across many seeds and configurations, with
 * every invariant checked after every single action:
 *   - tile conservation (pool + hands + board + destroyed = 81)
 *   - no negative cash, no negative/fractional shares
 *   - block supply: market + held = issued, per company (cards mint tracked supply)
 *   - active companies: size matches board, ≥2, fully connected
 *   - inactive companies own no tiles
 *   - games terminate
 */

const CONFIGS: PlayerKind[][] = [
  ["strategic", "greedy"],
  ["strategic", "greedy", "random"],
  ["strategic", "strategic", "greedy", "random"],
  ["random", "random", "greedy", "greedy", "strategic", "strategic"],
];

describe("simulation sweep (cards ON)", () => {
  for (const kinds of CONFIGS) {
    it(`${kinds.length} players: 40 seeded games hold all invariants`, () => {
      for (let seed = 1; seed <= 40; seed++) {
        const { state, steps } = runGame(seed * 101 + kinds.length, kinds, true, {
          checkEveryStep: true,
        });
        expect(state.over).toBe(true);
        expect(state.winner).not.toBeNull();
        expect(steps).toBeLessThan(3000);
      }
    });
  }
});

describe("simulation sweep (cards OFF)", () => {
  it("60 seeded games hold all invariants", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const kinds = CONFIGS[seed % CONFIGS.length]!;
      const { state } = runGame(seed * 7 + 13, kinds, false, { checkEveryStep: true });
      expect(state.over).toBe(true);
    }
  });
});

describe("simulation sanity", () => {
  it("cash actually moves and companies actually merge over a batch", () => {
    let mergers = 0;
    let totalCashDelta = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const { state } = runGame(seed, ["strategic", "greedy", "random"], true);
      mergers += state.logs.filter((l) => l.startsWith("Merger:")).length;
      const start = 100_000 * state.players.length;
      totalCashDelta += Math.abs(state.players.reduce((s, p) => s + p.cash, 0) - start);
    }
    expect(mergers).toBeGreaterThan(10);
    expect(totalCashDelta).toBeGreaterThan(0);
  });
});
