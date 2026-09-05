import { describe, expect, it } from "vitest";
import {
  applyAction, canPlay, priceForSize, priceOf, CARD_DEFS,
  type CardDef, type GameState,
} from "buyout-engine";
import { grantShares, handTile, putCompany, scenario } from "./helpers.js";

function card(id: string): CardDef {
  return CARD_DEFS.find((c) => c.id === id)!;
}

/** Standard merger stage: Blink(3) survivor, Zap(2) defunct, seam (0,1) in P1's hand. */
function staged(cardId: string | null, kinds: ("strategic" | "greedy")[] = ["strategic", "greedy"]): GameState {
  const g = scenario(kinds, 42, true);
  g.deck = cardId ? [card(cardId)] : [];
  putCompany(g, "Blink", [[0, 0], [1, 0], [2, 0]]);
  putCompany(g, "Zap", [[0, 2], [1, 2]]);
  handTile(g, 0, [0, 1]);
  return g;
}

describe("blocker cards", () => {
  it("Takeover Blocked: seam stays neutral, no merger, turn ends immediately", () => {
    let g = staged("blocked");
    grantShares(g, 0, "Zap", 2);
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    // Merger cancelled: Zap alive, seam is a lone single, Blink did NOT grow.
    expect(g.cos["Zap"]!.status).toBe("active");
    expect(g.cos["Blink"]!.size).toBe(3);
    expect(g.board[0]![1]).toBe("*");
    // Turn ended immediately (skipped buy): it is now P2's turn.
    expect(g.current).toBe(1);
    expect(g.players[0]!.shares["Zap"]).toBe(2); // untouched
  });

  it("Regulatory Review: merger pends one full round, then resolves with recomputed sizes", () => {
    let g = staged("regulatory");
    grantShares(g, 0, "Zap", 2);
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    expect(g.pendingMerger).not.toBeNull();
    expect(g.phase).toBe("buy"); // triggering player still gets their buy

    // While pending, a tile that would re-trigger the same merger is illegal…
    handTile(g, 1, [1, 1]); // adjacent to Blink (1,0) and Zap (1,2)
    expect(canPlay(g, 1, 1)).toBe(false);
    g.players[1]!.hand = []; // put it aside for the rest of the test
    g.pool.push([1, 1]);

    // …and buying shares of the merging companies during the window is legal.
    g = applyAction(g, { type: "buy", purchases: { Zap: 1 } });
    expect(g.players[0]!.shares["Zap"]).toBe(3);
    expect(g.pendingMerger!.roundsLeft).toBe(1);

    // P2 takes a full turn (their hand was emptied → place auto-skips to buy).
    expect(g.current).toBe(1);
    g = applyAction(g, { type: "buy", purchases: {} });

    // Round complete: merger resolves before P1's place, no second card drawn.
    expect(g.phase).toBe("mergerAnnounce");
    expect(g.mergerCtx!.card).toBeNull();
    expect(g.mergerCtx!.surv).toBe("Blink");
    g = applyAction(g, { type: "acknowledge" });
    g = applyAction(g, { type: "mergerDecision", decision: { sell: 3, convert: 0, hold: 0 } });
    g = applyAction(g, { type: "acknowledge" });
    expect(g.cos["Zap"]!.status).toBe("inactive");
    expect(g.cos["Blink"]!.size).toBe(6);
    // After the delayed resolution, P1 continues with their own turn.
    expect(g.current).toBe(0);
    expect(["place", "buy"]).toContain(g.phase);
  });
});

describe("regulatory edge case found by simulation", () => {
  it("delayed merger falls through when a third company absorbs the seam", () => {
    const g0 = scenario(["strategic", "greedy"], 42, true);
    g0.deck = [card("regulatory")];
    putCompany(g0, "Blink", [[2, 0], [3, 0]]);
    putCompany(g0, "Zap", [[2, 2], [3, 2]]);
    putCompany(g0, "Flux", [[0, 0], [0, 1]]);
    handTile(g0, 0, [2, 1]); // seam between Blink and Zap
    handTile(g0, 1, [1, 1]); // expands Flux and absorbs the seam during the delay

    let g = applyAction(g0, { type: "place", tile: [2, 1] });
    expect(g.phase).toBe("chooseSurvivor"); // Blink and Zap tie at size 2
    g = applyAction(g, { type: "chooseSurvivor", company: "Blink" });
    g = applyAction(g, { type: "acknowledge" }); // regulatory → pending
    expect(g.pendingMerger).not.toBeNull();
    g = applyAction(g, { type: "buy", purchases: {} });

    // P2 expands Flux through (1,1), legally absorbing the neutral seam single.
    g = applyAction(g, { type: "place", tile: [1, 1] });
    expect(g.board[2]![1]).toBe("Flux");
    expect(g.cos["Flux"]!.size).toBe(4);
    g = applyAction(g, { type: "buy", purchases: {} });

    // Round complete → resolution: Blink/Zap still tie, P1 chooses…
    expect(g.phase).toBe("chooseSurvivor");
    expect(g.survivorChoice!.fromPending).toBe(true);
    g = applyAction(g, { type: "chooseSurvivor", company: "Blink" });
    // …but the bridge is gone: the deal falls through, nobody loses tiles.
    expect(g.mergerCtx).toBeNull();
    expect(g.pendingMerger).toBeNull();
    expect(g.cos["Blink"]!.status).toBe("active");
    expect(g.cos["Zap"]!.status).toBe("active");
    expect(g.cos["Blink"]!.size).toBe(2);
    expect(g.cos["Zap"]!.size).toBe(2);
    expect(g.cos["Flux"]!.size).toBe(4);
    expect(g.current).toBe(0);
    expect(g.logs.some((l) => l.includes("falls through"))).toBe(true);
  });
});

describe("market cards (the formerly dead ones)", () => {
  it("Valuation Reset actually lowers price now", () => {
    let g = staged("valreset");
    putCompany(g, "Flux", [[5, 5], [5, 6], [5, 7], [6, 5], [6, 6], [7, 5], [7, 6], [4, 5]]); // size 8 bystander
    const before = priceOf(g, "Flux");
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    expect(g.valR["Flux"]).toBe(-3);
    expect(priceOf(g, "Flux")).toBe(priceForSize(5)); // 8 - 3
    expect(priceOf(g, "Flux")).toBeLessThan(before);
  });

  it("Strategic Partnership links prices, then dissolves when a partner is acquired", () => {
    let g = staged("partner");
    putCompany(g, "Flux", [[5, 5], [5, 6], [5, 7], [6, 5], [6, 6], [6, 7], [7, 5], [7, 6]]); // 8
    putCompany(g, "Neon", [[8, 0], [8, 1], [8, 2]]); // 3
    grantShares(g, 1, "Zap", 1); // ensure a decide phase exists so mid-merger state is observable
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    // Card applied at announce; Zap (size 2) is one of the two smallest.
    expect(g.phase).toBe("mergerDecide");
    expect(g.partner).not.toBeNull();
    expect(g.partner).toContain("Zap");
    g = applyAction(g, { type: "mergerDecision", decision: { sell: 1, convert: 0, hold: 0 } });
    g = applyAction(g, { type: "acknowledge" });
    expect(g.partner).toBeNull(); // dissolved when Zap went defunct
  });

  it("Strategic Partnership prices both at the larger effective size while alive", () => {
    const g = scenario(["strategic", "greedy"]);
    putCompany(g, "Flux", [[5, 5], [5, 6], [5, 7], [6, 5], [6, 6], [6, 7], [7, 5], [7, 6]]); // 8
    putCompany(g, "Neon", [[8, 0], [8, 1], [8, 2]]); // 3
    g.partner = ["Neon", "Flux"];
    expect(priceOf(g, "Neon")).toBe(priceForSize(8));
    expect(priceOf(g, "Flux")).toBe(priceForSize(8));
  });

  it("Earnings Miss shrinks a company but never disconnects it", () => {
    let g = staged("earnings");
    // A straight line: naive edge-tile removal could cut it in half.
    putCompany(g, "Flux", [[5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6]]); // size 7 line
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    expect(g.cos["Flux"]!.size).toBe(4); // lost 3
    expect(g.destroyed).toBe(3);
    // connectivity: remaining tiles form one run
    const cells: number[] = [];
    for (let c = 0; c < 9; c++) if (g.board[5]![c] === "Flux") cells.push(c);
    expect(cells.length).toBe(4);
    expect(cells[cells.length - 1]! - cells[0]!).toBe(3); // contiguous
  });

  it("Secondary Offering mints tracked supply", () => {
    let g = staged("secondary");
    grantShares(g, 0, "Blink", 2);
    const issuedBefore = g.issued["Blink"]!;
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    expect(g.issued["Blink"]).toBe(issuedBefore + 4);
  });
});

describe("windfall & hostile cards", () => {
  it("VC Injection pays everyone", () => {
    let g = staged("vc");
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    expect(g.players[0]!.cash).toBe(125_000);
    expect(g.players[1]!.cash).toBe(125_000);
  });

  it("IPO Bonus pays 3x defunct price to the dealmaker", () => {
    let g = staged("ipo");
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    expect(g.players[0]!.cash).toBe(100_000 + priceForSize(2) * 3);
  });

  it("Liquidation Tax takes 30% of sell proceeds", () => {
    let g = staged("tax");
    grantShares(g, 0, "Zap", 2);
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    const cashBeforeSell = g.players[0]!.cash;
    g = applyAction(g, { type: "mergerDecision", decision: { sell: 2, convert: 0, hold: 0 } });
    const gross = priceForSize(2) * 2;
    expect(g.players[0]!.cash).toBe(cashBeforeSell + gross - Math.floor(gross * 0.3));
  });

  it("Due Diligence Failure halves the sell price", () => {
    let g = staged("duedil");
    grantShares(g, 0, "Zap", 2);
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    const cashBeforeSell = g.players[0]!.cash;
    g = applyAction(g, { type: "mergerDecision", decision: { sell: 2, convert: 0, hold: 0 } });
    expect(g.players[0]!.cash).toBe(cashBeforeSell + Math.floor(priceForSize(2) / 2) * 2);
  });

  it("Golden Parachute grants the defunct's founder survivor blocks (once)", () => {
    let g = staged("golden");
    g.founders["Zap"] = "P2";
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    g = applyAction(g, { type: "acknowledge" }); // result (no shareholders)
    expect(g.players[1]!.shares["Blink"]).toBe(2);
  });

  it("Antitrust Ruling releases 3 survivor blocks with tracked supply", () => {
    let g = staged("antitrust");
    const issuedBefore = g.issued["Blink"]!;
    const marketBefore = g.market["Blink"]!;
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    g = applyAction(g, { type: "acknowledge" });
    expect(g.market["Blink"]).toBe(marketBefore + 3);
    expect(g.issued["Blink"]).toBe(issuedBefore + 3);
  });

  it("Earnout pays $50K when the survivor reaches size 20", () => {
    let g = staged("earnout");
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" });
    g = applyAction(g, { type: "acknowledge" });
    expect(g.earnouts).toEqual([{ player: "P1", company: "Blink" }]);
    expect(g.players[0]!.cash).toBe(100_000); // not paid yet at size 6
  });
});
