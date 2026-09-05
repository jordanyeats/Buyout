import { describe, expect, it } from "vitest";
import { applyAction, priceOf, type GameState } from "buyout-engine";
import { grantShares, handTile, putCompany, scenario } from "./helpers.js";

/**
 * survPriceBefore backs the market wrap's "shareholder value has increased by
 * $X per share" line. It must be the survivor's price immediately before the
 * defunct being resolved is absorbed — not the price at the start of a
 * multi-company merger, which would overstate every step after the first.
 */

/** Blink(3) absorbs Zap(2) across seam (0,1). */
function twoWay(): GameState {
  const g = scenario(["strategic", "greedy"], 42, false);
  putCompany(g, "Blink", [[0, 0], [1, 0], [2, 0]]);
  putCompany(g, "Zap", [[0, 2], [1, 2]]);
  handTile(g, 0, [0, 1]);
  return g;
}

describe("merger shareholder value", () => {
  it("records the survivor price from before the absorption", () => {
    let g = twoWay();
    const priceBefore = priceOf(g, "Blink");
    g = applyAction(g, { type: "place", tile: [0, 1] });
    expect(g.mergerCtx!.survPriceBefore).toBe(priceBefore);
  });

  it("the gain is positive once the survivor has grown", () => {
    let g = twoWay();
    g = applyAction(g, { type: "place", tile: [0, 1] });
    g = applyAction(g, { type: "acknowledge" }); // dismiss the announcement
    const ctx = g.mergerCtx!;
    const gain = priceOf(g, ctx.surv) - ctx.survPriceBefore;
    // Blink went from 3 tiles to 6 (3 + seam + Zap's 2), so its price rose.
    expect(g.cos["Blink"]!.size).toBe(6);
    expect(gain).toBeGreaterThan(0);
  });

  it("re-samples per defunct so a three-way merger does not double-count", () => {
    // Seam (1,1) touches Blink at (1,0), Zap at (0,1), and Flux at (2,1),
    // so one placement folds both smaller companies into Blink.
    const g0 = scenario(["strategic", "greedy"], 7, false);
    putCompany(g0, "Blink", [[0, 0], [1, 0], [2, 0]]);
    putCompany(g0, "Zap", [[0, 1], [0, 2]]);
    putCompany(g0, "Flux", [[2, 1], [2, 2]]);
    handTile(g0, 0, [1, 1]);
    // Give player 1 shares in both so each defunct raises a settlement step.
    grantShares(g0, 0, "Zap", 2);
    grantShares(g0, 0, "Flux", 2);

    let g = applyAction(g0, { type: "place", tile: [1, 1] });
    g = applyAction(g, { type: "acknowledge" });

    const seen: { defunct: string; before: number }[] = [];
    let guard = 0;
    while (g.mergerCtx && guard++ < 40) {
      const ctx = g.mergerCtx;
      if (g.phase === "mergerDecide") {
        const dn = ctx.defuncts[ctx.di]!;
        if (!seen.some((s) => s.defunct === dn)) {
          seen.push({ defunct: dn, before: ctx.survPriceBefore });
        }
        const held = g.players[ctx.decider!]!.shares[dn] ?? 0;
        g = applyAction(g, { type: "mergerDecision", decision: { sell: held, convert: 0, hold: 0 } });
      } else if (g.phase === "mergerResult" || g.phase === "mergerAnnounce") {
        g = applyAction(g, { type: "acknowledge" });
      } else {
        break;
      }
    }

    expect(seen).toHaveLength(2);
    // The survivor grows as it eats each company, so the second sample must be
    // strictly higher than the first — proof the value is re-read, not cached.
    expect(seen[1]!.before).toBeGreaterThan(seen[0]!.before);
  });
});
