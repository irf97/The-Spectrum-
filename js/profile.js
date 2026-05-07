// Profile screen — your identity, traits, and global preferences.
// Self-description fields adapt to your gender via fieldsFor().

import { fieldsFor, GENDERS, VIS_MODES, STATUS_DATING, STATUS_NETWORKING } from './data.js';
import { store } from './state.js';
import { $, $$, escapeHtml } from './util.js';

function selfFieldKey(self) {
  if (self?.gender === 'Woman') return 'woman';
  if (self?.gender === 'Man') return 'man';
  if (self?.gender === 'Non-binary') return 'nonbinary';
  return 'any';
}

function selfFieldRow(f, self) {
  const cur = self?.[f.key] ?? '';
  return `
    <label class="grid gap-1">
      <span class="text-xs text-slate-400">${escapeHtml(f.label)}</span>
      <select class="select" data-self="${f.key}">
        <option value="">— unset —</option>
        ${f.options.map(o => `<option ${cur===o?'selected':''}>${escapeHtml(o)}</option>`).join('')}
      </select>
    </label>`;
}

export function render(root) {
  const me = store.profile;
  const fields = fieldsFor(selfFieldKey(me.self));
  const nonGenderFields = fields.filter(f => f.key !== 'gender');

  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">Profile</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">${escapeHtml(me.name)} <span class="text-slate-500">@${escapeHtml(me.alias)}</span></h1>
          <p class="text-sm text-slate-400 mt-1 max-w-2xl">Your profile lives in this browser only. The Spectrum never uploads it. Self-description options adapt to the gender you select.</p>
        </div>
        <div class="flex gap-2">
          <a href="#/privacy" class="btn btn-primary">Privacy matrix</a>
          <button id="reset" class="btn btn-rose">Reset everything</button>
        </div>
      </header>

      <div class="grid lg:grid-cols-2 gap-6">
        <div class="card p-4 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Identity</h2>
          <div class="grid sm:grid-cols-2 gap-3">
            <label class="grid gap-1">
              <span class="text-xs text-slate-400">Display name</span>
              <input class="input" id="f-name" value="${escapeHtml(me.name)}" />
            </label>
            <label class="grid gap-1">
              <span class="text-xs text-slate-400">Alias</span>
              <input class="input" id="f-alias" value="${escapeHtml(me.alias)}" />
            </label>
            <label class="grid gap-1">
              <span class="text-xs text-slate-400">Default visibility</span>
              <select class="select" id="f-vismode">
                ${VIS_MODES.map(m => `<option value="${m.key}" ${me.visMode===m.key?'selected':''}>${m.icon} ${m.label}</option>`).join('')}
              </select>
            </label>
            <label class="grid gap-1">
              <span class="text-xs text-slate-400">Reveal gate (match% required)</span>
              <input class="input" id="f-gate" type="number" min="0" max="1" step="0.05" value="${me.visMatchGate}" />
            </label>
          </div>
          <div class="grid gap-1">
            <span class="text-xs text-slate-400">Gender</span>
            <div class="flex flex-wrap gap-1.5" id="gender-row">
              ${GENDERS.filter(g=>g.key!=='any').map(g => {
                const sel = me.self?.gender === g.label;
                return `<button class="pill ${sel?'pill-iris':''}" data-self-gender="${escapeHtml(g.label)}">${g.icon} ${escapeHtml(g.label)}</button>`;
              }).join('')}
            </div>
          </div>
          <p class="text-[11px] text-slate-500">For finer-grained control over what each person sees of you, edit the <a href="#/privacy" class="text-iris-400 hover:underline">privacy matrix</a>.</p>
        </div>

        <div class="card p-4 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Status</h2>
          <div class="grid sm:grid-cols-2 gap-3">
            <label class="grid gap-1">
              <span class="text-xs text-slate-400">Intent</span>
              <select class="select" id="f-intent">
                <option value="dating"     ${me.intent==='dating'?'selected':''}>Dating</option>
                <option value="networking" ${me.intent==='networking'?'selected':''}>Networking</option>
                <option value="both"       ${me.intent==='both'?'selected':''}>Both</option>
              </select>
            </label>
            <label class="grid gap-1">
              <span class="text-xs text-slate-400">Dating status</span>
              <select class="select" id="f-status-dating">
                ${STATUS_DATING.map(s => `<option value="${s.key}" ${me.status.dating===s.key?'selected':''}>${s.icon} ${s.label}</option>`).join('')}
              </select>
            </label>
            <label class="grid gap-1">
              <span class="text-xs text-slate-400">Networking status</span>
              <select class="select" id="f-status-net">
                ${STATUS_NETWORKING.map(s => `<option value="${s.key}" ${me.status.networking===s.key?'selected':''}>${s.icon} ${s.label}</option>`).join('')}
              </select>
            </label>
            <label class="grid gap-1 items-end">
              <span class="text-xs text-slate-400">Be discoverable (Layer 3)</span>
              <button id="f-optin" class="btn ${me.optIn?'btn-mint':'btn-rose'}">${me.optIn?'Discoverable':'Private'}</button>
            </label>
          </div>
        </div>

        <div class="card p-4 grid gap-3 lg:col-span-2">
          <h2 class="font-display font-semibold text-lg">Self-description</h2>
          <p class="text-[11px] text-slate-500">Options below adapt to your selected gender. Other users score you against their preference vector with the same engine.</p>
          <div class="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
            ${nonGenderFields.map(f => selfFieldRow(f, me.self)).join('')}
          </div>
        </div>
      </div>
    </section>
  `;

  $('#f-name', root).addEventListener('input',  e => store.setProfile({ name:  e.target.value || 'You' }));
  $('#f-alias', root).addEventListener('input', e => store.setProfile({ alias: e.target.value || 'you' }));
  $('#f-vismode', root).addEventListener('change', e => store.setProfile({ visMode: e.target.value }));
  $('#f-gate', root).addEventListener('input', e => store.setProfile({ visMatchGate: Number(e.target.value) }));
  $('#f-intent', root).addEventListener('change', e => store.setProfile({ intent: e.target.value }));
  $('#f-status-dating', root).addEventListener('change', e => store.setProfile({ status: { ...store.profile.status, dating: e.target.value } }));
  $('#f-status-net', root).addEventListener('change',    e => store.setProfile({ status: { ...store.profile.status, networking: e.target.value } }));
  $('#f-optin', root).addEventListener('click', () => { store.setProfile({ optIn: !store.profile.optIn }); render(root); });

  $$('button[data-self-gender]', root).forEach(b => b.addEventListener('click', () => {
    store.setProfile({ self: { ...store.profile.self, gender: b.dataset.selfGender } });
    render(root);
  }));
  $$('select[data-self]', root).forEach(s => s.addEventListener('change', e => {
    store.setProfile({ self: { ...store.profile.self, [s.dataset.self]: e.target.value } });
  }));

  $('#reset', root).addEventListener('click', () => {
    if (confirm('Reset all local data? Your profile, rapport, mutes, and reveals will be wiped.')) {
      store.reset();
      render(root);
    }
  });
}
