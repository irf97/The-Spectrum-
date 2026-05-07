// Static reference data: status spectra, hobby catalog, sample people, privacy matrix, gender-aware fields, themes.

// ---------- Layer 1: Real-Life Social Status ---------------------------------

export const STATUS_DATING = [
  { key: 'open',      label: 'Open',      icon: '🟢', desc: 'Approachable & receptive to spontaneous connection.' },
  { key: 'warm',      label: 'Warm',      icon: '🔥', desc: 'Friendly energy; open if the vibe feels mutual.' },
  { key: 'flirty',    label: 'Flirty',    icon: '💫', desc: 'Playful, teasing, lightly romantic.' },
  { key: 'selective', label: 'Selective', icon: '🎯', desc: 'Interested, but filtering with intention.' },
  { key: 'engaged',   label: 'Engaged',   icon: '💬', desc: 'Currently in a conversation; reconnect later.' },
  { key: 'resetting', label: 'Resetting', icon: '🌿', desc: 'Taking space to recharge or re-center.' },
  { key: 'closed',    label: 'Closed',    icon: '🚫', desc: 'Not available for romantic interaction.' },
  { key: 'invisible', label: 'Invisible', icon: '👻', desc: 'Present, but not signalling availability.' },
];

export const STATUS_NETWORKING = [
  { key: 'open',        label: 'Open',        icon: '🟢', desc: 'Available for introductions & new conversations.' },
  { key: 'curious',     label: 'Curious',     icon: '🔍', desc: 'Actively learning about people & ideas.' },
  { key: 'focused',     label: 'Focused',     icon: '🎯', desc: 'Present, but prioritising a specific goal/person.' },
  { key: 'selective',   label: 'Selective',   icon: '🧭', desc: 'Open, but filtering for relevance & fit.' },
  { key: 'engaged',     label: 'Engaged',     icon: '💬', desc: 'In a valuable exchange; continue later.' },
  { key: 'circulating', label: 'Circulating', icon: '🚶', desc: 'Moving through the room & meeting briefly.' },
  { key: 'resetting',   label: 'Resetting',   icon: '☕', desc: 'Taking a short break to recover energy.' },
  { key: 'offline',     label: 'Offline',     icon: '⏸',  desc: 'Not networking right now.' },
];

// ---------- Networking dimensions (Layer 2 / alignment) ---------------------
// Ambitions, posture, expertise — explicitly NOT physical, NOT engineering-narrow.
// "Way of thinking" is the operating mind-set; "execution style" is how you ship.

export const NETWORKING_FIELDS = [
  { key:'ambition',   label:'Ambition horizon', weight: 0.7,
    options: ['6 months','2 years','10 years','Lifetime'] },
  { key:'stage',      label:'Stage focus',      weight: 0.7,
    options: ['Exploring','Building','Scaling','Harvesting','Advising'] },
  { key:'role',       label:'Role posture',     weight: 0.6,
    options: ['Founder','Operator','Specialist','Generalist','Connector','Capital'] },
  { key:'thinking',   label:'Way of thinking',  weight: 0.5,
    options: ['First-principles','Pattern-match','Systems','Narrative','Quantitative','Intuitive'] },
  { key:'expertise',  label:'Expertise depth',  weight: 0.6,
    options: ['Curious','Practitioner','Expert','Authority'] },
  { key:'execution',  label:'Execution style',  weight: 0.5,
    options: ['Deliberate','Iterative','Ship-then-fix','Research-heavy'] },
  { key:'domain',     label:'Domain',           weight: 0.4,
    options: ['Health','Finance','Media','Climate','Infra','Creative','Social','Education','Frontier','Public sector'] },
  { key:'lookingFor', label:'Looking for',      weight: 0.4,
    options: ['Intros','Capital','Hires','Peers','Mentors','Students','Deals'] },
];

// ---------- Personas ---------------------------------------------------------
// Each mode (dating, networking) carries an array of personas — alter egos for
// different settings, moods, days. One is active at a time per mode.

export const PERSONA_AVATAR_EMOJI = [
  '🌙','☀️','🌴','🔥','✨','💼','🎒','🎭','🪩','🪐','🦊','🐝','🌊','🍃','🥂','🎯','🛠','📚','🎨','🎧'
];

// Presets seed a new persona. `dating` and `networking` blocks override the
// status / visMode / privacy axes; self & prefs stay user-defined.
export const PERSONA_PRESETS = [
  { key:'custom',  label:'Custom',  icon:'🎛',  copy:'Start from your default and tune it yourself.',
    dating:{}, networking:{} },
  { key:'work',    label:'Work',    icon:'💼',
    copy:'Heads-down. Strict privacy, no social signals.',
    dating:    { status:'closed',     visMode:'hidden', overrides:{ showOnFloor:'nobody', showName:'nobody', showPhoto:'nobody', receiveMessages:'nobody', receiveRevealRequests:'nobody' } },
    networking:{ status:'focused',    visMode:'photo',  overrides:{ showOnFloor:'same_room', showName:'reveal_mutual', receiveMessages:'reveal_mutual' } } },
  { key:'weekend', label:'Weekend', icon:'🪩',
    copy:'Off-duty. Open, relaxed, social.',
    dating:    { status:'flirty',     visMode:'hybrid', overrides:{ showOnFloor:'anyone', showName:'reveal_mutual', showPhoto:'match_gated', receiveMessages:'match_gated' } },
    networking:{ status:'curious',    visMode:'avatar', overrides:{ showOnFloor:'same_room', showName:'reveal_mutual' } } },
  { key:'travel',  label:'Travel',  icon:'🎒',
    copy:'Just landed. Lookaround vibes; brief encounters.',
    dating:    { status:'open',       visMode:'glance', overrides:{ showOnFloor:'same_room', showPhoto:'match_gated' } },
    networking:{ status:'circulating',visMode:'glance', overrides:{ showOnFloor:'same_room', showName:'match_gated' } } },
  { key:'event',   label:'Event',   icon:'🎯',
    copy:'A specific room. Discoverable, focused.',
    dating:    { status:'selective',  visMode:'photo',  overrides:{ showOnFloor:'same_room', showPhoto:'reveal_mutual' } },
    networking:{ status:'open',       visMode:'photo',  overrides:{ showOnFloor:'anyone', showName:'same_room', receiveRevealRequests:'anyone' } } },
];

// Default avatar palette (for color avatars).
export const PERSONA_AVATAR_PALETTE = ['#69ff94','#7b6cff','#ffcc00','#ff7070','#3fbe7c','#155799','#ff8a3c','#b48ead'];

// ---------- Themes -----------------------------------------------------------
// Aligned with GitHub Pages' supported Jekyll themes. The `theme:` directive
// in _config.yml styles README rendering; these match the app to those
// themes' palettes so the look stays consistent across the static and
// interactive parts of the site.

export const THEMES = [
  { key:'midnight', label:'Midnight', swatches:['#69ff94','#c9d025','#ffcc00','#ff7070'], copy:'Dark, green accent · jekyll-theme-midnight.' },
  { key:'slate',    label:'Slate',    swatches:['#d6ae01','#4d6cb3','#f5b210','#db4f4a'], copy:'Slate gray + lime · jekyll-theme-slate.' },
  { key:'hacker',   label:'Hacker',   swatches:['#00ff7f','#ffe97a','#25aa25','#ff5050'], copy:'Matrix green on black · jekyll-theme-hacker.' },
  { key:'cayman',   label:'Cayman',   swatches:['#159957','#155799','#e6a700','#c9302c'], copy:'Light · blue→green · jekyll-theme-cayman.' },
];

// ---------- Gender + gender-aware physical schema ---------------------------

export const GENDERS = [
  { key:'woman',     label:'Woman',      icon:'♀' },
  { key:'man',       label:'Man',        icon:'♂' },
  { key:'bisexual', label:'Bisexual', icon:'⚧' },
  { key:'any',       label:'Any',        icon:'⊕' },
];

const FIELD_SCHEMA = [
  { key:'gender',    label:'Gender',     weight: 1.0, options: ['Woman','Man','Bisexual'] },
  { key:'age',       label:'Age band',   weight: 0.8, options: ['18–24','25–29','30–34','35–39','40–49','50+'] },
  { key:'height',    label:'Height',     weight: 0.6, options: ['<160cm','160–170','170–180','180–190','190+'] },
  { key:'body',      label:'Body',       weight: 0.7, optionsByGender: {
    woman:     ['Slim','Petite','Athletic','Average','Curvy','Voluptuous','Plus'],
    man:       ['Slim','Lean','Athletic','Average','Stocky','Muscular','Plus'],
    bisexual: ['Slim','Athletic','Average','Curvy','Muscular','Plus'],
    any:       ['Slim','Petite','Lean','Athletic','Average','Stocky','Curvy','Muscular','Voluptuous','Plus'],
  }},
  { key:'face',      label:'Face',       weight: 0.5, options: ['Soft','Sharp','Symmetric','Expressive','Striking'] },
  { key:'hair',      label:'Hair',       weight: 0.4, optionsByGender: {
    woman:     ['Pixie','Short','Bob','Medium','Long','Very long','Curly','Wavy','Straight','Color-treated','Shaved','Locs','Braids'],
    man:       ['Buzz','Short','Medium','Long','Curly','Wavy','Straight','Shaved','Color-treated','Locs'],
    bisexual: ['Short','Medium','Long','Curly','Straight','Shaved','Color-treated'],
    any:       ['Pixie','Buzz','Short','Bob','Medium','Long','Very long','Curly','Wavy','Straight','Color-treated','Shaved','Locs','Braids'],
  }},
  { key:'style',     label:'Style',      weight: 0.6, options: ['Casual','Smart-casual','Streetwear','Formal','Bohemian','Sporty','Alt','Vintage','Minimal','Goth','Preppy'] },
  { key:'grooming',  label:'Grooming',   weight: 0.4, optionsByGender: {
    woman:     ['Clean','Natural','Polished','Glamorous','Minimal','Bold makeup','Tattooed','Pierced'],
    man:       ['Clean','Stubble','Trimmed beard','Full beard','Long beard','Hairless','Polished','Tattooed','Pierced'],
    bisexual: ['Clean','Trimmed','Polished','Natural','Hairless','Tattooed','Pierced'],
    any:       ['Clean','Trimmed','Stubble','Trimmed beard','Full beard','Polished','Natural','Glamorous','Hairless','Tattooed','Pierced'],
  }},
  { key:'energy',    label:'Energy',     weight: 0.5, options: ['Calm','Quiet','Easy','Lively','High','Wired'] },
  { key:'vibe',      label:'Vibe',       weight: 0.5, options: ['Warm','Reserved','Curious','Playful','Sharp','Soft','Steady','Witty','Earnest'] },
  { key:'lifestyle', label:'Lifestyle',  weight: 0.4, options: ['Local','Settled','Building','Exploring','Resetting','Just landed'] },
  { key:'languages', label:'Languages',  weight: 0.4, options: ['English','Dutch','Turkish','German','Arabic','Mandarin','Spanish','French','Italian','Japanese','Portuguese','Other'] },
  { key:'culture',   label:'Cultural',   weight: 0.4, options: ['Dutch','Turkish','Moroccan','German','Indonesian','Surinamese','Caribbean','Indian','Chinese','East-Asian','Middle-Eastern','African','Latin','South-Asian','European','Mixed','Other'] },
  { key:'smoking',   label:'Smoking',    weight: 0.3, options: ['No','Socially','Yes','Quitting'] },
  { key:'drinking',  label:'Drinking',   weight: 0.3, options: ['No','Rarely','Socially','Often'] },
  { key:'education', label:'Education',  weight: 0.3, options: ['HS','Trade','Bachelor','Master','PhD','Self-taught'] },
];

export function fieldsFor(genderKey) {
  const g = (genderKey === 'any' || !genderKey) ? 'any' : genderKey;
  return FIELD_SCHEMA.map(f => {
    if (f.optionsByGender) {
      const opts = f.optionsByGender[g] || f.optionsByGender.any;
      return { key: f.key, label: f.label, weight: f.weight, options: opts };
    }
    return { key: f.key, label: f.label, weight: f.weight, options: f.options };
  });
}

export const PHYSICAL_FIELDS = fieldsFor('any');

export const MATCH_BUCKETS = [
  { key: 'ideal',    label: 'Ideal',    min: 0.90, swatch:'#ffd073', tone:'rep-exalted',  copy: 'Matches your full preference vector.' },
  { key: 'strong',   label: 'Strong',   min: 0.75, swatch:'#78f3d3', tone:'rep-honored',  copy: 'Strong fit on the metrics that matter most.' },
  { key: 'moderate', label: 'Moderate', min: 0.50, swatch:'#9b8cff', tone:'rep-revered',  copy: 'Mixed signals, but the high-weight items match.' },
  { key: 'partial',  label: 'Partial',  min: 0.25, swatch:'#76d4a3', tone:'rep-friendly', copy: 'Some preferences met, others off.' },
  { key: 'low',      label: 'Low',      min: 0.00, swatch:'#94a3b8', tone:'rep-neutral',  copy: 'Most preferences not met.' },
  { key: 'unknown',  label: 'Unknown',  min: -1,   swatch:'#475569', tone:'rep-neutral',  copy: 'Not enough visible data to score.' },
];

export const PROX_ZONES = [
  { key:'reach',    label:'Reach',    color:'#78f3d3', range:[0,2],     copy:'Eye-contact range; same table.' },
  { key:'nearby',   label:'Nearby',   color:'#9b8cff', range:[2,5],     copy:'Same booth or circle.' },
  { key:'room',     label:'Room',     color:'#7b6cff', range:[5,10],    copy:'Same area of the venue.' },
  { key:'passing',  label:'Passing',  color:'#ffd073', range:[],        copy:'Brief / unstable presence in the room.' },
  { key:'hidden',   label:'Hidden',   color:'#94a3b8', range:[],        copy:'Present but invisible to others.' },
  { key:'muted',    label:'Muted',    color:'#475569', range:[],        copy:'Mutually muted by user choice.' },
  { key:'outrange', label:'OutRange', color:'#334155', range:[],        copy:'Outside the 10m bubble.' },
  { key:'unknown',  label:'Unknown',  color:'#1e293b', range:[],        copy:'Not enough signal to classify.' },
];

export const VIS_MODES = [
  { key:'avatar', label:'Avatar', icon:'🟣', copy:'Symbolic identity only.' },
  { key:'photo',  label:'Photo',  icon:'🖼',  copy:'Direct visual profile.' },
  { key:'hybrid', label:'Hybrid', icon:'🌓', copy:'Avatar first, photo on mutual reveal.' },
  { key:'glance', label:'Glance', icon:'👀', copy:'A blurred hint that resolves with intent.' },
  { key:'reveal', label:'Reveal', icon:'✨', copy:'Full identity, mutual interest required.' },
  { key:'hidden', label:'Hidden', icon:'🚫', copy:'Profile is undiscoverable.' },
];

export const REVEAL_CHANNELS = [
  { key:'photo',  label:'Photo',   icon:'🖼', copy:'Static face.' },
  { key:'voice',  label:'Voice',   icon:'🎤', copy:'A short voice clip.' },
  { key:'video',  label:'Video',   icon:'🎥', copy:'A short video moment.' },
  { key:'handle', label:'Handle',  icon:'@',       copy:'Real name / social handle.' },
  { key:'place',  label:'Place',   icon:'📍', copy:'Where you usually are.' },
];

export const REVEAL_TTL_OPTIONS = [
  { key:'5m',      label:'5 min',         ms: 5 * 60 * 1000 },
  { key:'30m',     label:'30 min',        ms: 30 * 60 * 1000 },
  { key:'2h',      label:'2 hours',       ms: 2 * 60 * 60 * 1000 },
  { key:'venue',   label:'Until I leave', ms: 6 * 60 * 60 * 1000 },
  { key:'forever', label:'Permanent',     ms: 365 * 24 * 60 * 60 * 1000 },
];

export const REP_TIERS = [
  { key:'hated',      label:'Hated',      min: -10000, color:'#ff5d80', toneClass:'rep-hated',      copy:'Active aversion; avoid contact.' },
  { key:'hostile',    label:'Hostile',    min:  -3000, color:'#ff8a3c', toneClass:'rep-hostile',    copy:'Friction history; not approachable.' },
  { key:'unfriendly', label:'Unfriendly', min:   -800, color:'#d97a8a', toneClass:'rep-unfriendly', copy:'Light negative signal.' },
  { key:'neutral',    label:'Neutral',    min:      0, color:'#94a3b8', toneClass:'rep-neutral',    copy:'Mutual recognition, no charge.' },
  { key:'friendly',   label:'Friendly',   min:    300, color:'#76d4a3', toneClass:'rep-friendly',   copy:'Comfortable, warm exchanges.' },
  { key:'honored',    label:'Honored',    min:    900, color:'#78f3d3', toneClass:'rep-honored',    copy:'Trusted; called on for things that matter.' },
  { key:'revered',    label:'Revered',    min:   2000, color:'#9b8cff', toneClass:'rep-revered',    copy:'Inner-orbit; strong reciprocity.' },
  { key:'exalted',    label:'Exalted',    min:   3500, color:'#ffd073', toneClass:'rep-exalted',    copy:'Lifelong bond; default ally.' },
];

export const HOBBY_CATALOG = [
  { key:'climbing',   label:'Climbing',           icon:'🧗' },
  { key:'running',    label:'Running',            icon:'🏃' },
  { key:'cycling',    label:'Cycling',            icon:'🚴' },
  { key:'yoga',       label:'Yoga',               icon:'🧘' },
  { key:'lifting',    label:'Lifting / Strength', icon:'🏋' },
  { key:'surfing',    label:'Surfing',            icon:'🏄' },
  { key:'chess',      label:'Chess',              icon:'♟' },
  { key:'piano',      label:'Piano',              icon:'🎹' },
  { key:'guitar',     label:'Guitar',             icon:'🎸' },
  { key:'singing',    label:'Singing',            icon:'🎤' },
  { key:'painting',   label:'Painting',           icon:'🎨' },
  { key:'photography',label:'Photography',        icon:'📷' },
  { key:'cooking',    label:'Cooking',            icon:'🍳' },
  { key:'baking',     label:'Baking',             icon:'🥐' },
  { key:'languages',  label:'Languages',          icon:'🗣' },
  { key:'reading',    label:'Reading',            icon:'📚' },
  { key:'writing',    label:'Writing',            icon:'✍' },
  { key:'coding',     label:'Coding',             icon:'💻' },
  { key:'design',     label:'Design',             icon:'🎯' },
  { key:'dancing',    label:'Dancing',            icon:'💃' },
  { key:'martial',    label:'Martial Arts',       icon:'🥋' },
  { key:'tennis',     label:'Tennis',             icon:'🎾' },
  { key:'hiking',     label:'Hiking',             icon:'🥾' },
  { key:'meditation', label:'Meditation',         icon:'🪷' },
  { key:'gardening',  label:'Gardening',          icon:'🌱' },
  { key:'investing',  label:'Investing',          icon:'📈' },
  { key:'astronomy',  label:'Astronomy',          icon:'🔭' },
  { key:'pottery',    label:'Pottery',            icon:'🏺' },
];

export const SKILL_RANKS = [
  { key:'novice',      label:'Novice',      min:  1, max: 10, color:'#94a3b8' },
  { key:'apprentice',  label:'Apprentice',  min: 11, max: 25, color:'#76d4a3' },
  { key:'adept',       label:'Adept',       min: 26, max: 50, color:'#78f3d3' },
  { key:'expert',      label:'Expert',      min: 51, max: 75, color:'#9b8cff' },
  { key:'master',      label:'Master',      min: 76, max: 90, color:'#ffd073' },
  { key:'grandmaster', label:'Grandmaster', min: 91, max:100, color:'#ff8a3c' },
];

export const HOBBY_ROLES = [
  { key:'practicing', label:'Practicing',          icon:'🔁' },
  { key:'teacher',    label:'Looking for teacher', icon:'🧭' },
  { key:'student',    label:'Looking for student', icon:'🎓' },
  { key:'peers',      label:'Looking for peers',   icon:'🤝' },
];

export const AUDIENCE_TIERS = [
  { key:'nobody',         label:'Nobody',        short:'×',  swatch:'#94a3b8', copy:'Nothing visible.' },
  { key:'reveal_mutual',  label:'Mutual reveal', short:'⇋',  swatch:'#9b8cff', copy:'Only after both sides flag reveal.' },
  { key:'match_gated',    label:'Match% ≥ gate', short:'≥%', swatch:'#78f3d3', copy:'People who clear your reveal-gate match score.' },
  { key:'same_room',      label:'Same room',     short:'⌂',  swatch:'#7b6cff', copy:'Anyone within the 10m bubble.' },
  { key:'anyone',         label:'Anyone',        short:'∞',  swatch:'#ffd073', copy:'Any discoverable user.' },
];

export const PRIVACY_AXES = [
  { key:'showOnFloor',           label:'Appear on the floor',          group:'visibility', defaultTier:'same_room',     copy:'Be visible at all to people in the venue.' },
  { key:'showName',              label:'Share real name',              group:'visibility', defaultTier:'reveal_mutual', copy:'Otherwise you appear by alias only.' },
  { key:'showPhoto',             label:'Share photo / reveal',         group:'visibility', defaultTier:'reveal_mutual', copy:'Falls back to avatar / glance if denied.' },
  { key:'showHobbies',           label:'Share hobbies & skills',       group:'visibility', defaultTier:'match_gated',   copy:'Drives teacher / student matching.' },
  { key:'showStatus',            label:'Share status word',            group:'visibility', defaultTier:'same_room',     copy:'Open / Curious / Focused / etc.' },
  { key:'receiveMessages',       label:'Receive direct messages',      group:'inbound',    defaultTier:'reveal_mutual', copy:'Who can DM you.' },
  { key:'receiveRevealRequests', label:'Receive reveal requests',      group:'inbound',    defaultTier:'match_gated',   copy:'Who can flag you for reveal.' },
  { key:'countRapportWith',      label:'Accrue rapport with',          group:'rapport',    defaultTier:'same_room',     copy:'Who counts toward your rapport over time.' },
  { key:'showOnLeaderboards',    label:'Appear on rapport leaderboards', group:'leaderboard', defaultTier:'nobody',     copy:'Reserved — leaderboards not built yet.' },
];

export const PRIVACY_PRESETS = [
  { key:'stealth', label:'Stealth', icon:'🌑', copy:'Present but invisible.', matrix:{
    showOnFloor:'nobody', showName:'nobody', showPhoto:'nobody', showHobbies:'nobody', showStatus:'nobody',
    receiveMessages:'nobody', receiveRevealRequests:'nobody', countRapportWith:'nobody', showOnLeaderboards:'nobody'
  }},
  { key:'networking', label:'Networking event', icon:'🤝', copy:'Open to introductions in the room.', matrix:{
    showOnFloor:'anyone', showName:'same_room', showPhoto:'same_room', showHobbies:'same_room', showStatus:'anyone',
    receiveMessages:'same_room', receiveRevealRequests:'anyone', countRapportWith:'same_room', showOnLeaderboards:'nobody'
  }},
  { key:'dating', label:'Dating night', icon:'💫', copy:'Avatar-first; reveal only on mutual.', matrix:{
    showOnFloor:'same_room', showName:'reveal_mutual', showPhoto:'reveal_mutual', showHobbies:'match_gated', showStatus:'same_room',
    receiveMessages:'reveal_mutual', receiveRevealRequests:'match_gated', countRapportWith:'same_room', showOnLeaderboards:'nobody'
  }},
  { key:'cafe', label:'Café focus', icon:'☕', copy:'Quiet presence; no inbound.', matrix:{
    showOnFloor:'same_room', showName:'nobody', showPhoto:'nobody', showHobbies:'nobody', showStatus:'nobody',
    receiveMessages:'nobody', receiveRevealRequests:'nobody', countRapportWith:'nobody', showOnLeaderboards:'nobody'
  }},
];

export const TEMP_DURATIONS = [
  { key:'30m', label:'30 min', ms: 30 * 60 * 1000 },
  { key:'2h',  label:'2 hours', ms: 2 * 60 * 60 * 1000 },
  { key:'6h',  label:'6 hours', ms: 6 * 60 * 60 * 1000 },
];

export function defaultMatrix() {
  return Object.fromEntries(PRIVACY_AXES.map(a => [a.key, a.defaultTier]));
}

const PEOPLE_SEED = [
  { id:'p1',  name:'Mara Voss',     alias:'mv',     gender:'Woman',      age:'25–29', height:'170–180', body:'Athletic',  face:'Sharp',     hair:'Long',      style:'Smart-casual', grooming:'Clean',          energy:'Lively', vibe:'Curious',   lifestyle:'Building',    languages:'English', culture:'European',         smoking:'No',        drinking:'Socially', education:'Master',
    intent:'dating',     status:'flirty',   visMode:'hybrid',
    hobbies:[{key:'climbing',skill:64,role:'practicing'},{key:'piano',skill:32,role:'student'},{key:'photography',skill:78,role:'practicing'}], dist:1.6, stable:true,  optIn:true,  signal:0.9 },
  { id:'p2',  name:'Theo Park',     alias:'theo',   gender:'Man',        age:'30–34', height:'180–190', body:'Slim',      face:'Symmetric', hair:'Short',     style:'Streetwear',   grooming:'Stubble',        energy:'Calm',   vibe:'Sharp',     lifestyle:'Building',    languages:'English', culture:'East-Asian',       smoking:'No',        drinking:'Socially', education:'Master',
    intent:'networking', status:'open',     visMode:'photo',
    hobbies:[{key:'coding',skill:88,role:'teacher'},{key:'chess',skill:55,role:'peers'},{key:'running',skill:48,role:'practicing'}], dist:3.2, stable:true,  optIn:true,  signal:0.7 },
  { id:'p3',  name:'Lena Akagi',    alias:'lk',     gender:'Woman',      age:'25–29', height:'160–170', body:'Curvy',     face:'Soft',      hair:'Curly',     style:'Bohemian',     grooming:'Polished',       energy:'Quiet',  vibe:'Soft',      lifestyle:'Settled',     languages:'English', culture:'Mixed',            smoking:'Socially',  drinking:'Socially', education:'Bachelor',
    intent:'dating',     status:'warm',     visMode:'avatar',
    hobbies:[{key:'painting',skill:71,role:'peers'},{key:'yoga',skill:40,role:'practicing'},{key:'languages',skill:55,role:'teacher'}], dist:7.5, stable:true,  optIn:true,  signal:0.6 },
  { id:'p4',  name:'Jules Romero',  alias:'jules',  gender:'Bisexual', age:'30–34', height:'170–180', body:'Athletic',  face:'Striking',  hair:'Shaved',    style:'Smart-casual', grooming:'Clean',          energy:'High',   vibe:'Sharp',     lifestyle:'Exploring',   languages:'Spanish', culture:'Latin',            smoking:'No',        drinking:'Rarely',   education:'Master',
    intent:'networking', status:'focused',  visMode:'glance',
    hobbies:[{key:'design',skill:82,role:'peers'},{key:'cycling',skill:60,role:'practicing'},{key:'cooking',skill:35,role:'student'}], dist:6.0, stable:false, optIn:true,  signal:0.5 },
  { id:'p5',  name:'Idris Cole',    alias:'idris',  gender:'Man',        age:'35–39', height:'180–190', body:'Muscular',  face:'Sharp',     hair:'Short',     style:'Casual',       grooming:'Full beard',     energy:'Lively', vibe:'Steady',    lifestyle:'Settled',     languages:'English', culture:'African',          smoking:'No',        drinking:'Socially', education:'Bachelor',
    intent:'dating',     status:'selective',visMode:'hybrid',
    hobbies:[{key:'lifting',skill:74,role:'teacher'},{key:'guitar',skill:42,role:'peers'},{key:'investing',skill:69,role:'practicing'}], dist:8.8, stable:true,  optIn:true,  signal:0.6 },
  { id:'p6',  name:'Soraya Mehta',  alias:'sora',   gender:'Woman',      age:'25–29', height:'160–170', body:'Slim',      face:'Expressive',hair:'Medium',    style:'Alt',          grooming:'Polished',       energy:'Lively', vibe:'Playful',   lifestyle:'Exploring',   languages:'English', culture:'South-Asian',      smoking:'Socially',  drinking:'Often',    education:'Bachelor',
    intent:'dating',     status:'flirty',   visMode:'reveal',
    hobbies:[{key:'singing',skill:81,role:'peers'},{key:'guitar',skill:52,role:'practicing'},{key:'meditation',skill:30,role:'student'}], dist:4.2, stable:true,  optIn:true,  signal:0.85 },
  { id:'p7',  name:'Ben Caruso',    alias:'benc',   gender:'Man',        age:'40–49', height:'170–180', body:'Average',   face:'Soft',      hair:'Medium',    style:'Smart-casual', grooming:'Trimmed beard',  energy:'Easy',   vibe:'Earnest',   lifestyle:'Settled',     languages:'Italian', culture:'European',         smoking:'No',        drinking:'Socially', education:'PhD',
    intent:'networking', status:'curious',  visMode:'photo',
    hobbies:[{key:'investing',skill:88,role:'teacher'},{key:'tennis',skill:62,role:'peers'},{key:'reading',skill:55,role:'practicing'}], dist:7.0, stable:true,  optIn:true,  signal:0.55 },
  { id:'p8',  name:'Hira Jalil',    alias:'hira',   gender:'Woman',      age:'25–29', height:'160–170', body:'Athletic',  face:'Symmetric', hair:'Long',      style:'Sporty',       grooming:'Clean',          energy:'High',   vibe:'Warm',      lifestyle:'Building',    languages:'Arabic',  culture:'Middle-Eastern',   smoking:'No',        drinking:'No',       education:'Master',
    intent:'dating',     status:'open',     visMode:'photo',
    hobbies:[{key:'running',skill:80,role:'peers'},{key:'climbing',skill:38,role:'student'},{key:'cooking',skill:60,role:'practicing'}], dist:2.4, stable:true,  optIn:true,  signal:0.95 },
  { id:'p9',  name:'Noah Field',    alias:'nf',     gender:'Man',        age:'25–29', height:'180–190', body:'Athletic',  face:'Striking',  hair:'Short',     style:'Casual',       grooming:'Stubble',        energy:'Calm',   vibe:'Reserved',  lifestyle:'Exploring',   languages:'English', culture:'European',         smoking:'No',        drinking:'Socially', education:'Bachelor',
    intent:'networking', status:'engaged',  visMode:'avatar',
    hobbies:[{key:'design',skill:55,role:'peers'},{key:'photography',skill:62,role:'practicing'},{key:'surfing',skill:74,role:'teacher'}], dist:9.5, stable:false, optIn:false, signal:0.3 },
  { id:'p10', name:'Anya Kowalski', alias:'anya',   gender:'Woman',      age:'30–34', height:'170–180', body:'Curvy',     face:'Striking',  hair:'Color-treated',style:'Alt',       grooming:'Polished',       energy:'Wired',  vibe:'Witty',     lifestyle:'Just landed', languages:'German',  culture:'European',         smoking:'Socially',  drinking:'Often',    education:'Master',
    intent:'dating',     status:'selective',visMode:'glance',
    hobbies:[{key:'dancing',skill:78,role:'teacher'},{key:'languages',skill:48,role:'practicing'},{key:'painting',skill:35,role:'student'}], dist:5.4, stable:true,  optIn:true,  signal:0.7 },
  { id:'p11', name:'Kenji Hara',    alias:'kenji',  gender:'Man',        age:'40–49', height:'170–180', body:'Average',   face:'Sharp',     hair:'Short',     style:'Formal',       grooming:'Clean',          energy:'Calm',   vibe:'Steady',    lifestyle:'Settled',     languages:'Japanese',culture:'East-Asian',       smoking:'No',        drinking:'Rarely',   education:'PhD',
    intent:'networking', status:'open',     visMode:'reveal',
    hobbies:[{key:'chess',skill:92,role:'teacher'},{key:'piano',skill:80,role:'practicing'},{key:'reading',skill:70,role:'peers'}], dist:3.6, stable:true,  optIn:true,  signal:0.8 },
  { id:'p12', name:'Mira Ó Coileáin',alias:'mira',  gender:'Woman',      age:'18–24', height:'160–170', body:'Slim',      face:'Soft',      hair:'Long',      style:'Bohemian',     grooming:'Polished',       energy:'Easy',   vibe:'Soft',      lifestyle:'Local',       languages:'English', culture:'European',         smoking:'No',        drinking:'Socially', education:'Bachelor',
    intent:'dating',     status:'warm',     visMode:'hybrid',
    hobbies:[{key:'yoga',skill:68,role:'peers'},{key:'pottery',skill:45,role:'practicing'},{key:'astronomy',skill:25,role:'student'}], dist:4.6, stable:true,  optIn:true,  signal:0.78 },
  { id:'p13', name:'Sam Greaves',   alias:'sam',    gender:'Bisexual', age:'35–39', height:'180–190', body:'Plus',      face:'Expressive',hair:'Shaved',    style:'Casual',       grooming:'Tattooed',       energy:'Lively', vibe:'Warm',      lifestyle:'Settled',     languages:'English', culture:'Caribbean',        smoking:'Quitting',  drinking:'Often',    education:'Trade',
    intent:'networking', status:'circulating',visMode:'photo',
    hobbies:[{key:'baking',skill:72,role:'teacher'},{key:'gardening',skill:60,role:'peers'},{key:'writing',skill:50,role:'practicing'}], dist:8.0, stable:false, optIn:true,  signal:0.45 },
  { id:'p14', name:'Yui Tanaka',    alias:'yui',    gender:'Woman',      age:'25–29', height:'160–170', body:'Athletic',  face:'Symmetric', hair:'Medium',    style:'Streetwear',   grooming:'Clean',          energy:'Quiet',  vibe:'Reserved',  lifestyle:'Exploring',   languages:'Japanese',culture:'East-Asian',       smoking:'No',        drinking:'No',       education:'Bachelor',
    intent:'dating',     status:'invisible',visMode:'hidden',
    hobbies:[{key:'martial',skill:84,role:'teacher'},{key:'meditation',skill:55,role:'practicing'}], dist:11.2, stable:true,  optIn:false, signal:0.2 },
  { id:'p15', name:'Carlos Rey',    alias:'carlos', gender:'Man',        age:'30–34', height:'170–180', body:'Athletic',  face:'Symmetric', hair:'Short',     style:'Sporty',       grooming:'Clean',          energy:'High',   vibe:'Playful',   lifestyle:'Local',       languages:'Spanish', culture:'Latin',            smoking:'No',        drinking:'Socially', education:'Bachelor',
    intent:'dating',     status:'flirty',   visMode:'photo',
    hobbies:[{key:'tennis',skill:76,role:'teacher'},{key:'surfing',skill:55,role:'peers'},{key:'lifting',skill:45,role:'practicing'}], dist:2.0, stable:true,  optIn:true,  signal:0.92 },
  { id:'p16', name:'Priya Shah',    alias:'priya',  gender:'Woman',      age:'30–34', height:'160–170', body:'Average',   face:'Striking',  hair:'Long',      style:'Smart-casual', grooming:'Polished',       energy:'Calm',   vibe:'Witty',     lifestyle:'Settled',     languages:'Mandarin',culture:'South-Asian',      smoking:'No',        drinking:'Rarely',   education:'Master',
    intent:'networking', status:'selective',visMode:'reveal',
    hobbies:[{key:'writing',skill:80,role:'peers'},{key:'languages',skill:65,role:'practicing'},{key:'photography',skill:38,role:'student'}], dist:5.8, stable:true,  optIn:true,  signal:0.7 },
];

// Each person's networking profile is deterministic from their id so
// reloads stay stable. Some have only dating, some only networking, some both.
const NETWORKING_OVERLAY = {
  p1:  { modes:{dating:true, networking:true},  networking:{ ambition:'2 years',  stage:'Building',   role:'Operator',    thinking:'First-principles', expertise:'Practitioner', execution:'Iterative',     domain:'Creative',      lookingFor:'Peers'    } },
  p2:  { modes:{dating:false, networking:true}, networking:{ ambition:'10 years', stage:'Building',   role:'Founder',     thinking:'Systems',          expertise:'Expert',       execution:'Ship-then-fix', domain:'Infra',         lookingFor:'Capital'  } },
  p3:  { modes:{dating:true, networking:false}, networking:null },
  p4:  { modes:{dating:true, networking:true},  networking:{ ambition:'2 years',  stage:'Building',   role:'Generalist',  thinking:'Narrative',        expertise:'Practitioner', execution:'Iterative',     domain:'Creative',      lookingFor:'Hires'    } },
  p5:  { modes:{dating:true, networking:true},  networking:{ ambition:'10 years', stage:'Scaling',    role:'Operator',    thinking:'Pattern-match',    expertise:'Expert',       execution:'Deliberate',    domain:'Finance',       lookingFor:'Mentors'  } },
  p6:  { modes:{dating:true, networking:false}, networking:null },
  p7:  { modes:{dating:false, networking:true}, networking:{ ambition:'Lifetime', stage:'Advising',   role:'Capital',     thinking:'Quantitative',     expertise:'Authority',    execution:'Research-heavy',domain:'Finance',       lookingFor:'Deals'    } },
  p8:  { modes:{dating:true, networking:true},  networking:{ ambition:'2 years',  stage:'Building',   role:'Specialist',  thinking:'First-principles', expertise:'Practitioner', execution:'Iterative',     domain:'Health',        lookingFor:'Peers'    } },
  p9:  { modes:{dating:true, networking:true},  networking:{ ambition:'6 months', stage:'Exploring',  role:'Generalist',  thinking:'Intuitive',        expertise:'Curious',      execution:'Iterative',     domain:'Creative',      lookingFor:'Mentors'  } },
  p10: { modes:{dating:true, networking:true},  networking:{ ambition:'2 years',  stage:'Building',   role:'Connector',   thinking:'Narrative',        expertise:'Practitioner', execution:'Ship-then-fix', domain:'Media',         lookingFor:'Intros'   } },
  p11: { modes:{dating:false, networking:true}, networking:{ ambition:'Lifetime', stage:'Advising',   role:'Specialist',  thinking:'First-principles', expertise:'Authority',    execution:'Deliberate',    domain:'Education',     lookingFor:'Students' } },
  p12: { modes:{dating:true, networking:false}, networking:null },
  p13: { modes:{dating:true, networking:true},  networking:{ ambition:'2 years',  stage:'Building',   role:'Founder',     thinking:'Systems',          expertise:'Practitioner', execution:'Ship-then-fix', domain:'Social',        lookingFor:'Hires'    } },
  p14: { modes:{dating:false, networking:false},networking:null },
  p15: { modes:{dating:true, networking:true},  networking:{ ambition:'6 months', stage:'Exploring',  role:'Operator',    thinking:'Pattern-match',    expertise:'Practitioner', execution:'Iterative',     domain:'Climate',       lookingFor:'Peers'    } },
  p16: { modes:{dating:false, networking:true}, networking:{ ambition:'10 years', stage:'Scaling',    role:'Founder',     thinking:'Quantitative',     expertise:'Expert',       execution:'Research-heavy',domain:'Frontier',      lookingFor:'Capital'  } },
};

export const SAMPLE_PEOPLE = PEOPLE_SEED.map(p => {
  const ov = NETWORKING_OVERLAY[p.id] || { modes:{ dating:true, networking:false }, networking:null };
  return { ...p, modes: ov.modes, networking: ov.networking };
});

function defaultDatingPersona() {
  return {
    id: 'default',
    name: 'Default',
    avatar: { kind: 'emoji', value: '✨' },
    preset: 'custom',
    roleplay: '',
    status: 'open',
    visMode: 'hybrid',
    self: {
      gender: 'Bisexual', age: '25–29', height: '170–180', body: 'Athletic', face: 'Symmetric',
      hair: 'Short', style: 'Smart-casual', grooming: 'Clean',
      energy: 'Easy', vibe: 'Curious', lifestyle: 'Building', languages: 'English', culture: 'European',
      smoking: 'No', drinking: 'Socially', education: 'Master'
    },
    prefs: {
      gender: 'any',
      filters:  { age: ['25–29','30–34'] },
      weights:  Object.fromEntries(PHYSICAL_FIELDS.map(f => [f.key, f.weight])),
      targets:  {
        gender: '', age: '25–29', height: '170–180', body: 'Athletic', face: 'Symmetric',
        hair: 'Long', style: 'Smart-casual', grooming: 'Clean',
        energy: 'Lively', vibe: 'Warm', lifestyle: 'Building', languages: '', culture: '',
        smoking: 'No', drinking: 'Socially', education: ''
      },
      excluded: {}
    },
    privacyOverrides: {}
  };
}

function defaultNetworkingPersona() {
  return {
    id: 'default',
    name: 'Default',
    avatar: { kind: 'emoji', value: '🎯' },
    preset: 'custom',
    roleplay: '',
    status: 'open',
    visMode: 'hybrid',
    self: {
      ambition: '2 years', stage: 'Building', role: 'Operator',
      thinking: 'First-principles', expertise: 'Practitioner', execution: 'Iterative',
      domain: 'Infra', lookingFor: 'Peers'
    },
    prefs: {
      filters:  {},
      weights:  Object.fromEntries(NETWORKING_FIELDS.map(f => [f.key, f.weight])),
      targets:  {
        ambition: '2 years', stage: 'Building', role: 'Founder',
        thinking: 'First-principles', expertise: 'Expert', execution: 'Ship-then-fix',
        domain: 'Infra', lookingFor: 'Peers'
      },
      excluded: {}
    },
    privacyOverrides: {}
  };
}

export const DEFAULT_DATING_PERSONA     = defaultDatingPersona;
export const DEFAULT_NETWORKING_PERSONA = defaultNetworkingPersona;

export const DEFAULT_PROFILE = () => ({
  id: 'me',
  name: 'You',
  alias: 'you',
  mode: 'dating',
  visMatchGate: 0.5,
  optIn: true,
  dating: {
    enabled: true,
    activePersonaId: 'default',
    personas: [defaultDatingPersona()]
  },
  networking: {
    enabled: true,
    activePersonaId: 'default',
    personas: [defaultNetworkingPersona()]
  },
  hobbies: [
    { key:'climbing', skill: 35, role:'student' },
    { key:'cooking',  skill: 55, role:'peers'   },
    { key:'reading',  skill: 60, role:'practicing' }
  ],
  privacy: {
    hideFromMatchBelow: 0.25,
    allowSignal: 'ble',
    matrix: defaultMatrix(),
    temp: {}
  },
  identity: {
    channels: { photo:'reveal_mutual', voice:'reveal_mutual', video:'reveal_mutual', handle:'match_gated', place:'reveal_mutual' },
    glance: { blur: 3, saturate: 0.7 },
    autoRevoke: { onStatusChange: true, onLeaveRoom: false, onMute: true },
    revealTtlKey: '2h',
    history: []
  }
});
