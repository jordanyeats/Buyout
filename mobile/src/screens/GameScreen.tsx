import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { Action, GameState, Tile } from "../engine";
import { BG, INK, INK2, INK3, SANS, SANS_SEMI, SERIF } from "../theme";
import { Board } from "../components/Board";
import { SectionRule } from "../components/common";
import { FrontPage, MarketWrap } from "../components/FrontPage";
import { ActionsPanel, CoBar, HandBar, Holdings, Ticker } from "../components/panels";

export function GameScreen({ game, act, onQuit }: {
  game: GameState;
  act: (a: Action) => void;
  onQuit: () => void;
}) {
  const [sel, setSel] = useState<Tile | null>(null);
  const place = (a: Action) => { setSel(null); act(a); };

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
        <Board game={game} sel={sel} onSelect={setSel} />
        <HandBar game={game} sel={sel} onSelect={setSel} />
        <CoBar game={game} />
        <SectionRule label="Your move" />
        <ActionsPanel game={game} sel={sel} act={place} onNewGame={onQuit} />
        <SectionRule label="Market listings" right="blocks held" />
        <Holdings game={game} />
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
