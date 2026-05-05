// Live Floor — the integrated, all-layers view.
// Pulls every engine together: status, match, proximity, identity, rapport, hobbies.

import { SAMPLE_PEOPLE, PROX_ZONES, MATCH_BUCKETS, STATUS_DATING, STATUS_NETWORKING } from './data.js';
import { scoreCandidate } from './engines/match.js';
import { classify } from './engines/proximity.js';
import { resolveView } from './engines/identity.js';
import { progress } from './engines/rapport.js';
import { relate, hobbyMeta } from './engines/hobbies.js';
import { store } from './state.js';
import { $, $$, escapeHtml, initials, colorFor, pct, bus, fmtRel } from './util.js';

let unsubTick = null;
let unsubState = null;

function statusFor(me, p) {
  return me.intent === 'networking' ? STATUS_NETWORKING.find(s=>s.key===p.status) : STATUS_DATING.find(s=>s.key===p.status);
}

function dotFor(p, me, world, muted, reveals) {
  const w = world[p.id] || {};
  const cls = classify({ dist:w.dist, optIn:w.optIn, stable:w.stable, signal:w.signal, muted: !!muted[p.id] });
  if (cls.zone.key === 'outrange' || cls.zone.key === 'unknown') return '';
  const score = scoreCandidate(p, me.prefs);
  // skip people my own status filters out
  const myStatus = me.intent === 'networking' ? me.status.networking : me.status.dating;
  if (myStatus === 'closed' || myStatus === 'offline' || myStatus === 'invisible') return '';
  if ((myStatus === 'selective' || myStatus === 'focused') && score.pct < 0.5) return '';

  // identity reveal — what I see of them on the floor
  const view = resolveView(me, p, score.pct, { reveals, theirReveal: !!reveals[p.id], muted: muted[p.id] });
  // position from world to floor px (assume world is -50..50 → 4%..96%)
  const left = ((w.x||0) + 50) / 100 * 92 + 4;
  const top  = ((w.y||0) + 50) / 100 * 92 + 4;
  const matchClass = score.bucket.key === 'ideal' ? 'match-ideal'
                  : score.bucket.key === 'strong' ? 'match-strong'
                  : score.bucket.key === 'moderate' ? 'match-moderate' : '';
  const muteClass = muted[p.id] ? 'muted' : '';
  const label = view.shows === 'photo' || view.shows === 'reveal' ? initials(p.name)
              : view.shows === 'avatar' ? (p.alias||'').slice(0,2).toUpperCase()
              : view.shows === 'glance' ? '·'
              : '×';
  const bg = view.shows === 'photo' || view.shows === 'reveal' ? colorFor(p.id) : 'var(--panel-2)';
  const filter = view.shows === 'glance' ? 'filter:blur(2px) saturate(.7);' : '';
  return `
    <a href="#/people/${p.id}"
       class="person ${matchClass} ${muteClass}"
       title="${escapeHtml(p.name)} · ${cls.zone.label} · ${score.bucket.label}"
       style="left:${left}%;top:${top}%;background:${bg};${filter}">${escapeHtml(label)}</a>`;
}

function rings() {
  // Visualize the proximity ring boundaries.
  const sizes = [16, 36, 64, 92]; // % of floor diameter
  return sizes.map(s => `<span class="ring" style="width:${s}%;height:${s}%"></span>`).join('');
}

function summaryStats(me, world, muted) {
  const buckets = { nearby:0, adjacent:0, samezone:0, passing:0, hidden:0 };
  let strong = 0, ideal = 0;
  for (const p of SAMPLE_PEOPLE) {
    const w = world[p.id] || {};
    const cls = classify({ dist:w.dist, optIn:w.optIn, stable:w.stable, signal:w.signal, muted:!!muted[p.id] });
    if (buckets[cls.zone.key] !== undefined) buckets[cls.zone.key]++;
    const sc = scoreCandidate(p, me.prefs);
    if (sc.bucket.key === 'strong') strong++;
    if (sc.bucket.key === 'ideal') ideal++;
  }
  return { buckets, strong, ideal };
}

function shortlist(me, world, muted, rapport, reveals) {
  // Combined ranking: match% × proximity-score × rapport-multiplier × hobby-compat
  const myStatus = me.intent === 'networking' ? me.status.networking : me.status.dating;
  const arr = SAMPLE_PEOPLE.map(p => {
    const w = world[p.id] || {};
    const cls = classify({ dist:w.dist, optIn:w.optIn, stable:w.stable, signal:w.signal, muted:!!muted[p.id] });
    const sc  = scoreCandidate(p, me.prefs);
    const rel = relate(me.hobbies, p.hobbies);
    const r   = rapport[p.id] || { points:0 };
    const rp  = progress(r.points || 0);
    const hobbyBoost = rel.headline ? 0.2 + 0.6 * rel.headline.strength : 0;
    const proxBoost  = cls.zone.key === 'nearby' ? 1 : cls.zone.key === 'adjacent' ? 0.7 : cls.zone.key === 'samezone' ? 0.5 : cls.zone.key === 'passing' ? 0.3 : 0;
    const repBoost   = Math.max(0, Math.min(1, r.points / 2000));
    const score = (sc.pct * 0.55) + (proxBoost * 0.2) + (hobbyBoost * 0.15) + (repBoost * 0.1);
    return { p, sc, cls, rel, r, rp, score };
  })
  .filter(x => x.cls.zone.key !== 'hidden' && x.cls.zone.key !== 'outrange' && x.cls.zone.key !== 'muted' && x.cls.zone.key !== 'unknown')
  .filter(x => !((myStatus==='selective'||myStatus==='focused') && x.sc.pct < 0.5))
  .sort((a,b) => b.score - a.score)
  .slice(0,8);
  return arr;
}

function shortlistRow({ p, sc, cls, rel, r, rp, score }) {
  return `
    <a href="#/people/${p.id}" class="card-soft p-3 grid gap-1.5 hover:border-iris-500/60">
      <div class="flex items-center gap-3">
        <span class="avatar w-10 h-10" style="background:linear-gradient(135deg, ${colorFor(p.id)}, var(--panel))">${initials(p.name)}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-medium truncate">${escapeHtml(p.name)}</span>
            <span class="pill" style="color:${cls.zone.color};border-color:${cls.zone.color}55">${cls.zone.label}</span>
            <span class="pill" style="color:${sc.bucket.swatch};border-color:${sc.bucket.swatch}55">${sc.bucket.label} · ${pct(sc.pct)}</span>
            ${rel.teacher ? `<span class="pill pill-sun">🎓 teach: ${escapeHtml(hobbyMeta(rel.teacher.hobby)?.label||'')}</span>` : ''}
            ${rel.student ? `<span class="pill pill-mint">📚 learn: ${escapeHtml(hobbyMeta(rel.student.hobby)?.label||'')}</span>` : ''}
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

export function render(root) {
  if (unsubTick)  { unsubTick(); unsubTick = null; }
  if (unsubState) { unsubState(); unsubState = null; }

  function paint() {
    const me = store.profile;
    const stats = summaryStats(me, store.world, store.muted);
    const dots = SAMPLE_PEOPLE.map(p => dotFor(p, me, store.world, store.muted, store.reveals)).join('');
    const list = shortlist(me, store.world, store.muted, store.rapport, store.reveals);

    root.innerHTML = `
      <section class="grid gap-6">
        <header class="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p class="h-eyebrow">Live Floor</p>
            <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">The room, right now</h1>
            <p class="text-sm text-slate-400 mt-1 max-w-2xl">All five layers, integrated. Your status filters who appears. Distance places them. Identity rules limit what you see. Match % colours the ring. Rapport accrues as long as you stay near.</p>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <span class="pill pill-mint">Nearby ${stats.buckets.nearby}</span>
            <span class="pill pill-iris">Adjacent ${stats.buckets.adjacent}</span>
            <span class="pill" style="color:#7b6cff;border-color:#7b6cff55">SameZone ${stats.buckets.samezone}</span>
            <span class="pill pill-sun">Passing ${stats.buckets.passing}</span>
            <span class="pill" style="color:#ffd073;border-color:#ffd07355">Ideal ${stats.ideal}</span>
            <span class="pill" style="color:#78f3d3;border-color:#78f3d355">Strong ${stats.strong}</span>
          </div>
        </header>

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
              <span class="kbd">Click anyone to open their profile</span>
            </div>
          </div>

          <aside class="lg:col-span-2 grid gap-3">
            <h2 class="font-display font-semibold text-lg">Your shortlist</h2>
            ${list.length ? list.map(shortlistRow).join('') : '<div class="card-soft p-3 text-sm text-slate-500">Nobody fits the active filters yet. Try changing your status or weights.</div>'}
            <a href="#/profile" class="btn">Edit profile & preferences</a>
          </aside>
        </div>
      </section>
    `;
  }

  paint();
  unsubTick = bus.on('tick', paint);
}
