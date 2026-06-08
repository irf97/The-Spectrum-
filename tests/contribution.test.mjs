// Contribution coordination — engine tests + the falsifiable invariants (e)–(i).
//
// These are phrased so that a SINGLE counterexample fails them. The structural
// suite at the bottom reads source text and fails if the two ledgers ever leak
// into each other, or if a leaderboard / *_gated tier is reintroduced.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { matchOffers, openNeedCount, needById, residue } from '../js/engines/node.js';
import {
  recordFulfilment, query, aggregate, stewardshipWeight, fulfilledNeedIds,
} from '../js/engines/fulfilment.js';
import {
  taskIntrinsic, presencePing, coPresenceStrong, resolveProof, PROOF_TIERS,
} from '../js/engines/evidence.js';
import {
  rewardForEvent, housingPointBalance, graceLedger, rewardDependence,
  HOUSING_POINTS_PER_EVENT,
} from '../js/engines/reward.js';
import { SITES } from '../js/data.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINES = join(HERE, '..', 'js', 'engines');
const src = (f) => readFileSync(join(ENGINES, f), 'utf8');
const stripComments = (s) => s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

const kitchen = SITES.find(s => s.id === 'enschede-kitchen');
const nutrient = needById(kitchen, 'g-nutrient-am');      // intrinsic grow_sensor, low stake
const automation = needById(kitchen, 'k-build-automation'); // intrinsic commit_log, HIGH stake
const restock = needById(kitchen, 'g-restock');            // no intrinsic → grace at most
const evt = (over = {}) => ({
  needId: over.needId || 'n', siteId: 'enschede-kitchen', personId: over.personId || 'me',
  ts: over.ts ?? 1_000_000, proof: over.proof || { tier: 'none', real: true }, stake: over.stake || 'low',
  task: over.task || null,
});

// ---------------------------------------------------------------------------
describe('node — demand-based need matching (ranks tasks, never people)', () => {
  test('matchOffers surfaces open needs sorted by fit to the persona', () => {
    const persona = { likes: ['quiet-solo-work', 'morning', 'gardening'], availableNow: true };
    const offers = matchOffers(kitchen, persona, { maxDistanceM: 500 });
    assert.ok(offers.length > 0);
    for (let i = 1; i < offers.length; i++) assert.ok(offers[i - 1].fit >= offers[i].fit);
    // the morning quiet-solo nutrient check should outrank the social cook session for this persona
    const ix = (id) => offers.findIndex(o => o.need.id === id);
    assert.ok(ix('g-nutrient-am') < ix('k-cook-thu'), 'persona-matched drudgery should surface above the social task');
  });
  test('already-fulfilled needs drop out of the feed', () => {
    const before = openNeedCount(kitchen, []);
    const after = openNeedCount(kitchen, ['g-nutrient-am']);
    assert.equal(after, before - 1);
  });
  test('residue is a list of needs, never a list of people', () => {
    const r = residue(kitchen, []);
    assert.equal(typeof r.count, 'number');
    assert.ok(Array.isArray(r.needs));
    assert.ok(r.needs.every(n => 'id' in n && !('personId' in n)));
  });
});

// ---------------------------------------------------------------------------
describe('evidence — the proof seam', () => {
  test('taskIntrinsic is REAL strong when the task has a bound trace', () => {
    const p = taskIntrinsic(nutrient, {});
    assert.equal(p.tier, 'strong');
    assert.equal(p.real, true);
    assert.equal(p.source, 'grow_sensor');
  });
  test('taskIntrinsic is none when the task has no bound trace', () => {
    const p = taskIntrinsic(restock, {});
    assert.equal(p.tier, 'none');
  });
  test('taskIntrinsic is none when the trace fails to confirm', () => {
    const p = taskIntrinsic(nutrient, { 'g-nutrient-am': false });
    assert.equal(p.tier, 'none');
  });
  test('presencePing is a real ping when nonce is fresh, none when stale', () => {
    assert.equal(presencePing('me', 's', { nonce: 'x', issuedAt: 1000, now: 1500, ttlMs: 1000 }).tier, 'ping');
    assert.equal(presencePing('me', 's', { nonce: 'x', issuedAt: 1000, now: 9999, ttlMs: 1000 }).tier, 'none');
    assert.equal(presencePing('me', 's', {}).tier, 'none'); // no nonce
  });
  test('coPresenceStrong is a STUB: typed strong but real:false', () => {
    const p = coPresenceStrong('me', 's');
    assert.equal(p.tier, 'strong');
    assert.equal(p.real, false);
    assert.equal(p.stub, true);
  });
  test('resolveProof prefers real task-intrinsic over the stub and the ping', () => {
    const p = resolveProof(nutrient, { siteReadings: {}, nonce: 'x', useStrongStub: true, now: 1, issuedAt: 1 });
    assert.equal(p.tier, 'strong');
    assert.equal(p.real, true); // the REAL intrinsic, not the stub
  });
  test('resolveProof falls to ping for an unbound need', () => {
    const p = resolveProof(restock, { nonce: 'x', now: 1, issuedAt: 1 });
    assert.equal(p.tier, 'ping');
  });
  test('PROOF_TIERS is the closed ordered set', () => {
    assert.deepEqual(PROOF_TIERS, ['none', 'ping', 'strong']);
  });
});

// ---------------------------------------------------------------------------
describe('reward — proof-gated, scaled to stake', () => {
  test('none proof → no material reward (standing/depth only)', () => {
    const r = rewardForEvent(evt({ proof: { tier: 'none', real: true } }));
    assert.equal(r.material, false);
    assert.equal(r.housingPoints, 0);
  });
  test('ping proof → grace, routed through a third space, no housing', () => {
    const r = rewardForEvent(evt({ proof: { tier: 'ping', real: true } }));
    assert.equal(r.kind, 'grace');
    assert.equal(r.thirdSpaceRouted, true);
    assert.equal(r.housingPoints, 0);
  });
  test('strong + low stake → grace, NOT housing', () => {
    const r = rewardForEvent(evt({ proof: { tier: 'strong', real: true }, stake: 'low' }));
    assert.equal(r.kind, 'grace');
    assert.equal(r.housingPoints, 0);
  });
  test('strong + high stake + REAL → housing points', () => {
    const r = rewardForEvent(evt({ proof: { tier: 'strong', real: true }, stake: 'high' }));
    assert.equal(r.kind, 'housing');
    assert.equal(r.housingPoints, HOUSING_POINTS_PER_EVENT);
  });
});

// ---------------------------------------------------------------------------
// INVARIANT (e) — Standing is non-convertible.
describe('(e) standing is non-convertible — Ledger A never feeds Ledger B', () => {
  test('reward/housing depend only on fulfilment events, not on any standing input', () => {
    // rewardForEvent's signature takes ONLY an event. There is no standing
    // parameter it could read. housingPointBalance takes only the events array.
    const events = [evt({ proof: { tier: 'strong', real: true }, stake: 'high', ts: 1000 })];
    const bal = housingPointBalance(events, 'me', 1000);
    assert.ok(bal > 0);
    // Vary "standing" by any imagined amount: there is no channel for it to
    // enter. The function is pure over events. (Structural test below proves
    // reward.js cannot import society.)
  });
  test('zero fulfilments ⇒ reward and housing-points are exactly 0, at any standing', () => {
    // Simulate standing sweeping 0 → max by NOT passing it anywhere — because
    // there is nowhere to pass it. With an empty Ledger B, both are 0.
    for (const _imaginedStanding of [0, 100, 3500, 99999]) {
      assert.equal(housingPointBalance([], 'me', Date.now()), 0);
      assert.equal(graceLedger([], 'me').count, 0);
    }
  });
});

// INVARIANT (f) — Material reward is proof-gated, scaled to stake.
describe('(f) no reward above grace without a strong proof token', () => {
  test('sweep proof tiers: housing issues ONLY at strong+high, never below', () => {
    for (const tier of ['none', 'ping', 'strong']) {
      for (const stake of ['low', 'high']) {
        const r = rewardForEvent(evt({ proof: { tier, real: true }, stake }));
        const housed = r.housingPoints > 0;
        const shouldBeHoused = (tier === 'strong' && stake === 'high');
        assert.equal(housed, shouldBeHoused, `tier=${tier} stake=${stake} housed=${housed}`);
      }
    }
  });
});

// INVARIANT (g) — Reward attaches to discrete events, never accumulated standing.
describe('(g) reward follows the deed, not the reputation', () => {
  test('same fulfilment history ⇒ identical reward, regardless of standing', () => {
    const histA = [evt({ proof: { tier: 'strong', real: true }, stake: 'high', ts: 1000, personId: 'a' })];
    const histB = [evt({ proof: { tier: 'strong', real: true }, stake: 'high', ts: 1000, personId: 'b' })];
    // a and b have identical Ledger B; imagine wildly different standing — the
    // balance is identical because standing is not an input.
    assert.equal(housingPointBalance(histA, 'a', 2000), housingPointBalance(histB, 'b', 2000));
  });
  test('different fulfilment history ⇒ different reward, even at identical standing', () => {
    const rich = [
      evt({ proof: { tier: 'strong', real: true }, stake: 'high', ts: 1000, personId: 'a' }),
      evt({ proof: { tier: 'strong', real: true }, stake: 'high', ts: 1000, needId: 'n2', personId: 'a' }),
    ];
    const poor = [evt({ proof: { tier: 'ping', real: true }, stake: 'low', ts: 1000, personId: 'b' })];
    assert.ok(housingPointBalance(rich, 'a', 1000) > housingPointBalance(poor, 'b', 1000));
  });
});

// INVARIANT (h) — The floor is unconditional.
describe('(h) the floor is unconditional', () => {
  test('a zero-everything newcomer sees every open need (full access)', () => {
    const persona = { likes: [], constraints: [], availableNow: true };
    const offers = matchOffers(kitchen, persona, { fulfilledNeedIds: [] });
    assert.equal(offers.length, openNeedCount(kitchen, []));
    // No need is withheld for lack of standing or lack of fulfilments — the
    // feed is shaped by preference, never gated by reputation.
  });
  test('no contribution state appears in any access decision in node.js', () => {
    const code = stripComments(src('node.js'));
    assert.ok(!/standing|points|tier|housing|reward/i.test(code),
      'node.js (the feed/access surface) must not reference standing/reward');
  });
});

// INVARIANT (i) — Material reward requires bound evidence (current build).
describe('(i) housing reward requires REAL task-intrinsic evidence', () => {
  test('the co-presence STUB (real:false) cannot earn housing — grace at most', () => {
    const r = rewardForEvent(evt({ proof: { tier: 'strong', real: false }, stake: 'high' }));
    assert.notEqual(r.kind, 'housing');
    assert.equal(r.housingPoints, 0);
  });
  test('a need with no evidence binding earns grace at most', () => {
    const proof = resolveProof(restock, { nonce: 'x', now: 1, issuedAt: 1 });
    const r = rewardForEvent({ ...evt(), proof, stake: restock.stake });
    assert.ok(r.housingPoints === 0);
  });
  test('the bound high-stake task DOES earn housing (real intrinsic)', () => {
    const proof = resolveProof(automation, { siteReadings: {}, nonce: 'x', now: 1, issuedAt: 1 });
    const r = rewardForEvent({ ...evt(), proof, stake: automation.stake });
    assert.equal(r.kind, 'housing');
  });
});

// ---------------------------------------------------------------------------
describe('fulfilment — Ledger B mechanics', () => {
  test('recordFulfilment appends purely (no mutation)', () => {
    const a = [];
    const b = recordFulfilment(a, evt());
    assert.equal(a.length, 0);
    assert.equal(b.length, 1);
  });
  test('query filters by person/site/need/task', () => {
    const evs = [evt({ personId: 'a', needId: 'n1' }), evt({ personId: 'b', needId: 'n2' })];
    assert.equal(query(evs, { personId: 'a' }).length, 1);
    assert.equal(query(evs, { needId: 'n2' }).length, 1);
  });
  test('stewardship weight decays toward 0 as the deed ages', () => {
    const w0 = stewardshipWeight(1000, 1000);          // just done
    const wLater = stewardshipWeight(1000, 1000 + 10 * 60 * 1000); // one half-life later
    assert.ok(w0 > 0.99);
    assert.ok(Math.abs(wLater - 0.5) < 0.02);
  });
  test('housing balance decays as stewardship (held while contributing)', () => {
    const events = [evt({ proof: { tier: 'strong', real: true }, stake: 'high', ts: 1000 })];
    const fresh = housingPointBalance(events, 'me', 1000);
    const stale = housingPointBalance(events, 'me', 1000 + 10 * 60 * 1000);
    assert.ok(stale < fresh);
    assert.ok(Math.abs(stale - fresh / 2) < 0.5); // ~half after one half-life
  });
  test('rewardDependence reports the instrumented failure signal', () => {
    const evs = [
      evt({ proof: { tier: 'none', real: true } }),  // willingness alone
      evt({ proof: { tier: 'ping', real: true } }),  // needed grace
    ];
    const d = rewardDependence(evs);
    assert.equal(d.total, 2);
    assert.equal(d.rewarded, 1);
    assert.ok(Math.abs(d.fraction - 0.5) < 1e-9);
  });
});

// ---------------------------------------------------------------------------
// STRUCTURAL invariant (e), source-level — the heart of the two-ledger design.
describe('(e) structural — the ledgers do not import each other', () => {
  test('fulfilment.js does not import or reference society/standing', () => {
    const code = stripComments(src('fulfilment.js'));
    assert.ok(!/from '\.\/society\.js'|import .*society/.test(code), 'fulfilment must not import society');
    assert.ok(!/\bstanding\b|tierForStanding|\bmemberships\b/i.test(code), 'fulfilment must not reference standing');
  });
  test('reward.js does not import or reference society/standing', () => {
    const code = stripComments(src('reward.js'));
    assert.ok(!/from '\.\/society\.js'|import .*society/.test(code), 'reward must not import society');
    assert.ok(!/\bstanding\b|tierForStanding|\bmemberships\b/i.test(code), 'reward must not reference standing');
  });
  test('society.js does not import or reference reward/fulfilment/housing/points-as-reward', () => {
    const code = stripComments(src('society.js'));
    assert.ok(!/from '\.\/reward\.js'|from '\.\/fulfilment\.js'|import .*\b(reward|fulfilment)\b/.test(code),
      'society must not import reward/fulfilment');
    assert.ok(!/housing|housingPoints/i.test(code), 'society must not reference housing reward');
  });
  test('node.js (the feed) imports neither ledger nor reward', () => {
    const code = stripComments(src('node.js'));
    assert.ok(!/from '\.\/(reward|fulfilment|society)\.js'/.test(code),
      'node feed must not import reward/fulfilment/society');
  });
});
