import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { CARD_DEFS, type PlayerConfig, type PlayerKind } from "../engine";
import { ACCENT, BD, BD2, BG, INK, INK2, INK3, SANS, SANS_BLACK, SANS_BOLD, SANS_SEMI, WARM } from "../theme";
import { InkButton, LedgerPage, PressIn } from "../components/common";

const KINDS: { kind: PlayerKind; label: string }[] = [
  { kind: "human", label: "Human" },
  { kind: "random", label: "AI · Casual" },
  { kind: "greedy", label: "AI · Greedy" },
  { kind: "strategic", label: "AI · Sharp" },
  { kind: "shark", label: "AI · Shark" },
];

export function SetupScreen({ onStart, onExit }: {
  onStart: (players: PlayerConfig[], cards: boolean, excludedCards: string[]) => void;
  onExit: () => void;
}) {
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { name: "You", kind: "human" },
    { name: "Stratton", kind: "strategic" },
    { name: "Gregor", kind: "greedy" },
    { name: "Rando", kind: "random" },
  ]);
  const [cards, setCards] = useState(true);
  const [showDeck, setShowDeck] = useState(false);
  const [excluded, setExcluded] = useState<string[]>([]);
  const toggleCard = (id: string) =>
    setExcluded(excluded.includes(id) ? excluded.filter((x) => x !== id) : [...excluded, id]);
  const update = (i: number, patch: Partial<PlayerConfig>) =>
    setPlayers(players.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <LedgerPage
        title="The New Game"
        right={<Text onPress={onExit} style={{ fontFamily: SANS, fontSize: 9, color: INK3, letterSpacing: 1.5, textTransform: "uppercase" }}>Back</Text>}
      >
        <PressIn>
          <Text style={{ fontFamily: SANS_BLACK, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: INK, marginTop: 10, marginBottom: 10 }}>Players</Text>
          {players.map((p, i) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TextInput
                  value={p.name}
                  onChangeText={(t) => update(i, { name: t })}
                  placeholder="Name"
                  placeholderTextColor={INK3}
                  style={{ flex: 1, borderWidth: 1.5, borderColor: BD2, backgroundColor: "#FFFFFF", paddingVertical: 9, paddingHorizontal: 12, fontFamily: SANS_SEMI, fontSize: 14, color: INK }}
                />
                {players.length > 2 ? (
                  <Pressable onPress={() => setPlayers(players.filter((_, j) => j !== i))} style={{ width: 38, height: 38, borderWidth: 1, borderColor: BD, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: SANS_BOLD, fontSize: 15, color: INK3 }}>×</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                {KINDS.map((k) => (
                  <Pressable key={k.kind} onPress={() => update(i, { kind: k.kind })} style={{
                    paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1,
                    borderColor: p.kind === k.kind ? INK : BD,
                    backgroundColor: p.kind === k.kind ? "#EFEAE2" : "transparent",
                  }}>
                    <Text style={{ fontFamily: SANS_SEMI, fontSize: 11, color: p.kind === k.kind ? INK : INK3 }}>{k.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <Pressable onPress={() => setCards(!cards)} style={{
            flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 12, padding: 12,
            backgroundColor: cards ? WARM : "transparent", borderWidth: 1, borderColor: cards ? ACCENT : BD,
          }}>
            <View style={{ width: 18, height: 18, borderWidth: 1.5, borderColor: INK, backgroundColor: cards ? INK : "transparent", alignItems: "center", justifyContent: "center" }}>
              {cards ? <Text style={{ color: BG, fontSize: 11, fontFamily: SANS_BOLD }}>✓</Text> : null}
            </View>
            <View>
              <Text style={{ fontFamily: SANS_BOLD, fontSize: 13, color: INK }}>Merger cards</Text>
              <Text style={{ fontFamily: SANS, fontSize: 10.5, color: INK3 }}>27-card deck drawn when deals close</Text>
            </View>
          </Pressable>

          {cards ? (
            <View style={{ marginBottom: 12 }}>
              <Pressable onPress={() => setShowDeck(!showDeck)}>
                <Text style={{ fontFamily: SANS_SEMI, fontSize: 11, color: INK3, letterSpacing: 1, textTransform: "uppercase" }}>
                  {showDeck ? "▾" : "▸"} Deck settings{excluded.length ? ` · ${excluded.length} removed` : ""}
                </Text>
              </Pressable>
              {showDeck ? (
                <View style={{ marginTop: 8, gap: 4 }}>
                  {CARD_DEFS.map((c) => {
                    const off = excluded.includes(c.id);
                    return (
                      <Pressable key={c.id} onPress={() => toggleCard(c.id)} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, opacity: off ? 0.4 : 1 }}>
                        <View style={{ width: 14, height: 14, borderWidth: 1.5, borderColor: INK, backgroundColor: off ? "transparent" : INK }} />
                        <Text style={{ fontFamily: SANS_SEMI, fontSize: 12, color: INK, flex: 1 }}>{c.name}</Text>
                        <Text style={{ fontFamily: SANS, fontSize: 10, color: INK3 }}>{c.dev ? "devastating" : c.cat}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 8 }}>
            {players.length < 6 ? (
              <InkButton label="+ Player" onPress={() => setPlayers([...players, { name: `P${players.length + 1}`, kind: "greedy" }])} style={{ flex: 1 }} />
            ) : null}
            <InkButton label="Start game" primary onPress={() => onStart(players, cards, excluded)} style={{ flex: 2 }} />
          </View>
        </PressIn>
        <View style={{ height: 40 }} />
      </LedgerPage>
    </View>
  );
}
