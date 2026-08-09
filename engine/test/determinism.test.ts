import { describe, expect, it } from "vitest";
import { applyAction, newGame } from "../src/index.js";
import { cfg, runGame } from "./helpers.js";

const KINDS = ["strategic", "greedy", "random", "strategic"] as const;

describe("determinism", () => {
  it("same seed + same config → byte-identical final state", () => {
    const a = runGame(1234, [...KINDS], true);
    const b = runGame(1234, [...KINDS], true);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(a.actions).toEqual(b.actions);
  });

  it("different seeds diverge", () => {
    const a = runGame(1, [...KINDS], true);
    const b = runGame(2, [...KINDS], true);
    expect(JSON.stringify(a.state)).not.toBe(JSON.stringify(b.state));
  });

  it("REPLAY: re-applying the action log reproduces the final state exactly", () => {
    const { state: final, actions } = runGame(987, [...KINDS], true);
    let g = newGame(cfg(...KINDS), 987, true);
    for (const a of actions) g = applyAction(g, a);
    expect(JSON.stringify(g)).toBe(JSON.stringify(final));
  });

  it("replay holds with cards disabled too", () => {
    const { state: final, actions } = runGame(555, ["greedy", "random"], false);
    let g = newGame(cfg("greedy", "random"), 555, false);
    for (const a of actions) g = applyAction(g, a);
    expect(JSON.stringify(g)).toBe(JSON.stringify(final));
  });
});
