// Local-first store with LocalStorage persistence and a 1-second simulation tick.
// State is intentionally thin — engines do all logic.

import { DEFAULT_PROFILE, SAMPLE_PEOPLE } from './data.js';
import { classify } from './engines/proximity.js';
import { accrualPerTick } from './engines/rapport.js';
import { sharedKeys } from './engines/hobbies.js';
import { bus, clamp } from './util.js';

const KEY = 'spectrum:v1';

const blank = () => ({
  profile: DEFAULT_PROFILE(),
  // world[id] = { x, y, vx, vy, dist, stable, optIn, signal, status, visMode, intent }
  world: {},
  // rapport[id] = { points, sharedSessions, manualNotes:[{ts,delta,note}] }
  rapport: {},
  // mutual reveals (object map for JSON serialisation)
  reveals: {},
  // muted person ids
  muted: {},
  // recent interactions log (newest first)
  log: [],
  meta: { ticks: 0, lastTick: Date.now() }
});

function migrate(s) {
  if (!s || typeof s !== 'object') return blank();
  const base = blank();
  return { ...base, ...s, profile: { ...base.profile, ...(s.profile || {}) } };
}

class Store {
  constructor() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { raw = null; }
    this.s = migrate(raw);
    this._ensureWorld();
    this._tickHandle = null;
  }

  // ----- persistence ------------------------------------------------------
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch {}
    bus.emit('state:changed');
  }
  reset() { this.s = blank(); this._ensureWorld(); this.save(); }

  // ----- accessors --------------------------------------------------------
  get profile() { return this.s.profile; }
  set profile(p) { this.s.profile = p; this.save(); }
  get world()   { return this.s.world; }
  get rapport() { return this.s.rapport; }
  get reveals() { return this.s.reveals; }
  get muted()   { return this.s.muted; }
  get log()     { return this.s.log; }

  setProfile(patch) {
    this.s.profile = { ...this.s.profile, ...patch };
    this.save();
  }

  _ensureWorld() {
    SAMPLE_PEOPLE.forEach((p) => {
      if (!this.s.world[p.id]) {
        const angle = Math.random() * Math.PI * 2;
        const r = (p.dist ?? 25) + (Math.random() * 4 - 2);
        this.s.world[p.id] = {
          x: Math.cos(angle) * r, y: Math.sin(angle) * r,
          vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
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

  // ----- simulation -------------------------------------------------------
  startTicking() {
    if (this._tickHandle) return;
    this._tickHandle = setInterval(() => this.tick(), 1000);
  }
  stopTicking() { if (this._tickHandle) clearInterval(this._tickHandle); this._tickHandle = null; }

  tick() {
    const w = this.s.world;
    const me = this.s.profile;
    const muted = this.s.muted;
    const indexSeed = new Map(SAMPLE_PEOPLE.map(p => [p.id, p]));

    Object.entries(w).forEach(([id, p]) => {
      // 2D drift with reflection.
      p.x += p.vx; p.y += p.vy;
      if (Math.abs(p.x) > 50) p.vx *= -1;
      if (Math.abs(p.y) > 50) p.vy *= -1;
      if (Math.random() < 0.04) p.vx += (Math.random() - 0.5) * 0.2;
      if (Math.random() < 0.04) p.vy += (Math.random() - 0.5) * 0.2;
      p.vx = clamp(p.vx, -1.4, 1.4);
      p.vy = clamp(p.vy, -1.4, 1.4);
      p.dist = Math.hypot(p.x, p.y);
      if (Math.random() < 0.005) p.stable = !p.stable;
      p.signal = clamp(p.signal + (Math.random() - 0.5) * 0.05, 0.05, 1);

      // Rapport accrual via the engine.
      if (me.optIn && !muted[id]) {
        const seed = indexSeed.get(id);
        const cls = classify({ dist: p.dist, optIn: p.optIn, stable: p.stable, signal: p.signal });
        const shared = sharedKeys(me.hobbies, seed?.hobbies);
        const gain = accrualPerTick({
          zoneKey: cls.zone.key,
          stable: p.stable,
          signal: p.signal,
          optIn: p.optIn,
          sharedHobbyKeys: shared
        });
        if (gain > 0) {
          const r = this.s.rapport[id] ??= { points: 0, sharedSessions: 0, manualNotes: [] };
          r.points = clamp(r.points + gain, -10000, 99999);
        }
      }
    });

    this.s.meta.ticks += 1;
    this.s.meta.lastTick = Date.now();
    if (this.s.meta.ticks % 5 === 0) this.save();
    bus.emit('tick');
  }

  // ----- mutators ---------------------------------------------------------
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
