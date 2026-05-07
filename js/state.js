// Local-first store with LocalStorage persistence and a 1-second simulation tick.
// State is intentionally thin — engines do all logic.

import { DEFAULT_PROFILE, SAMPLE_PEOPLE, defaultMatrix, PRIVACY_AXES } from './data.js';
import { classify } from './engines/proximity.js';
import { accrualPerTick } from './engines/rapport.js';
import { sharedKeys } from './engines/hobbies.js';
import { canSee } from './engines/privacy.js';
import { scoreCandidate } from './engines/match.js';
import { bus, clamp } from './util.js';

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

function migrate(s) {
  if (!s || typeof s !== 'object') return blank();
  const base = blank();
  const merged = { ...base, ...s, profile: { ...base.profile, ...(s.profile || {}) } };
  const p = merged.profile;
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
          status: p.status, visMode: p.visMode, intent: p.intent
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
        const sc = seed ? scoreCandidate(seed, me.prefs) : { pct: 0 };
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
