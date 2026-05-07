// Profile screen — identity, mode toggles, dating profile, networking profile, theme.

import { fieldsFor, GENDERS, VIS_MODES, STATUS_DATING, STATUS_NETWORKING, THEMES, NETWORKING_FIELDS } from './data.js';
import { store } from './state.js';
import { setTheme, currentTheme } from './app.js';
import { $, $$, escapeHtml } from './util.js';

function selfFieldKey(self) {
  if (self?.gender === 'Woman') return 'woman';
  if (self?.gender === 'Man') return 'man';
  if (self?.gender === 'Non-binary') return 'nonbinary';
  return 'any';
}

function selfFieldRow(f, self, scope) {
  const cur = self?.[f.key] ?? '';
  return `
    <label class="grid gap-1">
      <span class="text-xs text-themed-mute">${escapeHtml(f.label)}</span>
      <select class="select" data-scope="${scope}" data-self="${f.key}">
        <option value="">— unset —</option>
        ${f.options.map(o => `<option ${cur===o?'selected':''}>${escapeHtml(o)}</option>`).join('')}
      </select>
    </label>`;
}

function themeTile(t, active) {
  return `
    <button class="theme-swatch text-left" aria-current="${active?'true':'false'}" data-theme="${t.key}">
      <div class="swatch-row mb-2">${t.swatches.map(s => `<span style="background:${s}"></span>`).join('')}</div>
      <div class="font-display font-semibold">${escapeHtml(t.label)}</div>
      <div class="text-[11px] text-themed-mute mt-0.5">${escapeHtml(t.copy)}</div>
    </button>`;
}

function modeToggle(active, key, label, copy) {
  return `
    <button class="card-soft p-3 text-left grid gap-1 ${active?'ring-2 ring-iris-500':''}" data-mode="${key}">
      <div class="flex items-center justify-between">
        <span class="font-display font-semibold">${escapeHtml(label)}</span>
        <span class="pill ${active?'pill-mint':'pill-rose'}">${active?'On':'Off'}</span>
      </div>
      <span class="text-xs text-themed-mute">${escapeHtml(copy)}</span>
    </button>`;
}

export function render(root) {
  const me = store.profile;
  const datingOn = !!me.modes?.dating;
  const networkingOn = !!me.modes?.networking;
  const datingFields = fieldsFor(selfFieldKey(me.dating.self));
  const datingNonGender = datingFields.filter(f => f.key !== 'gender');
  const themeKey = currentTheme();

  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">Profile</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">${escapeHtml(me.name)} <span class="text-themed-mute">@${escapeHtml(me.alias)}</span></h1>
          <p class="text-sm text-themed-soft mt-1 max-w-2xl">Two co-existing profiles. Toggle each on or off independently. The Floor only shows you to people whose mode you also have on.</p>
        </div>
        <div class="flex gap-2">
          <a href="#/privacy" class="btn btn-primary">Privacy matrix</a>
          <button id="reset" class="btn btn-rose">Reset everything</button>
        </div>
      </header>

      <div class="card p-4 grid gap-3">
        <h2 class="font-display font-semibold text-lg">Profiles</h2>
        <div class="grid sm:grid-cols-2 gap-3">
          ${modeToggle(datingOn,    'dating',     'Dating profile',     'Physical / lifestyle match.')}
          ${modeToggle(networkingOn,'networking', 'Networking profile', 'Ambitions, expertise, way of thinking.')}
        </div>
      </div>

      <div class="card p-4 grid gap-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h2 class="font-display font-semibold text-lg">Theme</h2>
          <span class="text-[11px] text-themed-mute">Press <span class="kbd">T</span> to cycle</span>
        </div>
        <div class="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
          ${THEMES.map(t => themeTile(t, t.key === themeKey)).join('')}
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <div class="card p-4 grid gap-3">
          <h2 class="font-display font-semibold text-lg">Identity</h2>
          <div class="grid sm:grid-cols-2 gap-3">
            <label class="grid gap-1">
              <span class="text-xs text-themed-mute">Display name</span>
              <input class="input" id="f-name" value="${escapeHtml(me.name)}" />
            </label>
            <label class="grid gap-1">
              <span class="text-xs text-themed-mute">Alias</span>
              <input class="input" id="f-alias" value="${escapeHtml(me.alias)}" />
            </label>
            <label class="grid gap-1">
              <span class="text-xs text-themed-mute">Default visibility</span>
              <select class="select" id="f-vismode">
                ${VIS_MODES.map(m => `<option value="${m.key}" ${me.visMode===m.key?'selected':''}>${m.icon} ${m.label}</option>`).join('')}
              </select>
            </label>
            <label class="grid gap-1">
              <span class="text-xs text-themed-mute">Reveal gate (match% required)</span>
              <input class="input" id="f-gate" type="number" min="0" max="1" step="0.05" value="${me.visMatchGate}" />
            </label>
            <label class="grid gap-1 sm:col-span-2 items-end">
              <span class="text-xs text-themed-mute">Be discoverable (Layer 3)</span>
              <button id="f-optin" class="btn ${me.optIn?'btn-mint':'btn-rose'}">${me.optIn?'Discoverable':'Private'}</button>
            </label>
          </div>
          <p class="text-[11px] text-themed-mute">For finer-grained control over what each person sees of you, edit the <a href="#/privacy" class="text-themed hover:underline" style="color:var(--iris-soft)">privacy matrix</a>.</p>
        </div>

        <div class="card p-4 grid gap-3 ${datingOn?'':'opacity-50'}">
          <div class="flex items-center justify-between">
            <h2 class="font-display font-semibold text-lg">Dating · status</h2>
            <span class="pill ${datingOn?'pill-rose':'pill-slate'}">${datingOn?'On':'Off'}</span>
          </div>
          <label class="grid gap-1">
            <span class="text-xs text-themed-mute">Dating status</span>
            <select class="select" id="f-status-dating" ${datingOn?'':'disabled'}>
              ${STATUS_DATING.map(s => `<option value="${s.key}" ${me.status.dating===s.key?'selected':''}>${s.icon} ${s.label}</option>`).join('')}
            </select>
          </label>
          <div class="grid gap-1">
            <span class="text-xs text-themed-mute">Gender</span>
            <div class="flex flex-wrap gap-1.5" id="gender-row">
              ${GENDERS.filter(g=>g.key!=='any').map(g => {
                const sel = me.dating.self?.gender === g.label;
                return `<button class="pill ${sel?'pill-iris':''}" data-self-gender="${escapeHtml(g.label)}" ${datingOn?'':'disabled'}>${g.icon} ${escapeHtml(g.label)}</button>`;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="card p-4 grid gap-3 lg:col-span-2 ${datingOn?'':'opacity-50'}">
          <h2 class="font-display font-semibold text-lg">Dating · self-description</h2>
          <p class="text-[11px] text-themed-mute">Physical and lifestyle attributes. Other users score you against their preference vector.</p>
          <div class="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
            ${datingNonGender.map(f => selfFieldRow(f, me.dating.self, 'dating')).join('')}
          </div>
        </div>

        <div class="card p-4 grid gap-3 ${networkingOn?'':'opacity-50'}">
          <div class="flex items-center justify-between">
            <h2 class="font-display font-semibold text-lg">Networking · status</h2>
            <span class="pill ${networkingOn?'pill-mint':'pill-slate'}">${networkingOn?'On':'Off'}</span>
          </div>
          <label class="grid gap-1">
            <span class="text-xs text-themed-mute">Networking status</span>
            <select class="select" id="f-status-net" ${networkingOn?'':'disabled'}>
              ${STATUS_NETWORKING.map(s => `<option value="${s.key}" ${me.status.networking===s.key?'selected':''}>${s.icon} ${s.label}</option>`).join('')}
            </select>
          </label>
          <p class="text-[11px] text-themed-mute">Edit your alignment ranking on the <a href="#/alignment" class="text-themed hover:underline" style="color:var(--iris-soft)">Alignment</a> page.</p>
        </div>

        <div class="card p-4 grid gap-3 lg:col-span-2 ${networkingOn?'':'opacity-50'}">
          <h2 class="font-display font-semibold text-lg">Networking · self-description</h2>
          <p class="text-[11px] text-themed-mute">No physical traits. Ambition horizon, role posture, expertise, and how you ship — used by Layer 2 / Alignment scoring.</p>
          <div class="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
            ${NETWORKING_FIELDS.map(f => selfFieldRow(f, me.networking.self, 'networking')).join('')}
          </div>
        </div>
      </div>
    </section>
  `;

  $$('button[data-theme]', root).forEach(b => b.addEventListener('click', () => {
    setTheme(b.dataset.theme);
    render(root);
  }));

  $$('button[data-mode]', root).forEach(b => b.addEventListener('click', () => {
    const mode = b.dataset.mode;
    const cur = !!store.profile.modes?.[mode];
    store.setProfile({ modes: { ...store.profile.modes, [mode]: !cur } });
    render(root);
  }));

  $('#f-name', root).addEventListener('input',  e => store.setProfile({ name:  e.target.value || 'You' }));
  $('#f-alias', root).addEventListener('input', e => store.setProfile({ alias: e.target.value || 'you' }));
  $('#f-vismode', root).addEventListener('change', e => store.setProfile({ visMode: e.target.value }));
  $('#f-gate', root).addEventListener('input', e => store.setProfile({ visMatchGate: Number(e.target.value) }));
  if (datingOn)     $('#f-status-dating', root).addEventListener('change', e => store.setProfile({ status: { ...store.profile.status, dating: e.target.value } }));
  if (networkingOn) $('#f-status-net',    root).addEventListener('change', e => store.setProfile({ status: { ...store.profile.status, networking: e.target.value } }));
  $('#f-optin', root).addEventListener('click', () => { store.setProfile({ optIn: !store.profile.optIn }); render(root); });

  $$('button[data-self-gender]', root).forEach(b => b.addEventListener('click', () => {
    if (!datingOn) return;
    store.setProfile({ dating: { ...store.profile.dating, self: { ...store.profile.dating.self, gender: b.dataset.selfGender } } });
    render(root);
  }));
  $$('select[data-self]', root).forEach(s => s.addEventListener('change', e => {
    const scope = s.dataset.scope;
    const key = s.dataset.self;
    const cur = store.profile[scope];
    store.setProfile({ [scope]: { ...cur, self: { ...cur.self, [key]: e.target.value } } });
  }));

  $('#reset', root).addEventListener('click', () => {
    if (confirm('Reset all local data? Your profile, rapport, mutes, and reveals will be wiped.')) {
      store.reset();
      render(root);
    }
  });
}
