// tests/privacy.test.mjs
//
// Privacy matrix engine — unit tests.
//
// Phase 5 dignity reconciliation lock-ins:
//   - the `match_gated` audience tier is removed from the catalog
//   - canSee() still handles legacy persisted state by mapping it to
//     mutual-only (stronger consent, not access-by-score)
//   - no axis defaults to match_gated; no scoring path unlocks visibility

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  effectiveTier,
  canSee,
  tierMeta,
  axisMeta,
  summarize,
  defaultMatrix,
} from '../js/engines/privacy.js';
import {
  PRIVACY_AXES,
  AUDIENCE_TIERS,
} from '../js/data.js';

// Small helper: build a person with a chosen mode + active persona override.
function makePerson({ mode = null, override = null, matrix = null, temp = null } = {}) {
  const p = { privacy: {} };
  if (matrix) p.privacy.matrix = matrix;
  if (temp) p.privacy.temp = temp;
  if (mode) {
    p.mode = mode;
    p[mode] = {
      activePersonaId: 'default',
      personas: [{ id: 'default', privacyOverrides: override || {} }],
    };
  }
  return p;
}

describe('effectiveTier — lookup precedence', () => {
  test('temp override wins when not expired', () => {
    const p = makePerson({
      mode: 'dating',
      override: { showName: 'anyone' },
      matrix: { showName: 'same_room' },
      temp: { showName: { tier: 'nobody', expiresAt: Date.now() + 60_000 } },
    });
    assert.equal(effectiveTier(p, 'showName'), 'nobody');
  });

  test('expired temp falls through to active persona override', () => {
    const p = makePerson({
      mode: 'dating',
      override: { showName: 'anyone' },
      matrix: { showName: 'same_room' },
      temp: { showName: { tier: 'nobody', expiresAt: Date.now() - 60_000 } },
    });
    assert.equal(effectiveTier(p, 'showName'), 'anyone');
  });

  test('persona override on the active mode wins over matrix', () => {
    const p = makePerson({
      mode: 'dating',
      override: { showName: 'reveal_mutual' },
      matrix: { showName: 'anyone' },
    });
    assert.equal(effectiveTier(p, 'showName'), 'reveal_mutual');
  });

  test('matrix wins when no override is set', () => {
    const p = makePerson({ matrix: { showName: 'same_room' } });
    assert.equal(effectiveTier(p, 'showName'), 'same_room');
  });

  test('falls back to the axis default when nothing is set', () => {
    const def = PRIVACY_AXES.find(a => a.key === 'showName').defaultTier;
    const p = makePerson({});
    assert.equal(effectiveTier(p, 'showName'), def);
  });

  test('defensive: null / undefined person → axis default', () => {
    const def = PRIVACY_AXES.find(a => a.key === 'showName').defaultTier;
    assert.equal(effectiveTier(null, 'showName'), def);
    assert.equal(effectiveTier(undefined, 'showName'), def);
  });

  test('unknown axis falls all the way to "nobody"', () => {
    assert.equal(effectiveTier(null, 'definitely-not-an-axis'), 'nobody');
  });

  test('persona override is per-mode: networking override does not bleed into dating', () => {
    const p = {
      mode: 'dating',
      dating:    { activePersonaId: 'd', personas: [{ id: 'd', privacyOverrides: {} }] },
      networking:{ activePersonaId: 'n', personas: [{ id: 'n', privacyOverrides: { showName: 'anyone' } }] },
      privacy: { matrix: { showName: 'same_room' } },
    };
    assert.equal(effectiveTier(p, 'showName'), 'same_room');
  });
});

describe('canSee — every tier', () => {
  // Build a subject whose matrix pins `showName` to the given tier.
  function subjectWith(tier) {
    return { privacy: { matrix: { showName: tier } } };
  }
  const viewer = { id: 'v' };

  test('"nobody" always returns false', () => {
    const subject = subjectWith('nobody');
    assert.equal(canSee(viewer, subject, 'showName', {}), false);
    assert.equal(canSee(viewer, subject, 'showName', { viewerReveal: true, subjectReveal: true, zoneKey: 'reach' }), false);
  });

  test('"anyone" returns true (unless muted)', () => {
    const subject = subjectWith('anyone');
    assert.equal(canSee(viewer, subject, 'showName', {}), true);
    assert.equal(canSee(viewer, subject, 'showName', { muted: true }), false);
  });

  test('"reveal_mutual" requires both reveal flags', () => {
    const subject = subjectWith('reveal_mutual');
    assert.equal(canSee(viewer, subject, 'showName', { viewerReveal: false, subjectReveal: false }), false);
    assert.equal(canSee(viewer, subject, 'showName', { viewerReveal: true,  subjectReveal: false }), false);
    assert.equal(canSee(viewer, subject, 'showName', { viewerReveal: false, subjectReveal: true  }), false);
    assert.equal(canSee(viewer, subject, 'showName', { viewerReveal: true,  subjectReveal: true  }), true);
  });

  test('"same_room" returns true only inside the 10m bubble (reach/nearby/room)', () => {
    const subject = subjectWith('same_room');
    for (const z of ['reach', 'nearby', 'room']) {
      assert.equal(canSee(viewer, subject, 'showName', { zoneKey: z }), true, `zone ${z} should permit`);
    }
    for (const z of ['passing', 'hidden', 'muted', 'outrange', 'unknown', undefined, null]) {
      assert.equal(canSee(viewer, subject, 'showName', { zoneKey: z }), false, `zone ${z} should deny`);
    }
  });

  test('muted in ctx → returns false regardless of tier', () => {
    for (const tier of ['nobody', 'reveal_mutual', 'same_room', 'anyone', 'match_gated']) {
      const subject = subjectWith(tier);
      assert.equal(
        canSee(viewer, subject, 'showName', {
          muted: true, viewerReveal: true, subjectReveal: true, zoneKey: 'reach', matchPct: 1,
        }),
        false,
        `tier ${tier} with muted=true must deny`,
      );
    }
  });
});

describe('Phase 5 — "match_gated" legacy tier maps to mutual-only', () => {
  // The tier was removed from the catalog but legacy persisted state may
  // still reference it. canSee() treats it as reveal_mutual — the safe
  // migration (stronger consent, not access-by-score).
  test('any matchPct alone does NOT permit access when persisted tier is match_gated', () => {
    const subject = { privacy: { matrix: { showName: 'match_gated' } } };
    const viewer = { id: 'v' };
    for (let i = 0; i <= 10; i++) {
      const matchPct = i / 10;
      const ok = canSee(viewer, subject, 'showName', {
        matchPct, viewerReveal: false, subjectReveal: false, zoneKey: 'reach',
      });
      assert.equal(
        ok, false,
        `matchPct=${matchPct} must NOT unlock match_gated without mutual reveal`,
      );
    }
  });

  test('mutual reveal unlocks legacy match_gated regardless of score', () => {
    const subject = { privacy: { matrix: { showName: 'match_gated' } } };
    const viewer = { id: 'v' };
    for (let i = 0; i <= 10; i++) {
      const matchPct = i / 10;
      const ok = canSee(viewer, subject, 'showName', {
        matchPct, viewerReveal: true, subjectReveal: true,
      });
      assert.equal(
        ok, true,
        `mutual reveal at matchPct=${matchPct} must permit legacy match_gated`,
      );
    }
  });
});

describe('AUDIENCE_TIERS catalog post-Phase-5', () => {
  test('match_gated is no longer listed', () => {
    const keys = AUDIENCE_TIERS.map(t => t.key);
    assert.ok(!keys.includes('match_gated'), 'AUDIENCE_TIERS must not contain match_gated');
  });

  test('the four legitimate tiers are still present', () => {
    const keys = AUDIENCE_TIERS.map(t => t.key);
    for (const expected of ['nobody', 'reveal_mutual', 'same_room', 'anyone']) {
      assert.ok(keys.includes(expected), `AUDIENCE_TIERS must contain ${expected}`);
    }
  });
});

describe('PRIVACY_AXES defaults', () => {
  test('no axis defaults to match_gated', () => {
    for (const a of PRIVACY_AXES) {
      assert.notEqual(a.defaultTier, 'match_gated', `axis ${a.key} must not default to match_gated`);
    }
  });

  test('every axis has a defaultTier from the legitimate set', () => {
    const legitimate = new Set(['nobody', 'reveal_mutual', 'same_room', 'anyone']);
    for (const a of PRIVACY_AXES) {
      assert.ok(
        legitimate.has(a.defaultTier),
        `axis ${a.key} defaultTier "${a.defaultTier}" must be one of the four legitimate tiers`,
      );
    }
  });
});

describe('defaultMatrix()', () => {
  test('returns one entry per PRIVACY_AXES with that axis defaultTier', () => {
    const m = defaultMatrix();
    assert.equal(Object.keys(m).length, PRIVACY_AXES.length);
    for (const a of PRIVACY_AXES) {
      assert.equal(m[a.key], a.defaultTier, `default for ${a.key} should be ${a.defaultTier}`);
    }
  });
});

describe('summarize(person)', () => {
  test('returns one row per axis with { axis, tier, temp }', () => {
    const person = makePerson({ matrix: defaultMatrix() });
    const rows = summarize(person);
    assert.equal(rows.length, PRIVACY_AXES.length);
    for (const r of rows) {
      assert.ok(r.axis);
      assert.equal(typeof r.tier, 'string');
      // temp may be null or an object — explicitly defined either way.
      assert.ok(r.temp === null || typeof r.temp === 'object');
    }
  });

  test('reflects temp overrides in the rows it returns', () => {
    const person = {
      privacy: {
        matrix: defaultMatrix(),
        temp: { showName: { tier: 'nobody', expiresAt: Date.now() + 60_000 } },
      },
    };
    const rows = summarize(person);
    const row = rows.find(r => r.axis.key === 'showName');
    assert.equal(row.tier, 'nobody');
    assert.ok(row.temp);
    assert.equal(row.temp.tier, 'nobody');
  });
});

describe('tierMeta / axisMeta', () => {
  test('tierMeta returns the right entry for each tier', () => {
    for (const t of AUDIENCE_TIERS) {
      assert.equal(tierMeta(t.key).key, t.key);
    }
  });

  test('tierMeta returns a defensive fallback for unknown keys', () => {
    const m = tierMeta('not-a-tier');
    assert.ok(m);
    assert.equal(typeof m.key, 'string');
    // Fallback is the first tier in the catalog.
    assert.equal(m.key, AUDIENCE_TIERS[0].key);
  });

  test('axisMeta returns the right entry for each axis', () => {
    for (const a of PRIVACY_AXES) {
      assert.equal(axisMeta(a.key).key, a.key);
    }
  });

  test('axisMeta returns undefined for unknown axes (it does not pretend)', () => {
    // The engine returns undefined for unknown axis lookups; this is
    // intentional — callers must handle the absence rather than be
    // given a misleading default.
    assert.equal(axisMeta('not-an-axis'), undefined);
  });
});

describe('Adversarial — score may not gate visibility, even when the subject is permissive', () => {
  // The dignity invariant: visibility may not be gated by score, even
  // when the subject's own gate is permissive. A subject with
  // visMatchGate=0 (which pre-Phase-5 would have unlocked everything to
  // any matchPct) plus a persisted match_gated tier still demands a
  // mutual reveal — the consent handshake.
  test('subject.visMatchGate = 0 + match_gated does not unlock on matchPct alone', () => {
    const subject = {
      visMatchGate: 0.0,
      privacy: { matrix: { showName: 'match_gated' } },
    };
    const viewer = { id: 'v', visMatchGate: 0.0 };
    const ok = canSee(viewer, subject, 'showName', {
      matchPct: 1.0,
      viewerReveal: false,
      subjectReveal: false,
      zoneKey: 'reach',
    });
    assert.equal(ok, false, 'matchPct=1 must not bypass the reveal handshake');
  });

  test('even at matchPct=1, asymmetric reveal still denies', () => {
    const subject = {
      visMatchGate: 0.0,
      privacy: { matrix: { showName: 'match_gated' } },
    };
    const viewer = { id: 'v' };
    assert.equal(
      canSee(viewer, subject, 'showName', {
        matchPct: 1.0, viewerReveal: true, subjectReveal: false,
      }),
      false,
      'one-sided reveal must not unlock — consent is mutual',
    );
    assert.equal(
      canSee(viewer, subject, 'showName', {
        matchPct: 1.0, viewerReveal: false, subjectReveal: true,
      }),
      false,
      'one-sided reveal must not unlock — consent is mutual',
    );
  });
});
