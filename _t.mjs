function makeEl(){return{set innerHTML(v){this._h=v},get innerHTML(){return this._h||''},setAttribute(){},appendChild(){},addEventListener(){},querySelector(){return makeEl()},querySelectorAll(){return[]},classList:{add(){},remove(){}},style:{},dataset:{},getBoundingClientRect(){return{bottom:0,right:0}},remove(){}};}
const root = makeEl();
global.document = { documentElement: makeEl(), body: makeEl(), querySelector: ()=>makeEl(), querySelectorAll:()=>[], createElement: ()=>makeEl(), addEventListener:()=>{}, removeEventListener:()=>{} };
global.window = { addEventListener:()=>{}, removeEventListener:()=>{}, location:{hash:'#/profile'}, scrollTo:()=>{}, innerWidth: 1200 };
global.location = global.window.location;
global.localStorage = { _s:{}, getItem(k){return this._s[k]||null}, setItem(k,v){this._s[k]=v}, removeItem(k){delete this._s[k]} };
global.HTMLInputElement = function(){};global.HTMLTextAreaElement = function(){};global.HTMLSelectElement = function(){};
for (const [n,p] of [['profile','./js/profile.js'],['floor','./js/floor.js'],['layer1','./js/layer1.js'],['layer4','./js/layer4.js'],['privacy','./js/privacy.js'],['theme','./js/theme.js']]) {
  try { const m = await import(p); m.render(root); console.log(n,'OK', (root._h||'').length); } catch(e){ console.log(n,'CRASH',e.message); }
}
