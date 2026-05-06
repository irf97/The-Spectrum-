// More — secondary/advanced surfaces.
// Keeps the main app focused on Status + Profile while preserving the platform demo.

const LINKS = [
  { href:'#/floor',     title:'Live Floor',   icon:'⊙', copy:'Integrated room simulation across every layer.' },
  { href:'#/match',     title:'Match %',      icon:'2', copy:'Physical preference scoring and live ranking.' },
  { href:'#/proximity', title:'Proximity',    icon:'3', copy:'Third-space proximity buckets and privacy controls.' },
  { href:'#/identity',  title:'Identity',     icon:'4', copy:'Reveal gates, avatar/photo modes, anonymity simulation.' },
  { href:'#/rapport',   title:'Familiarity',  icon:'5', copy:'Private familiarity bars, hobbies, and learning matches.' },
];

export function render(root) {
  root.innerHTML = `
    <section class="grid gap-6">
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="h-eyebrow">More</p>
          <h1 class="font-display text-2xl sm:text-3xl font-semibold tracking-tight">Advanced layers</h1>
          <p class="text-sm text-slate-400 mt-1 max-w-2xl">The main product starts with Status and Profile. These pages stay available as the platform/engine demo.</p>
        </div>
      </header>

      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        ${LINKS.map(l => `
          <a href="${l.href}" class="card-soft p-4 grid gap-2 hover:border-iris-500/60 transition">
            <div class="text-2xl">${l.icon}</div>
            <div class="font-display font-semibold text-lg">${l.title}</div>
            <div class="text-sm text-slate-400">${l.copy}</div>
          </a>
        `).join('')}
      </div>

      <div class="card p-4 grid gap-2">
        <h2 class="font-display font-semibold text-lg">Product surface rule</h2>
        <p class="text-sm text-slate-400">Status and Profile are the first-user experience. Everything else is secondary until the simple identity/status loop feels effortless.</p>
      </div>
    </section>
  `;
}
