// Layer 4 — Identity & Anonymity reveal engine.
// Decides what each side sees of the other given visibility mode + reveals + privacy matrix.
//
// Dignity constraint (Phase 5 reconciliation on v18):
//
// The subject's chosen mode is the upper bound. A view richer than that requires
// a mutual reveal handshake — both sides flag each other. Match percentage cannot
// elevate visibility; it can only pull the viewer's own surface DOWN to the
// avatar baseline via a self-simplify filter. The privacy matrix is the ceiling:
// even if the subject's mode would allow a richer view, the matrix can downgrade
// it (e.g., showPhoto = nobody → glance/avatar). Match percentage is never the
// ceiling.

import { VIS_MODES } from '../data.js';
import { canSee } from './privacy.js';
import { clamp } from '../util.js';

// Phase 2 — Reveal-grant expiry.
//
// Reveals are the most permission-like state in The Spectrum. The kernel
// principle "no permanence without review" applies directly: a grant lives for
// a bounded TTL and then must be renewed. This engine owns the policy; the
// store runs the sweep on the tick. Production tuning would lengthen this; the
// value is chosen for live-demo legibility.
export const REVEAL_GRANT_TTL_MS = 5 * 60 * 1000;

/**
 * Resolve what `viewer` should see of `subject`.
 * @param {Object} viewer    Has visMode, visMatchGate, reveals (set of personIds), muted (set).
 * @param {Object} subject   Has id, visMode, alias, name, and a privacy matrix.
 * @param {number} matchPct  0..1 — the viewer's private preference-fit on their own search.
 *                           Used only as a self-filter (can pull a richer view DOWN to avatar
 *                           on the viewer's surface); never used to elevate a view above what
 *                           the subject has chosen or what mutual consent has unlocked.
 * @returns {{ shows:'photo'|'avatar'|'glance'|'hidden'|'reveal', mutual:boolean, gated:boolean, reasons:string[], modeKey:string }}
 */
export function resolveView(viewer, subject, matchPct, opts = {}) {
  const reasons = [];
  const muted = !!opts.muted;
  const reveals = opts.reveals || {};
  const subjMode = subject.visMode || activePersonaVisMode(subject) || 'avatar';
  const gate = clamp(viewer.visMatchGate ?? 0, 0, 1);

  if (muted) return finalise('hidden', { mutual:false, gated:false, reasons:['muted'], modeKey:subjMode });
  if (subjMode === 'hidden') return finalise('hidden', { mutual:false, gated:false, reasons:['subject-hidden'], modeKey:subjMode });

  const mutualReveal = !!reveals[subject.id] && !!opts.theirReveal;
  const ctx = {
    muted,
    zoneKey: opts.zoneKey,
    matchPct,
    viewerReveal: !!reveals[subject.id],
    subjectReveal: !!opts.theirReveal,
  };

  // Mutual-consent reveal. Both sides must have flagged each other.
  // This is the ONLY path that unlocks 'reveal'. Score does not enter.
  let shows;
  if (mutualReveal) {
    shows = 'reveal';
  } else if (matchPct < gate) {
    // Viewer's self-simplify filter: pull DOWN to avatar to keep the viewer's
    // own room quiet. This is the viewer's choice for themselves, not a gate
    // on the subject's visibility.
    reasons.push(`self-simplify(< ${gate.toFixed(2)})`);
    shows = 'avatar';
  } else {
    // Subject's chosen mode is the upper bound. 'hybrid' and 'reveal' modes are
    // explicit opt-ins to the mutual-handshake flow — without the handshake,
    // they collapse to avatar. Match percentage NEVER unlocks them.
    switch (subjMode) {
      case 'photo':  shows = 'photo';  break;
      case 'glance': shows = 'glance'; break;
      case 'reveal':
      case 'hybrid':
        shows = 'avatar';
        reasons.push('needs-mutual');
        break;
      case 'avatar':
      default:       shows = 'avatar';
    }
  }

  // Privacy matrix override: the subject's matrix can downgrade what their mode
  // would otherwise allow. (It can't elevate — the mode is the ceiling, and
  // mutual-reveal is the unlock.) This is the right architecture: privacy as a
  // ceiling above the mode floor.
  if ((shows === 'photo' || shows === 'reveal') && !canSee(viewer, subject, 'showPhoto', ctx)) {
    shows = canSee(viewer, subject, 'showOnFloor', ctx) ? 'glance' : 'avatar';
    reasons.push('privacy:showPhoto');
  }
  if (shows === 'glance' && !canSee(viewer, subject, 'showPhoto', ctx)) {
    shows = 'avatar';
    reasons.push('privacy:showPhoto');
  }

  return finalise(shows, {
    mutual: shows === 'reveal',
    gated: matchPct < gate,
    reasons,
    modeKey: subjMode,
  });
}

function activePersonaVisMode(person) {
  if (!person?.mode) return null;
  const block = person[person.mode];
  if (!block?.personas) return null;
  const persona = block.personas.find(x => x.id === block.activePersonaId);
  return persona?.visMode || null;
}

function finalise(shows, meta) { return { shows, ...meta }; }

export function modeMeta(key) { return VIS_MODES.find(m => m.key === key); }

/**
 * Pure sweep — return a new reveals map with expired entries removed.
 * A reveal is considered expired when `now - ts > ttlMs`. Non-numeric
 * entries are treated as malformed and dropped (defensive).
 *
 * @param {Object} reveals  map of subjectId → timestamp (ms epoch)
 * @param {number} [ttlMs]  override for the TTL
 * @param {number} [now]    current time for testability
 * @returns {{ reveals:Object, removed:number, remaining:number }}
 */
export function sweepExpiredReveals(reveals, ttlMs = REVEAL_GRANT_TTL_MS, now = Date.now()) {
  const out = {};
  let removed = 0;
  let remaining = 0;
  for (const [id, ts] of Object.entries(reveals || {})) {
    if (typeof ts === 'number' && now - ts <= ttlMs) {
      out[id] = ts;
      remaining++;
    } else {
      removed++;
    }
  }
  return { reveals: out, removed, remaining };
}

/**
 * Milliseconds remaining on a reveal grant before it auto-expires.
 * Returns 0 if already expired or never granted.
 */
export function revealGrantRemainingMs(ts, ttlMs = REVEAL_GRANT_TTL_MS, now = Date.now()) {
  if (typeof ts !== 'number' || ts <= 0) return 0;
  return Math.max(0, ts + ttlMs - now);
}
