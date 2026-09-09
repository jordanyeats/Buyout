import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { ACCENT, BD, BG, GRN, INK, INK2, INK3, SANS, SANS_BLACK, SANS_SEMI, SERIF, money } from "../theme";
import { InkButton, LedgerPage, SectionRule } from "../components/common";
import { ACHIEVEMENTS, loadStats, summarize, type GameRecord, type Stats } from "../store/stats";
import { PACKS } from "../store/packs";
import {
  gcAlias, gcAuthenticate, gcAvailable, gcShowLeaderboards, gcSignedIn, onGameCenterChange,
} from "../store/gamecenter";

const KIND_LABEL: Record<string, string> = {
  random: "Casual", greedy: "Greedy", strategic: "Sharp", shark: "Shark",
};

const PACK_ROWS = [...PACKS.map((p) => ({ id: p.id as string, name: p.name })), { id: "none", name: "No deck" }];

/**
 * Which deck a recorded game was played with. Records written before packs
 * existed carry no pack; with cards on they were the full deck, which is what
 * Standard is.
 */
const deckOf = (r: GameRecord): string => (r.cards ? r.pack ?? "standard" : "none");

export function StatsScreen({ onExit }: { onExit: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [gc, setGc] = useState(gcSignedIn());
  useEffect(() => {
    loadStats().then(setStats);
  }, []);
  useEffect(() => onGameCenterChange(() => setGc(gcSignedIn())), []);
  const s = stats ? summarize(stats) : null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <LedgerPage title="The Record" right={<Text onPress={onExit} style={{ fontFamily: SANS, fontSize: 9, color: INK3, letterSpacing: 1.5, textTransform: "uppercase" }}>Back</Text>}>

        <SectionRule label="Leaderboards" />
        {gc ? (
          <View style={{ paddingVertical: 6 }}>
            <Text style={{ fontFamily: SANS_SEMI, fontSize: 12.5, color: GRN, marginBottom: 10 }}>
              ■ Signed in{gcAlias() ? ` as ${gcAlias()}` : ""} — Standard fortunes and honors post automatically.
            </Text>
            <InkButton label="View leaderboards" onPress={() => { void gcShowLeaderboards(); }} />
          </View>
        ) : (
          <View style={{ paddingVertical: 6 }}>
            <Text style={{ fontFamily: SANS, fontSize: 12, lineHeight: 18, color: INK2, marginBottom: 10 }}>
              {gcAvailable()
                ? "Sign in to post your best fortune and career wins to the global tables, and your honors as achievements."
                : "Game Center is unavailable in this build."}
            </Text>
            {gcAvailable() ? <InkButton label="Sign in to Game Center" onPress={() => gcAuthenticate()} /> : null}
          </View>
        )}

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

            <SectionRule label="By deck" />
            {PACK_ROWS.map(({ id, name }) => {
              const games = stats!.records.filter((r) => deckOf(r) === id);
              if (!games.length) return null;
              const wins = games.filter((r) => r.humanWon).length;
              const best = games.reduce((m, r) => Math.max(m, r.humanCash), 0);
              return (
                <View key={id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BD }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: SANS_SEMI, fontSize: 12.5, color: INK }}>{name}</Text>
                    {id === "standard" ? (
                      <Text style={{ fontFamily: SANS, fontSize: 10, color: INK3 }}>posts to the leaderboards</Text>
                    ) : id === "easy" || id === "custom" ? (
                      <Text style={{ fontFamily: SANS, fontSize: 10, color: INK3 }}>unranked — no honors</Text>
                    ) : null}
                  </View>
                  <Text style={{ fontFamily: SANS, fontSize: 12.5, color: INK2 }}>
                    {wins}/{games.length} won · best {money(best)}
                  </Text>
                </View>
              );
            })}

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
            <Text style={{ fontFamily: SANS, fontSize: 11, lineHeight: 17, color: INK3, paddingBottom: 6, fontStyle: "italic" }}>
              Earned on the Standard or Hard deck, or with the merger deck switched off. Easy and Custom decks are for experimenting.
            </Text>
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
      </LedgerPage>
    </View>
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
