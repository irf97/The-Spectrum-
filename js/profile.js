// Profile — identity + Dating self + Networking self + Alter egos.

import {
  fieldsFor, GENDERS, VIS_MODES, STATUS_DATING, STATUS_NETWORKING,
  NETWORKING_FIELDS, PERSONA_PRESETS, PERSONA_AVATAR_EMOJI, PERSONA_AVATAR_PALETTE
} from './data.js';
import { store } from './state.js';
import { $, $$, escapeHtml } from './util.js';

function selfFieldKey(self) {
  if (self?.gender === 'Woman') return 'woman';
  if (self?.gender === 'Man') return 'man';
  if (self?.gender === 'Bisexual') return 'bisexual';
  return 'any';
}

function avatarHtml(av, size = 28) {
  const sz = `${size}px`;
  if (!av) return `<span style="width:${sz};height:${sz};border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--panel-3)"></span>`;
  if (av.kind === 'emoji') return `<span style="width:${sz};height:${sz};border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--panel-2);font-size:${size*0.55}px">${escapeHtml(av.value || '·')}</span>`;
  if (av.kind === 'color') return `<span style="width:${sz};height:${sz};border-radius:999px;display:inline-block;background:${escapeHtml(av.value || '#888')}"></span>`;
  return `<span style="width:${sz};height:${sz};border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--panel-3);font-size:${size*0.4}px;font-weight:700">${escapeHtml((av.value || '··').slice(0,2))}</span>`;
}

function selfFieldRow(f, self, modeKey, personaId) {
  const cur = self?.[f.key] ?? '';
  return `
    <label class="grid gap-1">
      <span class="text-xs text-themed-mute">${escapeHtml(f.label)}</span>
      <select class="select" data-mode="${modeKey}" data-persona="${personaId}" data-self="${f.key}">
        <option value="">— unset —</option>
        ${f.options.map(o => `<option ${cur===o?'selected':''}>${escapeHtml(o)}</option>`).join('')}
      </select>
    </label>`;
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

function selfDescriptionGrid(persona, modeKey) {
  const isDating = modeKey === 'dating';
  const fields = isDating ? fieldsFor(selfFieldKey(persona.self)) : NETWORKING_FIELDS;
  const nonGenderFields = fields.filter(f => f.key !== 'gender');
  return `
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
    </div>`;
}

// "Default self" editor — for the default persona of a mode. Shows status, vismode, self description.
function defaultSelfEditor(persona, modeKey) {
  const isDating = modeKey === 'dating';
  const statusList = isDating ? STATUS_DATING : STATUS_NETWORKING;
  return `
    <div class="grid sm:grid-cols-2 gap-3">
      <label class="grid gap-1">
        <span class="text-xs text-themed-mute">Status</span>
        <select class="select" data-persona-status="${persona.id}" data-mode="${modeKey}">
          ${statusList.map(s => `<option value="${s.key}" ${persona.status===s.key?'selected':''}>${s.icon} ${s.label}</option>`).join('')}
        </select>
      </label>
      <label class="grid gap-1">
        <span class="text-xs text-themed-mute">Default visibility</span>
        <select class="select" data-persona-vismode="${persona.id}" data-mode="${modeKey}">
          ${VIS_MODES.map(m => `<option value="${m.key}" ${persona.visMode===m.key?'selected':''}>${m.icon} ${m.label}</option>`).join('')}
        </select>
      </label>
    </div>
    ${selfDescriptionGrid(persona, modeKey)}
  `;
}

// Alter ego editor — adds name, preset, roleplay tag, avatar, plus the default-self bits.
function alterEgoEditor(persona, modeKey) {
  const isDating = modeKey === 'dating';
  const statusList = isDating ? STATUS_DATING : STATUS_NETWORKING;
  return `
    <div class="card p-4 grid gap-4">
      <div class="flex items-center gap-2">
        ${avatarHtml(persona.avatar, 32)}
        <div class="flex-1 min-w-0">
          <div class="font-display font-semibold truncate">${escapeHtml(persona.name)}</div>
          <div class="text-[11px] text-themed-mute">${escapeHtml(modeKey === 'dating' ? 'Dating' : 'Networking')}${persona.roleplay ? ` · as ${escapeHtml(persona.roleplay)}` : ''}</div>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-3">
        <label class="grid gap-1">
          <span class="text-xs text-themed-mute">Alter ego name</span>
          <input class="input" value="${escapeHtml(persona.name)}" data-persona-name="${persona.id}" data-mode="${modeKey}" />
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-themed-mute">Roleplay tag (e.g. "vampire", "detective")</span>
          <input class="input" value="${escapeHtml(persona.roleplay || '')}" placeholder="leave empty for no roleplay"
                 data-persona-roleplay="${persona.id}" data-mode="${modeKey}" />
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-themed-mute">Base mode</span>
          <select class="select" data-persona-mode="${persona.id}" data-mode="${modeKey}">
            <option value="dating" ${modeKey==='dating'?'selected':''}>♥ Dating</option>
            <option value="networking" ${modeKey==='networking'?'selected':''}>◆ Networking</option>
          </select>
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
      ${selfDescriptionGrid(persona, modeKey)}

      <div class="flex gap-2 flex-wrap">
        <button class="btn btn-sm" data-activate-persona="${persona.id}" data-mode="${modeKey}">Activate</button>
        <button class="btn btn-sm" data-duplicate-persona="${persona.id}" data-mode="${modeKey}">Duplicate</button>
        <button class="btn btn-sm btn-rose" data-delete-persona="${persona.id}" data-mode="${modeKey}">Delete</button>
      </div>
    </div>`;
}

function alterEgoCard(persona, modeKey, isActive) {
  const accent = modeKey === 'dating' ? 'var(--rose)' : 'var(--mint)';
  return `
    <button class="card-soft p-3 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-left"
            data-pick-alter="${persona.id}" data-mode="${modeKey}"
            style="${isActive?'box-shadow:0 0 0 2px var(--iris)':''}">
      ${avatarHtml(persona.avatar, 32)}
      <div class="min-w-0">
        <div class="font-display font-semibold truncate">${escapeHtml(persona.name)}</div>
        <div class="text-[11px]" style="color:${accent}">${escapeHtml(modeKey === 'dating' ? 'Dating' : 'Networking')}${persona.roleplay ? ` · as ${escapeHtml(persona.roleplay)}` : ''}</div>
      </div>
      <div class="text-[11px] text-themed-mute">${escapeHtml(persona.status || '')}</div>
    </button>`;
}

export function render(root) {
  const me = store.profile;
  const datingDefault     = me.dating.personas.find(p => p.id === 'default') || me.dating.personas[0];
  const networkingDefault = me.networking.personas.find(p => p.id === 'default') || me.networking.personas[0];

  // Alter egos = every persona that isn't the "default" of its mode.
  const alterEgos = [];
  for (const m of ['dating','networking']) {
    for (const p of me[m].personas) {
      if (p.id !== 'default') alterEgos.push({ mode: m, persona: p });
    }
  }
  const editingId = store.getUI('profile', { editingAlterEgo: null }).editingAlterEgo;
  const editing = alterEgos.find(x => x.persona.id === editingId) || alterEgos[0] || null;

  const activeMode = store.mode;
  const activeId = store.activePersonaId();

  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">Profile</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">${escapeHtml(me.name)} <span class="text-themed-mute">@${escapeHtml(me.alias)}</span></h1>
          <p class="text-sm text-themed-soft mt-1 max-w-2xl">Three segments: your <b>Dating self</b>, your <b>Networking self</b>, and the <b>Alter egos</b> you can roleplay as. Pick one in the top-right pill at any time.</p>
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

      <section class="card p-4 grid gap-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h2 class="font-display font-semibold text-lg">Dating self</h2>
          <span class="pill pill-rose">♥ Dating</span>
        </div>
        <p class="text-xs text-themed-mute">Your real dating self — used when no alter ego is active.</p>
        ${defaultSelfEditor(datingDefault, 'dating')}
      </section>

      <section class="card p-4 grid gap-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h2 class="font-display font-semibold text-lg">Networking self</h2>
          <span class="pill pill-mint">◆ Networking</span>
        </div>
        <p class="text-xs text-themed-mute">Your real networking self — used when no alter ego is active.</p>
        ${defaultSelfEditor(networkingDefault, 'networking')}
      </section>

      <section class="card p-4 grid gap-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h2 class="font-display font-semibold text-lg">Alter egos</h2>
          <div class="flex items-center gap-2">
            <select id="add-alter-mode" class="select w-auto text-sm">
              <option value="dating">♥ Dating</option>
              <option value="networking">◆ Networking</option>
            </select>
            <input id="add-alter-name" class="input w-40 text-sm" placeholder="Name (e.g. Vampire)" />
            <button id="add-alter-go" class="btn btn-sm btn-primary">+ Add</button>
          </div>
        </div>
        <p class="text-xs text-themed-mute">Roleplay characters tied to a base mode. While active, others see "${escapeHtml(activeMode === 'dating' ? 'Dating' : 'Networking')} · as &lt;your roleplay&gt;".</p>

        ${alterEgos.length ? `
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          ${alterEgos.map(({mode, persona}) => alterEgoCard(persona, mode, persona.id === editing?.persona.id)).join('')}
        </div>
        ${editing ? alterEgoEditor(editing.persona, editing.mode) : ''}
        ` : `<div class="card-soft p-4 text-sm text-themed-mute">No alter egos yet. Add one above — e.g. "Vampire" tagged to Dating, or "CEO" tagged to Networking.</div>`}
      </section>
    </section>
  `;

  // Identity wiring
  $('#f-name', root).addEventListener('input',  e => store.setProfile({ name:  e.target.value || 'You' }));
  $('#f-alias', root).addEventListener('input', e => store.setProfile({ alias: e.target.value || 'you' }));
  $('#f-gate', root).addEventListener('input',  e => store.setProfile({ visMatchGate: Number(e.target.value) }));
  $('#f-optin', root).addEventListener('click', () => { store.setProfile({ optIn: !store.profile.optIn }); render(root); });

  // Add alter ego
  $('#add-alter-go', root)?.addEventListener('click', () => {
    const m = $('#add-alter-mode', root).value;
    const name = $('#add-alter-name', root).value.trim() || 'New alter ego';
    const created = store.addPersona(m, name, 'custom');
    if (created) {
      store.setUI('profile', { editingAlterEgo: created.id });
    }
    render(root);
  });

  // Pick (highlight) alter ego in the list — sets which one is being edited
  $$('button[data-pick-alter]', root).forEach(b => b.addEventListener('click', () => {
    store.setUI('profile', { editingAlterEgo: b.dataset.pickAlter });
    render(root);
  }));

  // Activate / duplicate / delete
  $$('button[data-activate-persona]', root).forEach(b => b.addEventListener('click', () => {
    store.pickAlterEgo(b.dataset.mode, b.dataset.activatePersona);
    render(root);
  }));
  $$('button[data-duplicate-persona]', root).forEach(b => b.addEventListener('click', () => {
    const cp = store.duplicatePersona(b.dataset.mode, b.dataset.duplicatePersona);
    if (cp) store.setUI('profile', { editingAlterEgo: cp.id });
    render(root);
  }));
  $$('button[data-delete-persona]', root).forEach(b => b.addEventListener('click', () => {
    if (!confirm('Delete this alter ego?')) return;
    store.deletePersona(b.dataset.mode, b.dataset.deletePersona);
    store.setUI('profile', { editingAlterEgo: null });
    render(root);
  }));

  // Field wiring (works for default-self editors AND alter-ego editor)
  $$('input[data-persona-name]', root).forEach(inp => inp.addEventListener('input', e => {
    store.updatePersona(inp.dataset.mode, inp.dataset.personaName, { name: e.target.value });
  }));
  $$('input[data-persona-roleplay]', root).forEach(inp => inp.addEventListener('input', e => {
    store.updatePersona(inp.dataset.mode, inp.dataset.personaRoleplay, { roleplay: e.target.value });
  }));
  $$('select[data-persona-preset]', root).forEach(sel => sel.addEventListener('change', e => {
    store.applyPersonaPreset(sel.dataset.mode, sel.dataset.personaPreset, e.target.value);
    render(root);
  }));
  $$('select[data-persona-status]', root).forEach(sel => sel.addEventListener('change', e => {
    store.updatePersona(sel.dataset.mode, sel.dataset.personaStatus, { status: e.target.value });
    render(root);
  }));
  $$('select[data-persona-vismode]', root).forEach(sel => sel.addEventListener('change', e => {
    store.updatePersona(sel.dataset.mode, sel.dataset.personaVismode, { visMode: e.target.value });
    render(root);
  }));
  $$('select[data-persona-mode]', root).forEach(sel => sel.addEventListener('change', e => {
    const fromMode = sel.dataset.mode;
    const toMode   = e.target.value;
    const personaId = sel.dataset.personaMode;
    if (fromMode === toMode) return;
    store.movePersona(fromMode, personaId, toMode);
    render(root);
  }));
  $$('button[data-set-avatar]', root).forEach(b => b.addEventListener('click', () => {
    const av = JSON.parse(b.dataset.setAvatar);
    store.updatePersona(b.dataset.mode, b.dataset.persona, { avatar: av });
    render(root);
  }));
  $$('button[data-persona-gender]', root).forEach(b => b.addEventListener('click', () => {
    const block = store.profile[b.dataset.mode];
    const persona = block.personas.find(p => p.id === b.dataset.personaGender);
    if (!persona) return;
    store.updatePersona(b.dataset.mode, persona.id, { self: { ...persona.self, gender: b.dataset.gender } });
    render(root);
  }));
  $$('select[data-self]', root).forEach(s => s.addEventListener('change', e => {
    const block = store.profile[s.dataset.mode];
    const persona = block.personas.find(p => p.id === s.dataset.persona);
    if (!persona) return;
    store.updatePersona(s.dataset.mode, persona.id, { self: { ...persona.self, [s.dataset.self]: e.target.value } });
  }));

  $('#reset', root).addEventListener('click', () => {
    if (confirm('Reset all local data? Your profile, rapport, mutes, and reveals will be wiped.')) {
      store.reset();
      render(root);
    }
  });
}
