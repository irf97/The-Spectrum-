// Layer 4 — Identity & Anonymity reveal engine.
// Decides what each side sees of the other given visibility mode + match score + reveals.

import { VIS_MODES } from '../data.js';
import { clamp } from '../util.js';

/**
 * Resolve what `viewer` should see of `subject`.
 * @param {Object} viewer    Has visMode, visMatchGate, reveals (set of personIds), muted (set).
 * @param {Object} subject   Has id, visMode, alias, name.
 * @param {number} matchPct  0..1 score from match engine.
 * @returns {{ shows:'photo'|'avatar'|'glance'|'hidden'|'reveal', mutual:boolean, gated:boolean, reasons:string[], modeKey:string }}
 */
export function resolveView(viewer, subject, matchPct, opts = {}) {
  const reasons = [];
  const muted = !!opts.muted;
  const reveals = opts.reveals || {};
  const subjMode = subject.visMode || 'avatar';
  const viewerMode = viewer.visMode || 'avatar';
  const gate = clamp(viewer.visMatchGate ?? 0, 0, 1);

  if (muted) return finalise('hidden', { mutual:false, gated:false, reasons:['muted'], modeKey:subjMode });
  if (subjMode === 'hidden') return finalise('hidden', { mutual:false, gated:false, reasons:['subject-hidden'], modeKey:subjMode });

  // Subject sets the upper bound of what viewer can see.
  // Viewer's own match gate suppresses richer views below threshold.
  const mutualReveal = !!reveals[subject.id] && !!opts.theirReveal; // both sides flipped reveal
  if (mutualReveal) return finalise('reveal', { mutual:true, gated:false, reasons:['mutual-reveal'], modeKey:subjMode });

  // Match gate: low-match candidates collapse to avatar regardless of mode.
  if (matchPct < gate && !mutualReveal) {
    reasons.push(`below-gate(${gate.toFixed(2)})`);
    return finalise('avatar', { mutual:false, gated:true, reasons, modeKey:subjMode });
  }

  switch (subjMode) {
    case 'photo':  return finalise('photo',  { mutual:false, gated:false, reasons, modeKey:subjMode });
    case 'glance': return finalise('glance', { mutual:false, gated:false, reasons, modeKey:subjMode });
    case 'reveal': return finalise(matchPct >= 0.75 ? 'photo' : 'glance', { mutual:false, gated:false, reasons:['needs-mutual'], modeKey:subjMode });
    case 'hybrid': return finalise(matchPct >= 0.6 ? 'glance' : 'avatar', { mutual:false, gated:false, reasons, modeKey:subjMode });
    case 'avatar':
    default:       return finalise('avatar', { mutual:false, gated:false, reasons, modeKey:subjMode });
  }
}

function finalise(shows, meta) { return { shows, ...meta }; }

export function modeMeta(key) { return VIS_MODES.find(m => m.key === key); }
