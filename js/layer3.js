// Layer 3 — Third-Space Proximity screen.
// Consumes: engines/proximity.js + state.world (live signals).

import { PROX_ZONES, SAMPLE_PEOPLE } from './data.js';
import { classify, bucketCounts } from './engines/proximity.js';
import { store } from './state.js';
import { $, $$, escapeHtml, initials, colorFor, bus } from './util.js';

function zoneCard(zone, count) {
  return `
    <div class="card-soft p-3 grid gap-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${zone.color}"></span>
          <span class="font-display font-semibold">${escapeHtml(zone.label)}</span>
        </div>
        <span class="pill" style="color:${zone.color};border-color:${zone.color}55">${count}</span>
      </div>
      <p class="text-xs text-slate-400">${escapeHtml(zone.copy)}</p>
    </div>`;
}

function row(p, world, muted) {
  const w = world[p.id] || {};
  const cls = classify({ dist: w.dist, optIn: w.optIn, stable: w.stable, signal: w.signal, muted: !!muted[p.id] });
  return `
    <a href="#/people/${p.id}" class="card-soft p-3 flex items-center gap-3 hover:border-iris-500/60 transition" data-id="${p.id}">
      <span class="avatar w-9 h-9" style="background: linear-gradient(135deg, ${colorFor(p.id)}, var(--panel))">${initials(p.name)}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-medium truncate">${escapeHtml(p.name)}</span>
          <span class="pill" style="color:${cls.zone.color};border-color:${cls.zone.color}55">${escapeHtml(cls.zone.label)}</span>
          ${!w.stable ? '<span class="pill pill-sun">flicker</span>' : ''}
          ${!w.optIn ? '<span class="pill pill-rose">opt-out</span>' : ''}
        </div>
        <div class="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
          <span>~${(w.dist||0).toFixed(1)}m</span>
          <span class="bar thin flex-1"><i style="width:${((w.signal||0)*100).toFixed(0)}%"></i></span>
          <span>${((w.signal||0)*100|0)}%</span>
        </div>
      </div>
      <button class="btn btn-sm" data-action="mute" data-id="${p.id}">${muted[p.id]?'Unmute':'Mute'}</button>
    </a>`;
}

let unsubscribe = null;

export function render(root) {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }

  const me = store.profile;
  const world = store.world;
  const muted = store.muted;

  const rows = SAMPLE_PEOPLE.map(p => {
    const w = world[p.id] || {};
    return { p, cls: classify({ dist: w.dist, optIn: w.optIn, stable: w.stable, signal: w.signal, muted: !!muted[p.id] }) };
  });
  const counts = bucketCounts(rows.map(r => r.cls));

  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">Layer 3</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Third-Space Proximity</h1>
          <p class="text-sm text-slate-400 mt-1 max-w-2xl">Context-aware nearby presence in approved third spaces. The Spectrum shows social proximity buckets, never exact locations. Your discovery surface updates every second as the room shifts.</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="pill ${me.optIn?'pill-mint':'pill-rose'}"><span class="dot"></span> ${me.optIn?'You are discoverable':'You are private'}</span>
          <button id="toggle-optin" class="btn btn-sm">${me.optIn?'Go private':'Be discoverable'}</button>
        </div>
      </header>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        ${PROX_ZONES.map(z => zoneCard(z, counts[z.key] || 0)).join('')}
      </div>

      <div class="grid lg:grid-cols-5 gap-6">
        <div class="lg:col-span-3 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Live presence feed</h2>
          <div id="rows" class="grid gap-2">${rows.map(({p}) => row(p, world, muted)).join('')}</div>
        </div>

        <aside class="lg:col-span-2 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Privacy controls</h2>
          <div class="card-soft p-3">
            <label class="text-xs text-slate-400">Allowed signal source</label>
            <select id="sig-source" class="select mt-1">
              <option value="ble" ${me.privacy.allowSignal==='ble'?'selected':''}>BLE / UWB (recommended)</option>
              <option value="wifi" ${me.privacy.allowSignal==='wifi'?'selected':''}>Wi-Fi presence (coarser)</option>
              <option value="gps"  ${me.privacy.allowSignal==='gps'?'selected':''}>GPS (rough zone only)</option>
            </select>
          </div>
          <div class="card-soft p-3 grid gap-2">
            <label class="text-xs text-slate-400">Hide from candidates whose match % is below</label>
            <input type="range" id="hide-below" min="0" max="1" step="0.05" value="${me.privacy.hideFromMatchBelow}" />
            <div class="text-sm">${Math.round(me.privacy.hideFromMatchBelow*100)}%</div>
          </div>
          <div class="card-soft p-3">
            <h3 class="font-display font-semibold mb-2">How the engine classifies</h3>
            <ul class="text-xs text-slate-400 grid gap-1.5">
              <li>· Strong stable signal in 0–8m → <b style="color:#78f3d3">Nearby</b></li>
              <li>· 8–18m or briefly nearby → <b style="color:#9b8cff">Adjacent</b></li>
              <li>· Same room/area → <b style="color:#7b6cff">SameZone</b></li>
              <li>· Unstable / passing through → <b style="color:#ffd073">Passing</b></li>
              <li>· Opt-out or hidden → <b style="color:#94a3b8">Hidden</b></li>
              <li>· Mutual mute → <b style="color:#475569">Muted</b></li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  `;

  $('#toggle-optin', root).addEventListener('click', () => {
    store.setProfile({ optIn: !store.profile.optIn });
    render(root);
  });
  $('#sig-source', root).addEventListener('change', e => {
    store.setProfile({ privacy: { ...store.profile.privacy, allowSignal: e.target.value } });
  });
  $('#hide-below', root).addEventListener('input', e => {
    store.setProfile({ privacy: { ...store.profile.privacy, hideFromMatchBelow: Number(e.target.value) } });
    $('#hide-below', root).nextElementSibling.textContent = `${Math.round(e.target.value*100)}%`;
  });
  $$('a[data-id]', root).forEach(a => {
    const btn = a.querySelector('button[data-action="mute"]');
    btn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      store.toggleMute(a.dataset.id);
      refreshRows();
    });
  });

  function refreshRows() {
    if (!location.hash.startsWith('#/proximity')) {
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
      return;
    }
    const ws = store.world; const ms = store.muted;
    $('#rows', root).innerHTML = SAMPLE_PEOPLE.map(p => row(p, ws, ms)).join('');
    $$('a[data-id]', root).forEach(a => {
      const btn = a.querySelector('button[data-action="mute"]');
      btn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        store.toggleMute(a.dataset.id);
        refreshRows();
      });
    });
  }
  unsubscribe = bus.on('tick', refreshRows);
}
