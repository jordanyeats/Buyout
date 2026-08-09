import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Fire-and-forget sound effects. Every call is guarded: a sound failure must
 * never break a game action. Muted state persists across launches.
 */
type SfxName = "thump" | "page" | "cash" | "chime";

let players: Partial<Record<SfxName, { seekTo: (s: number) => void; play: () => void }>> = {};
let muted = false;
let ready = false;

const MUTE_KEY = "buyout.muted";

export async function initSound(): Promise<void> {
  try {
    muted = (await AsyncStorage.getItem(MUTE_KEY)) === "1";
  } catch {}
  if (Platform.OS === "web") return; // keep web preview silent & simple
  try {
    const { createAudioPlayer, setAudioModeAsync } = await import("expo-audio");
    await setAudioModeAsync({ playsInSilentMode: false });
    players = {
      thump: createAudioPlayer(require("../../assets/sfx/thump.m4a")),
      page: createAudioPlayer(require("../../assets/sfx/page.m4a")),
      cash: createAudioPlayer(require("../../assets/sfx/cash.m4a")),
      chime: createAudioPlayer(require("../../assets/sfx/chime.m4a")),
    };
    ready = true;
  } catch (e) {
    console.warn("sound init failed (continuing silently)", e);
  }
}

export function play(name: SfxName): void {
  if (muted || !ready) return;
  try {
    const p = players[name];
    if (p) {
      p.seekTo(0);
      p.play();
    }
  } catch {}
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  AsyncStorage.setItem(MUTE_KEY, m ? "1" : "0").catch(() => {});
}
