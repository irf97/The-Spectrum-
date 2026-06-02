// Layer 5b — Societies screen.
// Per-society standing surfaces. Hated → Exalted as descriptive depth; never
// a gate on access. Standing is earned by contributing to the society's
// flourishing (visit, host, mentor, fulfill an advertised need) and fades
// under the same master equation when reaching stops.

import { SOCIETIES, REP_TIERS } from './data.js';
import {
  tierForStanding, standingProgress, summary,
  CONTRIBUTION_KINDS, contributionMeta,
} from './engines/society.js';
import { hobbyMeta } from './engines/hobbies.js';
import { store, REACHING_WINDOW_MS } from './state.js';
import { $, $$, escapeHtml, fmtRel, bus } from './util.js';

let unsubTick = null;
let unsubState = null;

function societyHeaderPills(s) {
  const kindIcon = { place: '⌂', crew: '⌬', pickup: '⏱' }[s.kind] || '◉';
  const kindLabel = { place: 'Place', crew: 'Crew', pickup: 'Pickup' }[s.kind] || s.kind;
  return `
    <span class="pill" style="color:var(--text); border-color:var(--line)">${kindIcon} ${escapeHtml(kindLabel)}</span>
    ${(s.interests || []).slice(0, 3).map(k => {
      const meta = hobbyMeta(k);
      return `<span class="pill" style="color:var(--mint); border-color:color-mix(in srgb, var(--mint) 35%, transparent)">${meta?.icon || '·'} ${escapeHtml(meta?.label || k)}</span>`;
    }).join('')}
  `;
}

function standingBlock(m) {
  const pr = standingProgress(m.points || 0);
  return `
    <div class="grid gap-1.5">
      <div class="flex items-center justify-between text-sm">
        <span class="rep-tier ${pr.tier.toneClass}"><span class="swatch"></span>${escapeHtml(pr.tier.label)}</span>
        <span class="text-themed-mute">
          ${Math.round(m.points)} pts${pr.next ? ` · ${Math.round(pr.into)}/${Math.round(pr.span)} → ${pr.next.label}` : ''}
        </span>
      </div>
      <div class="bar rep tall"><i style="width:${(pr.progress*100).toFixed(0)}%; background:${pr.tier.color}"></i></div>
    </div>`;
}

function reachingStatus(m) {
  const now = Date.now();
  const reaching = m.lastReachingTs && (now - m.lastReachingTs) < REACHING_WINDOW_MS;
  if (!m.lastReachingTs) {
    return `<span class="text-[11px] text-themed-mute">no recent reaching — standing at the floor</span>`;
  }
  return `
    <span class="text-[11px] text-themed-mute">
      last reached ${escapeHtml(fmtRel(m.lastReachingTs))}
      · ${reaching ? '<span style="color:var(--mint)">holding</span>' : '<span class="text-themed-soft">decaying toward 0</span>'}
    </span>`;
}

function needRow(soc, need, m) {
  const done = m.fulfilledNeeds.includes(need.id);
  const meta = contributionMeta('fulfill_need');
  const kindIcon = { help:'🤝', fix:'🔧', host:'🎯', craft:'🎨', mentor:'🎓' }[need.kind] || '◉';
  return `
    <div class="card-soft p-3 grid gap-1.5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-base leading-none">${kindIcon}</span>
            <span class="font-medium">${escapeHtml(need.label)}</span>
          </div>
          <div class="text-[11px] text-themed-mute">${escapeHtml(need.copy || '')}</div>
        </div>
        <button class="btn btn-sm ${done ? '' : 'btn-mint'}"
                ${done ? 'disabled title="Already fulfilled"' : ''}
                data-fulfill="${escapeHtml(soc.id)}" data-need="${escapeHtml(need.id)}">
          ${done ? 'Done' : `Fulfill +${meta.delta}`}
        </button>
      </div>
    </div>`;
}

function contributionsTail(m) {
  const recent = (m.contributions || []).slice(-4).reverse();
  if (!recent.length) return `<div class="text-[11px] text-themed-mute">No contributions yet — your standing is the unconditional floor. Reach out to change that.</div>`;
  return `
    <div class="grid gap-1">
      ${recent.map(c => {
        const meta = contributionMeta(c.kind);
        return `
          <div class="card-soft p-2 text-xs flex items-center justify-between">
            <span>${escapeHtml(c.note || meta?.label || c.kind)}</span>
            <span class="${c.delta > 0 ? 'text-mint-400' : 'text-rose-400'}" style="${c.delta > 0 ? 'color:var(--mint)' : 'color:var(--rose)'}">
              ${c.delta > 0 ? '+' : ''}${Math.round(c.delta)} · ${escapeHtml(fmtRel(c.ts))}
            </span>
          </div>`;
      }).join('')}
    </div>`;
}

function actionRow(soc, m) {
  const visit = contributionMeta('visit');
  const host  = contributionMeta('host_session');
  const mentor = contributionMeta('mentor');
  const plus  = contributionMeta('manual_plus');
  const minus = contributionMeta('manual_minus');
  return `
    <div class="flex flex-wrap gap-1.5">
      <button class="btn btn-sm" data-contrib="${escapeHtml(soc.id)}" data-kind="visit">+${visit.delta} ${escapeHtml(visit.label)}</button>
      <button class="btn btn-sm" data-contrib="${escapeHtml(soc.id)}" data-kind="host_session">+${host.delta} Host a session</button>
      <button class="btn btn-sm" data-contrib="${escapeHtml(soc.id)}" data-kind="mentor">+${mentor.delta} Mentor</button>
      <button class="btn btn-sm btn-mint" data-contrib="${escapeHtml(soc.id)}" data-kind="manual_plus">+${plus.delta} Note positive</button>
      <button class="btn btn-sm btn-rose" data-contrib="${escapeHtml(soc.id)}" data-kind="manual_minus">${minus.delta} Note rough</button>
    </div>`;
}

function societyCard(soc, m) {
  const openNeeds = (soc.needs || []).filter(n => !m.fulfilledNeeds.includes(n.id));
  return `
    <article class="card p-4 grid gap-3">
      <header class="flex items-start gap-3">
        <span class="avatar w-12 h-12 text-2xl" style="background:linear-gradient(135deg, var(--panel-2), var(--panel))">${soc.icon || '◉'}</span>
        <div class="flex-1 min-w-0">
          <h2 class="font-display text-lg font-semibold">${escapeHtml(soc.name)}</h2>
          <div class="flex flex-wrap items-center gap-1.5 mt-1">${societyHeaderPills(soc)}</div>
          <p class="text-xs text-themed-soft mt-2">${escapeHtml(soc.copy || '')}</p>
        </div>
      </header>

      <div class="grid gap-1.5">
        ${standingBlock(m)}
        ${reachingStatus(m)}
      </div>

      <div class="grid gap-2">
        <h3 class="text-xs uppercase tracking-wider text-themed-mute">Open needs (demand-based — not ranking)</h3>
        ${openNeeds.length
          ? openNeeds.map(n => needRow(soc, n, m)).join('')
          : `<div class="card-soft p-3 text-xs text-themed-mute">No open needs right now. ${(soc.needs || []).length ? 'You’ve answered them all.' : 'Check back later.'}</div>`}
      </div>

      <div class="grid gap-2">
        <h3 class="text-xs uppercase tracking-wider text-themed-mute">Contribute</h3>
        ${actionRow(soc, m)}
      </div>

      <div class="grid gap-1">
        <h3 class="text-xs uppercase tracking-wider text-themed-mute">Recent contributions</h3>
        ${contributionsTail(m)}
      </div>
    </article>`;
}

function tierSummaryBar(sum) {
  return `
    <div class="flex flex-wrap gap-1.5">
      ${REP_TIERS.map(t => `<span class="pill" style="color:${t.color}; border-color:color-mix(in srgb, ${t.color} 35%, transparent)">${escapeHtml(t.label)} · ${sum.counts[t.key]}</span>`).join('')}
      <span class="pill" style="color:var(--mint); border-color:color-mix(in srgb, var(--mint) 35%, transparent)">${sum.withRecentReaching} reaching now</span>
    </div>`;
}

export function render(root) {
  if (unsubTick)  { unsubTick(); unsubTick = null; }
  if (unsubState) { unsubState(); unsubState = null; }

  function paint() {
    if (!location.hash.startsWith('#/societies')) {
      if (unsubTick)  { unsubTick(); unsubTick = null; }
      if (unsubState) { unsubState(); unsubState = null; }
      return;
    }
    const memberships = store.s.memberships || {};
    const sum = summary(memberships);

    root.innerHTML = `
      <section class="grid gap-6">
        <header class="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p class="h-eyebrow">Layer 5 · societies</p>
            <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Societies</h1>
            <p class="text-sm text-themed-soft mt-1 max-w-2xl">
              Places, crews, and pickups you've built standing with by helping them fruit.
              The same master equation as per-person rapport: hold only by reaching.
              Standing modifies depth and suggestions inside the society — it never gates
              who can show up. Every aeon's floor here is unconditional.
            </p>
          </div>
          ${tierSummaryBar(sum)}
        </header>

        <div class="grid lg:grid-cols-2 gap-6">
          ${SOCIETIES.map(soc => societyCard(soc, memberships[soc.id] || { points: 0, lastReachingTs: 0, visits: 0, contributions: [], fulfilledNeeds: [] })).join('')}
        </div>

        <div class="card-soft p-4 grid gap-2">
          <h3 class="font-display font-semibold">How this layer works</h3>
          <ul class="text-xs text-themed-soft grid gap-1.5">
            <li>· Each society is a local-authority node — it owns its own scope. Your Hated→Exalted standing at one society tells you nothing about your standing at another.</li>
            <li>· Standing is held only by reaching: visiting, hosting, mentoring, fulfilling an advertised need. The tick decays your standing back toward the neutral floor when you stop showing up.</li>
            <li>· Tiers describe depth: more suggestions, more mentor visibility, easier crosswalks to sister places. They never gate whether you can enter, message, or be seen.</li>
            <li>· "Open needs" are the society's own asks (a barista shift, an organiser, a tutor). Fulfilling one is the strongest reaching event. Demand-based, not ranking.</li>
            <li>· Negative notes count too — and they fade just like positive ones. No permanent stigma; nothing is held by inertia.</li>
          </ul>
        </div>
      </section>
    `;

    // Wire interactions in-place (no re-render destroying focus).
    $$('button[data-contrib]', root).forEach(b => {
      b.addEventListener('click', () => {
        store.contributeToSociety(b.dataset.contrib, b.dataset.kind);
      });
    });
    $$('button[data-fulfill]', root).forEach(b => {
      b.addEventListener('click', () => {
        store.fulfillSocietyNeed(b.dataset.fulfill, b.dataset.need);
      });
    });
  }

  paint();
  unsubTick  = bus.on('tick',          paint);
  unsubState = bus.on('state:changed', paint);
}
