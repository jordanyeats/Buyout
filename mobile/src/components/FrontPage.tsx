import React from "react";
import { Modal, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MAJORITY_MULT, MINORITY_MULT, majorityMinority, priceOf, type GameState, type Player } from "../engine";
import { ACCENT, BD, BD2, BG, GRN, INK, INK2, INK3, RED, SANS, SANS_BLACK, SANS_BOLD, SANS_SEMI, SERIF, SERIF_BOLD, money } from "../theme";
import { CountUp, InkButton, LedgerPage, PressIn, Wordmark } from "./common";
import type { AchievementDef } from "../store/stats";

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]!);
}

/** Mergers arrive as a broadsheet front page, not a dialog. */
const displayName = (p: Player) => (p.kind === "human" ? "You" : p.name);

export function FrontPage({ game, onDismiss }: { game: GameState; onDismiss: () => void }) {
  const ctx = game.mergerCtx;
  if (!ctx) return null;
  const dn0 = ctx.defuncts[ctx.di] ?? ctx.defuncts[0]!;
  const price = priceOf(game, dn0);
  const holders = game.players
    .filter((p) => (p.shares[dn0] ?? 0) > 0)
    .sort((a, b) => (b.shares[dn0] ?? 0) - (a.shares[dn0] ?? 0)); // biggest position first
  const totalBlocks = game.players.reduce((s, p) => s + (p.shares[dn0] ?? 0), 0);
  const founder = game.founders[dn0];
  const co = game.cos[dn0]!;
  const para1 = `The board of ${dn0} accepted a tender offer from ${ctx.surv} at the close of the ${ordinal(game.turn + 1)} turn, ending its run as an independent concern at a market size of ${co.size}. Shareholders will be paid out at ${money(price)} a share across ${totalBlocks} outstanding share${totalBlocks === 1 ? "" : "s"}, with majority and minority bonuses settling immediately.`;
  const para2 = `${holders.length ? `${holders.length} shareholder${holders.length === 1 ? " now faces" : "s now face"} the choice the market always asks after a deal: take the cash, convert at three-for-two, or hold defunct paper against a refounding. ` : ""}${founder ? (founder === "You" ? `You, who incorporated ${dn0}, were reported to be reviewing the terms. ` : `${founder}, who incorporated ${dn0}, was reported to be reviewing the terms. `) : ""}${ctx.triggeredBy === "You" ? "You put the deal in motion." : `The deal was put in motion by ${ctx.triggeredBy}.`}`;

  // Bonus outlook for the positions box.
  const { maj, min } = majorityMinority(game, dn0);
  const majB = price * MAJORITY_MULT;
  const minB = price * MINORITY_MULT;
  let bonusNote: string | null = null;
  if (maj.length === 1 && min.length === 0 && holders.length) {
    const n = displayName(maj[0]!);
    bonusNote = `${n} hold${n === "You" ? "" : "s"} ${dn0} alone — the ${money(majB)} majority and ${money(minB)} minority bonuses both go to ${n === "You" ? "you" : n}: ${money(majB + minB)}.`;
  } else if (maj.length === 1) {
    const n = displayName(maj[0]!);
    bonusNote = `${n === "You" ? "You collect" : `${n} collects`} the ${money(majB)} majority bonus; the ${money(minB)} minority bonus goes to ${min.map(displayName).join(" and ")}.`;
  } else if (maj.length > 1 && min.length === 0) {
    bonusNote = `Majority is tied — ${maj.map(displayName).join(" and ")} split ${money(majB + minB)}, with no other shareholders to pay.`;
  } else if (maj.length > 1) {
    bonusNote = `Majority is tied — ${maj.map(displayName).join(" and ")} split the ${money(majB)} majority bonus; the ${money(minB)} minority bonus goes to ${min.map(displayName).join(" and ")}.`;
  }

  return (
    <Modal visible animationType="fade" onRequestClose={onDismiss}>
      <SafeAreaProvider>
      <LedgerPage
        title="The Buyout Ledger"
        padding={20}
        right={<Text style={{ fontFamily: SANS, fontSize: 9, color: INK3, letterSpacing: 1.5, textTransform: "uppercase" }}>Turn {game.turn + 1} · M&A Desk</Text>}
      >
        <View style={{ marginBottom: 10 }} />

        <PressIn delay={80}>
          <Text style={{ fontFamily: SANS_BLACK, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: RED, marginBottom: 4 }}>The Takeover</Text>
          <Text style={{ fontFamily: SERIF, fontSize: 38, lineHeight: 39, color: INK, marginBottom: 8 }}>
            {ctx.surv} swallows {ctx.defuncts.join(" and ")}
          </Text>
          <Text style={{ fontFamily: SERIF_BOLD, fontStyle: "italic", fontSize: 15, color: INK2, marginBottom: 14 }}>
            Shareholders to be paid {money(price)} a share; settlement opens at once
          </Text>
        </PressIn>

        <PressIn delay={220} style={{ borderTopWidth: 1, borderTopColor: BD2, paddingTop: 12 }}>
          <Text style={{ fontFamily: SERIF_BOLD, fontSize: 13.5, lineHeight: 21, color: INK, textAlign: "justify" }}>{para1}</Text>
          <Text style={{ fontFamily: SERIF_BOLD, fontSize: 13.5, lineHeight: 21, color: INK, textAlign: "justify", marginTop: 10 }}>{para2}</Text>
        </PressIn>

        {ctx.card ? (
          <PressIn delay={380} style={{ marginTop: 18 }}>
            <View style={{ borderWidth: 1, borderColor: INK, padding: 13, backgroundColor: ctx.card.dev ? "#F9EFEF" : "transparent" }}>
              <View style={{ borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 4, marginBottom: 7 }}>
                <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: ctx.card.dev ? RED : INK }}>
                  ■ Special report · drawn by {ctx.triggeredBy === "You" ? "you" : ctx.triggeredBy}
                </Text>
              </View>
              <Text style={{ fontFamily: SERIF, fontSize: 17, color: INK }}>{ctx.card.name}</Text>
              <Text style={{ fontFamily: SERIF_BOLD, fontStyle: "italic", fontSize: 11, color: INK2, marginVertical: 3 }}>{ctx.card.flav}</Text>
              <Text style={{ fontFamily: SANS, fontSize: 12.5, lineHeight: 18, color: INK }}>{ctx.card.desc}</Text>
            </View>
          </PressIn>
        ) : null}

        <PressIn delay={440} style={{ marginTop: 16 }}>
          <View style={{ borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 3, marginBottom: 5 }}>
            <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: INK }}>Positions — {dn0}</Text>
          </View>
          {holders.length ? holders.map((p) => (
            <View key={p.name} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
              <Text style={{ fontFamily: SANS, fontSize: 12, color: INK }}>{p.kind === "human" ? "You" : p.name}</Text>
              <Text style={{ fontFamily: SANS, fontSize: 12, color: INK2, fontVariant: ["tabular-nums"] }}>
                {p.shares[dn0]} sh · {money((p.shares[dn0] ?? 0) * price)}
              </Text>
            </View>
          )) : <Text style={{ fontFamily: SANS, fontSize: 12, color: INK3, fontStyle: "italic" }}>None on record.</Text>}
          {bonusNote ? (
            <Text style={{ fontFamily: SERIF_BOLD, fontStyle: "italic", fontSize: 12, lineHeight: 18, color: INK2, marginTop: 8, borderTopWidth: 1, borderTopColor: BD2, paddingTop: 7 }}>
              {bonusNote}
            </Text>
          ) : null}
        </PressIn>

        <PressIn delay={540} style={{ marginTop: 24 }}>
          <InkButton
            label={
              ctx.card?.id === "blocked" ? "Continue — the deal is dead ⟶"
              : ctx.card?.id === "regulatory" ? "Continue — the deal is delayed ⟶"
              : ctx.card?.dev ? "Brace, then settle ⟶"
              : "Proceed to settlement ⟶"
            }
            onPress={onDismiss}
          />
        </PressIn>
        <View style={{ height: 24 }} />
        <View style={{ marginTop: 4, alignItems: "center" }}>
          <Wordmark name={ctx.surv} size={11} />
        </View>
        <View style={{ height: 30 }} />
      </LedgerPage>
      </SafeAreaProvider>
    </Modal>
  );
}

/** Post-merger result: a compact market-wrap column. */
export function MarketWrap({ game, onDismiss }: { game: GameState; onDismiss: () => void }) {
  const ctx = game.mergerCtx;
  if (!ctx) return null;
  const cs = { borderColor: INK };
  const priceNow = priceOf(game, ctx.surv);
  const delta = priceNow - ctx.survPriceBefore;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={{ flex: 1, backgroundColor: "rgba(26,23,21,0.45)", alignItems: "center", justifyContent: "center", padding: 22 }}>
        <View style={{ backgroundColor: BG, borderWidth: 1, ...cs, padding: 20, width: "100%", maxWidth: 380 }}>
          <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: INK3 }}>Market wrap</Text>
          <Text style={{ fontFamily: SERIF, fontSize: 20, color: INK, marginTop: 3 }}>
            Merger settled
          </Text>
          <Text style={{ fontFamily: SANS, fontSize: 13, lineHeight: 20, color: INK2, marginTop: 4 }}>
            {delta > 0 ? (
              <>Shareholder value for {ctx.surv} has increased by{" "}
                <Text style={{ fontFamily: SANS_BOLD, color: GRN }}>{money(delta)}</Text> per share.</>
            ) : delta < 0 ? (
              <>Shareholder value for {ctx.surv} has fallen by{" "}
                <Text style={{ fontFamily: SANS_BOLD, color: RED }}>{money(-delta)}</Text> per share.</>
            ) : (
              <>Shareholder value for {ctx.surv} is unchanged.</>
            )}
          </Text>
          <Text style={{ fontFamily: SANS, fontSize: 12.5, color: INK3, marginTop: 4, marginBottom: 10 }}>
            Now {money(priceNow)} a share at size {game.cos[ctx.surv]!.size}
          </Text>
          <View style={{ borderTopWidth: 1, borderTopColor: BD2, paddingTop: 8 }}>
            {ctx.resultDetails.map((d, i) => (
              <Text key={i} style={{ fontFamily: SANS, fontSize: 12, lineHeight: 19, color: INK2 }}>{d}</Text>
            ))}
          </View>
          <InkButton label="Continue" onPress={onDismiss} primary style={{ marginTop: 16 }} />
        </View>
      </View>
    </Modal>
  );
}


/** The game's biggest front page: who won, and why the market closed. */
export function FinalEdition({ game, unlocked, onRestart, onQuit, onInspect }: {
  game: GameState;
  unlocked: AchievementDef[];
  onRestart: () => void;
  onQuit: () => void;
  onInspect: () => void;
}) {
  const ranked = [...game.players].sort((a, b) => b.cash - a.cash);
  const winner = ranked[0]!;
  const runnerUp = ranked[1];
  const youWon = winner.kind === "human";
  const landslide = !!runnerUp && winner.cash >= 2 * Math.max(1, runnerUp.cash);
  const headline = youWon
    ? landslide ? "You buy the whole board" : "You corner the market"
    : landslide ? `${winner.name} runs away with it` : `${winner.name} takes the market`;
  return (
    <Modal visible animationType="fade" onRequestClose={onQuit}>
      <SafeAreaProvider>
        <LedgerPage
          title="The Buyout Ledger"
          padding={20}
          right={<Text style={{ fontFamily: SANS, fontSize: 9, color: INK3, letterSpacing: 1.5, textTransform: "uppercase" }}>After {game.turn} turns</Text>}
        >
          <View style={{ marginBottom: 8 }} />

          <PressIn delay={80}>
            <Text style={{ fontFamily: SANS_BLACK, fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: RED, marginBottom: 4 }}>■ Final edition ■</Text>
            <Text style={{ fontFamily: SERIF, fontSize: 40, lineHeight: 41, color: INK, marginBottom: 8 }}>{headline}</Text>
            <Text style={{ fontFamily: SERIF_BOLD, fontStyle: "italic", fontSize: 15, lineHeight: 21, color: INK2, marginBottom: 4 }}>
              A fortune of {money(winner.cash)} closes the books{game.endReason ? ` — ${game.endReason}` : ""}
            </Text>
          </PressIn>

          <PressIn delay={240} style={{ borderTopWidth: 1, borderTopColor: BD2, paddingTop: 10, marginTop: 8 }}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 3, marginBottom: 6 }}>
              <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: INK }}>Final standings</Text>
            </View>
            {ranked.map((p, i) => (
              <View key={p.name} style={{ flexDirection: "row", alignItems: "baseline", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: BD }}>
                <Text style={{ width: 22, fontFamily: SERIF, fontSize: 15, color: i === 0 ? INK : INK3 }}>{i + 1}.</Text>
                <Text style={{ flex: 1, fontFamily: i === 0 ? SANS_BLACK : SANS_SEMI, fontSize: 13.5, color: i === 0 ? INK : INK2 }}>
                  {p.kind === "human" ? "You" : p.name}
                  {p.kind !== "human" ? <Text style={{ fontFamily: SANS, fontSize: 9, color: INK3 }}>  {p.kind}</Text> : null}
                </Text>
                <CountUp value={p.cash} style={{ fontFamily: i === 0 ? SANS_BLACK : SANS_SEMI, fontSize: 14.5, color: i === 0 ? GRN : INK2 }} />
              </View>
            ))}
          </PressIn>

          {unlocked.length > 0 ? (
            <PressIn delay={380} style={{ marginTop: 14 }}>
              <View style={{ borderWidth: 1, borderColor: ACCENT, padding: 12 }}>
                <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: ACCENT }}>■ Honors earned</Text>
                {unlocked.map((a) => (
                  <Text key={a.id} style={{ fontFamily: SANS_SEMI, fontSize: 12.5, color: INK, marginTop: 4 }}>
                    {a.name} — <Text style={{ fontFamily: SANS, color: INK2 }}>{a.desc}</Text>
                  </Text>
                ))}
              </View>
            </PressIn>
          ) : null}

          <PressIn delay={480} style={{ marginTop: 22, gap: 8 }}>
            <InkButton label="Run it back" primary onPress={onRestart} />
            <InkButton label="Back to the desk" onPress={onQuit} />
            <Text onPress={onInspect} style={{ textAlign: "center", fontFamily: SANS_SEMI, fontSize: 11, color: INK3, letterSpacing: 1, textTransform: "uppercase", textDecorationLine: "underline", paddingVertical: 8 }}>
              Inspect the final board
            </Text>
          </PressIn>
          <View style={{ height: 30 }} />
        </LedgerPage>
      </SafeAreaProvider>
    </Modal>
  );
}
