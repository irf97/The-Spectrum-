// Bootstrap: register routes, mount the status pill, and start the simulation tick.

import { defineRoute, start, renderNav } from './router.js';
import { store } from './state.js';
import { bus, $ } from './util.js';
import { STATUS_DATING, STATUS_NETWORKING } from './data.js';

import * as Floor    from './floor.js';
import * as Layer1   from './layer1.js';
import * as Layer2   from './layer2.js';
import * as Layer3   from './layer3.js';
import * as Layer4   from './layer4.js';
import * as Layer5   from './layer5.js';
import * as Profile  from './profile.js';
import * as People   from './people.js';

defineRoute({ path: '/floor',      name:'floor',   label:'Live Floor',  icon:'⊙', render: Floor.render });
defineRoute({ path: '/status',     name:'status',  label:'Status',      icon:'1', render: Layer1.render });
defineRoute({ path: '/match',      name:'match',   label:'Match %',     icon:'2', render: Layer2.render });
defineRoute({ path: '/proximity',  name:'prox',    label:'Proximity',   icon:'3', render: Layer3.render });
defineRoute({ path: '/identity',   name:'id',      label:'Identity',    icon:'4', render: Layer4.render });
defineRoute({ path: '/rapport',    name:'rep',     label:'Rapport',     icon:'5', render: Layer5.render });
defineRoute({ path: '/profile',    name:'profile', label:'Profile',     icon:'☉', render: Profile.render });
defineRoute({ path: '/people/:id', name:'person',  label:null,                       render: People.render });

renderNav();
start();
store.startTicking();

// Status pill — quick toggle for current intent's status.
function paintPill() {
  const me = store.profile;
  const list = me.intent === 'networking' ? STATUS_NETWORKING : STATUS_DATING;
  const cur  = list.find(s => s.key === (me.intent==='networking'?me.status.networking:me.status.dating)) || list[0];
  const pill = $('#status-pill');
  if (!pill) return;
  pill.innerHTML = `<span>${cur.icon}</span><span>${cur.label}</span><span class="text-slate-500">· ${me.intent}</span>`;
}
paintPill();
bus.on('state:changed', paintPill);

// Slash navigation: pressing a digit jumps to that layer.
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
  if (e.key === '0') location.hash = '#/floor';
  if (e.key === '1') location.hash = '#/status';
  if (e.key === '2') location.hash = '#/match';
  if (e.key === '3') location.hash = '#/proximity';
  if (e.key === '4') location.hash = '#/identity';
  if (e.key === '5') location.hash = '#/rapport';
  if (e.key === 'p') location.hash = '#/profile';
});
