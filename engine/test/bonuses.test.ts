import { describe, expect, it } from "vitest";
import { MAJORITY_MULT, MINORITY_MULT, payBonuses, priceOf, type GameState } from "buyout-engine";
import { grantShares, putCompany, scenario } from "./helpers.js";

/**
 * Majority / minority bonus payout, with attention to ties.
 *
 * A tie for majority used to pay the tied holders BOTH bonuses and pay the
 * runner-up nothing, however many shares they held. A tie for first does not
 * erase second place: the tie splits the majority bonus, and the minority
 * bonus still goes to whoever is genuinely behind them.
 */

function table(holders: number[]): { g: GameState; price: number } {
  const g = scenario(holders.map(() => "greedy"), 42, false);
  putCompany(g, "Zap", [[0, 0], [0, 1], [0, 2], [0, 3]]);
  holders.forEach((n, i) => { if (n > 0) grantShares(g, i, "Zap", n); });
  return { g, price: priceOf(g, "Zap") };
}

const cashOf = (g: GameState) => g.players.map((p) => p.cash);

describe("majority and minority bonuses", () => {
  it("a sole holder with no rivals takes both bonuses", () => {
    const { g, price } = table([4, 0]);
    const before = cashOf(g);
    payBonuses(g, "Zap", g.logs);
    expect(g.players[0]!.cash - before[0]!).toBe(price * MAJORITY_MULT + price * MINORITY_MULT);
    expect(g.players[1]!.cash - before[1]!).toBe(0);
  });

  it("a clear first and second split majority and minority as usual", () => {
    const { g, price } = table([5, 3]);
    const before = cashOf(g);
    payBonuses(g, "Zap", g.logs);
    expect(g.players[0]!.cash - before[0]!).toBe(price * MAJORITY_MULT);
    expect(g.players[1]!.cash - before[1]!).toBe(price * MINORITY_MULT);
  });

  it("two tied holders and nobody else split both bonuses", () => {
    const { g, price } = table([6, 6]);
    const before = cashOf(g);
    payBonuses(g, "Zap", g.logs);
    const each = Math.floor((price * MAJORITY_MULT + price * MINORITY_MULT) / 2);
    expect(g.players[0]!.cash - before[0]!).toBe(each);
    expect(g.players[1]!.cash - before[1]!).toBe(each);
  });

  it("a tie for first does not rob second place", () => {
    // The reported case: Gregor 6, Rando 6, Stratton 5, You 3.
    const { g, price } = table([6, 6, 5, 3]);
    const before = cashOf(g);
    payBonuses(g, "Zap", g.logs);

    const eachMaj = Math.floor((price * MAJORITY_MULT) / 2);
    expect(g.players[0]!.cash - before[0]!).toBe(eachMaj);
    expect(g.players[1]!.cash - before[1]!).toBe(eachMaj);
    // Second position collects the whole minority bonus rather than nothing.
    expect(g.players[2]!.cash - before[2]!).toBe(price * MINORITY_MULT);
    // Fourth place is not a bonus position.
    expect(g.players[3]!.cash - before[3]!).toBe(0);
  });

  it("three-way tie for first still pays the runner-up", () => {
    const { g, price } = table([4, 4, 4, 2]);
    const before = cashOf(g);
    payBonuses(g, "Zap", g.logs);
    const eachMaj = Math.floor((price * MAJORITY_MULT) / 3);
    for (const i of [0, 1, 2]) expect(g.players[i]!.cash - before[i]!).toBe(eachMaj);
    expect(g.players[3]!.cash - before[3]!).toBe(price * MINORITY_MULT);
  });

  it("tied second place splits the minority bonus between them", () => {
    const { g, price } = table([6, 6, 3, 3]);
    const before = cashOf(g);
    payBonuses(g, "Zap", g.logs);
    const eachMin = Math.floor((price * MINORITY_MULT) / 2);
    expect(g.players[2]!.cash - before[2]!).toBe(eachMin);
    expect(g.players[3]!.cash - before[3]!).toBe(eachMin);
  });

  it("never pays out more than the two bonuses combined", () => {
    for (const holders of [[6, 6, 5, 3], [4, 4, 4, 2], [6, 6, 3, 3], [5, 3], [4, 0]]) {
      const { g, price } = table(holders);
      const before = cashOf(g).reduce((a, b) => a + b, 0);
      payBonuses(g, "Zap", g.logs);
      const paid = cashOf(g).reduce((a, b) => a + b, 0) - before;
      expect(paid).toBeLessThanOrEqual(price * MAJORITY_MULT + price * MINORITY_MULT);
    }
  });
});
