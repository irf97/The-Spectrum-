// Engine unit tests — identity (Layer 4) under Phase 5 dignity reconciliation.
// Uses only node:test and node:assert/strict.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveView,
  modeMeta,
  REVEAL_GRANT_TTL_MS,
  sweepExpiredReveals,
  revealGrantRemainingMs,
} from '../js/engines/identity.js';
import { DEFAULT_PROFILE, VIS_MODES, defaultMatrix } from '../js/data.js';

const SHOWS = new Set(['photo', 'avatar', 'glance', 'hidden', 'reveal']);

function makeSubject(overrides = {}) {
  // Minimal subject shape consumed by resolveView + canSee.
  const base = {
    id: 's1',
    name: 'Subject',
    alias: 'sub',
    visMode: 'photo',
    privacy: { matrix: defaultMatrix(), temp: {} },
  };
  return { ...base, ...overrides, privacy: { ...base.privacy, ...(overrides.privacy || {}) } };
}

function makeViewer(overrides = {}) {
  const base = DEFAULT_PROFILE();
  base.visMatchGate = 0;
  return { ...base, ...overrides };
}

function pctRange(step = 0.05) {
  const out = [];
  for (let p = 0; p <= 1 + 1e-9; p += step) out.push(Math.round(p * 1000) / 1000);
  return out;
}

describe('resolveView — shape contract', () => {
  test('returns the expected fields and a known shows value', () => {
    const v = makeViewer();
    const s = makeSubject({ visMode: 'photo' });
    const r = resolveView(v, s, 0.5, { reveals: {}, theirReveal: false });
    assert.ok(r && typeof r === 'object');
    for (const k of ['shows', 'mutual', 'gated', 'reasons', 'modeKey']) {
      assert.ok(k in r, `expected key ${k}`);
    }
    assert.ok(SHOWS.has(r.shows), `shows must be one of ${[...SHOWS].join(',')}; got ${r.shows}`);
    assert.ok(Array.isArray(r.reasons));
    assert.equal(typeof r.mutual, 'boolean');
    assert.equal(typeof r.gated, 'boolean');
    assert.equal(typeof r.modeKey, 'string');
  });
});

describe('Phase-5 dignity invariants — match% cannot elevate', () => {
  const modes = ['reveal', 'hybrid', 'photo', 'glance', 'avatar'];
  const pcts = pctRange(0.05);

  test('no mode + no mutual ever produces shows="reveal" across the matchPct sweep', () => {
    const v = makeViewer();
    for (const mode of modes) {
      for (const pct of pcts) {
        const s = makeSubject({ visMode: mode });
        const r = resolveView(v, s, pct, { reveals: {}, theirReveal: false, muted: false });
        assert.notEqual(r.shows, 'reveal',
          `mode=${mode} pct=${pct} unexpectedly produced 'reveal'`);
      }
    }
  });

  test("'hybrid' without mutual collapses to 'avatar' across the sweep", () => {
    const v = makeViewer();
    for (const pct of pcts) {
      const s = makeSubject({ visMode: 'hybrid' });
      const r = resolveView(v, s, pct, { reveals: {}, theirReveal: false });
      assert.equal(r.shows, 'avatar', `hybrid no-mutual pct=${pct}`);
    }
  });

  test("'reveal' without mutual collapses to 'avatar' across the sweep", () => {
    const v = makeViewer();
    for (const pct of pcts) {
      const s = makeSubject({ visMode: 'reveal' });
      const r = resolveView(v, s, pct, { reveals: {}, theirReveal: false });
      assert.equal(r.shows, 'avatar', `reveal-mode no-mutual pct=${pct}`);
    }
  });

  test("'photo' without mutual stays 'photo' across the sweep (no privacy restrictions, no zone)", () => {
    // Use an open matrix so the privacy ceiling does not downgrade.
    const v = makeViewer();
    for (const pct of pcts) {
      const s = makeSubject({
        visMode: 'photo',
        privacy: { matrix: { ...defaultMatrix(), showPhoto: 'anyone', showOnFloor: 'anyone' }, temp: {} },
      });
      const r = resolveView(v, s, pct, { reveals: {}, theirReveal: false });
      assert.equal(r.shows, 'photo', `photo pct=${pct}`);
    }
  });

  test("'avatar' mode always shows 'avatar' across the sweep", () => {
    const v = makeViewer();
    for (const pct of pcts) {
      const s = makeSubject({ visMode: 'avatar' });
      const r = resolveView(v, s, pct, { reveals: {}, theirReveal: false });
      assert.equal(r.shows, 'avatar', `avatar pct=${pct}`);
    }
  });

  test("'hidden' mode is absolute — always shows 'hidden' across the sweep", () => {
    const v = makeViewer();
    for (const pct of pcts) {
      const s = makeSubject({ visMode: 'hidden' });
      const r = resolveView(v, s, pct, { reveals: { s1: Date.now() }, theirReveal: true });
      assert.equal(r.shows, 'hidden', `hidden pct=${pct}`);
    }
  });
});

describe('Mutual handshake unlocks reveal', () => {
  test('mutual + not muted + not hidden → shows=reveal for any matchPct', () => {
    const v = makeViewer();
    for (const pct of pctRange(0.05)) {
      const s = makeSubject({
        visMode: 'reveal',
        // Open matrix so privacy ceiling does not downgrade reveal.
        privacy: { matrix: { ...defaultMatrix(), showPhoto: 'anyone', showOnFloor: 'anyone' }, temp: {} },
      });
      const r = resolveView(v, s, pct, {
        reveals: { s1: Date.now() },
        theirReveal: true,
        muted: false,
      });
      assert.equal(r.shows, 'reveal', `mutual handshake should reveal at pct=${pct}`);
      assert.equal(r.mutual, true);
    }
  });
});

describe('Adversarial — reveal attempted without mutual consent', () => {
  test('(a) viewer flagged but theirReveal absent → never reveal', () => {
    const v = makeViewer();
    const s = makeSubject({ visMode: 'reveal' });
    const r = resolveView(v, s, 0.9, { reveals: { s1: Date.now() }, theirReveal: false });
    assert.notEqual(r.shows, 'reveal');
  });

  test('(b) theirReveal set but viewer has not flagged → never reveal', () => {
    const v = makeViewer();
    const s = makeSubject({ visMode: 'reveal' });
    const r = resolveView(v, s, 0.9, { reveals: {}, theirReveal: true });
    assert.notEqual(r.shows, 'reveal');
  });

  test('(c) wrong subject id in reveals → never reveal', () => {
    const v = makeViewer();
    const s = makeSubject({ id: 's1', visMode: 'reveal' });
    const r = resolveView(v, s, 0.9, { reveals: { 'other-id': Date.now() }, theirReveal: true });
    assert.notEqual(r.shows, 'reveal');
  });
});

describe('Muted always wins', () => {
  test('muted ctx → hidden regardless of any other state', () => {
    const v = makeViewer();
    const s = makeSubject({ visMode: 'photo' });
    const r = resolveView(v, s, 0.99, {
      reveals: { s1: Date.now() },
      theirReveal: true,
      muted: true,
    });
    assert.equal(r.shows, 'hidden');
    assert.ok(r.reasons.includes('muted'));
  });
});

describe('Self-simplify is downward only', () => {
  test('visMatchGate=0.5: pct=0.3 + photo mode → avatar + gated=true', () => {
    const v = makeViewer({ visMatchGate: 0.5 });
    const s = makeSubject({ visMode: 'photo' });
    const r = resolveView(v, s, 0.3, { reveals: {}, theirReveal: false });
    assert.equal(r.shows, 'avatar');
    assert.equal(r.gated, true);
  });

  test('visMatchGate=0.5: pct=0.7 + photo mode → photo', () => {
    const v = makeViewer({ visMatchGate: 0.5 });
    const s = makeSubject({
      visMode: 'photo',
      privacy: { matrix: { ...defaultMatrix(), showPhoto: 'anyone', showOnFloor: 'anyone' }, temp: {} },
    });
    const r = resolveView(v, s, 0.7, { reveals: {}, theirReveal: false });
    assert.equal(r.shows, 'photo');
    assert.equal(r.gated, false);
  });

  test('gate=0, pct=0.95, avatar mode → avatar (no upward elevation)', () => {
    const v = makeViewer({ visMatchGate: 0 });
    const s = makeSubject({ visMode: 'avatar' });
    const r = resolveView(v, s, 0.95, { reveals: {}, theirReveal: false });
    assert.equal(r.shows, 'avatar');
  });
});

describe('Privacy matrix integration — showPhoto ceiling', () => {
  test('mutual + photo mode + showPhoto=nobody + no zone → avatar (privacy:showPhoto in reasons)', () => {
    const v = makeViewer();
    const s = makeSubject({
      visMode: 'photo',
      privacy: { matrix: { ...defaultMatrix(), showPhoto: 'nobody', showOnFloor: 'same_room' }, temp: {} },
    });
    const r = resolveView(v, s, 0.8, { reveals: { s1: Date.now() }, theirReveal: true });
    // mutual would otherwise produce 'reveal' → privacy downgrades; no zoneKey → falls to avatar.
    assert.equal(r.shows, 'avatar');
    assert.ok(r.reasons.includes('privacy:showPhoto'),
      `expected reasons to include 'privacy:showPhoto'; got ${JSON.stringify(r.reasons)}`);
  });

  test('mutual + photo mode + showPhoto=nobody → avatar even when on the floor', () => {
    // showPhoto=nobody forbids photo-derived views entirely. The engine's
    // two-stage downgrade first drops reveal/photo to glance (a blurred hint),
    // then collapses that glance to avatar — because a glance is itself a
    // blurred photo, and showPhoto=nobody denies it. This is the more
    // privacy-protective resolution and is the preserved v18 semantics: the
    // subject's "no photo" wins over the viewer's mutual-reveal handshake.
    const v = makeViewer();
    const s = makeSubject({
      visMode: 'photo',
      privacy: { matrix: { ...defaultMatrix(), showPhoto: 'nobody', showOnFloor: 'anyone' }, temp: {} },
    });
    const r = resolveView(v, s, 0.8, {
      reveals: { s1: Date.now() },
      theirReveal: true,
      zoneKey: 'reach',
    });
    assert.equal(r.shows, 'avatar');
    assert.ok(r.reasons.includes('privacy:showPhoto'));
  });
});

describe('sweepExpiredReveals', () => {
  test('fresh entry (within TTL) survives', () => {
    const now = 1_000_000;
    const reveals = { a: now - 1000 };
    const out = sweepExpiredReveals(reveals, REVEAL_GRANT_TTL_MS, now);
    assert.deepEqual(out.reveals, { a: now - 1000 });
    assert.equal(out.removed, 0);
    assert.equal(out.remaining, 1);
  });

  test('stale entry (past TTL) is removed', () => {
    const now = 10_000_000;
    const reveals = { a: now - (REVEAL_GRANT_TTL_MS + 1) };
    const out = sweepExpiredReveals(reveals, REVEAL_GRANT_TTL_MS, now);
    assert.deepEqual(out.reveals, {});
    assert.equal(out.removed, 1);
    assert.equal(out.remaining, 0);
  });

  test('malformed (non-numeric) entries are removed', () => {
    const now = 1_000_000;
    const reveals = { a: 'oops', b: null, c: undefined, d: now };
    const out = sweepExpiredReveals(reveals, REVEAL_GRANT_TTL_MS, now);
    assert.deepEqual(out.reveals, { d: now });
    assert.equal(out.removed, 3);
    assert.equal(out.remaining, 1);
  });

  test('null/undefined input does not crash', () => {
    const a = sweepExpiredReveals(null);
    const b = sweepExpiredReveals(undefined);
    assert.deepEqual(a.reveals, {});
    assert.equal(a.removed, 0);
    assert.equal(a.remaining, 0);
    assert.deepEqual(b.reveals, {});
  });

  test('conservation: removed + remaining = input count', () => {
    const now = 5_000_000;
    const reveals = {
      fresh1: now - 100,
      fresh2: now - 200,
      stale1: now - (REVEAL_GRANT_TTL_MS + 5),
      bad1: 'x',
      bad2: NaN,
    };
    const inputCount = Object.keys(reveals).length;
    const out = sweepExpiredReveals(reveals, REVEAL_GRANT_TTL_MS, now);
    assert.equal(out.removed + out.remaining, inputCount);
  });
});

describe('revealGrantRemainingMs', () => {
  test('fresh grant returns positive ms', () => {
    const now = 1_000_000;
    const ms = revealGrantRemainingMs(now - 1000, REVEAL_GRANT_TTL_MS, now);
    assert.ok(ms > 0, `expected positive, got ${ms}`);
    assert.equal(ms, REVEAL_GRANT_TTL_MS - 1000);
  });

  test('stale grant returns 0', () => {
    const now = 10_000_000;
    const ms = revealGrantRemainingMs(now - (REVEAL_GRANT_TTL_MS + 5000), REVEAL_GRANT_TTL_MS, now);
    assert.equal(ms, 0);
  });

  test('ts=0 returns 0', () => {
    assert.equal(revealGrantRemainingMs(0), 0);
  });

  test('non-numeric ts returns 0', () => {
    assert.equal(revealGrantRemainingMs('nope'), 0);
    assert.equal(revealGrantRemainingMs(null), 0);
    assert.equal(revealGrantRemainingMs(undefined), 0);
    assert.equal(revealGrantRemainingMs(NaN), 0);
  });

  test('never returns negative', () => {
    const now = 1_000_000;
    for (const offset of [-1, 0, 1, 1000, REVEAL_GRANT_TTL_MS, REVEAL_GRANT_TTL_MS + 1, REVEAL_GRANT_TTL_MS * 2]) {
      const ts = now - offset;
      const ms = revealGrantRemainingMs(ts, REVEAL_GRANT_TTL_MS, now);
      assert.ok(ms >= 0, `offset=${offset} produced negative ms=${ms}`);
    }
  });
});

describe('REVEAL_GRANT_TTL_MS sanity', () => {
  test('positive finite number', () => {
    assert.equal(typeof REVEAL_GRANT_TTL_MS, 'number');
    assert.ok(Number.isFinite(REVEAL_GRANT_TTL_MS));
    assert.ok(REVEAL_GRANT_TTL_MS > 0);
  });
});

describe('modeMeta lookup', () => {
  test('returns the catalog entry for each known mode', () => {
    for (const m of VIS_MODES) {
      const meta = modeMeta(m.key);
      assert.ok(meta, `expected meta for ${m.key}`);
      assert.equal(meta.key, m.key);
    }
  });
});
