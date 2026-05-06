// Layer 5 — Rapport math (WoW-style faction reputation, applied to individuals).
// Pure functions. The store handles persistence + tick accrual; this module just computes.

import { REP_TIERS } from '../data.js';
import { clamp } from '../util.js';

export function tierFor(points) {
  for (let i = REP_TIERS.length - 1; i >= 0; i--) {
    if (points >= REP_TIERS[i].min) return REP_TIERS[i];
  }
  return REP_TIERS[0];
}

export function progress(points) {
  const t = tierFor(points);
  const i = REP_TIERS.indexOf(t);
  const next = REP_TIERS[i + 1];
  if (!next) return { tier:t, next:null, into:0, span:0, progress:1 };
  const span = next.min - t.min;
  const into = Math.max(0, points - t.min);
  return { tier:t, next, into, span, progress: clamp(into / span, 0, 1) };
}

export function accrualPerTick({ zoneKey, stable, signal, optIn, sharedHobbyKeys = [] }) {
  if (!optIn) return 0;
  let g = 0;
  if (zoneKey === 'reach')      g = 1.5;   // eye-contact range
  else if (zoneKey === 'nearby') g = 1.0;  // same booth / circle
  else if (zoneKey === 'room')   g = 0.4;  // same area of the venue
  else g = 0;
  if (!stable) g *= 0.5;
  g *= clamp(signal ?? 0.5, 0.2, 1);
  g += sharedHobbyKeys.length * 0.05;
  return g;
}

export const MANUAL_DELTAS = [
  { delta:  +50, label:'Memorable interaction',  tone:'mint' },
  { delta:  +20, label:'Good vibe',              tone:'mint' },
  { delta:   +5, label:'Light positive',         tone:'mint' },
  { delta:   -5, label:'Light negative',         tone:'rose' },
  { delta:  -20, label:'Awkward / off',          tone:'rose' },
  { delta:  -50, label:'Boundary crossed',       tone:'rose' },
];

export function summary(rapportMap) {
  const counts = Object.fromEntries(REP_TIERS.map(t => [t.key, 0]));
  let total = 0; let max = { id:null, points: -Infinity };
  for (const [id, r] of Object.entries(rapportMap)) {
    const t = tierFor(r.points || 0);
    counts[t.key] += 1; total += 1;
    if ((r.points || 0) > max.points) max = { id, points: r.points || 0 };
  }
  return { counts, total, max };
}
