// Layer 1 — Real-Life Social Status (Dating + Networking spectra)

import { STATUS_DATING, STATUS_NETWORKING } from './data.js';
import { store } from './state.js';
import { $, $$, html, raw, escapeHtml } from './util.js';

function statusCard(status, currentKey, mode) {
  const sel = status.key === currentKey;
  return `
    <button class="card-soft text-left p-3 flex flex-col gap-1.5 hover:border-iris-500/60 transition"
            data-mode="${mode}" data-status="${status.key}"
            style="${sel?'box-shadow:0 0 0 2px var(--iris)':''}">
      <span class="text-xl leading-none">${status.icon}</span>
      <span class="font-display font-semibold">${escapeHtml(status.label)}</span>
      <span class="text-xs text-themed-soft">${escapeHtml(status.desc)}</span>
    </button>`;
}

export function render(root) {
  const me = store.profile;
  const dOn = !!me.modes?.dating;
  const nOn = !!me.modes?.networking;
  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">Layer 1</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Real-Life Social Status</h1>
          <p class="text-sm text-themed-soft mt-1 max-w-2xl">Two independent profiles. Each can be on or off. The status you set per-mode drives how that mode filters for and presents you.</p>
        </div>
        <div class="flex gap-2 items-center">
          <button class="pill ${dOn?'pill-rose':'pill-slate'}" data-toggle="dating">${dOn?'Dating · on':'Dating · off'}</button>
          <button class="pill ${nOn?'pill-mint':'pill-slate'}" data-toggle="networking">${nOn?'Networking · on':'Networking · off'}</button>
        </div>
      </header>

      <div class="grid lg:grid-cols-2 gap-6">
        <div class="card p-4 sm:p-5 ${dOn?'':'opacity-50'}">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="font-display font-semibold text-lg">Dating</h2>
              <p class="text-xs text-themed-mute">${escapeHtml(STATUS_DATING.find(s=>s.key===me.status.dating)?.desc || '')}</p>
            </div>
            <span class="pill ${dOn?'pill-rose':'pill-slate'}"><span class="dot"></span> ${escapeHtml(me.status.dating)}</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${STATUS_DATING.map(s => statusCard(s, me.status.dating, 'dating')).join('')}
          </div>
        </div>

        <div class="card p-4 sm:p-5 ${nOn?'':'opacity-50'}">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="font-display font-semibold text-lg">Networking</h2>
              <p class="text-xs text-themed-mute">${escapeHtml(STATUS_NETWORKING.find(s=>s.key===me.status.networking)?.desc || '')}</p>
            </div>
            <span class="pill ${nOn?'pill-mint':'pill-slate'}"><span class="dot"></span> ${escapeHtml(me.status.networking)}</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${STATUS_NETWORKING.map(s => statusCard(s, me.status.networking, 'networking')).join('')}
          </div>
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

  $$('button[data-toggle]', root).forEach(b => b.addEventListener('click', () => {
    const mode = b.dataset.toggle;
    const cur = !!store.profile.modes?.[mode];
    store.setProfile({ modes: { ...store.profile.modes, [mode]: !cur } });
    render(root);
  }));

  $$('button[data-status]', root).forEach(b => b.addEventListener('click', () => {
    const mode = b.dataset.mode, key = b.dataset.status;
    const next = { ...store.profile.status, [mode]: key };
    store.setProfile({ status: next });
    render(root);
  }));
}
