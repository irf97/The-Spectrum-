// Local-first store with LocalStorage persistence and a 1-second simulation tick.
// State is intentionally thin — engines do all logic.

import {
  DEFAULT_PROFILE, SAMPLE_PEOPLE, SOCIETIES, SITES, defaultMatrix, PRIVACY_AXES,
  DEFAULT_DATING_PERSONA, DEFAULT_NETWORKING_PERSONA, PERSONA_PRESETS
} from './data.js';
import { decayPerTick, reachingFractionFromLast, REACHING_WINDOW_MS } from './engines/rapport.js';
import { sweepExpiredReveals, REVEAL_GRANT_TTL_MS } from './engines/identity.js';
import { contributionMeta } from './engines/society.js';
import { needById } from './engines/node.js';
import { recordFulfilment, fulfilledNeedIds } from './engines/fulfilment.js';
import { resolveProof } from './engines/evidence.js';
import { bus, clamp, uid } from './util.js';

// Ledger A and Ledger B never read each other. The store is the only place
// where a single user action (fulfilling a need) writes to BOTH — and it does
// so as two independent writes: a standing accrual (Ledger A, society.js,
// depth-only) and a fulfilment event (Ledger B, fulfilment.js, reward-bearing).
// Neither write reads the other ledger. Reward (reward.js) reads only Ledger B.
const ALL_NODES = [...SOCIETIES, ...SITES];

const KEY = 'spectrum:v3';

const blank = () => ({
  profile: DEFAULT_PROFILE(),
  world: {},
  rapport: {},
  // LEDGER A — standing. memberships[nodeId] = { points, lastReachingTs, visits,
  //   contributions:[{ts,kind,delta,note,needId?}], fulfilledNeeds:[needId] }
  //   Held by reaching, decays, depth-only, gates nothing.
  memberships: {},
  // LEDGER B — fulfilled needs. A flat log of discrete, proof-verified events.
  //   [{ needId, siteId, personId, ts, proof:{tier,real,source}, stake, task }]
  //   Bears the material reward. Never derived from Ledger A.
  fulfilments: [],
  reveals: {},
  muted: {},
  ui: {},
  log: [],
  meta: { ticks: 0, lastTick: Date.now() }
});

function ensurePersonaShape(p, fallback) {
  return {
    id: p.id || fallback.id,
    name: p.name || fallback.name,
    avatar: p.avatar || fallback.avatar,
    preset: p.preset || fallback.preset || 'custom',
    roleplay: typeof p.roleplay === 'string' ? p.roleplay : (fallback.roleplay || ''),
    status: p.status || fallback.status,
    visMode: p.visMode || fallback.visMode,
    self: { ...fallback.self, ...(p.self || {}) },
    prefs: {
      ...fallback.prefs,
      ...(p.prefs || {}),
      filters: { ...(fallback.prefs.filters || {}), ...((p.prefs && p.prefs.filters) || {}) },
      weights: { ...(fallback.prefs.weights || {}), ...((p.prefs && p.prefs.weights) || {}) },
      targets: { ...(fallback.prefs.targets || {}), ...((p.prefs && p.prefs.targets) || {}) },
      excluded:{ ...(fallback.prefs.excluded || {}), ...((p.prefs && p.prefs.excluded) || {}) }
    },
    privacyOverrides: { ...(p.privacyOverrides || {}) }
  };
}

function migrate(s) {
  if (!s || typeof s !== 'object') return blank();
  const base = blank();
  const merged = { ...base, ...s, profile: { ...base.profile, ...(s.profile || {}) } };
  const p = merged.profile;

  // v3 → v4: split into me.dating + me.networking, replace `intent` with `modes`.
  if (p.self && !p.dating) {
    p.dating = { self: p.self, prefs: p.prefs || {} };
    delete p.self; delete p.prefs;
  }

  // v4 → v5: wrap each mode's {self, prefs} into personas[]; drop me.modes/me.status.
  const fallbackD = DEFAULT_DATING_PERSONA();
  const fallbackN = DEFAULT_NETWORKING_PERSONA();

  // Legacy status (top-level me.status.{dating,networking}) seeds the default persona.
  const legacyDatingStatus     = p.status?.dating;
  const legacyNetworkingStatus = p.status?.networking;
  // Legacy visMode applied to both default personas.
  const legacyVisMode = p.visMode;

  if (p.dating && !Array.isArray(p.dating.personas)) {
    const seed = ensurePersonaShape({
      id: 'default', name: 'Default',
      avatar: fallbackD.avatar, preset: 'custom',
      status: legacyDatingStatus || fallbackD.status,
      visMode: legacyVisMode || fallbackD.visMode,
      self: p.dating.self, prefs: p.dating.prefs,
      privacyOverrides: {}
    }, fallbackD);
    const enabled = p.modes ? !!p.modes.dating : true;
    p.dating = { enabled, activePersonaId: 'default', personas: [seed] };
  } else if (p.dating) {
    p.dating.personas = (p.dating.personas || [fallbackD]).map(x => ensurePersonaShape(x, fallbackD));
    p.dating.enabled = p.dating.enabled !== false;
    p.dating.activePersonaId = p.dating.activePersonaId || p.dating.personas[0]?.id || 'default';
  } else {
    p.dating = { enabled: true, activePersonaId: 'default', personas: [fallbackD] };
  }

  if (p.networking && !Array.isArray(p.networking.personas)) {
    const seed = ensurePersonaShape({
      id: 'default', name: 'Default',
      avatar: fallbackN.avatar, preset: 'custom',
      status: legacyNetworkingStatus || fallbackN.status,
      visMode: legacyVisMode || fallbackN.visMode,
      self: p.networking.self, prefs: p.networking.prefs,
      privacyOverrides: {}
    }, fallbackN);
    const enabled = p.modes ? !!p.modes.networking : true;
    p.networking = { enabled, activePersonaId: 'default', personas: [seed] };
  } else if (p.networking) {
    p.networking.personas = (p.networking.personas || [fallbackN]).map(x => ensurePersonaShape(x, fallbackN));
    p.networking.enabled = p.networking.enabled !== false;
    p.networking.activePersonaId = p.networking.activePersonaId || p.networking.personas[0]?.id || 'default';
  } else {
    p.networking = { enabled: true, activePersonaId: 'default', personas: [fallbackN] };
  }

  if (!p.mode) {
    if (p.modes?.dating && !p.modes?.networking)      p.mode = 'dating';
    else if (p.modes?.networking && !p.modes?.dating) p.mode = 'networking';
    else                                              p.mode = 'dating';
  }
  if (!p.dating.enabled && !p.networking.enabled) p.dating.enabled = true;
  if (p.mode === 'dating'     && !p.dating.enabled)     p.mode = 'networking';
  if (p.mode === 'networking' && !p.networking.enabled) p.mode = 'dating';

  // Drop legacy top-level fields. visMode and status now live on each persona.
  delete p.modes;
  delete p.status;
  delete p.visMode;
  delete p.intent;

  // Rename legacy gender 'Non-binary' to 'Bisexual' across all personas.
  for (const m of ['dating', 'networking']) {
    for (const persona of p[m].personas) {
      if (persona.self?.gender === 'Non-binary') persona.self.gender = 'Bisexual';
    }
  }

  p.privacy = p.privacy || {};
  p.privacy.matrix = { ...defaultMatrix(), ...(p.privacy.matrix || {}) };
  p.privacy.temp   = p.privacy.temp || {};
  if (typeof p.privacy.hideFromMatchBelow !== 'number') p.privacy.hideFromMatchBelow = 0.25;
  if (!p.privacy.allowSignal) p.privacy.allowSignal = 'ble';

  // v5 → v6: dignity migration.
  // (a) Normalise any persisted 'match_gated' privacy tier values to
  //     'reveal_mutual'. The Phase-5 reconciliation deletes the match_gated
  //     tier; legacy state migrates to stronger consent, not access-by-score.
  // (b) Ensure every rapport entry has a `lastReachingTs` so decay has a
  //     timestamp to read.
  const normalizeTier = (t) => (t === 'match_gated' ? 'reveal_mutual' : t);
  for (const ax of Object.keys(p.privacy.matrix)) {
    p.privacy.matrix[ax] = normalizeTier(p.privacy.matrix[ax]);
  }
  for (const m of ['dating', 'networking']) {
    for (const persona of p[m].personas) {
      const o = persona.privacyOverrides || {};
      for (const ax of Object.keys(o)) o[ax] = normalizeTier(o[ax]);
    }
  }
  if (p.identity?.channels) {
    for (const ch of Object.keys(p.identity.channels)) {
      p.identity.channels[ch] = normalizeTier(p.identity.channels[ch]);
    }
  }
  merged.rapport = merged.rapport || {};
  for (const [, r] of Object.entries(merged.rapport)) {
    if (r && r.lastReachingTs == null) {
      const notes = r.manualNotes || [];
      r.lastReachingTs = notes.length ? notes[notes.length - 1].ts : 0;
    }
  }
  merged.reveals = merged.reveals || {};
  merged.ui = merged.ui || {};
  // Phase 6 — per-society memberships (Ledger A). Default to empty; the user
  // accrues standing only through explicit contribution. _ensureMemberships
  // seeds empty records for each known node so the screen has rows to render.
  merged.memberships = merged.memberships || {};
  // Contribution pilot — Ledger B fulfilment log. Append-only event record.
  merged.fulfilments = Array.isArray(merged.fulfilments) ? merged.fulfilments : [];
  // Migrate older profiles that pre-date the contribution persona.
  if (merged.profile && !merged.profile.contribution) {
    merged.profile.contribution = { likes: [], constraints: [], availableNow: true };
  }
  return merged;
}

class Store {
  constructor() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { raw = null; }
    this.s = migrate(raw);
    this._ensureWorld();
    this._tickHandle = null;
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch {} bus.emit('state:changed'); }
  reset() { this.s = blank(); this._ensureWorld(); this.save(); }
  get profile() { return this.s.profile; }
  set profile(p) { this.s.profile = p; this.save(); }
  get world()   { return this.s.world; }
  get rapport() { return this.s.rapport; }
  get reveals() { return this.s.reveals; }
  get muted()   { return this.s.muted; }
  get ui()      { return this.s.ui ||= {}; }
  get log()     { return this.s.log; }
  setProfile(patch) { this.s.profile = { ...this.s.profile, ...patch }; this.save(); }

  // ---------- Mode + persona helpers --------------------------------------

  get mode() { return this.s.profile.mode || 'dating'; }

  setMode(m) {
    if (m !== 'dating' && m !== 'networking') return;
    const block = this.s.profile[m];
    if (!block?.enabled) return;
    this.s.profile.mode = m;
    this.save();
  }
  toggleMode() {
    const next = this.mode === 'dating' ? 'networking' : 'dating';
    this.setMode(next);
  }

  setEnabled(modeKey, on) {
    const block = this.s.profile[modeKey];
    if (!block) return;
    if (!on && !this.s.profile[modeKey === 'dating' ? 'networking' : 'dating'].enabled) return; // can't disable both
    block.enabled = !!on;
    if (!on && this.s.profile.mode === modeKey) {
      this.s.profile.mode = modeKey === 'dating' ? 'networking' : 'dating';
    }
    this.save();
  }

  personasFor(modeKey) {
    return this.s.profile[modeKey]?.personas || [];
  }
  activePersonaFor(modeKey) {
    const block = this.s.profile[modeKey];
    if (!block) return null;
    return block.personas.find(p => p.id === block.activePersonaId) || block.personas[0] || null;
  }
  activePersona() { return this.activePersonaFor(this.mode); }

  setActivePersona(modeKey, personaId) {
    const block = this.s.profile[modeKey];
    if (!block) return;
    if (!block.personas.some(p => p.id === personaId)) return;
    block.activePersonaId = personaId;
    this.save();
  }
  cyclePersona(direction = 1) {
    const flat = this.allPersonas();
    if (flat.length <= 1) return;
    const i = flat.findIndex(x => x.mode === this.mode && x.persona.id === this.activePersonaId());
    const j = (i + direction + flat.length) % flat.length;
    this.pickAlterEgo(flat[j].mode, flat[j].persona.id);
  }

  activePersonaId() {
    return this.s.profile[this.mode]?.activePersonaId;
  }

  // Flat list of all alter egos across both modes — what the dropdown shows.
  allPersonas() {
    const out = [];
    for (const m of ['dating', 'networking']) {
      const block = this.s.profile[m];
      if (!block?.personas) continue;
      for (const persona of block.personas) out.push({ mode: m, persona });
    }
    return out;
  }

  // Switch to a specific (mode, persona) — used by the dropdown.
  pickAlterEgo(modeKey, personaId) {
    const block = this.s.profile[modeKey];
    if (!block) return;
    if (!block.personas.some(p => p.id === personaId)) return;
    if (!block.enabled) block.enabled = true;
    block.activePersonaId = personaId;
    this.s.profile.mode = modeKey;
    this.save();
  }

  addPersona(modeKey, name, presetKey = 'custom') {
    const block = this.s.profile[modeKey];
    if (!block) return null;
    const seed = modeKey === 'dating' ? DEFAULT_DATING_PERSONA() : DEFAULT_NETWORKING_PERSONA();
    seed.id = uid();
    seed.name = name || 'New persona';
    seed.preset = presetKey;
    const preset = PERSONA_PRESETS.find(p => p.key === presetKey);
    if (preset) {
      const overlay = preset[modeKey] || {};
      if (overlay.status)   seed.status = overlay.status;
      if (overlay.visMode)  seed.visMode = overlay.visMode;
      if (overlay.overrides) seed.privacyOverrides = { ...overlay.overrides };
    }
    block.personas.push(seed);
    block.activePersonaId = seed.id;
    this.save();
    return seed;
  }

  duplicatePersona(modeKey, personaId) {
    const block = this.s.profile[modeKey];
    if (!block) return null;
    const src = block.personas.find(p => p.id === personaId);
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid();
    copy.name = `${src.name} copy`;
    block.personas.push(copy);
    block.activePersonaId = copy.id;
    this.save();
    return copy;
  }

  updatePersona(modeKey, personaId, patch) {
    const block = this.s.profile[modeKey];
    if (!block) return;
    const i = block.personas.findIndex(p => p.id === personaId);
    if (i < 0) return;
    const cur = block.personas[i];
    block.personas[i] = {
      ...cur,
      ...patch,
      avatar: patch.avatar || cur.avatar,
      self: { ...cur.self, ...(patch.self || {}) },
      prefs: { ...cur.prefs, ...(patch.prefs || {}) },
      privacyOverrides: patch.privacyOverrides ? { ...patch.privacyOverrides } : cur.privacyOverrides
    };
    this.save();
  }

  movePersona(fromMode, personaId, toMode) {
    if (fromMode === toMode) return;
    const src = this.s.profile[fromMode];
    const dst = this.s.profile[toMode];
    if (!src || !dst) return;
    const i = src.personas.findIndex(p => p.id === personaId);
    if (i < 0) return;
    if (src.personas.length <= 1) return; // keep at least one in the source mode
    const [persona] = src.personas.splice(i, 1);
    dst.personas.push(persona);
    if (src.activePersonaId === personaId) src.activePersonaId = src.personas[0].id;
    dst.activePersonaId = persona.id;
    this.s.profile.mode = toMode;
    this.save();
  }

  deletePersona(modeKey, personaId) {
    const block = this.s.profile[modeKey];
    if (!block) return;
    if (block.personas.length <= 1) return; // keep at least one
    const i = block.personas.findIndex(p => p.id === personaId);
    if (i < 0) return;
    block.personas.splice(i, 1);
    if (block.activePersonaId === personaId) {
      block.activePersonaId = block.personas[0].id;
    }
    this.save();
  }

  applyPersonaPreset(modeKey, personaId, presetKey) {
    const preset = PERSONA_PRESETS.find(p => p.key === presetKey);
    if (!preset) return;
    const block = this.s.profile[modeKey];
    const persona = block?.personas.find(p => p.id === personaId);
    if (!persona) return;
    persona.preset = presetKey;
    const overlay = preset[modeKey] || {};
    if (overlay.status)    persona.status = overlay.status;
    if (overlay.visMode)   persona.visMode = overlay.visMode;
    if (overlay.overrides) persona.privacyOverrides = { ...overlay.overrides };
    this.save();
  }

  setPersonaPrivacyOverride(modeKey, personaId, axis, tier) {
    const block = this.s.profile[modeKey];
    const persona = block?.personas.find(p => p.id === personaId);
    if (!persona) return;
    persona.privacyOverrides = { ...(persona.privacyOverrides || {}) };
    if (tier === null || tier === undefined || tier === '') delete persona.privacyOverrides[axis];
    else persona.privacyOverrides[axis] = tier;
    this.save();
  }

  // Cross-route UI state (active tab, last filter, last sort, etc.)
  setUI(key, patch) {
    this.s.ui = this.s.ui || {};
    const cur = this.s.ui[key] || {};
    this.s.ui[key] = { ...cur, ...patch };
    this.save();
  }
  getUI(key, fallback = {}) {
    return { ...fallback, ...((this.s.ui && this.s.ui[key]) || {}) };
  }

  // Privacy matrix helpers ---------------------------------------------------
  setPrivacyAxis(axis, tier) {
    const p = this.s.profile;
    p.privacy = p.privacy || {};
    p.privacy.matrix = { ...(p.privacy.matrix || defaultMatrix()), [axis]: tier };
    if (p.privacy.temp?.[axis]) { delete p.privacy.temp[axis]; }
    this.save();
  }
  setPrivacyTemp(axis, tier, ttlMs) {
    const p = this.s.profile;
    p.privacy = p.privacy || {};
    p.privacy.temp = p.privacy.temp || {};
    p.privacy.temp[axis] = {
      tier,
      expiresAt: Date.now() + Math.max(60_000, Number(ttlMs) || 0),
      revertTo: p.privacy.matrix?.[axis] || null,
    };
    this.save();
  }
  clearPrivacyTemp(axis) {
    const p = this.s.profile;
    if (p.privacy?.temp?.[axis]) { delete p.privacy.temp[axis]; this.save(); }
  }
  applyPrivacyPreset(preset) {
    const p = this.s.profile;
    p.privacy = p.privacy || {};
    p.privacy.matrix = { ...defaultMatrix(), ...preset.matrix };
    p.privacy.temp = {};
    this.save();
  }
  resetPrivacyMatrix() {
    const p = this.s.profile;
    p.privacy = p.privacy || {};
    p.privacy.matrix = defaultMatrix();
    p.privacy.temp = {};
    this.save();
  }

  _ensureWorld() {
    SAMPLE_PEOPLE.forEach((p) => {
      if (!this.s.world[p.id]) {
        const angle = Math.random() * Math.PI * 2;
        const r = (p.dist ?? 5) + (Math.random() * 1 - 0.5);
        this.s.world[p.id] = {
          x: Math.cos(angle) * r, y: Math.sin(angle) * r,
          vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
          dist: r, stable: p.stable, optIn: p.optIn, signal: p.signal,
          status: p.status, visMode: p.visMode
        };
      }
      if (!this.s.rapport[p.id]) {
        this.s.rapport[p.id] = { points: 0, sharedSessions: 0, lastReachingTs: 0, manualNotes: [] };
      } else if (this.s.rapport[p.id].lastReachingTs == null) {
        const notes = this.s.rapport[p.id].manualNotes || [];
        this.s.rapport[p.id].lastReachingTs = notes.length ? notes[notes.length - 1].ts : 0;
      }
    });
    this._ensureMemberships();
    this.save();
  }

  _ensureMemberships() {
    // Standing (Ledger A) records for every node — social societies AND
    // contribution sites alike. A site is a node whose needs are tasks.
    ALL_NODES.forEach((node) => {
      if (!this.s.memberships[node.id]) {
        this.s.memberships[node.id] = {
          points: 0,
          lastReachingTs: 0,
          visits: 0,
          contributions: [],
          fulfilledNeeds: [],
        };
      }
    });
  }

  startTicking() { if (this._tickHandle) return; this._tickHandle = setInterval(() => this.tick(), 1000); }
  stopTicking() { if (this._tickHandle) clearInterval(this._tickHandle); this._tickHandle = null; }

  _expireTemps() {
    const t = this.s.profile?.privacy?.temp;
    if (!t) return false;
    let changed = false;
    const now = Date.now();
    for (const k of Object.keys(t)) {
      if (t[k]?.expiresAt && t[k].expiresAt <= now) { delete t[k]; changed = true; }
    }
    return changed;
  }

  tick() {
    const w = this.s.world;
    const now = Date.now();

    let dirty = this._expireTemps();

    // Phase 5 expiry sweep: reveal grants live for REVEAL_GRANT_TTL_MS and
    // then auto-clear. The user must re-flag to renew — "no permanence
    // without review." Policy lives in engines/identity.js.
    const sweep = sweepExpiredReveals(this.s.reveals, REVEAL_GRANT_TTL_MS, now);
    if (sweep.removed > 0) {
      this.s.reveals = sweep.reveals;
      dirty = true;
    }

    // 1. Move the world (proximity refresh only — no rapport coupling).
    Object.values(w).forEach((p) => {
      p.x += p.vx; p.y += p.vy;
      if (Math.abs(p.x) > 12) p.vx *= -1;
      if (Math.abs(p.y) > 12) p.vy *= -1;
      if (Math.random() < 0.04) p.vx += (Math.random() - 0.5) * 0.06;
      if (Math.random() < 0.04) p.vy += (Math.random() - 0.5) * 0.06;
      p.vx = clamp(p.vx, -0.4, 0.4);
      p.vy = clamp(p.vy, -0.4, 0.4);
      p.dist = Math.hypot(p.x, p.y);
      if (Math.random() < 0.005) p.stable = !p.stable;
      p.signal = clamp(p.signal + (Math.random() - 0.5) * 0.05, 0.05, 1);
    });

    // 2. Phase 5 rapport decay. Per-person standing fades toward 0 unless the
    //    user is currently reaching (lastReachingTs within REACHING_WINDOW_MS).
    //    Nothing here adds points; accrual is via addManualRapport /
    //    logSharedSession only. Passive proximity dwell is no longer a
    //    standalone accrual driver — proximity is not consent.
    for (const [, r] of Object.entries(this.s.rapport)) {
      if (!r || r.points === 0) continue;
      const reaching = reachingFractionFromLast(r.lastReachingTs || 0, now);
      const next = decayPerTick(r.points, reaching);
      if (next !== r.points) r.points = next;
    }

    // 3. Phase 6 society standing decay. Same master equation, applied per
    //    society. Standing held by contributing to that society's flourishing;
    //    fades when the user stops showing up. Never gates access — only
    //    depth and suggestions.
    for (const [, m] of Object.entries(this.s.memberships)) {
      if (!m || m.points === 0) continue;
      const reaching = reachingFractionFromLast(m.lastReachingTs || 0, now);
      const next = decayPerTick(m.points, reaching);
      if (next !== m.points) m.points = next;
    }

    this.s.meta.ticks += 1;
    this.s.meta.lastTick = now;
    if (dirty || this.s.meta.ticks % 5 === 0) this.save();
    bus.emit('tick');
  }

  toggleMute(id) {
    if (this.s.muted[id]) delete this.s.muted[id];
    else this.s.muted[id] = Date.now();
    this.save();
  }
  toggleReveal(id) {
    if (this.s.reveals[id]) delete this.s.reveals[id];
    else this.s.reveals[id] = Date.now();
    this.save();
  }
  addManualRapport(id, delta, note) {
    const r = this.s.rapport[id] ??= { points: 0, sharedSessions: 0, lastReachingTs: 0, manualNotes: [] };
    const now = Date.now();
    r.points = clamp(r.points + Number(delta), -10000, 99999);
    r.manualNotes.push({ ts: now, delta: Number(delta), note: String(note || '').slice(0, 160) });
    r.lastReachingTs = now;
    this.s.log.unshift({ ts: now, kind: 'rating', personId: id, delta: Number(delta) });
    this.s.log = this.s.log.slice(0, 200);
    this.save();
  }
  logSharedSession(id, hobbyKey, durationMin) {
    const r = this.s.rapport[id] ??= { points: 0, sharedSessions: 0, lastReachingTs: 0, manualNotes: [] };
    const now = Date.now();
    const gain = 5 + Math.min(20, durationMin * 0.5);
    r.points = clamp(r.points + gain, -10000, 99999);
    r.sharedSessions += 1;
    r.manualNotes.push({ ts: now, delta: gain, note: `Shared ${hobbyKey} (${Math.round(durationMin)}m)` });
    r.lastReachingTs = now;
    this.s.log.unshift({ ts: now, kind: 'shared', personId: id, hobbyKey, durationMin });
    this.s.log = this.s.log.slice(0, 200);
    this.save();
  }
}

// ---- Phase 6 society mutators (attached to the Store prototype) ------------
//
// Each mutator is an explicit, user-initiated event. The store is the only
// place society standing accrues — the engine is pure, the tick only decays.

Store.prototype.contributeToSociety = function (societyId, kind, note = '') {
  const soc = SOCIETIES.find(s => s.id === societyId);
  if (!soc) return;
  const meta = contributionMeta(kind);
  if (!meta) return;
  const m = this.s.memberships[societyId] ??= { points: 0, lastReachingTs: 0, visits: 0, contributions: [], fulfilledNeeds: [] };
  const now = Date.now();
  m.points = clamp(m.points + meta.delta, -10000, 99999);
  m.lastReachingTs = now;
  m.contributions.push({ ts: now, kind, delta: meta.delta, note: String(note || meta.label).slice(0, 160) });
  if (kind === 'visit') m.visits += 1;
  this.s.log.unshift({ ts: now, kind: 'society-contribute', societyId, contribKind: kind, delta: meta.delta });
  this.s.log = this.s.log.slice(0, 200);
  this.save();
};

Store.prototype.visitSociety = function (societyId) {
  this.contributeToSociety(societyId, 'visit', 'Showed up.');
};

Store.prototype.fulfillSocietyNeed = function (societyId, needId) {
  const soc = SOCIETIES.find(s => s.id === societyId);
  if (!soc) return;
  const need = (soc.needs || []).find(n => n.id === needId);
  if (!need) return;
  const m = this.s.memberships[societyId] ??= { points: 0, lastReachingTs: 0, visits: 0, contributions: [], fulfilledNeeds: [] };
  if (m.fulfilledNeeds.includes(needId)) return;  // idempotent — a fulfilled need is not re-fulfilled
  const meta = contributionMeta('fulfill_need');
  const now = Date.now();
  m.points = clamp(m.points + meta.delta, -10000, 99999);
  m.lastReachingTs = now;
  m.contributions.push({ ts: now, kind: 'fulfill_need', delta: meta.delta, note: need.label, needId });
  m.fulfilledNeeds.push(needId);
  this.s.log.unshift({ ts: now, kind: 'society-need', societyId, needId, delta: meta.delta });
  this.s.log = this.s.log.slice(0, 200);
  this.save();
};

// ---- Contribution pilot mutator (the two-ledger write) ---------------------
//
// Fulfilling a task at a site is the only place a single user action writes to
// BOTH ledgers — and it does so as two INDEPENDENT writes:
//
//   1. Ledger B (reward-bearing): resolve the task's proof via the evidence
//      seam, then append a discrete fulfilment event carrying that proof.
//      reward.js will read this — and only this — to compute material reward.
//
//   2. Ledger A (depth-only): accrue site standing exactly as for a social
//      society. This bumps points/recency for the "depth" surfaces.
//
// Crucially, neither write reads the other. The proof and reward path never
// consult standing; the standing accrual never consults proof or reward. That
// independence is invariant (e), and the structural smoke fails if it is ever
// violated by a stray import or dataflow.
Store.prototype.fulfilNeed = function (siteId, needId, opts = {}) {
  const site = SITES.find(s => s.id === siteId) || SOCIETIES.find(s => s.id === siteId);
  if (!site) return null;
  const need = needById(site, needId);
  if (!need) return null;
  const personId = opts.personId || this.s.profile.id || 'me';
  const now = Date.now();

  // Idempotent: a fulfilled need is not re-fulfilled by the same person.
  const already = this.s.fulfilments.some(e => e.needId === needId && e.personId === personId);
  if (already) return null;

  // --- Write 1: Ledger B. Resolve proof of the TASK (never the person). ---
  const proof = resolveProof(need, {
    siteReadings: opts.siteReadings || {},   // task-intrinsic confirmation (sim)
    personId,
    nonce: opts.nonce ?? uid(),              // a fresh node-local presence nonce
    issuedAt: opts.issuedAt ?? now,
    now,
    ttlMs: opts.ttlMs,
    useStrongStub: !!opts.useStrongStub,     // co-presence stub — off by default
  });
  this.s.fulfilments = recordFulfilment(this.s.fulfilments, {
    needId, siteId: site.id, personId, ts: now, proof,
    stake: need.stake || 'low', task: need.task || null,
  });

  // --- Write 2: Ledger A. Accrue site standing (depth-only). ---
  // Does not read proof or reward; standing rises for the reaching, full stop.
  const m = this.s.memberships[site.id] ??= { points: 0, lastReachingTs: 0, visits: 0, contributions: [], fulfilledNeeds: [] };
  const meta = contributionMeta('fulfill_need');
  m.points = clamp(m.points + meta.delta, -10000, 99999);
  m.lastReachingTs = now;
  m.contributions.push({ ts: now, kind: 'fulfill_need', delta: meta.delta, note: need.label, needId });
  if (!m.fulfilledNeeds.includes(needId)) m.fulfilledNeeds.push(needId);

  this.s.log.unshift({ ts: now, kind: 'site-fulfil', siteId: site.id, needId, proofTier: proof.tier });
  this.s.log = this.s.log.slice(0, 200);
  this.save();
  return { proof };
};

/** Need ids the user has already fulfilled at any site (for hiding from the feed). */
Store.prototype.myFulfilledNeedIds = function (personId) {
  return fulfilledNeedIds(this.s.fulfilments, personId || this.s.profile.id || 'me');
};

export const store = new Store();
export { REACHING_WINDOW_MS, REVEAL_GRANT_TTL_MS };
