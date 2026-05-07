// Live Floor — the integrated, all-layers view inside the 10m bubble.
// Tab bar lets you switch between Floor (radial map), Shortlist (full list),
// and Proximity (zoned). Selected tab persists across navigation via store.ui.

import { SAMPLE_PEOPLE, PROX_ZONES, MATCH_BUCKETS, STATUS_DATING, STATUS_NETWORKING } from './data.js';
import { scoreCandidate } from './engines/match.js';
import { classify } from './engines/proximity.js';
import { resolveView } from './engines/identity.js';
import { progress } from './engines/rapport.js';
import { relate, hobbyMeta } from './engines/hobbies.js';
import { canSee } from './engines/privacy.js';
import { store } from './state.js';
import { $, $$, escapeHtml, initials, colorFor, pct, bus, fmtRel } from './util.js';

let unsubTick = null;

const VIEW_MODES = [
  { key:'floor',     label:'Floor',     desc:'Radial map of the room.' },
  { key:'shortlist', label:'Shortlist', desc:'Best matches sorted by combined score.' },
  { key:'proximity', label:'Proximity', desc:'Grouped by 10m zone (Reach · Nearby · Room · Passing).' },
];

function getViewMode() {
  const ui = store.getUI('floor', { viewMode: 'floor' });
  return VIEW_MODES.some(v => v.key === ui.viewMode) ? ui.viewMode : 'floor';
}
function setViewMode(v) { store.setUI('floor', { viewMode: v }); }

function privacyCtx(p, sc, cls, reveals, muted) {
  return {
    muted: !!muted[p.id],
    zoneKey: cls.zone.key,
    matchPct: sc.pct,
    viewerReveal: !!reveals[p.id],
    subjectReveal: !!reveals[p.id],
  };
}

function enrich(me, world, muted, rapport, reveals) {
  return SAMPLE_PEOPLE.map(p => {
    const w = world[p.id] || {};
    const cls = classify({ dist:w.dist, optIn:w.optIn, stable:w.stable, signal:w.signal, muted:!!muted[p.id] });
    const sc  = scoreCandidate(p, me.prefs);
    const rel = relate(me.hobbies, p.hobbies);
    const r   = rapport[p.id] || { points:0 };
    const rp  = progress(r.points || 0);
    const hobbyBoost = rel.headline ? 0.2 + 0.6 * rel.headline.strength : 0;
    const proxBoost  = cls.zone.key === 'reach' ? 1.2 : cls.zone.key === 'nearby' ? 1 : cls.zone.key === 'room' ? 0.6 : cls.zone.key === 'passing' ? 0.3 : 0;
    const repBoost   = Math.max(0, Math.min(1, r.points / 2000));
    const score = (sc.pct * 0.55) + (proxBoost * 0.2) + (hobbyBoost * 0.15) + (repBoost * 0.1);
    const ctx = privacyCtx(p, sc, cls, reveals, muted);
    return { p, w, cls, sc, rel, r, rp, score, ctx };
  });
}

function visibleRows(me, all) {
  const myStatus = me.intent === 'networking' ? me.status.networking : me.status.dating;
  return all
    .filter(x => x.cls.zone.key !== 'hidden' && x.cls.zone.key !== 'outrange' && x.cls.zone.key !== 'muted' && x.cls.zone.key !== 'unknown')
    .filter(x => canSee(me, x.p, 'showOnFloor', x.ctx))
    .filter(x => !((myStatus==='selective'||myStatus==='focused') && x.sc.pct < 0.5));
}

function summaryStats(visible) {
  const buckets = { reach:0, nearby:0, room:0, passing:0, hidden:0 };
  let strong = 0, ideal = 0;
  for (const x of visible) {
    if (buckets[x.cls.zone.key] !== undefined) buckets[x.cls.zone.key]++;
    if (x.sc.bucket.key === 'strong') strong++;
    if (x.sc.bucket.key === 'ideal') ideal++;
  }
  return { buckets, strong, ideal };
}

// ----- View: Floor (radial) --------------------------------------------------

function dotFor(me, x) {
  const { p, w, cls, sc, ctx } = x;
  if (cls.zone.key === 'outrange' || cls.zone.key === 'unknown') return '';
  const myStatus = me.intent === 'networking' ? me.status.networking : me.status.dating;
  if (myStatus === 'closed' || myStatus === 'offline' || myStatus === 'invisible') return '';
  if ((myStatus === 'selective' || myStatus === 'focused') && sc.pct < 0.5) return '';
  if (!canSee(me, p, 'showOnFloor', ctx)) return '';
  const view = resolveView(me, p, sc.pct, { reveals: store.reveals, theirReveal: !!store.reveals[p.id], muted: store.muted[p.id], zoneKey: cls.zone.key });
  const showsName = (view.shows === 'photo' || view.shows === 'reveal') && canSee(me, p, 'showName', ctx);
  const left = ((w.x||0) + 12) / 24 * 92 + 4;
  const top  = ((w.y||0) + 12) / 24 * 92 + 4;
  const matchClass = sc.bucket.key === 'ideal' ? 'match-ideal'
                  : sc.bucket.key === 'strong' ? 'match-strong'
                  : sc.bucket.key === 'moderate' ? 'match-moderate' : '';
  const muteClass = store.muted[p.id] ? 'muted' : '';
  const label = showsName ? initials(p.name)
              : view.shows === 'avatar' ? (p.alias||'').slice(0,2).toUpperCase()
              : view.shows === 'glance' ? '·'
              : '×';
  const bg = (view.shows === 'photo' || view.shows === 'reveal') ? colorFor(p.id) : 'var(--panel-2)';
  const filter = view.shows === 'glance' ? 'filter:blur(2px) saturate(.7);' : '';
  const labelTxt = showsName ? p.name : '@'+p.alias;
  return `
    <a href="#/people/${p.id}"
       class="person ${matchClass} ${muteClass}"
       title="${escapeHtml(labelTxt)} · ${cls.zone.label} · ${sc.bucket.label}"
       style="left:${left}%;top:${top}%;background:${bg};${filter}">${escapeHtml(label)}</a>`;
}

function rings() {
  const sizes = [16, 41, 83, 100];
  return sizes.map(s => `<span class="ring" style="width:${s}%;height:${s}%"></span>`).join('');
}

function shortRow(me, x) {
  const { p, sc, cls, rel, r, rp, score, ctx } = x;
  const showsName = canSee(me, p, 'showName', ctx);
  const showsHobbies = canSee(me, p, 'showHobbies', ctx);
  return `
    <a href="#/people/${p.id}" class="card-soft p-3 grid gap-1.5 hover:border-iris-500/60">
      <div class="flex items-center gap-3">
        <span class="avatar w-10 h-10" style="background:linear-gradient(135deg, ${colorFor(p.id)}, var(--panel))">${showsName ? initials(p.name) : (p.alias||'').slice(0,2).toUpperCase()}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-medium truncate">${escapeHtml(showsName ? p.name : '@'+p.alias)}</span>
            <span class="pill" style="color:${cls.zone.color};border-color:${cls.zone.color}55">${cls.zone.label}</span>
            <span class="pill" style="color:${sc.bucket.swatch};border-color:${sc.bucket.swatch}55">${sc.bucket.label} · ${pct(sc.pct)}</span>
            ${showsHobbies && rel.teacher ? `<span class="pill pill-sun">🎓 teach: ${escapeHtml(hobbyMeta(rel.teacher.hobby)?.label||'')}</span>` : ''}
            ${showsHobbies && rel.student ? `<span class="pill pill-mint">📚 learn: ${escapeHtml(hobbyMeta(rel.student.hobby)?.label||'')}</span>` : ''}
          </div>
          <div class="text-[11px] text-slate-500 mt-0.5">${rp.tier.label} · ${Math.round(r.points||0)} pts</div>
        </div>
        <div class="text-right">
          <div class="font-display font-semibold">${pct(score)}</div>
          <div class="text-[10px] text-slate-500">combined</div>
        </div>
      </div>
      <div class="bar"><i style="width:${(score*100).toFixed(0)}%"></i></div>
    </a>`;
}

function floorView(me, visible) {
  const top = [...visible].sort((a,b) => b.score - a.score).slice(0, 8);
  const dots = visible.map(x => dotFor(me, x)).join('');
  return `
    <div class="grid lg:grid-cols-5 gap-6">
      <div class="lg:col-span-3 grid gap-3">
        <div class="floor card-glow">
          ${rings()}
          <div class="you" title="You"></div>
          ${dots}
        </div>
        <div class="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
          <span class="flex items-center gap-1"><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:999px;background:#fff;"></span> You</span>
          <span class="flex items-center gap-1"><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:999px;background:#ffd073;"></span> Ideal</span>
          <span class="flex items-center gap-1"><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:999px;background:#78f3d3;"></span> Strong</span>
          <span class="flex items-center gap-1"><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:999px;background:#9b8cff;"></span> Moderate</span>
          <span class="kbd">Rings: 2m · 5m · 10m</span>
        </div>
      </div>
      <aside class="lg:col-span-2 grid gap-3">
        <h2 class="font-display font-semibold text-lg">Top of shortlist</h2>
        ${top.length ? top.map(x => shortRow(me, x)).join('') : '<div class="card-soft p-3 text-sm text-slate-500">Nobody fits the active filters yet.</div>'}
      </aside>
    </div>`;
}

function shortlistView(me, visible) {
  const sorted = [...visible].sort((a,b) => b.score - a.score);
  return `
    <div class="grid gap-3">
      <div class="flex items-center justify-between text-xs text-slate-500">
        <span>${sorted.length} visible · sorted by combined score</span>
        <span>match% × 0.55 · prox × 0.20 · hobby × 0.15 · rapport × 0.10</span>
      </div>
      ${sorted.length ? sorted.map(x => shortRow(me, x)).join('') : '<div class="card-soft p-3 text-sm text-slate-500">Empty room. Adjust filters or privacy.</div>'}
    </div>`;
}

function proximityView(me, visible) {
  const groups = {};
  for (const z of PROX_ZONES) groups[z.key] = [];
  for (const x of visible) (groups[x.cls.zone.key] ||= []).push(x);
  const ordered = ['reach','nearby','room','passing'];
  return `
    <div class="grid lg:grid-cols-2 gap-3">
      ${ordered.map(zk => {
        const z = PROX_ZONES.find(x => x.key === zk);
        const items = (groups[zk] || []).sort((a,b) => b.score - a.score);
        return `
          <div class="card p-4 grid gap-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${z.color}"></span>
                <h3 class="font-display font-semibold">${escapeHtml(z.label)}</h3>
                <span class="pill" style="color:${z.color};border-color:${z.color}55">${items.length}</span>
              </div>
              <span class="text-[11px] text-slate-500">${escapeHtml(z.copy)}</span>
            </div>
            ${items.length ? items.map(x => shortRow(me, x)).join('') : '<div class="card-soft p-3 text-xs text-slate-500">No one in this zone right now.</div>'}
          </div>`;
      }).join('')}
    </div>`;
}

// ----- Tab bar ---------------------------------------------------------------

function tabBar(active) {
  return `
    <div class="flex items-center gap-1 flex-wrap" role="tablist">
      ${VIEW_MODES.map(v => `
        <button class="tab" data-vm="${v.key}" aria-current="${v.key===active?'page':'false'}" title="${escapeHtml(v.desc)}">${escapeHtml(v.label)}</button>
      `).join('')}
    </div>`;
}

// ----- Render ---------------------------------------------------------------

export function render(root) {
  if (unsubTick) { unsubTick(); unsubTick = null; }

  function paint() {
    if (!location.hash.startsWith('#/floor')) {
      if (unsubTick) { unsubTick(); unsubTick = null; }
      return;
    }
    const me = store.profile;
    const vm = getViewMode();
    const all = enrich(me, store.world, store.muted, store.rapport, store.reveals);
    const visible = visibleRows(me, all);
    const stats = summaryStats(visible);

    let body = '';
    if (vm === 'floor')          body = floorView(me, visible);
    else if (vm === 'shortlist') body = shortlistView(me, visible);
    else if (vm === 'proximity') body = proximityView(me, visible);

    root.innerHTML = `
      <section class="grid gap-6">
        <header class="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p class="h-eyebrow">Live Floor · 10m bubble</p>
            <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">The room, right now</h1>
            <p class="text-sm text-slate-400 mt-1 max-w-2xl">All five layers integrated inside a 10m venue bubble — with privacy matrix gates applied. <a href="#/privacy" class="text-iris-400 hover:underline">Edit privacy</a>.</p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span class="pill pill-mint">Reach ${stats.buckets.reach}</span>
            <span class="pill pill-iris">Nearby ${stats.buckets.nearby}</span>
            <span class="pill" style="color:#7b6cff;border-color:#7b6cff55">Room ${stats.buckets.room}</span>
            <span class="pill pill-sun">Passing ${stats.buckets.passing}</span>
            <span class="pill" style="color:#ffd073;border-color:#ffd07355">Ideal ${stats.ideal}</span>
            <span class="pill" style="color:#78f3d3;border-color:#78f3d355">Strong ${stats.strong}</span>
          </div>
        </header>

        <div class="flex items-center justify-between gap-3 flex-wrap">
          ${tabBar(vm)}
          <div class="flex gap-2">
            <a href="#/profile" class="btn btn-sm">Profile</a>
            <a href="#/privacy" class="btn btn-sm">Privacy</a>
          </div>
        </div>

        ${body}
      </section>
    `;

    $$('button[data-vm]', root).forEach(b => b.addEventListener('click', () => {
      setViewMode(b.dataset.vm);
      paint();
    }));
  }

  paint();
  unsubTick = bus.on('tick', paint);
}
