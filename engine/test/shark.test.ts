import { describe, expect, it } from "vitest";
import { SHARK_CONFIG, aiAction, applyAction, derivedRng, determinize, newGame } from "buyout-engine";
import { grantShares, handTile, putCompany, runGame, scenario } from "./helpers.js";

/** Same public position every time; only the tiles the shark CANNOT see differ. */
function hiddenVariant(oppHand: [number, number][]) {
  const g = scenario(["shark", "strategic"], 7);
  putCompany(g, "Flux", [[4, 4], [4, 5]]);
  putCompany(g, "Blink", [[0, 0], [0, 1], [0, 2]]);
  for (const t of [[4, 6], [0, 3], [8, 8], [6, 1]] as [number, number][]) handTile(g, 0, t);
  for (const t of oppHand) handTile(g, 1, t);
  return g;
}

const HIDDEN_ARRANGEMENTS: [number, number][][] = [
  [[1, 1], [1, 2], [1, 3], [1, 4]],
  [[7, 7], [7, 6], [7, 5], [7, 4]],
  [[2, 8], [3, 8], [5, 8], [6, 8]],
  [[8, 0], [8, 1], [8, 2], [8, 3]],
  [[5, 5], [5, 6], [2, 2], [2, 3]],
];

function picksAcrossArrangements(): string[] {
  return HIDDEN_ARRANGEMENTS.map((a) =>
    JSON.stringify((aiAction(hiddenVariant(a)) as unknown as { tile: [number, number] }).tile),
  );
}

describe("shark (simulation AI)", () => {
  it("refuses to trigger a merger that pays the opponent", () => {
    // The shipped budget. Determinized rollouts spread wider than clairvoyant
    // ones did, so reading a trap needs the real horizon, not a token one.
    SHARK_CONFIG.rollouts = 10;
    SHARK_CONFIG.maxActionsPerRollout = 90;
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
    expect((a as unknown as { tile: [number, number] }).tile).toEqual([8, 8]);
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

  it("determinization keeps every public fact and re-deals only the hidden tiles", () => {
    const g = hiddenVariant(HIDDEN_ARRANGEMENTS[0]!);
    const d = determinize(g, 0, derivedRng(g.rngState, 1));

    const bag = (s: typeof g) => [...s.pool, ...s.players[1]!.hand]
      .map((t) => `${t[0]},${t[1]}`).sort().join(" ");
    // Same unseen tiles, conserved exactly — none invented, none lost.
    expect(bag(d)).toBe(bag(g));
    // Public facts survive untouched.
    expect(d.players[0]!.hand).toEqual(g.players[0]!.hand);
    expect(d.players[1]!.hand.length).toBe(g.players[1]!.hand.length);
    expect(d.board).toEqual(g.board);
    expect(d.players.map((p) => [p.cash, p.shares])).toEqual(g.players.map((p) => [p.cash, p.shares]));
    expect(d.deck.length).toBe(g.deck.length);
    // ...but the opponent's actual tiles are NOT what the rollout plans against.
    expect(d.players[1]!.hand).not.toEqual(g.players[1]!.hand);
  });

  it("does not let hidden information change its move", () => {
    SHARK_CONFIG.rollouts = 10;
    SHARK_CONFIG.maxActionsPerRollout = 90;
    SHARK_CONFIG.determinize = true;
    // Five positions identical in everything the shark can legitimately see,
    // differing only in tiles held by the opponent. One answer, five times.
    expect(new Set(picksAcrossArrangements()).size).toBe(1);
  });

  it("clairvoyant rollouts DO leak hidden information (why determinize exists)", () => {
    SHARK_CONFIG.rollouts = 10;
    SHARK_CONFIG.maxActionsPerRollout = 90;
    SHARK_CONFIG.determinize = false;
    try {
      // Same five positions. Rolling forward from the true state, the shark's
      // choice moves with tiles no player could see.
      expect(new Set(picksAcrossArrangements()).size).toBeGreaterThan(1);
    } finally {
      SHARK_CONFIG.determinize = true;
    }
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
