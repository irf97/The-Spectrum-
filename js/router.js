// Hash-based router with named routes.

import { $, $$ } from './util.js';

const routes = [];
let activeName = null;

export function defineRoute({ path, name, label, icon, render }) {
  routes.push({ path, name, label, icon, render });
}

function match(hash) {
  const clean = (hash || '#/floor').replace(/^#/, '') || '/floor';
  for (const r of routes) {
    const params = matchPath(r.path, clean);
    if (params) return { route: r, params };
  }
  return { route: routes[0], params: {} };
}

function matchPath(pattern, path) {
  const ps = pattern.split('/').filter(Boolean);
  const xs = path.split('/').filter(Boolean);
  if (ps.length !== xs.length) return null;
  const out = {};
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].startsWith(':')) out[ps[i].slice(1)] = decodeURIComponent(xs[i]);
    else if (ps[i] !== xs[i]) return null;
  }
  return out;
}

export function renderNav() {
  const nav = $('#nav');
  if (!nav) return;
  const visible = routes.filter(r => r.label);
  nav.innerHTML = visible.map(r =>
    `<a class="tab" href="#${r.path}" data-name="${r.name}" aria-current="${r.name === activeName ? 'page' : 'false'}">
       <span class="hidden sm:inline">${r.icon ? r.icon + ' ' : ''}</span>${r.label}
     </a>`
  ).join('');
}

export function start() {
  const onChange = () => {
    const view = $('#view');
    const { route, params } = match(location.hash);
    activeName = route?.name;
    renderNav();
    view.classList.remove('fade-in');
    void view.offsetWidth;
    view.classList.add('fade-in');
    view.innerHTML = '';
    route?.render(view, params);
    window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', onChange);
  if (!location.hash) location.hash = '#/floor';
  onChange();
}

export function go(path) {
  if (location.hash === '#' + path) return;
  location.hash = '#' + path;
}
