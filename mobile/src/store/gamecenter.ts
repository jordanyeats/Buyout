// Game Center integration: sign-in, leaderboards, achievements.
// Everything no-ops off-iOS or when the native module / sign-in is absent.
import type { GameState } from "../engine";
import { loadStats, summarize, ACHIEVEMENTS } from "./stats";
import * as GC from "../../modules/buyout-game-center";

/** Leaderboard IDs — must match App Store Connect (see docs/GAMECENTER-SETUP.md). */
export const LB_BEST_FORTUNE = "buyout.fortune.best";
export const LB_CAREER_WINS = "buyout.wins.career";
/**
 * Achievement IDs are "buyout.honor.<statsId>" with hyphens flattened to
 * underscores — App Store Connect allows only [A-Za-z0-9._] in GC ids.
 */
export const achievementId = (statsId: string) => `buyout.honor.${statsId.replace(/-/g, "_")}`;

let signedIn = false;
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
  return GC.playerAlias();
}

/** Attempt sign-in (shows the Game Center sheet if needed). */
export async function gcAuthenticate(): Promise<boolean> {
  signedIn = await GC.authenticate();
  notify();
  if (signedIn) void syncAll();
  return signedIn;
}

export async function gcShowLeaderboards(): Promise<void> {
  await GC.showGameCenter();
}

/** Push current career stats + all unlocked honors to Game Center. */
export async function syncAll(): Promise<void> {
  if (!signedIn) return;
  try {
    const stats = await loadStats();
    const s = summarize(stats);
    if (s.best > 0) await GC.submitScore(LB_BEST_FORTUNE, s.best);
    if (s.wins > 0) await GC.submitScore(LB_CAREER_WINS, s.wins);
    for (const id of stats.unlocked) {
      if (ACHIEVEMENTS.some((a) => a.id === id)) {
        await GC.reportAchievement(achievementId(id), 100);
      }
    }
  } catch {}
}

/** Call after a finished game has been recorded locally. */
export async function reportGameOver(g: GameState, newlyUnlocked: { id: string }[]): Promise<void> {
  if (!signedIn) return;
  try {
    const human = g.players.find((p) => p.kind === "human");
    if (human) await GC.submitScore(LB_BEST_FORTUNE, human.cash);
    const s = summarize(await loadStats());
    if (s.wins > 0) await GC.submitScore(LB_CAREER_WINS, s.wins);
    for (const a of newlyUnlocked) {
      await GC.reportAchievement(achievementId(a.id), 100);
    }
  } catch {}
}
