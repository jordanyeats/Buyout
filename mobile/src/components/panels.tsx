import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, Text, View } from "react-native";
import {
  CONVERT_FROM, CONVERT_TO, END_SIZE, MAJORITY_MULT, MAX_BUY, MINORITY_MULT, SAFE_SIZE, TAX_RATE, WARN_SIZE,
  canPlay, convertCapacity, currentActor, majorityMinority, priceOf,
  type Action, type GameState, type Tile,
} from "../engine";
import { ACCENT, BD, BD2, BG, GRN, IDENT, INK, INK2, INK3, PUR, RED, SANS, SANS_BLACK, SANS_BOLD, SANS_SEMI, SERIF, money, moneyTight } from "../theme";
import { CountUp, InkButton, PressIn, Stepper, Wordmark, companyStyle } from "./common";

const label = (t: Tile) => String.fromCharCode(65 + t[1]) + (t[0] + 1);

export function Ticker({ game }: { game: GameState }) {
  const last = game.logs[game.logs.length - 1];
  const nearEnd = Object.values(game.cos)
    .filter((c) => c.status !== "inactive" && c.size >= WARN_SIZE)
    .sort((a, b) => b.size - a.size)[0];
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BD }}>
        <View style={{ width: 5, height: 5, backgroundColor: ACCENT }} />
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: SANS, fontSize: 12, color: INK2 }}>{last ?? "The market opens."}</Text>
        <Text style={{ fontFamily: SANS_SEMI, fontSize: 10.5, color: INK2 }}>Turn {game.turn + 1} · {game.pool.length} tiles</Text>
      </View>
      {nearEnd ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: RED, backgroundColor: "#F9EFEF" }}>
          <Text style={{ fontFamily: SANS_BLACK, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: RED }}>■ Closing bell nears</Text>
          <Text style={{ flex: 1, fontFamily: SANS, fontSize: 11.5, color: INK }}>
            {nearEnd.name} at {nearEnd.size} — the game ends at {END_SIZE}
          </Text>
        </View>
      ) : null}
      <View style={{ marginBottom: 6 }} />
    </View>
  );
}

export function HandBar({ game, sel, onSelect }: { game: GameState; sel: Tile | null; onSelect: (t: Tile) => void }) {
  const humanIdx = game.players.findIndex((p) => p.kind === "human");
  if (humanIdx < 0 || game.phase !== "place" || game.current !== humanIdx) return null;
  // Display sorted A1..I9 (column letter, then row); engine order untouched.
  const hand = [...game.players[humanIdx]!.hand].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  // Rendered inside the "Your move" section (see ActionsPanel).
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", paddingVertical: 8, alignItems: "center" }}>
      {hand.map((t, i) => {
        const ok = canPlay(game, t[0], t[1]);
        const isSel = !!sel && sel[0] === t[0] && sel[1] === t[1];
        return (
          <Pressable key={i} disabled={!ok} onPress={() => onSelect(t)} style={{
            paddingVertical: 7, paddingHorizontal: 13,
            backgroundColor: isSel ? INK : "#FFFFFF",
            borderWidth: 1.5, borderColor: isSel ? INK : ok ? BD2 : BD,
            opacity: ok ? 1 : 0.45,
          }}>
            <Text style={{ fontFamily: SANS_BOLD, fontSize: 12.5, color: isSel ? "#FAF6F0" : ok ? INK : INK3 }}>{label(t)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CoBar({ game }: { game: GameState }) {
  const active = Object.values(game.cos).filter((c) => c.status !== "inactive");
  const [open, setOpen] = useState<string | null>(null);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", paddingVertical: 4 }}>
      {active.map((c) => {
        const cs = companyStyle(c.name);
        const safe = c.status === "safe";
        return (
          <Pressable
            key={c.name}
            onPress={() => setOpen(c.name)}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}: ${c.size} tiles, ${money(priceOf(game, c.name))} a share${safe ? ", safe from takeover" : ""}. Open details.`}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: 6,
              paddingVertical: 5, paddingHorizontal: 10,
              backgroundColor: cs.pill,
              borderWidth: safe ? 2 : 1, borderColor: safe ? INK : BD,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Wordmark name={c.name} size={11.5} />
            <Text style={{ fontFamily: SANS_SEMI, fontSize: 10.5, color: INK3 }}>
              {c.size} · {money(priceOf(game, c.name))}{safe ? " · SAFE" : ""}
            </Text>
          </Pressable>
        );
      })}
      <CompanySheet game={game} name={open} onClose={() => setOpen(null)} />
    </View>
  );
}

/** One labelled figure in the company sheet's stat grid. */
function Figure({ label, value, note, color = INK }: { label: string; value: string; note?: string; color?: string }) {
  return (
    <View style={{ flexBasis: "48%", flexGrow: 1, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: BD }}>
      <Text style={{ fontFamily: SANS_BLACK, fontSize: 8.5, letterSpacing: 1.6, textTransform: "uppercase", color: INK3 }}>{label}</Text>
      <Text style={{ fontFamily: SANS_BLACK, fontSize: 16, color, marginTop: 2, fontVariant: ["tabular-nums"] }}>{value}</Text>
      {note ? <Text style={{ fontFamily: SANS, fontSize: 10, color: INK3, marginTop: 1 }}>{note}</Text> : null}
    </View>
  );
}

/**
 * The prospectus: everything public about one company, on tap. Nothing here is
 * hidden information — it is all readable off the board and the ledger already,
 * just not in one place.
 */
export function CompanySheet({ game, name, onClose }: { game: GameState; name: string | null; onClose: () => void }) {
  if (!name) return null;
  const co = game.cos[name];
  if (!co) return null;

  const cs = companyStyle(name);
  const price = priceOf(game, name);
  const { maj, min } = majorityMinority(game, name);
  const human = game.players.find((p) => p.kind === "human");
  const mine = human?.shares[name] ?? 0;
  const inMarket = game.market[name] ?? 0;
  const issued = game.issued[name] ?? 0;
  const safe = co.status === "safe";
  const toSafe = Math.max(0, SAFE_SIZE - co.size);
  const toEnd = Math.max(0, END_SIZE - co.size);
  const names = (ps: typeof maj) => ps.map((p) => (p.kind === "human" ? "You" : p.name)).join(", ");

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(20,16,12,0.45)", justifyContent: "center", padding: 20 }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: BG, borderWidth: 2, borderColor: INK, maxHeight: "86%" }}>
          <View style={{ backgroundColor: cs.bg, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Wordmark name={name} size={19} light />
            <Text style={{ fontFamily: SERIF, fontSize: 11, color: cs.tx, marginTop: 3, opacity: 0.9 }}>{IDENT[name]?.tag ?? ""}</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 14 }}>
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 7,
              borderWidth: safe ? 2 : 1, borderColor: safe ? INK : BD2,
              paddingVertical: 6, paddingHorizontal: 9, marginBottom: 8,
            }}>
              <View style={{ width: 7, height: 7, backgroundColor: safe ? INK : ACCENT }} />
              <Text style={{ fontFamily: SANS_BLACK, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color: INK }}>
                {safe ? "Safe from takeover" : "Open to takeover"}
              </Text>
              <Text style={{ fontFamily: SANS, fontSize: 10.5, color: INK2, flex: 1, textAlign: "right" }}>
                {safe ? `passed ${SAFE_SIZE} tiles` : `${toSafe} more to reach ${SAFE_SIZE}`}
              </Text>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14 }}>
              <Figure label="Tiles on board" value={String(co.size)} note={toEnd > 0 ? `${toEnd} from ending the game at ${END_SIZE}` : "at the end threshold"} />
              <Figure label="Price a share" value={money(price)} />
              <Figure label="You hold" value={String(mine)} note={mine > 0 ? `worth ${money(mine * price)}` : "no position"} color={mine > 0 ? GRN : INK3} />
              <Figure label="Left in market" value={String(inMarket)} note={`of ${issued} issued`} />
            </View>

            <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: INK, marginTop: 14, marginBottom: 4 }}>
              Bonuses if it goes defunct now
            </Text>
            <View style={{ borderTopWidth: 1, borderTopColor: INK }}>
              <View style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BD }}>
                <Text style={{ flex: 1, fontFamily: SANS_SEMI, fontSize: 11.5, color: INK }}>Majority</Text>
                <Text style={{ flex: 1.4, fontFamily: SANS, fontSize: 11.5, color: INK2 }}>{maj.length ? names(maj) : "—"}</Text>
                <Text style={{ fontFamily: SANS_SEMI, fontSize: 11.5, color: GRN, fontVariant: ["tabular-nums"] }}>{money(price * MAJORITY_MULT)}</Text>
              </View>
              <View style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BD }}>
                <Text style={{ flex: 1, fontFamily: SANS_SEMI, fontSize: 11.5, color: INK }}>Minority</Text>
                <Text style={{ flex: 1.4, fontFamily: SANS, fontSize: 11.5, color: INK2 }}>{min.length ? names(min) : "—"}</Text>
                <Text style={{ fontFamily: SANS_SEMI, fontSize: 11.5, color: GRN, fontVariant: ["tabular-nums"] }}>{money(price * MINORITY_MULT)}</Text>
              </View>
            </View>
            <Text style={{ fontFamily: SANS, fontSize: 10.5, color: INK3, marginTop: 6 }}>
              {safe
                ? "Safe companies are never absorbed, so these pay only at final scoring."
                : "Paid whenever this company is absorbed in a merger, and again at final scoring."}
            </Text>

            <InkButton label="Close" onPress={onClose} style={{ marginTop: 16 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * A company crossing the safe line is a real turning point — it can never be
 * taken over again — but it is not worth a full page. A rule-and-caps banner
 * slides in over the board and retires itself.
 */
export function SafeBanner({ game }: { game: GameState }) {
  const [shown, setShown] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const v = useRef(new Animated.Value(0)).current;

  const safeNow = Object.values(game.cos).filter((c) => c.status === "safe").map((c) => c.name).sort().join(",");

  useEffect(() => {
    const names = safeNow ? safeNow.split(",") : [];
    // First render of a game (including a resumed save) seeds the baseline
    // rather than announcing everything that is already safe.
    if (seen.current === null) { seen.current = new Set(names); return; }
    const fresh = names.find((n) => !seen.current!.has(n));
    for (const n of names) seen.current.add(n);
    if (!fresh) return;
    setShown(fresh);
    v.setValue(0);
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(v, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setShown(null); });
  }, [safeNow, v]);

  if (!shown) return null;
  const cs = companyStyle(shown);
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
        borderTopWidth: 2.5, borderBottomWidth: 2.5, borderColor: INK,
        backgroundColor: cs.pill, paddingVertical: 8, paddingHorizontal: 12, marginTop: 6,
        flexDirection: "row", alignItems: "center", gap: 8,
      }}
    >
      <Wordmark name={shown} size={13} />
      <Text style={{ fontFamily: SANS_BLACK, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase", color: INK }}>
        is safe
      </Text>
      <Text style={{ flex: 1, textAlign: "right", fontFamily: SERIF, fontSize: 11, color: INK2 }}>
        {SAFE_SIZE} tiles — no longer a takeover target
      </Text>
    </Animated.View>
  );
}

export function Holdings({ game }: { game: GameState }) {
  const active = Object.values(game.cos).filter((c) => c.status !== "inactive");
  // Six companies is the ceiling this table was measured against: Cash and
  // Worth land at 51.7pt at phone width, and the widest thing they carry is
  // "$129,543" in the Worth cell's black weight at 48.6pt. A seventh column
  // takes its width from these two and drops them to 47.5pt, which truncates
  // that range — moneyTight only abbreviates above a million, so it does not
  // rescue it. If a seventh company is ever added, these go to 1.8.
  const cellW = { flex: 1 } as const;
  // Majority holders per company, computed once per render.
  const majOf: Record<string, Set<string>> = {};
  for (const c of active) majOf[c.name] = new Set(majorityMinority(game, c.name).maj.map((m) => m.name));
  return (
    <View>
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 4 }}>
        <Text style={[{ flex: 2 }, hstyle]}>Player</Text>
        <Text style={[{ flex: 1.6, textAlign: "right" }, hstyle]}>Cash</Text>
        {active.map((c) => <Text key={c.name} style={[cellW, hstyle, { textAlign: "center" }]}>{companyStyle(c.name).code}</Text>)}
        <Text style={[{ flex: 1.6, textAlign: "right" }, hstyle]}>Worth</Text>
      </View>
      {game.players.map((p, i) => {
        const worth = p.cash + active.reduce((s, c) => s + (p.shares[c.name] ?? 0) * priceOf(game, c.name), 0);
        const isTurn = i === game.current && !game.over;
        return (
          <View key={p.name} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BD }}>
            <View style={{ flex: 2 }}>
              <Text numberOfLines={1} style={{ fontFamily: isTurn ? SANS_BLACK : SANS_SEMI, fontSize: 12, color: isTurn ? INK : INK2, borderBottomWidth: isTurn ? 2 : 0, borderBottomColor: ACCENT, alignSelf: "flex-start" }}>
                {p.kind === "human" ? "You" : p.name}
              </Text>
              {p.kind !== "human" ? <Text style={{ fontFamily: SANS, fontSize: 8, color: INK3, marginTop: 1 }}>{p.kind}</Text> : null}
            </View>
            <CountUp value={p.cash} format={moneyTight} numberOfLines={1} style={{ flex: 1.6, textAlign: "right", fontFamily: SANS_SEMI, fontSize: 12, color: GRN, fontVariant: ["tabular-nums"] }} />
            {active.map((c) => {
              const s = p.shares[c.name] ?? 0;
              const cs = companyStyle(c.name);
              const isMaj = s > 0 && majOf[c.name]!.has(p.name);
              const isFounder = game.founders[c.name] === p.name;
              if (s > 0 && (isMaj || isFounder)) {
                return (
                  <View key={c.name} style={[cellW, { alignItems: "center" }]}>
                    <View style={{
                      minWidth: 20, height: 20, paddingHorizontal: 3,
                      alignItems: "center", justifyContent: "center",
                      backgroundColor: isMaj ? cs.bg : "transparent",
                      borderWidth: isMaj ? 0 : 1.5, borderColor: cs.bg,
                    }}>
                      <Text style={{ fontFamily: SANS_BLACK, fontSize: 11.5, color: isMaj ? cs.tx : cs.ptx }}>{s}</Text>
                    </View>
                  </View>
                );
              }
              return <Text key={c.name} style={[cellW, { textAlign: "center", fontFamily: s ? SANS_BLACK : SANS, fontSize: 12, color: s ? cs.ptx : BD2 }]}>{s || "–"}</Text>;
            })}
            <CountUp value={worth} format={moneyTight} numberOfLines={1} style={{ flex: 1.6, textAlign: "right", fontFamily: SANS_BLACK, fontSize: 12, color: INK, fontVariant: ["tabular-nums"] }} />
          </View>
        );
      })}
      <View style={{ flexDirection: "row", paddingTop: 4 }}>
        <Text style={[{ flex: 2 }, mstyle]}>Market</Text>
        <View style={{ flex: 1.6 }} />
        {active.map((c) => <Text key={c.name} style={[cellW, mstyle, { textAlign: "center" }]}>{game.market[c.name]}</Text>)}
        <View style={{ flex: 1.6 }} />
      </View>
      {active.length ? (
        <Text style={{ textAlign: "right", fontFamily: SANS, fontSize: 9.5, color: INK3, paddingTop: 3 }}>■ majority · ▢ founded</Text>
      ) : null}
      <DefunctHoldings game={game} />
    </View>
  );
}

/**
 * Certificates in companies that have been acquired. The engine leaves these in
 * hand — they are worthless unless the name is founded again — but every other
 * view filters on `status !== "inactive"`, so without this the player's own
 * position silently vanishes at the moment of the merger.
 */
function DefunctHoldings({ game }: { game: GameState }) {
  const defunct = Object.values(game.cos).filter((c) => c.status === "inactive");
  const rows = game.players
    .map((p) => ({
      player: p,
      held: defunct
        .map((c) => ({ name: c.name, n: p.shares[c.name] ?? 0 }))
        .filter((x) => x.n > 0),
    }))
    .filter((r) => r.held.length > 0);
  if (!rows.length) return null;
  return (
    <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: BD, paddingTop: 8 }}>
      <Text style={[hstyle, { color: INK3 }]}>In the drawer · acquired companies</Text>
      {rows.map(({ player, held }) => (
        <View key={player.name} style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, paddingVertical: 4 }}>
          <Text numberOfLines={1} style={{ fontFamily: SANS_SEMI, fontSize: 11.5, color: INK2, minWidth: 62 }}>
            {player.kind === "human" ? "You" : player.name}
          </Text>
          {held.map(({ name, n }) => (
            <View key={name} style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: BD2, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontFamily: SANS_BLACK, fontSize: 10, color: INK3 }}>{companyStyle(name).code}</Text>
              <Text style={{ fontFamily: SANS_BLACK, fontSize: 11, color: INK2 }}>{n}</Text>
            </View>
          ))}
        </View>
      ))}
      <Text style={{ fontFamily: SANS, fontSize: 9.5, lineHeight: 14, color: INK3, paddingTop: 4, fontStyle: "italic" }}>
        Worth nothing at close — unless the name is founded again.
      </Text>
    </View>
  );
}
const hstyle = { fontFamily: SANS_BLACK, fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase" as const, color: INK };
const mstyle = { fontFamily: SANS, fontSize: 10, color: INK3 };

/** The sell / convert / hold decision desk. */
export function SettlementPanel({ game, act }: { game: GameState; act: (a: Action) => void }) {
  const ctx = game.mergerCtx!;
  const decider = game.players[ctx.decider!]!;
  const dn = ctx.defuncts[ctx.di]!;
  const held = decider.shares[dn] ?? 0;
  const [sell, setSell] = useState(0);
  const [conv, setConv] = useState(0);
  const hold = held - sell - conv;
  const cap = convertCapacity(game);
  const maxConv = Math.min(Math.floor(held / CONVERT_FROM), Math.floor(cap / CONVERT_TO)) * CONVERT_FROM;
  const full = priceOf(game, dn);
  const sellPrice = ctx.halfPrice ? Math.floor(full / 2) : full;
  const survPrice = priceOf(game, ctx.surv);
  const gain = (conv / CONVERT_FROM) * CONVERT_TO;
  const gross = sell * sellPrice;
  const tax = ctx.taxActive ? Math.floor(gross * TAX_RATE) : 0;

  const setAll = (s: number, c: number) => { setSell(s); setConv(c); };
  const adjSell = (d: number) => { const n = Math.max(0, Math.min(held - conv, sell + d)); setSell(n); };
  const adjConv = (d: number) => { const n = Math.max(0, Math.min(maxConv, held - sell, conv + d)); setConv(Math.floor(n / CONVERT_FROM) * CONVERT_FROM); };

  const row = (title: string, sub: string, color: string, control: React.ReactNode, value: React.ReactNode, disabled = false) => (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BD, opacity: disabled ? 0.4 : 1 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: SANS_BOLD, fontSize: 13.5, color }}>{title}</Text>
        <Text style={{ fontFamily: SANS, fontSize: 10.5, color: INK3 }}>{sub}</Text>
      </View>
      {control}
      <View style={{ minWidth: 84, alignItems: "flex-end" }}>{value}</View>
    </View>
  );

  return (
    <PressIn>
      <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: INK3 }}>Settlement</Text>
      <Text style={{ fontFamily: SERIF, fontSize: 19, color: INK, marginTop: 1 }}>Your {dn} position</Text>
      <Text style={{ fontFamily: SANS, fontSize: 12.5, color: INK2, marginBottom: 10 }}>
        {held} shares at {money(sellPrice)} each{ctx.taxActive ? " · 30% tax on sales" : ""}
      </Text>
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 2 }}>
        <QuickBtn label="Sell all" active={sell === held} onPress={() => setAll(held, 0)} />
        <QuickBtn label="Convert all" active={conv > 0 && conv === maxConv} disabled={maxConv === 0} onPress={() => setAll(held - maxConv, maxConv)} />
        <QuickBtn label="Hold all" active={hold === held} onPress={() => setAll(0, 0)} />
      </View>
      {row("Sell", "cash now", GRN,
        <Stepper value={sell} onDelta={adjSell} />,
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontFamily: SANS_BOLD, fontSize: 13.5, color: GRN }}>{money(gross - tax)}</Text>
          {tax > 0 ? <Text style={{ fontFamily: SANS, fontSize: 9.5, color: RED }}>−{money(tax)} tax</Text> : null}
        </View>)}
      {row(`Convert ${CONVERT_FROM} : ${CONVERT_TO}`, maxConv > 0 ? `into ${ctx.surv} at ${money(survPrice)}` : "none available", maxConv > 0 ? companyStyle(ctx.surv).ptx : INK3,
        <Stepper value={conv} onDelta={adjConv} step={CONVERT_FROM} disabled={maxConv === 0} />,
        maxConv > 0
          ? <Text style={{ fontFamily: SANS_BOLD, fontSize: 13.5, color: companyStyle(ctx.surv).ptx }}>{gain} {ctx.surv}</Text>
          : <Text style={{ fontFamily: SANS_SEMI, fontSize: 13, color: INK3 }}>—</Text>,
        maxConv === 0)}
      {row("Hold", "bet on a comeback", PUR,
        <Text style={{ fontFamily: SANS_BLACK, fontSize: 17, minWidth: 24, textAlign: "center", color: hold > 0 ? PUR : INK3 }}>{hold}</Text>,
        <Text style={{ fontFamily: SANS_SEMI, fontSize: 13, color: INK3 }}>$0</Text>)}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 12 }}>
        <Text style={{ fontFamily: SANS_BLACK, fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase", color: INK3 }}>Total value</Text>
        <CountUp value={gross - tax + gain * survPrice} style={{ fontFamily: SANS_BLACK, fontSize: 19, color: INK }} />
      </View>
      <InkButton label="Confirm settlement" primary style={{ marginTop: 12 }}
        onPress={() => act({ type: "mergerDecision", decision: { sell, convert: conv, hold } })} />
    </PressIn>
  );
}

function QuickBtn({ label: l, active, onPress, disabled }: { label: string; active: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={{
      paddingVertical: 7, paddingHorizontal: 13, borderWidth: 1.5,
      borderColor: disabled ? BD : INK,
      backgroundColor: active ? INK : "transparent",
      opacity: disabled ? 0.35 : 1,
    }}>
      <Text style={{ fontFamily: SANS_BOLD, fontSize: 11.5, color: active ? "#FAF6F0" : disabled ? INK3 : INK }}>{l}</Text>
    </Pressable>
  );
}

/** Phase-dependent action area under "YOUR MOVE". */
export function ActionsPanel({ game, sel, act, onNewGame, onSelect }: {
  game: GameState; sel: Tile | null; act: (a: Action) => void; onNewGame: () => void; onSelect?: (t: Tile) => void;
}) {
  const actorIdx = currentActor(game);
  const actor = game.players[actorIdx]!;
  const isHuman = actor.kind === "human";

  if (game.phase === "gameOver") {
    const ranked = [...game.players].sort((a, b) => b.cash - a.cash);
    return (
      <PressIn style={{ alignItems: "center", paddingVertical: 18 }}>
        <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: INK3 }}>Final edition</Text>
        <Text style={{ fontFamily: SERIF, fontSize: 30, color: INK, marginVertical: 2 }}>
          {ranked[0]!.kind === "human" ? "You win" : `${ranked[0]!.name} wins`}
        </Text>
        <CountUp value={ranked[0]!.cash} style={{ fontFamily: SANS_BLACK, fontSize: 20, color: GRN }} />
        <View style={{ marginTop: 10, marginBottom: 6 }}>
          {ranked.slice(1).map((p, i) => (
            <Text key={p.name} style={{ fontFamily: SANS, fontSize: 12.5, color: INK2, textAlign: "center" }}>
              {i + 2}. {p.kind === "human" ? "You" : p.name} — {money(p.cash)}
            </Text>
          ))}
        </View>
        <InkButton label="New game" primary onPress={onNewGame} style={{ marginTop: 8, alignSelf: "stretch" }} />
      </PressIn>
    );
  }

  if (game.phase === "mergerDecide") {
    if (isHuman) return <SettlementPanel key={`${game.mergerCtx!.di}-${actorIdx}`} game={game} act={act} />;
    return <Waiting text={`${actor.name} weighs the offer…`} />;
  }
  // The opening seat is drawn, so the first move of a game is often a rival's.
  // Saying so once, on an empty board, is the difference between "the draw went
  // against me" and "why is it playing itself?".
  if (!isHuman) {
    const opening = game.board.every((row) => row.every((c) => c === null));
    return <Waiting text={opening ? `${actor.name} drew the opening seat…` : `${actor.name} studies the board…`} />;
  }

  if (game.phase === "place") {
    return (
      <View style={{ paddingVertical: 4 }}>
        {onSelect ? <HandBar game={game} sel={sel} onSelect={onSelect} /> : null}
        <View style={{ alignItems: "center", paddingVertical: 6 }}>
          {sel
            ? <InkButton label={`Place ${label(sel)}`} primary onPress={() => act({ type: "place", tile: sel })} style={{ alignSelf: "stretch" }} />
            : <Text style={{ fontFamily: SANS_SEMI, fontSize: 13, color: INK3 }}>Choose a tile from your hand</Text>}
        </View>
      </View>
    );
  }

  if (game.phase === "found") {
    const inactive = Object.values(game.cos).filter((c) => c.status === "inactive");
    return (
      <PressIn style={{ alignItems: "center", paddingVertical: 10 }}>
        <Text style={{ fontFamily: SANS_BLACK, fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: INK3 }}>Incorporation papers</Text>
        <Text style={{ fontFamily: SERIF, fontSize: 18, color: INK, marginBottom: 10 }}>Found a startup</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {inactive.map((c) => {
            const cs = companyStyle(c.name);
            return (
              <Pressable key={c.name} onPress={() => act({ type: "found", company: c.name })} style={{ backgroundColor: cs.bg, paddingVertical: 9, paddingHorizontal: 13 }}>
                <Text style={{ fontFamily: SANS_BLACK, fontSize: 13, color: cs.tx }}>{c.name}</Text>
                <Text style={{ fontFamily: SANS, fontSize: 9.5, color: cs.tx, opacity: 0.85 }}>{IDENT[c.name]?.tag}</Text>
              </Pressable>
            );
          })}
        </View>
      </PressIn>
    );
  }

  if (game.phase === "chooseSurvivor") {
    return (
      <PressIn style={{ alignItems: "center", paddingVertical: 10 }}>
        <Text style={{ fontFamily: SERIF, fontSize: 17, color: RED, marginBottom: 10 }}>Dead heat — choose the survivor</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {game.survivorChoice!.tied.map((n) => {
            const cs = companyStyle(n);
            return (
              <Pressable key={n} onPress={() => act({ type: "chooseSurvivor", company: n })} style={{ backgroundColor: cs.bg, paddingVertical: 10, paddingHorizontal: 16 }}>
                <Text style={{ fontFamily: SANS_BLACK, fontSize: 13, color: cs.tx }}>{n} ({game.cos[n]!.size})</Text>
              </Pressable>
            );
          })}
        </View>
      </PressIn>
    );
  }

  if (game.phase === "buy") {
    return <BuyPanel game={game} act={act} />;
  }
  return null;
}

function Waiting({ text }: { text: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 16 }}>
      <Text style={{ fontFamily: SANS, fontSize: 13, color: INK3 }}>{text}</Text>
    </View>
  );
}

function BuyPanel({ game, act }: { game: GameState; act: (a: Action) => void }) {
  const p = game.players[game.current]!;
  const [basket, setBasket] = useState<Record<string, number>>({});
  const listed = Object.values(game.cos)
    .filter((c) => c.status !== "inactive" && priceOf(game, c.name) > 0)
    .map((c) => ({ n: c.name, pr: priceOf(game, c.name), av: game.market[c.name] ?? 0 }));
  const anyBuyable = listed.some((b) => b.av > 0 && b.pr <= p.cash);
  const allSoldOut = listed.length > 0 && listed.every((b) => b.av === 0);
  const total = Object.values(basket).reduce((s, v) => s + v, 0);
  const cost = Object.entries(basket).reduce((s, [n, v]) => s + v * (listed.find((b) => b.n === n)?.pr ?? 0), 0);

  return (
    <PressIn>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <Text style={{ fontFamily: SERIF, fontSize: 18, color: INK }}>Buy shares</Text>
        <Text style={{ fontFamily: SANS, fontSize: 11.5, color: INK3 }}>{MAX_BUY - total} left · {money(p.cash - cost)}</Text>
      </View>
      {listed.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 8 }}>
          <Text style={{ fontFamily: SANS, fontSize: 12.5, color: INK3, marginBottom: 10 }}>Nothing on the market yet.</Text>
          <InkButton label="End turn" onPress={() => act({ type: "buy", purchases: {} })} style={{ alignSelf: "stretch" }} />
        </View>
      ) : (
        <>
          {!anyBuyable ? (
            <Text style={{ fontFamily: SANS, fontSize: 12, color: INK3, marginBottom: 8 }}>
              {allSoldOut ? "Every company is sold out." : "You can't afford any shares right now."}
            </Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
            {listed.map((b) => {
              const cs = companyStyle(b.n);
              const cnt = basket[b.n] ?? 0;
              const soldOut = b.av === 0;
              const affordable = b.pr <= p.cash - cost;
              const canMore = !soldOut && total < MAX_BUY && cnt < b.av && affordable;
              const dimmed = (soldOut || !affordable) && cnt === 0;
              return (
                <View key={b.n} style={{ backgroundColor: cs.pill, borderWidth: 1, borderColor: BD, padding: 10, minWidth: 108, opacity: dimmed ? 0.4 : 1 }}>
                  {soldOut ? (
                    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                      <View style={{ borderWidth: 1.5, borderColor: RED, paddingHorizontal: 6, paddingVertical: 2, transform: [{ rotate: "-8deg" }], backgroundColor: "rgba(250,246,240,0.85)" }}>
                        <Text style={{ fontFamily: SANS_BLACK, fontSize: 10, letterSpacing: 2, color: RED }}>SOLD OUT</Text>
                      </View>
                    </View>
                  ) : null}
                  <Wordmark name={b.n} size={12} />
                  <Text style={{ fontFamily: SANS, fontSize: 10.5, color: INK2, marginTop: 2 }}>{money(b.pr)} · {soldOut ? "—" : !affordable && cnt === 0 ? "too rich" : `${b.av} left`}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 }}>
                    <Pressable onPress={() => setBasket({ ...basket, [b.n]: Math.max(0, cnt - 1) })} style={sq(false)}>
                      <Text style={{ fontFamily: SANS_BOLD, fontSize: 14, color: INK }}>−</Text>
                    </Pressable>
                    <Text style={{ fontFamily: SANS_BLACK, fontSize: 15, minWidth: 16, textAlign: "center", color: INK }}>{cnt}</Text>
                    <Pressable disabled={!canMore} onPress={() => setBasket({ ...basket, [b.n]: cnt + 1 })} style={[sq(canMore), canMore ? { backgroundColor: cs.bg, borderColor: cs.bg } : null]}>
                      <Text style={{ fontFamily: SANS_BOLD, fontSize: 14, color: canMore ? cs.tx : BD2 }}>+</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {total > 0 ? <InkButton label={`Buy ${total} · ${money(cost)}`} primary onPress={() => act({ type: "buy", purchases: basket })} style={{ flex: 1 }} /> : null}
            <InkButton label={total > 0 ? "Skip" : "End turn"} onPress={() => act({ type: "buy", purchases: {} })} style={total > 0 ? undefined : { flex: 1 }} />
          </View>
        </>
      )}
    </PressIn>
  );
}
const sq = (on: boolean) => ({ width: 30, height: 30, borderWidth: 1, borderColor: BD2, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: "#FFFFFF", opacity: on ? 1 : 0.5 });
