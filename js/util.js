// Small DOM and math helpers used across the app.

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const lerp  = (a, b, t) => a + (b - a) * t;
export const round = (n, p = 0) => { const f = 10 ** p; return Math.round(n * f) / f; };
export const pct   = (n) => `${Math.round(n * 100)}%`;

export const uid = () => Math.random().toString(36).slice(2, 9);

export const hash = (s) => {
  let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
};

export const initials = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('');

export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Deterministic per-string color (HSL).
export const colorFor = (s) => {
  const h = hash(String(s)) % 360;
  return `hsl(${h} 60% 55%)`;
};

// Format minutes nicely.
export const fmtMin = (m) => {
  if (m < 1) return `${Math.round(m * 60)}s`;
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60); const r = Math.round(m % 60);
  return r ? `${h}h ${r}m` : `${h}h`;
};

export const fmtRel = (ts) => {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
};

export const onClickAll = (root, sel, handler) => {
  $$(sel, root).forEach(el => el.addEventListener('click', (e) => handler(e, el)));
};

export const html = (strings, ...values) => {
  // tagged template that returns a string; values are escaped unless wrapped in raw().
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) {
      const v = values[i];
      if (v && v.__raw) out += v.value;
      else if (Array.isArray(v)) out += v.join('');
      else out += escapeHtml(v);
    }
  });
  return out;
};
export const raw = (value) => ({ __raw: true, value });

// Tiny event bus.
export const bus = (() => {
  const map = new Map();
  return {
    on(ev, fn) { (map.get(ev) ?? map.set(ev, new Set()).get(ev)).add(fn); return () => map.get(ev)?.delete(fn); },
    emit(ev, ...args) { map.get(ev)?.forEach(fn => fn(...args)); }
  };
})();
