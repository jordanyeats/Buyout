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

/**
 * Money for narrow table cells. The Holdings columns are flex-sized against up
 * to six company columns, so a seven-figure fortune wrapped its last digits
 * onto a second line.
 *
 * Four significant digits, always: "$1.234M", "$12.35M", "$123.5M" are all
 * seven characters, so the column holds one width at every scale. Four is the
 * figure that matters — games are routinely decided by a few thousand dollars,
 * and at two decimals a $6,000 margin would round away to nothing on the one
 * screen where the player is counting it. Below a million nothing changes.
 */
export const moneyTight = (n: number): string => {
  const a = Math.abs(n);
  if (a < 1_000_000) return money(n);
  const sign = n < 0 ? "−" : "";
  const [div, suffix] = a < 1_000_000_000 ? [1_000_000, "M"] : [1_000_000_000, "B"];
  const v = a / div;
  return `${sign}$${v.toFixed(v < 10 ? 3 : v < 100 ? 2 : 1)}${suffix}`;
};

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
