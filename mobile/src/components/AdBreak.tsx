import React, { useEffect, useRef, useState } from "react";
import { Modal, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BD2, INK, INK2, INK3, RED, SANS, SANS_BLACK, SERIF, SERIF_BOLD } from "../theme";
import { LedgerPage, PressIn } from "./common";

/**
 * The sponsor break, set as a front page.
 *
 * An interstitial arriving unannounced on the results screen reads as a toll.
 * Announced by the paper itself — the newsboy's shout, a countdown, then the
 * ad — it reads as part of the bit, which is the only version worth shipping.
 * Purely presentational: it counts down and calls back. The caller owns the ad.
 */

/** Rotated so a player who finishes thirty games hears thirty different cries. */
const CRIES: { shout: string; line: string }[] = [
  { shout: "Extra! Extra!", line: "A word from our sponsor — final results after this." },
  { shout: "Hold the front page", line: "A word from today's sponsor, then your final standings." },
  { shout: "Stop the presses", line: "Our sponsor has the floor. Results directly after." },
  { shout: "The auditors are counting", line: "A word from today's sponsor while they finish." },
  { shout: "Late edition", line: "First, a message from today's sponsor." },
  { shout: "The copy desk is checking", line: "A word from our sponsor while your figures are confirmed." },
  { shout: "The closing bell has rung", line: "Final positions after this message from our sponsor." },
  { shout: "Your ledger is being balanced", line: "Meanwhile, a word from today's sponsor." },
];

const BODY = [
  "The desk has your final standings set in type. They run the moment today's sponsor has had their say.",
  "Every edition of this paper is paid for by somebody. Today it is paid for by the notice below.",
  "The presses hold for no one — except, as ever, for the advertiser.",
];

const COUNT_FROM = 3;

export function AdBreak({ onDone }: { onDone: () => void }) {
  const [left, setLeft] = useState(COUNT_FROM);
  const cry = useRef(CRIES[Math.floor(Math.random() * CRIES.length)]!).current;
  const body = useRef(BODY[Math.floor(Math.random() * BODY.length)]!).current;
  const fired = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          clearInterval(t);
          if (!fired.current) { fired.current = true; onDone(); }
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onDone]);

  return (
    <Modal visible animationType="fade" onRequestClose={() => {}}>
      <SafeAreaProvider>
        <LedgerPage
          title="The Buyout Ledger"
          padding={20}
          right={<Text style={{ fontFamily: SANS, fontSize: 9, color: INK3, letterSpacing: 1.5, textTransform: "uppercase" }}>Advertisement</Text>}
        >
          <View style={{ marginBottom: 10 }} />

          <PressIn delay={80}>
            <Text style={{ fontFamily: SANS_BLACK, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: RED, marginBottom: 4 }}>
              A word from our sponsor
            </Text>
            <Text style={{ fontFamily: SERIF, fontSize: 38, lineHeight: 39, color: INK, marginBottom: 8 }}>{cry.shout}</Text>
            <Text style={{ fontFamily: SERIF_BOLD, fontStyle: "italic", fontSize: 15, color: INK2, marginBottom: 14 }}>{cry.line}</Text>
          </PressIn>

          <PressIn delay={220} style={{ borderTopWidth: 1, borderTopColor: BD2, paddingTop: 12 }}>
            <Text style={{ fontFamily: SERIF_BOLD, fontSize: 13.5, lineHeight: 21, color: INK, textAlign: "justify" }}>{body}</Text>
          </PressIn>

          <PressIn delay={380} style={{ marginTop: 20 }}>
            <View style={{ borderWidth: 1, borderColor: INK, padding: 13 }}>
              <View style={{ borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 4, marginBottom: 9 }}>
                <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: INK }}>■ Going to press</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 8 }}>
                <Text style={{ fontFamily: SERIF, fontSize: 34, color: INK, fontVariant: ["tabular-nums"] }}>{left}</Text>
                <Text style={{ fontFamily: SANS, fontSize: 12.5, color: INK2 }}>
                  {left === 1 ? "second" : "seconds"}
                </Text>
              </View>
            </View>
          </PressIn>

          <View style={{ height: 28 }} />
        </LedgerPage>
      </SafeAreaProvider>
    </Modal>
  );
}
