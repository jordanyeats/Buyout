import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COMPANIES } from "../engine";
import { ACCENT, BG, INK, INK2, INK3, SANS, SANS_BLACK, SANS_SEMI, SERIF } from "../theme";
import { InkButton, PressIn, Wordmark } from "../components/common";
import { AdSlot } from "../components/AdSlot";

export function HomeScreen({ hasSave, onResume, onDiscard, onNewGame, onSettings, onTutorial, onStats }: {
  hasSave: boolean;
  onResume: () => void;
  onDiscard: () => void;
  onNewGame: () => void;
  onSettings: () => void;
  onTutorial: () => void;
  onStats: () => void;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 26, flexGrow: 1, justifyContent: "center" }}>
        <PressIn style={{ alignItems: "center" }}>
          <Text style={{ fontFamily: SANS_SEMI, fontSize: 10, letterSpacing: 3.5, textTransform: "uppercase", color: INK3 }}>The Buyout Ledger presents</Text>
          <Text style={{ fontFamily: SERIF, fontSize: 52, color: INK, marginVertical: 2 }}>Buyout</Text>
          <Text style={{ fontFamily: SANS_SEMI, fontSize: 13, color: INK2 }}>Found. Invest. Merge.</Text>
        </PressIn>

        <PressIn delay={100} style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginVertical: 22 }}>
          {COMPANIES.map((c) => <Wordmark key={c.name} name={c.name} size={11} />)}
        </PressIn>

        <PressIn delay={160}>
          <View style={{ borderTopWidth: 2.5, borderTopColor: INK }} />
          <View style={{ borderTopWidth: 1, borderTopColor: INK, marginTop: 2, marginBottom: 14 }} />

          {hasSave ? (
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: ACCENT, marginBottom: 8 }}>
                ■ Unfinished business on the desk
              </Text>
              <InkButton primary label="Resume game" onPress={onResume} />
              <View style={{ height: 8 }} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <InkButton label="New game" onPress={onNewGame} style={{ flex: 1 }} />
                <InkButton label="Discard save" onPress={onDiscard} />
              </View>
            </View>
          ) : (
            <InkButton primary label="New game" onPress={onNewGame} />
          )}

          <View style={{ height: 10 }} />
          <InkButton label="Settings" onPress={onSettings} />
        </PressIn>

        <PressIn delay={240} style={{ flexDirection: "row", justifyContent: "center", gap: 22, marginTop: 22 }}>
          <Text onPress={onTutorial} style={{ fontFamily: SANS_SEMI, fontSize: 11.5, color: INK2, letterSpacing: 1, textTransform: "uppercase", textDecorationLine: "underline" }}>
            Learn the game
          </Text>
          <Text onPress={onStats} style={{ fontFamily: SANS_SEMI, fontSize: 11.5, color: INK2, letterSpacing: 1, textTransform: "uppercase", textDecorationLine: "underline" }}>
            The record
          </Text>
        </PressIn>

        <Text style={{ textAlign: "center", fontFamily: SANS, fontSize: 10, color: INK3, marginTop: 28 }}>
          v{require("../../app.json").expo.version}
        </Text>
        <AdSlot />
      </ScrollView>
    </SafeAreaView>
  );
}
