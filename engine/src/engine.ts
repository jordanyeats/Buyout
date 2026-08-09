import {
  ANTITRUST_BLOCKS, BLOCKS_BY_PLAYERS, COLS, COMPANIES, EARNOUT_CASH, EARNOUT_SIZE, END_SIZE,
  FOUNDER_BLOCKS, GOLDEN_BLOCKS, HAND_SIZE, MAX_BUY, ROWS, SAFE_SIZE, START_CASH,
  CONVERT_FROM, CONVERT_TO, TAX_RATE,
} from "./constants.js";
import {
  SINGLE, adjacent, adjacentSingles, analyzePlacement, canPlay, companyTiles, connectedSingles, tileName,
} from "./board.js";
import { applyCardImmediate, buildDeck } from "./cards.js";
import { majorityMinority, payBonuses, priceOf } from "./pricing.js";
import { rngNext, shuffle } from "./rng.js";
import {
  EngineError,
  type Action, type CardDef, type GameState, type MergerDecision, type PlayerConfig, type Tile,
} from "./types.js";

// ---------------------------------------------------------------- new game

export function newGame(configs: PlayerConfig[], seed: number, useCards: boolean): GameState {
  if (configs.length < 2 || configs.length > 6) throw new EngineError("2-6 players required");
  const blocks = BLOCKS_BY_PLAYERS[configs.length] ?? 20;

  // Enforce unique player names (decisions are keyed by name).
  const seen = new Set<string>();
  const players = configs.map(({ name, kind }) => {
    let n = name.trim() || "Player";
    while (seen.has(n)) n = n + "'";
    seen.add(n);
    return { name: n, kind, cash: START_CASH, shares: {}, hand: [] as Tile[] };
  });

  const g: GameState = {
    seed,
    rngState: seed | 0,
    board: Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null)),
    destroyed: 0,
    cos: {},
    market: {},
    issued: {},
    players,
    pool: [],
    turn: 0,
    current: 0,
    phase: "place",
    over: false,
    winner: null,
    logs: [],
    useCards,
    deck: [],
    discard: [],
    founders: {},
    valR: {},
    partner: null,
    earnouts: [],
    pendingFound: null,
    mergerCtx: null,
    survivorChoice: null,
    pendingMerger: null,
    endTriggered: false,
  };

  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) g.pool.push([r, c]);
  shuffle(g, g.pool);
  for (const p of g.players)
    for (let i = 0; i < HAND_SIZE && g.pool.length; i++) p.hand.push(g.pool.pop()!);

  for (const c of COMPANIES) {
    g.cos[c.name] = { name: c.name, status: "inactive", size: 0 };
    g.market[c.name] = blocks;
    g.issued[c.name] = blocks;
  }
  if (useCards) {
    // Deck shuffled from an independent stream so tile order and deck order are decoupled.
    const deckRng = { rngState: rngNext(seed + 7777)[1] };
    g.deck = buildDeck(deckRng);
  }
  maybeSkipPlace(g);
  return g;
}

// ---------------------------------------------------------------- helpers

export function playableTiles(g: GameState, playerIdx: number): Tile[] {
  return g.players[playerIdx]!.hand.filter(([r, c]) => canPlay(g, r, c));
}

export function currentActor(g: GameState): number {
  if (g.phase === "mergerDecide" && g.mergerCtx?.decider != null) return g.mergerCtx.decider;
  return g.current;
}

function log(g: GameState, msg: string): void {
  g.logs.push(msg);
}

function flipToCompany(g: GameState, tile: Tile, co: string): void {
  const [r, c] = tile;
  g.board[r]![c] = co;
  for (const [ar, ac] of adjacentSingles(g.board, r, c))
    for (const [tr, tc] of connectedSingles(g.board, ar, ac)) g.board[tr]![tc] = co;
}

function refreshCompany(g: GameState, name: string): void {
  const co = g.cos[name]!;
  co.size = companyTiles(g.board, name).length;
  if (co.size >= SAFE_SIZE && co.status === "active") co.status = "safe";
  if (co.size >= END_SIZE) g.endTriggered = true;
}

function checkEarnouts(g: GameState): void {
  const fired: typeof g.earnouts = [];
  for (const e of g.earnouts) {
    const co = g.cos[e.company];
    if (co && co.status !== "inactive" && co.size >= EARNOUT_SIZE) {
      const p = g.players.find((pl) => pl.name === e.player);
      if (p) {
        p.cash += EARNOUT_CASH;
        log(g, `${e.player} earns $${EARNOUT_CASH.toLocaleString()} (earnout on ${e.company})`);
      }
      fired.push(e);
    }
  }
  g.earnouts = g.earnouts.filter((e) => !fired.includes(e));
}

/**
 * SOFT-LOCK FIX: at the start of any place phase, if the current player has no
 * playable tile, first try one discard+redraw (original behavior); if still
 * nothing playable (or the hand/pool are empty), skip straight to the buy phase.
 */
function maybeSkipPlace(g: GameState): void {
  if (g.phase !== "place" || g.over) return;
  const p = g.players[g.current]!;
  if (playableTiles(g, g.current).length > 0) return;
  if (p.hand.length > 0 && g.pool.length > 0) {
    for (const t of p.hand) g.pool.push(t);
    p.hand = [];
    shuffle(g, g.pool);
    while (p.hand.length < HAND_SIZE && g.pool.length) p.hand.push(g.pool.pop()!);
    log(g, `${p.name} redraws an unplayable hand`);
    if (playableTiles(g, g.current).length > 0) return;
  }
  log(g, `${p.name} has no playable tile — skipping to buy`);
  g.phase = "buy";
}

// ---------------------------------------------------------------- action entry

export function applyAction(state: GameState, action: Action): GameState {
  if (state.over) throw new EngineError("game is over");
  const g = structuredClone(state);
  switch (action.type) {
    case "place": return doPlace(g, action.tile);
    case "found": return doFound(g, action.company);
    case "chooseSurvivor": return doChooseSurvivor(g, action.company);
    case "acknowledge": return doAcknowledge(g);
    case "mergerDecision": return doMergerDecision(g, action.decision);
    case "buy": return doBuy(g, action.purchases);
    default: throw new EngineError("unknown action");
  }
}

// ---------------------------------------------------------------- place

function doPlace(g: GameState, tile: Tile): GameState {
  if (g.phase !== "place") throw new EngineError(`cannot place during ${g.phase}`);
  const p = g.players[g.current]!;
  const [r, c] = tile;
  if (!p.hand.some(([hr, hc]) => hr === r && hc === c)) throw new EngineError("tile not in hand");
  const res = analyzePlacement(g, r, c);
  if (res.type === "illegal") throw new EngineError("illegal placement");
  p.hand = p.hand.filter(([hr, hc]) => hr !== r || hc !== c);

  if (res.type === "none") {
    g.board[r]![c] = SINGLE;
    g.phase = "buy";
    log(g, `${p.name} placed at ${tileName(tile)}`);
  } else if (res.type === "expand") {
    flipToCompany(g, tile, res.co);
    refreshCompany(g, res.co);
    checkEarnouts(g);
    g.phase = "buy";
    log(g, `${res.co} expands to ${g.cos[res.co]!.size}`);
  } else if (res.type === "found") {
    g.board[r]![c] = SINGLE;
    g.pendingFound = { tile, conn: res.conn };
    g.phase = "found";
  } else {
    // merger
    const sizes = new Map(res.cos.map((n) => [n, g.cos[n]!.size]));
    const max = Math.max(...sizes.values());
    const tied = res.cos.filter((n) => sizes.get(n) === max);
    g.board[r]![c] = SINGLE; // seam stays neutral until the merger actually proceeds
    if (tied.length > 1) {
      g.survivorChoice = { tied, all: res.cos, seam: tile, fromPending: false };
      g.phase = "chooseSurvivor";
      log(g, `Merger tie: ${tied.join(", ")}`);
    } else {
      const surv = tied[0]!;
      // RULES FIX: a safe company can never be acquired. (Reachable when Earnings
      // Miss shrinks a safe company below an active one's size.)
      const defuncts = res.cos.filter((n) => n !== surv && g.cos[n]!.status !== "safe");
      if (defuncts.length === 0) {
        flipToCompany(g, tile, surv);
        refreshCompany(g, surv);
        checkEarnouts(g);
        g.phase = "buy";
        log(g, `${surv} expands to ${g.cos[surv]!.size} (protected companies cannot be acquired)`);
      } else {
        beginMerger(g, surv, defuncts, tile, p.name);
      }
    }
  }
  return g;
}

// ---------------------------------------------------------------- found

function doFound(g: GameState, coName: string): GameState {
  if (g.phase !== "found" || !g.pendingFound) throw new EngineError("no founding in progress");
  const co = g.cos[coName];
  if (!co || co.status !== "inactive") throw new EngineError(`${coName} cannot be founded`);
  const p = g.players[g.current]!;
  for (const [tr, tc] of g.pendingFound.conn) g.board[tr]![tc] = coName;
  co.status = "active";
  refreshCompany(g, coName);
  const grant = Math.min(FOUNDER_BLOCKS, g.market[coName] ?? 0);
  p.shares[coName] = (p.shares[coName] ?? 0) + grant;
  g.market[coName]! -= grant;
  g.founders[coName] = p.name;
  g.pendingFound = null;
  g.phase = "buy";
  log(g, `${p.name} founds ${coName} | ${grant} free blocks`);
  return g;
}

// ---------------------------------------------------------------- merger flow

/**
 * BUG FIX (Takeover Blocked corruption): the board is NOT flipped to the survivor
 * here. The seam tile sits as a neutral single until the card allows the merger
 * to proceed; on cancel it stays a single, on delay it becomes the pending seam.
 */
function beginMerger(
  g: GameState, surv: string, defuncts: string[], seam: Tile | null, triggeredBy: string,
): void {
  const sorted = [...defuncts].sort((a, b) => g.cos[b]!.size - g.cos[a]!.size);
  const card = g.useCards && seam !== null ? drawCard(g) : null; // pending resolutions draw no second card
  g.mergerCtx = {
    seam, surv, defuncts: sorted, di: 0, card, cardApplied: false,
    decider: null, decisions: {}, taxActive: false, halfPrice: false,
    triggeredBy, resultDetails: [], afterPhase: "buy",
  };
  g.phase = "mergerAnnounce";
  log(g, `Merger: ${surv} acquires ${sorted.join(", ")}`);
}

function drawCard(g: GameState): CardDef | null {
  if (!g.useCards || g.deck.length === 0) return null;
  const card = g.deck.shift()!;
  g.discard.push(card);
  return card;
}

function doChooseSurvivor(g: GameState, coName: string): GameState {
  if (g.phase !== "chooseSurvivor" || !g.survivorChoice) throw new EngineError("no survivor choice");
  const sc = g.survivorChoice;
  if (!sc.tied.includes(coName)) throw new EngineError(`${coName} is not among the tied companies`);
  const defuncts = sc.all.filter((n) => n !== coName && g.cos[n]!.status !== "safe");
  g.survivorChoice = null;
  if (defuncts.length === 0) {
    // All would-be defuncts are protected: merger degenerates to an expansion.
    flipToCompany(g, sc.seam, coName);
    refreshCompany(g, coName);
    checkEarnouts(g);
    g.pendingMerger = null;
    log(g, `${coName} expands (protected companies cannot be acquired)`);
    if (sc.fromPending) {
      g.phase = "place";
      maybeSkipPlace(g);
    } else {
      g.phase = "buy";
    }
    return g;
  }
  if (sc.fromPending) {
    g.pendingMerger = null;
    beginPendingResolution(g, coName, defuncts, sc.seam);
    if (!g.mergerCtx) {
      g.phase = "place";
      maybeSkipPlace(g);
    }
  } else {
    beginMerger(g, coName, defuncts, sc.seam, g.players[g.current]!.name);
  }
  return g;
}

function doAcknowledge(g: GameState): GameState {
  if (g.phase === "mergerAnnounce") return acknowledgeAnnounce(g);
  if (g.phase === "mergerResult") return acknowledgeResult(g);
  throw new EngineError(`nothing to acknowledge during ${g.phase}`);
}

function acknowledgeAnnounce(g: GameState): GameState {
  const ctx = g.mergerCtx!;
  const outcome = applyCardImmediate(g, ctx.card);
  if (outcome === "cancel") {
    // Seam tile remains a neutral single; chains stay separate. Turn ends immediately.
    log(g, `Takeover Blocked — merger cancelled`);
    g.mergerCtx = null;
    return endTurn(g);
  }
  if (outcome === "delay") {
    g.pendingMerger = {
      cos: [ctx.surv, ...ctx.defuncts],
      seam: ctx.seam!,
      roundsLeft: g.players.length,
      triggeredBy: ctx.triggeredBy,
    };
    log(g, `Regulatory Review — merger delayed one round`);
    g.mergerCtx = null;
    g.phase = "buy"; // the triggering player still buys; everyone gets a turn before resolution
    return g;
  }
  // proceed: now the seam flips to the survivor.
  if (ctx.seam) {
    flipToCompany(g, ctx.seam, ctx.surv);
    ctx.seam = null;
    refreshCompany(g, ctx.surv);
  }
  startDefunct(g);
  return g;
}

/** Pay bonuses for the current defunct, then route to holders' decisions. */
function startDefunct(g: GameState): void {
  const ctx = g.mergerCtx!;
  const dn = ctx.defuncts[ctx.di]!;
  payBonuses(g, dn, g.logs);
  ctx.decisions = {};
  const next = nextDecider(g, dn);
  if (next === null) {
    resolveDefunct(g);
  } else {
    ctx.decider = next;
    g.phase = "mergerDecide";
  }
}

function nextDecider(g: GameState, dn: string): number | null {
  const ctx = g.mergerCtx!;
  for (let i = 0; i < g.players.length; i++) {
    const idx = (g.current + i) % g.players.length;
    const p = g.players[idx]!;
    if ((p.shares[dn] ?? 0) > 0 && !(p.name in ctx.decisions)) return idx;
  }
  return null;
}

/** Remaining survivor blocks available for conversion, given decisions already submitted. */
export function convertCapacity(g: GameState): number {
  const ctx = g.mergerCtx;
  if (!ctx) return 0;
  let cap = g.market[ctx.surv] ?? 0;
  for (const d of Object.values(ctx.decisions)) cap -= (d.convert / CONVERT_FROM) * CONVERT_TO;
  return cap;
}

function doMergerDecision(g: GameState, dec: MergerDecision): GameState {
  if (g.phase !== "mergerDecide" || !g.mergerCtx || g.mergerCtx.decider == null)
    throw new EngineError("no merger decision pending");
  const ctx = g.mergerCtx;
  const p = g.players[ctx.decider!]!;
  const dn = ctx.defuncts[ctx.di]!;
  const held = p.shares[dn] ?? 0;

  // ENGINE-SIDE VALIDATION (the original trusted the UI):
  if (!Number.isInteger(dec.sell) || !Number.isInteger(dec.convert) || !Number.isInteger(dec.hold))
    throw new EngineError("decision must be integers");
  if (dec.sell < 0 || dec.convert < 0 || dec.hold < 0) throw new EngineError("negative decision");
  if (dec.sell + dec.convert + dec.hold !== held)
    throw new EngineError(`decision must account for all ${held} blocks`);
  if (dec.convert % CONVERT_FROM !== 0)
    throw new EngineError(`convert must be a multiple of ${CONVERT_FROM}`);
  const gain = (dec.convert / CONVERT_FROM) * CONVERT_TO;
  if (gain > convertCapacity(g))
    throw new EngineError("not enough survivor blocks available to convert");

  ctx.decisions[p.name] = dec;
  const next = nextDecider(g, dn);
  if (next === null) {
    resolveDefunct(g);
  } else {
    ctx.decider = next;
  }
  return g;
}

/**
 * Execute all decisions for the current defunct, flip its tiles, apply one-shot
 * card effects (first defunct only), and show the result.
 *
 * BUG FIX (free-share mint): the original computed converted-away blocks as
 * floor(gained/2)*3, so when only 1 survivor block was available a player
 * received it while giving up 0 defunct blocks. Validation now guarantees
 * gain is a whole number of complete 3:2 sets.
 */
function resolveDefunct(g: GameState): void {
  const ctx = g.mergerCtx!;
  const dn = ctx.defuncts[ctx.di]!;
  const sn = ctx.surv;
  const def = g.cos[dn]!;
  const fullPrice = priceOf(g, dn);
  const sellPrice = ctx.halfPrice ? Math.floor(fullPrice / 2) : fullPrice;
  const details: string[] = [];

  for (let i = 0; i < g.players.length; i++) {
    const p = g.players[(g.current + i) % g.players.length]!;
    const d = ctx.decisions[p.name];
    if (!d) continue;
    if (d.sell > 0) {
      let proceeds = d.sell * sellPrice;
      if (ctx.taxActive) {
        const tax = Math.floor(proceeds * TAX_RATE);
        proceeds -= tax;
        details.push(`${p.name} taxed $${tax.toLocaleString()}`);
      }
      p.shares[dn]! -= d.sell;
      if (p.shares[dn]! <= 0) delete p.shares[dn];
      p.cash += proceeds;
      g.market[dn] = (g.market[dn] ?? 0) + d.sell;
      details.push(`${p.name} sold ${d.sell} for $${proceeds.toLocaleString()}`);
    }
    if (d.convert > 0) {
      const gain = (d.convert / CONVERT_FROM) * CONVERT_TO;
      p.shares[dn]! -= d.convert;
      if (p.shares[dn]! <= 0) delete p.shares[dn];
      g.market[dn] = (g.market[dn] ?? 0) + d.convert;
      p.shares[sn] = (p.shares[sn] ?? 0) + gain;
      g.market[sn]! -= gain;
      details.push(`${p.name} converted ${d.convert} to ${gain} ${sn}`);
    }
    if (d.hold > 0) details.push(`${p.name} held ${d.hold}`);
  }

  // Flip the defunct's tiles into the survivor.
  for (const [r, c] of companyTiles(g.board, dn)) g.board[r]![c] = sn;
  def.status = "inactive";
  def.size = 0;
  delete g.valR[dn];
  if (g.partner && (g.partner[0] === dn || g.partner[1] === dn)) {
    log(g, `Partnership dissolved (${dn} acquired)`);
    g.partner = null;
  }
  g.earnouts = g.earnouts.filter((e) => e.company !== dn);
  refreshCompany(g, sn);

  // One-shot card effects, exactly once per merger event (original re-applied per defunct).
  if (!ctx.cardApplied && ctx.card) {
    ctx.cardApplied = true;
    if (ctx.card.id === "antitrust") {
      g.market[sn] = (g.market[sn] ?? 0) + ANTITRUST_BLOCKS;
      g.issued[sn] = (g.issued[sn] ?? 0) + ANTITRUST_BLOCKS;
      details.push(`${ANTITRUST_BLOCKS} ${sn} blocks released to market`);
    }
    if (ctx.card.id === "golden") {
      const founder = g.founders[dn];
      if (founder) {
        const fp = g.players.find((pl) => pl.name === founder);
        const grant = Math.min(GOLDEN_BLOCKS, g.market[sn] ?? 0);
        if (fp && grant > 0) {
          fp.shares[sn] = (fp.shares[sn] ?? 0) + grant;
          g.market[sn]! -= grant;
          details.push(`${founder} got ${grant} ${sn} blocks (golden parachute)`);
        }
      }
    }
  }
  delete g.founders[dn];

  checkEarnouts(g);
  log(g, `${sn} is now size ${g.cos[sn]!.size}`);
  ctx.resultDetails = details.length ? details : ["No shareholders"];
  ctx.decider = null;
  g.phase = "mergerResult";
}

function acknowledgeResult(g: GameState): GameState {
  const ctx = g.mergerCtx!;
  ctx.di += 1;
  // Tax/half-price apply to the whole merger event (documented change: the
  // original silently reset them after the first defunct).
  if (ctx.di < ctx.defuncts.length) {
    startDefunct(g);
  } else {
    const after = ctx.afterPhase;
    g.mergerCtx = null;
    if (after === "place") {
      g.phase = "place";
      maybeSkipPlace(g);
    } else {
      g.phase = "buy";
    }
  }
  return g;
}

// ---------------------------------------------------------------- pending (Regulatory Review)

/** Resolve a delayed merger. Sizes/survivor are recomputed at resolution time. */
function resolvePendingMerger(g: GameState): void {
  const pm = g.pendingMerger!;
  const alive = pm.cos.filter((n) => g.cos[n]!.status !== "inactive");
  if (alive.length < 2) {
    log(g, `Delayed merger cancelled — companies no longer eligible`);
    g.pendingMerger = null;
    return;
  }
  const max = Math.max(...alive.map((n) => g.cos[n]!.size));
  const tied = alive.filter((n) => g.cos[n]!.size === max);
  if (tied.length > 1) {
    g.survivorChoice = { tied, all: alive, seam: pm.seam, fromPending: true };
    g.phase = "chooseSurvivor";
    return;
  }
  const surv = tied[0]!;
  const defuncts = alive.filter((n) => n !== surv && g.cos[n]!.status !== "safe");
  g.pendingMerger = null;
  if (defuncts.length === 0) {
    // Everything acquirable went safe during the delay: the seam expands the survivor.
    claimSeam(g, pm.seam, surv);
    checkEarnouts(g);
    log(g, `Delayed merger cancelled — remaining companies are protected; ${surv} expands`);
    return;
  }
  beginPendingResolution(g, surv, defuncts, pm.seam);
}

/**
 * Flip a delayed merger's seam to the survivor — but only if it is still a
 * neutral single. During the delay round a neighboring expansion may have
 * legitimately absorbed the seam into some company; overwriting it then would
 * silently steal that company's tile (caught by simulation invariants).
 */
function claimSeam(g: GameState, seam: Tile, surv: string): void {
  if (g.board[seam[0]]![seam[1]] === SINGLE) flipToCompany(g, seam, surv);
  refreshCompany(g, surv);
}

/** True if any tile of `a` is orthogonally adjacent to a tile of `b`. */
function companiesTouch(g: GameState, a: string, b: string): boolean {
  for (const [r, c] of companyTiles(g.board, a))
    for (const [nr, nc] of adjacent(r, c)) if (g.board[nr]![nc] === b) return true;
  return false;
}

function beginPendingResolution(g: GameState, surv: string, defuncts: string[], seam: Tile): void {
  // No card is drawn for a delayed resolution (Regulatory Review was the card).
  claimSeam(g, seam, surv);
  // If a third company absorbed the seam during the delay, the merging companies
  // may no longer touch — acquiring a non-adjacent company would disconnect the
  // survivor. Such targets drop out of the deal.
  const touching = defuncts.filter((d) => companiesTouch(g, surv, d));
  if (touching.length === 0) {
    log(g, `Delayed merger falls through — ${surv} and its targets are no longer adjacent`);
    return;
  }
  if (touching.length < defuncts.length)
    log(g, `Delayed merger narrows — non-adjacent targets escape acquisition`);
  g.mergerCtx = {
    seam: null, surv, defuncts: [...touching].sort((a, b) => g.cos[b]!.size - g.cos[a]!.size),
    di: 0, card: null, cardApplied: true, decider: null, decisions: {},
    taxActive: false, halfPrice: false, triggeredBy: "regulatory resolution", resultDetails: [],
    afterPhase: "place",
  };
  g.phase = "mergerAnnounce";
  log(g, `Delayed merger resolves: ${surv} acquires ${touching.join(", ")}`);
}

// ---------------------------------------------------------------- buy + end turn

function doBuy(g: GameState, purchases: Record<string, number>): GameState {
  if (g.phase !== "buy") throw new EngineError(`cannot buy during ${g.phase}`);
  const p = g.players[g.current]!;
  let total = 0;
  let cost = 0;
  for (const [name, cnt] of Object.entries(purchases)) {
    if (cnt === 0) continue;
    if (!Number.isInteger(cnt) || cnt < 0) throw new EngineError("invalid purchase count");
    const co = g.cos[name];
    if (!co || co.status === "inactive") throw new EngineError(`${name} is not active`);
    if (cnt > (g.market[name] ?? 0)) throw new EngineError(`only ${g.market[name]} ${name} available`);
    total += cnt;
    cost += cnt * priceOf(g, name);
  }
  if (total > MAX_BUY) throw new EngineError(`max ${MAX_BUY} blocks per turn`);
  if (cost > p.cash) throw new EngineError("insufficient cash");
  for (const [name, cnt] of Object.entries(purchases)) {
    if (cnt <= 0) continue;
    p.cash -= cnt * priceOf(g, name);
    p.shares[name] = (p.shares[name] ?? 0) + cnt;
    g.market[name]! -= cnt;
    log(g, `${p.name} buys ${cnt} ${name}`);
  }
  return endTurn(g);
}

function endTurn(g: GameState): GameState {
  const p = g.players[g.current]!;
  while (p.hand.length < HAND_SIZE && g.pool.length) p.hand.push(g.pool.pop()!);

  // End conditions: size trigger, all-active-safe, or a dead board (no tile
  // anywhere can ever be legally placed again).
  const active = Object.values(g.cos).filter((c) => c.status !== "inactive");
  const allSafe = active.length > 0 && active.every((c) => c.status === "safe");
  const deadBoard =
    g.pool.length === 0 &&
    g.players.every((_, i) => playableTiles(g, i).length === 0);
  if (g.endTriggered || allSafe || deadBoard) return finalScoring(g);

  g.turn += 1;
  g.current = g.turn % g.players.length;

  if (g.pendingMerger) {
    g.pendingMerger.roundsLeft -= 1;
    if (g.pendingMerger.roundsLeft <= 0) {
      resolvePendingMerger(g);
      if (g.phase === "chooseSurvivor" || g.phase === "mergerAnnounce") return g;
    }
  }

  g.phase = "place";
  g.pendingFound = null;
  maybeSkipPlace(g);
  return g;
}

function finalScoring(g: GameState): GameState {
  log(g, "--- Final Scoring ---");
  for (const co of Object.values(g.cos).filter((c) => c.status !== "inactive"))
    payBonuses(g, co.name, g.logs);
  for (const p of g.players) {
    for (const [name, cnt] of Object.entries(p.shares)) {
      const co = g.cos[name]!;
      if (co.status !== "inactive") {
        const val = cnt * priceOf(g, name);
        p.cash += val;
        g.market[name] = (g.market[name] ?? 0) + cnt;
        log(g, `${p.name} liquidates ${cnt} ${name} for $${val.toLocaleString()}`);
      } else {
        // Worthless holdings in defunct companies return to the market at $0.
        g.market[name] = (g.market[name] ?? 0) + cnt;
      }
    }
    p.shares = {};
  }
  const ranked = [...g.players].sort((a, b) => b.cash - a.cash);
  g.winner = ranked[0]!.name;
  g.over = true;
  g.phase = "gameOver";
  log(g, `${g.winner} wins with $${ranked[0]!.cash.toLocaleString()}`);
  return g;
}

// ---------------------------------------------------------------- invariants (for tests & debug builds)

export function checkInvariants(g: GameState): string[] {
  const errs: string[] = [];
  let occupied = 0;
  const names = new Set(Object.keys(g.cos));
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const cell = g.board[r]![c] ?? null;
      if (cell !== null) occupied++;
      if (cell !== null && cell !== SINGLE && !names.has(cell)) errs.push(`unknown cell ${cell}`);
    }
  const inHands = g.players.reduce((s, p) => s + p.hand.length, 0);
  const totalTiles = g.pool.length + inHands + occupied + g.destroyed;
  if (totalTiles !== ROWS * COLS)
    errs.push(`tile conservation broken: ${totalTiles} != ${ROWS * COLS}`);

  for (const p of g.players) {
    if (p.cash < 0) errs.push(`${p.name} has negative cash`);
    for (const [n, s] of Object.entries(p.shares))
      if (s < 0 || !Number.isInteger(s)) errs.push(`${p.name} bad shares of ${n}: ${s}`);
  }

  for (const co of Object.values(g.cos)) {
    const held = g.players.reduce((s, p) => s + (p.shares[co.name] ?? 0), 0);
    const supply = (g.market[co.name] ?? 0) + held;
    if (supply !== g.issued[co.name])
      errs.push(`${co.name} supply ${supply} != issued ${g.issued[co.name]}`);
    const tiles = companyTiles(g.board, co.name);
    if (co.status === "inactive") {
      if (tiles.length !== 0) errs.push(`inactive ${co.name} has tiles on board`);
    } else {
      if (tiles.length !== co.size) errs.push(`${co.name} size ${co.size} != ${tiles.length} tiles`);
      if (co.size < 2) errs.push(`active ${co.name} smaller than 2`);
      if (!companyIsConnected(g, co.name)) errs.push(`${co.name} is disconnected`);
    }
  }
  if (g.over && g.phase !== "gameOver") errs.push("over but phase not gameOver");
  return errs;
}

function companyIsConnected(g: GameState, name: string): boolean {
  const tiles = companyTiles(g.board, name);
  if (tiles.length <= 1) return true;
  const set = new Set(tiles.map(([r, c]) => r + "," + c));
  const seen = new Set<string>();
  const q: Tile[] = [tiles[0]!];
  while (q.length) {
    const t = q.shift()!;
    const key = t[0] + "," + t[1];
    if (seen.has(key) || !set.has(key)) continue;
    seen.add(key);
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      q.push([t[0] + dr, t[1] + dc]);
    }
  }
  return seen.size === set.size;
}
