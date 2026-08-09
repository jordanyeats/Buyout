import {
  ACTIVIST_CASH, ACTIVIST_THRESHOLD, CARD_DEFS, CLEAN_CARD_CASH, CLEAN_COUNT, CLEAN_FLAVORS,
  EARNINGS_MISS_TILES, IPO_MULT, SECONDARY_BLOCKS, VALRESET_OFFSET, VC_CASH,
} from "./constants";
import { companyTiles, isConnected } from "./board";
import { priceOf } from "./pricing";
import { shuffle } from "./rng";
import type { CardDef, GameState } from "./types";

export function buildDeck(g: { rngState: number }): CardDef[] {
  const deck: CardDef[] = [...CARD_DEFS];
  for (let i = 0; i < CLEAN_COUNT; i++)
    deck.push({
      id: "clean", cat: "clean", name: "Clean Acquisition",
      desc: `Normal merger. You get $${CLEAN_CARD_CASH.toLocaleString()}.`,
      flav: CLEAN_FLAVORS[i % CLEAN_FLAVORS.length]!, dev: false,
    });
  shuffle(g, deck);
  return deck;
}

export type CardOutcome = "proceed" | "cancel" | "delay";

/**
 * Apply a card's immediate effects at merger announcement.
 * One-shot survivor effects (antitrust, golden) are applied later, exactly once,
 * at the first defunct's resolution — see engine.resolveDefunct.
 */
export function applyCardImmediate(g: GameState, card: CardDef | null): CardOutcome {
  if (!card || !g.mergerCtx) return "proceed";
  const ctx = g.mergerCtx;
  const p = g.players[g.current]!;
  switch (card.id) {
    case "clean":
      p.cash += CLEAN_CARD_CASH;
      return "proceed";
    case "blocked":
      return "cancel";
    case "regulatory":
      return "delay";
    case "vc":
      for (const pl of g.players) pl.cash += VC_CASH;
      return "proceed";
    case "ipo": {
      const first = ctx.defuncts[0]!;
      p.cash += priceOf(g, first) * IPO_MULT;
      return "proceed";
    }
    case "tax":
      ctx.taxActive = true;
      return "proceed";
    case "duedil":
      ctx.halfPrice = true;
      return "proceed";
    case "earnings":
      applyEarningsMiss(g, [ctx.surv, ...ctx.defuncts]);
      return "proceed";
    case "partner": {
      const sorted = Object.values(g.cos)
        .filter((c) => c.status !== "inactive")
        .sort((a, b) => a.size - b.size);
      if (sorted.length >= 2) {
        g.partner = [sorted[0]!.name, sorted[1]!.name];
        g.logs.push(`Strategic Partnership: ${sorted[0]!.name} + ${sorted[1]!.name} now price together`);
      }
      return "proceed";
    }
    case "valreset": {
      const excluded = [ctx.surv, ...ctx.defuncts];
      const candidates = Object.values(g.cos).filter(
        (c) => c.status !== "inactive" && !excluded.includes(c.name),
      );
      if (candidates.length) {
        const target = candidates.reduce((a, b) =>
          (p.shares[a.name] ?? 0) <= (p.shares[b.name] ?? 0) ? a : b,
        );
        g.valR[target.name] = (g.valR[target.name] ?? 0) + VALRESET_OFFSET;
        g.logs.push(`Valuation Reset: ${target.name} price drops permanently`);
      }
      return "proceed";
    }
    case "secondary": {
      const candidates = Object.values(g.cos).filter((c) => c.status !== "inactive");
      if (candidates.length) {
        const target = candidates.reduce((a, b) =>
          (p.shares[a.name] ?? 0) >= (p.shares[b.name] ?? 0) ? a : b,
        );
        g.market[target.name] = (g.market[target.name] ?? 0) + SECONDARY_BLOCKS;
        g.issued[target.name] = (g.issued[target.name] ?? 0) + SECONDARY_BLOCKS;
        g.logs.push(`Secondary Offering: ${SECONDARY_BLOCKS} new ${target.name} blocks issued`);
      }
      return "proceed";
    }
    case "talent": {
      for (const co of Object.values(g.cos).filter((c) => c.status !== "inactive")) {
        if ((p.shares[co.name] ?? 0) > 0) {
          for (const p2 of g.players) {
            if (p2.name !== p.name && (p2.shares[co.name] ?? 0) > 0) {
              p2.shares[co.name]! -= 1;
              if (p2.shares[co.name]! <= 0) delete p2.shares[co.name];
              p2.cash += priceOf(g, co.name);
              g.market[co.name] = (g.market[co.name] ?? 0) + 1;
              g.logs.push(`${p2.name} sold 1 ${co.name} block (talent raid)`);
              return "proceed";
            }
          }
        }
      }
      return "proceed";
    }
    case "activist": {
      const candidates = Object.values(g.cos).filter((c) => c.status !== "inactive");
      if (candidates.length) {
        const target = candidates.reduce((a, b) => (b.size > a.size ? b : a));
        const holders = g.players
          .map((pl) => ({ pl, s: pl.shares[target.name] ?? 0 }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s);
        // Only fires when there is a sole majority leader who is not the drawer.
        if (
          holders.length &&
          holders[0]!.pl.name !== p.name &&
          (holders.length === 1 || holders[1]!.s < holders[0]!.s)
        ) {
          const leader = holders[0]!.pl;
          if (leader.cash > ACTIVIST_THRESHOLD) {
            leader.cash -= ACTIVIST_CASH;
            g.logs.push(`${leader.name} pays $${ACTIVIST_CASH.toLocaleString()} (activist campaign)`);
          } else if ((leader.shares[target.name] ?? 0) > 0) {
            leader.shares[target.name]! -= 1;
            if (leader.shares[target.name]! <= 0) delete leader.shares[target.name];
            p.shares[target.name] = (p.shares[target.name] ?? 0) + 1;
            g.logs.push(`${leader.name} gives 1 ${target.name} block to ${p.name} (activist campaign)`);
          }
        }
      }
      return "proceed";
    }
    case "earnout":
      g.earnouts.push({ player: p.name, company: ctx.surv });
      return "proceed";
    default:
      return "proceed";
  }
}

/**
 * Earnings Miss — BUG FIX: the original deleted arbitrary edge tiles and could
 * split a company into disconnected islands. This removes tiles one at a time,
 * only ever choosing a tile whose removal keeps the company connected.
 * Removed cells are permanently destroyed (the physical tile was already played).
 */
export function applyEarningsMiss(g: GameState, excludedCos: string[]): void {
  const p = g.players[g.current]!;
  const candidates = Object.values(g.cos).filter(
    (c) => c.status !== "inactive" && !excludedCos.includes(c.name) && c.size > 4,
  );
  if (!candidates.length) return;
  const target = candidates.reduce((a, b) =>
    (p.shares[a.name] ?? 0) <= (p.shares[b.name] ?? 0) ? a : b,
  );
  const removable = Math.min(EARNINGS_MISS_TILES, Math.max(0, target.size - 2));
  let removed = 0;
  for (let i = 0; i < removable; i++) {
    const tiles = companyTiles(g.board, target.name);
    let took = false;
    for (const [r, c] of tiles) {
      g.board[r]![c] = null;
      if (isConnected(g.board, target.name)) {
        g.destroyed += 1;
        removed += 1;
        took = true;
        break;
      }
      g.board[r]![c] = target.name; // undo, try next
    }
    if (!took) break;
  }
  target.size = companyTiles(g.board, target.name).length;
  if (removed > 0) g.logs.push(`Earnings Miss: ${target.name} loses ${removed} tiles (now ${target.size})`);
}
