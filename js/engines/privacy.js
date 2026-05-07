// Privacy matrix engine.
// canSee(viewer, subject, axis, ctx) — does subject's matrix permit viewer to see/do this axis?
// effectiveTier(person, axis) — the tier currently in effect (honours decay).

import { PRIVACY_AXES, AUDIENCE_TIERS, defaultMatrix } from '../data.js';

export function effectiveTier(person, axis) {
  if (!person) return defaultFor(axis);
  const now = Date.now();
  const t = person.privacy?.temp?.[axis];
  if (t && t.expiresAt > now && t.tier) return t.tier;
  const m = person.privacy?.matrix?.[axis];
  if (m) return m;
  return defaultFor(axis);
}

function defaultFor(axis) {
  return PRIVACY_AXES.find(a => a.key === axis)?.defaultTier || 'nobody';
}

/**
 * Does the subject's privacy matrix permit the viewer to see/do this axis?
 * @param {Object} viewer  The person performing the action (you).
 * @param {Object} subject The person whose matrix governs the action.
 * @param {string} axis    Privacy axis key.
 * @param {Object} ctx     { muted, zoneKey, matchPct, viewerReveal, subjectReveal }
 */
export function canSee(viewer, subject, axis, ctx = {}) {
  if (ctx.muted) return false;
  const tier = effectiveTier(subject, axis);
  switch (tier) {
    case 'nobody':         return false;
    case 'reveal_mutual':  return !!(ctx.viewerReveal && ctx.subjectReveal);
    case 'match_gated': {
      const gate = subject?.visMatchGate ?? 0.5;
      return (ctx.matchPct ?? 0) >= gate;
    }
    case 'same_room':      return ['reach','nearby','room'].includes(ctx.zoneKey);
    case 'anyone':         return true;
    default:               return false;
  }
}

export function tierMeta(key) {
  return AUDIENCE_TIERS.find(t => t.key === key) || AUDIENCE_TIERS[0];
}

export function axisMeta(key) {
  return PRIVACY_AXES.find(a => a.key === key);
}

export function summarize(person) {
  return PRIVACY_AXES.map(a => ({
    axis: a,
    tier: effectiveTier(person, a.key),
    temp: person?.privacy?.temp?.[a.key] || null,
  }));
}

export { defaultMatrix };
