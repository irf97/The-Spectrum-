// Layer 2 — Physical Match scoring engine.
// Pure functions. No UI. Consumes preferences + a candidate, returns a bucketed score.

import { PHYSICAL_FIELDS, MATCH_BUCKETS } from '../data.js';
import { clamp } from '../util.js';

/**
 * @typedef {Object} Prefs
 * @property {Object<string,string[]>} filters    Hard non-negotiables: candidate must match.
 * @property {Object<string,number>}   weights    0..1 importance per field.
 * @property {Object<string,string>}   targets    Ideal value per field.
 * @property {Object<string,string[]>} excluded   Disallowed values per field (-1 contribution).
 */

/**
 * Score a candidate against a preference vector.
 * @returns {{ pct:number, bucket:object, dimensions:Array, blockedBy:string[], excludedHits:string[] }}
 */
export function scoreCandidate(candidate, prefs) {
  const blockedBy = [];
  const excludedHits = [];
  const dims = [];

  // 1. Hard filters: any miss => blocked → bucket = 'low' or 'unknown'
  for (const [field, allowed] of Object.entries(prefs.filters || {})) {
    if (!allowed || allowed.length === 0) continue;
    const v = candidate[field];
    if (v == null) { blockedBy.push(`${field}:unknown`); continue; }
    if (!allowed.includes(v)) blockedBy.push(`${field}:${v}`);
  }

  // 2. Excluded values: -1 contribution if hit (treated as a strong negative).
  for (const [field, denyList] of Object.entries(prefs.excluded || {})) {
    if (!denyList || denyList.length === 0) continue;
    if (denyList.includes(candidate[field])) excludedHits.push(`${field}:${candidate[field]}`);
  }

  // 3. Weighted similarity per dimension.
  let sumW = 0, sumS = 0, unknownW = 0;
  for (const f of PHYSICAL_FIELDS) {
    const w = clamp(Number(prefs.weights?.[f.key] ?? f.weight), 0, 1);
    if (w <= 0) continue;
    const tgt = prefs.targets?.[f.key];
    const got = candidate[f.key];
    if (got == null) {
      unknownW += w;
      dims.push({ key:f.key, label:f.label, target:tgt, got:null, score:null, weight:w });
      continue;
    }
    const s = dimensionSimilarity(f.options, tgt, got);
    let contribution = s;
    if (excludedHits.some(h => h.startsWith(f.key + ':'))) contribution = Math.min(contribution, 0); // floor at 0 if excluded hit
    sumW += w;
    sumS += w * contribution;
    dims.push({ key:f.key, label:f.label, target:tgt, got, score:contribution, weight:w });
  }

  // 4. Normalize.
  let pct = sumW > 0 ? clamp(sumS / sumW, 0, 1) : 0;

  // 5. Penalize for blocked filters (hard cap)
  if (blockedBy.length > 0) pct = Math.min(pct, 0.18);

  // 6. Penalize for excluded hits (each costs ~10%)
  pct = clamp(pct - 0.1 * excludedHits.length, 0, 1);

  // 7. Insufficient-data → unknown bucket
  const unknownRatio = unknownW > 0 ? unknownW / (unknownW + sumW) : 0;
  let bucket;
  if (unknownRatio > 0.5) bucket = MATCH_BUCKETS.find(b => b.key === 'unknown');
  else bucket = bucketFor(pct);

  return { pct, bucket, dimensions: dims, blockedBy, excludedHits };
}

/** Ordinal-aware similarity for an option list. Returns 0..1. */
function dimensionSimilarity(options, target, got) {
  if (!target) return got ? 0.5 : 0; // no target → neutral
  if (target === got) return 1;
  const ti = options.indexOf(target);
  const gi = options.indexOf(got);
  if (ti < 0 || gi < 0) return target === got ? 1 : 0.4; // categorical fallback
  const span = Math.max(1, options.length - 1);
  const dist = Math.abs(ti - gi) / span;
  // closer values matter more; quadratic falloff keeps adjacent steps high
  return clamp(1 - dist * dist, 0, 1);
}

/** Look up the bucket for a percent. */
export function bucketFor(pct) {
  for (const b of MATCH_BUCKETS) {
    if (b.key === 'unknown') continue;
    if (pct >= b.min) return b;
  }
  return MATCH_BUCKETS.find(b => b.key === 'low');
}

/** Update a single weight without touching the rest of the prefs object. */
export function setWeight(prefs, key, value) {
  return { ...prefs, weights: { ...(prefs.weights || {}), [key]: clamp(Number(value), 0, 1) } };
}

/** Toggle an excluded value for a field. */
export function toggleExcluded(prefs, field, value) {
  const cur = new Set(prefs.excluded?.[field] || []);
  cur.has(value) ? cur.delete(value) : cur.add(value);
  return { ...prefs, excluded: { ...(prefs.excluded || {}), [field]: Array.from(cur) } };
}

/** Toggle a hard filter value for a field. */
export function toggleFilter(prefs, field, value) {
  const cur = new Set(prefs.filters?.[field] || []);
  cur.has(value) ? cur.delete(value) : cur.add(value);
  return { ...prefs, filters: { ...(prefs.filters || {}), [field]: Array.from(cur) } };
}

export function setTarget(prefs, field, value) {
  return { ...prefs, targets: { ...(prefs.targets || {}), [field]: value } };
}
