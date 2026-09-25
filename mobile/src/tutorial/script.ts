import {
  CONVERT_FROM, CONVERT_TO, END_SIZE, MAJORITY_MULT, MINORITY_MULT, SAFE_SIZE, START_CASH,
  WARN_SIZE, newGame, priceForSize, type Action, type GameState, type PlayerKind, type Tile,
} from "../engine";

const usd = (n: number) => "$" + n.toLocaleString("en-US");

/**
 * Lesson four's company and the holdings around it, named once so the copy
 * and the board it describes cannot drift apart. The figures in that lesson
 * are the real ones the engine would pay.
 */
const ZAP_TILES: Tile[] = [[2, 2], [2, 3], [3, 2], [3, 3], [2, 4]];
const ZAP_YOU = 4;
const ZAP_RIVAL = 3;
const ZAP_PRICE = priceForSize(ZAP_TILES.length);

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
      "Each turn you place one tile from your hand onto the grid. Lone tiles are unincorporated offices — worth nothing yet, but every company starts as one. Not every square stays open to you: once companies grow, a tile that would join two of them that are safe from takeover is barred. The board is empty for now, so either of yours will do — place one.",
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
    headline: "One share, and what it is worth",
    body:
      `Zap is ${ZAP_TILES.length} tiles, so a share costs ${usd(ZAP_PRICE)}. If it were taken over this minute its largest holder would collect ${MAJORITY_MULT}× that — ${usd(ZAP_PRICE * MAJORITY_MULT)}, more than the ${usd(START_CASH)} you opened the game with — and second place ${MINORITY_MULT}×, ${usd(ZAP_PRICE * MINORITY_MULT)}. Hold a company alone and you take both. You have ${ZAP_YOU} Zap to your rival's ${ZAP_RIVAL}: one share between you, and today it is worth the ${usd(ZAP_PRICE * (MAJORITY_MULT - MINORITY_MULT))} difference. More as the company grows, because both bonuses are charged at whatever the price has become. That is what every merger is a fight over. In the listings, a filled square marks a company where you hold majority; an outlined square marks one you founded.`,
    build: () => {
      const g = base(["human", "strategic"], 14);
      putCompany(g, "Zap", ZAP_TILES);
      grantShares(g, 0, "Zap", ZAP_YOU);
      grantShares(g, 1, "Zap", ZAP_RIVAL);
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
      `Your shares in the company that just vanished have to go somewhere, and the three doors lead to very different places. Selling turns them into cash at its last price — certain, and the only one that pays you today. Converting trades ${CONVERT_FROM} of them for ${CONVERT_TO} of the survivor: you give up a third of your count, but the survivor is the larger company, and its ${MAJORITY_MULT}× is charged at its price rather than this one's. Convert when you mean to fight for majority there. Holding is a bet that the name comes back — its slot returns to the shelf, and shares you kept wake up at the new price if anyone founds it again. If nobody does before the closing bell they pay nothing at all, so hold while there is still game left for the name to return, and never at the end. Make your settlement.`,
    build: null, // continues the merger from lesson five
    goal: (a) => a.type === "mergerDecision",
  },
  {
    kicker: "Final lesson",
    headline: "Safe from takeover, and the closing bell",
    body:
      `At size ${SAFE_SIZE} a company is SAFE FROM TAKEOVER — the board stamps it, and from then on the traffic runs one way: it can still absorb its neighbours, but nothing can ever absorb it. When any company reaches size ${WARN_SIZE}, the ticker warns you the closing bell is near; at ${END_SIZE} the game ends — final bonuses pay, every share liquidates, and the largest fortune wins. That's the whole game. The desk is yours.`,
    build: null,
    goal: null,
  },
];
