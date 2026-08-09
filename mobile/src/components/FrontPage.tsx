import React from "react";
import { Modal, SafeAreaView, ScrollView, Text, View } from "react-native";
import { priceOf, type GameState } from "../engine";
import { ACCENT, BD, BD2, BG, GRN, INK, INK2, INK3, RED, SANS, SANS_BLACK, SANS_SEMI, SERIF, SERIF_BOLD, money } from "../theme";
import { CountUp, InkButton, PressIn, Wordmark } from "./common";
import type { AchievementDef } from "../store/stats";

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]!);
}

/** Mergers arrive as a broadsheet front page, not a dialog. */
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
  const para2 = `${holders.length ? `${holders.length} shareholder${holders.length === 1 ? "" : "s"} now face the choice the market always asks after a deal: take the cash, convert at three-for-two, or hold defunct paper against a refounding. ` : ""}${founder ? `${founder}, who incorporated ${dn0}, was reported to be reviewing the terms. ` : ""}The deal was put in motion by ${ctx.triggeredBy}.`;

  return (
    <Modal visible animationType="fade" onRequestClose={onDismiss}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12 }}>
        <PressIn>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 4 }}>
            <Text style={{ fontFamily: SERIF, fontSize: 16, color: INK }}>The Buyout Ledger</Text>
            <Text style={{ fontFamily: SANS, fontSize: 9, color: INK2, letterSpacing: 1.5, textTransform: "uppercase" }}>Turn {game.turn + 1} · M&A Desk</Text>
          </View>
          <View style={{ borderBottomWidth: 3, borderBottomColor: INK, marginTop: 2, marginBottom: 16 }} />
        </PressIn>

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
                <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: ctx.card.dev ? RED : INK }}>■ Special report</Text>
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
      </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/** Post-merger result: a compact market-wrap column. */
export function MarketWrap({ game, onDismiss }: { game: GameState; onDismiss: () => void }) {
  const ctx = game.mergerCtx;
  if (!ctx) return null;
  const cs = { borderColor: INK };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={{ flex: 1, backgroundColor: "rgba(26,23,21,0.45)", alignItems: "center", justifyContent: "center", padding: 22 }}>
        <View style={{ backgroundColor: BG, borderWidth: 1, ...cs, padding: 20, width: "100%", maxWidth: 380 }}>
          <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: INK3 }}>Market wrap</Text>
          <Text style={{ fontFamily: SERIF, fontSize: 20, color: INK, marginTop: 3 }}>
            {ctx.surv} settles at size {game.cos[ctx.surv]!.size}
          </Text>
          <Text style={{ fontFamily: SANS, fontSize: 12.5, color: INK2, marginBottom: 10 }}>{money(priceOf(game, ctx.surv))} a share</Text>
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
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 12 }}>
          <PressIn>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 4 }}>
              <Text style={{ fontFamily: SERIF, fontSize: 16, color: INK }}>The Buyout Ledger</Text>
              <Text style={{ fontFamily: SANS, fontSize: 9, color: INK2, letterSpacing: 1.5, textTransform: "uppercase" }}>After {game.turn} turns</Text>
            </View>
            <View style={{ borderBottomWidth: 3, borderBottomColor: INK, marginTop: 2, marginBottom: 14 }} />
          </PressIn>

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
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
