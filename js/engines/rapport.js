// Layer 5 — Rapport math.
// Pure functions. The store handles persistence + tick decay; this module computes.
//
// Dignity constraint (Phase 5 reconciliation on v18):
//
// Rapport is a coordination signal, not a judgment of human worth or a leaderboard.
// Per the Living Mesh master equation `dℋ/dt = gℛ − λ(1−ℛ)ℋ`, reputation is
// "hold only by reaching": it fades when there is no real shared activity, returning
// to the neutral baseline. It never gates whether a person may be seen, contacted,
// or participate — at most it conditions depth and suggestions. Every aeon's floor
// (the minimum access) is unconditional.
//
// Passive proximity dwell-time is intentionally NOT an accrual driver. Standing in
// the same room as someone is not "reaching"; it can be noted as co-presence but
// it does not build standing. Accrual is explicit only:
// - a logged shared session  (state.js: `logSharedSession`)
// - a manual rating after an interaction  (state.js: `addManualRapport`)
// Both stamp `lastReachingTs`; the engine reads that to decide whether decay applies.

import { REP_TIERS } from '../data.js';
import { clamp } from '../util.js';

/** Tier object for a given point total. */
export function tierFor(points) {
  for (let i = REP_TIERS.length - 1; i >= 0; i--) {
    if (points >= REP_TIERS[i].min) return REP_TIERS[i];
  }
  return REP_TIERS[0];
}

/** Tier + progress to next tier (0..1). */
export function progress(points) {
  const t = tierFor(points);
  const i = REP_TIERS.indexOf(t);
  const next = REP_TIERS[i + 1];
  if (!next) return { tier:t, next:null, into:0, span:0, progress:1 };
  const span = next.min - t.min;
  const into = Math.max(0, points - t.min);
  return { tier:t, next, into, span, progress: clamp(into / span, 0, 1) };
}

// --- Decay (the master-equation instantiation for the reputation layer) -----
//
// Half-life chosen for live demo legibility: with no recent reaching, rapport
// halves in two minutes of wall-clock time. The tick is 1Hz; 120 ticks per
// half-life gives λ_per_tick = ln(2)/120 ≈ 5.776e-3.
//
// Real deployments would tune this much slower (days/weeks) but the law is
// the same: `points *= 1 − λ(1 − ℛ)` per tick.

export const HALF_LIFE_TICKS = 120;
export const DECAY_LAMBDA_PER_TICK = Math.LN2 / HALF_LIFE_TICKS;
export const REACHING_WINDOW_MS = 60_000;     // explicit interaction within this window = reaching
export const POINTS_SNAP_THRESHOLD = 0.05;    // collapse to 0 below this absolute value

/**
 * Apply one tick of decay toward the neutral baseline (0).
 *
 * @param {number} points         Current standing (can be negative).
 * @param {number} reachingFraction  0..1, the `ℛ` in the master equation.
 *                                When 1 (active reaching), no decay this tick.
 *                                When 0 (idle), full decay.
 * @param {number} [lambda]       Override for the per-tick decay constant.
 * @returns {number}              Next-tick points, snapped to 0 near the baseline.
 */
export function decayPerTick(points, reachingFraction = 0, lambda = DECAY_LAMBDA_PER_TICK) {
  if (!Number.isFinite(points) || points === 0) return 0;
  const r = clamp(reachingFraction, 0, 1);
  const next = points * (1 - lambda * (1 - r));
  if (Math.abs(next) < POINTS_SNAP_THRESHOLD) return 0;
  return next;
}

/**
 * Compute `ℛ` (reaching) for one person based on the timestamp of their last
 * explicit interaction. Sharp on/off: within the window = 1, otherwise 0.
 * Sharp is easier to reason about than a ramp and matches the canon's
 * "no real shared activity → fade" framing.
 *
 * @param {number} lastInteractionTs  ms epoch of last shared session or manual rating.
 * @param {number} nowTs              ms epoch of the current tick.
 * @returns {number} 0 or 1.
 */
export function reachingFractionFromLast(lastInteractionTs, nowTs = Date.now()) {
  if (!Number.isFinite(lastInteractionTs) || lastInteractionTs <= 0) return 0;
  return (nowTs - lastInteractionTs) < REACHING_WINDOW_MS ? 1 : 0;
}

/** Suggested rating deltas for a manual rapport adjustment after a real interaction. */
export const MANUAL_DELTAS = [
  { delta:  +50, label:'Memorable interaction',  tone:'mint' },
  { delta:  +20, label:'Good vibe',              tone:'mint' },
  { delta:   +5, label:'Light positive',         tone:'mint' },
  { delta:   -5, label:'Light negative',         tone:'rose' },
  { delta:  -20, label:'Awkward / off',          tone:'rose' },
  { delta:  -50, label:'Boundary crossed',       tone:'rose' },
];

/**
 * Standing summary across the whole rapport map.
 * Returns tier counts and the total — never a ranked list of people.
 */
export function summary(rapportMap) {
  const counts = Object.fromEntries(REP_TIERS.map(t => [t.key, 0]));
  let total = 0;
  for (const [, r] of Object.entries(rapportMap)) {
    const t = tierFor(r.points || 0);
    counts[t.key] += 1;
    total += 1;
  }
  return { counts, total };
}
