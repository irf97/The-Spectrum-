// Layer 4 — Identity & Anonymity reveal engine.
// Decides what each side sees of the other given visibility mode + match score + reveals + privacy matrix.

import { VIS_MODES } from '../data.js';
import { canSee } from './privacy.js';
import { clamp } from '../util.js';

/**
 * Resolve what `viewer` should see of `subject`.
 * Honours the subject's privacy matrix when deciding whether to allow photo / reveal.
 */
export function resolveView(viewer, subject, matchPct, opts = {}) {
  const reasons = [];
  const muted = !!opts.muted;
  const reveals = opts.reveals || {};
  const subjMode = subject.visMode || 'avatar';
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

  let shows;
  if (mutualReveal) shows = 'reveal';
  else if (matchPct < gate) {
    reasons.push(`below-gate(${gate.toFixed(2)})`);
    shows = 'avatar';
  } else {
    switch (subjMode) {
      case 'photo':  shows = 'photo';  break;
      case 'glance': shows = 'glance'; break;
      case 'reveal': shows = matchPct >= 0.75 ? 'photo' : 'glance'; break;
      case 'hybrid': shows = matchPct >= 0.6 ? 'glance' : 'avatar'; break;
      case 'avatar':
      default:       shows = 'avatar';
    }
  }

  // Privacy matrix override: if the subject's matrix doesn't permit the viewer to see
  // a photo / reveal, downgrade to glance (preserves a hint) or avatar.
  if ((shows === 'photo' || shows === 'reveal') && !canSee(viewer, subject, 'showPhoto', ctx)) {
    shows = canSee(viewer, subject, 'showOnFloor', ctx) ? 'glance' : 'avatar';
    reasons.push('privacy:showPhoto');
  }
  if (shows === 'glance' && !canSee(viewer, subject, 'showPhoto', ctx)) {
    shows = 'avatar';
    reasons.push('privacy:showPhoto');
  }

  return finalise(shows, { mutual: shows === 'reveal', gated: matchPct < gate, reasons, modeKey: subjMode });
}

function finalise(shows, meta) { return { shows, ...meta }; }

export function modeMeta(key) { return VIS_MODES.find(m => m.key === key); }
