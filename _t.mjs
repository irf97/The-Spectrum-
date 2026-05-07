function makeEl(tag) {
  return {
    tag, _innerHTML: '',
    set innerHTML(v){this._innerHTML = v}, get innerHTML(){return this._innerHTML},
    setAttribute(){}, appendChild(){}, addEventListener(){},
    querySelector(){ return makeEl('stub') }, querySelectorAll(){ return [] },
    classList:{add(){},remove(){}}, style:{}, dataset:{},
  };
}
const root = makeEl('main');
global.document = {
  documentElement: makeEl('html'),
  body: makeEl('body'),
  querySelector: (s) => {
    if (s === '#view') return root;
    if (s === '#nav')  return makeEl('nav');
    if (s === '#status-pill' || s === '#mode-pill' || s === '#persona-pill') return makeEl('button');
    if (s === '#mode-cluster' || s === 'header > div') return makeEl('div');
    return makeEl('stub');
  },
  querySelectorAll: () => [],
  createElement: makeEl, addEventListener: ()=>{},
};
global.window = { addEventListener: ()=>{}, location:{hash:'#/floor'}, scrollTo: ()=>{} };
global.location = global.window.location;
global.localStorage = { _s:{}, getItem(k){return this._s[k]||null}, setItem(k,v){this._s[k]=v}, removeItem(k){delete this._s[k]} };
global.HTMLInputElement = function(){};
global.HTMLTextAreaElement = function(){};
global.HTMLSelectElement = function(){};

const probes = [
  ['floor.js',     './js/floor.js'],
  ['layer1.js',    './js/layer1.js'],
  ['layer2.js',    './js/layer2.js'],
  ['alignment.js', './js/alignment.js'],
  ['layer3.js',    './js/layer3.js'],
  ['layer4.js',    './js/layer4.js'],
  ['layer5.js',    './js/layer5.js'],
  ['profile.js',   './js/profile.js'],
  ['privacy.js',   './js/privacy.js'],
];

for (const [name, path] of probes) {
  try {
    const mod = await import(path);
    if (typeof mod.render === 'function') {
      try { mod.render(root); }
      catch (e) { console.log(`${name}: RENDER THREW — ${e.message}`); continue; }
      console.log(`${name}: OK (innerHTML ${(root._innerHTML||'').length} chars)`);
    }
  } catch (e) {
    console.log(`${name}: IMPORT THREW — ${e.message}`);
  }
}
