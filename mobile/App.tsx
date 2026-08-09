import React from "react";
import { Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic, PlayfairDisplay_900Black,
} from "@expo-google-fonts/playfair-display";
import {
  SourceSans3_400Regular, SourceSans3_600SemiBold, SourceSans3_700Bold, SourceSans3_800ExtraBold,
} from "@expo-google-fonts/source-sans-3";
import { useGame } from "./src/store/useGame";
import { SetupScreen } from "./src/screens/SetupScreen";
import { GameScreen } from "./src/screens/GameScreen";
import { BG, INK3, SANS } from "./src/theme";

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_900Black,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_700Bold,
    SourceSans3_800ExtraBold,
  });
  const { game, restoring, hasSave, start, resume, abandon, act, quit } = useGame();

  if (!fontsLoaded || restoring) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: fontsLoaded ? SANS : undefined, fontSize: 12, color: INK3 }}>Setting the type…</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {game
        ? <GameScreen game={game} act={act} onQuit={quit} />
        : <SetupScreen onStart={start} hasSave={hasSave} onResume={resume} onAbandon={abandon} />}
    </>
  );
}
