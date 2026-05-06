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
import * as More     from './more.js';

defineRoute({ path: '/status',     name:'status',  label:'Status',  icon:'●', render: Layer1.render });
defineRoute({ path: '/profile',    name:'profile', label:'Profile', icon:'☉', render: Profile.render });
defineRoute({ path: '/more',       name:'more',    label:'More',    icon:'⋯', render: More.render });

defineRoute({ path: '/floor',      name:'floor',   label:null, render: Floor.render });
defineRoute({ path: '/match',      name:'match',   label:null, render: Layer2.render });
defineRoute({ path: '/proximity',  name:'prox',    label:null, render: Layer3.render });
defineRoute({ path: '/identity',   name:'id',      label:null, render: Layer4.render });
defineRoute({ path: '/rapport',    name:'rep',     label:null, render: Layer5.render });
defineRoute({ path: '/people/:id', name:'person',  label:null, render: People.render });

renderNav();
start();
store.startTicking();

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

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
  if (e.key === '1') location.hash = '#/status';
  if (e.key === '2') location.hash = '#/profile';
  if (e.key === 'm') location.hash = '#/more';
  if (e.key === '0') location.hash = '#/floor';
  if (e.key === '3') location.hash = '#/match';
  if (e.key === '4') location.hash = '#/proximity';
  if (e.key === '5') location.hash = '#/identity';
  if (e.key === '6') location.hash = '#/rapport';
});
