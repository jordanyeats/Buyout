import React, { useEffect, useRef, useState } from "react";
import { Animated, SafeAreaView, ScrollView, Text, View } from "react-native";
import { ACCENT, BD, BG, GRN, INK, INK2, INK3, SANS, SANS_BLACK, SANS_SEMI, SERIF, money } from "../theme";
import { CollapsingBar, InkButton, Masthead, SectionRule } from "../components/common";
import { ACHIEVEMENTS, loadStats, summarize, type Stats } from "../store/stats";

const KIND_LABEL: Record<string, string> = {
  random: "Casual", greedy: "Greedy", strategic: "Sharp", shark: "Shark",
};

export function StatsScreen({ onExit }: { onExit: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    loadStats().then(setStats);
  }, []);
  const s = stats ? summarize(stats) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <CollapsingBar title="The Record" scrollY={scrollY} right={<Text onPress={onExit} style={{ fontFamily: SANS, fontSize: 9, color: INK3, letterSpacing: 1.5, textTransform: "uppercase" }}>Back</Text>} />
      <Animated.ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <Masthead title="The Record" right={<Text onPress={onExit} style={{ fontFamily: SANS, fontSize: 9, color: INK3, letterSpacing: 1.5, textTransform: "uppercase" }}>Back</Text>} />

        {s ? (
          <>
            <SectionRule label="Career" />
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
              <Stat label="Games" value={String(s.total)} />
              <Stat label="Wins" value={String(s.wins)} color={GRN} />
              <Stat label="Win rate" value={s.total ? Math.round((100 * s.wins) / s.total) + "%" : "—"} />
              <Stat label="Avg turns" value={s.total ? String(s.avgTurns) : "—"} />
            </View>
            <View style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: BD }}>
              <Text style={{ fontFamily: SANS, fontSize: 11, color: INK3 }}>Best finish</Text>
              <Text style={{ fontFamily: SANS_BLACK, fontSize: 22, color: INK }}>{s.best ? money(s.best) : "—"}</Text>
            </View>

            <SectionRule label="Versus the desks" />
            {Object.entries(s.byKind).length === 0 ? (
              <Text style={{ fontFamily: SANS, fontSize: 12, color: INK3, fontStyle: "italic", paddingVertical: 6 }}>No completed games yet.</Text>
            ) : (
              Object.entries(s.byKind).map(([kind, v]) => (
                <View key={kind} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BD }}>
                  <Text style={{ fontFamily: SANS_SEMI, fontSize: 12.5, color: INK }}>vs {KIND_LABEL[kind] ?? kind}</Text>
                  <Text style={{ fontFamily: SANS, fontSize: 12.5, color: INK2 }}>
                    {v.wins}/{v.games} won{v.games ? ` · ${Math.round((100 * v.wins) / v.games)}%` : ""}
                  </Text>
                </View>
              ))
            )}

            <SectionRule label="Honors" right={`${stats!.unlocked.length}/${ACHIEVEMENTS.length}`} />
            {ACHIEVEMENTS.map((a) => {
              const got = stats!.unlocked.includes(a.id);
              return (
                <View key={a.id} style={{ flexDirection: "row", gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: BD, opacity: got ? 1 : 0.45 }}>
                  <Text style={{ fontFamily: SANS_BLACK, fontSize: 13, color: got ? ACCENT : INK3, width: 16 }}>{got ? "■" : "□"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: SANS_BLACK, fontSize: 12.5, color: INK }}>{a.name}</Text>
                    <Text style={{ fontFamily: SANS, fontSize: 11, color: INK3 }}>{a.desc}</Text>
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          <Text style={{ fontFamily: SANS, fontSize: 12, color: INK3, paddingVertical: 20 }}>Opening the ledger…</Text>
        )}
        <View style={{ height: 24 }} />
        <InkButton label="Back to the desk" onPress={onExit} />
        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color = INK }: { label: string; value: string; color?: string }) {
  return (
    <View>
      <Text style={{ fontFamily: SANS, fontSize: 10.5, color: INK3 }}>{label}</Text>
      <Text style={{ fontFamily: SANS_BLACK, fontSize: 20, color }}>{value}</Text>
    </View>
  );
}
