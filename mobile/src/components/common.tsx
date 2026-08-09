import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle, TextStyle } from "react-native";
import { BlurView } from "expo-blur";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { COMPANIES } from "../engine";
import { BD2, INK, INK2, INK3, SANS, SANS_BLACK, SANS_BOLD, SERIF, money } from "../theme";

export function companyStyle(name: string) {
  return COMPANIES.find((c) => c.name === name) ?? COMPANIES[0]!;
}

/** Geometric marks for the six startups. */
export function Mark({ name, size, color }: { name: string; size: number; color: string }) {
  const p = { width: size, height: size, viewBox: "0 0 12 12" };
  switch (name) {
    case "Zap":
      return <Svg {...p}><Path d="M7 1 L3 7 H5.6 L5 11 L9 5 H6.4 Z" fill={color} /></Svg>;
    case "Flux":
      return <Svg {...p}><Path d="M1 8 C3 4,5 4,6 6 C7 8,9 8,11 4" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" /></Svg>;
    case "Spark":
      return <Svg {...p}><Path d="M6 1 L7 5 L11 6 L7 7 L6 11 L5 7 L1 6 L5 5 Z" fill={color} /></Svg>;
    case "Neon":
      return <Svg {...p}><Circle cx={6} cy={6} r={4.6} fill="none" stroke={color} strokeWidth={1.4} /><Circle cx={6} cy={6} r={2.4} fill="none" stroke={color} strokeWidth={1.2} /></Svg>;
    case "Pogo":
      return <Svg {...p}><Rect x={2.5} y={1.5} width={7} height={2} fill={color} /><Rect x={3.5} y={5} width={5} height={2} fill={color} opacity={0.75} /><Rect x={4.5} y={8.5} width={3} height={2} fill={color} opacity={0.5} /></Svg>;
    default: // Blink
      return <Svg {...p}><Circle cx={6} cy={6} r={4.6} fill="none" stroke={color} strokeWidth={1.6} /><Circle cx={6} cy={6} r={1.8} fill={color} /></Svg>;
  }
}

export function Wordmark({ name, size = 13, light = false }: { name: string; size?: number; light?: boolean }) {
  const cs = companyStyle(name);
  const color = light ? cs.tx : cs.ptx;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Mark name={name} size={size - 1} color={color} />
      <Text style={{ fontFamily: SANS_BLACK, fontSize: size, color }}>{name}</Text>
    </View>
  );
}

/** Cash that counts instead of jumping. */
export function CountUp({ value, style }: { value: number; style?: TextStyle | TextStyle[] }) {
  const [disp, setDisp] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current, to = value;
    prev.current = value;
    if (from === to) { setDisp(to); return; }
    const t0 = Date.now(), dur = 650;
    let raf: number;
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setDisp(Math.round(from + (to - from) * e));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <Text style={style}>{money(disp)}</Text>;
}

/** Thick-thin rule pair with a small-caps section label. Rules, never cards. */
export function SectionRule({ label, right }: { label: string; right?: string }) {
  return (
    <View style={{ marginTop: 16, marginBottom: 8 }}>
      <View style={{ borderTopWidth: 2.5, borderTopColor: INK }} />
      <View style={{ borderTopWidth: 1, borderTopColor: INK, marginTop: 2, marginBottom: 5 }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: SANS_BLACK, fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: INK }}>{label}</Text>
        {right ? <Text style={{ fontFamily: SANS, fontSize: 10, color: INK3 }}>{right}</Text> : null}
      </View>
    </View>
  );
}

/** Bordered ink rectangle in letterspaced caps — the broadsheet button. */
export function InkButton({ label, onPress, primary = false, disabled = false, style }: {
  label: string; onPress: () => void; primary?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{
        paddingVertical: 13, paddingHorizontal: 22, alignItems: "center",
        backgroundColor: primary ? INK : "transparent",
        borderWidth: primary ? 2 : 1, borderColor: disabled ? BD2 : primary ? INK : INK2,
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
      }, style]}
    >
      <Text style={{ fontFamily: SANS_BLACK, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: primary ? "#FAF6F0" : INK }}>{label}</Text>
    </Pressable>
  );
}

/** Small +/- stepper used in the settlement desk. */
export function Stepper({ value, onDelta, step = 1, color = INK, disabled = false }: { value: number; onDelta: (d: number) => void; step?: number; color?: string; disabled?: boolean }) {
  const btn = (label: string, d: number) => (
    <Pressable disabled={disabled} onPress={() => onDelta(d)} style={({ pressed }) => ({
      width: 34, height: 34, borderWidth: 1, borderColor: BD2, alignItems: "center", justifyContent: "center",
      backgroundColor: pressed && !disabled ? "#EFEAE2" : "#FFFFFF",
    })}>
      <Text style={{ fontFamily: SANS_BOLD, fontSize: 15, color: INK }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, opacity: disabled ? 0.35 : 1 }}>
      {btn(step > 1 ? `−${step}` : "−", -step)}
      <Text style={{ fontFamily: SANS_BLACK, fontSize: 17, minWidth: 24, textAlign: "center", color }}>{value}</Text>
      {btn(step > 1 ? `+${step}` : "+", step)}
    </View>
  );
}

/** Mount animation: letterpress stamp (scale overshoot + settle). */
export function StampIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, delay, useNativeDriver: true, speed: 22, bounciness: 9 }).start();
  }, [v, delay]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1.35, 1] }) }] }}>
      {children}
    </Animated.View>
  );
}

/** Mount animation: rise-and-fade-in, for editorial blocks. */
export function PressIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: ViewStyle }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay, useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}


/** Floating translucent masthead in the current iOS glass idiom. Pin with stickyHeaderIndices. */
export function GlassHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ paddingBottom: 8 }}>
      <BlurView
        intensity={45}
        tint="light"
        style={{ borderRadius: 12, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(26,23,21,0.18)" }}
      >
        <View style={{ backgroundColor: "rgba(250,246,240,0.55)", paddingVertical: 10, paddingHorizontal: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text style={{ fontFamily: SERIF, fontSize: 17, color: INK }}>{title}</Text>
          {right ?? null}
        </View>
      </BlurView>
    </View>
  );
}
