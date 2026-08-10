import type { CardDef } from "./types.js";

export const ROWS = 9;
export const COLS = 9;
export const SAFE_SIZE = 25;
export const END_SIZE = 35;
export const START_CASH = 100_000;
export const HAND_SIZE = 4;
export const MAX_BUY = 3;
export const FOUNDER_BLOCKS = 1;
export const PRICE_BASE = 5000;
export const PRICE_RATE = 1.15;
export const PRICE_CAP = 100_000;
export const MAJORITY_MULT = 10;
export const MINORITY_MULT = 5;
export const CONVERT_FROM = 3; // give 3 defunct blocks...
export const CONVERT_TO = 2; // ...receive 2 survivor blocks
export const SHARES_PER_BLOCK = 1000;
export const TAX_RATE = 0.3;
export const CLEAN_CARD_CASH = 5000;
export const VC_CASH = 25_000;
export const ACTIVIST_CASH = 15_000;
export const ACTIVIST_THRESHOLD = 50_000;
export const EARNOUT_SIZE = 20;
export const EARNOUT_CASH = 50_000;
export const EARNINGS_MISS_TILES = 3;
export const VALRESET_OFFSET = -3;
export const SECONDARY_BLOCKS = 4;
export const ANTITRUST_BLOCKS = 3;
export const GOLDEN_BLOCKS = 2;
export const IPO_MULT = 3;

/** Blocks issued per company by player count. */
export const BLOCKS_BY_PLAYERS: Record<number, number> = { 2: 15, 3: 18, 4: 20, 5: 23, 6: 25 };

export interface CompanyStyle {
  name: string;
  code: string;
  bg: string;
  tx: string;
  pill: string;
  ptx: string;
}

export const COMPANIES: CompanyStyle[] = [
  { name: "Blink", code: "BL", bg: "#0E6E7C", tx: "#C4E8ED", pill: "#E6F4F6", ptx: "#0A5560" },
  { name: "Zap", code: "ZP", bg: "#8B6914", tx: "#F5E6C0", pill: "#FBF3E0", ptx: "#6B4F0E" },
  { name: "Flux", code: "FX", bg: "#7B2D8E", tx: "#E8CFF0", pill: "#F4E8F8", ptx: "#5C1D6C" },
  { name: "Spark", code: "SK", bg: "#9B2335", tx: "#F5CDD3", pill: "#FAE6E9", ptx: "#7A1A2A" },
  { name: "Neon", code: "NE", bg: "#1B6B3A", tx: "#C5E8D3", pill: "#E4F5EB", ptx: "#14522D" },
  { name: "Pogo", code: "PG", bg: "#3D3D99", tx: "#CDCDF5", pill: "#EAEAFB", ptx: "#2D2D75" },
];

export const CARD_DEFS: CardDef[] = [
  { id: "regulatory", cat: "blocker", name: "Regulatory Review", desc: "Merger delayed one full round. Everyone may trade first.", flav: "The FTC has questions.", dev: false },
  { id: "antitrust", cat: "blocker", name: "Antitrust Ruling", desc: "Survivor releases 3 shares to market.", flav: "Approved with conditions.", dev: false },
  { id: "blocked", cat: "blocker", name: "Takeover Blocked", desc: "Merger CANCELLED. Turn ends immediately.", flav: "The board has voted no.", dev: true },
  { id: "duedil", cat: "blocker", name: "Due Diligence Failure", desc: "Defunct valued at HALF for sells.", flav: "Irregularities discovered.", dev: false },
  { id: "vc", cat: "windfall", name: "VC Injection", desc: "Every player receives $25,000.", flav: "Capital flows into the sector.", dev: false },
  { id: "ipo", cat: "windfall", name: "IPO Bonus", desc: "The dealmaker receives defunct price ×3 in cash.", flav: "Markets reward the dealmaker.", dev: false },
  { id: "tax", cat: "windfall", name: "Liquidation Tax", desc: "30% tax on all sell proceeds this merger.", flav: "Emergency legislation.", dev: true },
  { id: "golden", cat: "windfall", name: "Golden Parachute", desc: "Founder gets 2 free survivor shares.", flav: "Protection was negotiated.", dev: false },
  { id: "earnings", cat: "market", name: "Earnings Miss", desc: "The dealmaker's least-held company loses 3 tiles.", flav: "Quarterly results disappoint.", dev: false },
  { id: "partner", cat: "market", name: "Strategic Partnership", desc: "Two smallest companies price together at the larger's value.", flav: "A strategic alliance.", dev: false },
  { id: "valreset", cat: "market", name: "Valuation Reset", desc: "A company's price drops permanently.", flav: "Analysts downgrade.", dev: false },
  { id: "secondary", cat: "market", name: "Secondary Offering", desc: "4 new shares issued for a company.", flav: "New shares issued.", dev: false },
  { id: "talent", cat: "hostile", name: "Talent Raid", desc: "A rival sells 1 share of a company the dealmaker also holds.", flav: "Key people poached.", dev: false },
  { id: "activist", cat: "hostile", name: "Activist Campaign", desc: "The majority holder pays $15K or gives the dealmaker 1 share.", flav: "An activist demands change.", dev: false },
  { id: "earnout", cat: "hostile", name: "Earnout Agreement", desc: "If the survivor hits size 20, the dealmaker gets $50K.", flav: "Performance milestones.", dev: false },
];

export const CLEAN_FLAVORS = ["Deal closes smoothly.", "Investors respond well.", "Textbook acquisition."];
export const CLEAN_COUNT = 12;
