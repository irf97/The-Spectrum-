// Layer 4 — Identity & Anonymity screen.
// Adds: per-channel reveal tiers (photo / voice / video / handle / place),
// reveal default TTL, glance intensity (blur + saturate sliders), reveal
// history, auto-revoke triggers.

import { VIS_MODES, REVEAL_CHANNELS, REVEAL_TTL_OPTIONS, AUDIENCE_TIERS, SAMPLE_PEOPLE, MATCH_BUCKETS } from './data.js';
import { resolveView } from './engines/identity.js';
import { scoreCandidate } from './engines/match.js';
import { effectiveTier, tierMeta } from './engines/privacy.js';
import { store } from './state.js';
import { $, $$, escapeHtml, initials, colorFor, pct, html, raw, fmtRel } from './util.js';

function modeCard(mode, current) {
  const sel = mode.key === current;
  return `
    <button data-mode="${mode.key}" class="card-soft text-left p-3 grid gap-1" style="${sel?'box-shadow:0 0 0 2px var(--iris)':''}">
      <div class="text-2xl leading-none">${mode.icon}</div>
      <div class="font-display font-semibold">${escapeHtml(mode.label)}</div>
      <div class="text-xs text-themed-soft">${escapeHtml(mode.copy)}</div>
    </button>`;
}

function tierOpts(current) {
  return AUDIENCE_TIERS.map(t => `<option value="${t.key}" ${current===t.key?'selected':''}>${t.short}  ${t.label}</option>`).join('');
}

function channelRow(ch, identity) {
  const cur = identity?.channels?.[ch.key] || 'reveal_mutual';
  const tm = tierMeta(cur);
  return `
    <div class="card-soft p-3 grid sm:grid-cols-[1fr_auto] gap-3 items-center" data-channel="${ch.key}">
      <div class="flex items-center gap-2">
        <span class="text-xl">${ch.icon}</span>
        <div>
          <div class="font-medium text-sm">${escapeHtml(ch.label)}</div>
          <div class="text-[11px] text-themed-mute">${escapeHtml(ch.copy)} · currently <span style="color:${tm.swatch}">${escapeHtml(tm.label)}</span></div>
        </div>
      </div>
      <select class="select" data-channel-tier="${ch.key}">${tierOpts(cur)}</select>
    </div>`;
}

function reveal(p, viewer, opts, viewerDatingPersona) {
  const datingShared = !!viewer.dating?.enabled && !!p.modes?.dating && !!viewerDatingPersona;
  const unknown = MATCH_BUCKETS.find(b => b.key === 'unknown');
  const r = datingShared ? scoreCandidate(p, viewerDatingPersona.prefs) : { pct: 0, bucket: unknown };
  const view = resolveView(viewer, p, r.pct, opts);
  const visual = (() => {
    switch (view.shows) {
      case 'photo':  return `<span class="avatar w-12 h-12" style="background:${colorFor(p.id)}">${initials(p.name)}</span>`;
      case 'glance': return `<span class="avatar w-12 h-12" style="background:${colorFor(p.id)};filter:blur(${(viewer.identity?.glance?.blur ?? 3)}px) saturate(${viewer.identity?.glance?.saturate ?? 0.7})">${initials(p.name)}</span>`;
      case 'avatar': return `<span class="avatar w-12 h-12" style="background:linear-gradient(135deg, ${colorFor(p.alias)}, var(--panel))">${escapeHtml((p.alias||'').slice(0,2).toUpperCase())}</span>`;
      case 'reveal': return `<span class="avatar w-12 h-12 ring-2 ring-mint-500" style="background:${colorFor(p.id)}">${initials(p.name)}</span>`;
      case 'hidden':
      default:       return `<span class="avatar w-12 h-12" style="background:#0f0f1a;border-style:dashed">·</span>`;
    }
  })();
  const label = (() => {
    switch (view.shows) {
      case 'photo':  return p.name;
      case 'reveal': return `${p.name} · revealed`;
      case 'glance': return p.name.split(' ')[0] + ' …';
      case 'avatar': return `@${p.alias}`;
      default:       return 'Hidden';
    }
  })();
  return html`
    <div class="card-soft p-3 flex items-center gap-3">
      ${raw(visual)}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium">${label}</span>
          <span class="pill" style="color:${r.bucket.swatch};border-color:${r.bucket.swatch}55">${r.bucket.label} · ${pct(r.pct)}</span>
          <span class="pill pill-iris">${VIS_MODES.find(m=>m.key===view.modeKey)?.label || view.modeKey}</span>
          ${view.gated   ? raw('<span class="pill pill-rose">gated</span>') : ''}
          ${view.mutual  ? raw('<span class="pill pill-mint">mutual</span>') : ''}
        </div>
        <div class="text-[11px] text-themed-mute mt-1">${view.reasons.join(' · ') || 'normal visibility'}</div>
      </div>
      <button class="btn btn-sm" data-toggle-reveal="${p.id}">${opts.reveals[p.id]?'Un-flag reveal':'Flag for reveal'}</button>
    </div>
  `;
}

function historyList(history) {
  if (!history || history.length === 0) return '<div class="text-xs text-themed-mute">No reveal events yet.</div>';
  return history.slice(-12).reverse().map(h => `
    <div class="card-soft p-2 text-xs flex items-center justify-between">
      <span>${escapeHtml(h.action)} · ${escapeHtml(h.channel || 'all')} · ${escapeHtml(h.personLabel || h.personId)}</span>
      <span class="text-themed-mute">${fmtRel(h.ts)}</span>
    </div>`).join('');
}

export function render(root) {
  const me = store.profile;
  const reveals = store.reveals;
  const muted = store.muted;
  const opts = { reveals, theirReveal: true, muted: false };
  const identity = me.identity || {};
  const activePersona = store.activePersona();
  const personaVisMode = activePersona?.visMode || 'avatar';
  const datingPersona = store.activePersonaFor('dating');

  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">Layer 4 · ${escapeHtml(activePersona?.name || 'alter ego')}</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Identity & Anonymity</h1>
          <p class="text-sm text-themed-soft mt-1 max-w-2xl">Visibility mode + per-channel reveal tiers. Visibility mode is per alter ego; channels and glance settings apply globally.</p>
        </div>
        <span class="pill pill-iris">${escapeHtml(VIS_MODES.find(m=>m.key===personaVisMode)?.label || personaVisMode)} · ${escapeHtml(activePersona?.name || '')}</span>
      </header>

      <div class="grid sm:grid-cols-3 lg:grid-cols-6 gap-3" id="modes">
        ${VIS_MODES.map(m => modeCard(m, personaVisMode)).join('')}
      </div>

      <div class="grid lg:grid-cols-5 gap-6">
        <aside class="lg:col-span-2 grid gap-3">
          <div class="card p-4 grid gap-3">
            <h2 class="font-display font-semibold text-lg">Reveal gate</h2>
            <div class="flex items-center justify-between">
              <span class="text-sm text-themed-soft">Show richer than avatar at match ≥</span>
              <span class="font-display font-semibold" id="gate-val">${Math.round(me.visMatchGate*100)}%</span>
            </div>
            <input id="gate" type="range" min="0" max="1" step="0.05" value="${me.visMatchGate}" />
            <p class="text-[11px] text-themed-mute">Higher gate → more "look around the room" energy. Below the gate, people see your avatar / alias only.</p>
          </div>

          <div class="card p-4 grid gap-3">
            <h2 class="font-display font-semibold text-lg">Glance intensity</h2>
            <label class="text-xs text-themed-soft">Blur (px) <span class="text-themed-soft ml-1" id="blur-val">${identity.glance?.blur ?? 3}</span></label>
            <input id="glance-blur" type="range" min="0" max="12" step="1" value="${identity.glance?.blur ?? 3}" />
            <label class="text-xs text-themed-soft">Saturate <span class="text-themed-soft ml-1" id="sat-val">${(identity.glance?.saturate ?? 0.7).toFixed(2)}</span></label>
            <input id="glance-sat" type="range" min="0" max="1.5" step="0.05" value="${identity.glance?.saturate ?? 0.7}" />
          </div>

          <div class="card p-4 grid gap-3">
            <h2 class="font-display font-semibold text-lg">Default reveal duration</h2>
            <select class="select" id="reveal-ttl">
              ${REVEAL_TTL_OPTIONS.map(t => `<option value="${t.key}" ${(identity.revealTtlKey||'2h')===t.key?'selected':''}>${escapeHtml(t.label)}</option>`).join('')}
            </select>
            <p class="text-[11px] text-themed-mute">A reveal handshake stays active for this long, then collapses back to your default mode.</p>
          </div>

          <div class="card p-4 grid gap-2">
            <h2 class="font-display font-semibold text-lg">Auto-revoke</h2>
            <label class="flex items-center justify-between text-sm"><span>On status change</span><input type="checkbox" id="auto-status" ${identity.autoRevoke?.onStatusChange?'checked':''} /></label>
            <label class="flex items-center justify-between text-sm"><span>On leaving the room</span><input type="checkbox" id="auto-leave" ${identity.autoRevoke?.onLeaveRoom?'checked':''} /></label>
            <label class="flex items-center justify-between text-sm"><span>On mute</span><input type="checkbox" id="auto-mute" ${identity.autoRevoke?.onMute?'checked':''} /></label>
          </div>
        </aside>

        <div class="lg:col-span-3 grid gap-3">
          <div class="card p-4 grid gap-3">
            <h2 class="font-display font-semibold text-lg">Per-channel reveal</h2>
            <p class="text-[11px] text-themed-mute">Each reveal channel has its own audience tier. Photo can be Mutual reveal while Handle stays Match-gated, and vice versa.</p>
            <div class="grid gap-2">${REVEAL_CHANNELS.map(c => channelRow(c, identity)).join('')}</div>
          </div>

          <div class="card p-4 grid gap-3">
            <h2 class="font-display font-semibold text-lg">What others see (simulated)</h2>
            ${SAMPLE_PEOPLE.slice(0,8).map(p => reveal(p, me, { ...opts, theirReveal: !!reveals[p.id], muted: !!muted[p.id] }, datingPersona)).join('')}
          </div>

          <div class="card p-4 grid gap-2">
            <h2 class="font-display font-semibold text-lg">Reveal history</h2>
            ${historyList(identity.history)}
          </div>
        </div>
      </div>
    </section>
  `;

  $$('button[data-mode]', root).forEach(b => b.addEventListener('click', () => {
    if (!activePersona) return;
    store.updatePersona(store.mode, activePersona.id, { visMode: b.dataset.mode });
    render(root);
  }));
  $('#gate', root).addEventListener('input', (e) => {
    store.setProfile({ visMatchGate: Number(e.target.value) });
    $('#gate-val', root).textContent = `${Math.round(e.target.value*100)}%`;
  });
  $('#glance-blur', root).addEventListener('input', (e) => {
    const cur = store.profile.identity || {};
    store.setProfile({ identity: { ...cur, glance: { ...(cur.glance||{}), blur: Number(e.target.value) } } });
    $('#blur-val', root).textContent = e.target.value;
  });
  $('#glance-sat', root).addEventListener('input', (e) => {
    const cur = store.profile.identity || {};
    store.setProfile({ identity: { ...cur, glance: { ...(cur.glance||{}), saturate: Number(e.target.value) } } });
    $('#sat-val', root).textContent = Number(e.target.value).toFixed(2);
  });
  $('#reveal-ttl', root).addEventListener('change', (e) => {
    const cur = store.profile.identity || {};
    store.setProfile({ identity: { ...cur, revealTtlKey: e.target.value } });
  });
  ['auto-status','auto-leave','auto-mute'].forEach(id => {
    $('#'+id, root).addEventListener('change', (e) => {
      const cur = store.profile.identity || {};
      const next = { ...(cur.autoRevoke || {}) };
      if (id === 'auto-status') next.onStatusChange = e.target.checked;
      if (id === 'auto-leave')  next.onLeaveRoom    = e.target.checked;
      if (id === 'auto-mute')   next.onMute         = e.target.checked;
      store.setProfile({ identity: { ...cur, autoRevoke: next } });
    });
  });
  $$('select[data-channel-tier]', root).forEach(sel => sel.addEventListener('change', (e) => {
    const cur = store.profile.identity || {};
    const channels = { ...(cur.channels || {}), [sel.dataset.channelTier]: e.target.value };
    store.setProfile({ identity: { ...cur, channels } });
    render(root);
  }));
  $$('button[data-toggle-reveal]', root).forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.toggleReveal;
    const before = !!store.reveals[id];
    store.toggleReveal(id);
    const cur = store.profile.identity || {};
    const history = [...(cur.history || []), {
      ts: Date.now(), personId: id,
      personLabel: SAMPLE_PEOPLE.find(x => x.id === id)?.name || id,
      channel: 'all',
      action: before ? 'un-flagged' : 'flagged'
    }].slice(-50);
    store.setProfile({ identity: { ...cur, history } });
    render(root);
  }));
}
