import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { isMuted, setMuted } from "../store/sound";
import { buyRemoveAds, getRemoveAdsPrice, isAdFree, onMonetizeChange, restorePurchases } from "../store/monetize";
import { ACCENT, BD, BG, GRN, INK, INK2, INK3, SANS, SANS_BLACK, SANS_SEMI, SERIF } from "../theme";
import { InkButton, LedgerPage, SectionRule } from "../components/common";

export function SettingsScreen({ onExit }: { onExit: () => void }) {
  const [muted, setMutedState] = useState(isMuted());
  const [adFree, setAdFree] = useState(isAdFree());
  const [price, setPrice] = useState(getRemoveAdsPrice());
  const [busy, setBusy] = useState(false);
  useEffect(() => onMonetizeChange(() => { setAdFree(isAdFree()); setPrice(getRemoveAdsPrice()); }), []);

  const say = (title: string, msg: string) => {
    if (Platform.OS === "web") console.log(title, msg);
    else Alert.alert(title, msg);
  };

  const purchase = async () => {
    setBusy(true);
    try {
      await buyRemoveAds();
    } catch (e: any) {
      say("Purchase unavailable", e?.message ?? "Try again later.");
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      const found = await restorePurchases();
      say(found ? "Restored" : "Nothing to restore", found ? "Ads are off. Thanks again." : "No previous Remove Ads purchase was found for this Apple ID.");
    } catch (e: any) {
      say("Restore unavailable", e?.message ?? "Try again later.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <LedgerPage
        title="The Back Office"
        right={<Text onPress={onExit} style={{ fontFamily: SANS, fontSize: 9, color: INK3, letterSpacing: 1.5, textTransform: "uppercase" }}>Back</Text>}
      >
        <SectionRule label="Table" />
        <Pressable
          onPress={() => { setMuted(!muted); setMutedState(!muted); }}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BD }}
        >
          <View>
            <Text style={{ fontFamily: SANS_SEMI, fontSize: 13.5, color: INK }}>Sound</Text>
            <Text style={{ fontFamily: SANS, fontSize: 11, color: INK3 }}>Tile thumps, front-page turns, the closing chime</Text>
          </View>
          <View style={{ borderWidth: 1.5, borderColor: INK, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: muted ? "transparent" : INK }}>
            <Text style={{ fontFamily: SANS_BLACK, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: muted ? INK : BG }}>
              {muted ? "Off" : "On"}
            </Text>
          </View>
        </Pressable>
        <Text style={{ fontFamily: SANS, fontSize: 11, color: INK3, marginTop: 10, fontStyle: "italic" }}>
          Merger-deck settings live on the new-game desk, per game.
        </Text>

        <SectionRule label="Advertising" />
        {adFree ? (
          <Text style={{ fontFamily: SANS_SEMI, fontSize: 13, color: GRN, paddingVertical: 10 }}>
            ■ Ads removed — thank you for backing the Ledger.
          </Text>
        ) : (
          <View style={{ paddingVertical: 6 }}>
            <Text style={{ fontFamily: SANS, fontSize: 12.5, lineHeight: 19, color: INK2, marginBottom: 10 }}>
              Buyout is free with the occasional advertisement. One purchase removes them forever, on every device signed into your Apple ID.
            </Text>
            <InkButton
              primary
              label={busy ? "Working…" : `Remove ads${price ? ` — ${price}` : ""}`}
              onPress={busy ? () => {} : purchase}
            />
            <Text
              onPress={busy ? undefined : restore}
              style={{ textAlign: "center", fontFamily: SANS_SEMI, fontSize: 11, color: INK2, letterSpacing: 1, textTransform: "uppercase", textDecorationLine: "underline", paddingVertical: 12 }}
            >
              Restore purchases
            </Text>
          </View>
        )}

        <SectionRule label="The fine print" />
        <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: ACCENT, marginTop: 4 }}>■ Privacy</Text>
        <Text style={{ fontFamily: SANS, fontSize: 13, lineHeight: 20, color: INK2, marginTop: 6 }}>
          Your game stays on your device. Saves, statistics, honors, and any player names you type are stored locally and never leave this phone. Buyout has no accounts and no analytics of its own, and the game is fully playable offline.{"\n\n"}
          The free edition shows advertisements from Google AdMob, which may collect device identifiers to serve and measure ads — only with your permission, which iOS asks for and you can change any time in Settings › Privacy › Tracking. Decline and ads simply stay non-personalized. Purchasing Remove Ads ends all advertising and the data collection that comes with it.{"\n\n"}
          Deleting the app deletes all of its local data.{"\n\n"}
          Questions: jordan.yeats@gmail.com
        </Text>

        <View style={{ height: 24 }} />
        <InkButton primary label="Back to the desk" onPress={onExit} />
        <Text style={{ textAlign: "center", fontFamily: SANS, fontSize: 10, color: INK3, marginTop: 18 }}>
          Buyout v{require("../../app.json").expo.version} · © 2026 Jordan Yeats
        </Text>
        <View style={{ height: 40 }} />
      </LedgerPage>
    </View>
  );
}
