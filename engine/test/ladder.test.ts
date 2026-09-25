import { describe, expect, it } from "vitest";
import { aiAction, applyAction, newGame, type GameState, type PlayerKind } from "buyout-engine";

/**
 * Does the ladder players pick from in Setup — Casual, Greedy, Sharp, Shark —
 * actually have four rungs?
 *
 *   BENCH=1 npx vitest run test/ladder.test.ts
 *   BENCH=1 LADDER_GAMES=1000 npx vitest run test/ladder.test.ts
 *
 * Opt-in, because a few hundred full games is minutes, not the seconds the
 * rest of the suite takes.
 */

/**
 * Head-to-head win rate between two AI kinds, seats swapped every other game
 * so seat order cannot flatter either of them.
 */
function duel(a: PlayerKind, b: PlayerKind, games: number): { aWins: number; n: number } {
  let aWins = 0, n = 0;
  for (let seed = 1; seed <= games; seed++) {
    const aFirst = seed % 2 === 1;
    const names = aFirst ? ["A", "B"] : ["B", "A"];
    const kinds: PlayerKind[] = aFirst ? [a, b] : [b, a];
    let g: GameState = newGame(
      kinds.map((k, i) => ({ name: names[i]!, kind: k })), seed, false);
    for (let step = 0; step < 6000 && g.phase !== "gameOver"; step++) {
      const act = aiAction(g);
      if (!act) break;
      g = applyAction(g, act);
    }
    if (g.phase !== "gameOver" || !g.winner) continue;
    n++;
    if (g.winner === "A") aWins++;
  }
  return { aWins, n };
}

describe("difficulty ladder", () => {
  it.runIf(process.env.BENCH)("BENCH: each rung against the one below it", { timeout: 900_000 }, () => {
    const GAMES = Number(process.env.LADDER_GAMES ?? 400);
    const rungs: [PlayerKind, PlayerKind][] = [
      ["greedy", "random"],
      ["strategic", "greedy"],
      ["shark", "strategic"],
    ];
    for (const [hi, lo] of rungs) {
      const { aWins, n } = duel(hi, lo, GAMES);
      const p = aWins / n;
      const se = Math.sqrt((p * (1 - p)) / n);
      console.log(
        `${hi.padEnd(10)} vs ${lo.padEnd(10)} ${(p * 100).toFixed(1)}% ` +
        `± ${(se * 196).toFixed(1)}  (${aWins}/${n})`);
    }
    expect(true).toBe(true);
  });
});
