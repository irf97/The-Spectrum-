// Networking alignment scoring engine. Mirrors match.js but reads from
// candidate.networking.<field> and uses NETWORKING_FIELDS. No physical or
// gender axes — purely ambitions, role posture, way of thinking, etc.

import { NETWORKING_FIELDS, MATCH_BUCKETS } from '../data.js';
import { clamp } from '../util.js';

export function alignmentCandidate(candidate, prefs) {
  const blockedBy = [];
  const excludedHits = [];
  const dims = [];
  const cn = candidate?.networking || null;

  if (!cn) {
    return {
      pct: 0,
      bucket: MATCH_BUCKETS.find(b => b.key === 'unknown'),
      dimensions: [],
      blockedBy: ['no_networking_profile'],
      excludedHits: []
    };
  }

  for (const [field, allowed] of Object.entries(prefs.filters || {})) {
    if (!allowed || allowed.length === 0) continue;
    const v = cn[field];
    if (v == null) { blockedBy.push(`${field}:unknown`); continue; }
    if (!allowed.includes(v)) blockedBy.push(`${field}:${v}`);
  }

  for (const [field, denyList] of Object.entries(prefs.excluded || {})) {
    if (!denyList || denyList.length === 0) continue;
    if (denyList.includes(cn[field])) excludedHits.push(`${field}:${cn[field]}`);
  }

  let sumW = 0, sumS = 0, unknownW = 0;
  for (const f of NETWORKING_FIELDS) {
    const w = clamp(Number(prefs.weights?.[f.key] ?? f.weight), 0, 1);
    if (w <= 0) continue;
    const tgt = prefs.targets?.[f.key];
    const got = cn[f.key];
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
  const bucket = unknownRatio > 0.5
    ? MATCH_BUCKETS.find(b => b.key === 'unknown')
    : bucketFor(pct);

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

function bucketFor(pct) {
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
