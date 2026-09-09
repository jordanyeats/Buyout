import { it } from "vitest";
import { SHARK_CONFIG, aiAction, applyAction, currentActor, newGame, type GameState, type PlayerKind } from "buyout-engine";

/**
 * Head-to-head: honest shark (hidden information re-sampled per rollout) vs the
 * old clairvoyant shark (rollouts run on the true state), against identical
 * opponents on identical seeds. Also records how long a shark move costs.
 *
 *   BENCH=1 npx vitest run test/shark-bench.test.ts
 *   BENCH=1 BENCH_GAMES=40 npx vitest run test/shark-bench.test.ts
 */

interface Tally {
  games: number; wins: number; cash: number;
  decisions: number; totalMs: number; maxMs: number;
}

const empty = (): Tally => ({ games: 0, wins: 0, cash: 0, decisions: 0, totalMs: 0, maxMs: 0 });

function playGame(seed: number, kinds: PlayerKind[], sharkSeat: number, t: Tally): void {
  let g: GameState = newGame(kinds.map((k, i) => ({ name: `P${i}`, kind: k })), seed, true);
  let steps = 0;
  while (!g.over && steps < 3000) {
    const actor = currentActor(g);
    const timed = actor === sharkSeat && g.phase === "place";
    const t0 = timed ? performance.now() : 0;
    const a = aiAction(g);
    if (timed) {
      const ms = performance.now() - t0;
      t.decisions++; t.totalMs += ms; t.maxMs = Math.max(t.maxMs, ms);
    }
    g = applyAction(g, a);
    steps++;
  }
  t.games++;
  t.cash += g.players[sharkSeat]!.cash;
  if (g.winner === g.players[sharkSeat]!.name) t.wins++;
}

function report(label: string, t: Tally): void {
  const pct = ((t.wins / t.games) * 100).toFixed(1);
  const cash = Math.round(t.cash / t.games).toLocaleString();
  const mean = (t.totalMs / t.decisions).toFixed(0);
  console.log(
    `${label.padEnd(22)} win ${pct.padStart(5)}%  (${t.wins}/${t.games})   ` +
    `mean final $${cash.padStart(9)}   move ${mean.padStart(4)}ms avg / ${t.maxMs.toFixed(0).padStart(4)}ms max`,
  );
}

const LINEUPS: { name: string; kinds: PlayerKind[] }[] = [
  { name: "shark v strategic", kinds: ["shark", "strategic"] },
  { name: "shark v strat+greedy", kinds: ["shark", "strategic", "greedy"] },
];

it.runIf(process.env.BENCH)("BENCH: honest vs clairvoyant shark", () => {
  const games = Number(process.env.BENCH_GAMES ?? 20);
  SHARK_CONFIG.rollouts = 10;
  SHARK_CONFIG.maxActionsPerRollout = 90;

  for (const { name, kinds } of LINEUPS) {
    console.log(`\n--- ${name} (${games} seeds x ${kinds.length} seats, cards on) ---`);
    for (const determinize of [true, false]) {
      SHARK_CONFIG.determinize = determinize;
      const t = empty();
      for (let i = 0; i < games; i++) {
        // Same seed for both modes; shark rotates through every seat so first-move
        // advantage cancels instead of favouring one arm.
        for (let seat = 0; seat < kinds.length; seat++) {
          const lineup = [...kinds];
          lineup[0] = kinds[seat]!; lineup[seat] = "shark";
          playGame(9001 + i * 37, lineup as PlayerKind[], seat, t);
        }
      }
      report(determinize ? "honest" : "clairvoyant", t);
    }
  }
  SHARK_CONFIG.determinize = true;
}, 3_600_000);
