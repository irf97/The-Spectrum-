// Profile — identity + per-mode personas (alter egos) + theme.

import {
  fieldsFor, GENDERS, VIS_MODES, STATUS_DATING, STATUS_NETWORKING,
  THEMES, NETWORKING_FIELDS, PERSONA_PRESETS, PERSONA_AVATAR_EMOJI, PERSONA_AVATAR_PALETTE
} from './data.js';
import { store } from './state.js';
import { setTheme, currentTheme } from './app.js';
import { $, $$, escapeHtml } from './util.js';

function selfFieldKey(self) {
  if (self?.gender === 'Woman') return 'woman';
  if (self?.gender === 'Man') return 'man';
  if (self?.gender === 'Non-binary') return 'nonbinary';
  return 'any';
}

function avatarHtml(av, size = 28) {
  const sz = `${size}px`;
  if (!av) return `<span style="width:${sz};height:${sz};border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--panel-3)"></span>`;
  if (av.kind === 'emoji') return `<span style="width:${sz};height:${sz};border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--panel-2);font-size:${size*0.55}px">${escapeHtml(av.value || '·')}</span>`;
  if (av.kind === 'color') return `<span style="width:${sz};height:${sz};border-radius:999px;display:inline-block;background:${escapeHtml(av.value || '#888')}"></span>`;
  return `<span style="width:${sz};height:${sz};border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--panel-3);font-size:${size*0.4}px;font-weight:700">${escapeHtml((av.value || '··').slice(0,2))}</span>`;
}

function selfFieldRow(f, self, scope, personaId) {
  const cur = self?.[f.key] ?? '';
  return `
    <label class="grid gap-1">
      <span class="text-xs text-themed-mute">${escapeHtml(f.label)}</span>
      <select class="select" data-scope="${scope}" data-persona="${personaId}" data-self="${f.key}">
        <option value="">— unset —</option>
        ${f.options.map(o => `<option ${cur===o?'selected':''}>${escapeHtml(o)}</option>`).join('')}
      </select>
    </label>`;
}

function themeTile(t, active) {
  return `
    <button class="theme-swatch text-left" aria-current="${active?'true':'false'}" data-theme="${t.key}">
      <div class="swatch-row mb-2">${t.swatches.map(s => `<span style="background:${escapeHtml(s)}"></span>`).join('')}</div>
      <div class="font-display font-semibold">${escapeHtml(t.label)}</div>
      <div class="text-[11px] text-themed-mute mt-0.5">${escapeHtml(t.copy)}</div>
    </button>`;
}

function personaCard(persona, active, modeKey) {
  const presetMeta = PERSONA_PRESETS.find(x => x.key === persona.preset) || PERSONA_PRESETS[0];
  return `
    <button class="card-soft p-3 grid gap-1.5 text-left" data-pick-persona="${persona.id}" data-mode="${modeKey}"
            style="${active?'box-shadow:0 0 0 2px var(--iris)':''}">
      <div class="flex items-center gap-2">
        ${avatarHtml(persona.avatar, 28)}
        <div class="flex-1 min-w-0">
          <div class="font-display font-semibold truncate">${escapeHtml(persona.name)}</div>
          <div class="text-[11px] text-themed-mute">${escapeHtml(presetMeta.icon)} ${escapeHtml(presetMeta.label)} · ${escapeHtml(persona.status)}</div>
        </div>
      </div>
    </button>`;
}

function avatarPicker(persona, modeKey) {
  return `
    <div class="grid gap-2">
      <div class="text-xs text-themed-mute">Avatar</div>
      <div class="flex flex-wrap gap-1">
        ${PERSONA_AVATAR_EMOJI.map(em => {
          const sel = persona.avatar?.kind === 'emoji' && persona.avatar.value === em;
          return `<button class="card-soft p-1" data-set-avatar='${escapeHtml(JSON.stringify({kind:'emoji', value: em}))}' data-mode="${modeKey}" data-persona="${persona.id}"
                  style="width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;${sel?'box-shadow:0 0 0 2px var(--iris)':''}">${em}</button>`;
        }).join('')}
        ${PERSONA_AVATAR_PALETTE.map(c => {
          const sel = persona.avatar?.kind === 'color' && persona.avatar.value === c;
          return `<button class="card-soft p-1" data-set-avatar='${escapeHtml(JSON.stringify({kind:'color', value: c}))}' data-mode="${modeKey}" data-persona="${persona.id}"
                  style="width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;${sel?'box-shadow:0 0 0 2px var(--iris)':''}"><span style="width:18px;height:18px;border-radius:999px;background:${c}"></span></button>`;
        }).join('')}
      </div>
    </div>`;
}

function personaEditor(persona, modeKey) {
  const isDating = modeKey === 'dating';
  const fields = isDating ? fieldsFor(selfFieldKey(persona.self)) : NETWORKING_FIELDS;
  const nonGenderFields = fields.filter(f => f.key !== 'gender');
  const statusList = isDating ? STATUS_DATING : STATUS_NETWORKING;

  return `
    <div class="card p-4 grid gap-4">
      <div class="grid sm:grid-cols-2 gap-3">
        <label class="grid gap-1">
          <span class="text-xs text-themed-mute">Persona name</span>
          <input class="input" value="${escapeHtml(persona.name)}" data-persona-name="${persona.id}" data-mode="${modeKey}" />
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-themed-mute">Preset</span>
          <select class="select" data-persona-preset="${persona.id}" data-mode="${modeKey}">
            ${PERSONA_PRESETS.map(p => `<option value="${p.key}" ${persona.preset===p.key?'selected':''}>${escapeHtml(p.icon)} ${escapeHtml(p.label)}</option>`).join('')}
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-themed-mute">Status</span>
          <select class="select" data-persona-status="${persona.id}" data-mode="${modeKey}">
            ${statusList.map(s => `<option value="${s.key}" ${persona.status===s.key?'selected':''}>${s.icon} ${s.label}</option>`).join('')}
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-themed-mute">Visibility mode</span>
          <select class="select" data-persona-vismode="${persona.id}" data-mode="${modeKey}">
            ${VIS_MODES.map(m => `<option value="${m.key}" ${persona.visMode===m.key?'selected':''}>${m.icon} ${m.label}</option>`).join('')}
          </select>
        </label>
      </div>

      ${avatarPicker(persona, modeKey)}

      ${isDating ? `
      <div class="grid gap-1">
        <span class="text-xs text-themed-mute">Gender</span>
        <div class="flex flex-wrap gap-1.5">
          ${GENDERS.filter(g=>g.key!=='any').map(g => {
            const sel = persona.self?.gender === g.label;
            return `<button class="pill" data-persona-gender="${persona.id}" data-mode="${modeKey}" data-gender="${escapeHtml(g.label)}"
                    style="${sel?'box-shadow:0 0 0 2px var(--iris)':''}">${g.icon} ${escapeHtml(g.label)}</button>`;
          }).join('')}
        </div>
      </div>` : ''}

      <div class="grid gap-2">
        <div class="text-xs text-themed-mute">${isDating ? 'Self-description (physical / lifestyle)' : 'Self-description (ambition / role / expertise)'}</div>
        <div class="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
          ${nonGenderFields.map(f => selfFieldRow(f, persona.self, modeKey, persona.id)).join('')}
        </div>
      </div>

      <div class="flex gap-2 flex-wrap">
        <button class="btn btn-sm" data-duplicate-persona="${persona.id}" data-mode="${modeKey}">Duplicate</button>
        <button class="btn btn-sm btn-rose" data-delete-persona="${persona.id}" data-mode="${modeKey}">Delete</button>
      </div>
    </div>`;
}

function modeBlock(modeKey, me) {
  const block = me[modeKey];
  const personas = block.personas;
  const active = personas.find(p => p.id === block.activePersonaId) || personas[0];
  const enabled = !!block.enabled;
  const accent = modeKey === 'dating' ? 'pill-rose' : 'pill-mint';
  const label = modeKey === 'dating' ? 'Dating' : 'Networking';

  return `
    <section class="card p-4 grid gap-4 ${enabled?'':'opacity-60'}">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <h2 class="font-display font-semibold text-lg">${label} personas</h2>
          <span class="pill ${enabled?accent:'pill-slate'}">${enabled?'On':'Off'}</span>
        </div>
        <div class="flex gap-2 flex-wrap">
          <select class="select w-auto text-sm" data-add-preset="${modeKey}">
            <option value="">+ New persona…</option>
            ${PERSONA_PRESETS.map(p => `<option value="${p.key}">${escapeHtml(p.icon)} ${escapeHtml(p.label)}</option>`).join('')}
          </select>
          <button class="btn btn-sm" data-toggle-mode-enabled="${modeKey}">${enabled?'Disable':'Enable'} mode</button>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        ${personas.map(p => personaCard(p, p.id === active?.id, modeKey)).join('')}
      </div>

      ${active ? personaEditor(active, modeKey) : ''}
    </section>`;
}

export function render(root) {
  const me = store.profile;
  const themeKey = currentTheme();

  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">Profile</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">${escapeHtml(me.name)} <span class="text-themed-mute">@${escapeHtml(me.alias)}</span></h1>
          <p class="text-sm text-themed-soft mt-1 max-w-2xl">Two modes (Dating / Networking). Each holds personas — alter egos for different settings, moods, days. The top-right pill cluster switches mode and cycles personas.</p>
        </div>
        <div class="flex gap-2">
          <a href="#/privacy" class="btn btn-primary">Privacy matrix</a>
          <button id="reset" class="btn btn-rose">Reset everything</button>
        </div>
      </header>

      <div class="card p-4 grid gap-3">
        <div class="grid sm:grid-cols-3 gap-3">
          <label class="grid gap-1">
            <span class="text-xs text-themed-mute">Display name</span>
            <input class="input" id="f-name" value="${escapeHtml(me.name)}" />
          </label>
          <label class="grid gap-1">
            <span class="text-xs text-themed-mute">Alias</span>
            <input class="input" id="f-alias" value="${escapeHtml(me.alias)}" />
          </label>
          <label class="grid gap-1">
            <span class="text-xs text-themed-mute">Reveal gate (match% required)</span>
            <input class="input" id="f-gate" type="number" min="0" max="1" step="0.05" value="${me.visMatchGate}" />
          </label>
        </div>
        <label class="flex items-center justify-between text-sm">
          <span>Discoverable in the room (Layer 3)</span>
          <button id="f-optin" class="btn btn-sm ${me.optIn?'btn-mint':'btn-rose'}">${me.optIn?'Discoverable':'Private'}</button>
        </label>
      </div>

      ${modeBlock('dating', me)}
      ${modeBlock('networking', me)}

      <div class="card p-4 grid gap-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h2 class="font-display font-semibold text-lg">Theme</h2>
          <span class="text-[11px] text-themed-mute">Press <span class="kbd">T</span> to cycle</span>
        </div>
        <div class="grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
          ${THEMES.map(t => themeTile(t, t.key === themeKey)).join('')}
        </div>
      </div>
    </section>
  `;

  // Top-level identity wiring
  $('#f-name', root).addEventListener('input',  e => store.setProfile({ name:  e.target.value || 'You' }));
  $('#f-alias', root).addEventListener('input', e => store.setProfile({ alias: e.target.value || 'you' }));
  $('#f-gate', root).addEventListener('input',  e => store.setProfile({ visMatchGate: Number(e.target.value) }));
  $('#f-optin', root).addEventListener('click', () => { store.setProfile({ optIn: !store.profile.optIn }); render(root); });

  // Theme tiles
  $$('button[data-theme]', root).forEach(b => b.addEventListener('click', () => {
    setTheme(b.dataset.theme);
    render(root);
  }));

  // Mode enable / disable
  $$('button[data-toggle-mode-enabled]', root).forEach(b => b.addEventListener('click', () => {
    const m = b.dataset.toggleModeEnabled;
    store.setEnabled(m, !store.profile[m].enabled);
    render(root);
  }));

  // Add persona via preset selector
  $$('select[data-add-preset]', root).forEach(sel => sel.addEventListener('change', e => {
    const presetKey = e.target.value;
    if (!presetKey) return;
    const m = sel.dataset.addPreset;
    const preset = PERSONA_PRESETS.find(p => p.key === presetKey);
    store.addPersona(m, preset?.label || 'New persona', presetKey);
    render(root);
  }));

  // Pick a persona (make active)
  $$('button[data-pick-persona]', root).forEach(b => b.addEventListener('click', () => {
    store.setActivePersona(b.dataset.mode, b.dataset.pickPersona);
    render(root);
  }));

  // Persona name
  $$('input[data-persona-name]', root).forEach(inp => inp.addEventListener('input', e => {
    store.updatePersona(inp.dataset.mode, inp.dataset.personaName, { name: e.target.value });
  }));

  // Persona preset → applies overlay
  $$('select[data-persona-preset]', root).forEach(sel => sel.addEventListener('change', e => {
    store.applyPersonaPreset(sel.dataset.mode, sel.dataset.personaPreset, e.target.value);
    render(root);
  }));

  // Status / visMode
  $$('select[data-persona-status]', root).forEach(sel => sel.addEventListener('change', e => {
    store.updatePersona(sel.dataset.mode, sel.dataset.personaStatus, { status: e.target.value });
    render(root);
  }));
  $$('select[data-persona-vismode]', root).forEach(sel => sel.addEventListener('change', e => {
    store.updatePersona(sel.dataset.mode, sel.dataset.personaVismode, { visMode: e.target.value });
    render(root);
  }));

  // Avatar
  $$('button[data-set-avatar]', root).forEach(b => b.addEventListener('click', () => {
    const av = JSON.parse(b.dataset.setAvatar);
    store.updatePersona(b.dataset.mode, b.dataset.persona, { avatar: av });
    render(root);
  }));

  // Gender (dating only)
  $$('button[data-persona-gender]', root).forEach(b => b.addEventListener('click', () => {
    const block = store.profile[b.dataset.mode];
    const persona = block.personas.find(p => p.id === b.dataset.personaGender);
    if (!persona) return;
    store.updatePersona(b.dataset.mode, persona.id, { self: { ...persona.self, gender: b.dataset.gender } });
    render(root);
  }));

  // Self-description fields
  $$('select[data-self]', root).forEach(s => s.addEventListener('change', e => {
    const block = store.profile[s.dataset.scope];
    const persona = block.personas.find(p => p.id === s.dataset.persona);
    if (!persona) return;
    store.updatePersona(s.dataset.scope, persona.id, { self: { ...persona.self, [s.dataset.self]: e.target.value } });
  }));

  // Duplicate / delete
  $$('button[data-duplicate-persona]', root).forEach(b => b.addEventListener('click', () => {
    store.duplicatePersona(b.dataset.mode, b.dataset.duplicatePersona);
    render(root);
  }));
  $$('button[data-delete-persona]', root).forEach(b => b.addEventListener('click', () => {
    if (store.profile[b.dataset.mode].personas.length <= 1) {
      alert('Each mode keeps at least one persona. Add another first, then delete.');
      return;
    }
    if (!confirm('Delete this persona?')) return;
    store.deletePersona(b.dataset.mode, b.dataset.deletePersona);
    render(root);
  }));

  $('#reset', root).addEventListener('click', () => {
    if (confirm('Reset all local data? Your profile, rapport, mutes, and reveals will be wiped.')) {
      store.reset();
      render(root);
    }
  });
}
