import { it, expect } from "vitest";
import type { PlayerKind } from "buyout-engine";
import { runGame } from "./helpers.js";
const CONFIGS: PlayerKind[][] = [
  ["strategic","greedy"],["strategic","greedy","random"],
  ["strategic","strategic","greedy","random"],
  ["greedy","greedy","random","strategic","strategic"],
  ["random","random","greedy","greedy","strategic","strategic"],
];
it.runIf(process.env.STRESS)("STRESS: 1200 games, invariants every step", () => {
  let steps = 0, turns = 0, maxTurns = 0;
  for (let i = 0; i < 1200; i++) {
    const kinds = CONFIGS[i % CONFIGS.length]!;
    const useCards = i % 3 !== 2;
    const r = runGame(100000 + i * 17, kinds, useCards, { checkEveryStep: true });
    steps += r.steps; turns += r.state.turn; maxTurns = Math.max(maxTurns, r.state.turn);
    expect(r.state.over).toBe(true);
  }
  console.log(`total steps ${steps}, avg turns ${(turns/1200).toFixed(1)}, max turns ${maxTurns}`);
}, 300000);
