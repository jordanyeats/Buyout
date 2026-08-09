import React from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { COLS, ROWS, SINGLE, canPlay, type GameState, type Tile } from "../engine";
import { BD2, INK, INK2, SANS_BLACK, SANS_SEMI } from "../theme";
import { StampIn, companyStyle } from "./common";

export function Board({ game, sel, onSelect }: {
  game: GameState;
  sel: Tile | null;
  onSelect: (t: Tile) => void;
}) {
  const { width } = useWindowDimensions();
  const cell = Math.min(40, Math.floor((Math.min(width, 540) - 64) / COLS));
  const human = game.players.findIndex((p) => p.kind === "human");
  const playable = new Set(
    human >= 0 && game.phase === "place" && game.current === human
      ? game.players[human]!.hand.filter(([r, c]) => canPlay(game, r, c)).map(([r, c]) => r + "," + c)
      : [],
  );
  const label = (r: number, c: number) => String.fromCharCode(65 + c) + (r + 1);

  return (
    <View style={{ alignItems: "center", paddingVertical: 6 }}>
      <View style={{ flexDirection: "row", marginLeft: 18 }}>
        {Array.from({ length: COLS }, (_, c) => (
          <Text key={c} style={{ width: cell, textAlign: "center", fontFamily: SANS_SEMI, fontSize: 10, color: INK2 }}>
            {String.fromCharCode(65 + c)}
          </Text>
        ))}
      </View>
      {Array.from({ length: ROWS }, (_, r) => (
        <View key={r} style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ width: 18, textAlign: "center", fontFamily: SANS_SEMI, fontSize: 10, color: INK2 }}>{r + 1}</Text>
          {Array.from({ length: COLS }, (_, c) => {
            const t = game.board[r]![c];
            const key = r + "," + c;
            const inHand = playable.has(key);
            const isSel = !!sel && sel[0] === r && sel[1] === c;
            const cs = t && t !== SINGLE ? companyStyle(t) : null;
            const placed = !!t;
            const inner = (
              <View style={{
                width: cell - 3, height: cell - 3, margin: 1.5,
                alignItems: "center", justifyContent: "center",
                backgroundColor: cs ? cs.bg : t === SINGLE ? "#6E675E" : isSel ? INK : "transparent",
                borderWidth: isSel ? 2 : inHand ? 1.5 : placed ? 1 : 0,
                borderColor: isSel ? INK : inHand ? INK2 : "rgba(20,16,12,0.35)",
              }}>
                {placed || inHand ? (
                  <Text style={{
                    fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 0.4,
                    color: cs ? cs.tx : t === SINGLE ? "#CFC8BD" : isSel ? "#FAF6F0" : INK2,
                  }}>
                    {cs ? cs.code : t === SINGLE ? "·" : label(r, c)}
                  </Text>
                ) : (
                  <View style={{ width: 2, height: 2, backgroundColor: BD2 }} />
                )}
              </View>
            );
            const a11y = cs
              ? `${t} tile at ${label(r, c)}`
              : t === SINGLE
                ? `Unincorporated tile at ${label(r, c)}`
                : inHand
                  ? `Place tile ${label(r, c)}`
                  : `Empty ${label(r, c)}`;
            return (
              <Pressable key={c} disabled={!inHand} onPress={() => onSelect([r, c])}
                accessibilityRole={inHand ? "button" : "none"} accessibilityLabel={a11y}>
                {placed ? <StampIn>{inner}</StampIn> : inner}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
