// JS entry for the local Game Center module. Guarded so web builds,
// Expo Go, and Android quietly no-op.
import { Platform } from "react-native";

function native(): any | null {
  if (Platform.OS !== "ios") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { requireNativeModule } = require("expo-modules-core");
    return requireNativeModule("BuyoutGameCenter");
  } catch {
    return null;
  }
}

export async function authenticate(): Promise<boolean> {
  try {
    return (await native()?.authenticate()) ?? false;
  } catch {
    return false;
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

export async function submitScore(leaderboardId: string, value: number): Promise<boolean> {
  try {
    return (await native()?.submitScore(leaderboardId, Math.round(value))) ?? false;
  } catch {
    return false;
  }
}

export async function reportAchievement(achievementId: string, percent = 100): Promise<boolean> {
  try {
    return (await native()?.reportAchievement(achievementId, percent)) ?? false;
  } catch {
    return false;
  }
}

export async function showGameCenter(): Promise<boolean> {
  try {
    return (await native()?.showGameCenter()) ?? false;
  } catch {
    return false;
  }
}
