import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { applyAction, type Action, type GameState, type Tile } from "../engine";
import { ACCENT, BG, GRN, INK, INK2, INK3, SANS, SANS_BLACK, SERIF, SERIF_BOLD } from "../theme";
import { Board } from "../components/Board";
import { InkButton, PressIn, SectionRule } from "../components/common";
import { FrontPage, MarketWrap } from "../components/FrontPage";
import { ActionsPanel, CoBar, HandBar, Holdings } from "../components/panels";
import { TUTORIAL } from "../tutorial/script";

export function TutorialScreen({ onExit }: { onExit: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);
  const step = TUTORIAL[stepIdx]!;
  const [game, setGame] = useState<GameState | null>(() => (step.build ? step.build() : null));
  const [sel, setSel] = useState<Tile | null>(null);

  const advance = () => {
    const next = stepIdx + 1;
    if (next >= TUTORIAL.length) {
      onExit();
      return;
    }
    const ns = TUTORIAL[next]!;
    setStepIdx(next);
    setDone(false);
    setSel(null);
    if (ns.build) setGame(ns.build());
    // build === null → continue the current game state
  };

  const act = (a: Action) => {
    if (!game) return;
    try {
      const next = applyAction(game, a);
      setGame(next);
      setSel(null);
      if (step.goal && step.goal(a, next)) setDone(true);
    } catch {
      // illegal action during tutorial: ignore quietly
    }
  };

  const showBoard = !!game && step.goal !== null || (!!game && step.build !== null);
  const humanTurnUi = useMemo(() => !!game && !game.over, [game]);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {game && game.phase === "mergerAnnounce" ? <FrontPage game={game} onDismiss={() => act({ type: "acknowledge" })} /> : null}
      {game && game.phase === "mergerResult" ? <MarketWrap game={game} onDismiss={() => act({ type: "acknowledge" })} /> : null}
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 54 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 3 }}>
          <Text style={{ fontFamily: SERIF, fontSize: 17, color: INK }}>The Training Desk</Text>
          <Text onPress={onExit} style={{ fontFamily: SANS, fontSize: 9, color: INK3, letterSpacing: 1.5, textTransform: "uppercase" }}>Exit</Text>
        </View>
        <View style={{ borderBottomWidth: 3, borderBottomColor: INK, marginTop: 2, marginBottom: 12 }} />

        <PressIn key={stepIdx}>
          <View style={{ borderWidth: 1, borderColor: INK, padding: 14, marginBottom: 6 }}>
            <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: ACCENT }}>
              ■ {step.kicker} · {stepIdx + 1} of {TUTORIAL.length}
            </Text>
            <Text style={{ fontFamily: SERIF, fontSize: 21, color: INK, marginVertical: 4 }}>{step.headline}</Text>
            <Text style={{ fontFamily: SERIF_BOLD, fontSize: 13, lineHeight: 20, color: INK2, textAlign: "justify" }}>{step.body}</Text>
            {done ? (
              <Text style={{ fontFamily: SANS_BLACK, fontSize: 12, color: GRN, marginTop: 8 }}>✓ Nicely done.</Text>
            ) : step.hint && step.goal ? (
              <Text style={{ fontFamily: SANS, fontSize: 11, color: INK3, marginTop: 8, fontStyle: "italic" }}>{step.hint}</Text>
            ) : null}
          </View>
          {(done || step.goal === null) ? (
            <InkButton primary label={stepIdx + 1 >= TUTORIAL.length ? "To the real game ⟶" : "Continue ⟶"} onPress={advance} />
          ) : null}
        </PressIn>

        {game && showBoard ? (
          <View>
            <SectionRule label="The board" />
            <Board game={game} sel={sel} onSelect={setSel} />
            {humanTurnUi ? <HandBar game={game} sel={sel} onSelect={setSel} /> : null}
            <CoBar game={game} />
            {!done && step.goal ? (
              <>
                <SectionRule label="Your move" />
                <ActionsPanel game={game} sel={sel} act={act} onNewGame={onExit} />
              </>
            ) : null}
            <SectionRule label="Market listings" />
            <Holdings game={game} />
          </View>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
