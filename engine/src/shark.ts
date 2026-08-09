import { applyAction, currentActor, playableTiles } from "./engine.js";
import { policyAction } from "./ai.js";
import { priceOf } from "./pricing.js";
import type { Action, GameState, Tile } from "./types.js";

/**
 * "Shark": a simulation AI tier. For each playable tile, it plays the move and
 * then rolls the game forward with fast heuristic policies for every seat,
 * several times with perturbed randomness, scoring its own final net worth.
 * The deterministic engine makes this both cheap and reproducible: the same
 * state always produces the same choice.
 */
export const SHARK_CONFIG = {
  rollouts: 10,
  maxActionsPerRollout: 90,
};

function netWorth(g: GameState, idx: number): number {
  const p = g.players[idx]!;
  let w = p.cash;
  for (const [name, cnt] of Object.entries(p.shares)) w += cnt * priceOf(g, name);
  return w;
}

/** Advance a state by one policy action for whoever must act. Returns null when stuck. */
function policyStep(g: GameState): GameState | null {
  const idx = currentActor(g);
  const kind = g.players[idx]!.kind;
  let a: Action;
  try {
    a = policyAction(g, idx, kind === "human" ? "strategic" : kind);
    return applyAction(g, a);
  } catch {
    return null;
  }
}

function rollout(start: GameState, me: number, salt: number): number {
  let g: GameState = { ...start, rngState: (start.rngState ^ Math.imul(salt + 1, 0x9e3779b9)) | 0 };
  for (let i = 0; i < SHARK_CONFIG.maxActionsPerRollout && !g.over; i++) {
    const next = policyStep(g);
    if (!next) break;
    g = next;
  }
  return netWorth(g, me);
}

export function sharkPlace(g: GameState, idx: number): Action {
  const tiles = playableTiles(g, idx);
  if (tiles.length === 0) throw new Error("shark asked to place with no playable tiles");
  if (tiles.length === 1) return { type: "place", tile: [...tiles[0]!] as Tile };

  let best: Tile = tiles[0]!;
  let bestScore = -Infinity;
  for (const t of tiles) {
    let placed: GameState;
    try {
      placed = applyAction(g, { type: "place", tile: t });
    } catch {
      continue;
    }
    let sum = 0;
    for (let k = 0; k < SHARK_CONFIG.rollouts; k++) sum += rollout(placed, idx, k * 7919 + t[0] * 97 + t[1]);
    const score = sum / SHARK_CONFIG.rollouts;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return { type: "place", tile: [...best] as Tile };
}
