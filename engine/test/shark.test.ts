import { describe, expect, it } from "vitest";
import { SHARK_CONFIG, aiAction, applyAction, newGame } from "../src/index.js";
import { grantShares, handTile, putCompany, runGame, scenario } from "./helpers.js";

describe("shark (simulation AI)", () => {
  it("refuses to trigger a merger that pays the opponent", () => {
    SHARK_CONFIG.rollouts = 8;
    SHARK_CONFIG.maxActionsPerRollout = 60;
    const g = scenario(["shark", "greedy"]);
    // GREEDY holds sole majority of Zap: merging gifts them a 15x payout.
    // Only the shark can trigger it (the seam tile is in shark's hand).
    putCompany(g, "Blink", [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
    putCompany(g, "Zap", [[0, 2], [1, 2], [2, 2]]);
    grantShares(g, 1, "Zap", 5);
    handTile(g, 0, [0, 1]); // triggers the merger — a gift to greedy
    handTile(g, 0, [8, 8]); // neutral placement
    const a = aiAction(g);
    expect(a.type).toBe("place");
    expect((a as { tile: [number, number] }).tile).toEqual([8, 8]);
  });

  it("is deterministic: same state → same choice", () => {
    SHARK_CONFIG.rollouts = 5;
    SHARK_CONFIG.maxActionsPerRollout = 40;
    const build = () => {
      const g = scenario(["shark", "strategic"], 99);
      putCompany(g, "Flux", [[4, 4], [4, 5]]);
      handTile(g, 0, [4, 6]);
      handTile(g, 0, [0, 0]);
      handTile(g, 0, [8, 8]);
      return g;
    };
    expect(JSON.stringify(aiAction(build()))).toBe(JSON.stringify(aiAction(build())));
  });

  it("plays complete games without error", () => {
    SHARK_CONFIG.rollouts = 4;
    SHARK_CONFIG.maxActionsPerRollout = 30;
    for (let seed = 1; seed <= 3; seed++) {
      const { state } = runGame(seed * 33, ["shark", "strategic", "greedy"], true, { checkEveryStep: true });
      expect(state.over).toBe(true);
    }
  });
});

describe("deck settings (excludedCards)", () => {
  it("builds the deck without excluded cards and replays exactly", () => {
    const excluded = ["blocked", "tax", "regulatory"];
    const { state, actions } = runGame(4242, ["strategic", "greedy"], true, {
      options: { excludedCards: excluded },
    });
    expect(state.over).toBe(true);
    for (const c of [...state.deck, ...state.discard]) expect(excluded).not.toContain(c.id);
    // replay with same options reproduces exactly
    let g = newGame(
      [{ name: "P1", kind: "strategic" as const }, { name: "P2", kind: "greedy" as const }],
      4242, true, { excludedCards: excluded },
    );
    for (const a of actions) g = applyAction(g, a);
    expect(JSON.stringify(g)).toBe(JSON.stringify(state));
  });
});
