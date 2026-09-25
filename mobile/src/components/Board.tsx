import React, { useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { COLS, ROWS, SINGLE, canPlay, companyTiles, type GameState, type Tile } from "../engine";
import { BD2, BG, INK, INK2, SANS_BLACK, SANS_SEMI } from "../theme";
import { StampIn, companyStyle } from "./common";
import { stampCentre } from "./stamp";

/** Width of the row-number gutter to the left of the grid. */
const GUTTER = 18;

/**
 * The mark on a company that has grown past being taken over: two lines of
 * caps on a black bar, stamped across the middle of the block. It replaces the
 * rule that used to be drawn around the perimeter — a border says "these
 * tiles", a stamp says "this company" — and it states the consequence rather
 * than naming the state.
 *
 * The wording has to run one way only. This company can still absorb others;
 * it just can never be absorbed. "Too big to merge" reads as though it were
 * out of mergers altogether, and anything built on "buy" or "sale" collides
 * with buying its shares, which you do every turn. Naming what it is safe
 * *from* is the phrasing that carries the direction and nothing else.
 */
const STAMP = {
  line1: "SAFE FROM",
  line2: "TAKEOVER",
  size: 9,
  track: 1.6,
  lead: 10,
  padV: 3.5,
  padH: 9,
};
/** Two lines plus padding. Fixed, because the line height is set explicitly. */
const STAMP_H = STAMP.lead * 2 + STAMP.padV * 2;
/** Stand-in width until the bar has measured itself; only the search reads it. */
const STAMP_W0 = 72;
/**
 * The stamp centres itself inside this box, which is pinned to the point the
 * search picked. Sizing the box generously is what lets the bar be positioned
 * without the layout having to know how wide its own text came out.
 */
const ANCHOR = { w: 180, h: 56 };

const stampLine = {
  fontFamily: SANS_BLACK,
  fontSize: STAMP.size,
  lineHeight: STAMP.lead,
  letterSpacing: STAMP.track,
  color: BG,
  textAlign: "center" as const,
  // Letterspacing trails the final glyph, so a centred line sits half a space
  // to the left of true centre without this.
  marginLeft: STAMP.track,
};

function Stamp({ onMeasure }: { onMeasure?: (w: number) => void }) {
  return (
    <View
      onLayout={onMeasure ? (e) => onMeasure(e.nativeEvent.layout.width) : undefined}
      style={{ backgroundColor: INK, paddingVertical: STAMP.padV, paddingHorizontal: STAMP.padH }}
    >
      <Text style={stampLine}>{STAMP.line1}</Text>
      <Text style={stampLine}>{STAMP.line2}</Text>
    </View>
  );
}

export function Board({ game, sel, onSelect }: {
  game: GameState;
  sel: Tile | null;
  onSelect: (t: Tile) => void;
}) {
  const { width } = useWindowDimensions();
  const cell = Math.min(40, Math.floor((Math.min(width, 540) - 64) / COLS));
  const [stampW, setStampW] = useState(STAMP_W0);
  const human = game.players.findIndex((p) => p.kind === "human");
  const playable = new Set(
    human >= 0 && game.phase === "place" && game.current === human
      ? game.players[human]!.hand.filter(([r, c]) => canPlay(game, r, c)).map(([r, c]) => r + "," + c)
      : [],
  );
  const label = (r: number, c: number) => String.fromCharCode(65 + c) + (r + 1);

  const safe = Object.values(game.cos).filter((c) => c.status === "safe");
  const safeKey = safe.map((c) => `${c.name}:${c.size}`).join(",");
  const board = game.board;
  const stamps = useMemo(
    () => safe.map((c) => ({
      name: c.name,
      ...stampCentre(companyTiles(board, c.name), cell, stampW, STAMP_H),
    })),
    // Placement depends only on which companies are safe and how large they
    // are: a company cannot change shape without changing size, so this skips
    // the search on every unrelated turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeKey, cell, stampW],
  );

  return (
    <View style={{ alignItems: "center", paddingVertical: 6 }}>
      <View style={{ flexDirection: "row", marginLeft: GUTTER }}>
        {Array.from({ length: COLS }, (_, c) => (
          <Text key={c} style={{ width: cell, textAlign: "center", fontFamily: SANS_SEMI, fontSize: 10, color: INK2 }}>
            {String.fromCharCode(65 + c)}
          </Text>
        ))}
      </View>

      <View>
        {Array.from({ length: ROWS }, (_, r) => (
          <View key={r} style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ width: GUTTER, textAlign: "center", fontFamily: SANS_SEMI, fontSize: 10, color: INK2 }}>{r + 1}</Text>
            {Array.from({ length: COLS }, (_, c) => {
              const t = game.board[r]![c];
              const key = r + "," + c;
              const inHand = playable.has(key);
              const isSel = !!sel && sel[0] === r && sel[1] === c;
              const cs = t && t !== SINGLE ? companyStyle(t) : null;
              const placed = !!t;
              const safeCo = !!t && t !== SINGLE && game.cos[t]?.status === "safe";
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
                  accessibilityLabel={safeCo ? `${a11y}, too big to merge` : a11y}>
                  <View style={{ width: cell, height: cell }}>
                    {placed ? <StampIn>{inner}</StampIn> : inner}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}

        {/* One stamp per safe company, over the grid. The tiles underneath keep
            their own labels, so the bar is hidden from assistive tech. */}
        {stamps.map((s) => (
          <View
            key={s.name}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              position: "absolute",
              left: GUTTER + s.cx - ANCHOR.w / 2,
              top: s.cy - ANCHOR.h / 2,
              width: ANCHOR.w, height: ANCHOR.h,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Stamp />
          </View>
        ))}
      </View>

      {/* Measured off-screen so the placement search knows the bar's real width
          before the first company ever reaches the threshold. */}
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={{ position: "absolute", opacity: 0, left: -1000, top: 0 }}>
        <Stamp onMeasure={(w) => { if (w > 0 && Math.abs(w - stampW) > 0.5) setStampW(w); }} />
      </View>
    </View>
  );
}
