// Ledger B — fulfilled-need events.
//
// This is the second of two ledgers that NEVER read each other (see DIGNITY.md
// and the Spectrum paper §2). Ledger A is standing (society.js): held by
// reaching, decaying, depth-only, gating nothing. Ledger B (this module) is a
// log of discrete, proof-verified events — "this need was fulfilled, by this
// person, at this site, at this time, with this proof." Material reward
// (reward.js) is computed ONLY from Ledger B events.
//
// Hard separation (invariant e): this module does not import society or read
// any standing value. Nothing here is derived from ℋ. A person with maximal
// standing and zero fulfilments has an empty Ledger B; a newcomer with zero
// standing and one proven fulfilment has one event. Reward follows the deed,
// never the reputation.
//
// Forgiving stewardship: a fulfilment event's *weight* decays over time, so
// that contribution-derived reward (e.g. above-floor housing) is held as
// stewardship while a person keeps contributing and returns to the floor when
// they stop. The events themselves are an immutable record; the decay is a
// pure read-time weighting, not a mutation of history.

// Half-life over which a fulfilment's reward-weight decays when not renewed.
// Demo-tuned (10 minutes wall-clock) for legibility; a real pilot would set
// this to weeks or bind it to a contribution cadence. The principle is
// "held by reaching"; the constant is a knob.
export const STEWARDSHIP_HALF_LIFE_MS = 10 * 60 * 1000;

/**
 * Append a fulfilment event to the ledger. Pure — returns a new array.
 * @param {Array} events
 * @param {Object} evt  { needId, siteId, personId, ts, proof, stake, task? }
 * @returns {Array} new events array with evt appended.
 */
export function recordFulfilment(events, evt) {
  if (!evt || !evt.needId || !evt.personId) return events || [];
  const clean = {
    needId: evt.needId,
    siteId: evt.siteId ?? null,
    personId: evt.personId,
    ts: Number.isFinite(evt.ts) ? evt.ts : 0,
    proof: evt.proof || { tier: 'none', source: null, real: true },
    stake: evt.stake || 'low',
    task: evt.task ?? null,
  };
  return [...(events || []), clean];
}

/**
 * Query the ledger. Any subset of { personId, siteId, needId, task } filters.
 * @returns {Array} matching events (does not mutate).
 */
export function query(events, filter = {}) {
  return (events || []).filter(e => {
    if (filter.personId != null && e.personId !== filter.personId) return false;
    if (filter.siteId != null && e.siteId !== filter.siteId) return false;
    if (filter.needId != null && e.needId !== filter.needId) return false;
    if (filter.task != null && e.task !== filter.task) return false;
    return true;
  });
}

/**
 * Stewardship weight of a single event at time `now` — the forgiving decay,
 * `e^(−λΔt)`, with λ from the half-life. Within ~one tick of the event the
 * weight is ≈1; long after, it approaches 0. Pure.
 */
export function stewardshipWeight(ts, now = Date.now(), halfLifeMs = STEWARDSHIP_HALF_LIFE_MS) {
  if (!Number.isFinite(ts) || ts <= 0) return 0;
  const dt = Math.max(0, now - ts);
  return Math.pow(2, -dt / Math.max(1, halfLifeMs));
}

/**
 * Aggregate a person's Ledger B: raw counts and a decayed "active contribution"
 * figure. NO reward, NO standing, NO access decision — just a forgiving count
 * of recent proven deeds, used for display and for reward.js to read.
 * @returns {{ total:number, byTask:Object, decayedContribution:number, lastTs:number }}
 */
export function aggregate(events, personId, now = Date.now(), halfLifeMs = STEWARDSHIP_HALF_LIFE_MS) {
  const mine = query(events, { personId });
  const byTask = {};
  let decayed = 0;
  let lastTs = 0;
  for (const e of mine) {
    byTask[e.task || e.needId] = (byTask[e.task || e.needId] || 0) + 1;
    decayed += stewardshipWeight(e.ts, now, halfLifeMs);
    if (e.ts > lastTs) lastTs = e.ts;
  }
  return { total: mine.length, byTask, decayedContribution: decayed, lastTs };
}

/** The set of need ids a given person has already fulfilled (for the feed). */
export function fulfilledNeedIds(events, personId) {
  return query(events, { personId }).map(e => e.needId);
}
