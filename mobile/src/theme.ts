// The Buyout Ledger — broadsheet theme (v3 design language)
export const BG = "#FAF6F0";
export const CARD = "#FFFFFF";
export const INK = "#1A1715";
export const INK2 = "#6B6560";
export const INK3 = "#9E9790";
export const BD = "#E8E2DA";
export const BD2 = "#D4CEC4";
export const ACCENT = "#8B6914";
export const GRN = "#1B6B3A";
export const RED = "#9B2335";
export const PUR = "#3D3D99";
export const WARM = "#F5F0E8";

export const SERIF = "PlayfairDisplay_900Black";
export const SERIF_BOLD = "PlayfairDisplay_700Bold";
export const SERIF_ITALIC = "PlayfairDisplay_700Bold_Italic";
export const SANS = "SourceSans3_400Regular";
export const SANS_SEMI = "SourceSans3_600SemiBold";
export const SANS_BOLD = "SourceSans3_700Bold";
export const SANS_BLACK = "SourceSans3_800ExtraBold";

export const money = (n: number) => "$" + n.toLocaleString("en-US");

export interface CompanyIdentity {
  tag: string;
}
export const IDENT: Record<string, CompanyIdentity> = {
  Blink: { tag: "Attention, delivered." },
  Zap: { tag: "Payments at light speed." },
  Flux: { tag: "The everything pipeline." },
  Spark: { tag: "Ideas that ignite." },
  Neon: { tag: "Nightlife, organized." },
  Pogo: { tag: "Bounce-back logistics." },
  Vault: { tag: "Nothing ever leaves." },
};
