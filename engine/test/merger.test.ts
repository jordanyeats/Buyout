import { describe, expect, it } from "vitest";
import { applyAction, priceForSize, EngineError, type GameState } from "buyout-engine";
import { grantShares, handTile, putCompany, scenario } from "./helpers.js";

/** Blink(3) at rows 0-2 col 0; Zap(2) at rows 0-1 col 2; seam at (0,1) in P1's hand. */
function twoWaySetup(opts: { blinkMarketLeft?: number } = {}): GameState {
  const g = scenario(["strategic", "greedy"]);
  putCompany(g, "Blink", [[0, 0], [1, 0], [2, 0]]);
  putCompany(g, "Zap", [[0, 2], [1, 2]]);
  handTile(g, 0, [0, 1]);
  grantShares(g, 0, "Zap", 3);
  grantShares(g, 1, "Zap", 1);
  if (opts.blinkMarketLeft !== undefined) {
    const toRemove = g.market["Blink"]! - opts.blinkMarketLeft;
    grantShares(g, 1, "Blink", toRemove); // park excess Blink blocks on P2
  }
  return g;
}

const zapPrice = priceForSize(2);

describe("two-way merger", () => {
  it("pays sole majority and minority, resolves sells, flips the board", () => {
    let g = twoWaySetup();
    g = applyAction(g, { type: "place", tile: [0, 1] });
    expect(g.phase).toBe("mergerAnnounce");
    expect(g.mergerCtx!.surv).toBe("Blink");
    expect(g.mergerCtx!.defuncts).toEqual(["Zap"]);
    // Seam is NOT yet part of Blink (Takeover Blocked fix).
    expect(g.board[0]![1]).toBe("*");

    g = applyAction(g, { type: "acknowledge" });
    // Bonuses paid: P1 majority (10x), P2 minority (5x).
    expect(g.players[0]!.cash).toBe(100_000 + zapPrice * 10);
    expect(g.players[1]!.cash).toBe(100_000 + zapPrice * 5);
    expect(g.phase).toBe("mergerDecide");

    // P1 sells 3, P2 sells 1.
    g = applyAction(g, { type: "mergerDecision", decision: { sell: 3, convert: 0, hold: 0 } });
    g = applyAction(g, { type: "mergerDecision", decision: { sell: 1, convert: 0, hold: 0 } });
    expect(g.phase).toBe("mergerResult");
    expect(g.players[0]!.cash).toBe(100_000 + zapPrice * 10 + zapPrice * 3);
    expect(g.players[1]!.cash).toBe(100_000 + zapPrice * 5 + zapPrice * 1);

    g = applyAction(g, { type: "acknowledge" });
    expect(g.phase).toBe("buy");
    expect(g.cos["Zap"]!.status).toBe("inactive");
    expect(g.cos["Blink"]!.size).toBe(6); // 3 + seam + 2 flipped
    expect(g.board[0]![1]).toBe("Blink");
    expect(g.board[0]![2]).toBe("Blink");
  });

  it("supports hold — shares survive for a future refounding", () => {
    let g = twoWaySetup();
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    g = applyAction(g, { type: "mergerDecision", decision: { sell: 0, convert: 0, hold: 3 } });
    g = applyAction(g, { type: "mergerDecision", decision: { sell: 1, convert: 0, hold: 0 } });
    expect(g.players[0]!.shares["Zap"]).toBe(3);
    expect(g.cos["Zap"]!.status).toBe("inactive");
  });

  it("converts 3:2 and validates capacity", () => {
    let g = twoWaySetup();
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    g = applyAction(g, { type: "mergerDecision", decision: { sell: 0, convert: 3, hold: 0 } });
    g = applyAction(g, { type: "mergerDecision", decision: { sell: 1, convert: 0, hold: 0 } });
    // Decisions execute at resolution, after every holder has chosen.
    expect(g.phase).toBe("mergerResult");
    expect(g.players[0]!.shares["Blink"]).toBe(2);
    expect(g.players[0]!.shares["Zap"]).toBeUndefined();
  });

  it("rejects non-multiple-of-3 converts and over-capacity converts", () => {
    let g = twoWaySetup();
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    expect(() =>
      applyAction(g, { type: "mergerDecision", decision: { sell: 1, convert: 2, hold: 0 } }),
    ).toThrow(EngineError);
    expect(() =>
      applyAction(g, { type: "mergerDecision", decision: { sell: 4, convert: 0, hold: 0 } }),
    ).toThrow(EngineError); // more than held
  });

  it("REGRESSION (free-share mint): 1 survivor block left cannot satisfy a 3:2 convert", () => {
    let g = twoWaySetup({ blinkMarketLeft: 1 });
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    // The original engine granted 1 Blink block for 0 Zap blocks here.
    expect(() =>
      applyAction(g, { type: "mergerDecision", decision: { sell: 0, convert: 3, hold: 0 } }),
    ).toThrow(/not enough survivor blocks/);
  });

  it("decision must account for every held block", () => {
    let g = twoWaySetup();
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    expect(() =>
      applyAction(g, { type: "mergerDecision", decision: { sell: 2, convert: 0, hold: 0 } }),
    ).toThrow(/account for all/);
  });
});

describe("ties and multi-company mergers", () => {
  it("tie routes through chooseSurvivor", () => {
    const g0 = scenario(["strategic", "greedy"]);
    putCompany(g0, "Blink", [[0, 0], [1, 0]]);
    putCompany(g0, "Zap", [[0, 2], [1, 2]]);
    handTile(g0, 0, [0, 1]);
    let g = applyAction(g0, { type: "place", tile: [0, 1] });
    expect(g.phase).toBe("chooseSurvivor");
    expect(g.survivorChoice!.tied.sort()).toEqual(["Blink", "Zap"]);
    g = applyAction(g, { type: "chooseSurvivor", company: "Zap" });
    expect(g.mergerCtx!.surv).toBe("Zap");
    expect(g.mergerCtx!.defuncts).toEqual(["Blink"]);
  });

  it("three-way merger: both defuncts resolve, board consolidates", () => {
    const g0 = scenario(["strategic", "greedy"]);
    putCompany(g0, "Blink", [[0, 0], [1, 0], [2, 0], [3, 0]]); // size 4 - survivor
    putCompany(g0, "Zap", [[0, 2], [0, 3]]); // size 2
    putCompany(g0, "Flux", [[2, 1], [2, 2], [3, 2]]); // size 3
    handTile(g0, 0, [1, 1]); // neighbors: (1,0) Blink, (0,1) empty, (2,1) Flux, (1,2) empty
    putCompany(g0, "Neon", [[7, 7], [8, 7]]); // bystander
    // make seam touch Zap too: place Zap adjacent via (0,1)
    g0.board[0]![1] = "Zap";
    // fix bookkeeping for that manual cell: pull (0,1) from pool and grow Zap
    g0.pool = g0.pool.filter((t) => !(t[0] === 0 && t[1] === 1));
    g0.cos["Zap"]!.size = 3;

    let g = applyAction(g0, { type: "place", tile: [1, 1] });
    expect(g.phase).toBe("mergerAnnounce");
    expect(g.mergerCtx!.surv).toBe("Blink");
    expect(g.mergerCtx!.defuncts.slice().sort()).toEqual(["Flux", "Zap"]); // both size 3
    g = applyAction(g, { type: "acknowledge" });
    // no shareholders in either defunct → straight through both results
    expect(g.phase).toBe("mergerResult");
    g = applyAction(g, { type: "acknowledge" });
    expect(g.phase).toBe("mergerResult"); // second defunct
    g = applyAction(g, { type: "acknowledge" });
    expect(g.phase).toBe("buy");
    expect(g.cos["Blink"]!.size).toBe(4 + 1 + 3 + 3);
    expect(g.cos["Flux"]!.status).toBe("inactive");
    expect(g.cos["Zap"]!.status).toBe("inactive");
  });

  it("a shrunk-but-safe company cannot be acquired; merger degrades to expansion", () => {
    const g0 = scenario(["strategic", "greedy"]);
    putCompany(g0, "Blink", [[0, 0], [1, 0], [2, 0]]); // size 3, active
    putCompany(g0, "Zap", [[0, 2], [1, 2]]); // size 2 but marked safe (post-Earnings-Miss state)
    g0.cos["Zap"]!.status = "safe";
    handTile(g0, 0, [0, 1]);
    const g = applyAction(g0, { type: "place", tile: [0, 1] });
    expect(g.phase).toBe("buy"); // no merger happened
    expect(g.cos["Zap"]!.status).toBe("safe");
    expect(g.cos["Blink"]!.size).toBe(4); // grew by seam only
  });
});
