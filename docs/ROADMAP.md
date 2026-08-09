# Buyout → iOS: Assessment & Roadmap

*Reviewed: `jordanyeats/Buyout` @ `63dddf9` — one 531-line `index.html` containing the full v1.4 engine, 3 AI tiers, 27-card merger deck, and mobile-first React UI.*

---

## 1. What you have (honest read)

This is a strong prototype, and the parts that are hardest to get right are the parts you already have:

- **The engine is nearly pure.** Every transition (`doPlace`, `doFound`, `doBuy`, `exDec`…) takes a state object and returns a new one. No DOM access inside game logic. That's exactly the architecture a port needs — this was either good instinct or good luck, and either way it saves you weeks.
- **Seeded RNG** (`mkR`) for tile shuffles means games are *almost* reproducible (see bug #5).
- **The "Paper + Ink" aesthetic is a real identity.** Playfair Display + parchment + jewel tones reads premium and doesn't look like any other digital board game. Keep it; it's your best asset besides the merger deck.
- **The merger card deck is your game.** It's the wholly-original layer on top of a classic economic core, and it matters for both fun *and* legal differentiation (see §3).

What it is *not* yet: shippable. Babel compiles in the browser on every load, React comes from a CDN, there is no save system, no tutorial, and the engine has real bugs.

---

## 2. Engine bugs (all verified against the code)

| # | Bug | Detail |
|---|-----|--------|
| 1 | **Three dead cards** | `Regulatory Review` has no handler in `appCard` (falls through to "proceed" — the "merger delayed one round" never happens). `Valuation Reset` writes `g.valR` but `sp()` never reads it — prices never drop. `Strategic Partnership` sets `g.partner` and nothing ever reads it. 3 of your 15 unique effects are no-ops. |
| 2 | **Earnings Miss can split a company** | It deletes up to 3 edge tiles with no connectivity check. `coT()` counts tiles by name, not adjacency, so a "company" can become two disconnected islands that still price as one. |
| 3 | **Takeover Blocked leaves a corrupted board** | In `doPlace`, the placed tile and adjacent unincorporated tiles are flipped to the survivor *before* the card is drawn. When `blocked` cancels, that growth sticks, and the two chains sit permanently adjacent — touching but unmerged, which the rules have no concept of. |
| 4 | **Human soft-lock** | `doEnd` redraws a hand only when `hd.length > 0`. If pool and hand are both empty, the human sits at "Place a tile" with no tiles and no skip button. The AI path handles `null`; the human path doesn't. |
| 5 | **Determinism is broken where it counts** | Shuffles are seeded, but `aiTile`, `aiBuy`, AI survivor tie-breaks, and AI founding all use `Math.random()`. Full determinism (seed → identical game) is what makes replays, regression tests, and future async multiplayer nearly free. Route everything through the seeded RNG. |
| 6 | **Engine trusts the UI** | `doBuy` doesn't validate cash, the 3-block limit, or market availability — the UI enforces it. Fine offline; a hole the moment anything networked exists. Validation belongs in the engine. |
| 7 | **Board doesn't fit an iPhone** | At 38px cells, column I clips off a 390pt screen (see `game_early.png`). A scrolling game board is a non-starter on phone — cells must size to fit-width. |
| 8 | Cosmetic | Holdings table shows "You You" (name + type label). End-game lacks Acquire-style secondary end conditions (all chains safe / tiles exhausted), so games can theoretically drag past the fun. |

None of these are hard fixes. All of them must precede any port, because you want to port a *correct* engine once, not debug the same bug in two languages.

---

## 3. The Hasbro question

**I'm not a lawyer and this isn't legal advice — spend a few hundred dollars on an IP attorney consult before launch.** That said, here's the factual landscape:

**What's on your side.** US copyright does not protect game rules or mechanics — only their specific *expression* (rule text, art, names, theme). Trademark protects the name ACQUIRE and its trade dress. You are using none of it: different name, tech-startup theme instead of hotels, original company names, original card deck, and materially different parameters (9×9 vs 9×12, six companies vs seven, 3:2 conversion vs 2:1, founder's two blocks, price cap, $100K start). The merger deck in particular changes how the game actually plays. There is a long commercial tradition of games built on the tile-place/invest/merge core.

**What to be careful about:**

1. **Never say "Acquire" in public materials.** Not in the App Store name, subtitle, keywords, description, screenshots, press kit, or your website. "A modern take on the classic merger game" is fine; naming the trademark is how you invite a letter. (You said "modernizing Acquire" to me — that phrase must never appear in marketing.)
2. **Watch the README and commit history.** Your current README is clean — keep it that way. If old commits or issues reference Acquire, consider whether the repo should be private before launch anyway (shipping a paid app with the full source public is its own decision).
3. **Hasbro actively publishes Acquire** — this is not an abandoned property, so don't assume nobody's watching the category.
4. **Diverge further where it's cheap.** Every parameter you move away from Acquire's exact values, and every original mechanic (the deck) strengthens "this is its own game." The safe-company threshold (25) and end trigger (35) already differ; good.
5. **Screen your own name too.** Check "Buyout" on the App Store and a basic trademark search — you don't want to solve the Hasbro problem and land on someone else's mark.
6. **Document independence.** Keep design notes showing your own iteration (your v1.4 constants, card balancing). Cheap insurance.

**Bottom line:** re-themed mechanics with original expression is the standard, well-trodden path. Your exposure is mostly self-inflicted marketing language. Control that, get one attorney consult, and this is a manageable risk — but that consult is a real line item, not a formality, because Hasbro is litigious about its classic-game portfolio.

---

## 4. Technical path

**Step zero, regardless of path: extract the engine.**

Pull the ~250 lines of game logic into a standalone TypeScript package (`buyout-engine`): typed state, typed actions, `applyAction(state, action) → state`, seeded RNG for *everything*, engine-side validation, and a serious test suite. The merger edge cases (multi-way mergers, ties, hold-and-refound, 3:2 rounding, tax × half-price stacking, every card × every phase) are exactly where board game apps get 1-star reviews from rules experts. Property-based tests + full-game simulations (thousands of seeded AI games checking invariants: cash never negative, blocks conserved, board connectivity) are cheap once deterministic.

Then three options:

| Path | Time to good | Ceiling | Notes |
|------|-------------|---------|-------|
| **A. SwiftUI native** (port engine to Swift) | Slowest | Highest | True 120Hz feel, haptics, Game Center, StoreKit, widgets, App Intents. Engine is ~600 lines — a focused week to port + your test suite ported as the correctness oracle. |
| **B. React Native / Expo** (keep TS engine) | Medium | High | You clearly know React. Engine stays in TS forever (also powers a future web/Android version). 90% of native polish with real effort on animation. |
| **C. Capacitor / WKWebView wrap** | Days | Low | Fastest, but "super polished" is out of reach, and thin web wrappers risk App Review guideline 4.2 (minimum functionality) friction. |

**My recommendation: B — Expo/React Native.** Reasoning: you're one person, you already think in React, the game is UI-light (no physics, no 3D), and keeping the engine in TypeScript preserves your web version and future Android/online play from one codebase. Path A is the right answer only if you want to *learn* Swift as part of the goal. Path C can't hit "super polished," which is the brief.

(If you choose A, the extraction work isn't wasted — the TS test suite becomes the oracle you verify the Swift port against, seed by seed.)

---

## 5. What "sellable" requires beyond the port

Ordered roughly by how much each matters:

1. **Interactive tutorial.** This genre's rules are opaque to newcomers — majority/minority bonuses and the sell/convert/hold decision need teaching by doing, not a rules screen. This is the single biggest determinant of reviews and refunds. Budget real time here.
2. **Persistence.** Auto-save every action; restore mid-merger, mid-anything. iOS kills backgrounded apps; losing a 40-minute game once is a deleted app. (Deterministic engine + action log = trivial save format and free replays.)
3. **Board fit + touch feel.** Fit-to-width board, generous hit targets, drag-or-tap tile placement, haptics on merger events, subtle sound. This is where "polished" lives.
4. **A stronger AI.** Your Strategic heuristic is respectable but flat — experienced players will beat it quickly and say so in reviews. A deterministic, fast engine makes Monte-Carlo tree search (or even just deeper heuristic + simulation rollouts) very doable. Ship difficulty tiers: your current three + one that simulates.
5. **Accessibility.** Your two-letter codes on tiles already help color-blind players — lean in: color-blind palette option, Dynamic Type, VoiceOver labels on board cells. Apple features accessible games; reviewers notice.
6. **iPad layout.** Same engine, side-by-side layout. Board game buyers over-index on iPad.
7. **Game Center.** Achievements ("win holding only minority positions"), win-streak leaderboard vs AI. Cheap retention.
8. **Stats & history.** Win rates by AI level, net-worth graphs per game, replay viewer (free, via the action log).
9. **Card deck settings.** Let players toggle individual cards / build presets. Turns your differentiator into depth, and fixes the "two are devastating" balance complaints preemptively.

**Deliberately later:** online async multiplayer. It's the genre's killer feature *and* a 3–5× scope multiplier (server or Game Center turn-based, matchmaking, abandonment handling). The deterministic action-log architecture makes it a clean v2. Don't let it block v1.

---

## 6. Business shape

- **Pricing: premium, $5.99–$7.99, no ads.** Board game buyers are a premium-tolerant niche and your aesthetic signals it. Ads would poison the positioning. Alternative: free with 2 AI opponents, one-time unlock for full AI roster + cards — better funnel, more support surface. Either works; ads don't.
- **App Store checklist:** Apple Developer account ($99/yr) · privacy nutrition label (collect nothing — it's a selling point) · 4+ age rating (simulated stock trading is not "gambling") · screenshots per device class · App Preview video (your merger-card reveal animation is the money shot) · TestFlight beta with actual Acquire-genre players (find them in board game forums — carefully worded) before launch.
- **The repo decision:** shipping a paid app whose full source is public on GitHub is a choice. Not fatal (clones require effort), but decide it deliberately; at minimum move the polished iOS code private.

---

## 7. Suggested sequence

| Phase | Work | Rough effort (nights & weekends) |
|-------|------|----------------------------------|
| 0 | Extract engine to TS, fix all §2 bugs, full test suite, deterministic AI | 2–3 wks |
| 1 | Expo app: fit-to-width board, portrait UI, auto-save/restore, settings, rules reference | 3–4 wks |
| 2 | Polish pass: animations, haptics, sound, iPad, accessibility | 2–3 wks |
| 3 | Interactive tutorial + simulation AI tier + stats | 3–4 wks |
| 4 | IP attorney consult, store assets, TestFlight beta, launch | 2 wks + beta time |
| 5 (v2) | Async online multiplayer, card deck builder, more decks | — |

Call it 3–4 months of part-time work to a launch you'd be proud of. The engine extraction (Phase 0) is the highest-leverage move and is pure, portable work — everything after it gets easier because of it.

---

*Screenshots referenced: `setup.png`, `game_early.png` (note column I clipping at iPhone width).*
