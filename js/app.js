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
  const modeIcon  = mode === 'dating' ? '♥' : '◆';
  const otherKey  = mode === 'dating' ? 'networking' : 'dating';
  const otherEnabled = !!me[otherKey]?.enabled;

  const modePill = $('#mode-pill');
  if (modePill) {
    modePill.innerHTML = `<span>${modeIcon}</span><span style="font-weight:600">${mode === 'dating' ? 'Dating' : 'Networking'}</span>`;
    modePill.title = otherEnabled ? `Switch to ${otherKey} (M)` : `${otherKey} profile is off — toggle it on in Profile`;
    modePill.disabled = !otherEnabled;
    modePill.style.opacity = otherEnabled ? '1' : '0.5';
    modePill.style.cursor  = otherEnabled ? 'pointer' : 'not-allowed';
    modePill.style.background = `color-mix(in srgb, var(--${mode === 'dating' ? 'rose' : 'mint'}) 14%, transparent)`;
    modePill.style.borderColor = `color-mix(in srgb, var(--${mode === 'dating' ? 'rose' : 'mint'}) 35%, transparent)`;
  }

  const personaPill = $('#persona-pill');
  if (personaPill) {
    if (!persona) {
      personaPill.innerHTML = `<span class="text-themed-mute">no persona</span>`;
    } else {
      const more = block.personas.length > 1 ? `<span class="text-themed-mute">${block.personas.length}</span>` : '';
      personaPill.innerHTML = `${renderAvatar(persona.avatar)}<span style="font-weight:600">${escapeHtml(persona.name)}</span>${more}`;
    }
    personaPill.title = block.personas.length > 1 ? 'Cycle persona ([ / ])' : 'Add personas on the Profile screen';
  }
}
paintPills();
bus.on('state:changed', paintPills);

const modePill = $('#mode-pill');
if (modePill) modePill.addEventListener('click', () => {
  // If the target mode is disabled, auto-enable it so the toggle always works.
  const target = store.mode === 'dating' ? 'networking' : 'dating';
  if (!store.profile[target]?.enabled) store.setEnabled(target, true);
  store.toggleMode();
  refresh();
});
const personaPill = $('#persona-pill');
if (personaPill) personaPill.addEventListener('click', () => { store.cyclePersona(1); refresh(); });

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
