import { PRICE_BASE, PRICE_CAP, PRICE_RATE, MAJORITY_MULT, MINORITY_MULT } from "./constants";
import type { GameState, Player } from "./types";

/** Raw price for an effective size. */
export function priceForSize(size: number): number {
  if (size < 2) return 0;
  return Math.min(PRICE_CAP, Math.round((PRICE_BASE * Math.pow(PRICE_RATE, size)) / 100) * 100);
}

/**
 * Effective size = board size + Valuation Reset offset (floored at 2 while active).
 * BUG FIX (dead card): the original stored valR but never read it.
 */
export function effectiveSize(g: GameState, name: string): number {
  const co = g.cos[name];
  if (!co || co.status === "inactive") return 0;
  return Math.max(2, co.size + (g.valR[name] ?? 0));
}

/**
 * State-aware price.
 * Strategic Partnership (BUG FIX, dead card): while a partnership is active,
 * both companies price at the HIGHER of the two effective sizes.
 */
export function priceOf(g: GameState, name: string): number {
  const co = g.cos[name];
  if (!co || co.status === "inactive") return 0;
  let eff = effectiveSize(g, name);
  if (g.partner) {
    const [a, b] = g.partner;
    if (name === a || name === b) {
      const other = name === a ? b : a;
      if (g.cos[other] && g.cos[other]!.status !== "inactive")
        eff = Math.max(eff, effectiveSize(g, other));
    }
  }
  return priceForSize(eff);
}

export interface MajorityMinority {
  maj: Player[];
  min: Player[];
}

export function majorityMinority(g: GameState, coName: string): MajorityMinority {
  const holders = g.players
    .map((p) => ({ p, s: p.shares[coName] ?? 0 }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (!holders.length) return { maj: [], min: [] };
  const top = holders[0]!.s;
  const maj = holders.filter((x) => x.s === top).map((x) => x.p);
  const rest = holders.filter((x) => x.s < top);
  const min = rest.length ? rest.filter((x) => x.s === rest[0]!.s).map((x) => x.p) : [];
  return { maj, min };
}

/** Pay majority/minority bonuses for a company at its current price. */
export function payBonuses(g: GameState, coName: string, logs: string[]): void {
  const price = priceOf(g, coName);
  const majBonus = price * MAJORITY_MULT;
  const minBonus = price * MINORITY_MULT;
  const { maj, min } = majorityMinority(g, coName);
  if (!maj.length) return;
  if (maj.length === 1 && min.length === 0) {
    maj[0]!.cash += majBonus + minBonus;
    logs.push(`${maj[0]!.name} receives $${(majBonus + minBonus).toLocaleString()} for ${coName}`);
  } else if (maj.length === 1) {
    maj[0]!.cash += majBonus;
    logs.push(`${maj[0]!.name} receives $${majBonus.toLocaleString()} majority for ${coName}`);
    const each = Math.floor(minBonus / min.length);
    for (const p of min) {
      p.cash += each;
      logs.push(`${p.name} receives $${each.toLocaleString()} minority for ${coName}`);
    }
  } else {
    const each = Math.floor((majBonus + minBonus) / maj.length);
    for (const p of maj) {
      p.cash += each;
      logs.push(`${p.name} receives $${each.toLocaleString()} split for ${coName}`);
    }
  }
}
