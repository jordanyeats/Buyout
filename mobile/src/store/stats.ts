import AsyncStorage from "@react-native-async-storage/async-storage";
import type { GameState } from "../engine";
import { achievementsEligible, type PackId } from "./packs";

const STATS_KEY = "buyout.stats.v1";

export interface GameRecord {
  at: number; // epoch ms
  winner: string;
  humanWon: boolean;
  humanCash: number;
  players: { name: string; kind: string; cash: number }[];
  turns: number;
  cards: boolean;
  /** Deck pack the game was played with; absent on records written before packs. */
  pack?: string;
  /** Whether this game was eligible to earn honors. */
  ranked?: boolean;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "victor", name: "Closing Bell", desc: "Win your first game." },
  { id: "tycoon", name: "Tycoon", desc: "Finish a game with $500,000 or more." },
  { id: "landslide", name: "Landslide", desc: "Win with double the runner-up's fortune." },
  { id: "shark-slayer", name: "Shark Slayer", desc: "Beat a Shark-level AI." },
  { id: "serial-founder", name: "Serial Founder", desc: "Found four companies in one game." },
  { id: "card-shark", name: "Card Shark", desc: "Win with the merger deck in play." },
  { id: "purist", name: "The Purist", desc: "Win with the merger deck disabled." },
  { id: "full-table", name: "Full Table", desc: "Win a six-player game." },
];

export interface Stats {
  records: GameRecord[];
  unlocked: string[]; // achievement ids
}

export async function loadStats(): Promise<Stats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Stats;
      if (Array.isArray(s.records) && Array.isArray(s.unlocked)) return s;
    }
  } catch {}
  return { records: [], unlocked: [] };
}

/** Record a finished game; returns newly unlocked achievements. */
export async function recordGame(g: GameState): Promise<AchievementDef[]> {
  const stats = await loadStats();
  const human = g.players.find((p) => p.kind === "human");
  const ranked = [...g.players].sort((a, b) => b.cash - a.cash);
  const humanWon = !!human && g.winner === human.name;

  const pack = g.options?.pack;
  const eligible = achievementsEligible(g.useCards, pack as PackId | undefined);

  const rec: GameRecord = {
    at: Date.now(),
    winner: g.winner ?? "",
    humanWon,
    humanCash: human?.cash ?? 0,
    players: g.players.map((p) => ({ name: p.name, kind: p.kind, cash: p.cash })),
    turns: g.turn,
    cards: g.useCards,
    pack,
    ranked: eligible,
  };
  stats.records.push(rec);
  if (stats.records.length > 200) stats.records = stats.records.slice(-200);

  const fresh: AchievementDef[] = [];
  // Easy and Custom decks strip out the cards that make a run hard, so they
  // record history but never unlock honors.
  const unlock = (id: string, cond: boolean) => {
    if (!eligible) return;
    if (cond && !stats.unlocked.includes(id)) {
      stats.unlocked.push(id);
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) fresh.push(def);
    }
  };

  const foundsByHuman = human
    ? g.logs.filter((l) => l.startsWith(`${human.name} founds `)).length
    : 0;

  unlock("victor", humanWon);
  unlock("tycoon", !!human && human.cash >= 500_000);
  unlock("landslide", humanWon && ranked.length > 1 && ranked[0]!.cash >= 2 * Math.max(1, ranked[1]!.cash));
  unlock("shark-slayer", humanWon && g.players.some((p) => p.kind === "shark"));
  unlock("serial-founder", foundsByHuman >= 4);
  unlock("card-shark", humanWon && g.useCards);
  unlock("purist", humanWon && !g.useCards);
  unlock("full-table", humanWon && g.players.length === 6);

  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats)).catch(() => {});
  return fresh;
}

/**
 * Career figures from Standard-deck games only — what the global leaderboards
 * compare. Records written before packs existed carry no pack; those played
 * with cards on are treated as Standard, which is what they were.
 */
export function summarizeStandard(stats: Stats) {
  const std = stats.records.filter((r) => r.cards && (r.pack ?? "standard") === "standard");
  return {
    total: std.length,
    wins: std.filter((r) => r.humanWon).length,
    best: std.reduce((m, r) => Math.max(m, r.humanCash), 0),
  };
}

export function summarize(stats: Stats) {
  const total = stats.records.length;
  const wins = stats.records.filter((r) => r.humanWon).length;
  const best = stats.records.reduce((m, r) => Math.max(m, r.humanCash), 0);
  const avgTurns = total ? Math.round(stats.records.reduce((s, r) => s + r.turns, 0) / total) : 0;
  const byKind: Record<string, { games: number; wins: number }> = {};
  for (const r of stats.records) {
    for (const p of r.players) {
      if (p.kind === "human") continue;
      byKind[p.kind] = byKind[p.kind] ?? { games: 0, wins: 0 };
      byKind[p.kind]!.games++;
      if (r.humanWon) byKind[p.kind]!.wins++;
    }
  }
  return { total, wins, best, avgTurns, byKind };
}
