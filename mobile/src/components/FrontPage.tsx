import React from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { priceOf, type GameState } from "../engine";
import { BD2, BG, INK, INK2, INK3, RED, SANS, SANS_BLACK, SERIF, SERIF_BOLD, money } from "../theme";
import { InkButton, PressIn, Wordmark } from "./common";

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
  const holders = game.players.filter((p) => (p.shares[dn0] ?? 0) > 0);
  const totalBlocks = game.players.reduce((s, p) => s + (p.shares[dn0] ?? 0), 0);
  const founder = game.founders[dn0];
  const co = game.cos[dn0]!;
  const para1 = `The board of ${dn0} accepted a tender offer from ${ctx.surv} at the close of the ${ordinal(game.turn + 1)} turn, ending its run as an independent concern at a market size of ${co.size}. Shareholders will be paid out at ${money(price)} a block across ${totalBlocks} outstanding block${totalBlocks === 1 ? "" : "s"}, with majority and minority bonuses settling immediately.`;
  const para2 = `${holders.length ? `${holders.length} shareholder${holders.length === 1 ? "" : "s"} now face the choice the market always asks after a deal: take the cash, convert at three-for-two, or hold defunct paper against a refounding. ` : ""}${founder ? `${founder}, who incorporated ${dn0}, was reported to be reviewing the terms. ` : ""}The deal was put in motion by ${ctx.triggeredBy}.`;

  return (
    <Modal visible animationType="fade" onRequestClose={onDismiss}>
      <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ padding: 20, paddingTop: 54 }}>
        <PressIn>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 4 }}>
            <Text style={{ fontFamily: SERIF, fontSize: 16, color: INK }}>The Buyout Ledger</Text>
            <Text style={{ fontFamily: SANS, fontSize: 9, color: INK2, letterSpacing: 1.5, textTransform: "uppercase" }}>Turn {game.turn + 1} · M&A Desk</Text>
          </View>
          <View style={{ borderBottomWidth: 3, borderBottomColor: INK, marginTop: 2, marginBottom: 16 }} />
        </PressIn>

        <PressIn delay={80}>
          <Text style={{ fontFamily: SANS_BLACK, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: RED, marginBottom: 4 }}>Acquisition</Text>
          <Text style={{ fontFamily: SERIF, fontSize: 38, lineHeight: 39, color: INK, marginBottom: 8 }}>
            {ctx.surv} swallows {ctx.defuncts.join(" and ")}
          </Text>
          <Text style={{ fontFamily: SERIF_BOLD, fontStyle: "italic", fontSize: 15, color: INK2, marginBottom: 14 }}>
            Shareholders to be paid {money(price)} a block; settlement opens at once
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
                {p.shares[dn0]} blk · {money((p.shares[dn0] ?? 0) * price)}
              </Text>
            </View>
          )) : <Text style={{ fontFamily: SANS, fontSize: 12, color: INK3, fontStyle: "italic" }}>None on record.</Text>}
        </PressIn>

        <PressIn delay={540} style={{ marginTop: 24 }}>
          <InkButton label="Proceed to settlement ⟶" onPress={onDismiss} />
        </PressIn>
        <View style={{ height: 24 }} />
        <View style={{ marginTop: 4, alignItems: "center" }}>
          <Wordmark name={ctx.surv} size={11} />
        </View>
      </ScrollView>
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
          <Text style={{ fontFamily: SANS, fontSize: 12.5, color: INK2, marginBottom: 10 }}>{money(priceOf(game, ctx.surv))} a block</Text>
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
