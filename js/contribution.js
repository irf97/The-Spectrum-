// Contribution coordination screen — the Enschede pilot.
//
// Work finds you: a site's open tasks surface as a swipeable feed, matched on
// persona × proximity × available-now. One tap from "I'd help" to "I'm helping."
// The screen shows the two ledgers side by side and labels them as separate by
// construction: Standing (depth, decaying, gates nothing) and Rewards (grace +
// housing points, proof-gated, earned per discrete deed — never from standing).

import { SITES } from './data.js';
import { matchOffers, residue } from './engines/node.js';
import { standingProgress } from './engines/society.js';
import { aggregate } from './engines/fulfilment.js';
import { taskIntrinsic } from './engines/evidence.js';
import { rewardForEvent, housingPointBalance, graceLedger, rewardDependence } from './engines/reward.js';
import { store } from './state.js';
import { $$, escapeHtml, bus } from './util.js';

let unsubTick = null;
let unsubState = null;

const TASK_ICON = {
  cook_session: '🍳', nutrient_check: '🌱', clean_down: '🧽',
  restock: '📦', build_automation: '🛠',
};

function stakeBadge(stake) {
  if (stake === 'high') return `<span class="pill" style="color:var(--sun);border-color:color-mix(in srgb,var(--sun) 35%,transparent)">high stake</span>`;
  return `<span class="pill" style="color:var(--text-mute);border-color:var(--line)">low stake</span>`;
}

// Show the proof the TASK can offer — not surveillance of the person.
function proofPreview(need) {
  const intrinsic = taskIntrinsic(need, {});
  if (intrinsic.tier === 'strong') {
    const housing = need.stake === 'high';
    return `<span class="pill" title="The task's own trace proves it — no person is tracked" style="color:var(--mint);border-color:color-mix(in srgb,var(--mint) 35%,transparent)">✓ ${escapeHtml(intrinsic.source)} · ${housing ? 'housing points' : 'grace'}</span>`;
  }
  return `<span class="pill" title="No machine trace — grace at most, by design" style="color:var(--text-mute);border-color:var(--line)">presence only · grace</span>`;
}

function offerCard(siteId, o) {
  const n = o.need;
  return `
    <div class="card-soft p-3 grid gap-2">
      <div class="flex items-start gap-3">
        <span class="text-2xl leading-none">${TASK_ICON[n.task] || '◉'}</span>
        <div class="flex-1 min-w-0">
          <div class="font-medium">${escapeHtml(n.label)}</div>
          <div class="text-[11px] text-themed-mute">${escapeHtml(n.copy || '')}</div>
          <div class="flex flex-wrap gap-1.5 mt-1.5">
            <span class="pill" style="color:var(--text-mute);border-color:var(--line)">${n.durationMin}m · ${n.distanceM}m away</span>
            ${stakeBadge(n.stake)}
            ${proofPreview(n)}
          </div>
        </div>
        <button class="btn btn-sm btn-mint" data-fulfil="${escapeHtml(siteId)}" data-need="${escapeHtml(n.id)}">Swipe → I'll do it</button>
      </div>
    </div>`;
}

function feedSection(site, persona) {
  const fulfilled = store.myFulfilledNeedIds();
  const offers = matchOffers(site, persona, { fulfilledNeedIds: fulfilled, maxDistanceM: 600 });
  const res = residue(site, fulfilled);
  return `
    <div class="card p-4 grid gap-3">
      <div>
        <h2 class="font-display font-semibold text-lg">${escapeHtml(site.icon)} ${escapeHtml(site.name)} — work finds you</h2>
        <p class="text-xs text-themed-soft mt-0.5">${escapeHtml(site.copy)}</p>
      </div>
      ${offers.length
        ? `<div class="grid gap-2">${offers.map(o => offerCard(site.id, o)).join('')}</div>`
        : `<div class="card-soft p-3 text-sm text-themed-mute">Every open task here is done. ${res.count === 0 ? 'Nothing in the residue — willingness covered it.' : ''}</div>`}
      <p class="text-[11px] text-themed-mute">The unswiped residue is the demand-side signal: ${res.count} task${res.count === 1 ? '' : 's'} still open. A high residue is the instrumented failure signal — logged as a fail, never hidden.</p>
    </div>`;
}

// Two ledgers, side by side, explicitly separate.
function ledgersSection(site) {
  const me = 'me';
  const events = store.s.fulfilments || [];
  const m = store.s.memberships[site.id] || { points: 0 };
  const sp = standingProgress(m.points || 0);
  const agg = aggregate(events, me);
  const housing = housingPointBalance(events, me);
  const grace = graceLedger(events, me);
  const dep = rewardDependence(events, { siteId: site.id });

  return `
    <div class="grid lg:grid-cols-2 gap-4">
      <div class="card p-4 grid gap-2">
        <div class="flex items-center justify-between">
          <h3 class="font-display font-semibold">Ledger A · Standing</h3>
          <span class="rep-tier ${sp.tier.toneClass}"><span class="swatch"></span>${escapeHtml(sp.tier.label)}</span>
        </div>
        <div class="bar rep tall"><i style="width:${(sp.progress*100).toFixed(0)}%;background:${sp.tier.color}"></i></div>
        <p class="text-[11px] text-themed-mute">Depth only — richer suggestions, mentor visibility. It decays, and it gates nothing. Your access to every task is the same at the floor as at the top.</p>
      </div>
      <div class="card p-4 grid gap-2">
        <h3 class="font-display font-semibold">Ledger B · Rewards</h3>
        <div class="grid gap-1.5 text-sm">
          <div class="flex justify-between"><span>Proven deeds</span><span class="text-themed-soft">${agg.total}</span></div>
          <div class="flex justify-between"><span>Grace earned (→ third spaces)</span><span class="text-themed-soft">${grace.count} ☕</span></div>
          <div class="flex justify-between"><span>Housing-priority points</span><span class="text-themed-soft">${housing.toFixed(1)}</span></div>
          ${dep.total ? `<div class="flex justify-between"><span>Reward-dependence</span><span class="text-themed-soft">${Math.round(dep.fraction*100)}%</span></div>` : ''}
        </div>
        <p class="text-[11px] text-themed-mute">Earned per discrete, proof-verified deed — never from standing. Housing points are stewardship: they decay when you stop contributing, and the floor home is untouched. Above-floor housing depends on an external partner and is out of scope here.</p>
      </div>
    </div>`;
}

function explainer() {
  return `
    <div class="card-soft p-4 grid gap-2">
      <h3 class="font-display font-semibold">How this works — and what it refuses to do</h3>
      <ul class="text-xs text-themed-soft grid gap-1.5">
        <li>· <b>Two ledgers that never read each other.</b> Standing (depth) and Rewards (material) are computed by separate engines; no function reads your standing to decide a reward, access, or housing point. Rank the verified deed, never the reputation.</li>
        <li>· <b>Prove the task, never the person.</b> A grow-unit sensor or a kitchen log proves the deed; there is no movement record of you. Tasks with no machine trace earn grace at most — some of the most human work cannot be materially rewarded, by construction.</li>
        <li>· <b>Reward scaled to stake.</b> Grace (a coffee, routed through an in-mesh café) mops up the residue nobody swipes. Housing-priority points accrue only from high-stake, bound, real-evidence work — the expert automation that shrinks the spine.</li>
        <li>· <b>The floor is unconditional.</b> Food and floor housing are needs, never ranked, never withheld. A newcomer with zero standing and zero deeds has full access to every task and every floor good.</li>
        <li>· <b>The strong co-presence proof is designed, not built.</b> Distance-bounding + secure-element identity is stubbed behind the seam; until the radios exist, material reward rests on task-intrinsic evidence only. Stated, not papered over.</li>
      </ul>
    </div>`;
}

export function render(root) {
  if (unsubTick)  { unsubTick(); unsubTick = null; }
  if (unsubState) { unsubState(); unsubState = null; }

  function paint() {
    if (!location.hash.startsWith('#/contribute')) {
      if (unsubTick)  { unsubTick(); unsubTick = null; }
      if (unsubState) { unsubState(); unsubState = null; }
      return;
    }
    const site = SITES[0];
    const persona = store.profile.contribution || { likes: [], constraints: [], availableNow: true };

    root.innerHTML = `
      <section class="grid gap-6">
        <header>
          <p class="h-eyebrow">Pilot · contribution coordination</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Willingness vs the pay-gate</h1>
          <p class="text-sm text-themed-soft mt-1 max-w-2xl">One Enschede site — a kitchen and a grow-unit. Can a persona-matched, swipe-to-accept mesh run real work on willingness instead of pay? The boring necessary task is the test; the joy is the control. This is a falsification instrument, not a launch.</p>
        </header>
        ${feedSection(site, persona)}
        ${ledgersSection(site)}
        ${explainer()}
      </section>
    `;

    $$('button[data-fulfil]', root).forEach(b => {
      b.addEventListener('click', () => {
        // Two independent writes happen in the store: Ledger B event (with
        // resolved task-intrinsic proof) and Ledger A standing accrual.
        store.fulfilNeed(b.dataset.fulfil, b.dataset.need, { siteReadings: {} });
      });
    });
  }

  paint();
  unsubTick  = bus.on('tick',          paint);
  unsubState = bus.on('state:changed', paint);
}
