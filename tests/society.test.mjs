// tests/society.test.mjs
//
// Phase 6 Society engine — unit tests.
//
// Dignity invariants this file locks in:
//   - standing modifies depth, never access (no can-access function)
//   - summary() returns aggregate counts, never a ranked list of societies
//   - decay law is the same instantiation used for per-person rapport

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import * as society from '../js/engines/society.js';
import {
  tierForStanding,
  standingProgress,
  decayPerTick,
  reachingFractionFromLast,
  REACHING_WINDOW_MS,
  CONTRIBUTION_KINDS,
  contributionMeta,
  summary,
} from '../js/engines/society.js';
import { REP_TIERS, SOCIETIES } from '../js/data.js';

describe('CONTRIBUTION_KINDS catalog', () => {
  test('every entry has the required shape', () => {
    assert.ok(Array.isArray(CONTRIBUTION_KINDS));
    assert.ok(CONTRIBUTION_KINDS.length > 0);
    for (const c of CONTRIBUTION_KINDS) {
      assert.equal(typeof c.key, 'string');
      assert.ok(c.key.length > 0);
      assert.equal(typeof c.label, 'string');
      assert.equal(typeof c.delta, 'number');
      assert.ok(Number.isFinite(c.delta));
      assert.ok(['mint', 'sun', 'rose'].includes(c.tone), `tone "${c.tone}" must be mint/sun/rose`);
      assert.equal(typeof c.copy, 'string');
      assert.ok(c.copy.length > 0);
    }
  });

  test('contains the canonical contribution acts at expected deltas', () => {
    const byKey = Object.fromEntries(CONTRIBUTION_KINDS.map(c => [c.key, c]));
    assert.equal(byKey.visit?.delta, 5);
    assert.equal(byKey.host_session?.delta, 30);
    assert.equal(byKey.mentor?.delta, 20);
    assert.equal(byKey.fulfill_need?.delta, 50);
    assert.ok(byKey.manual_plus, 'manual_plus must exist');
    assert.ok(byKey.manual_plus.delta > 0, 'manual_plus must be positive');
    assert.ok(byKey.manual_minus, 'manual_minus must exist');
    assert.ok(byKey.manual_minus.delta < 0, 'manual_minus must be negative');
  });

  test('all keys are unique', () => {
    const keys = CONTRIBUTION_KINDS.map(c => c.key);
    assert.equal(new Set(keys).size, keys.length, 'CONTRIBUTION_KINDS keys must be unique');
  });
});

describe('contributionMeta(key)', () => {
  test('returns the entry by key', () => {
    const v = contributionMeta('visit');
    assert.ok(v);
    assert.equal(v.key, 'visit');
    assert.equal(v.delta, 5);
  });

  test('returns undefined for unknown key', () => {
    assert.equal(contributionMeta('not-a-thing'), undefined);
    assert.equal(contributionMeta(''), undefined);
    assert.equal(contributionMeta(undefined), undefined);
  });
});

describe('tierForStanding', () => {
  test('floor at hated for extreme negatives', () => {
    assert.equal(tierForStanding(-10000).key, 'hated');
    assert.equal(tierForStanding(-50000).key, 'hated');
  });

  test('zero is neutral (inclusive lower bound)', () => {
    assert.equal(tierForStanding(0).key, 'neutral');
  });

  test('exactly 3500 lands exalted; no overshoot beyond top tier', () => {
    assert.equal(tierForStanding(3500).key, 'exalted');
    assert.equal(tierForStanding(99999).key, 'exalted');
    assert.equal(tierForStanding(1e9).key, 'exalted');
  });

  test('walks all tier boundaries', () => {
    // For every tier, the exact `min` must resolve to that tier.
    for (const t of REP_TIERS) {
      assert.equal(tierForStanding(t.min).key, t.key, `min ${t.min} should be ${t.key}`);
    }
  });

  test('one-below-min snaps to the lower neighbour', () => {
    // 299 should be friendly's predecessor (neutral); 899 should be friendly; etc.
    for (let i = 1; i < REP_TIERS.length; i++) {
      const below = REP_TIERS[i].min - 1;
      assert.equal(tierForStanding(below).key, REP_TIERS[i - 1].key,
        `${below} should be ${REP_TIERS[i - 1].key}`);
    }
  });
});

describe('standingProgress', () => {
  test('intermediate value yields next, into, span and a clamped progress', () => {
    // 500 sits in [friendly(300), honored(900)] → span 600, into 200, progress 1/3.
    const p = standingProgress(500);
    assert.equal(p.tier.key, 'friendly');
    assert.equal(p.next.key, 'honored');
    assert.equal(p.span, 600);
    assert.equal(p.into, 200);
    assert.ok(p.progress > 0 && p.progress < 1);
    assert.ok(Math.abs(p.progress - 200 / 600) < 1e-9);
  });

  test('top tier returns next:null and progress:1', () => {
    const p = standingProgress(99999);
    assert.equal(p.tier.key, 'exalted');
    assert.equal(p.next, null);
    assert.equal(p.progress, 1);
    assert.equal(p.span, 0);
    assert.equal(p.into, 0);
  });

  test('negative value resolves to the right tier and never returns NaN', () => {
    const p = standingProgress(-500);
    assert.equal(p.tier.key, 'unfriendly');
    assert.ok(p.next);
    assert.ok(Number.isFinite(p.progress));
    assert.ok(p.progress >= 0 && p.progress <= 1);
  });

  test('progress is always in [0, 1]', () => {
    for (const pts of [-12000, -3000, -800, 0, 1, 299, 300, 500, 900, 2000, 3500, 3501]) {
      const p = standingProgress(pts);
      assert.ok(Number.isFinite(p.progress));
      assert.ok(p.progress >= 0 && p.progress <= 1, `progress ${p.progress} out of range at ${pts}`);
    }
  });
});

describe('decayPerTick (re-exported from rapport)', () => {
  test('with ℛ=0, 1000 pts halves in ~120 ticks', () => {
    let pts = 1000;
    for (let i = 0; i < 120; i++) pts = decayPerTick(pts, 0);
    // Halving is approximate (continuous law sampled discretely) — within 1%.
    assert.ok(Math.abs(pts - 500) < 5, `expected ~500, got ${pts}`);
  });

  test('with ℛ=1, no decay', () => {
    let pts = 1000;
    for (let i = 0; i < 500; i++) pts = decayPerTick(pts, 1);
    assert.equal(pts, 1000);
  });

  test('snaps to 0 near the baseline', () => {
    // Tiny standing collapses in one tick.
    assert.equal(decayPerTick(0.01, 0), 0);
    assert.equal(decayPerTick(0, 0), 0);
  });

  test('non-finite input is treated as zero', () => {
    assert.equal(decayPerTick(NaN, 0), 0);
    assert.equal(decayPerTick(Infinity, 0), 0);
  });

  test('symmetric: negative standings also decay toward 0', () => {
    let pts = -1000;
    for (let i = 0; i < 120; i++) pts = decayPerTick(pts, 0);
    assert.ok(Math.abs(pts - -500) < 5, `expected ~-500, got ${pts}`);
  });
});

describe('reachingFractionFromLast (re-exported)', () => {
  test('sharp on/off at REACHING_WINDOW_MS', () => {
    const now = 1_000_000;
    // Just inside the window → 1.
    assert.equal(reachingFractionFromLast(now - (REACHING_WINDOW_MS - 1), now), 1);
    // Exactly at the window boundary → 0 (strictly less-than).
    assert.equal(reachingFractionFromLast(now - REACHING_WINDOW_MS, now), 0);
    // Well outside → 0.
    assert.equal(reachingFractionFromLast(now - (REACHING_WINDOW_MS * 2), now), 0);
  });

  test('last=0 (never interacted) → 0', () => {
    assert.equal(reachingFractionFromLast(0), 0);
  });

  test('NaN / null / undefined → 0', () => {
    assert.equal(reachingFractionFromLast(NaN), 0);
    assert.equal(reachingFractionFromLast(null), 0);
    assert.equal(reachingFractionFromLast(undefined), 0);
  });

  test('REACHING_WINDOW_MS is the canonical 60s', () => {
    assert.equal(REACHING_WINDOW_MS, 60_000);
  });
});

describe('summary(memberships)', () => {
  test('counts memberships per tier and totals', () => {
    const now = Date.now();
    const memberships = {
      a: { points: 0,    lastReachingTs: now },              // neutral, recent
      b: { points: 500,  lastReachingTs: now - 30_000 },     // friendly, recent
      c: { points: 950,  lastReachingTs: now - 120_000 },    // honored, stale
      d: { points: -100, lastReachingTs: null },             // unfriendly, never
      e: { points: 4000, lastReachingTs: now - 1_000 },      // exalted, recent
    };
    const s = summary(memberships);
    assert.equal(s.total, 5);
    assert.equal(s.counts.neutral, 1);
    assert.equal(s.counts.friendly, 1);
    assert.equal(s.counts.honored, 1);
    assert.equal(s.counts.unfriendly, 1);
    assert.equal(s.counts.exalted, 1);
    assert.equal(s.counts.hated, 0);
    assert.equal(s.counts.hostile, 0);
    assert.equal(s.counts.revered, 0);
    assert.equal(s.withRecentReaching, 3);
  });

  test('every REP_TIERS key appears in counts (zero if empty)', () => {
    const s = summary({});
    for (const t of REP_TIERS) {
      assert.equal(s.counts[t.key], 0, `counts.${t.key} should be 0 for empty map`);
    }
    assert.equal(s.total, 0);
    assert.equal(s.withRecentReaching, 0);
  });

  test('returns no leaderboard surface — no max, no ranked list of societies', () => {
    // This is the load-bearing assertion: the engine surface must NOT
    // expose a "top society" or ranked list. summary() is aggregate-only.
    const s = summary({
      x: { points: 4000, lastReachingTs: Date.now() },
      y: { points: 50,   lastReachingTs: Date.now() },
    });
    assert.equal(s.max, undefined, 'summary() must not expose a max field');
    assert.equal(s.top, undefined, 'summary() must not expose a top field');
    assert.equal(s.ranked, undefined, 'summary() must not expose a ranked list');
    assert.equal(s.leaderboard, undefined, 'summary() must not expose a leaderboard');
    assert.equal(s.bySociety, undefined, 'summary() must not expose per-society rank');
    // The full shape is exactly: counts, total, withRecentReaching.
    assert.deepEqual(
      Object.keys(s).sort(),
      ['counts', 'total', 'withRecentReaching'].sort(),
    );
  });

  test('defensive against null / undefined input', () => {
    for (const input of [null, undefined]) {
      const s = summary(input);
      assert.equal(s.total, 0);
      assert.equal(s.withRecentReaching, 0);
      for (const t of REP_TIERS) assert.equal(s.counts[t.key], 0);
    }
  });

  test('skips falsy membership entries', () => {
    const s = summary({ a: null, b: undefined, c: { points: 500, lastReachingTs: Date.now() } });
    assert.equal(s.total, 1);
    assert.equal(s.counts.friendly, 1);
  });
});

describe('Adversarial — no access-gate function exists on the society engine', () => {
  // The society engine deliberately exposes no access-gate function —
  // standing modifies depth, never access. We assert this both by the
  // catalog of exported names and by behavioural duck-typing.
  test('module exports no canSee / canAccess / gate-style function', () => {
    const exported = Object.keys(society).sort();
    const forbidden = [
      'canSee', 'canAccess', 'isAccessible', 'mayEnter', 'allows', 'gate',
      'gateBy', 'gateByStanding', 'minStandingFor', 'requiresTier',
      'canMessage', 'canView',
    ];
    for (const name of forbidden) {
      assert.ok(
        !exported.includes(name),
        `society engine must not export "${name}" — standing is not an access gate`,
      );
    }
  });

  test('no exported function takes (viewer, subject) and returns a boolean', () => {
    // Stronger duck-test: for every exported function, calling it with a
    // viewer/subject pair must either throw, return non-boolean, or behave
    // in a way that does not match an access-gate contract.
    const viewer = { id: 'v' };
    const subject = { id: 's', points: 9999 };
    for (const [name, fn] of Object.entries(society)) {
      if (typeof fn !== 'function') continue;
      // tierForStanding / standingProgress / contributionMeta take a single
      // argument; calling with (viewer, subject) won't yield true/false.
      let result;
      try { result = fn(viewer, subject); } catch { continue; }
      assert.notEqual(
        result, true,
        `${name}(viewer, subject) returned true — looks like an access gate`,
      );
      assert.notEqual(
        result, false,
        `${name}(viewer, subject) returned false — looks like an access gate`,
      );
    }
  });
});

describe('SOCIETIES catalog smoke', () => {
  test('is an array with at least four seeded entries', () => {
    assert.ok(Array.isArray(SOCIETIES));
    assert.ok(SOCIETIES.length >= 4, `expected ≥4 societies, got ${SOCIETIES.length}`);
  });

  test('each entry has the required shape', () => {
    for (const s of SOCIETIES) {
      assert.equal(typeof s.id, 'string');
      assert.ok(s.id.length > 0);
      assert.equal(typeof s.name, 'string');
      assert.ok(['place', 'crew', 'pickup'].includes(s.kind), `kind "${s.kind}" must be place/crew/pickup`);
      assert.equal(typeof s.copy, 'string');
      assert.equal(typeof s.icon, 'string');
      if (s.interests !== undefined) {
        assert.ok(Array.isArray(s.interests));
        for (const i of s.interests) assert.equal(typeof i, 'string');
      }
      if (s.needs !== undefined) {
        assert.ok(Array.isArray(s.needs));
        for (const n of s.needs) {
          assert.equal(typeof n.id, 'string');
          assert.equal(typeof n.label, 'string');
          assert.equal(typeof n.kind, 'string');
          assert.equal(typeof n.copy, 'string');
        }
      }
    }
  });

  test('society ids are unique', () => {
    const ids = SOCIETIES.map(s => s.id);
    assert.equal(new Set(ids).size, ids.length, 'society ids must be unique');
  });

  test('need ids are unique within each society', () => {
    for (const s of SOCIETIES) {
      if (!s.needs) continue;
      const ids = s.needs.map(n => n.id);
      assert.equal(
        new Set(ids).size, ids.length,
        `need ids must be unique within society ${s.id}`,
      );
    }
  });
});
