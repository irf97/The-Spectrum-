// Layer 5b — Society standing.
// Per-society / per-place standing held by real contribution to that society's
// flourishing. WoW-style faction reputation made concrete: tiers run Hated →
// Exalted, but they describe DEPTH, never gate ACCESS.
//
// Dignity constraints inherited from the canon:
//
// - Hold only by reaching. Standing accrues from explicit, attributable acts
//   that help the society: visiting, hosting a session there, mentoring,
//   fulfilling an advertised need. It decays toward the neutral baseline
//   under the same master equation `dℋ/dt = gℛ − λ(1−ℛ)ℋ` that drives
//   per-person rapport. Passive proximity to the place is NOT a standalone
//   accrual driver.
//
// - Conditions support, never access. High standing surfaces deeper
//   suggestions inside the society (richer recommendations, mentor visibility,
//   crosswalk hints to sister places). It does NOT decide whether a person
//   can enter, message, or be seen at the society. The floor is unconditional
//   for every aeon.
//
// - Tiers can go down. Manual corrections subtract; decay symmetrically pulls
//   negative standings back toward 0 too — incidents fade just as praise does.
//
// - Demand-based matching is allowed; ranking is not. A society can advertise
//   needs ("barista required Tue 7–9pm"). Surfacing candidates who could fill
//   that need is matchmaking — explicitly NOT a ranking of "best members."
//
// Each society maps onto the Living Mesh concept of a *local authority node*:
// it owns its own state, resolves its own needs, holds its members in its
// own bounded scope. Standing is per-society — what you have built at Cafe
// Frida tells you nothing about your standing at the Tuesday Chess pickup.

import { REP_TIERS } from '../data.js';
import { decayPerTick, reachingFractionFromLast, REACHING_WINDOW_MS } from './rapport.js';
import { clamp } from '../util.js';

/** Tier object for a given standing. The same descriptive scale as per-person rapport. */
export function tierForStanding(points) {
  for (let i = REP_TIERS.length - 1; i >= 0; i--) {
    if (points >= REP_TIERS[i].min) return REP_TIERS[i];
  }
  return REP_TIERS[0];
}

/** Tier + progress to next tier (0..1). */
export function standingProgress(points) {
  const t = tierForStanding(points);
  const i = REP_TIERS.indexOf(t);
  const next = REP_TIERS[i + 1];
  if (!next) return { tier: t, next: null, into: 0, span: 0, progress: 1 };
  const span = next.min - t.min;
  const into = Math.max(0, points - t.min);
  return { tier: t, next, into, span, progress: clamp(into / span, 0, 1) };
}

/** Re-export the rapport decay for the store's society tick step. */
export { decayPerTick, reachingFractionFromLast, REACHING_WINDOW_MS };

/**
 * Declarative table of contribution acts and their immediate accrual.
 * Each act is an explicit, user-initiated event — never derived from
 * passive presence. Deltas are demo-tuned for legibility; production
 * deployment would calibrate against real participation rates.
 */
export const CONTRIBUTION_KINDS = [
  { key: 'visit',        label: 'Logged a visit',         delta:  5,  tone: 'mint',
    copy: 'You showed up. Counts as a small reaching event.' },
  { key: 'host_session', label: 'Hosted a session here',  delta: 30,  tone: 'mint',
    copy: 'You ran something the community could join.' },
  { key: 'mentor',       label: 'Mentored someone here',  delta: 20,  tone: 'mint',
    copy: 'You taught or supported a member.' },
  { key: 'fulfill_need', label: 'Fulfilled an advertised need', delta: 50, tone: 'sun',
    copy: 'You answered a real demand the society had open.' },
  { key: 'manual_plus',  label: 'Noted: positive experience',   delta:  5, tone: 'mint',
    copy: 'A small positive note about your time there.' },
  { key: 'manual_minus', label: 'Noted: rough experience',      delta: -5, tone: 'rose',
    copy: 'A small negative note. Decays back to neutral over time.' },
];

/** Look up an action by key. */
export function contributionMeta(key) {
  return CONTRIBUTION_KINDS.find(c => c.key === key);
}

/**
 * Summarise membership map: counts per tier + recency aggregates. Used for the
 * Societies index header. Never produces a ranked list of societies, only
 * aggregate counts.
 */
export function summary(memberships) {
  const counts = Object.fromEntries(REP_TIERS.map(t => [t.key, 0]));
  let total = 0;
  let withRecentReaching = 0;
  const now = Date.now();
  for (const [, m] of Object.entries(memberships || {})) {
    if (!m) continue;
    const t = tierForStanding(m.points || 0);
    counts[t.key] += 1;
    total += 1;
    if (m.lastReachingTs && now - m.lastReachingTs < REACHING_WINDOW_MS) withRecentReaching += 1;
  }
  return { counts, total, withRecentReaching };
}
