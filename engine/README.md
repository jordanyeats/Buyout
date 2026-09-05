# buyout-engine

Deterministic, framework-agnostic TypeScript engine for **Buyout** — extracted from
the v1.4 `index.html` prototype, with every known engine bug fixed and a test
suite that proves it. This is Phase 0 of the iOS roadmap: the correct core you
port a UI onto exactly once.

**The engine source lives at `mobile/src/engine/` — that one copy, and only that
copy.** It is what the Expo app bundles, so the app can never ship untested
engine code and the tests can never cover code the app does not run. This
directory is the engine's test suite and typecheck gate, not a second copy of
it; the tests import it as `buyout-engine`, aliased in `vitest.config.ts` and
`tsconfig.json`. (There used to be a duplicate tree here, hand-mirrored on every
change. Do not reintroduce one.)

```
npm install        # dev deps (typescript, vitest)
npm test           # 49 tests: units + 220 seeded full-game simulations
STRESS=1 npx vitest run test/stress.test.ts   # 1,200 games, invariants every action
npm run typecheck
```

## API

```ts
import { newGame, applyAction, aiAction, checkInvariants } from "buyout-engine";

let g = newGame(
  [{ name: "You", kind: "human" }, { name: "Stratton", kind: "strategic" }],
  seed,          // any integer — fully determines the game
  true,          // merger cards on/off
);

// The UI is a pure function of GameState. Drive it with actions:
g = applyAction(g, { type: "place", tile: [3, 4] });
g = applyAction(g, { type: "found", company: "Flux" });
g = applyAction(g, { type: "buy", purchases: { Flux: 2 } });

// When the acting seat is an AI (or you need auto-acknowledge):
g = applyAction(g, aiAction(g));
```

- `applyAction` never mutates its input; it validates everything and throws
  `EngineError` on illegal input. **The engine no longer trusts the UI.**
- `g.phase` tells the UI exactly what to render:
  `place → (found | chooseSurvivor | mergerAnnounce → mergerDecide* → mergerResult*) → buy → …`
  `mergerAnnounce`/`mergerResult` map 1:1 to the popups in the prototype and
  advance via `{ type: "acknowledge" }`.
- `currentActor(g)` gives the seat that must act (mid-merger it is the decider,
  not the turn player). `playableTiles(g, i)` and `convertCapacity(g)` feed the UI.
- **Determinism:** seed + action log = the entire game. `aiAction` is a pure
  function of state (derived RNG, never consumes the game stream). This is what
  makes saves trivial (persist seed + log), replays free, regression tests exact,
  and future async multiplayer a serialization problem instead of a sync problem.

## Bugs fixed relative to the v1.4 prototype

| # | Bug | Fix |
|---|-----|-----|
| 1 | **Regulatory Review did nothing** (no handler) | Full pending-merger mechanic: merger delays one full round; everyone gets a turn (and may buy shares of the merging companies — that's the strategy); sizes and survivor are **recomputed at resolution**; no second card is drawn. |
| 2 | **Valuation Reset did nothing** (`valR` written, never read) | Pricing is state-aware: effective size = size − 3 per draw (floor 2). Cleared when the company goes defunct. |
| 3 | **Strategic Partnership did nothing** (`partner` written, never read) | The two smallest companies price at the **higher** of their effective sizes until either is acquired (then the partnership dissolves). |
| 4 | **Takeover Blocked corrupted the board** (tiles flipped to survivor before the card resolved) | The seam stays a neutral single until the card allows the merger; on cancel it remains a lone tile and no company grew. |
| 5 | **Earnings Miss could split a company** into disconnected islands | Tiles are removed one at a time, only ever choosing one whose removal keeps the company connected. Removed cells are permanently destroyed and tracked (`destroyed`) for tile conservation. |
| 6 | **Free-share mint in 3:2 conversion**: with 1 survivor block left, `floor(gain/2)*3` charged 0 defunct blocks for 1 survivor block | Converts must be complete 3-for-2 sets against remaining capacity (`convertCapacity`), validated at submission. |
| 7 | **Human soft-lock** with an empty hand / unplayable hand and empty pool | One discard-redraw attempt (original behavior), then auto-skip to buy. Game ends when no tile anywhere can ever be placed. |
| 8 | **Non-determinism**: AI used `Math.random()` despite the seeded shuffle | All randomness flows through the state RNG; AI uses a pure derived stream. |
| 9 | **Engine trusted the UI** (no validation on buys or merger decisions) | Everything validated engine-side; illegal actions throw. |
| 10 | **A safe company could be acquired** when Earnings Miss shrank it below an active company | Safe companies are excluded from defunct lists everywhere; a merger with no eligible targets degrades to an expansion. |
| 11 | **Antitrust/Golden Parachute re-applied per defunct** in multi-way mergers (e.g. 6 released blocks instead of 3) | One-shot card effects apply exactly once per merger event. |
| 12 | *(found by simulation)* **Delayed-merger seam theft**: if a third company legally absorbed the neutral seam during the delay round, resolution overwrote that cell and disconnected companies | If the seam is no longer neutral, it is not claimed; targets no longer adjacent to the survivor escape the deal ("the merger falls through"). Caught by invariant checking at seed 1922 — twice. |

Two smaller deliberate changes, documented rather than silent:

- **Liquidation Tax / Due Diligence** now apply to the *whole* merger event in a
  multi-way merger (the original silently reset them after the first defunct).
- **Block supply is tracked** (`issued` per company). Cards that mint blocks
  (Secondary Offering, Antitrust) raise `issued`, so the invariant
  `market + all holdings = issued` holds at every step of every game.

## Design decisions on ambiguous cards

The three dead cards had rules text but no semantics. The implemented semantics:

- **Regulatory Review** — "delayed one round" means everyone (including the
  triggering player) takes one full turn before resolution. New mergers touching
  the pending companies are unplayable during the window (mirrors the safe-safe
  rule); expanding them is allowed and matters, since the survivor is recomputed.
- **Valuation Reset** — a permanent −3 size-equivalent price hit; stacks.
- **Strategic Partnership** — a price link, not a board link: the smaller
  partner rides the larger's valuation until a merger breaks it up.

If you'd rather have different semantics, they're each one small function.

## Invariants enforced in tests (every action, every simulated game)

1. Tile conservation: `pool + hands + board + destroyed = 81`
2. No negative cash; shares are non-negative integers
3. Per-company supply: `market + Σ holdings = issued`
4. Active companies: recorded size == tiles on board, ≥ 2, fully connected
5. Inactive companies own no tiles
6. Same seed → byte-identical game; action-log replay → byte-identical state
7. Every game terminates

## Layout

Source (`mobile/src/engine/`, the single copy the app bundles):

```
types.ts       state, actions, phases — the full data model
constants.ts   all tunables in one place (your v1.4 numbers preserved)
rng.ts         mulberry32, state-passing + pure derived streams
board.ts       adjacency, connectivity, placement analysis
pricing.ts     state-aware pricing, majority/minority bonuses
cards.ts       deck + card effects
engine.ts      newGame / applyAction / invariants — the core
ai.ts          random / greedy / strategic (your heuristics, deterministic)
brain.ts       AI dispatch by player kind
shark.ts       simulation AI
index.ts       the public surface the app and the tests import
```

Tests (`engine/`, this directory):

```
test/              49 tests incl. 220 simulated games; stress sweep behind STRESS=1
vitest.config.ts   aliases `buyout-engine` → ../mobile/src/engine/index.ts
```

## Wiring it to a UI (Expo/React Native or web)

The prototype's render loop maps directly: keep `GameState` in a store, render
by `g.phase`, dispatch the six actions from the components you already have.
The AI turn loop is `while (currentActor is AI) g = applyAction(g, aiAction(g))`
with whatever pacing/animation delays you want between steps — delays are UI
concerns now, not engine ones. Persist `{seedConfig, actions[]}` after every
action and any crash/kill restores by replay.
