import React, { useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import type { Action, GameState, Tile } from "../engine";
import type { AchievementDef } from "../store/stats";
import { ACCENT, BG, INK, INK2, INK3, SANS, SANS_BLACK, SANS_SEMI, SERIF } from "../theme";
import { Board } from "../components/Board";
import { SectionRule } from "../components/common";
import { FrontPage, MarketWrap } from "../components/FrontPage";
import { ActionsPanel, CoBar, HandBar, Holdings, Ticker } from "../components/panels";

export function GameScreen({ game, act, onQuit, unlocked = [] }: {
  game: GameState;
  act: (a: Action) => void;
  onQuit: () => void;
  unlocked?: AchievementDef[];
}) {
  const [sel, setSel] = useState<Tile | null>(null);
  const { width } = useWindowDimensions();
  const wide = width >= 768; // iPad: board left, desk right
  const place = (a: Action) => { setSel(null); act(a); };

  const boardCol = (
    <View style={wide ? { flex: 1.1, paddingRight: 18 } : undefined}>
      <Board game={game} sel={sel} onSelect={setSel} />
      <HandBar game={game} sel={sel} onSelect={setSel} />
      <CoBar game={game} />
    </View>
  );
  const deskCol = (
    <View style={wide ? { flex: 1, borderLeftWidth: 1, borderLeftColor: INK, paddingLeft: 18 } : undefined}>
      {game.over && unlocked.length > 0 ? (
        <View style={{ borderWidth: 1, borderColor: ACCENT, padding: 10, marginTop: 12 }}>
          <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: ACCENT }}>■ Honors earned</Text>
          {unlocked.map((a) => (
            <Text key={a.id} style={{ fontFamily: SANS_SEMI, fontSize: 12, color: INK, marginTop: 3 }}>{a.name} — <Text style={{ fontFamily: SANS, color: INK2 }}>{a.desc}</Text></Text>
          ))}
        </View>
      ) : null}
      <SectionRule label="Your move" />
      <ActionsPanel game={game} sel={sel} act={place} onNewGame={onQuit} />
      <SectionRule label="Market listings" right="blocks held" />
      <Holdings game={game} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {game.phase === "mergerAnnounce" ? <FrontPage game={game} onDismiss={() => act({ type: "acknowledge" })} /> : null}
      {game.phase === "mergerResult" ? <MarketWrap game={game} onDismiss={() => act({ type: "acknowledge" })} /> : null}
      <ScrollView contentContainerStyle={{ padding: 14, paddingTop: 54 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 3 }}>
          <Text style={{ fontFamily: SERIF, fontSize: 18, color: INK }}>The Buyout Ledger</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
            <Text style={{ fontFamily: SANS, fontSize: 9, color: INK2, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Turn {game.turn + 1} · {game.pool.length} tiles
            </Text>
            <Pressable onPress={onQuit} hitSlop={8}>
              <Text style={{ fontFamily: SANS_SEMI, fontSize: 9, color: INK3, letterSpacing: 1, textTransform: "uppercase" }}>Quit</Text>
            </Pressable>
          </View>
        </View>
        <View style={{ borderBottomWidth: 3, borderBottomColor: INK, marginTop: 2, marginBottom: 4 }} />
        <Ticker game={game} />
        {wide ? (
          <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 8 }}>
            {boardCol}
            {deskCol}
          </View>
        ) : (
          <>
            {boardCol}
            {deskCol}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
