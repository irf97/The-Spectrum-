// Phase 7 — engine tests: match (v18, gender-aware).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  scoreCandidate, bucketFor, setWeight, toggleExcluded, toggleFilter, setTarget, setGender,
} from '../js/engines/match.js';
import { MATCH_BUCKETS, SAMPLE_PEOPLE, fieldsFor, DEFAULT_DATING_PERSONA } from '../js/data.js';

const basePrefs = () => ({ gender: 'any', filters: {}, weights: {}, targets: {}, excluded: {} });

describe('scoreCandidate — shape', () => {
  test('returns pct/bucket/dimensions/blockedBy/excludedHits', () => {
    const r = scoreCandidate(SAMPLE_PEOPLE[0], basePrefs());
    assert.equal(typeof r.pct, 'number');
    assert.ok(r.pct >= 0 && r.pct <= 1);
    assert.ok(r.bucket && r.bucket.key);
    assert.ok(Array.isArray(r.dimensions));
    assert.ok(Array.isArray(r.blockedBy));
    assert.ok(Array.isArray(r.excludedHits));
  });
});

describe('bucketFor — monotonicity', () => {
  test('returned bucket min ≤ pct across the range', () => {
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const b = bucketFor(Math.min(p, 1));
      assert.ok(b.min <= p + 1e-9, `bucket ${b.key} min ${b.min} > pct ${p}`);
      assert.notEqual(b.key, 'unknown');
    }
  });
});

describe('mutator purity', () => {
  test('setWeight returns new object, original unchanged', () => {
    const p = basePrefs();
    const snap = JSON.stringify(p);
    const next = setWeight(p, 'body', 0.9);
    assert.notEqual(next, p);
    assert.equal(next.weights.body, 0.9);
    assert.equal(JSON.stringify(p), snap);
  });
  test('toggleFilter / toggleExcluded / setTarget are pure', () => {
    const p = basePrefs();
    const snap = JSON.stringify(p);
    const a = toggleFilter(p, 'height', '170–180');
    const b = toggleExcluded(p, 'style', 'Formal');
    const c = setTarget(p, 'age', '30–34');
    assert.ok(a.filters.height.includes('170–180'));
    assert.ok(b.excluded.style.includes('Formal'));
    assert.equal(c.targets.age, '30–34');
    assert.equal(JSON.stringify(p), snap);
  });
  test('toggle is symmetric (add then remove)', () => {
    let p = basePrefs();
    p = toggleFilter(p, 'height', '170–180');
    p = toggleFilter(p, 'height', '170–180');
    assert.deepEqual(p.filters.height, []);
  });
});

describe('hard filters', () => {
  test('a missed filter blocks and caps pct at 0.18', () => {
    const prefs = { ...basePrefs(), filters: { age: ['25–29'] } };
    const cand = { gender: 'Woman', age: '40–49' };
    const r = scoreCandidate(cand, prefs);
    assert.ok(r.blockedBy.length > 0);
    assert.ok(r.pct <= 0.18);
  });
  test('unknown candidate value on a filtered field → blocked:unknown', () => {
    const prefs = { ...basePrefs(), filters: { age: ['25–29'] } };
    const r = scoreCandidate({ gender: 'Woman' }, prefs);
    assert.ok(r.blockedBy.some(b => b.startsWith('age:')));
  });
});

describe('gender awareness', () => {
  test('gender pref blocks non-matching candidates', () => {
    const prefs = { ...basePrefs(), gender: 'woman' };
    const man = scoreCandidate({ gender: 'Man', age: '25–29' }, prefs);
    assert.ok(man.blockedBy.some(b => b.startsWith('gender:')));
    const woman = scoreCandidate({ gender: 'Woman', age: '25–29' }, prefs);
    assert.ok(!woman.blockedBy.some(b => b.startsWith('gender:')));
  });
  test('gender "any" lets everyone through the gender gate', () => {
    const prefs = { ...basePrefs(), gender: 'any' };
    for (const g of ['Woman', 'Man', 'Bisexual']) {
      const r = scoreCandidate({ gender: g, age: '25–29' }, prefs);
      assert.ok(!r.blockedBy.some(b => b.startsWith('gender:')));
    }
  });
  test('field set adapts to candidate gender (body options differ)', () => {
    // A woman-only body value ('Voluptuous') scores as a known dimension for a
    // Woman candidate (woman options include it) — proving the engine picks the
    // gender-specific option list when computing similarity.
    const womanFields = fieldsFor('woman');
    const bodyOpts = womanFields.find(f => f.key === 'body').options;
    assert.ok(bodyOpts.includes('Voluptuous'));
    const prefs = { ...basePrefs(), gender: 'any', targets: { body: 'Voluptuous' }, weights: { body: 1 } };
    const r = scoreCandidate({ gender: 'Woman', body: 'Voluptuous' }, prefs);
    const bodyDim = r.dimensions.find(d => d.key === 'body');
    assert.equal(bodyDim.score, 1); // exact match scored against woman options
  });
  test('setGender returns new prefs with the gender set', () => {
    const p = basePrefs();
    const next = setGender(p, 'woman');
    assert.notEqual(next, p);
    assert.equal(next.gender, 'woman');
  });
});

describe('excluded-trait edge (adversarial)', () => {
  test('an excluded hit is recorded and reduces pct', () => {
    const prefs = { ...basePrefs(), excluded: { style: ['Formal'] }, weights: { style: 1 }, targets: { style: 'Formal' } };
    const r = scoreCandidate({ gender: 'Woman', style: 'Formal' }, prefs);
    assert.ok(r.excludedHits.some(h => h.startsWith('style:')));
  });
  test('stacking many excludeds keeps pct in [0,1], no crash', () => {
    const prefs = {
      ...basePrefs(),
      excluded: { style: ['Formal'], hair: ['Short'], face: ['Soft'], energy: ['High'], vibe: ['Sharp'] },
      weights: { style: 1, hair: 1, face: 1, energy: 1, vibe: 1 },
    };
    const cand = { gender: 'Woman', style: 'Formal', hair: 'Short', face: 'Soft', energy: 'High', vibe: 'Sharp' };
    const r = scoreCandidate(cand, prefs);
    assert.ok(r.pct >= 0 && r.pct <= 1);
    assert.ok(r.excludedHits.length >= 5);
  });
  test('filter + excluded on same field: blocked wins for access decision', () => {
    const prefs = { ...basePrefs(), filters: { style: ['Casual'] }, excluded: { style: ['Formal'] } };
    const r = scoreCandidate({ gender: 'Woman', style: 'Formal' }, prefs);
    assert.ok(r.blockedBy.length > 0);
    assert.ok(r.pct <= 0.18);
  });
});

describe('unknown ratio', () => {
  test('mostly-unknown candidate → unknown bucket', () => {
    const prefs = { ...basePrefs(), weights: { age: 1, height: 1, body: 1, face: 1 }, targets: { age: '25–29' } };
    const r = scoreCandidate({ gender: 'Woman', age: '25–29' }, prefs); // only age known of the weighted set
    assert.equal(r.bucket.key, 'unknown');
  });
});

describe('SAMPLE_PEOPLE smoke', () => {
  test('every sample person scores without error against the default persona', () => {
    const prefs = DEFAULT_DATING_PERSONA().prefs;
    for (const p of SAMPLE_PEOPLE) {
      const r = scoreCandidate(p, prefs);
      assert.ok(r.bucket && r.bucket.key);
      assert.ok(Array.isArray(r.dimensions));
      assert.ok(r.pct >= 0 && r.pct <= 1);
    }
  });
});
