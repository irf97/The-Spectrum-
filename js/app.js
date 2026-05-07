import { defineRoute, start, renderNav } from './router.js';
import { store } from './state.js';
import { bus, $ } from './util.js';
import { STATUS_DATING, STATUS_NETWORKING, THEMES } from './data.js';

import * as Floor     from './floor.js';
import * as Layer1    from './layer1.js';
import * as Layer2    from './layer2.js';
import * as Alignment from './alignment.js';
import * as Layer3    from './layer3.js';
import * as Layer4    from './layer4.js';
import * as Layer5    from './layer5.js';
import * as Profile   from './profile.js';
import * as Privacy   from './privacy.js';
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

// ----- Status pill ----------------------------------------------------------

function paintPill() {
  const me = store.profile;
  const dating = !!me.modes?.dating;
  const networking = !!me.modes?.networking;
  const pill = $('#status-pill');
  if (!pill) return;
  if (!dating && !networking) {
    pill.innerHTML = `<span>·</span><span>off</span><span class="text-themed-mute">· no profiles active</span>`;
    return;
  }
  // When both modes are active, show the dating chip first; click cycles.
  const useNetworking = networking && !dating;
  const list = useNetworking ? STATUS_NETWORKING : STATUS_DATING;
  const cur  = list.find(s => s.key === (useNetworking ? me.status.networking : me.status.dating)) || list[0];
  const modeLabel = dating && networking ? 'both' : useNetworking ? 'networking' : 'dating';
  pill.innerHTML = `<span>${cur.icon}</span><span>${cur.label}</span><span class="text-themed-mute">· ${modeLabel}</span>`;
}
paintPill();
bus.on('state:changed', paintPill);

const statusPill = $('#status-pill');
if (statusPill) statusPill.addEventListener('click', () => { location.hash = '#/status'; });

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
});

export { setTheme, currentTheme };
