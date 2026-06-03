// Phase 7 — engine tests: rapport (v18 + Phase 5 dignity reconciliation).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import * as rapport from '../js/engines/rapport.js';
import { REP_TIERS } from '../js/data.js';

describe('rapport.tierFor — boundaries', () => {
  for (const t of REP_TIERS) {
    test(`tierFor(${t.min}) = ${t.key}`, () => {
      assert.equal(rapport.tierFor(t.min).key, t.key);
    });
  }
  test('overshoot stays exalted', () => assert.equal(rapport.tierFor(999999).key, 'exalted'));
  test('undershoot stays hated', () => assert.equal(rapport.tierFor(-999999).key, 'hated'));
});

describe('rapport.progress', () => {
  test('intermediate value (500 → friendly)', () => {
    const pr = rapport.progress(500);
    assert.equal(pr.tier.key, 'friendly');
    assert.equal(pr.next.key, 'honored');
    assert.equal(pr.into, 200);
    assert.equal(pr.span, 600);
    assert.ok(Math.abs(pr.progress - 200 / 600) < 1e-9);
  });
  test('top tier → next null, progress 1', () => {
    const pr = rapport.progress(99999);
    assert.equal(pr.tier.key, 'exalted');
    assert.equal(pr.next, null);
    assert.equal(pr.progress, 1);
  });
});

describe('rapport.decayPerTick — master equation', () => {
  test('reaching (ℛ=1) holds value across 200 ticks', () => {
    let p = 1000;
    for (let i = 0; i < 200; i++) p = rapport.decayPerTick(p, 1);
    assert.equal(p, 1000);
  });
  test('idle (ℛ=0) halves in ~120 ticks', () => {
    let p = 1000;
    for (let i = 0; i < 120; i++) p = rapport.decayPerTick(p, 0);
    assert.ok(Math.abs(p - 500) < 5, `got ${p}`);
  });
  test('symmetric: negative standing also decays toward 0', () => {
    let p = -1000;
    for (let i = 0; i < 120; i++) p = rapport.decayPerTick(p, 0);
    assert.ok(Math.abs(p - (-500)) < 5, `got ${p}`);
  });
  test('snaps to 0 below threshold', () => {
    assert.equal(rapport.decayPerTick(0.04, 0), 0);
    assert.equal(rapport.decayPerTick(-0.04, 0), 0);
  });
  test('zero / NaN / undefined / Infinity → 0', () => {
    assert.equal(rapport.decayPerTick(0, 0), 0);
    assert.equal(rapport.decayPerTick(NaN, 0), 0);
    assert.equal(rapport.decayPerTick(undefined, 0), 0);
    assert.equal(rapport.decayPerTick(Infinity, 0), 0);
  });
  test('partial reaching (ℛ=0.5) decays slower than ℛ=0', () => {
    let half = 1000, none = 1000;
    for (let i = 0; i < 60; i++) { half = rapport.decayPerTick(half, 0.5); none = rapport.decayPerTick(none, 0); }
    assert.ok(half > none, `half ${half} should exceed none ${none}`);
  });
});

describe('rapport.reachingFractionFromLast — sharp on/off', () => {
  const now = 1_000_000_000;
  test('within window → 1', () => assert.equal(rapport.reachingFractionFromLast(now - 30_000, now), 1));
  test('outside window → 0', () => assert.equal(rapport.reachingFractionFromLast(now - 90_000, now), 0));
  test('exactly at window boundary → 0 (strict <)', () =>
    assert.equal(rapport.reachingFractionFromLast(now - rapport.REACHING_WINDOW_MS, now), 0));
  test('ts=0 → 0', () => assert.equal(rapport.reachingFractionFromLast(0, now), 0));
  test('NaN / null / string → 0', () => {
    assert.equal(rapport.reachingFractionFromLast(NaN, now), 0);
    assert.equal(rapport.reachingFractionFromLast(null, now), 0);
    assert.equal(rapport.reachingFractionFromLast('x', now), 0);
  });
});

describe('rapport.summary', () => {
  test('counts per tier + total, no max field', () => {
    // 500 → friendly (≥300), -1000 → hostile (≥-3000, below unfriendly's -800),
    // 3000 → revered (≥2000, below exalted's 3500).
    const s = rapport.summary({ a:{points:500}, b:{points:-1000}, c:{points:3000} });
    assert.equal(s.counts.friendly, 1);
    assert.equal(s.counts.hostile, 1);
    assert.equal(s.counts.revered, 1);
    assert.equal(s.total, 3);
    assert.equal(s.max, undefined); // leaderboard primitive removed in Phase 1/5
  });
  test('empty map → all zeros', () => {
    const s = rapport.summary({});
    assert.equal(s.total, 0);
    for (const t of REP_TIERS) assert.equal(s.counts[t.key], 0);
  });
});

describe('rapport.MANUAL_DELTAS', () => {
  test('has positive and negative entries', () => {
    assert.ok(rapport.MANUAL_DELTAS.some(d => d.delta > 0));
    assert.ok(rapport.MANUAL_DELTAS.some(d => d.delta < 0));
  });
  test('symmetric — sums to ~0', () => {
    const sum = rapport.MANUAL_DELTAS.reduce((a, d) => a + d.delta, 0);
    assert.ok(Math.abs(sum) < 1, `sum ${sum}`);
  });
  test('each entry has delta/label/tone', () => {
    for (const d of rapport.MANUAL_DELTAS) {
      assert.equal(typeof d.delta, 'number');
      assert.equal(typeof d.label, 'string');
      assert.ok(d.tone === 'mint' || d.tone === 'rose');
    }
  });
});

describe('rapport — adversarial / dignity', () => {
  test('accrualPerTick is gone (Phase 5 — passive proximity dwell removed)', () => {
    assert.equal(typeof rapport.accrualPerTick, 'undefined');
  });
  test('decayPerTick is non-increasing in magnitude for any ℛ', () => {
    // 500 deterministic ℛ values; magnitude must never grow in one tick.
    for (let i = 0; i <= 500; i++) {
      const r = i / 500;
      const next = rapport.decayPerTick(1000, r);
      assert.ok(Math.abs(next) <= 1000 + 1e-9, `ℛ=${r} grew magnitude to ${next}`);
    }
  });
});

describe('rapport — constants', () => {
  test('HALF_LIFE_TICKS positive integer', () => {
    assert.ok(Number.isInteger(rapport.HALF_LIFE_TICKS) && rapport.HALF_LIFE_TICKS > 0);
  });
  test('DECAY_LAMBDA_PER_TICK = ln2 / HALF_LIFE_TICKS', () => {
    assert.equal(rapport.DECAY_LAMBDA_PER_TICK, Math.LN2 / rapport.HALF_LIFE_TICKS);
  });
  test('REACHING_WINDOW_MS > 0', () => assert.ok(rapport.REACHING_WINDOW_MS > 0));
  test('POINTS_SNAP_THRESHOLD > 0', () => assert.ok(rapport.POINTS_SNAP_THRESHOLD > 0));
});
