// JS entry for the local Game Center module. Guarded so web builds,
// Expo Go, and Android quietly no-op.
import { Platform } from "react-native";

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

export interface Diagnosis {
  signedIn: boolean;
  alias?: string;
  error?: string;
  leaderboardsFound?: string[];
  leaderboardsMissing?: string[];
  achievementsFound?: string[];
  achievementsMissing?: string[];
  leaderboardError?: string | null;
  achievementError?: string | null;
}

export interface AuthState {
  authenticated: boolean;
  alias: string | null;
  error: string | null;
}

let cached: any | null | undefined;

function native(): any | null {
  if (Platform.OS !== "ios") return null;
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requireNativeModule } = require("expo-modules-core");
    cached = requireNativeModule("BuyoutGameCenter");
  } catch {
    cached = null;
  }
  return cached;
}

/** True when the native module is present at all — false on web/Android/Expo Go. */
export function available(): boolean {
  return native() !== null;
}

/**
 * Install the native authenticate handler. Returns the current auth state
 * synchronously; the real answer arrives on the onAuthChange subscription,
 * because the sign-in sheet can take arbitrarily long (or fail to present).
 */
export function startAuthentication(): boolean {
  try {
    return native()?.startAuthentication() ?? false;
  } catch {
    return false;
  }
}

export function onAuthChange(fn: (s: AuthState) => void): () => void {
  const m = native();
  if (!m) return () => {};
  try {
    const sub = m.addListener("onAuthChange", (e: AuthState) => fn(e));
    return () => { try { sub.remove(); } catch {} };
  } catch {
    return () => {};
  }
}

export function isAuthenticated(): boolean {
  try {
    return native()?.isAuthenticated() ?? false;
  } catch {
    return false;
  }
}

export function playerAlias(): string | null {
  try {
    return native()?.playerAlias() ?? null;
  } catch {
    return null;
  }
}

export function lastError(): string | null {
  try {
    return native()?.lastError() ?? null;
  } catch {
    return null;
  }
}

export async function submitScore(leaderboardId: string, value: number): Promise<SubmitResult> {
  const m = native();
  if (!m) return { ok: false, error: "Game Center is unavailable in this build." };
  try {
    return await m.submitScore(leaderboardId, Math.round(value));
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export async function reportAchievement(achievementId: string, percent = 100): Promise<SubmitResult> {
  const m = native();
  if (!m) return { ok: false, error: "Game Center is unavailable in this build." };
  try {
    return await m.reportAchievement(achievementId, percent);
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

/** Ask Game Center which of these IDs App Store Connect actually knows about. */
export async function diagnose(leaderboardIds: string[], achievementIds: string[]): Promise<Diagnosis> {
  const m = native();
  if (!m) return { signedIn: false, error: "Game Center is unavailable in this build." };
  try {
    return await m.diagnose(leaderboardIds, achievementIds);
  } catch (e: any) {
    return { signedIn: false, error: e?.message ?? String(e) };
  }
}

export async function showGameCenter(): Promise<boolean> {
  try {
    return (await native()?.showGameCenter()) ?? false;
  } catch {
    return false;
  }
}
