import React, { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, Text, View } from "react-native";
import { SUPPORT_URL } from "../links";
import { isMuted, setMuted } from "../store/sound";
import { buyRemoveAds, getRemoveAdsPrice, isAdFree, monetizeStatus, onMonetizeChange, restorePurchases } from "../store/monetize";
import {
  gcAlias, gcAuthenticate, gcAvailable, gcDiagnose, gcLastError,
  gcSignedIn, onGameCenterChange,
} from "../store/gamecenter";
import {
  PACKS, cardsIn, cleanCountFor, deckSize, excludedFor, getPackConfig,
  onPackChange, setCustomExcluded, setPack, type PackId,
} from "../store/packs";
import { CARD_DEFS } from "../engine";
import { ACCENT, BD, BD2, BG, GRN, INK, INK2, INK3, RED, SANS, SANS_BLACK, SANS_BOLD, SANS_SEMI, SERIF, WARM } from "../theme";
import { InkButton, LedgerPage, SectionRule } from "../components/common";

export function SettingsScreen({ onExit }: { onExit: () => void }) {
  const [muted, setMutedState] = useState(isMuted());
  const [adFree, setAdFree] = useState(isAdFree());
  const [price, setPrice] = useState(getRemoveAdsPrice());
  const [busy, setBusy] = useState(false);
  const [gc, setGc] = useState(gcSignedIn());
  const [cfg, setCfg] = useState(getPackConfig());
  const [showCards, setShowCards] = useState(false);
  const [diag, setDiag] = useState<string | null>(null);
  const [showDiag, setShowDiag] = useState(false);
  const [mon, setMon] = useState(monetizeStatus());
  useEffect(() => onMonetizeChange(() => { setAdFree(isAdFree()); setPrice(getRemoveAdsPrice()); setMon(monetizeStatus()); }), []);
  useEffect(() => onGameCenterChange(() => setGc(gcSignedIn())), []);
  useEffect(() => onPackChange(() => setCfg(getPackConfig())), []);

  const cut = new Set(excludedFor(cfg));
  const toggleCard = (id: string) => {
    const next = cfg.customExcluded.includes(id)
      ? cfg.customExcluded.filter((x) => x !== id)
      : [...cfg.customExcluded, id];
    void setCustomExcluded(next);
  };

  const runDiagnosis = async () => {
    setDiag("Asking Game Center…");
    const d = await gcDiagnose();
    if (!d.signedIn) { setDiag(`Not signed in. ${d.error ?? ""}`.trim()); return; }
    const lbMissing = d.leaderboardsMissing ?? [];
    const acMissing = d.achievementsMissing ?? [];
    if (!lbMissing.length && !acMissing.length) {
      setDiag(`All good — ${d.leaderboardsFound?.length ?? 0} leaderboards and ${d.achievementsFound?.length ?? 0} achievements are live for ${d.alias ?? "you"}.`);
      return;
    }
    setDiag(
      [
        lbMissing.length ? `Leaderboards Game Center does not know: ${lbMissing.join(", ")}` : null,
        acMissing.length ? `Achievements Game Center does not know: ${acMissing.join(", ")}` : null,
        d.leaderboardError ? `Leaderboard error: ${d.leaderboardError}` : null,
        d.achievementError ? `Achievement error: ${d.achievementError}` : null,
      ].filter(Boolean).join("\n\n"),
    );
  };

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

        <SectionRule label="The merger deck" />
        <Text style={{ fontFamily: SANS, fontSize: 12.5, lineHeight: 19, color: INK2, marginBottom: 10 }}>
          Which cards are shuffled in when a deal closes. Applies to every new game.
        </Text>
        {PACKS.map((p) => {
          const on = cfg.pack === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => { void setPack(p.id as PackId); }}
              style={{
                borderWidth: 1, borderColor: on ? ACCENT : BD, backgroundColor: on ? WARM : "transparent",
                padding: 12, marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 16, height: 16, borderWidth: 1.5, borderColor: INK, backgroundColor: on ? INK : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {on ? <Text style={{ color: BG, fontSize: 10, fontFamily: SANS_BOLD }}>✓</Text> : null}
                </View>
                <Text style={{ fontFamily: SANS_BOLD, fontSize: 13.5, color: INK, flex: 1 }}>{p.name}</Text>
                <Text style={{ fontFamily: SANS, fontSize: 10.5, color: INK3 }}>
                  {deckSize({ pack: p.id as PackId, customExcluded: cfg.customExcluded })} cards
                </Text>
              </View>
              <Text style={{ fontFamily: SANS, fontSize: 11.5, lineHeight: 17, color: INK2, marginTop: 5 }}>{p.desc}</Text>
            </Pressable>
          );
        })}

        <Pressable onPress={() => setShowCards(!showCards)} style={{ paddingVertical: 8 }}>
          <Text style={{ fontFamily: SANS_SEMI, fontSize: 11, color: INK3, letterSpacing: 1, textTransform: "uppercase" }}>
            {showCards ? "▾" : "▸"} The cards
            {cfg.pack === "custom" ? " · tap to include or remove" : ` · ${cardsIn(cfg).length} of ${CARD_DEFS.length} effects · ${deckSize(cfg)} cards`}
          </Text>
        </Pressable>
        {showCards ? (
          <View style={{ marginBottom: 4 }}>
            {CARD_DEFS.map((c) => {
              const off = cut.has(c.id);
              const editable = cfg.pack === "custom";
              const Row = editable ? Pressable : View;
              return (
                <Row
                  key={c.id}
                  {...(editable ? { onPress: () => toggleCard(c.id) } : {})}
                  style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BD, opacity: off ? 0.45 : 1 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {editable ? (
                      <View style={{ width: 14, height: 14, borderWidth: 1.5, borderColor: INK, backgroundColor: off ? "transparent" : INK }} />
                    ) : null}
                    <Text style={{ fontFamily: SANS_BOLD, fontSize: 12.5, color: INK, flex: 1 }}>
                      {c.name}{off ? " — removed" : ""}
                    </Text>
                    <Text style={{ fontFamily: SANS, fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", color: c.dev ? RED : INK3 }}>
                      {c.dev ? "devastating" : c.cat}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: SANS, fontSize: 11.5, lineHeight: 17, color: INK2, marginTop: 2 }}>{c.desc}</Text>
                  <Text style={{ fontFamily: SANS, fontSize: 10.5, color: INK3, fontStyle: "italic", marginTop: 1 }}>{c.flav}</Text>
                </Row>
              );
            })}
            <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BD }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontFamily: SANS_BOLD, fontSize: 12.5, color: INK, flex: 1 }}>
                  Clean Acquisition ×{cleanCountFor(cfg)}
                </Text>
                <Text style={{ fontFamily: SANS, fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", color: INK3 }}>clean</Text>
              </View>
              <Text style={{ fontFamily: SANS, fontSize: 11.5, lineHeight: 17, color: INK2, marginTop: 2 }}>
                Normal merger. The dealmaker receives $5,000. Filler that lets most deals close quietly.
              </Text>
            </View>
          </View>
        ) : null}
        <Text style={{ fontFamily: SANS, fontSize: 11, lineHeight: 17, color: INK3, marginTop: 8, fontStyle: "italic" }}>
          Honors are earned on Standard and Hard only, or with the deck switched off entirely.
          The global leaderboards take Standard games alone, so every fortune on them was won with the same deck.
        </Text>

        <SectionRule label="Game Center" />
        {gc ? (
          <View style={{ paddingVertical: 6 }}>
            <Text style={{ fontFamily: SANS_SEMI, fontSize: 13, color: GRN }}>
              ■ Signed in{gcAlias() ? ` as ${gcAlias()}` : ""} — Standard fortunes and honors post automatically.
            </Text>
            <Text style={{ fontFamily: SANS, fontSize: 11.5, lineHeight: 17, color: INK3, marginTop: 6 }}>
              The tables themselves live at the top of The Record.
            </Text>
          </View>
        ) : (
          <View style={{ paddingVertical: 6 }}>
            <Text style={{ fontFamily: SANS, fontSize: 12.5, lineHeight: 19, color: INK2, marginBottom: 10 }}>
              {gcAvailable()
                ? "Sign in to post your best fortune and career wins to the leaderboards, and your honors as achievements."
                : "Game Center is unavailable in this build."}
            </Text>
            {gcAvailable() ? <InkButton label="Sign in to Game Center" onPress={() => gcAuthenticate()} /> : null}
          </View>
        )}
        {gcLastError() ? (
          <Text style={{ fontFamily: SANS, fontSize: 11, lineHeight: 17, color: RED, marginTop: 8 }}>
            Last Game Center error: {gcLastError()}
          </Text>
        ) : null}
        {gcAvailable() ? (
          <View style={{ marginTop: 10 }}>
            <Text
              onPress={() => { void runDiagnosis(); }}
              style={{ fontFamily: SANS_SEMI, fontSize: 11, color: INK2, letterSpacing: 1, textTransform: "uppercase", textDecorationLine: "underline" }}
            >
              Check Game Center setup
            </Text>
            {diag ? (
              <Text style={{ fontFamily: SANS, fontSize: 11, lineHeight: 17, color: INK2, marginTop: 8, borderLeftWidth: 2, borderLeftColor: BD2, paddingLeft: 8 }}>
                {diag}
              </Text>
            ) : null}
          </View>
        ) : null}

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
            {mon.lastPurchaseError ? (
              <Text style={{ fontFamily: SANS, fontSize: 11, lineHeight: 17, color: RED }}>
                {mon.lastPurchaseError}
              </Text>
            ) : null}
          </View>
        )}

        <Pressable onPress={() => setShowDiag(!showDiag)} style={{ paddingTop: 4 }}>
          <Text style={{ fontFamily: SANS, fontSize: 10, color: INK3, letterSpacing: 1, textTransform: "uppercase" }}>
            {showDiag ? "▾" : "▸"} Diagnostics
          </Text>
        </Pressable>
        {showDiag ? (
          <View style={{ marginTop: 8, borderLeftWidth: 2, borderLeftColor: BD2, paddingLeft: 8 }}>
            {[
              ["Ad SDK present", mon.adsAvailable ? "yes" : "no — native module missing"],
              ["Ad SDK initialized", mon.adsInitialized ? "yes" : "no"],
              ["Interstitial loaded", mon.interstitialReady ? "yes" : "no"],
              ["Held for", mon.interstitialAgeMs == null ? "—" : `${Math.round(mon.interstitialAgeMs / 60000)} min (expires near 60)`],
              ["Last ad error", mon.lastAdError ?? "none"],
              ["Store connected", mon.purchasesAvailable ? "yes" : "no — native module missing"],
              ["Remove Ads product", mon.productAvailable ? (mon.removeAdsPrice ?? "found") : "not returned by the App Store"],
              ["Last purchase error", mon.lastPurchaseError ?? "none"],
            ].map(([k, v]) => (
              <View key={k as string} style={{ flexDirection: "row", paddingVertical: 2 }}>
                <Text style={{ fontFamily: SANS, fontSize: 10.5, color: INK3, width: 130 }}>{k}</Text>
                <Text style={{ fontFamily: SANS_SEMI, fontSize: 10.5, color: INK2, flex: 1 }}>{v}</Text>
              </View>
            ))}
            {mon.adLog.length ? (
              <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: BD2, paddingTop: 6 }}>
                <Text style={{ fontFamily: SANS, fontSize: 10, color: INK3, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>
                  Ad log
                </Text>
                {mon.adLog.map((line, i) => (
                  <Text key={i} style={{ fontFamily: SANS, fontSize: 10, lineHeight: 14, color: INK2 }}>{line}</Text>
                ))}
              </View>
            ) : null}
            <Text style={{ fontFamily: SANS, fontSize: 10, lineHeight: 15, color: INK3, marginTop: 6, fontStyle: "italic" }}>
              One advertisement follows each finished game. There is no session or time gate.
            </Text>
          </View>
        ) : null}

        <SectionRule label="The fine print" />
        <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: ACCENT, marginTop: 4 }}>■ Privacy</Text>
        <Text style={{ fontFamily: SANS, fontSize: 13, lineHeight: 20, color: INK2, marginTop: 6 }}>
          Your game stays on your device. Saves, statistics, honors, and any player names you type are stored locally and never leave this phone. Buyout has no accounts and no analytics of its own, and the game is fully playable offline.{"\n\n"}
          The free edition shows advertisements from Google AdMob, which may collect device identifiers to serve and measure ads — only with your permission, which iOS asks for and you can change any time in Settings › Privacy › Tracking. Decline and ads simply stay non-personalized. Purchasing Remove Ads ends all advertising and the data collection that comes with it.{"\n\n"}
          Deleting the app deletes all of its local data.{"\n\n"}
          Questions, bugs, or ideas:{" "}
          <Text
            onPress={() => { void Linking.openURL(SUPPORT_URL); }}
            style={{ fontFamily: SANS_SEMI, textDecorationLine: "underline" }}
          >
            the support page
          </Text>
          .
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
