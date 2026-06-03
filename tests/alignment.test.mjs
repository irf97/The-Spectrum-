// Phase 7 — engine tests: alignment (v18 networking scoring).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  alignmentCandidate, setWeight, toggleExcluded, toggleFilter, setTarget,
} from '../js/engines/alignment.js';
import { NETWORKING_FIELDS, MATCH_BUCKETS, SAMPLE_PEOPLE, DEFAULT_NETWORKING_PERSONA } from '../js/data.js';

const basePrefs = () => ({ filters: {}, weights: {}, targets: {}, excluded: {} });
const withNet = (net) => ({ networking: net });

describe('alignmentCandidate — shape', () => {
  test('returns the standard score shape', () => {
    const r = alignmentCandidate(withNet({ ambition: '2 years', role: 'Founder' }), basePrefs());
    assert.equal(typeof r.pct, 'number');
    assert.ok(r.bucket && r.bucket.key);
    assert.ok(Array.isArray(r.dimensions));
    assert.ok(Array.isArray(r.blockedBy));
    assert.ok(Array.isArray(r.excludedHits));
  });
  test('candidate without a networking profile → unknown bucket, blocked', () => {
    const r = alignmentCandidate({ name: 'NoNet' }, basePrefs());
    assert.equal(r.bucket.key, 'unknown');
    assert.ok(r.blockedBy.includes('no_networking_profile'));
  });
});

describe('reads from candidate.networking.<field>, not physical', () => {
  test('scores ambition/stage/role from the networking block', () => {
    const prefs = { ...basePrefs(), weights: { role: 1 }, targets: { role: 'Founder' } };
    const r = alignmentCandidate(withNet({ role: 'Founder' }), prefs);
    const dim = r.dimensions.find(d => d.key === 'role');
    assert.equal(dim.score, 1);
  });
  test('only NETWORKING_FIELDS appear as dimensions', () => {
    const r = alignmentCandidate(withNet({ ambition: '10 years', stage: 'Building' }), { ...basePrefs(), weights: Object.fromEntries(NETWORKING_FIELDS.map(f => [f.key, 1])) });
    const dimKeys = new Set(r.dimensions.map(d => d.key));
    const netKeys = new Set(NETWORKING_FIELDS.map(f => f.key));
    for (const k of dimKeys) assert.ok(netKeys.has(k), `unexpected dimension ${k}`);
  });
});

describe('hard filters + excluded', () => {
  test('missed filter blocks and caps pct at 0.18', () => {
    const prefs = { ...basePrefs(), filters: { role: ['Founder'] } };
    const r = alignmentCandidate(withNet({ role: 'Operator' }), prefs);
    assert.ok(r.blockedBy.length > 0);
    assert.ok(r.pct <= 0.18);
  });
  test('excluded hit recorded + reduces pct', () => {
    const prefs = { ...basePrefs(), excluded: { domain: ['Finance'] }, weights: { domain: 1 }, targets: { domain: 'Finance' } };
    const r = alignmentCandidate(withNet({ domain: 'Finance' }), prefs);
    assert.ok(r.excludedHits.some(h => h.startsWith('domain:')));
  });
  test('stacked excludeds keep pct in [0,1]', () => {
    const prefs = { ...basePrefs(), excluded: { role: ['Capital'], domain: ['Finance'], stage: ['Harvesting'] }, weights: { role: 1, domain: 1, stage: 1 } };
    const r = alignmentCandidate(withNet({ role: 'Capital', domain: 'Finance', stage: 'Harvesting' }), prefs);
    assert.ok(r.pct >= 0 && r.pct <= 1);
    assert.ok(r.excludedHits.length >= 3);
  });
});

describe('mutator purity', () => {
  test('all four mutators return new objects, original unchanged', () => {
    const p = basePrefs();
    const snap = JSON.stringify(p);
    assert.equal(setWeight(p, 'role', 0.9).weights.role, 0.9);
    assert.ok(toggleFilter(p, 'role', 'Founder').filters.role.includes('Founder'));
    assert.ok(toggleExcluded(p, 'domain', 'Finance').excluded.domain.includes('Finance'));
    assert.equal(setTarget(p, 'stage', 'Scaling').targets.stage, 'Scaling');
    assert.equal(JSON.stringify(p), snap);
  });
});

describe('ordinal similarity', () => {
  test('exact target → 1.0; adjacent option scores high', () => {
    const ambitionOpts = NETWORKING_FIELDS.find(f => f.key === 'ambition').options; // 4 options
    const prefs = { ...basePrefs(), weights: { ambition: 1 }, targets: { ambition: ambitionOpts[0] } };
    const exact = alignmentCandidate(withNet({ ambition: ambitionOpts[0] }), prefs);
    assert.equal(exact.dimensions.find(d => d.key === 'ambition').score, 1);
    const adjacent = alignmentCandidate(withNet({ ambition: ambitionOpts[1] }), prefs);
    const span = ambitionOpts.length - 1;
    const expected = 1 - (1 / span) ** 2;
    assert.ok(Math.abs(adjacent.dimensions.find(d => d.key === 'ambition').score - expected) < 1e-9);
  });
});

describe('unknown ratio', () => {
  test('mostly-unknown networking profile → unknown bucket', () => {
    const prefs = { ...basePrefs(), weights: { ambition: 1, stage: 1, role: 1, domain: 1 }, targets: { ambition: '2 years' } };
    const r = alignmentCandidate(withNet({ ambition: '2 years' }), prefs); // only ambition known of the weighted set
    assert.equal(r.bucket.key, 'unknown');
  });
});

describe('SAMPLE_PEOPLE smoke', () => {
  test('networking-capable people score without error against the default persona', () => {
    const prefs = DEFAULT_NETWORKING_PERSONA().prefs;
    for (const p of SAMPLE_PEOPLE) {
      const r = alignmentCandidate(p, prefs);
      assert.ok(r.bucket && r.bucket.key);
      assert.ok(r.pct >= 0 && r.pct <= 1);
    }
  });
});
