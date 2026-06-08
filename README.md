# The Spectrum

A real-life social operating system built around five layered signals plus a
sixth surface for per-society standing. The Spectrum augments in-person noticing
— it does not replace it. Social proximity is shown as buckets (Reach / Nearby
/ Room / Passing / Hidden / Muted / OutRange / Unknown), never as exact
locations.

Open `index.html` over HTTP (ES modules require it — `npm run serve` spins a
static server), or visit the GitHub Pages deployment.

This codebase is a *projection* of the Living Mesh architecture onto the
social-coordination domain. The engines are the kernel; the screens are
projections. Where the code intersects the canon directly, the engine doc
comments cite it by name so the line of authority is visible. The canon
itself lives one level up from this repo, at `../docs/`.

## The five layers (+ a sixth)

1. **Social Status** — Two real-life spectrums (Dating, Networking), each
   with their own personas. The state you set drives your own surface and
   what others see of you; it never gates anyone else.
2. **Physical Match % (Layer 2) + Alignment % (Layer 2b)** — Hard filters,
   weighted preferences, and excluded traits collapse into *the user's own
   private fit number on the user's own search*. Match for dating;
   Alignment for networking. Never a label about a person, never a ranking
   of people, never a visibility gate on anyone else.
3. **Third-Space Proximity** — Presence + signal + opt-in + dwell-time +
   venue stability classify nearby people into the zone buckets above. A
   10m bubble around the user. Buckets, never coordinates.
4. **Identity & Anonymity** — Per-person reveal engine. Avatar, photo,
   alias, hidden, hybrid, and mutual-reveal modes. Going richer than the
   subject's chosen mode requires a **mutual handshake** — both sides flag
   each other. Match percentage does not unlock anything; it can only
   simplify the viewer's own surface (the *self-simplify filter*). Reveal
   grants auto-expire after a TTL — "no permanence without review."
5. **Rapport & Hobbies** — *Per-individual* standing held only by real
   reaching: logged shared sessions and manual ratings build it; the tick
   decays it back toward the neutral baseline when there is no recent
   reaching. Hobby skill ranks (Novice → Grandmaster) drive demand-based
   teacher/student role matching.
6. **Societies (Layer 5b, new)** — *Per-society* standing for places
   (cafés, study rooms), crews (gym scenes, interest collectives), and
   pickups (recurring events). Hated → Exalted as descriptive depth.
   Standing is earned by contributing to the society's flourishing
   (visiting, hosting a session there, mentoring, fulfilling an advertised
   need) and fades under the same master equation when reaching stops.
   Each society is a Living Mesh local-authority node — it owns its own
   scope; standing at one tells you nothing about another.

## Architecture (platform first, app second)

```
js/
  data.js            catalogs (statuses, hobbies, ranks, tiers, sample people,
                     SOCIETIES, themes, privacy axes/tiers/presets)
  state.js           local-first store + 1Hz tick (expiry sweep + rapport
                     decay + society decay)
  util.js            tiny DOM/math helpers + event bus
  router.js          hash router & nav
  app.js             bootstrap, persona pill, global override pill, shortcuts

  engines/                       PURE PLATFORM — no UI, no DOM
    match.js                     Layer 2 — physical preference fit (gender-aware)
    alignment.js                 Layer 2b — networking alignment
    proximity.js                 Layer 3 — zone classifier inside the 10m bubble
    identity.js                  Layer 4 — visibility, mutual-consent reveal,
                                 reveal-grant TTL sweep
    rapport.js                   Layer 5 — master equation
                                 `ℋ(t+1) = ℋ(t) × (1 − λ(1−ℛ))`
    hobbies.js                   Layer 5 — skill ranks + demand-based role
                                 matching
    privacy.js                   The per-axis privacy matrix (canSee gate)
    society.js                   Layer 5b — per-society standing on the
                                 same master equation

  layer1.js          Layer 1 — Social Status
  layer2.js          Layer 2 — Physical Match (private filter editor)
  alignment.js       Layer 2b — Networking Alignment
  layer3.js          Layer 3 — Proximity
  layer4.js          Layer 4 — Identity (mutual-reveal handshake)
  layer5.js          Layer 5 — Rapport + Hobbies
  societies.js       Layer 5b — Societies
  floor.js           Live Floor (radar + proximity-grouped presence)
  profile.js         your profile + personas
  people.js          single person detail (per-layer view)
  privacy.js         per-axis privacy matrix UI
  theme.js           theme picker

tests/               node:test (built-in, zero new deps)
  *.test.mjs         one test file per engine
docs/                pointer to the Living Mesh canon (lives at ../docs/)
STATUS.md            Phase 0 — integration audit
DIGNITY.md           Phase 1 — reputation/match reconciled to dignity frame
KERNEL.md            Phase 2 — kernel primitives, expiry, override
STATUS-v18.md        Phase 4 — audit of the deployed v18 branch
```

The engines are pure functions — no DOM, no global state, no I/O. Every
screen is a thin renderer over those engines. Replace the simulation tick
in `state.js` with real BLE/UWB later and nothing else needs to change.

## Tests

```sh
npm test    # node --test tests/*.test.mjs
```

The suite uses Node's built-in test runner (Node ≥ 18). No npm install is
required and no dependencies are added — the engines and tests have zero
external runtime deps.

The brief's adversarial cases — gaming rapport, excluded-trait edge,
reveal without consent, score-equals-access via the `match_gated` legacy
tier — are covered explicitly in the corresponding engine test files.

## Scope & limits (honest map of what is and isn't proven)

The Spectrum is **simulation-stage**. The architecture, the dignity
reconciliation, and the per-society standing model are real; the
real-world inputs are not. This section says what is verified, what is
structurally argued, and what is genuinely unsettled.

### What is verified

- **The engines are pure and tested.** `npm test` runs the engine suite
  against `node:test`; the Phase-7 commit landed it green. Each engine
  has unit tests plus the adversarial cases the brief named.
- **The dignity reconciliation is structurally enforced.** Match
  percentages are a private self-filter; rapport decays toward the
  neutral floor without active reaching; no access path is gated by a
  reputation value (verified structurally — the visibility, proximity,
  and match engines contain no rapport references in executable code);
  no screen ranks people by desirability or rapport (verified by
  source-scanning every screen for the disallowed sort patterns and
  confirming the allowed organising patterns — proximity-zone grouping,
  recency-of-reaching, role-fit strength for declared session needs).
- **Reveal is mutual-only.** A sweep of `matchPct` from 0 to 1 across
  four subject modes with no mutual flags returns `shows='reveal'`
  zero times. With mutual flags, `shows='reveal'` at every match value.
  Mute always wins.
- **Reveal grants expire on the tick** via `sweepExpiredReveals`. The
  TTL countdown is observable in the People screen — the user can
  watch the master equation reshape state.
- **`match_gated` is gone.** The legacy privacy-axis tier that gated
  access by score is removed from the catalog. Persisted state still
  pointing at it is normalised to `reveal_mutual` by the v6 store
  migration — the safe direction (stronger consent, not access-by-score).
- **Society standing decays.** Per-society memberships are subject to
  the same master equation; the tick decays them when no reaching is
  happening at that society. The Societies screen shows holding /
  decaying status per row.
- **Override is one action away.** A global `🌐 Discoverable / 🔒 Private`
  pill sits in the persistent header, visible from every screen.
  Per-person mute and reveal-cancel live on the people pages.

### What is simulated, not real

- **No BLE/UWB radios.** Signal, distance, stability, and proximity zone
  classifications come from `state.js`'s 1Hz simulation tick. The seam
  is preserved: swap the tick for real radios and nothing else needs to
  change.
- **No proof of physical co-presence.** Living Mesh §10's five-layer
  presence proof is **not** implemented here. Authority decisions in
  the sim trust the simulated state.
- **No P2P propagation.** Reveals, mutes, rapport, and society standings
  live in `localStorage` only. The "mutual" handshake in the demo is
  two-sided storage on the same device, not a network round-trip.
- **No real lobbies or sessions.** The Spectrum models the *room* as a
  continuous projection ("Live Floor"); Living Mesh §7's session
  lifecycle is the natural next step but is not in the current code.
- **Society needs are seed data.** Each society's advertised `needs`
  array is hardcoded. A live deployment would have societies post
  their own needs through the same kernel.

### Tuning constants — demo-tuned, not production-tuned

The rapport half-life is **2 minutes** wall-clock (120 ticks at 1Hz),
the reveal-grant TTL is **5 minutes**, the reaching window is **60s**.
These are chosen for live-demo legibility — a user can sit in front of
the app and *see* the master equation reshape state. Production values
would run hours or days, and would likely be session-bounded rather than
wall-clock-bounded. Society standings use the same constants (they
inherit `decayPerTick` from the rapport engine — one equation, multiple
layers, per the canon's specialization table). The principle is what is
reconciled; the constants are knobs.

### The keystone bet

The dignity reconciliation rests on Living Mesh's load-bearing claim:
*humans freed from survival-fear and given real ways to contribute will
reach rather than idle*. Without that, removing the leaderboard removes
the nudge to engage and the screen goes quiet. The Spectrum cannot test
this on its own — it would need a live deployment with real users in
real rooms — so the bet remains exactly that, named here as the canon
names it.

### Adversarial surfaces named, not solved

- **Gaming rapport.** With decay symmetric and the reaching window at
  60s, a user could in principle keep "tapping" a manual rating button
  to keep `lastReachingTs` fresh and prevent decay without doing any
  real reaching. The current code does not detect this; production
  would need a "did the rating co-occur with proximity / a real session"
  check, which is itself a presence/proof concern.
- **Gaming society standing.** Same shape: spamming `+5 visit`
  contributions could keep a membership "alive" without real
  participation. Production would tie contribution events to
  proof-of-presence at the society's location, again a §10 concern.
- **Forgiveness as attack surface.** Decay being symmetric — bad
  incidents fade too — is the canon's deliberate forgiveness. The
  social attack remains defensible only through human judgment, not
  engine logic.
- **The "augment, don't replace" promise.** The Floor radar is designed
  to be glanced at, not stared at. The dignity reconciliation removed
  the leaderboard sidebars that made the screen sticky. Whether real
  users actually look up at the room is an empirical question The
  Spectrum is built to test, not assume.

### Where to look

- `STATUS.md` — Phase 0 integration audit (the pre-v18 codebase).
- `DIGNITY.md` — Phase 1 reconciliation, layer-by-layer mapping to the
  Aeon principle and the Living Mesh forgiving-reputation canon.
- `KERNEL.md` — Phase 2 primitives map, expiry + override implementation.
- `STATUS-v18.md` — Phase 4 audit of the deployed v18 branch.
- `PAPER.md` — the working paper.
- `docs/README.md` — pointer to the Living Mesh canon (lives at `../docs/`).

## Contribution coordination (the Enschede pilot)

Layer 5b's society engine is re-aimed at **work**: a *site* (the Enschede
kitchen + grow-unit, at `#/contribute`) is a node whose advertised needs are
tasks. Work finds you — open tasks surface as a swipe feed matched on
persona × proximity × available-now — and material reward can exist without
turning standing into a convertible score, via **two ledgers that never read
each other**:

- **Ledger A — Standing** (`society.js`). Held by reaching, decays to the
  floor, modifies *depth only*, gates nothing, converts to nothing.
- **Ledger B — Fulfilled needs** (`fulfilment.js`). Discrete, proof-verified
  events. Bears the material reward (`reward.js`): grace routed through in-mesh
  third spaces, and housing-priority points. Per-event, never derived from
  standing.

A source-level test (`tests/contribution.test.mjs`) fails if either ledger
imports or references the other, and a behavioural test sweeps standing 0→max
with zero fulfilments and asserts reward and housing-points stay exactly 0.
Reward is proof-gated and scaled to stake (`evidence.js`): no reward above
*grace* issues without a strong, real, task-intrinsic proof.

### Honest notes on the pilot

- **The strong co-presence proof is designed, not built.** Distance-bounding +
  secure-element identity is a typed stub behind the seam; until the radios
  exist, material reward rests on **task-intrinsic evidence only** (a grow-unit
  sensor, a kitchen log, a commit). The seam is the deliverable, not the radio.
- **Task-intrinsic evidence has limited reach.** Contributions that leave no
  machine trace — comforting a neighbour, defusing a conflict, carrying surplus
  to someone who couldn't come — can carry **grace only**, never material
  reward, by construction. Some of the most human work cannot be materially
  rewarded under this design. Said plainly, not papered over.
- **Two ledgers add complexity** — two systems to keep honest, and a new
  failure mode if they leak. Invariant (e) — the structural separation — is
  load-bearing; it gets both a source scan and a behavioural test.
- **The reward proves the task, never surveils the person.** Proximity buckets
  and ephemeral presence pings only — never a movement record. Privacy-first is
  non-negotiable even to defend a reward.
- **Floor vs above-floor.** Food and floor housing are needs — unconditional,
  unranked, never withheld. Housing-priority points buy *above-floor* housing,
  held as stewardship while contribution continues (the balance decays when it
  stops) and returned when it ends. Rank the reward, never the floor. The
  external housing-corporation integration is out of scope and partner-dependent.
- **The keystone bet is untested and unbuildable here.** Whether people reach
  for the boring necessary task when freed is answered by the live pilot, not by
  this code. This build makes the test *fair*; it does not pre-decide it.

## Notes

- **Local-first.** Everything is in `localStorage` under `spectrum:v3`,
  migrating up through v4 → v5 → v6 as the schema evolved. Reset wipes
  the slate cleanly.
- **Personas.** Each mode (dating / networking) carries its own
  personas array — each with separate `self`, `prefs`, and per-axis
  privacy overrides. The persona pill in the header cycles personas
  with `[` and `]`.
- **The Live Floor runs a 1Hz tick.** That tick (a) refreshes the
  simulated world, (b) sweeps expired reveal grants per the identity
  engine's TTL, (c) sweeps expired temporary privacy overrides,
  (d) decays per-person rapport per the master equation, and (e)
  decays per-society standing the same way. Passive proximity dwell
  does not accrue any standing — accrual is explicit only.
- **Override is one action away.** The header pill (🌐 / 🔒) is visible
  on every screen and toggles your own opt-in in a single click.
  Per-person mute and reveal-cancel live on the people pages.
- **Keyboard shortcuts.** `0`–`6` jump screens; `p` for privacy; `i` for
  profile; `t` cycles themes; `[` / `]` cycles personas.
