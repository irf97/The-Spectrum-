// Person detail page — every layer's view of a single individual.
// Honours the privacy matrix when displaying name/photo and gating reveal/message buttons.

import { SAMPLE_PEOPLE, STATUS_DATING, STATUS_NETWORKING, PHYSICAL_FIELDS, MATCH_BUCKETS } from './data.js';
import { scoreCandidate } from './engines/match.js';
import { alignmentCandidate } from './engines/alignment.js';
import { classify } from './engines/proximity.js';
import { resolveView, revealGrantRemainingMs } from './engines/identity.js';
import { progress, MANUAL_DELTAS } from './engines/rapport.js';
import { relate, hobbyMeta, rankFor } from './engines/hobbies.js';
import { canSee, effectiveTier, tierMeta, axisMeta } from './engines/privacy.js';
import { store, REACHING_WINDOW_MS } from './state.js';
import { $, $$, escapeHtml, initials, colorFor, pct, fmtRel, fmtMin, bus } from './util.js';

// Module-scope tick subscription so the reveal-grant TTL countdown and the
// rapport reaching/decaying pill stay live without a full re-render (which
// would steal focus from inputs and re-bind every listener every second).
let unsubTick = null;

export function render(root, params) {
  if (unsubTick) { unsubTick(); unsubTick = null; }
  const id = params.id;
  const p = SAMPLE_PEOPLE.find(x => x.id === id);
  if (!p) {
    root.innerHTML = `<div class="card p-6 text-center"><h1 class="font-display text-xl">Person not found</h1><a href="#/floor" class="btn mt-3">Back to floor</a></div>`;
    return;
  }
  const me = store.profile;
  const w  = store.world[p.id] || {};
  const rapport = store.rapport[p.id] || { points:0, sharedSessions:0, manualNotes:[] };
  const muted = !!store.muted[p.id];
  const revealed = !!store.reveals[p.id];

  const datingPersona     = store.activePersonaFor('dating');
  const networkingPersona = store.activePersonaFor('networking');
  const datingShared     = !!me.dating?.enabled     && !!p.modes?.dating     && !!datingPersona;
  const networkingShared = !!me.networking?.enabled && !!p.modes?.networking && !!networkingPersona;
  const unknownBucket = MATCH_BUCKETS.find(b => b.key === 'unknown');
  const sc  = datingShared     ? scoreCandidate(p, datingPersona.prefs)         : { pct: 0, bucket: unknownBucket, dimensions: [], blockedBy: [], excludedHits: [] };
  const al  = networkingShared ? alignmentCandidate(p, networkingPersona.prefs) : { pct: 0, bucket: unknownBucket, dimensions: [], blockedBy: [], excludedHits: [] };
  const primaryPct = Math.max(datingShared ? sc.pct : 0, networkingShared ? al.pct : 0);
  const cls = classify({ dist:w.dist, optIn:w.optIn, stable:w.stable, signal:w.signal, muted });
  const ctx = {
    muted,
    zoneKey: cls.zone.key,
    matchPct: primaryPct,
    viewerReveal: revealed,
    subjectReveal: revealed, // simulation: treat their reveal as mirroring yours
  };
  const view = resolveView(me, p, primaryPct, { reveals: store.reveals, theirReveal: revealed, muted, zoneKey: cls.zone.key });
  const rel = relate(me.hobbies, p.hobbies);
  const pr = progress(rapport.points || 0);
  const reaching = rapport.lastReachingTs && (Date.now() - rapport.lastReachingTs) < REACHING_WINDOW_MS;
  const pIsDating     = !!p.modes?.dating;
  const pIsNetworking = !!p.modes?.networking;
  const datingStatus     = STATUS_DATING.find(s => s.key === p.status);
  const networkingStatus = STATUS_NETWORKING.find(s => s.key === p.status);

  const showsName = canSee(me, p, 'showName', ctx);
  const showsHobbies = canSee(me, p, 'showHobbies', ctx);
  const showsStatus = canSee(me, p, 'showStatus', ctx);
  const canMessage = canSee(me, p, 'receiveMessages', ctx);
  const canRequestReveal = canSee(me, p, 'receiveRevealRequests', ctx);
  const isOnFloor = canSee(me, p, 'showOnFloor', ctx);

  const headerLabel = showsName ? escapeHtml(p.name) : '@'+escapeHtml(p.alias);
  const headerInitials = (view.shows === 'photo' || view.shows === 'reveal') && showsName
    ? initials(p.name)
    : view.shows === 'avatar' ? (p.alias||'').slice(0,2).toUpperCase()
    : view.shows === 'glance' ? '·' : '×';

  root.innerHTML = `
    <section class="grid gap-6">
      <a href="#/floor" class="text-xs text-themed-soft">← Back to floor</a>

      <div class="card p-5 grid sm:grid-cols-[auto_1fr_auto] items-center gap-4">
        <span class="avatar w-20 h-20 text-xl" style="background:linear-gradient(135deg, ${colorFor(p.id)}, var(--panel))">
          ${headerInitials}
        </span>
        <div>
          <h1 class="font-display text-2xl font-semibold">${headerLabel}</h1>
          <div class="flex items-center gap-2 mt-1 flex-wrap">
            <span class="pill" style="color:${cls.zone.color};border-color:${cls.zone.color}55">${escapeHtml(cls.zone.label)} · ${(w.dist||0).toFixed(1)}m</span>
            ${datingShared ? `<span class="pill" title="Your private preference-fit on your own search — not a label about this person." style="color:${sc.bucket.swatch};border-color:${sc.bucket.swatch}55">♥ your fit: ${escapeHtml(sc.bucket.label)} · ${pct(sc.pct)}</span>` : ''}
            ${networkingShared ? `<span class="pill" title="Your private preference-fit on your own search — not a label about this person." style="color:${al.bucket.swatch};border-color:${al.bucket.swatch}55">◆ your fit: ${escapeHtml(al.bucket.label)} · ${pct(al.pct)}</span>` : ''}
            ${showsStatus && pIsDating && datingStatus ? `<span class="pill pill-rose">${escapeHtml(datingStatus.icon)} dating · ${escapeHtml(datingStatus.label)}</span>` : ''}
            ${showsStatus && pIsNetworking && networkingStatus ? `<span class="pill pill-mint">${escapeHtml(networkingStatus.icon)} net · ${escapeHtml(networkingStatus.label)}</span>` : ''}
            <span class="pill" style="color:${pr.tier.color};border-color:${pr.tier.color}55">${escapeHtml(pr.tier.label)}</span>
            ${showsHobbies && rel.teacher ? `<span class="pill pill-sun">🎓 Teacher in ${escapeHtml(hobbyMeta(rel.teacher.hobby)?.label||'')}</span>` : ''}
            ${showsHobbies && rel.student ? `<span class="pill pill-mint">📚 Student in ${escapeHtml(hobbyMeta(rel.student.hobby)?.label||'')}</span>` : ''}
            ${!isOnFloor ? '<span class="pill pill-rose">Privacy: hidden from floor</span>' : ''}
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <button class="btn btn-sm" id="toggle-mute">${muted?'Unmute':'Mute'}</button>
          <button class="btn btn-sm ${revealed?'btn-rose':'btn-primary'}" id="toggle-reveal" ${canRequestReveal?'':'disabled title="Their privacy denies reveal requests"'}>${revealed?'Cancel reveal':'Flag for reveal'}</button>
          <button class="btn btn-sm" id="send-message" ${canMessage?'':'disabled title="Their privacy denies messages"'}>Message</button>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <div class="card p-4 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Rapport</h2>
          <div class="grid gap-1.5">
            <div class="flex items-center justify-between text-sm">
              <span class="rep-tier ${pr.tier.toneClass}"><span class="swatch"></span>${escapeHtml(pr.tier.label)}</span>
              <span class="text-themed-mute">${Math.round(rapport.points)} pts ${pr.next?` · ${Math.round(pr.into)}/${Math.round(pr.span)} → ${pr.next.label}`:''}</span>
            </div>
            <div class="bar rep tall"><i style="width:${(pr.progress*100).toFixed(0)}%;background:${pr.tier.color}"></i></div>
            <div class="flex items-center justify-between text-[11px] text-themed-mute" id="reaching-state">
              <span>${rapport.lastReachingTs ? `last reached ${escapeHtml(fmtRel(rapport.lastReachingTs))}` : 'not yet reached'}</span>
              ${reaching
                ? '<span class="pill pill-mint" title="Within the reaching window — rapport is holding">holding</span>'
                : '<span class="pill" style="color:var(--mute);border-color:var(--mute)55" title="Outside the reaching window — rapport is decaying back toward 0">decaying toward 0</span>'}
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${MANUAL_DELTAS.map(d => `<button class="btn btn-sm ${d.delta>0?'btn-mint':'btn-rose'}" data-rate="${d.delta}">${d.delta>0?'+':''}${d.delta} · ${escapeHtml(d.label)}</button>`).join('')}
          </div>
          <div class="card-soft p-3 grid gap-2">
            <div class="flex items-center justify-between text-sm">
              <span>Shared sessions</span>
              <span class="text-themed-soft">${rapport.sharedSessions}</span>
            </div>
            <div class="flex gap-2 items-center">
              <select id="shared-hobby" class="select w-auto text-sm">
                ${(p.hobbies||[]).map(h => `<option value="${h.key}">${hobbyMeta(h.key)?.label||h.key}</option>`).join('')}
              </select>
              <input id="shared-min" type="number" min="5" max="240" value="30" class="input w-24 text-sm" />
              <button id="shared-go" class="btn btn-sm">Log session</button>
            </div>
          </div>
          <div class="grid gap-1">
            <h3 class="text-xs text-themed-soft">Recent rapport notes</h3>
            ${(rapport.manualNotes||[]).slice(-6).reverse().map(n => `
              <div class="card-soft p-2 text-xs flex items-center justify-between">
                <span>${escapeHtml(n.note)}</span>
                <span style="color:var(${n.delta>0?'--mint':'--rose'})">${n.delta>0?'+':''}${Math.round(n.delta)} · ${fmtRel(n.ts)}</span>
              </div>`).join('') || '<div class="text-xs text-themed-mute">No notes yet — log a session or leave a rating to begin reaching.</div>'}
          </div>
        </div>

        <div class="card p-4 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Hobbies & skill ranks</h2>
          ${showsHobbies ? `
          <div class="grid gap-2">
            ${(p.hobbies||[]).map(h => {
              const meta = hobbyMeta(h.key) || {label:h.key, icon:'🔹'};
              const rk = rankFor(h.skill);
              const mine = me.hobbies.find(x => x.key === h.key);
              const sharedNote = mine ? `you: ${rankFor(mine.skill).label} L${mine.skill}` : 'you don\'t have this';
              return `
                <div class="card-soft p-3 grid gap-1.5">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-xl">${meta.icon}</span>
                      <span class="font-medium">${escapeHtml(meta.label)}</span>
                    </div>
                    <span class="pill" style="color:${rk.color};border-color:${rk.color}55">${escapeHtml(rk.label)} · L${h.skill}</span>
                  </div>
                  <div class="bar skill"><i style="width:${h.skill}%"></i></div>
                  <div class="text-[11px] text-themed-mute">role: ${escapeHtml(h.role)} · ${sharedNote}</div>
                </div>
              `;
            }).join('') || '<div class="text-sm text-themed-mute">No hobbies on file.</div>'}
          </div>` : `<p class="text-xs text-themed-mute">Hidden by privacy (showHobbies: ${escapeHtml(tierMeta(effectiveTier(p,'showHobbies')).label)}).</p>`}
        </div>

        ${datingShared ? `
        <div class="card p-4 grid gap-3 lg:col-span-2">
          <h2 class="font-display font-semibold text-lg">♥ Your filter, applied <span class="text-xs text-themed-mute font-normal">(dating)</span></h2>
          <p class="text-[11px] text-themed-mute">Per-dimension breakdown of your own preference vector against this person's stated traits. Lives on your device.</p>
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            ${sc.dimensions.map(d => `
              <div class="card-soft p-3 grid gap-1.5">
                <div class="flex items-center justify-between">
                  <div class="font-medium text-sm">${escapeHtml(d.label)}</div>
                  <div class="text-xs text-themed-mute">${d.score == null ? '—' : `${(d.score*100|0)}%`}</div>
                </div>
                <div class="text-[11px] text-themed-mute">your target: ${escapeHtml(d.target||'—')} · they're: ${escapeHtml(d.got||'unknown')}</div>
                <div class="bar"><i style="width:${(d.score==null?0:d.score)*100}%"></i></div>
              </div>`).join('')}
          </div>
          ${sc.blockedBy.length ? `<div class="text-xs" style="color:var(--rose)">Filter blocked: ${sc.blockedBy.join(', ')}</div>` : ''}
          ${sc.excludedHits.length ? `<div class="text-xs" style="color:var(--rose)">Excluded hits: ${sc.excludedHits.join(', ')}</div>` : ''}
        </div>` : ''}

        ${networkingShared ? `
        <div class="card p-4 grid gap-3 lg:col-span-2">
          <h2 class="font-display font-semibold text-lg">◆ Alignment dimensions <span class="text-xs text-themed-mute font-normal">(networking)</span></h2>
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            ${al.dimensions.map(d => `
              <div class="card-soft p-3 grid gap-1.5">
                <div class="flex items-center justify-between">
                  <div class="font-medium text-sm">${escapeHtml(d.label)}</div>
                  <div class="text-xs text-themed-mute">${d.score == null ? '—' : `${(d.score*100|0)}%`}</div>
                </div>
                <div class="text-[11px] text-themed-mute">your target: ${escapeHtml(d.target||'—')} · they're: ${escapeHtml(d.got||'unknown')}</div>
                <div class="bar"><i style="width:${(d.score==null?0:d.score)*100}%"></i></div>
              </div>`).join('')}
          </div>
          ${al.blockedBy.length ? `<div class="text-xs" style="color:var(--rose)">Filter blocked: ${al.blockedBy.join(', ')}</div>` : ''}
          ${al.excludedHits.length ? `<div class="text-xs" style="color:var(--rose)">Excluded hits: ${al.excludedHits.join(', ')}</div>` : ''}
        </div>` : ''}

        <div class="card p-4 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Proximity</h2>
          <div class="grid gap-1.5 text-sm">
            <div class="flex justify-between"><span>Distance</span><span class="text-themed-soft">~${(w.dist||0).toFixed(1)}m</span></div>
            <div class="flex justify-between"><span>Signal</span><span class="text-themed-soft">${((w.signal||0)*100|0)}%</span></div>
            <div class="flex justify-between"><span>Stability</span><span class="text-themed-soft">${w.stable?'stable':'flickering'}</span></div>
            <div class="flex justify-between"><span>Opt-in</span><span class="text-themed-soft">${w.optIn?'yes':'no'}</span></div>
            <div class="flex justify-between"><span>Zone</span><span style="color:${cls.zone.color}">${escapeHtml(cls.zone.label)}</span></div>
          </div>
        </div>

        <div class="card p-4 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Identity & privacy</h2>
          <div class="grid gap-1.5 text-sm">
            <div class="flex justify-between"><span>Their default mode</span><span class="text-themed-soft">${escapeHtml(p.visMode)}</span></div>
            <div class="flex justify-between"><span>Your reveal flag</span><span class="text-themed-soft" id="reveal-flag-state">${(() => {
              const ts = store.reveals[p.id];
              if (!ts) return 'off';
              const remaining = revealGrantRemainingMs(ts);
              const mins = Math.ceil(remaining / 60000);
              return `on · expires in ~${mins}m`;
            })()}</span></div>
            <div class="flex justify-between"><span>Your self-simplify filter</span><span class="text-themed-soft" title="Below this fit %, your own view of others stays at avatar.">${(me.visMatchGate*100).toFixed(0)}%</span></div>
            <div class="flex justify-between"><span>What you currently see</span><span class="text-themed-soft font-medium">${escapeHtml(view.shows)}</span></div>
            <div class="flex justify-between"><span>Their showName tier</span><span class="text-themed-soft">${escapeHtml(tierMeta(effectiveTier(p,'showName')).label)}</span></div>
            <div class="flex justify-between"><span>Their showPhoto tier</span><span class="text-themed-soft">${escapeHtml(tierMeta(effectiveTier(p,'showPhoto')).label)}</span></div>
            <div class="flex justify-between"><span>Their messages tier</span><span class="text-themed-soft">${escapeHtml(tierMeta(effectiveTier(p,'receiveMessages')).label)}</span></div>
          </div>
          <p class="text-[11px] text-themed-mute">${view.reasons.join(' · ') || '—'}</p>
        </div>
      </div>
    </section>
  `;

  $('#toggle-mute', root).addEventListener('click', () => { store.toggleMute(p.id); render(root, params); });
  $('#toggle-reveal', root).addEventListener('click', () => {
    if (!canRequestReveal && !revealed) return;
    store.toggleReveal(p.id); render(root, params);
  });
  const sendBtn = $('#send-message', root);
  if (sendBtn && !sendBtn.disabled) {
    sendBtn.addEventListener('click', () => alert('Messaging UI lands in v1.1. Privacy gate already enforced.'));
  }
  $$('button[data-rate]', root).forEach(b => b.addEventListener('click', () => {
    store.addManualRapport(p.id, Number(b.dataset.rate), b.textContent.trim());
    render(root, params);
  }));
  $('#shared-go', root).addEventListener('click', () => {
    const hk = $('#shared-hobby', root).value;
    const m = Number($('#shared-min', root).value);
    if (!Number.isFinite(m) || m <= 0) return;
    store.logSharedSession(p.id, hk, m);
    render(root, params);
  });

  // Live observability: refresh the reveal-grant TTL countdown and the
  // reaching/decaying pill on every tick. The store sweeps expired grants
  // on the tick, so this also surfaces the moment a grant disappears.
  unsubTick = bus.on('tick', () => {
    const flagEl = $('#reveal-flag-state', root);
    if (flagEl) {
      const ts = store.reveals[p.id];
      if (!ts) {
        flagEl.textContent = 'off';
      } else {
        const mins = Math.ceil(revealGrantRemainingMs(ts) / 60000);
        flagEl.textContent = `on · expires in ~${mins}m`;
      }
    }
    const reachEl = $('#reaching-state', root);
    if (reachEl) {
      const r = store.rapport[p.id] || {};
      const ts = r.lastReachingTs || 0;
      const isReaching = ts && (Date.now() - ts) < REACHING_WINDOW_MS;
      const left = ts ? `last reached ${escapeHtml(fmtRel(ts))}` : 'not yet reached';
      const pill = isReaching
        ? '<span class="pill pill-mint" title="Within the reaching window — rapport is holding">holding</span>'
        : '<span class="pill" style="color:var(--mute);border-color:var(--mute)55" title="Outside the reaching window — rapport is decaying back toward 0">decaying toward 0</span>';
      reachEl.innerHTML = `<span>${left}</span>${pill}`;
    }
  });
}
