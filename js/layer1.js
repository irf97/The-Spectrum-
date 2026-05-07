// Layer 1 — Real-Life Social Status. Shows the spectrum for the currently
// active mode (dating / networking) and edits the active persona's status.

import { STATUS_DATING, STATUS_NETWORKING } from './data.js';
import { store } from './state.js';
import { $$, escapeHtml } from './util.js';

function statusCard(status, currentKey) {
  const sel = status.key === currentKey;
  return `
    <button class="card-soft text-left p-3 flex flex-col gap-1.5 hover:border-iris-500/60 transition"
            data-status="${status.key}"
            style="${sel?'box-shadow:0 0 0 2px var(--iris)':''}">
      <span class="text-xl leading-none">${status.icon}</span>
      <span class="font-display font-semibold">${escapeHtml(status.label)}</span>
      <span class="text-xs text-themed-soft">${escapeHtml(status.desc)}</span>
    </button>`;
}

export function render(root) {
  const me = store.profile;
  const mode = store.mode;
  const persona = store.activePersona();
  const list = mode === 'dating' ? STATUS_DATING : STATUS_NETWORKING;
  const currentKey = persona?.status || list[0].key;
  const desc = list.find(s => s.key === currentKey)?.desc || '';
  const titlePill = mode === 'dating' ? 'pill-rose' : 'pill-mint';

  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">Layer 1 · ${mode === 'dating' ? 'Dating' : 'Networking'}</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Real-Life Social Status</h1>
          <p class="text-sm text-themed-soft mt-1 max-w-2xl">
            Status applies to your <b>${escapeHtml(persona?.name || 'active')}</b> alter ego in ${mode} mode.
            Switch alter ego with <span class="kbd">[</span>/<span class="kbd">]</span> · switch mode with <span class="kbd">M</span>.
          </p>
        </div>
        <span class="pill ${titlePill}"><span class="dot"></span> ${escapeHtml(currentKey)}</span>
      </header>

      <div class="card p-4 sm:p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="font-display font-semibold text-lg">${mode === 'dating' ? 'Dating' : 'Networking'} spectrum</h2>
            <p class="text-xs text-themed-mute">${escapeHtml(desc)}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          ${list.map(s => statusCard(s, currentKey)).join('')}
        </div>
      </div>

      <div class="card p-4 sm:p-5">
        <h3 class="font-display font-semibold text-lg mb-3">How status changes everything</h3>
        <ul class="grid sm:grid-cols-2 gap-2 text-sm text-themed-soft">
          <li class="card-soft p-3"><b>Open</b> · You appear to all eligible matches in compatible zones.</li>
          <li class="card-soft p-3"><b>Selective / Focused</b> · Only Strong+ matches surface; reveal gate raised.</li>
          <li class="card-soft p-3"><b>Engaged</b> · Pings are softened; people see "in conversation" hints.</li>
          <li class="card-soft p-3"><b>Resetting / Offline</b> · Appearance pauses without revealing why.</li>
          <li class="card-soft p-3"><b>Closed</b> · Hard-stop on dating overtures; networking can still apply.</li>
          <li class="card-soft p-3"><b>Invisible / Hidden</b> · You're present, undiscoverable.</li>
        </ul>
      </div>
    </section>
  `;

  $$('button[data-status]', root).forEach(b => b.addEventListener('click', () => {
    if (!persona) return;
    store.updatePersona(mode, persona.id, { status: b.dataset.status });
    render(root);
  }));
}
