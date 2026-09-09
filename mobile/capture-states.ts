// Marketing screenshot states — dev-only, excluded from release builds.
import { SAFE_SIZE, applyAction, newGame, type GameState, type PlayerConfig, type Tile } from "./src/engine";

function base(seed = 42): GameState {
  const configs: PlayerConfig[] = [
    { name: "You", kind: "human" },
    { name: "Stratton", kind: "strategic" },
    { name: "Marlow", kind: "shark" },
    { name: "Gregor", kind: "greedy" },
  ];
  const g = newGame(configs, seed, false);
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

/** Rich mid-game board shared by several captures. */
function midGame(seed: number): GameState {
  const g = base(seed);
  putCompany(g, "Pogo", [[5, 5], [5, 6], [5, 7], [6, 5], [6, 6], [6, 7], [7, 5], [7, 6], [7, 7], [8, 6], [4, 6]]);
  putCompany(g, "Spark", [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [0, 2]]);
  putCompany(g, "Blink", [[4, 1], [4, 2], [5, 1], [5, 2]]);
  putCompany(g, "Neon", [[0, 6], [0, 7], [1, 7]]);
  putSingle(g, [2, 4]);
  putSingle(g, [7, 1]);
  putSingle(g, [3, 8]);
  putSingle(g, [8, 0]);
  handTile(g, 0, [3, 4]);
  handTile(g, 0, [6, 1]);
  handTile(g, 0, [2, 6]);
  handTile(g, 0, [8, 8]);
  handTile(g, 0, [1, 3]);
  handTile(g, 0, [4, 4]);
  grantShares(g, 0, "Pogo", 7);
  grantShares(g, 0, "Spark", 4);
  grantShares(g, 0, "Blink", 2);
  grantShares(g, 1, "Pogo", 5);
  grantShares(g, 1, "Neon", 3);
  grantShares(g, 2, "Spark", 3);
  grantShares(g, 2, "Pogo", 3);
  grantShares(g, 3, "Blink", 2);
  grantShares(g, 3, "Neon", 2);
  g.founders["Pogo"] = "You";
  g.founders["Spark"] = "Stratton";
  g.founders["Blink"] = "Gregor";
  g.founders["Neon"] = "Marlow";
  g.players[0]!.cash = 37600;
  g.players[1]!.cash = 29800;
  g.players[2]!.cash = 41200;
  g.players[3]!.cash = 18400;
  g.turn = 19;
  g.current = 0;
  g.logs.push("Stratton buys 2 Pogo.", "Marlow places G4.", "Gregor buys 1 Blink, 1 Neon.");
  return g;
}

/** Merger-ready board: placing E4 bridges Pogo (large) and Spark (small). */
function mergerReady(seed: number): GameState {
  const g = base(seed);
  putCompany(g, "Pogo", [[3, 5], [3, 6], [4, 5], [4, 6], [5, 5], [5, 6], [4, 7], [5, 7], [3, 7]]);
  putCompany(g, "Spark", [[3, 1], [3, 2], [4, 1], [4, 2], [4, 3]]);
  putCompany(g, "Neon", [[0, 7], [0, 8], [1, 8]]);
  putSingle(g, [7, 2]);
  putSingle(g, [8, 7]);
  handTile(g, 0, [4, 4]); // the bridge: E5
  handTile(g, 0, [7, 0]);
  handTile(g, 0, [1, 2]);
  handTile(g, 0, [8, 3]);
  handTile(g, 0, [2, 8]);
  handTile(g, 0, [6, 6]);
  grantShares(g, 0, "Spark", 6);
  grantShares(g, 1, "Spark", 3);
  grantShares(g, 2, "Spark", 2);
  grantShares(g, 0, "Pogo", 4);
  grantShares(g, 2, "Pogo", 6);
  grantShares(g, 3, "Neon", 2);
  g.founders["Spark"] = "You";
  g.founders["Pogo"] = "Marlow";
  g.players[0]!.cash = 22300;
  g.players[1]!.cash = 31900;
  g.players[2]!.cash = 27750;
  g.players[3]!.cash = 19100;
  g.turn = 14;
  g.current = 0;
  return g;
}

export const CAPTURES: Record<string, () => GameState> = {
  // 1 — hero: mid-game board, your move.
  board: () => midGame(21),

  // 2 — buy phase: prices low to steep.
  buy: () => {
    const g = midGame(22);
    g.phase = "buy";
    return g;
  },

  // 3 — the merger front page.
  merger: () => {
    const g = mergerReady(23);
    return applyAction(g, { type: "place", tile: [4, 4] });
  },

  // 4 — settlement: sell / convert / hold.
  settle: () => {
    const g = mergerReady(24);
    const announced = applyAction(g, { type: "place", tile: [4, 4] });
    return applyAction(announced, { type: "acknowledge" });
  },

  // 5 — final edition: the game is over and you won.
  final: () => {
    const g = midGame(25);
    g.over = true;
    g.winner = "You";
    g.endReason = "Pogo reached the closing bell";
    g.players[0]!.cash = 512300;
    g.players[1]!.cash = 287100;
    g.players[2]!.cash = 341900;
    g.players[3]!.cash = 154800;
    g.turn = 47;
    return g;
  },
};
