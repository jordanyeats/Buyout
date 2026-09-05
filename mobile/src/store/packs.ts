// Merger-deck packs. Chosen in Settings, applied to every new game.
//
// A pack resolves to two knobs the engine already understands: which card ids
// are struck from the deck, and how many "Clean Acquisition" filler cards sit
// alongside them. Fewer cleans means a higher density of consequential cards.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CARD_DEFS, CLEAN_COUNT, type CardDef, type GameOptions } from "../engine";

export type PackId = "standard" | "easy" | "hard" | "custom";

const PACK_KEY = "buyout.pack.v1";

/** Cards cut from Easy: nothing devastating, nothing hostile. */
const EASY_CUTS = CARD_DEFS.filter((c) => c.dev || c.cat === "hostile").map((c) => c.id);

/**
 * Cards cut from Hard: the three that simply hand out money or free shares.
 * What remains is blockers, market shocks, and hostile play — and far fewer
 * quiet Clean Acquisitions to hide behind.
 */
const HARD_CUTS = ["vc", "ipo", "golden"];

export interface PackDef {
  id: PackId;
  name: string;
  tagline: string;
  desc: string;
}

export const PACKS: PackDef[] = [
  {
    id: "standard",
    name: "Standard",
    tagline: "The full deck",
    desc: "All 15 merger cards and 12 Clean Acquisitions. The game as designed — and the only pack that posts to the Game Center leaderboards.",
  },
  {
    id: "easy",
    name: "Easy",
    tagline: "Nothing devastating",
    desc: "Takeover Blocked, Liquidation Tax, and every hostile card are removed. Deals close more predictably and rivals cannot reach into your holdings.",
  },
  {
    id: "hard",
    name: "Hard",
    tagline: "No free money",
    desc: "VC Injection, IPO Bonus, and Golden Parachute are gone, and Clean Acquisitions drop from 12 to 4. Almost every deal now carries a consequence.",
  },
  {
    id: "custom",
    name: "Custom",
    tagline: "Your own deck",
    desc: "Choose card by card. Custom decks are for experimenting — they earn no honors and post no scores.",
  },
];

export interface PackConfig {
  pack: PackId;
  /** Card ids switched off by hand. Only meaningful for the Custom pack. */
  customExcluded: string[];
}

const DEFAULT_CONFIG: PackConfig = { pack: "standard", customExcluded: [] };

let config: PackConfig = { ...DEFAULT_CONFIG };
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function onPackChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getPackConfig(): PackConfig {
  return config;
}

export function packDef(id: PackId): PackDef {
  return PACKS.find((p) => p.id === id) ?? PACKS[0]!;
}

export async function initPacks(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PackConfig>;
      if (parsed && PACKS.some((p) => p.id === parsed.pack)) {
        config = {
          pack: parsed.pack as PackId,
          customExcluded: Array.isArray(parsed.customExcluded) ? parsed.customExcluded : [],
        };
      }
    }
  } catch {}
  notify();
}

export async function setPack(pack: PackId): Promise<void> {
  config = { ...config, pack };
  notify();
  try {
    await AsyncStorage.setItem(PACK_KEY, JSON.stringify(config));
  } catch {}
}

export async function setCustomExcluded(ids: string[]): Promise<void> {
  config = { ...config, customExcluded: ids };
  notify();
  try {
    await AsyncStorage.setItem(PACK_KEY, JSON.stringify(config));
  } catch {}
}

/** Card ids struck from the deck for a pack. */
export function excludedFor(cfg: PackConfig = config): string[] {
  switch (cfg.pack) {
    case "easy": return EASY_CUTS;
    case "hard": return HARD_CUTS;
    case "custom": return cfg.customExcluded;
    default: return [];
  }
}

export function cleanCountFor(cfg: PackConfig = config): number {
  return cfg.pack === "hard" ? 4 : CLEAN_COUNT;
}

/** The engine options a pack produces. */
export function optionsFor(cfg: PackConfig = config): GameOptions {
  return {
    pack: cfg.pack,
    excludedCards: excludedFor(cfg),
    cleanCount: cleanCountFor(cfg),
  };
}

/** Cards actually in the deck for a pack, for display. */
export function cardsIn(cfg: PackConfig = config): CardDef[] {
  const cut = new Set(excludedFor(cfg));
  return CARD_DEFS.filter((c) => !cut.has(c.id));
}

export function deckSize(cfg: PackConfig = config): number {
  return cardsIn(cfg).length + cleanCountFor(cfg);
}

/**
 * Honors are earned on Standard and Hard only — Easy and Custom remove the
 * cards that make those runs difficult. A game with the merger deck switched
 * off entirely also counts: that is not an easier deck, it is no deck, and
 * The Purist can only ever be won that way.
 */
export function achievementsEligible(useCards: boolean, pack: PackId | undefined): boolean {
  if (!useCards) return true;
  return pack === "standard" || pack === "hard";
}

/**
 * Leaderboard scores come only from the full Standard deck, so one global
 * table compares like with like.
 */
export function leaderboardEligible(useCards: boolean, pack: PackId | undefined): boolean {
  return useCards && pack === "standard";
}
