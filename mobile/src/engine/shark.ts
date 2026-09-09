import { applyAction, currentActor, playableTiles } from "./engine";
import { policyAction } from "./ai";
import { priceOf } from "./pricing";
import { derivedRng } from "./rng";
import type { Action, GameState, Player, Tile } from "./types";

/**
 * "Shark": a simulation AI tier. For each playable tile, it plays the move and
 * then rolls the game forward with fast heuristic policies for every seat,
 * several times, scoring its own final net worth.
 * The deterministic engine makes this both cheap and reproducible: the same
 * state always produces the same choice.
 *
 * Each rollout starts from a DETERMINIZATION — a world re-sampled to be
 * consistent with what the shark can legitimately see. See `determinize`.
 */
export const SHARK_CONFIG = {
  rollouts: 10,
  maxActionsPerRollout: 90,
  /**
   * Re-sample hidden information before each rollout. Off means rollouts run on
   * the true state: the shark plans against opponents' actual tiles and a known
   * draw order, which is clairvoyance rather than skill. Kept as a switch only
   * so the honest and cheating players can be measured head-to-head.
   */
  determinize: true,
  /**
   * What a rollout's outcome is worth to the shark.
   *
   * "networth" scores absolute final wealth. "margin" scores final wealth minus
   * the best opponent's, which is what actually decides the game and which
   * cancels the common-mode swing shared by every candidate move (a rollout
   * where the whole market booms lifts them all equally). Same cost per
   * rollout; less noise per rollout.
   *
   * Measured vs `strategic`, 60 games, chance baseline 50%: "networth" wins
   * 48.3% (indistinguishable from chance), "margin" 63.3%, for +3ms a move.
   */
  objective: "margin" as "networth" | "margin",
};

function netWorth(g: GameState, idx: number): number {
  const p = g.players[idx]!;
  let w = p.cash;
  for (const [name, cnt] of Object.entries(p.shares)) w += cnt * priceOf(g, name);
  return w;
}

/** What one finished rollout is worth to seat `idx`. See SHARK_CONFIG.objective. */
function score(g: GameState, idx: number): number {
  const mine = netWorth(g, idx);
  if (SHARK_CONFIG.objective !== "margin") return mine;
  let best = -Infinity;
  for (let i = 0; i < g.players.length; i++) {
    if (i !== idx) best = Math.max(best, netWorth(g, i));
  }
  return best === -Infinity ? mine : mine - best;
}

/** Fisher-Yates over an arbitrary rng (the state rng is not consumed here). */
function shuffleWith<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
  }
}

/**
 * Re-sample the hidden state into one world consistent with what seat `me`
 * legitimately knows, so a rollout plans against a plausible game rather than
 * the real one.
 *
 * Public, and therefore preserved exactly: the board, every player's cash,
 * shares and holdings, the market, the discard pile, and HOW MANY tiles each
 * opponent holds. Hidden, and therefore re-sampled: which tiles those are, the
 * order of the undrawn pool, and the order of the deck.
 *
 * Every unseen tile — the pool plus all opponents' hands — goes into one bag,
 * gets shuffled, and is dealt back so each opponent holds the same COUNT it
 * held before. The shark's own hand is untouched. Destroyed tiles are in
 * neither pool nor hands, so they stay destroyed.
 *
 * The bag and the deck are sorted into a canonical order BEFORE shuffling.
 * Without that, shuffling a hidden arrangement with a fixed rng would map the
 * true arrangement onto the sampled one, and the "guess" would still carry a
 * trace of the answer. Sorting first makes the sample a pure function of what
 * the shark can see.
 */
export function determinize(g: GameState, me: number, rng: () => number): GameState {
  const bag: Tile[] = [...g.pool];
  for (let i = 0; i < g.players.length; i++) {
    if (i !== me) bag.push(...g.players[i]!.hand);
  }
  bag.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  shuffleWith(bag, rng);

  let dealt = 0;
  const players: Player[] = g.players.map((p, i) => {
    if (i === me) return p;
    const hand = bag.slice(dealt, dealt + p.hand.length);
    dealt += p.hand.length;
    return { ...p, hand };
  });

  // The deck's CONTENTS are public (a known card list minus the discard pile);
  // only its order is hidden.
  const deck = [...g.deck];
  deck.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.flav < b.flav ? -1 : a.flav > b.flav ? 1 : 0));
  shuffleWith(deck, rng);

  return { ...g, players, pool: bag.slice(dealt), deck };
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
  if (SHARK_CONFIG.determinize) g = determinize(g, me, derivedRng(start.rngState, salt));
  for (let i = 0; i < SHARK_CONFIG.maxActionsPerRollout && !g.over; i++) {
    const next = policyStep(g);
    if (!next) break;
    g = next;
  }
  return score(g, me);
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
