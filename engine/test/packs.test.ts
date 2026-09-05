import { describe, expect, it } from "vitest";
import { CARD_DEFS, CLEAN_COUNT, newGame, type PlayerConfig } from "../src/index.js";

const CONFIGS: PlayerConfig[] = [
  { name: "You", kind: "human" },
  { name: "Rival", kind: "greedy" },
];

const deckOf = (options = {}) => newGame(CONFIGS, 1234, true, options).deck;
const cleansIn = (deck: { id: string }[]) => deck.filter((c) => c.id === "clean").length;

describe("deck composition options", () => {
  it("defaults to every card plus the standard clean count", () => {
    const deck = deckOf();
    expect(deck).toHaveLength(CARD_DEFS.length + CLEAN_COUNT);
    expect(cleansIn(deck)).toBe(CLEAN_COUNT);
  });

  it("cleanCount controls how many Clean Acquisitions are shuffled in", () => {
    const deck = deckOf({ cleanCount: 4 });
    expect(cleansIn(deck)).toBe(4);
    expect(deck).toHaveLength(CARD_DEFS.length + 4);
  });

  it("cleanCount of 0 removes them entirely without breaking the deck", () => {
    const deck = deckOf({ cleanCount: 0 });
    expect(cleansIn(deck)).toBe(0);
    expect(deck).toHaveLength(CARD_DEFS.length);
  });

  it("a negative cleanCount is floored at zero rather than throwing", () => {
    expect(cleansIn(deckOf({ cleanCount: -5 }))).toBe(0);
  });

  it("excludedCards and cleanCount compose, as the Hard pack needs", () => {
    const cuts = ["vc", "ipo", "golden"];
    const deck = deckOf({ excludedCards: cuts, cleanCount: 4 });
    for (const id of cuts) expect(deck.some((c) => c.id === id)).toBe(false);
    expect(deck).toHaveLength(CARD_DEFS.length - cuts.length + 4);
  });

  it("the Easy cut leaves nothing devastating or hostile in the deck", () => {
    const cuts = CARD_DEFS.filter((c) => c.dev || c.cat === "hostile").map((c) => c.id);
    const deck = deckOf({ excludedCards: cuts });
    expect(cuts.length).toBeGreaterThan(0);
    expect(deck.some((c) => c.dev)).toBe(false);
    expect(deck.some((c) => c.cat === "hostile")).toBe(false);
  });

  it("pack is carried on options for later gating but does not alter the deck", () => {
    const g = newGame(CONFIGS, 1234, true, { pack: "standard" });
    expect(g.options.pack).toBe("standard");
    expect(g.deck).toHaveLength(CARD_DEFS.length + CLEAN_COUNT);
  });

  it("options survive a replay, so a saved game rebuilds the same deck", () => {
    const options = { excludedCards: ["vc"], cleanCount: 4, pack: "hard" };
    const a = newGame(CONFIGS, 99, true, options);
    const b = newGame(CONFIGS, 99, true, a.options);
    expect(b.deck.map((c) => c.id)).toEqual(a.deck.map((c) => c.id));
  });
});
