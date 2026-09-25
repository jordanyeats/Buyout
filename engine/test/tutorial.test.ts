import { describe, expect, it } from "vitest";
import { MAJORITY_MULT, MINORITY_MULT, priceOf, type GameState } from "buyout-engine";
// The tutorial is copy, not engine, but it quotes the engine's numbers and
// states its rules — and this is the repo's only test runner.
import { TUTORIAL } from "../../mobile/src/tutorial/script";

const usd = (n: number) => "$" + n.toLocaleString("en-US");
const step = (headline: string) => {
  const s = TUTORIAL.find((t) => t.headline === headline);
  if (!s) throw new Error(`no lesson headlined "${headline}"`);
  return s;
};

describe("tutorial copy", () => {
  it("leaves nothing unresolved", () => {
    for (const s of TUTORIAL) {
      expect(s.body, s.headline).not.toMatch(/undefined|NaN|\$\{|\[object/);
      expect(s.body.length, s.headline).toBeGreaterThan(40);
    }
  });

  it("quotes the bonuses the engine would actually pay", () => {
    // Lesson four names a price and both bonuses for the company it puts on
    // the board. Those are the numbers that drift when a constant moves.
    const s = step("One share, and what it is worth");
    const g: GameState = s.build!();
    const price = priceOf(g, "Zap");
    expect(s.body).toContain(usd(price));
    expect(s.body).toContain(usd(price * MAJORITY_MULT));
    expect(s.body).toContain(usd(price * MINORITY_MULT));
    // The swing it calls "one share" is the gap between the two seats.
    expect(s.body).toContain(usd(price * (MAJORITY_MULT - MINORITY_MULT)));
  });

  it("describes the holdings it actually deals", () => {
    const s = step("One share, and what it is worth");
    const g: GameState = s.build!();
    const you = g.players[0]!.shares["Zap"] ?? 0;
    const rival = g.players[1]!.shares["Zap"] ?? 0;
    expect(you - rival).toBe(1);           // the whole point of the lesson
    expect(s.body).toContain(`${you} Zap to your rival's ${rival}`);
  });

  it("does not tell players a tile may go anywhere", () => {
    // It can't: a tile joining two companies safe from takeover is illegal.
    for (const s of TUTORIAL) expect(s.body).not.toMatch(/tile anywhere/i);
  });
});
