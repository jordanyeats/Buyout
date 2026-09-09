import React from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { COLS, ROWS, SINGLE, canPlay, type GameState, type Tile } from "../engine";
import { BD2, INK, INK2, SANS_BLACK, SANS_SEMI } from "../theme";
import { StampIn, companyStyle } from "./common";

/** Weight of the perimeter rule drawn around a safe company. */
const SAFE_RULE = 2.5;

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
            // A safe company is drawn with a heavy rule around the whole block,
            // not around each tile: an edge is inked only where it faces
            // something that is not the same company, so the outlines of
            // adjacent tiles join into one perimeter.
            const safeCo = !!t && t !== SINGLE && game.cos[t]?.status === "safe";
            const other = (rr: number, cc: number) =>
              rr < 0 || cc < 0 || rr >= ROWS || cc >= COLS || game.board[rr]![cc] !== t;
            const edge = safeCo
              ? { top: other(r - 1, c), bottom: other(r + 1, c), left: other(r, c - 1), right: other(r, c + 1) }
              : null;
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
                accessibilityRole={inHand ? "button" : "none"}
                accessibilityLabel={safeCo ? `${a11y}, safe from takeover` : a11y}>
                <View style={{ width: cell, height: cell }}>
                  {placed ? <StampIn>{inner}</StampIn> : inner}
                  {edge ? (
                    <View pointerEvents="none" style={{
                      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                      borderColor: INK,
                      borderTopWidth: edge.top ? SAFE_RULE : 0,
                      borderBottomWidth: edge.bottom ? SAFE_RULE : 0,
                      borderLeftWidth: edge.left ? SAFE_RULE : 0,
                      borderRightWidth: edge.right ? SAFE_RULE : 0,
                    }} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
