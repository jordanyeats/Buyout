import React from "react";
import { Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic, PlayfairDisplay_900Black,
} from "@expo-google-fonts/playfair-display";
import {
  SourceSans3_400Regular, SourceSans3_600SemiBold, SourceSans3_700Bold, SourceSans3_800ExtraBold,
} from "@expo-google-fonts/source-sans-3";
import { useGame } from "./src/store/useGame";
import { initSound } from "./src/store/sound";
import { initMonetize, maybeShowInterstitial } from "./src/store/monetize";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SetupScreen } from "./src/screens/SetupScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { GameScreen } from "./src/screens/GameScreen";
import { TutorialScreen } from "./src/screens/TutorialScreen";
import { StatsScreen } from "./src/screens/StatsScreen";
import { BG, INK3, SANS } from "./src/theme";

export default function App() {
  const [screen, setScreen] = React.useState<"home" | "setup" | "settings" | "tutorial" | "stats">("home");
  React.useEffect(() => { initSound(); initMonetize(); }, []);
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_900Black,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
    SourceSans3_800ExtraBold,
  });
  const { game, restoring, hasSave, start, resume, abandon, act, quit, restart, unlocked } = useGame();

  if (!fontsLoaded || restoring) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: fontsLoaded ? SANS : undefined, fontSize: 12, color: INK3 }}>Setting the type…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {game ? (
        <GameScreen
          game={game}
          act={act}
          onQuit={() => { const over = game.over; quit(); setScreen("home"); if (over) maybeShowInterstitial(); }}
          onRestart={() => { const over = game.over; restart(); if (over) maybeShowInterstitial(); }}
          unlocked={unlocked}
        />
      ) : screen === "tutorial" ? (
        <TutorialScreen onExit={() => setScreen("home")} />
      ) : screen === "stats" ? (
        <StatsScreen onExit={() => setScreen("home")} />
      ) : screen === "settings" ? (
        <SettingsScreen onExit={() => setScreen("home")} />
      ) : screen === "setup" ? (
        <SetupScreen
          onStart={(p, c, ex) => { start(p, c, { excludedCards: ex }); setScreen("home"); }}
          onExit={() => setScreen("home")}
        />
      ) : (
        <HomeScreen
          hasSave={hasSave}
          onResume={resume}
          onDiscard={abandon}
          onNewGame={() => setScreen("setup")}
          onSettings={() => setScreen("settings")}
          onTutorial={() => setScreen("tutorial")}
          onStats={() => setScreen("stats")}
        />
      )}
    </SafeAreaProvider>
  );
}
