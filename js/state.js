// Local-first store with LocalStorage persistence and a 1-second simulation tick.
// State is intentionally thin — engines do all logic.

import {
  DEFAULT_PROFILE, SAMPLE_PEOPLE, defaultMatrix, PRIVACY_AXES,
  DEFAULT_DATING_PERSONA, DEFAULT_NETWORKING_PERSONA, PERSONA_PRESETS
} from './data.js';
import { classify } from './engines/proximity.js';
import { accrualPerTick } from './engines/rapport.js';
import { sharedKeys } from './engines/hobbies.js';
import { canSee } from './engines/privacy.js';
import { scoreCandidate } from './engines/match.js';
import { bus, clamp, uid } from './util.js';

const KEY = 'spectrum:v3';

const blank = () => ({
  profile: DEFAULT_PROFILE(),
  world: {},
  rapport: {},
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
  merged.ui = merged.ui || {};
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
        this.s.rapport[p.id] = { points: 0, sharedSessions: 0, manualNotes: [] };
      }
    });
    this.save();
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
    const me = this.s.profile;
    const muted = this.s.muted;
    const reveals = this.s.reveals;
    const indexSeed = new Map(SAMPLE_PEOPLE.map(p => [p.id, p]));
    const activeDating = this.activePersonaFor('dating');

    let dirty = this._expireTemps();

    Object.entries(w).forEach(([id, p]) => {
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

      if (me.optIn && !muted[id]) {
        const seed = indexSeed.get(id);
        const cls = classify({ dist: p.dist, optIn: p.optIn, stable: p.stable, signal: p.signal });
        const shared = sharedKeys(me.hobbies, seed?.hobbies);
        const sc = seed && me.dating?.enabled && activeDating ? scoreCandidate(seed, activeDating.prefs) : { pct: 0 };
        const ctx = {
          muted: !!muted[id],
          zoneKey: cls.zone.key,
          matchPct: sc.pct,
          viewerReveal: !!reveals[id],
          subjectReveal: !!reveals[id],
        };
        const allowAccrue = canSee(me, seed || { id }, 'countRapportWith', ctx);
        if (allowAccrue) {
          const gain = accrualPerTick({
            zoneKey: cls.zone.key, stable: p.stable, signal: p.signal, optIn: p.optIn, sharedHobbyKeys: shared
          });
          if (gain > 0) {
            const r = this.s.rapport[id] ??= { points: 0, sharedSessions: 0, manualNotes: [] };
            r.points = clamp(r.points + gain, -10000, 99999);
          }
        }
      }
    });

    this.s.meta.ticks += 1;
    this.s.meta.lastTick = Date.now();
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
    const r = this.s.rapport[id] ??= { points: 0, sharedSessions: 0, manualNotes: [] };
    r.points = clamp(r.points + Number(delta), -10000, 99999);
    r.manualNotes.push({ ts: Date.now(), delta: Number(delta), note: String(note || '').slice(0, 160) });
    this.s.log.unshift({ ts: Date.now(), kind: 'rating', personId: id, delta: Number(delta) });
    this.s.log = this.s.log.slice(0, 200);
    this.save();
  }
  logSharedSession(id, hobbyKey, durationMin) {
    const r = this.s.rapport[id] ??= { points: 0, sharedSessions: 0, manualNotes: [] };
    const gain = 5 + Math.min(20, durationMin * 0.5);
    r.points = clamp(r.points + gain, -10000, 99999);
    r.sharedSessions += 1;
    r.manualNotes.push({ ts: Date.now(), delta: gain, note: `Shared ${hobbyKey} (${Math.round(durationMin)}m)` });
    this.s.log.unshift({ ts: Date.now(), kind: 'shared', personId: id, hobbyKey, durationMin });
    this.s.log = this.s.log.slice(0, 200);
    this.save();
  }
}

export const store = new Store();
