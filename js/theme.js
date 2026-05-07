// Theme picker — its own page. Reads / writes via app.js's setTheme.

import { THEMES } from './data.js';
import { setTheme, currentTheme } from './app.js';
import { $$, escapeHtml } from './util.js';

function tile(t, active) {
  return `
    <button class="theme-swatch text-left" aria-current="${active?'true':'false'}" data-theme="${t.key}">
      <div class="swatch-row mb-2">${t.swatches.map(s => `<span style="background:${escapeHtml(s)}"></span>`).join('')}</div>
      <div class="font-display font-semibold">${escapeHtml(t.label)}</div>
      <div class="text-[11px] text-themed-mute mt-0.5">${escapeHtml(t.copy)}</div>
    </button>`;
}

export function render(root) {
  const cur = currentTheme();
  root.innerHTML = `
    <section class="grid gap-6">
      <header>
        <p class="h-eyebrow">Settings</p>
        <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Theme</h1>
        <p class="text-sm text-themed-soft mt-1 max-w-2xl">
          Four palettes aligned with GitHub Pages' supported Jekyll themes —
          <code>jekyll-theme-midnight / slate / hacker / cayman</code>.
          Cycle with <span class="kbd">T</span>.
        </p>
      </header>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        ${THEMES.map(t => tile(t, t.key === cur)).join('')}
      </div>
    </section>
  `;
  $$('button[data-theme]', root).forEach(b => b.addEventListener('click', () => {
    setTheme(b.dataset.theme);
    render(root);
  }));
}
