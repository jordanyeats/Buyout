import { it } from "vitest";
import { SHARK_CONFIG, aiAction, applyAction, currentActor, newGame, type GameState, type PlayerKind } from "buyout-engine";

/**
 * Head-to-head: honest shark (hidden information re-sampled per rollout) vs the
 * old clairvoyant shark (rollouts run on the true state), against identical
 * opponents on identical seeds. Also records how long a shark move costs.
 *
 *   BENCH=1 npx vitest run test/shark-bench.test.ts
 *   BENCH=1 BENCH_GAMES=40 npx vitest run test/shark-bench.test.ts
 *
 * With BENCH_BUDGETS set it instead sweeps the honest shark across rollout
 * budgets ("rollouts x maxActions"), to ask whether compute buys back the
 * strength the clairvoyant version was getting for free:
 *
 *   BENCH=1 BENCH_GAMES=15 BENCH_SEATS=2 BENCH_BUDGETS=10x90,25x150 \
 *     npx vitest run test/shark-bench.test.ts
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

const ALL_LINEUPS: { name: string; kinds: PlayerKind[] }[] = [
  { name: "shark v strategic", kinds: ["shark", "strategic"] },
  { name: "shark v strat+greedy", kinds: ["shark", "strategic", "greedy"] },
];

/** BENCH_SEATS=2 restricts the sweep to the two-seat lineup (the cheapest clean signal). */
function lineups(): typeof ALL_LINEUPS {
  const seats = process.env.BENCH_SEATS;
  return seats ? ALL_LINEUPS.filter((l) => l.kinds.length === Number(seats)) : ALL_LINEUPS;
}

/** One arm: `games` seeds, shark rotated through every seat. */
function runArm(games: number, kinds: PlayerKind[]): Tally {
  const t = empty();
  for (let i = 0; i < games; i++) {
    // Same seeds across every arm; rotating the shark cancels first-move advantage.
    for (let seat = 0; seat < kinds.length; seat++) {
      const lineup = [...kinds];
      lineup[0] = kinds[seat]!;
      lineup[seat] = "shark";
      playGame(9001 + i * 37, lineup as PlayerKind[], seat, t);
    }
  }
  return t;
}

it.runIf(process.env.BENCH)("BENCH: shark strength", () => {
  const games = Number(process.env.BENCH_GAMES ?? 20);
  if (process.env.BENCH_OBJECTIVE)
    SHARK_CONFIG.objective = process.env.BENCH_OBJECTIVE as typeof SHARK_CONFIG.objective;
  const budgets = (process.env.BENCH_BUDGETS ?? "")
    .split(",").filter(Boolean)
    .map((b) => b.split("x").map(Number) as [number, number]);

  for (const { name, kinds } of lineups()) {
    const baseline = (100 / kinds.length).toFixed(1);
    console.log(
      `\n--- ${name} (${games} seeds x ${kinds.length} seats, cards on) ` +
      `— chance baseline ${baseline}% ---`,
    );

    if (budgets.length) {
      // Sweep: does more compute buy the honest shark real strength?
      SHARK_CONFIG.determinize = true;
      for (const [rollouts, maxA] of budgets) {
        SHARK_CONFIG.rollouts = rollouts;
        SHARK_CONFIG.maxActionsPerRollout = maxA;
        report(`honest ${rollouts}x${maxA} ${SHARK_CONFIG.objective}`, runArm(games, kinds));
      }
      continue;
    }

    SHARK_CONFIG.rollouts = 10;
    SHARK_CONFIG.maxActionsPerRollout = 90;
    for (const determinize of [true, false]) {
      SHARK_CONFIG.determinize = determinize;
      report(determinize ? "honest" : "clairvoyant", runArm(games, kinds));
    }
  }

  SHARK_CONFIG.determinize = true;
  SHARK_CONFIG.rollouts = 10;
  SHARK_CONFIG.maxActionsPerRollout = 90;
  SHARK_CONFIG.objective = "networth";
}, 14_400_000);
