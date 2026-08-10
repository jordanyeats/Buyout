import React, { useEffect, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { currentActor, type Action, type GameState, type Tile } from "../engine";
import type { AchievementDef } from "../store/stats";
import { ACCENT, BG, INK, INK2, INK3, SANS, SANS_BLACK, SANS_SEMI, SERIF } from "../theme";
import { Board } from "../components/Board";
import { LedgerPage, SectionRule } from "../components/common";
import { FinalEdition, FrontPage, MarketWrap } from "../components/FrontPage";
import { ActionsPanel, CoBar, HandBar, Holdings, Ticker } from "../components/panels";

export function GameScreen({ game, act, onQuit, onRestart, unlocked = [] }: {
  game: GameState;
  act: (a: Action) => void;
  onQuit: () => void;
  onRestart: () => void;
  unlocked?: AchievementDef[];
}) {
  const [sel, setSel] = useState<Tile | null>(null);
  const [showFinal, setShowFinal] = useState(false);
  useEffect(() => { if (game.over) setShowFinal(true); }, [game.over]);
  const { width } = useWindowDimensions();
  const wide = width >= 768; // iPad: board left, desk right
  const place = (a: Action) => { setSel(null); act(a); };
  // "Your move" only when the human is actually the one deciding.
  const actor = game.players[currentActor(game)];
  const yourTurn = game.over || (actor?.kind === "human" && game.phase !== "mergerAnnounce" && game.phase !== "mergerResult");

  const boardCol = (
    <View style={wide ? { flex: 1.1, paddingRight: 18 } : undefined}>
      <Board game={game} sel={sel} onSelect={setSel} />
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
      <SectionRule label={yourTurn ? "Your move" : "The floor"} />
      <ActionsPanel game={game} sel={sel} act={place} onNewGame={onRestart} onSelect={setSel} />
      <SectionRule label="Market listings" right="shares held" />
      <Holdings game={game} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 26, marginTop: 22, paddingTop: 10, borderTopWidth: 1, borderTopColor: INK }}>
        <Pressable onPress={onRestart} hitSlop={8}>
          <Text style={{ fontFamily: SANS_SEMI, fontSize: 11, color: INK2, letterSpacing: 1.5, textTransform: "uppercase", textDecorationLine: "underline" }}>Restart</Text>
        </Pressable>
        <Pressable onPress={onQuit} hitSlop={8}>
          <Text style={{ fontFamily: SANS_SEMI, fontSize: 11, color: INK2, letterSpacing: 1.5, textTransform: "uppercase", textDecorationLine: "underline" }}>Quit to main screen</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {game.over && showFinal ? (
        <FinalEdition game={game} unlocked={unlocked} onRestart={onRestart} onQuit={onQuit} onInspect={() => setShowFinal(false)} />
      ) : null}
      {game.phase === "mergerAnnounce" ? <FrontPage game={game} onDismiss={() => act({ type: "acknowledge" })} /> : null}
      {game.phase === "mergerResult" ? <MarketWrap game={game} onDismiss={() => act({ type: "acknowledge" })} /> : null}
      <LedgerPage title="The Buyout Ledger" padding={14}>
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
      </LedgerPage>
    </View>
  );
}
