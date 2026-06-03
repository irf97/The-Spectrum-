// Phase 7 — engine tests: proximity (v18 — 10m venue bubble).
// v18 zones: reach[0,2] · nearby[2,5] · room[5,10] · passing/hidden/muted/outrange/unknown.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { classify, bucketCounts } from '../js/engines/proximity.js';
import { PROX_ZONES, SAMPLE_PEOPLE } from '../js/data.js';

describe('proximity.classify — in-bubble zones', () => {
  test('0–2m stable strong → reach', () => {
    assert.equal(classify({ dist: 1, optIn: true, stable: true, signal: 0.9 }).zone.key, 'reach');
  });
  test('2–5m → nearby', () => {
    assert.equal(classify({ dist: 3.5, optIn: true, stable: true, signal: 0.8 }).zone.key, 'nearby');
  });
  test('5–10m → room', () => {
    assert.equal(classify({ dist: 7, optIn: true, stable: true, signal: 0.7 }).zone.key, 'room');
  });
});

describe('proximity.classify — override paths', () => {
  test('muted always wins', () => {
    const c = classify({ dist: 0.5, optIn: true, stable: true, signal: 1, muted: true });
    assert.equal(c.zone.key, 'muted');
    assert.ok(c.reasons.includes('muted'));
  });
  test('opt-out → hidden regardless of distance', () => {
    const c = classify({ dist: 0.5, optIn: false, stable: true, signal: 1 });
    assert.equal(c.zone.key, 'hidden');
    assert.ok(c.reasons.includes('opt-out'));
  });
  test('mute beats opt-out beats distance', () => {
    assert.equal(classify({ dist: 0.5, optIn: false, stable: true, signal: 1, muted: true }).zone.key, 'muted');
  });
});

describe('proximity.classify — freshness / expiry', () => {
  test('weak signal (<0.15) → unknown', () => {
    const c = classify({ dist: 2, optIn: true, stable: true, signal: 0.1 });
    assert.equal(c.zone.key, 'unknown');
    assert.ok(c.reasons.includes('weak-signal'));
  });
  test('past 10m bubble → outrange', () => {
    assert.equal(classify({ dist: 25, optIn: true, stable: true, signal: 0.7 }).zone.key, 'outrange');
  });
  test('flicker downgrades nearby → passing', () => {
    const c = classify({ dist: 3.5, optIn: true, stable: false, signal: 0.7 });
    assert.equal(c.zone.key, 'passing');
    assert.ok(c.reasons.includes('flicker'));
  });
  test('flicker downgrades room → passing', () => {
    assert.equal(classify({ dist: 7, optIn: true, stable: false, signal: 0.7 }).zone.key, 'passing');
  });
  test('flicker does NOT downgrade reach (still in-arm)', () => {
    assert.equal(classify({ dist: 1, optIn: true, stable: false, signal: 0.9 }).zone.key, 'reach');
  });
  test('low signal (<0.5) raises a low-signal reason', () => {
    assert.ok(classify({ dist: 3, optIn: true, stable: true, signal: 0.3 }).reasons.includes('low-signal'));
  });
});

describe('proximity.classify — score quality', () => {
  test('score bounded 0..1 across the bubble', () => {
    for (let d = 0; d <= 10; d += 0.5) {
      const c = classify({ dist: d, optIn: true, stable: true, signal: 0.5 });
      assert.ok(c.score >= 0 && c.score <= 1, `score ${c.score} at d=${d}`);
    }
  });
  test('missing signal defaults defensively', () => {
    assert.equal(classify({ dist: 1, optIn: true, stable: true }).zone.key, 'reach');
  });
});

describe('proximity.bucketCounts', () => {
  test('aggregates the live seed; sum equals rows', () => {
    const rows = SAMPLE_PEOPLE.map(p => classify({ dist: p.dist, optIn: p.optIn, stable: p.stable, signal: p.signal }));
    const counts = bucketCounts(rows);
    for (const z of PROX_ZONES) assert.equal(typeof counts[z.key], 'number');
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    assert.equal(total, rows.length);
  });
  test('empty → all zones 0', () => {
    const counts = bucketCounts([]);
    for (const z of PROX_ZONES) assert.equal(counts[z.key], 0);
  });
});

describe('proximity.classify — boundaries', () => {
  test('exact 2m sits in nearby (>= lo)', () => {
    assert.equal(classify({ dist: 2, optIn: true, stable: true, signal: 0.8 }).zone.key, 'nearby');
  });
  test('exact 5m sits in room', () => {
    assert.equal(classify({ dist: 5, optIn: true, stable: true, signal: 0.7 }).zone.key, 'room');
  });
  test('exact 10m is the bubble edge', () => {
    const c = classify({ dist: 10, optIn: true, stable: true, signal: 0.7 });
    assert.ok(c.zone.key === 'outrange' || c.zone.key === 'unknown', `got ${c.zone.key}`);
  });
});
