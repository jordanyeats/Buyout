import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import {
  aiAction, applyAction, currentActor, newGame,
  type Action, type GameOptions, type GameState, type PlayerConfig,
} from "../engine";
import { play } from "./sound";
import { recordGame, type AchievementDef } from "./stats";
import { reportGameOver } from "./gamecenter";

const SAVE_KEY = "buyout.save.v1";

interface SaveFile {
  configs: PlayerConfig[];
  seed: number;
  useCards: boolean;
  options?: GameOptions;
  actions: Action[];
}

/**
 * Game store: state + action log. Persistence is trivial because the engine is
 * deterministic — we save {seed, configs, actions} after every move and restore
 * by replaying. A killed app resumes mid-merger, mid-anything.
 */
export function useGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [unlocked, setUnlocked] = useState<AchievementDef[]>([]);
  const [restoring, setRestoring] = useState(true);
  const [hasSave, setHasSave] = useState(false);
  const saveRef = useRef<SaveFile | null>(null);
  const lastConfig = useRef<{ configs: PlayerConfig[]; useCards: boolean; options: GameOptions } | null>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On launch: detect a saved game.
  useEffect(() => {
    AsyncStorage.getItem(SAVE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as SaveFile;
          if (parsed && parsed.configs && Array.isArray(parsed.actions)) {
            saveRef.current = parsed;
            setHasSave(true);
          }
        }
      })
      .catch(() => {})
      .finally(() => setRestoring(false));
  }, []);

  const persist = useCallback(() => {
    const s = saveRef.current;
    if (s) AsyncStorage.setItem(SAVE_KEY, JSON.stringify(s)).catch(() => {});
  }, []);

  const start = useCallback((configs: PlayerConfig[], useCards: boolean, options: GameOptions = {}) => {
    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) | 0;
    saveRef.current = { configs, seed, useCards, options, actions: [] };
    lastConfig.current = { configs, useCards, options };
    setUnlocked([]);
    persist();
    setGame(newGame(configs, seed, useCards, options));
  }, [persist]);

  const resume = useCallback(() => {
    const s = saveRef.current;
    if (!s) return;
    let g = newGame(s.configs, s.seed, s.useCards, s.options ?? {});
    const good: Action[] = [];
    for (const a of s.actions) {
      try {
        g = applyAction(g, a);
        good.push(a);
      } catch {
        break; // corrupt tail: keep the longest valid prefix
      }
    }
    s.actions = good;
    lastConfig.current = { configs: s.configs, useCards: s.useCards, options: s.options ?? {} };
    persist();
    setGame(g);
  }, [persist]);

  const abandon = useCallback(() => {
    saveRef.current = null;
    setHasSave(false);
    AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
    setGame(null);
  }, []);

  /** Leave the table but keep the save — the main screen offers Resume. */
  const quitToMenu = useCallback(() => {
    setGame((g) => {
      if (g && !g.over && saveRef.current) setHasSave(true);
      return null;
    });
  }, []);

  /** New game, same table: reuse the last configuration. */
  const restart = useCallback(() => {
    const c = lastConfig.current;
    if (c) start(c.configs, c.useCards, c.options);
  }, [start]);

  const act = useCallback((action: Action) => {
    setGame((prev) => {
      if (!prev) return prev;
      try {
        const next = applyAction(prev, action);
        if (saveRef.current) {
          saveRef.current.actions.push(action);
          persist();
        }
        if (Platform.OS !== "web") {
          if (action.type === "place") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          if (next.phase === "mergerAnnounce") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          if (next.phase === "gameOver") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        if (action.type === "place") play("thump");
        if (next.phase === "mergerAnnounce") play("page");
        if (prev.phase === "mergerAnnounce" && next.phase !== "mergerAnnounce") play("cash");
        if (next.over) play("chime");
        if (next.over && saveRef.current) {
          saveRef.current = null;
          AsyncStorage.removeItem(SAVE_KEY).catch(() => {});
          recordGame(next)
            .then((got) => {
              setUnlocked(got);
              void reportGameOver(next, got);
            })
            .catch(() => {});
        }
        return next;
      } catch (e) {
        console.warn("engine rejected action", action, e);
        return prev;
      }
    });
  }, [persist]);

  // AI turn loop: whenever the acting seat is an AI, schedule its move.
  useEffect(() => {
    if (!game || game.over) return;
    // Popups are acknowledged by the human player, always.
    if (game.phase === "mergerAnnounce" || game.phase === "mergerResult") return;
    const actor = game.players[currentActor(game)];
    if (!actor || actor.kind === "human") return;
    aiTimer.current = setTimeout(() => {
      try {
        act(aiAction(game));
      } catch (e) {
        console.warn("ai failed", e);
      }
    }, 900 + Math.floor(Math.random() * 1600));
    return () => {
      if (aiTimer.current) clearTimeout(aiTimer.current);
    };
  }, [game, act]);

  return { game, restoring, hasSave, start, resume, abandon, act, quit: quitToMenu, restart, unlocked };
}
