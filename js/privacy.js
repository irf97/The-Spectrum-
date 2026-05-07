// Privacy matrix view.
// Per-action audience tiers, presets, decay timers, and a live "what others see" preview.

import {
  PRIVACY_AXES, AUDIENCE_TIERS, PRIVACY_PRESETS, TEMP_DURATIONS,
  SAMPLE_PEOPLE, defaultMatrix
} from './data.js';
import { canSee, effectiveTier, tierMeta, axisMeta } from './engines/privacy.js';
import { classify } from './engines/proximity.js';
import { scoreCandidate } from './engines/match.js';
import { store } from './state.js';
import { $, $$, escapeHtml, fmtRel, bus } from './util.js';

let unsubTick = null;

function tierOptionsFor(axis, current) {
  return AUDIENCE_TIERS.map(t =>
    `<option value="${t.key}" ${current===t.key?'selected':''}>${t.short}  ${t.label}</option>`
  ).join('');
}

function axisRow(me, group, label) {
  const axes = PRIVACY_AXES.filter(a => a.group === group);
  if (!axes.length) return '';
  return `
    <div class="card p-4 grid gap-2">
      <h3 class="font-display font-semibold">${escapeHtml(label)}</h3>
      <div class="grid gap-2">
        ${axes.map(a => {
          const tier = effectiveTier(me, a.key);
          const temp = me.privacy?.temp?.[a.key];
          const tm = tierMeta(tier);
          return `
            <div class="card-soft p-3 grid sm:grid-cols-[1.4fr_1fr_auto] items-center gap-3" data-axis="${a.key}">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm">${escapeHtml(a.label)}</span>
                  ${temp ? `<span class="pill pill-sun" title="Temporary override">⏱ expires ${fmtRel(temp.expiresAt)}</span>` : ''}
                </div>
                <div class="text-[11px] text-themed-mute">${escapeHtml(a.copy)}</div>
              </div>
              <div>
                <select class="select" data-tier="${a.key}">${tierOptionsFor(a.key, tier)}</select>
                <div class="text-[11px] mt-1" style="color:${tm.swatch}">Currently: ${escapeHtml(tm.label)}</div>
              </div>
              <div class="flex flex-wrap gap-1 justify-end">
                ${TEMP_DURATIONS.map(d => `<button class="btn btn-sm" data-temp="${a.key}" data-ms="${d.ms}" title="Temporarily set Anyone for ${d.label}">+${d.label}</button>`).join('')}
                ${temp ? `<button class="btn btn-sm btn-rose" data-clear-temp="${a.key}">cancel</button>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function previewPanel(me, world, muted, reveals) {
  // Compute aggregate visibility from a sampled "average viewer" perspective.
  const counts = { showOnFloor:0, showName:0, showPhoto:0, showHobbies:0, showStatus:0, receiveMessages:0, receiveRevealRequests:0 };
  const visible = SAMPLE_PEOPLE.length;
  for (const p of SAMPLE_PEOPLE) {
    const w = world[p.id] || {};
    const cls = classify({ dist:w.dist, optIn:w.optIn, stable:w.stable, signal:w.signal, muted:!!muted[p.id] });
    const sc = scoreCandidate(p, me.prefs);
    const ctx = {
      muted: !!muted[p.id],
      zoneKey: cls.zone.key,
      matchPct: sc.pct,
      // Reverse perspective: viewer = sample person, subject = me.
      viewerReveal: !!reveals[p.id],
      subjectReveal: !!reveals[p.id],
    };
    for (const k of Object.keys(counts)) {
      if (canSee(p, me, k, ctx)) counts[k]++;
    }
  }
  return `
    <div class="card p-4 grid gap-2">
      <h3 class="font-display font-semibold">What others see right now</h3>
      <p class="text-xs text-themed-mute">Based on the ${visible} sample people in the room. Each row counts how many of them currently meet the gate for this axis.</p>
      <div class="grid sm:grid-cols-2 gap-2 mt-1">
        ${Object.entries(counts).map(([k,v]) => {
          const a = axisMeta(k); if (!a) return '';
          return `
            <div class="card-soft p-3 flex items-center justify-between">
              <div>
                <div class="text-sm">${escapeHtml(a.label)}</div>
                <div class="text-[11px] text-themed-mute">${escapeHtml(tierMeta(effectiveTier(me, k)).label)}</div>
              </div>
              <div class="text-right">
                <div class="font-display font-semibold text-lg">${v}<span class="text-themed-mute text-sm">/${visible}</span></div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function presetRow() {
  return `
    <div class="card p-4 grid gap-3">
      <h3 class="font-display font-semibold">Quick presets</h3>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        ${PRIVACY_PRESETS.map(p => `
          <button class="card-soft p-3 text-left hover:border-iris-500/60" data-preset="${p.key}">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-lg">${p.icon}</span>
              <span class="font-medium">${escapeHtml(p.label)}</span>
            </div>
            <div class="text-[11px] text-themed-mute">${escapeHtml(p.copy)}</div>
          </button>`).join('')}
      </div>
    </div>`;
}

export function render(root) {
  if (unsubTick) { unsubTick(); unsubTick = null; }

  function paint() {
    if (!location.hash.startsWith('#/privacy')) {
      if (unsubTick) { unsubTick(); unsubTick = null; }
      return;
    }
    const me = store.profile;
    root.innerHTML = `
      <section class="grid gap-6">
        <header class="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p class="h-eyebrow">Profile · Privacy</p>
            <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Privacy matrix</h1>
            <p class="text-sm text-themed-soft mt-1 max-w-2xl">Per-action audience tiers. Each row sets who can see / do this with you. Temporary overrides expire on a timer; presets reset all rows at once.</p>
          </div>
          <div class="flex gap-2">
            <a href="#/profile" class="btn">Back to profile</a>
            <button class="btn btn-rose" id="reset-matrix">Reset to defaults</button>
          </div>
        </header>

        ${presetRow()}

        <div class="grid lg:grid-cols-2 gap-4">
          ${axisRow(me, 'visibility', 'Visibility')}
          ${axisRow(me, 'inbound',    'Inbound contact')}
          ${axisRow(me, 'rapport',    'Rapport')}
          ${axisRow(me, 'leaderboard','Leaderboards')}
        </div>

        ${previewPanel(me, store.world, store.muted, store.reveals)}

        <div class="card p-4 grid gap-2">
          <h3 class="font-display font-semibold">Audience tiers</h3>
          <div class="grid sm:grid-cols-5 gap-2">
            ${AUDIENCE_TIERS.map(t => `
              <div class="card-soft p-3">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-lg" style="color:${t.swatch}">${t.short}</span>
                  <span class="font-medium text-sm">${escapeHtml(t.label)}</span>
                </div>
                <div class="text-[11px] text-themed-mute">${escapeHtml(t.copy)}</div>
              </div>`).join('')}
          </div>
        </div>
      </section>
    `;

    // Tier dropdowns.
    $$('select[data-tier]', root).forEach(sel => {
      sel.addEventListener('change', e => {
        store.setPrivacyAxis(sel.dataset.tier, e.target.value);
        paint();
      });
    });
    // Temp overrides (set tier to 'anyone' for the chosen ttl).
    $$('button[data-temp]', root).forEach(btn => {
      btn.addEventListener('click', () => {
        const axis = btn.dataset.temp;
        const ms = Number(btn.dataset.ms);
        store.setPrivacyTemp(axis, 'anyone', ms);
        paint();
      });
    });
    $$('button[data-clear-temp]', root).forEach(btn => {
      btn.addEventListener('click', () => {
        store.clearPrivacyTemp(btn.dataset.clearTemp);
        paint();
      });
    });
    // Presets.
    $$('button[data-preset]', root).forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = PRIVACY_PRESETS.find(p => p.key === btn.dataset.preset);
        if (preset) store.applyPrivacyPreset(preset);
        paint();
      });
    });
    // Reset.
    $('#reset-matrix', root)?.addEventListener('click', () => {
      if (confirm('Reset privacy matrix to defaults? Active temporary overrides will be cleared.')) {
        store.resetPrivacyMatrix();
        paint();
      }
    });
  }

  paint();
  unsubTick = bus.on('tick', () => {
    // Re-render only if a temp expired this tick.
    const t = store.profile?.privacy?.temp || {};
    if (Object.values(t).some(x => x.expiresAt < Date.now() + 1500)) paint();
  });
}
