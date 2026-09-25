import React, { useEffect, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { currentActor, type Action, type GameState, type Tile } from "../engine";
import type { AchievementDef } from "../store/stats";
import { ACCENT, BG, INK, INK2, INK3, SANS, SANS_BLACK, SANS_SEMI, SERIF } from "../theme";
import { Board } from "../components/Board";
import { LedgerPage, SectionRule } from "../components/common";
import { FinalEdition, FrontPage, MarketWrap } from "../components/FrontPage";
import { AdBreak } from "../components/AdBreak";
import { adBreakDue, runInterstitial } from "../store/monetize";
import { ActionsPanel, CoBar, HandBar, Holdings, SafeBanner, Ticker } from "../components/panels";

/**
 * What the two columns need before a side-by-side layout is worth it: the
 * Holdings table stops being readable under about 300pt, and a board below
 * about 300pt square is not one you want to aim at with a thumb.
 */
const DESK_MIN = 300;
const BOARD_MIN = 300;
const COL_GAP = 18;
/**
 * Masthead, ticker and the sheet's own padding, above the two columns —
 * and what those come to once the page is asked to be compact, which a
 * screen under this height gets. A phone held sideways is 390pt tall: the
 * full nameplate and its rules are a third of it.
 */
const SHEET_CHROME = 132;
const SHEET_CHROME_COMPACT = 88;
const SHORT_SCREEN = 500;

export function GameScreen({ game, act, onQuit, onRestart, unlocked = [] }: {
  game: GameState;
  act: (a: Action) => void;
  onQuit: () => void;
  onRestart: () => void;
  unlocked?: AchievementDef[];
}) {
  const [sel, setSel] = useState<Tile | null>(null);
  const [showFinal, setShowFinal] = useState(false);
  const [adBreak, setAdBreak] = useState(false);
  // A finished game either goes straight to the Final Edition, or takes the
  // sponsor break first. The break stays mounted under the ad so the results
  // are never glimpsed before it, and reveals only once the ad is closed.
  useEffect(() => {
    // A new game must clear both, or "run it back" carries the last game's
    // overlay state into it: showFinal stayed true across a restart, so the
    // next finished game could mount its results alongside the sponsor break
    // instead of behind it.
    if (!game.over) { setAdBreak(false); setShowFinal(false); return; }
    if (adBreakDue()) setAdBreak(true);
    else setShowFinal(true);
  }, [game.over]);
  // Both stable: AdBreak's countdown keys off the identity of what it is given,
  // and a fresh arrow per render would restart the timer on every re-render.
  // reveal is idempotent, so the ad closing and the player tapping the way out
  // can both call it without fighting.
  const reveal = React.useCallback(() => { setAdBreak(false); setShowFinal(true); }, []);
  const runBreak = React.useCallback(() => { void runInterstitial().then(reveal); }, [reveal]);
  const { width, height } = useWindowDimensions();
  // Even halves, so the divider falls on the centre line. On iPhone Duo that
  // is where the fold is, which puts the board on one side of the hinge and
  // the floor and listings on the other. Elsewhere it just reads as a
  // broadsheet's gutter.
  //
  // Side by side when the sheet is wider than it is tall, stacked when it is
  // taller than it is wide — Apple's own rule for a split arrangement, and
  // the reason their Duo guidance says to "steer clear of fixed widths or
  // anything tied to a specific display". The old 768 was both too high and
  // too low at once: it missed the Duo's inner display, and a purely
  // width-based threshold splits a tall screen into two columns so narrow
  // that the board ends up smaller than it would be on a phone.
  const wide = width > height && width - DESK_MIN - COL_GAP >= BOARD_MIN;
  // What is left for the board after the sheet's own padding and the divider.
  const boardRoom = wide ? width - DESK_MIN - COL_GAP - 28 : width - 28;
  const compact = height < SHORT_SCREEN;
  // Height of the two-column sheet: the viewport less the masthead and ticker.
  // Both columns stretch to it, which is what lets the divider run the full
  // height and the desk's footer sit on the bottom rule rather than wherever
  // the listings happen to end.
  const sheetH = height - (compact ? SHEET_CHROME_COMPACT : SHEET_CHROME);
  const place = (a: Action) => { setSel(null); act(a); };
  // "Your move" only when the human is actually the one deciding.
  const actor = game.players[currentActor(game)];
  const yourTurn = game.over || (actor?.kind === "human" && game.phase !== "mergerAnnounce" && game.phase !== "mergerResult");

  const boardCol = (
    <View style={wide ? { flex: 1, paddingRight: COL_GAP, justifyContent: "center" } : undefined}>
      <SafeBanner game={game} />
      <Board
        game={game}
        sel={sel}
        onSelect={setSel}
        // In one column the board shares the sheet with the desk below it, so
        // it takes the upper part; in two it has the column's full height.
        maxHeight={wide ? sheetH - 40 : Math.min(height * 0.62, boardRoom)}
      />
      <CoBar game={game} />
    </View>
  );
  const deskCol = (
    <View style={wide ? { flex: 1, borderLeftWidth: 1, borderLeftColor: INK, paddingLeft: COL_GAP } : undefined}>
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
      <SectionRule label="Market listings" right="shares held" space={wide ? 34 : 16} />
      <Holdings game={game} />
      <View style={{
        flexDirection: "row", justifyContent: "center", gap: 26,
        // Pushed to the foot of the column when there is a column to fill.
        marginTop: wide ? "auto" : 22,
        paddingTop: 10, borderTopWidth: 1, borderTopColor: INK,
      }}>
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
      {adBreak ? <AdBreak onDone={runBreak} onSkip={reveal} /> : null}
      {game.over && showFinal ? (
        <FinalEdition game={game} unlocked={unlocked} onRestart={onRestart} onQuit={onQuit} onInspect={() => setShowFinal(false)} />
      ) : null}
      {game.phase === "mergerAnnounce" ? <FrontPage game={game} onDismiss={() => act({ type: "acknowledge" })} /> : null}
      {game.phase === "mergerResult" ? <MarketWrap game={game} onDismiss={() => act({ type: "acknowledge" })} /> : null}
      <LedgerPage title="The Buyout Ledger" padding={14} compact={compact} fullWidth>
        <Ticker game={game} compact={compact} />
        {wide ? (
          <View style={{ flexDirection: "row", alignItems: "stretch", marginTop: compact ? 3 : 8, minHeight: sheetH }}>
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
