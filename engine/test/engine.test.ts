import { describe, expect, it } from "vitest";
import { applyAction, newGame, priceOf, EngineError, MAX_BUY } from "buyout-engine";
import { cfg, grantShares, handTile, putCompany, putSingle, scenario } from "./helpers.js";

describe("buy validation (engine no longer trusts the UI)", () => {
  function buyable() {
    const g = scenario(["strategic", "greedy"]);
    putCompany(g, "Blink", [[0, 0], [1, 0]]);
    handTile(g, 0, [8, 8]);
    let s = applyAction(g, { type: "place", tile: [8, 8] });
    expect(s.phase).toBe("buy");
    return s;
  }

  it("rejects buying more than the per-turn limit", () => {
    const g = buyable();
    expect(() => applyAction(g, { type: "buy", purchases: { Blink: MAX_BUY + 1 } })).toThrow(EngineError);
  });

  it("rejects overspending", () => {
    const g = buyable();
    g.players[0]!.cash = priceOf(g, "Blink") - 100;
    expect(() => applyAction(g, { type: "buy", purchases: { Blink: 1 } })).toThrow(/insufficient cash/);
  });

  it("rejects inactive companies and exceeding market supply", () => {
    const g = buyable();
    expect(() => applyAction(g, { type: "buy", purchases: { Pogo: 1 } })).toThrow(/not active/);
    const g2 = buyable();
    g2.market["Blink"] = 1;
    g2.issued["Blink"] = 1 + (g2.players[0]!.shares["Blink"] ?? 0) + (g2.players[1]!.shares["Blink"] ?? 0);
    expect(() => applyAction(g2, { type: "buy", purchases: { Blink: 2 } })).toThrow(/available/);
  });

  it("accepts a legal purchase and moves supply", () => {
    let g = buyable();
    const price = priceOf(g, "Blink");
    const mkt = g.market["Blink"]!;
    g = applyAction(g, { type: "buy", purchases: { Blink: 2 } });
    expect(g.players[0]!.shares["Blink"]).toBe(2);
    expect(g.market["Blink"]).toBe(mkt - 2);
    expect(g.players[0]!.cash).toBe(100_000 - 2 * price);
  });
});

describe("soft-lock fixes", () => {
  it("a player with an empty hand and empty pool auto-skips to buy", () => {
    const g = scenario(["strategic", "greedy"]);
    putCompany(g, "Blink", [[0, 0], [1, 0]]);
    handTile(g, 0, [8, 8]); // P1 has one playable tile
    handTile(g, 1, [4, 4]); // P2 has two, so the game stays alive
    handTile(g, 1, [5, 5]);
    g.destroyed += g.pool.length; // burn the rest of the pool for the scenario
    g.pool = [];
    let s = applyAction(g, { type: "place", tile: [8, 8] });
    s = applyAction(s, { type: "buy", purchases: {} });
    // P1's hand could not refill (pool empty); it is now P2's turn.
    expect(s.current).toBe(1);
    expect(s.phase).toBe("place");
    s = applyAction(s, { type: "place", tile: [4, 4] });
    s = applyAction(s, { type: "buy", purchases: {} });
    // Back to P1: hand empty, pool empty → the original soft-locked here.
    expect(s.over).toBe(false);
    expect(s.current).toBe(0);
    expect(s.phase).toBe("buy");
  });

  it("game ends when no tile anywhere can ever be placed again", () => {
    const g = scenario(["strategic", "greedy"]);
    putCompany(g, "Blink", [[0, 0], [1, 0]]);
    handTile(g, 0, [8, 8]);
    g.destroyed += g.pool.length;
    g.pool = [];
    let s = applyAction(g, { type: "place", tile: [8, 8] });
    s = applyAction(s, { type: "buy", purchases: {} });
    // Nobody has tiles, pool empty → final scoring fired.
    expect(s.over).toBe(true);
    expect(s.winner).not.toBeNull();
  });

  it("placing between two safe companies is illegal", () => {
    const g = scenario(["strategic", "greedy"]);
    const blink: [number, number][] = [];
    const zap: [number, number][] = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 3; c++) blink.push([r, c]);
    for (let r = 0; r < 9; r++) for (let c = 4; c < 7; c++) zap.push([r, c]);
    putCompany(g, "Blink", blink.slice(0, 25));
    putCompany(g, "Zap", zap.slice(0, 25));
    expect(g.cos["Blink"]!.status).toBe("safe");
    expect(g.cos["Zap"]!.status).toBe("safe");
    handTile(g, 0, [0, 3]); // adjacent to (0,2) Blink and (0,4) Zap — both safe
    expect(() => applyAction(g, { type: "place", tile: [0, 3] })).toThrow(/illegal/);
  });
});

describe("founding", () => {
  it("founds a company with connected singles and grants founder blocks", () => {
    const g = scenario(["strategic", "greedy"]);
    putSingle(g, [3, 3]);
    putSingle(g, [3, 4]);
    handTile(g, 0, [3, 5]);
    let s = applyAction(g, { type: "place", tile: [3, 5] });
    expect(s.phase).toBe("found");
    s = applyAction(s, { type: "found", company: "Flux" });
    expect(s.cos["Flux"]!.size).toBe(3);
    expect(s.players[0]!.shares["Flux"]).toBe(1);
    expect(s.founders["Flux"]).toBe("P1");
    expect(s.phase).toBe("buy");
  });

  it("rejects founding an active company", () => {
    const g = scenario(["strategic", "greedy"]);
    putCompany(g, "Blink", [[0, 0], [1, 0]]);
    putSingle(g, [3, 3]);
    handTile(g, 0, [3, 4]);
    let s = applyAction(g, { type: "place", tile: [3, 4] });
    expect(s.phase).toBe("found");
    expect(() => applyAction(s, { type: "found", company: "Blink" })).toThrow(EngineError);
  });
});

describe("misc engine guards", () => {
  it("placing a tile not in hand throws", () => {
    const g = newGame(cfg("strategic", "greedy"), 7, false);
    const inHand = new Set(g.players[0]!.hand.map(([r, c]) => r + "," + c));
    let free: [number, number] = [0, 0];
    outer: for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!inHand.has(r + "," + c)) { free = [r, c]; break outer; }
    expect(() => applyAction(g, { type: "place", tile: free })).toThrow(/not in hand/);
  });

  it("actions on a finished game throw", () => {
    const g = newGame(cfg("strategic", "greedy"), 7, false);
    g.over = true;
    expect(() => applyAction(g, { type: "acknowledge" })).toThrow(/over/);
  });
});
