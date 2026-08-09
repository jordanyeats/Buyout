export type Tile = readonly [number, number];

/** Board cell: null = empty (or destroyed), "*" = unincorporated single tile, else company name. */
export type Cell = string | null;

export type CompanyStatus = "inactive" | "active" | "safe";
export type PlayerKind = "human" | "random" | "greedy" | "strategic" | "shark";

export interface Company {
  name: string;
  status: CompanyStatus;
  size: number;
}

export interface Player {
  name: string;
  kind: PlayerKind;
  cash: number;
  shares: Record<string, number>;
  hand: Tile[];
}

export interface CardDef {
  id: string;
  cat: "blocker" | "windfall" | "market" | "hostile" | "clean";
  name: string;
  desc: string;
  flav: string;
  dev: boolean; // devastating
}

export type Phase =
  | "place"
  | "found"
  | "chooseSurvivor"
  | "mergerAnnounce"
  | "mergerDecide"
  | "mergerResult"
  | "buy"
  | "gameOver";

export interface MergerDecision {
  sell: number;
  convert: number; // defunct blocks converted, must be multiple of CONVERT_FROM
  hold: number;
}

export interface MergerCtx {
  /** Seam tile still to be flipped to survivor (null once flipped or when resolving a pending merger). */
  seam: Tile | null;
  surv: string;
  defuncts: string[];
  di: number;
  card: CardDef | null;
  /** Card one-shot effects (antitrust, golden) applied only on first defunct resolution. */
  cardApplied: boolean;
  decider: number | null;
  decisions: Record<string, MergerDecision>;
  taxActive: boolean;
  halfPrice: boolean;
  triggeredBy: string;
  resultDetails: string[];
  /** Phase to enter after the whole merger event completes. Delayed (pending) resolutions happen before the current player's place phase. */
  afterPhase: "buy" | "place";
}

export interface SurvivorChoice {
  tied: string[];
  all: string[];
  seam: Tile;
  /** True when this choice arises from a delayed (Regulatory Review) merger resolving. */
  fromPending: boolean;
}

export interface PendingMerger {
  cos: string[];
  seam: Tile;
  /** Decrements at each end of turn; resolves when it reaches 0. */
  roundsLeft: number;
  triggeredBy: string;
}

export interface GameOptions {
  /** Card ids removed from the deck at game creation (deck settings). */
  excludedCards?: string[];
}

export interface GameState {
  seed: number;
  rngState: number;
  board: Cell[][];
  /** Tiles permanently removed from play (Earnings Miss). Conservation: pool+hands+boardOccupied+destroyed = R*C. */
  destroyed: number;
  cos: Record<string, Company>;
  market: Record<string, number>;
  /** Total blocks ever issued per company (cards can mint). Invariant: market[c]+Σshares[c] = issued[c]. */
  issued: Record<string, number>;
  players: Player[];
  pool: Tile[];
  turn: number;
  current: number;
  phase: Phase;
  over: boolean;
  winner: string | null;
  logs: string[];
  useCards: boolean;
  deck: CardDef[];
  discard: CardDef[];
  founders: Record<string, string>;
  /** Permanent size-offset per company from Valuation Reset. */
  valR: Record<string, number>;
  /** Strategic Partnership: both price at the higher effective size until either goes defunct. */
  partner: [string, string] | null;
  earnouts: { player: string; company: string }[];
  pendingFound: { tile: Tile; conn: Tile[] } | null;
  mergerCtx: MergerCtx | null;
  survivorChoice: SurvivorChoice | null;
  pendingMerger: PendingMerger | null;
  endTriggered: boolean;
  /** Why the game ended (set at final scoring). */
  endReason?: string;
  /** Options the game was created with (needed for exact replay). */
  options: GameOptions;
}

export type Action =
  | { type: "place"; tile: Tile }
  | { type: "found"; company: string }
  | { type: "chooseSurvivor"; company: string }
  | { type: "acknowledge" }
  | { type: "mergerDecision"; decision: MergerDecision }
  | { type: "buy"; purchases: Record<string, number> };

export interface PlayerConfig {
  name: string;
  kind: PlayerKind;
}

export class EngineError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "EngineError";
  }
}
