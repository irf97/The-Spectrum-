import { defineRoute, start, renderNav, refresh } from './router.js';
import { store } from './state.js';
import { bus, $, escapeHtml } from './util.js';
import { THEMES } from './data.js';

import * as Floor     from './floor.js';
import * as Layer1    from './layer1.js';
import * as Layer2    from './layer2.js';
import * as Alignment from './alignment.js';
import * as Layer3    from './layer3.js';
import * as Layer4    from './layer4.js';
import * as Layer5    from './layer5.js';
import * as Societies from './societies.js';
import * as Profile   from './profile.js';
import * as Privacy   from './privacy.js';
import * as Theme     from './theme.js';
import * as People    from './people.js';

defineRoute({ path: '/floor',     name:'floor',     label:'Floor',     icon:'⊙', render: Floor.render });
defineRoute({ path: '/status',    name:'status',    label:'Status',    icon:'●', render: Layer1.render });
defineRoute({ path: '/match',     name:'match',     label:'Match',     icon:'♥', render: Layer2.render });
defineRoute({ path: '/alignment', name:'alignment', label:'Alignment', icon:'◆', render: Alignment.render });
defineRoute({ path: '/proximity', name:'prox',      label:'Proximity', icon:'③', render: Layer3.render });
defineRoute({ path: '/identity',  name:'identity',  label:'Identity',  icon:'④', render: Layer4.render });
defineRoute({ path: '/rapport',   name:'rapport',   label:'Rapport',   icon:'⑤', render: Layer5.render });
defineRoute({ path: '/societies', name:'societies', label:'Societies', icon:'❖', render: Societies.render });
defineRoute({ path: '/profile',   name:'profile',   label:'Profile',   icon:'◉', render: Profile.render });
defineRoute({ path: '/privacy',   name:'privacy',   label:'Privacy',   icon:'🔒', render: Privacy.render });
defineRoute({ path: '/theme',     name:'theme',     label:'Theme',     icon:'🎨', render: Theme.render });

defineRoute({ path: '/people/:id', name:'person',  label:null, render: People.render });

renderNav();
start();
store.startTicking();

// ----- Theme -----------------------------------------------------------------

function applyTheme(key) {
  const k = THEMES.find(t => t.key === key) ? key : 'midnight';
  document.documentElement.setAttribute('data-theme', k);
  document.body && document.body.setAttribute('data-theme', k);
}
function currentTheme() {
  const k = store.getUI('theme', { key: 'midnight' }).key || 'midnight';
  return THEMES.find(t => t.key === k) ? k : 'midnight';
}
function setTheme(key) {
  store.setUI('theme', { key });
  applyTheme(key);
}
applyTheme(currentTheme());

function cycleTheme() {
  const cur = currentTheme();
  const i = THEMES.findIndex(t => t.key === cur);
  const next = THEMES[(i + 1) % THEMES.length];
  setTheme(next.key);
}

// ----- Alter-ego pill (top-right, single dropdown) --------------------------

function renderAvatar(av, size = 16) {
  if (!av) return `<span style="width:${size}px;height:${size}px;border-radius:999px;display:inline-block;background:var(--panel-3)"></span>`;
  if (av.kind === 'emoji') return `<span style="font-size:${Math.round(size*0.85)}px;line-height:1">${escapeHtml(av.value || '·')}</span>`;
  if (av.kind === 'color') return `<span style="width:${size}px;height:${size}px;border-radius:999px;display:inline-block;background:${escapeHtml(av.value || '#888')}"></span>`;
  return `<span style="width:${size+2}px;height:${size+2}px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--panel-3);font-size:${Math.round(size*0.5)}px;font-weight:700">${escapeHtml((av.value || '··').slice(0,2))}</span>`;
}

function modeLabel(m) { return m === 'dating' ? 'Dating' : 'Networking'; }

function paintPersonaPill() {
  const pill = $('#persona-pill');
  if (!pill) return;
  const persona = store.activePersona();
  const mode = store.mode;
  if (!persona) {
    pill.innerHTML = `<span class="text-themed-mute">no alter ego</span>`;
    return;
  }
  const tag = persona.roleplay
    ? `<span class="text-themed-mute">· ${escapeHtml(modeLabel(mode))} · as ${escapeHtml(persona.roleplay)}</span>`
    : `<span class="text-themed-mute">· ${escapeHtml(modeLabel(mode))}</span>`;
  pill.innerHTML = `${renderAvatar(persona.avatar, 16)}<span style="font-weight:600">${escapeHtml(persona.name)}</span>${tag}<span class="text-themed-mute" style="font-size:10px">▾</span>`;
  pill.title = 'Pick alter ego ([ / ] cycles)';
  pill.style.cursor = 'pointer';
  pill.style.background = `color-mix(in srgb, var(--${mode === 'dating' ? 'rose' : 'mint'}) 10%, transparent)`;
  pill.style.borderColor = `color-mix(in srgb, var(--${mode === 'dating' ? 'rose' : 'mint'}) 30%, transparent)`;
}
paintPersonaPill();
bus.on('state:changed', paintPersonaPill);

// Phase 5 — global override pill ("go private"). Always visible in the
// persistent header so every screen has a one-action kill-path. Maps to
// the Override/Escalation kernel primitive. Per-target overrides (mute,
// reveal-cancel) remain on the people pages.
function paintOverridePill() {
  const me = store.profile;
  const pill = $('#override-pill');
  if (!pill) return;
  if (me.optIn) {
    pill.textContent = '🌐 Discoverable';
    pill.style.borderColor = 'color-mix(in srgb, var(--mint) 50%, transparent)';
    pill.style.color       = 'var(--mint)';
    pill.style.background  = 'color-mix(in srgb, var(--mint) 10%, transparent)';
    pill.title = 'You are discoverable. Click to go private — kill-path, one action.';
  } else {
    pill.textContent = '🔒 Private';
    pill.style.borderColor = 'color-mix(in srgb, var(--rose) 50%, transparent)';
    pill.style.color       = 'var(--rose)';
    pill.style.background  = 'color-mix(in srgb, var(--rose) 10%, transparent)';
    pill.title = 'You are private. Click to become discoverable again.';
  }
}
paintOverridePill();
bus.on('state:changed', paintOverridePill);
$('#override-pill')?.addEventListener('click', () => {
  store.setProfile({ optIn: !store.profile.optIn });
});

let popoverEl = null;
function closeAlterEgoMenu() {
  if (popoverEl) { popoverEl.remove(); popoverEl = null; }
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onEsc);
}
function onDocClick(e) {
  if (!popoverEl) return;
  if (popoverEl.contains(e.target)) return;
  if ($('#persona-pill')?.contains(e.target)) return;
  closeAlterEgoMenu();
}
function onEsc(e) { if (e.key === 'Escape') closeAlterEgoMenu(); }

function openAlterEgoMenu() {
  closeAlterEgoMenu();
  const all = store.allPersonas();
  const activeMode = store.mode;
  const activeId = store.activePersonaId();

  popoverEl = document.createElement('div');
  popoverEl.id = 'alter-ego-menu';
  popoverEl.style.cssText = 'position:fixed;z-index:60;min-width:280px;max-height:70vh;overflow-y:auto;padding:6px;border-radius:12px;border:1px solid var(--line);background:var(--panel);box-shadow:0 16px 40px -12px rgba(0,0,0,.5);display:grid;gap:4px';

  const items = all.map(({ mode, persona }) => {
    const isActive = (mode === activeMode && persona.id === activeId);
    const accent = mode === 'dating' ? 'var(--rose)' : 'var(--mint)';
    const tagText = persona.roleplay ? `as ${persona.roleplay}` : '';
    return `
      <button class="card-soft p-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-left"
              data-pick-mode="${mode}" data-pick-id="${escapeHtml(persona.id)}"
              style="${isActive?'box-shadow:0 0 0 2px var(--iris)':''}">
        ${renderAvatar(persona.avatar, 22)}
        <div class="min-w-0">
          <div class="font-medium text-sm truncate">${escapeHtml(persona.name)}${tagText?` <span class="text-themed-mute">· ${escapeHtml(tagText)}</span>`:''}</div>
          <div class="text-[11px]" style="color:${accent}">${escapeHtml(modeLabel(mode))} · ${escapeHtml(persona.status || '')}</div>
        </div>
        ${isActive?'<span class="text-themed-mute text-xs">active</span>':''}
      </button>`;
  }).join('');

  popoverEl.innerHTML = `
    <div class="px-2 py-1 text-[11px] text-themed-mute">All alter egos</div>
    ${items}
    <a href="#/profile" class="card-soft p-2 text-sm text-center" style="color:var(--iris-soft)">+ Manage on Profile</a>
  `;
  document.body.appendChild(popoverEl);

  const pill = $('#persona-pill');
  const r = pill.getBoundingClientRect();
  popoverEl.style.top = `${r.bottom + 6}px`;
  popoverEl.style.right = `${window.innerWidth - r.right}px`;

  popoverEl.querySelectorAll('button[data-pick-id]').forEach(b => b.addEventListener('click', () => {
    store.pickAlterEgo(b.dataset.pickMode, b.dataset.pickId);
    closeAlterEgoMenu();
    refresh();
  }));
  popoverEl.querySelectorAll('a').forEach(a => a.addEventListener('click', closeAlterEgoMenu));

  setTimeout(() => {
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onEsc);
  }, 0);
}

const personaPill = $('#persona-pill');
if (personaPill) personaPill.addEventListener('click', (e) => {
  e.stopPropagation();
  if (popoverEl) closeAlterEgoMenu(); else openAlterEgoMenu();
});

// ----- Hotkeys --------------------------------------------------------------

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
  if (e.key === '0') location.hash = '#/floor';
  if (e.key === '1') location.hash = '#/status';
  if (e.key === '2') location.hash = '#/match';
  if (e.key === '3') location.hash = '#/alignment';
  if (e.key === '4') location.hash = '#/proximity';
  if (e.key === '5') location.hash = '#/identity';
  if (e.key === '6') location.hash = '#/rapport';
  if (e.key === 'i') location.hash = '#/profile';
  if (e.key === 'p') location.hash = '#/privacy';
  if (e.key === 't' || e.key === 'T') cycleTheme();
  if (e.key === '[') { store.cyclePersona(-1); refresh(); }
  if (e.key === ']') { store.cyclePersona(1);  refresh(); }
});

export { setTheme, currentTheme };
