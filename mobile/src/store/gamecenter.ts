// Game Center integration: sign-in, leaderboards, achievements.
// Everything no-ops off-iOS or when the native module / sign-in is absent.
import type { GameState } from "../engine";
import { loadStats, summarizeStandard, ACHIEVEMENTS } from "./stats";
import { achievementsEligible, leaderboardEligible, type PackId } from "./packs";
import * as GC from "../../modules/buyout-game-center";

/** Leaderboard IDs — must match App Store Connect (see docs/GAMECENTER-SETUP.md). */
export const LB_BEST_FORTUNE = "buyout.fortune.best";
export const LB_CAREER_WINS = "buyout.wins.career";
/**
 * Achievement IDs are "buyout.honor.<statsId>" with hyphens flattened to
 * underscores — App Store Connect allows only [A-Za-z0-9._] in GC ids.
 */
export const achievementId = (statsId: string) => `buyout.honor.${statsId.replace(/-/g, "_")}`;

export const ALL_LEADERBOARD_IDS = [LB_BEST_FORTUNE, LB_CAREER_WINS];
export const ALL_ACHIEVEMENT_IDS = ACHIEVEMENTS.map((a) => achievementId(a.id));

let signedIn = false;
let alias: string | null = null;
/** Last error from sign-in or a submission — shown in Settings so failures are visible. */
let lastError: string | null = null;
let unsubscribe: (() => void) | null = null;

const listeners = new Set<() => void>();
const notify = () => { for (const l of listeners) l(); };

export function onGameCenterChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function gcSignedIn(): boolean {
  return signedIn;
}

export function gcAlias(): string | null {
  return alias;
}

export function gcLastError(): string | null {
  return lastError;
}

export function gcAvailable(): boolean {
  return GC.available();
}

/**
 * Install the native authenticate handler and listen for the result.
 *
 * The previous version awaited a promise that the native side resolved only if
 * the sign-in sheet could be presented — which at cold launch it frequently
 * could not, leaving sign-in stuck off forever. Auth now arrives as an event,
 * whenever it actually happens.
 */
export function initGameCenter(): void {
  if (!GC.available()) return;
  unsubscribe?.();
  unsubscribe = GC.onAuthChange((s) => {
    const was = signedIn;
    signedIn = s.authenticated;
    alias = s.alias ?? null;
    lastError = s.error ?? null;
    notify();
    if (signedIn && !was) void syncAll();
  });
  signedIn = GC.startAuthentication();
  alias = GC.playerAlias();
  notify();
  if (signedIn) void syncAll();
}

/** Manual re-attempt from Settings. */
export function gcAuthenticate(): void {
  initGameCenter();
}

export async function gcShowLeaderboards(): Promise<void> {
  await GC.showGameCenter();
}

/** Ask Game Center which of our IDs App Store Connect actually knows about. */
export async function gcDiagnose(): Promise<GC.Diagnosis> {
  return GC.diagnose(ALL_LEADERBOARD_IDS, ALL_ACHIEVEMENT_IDS);
}

function noteResult(r: GC.SubmitResult): void {
  if (!r.ok && r.error) {
    lastError = r.error;
    notify();
  }
}

/**
 * Push career standing + all unlocked honors to Game Center.
 * Scores come from Standard-deck games only, so the global tables compare
 * like with like.
 */
export async function syncAll(): Promise<void> {
  if (!signedIn) return;
  try {
    const stats = await loadStats();
    const s = summarizeStandard(stats);
    if (s.best > 0) noteResult(await GC.submitScore(LB_BEST_FORTUNE, s.best));
    if (s.wins > 0) noteResult(await GC.submitScore(LB_CAREER_WINS, s.wins));
    for (const id of stats.unlocked) {
      if (ACHIEVEMENTS.some((a) => a.id === id)) {
        noteResult(await GC.reportAchievement(achievementId(id), 100));
      }
    }
  } catch (e: any) {
    lastError = e?.message ?? String(e);
    notify();
  }
}

/** Call after a finished game has been recorded locally. */
export async function reportGameOver(g: GameState, newlyUnlocked: { id: string }[]): Promise<void> {
  if (!signedIn) return;
  const pack = g.options?.pack as PackId | undefined;
  try {
    if (leaderboardEligible(g.useCards, pack)) {
      const human = g.players.find((p) => p.kind === "human");
      if (human) noteResult(await GC.submitScore(LB_BEST_FORTUNE, human.cash));
      const s = summarizeStandard(await loadStats());
      if (s.wins > 0) noteResult(await GC.submitScore(LB_CAREER_WINS, s.wins));
    }
    if (achievementsEligible(g.useCards, pack)) {
      for (const a of newlyUnlocked) {
        noteResult(await GC.reportAchievement(achievementId(a.id), 100));
      }
    }
  } catch (e: any) {
    lastError = e?.message ?? String(e);
    notify();
  }
}
