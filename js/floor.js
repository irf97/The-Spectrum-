// Live Floor — the integrated, all-layers view inside the 10m bubble.
// Tab bar lets you switch between Floor (radial map), Who's around (zoned list),
// and Proximity (zoned detail). People are grouped by proximity, never ranked.
// Look around the room, not the screen — the radar augments noticing, it does
// not produce a leaderboard of humans.

import { SAMPLE_PEOPLE, PROX_ZONES, MATCH_BUCKETS } from './data.js';
import { scoreCandidate } from './engines/match.js';
import { alignmentCandidate } from './engines/alignment.js';
import { classify } from './engines/proximity.js';
import { resolveView } from './engines/identity.js';
import { progress } from './engines/rapport.js';
import { relate, hobbyMeta } from './engines/hobbies.js';
import { canSee } from './engines/privacy.js';
import { store } from './state.js';
import { $, $$, escapeHtml, initials, colorFor, pct, bus, fmtRel } from './util.js';

let unsubTick = null;
let unsubState = null;

const VIEW_MODES = [
  { key:'floor',     label:'Floor',       desc:'Radial map of the room.' },
  { key:'around',    label:"Who's around", desc:"People in your 10m bubble, grouped by zone (no ranking)." },
  { key:'proximity', label:'Proximity',   desc:'Zoned detail (Reach · Nearby · Room · Passing).' },
];

const ZONE_ORDER = ['reach','nearby','room','passing'];

function getViewMode() {
  const ui = store.getUI('floor', { viewMode: 'floor' });
  // Migrate legacy 'shortlist' value to the dignity-aligned 'around' tab.
  const v = ui.viewMode === 'shortlist' ? 'around' : ui.viewMode;
  return VIEW_MODES.some(m => m.key === v) ? v : 'floor';
}
function setViewMode(v) { store.setUI('floor', { viewMode: v }); }

function byName(a, b) {
  const an = (a.p.name || a.p.alias || '').toLowerCase();
  const bn = (b.p.name || b.p.alias || '').toLowerCase();
  return an < bn ? -1 : an > bn ? 1 : 0;
}

function privacyCtx(p, sc, cls, reveals, muted) {
  return {
    muted: !!muted[p.id],
    zoneKey: cls.zone.key,
    matchPct: sc.pct,
    viewerReveal: !!reveals[p.id],
    subjectReveal: !!reveals[p.id],
  };
}

function enrich(me, world, muted, rapport, reveals, mode) {
  const datingPersona     = store.activePersonaFor('dating');
  const networkingPersona = store.activePersonaFor('networking');
  const datingActive      = mode === 'dating'     && !!me.dating?.enabled;
  const networkingActive  = mode === 'networking' && !!me.networking?.enabled;
  return SAMPLE_PEOPLE.map(p => {
    const w = world[p.id] || {};
    const cls = classify({ dist:w.dist, optIn:w.optIn, stable:w.stable, signal:w.signal, muted:!!muted[p.id] });
    const datingShared     = datingActive     && !!p.modes?.dating     && !!datingPersona;
    const networkingShared = networkingActive && !!p.modes?.networking && !!networkingPersona;
    const unknownBucket = MATCH_BUCKETS.find(b => b.key === 'unknown');
    // scoreCandidate / alignmentCandidate are used here only as the viewer's
    // own private filter (glow ring + count summaries). They are never used to
    // sort or rank people in any rendered list. — Living Mesh §11.
    const sc  = datingShared     ? scoreCandidate(p, datingPersona.prefs)         : { pct: 0, bucket: unknownBucket };
    const al  = networkingShared ? alignmentCandidate(p, networkingPersona.prefs) : { pct: 0, bucket: unknownBucket };
    const rel = relate(me.hobbies, p.hobbies);
    const r   = rapport[p.id] || { points:0 };
    const rp  = progress(r.points || 0);

    const primary  = mode === 'networking' ? al : sc;
    const matchPct = mode === 'networking' ? (networkingShared ? al.pct : 0) : (datingShared ? sc.pct : 0);
    const ctx = privacyCtx(p, primary, cls, reveals, muted);
    return { p, w, cls, sc, al, primary, matchPct, datingShared, networkingShared, rel, r, rp, ctx };
  });
}

function visibleRows(me, all, mode) {
  const persona = store.activePersonaFor(mode);
  const status = persona?.status;
  return all
    .filter(x => x.cls.zone.key !== 'hidden' && x.cls.zone.key !== 'outrange' && x.cls.zone.key !== 'muted' && x.cls.zone.key !== 'unknown')
    .filter(x => mode === 'dating' ? x.datingShared : x.networkingShared)
    .filter(x => canSee(me, x.p, 'showOnFloor', x.ctx))
    .filter(x => {
      // Viewer's own self-filter on their own surface — shaping their own
      // room is allowed; only the ranking of people is forbidden.
      if ((status === 'selective' || status === 'focused') && x.matchPct < 0.5) return false;
      return true;
    });
}

function summaryStats(visible) {
  const buckets = { reach:0, nearby:0, room:0, passing:0, hidden:0 };
  let strong = 0, ideal = 0;
  for (const x of visible) {
    if (buckets[x.cls.zone.key] !== undefined) buckets[x.cls.zone.key]++;
    if (x.primary.bucket.key === 'strong') strong++;
    if (x.primary.bucket.key === 'ideal') ideal++;
  }
  return { buckets, strong, ideal };
}

function groupByZone(visible) {
  const groups = {};
  for (const zk of ZONE_ORDER) groups[zk] = [];
  for (const x of visible) {
    if (groups[x.cls.zone.key]) groups[x.cls.zone.key].push(x);
  }
  for (const zk of ZONE_ORDER) groups[zk].sort(byName);
  return groups;
}

// ----- View: Floor (radial) --------------------------------------------------

function dotFor(me, x) {
  const { p, w, cls, primary, matchPct, ctx } = x;
  if (cls.zone.key === 'outrange' || cls.zone.key === 'unknown') return '';
  if (!canSee(me, p, 'showOnFloor', ctx)) return '';
  const view = resolveView(me, p, matchPct, { reveals: store.reveals, theirReveal: !!store.reveals[p.id], muted: store.muted[p.id], zoneKey: cls.zone.key });
  const showsName = (view.shows === 'photo' || view.shows === 'reveal') && canSee(me, p, 'showName', ctx);
  const left = ((w.x||0) + 12) / 24 * 92 + 4;
  const top  = ((w.y||0) + 12) / 24 * 92 + 4;
  // Glow ring on the viewer's own dot is the viewer's private filter cue on
  // their own surface (local-first). It is not a label broadcast about p.
  const matchClass = primary.bucket.key === 'ideal' ? 'match-ideal'
                  : primary.bucket.key === 'strong' ? 'match-strong'
                  : primary.bucket.key === 'moderate' ? 'match-moderate' : '';
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
       title="${escapeHtml(labelTxt)} · ${cls.zone.label}"
       style="left:${left}%;top:${top}%;background:${bg};${filter}">${escapeHtml(label)}</a>`;
}

function rings() {
  const sizes = [16, 41, 83, 100];
  return sizes.map(s => `<span class="ring" style="width:${s}%;height:${s}%"></span>`).join('');
}

function personRow(me, x) {
  const { p, sc, al, datingShared, networkingShared, cls, rel, r, rp, primary, ctx } = x;
  const showsName = canSee(me, p, 'showName', ctx);
  const showsHobbies = canSee(me, p, 'showHobbies', ctx);
  // "Your fit" pill = the viewer's own private filter bucket, framed as
  // private. It is not a label broadcast about the person; it is the viewer
  // telling themselves how the room currently reads to them.
  const fitBucket = primary.bucket;
  const fitPill = (datingShared || networkingShared) && fitBucket.key !== 'unknown'
    ? `<span class="pill" title="Your fit (private)" style="color:${fitBucket.swatch};border-color:${fitBucket.swatch}55">your fit · ${escapeHtml(fitBucket.label)}</span>`
    : '';
  return `
    <a href="#/people/${p.id}" class="card-soft p-3 grid gap-1.5 hover:border-iris-500/60">
      <div class="flex items-center gap-3">
        <span class="avatar w-10 h-10" style="background:linear-gradient(135deg, ${colorFor(p.id)}, var(--panel))">${showsName ? initials(p.name) : (p.alias||'').slice(0,2).toUpperCase()}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-medium truncate text-themed">${escapeHtml(showsName ? p.name : '@'+p.alias)}</span>
            <span class="pill" style="color:${cls.zone.color};border-color:${cls.zone.color}55">${escapeHtml(cls.zone.label)}</span>
            ${fitPill}
            ${showsHobbies && rel.teacher ? `<span class="pill pill-sun">🎓 teach: ${escapeHtml(hobbyMeta(rel.teacher.hobby)?.label||'')}</span>` : ''}
            ${showsHobbies && rel.student ? `<span class="pill pill-mint">📚 learn: ${escapeHtml(hobbyMeta(rel.student.hobby)?.label||'')}</span>` : ''}
          </div>
          <div class="text-[11px] text-themed-mute mt-0.5">${escapeHtml(rp.tier.label)} · ${Math.round(r.points||0)} pts</div>
        </div>
      </div>
    </a>`;
}

function zoneSection(me, z, items) {
  return `
    <div class="card p-4 grid gap-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${z.color}"></span>
          <h3 class="font-display font-semibold text-themed">${escapeHtml(z.label)}</h3>
          <span class="pill" style="color:${z.color};border-color:${z.color}55">${items.length}</span>
        </div>
        <span class="text-[11px] text-themed-mute">${escapeHtml(z.copy)}</span>
      </div>
      ${items.length ? items.map(x => personRow(me, x)).join('') : '<div class="card-soft p-3 text-xs text-themed-mute">No one in this zone right now.</div>'}
    </div>`;
}

function floorView(me, visible) {
  const dots = visible.map(x => dotFor(me, x)).join('');
  // Sidebar lists people grouped by zone, alphabetical within each zone.
  // No "top N by combined score" — the radar augments noticing, not ranking.
  const groups = groupByZone(visible);
  const reachZ  = PROX_ZONES.find(z => z.key === 'reach');
  const nearbyZ = PROX_ZONES.find(z => z.key === 'nearby');
  const sideZones = [reachZ, nearbyZ].filter(Boolean);
  const anyVisible = visible.length > 0;
  return `
    <div class="grid lg:grid-cols-5 gap-6">
      <div class="lg:col-span-3 grid gap-3">
        <div class="floor card-glow">
          ${rings()}
          <div class="you" title="You"></div>
          ${dots}
        </div>
        <div class="text-[11px] text-themed-mute flex items-center gap-3 flex-wrap">
          <span class="flex items-center gap-1"><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:999px;background:#fff;"></span> You</span>
          <span class="flex items-center gap-1"><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:999px;background:#ffd073;"></span> Ideal (your filter)</span>
          <span class="flex items-center gap-1"><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:999px;background:#78f3d3;"></span> Strong (your filter)</span>
          <span class="flex items-center gap-1"><span class="dot" style="display:inline-block;width:8px;height:8px;border-radius:999px;background:#9b8cff;"></span> Moderate (your filter)</span>
          <span class="kbd">Rings: 2m · 5m · 10m</span>
        </div>
        <p class="text-[11px] text-themed-mute">Glow rings are your own private filter, drawn on your surface. Look around the room — the radar is here to augment noticing, not to rank people.</p>
      </div>
      <aside class="lg:col-span-2 grid gap-3">
        <h2 class="font-display font-semibold text-lg text-themed">Who's nearby</h2>
        <p class="text-[11px] text-themed-mute">Grouped by proximity. Within a zone, listed alphabetically — no ranking.</p>
        ${anyVisible
          ? sideZones.map(z => zoneSection(me, z, groups[z.key] || [])).join('')
          : '<div class="card-soft p-3 text-sm text-themed-mute">Nobody in your bubble matches the active filters right now.</div>'}
      </aside>
    </div>`;
}

function aroundView(me, visible) {
  const groups = groupByZone(visible);
  const anyVisible = visible.length > 0;
  return `
    <div class="grid gap-3">
      <div class="flex items-center justify-between text-xs text-themed-mute flex-wrap gap-2">
        <span>${visible.length} in your bubble · grouped by proximity, A→Z within zone</span>
        <span>People are grouped, never ranked.</span>
      </div>
      ${anyVisible
        ? `<div class="grid lg:grid-cols-2 gap-3">
            ${ZONE_ORDER.map(zk => {
              const z = PROX_ZONES.find(x => x.key === zk);
              if (!z) return '';
              return zoneSection(me, z, groups[zk] || []);
            }).join('')}
          </div>`
        : '<div class="card-soft p-3 text-sm text-themed-mute">Empty room. Adjust filters or privacy.</div>'}
    </div>`;
}

function proximityView(me, visible) {
  const groups = groupByZone(visible);
  return `
    <div class="grid lg:grid-cols-2 gap-3">
      ${ZONE_ORDER.map(zk => {
        const z = PROX_ZONES.find(x => x.key === zk);
        if (!z) return '';
        return zoneSection(me, z, groups[zk] || []);
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
  if (unsubTick)  { unsubTick();  unsubTick  = null; }
  if (unsubState) { unsubState(); unsubState = null; }

  function teardown() {
    if (unsubTick)  { unsubTick();  unsubTick  = null; }
    if (unsubState) { unsubState(); unsubState = null; }
  }

  function paint() {
    if (!location.hash.startsWith('#/floor')) {
      teardown();
      return;
    }
    const me = store.profile;
    const mode = store.mode;
    const vm = getViewMode();
    const all = enrich(me, store.world, store.muted, store.rapport, store.reveals, mode);
    const visible = visibleRows(me, all, mode);
    const stats = summaryStats(visible);
    const persona = store.activePersonaFor(mode);

    let body = '';
    if (vm === 'floor')          body = floorView(me, visible);
    else if (vm === 'around')    body = aroundView(me, visible);
    else if (vm === 'proximity') body = proximityView(me, visible);

    root.innerHTML = `
      <section class="grid gap-6">
        <header class="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p class="h-eyebrow">Live Floor · ${mode === 'dating' ? 'Dating' : 'Networking'} · ${escapeHtml(persona?.name || 'no alter ego')}${persona?.roleplay ? ` · as ${escapeHtml(persona.roleplay)}` : ''}</p>
            <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-themed">The room, right now</h1>
            <p class="text-sm text-themed-soft mt-1 max-w-2xl">People in your 10m bubble, grouped by proximity — never ranked. Pick an alter ego in the top-right pill (or <span class="kbd">[</span>/<span class="kbd">]</span> to cycle). Switching alter egos may switch mode automatically. <a href="#/privacy" class="hover:underline" style="color:var(--iris-soft)">Edit privacy</a>.</p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span class="pill pill-mint">Reach ${stats.buckets.reach}</span>
            <span class="pill pill-iris">Nearby ${stats.buckets.nearby}</span>
            <span class="pill" style="color:#7b6cff;border-color:#7b6cff55">Room ${stats.buckets.room}</span>
            <span class="pill pill-sun">Passing ${stats.buckets.passing}</span>
            <span class="pill" style="color:#ffd073;border-color:#ffd07355" title="Your private filter">Ideal · your filter ${stats.ideal}</span>
            <span class="pill" style="color:#78f3d3;border-color:#78f3d355" title="Your private filter">Strong · your filter ${stats.strong}</span>
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
  unsubTick  = bus.on('tick', paint);
  unsubState = bus.on('state:changed', paint);
}
