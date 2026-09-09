import {
  SAFE_SIZE, newGame, type Action, type GameState, type PlayerKind, type Tile,
} from "../engine";

/** ---- state builders (mirror the engine test helpers) ---- */

function base(kinds: PlayerKind[], seed = 42): GameState {
  const g = newGame(kinds.map((k, i) => ({ name: i === 0 ? "You" : "Rival", kind: k })), seed, false);
  for (const p of g.players) {
    g.pool.push(...p.hand);
    p.hand = [];
  }
  g.phase = "place";
  return g;
}

function take(g: GameState, t: Tile): void {
  g.pool = g.pool.filter((x) => !(x[0] === t[0] && x[1] === t[1]));
}

function putCompany(g: GameState, name: string, tiles: Tile[]): void {
  for (const t of tiles) {
    take(g, t);
    g.board[t[0]]![t[1]] = name;
  }
  const co = g.cos[name]!;
  co.size = tiles.length;
  co.status = co.size >= SAFE_SIZE ? "safe" : "active";
}

function putSingle(g: GameState, t: Tile): void {
  take(g, t);
  g.board[t[0]]![t[1]] = "*";
}

function handTile(g: GameState, idx: number, t: Tile): void {
  take(g, t);
  g.players[idx]!.hand.push(t);
}

function grantShares(g: GameState, idx: number, co: string, n: number): void {
  g.market[co]! -= n;
  g.players[idx]!.shares[co] = (g.players[idx]!.shares[co] ?? 0) + n;
}

/** ---- the lesson script ---- */

export interface TutorialStep {
  kicker: string;
  headline: string;
  body: string;
  /** Build a fresh state for this step; null = continue the current game. */
  build: (() => GameState) | null;
  /** Advance when an applied action satisfies this; null = info step (Next button). */
  goal: ((a: Action, after: GameState) => boolean) | null;
  hint?: string;
}

export const TUTORIAL: TutorialStep[] = [
  {
    kicker: "Lesson one",
    headline: "The board is the market",
    body:
      "Each turn you place one tile from your hand onto the grid. Lone tiles are unincorporated offices — worth nothing yet, but every company starts as one. Place your first tile anywhere.",
    build: () => {
      const g = base(["human", "strategic"], 11);
      handTile(g, 0, [4, 4]);
      handTile(g, 0, [1, 7]);
      return g;
    },
    goal: (a) => a.type === "place",
  },
  {
    kicker: "Lesson two",
    headline: "Touch two tiles, found a startup",
    body:
      "Placing next to an unincorporated tile founds a company. You choose which of the six startups it becomes — and you receive one free share as the founder. Place the tile touching the lone office, then pick any company.",
    build: () => {
      const g = base(["human", "strategic"], 12);
      putSingle(g, [4, 4]); // D5's neighbor
      handTile(g, 0, [4, 3]);
      return g;
    },
    goal: (a) => a.type === "found",
    hint: "Place the tile touching the lone office, then choose a company.",
  },
  {
    kicker: "Lesson three",
    headline: "Buy low, before it grows",
    body:
      "After placing, you may buy up to three shares per turn. Price rises steeply with company size, so the early shares are the cheap ones. Blink sits at size 2 — buy at least one share, then end your turn.",
    build: () => {
      const g = base(["human", "strategic"], 13);
      putCompany(g, "Blink", [[3, 3], [3, 4]]);
      g.phase = "buy";
      return g;
    },
    goal: (a) => a.type === "buy" && Object.values(a.purchases).some((v) => v > 0),
  },
  {
    kicker: "Lesson four",
    headline: "Majority is everything",
    body:
      "When a company is taken over, its top shareholder collects a bonus of 10× the share price; the runner-up collects 5×. An investor who holds a company alone collects both. Every merger is really a fight over these two seats. Holding one share more than a rival can be worth six figures. In the market listings, a filled square marks a company where you hold majority; an outlined square marks one you founded. Study the listings below — you outhold your rival in Zap — then read on.",
    build: () => {
      const g = base(["human", "strategic"], 14);
      putCompany(g, "Zap", [[2, 2], [2, 3], [3, 2], [3, 3], [2, 4]]);
      grantShares(g, 0, "Zap", 4);
      grantShares(g, 1, "Zap", 3);
      g.phase = "buy";
      return g;
    },
    goal: null,
  },
  {
    kicker: "Lesson five",
    headline: "The merger",
    body:
      "Place a tile between two companies and the larger absorbs the smaller. The front page will tell you what happened; bonuses pay out at once. You hold 4 Zap and your rival holds 2 — trigger the merger at E3 and read the news.",
    build: () => {
      const g = base(["human", "strategic"], 15);
      putCompany(g, "Blink", [[2, 1], [2, 2], [2, 3], [3, 1], [4, 1]]);
      putCompany(g, "Zap", [[2, 5], [2, 6], [3, 6]]);
      grantShares(g, 0, "Zap", 4);
      grantShares(g, 1, "Zap", 2);
      handTile(g, 0, [2, 4]); // E3 in board terms: row 2, col 4
      handTile(g, 0, [8, 0]);
      return g;
    },
    goal: (a) => a.type === "acknowledge",
    hint: "Place E3 — the tile touching both companies — then continue past the front page.",
  },
  {
    kicker: "Lesson six",
    headline: "Sell, convert, or hold",
    body:
      "Your defunct shares must go somewhere. Sell for cash now; convert three-for-two into the survivor; or hold, betting the name gets refounded later. Converting keeps you in the majority race for the bigger company. Make your settlement.",
    build: null, // continues the merger from lesson five
    goal: (a) => a.type === "mergerDecision",
  },
  {
    kicker: "Final lesson",
    headline: "Safety, and the closing bell",
    body:
      "At size 25 a company is SAFE — it can never be taken over; it can only take over others. When any company reaches size 30, the ticker warns you the closing bell is near; at 35 the game ends — final bonuses pay, every share liquidates, and the largest fortune wins. That's the whole game. The desk is yours.",
    build: null,
    goal: null,
  },
];
