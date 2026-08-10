import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { isMuted, setMuted } from "../store/sound";
import { ACCENT, BD, BG, INK, INK2, INK3, SANS, SANS_BLACK, SANS_SEMI, SERIF } from "../theme";
import { InkButton, LedgerPage, SectionRule } from "../components/common";

export function SettingsScreen({ onExit }: { onExit: () => void }) {
  const [muted, setMutedState] = useState(isMuted());

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

        <SectionRule label="The fine print" />
        <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: ACCENT, marginTop: 4 }}>■ Privacy</Text>
        <Text style={{ fontFamily: SANS, fontSize: 13, lineHeight: 20, color: INK2, marginTop: 6 }}>
          Buyout keeps everything on your device. Game saves, statistics, honors, and any player names you type are stored locally and never leave this phone.{"\n\n"}
          Nothing is collected. Nothing is transmitted. There are no accounts, no analytics, no advertising, no tracking, and no third-party data services. The game is fully playable offline.{"\n\n"}
          Deleting the app deletes all of its data.{"\n\n"}
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
