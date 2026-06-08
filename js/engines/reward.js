// Reward policy — proof-gated, scaled to stake, attached to discrete events.
//
// This module bears the MATERIAL reward (grace, housing-priority points). It
// reads ONLY Ledger B fulfilment events (and the proof tier each carries). It
// does NOT import society and does NOT read any standing value — that is
// invariant (e), and it is enforced both here (by construction) and by the
// structural smoke. Coupling a material reward to a reputation number would
// reintroduce "score = reward," the exact thing the Spectrum's §6
// reconciliation removed. Rank the verified deed, never the reputation.
//
// The policy (invariant f — proof scaled to stake):
//
//   proof   stake        reward
//   ─────   ─────        ──────
//   none     any         standing/depth only — no material reward
//   ping     any         grace: a coffee/meal-credit routed through an
//                        in-mesh third space (footfall for the commons, not wage)
//   strong   low/med     grace (a verified deed, but not housing-scale)
//   strong   high  *     accruing: housing-priority points  (* real evidence only)
//
// Housing-priority points (invariant i, current build) require a REAL proof —
// a task-intrinsic machine trace. The co-presence stub returns `strong` but
// `real:false`, so it can earn grace at most until the radios exist. A need
// with no evidence binding can never exceed grace.
//
// Above-floor housing is stewardship: the balance decays (held while
// contributing, returned when one stops). Floor housing — shelter as a need —
// is unconditional, unranked, untouched by any of this. Everyone has a home;
// the one who automated the kitchen gets a *better* one while they keep
// building. Rank the reward, never the floor.

import { query, stewardshipWeight, STEWARDSHIP_HALF_LIFE_MS } from './fulfilment.js';

export const GRACE_ITEMS = {
  ping:        { item: 'coffee',      copy: 'A coffee, routed through an in-mesh café.' },
  strong_low:  { item: 'meal-credit', copy: 'A meal credit at a commons-circuit third space.' },
};

// Housing-priority points granted per qualifying (strong + high-stake + real)
// fulfilment event. Demo-tuned. These are an internal ledger; the external
// housing-corporation integration is explicitly out of scope.
export const HOUSING_POINTS_PER_EVENT = 10;

/**
 * The reward for a single fulfilment event. PURE. Reads only the event — its
 * proof tier, its stake, and whether the proof is real. Never reads standing,
 * never reads accumulated history. Two events with identical (proof, stake,
 * real) yield identical rewards regardless of who earned them or what their
 * standing is. (Invariants e, f, g.)
 *
 * @param {Object} evt  { proof:{tier,real}, stake }
 * @returns {{ kind, material, graceItem?, thirdSpaceRouted?, housingPoints, requiresBoundEvidence? }}
 */
export function rewardForEvent(evt) {
  const tier = evt?.proof?.tier || 'none';
  const real = evt?.proof?.real !== false;   // default true; stub sets false
  const stake = evt?.stake || 'low';

  if (tier === 'none') {
    return { kind: 'standing_only', material: false, housingPoints: 0 };
  }

  if (tier === 'ping') {
    return {
      kind: 'grace', material: true,
      graceItem: GRACE_ITEMS.ping.item, thirdSpaceRouted: true, housingPoints: 0,
    };
  }

  // tier === 'strong'
  // Material housing reward requires HIGH stake AND real (task-intrinsic)
  // evidence. The stub (real:false) and low/med stake both fall to grace.
  if (stake === 'high' && real) {
    return {
      kind: 'housing', material: true,
      housingPoints: HOUSING_POINTS_PER_EVENT,
      requiresBoundEvidence: true, thirdSpaceRouted: false,
    };
  }

  return {
    kind: 'grace', material: true,
    graceItem: GRACE_ITEMS.strong_low.item, thirdSpaceRouted: true, housingPoints: 0,
  };
}

/**
 * A person's housing-priority balance: the sum of housing points from their
 * qualifying events, each decayed by stewardship (held while contributing,
 * returned when they stop). Reads ONLY Ledger B events. When a contributor
 * goes idle, every grant ages out and the balance returns toward 0 — the
 * above-floor housing is released back, the floor untouched.
 *
 * @param {Array} events     Ledger B
 * @param {string} personId
 * @param {number} now
 * @returns {number} decayed housing-priority points (>= 0).
 */
export function housingPointBalance(events, personId, now = Date.now(), halfLifeMs = STEWARDSHIP_HALF_LIFE_MS) {
  const mine = query(events, { personId });
  let bal = 0;
  for (const e of mine) {
    const r = rewardForEvent(e);
    if (r.housingPoints > 0) bal += r.housingPoints * stewardshipWeight(e.ts, now, halfLifeMs);
  }
  return bal;
}

/**
 * Grace tally: how many grace rewards a person has earned, and the routed
 * items. Footfall for the commons; not decayed (it's already been redeemed as
 * a coffee). Reads only Ledger B.
 */
export function graceLedger(events, personId) {
  const mine = query(events, { personId });
  const items = [];
  for (const e of mine) {
    const r = rewardForEvent(e);
    if (r.kind === 'grace') items.push({ needId: e.needId, item: r.graceItem, ts: e.ts });
  }
  return { count: items.length, items };
}

/**
 * The instrumented failure signal (pilot §03): the fraction of a person's
 * fulfilments that needed a reward attached. Rewards mopping up a thin residue
 * is health; rewards carrying the body of the work is the bet breaking. This
 * is a measurement read, not a gate. Reads only Ledger B.
 */
export function rewardDependence(events, filter = {}) {
  const evs = query(events, filter);
  if (!evs.length) return { total: 0, rewarded: 0, fraction: 0 };
  let rewarded = 0;
  for (const e of evs) if (rewardForEvent(e).material) rewarded++;
  return { total: evs.length, rewarded, fraction: rewarded / evs.length };
}
