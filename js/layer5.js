// Layer 5 — Rapport & Hobbies (with Teacher / Student matcher).
// Consumes: engines/rapport.js + engines/hobbies.js.

import { HOBBY_CATALOG, SKILL_RANKS, HOBBY_ROLES, REP_TIERS, SAMPLE_PEOPLE } from './data.js';
import { tierFor, progress, summary, MANUAL_DELTAS } from './engines/rapport.js';
import { rankFor, sharedKeys, relate, hobbyMeta } from './engines/hobbies.js';
import { store, REACHING_WINDOW_MS } from './state.js';
import { $, $$, escapeHtml, initials, colorFor, fmtRel } from './util.js';

function tierBadge(t) {
  return `<span class="rep-tier ${t.toneClass}"><span class="swatch"></span>${escapeHtml(t.label)}</span>`;
}

function rapportBar(points) {
  const pr = progress(points);
  const goal = pr.next ? `${Math.round(pr.into)}/${Math.round(pr.span)} → ${pr.next.label}` : 'max tier';
  return `
    <div class="grid gap-1">
      <div class="flex items-center justify-between text-xs">
        ${tierBadge(pr.tier)}
        <span class="text-themed-mute">${escapeHtml(goal)}</span>
      </div>
      <div class="bar rep tall"><i style="width:${(pr.progress*100).toFixed(0)}%;background:${pr.tier.color}"></i></div>
      <div class="text-[11px] text-themed-mute">${Math.round(points)} pts</div>
    </div>`;
}

function rankPill(skill) {
  const r = rankFor(skill);
  return `<span class="pill" style="color:${r.color};border-color:${r.color}55">${escapeHtml(r.label)} · L${skill}</span>`;
}

function hobbyEditor(me) {
  return `
    <div class="card p-4 grid gap-3">
      <div class="flex items-center justify-between">
        <h2 class="font-display font-semibold text-lg">Your hobbies & skill levels</h2>
        <button id="add-hobby" class="btn btn-sm btn-primary">Add hobby</button>
      </div>
      <div id="my-hobbies" class="grid gap-2">
        ${(me.hobbies||[]).map((h,i) => myHobbyRow(h,i)).join('') || '<div class="text-sm text-themed-mute">No hobbies yet.</div>'}
      </div>
    </div>`;
}

function myHobbyRow(h, i) {
  const meta = hobbyMeta(h.key);
  return `
    <div class="card-soft p-3 grid sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-center" data-i="${i}">
      <div class="flex items-center gap-2">
        <span class="text-2xl">${meta?.icon||'🔹'}</span>
        <div>
          <div class="font-medium">${escapeHtml(meta?.label || h.key)}</div>
          <div class="text-[11px] text-themed-mute">${rankFor(h.skill).label}</div>
        </div>
      </div>
      <input type="range" min="1" max="100" step="1" value="${h.skill}" data-role="skill" class="w-32 sm:w-40" />
      <select class="select w-auto" data-role="role">
        ${HOBBY_ROLES.map(r => `<option value="${r.key}" ${h.role===r.key?'selected':''}>${r.icon} ${r.label}</option>`).join('')}
      </select>
      <button class="btn btn-sm btn-ghost" data-action="remove">Remove</button>
    </div>`;
}

function relationsRow(p, me, rapportRow) {
  const rel = relate(me.hobbies, p.hobbies);
  const shared = sharedKeys(me.hobbies, p.hobbies);
  const lastTs = rapportRow.lastReachingTs || 0;
  const reaching = lastTs && (Date.now() - lastTs) < REACHING_WINDOW_MS;
  const statusPill = reaching
    ? `<span class="pill pill-mint" title="Within the reaching window — rapport is holding">holding</span>`
    : `<span class="pill" style="color:var(--mute);border-color:var(--mute)55" title="Outside the reaching window — rapport is decaying back toward the neutral floor">decaying</span>`;
  return `
    <div class="card-soft p-3 grid gap-2">
      <div class="flex items-center gap-3">
        <span class="avatar w-10 h-10" style="background:linear-gradient(135deg, ${colorFor(p.id)}, var(--panel))">${initials(p.name)}</span>
        <div class="flex-1 min-w-0">
          <a href="#/people/${p.id}" class="font-medium truncate">${escapeHtml(p.name)}</a>
          <div class="text-[11px] text-themed-mute">last reached ${escapeHtml(fmtRel(lastTs))}</div>
          <div class="text-[11px] text-themed-mute">${shared.length?`Shared: ${shared.map(k=>hobbyMeta(k)?.label||k).join(', ')}`:'No shared hobbies yet'}</div>
        </div>
        ${statusPill}
        ${rel.teacher ? `<span class="pill pill-sun" title="${escapeHtml(hobbyMeta(rel.teacher.hobby)?.label||'')}">🎓 Teacher: ${escapeHtml(hobbyMeta(rel.teacher.hobby)?.label||'')}</span>` : ''}
        ${rel.student ? `<span class="pill pill-mint" title="${escapeHtml(hobbyMeta(rel.student.hobby)?.label||'')}">📚 Student: ${escapeHtml(hobbyMeta(rel.student.hobby)?.label||'')}</span>` : ''}
      </div>
      ${rapportBar(rapportRow.points || 0)}
      <div class="flex items-center gap-2 flex-wrap">
        ${MANUAL_DELTAS.slice(0,3).map(d => `<button class="btn btn-sm btn-mint" data-rate="${d.delta}" data-id="${p.id}">+${d.delta}</button>`).join('')}
        ${MANUAL_DELTAS.slice(3).map(d => `<button class="btn btn-sm btn-rose" data-rate="${d.delta}" data-id="${p.id}">${d.delta}</button>`).join('')}
        <button class="btn btn-sm" data-shared="${p.id}" data-hobby="${shared[0]||''}">Log shared session</button>
      </div>
    </div>
  `;
}

export function render(root) {
  const me = store.profile;
  const sum = summary(store.rapport);

  // Compute teacher/student matches across the whole population.
  const matches = SAMPLE_PEOPLE.map(p => {
    const r = relate(me.hobbies, p.hobbies);
    return { p, rel: r };
  });
  const teachers = matches.filter(m => m.rel.teacher).sort((a,b) => (b.rel.teacher.strength) - (a.rel.teacher.strength));
  const students = matches.filter(m => m.rel.student).sort((a,b) => (b.rel.student.strength) - (a.rel.student.strength));

  // Dignity invariant (Living Mesh §11): no leaderboard of people by desirability or rapport.
  // We surface only those the user has *reached with* — sorted by recency of explicit reaching,
  // never by points. People with no reaching history don't appear; they sit at the neutral floor.
  const recentlyReached = SAMPLE_PEOPLE
    .map(p => ({ p, r: store.rapport[p.id] || { points:0, sharedSessions:0, lastReachingTs:0, manualNotes:[] } }))
    .filter(({r}) => (r.lastReachingTs || 0) > 0)
    .sort((a,b) => (b.r.lastReachingTs||0) - (a.r.lastReachingTs||0));

  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">Layer 5</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Rapport & Hobbies</h1>
          <p class="text-sm text-themed-soft mt-1 max-w-2xl">Standing per individual, earned through real shared activity and manual rating — and decaying when there is no recent reaching. It conditions depth and suggestions, never access. The teacher/student lists are demand-based role-fit, not desirability ranking. Nobody is sorted into a leaderboard.</p>
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${REP_TIERS.map(t => `<span class="pill" style="color:${t.color};border-color:${t.color}55">${t.label} · ${sum.counts[t.key]}</span>`).join('')}
        </div>
      </header>

      ${hobbyEditor(me)}

      <div class="grid lg:grid-cols-2 gap-6">
        <div class="card p-4 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Looking for a teacher?</h2>
          <p class="text-xs text-themed-mute">Set role to "Looking for teacher" on a hobby. Higher-ranked candidates around you surface here — demand-based role-fit against a need you declared, not a desirability ranking.</p>
          <div class="grid gap-2">
            ${teachers.length ? teachers.slice(0,8).map(({p,rel}) => `
              <a href="#/people/${p.id}" class="card-soft p-3 flex items-center gap-3 hover:border-iris-500/60">
                <span class="avatar w-9 h-9" style="background:${colorFor(p.id)}">${initials(p.name)}</span>
                <div class="flex-1 min-w-0">
                  <div class="font-medium">${escapeHtml(p.name)}</div>
                  <div class="text-[11px] text-themed-mute">${escapeHtml(hobbyMeta(rel.teacher.hobby)?.label||'')} · gap +${rel.teacher.gap} ranks</div>
                </div>
                ${rankPill(p.hobbies.find(h=>h.key===rel.teacher.hobby)?.skill)}
              </a>`).join('') : '<div class="text-sm text-themed-mute">No matches yet — try setting a hobby role to "Looking for teacher".</div>'}
          </div>
        </div>

        <div class="card p-4 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Looking to teach?</h2>
          <p class="text-xs text-themed-mute">Set role to "Looking for student" on a hobby. Lower-ranked candidates open to learning surface here — demand-based role-fit against a need you declared, not a desirability ranking.</p>
          <div class="grid gap-2">
            ${students.length ? students.slice(0,8).map(({p,rel}) => `
              <a href="#/people/${p.id}" class="card-soft p-3 flex items-center gap-3 hover:border-iris-500/60">
                <span class="avatar w-9 h-9" style="background:${colorFor(p.id)}">${initials(p.name)}</span>
                <div class="flex-1 min-w-0">
                  <div class="font-medium">${escapeHtml(p.name)}</div>
                  <div class="text-[11px] text-themed-mute">${escapeHtml(hobbyMeta(rel.student.hobby)?.label||'')} · gap ${rel.student.gap} ranks</div>
                </div>
                ${rankPill(p.hobbies.find(h=>h.key===rel.student.hobby)?.skill)}
              </a>`).join('') : '<div class="text-sm text-themed-mute">No matches yet — try setting a hobby role to "Looking for student".</div>'}
          </div>
        </div>
      </div>

      <div class="card p-4 grid gap-3">
        <h2 class="font-display font-semibold text-lg">People you've recently reached with</h2>
        <p class="text-xs text-themed-mute">Sorted by recency of explicit reaching — shared sessions and manual ratings. Not a ranking.</p>
        ${recentlyReached.length ? `
          <div class="grid lg:grid-cols-2 gap-2">
            ${recentlyReached.map(({p,r}) => relationsRow(p, me, r)).join('')}
          </div>
        ` : `
          <div class="text-sm text-themed-mute max-w-2xl">You haven't reached with anyone yet. Log a shared session or leave a manual rating from someone's profile, and they will appear here. Until then, your standing with everyone is the neutral baseline — which is exactly the floor.</div>
        `}
      </div>
    </section>

    <dialog id="add-hobby-modal" class="card p-4 max-w-md w-full bg-ink-800 text-themed" style="border-radius:14px;">
      <h3 class="font-display font-semibold text-lg mb-2">Add a hobby</h3>
      <select id="add-hobby-key" class="select mb-2">${HOBBY_CATALOG.map(h => `<option value="${h.key}">${h.icon} ${h.label}</option>`).join('')}</select>
      <label class="text-xs text-themed-soft">Skill (1–100)</label>
      <input id="add-hobby-skill" type="range" min="1" max="100" value="20" class="mb-2" />
      <select id="add-hobby-role" class="select mb-3">${HOBBY_ROLES.map(r=>`<option value="${r.key}">${r.icon} ${r.label}</option>`).join('')}</select>
      <div class="flex justify-end gap-2">
        <button class="btn" data-close>Cancel</button>
        <button class="btn btn-primary" id="add-hobby-confirm">Add</button>
      </div>
    </dialog>
  `;

  // Hobbies edit
  $$('#my-hobbies > div', root).forEach(div => {
    const i = Number(div.dataset.i);
    div.querySelector('input[data-role="skill"]').addEventListener('input', e => {
      const next = [...store.profile.hobbies];
      next[i] = { ...next[i], skill: Number(e.target.value) };
      store.setProfile({ hobbies: next });
      render(root);
    });
    div.querySelector('select[data-role="role"]').addEventListener('change', e => {
      const next = [...store.profile.hobbies];
      next[i] = { ...next[i], role: e.target.value };
      store.setProfile({ hobbies: next });
      render(root);
    });
    div.querySelector('button[data-action="remove"]').addEventListener('click', () => {
      const next = [...store.profile.hobbies]; next.splice(i,1);
      store.setProfile({ hobbies: next });
      render(root);
    });
  });

  // Add hobby modal
  const dlg = $('#add-hobby-modal', root);
  $('#add-hobby', root).addEventListener('click', () => dlg.showModal());
  $$('button[data-close]', root).forEach(b => b.addEventListener('click', () => dlg.close()));
  $('#add-hobby-confirm', root).addEventListener('click', () => {
    const key = $('#add-hobby-key', root).value;
    const skill = Number($('#add-hobby-skill', root).value);
    const role = $('#add-hobby-role', root).value;
    const list = [...store.profile.hobbies];
    if (!list.some(h => h.key === key)) list.push({ key, skill, role });
    store.setProfile({ hobbies: list });
    dlg.close();
    render(root);
  });

  // Manual rapport ratings
  $$('button[data-rate]', root).forEach(b => b.addEventListener('click', () => {
    store.addManualRapport(b.dataset.id, Number(b.dataset.rate), 'Manual rating');
    render(root);
  }));
  $$('button[data-shared]', root).forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.shared;
    const hobby = b.dataset.hobby || (SAMPLE_PEOPLE.find(p=>p.id===id)?.hobbies?.[0]?.key);
    if (!hobby) return alert('No shared hobby to log.');
    const dur = Number(prompt('Duration in minutes?', '30'));
    if (!Number.isFinite(dur) || dur <= 0) return;
    store.logSharedSession(id, hobby, dur);
    render(root);
  }));
}
