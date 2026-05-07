// Layer 2 — Physical Match scoring engine.
// Pure functions. Gender-aware: scoring iterates fieldsFor(candidate.gender),
// so the dimension set + per-dimension options match the candidate's identity.

import { PHYSICAL_FIELDS, MATCH_BUCKETS, fieldsFor } from '../data.js';
import { clamp } from '../util.js';

export function scoreCandidate(candidate, prefs) {
  const blockedBy = [];
  const excludedHits = [];
  const dims = [];

  // Gender filter: if prefs has a specific gender (not 'any'), candidates not
  // matching are pre-blocked. 'any' lets everyone through.
  if (prefs?.gender && prefs.gender !== 'any') {
    const want = labelFromGenderKey(prefs.gender);
    if (candidate.gender && candidate.gender !== want) blockedBy.push(`gender:${candidate.gender}`);
  }

  // 1. Hard filters: any miss → blocked.
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
  // Field set is determined by the candidate's gender so options match what
  // they actually present as. Falls back to universal schema if unknown.
  const fields = fieldsFor(genderKeyFromLabel(candidate.gender)) || PHYSICAL_FIELDS;
  let sumW = 0, sumS = 0, unknownW = 0;
  for (const f of fields) {
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
    if (excludedHits.some(h => h.startsWith(f.key + ':'))) contribution = Math.min(contribution, 0);
    sumW += w;
    sumS += w * contribution;
    dims.push({ key:f.key, label:f.label, target:tgt, got, score:contribution, weight:w });
  }

  let pct = sumW > 0 ? clamp(sumS / sumW, 0, 1) : 0;
  if (blockedBy.length > 0) pct = Math.min(pct, 0.18);
  pct = clamp(pct - 0.1 * excludedHits.length, 0, 1);

  const unknownRatio = unknownW > 0 ? unknownW / (unknownW + sumW) : 0;
  let bucket;
  if (unknownRatio > 0.5) bucket = MATCH_BUCKETS.find(b => b.key === 'unknown');
  else bucket = bucketFor(pct);

  return { pct, bucket, dimensions: dims, blockedBy, excludedHits };
}

function dimensionSimilarity(options, target, got) {
  if (!target) return got ? 0.5 : 0;
  if (target === got) return 1;
  const ti = options.indexOf(target);
  const gi = options.indexOf(got);
  if (ti < 0 || gi < 0) return target === got ? 1 : 0.4;
  const span = Math.max(1, options.length - 1);
  const dist = Math.abs(ti - gi) / span;
  return clamp(1 - dist * dist, 0, 1);
}

function labelFromGenderKey(key) {
  if (key === 'woman') return 'Woman';
  if (key === 'man') return 'Man';
  if (key === 'bisexual') return 'Bisexual';
  return null;
}
function genderKeyFromLabel(label) {
  if (label === 'Woman') return 'woman';
  if (label === 'Man') return 'man';
  if (label === 'Bisexual') return 'bisexual';
  return 'any';
}

export function bucketFor(pct) {
  for (const b of MATCH_BUCKETS) {
    if (b.key === 'unknown') continue;
    if (pct >= b.min) return b;
  }
  return MATCH_BUCKETS.find(b => b.key === 'low');
}

export function setWeight(prefs, key, value) {
  return { ...prefs, weights: { ...(prefs.weights || {}), [key]: clamp(Number(value), 0, 1) } };
}
export function toggleExcluded(prefs, field, value) {
  const cur = new Set(prefs.excluded?.[field] || []);
  cur.has(value) ? cur.delete(value) : cur.add(value);
  return { ...prefs, excluded: { ...(prefs.excluded || {}), [field]: Array.from(cur) } };
}
export function toggleFilter(prefs, field, value) {
  const cur = new Set(prefs.filters?.[field] || []);
  cur.has(value) ? cur.delete(value) : cur.add(value);
  return { ...prefs, filters: { ...(prefs.filters || {}), [field]: Array.from(cur) } };
}
export function setTarget(prefs, field, value) {
  return { ...prefs, targets: { ...(prefs.targets || {}), [field]: value } };
}
export function setGender(prefs, key) {
  return { ...prefs, gender: key };
}
