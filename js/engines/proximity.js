// Layer 3 — Third-Space Proximity engine.
// Pure classifier. Maps a candidate's signal/distance/opt-in/stability/dwell into a zone bucket.

import { PROX_ZONES } from '../data.js';
import { clamp } from '../util.js';

/**
 * @typedef {Object} Presence
 * @property {number} dist      Effective distance in metres.
 * @property {boolean} optIn    Did this person opt in to be discoverable.
 * @property {boolean} stable   Stable presence vs flickering signal.
 * @property {number} signal    0..1 signal quality (BLE/UWB/etc).
 * @property {number} [dwellMin]  How long they've been in this zone (minutes).
 * @property {boolean} [muted]  Mutual mute applied.
 */

/**
 * @returns {{ zone:object, score:number, reasons:string[] }}
 */
export function classify(p) {
  const reasons = [];
  if (p.muted)              { reasons.push('muted'); return result('muted', 0, reasons); }
  if (p.optIn === false)    { reasons.push('opt-out'); return result('hidden', 0, reasons); }
  if ((p.signal ?? 1) < 0.15) { reasons.push('weak-signal'); return result('unknown', 0, reasons); }
  if (p.dist > 46)          { reasons.push('out-of-range'); return result('outrange', 0, reasons); }

  const z = zoneByDistance(p.dist);
  if (!p.stable)            reasons.push('flicker');
  if ((p.signal ?? 1) < 0.5) reasons.push('low-signal');

  // Quality score: higher = more confident classification (0..1).
  const distFactor = 1 - clamp(p.dist / 50, 0, 1);
  const dwellFactor = clamp((p.dwellMin ?? 1) / 15, 0, 1);
  const score = clamp(0.4 * (p.signal ?? 0.5) + 0.3 * distFactor + 0.2 * (p.stable ? 1 : 0.5) + 0.1 * dwellFactor, 0, 1);

  // Unstable signals downgrade to "Passing".
  if (!p.stable && (z.key === 'samezone' || z.key === 'adjacent')) {
    return result('passing', score, reasons);
  }
  return { zone: z, score, reasons };
}

function zoneByDistance(dist) {
  for (const z of PROX_ZONES) {
    if (!z.range || z.range.length !== 2) continue;
    const [lo, hi] = z.range;
    if (dist >= lo && dist < hi) return z;
  }
  return PROX_ZONES.find(z => z.key === 'unknown');
}

function result(zoneKey, score, reasons) {
  return { zone: PROX_ZONES.find(z => z.key === zoneKey), score, reasons };
}

/** Aggregate a list of classifications into a count per zone. */
export function bucketCounts(rows) {
  const out = {};
  PROX_ZONES.forEach(z => out[z.key] = 0);
  for (const r of rows) out[r.zone.key] = (out[r.zone.key] ?? 0) + 1;
  return out;
}
