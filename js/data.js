// Static reference data: status spectra, hobby catalog, sample people, privacy matrix.
// All numeric ranges live here so the engines stay short.

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

// ---------- Layer 2: Physical Match preference catalog -----------------------

export const PHYSICAL_FIELDS = [
  { key: 'height',   label: 'Height',   options: ['<160cm','160–170','170–180','180–190','190+'], weight: 0.6 },
  { key: 'body',     label: 'Body type',options: ['Slim','Athletic','Average','Curvy','Muscular','Plus'], weight: 0.7 },
  { key: 'face',     label: 'Face',     options: ['Soft','Sharp','Symmetric','Expressive','Striking'], weight: 0.5 },
  { key: 'hair',     label: 'Hair',     options: ['Short','Medium','Long','Curly','Straight','Shaved','Color-treated'], weight: 0.4 },
  { key: 'style',    label: 'Style',    options: ['Casual','Smart-casual','Streetwear','Formal','Bohemian','Sporty','Alt'], weight: 0.6 },
  { key: 'grooming', label: 'Grooming', options: ['Clean','Trimmed beard','Full beard','Stubble','Hairless','Polished'], weight: 0.4 },
  { key: 'age',      label: 'Age band', options: ['18–24','25–29','30–34','35–39','40–49','50+'], weight: 0.8 },
];

export const MATCH_BUCKETS = [
  { key: 'ideal',    label: 'Ideal',    min: 0.90, swatch:'#ffd073', tone:'rep-exalted',  copy: 'Matches your full preference vector.' },
  { key: 'strong',   label: 'Strong',   min: 0.75, swatch:'#78f3d3', tone:'rep-honored',  copy: 'Strong fit on the metrics that matter most.' },
  { key: 'moderate', label: 'Moderate', min: 0.50, swatch:'#9b8cff', tone:'rep-revered',  copy: 'Mixed signals, but the high-weight items match.' },
  { key: 'partial',  label: 'Partial',  min: 0.25, swatch:'#76d4a3', tone:'rep-friendly', copy: 'Some preferences met, others off.' },
  { key: 'low',      label: 'Low',      min: 0.00, swatch:'#94a3b8', tone:'rep-neutral',  copy: 'Most preferences not met.' },
  { key: 'unknown',  label: 'Unknown',  min: -1,   swatch:'#475569', tone:'rep-neutral',  copy: 'Not enough visible data to score.' },
];

// ---------- Layer 3: Proximity zones (10m world) ----------------------------

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

// ---------- Layer 4: Identity & Anonymity reveal modes -----------------------

export const VIS_MODES = [
  { key:'avatar', label:'Avatar', icon:'🟣', copy:'Symbolic identity only.' },
  { key:'photo',  label:'Photo',  icon:'🖼',  copy:'Direct visual profile.' },
  { key:'hybrid', label:'Hybrid', icon:'🌓', copy:'Avatar first, photo on mutual reveal.' },
  { key:'glance', label:'Glance', icon:'👀', copy:'A blurred hint that resolves with intent.' },
  { key:'reveal', label:'Reveal', icon:'✨', copy:'Full identity, mutual interest required.' },
  { key:'hidden', label:'Hidden', icon:'🚫', copy:'Profile is undiscoverable.' },
];

// ---------- Layer 5: Rapport tiers -------------------------------------------

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

// ---------- Layer 5: Hobbies catalog -----------------------------------------

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

// ---------- Privacy matrix (per-action audience tiers) ----------------------

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

// ---------- Sample population (10m venue) -----------------------------------

const PEOPLE_SEED = [
  { id:'p1',  name:'Mara Voss',     alias:'mv',       age:29, height:'170–180', body:'Athletic',  face:'Sharp',     hair:'Long',      style:'Smart-casual', grooming:'Clean',         intent:'dating',     status:'flirty',   visMode:'hybrid',
    hobbies:[{key:'climbing',skill:64,role:'practicing'},{key:'piano',skill:32,role:'student'},{key:'photography',skill:78,role:'practicing'}], dist:1.6, stable:true,  optIn:true,  signal:0.9 },
  { id:'p2',  name:'Theo Park',     alias:'theo',     age:34, height:'180–190', body:'Slim',      face:'Symmetric', hair:'Short',     style:'Streetwear',   grooming:'Stubble',       intent:'networking', status:'open',     visMode:'photo',
    hobbies:[{key:'coding',skill:88,role:'teacher'},{key:'chess',skill:55,role:'peers'},{key:'running',skill:48,role:'practicing'}], dist:3.2, stable:true,  optIn:true,  signal:0.7 },
  { id:'p3',  name:'Lena Akagi',    alias:'lk',       age:27, height:'160–170', body:'Curvy',     face:'Soft',      hair:'Curly',     style:'Bohemian',     grooming:'Polished',      intent:'dating',     status:'warm',     visMode:'avatar',
    hobbies:[{key:'painting',skill:71,role:'peers'},{key:'yoga',skill:40,role:'practicing'},{key:'languages',skill:55,role:'teacher'}], dist:7.5, stable:true,  optIn:true,  signal:0.6 },
  { id:'p4',  name:'Jules Romero',  alias:'jules',    age:31, height:'170–180', body:'Athletic',  face:'Striking',  hair:'Shaved',    style:'Smart-casual', grooming:'Clean',         intent:'networking', status:'focused',  visMode:'glance',
    hobbies:[{key:'design',skill:82,role:'peers'},{key:'cycling',skill:60,role:'practicing'},{key:'cooking',skill:35,role:'student'}], dist:6.0, stable:false, optIn:true,  signal:0.5 },
  { id:'p5',  name:'Idris Cole',    alias:'idris',    age:38, height:'180–190', body:'Muscular',  face:'Sharp',     hair:'Short',     style:'Casual',       grooming:'Full beard',    intent:'dating',     status:'selective',visMode:'hybrid',
    hobbies:[{key:'lifting',skill:74,role:'teacher'},{key:'guitar',skill:42,role:'peers'},{key:'investing',skill:69,role:'practicing'}], dist:8.8, stable:true,  optIn:true,  signal:0.6 },
  { id:'p6',  name:'Soraya Mehta',  alias:'sora',     age:25, height:'160–170', body:'Slim',      face:'Expressive',hair:'Medium',    style:'Alt',          grooming:'Polished',      intent:'dating',     status:'flirty',   visMode:'reveal',
    hobbies:[{key:'singing',skill:81,role:'peers'},{key:'guitar',skill:52,role:'practicing'},{key:'meditation',skill:30,role:'student'}], dist:4.2, stable:true,  optIn:true,  signal:0.85 },
  { id:'p7',  name:'Ben Caruso',    alias:'benc',     age:42, height:'170–180', body:'Average',   face:'Soft',      hair:'Medium',    style:'Smart-casual', grooming:'Trimmed beard', intent:'networking', status:'curious',  visMode:'photo',
    hobbies:[{key:'investing',skill:88,role:'teacher'},{key:'tennis',skill:62,role:'peers'},{key:'reading',skill:55,role:'practicing'}], dist:7.0, stable:true,  optIn:true,  signal:0.55 },
  { id:'p8',  name:'Hira Jalil',    alias:'hira',     age:26, height:'160–170', body:'Athletic',  face:'Symmetric', hair:'Long',      style:'Sporty',       grooming:'Clean',         intent:'dating',     status:'open',     visMode:'photo',
    hobbies:[{key:'running',skill:80,role:'peers'},{key:'climbing',skill:38,role:'student'},{key:'cooking',skill:60,role:'practicing'}], dist:2.4, stable:true,  optIn:true,  signal:0.95 },
  { id:'p9',  name:'Noah Field',    alias:'nf',       age:29, height:'180–190', body:'Athletic',  face:'Striking',  hair:'Short',     style:'Casual',       grooming:'Stubble',       intent:'networking', status:'engaged',  visMode:'avatar',
    hobbies:[{key:'design',skill:55,role:'peers'},{key:'photography',skill:62,role:'practicing'},{key:'surfing',skill:74,role:'teacher'}], dist:9.5, stable:false, optIn:false, signal:0.3 },
  { id:'p10', name:'Anya Kowalski', alias:'anya',     age:33, height:'170–180', body:'Curvy',     face:'Striking',  hair:'Color-treated',style:'Alt',       grooming:'Polished',      intent:'dating',     status:'selective',visMode:'glance',
    hobbies:[{key:'dancing',skill:78,role:'teacher'},{key:'languages',skill:48,role:'practicing'},{key:'painting',skill:35,role:'student'}], dist:5.4, stable:true,  optIn:true,  signal:0.7 },
  { id:'p11', name:'Kenji Hara',    alias:'kenji',    age:46, height:'170–180', body:'Average',   face:'Sharp',     hair:'Short',     style:'Formal',       grooming:'Clean',         intent:'networking', status:'open',     visMode:'reveal',
    hobbies:[{key:'chess',skill:92,role:'teacher'},{key:'piano',skill:80,role:'practicing'},{key:'reading',skill:70,role:'peers'}], dist:3.6, stable:true,  optIn:true,  signal:0.8 },
  { id:'p12', name:'Mira Ó Coileáin',alias:'mira',    age:24, height:'160–170', body:'Slim',      face:'Soft',      hair:'Long',      style:'Bohemian',     grooming:'Polished',      intent:'dating',     status:'warm',     visMode:'hybrid',
    hobbies:[{key:'yoga',skill:68,role:'peers'},{key:'pottery',skill:45,role:'practicing'},{key:'astronomy',skill:25,role:'student'}], dist:4.6, stable:true,  optIn:true,  signal:0.78 },
  { id:'p13', name:'Sam Greaves',   alias:'sam',      age:39, height:'180–190', body:'Plus',      face:'Expressive',hair:'Shaved',    style:'Casual',       grooming:'Full beard',    intent:'networking', status:'circulating',visMode:'photo',
    hobbies:[{key:'baking',skill:72,role:'teacher'},{key:'gardening',skill:60,role:'peers'},{key:'writing',skill:50,role:'practicing'}], dist:8.0, stable:false, optIn:true,  signal:0.45 },
  { id:'p14', name:'Yui Tanaka',    alias:'yui',      age:28, height:'160–170', body:'Athletic',  face:'Symmetric', hair:'Medium',    style:'Streetwear',   grooming:'Clean',         intent:'dating',     status:'invisible',visMode:'hidden',
    hobbies:[{key:'martial',skill:84,role:'teacher'},{key:'meditation',skill:55,role:'practicing'}], dist:11.2, stable:true,  optIn:false, signal:0.2 },
  { id:'p15', name:'Carlos Rey',    alias:'carlos',   age:30, height:'170–180', body:'Athletic',  face:'Symmetric', hair:'Short',     style:'Sporty',       grooming:'Clean',         intent:'dating',     status:'flirty',   visMode:'photo',
    hobbies:[{key:'tennis',skill:76,role:'teacher'},{key:'surfing',skill:55,role:'peers'},{key:'lifting',skill:45,role:'practicing'}], dist:2.0, stable:true,  optIn:true,  signal:0.92 },
  { id:'p16', name:'Priya Shah',    alias:'priya',    age:32, height:'160–170', body:'Average',   face:'Striking',  hair:'Long',      style:'Smart-casual', grooming:'Polished',      intent:'networking', status:'selective',visMode:'reveal',
    hobbies:[{key:'writing',skill:80,role:'peers'},{key:'languages',skill:65,role:'practicing'},{key:'photography',skill:38,role:'student'}], dist:5.8, stable:true,  optIn:true,  signal:0.7 },
];

export const SAMPLE_PEOPLE = PEOPLE_SEED;

// Default user profile (first-run only)
export const DEFAULT_PROFILE = () => ({
  id: 'me',
  name: 'You',
  alias: 'you',
  intent: 'dating',
  status: { dating: 'open', networking: 'open' },
  visMode: 'hybrid',
  visMatchGate: 0.5,
  optIn: true,
  self: {
    age: '25–29', height: '170–180', body: 'Athletic', face: 'Symmetric',
    hair: 'Short', style: 'Smart-casual', grooming: 'Clean'
  },
  prefs: {
    filters:  { age: ['25–29','30–34'] },
    weights:  Object.fromEntries(PHYSICAL_FIELDS.map(f => [f.key, f.weight])),
    targets:  {
      height: '170–180', body: 'Athletic', face: 'Symmetric',
      hair: 'Long', style: 'Smart-casual', grooming: 'Clean', age: '25–29'
    },
    excluded: {}
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
    temp: {} // axis -> { tier, expiresAt, revertTo }
  }
});
