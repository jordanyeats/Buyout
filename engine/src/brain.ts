import { currentActor } from "./engine.js";
import { policyAction } from "./ai.js";
import { sharkPlace } from "./shark.js";
import type { Action, GameState } from "./types.js";

/** Compute the acting AI seat's action. Shark seats simulate on placement; everything else is fast heuristics. */
export function aiAction(g: GameState): Action {
  const idx = currentActor(g);
  const p = g.players[idx]!;
  if (p.kind === "shark" && g.phase === "place") return sharkPlace(g, idx);
  return policyAction(g, idx, p.kind === "shark" ? "strategic" : p.kind);
}
