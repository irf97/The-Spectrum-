// Layer 2 (networking) — "Your networking alignment" screen.
// Operates on candidate.networking.<field> and me.networking.prefs. No physical
// or gender axes. Mirrors layer2.js (physical preferences) layout for consistency.
// Dignity (Living Mesh §11): never rank people as objects. This screen shows
// only counts per bucket — no individual names, no ordered list.

import { NETWORKING_FIELDS, MATCH_BUCKETS, SAMPLE_PEOPLE } from './data.js';
import { alignmentCandidate, setWeight, toggleExcluded, toggleFilter, setTarget } from './engines/alignment.js';
import { classify } from './engines/proximity.js';
import { store } from './state.js';
import { $$, escapeHtml } from './util.js';

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

function bucketLegend() {
  return `<div class="flex flex-wrap gap-1.5">
    ${MATCH_BUCKETS.map(b => `<span class="pill" style="color:${b.swatch};border-color:${b.swatch}55">${escapeHtml(b.label)} · ≥${(b.min*100|0)}%</span>`).join('')}
  </div>`;
}

// Count-only projection: how the user's networking preferences project onto
// the people currently reachable in the room. No names, no per-person order.
function projectionPanel(prefs) {
  const reachable = SAMPLE_PEOPLE
    .filter(p => p.modes?.networking)
    .filter(p => {
      const z = classify(p).zone.key;
      return z !== 'hidden' && z !== 'outrange' && z !== 'muted' && z !== 'unknown';
    });
  const counts = Object.fromEntries(MATCH_BUCKETS.map(b => [b.key, 0]));
  for (const p of reachable) {
    const r = alignmentCandidate(p, prefs);
    counts[r.bucket.key] = (counts[r.bucket.key] ?? 0) + 1;
  }
  const rows = MATCH_BUCKETS.map(b => `
    <div class="flex items-center justify-between gap-3">
      <span class="pill" style="color:${b.swatch};border-color:${b.swatch}55"><span class="dot"></span>${escapeHtml(b.label)}</span>
      <span class="text-sm text-themed-soft tabular-nums">${counts[b.key]}</span>
    </div>
  `).join('');
  return `
    <div class="card p-3 grid gap-3">
      <div>
        <h2 class="font-display font-semibold text-lg">How your preferences project on this room</h2>
        <p class="text-[11px] text-themed-mute mt-0.5">Counts only. The Spectrum never ranks people into a list.</p>
      </div>
      <div class="grid gap-1.5">${rows}</div>
      <div class="text-xs text-themed-soft">${reachable.length} ${reachable.length === 1 ? 'person' : 'people'} currently reachable.</div>
      <a href="#/floor" class="btn btn-primary w-fit">To meet someone, look around the room — the Floor is your radar.</a>
    </div>
  `;
}

function howThisIsUsed() {
  return `
    <div class="card-soft p-3 grid gap-2">
      <h2 class="font-display font-semibold">How this is used</h2>
      <ul class="grid gap-1.5 text-sm text-themed-soft list-disc pl-5">
        <li>The number is computed on your device against your own preference vector. Nobody else sees it.</li>
        <li>It glows rings on dots on your own Floor radar — a private cue for you, not a label about the other person.</li>
        <li>It can pull your own surface down to avatar via the reveal self-simplify filter (Layer 4) — to keep your room simple.</li>
        <li>It does NOT unlock more of the other person. Reveal still requires a mutual handshake (both sides flag each other).</li>
        <li>It does NOT order anyone into a list. People you might meet are grouped by proximity, not by fit.</li>
      </ul>
    </div>
  `;
}

function modeOffNotice() {
  return `
    <section class="grid gap-4">
      <header>
        <p class="h-eyebrow">Layer 2 · Networking</p>
        <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Your networking alignment</h1>
      </header>
      <div class="card p-4 grid gap-2">
        <p class="text-themed-soft">Your networking profile is currently turned off. Turn it on to align on ambitions, role posture, expertise, and how you ship — not on physical traits.</p>
        <a href="#/profile" class="btn btn-primary w-fit">Open profile</a>
      </div>
    </section>`;
}

export function render(root) {
  const me = store.profile;
  if (!me.networking?.enabled) { root.innerHTML = modeOffNotice(); return; }
  const persona = store.activePersonaFor('networking');
  const prefs = persona.prefs;

  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">Layer 2 · Networking</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Your networking alignment</h1>
          <p class="text-sm text-themed-soft mt-1 max-w-2xl">A private filter on your own search. No physical traits — align on ambition horizon, stage, role posture, way of thinking, expertise depth, execution style, domain, and what you're looking for. The score shapes what the Floor highlights for <em>you</em>; it never ranks or exposes anyone else.</p>
        </div>
        ${bucketLegend()}
      </header>

      <div class="grid lg:grid-cols-5 gap-6">
        <div class="lg:col-span-3 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Inputs</h2>
          ${NETWORKING_FIELDS.map(f => fieldRow(f, prefs)).join('')}
        </div>

        <aside class="lg:col-span-2 grid gap-4">
          ${projectionPanel(prefs)}
          ${howThisIsUsed()}
        </aside>
      </div>
    </section>
  `;

  $$('div[data-field]', root).forEach(box => {
    const field = box.dataset.field;
    box.querySelector('input[data-role="weight"]').addEventListener('input', (e) => {
      const next = setWeight(store.activePersonaFor('networking').prefs, field, Number(e.target.value));
      store.updatePersona('networking', store.activePersonaFor('networking').id, { prefs: next });
      render(root);
    });
    box.querySelectorAll('button[data-role="opt"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const v = btn.dataset.opt;
        let next = store.activePersonaFor('networking').prefs;
        if (e.altKey) next = toggleExcluded(next, field, v);
        else if (e.shiftKey) next = toggleFilter(next, field, v);
        else next = setTarget(next, field, next.targets?.[field] === v ? '' : v);
        store.updatePersona('networking', store.activePersonaFor('networking').id, { prefs: next });
        render(root);
      });
    });
  });
}
