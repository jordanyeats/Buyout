import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Fire-and-release sound effects. Players are created per play and released
 * two seconds later — no idle AVPlayer sits around for the Simulator to poll
 * (the source of FigFilePlayer log spam). Every call is guarded: a sound
 * failure must never break a game action. Muted state persists.
 */
type SfxName = "thump" | "page" | "cash" | "chime";

const SOURCES: Record<SfxName, unknown> = {
  thump: require("../../assets/sfx/thump.m4a"),
  page: require("../../assets/sfx/page.m4a"),
  cash: require("../../assets/sfx/cash.m4a"),
  chime: require("../../assets/sfx/chime.m4a"),
};

let muted = false;
let modeSet = false;

const MUTE_KEY = "buyout.muted";

export async function initSound(): Promise<void> {
  try {
    muted = (await AsyncStorage.getItem(MUTE_KEY)) === "1";
  } catch {}
}

const localUri: Partial<Record<SfxName, string>> = {};

/** Resolve to a local file once — playing from disk avoids the dev-server
 *  HTTP streaming that makes the Simulator's media stack log complaints. */
async function uriFor(name: SfxName): Promise<string> {
  if (!localUri[name]) {
    const { Asset } = await import("expo-asset");
    const a = Asset.fromModule(SOURCES[name] as number);
    await a.downloadAsync();
    localUri[name] = a.localUri ?? a.uri;
  }
  return localUri[name]!;
}

export function play(name: SfxName): void {
  if (muted || Platform.OS === "web") return;
  import("expo-audio")
    .then(async ({ createAudioPlayer, setAudioModeAsync }) => {
      if (!modeSet) {
        modeSet = true;
        await setAudioModeAsync({ playsInSilentMode: false }).catch(() => {});
      }
      const p = createAudioPlayer({ uri: await uriFor(name) });
      p.play();
      setTimeout(() => {
        try {
          p.release();
        } catch {}
      }, 2500);
    })
    .catch(() => {});
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  AsyncStorage.setItem(MUTE_KEY, m ? "1" : "0").catch(() => {});
}
