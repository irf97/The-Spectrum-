// Layer 4 — Identity & Anonymity screen.
// Consumes: engines/identity.js + engines/match.js for the gate decision.

import { VIS_MODES, SAMPLE_PEOPLE } from './data.js';
import { resolveView } from './engines/identity.js';
import { scoreCandidate } from './engines/match.js';
import { store } from './state.js';
import { $, $$, escapeHtml, initials, colorFor, pct, html, raw } from './util.js';

function modeCard(mode, current) {
  const sel = mode.key === current;
  return `
    <button data-mode="${mode.key}" class="card-soft text-left p-3 grid gap-1 ${sel?'ring-2 ring-iris-500':''}">
      <div class="text-2xl leading-none">${mode.icon}</div>
      <div class="font-display font-semibold">${escapeHtml(mode.label)}</div>
      <div class="text-xs text-slate-400">${escapeHtml(mode.copy)}</div>
    </button>`;
}

function reveal(p, viewer, opts) {
  const r = scoreCandidate(p, viewer.prefs);
  const view = resolveView(viewer, p, r.pct, opts);
  const visual = (() => {
    switch (view.shows) {
      case 'photo':  return `<span class="avatar w-12 h-12" style="background:${colorFor(p.id)}">${initials(p.name)}</span>`;
      case 'glance': return `<span class="avatar w-12 h-12" style="background:${colorFor(p.id)};filter:blur(3px) saturate(.7)">${initials(p.name)}</span>`;
      case 'avatar': return `<span class="avatar w-12 h-12" style="background:linear-gradient(135deg, ${colorFor(p.alias)}, var(--panel))">${escapeHtml((p.alias||'').slice(0,2).toUpperCase())}</span>`;
      case 'reveal': return `<span class="avatar w-12 h-12 ring-2 ring-mint-500" style="background:${colorFor(p.id)}">${initials(p.name)}</span>`;
      case 'hidden':
      default:       return `<span class="avatar w-12 h-12" style="background:#0f0f1a;border-style:dashed">·</span>`;
    }
  })();
  const label = (() => {
    switch (view.shows) {
      case 'photo':  return p.name;
      case 'reveal': return `${p.name} · revealed`;
      case 'glance': return p.name.split(' ')[0] + ' …';
      case 'avatar': return `@${p.alias}`;
      default:       return 'Hidden';
    }
  })();
  return html`
    <div class="card-soft p-3 flex items-center gap-3">
      ${raw(visual)}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium">${label}</span>
          <span class="pill" style="color:${r.bucket.swatch};border-color:${r.bucket.swatch}55">${r.bucket.label} · ${pct(r.pct)}</span>
          <span class="pill pill-iris">${VIS_MODES.find(m=>m.key===view.modeKey)?.label || view.modeKey}</span>
          ${view.gated   ? raw('<span class="pill pill-rose">gated</span>') : ''}
          ${view.mutual  ? raw('<span class="pill pill-mint">mutual</span>') : ''}
        </div>
        <div class="text-[11px] text-slate-500 mt-1">${view.reasons.join(' · ') || 'normal visibility'}</div>
      </div>
      <button class="btn btn-sm" data-toggle-reveal="${p.id}">${opts.reveals[p.id]?'Un-flag reveal':'Flag for reveal'}</button>
    </div>
  `;
}

export function render(root) {
  const me = store.profile;
  const reveals = store.reveals;
  const muted = store.muted;
  const opts = { reveals, theirReveal: true, muted: false }; // simulate the other side has also revealed

  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">Layer 4</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Identity & Anonymity</h1>
          <p class="text-sm text-slate-400 mt-1 max-w-2xl">Choose how you appear by default. Each candidate's view is gated by your match-percentage threshold and a mutual reveal handshake. The aim: augment in-person noticing — not stare at a screen.</p>
        </div>
        <span class="pill pill-iris">${VIS_MODES.find(m=>m.key===me.visMode)?.label} · default</span>
      </header>

      <div class="grid sm:grid-cols-3 lg:grid-cols-6 gap-3" id="modes">
        ${VIS_MODES.map(m => modeCard(m, me.visMode)).join('')}
      </div>

      <div class="grid lg:grid-cols-5 gap-6">
        <aside class="lg:col-span-2 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Reveal gate</h2>
          <div class="card-soft p-3 grid gap-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-slate-400">Only show richer than avatar at match ≥</span>
              <span class="font-display font-semibold" id="gate-val">${Math.round(me.visMatchGate*100)}%</span>
            </div>
            <input id="gate" type="range" min="0" max="1" step="0.05" value="${me.visMatchGate}" />
            <p class="text-[11px] text-slate-500">A higher gate means more "look around the room" energy. People below the gate see your avatar / alias only.</p>
          </div>
          <div class="card-soft p-3">
            <h3 class="font-display font-semibold mb-2">The reveal handshake</h3>
            <ol class="text-xs text-slate-400 grid gap-1 list-decimal pl-4">
              <li>Both people must flag each other for reveal.</li>
              <li>Match % must clear the receiver's gate.</li>
              <li>Status must allow it (e.g. not Closed/Resetting).</li>
              <li>Only then does <b>Reveal</b> resolve into a full identity view.</li>
            </ol>
          </div>
        </aside>

        <div class="lg:col-span-3 grid gap-3">
          <h2 class="font-display font-semibold text-lg">What others see (simulated)</h2>
          ${SAMPLE_PEOPLE.slice(0,10).map(p => reveal(p, me, { ...opts, theirReveal: !!reveals[p.id], muted: !!muted[p.id] })).join('')}
        </div>
      </div>
    </section>
  `;

  $$('button[data-mode]', root).forEach(b => b.addEventListener('click', () => {
    store.setProfile({ visMode: b.dataset.mode });
    render(root);
  }));
  $('#gate', root).addEventListener('input', (e) => {
    store.setProfile({ visMatchGate: Number(e.target.value) });
    $('#gate-val', root).textContent = `${Math.round(e.target.value*100)}%`;
    render(root);
  });
  $$('button[data-toggle-reveal]', root).forEach(b => b.addEventListener('click', () => {
    store.toggleReveal(b.dataset.toggleReveal);
    render(root);
  }));
}
