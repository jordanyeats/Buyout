/**
 * Deterministic RNG (mulberry32). All engine and AI randomness flows through
 * state.rngState so that seed + action log fully determines every game.
 */

/** Advance a mulberry32 state; returns [float in [0,1), nextState]. */
export function rngNext(state: number): [number, number] {
  let a = (state | 0) + 0x6d2b79f5;
  a |= 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

/** Mutating helper for internal engine use on an already-cloned state. */
export function rand(g: { rngState: number }): number {
  const [v, next] = rngNext(g.rngState);
  g.rngState = next;
  return v;
}

export function randInt(g: { rngState: number }, n: number): number {
  return Math.floor(rand(g) * n);
}

/** Fisher–Yates using the state RNG. */
export function shuffle<T>(g: { rngState: number }, arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(g, i + 1);
    [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
  }
}

/**
 * A pure, NON-consuming rng derived from state — used by AI decision-making so
 * that deciding is a pure function of state (same state → same decision),
 * without perturbing the game's own rng stream.
 */
export function derivedRng(seedA: number, seedB: number): () => number {
  let s = (seedA ^ Math.imul(seedB + 1, 0x9e3779b9)) | 0;
  return () => {
    const [v, next] = rngNext(s);
    s = next;
    return v;
  };
}
