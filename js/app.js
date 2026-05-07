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

// ----- Mode + persona pills (top-right) -------------------------------------

function renderAvatar(av) {
  if (!av) return '<span style="width:14px;height:14px;border-radius:999px;display:inline-block;background:var(--panel-3)"></span>';
  if (av.kind === 'emoji') return `<span style="font-size:13px;line-height:1">${escapeHtml(av.value || '·')}</span>`;
  if (av.kind === 'color') return `<span style="width:12px;height:12px;border-radius:999px;display:inline-block;background:${escapeHtml(av.value || '#888')}"></span>`;
  return `<span style="width:18px;height:18px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--panel-3);font-size:9px;font-weight:700">${escapeHtml((av.value || '··').slice(0,2))}</span>`;
}

function paintPills() {
  const me = store.profile;
  const mode = store.mode;
  const block = me[mode];
  const persona = store.activePersona();
  const modeIcon = mode === 'dating' ? '♥' : '◆';

  const modePill = $('#mode-pill');
  if (modePill) {
    modePill.innerHTML = `<span>${modeIcon}</span><span style="font-weight:600">${mode === 'dating' ? 'Dating' : 'Networking'}</span><span class="text-themed-mute">·</span><span class="text-themed-mute" style="font-size:10px">M</span>`;
    modePill.title = `Switch to ${mode === 'dating' ? 'networking' : 'dating'} (M)`;
    modePill.style.background = `color-mix(in srgb, var(--${mode === 'dating' ? 'rose' : 'mint'}) 14%, transparent)`;
    modePill.style.borderColor = `color-mix(in srgb, var(--${mode === 'dating' ? 'rose' : 'mint'}) 35%, transparent)`;
    modePill.style.cursor = 'pointer';
  }

  const personaPill = $('#persona-pill');
  if (personaPill) {
    if (!persona) {
      personaPill.innerHTML = `<span class="text-themed-mute">no alter ego</span>`;
    } else {
      const count = block.personas.length;
      const more = count > 1 ? `<span class="text-themed-mute">${count}</span>` : '';
      personaPill.innerHTML = `${renderAvatar(persona.avatar)}<span style="font-weight:600">${escapeHtml(persona.name)}</span>${more}<span class="text-themed-mute" style="font-size:10px">▾</span>`;
    }
    personaPill.title = 'Pick alter ego ([ / ] cycles)';
    personaPill.style.cursor = 'pointer';
  }
}
paintPills();
bus.on('state:changed', paintPills);

// Mode pill — always toggles. If the target mode is disabled, enable it.
const modePill = $('#mode-pill');
if (modePill) modePill.addEventListener('click', () => {
  const target = store.mode === 'dating' ? 'networking' : 'dating';
  if (!store.profile[target]?.enabled) store.setEnabled(target, true);
  store.toggleMode();
  refresh();
});

// ----- Alter ego popover ----------------------------------------------------

let popoverEl = null;
function closeAlterEgoMenu() { if (popoverEl) { popoverEl.remove(); popoverEl = null; } }

function openAlterEgoMenu() {
  closeAlterEgoMenu();
  const me = store.profile;
  const mode = store.mode;
  const block = me[mode];
  const personas = block.personas;
  const activeId = block.activePersonaId;

  popoverEl = document.createElement('div');
  popoverEl.id = 'alter-ego-menu';
  popoverEl.style.cssText = 'position:fixed;z-index:60;min-width:240px;padding:6px;border-radius:12px;border:1px solid var(--line);background:var(--panel);box-shadow:0 16px 40px -12px rgba(0,0,0,.5);display:grid;gap:4px';

  const items = personas.map(p => `
    <button class="card-soft p-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-left" data-pick="${escapeHtml(p.id)}"
            style="${p.id===activeId?'box-shadow:0 0 0 2px var(--iris)':''}">
      ${renderAvatar(p.avatar, 22)}
      <div class="min-w-0">
        <div class="font-medium text-sm truncate">${escapeHtml(p.name)}</div>
        <div class="text-[11px] text-themed-mute">${escapeHtml(p.preset || 'custom')} · ${escapeHtml(p.status || '')}</div>
      </div>
      ${p.id===activeId?'<span class="text-themed-mute text-xs">active</span>':''}
    </button>
  `).join('');

  popoverEl.innerHTML = `
    <div class="px-2 py-1 text-[11px] text-themed-mute">${mode === 'dating' ? 'Dating' : 'Networking'} · alter egos</div>
    ${items}
    <a href="#/profile" class="card-soft p-2 text-sm text-center" style="color:var(--iris-soft)">+ Manage on Profile</a>
  `;
  document.body.appendChild(popoverEl);

  // Position under the persona pill
  const pill = $('#persona-pill');
  const r = pill.getBoundingClientRect();
  const top = r.bottom + 6;
  const right = window.innerWidth - r.right;
  popoverEl.style.top = `${top}px`;
  popoverEl.style.right = `${right}px`;

  popoverEl.querySelectorAll('button[data-pick]').forEach(b => b.addEventListener('click', () => {
    store.setActivePersona(mode, b.dataset.pick);
    closeAlterEgoMenu();
    refresh();
  }));
  popoverEl.querySelectorAll('a').forEach(a => a.addEventListener('click', closeAlterEgoMenu));

  // Close on outside click / escape
  setTimeout(() => {
    document.addEventListener('click', onDocClick, { once: false });
    document.addEventListener('keydown', onEsc);
  }, 0);
}
function onDocClick(e) {
  if (!popoverEl) return;
  if (popoverEl.contains(e.target)) return;
  if ($('#persona-pill')?.contains(e.target)) return;
  closeAlterEgoMenu();
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onEsc);
}
function onEsc(e) {
  if (e.key === 'Escape') {
    closeAlterEgoMenu();
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onEsc);
  }
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
  if (e.key === 'm' || e.key === 'M') {
    const target = store.mode === 'dating' ? 'networking' : 'dating';
    if (!store.profile[target]?.enabled) store.setEnabled(target, true);
    store.toggleMode();
    refresh();
  }
  if (e.key === '[') { store.cyclePersona(-1); refresh(); }
  if (e.key === ']') { store.cyclePersona(1);  refresh(); }
});

export { setTheme, currentTheme };
