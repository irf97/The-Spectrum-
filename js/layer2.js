// Layer 2 — Physical Match Percentage screen.
// Consumes: engines/match.js. Edits: profile.prefs.

import { PHYSICAL_FIELDS, MATCH_BUCKETS, SAMPLE_PEOPLE } from './data.js';
import { scoreCandidate, setWeight, toggleExcluded, toggleFilter, setTarget } from './engines/match.js';
import { store } from './state.js';
import { $, $$, escapeHtml, initials, colorFor, pct } from './util.js';

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
          <div class="text-xs text-slate-500">Weight ${(w*100).toFixed(0)}%</div>
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
      <div class="text-[11px] text-slate-500">Click → set as ideal · Shift+Click → require · Alt+Click → exclude</div>
    </div>
  `;
}

function candidateRow(p, prefs) {
  const r = scoreCandidate(p, prefs);
  return `
    <a href="#/people/${p.id}" class="card-soft p-3 flex items-center gap-3 hover:border-iris-500/60 transition">
      <span class="avatar w-10 h-10" style="background: linear-gradient(135deg, ${colorFor(p.id)}, var(--panel))">${initials(p.name)}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-medium truncate">${escapeHtml(p.name)}</span>
          ${bucketChip(r.bucket, r.pct)}
          ${r.blockedBy.length ? `<span class="pill pill-rose">filter blocked</span>` : ''}
          ${r.excludedHits.length ? `<span class="pill pill-rose">excluded</span>` : ''}
        </div>
        <div class="bar mt-1.5"><i style="width:${(r.pct*100).toFixed(0)}%"></i></div>
        <div class="text-[11px] text-slate-500 mt-1 truncate">${r.dimensions.filter(d => d.score != null).slice(0,4).map(d => `${d.label}:${(d.score*100|0)}%`).join(' · ')}</div>
      </div>
    </a>
  `;
}

function bucketLegend() {
  return `<div class="flex flex-wrap gap-1.5">
    ${MATCH_BUCKETS.map(b => `<span class="pill" style="color:${b.swatch};border-color:${b.swatch}55">${escapeHtml(b.label)} · ≥${(b.min*100|0)}%</span>`).join('')}
  </div>`;
}

export function render(root) {
  const me = store.profile;
  const prefs = me.prefs;
  const candidates = SAMPLE_PEOPLE
    .map(p => ({ p, r: scoreCandidate(p, prefs) }))
    .sort((a,b) => b.r.pct - a.r.pct);

  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">Layer 2</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Physical Match Percentage</h1>
          <p class="text-sm text-slate-400 mt-1 max-w-2xl">Hard non-negotiables, weighted preferences, and excluded values collapse into a single physical fit score per person. This layer measures preference-fit only — chemistry, trust, and compatibility live elsewhere.</p>
        </div>
        ${bucketLegend()}
      </header>

      <div class="grid lg:grid-cols-5 gap-6">
        <div class="lg:col-span-3 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Inputs</h2>
          ${PHYSICAL_FIELDS.map(f => fieldRow(f, prefs)).join('')}
        </div>

        <aside class="lg:col-span-2 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Live ranking</h2>
          ${candidates.slice(0, 12).map(({p}) => candidateRow(p, prefs)).join('')}
        </aside>
      </div>
    </section>
  `;

  // Wire interactions
  $$('div[data-field]', root).forEach(box => {
    const field = box.dataset.field;
    box.querySelector('input[data-role="weight"]').addEventListener('input', (e) => {
      const next = setWeight(store.profile.prefs, field, Number(e.target.value));
      store.setProfile({ prefs: next });
      render(root);
    });
    box.querySelectorAll('button[data-role="opt"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const v = btn.dataset.opt;
        let next = store.profile.prefs;
        if (e.altKey) next = toggleExcluded(next, field, v);
        else if (e.shiftKey) next = toggleFilter(next, field, v);
        else next = setTarget(next, field, next.targets?.[field] === v ? '' : v);
        store.setProfile({ prefs: next });
        render(root);
      });
    });
  });
}
