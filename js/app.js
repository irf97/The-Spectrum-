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
import * as Privacy  from './privacy.js';
import * as People   from './people.js';

// All primary surfaces are visible in the nav with icons.
defineRoute({ path: '/floor',     name:'floor',    label:'Floor',     icon:'⊙', render: Floor.render });
defineRoute({ path: '/status',    name:'status',   label:'Status',    icon:'●', render: Layer1.render });
defineRoute({ path: '/match',     name:'match',    label:'Match',     icon:'②', render: Layer2.render });
defineRoute({ path: '/proximity', name:'prox',     label:'Proximity', icon:'③', render: Layer3.render });
defineRoute({ path: '/identity',  name:'identity', label:'Identity',  icon:'④', render: Layer4.render });
defineRoute({ path: '/rapport',   name:'rapport',  label:'Rapport',   icon:'⑤', render: Layer5.render });
defineRoute({ path: '/profile',   name:'profile',  label:'Profile',   icon:'◉', render: Profile.render });
defineRoute({ path: '/privacy',   name:'privacy',  label:'Privacy',   icon:'🔒', render: Privacy.render });

// Person detail — hidden from nav (no label).
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
  if (e.key === '0') location.hash = '#/floor';
  if (e.key === '1') location.hash = '#/status';
  if (e.key === '2') location.hash = '#/match';
  if (e.key === '3') location.hash = '#/proximity';
  if (e.key === '4') location.hash = '#/identity';
  if (e.key === '5') location.hash = '#/rapport';
  if (e.key === 'i') location.hash = '#/profile';
  if (e.key === 'p') location.hash = '#/privacy';
});
