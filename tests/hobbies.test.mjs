// Phase 7 — engine tests: hobbies (v18).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  rankFor, rankIndex, hobbyMeta, sharedKeys,
  relationForHobby, relate, compatibility,
} from '../js/engines/hobbies.js';
import { SKILL_RANKS, HOBBY_CATALOG, SAMPLE_PEOPLE } from '../js/data.js';

describe('rankFor — boundaries', () => {
  for (const r of SKILL_RANKS) {
    test(`min ${r.min} → ${r.key}`, () => assert.equal(rankFor(r.min).key, r.key));
    test(`max ${r.max} → ${r.key}`, () => assert.equal(rankFor(r.max).key, r.key));
  }
  test('defensive: 0/negative/NaN/undefined → lowest rank', () => {
    assert.equal(rankFor(0).key, SKILL_RANKS[0].key);
    assert.equal(rankFor(-5).key, SKILL_RANKS[0].key);
    assert.equal(rankFor(NaN).key, SKILL_RANKS[0].key);
    assert.equal(rankFor(undefined).key, SKILL_RANKS[0].key);
  });
});

describe('rankIndex parity with rankFor', () => {
  test('every skill maps consistently', () => {
    for (let s = 1; s <= 100; s++) {
      assert.equal(SKILL_RANKS[rankIndex(s)].key, rankFor(s).key);
    }
  });
});

describe('hobbyMeta', () => {
  test('known keys resolve', () => {
    for (const h of HOBBY_CATALOG) assert.equal(hobbyMeta(h.key).key, h.key);
  });
  test('unknown key → undefined (not null)', () => {
    assert.equal(hobbyMeta('nope'), undefined);
  });
});

describe('sharedKeys', () => {
  test('intersection ordered by the second arg', () => {
    const self = [{ key: 'chess' }, { key: 'piano' }, { key: 'coding' }];
    const other = [{ key: 'coding' }, { key: 'chess' }, { key: 'yoga' }];
    assert.deepEqual(sharedKeys(self, other), ['coding', 'chess']);
  });
  test('empty / null inputs → []', () => {
    assert.deepEqual(sharedKeys([], []), []);
    assert.deepEqual(sharedKeys(null, null), []);
    assert.deepEqual(sharedKeys([{ key: 'a' }], null), []);
  });
});

describe('relationForHobby — every kind', () => {
  test('different keys → null', () => {
    assert.equal(relationForHobby({ key: 'a', skill: 50, role: 'teacher' }, { key: 'b', skill: 20, role: 'peers' }), null);
  });
  test('self looking for teacher + gap>=1 + other open → teacher-for-self', () => {
    const r = relationForHobby({ key: 'chess', skill: 20, role: 'teacher' }, { key: 'chess', skill: 64, role: 'practicing' });
    assert.equal(r.kind, 'teacher-for-self');
    assert.ok(r.strength > 0 && r.strength <= 1);
  });
  test('self looking for student + gap<=-1 + other open → student-for-self', () => {
    const r = relationForHobby({ key: 'chess', skill: 80, role: 'student' }, { key: 'chess', skill: 30, role: 'peers' });
    assert.equal(r.kind, 'student-for-self');
  });
  test('no role + big positive gap + other open → teacher-for-self (fallback)', () => {
    const r = relationForHobby({ key: 'chess', skill: 10, role: 'practicing' }, { key: 'chess', skill: 95, role: 'peers' });
    assert.equal(r.kind, 'teacher-for-self');
  });
  test('peers within ±1 rank', () => {
    const r = relationForHobby({ key: 'chess', skill: 55, role: 'peers' }, { key: 'chess', skill: 60, role: 'peers' });
    assert.equal(r.kind, 'peer');
  });
  test('big gap with neither open → mismatch', () => {
    const r = relationForHobby({ key: 'chess', skill: 10, role: 'practicing' }, { key: 'chess', skill: 95, role: 'teacher' });
    assert.equal(r.kind, 'mismatch');
    assert.ok(r.strength <= 0.2);
  });
});

describe('relate — composite', () => {
  test('returns headline/teacher/student/peers/all; all sorted by strength', () => {
    const self = [{ key: 'chess', skill: 20, role: 'teacher' }, { key: 'piano', skill: 55, role: 'peers' }];
    const other = [{ key: 'chess', skill: 80, role: 'practicing' }, { key: 'piano', skill: 60, role: 'peers' }];
    const r = relate(self, other);
    assert.ok(Array.isArray(r.all));
    for (let i = 1; i < r.all.length; i++) assert.ok(r.all[i - 1].strength >= r.all[i].strength);
    assert.equal(r.headline, r.all[0] || null);
  });
  test('defensive: relate(null,null) → empty composite', () => {
    const r = relate(null, null);
    assert.deepEqual(r.all, []);
    assert.equal(r.headline, null);
  });
});

describe('compatibility', () => {
  test('no shared hobbies → 0', () => {
    assert.equal(compatibility([{ key: 'a', skill: 50, role: 'peers' }], [{ key: 'b', skill: 50, role: 'peers' }]), 0);
  });
  test('always in [0,1]', () => {
    const self = [{ key: 'chess', skill: 20, role: 'teacher' }, { key: 'piano', skill: 50, role: 'peers' }];
    const other = [{ key: 'chess', skill: 80, role: 'practicing' }, { key: 'piano', skill: 55, role: 'peers' }];
    const c = compatibility(self, other);
    assert.ok(c >= 0 && c <= 1);
  });
});

describe('SAMPLE_PEOPLE smoke', () => {
  test('p1 surfaces as teacher-for-self in climbing when self wants a teacher', () => {
    const p1 = SAMPLE_PEOPLE.find(p => p.id === 'p1');
    const r = relate([{ key: 'climbing', skill: 20, role: 'teacher' }], p1.hobbies);
    assert.equal((r.teacher || {}).hobby, 'climbing');
  });
});

describe('adversarial framing', () => {
  // The engine reads STATED skill, not verified skill. Verification of a
  // claimed skill is a presence/proof concern, not a hobby-engine one — the
  // engine deliberately trusts the declared number.
  test('a claimed grandmaster is treated as one (declared, not verified)', () => {
    const r = relationForHobby({ key: 'chess', skill: 10, role: 'teacher' }, { key: 'chess', skill: 100, role: 'practicing' });
    assert.equal(r.kind, 'teacher-for-self');
  });
});
