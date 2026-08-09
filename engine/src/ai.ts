import { MAX_BUY, CONVERT_FROM, CONVERT_TO, SAFE_SIZE } from "./constants.js";
import { analyzePlacement } from "./board.js";
import { convertCapacity, currentActor, playableTiles } from "./engine.js";
import { majorityMinority, priceOf } from "./pricing.js";
import { derivedRng } from "./rng.js";
import type { Action, GameState, MergerDecision, Player } from "./types.js";

/**
 * Compute the acting AI player's action for the current state.
 * Pure function of state: uses a derived rng seeded from (rngState, turn) and
 * never consumes the game's own rng stream — same state always yields the same
 * action, which is what makes replays and simulations exact.
 */
/** Heuristic policy for a seat, with an explicit kind (used by shark rollouts and aiAction). */
export function policyAction(g: GameState, idx: number, kind: "human" | "random" | "greedy" | "strategic" | "shark"): Action {
  const p = { ...g.players[idx]!, kind: kind === "shark" ? "strategic" as const : kind };
  const rng = derivedRng(g.rngState, g.turn * 31 + phaseOrdinal(g) * 7 + idx);

  switch (g.phase) {
    case "mergerAnnounce":
    case "mergerResult":
      return { type: "acknowledge" };
    case "place":
      return { type: "place", tile: pickTile(g, idx, rng) };
    case "found": {
      const inactive = Object.values(g.cos).filter((c) => c.status === "inactive");
      return { type: "found", company: inactive[Math.floor(rng() * inactive.length)]!.name };
    }
    case "chooseSurvivor": {
      const tied = g.survivorChoice!.tied;
      const best = [...tied].sort((a, b) => (p.shares[b] ?? 0) - (p.shares[a] ?? 0))[0]!;
      return { type: "chooseSurvivor", company: best };
    }
    case "mergerDecide":
      return { type: "mergerDecision", decision: pickMergerDecision(g, p, rng) };
    case "buy":
      return { type: "buy", purchases: pickPurchases(g, p, rng) };
    default:
      throw new Error(`AI cannot act in phase ${g.phase}`);
  }
}

function phaseOrdinal(g: GameState): number {
  const order = ["place", "found", "chooseSurvivor", "mergerAnnounce", "mergerDecide", "mergerResult", "buy", "gameOver"];
  return order.indexOf(g.phase) + (g.mergerCtx?.di ?? 0) * 10;
}

function pickTile(g: GameState, idx: number, rng: () => number): [number, number] {
  const p = g.players[idx]!;
  const tiles = playableTiles(g, idx);
  if (!tiles.length) throw new Error("AI asked to place with no playable tiles");
  if (p.kind === "random") return [...tiles[Math.floor(rng() * tiles.length)]!] as [number, number];

  let best = tiles[0]!;
  let bestScore = -Infinity;
  for (const t of tiles) {
    const res = analyzePlacement(g, t[0], t[1]);
    let s = rng() * 2;
    if (res.type === "found") s += 40;
    else if (res.type === "expand") {
      const mine = p.shares[res.co] ?? 0;
      const { maj } = majorityMinority(g, res.co);
      if (mine === 0) s -= 5;
      else if (maj.some((m) => m.name === p.name))
        s += g.cos[res.co]!.size >= SAFE_SIZE - 3 ? 45 : 20 + mine * 2;
      else s += 2;
    } else if (res.type === "merger") {
      const sizes = new Map(res.cos.map((n) => [n, g.cos[n]!.size]));
      const surv = res.cos.reduce((a, b) => (sizes.get(a)! >= sizes.get(b)! ? a : b));
      let ms = 5;
      for (const dn of res.cos.filter((n) => n !== surv)) {
        const { maj } = majorityMinority(g, dn);
        if (maj.some((m) => m.name === p.name)) ms += 30;
        else if (maj.length) ms -= 12;
      }
      if ((p.shares[surv] ?? 0) > 0) ms += (p.shares[surv] ?? 0) * 3;
      s += ms;
    }
    if (s > bestScore) {
      bestScore = s;
      best = t;
    }
  }
  return [...best] as [number, number];
}

function pickMergerDecision(g: GameState, p: Player, rng: () => number): MergerDecision {
  const ctx = g.mergerCtx!;
  const dn = ctx.defuncts[ctx.di]!;
  const sn = ctx.surv;
  const held = p.shares[dn] ?? 0;
  const cap = convertCapacity(g);
  const maxSets = Math.min(Math.floor(held / CONVERT_FROM), Math.floor(cap / CONVERT_TO));

  if (p.kind === "random") {
    const sell = Math.floor(rng() * (held + 1));
    const remaining = held - sell;
    const sets = Math.min(Math.floor(remaining / CONVERT_FROM), maxSets);
    const convert = sets > 0 ? Math.floor(rng() * (sets + 1)) * CONVERT_FROM : 0;
    return { sell, convert, hold: held - sell - convert };
  }
  if (p.kind === "greedy" || maxSets === 0) return { sell: held, convert: 0, hold: 0 };

  // strategic: convert when the exchange is value-positive or wins majority of the survivor.
  const defP = ctx.halfPrice ? Math.floor(priceOf(g, dn) / 2) : priceOf(g, dn);
  const survP = priceOf(g, sn);
  const convertValue = CONVERT_TO * survP;
  const sellValue = CONVERT_FROM * defP;
  let shouldConvert = convertValue >= sellValue;
  if (!shouldConvert) {
    const { maj } = majorityMinority(g, sn);
    if (
      maj.length &&
      !maj.some((m) => m.name === p.name) &&
      (p.shares[sn] ?? 0) + maxSets * CONVERT_TO >= (maj[0]!.shares[sn] ?? 0)
    )
      shouldConvert = true;
  }
  if (shouldConvert) {
    const convert = maxSets * CONVERT_FROM;
    return { sell: held - convert, convert, hold: 0 };
  }
  return { sell: held, convert: 0, hold: 0 };
}

function pickPurchases(g: GameState, p: Player, rng: () => number): Record<string, number> {
  const buyable = Object.values(g.cos)
    .filter((c) => c.status !== "inactive" && (g.market[c.name] ?? 0) > 0)
    .map((c) => ({ n: c.name, pr: priceOf(g, c.name), av: g.market[c.name]!, sz: c.size }))
    .filter((c) => c.pr > 0 && c.pr <= p.cash);
  if (!buyable.length) return {};

  if (p.kind === "random") {
    const res: Record<string, number> = {};
    let cash = p.cash;
    const want = Math.floor(rng() * (MAX_BUY + 1));
    for (let i = 0; i < want; i++) {
      const pick = buyable[Math.floor(rng() * buyable.length)]!;
      if (pick.pr > cash || (res[pick.n] ?? 0) >= pick.av) continue;
      res[pick.n] = (res[pick.n] ?? 0) + 1;
      cash -= pick.pr;
    }
    return res;
  }

  const budget = p.kind === "strategic" ? p.cash * 0.8 : p.cash;
  const scored = buyable
    .map((c) => {
      let s = 0;
      const mine = p.shares[c.n] ?? 0;
      const { maj } = majorityMinority(g, c.n);
      if (p.kind === "strategic") {
        if (maj.some((m) => m.name === p.name)) s += 20;
        else if (mine > 0 && maj.length) {
          const gap = (maj[0]!.shares[c.n] ?? 0) - mine;
          if (gap <= 2) s += 28;
          else if (gap > 4) s -= 10;
        }
        if (!maj.length && mine === 0) s += 15;
        if (mine > 0 && !maj.length) s += 18;
        if (c.sz <= 5) s += 8;
      } else {
        s = c.sz * 5;
        if (mine > 0) s += 10;
      }
      return { ...c, s: s + rng() * 3 };
    })
    .sort((a, b) => b.s - a.s);

  const res: Record<string, number> = {};
  let remaining = MAX_BUY;
  let cash = Math.min(budget, p.cash);
  for (const c of scored) {
    if (remaining <= 0) break;
    const can = Math.min(remaining, c.av, Math.floor(cash / c.pr));
    if (can > 0) {
      res[c.n] = can;
      cash -= can * c.pr;
      remaining -= can;
    }
  }
  return res;
}
