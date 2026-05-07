// Layer 2 (networking) — Alignment screen.
// Operates on candidate.networking.<field> and me.networking.prefs. No physical
// or gender axes. Mirrors layer2.js (physical match) layout for consistency.

import { NETWORKING_FIELDS, MATCH_BUCKETS, SAMPLE_PEOPLE } from './data.js';
import { alignmentCandidate, setWeight, toggleExcluded, toggleFilter, setTarget } from './engines/alignment.js';
import { store } from './state.js';
import { $$, escapeHtml, initials, colorFor, pct } from './util.js';

function bucketChip(bucket, percent) {
  return `<span class="pill" style="color:${bucket.swatch};border-color:${bucket.swatch}55"><span class="dot"></span>${escapeHtml(bucket.label)} · ${pct(percent)}</span>`;
}

function fieldRow(f, prefs) {
  const target = prefs.targets?.[f.key];
  const filterSet = new Set(prefs.filters?.[f.key] || []);
  const exclSet = new Set(prefs.excluded?.[f.key] || []);
  const w = Number(prefs.weights?.[f.key] ?? f.weight);
  return `
    <div class="card-soft p-3 grid gap-2" data-field="${f.key}">
      <div class="flex items-center justify-between">
        <div>
          <div class="font-display font-semibold">${escapeHtml(f.label)}</div>
          <div class="text-xs text-themed-mute">Weight ${(w*100).toFixed(0)}%</div>
        </div>
        <input type="range" min="0" max="1" step="0.05" value="${w}" class="w-32" data-role="weight" />
      </div>
      <div class="flex flex-wrap gap-1.5">
        ${f.options.map(opt => {
          const isTarget = target === opt;
          const isFilter = filterSet.has(opt);
          const isExcl   = exclSet.has(opt);
          const cls = isTarget ? 'pill pill-iris'
                    : isFilter ? 'pill pill-mint'
                    : isExcl   ? 'pill pill-rose'
                    : 'pill';
          return `<button class="${cls}" data-role="opt" data-opt="${escapeHtml(opt)}" title="Click=target · Shift=filter · Alt=exclude">${escapeHtml(opt)}</button>`;
        }).join('')}
      </div>
      <div class="text-[11px] text-themed-mute">Click → target · Shift+Click → require · Alt+Click → exclude</div>
    </div>
  `;
}

function candidateRow(p, prefs) {
  const r = alignmentCandidate(p, prefs);
  return `
    <a href="#/people/${p.id}" class="card-soft p-3 flex items-center gap-3 hover:border-iris-500/60 transition">
      <span class="avatar w-10 h-10" style="background: linear-gradient(135deg, ${colorFor(p.id)}, var(--panel))">${initials(p.name)}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium truncate">${escapeHtml(p.name)}</span>
          ${p.networking?.role ? `<span class="pill pill-iris">${escapeHtml(p.networking.role)}</span>` : ''}
          ${p.networking?.stage ? `<span class="pill pill-mint">${escapeHtml(p.networking.stage)}</span>` : ''}
          ${bucketChip(r.bucket, r.pct)}
          ${r.blockedBy.includes('no_networking_profile') ? `<span class="pill pill-slate">no networking profile</span>` : ''}
          ${r.blockedBy.length && !r.blockedBy.includes('no_networking_profile') ? `<span class="pill pill-rose">filter blocked</span>` : ''}
          ${r.excludedHits.length ? `<span class="pill pill-rose">excluded</span>` : ''}
        </div>
        <div class="bar mt-1.5"><i style="width:${(r.pct*100).toFixed(0)}%"></i></div>
        <div class="text-[11px] text-themed-mute mt-1 truncate">${r.dimensions.filter(d => d.score != null).slice(0,4).map(d => `${d.label}:${(d.score*100|0)}%`).join(' · ')}</div>
      </div>
    </a>
  `;
}

function bucketLegend() {
  return `<div class="flex flex-wrap gap-1.5">
    ${MATCH_BUCKETS.map(b => `<span class="pill" style="color:${b.swatch};border-color:${b.swatch}55">${escapeHtml(b.label)} · ≥${(b.min*100|0)}%</span>`).join('')}
  </div>`;
}

function modeOffNotice() {
  return `
    <section class="grid gap-4">
      <header>
        <p class="h-eyebrow">Layer 2 · Networking</p>
        <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Alignment</h1>
      </header>
      <div class="card p-4 grid gap-2">
        <p class="text-themed-soft">Your networking profile is currently turned off. Turn it on to match on ambitions, role posture, expertise, and how you ship — not on physical traits.</p>
        <a href="#/profile" class="btn btn-primary w-fit">Open profile</a>
      </div>
    </section>`;
}

export function render(root) {
  const me = store.profile;
  if (!me.modes?.networking) { root.innerHTML = modeOffNotice(); return; }
  const prefs = me.networking.prefs;
  const candidates = SAMPLE_PEOPLE
    .filter(p => p.modes?.networking)
    .map(p => ({ p, r: alignmentCandidate(p, prefs) }))
    .sort((a,b) => b.r.pct - a.r.pct);

  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">Layer 2 · Networking</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Alignment</h1>
          <p class="text-sm text-themed-soft mt-1 max-w-2xl">No physical traits. Score people on ambition horizon, stage, role posture, way of thinking, expertise depth, execution style, domain, and what they're looking for.</p>
        </div>
        ${bucketLegend()}
      </header>

      <div class="grid lg:grid-cols-5 gap-6">
        <div class="lg:col-span-3 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Inputs</h2>
          ${NETWORKING_FIELDS.map(f => fieldRow(f, prefs)).join('')}
        </div>

        <aside class="lg:col-span-2 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Live ranking</h2>
          ${candidates.length ? candidates.slice(0, 12).map(({p}) => candidateRow(p, prefs)).join('') : '<div class="card-soft p-3 text-sm text-themed-mute">No one in the room has a networking profile yet.</div>'}
        </aside>
      </div>
    </section>
  `;

  $$('div[data-field]', root).forEach(box => {
    const field = box.dataset.field;
    box.querySelector('input[data-role="weight"]').addEventListener('input', (e) => {
      const next = setWeight(store.profile.networking.prefs, field, Number(e.target.value));
      store.setProfile({ networking: { ...store.profile.networking, prefs: next } });
      render(root);
    });
    box.querySelectorAll('button[data-role="opt"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const v = btn.dataset.opt;
        let next = store.profile.networking.prefs;
        if (e.altKey) next = toggleExcluded(next, field, v);
        else if (e.shiftKey) next = toggleFilter(next, field, v);
        else next = setTarget(next, field, next.targets?.[field] === v ? '' : v);
        store.setProfile({ networking: { ...store.profile.networking, prefs: next } });
        render(root);
      });
    });
  });
}
