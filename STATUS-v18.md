# STATUS-v18 — Phase 4 Audit of the Deployed Branch

The deployed site at `https://irf97.github.io/The-Spectrum-/` is **build v18**, served
from `claude/implement-jekyll-theme-D0ovz`. It is a *parallel evolution* from the
codebase Phase 0 audited (which lived on `claude/build-full-app-GSxiH`). v18 went
wider into features: dual dating/networking personas, an Alignment engine for
networking-specific scoring, a per-axis Privacy matrix, four themes. None of the
Phase 1–3 dignity reconciliation work landed on this branch — its rapport is still
monotonic, its identity engine still elevates by score, and it has *added new*
score-as-gate paths via `privacy.js`'s `match_gated` tier.

Branch in this repo: `dignity-on-v18` (tracks `origin/claude/implement-jekyll-theme-D0ovz`).
Three parallel audit agents read the v18 code at full depth; this is the synthesis.

## What v18 adds vs. the Phase 0 codebase (worth preserving)

- **Persona separation** (`state.js` migration v4→v5). `profile.dating` and
  `profile.networking` are independent — each owns its own `enabled`,
  `activePersonaId`, and a `personas[]` array carrying separate `self`,
  `prefs`, `privacyOverrides`. Backed by `store.activePersonaFor(modeKey)`.
- **Alignment engine** (`engines/alignment.js`). A clean mirror of `match.js`
  for the networking axis (ambition / stage / role / thinking / expertise /
  execution / domain / lookingFor). Decoupling dating preference from
  professional fit is right.
- **Privacy matrix engine** (`engines/privacy.js`). Per-axis tiers
  (visibility, inbound, rapport, leaderboards — 9 axes total) with presets
  and persona overrides. The *structure* is canonical; one of the tiers
  is the new gap (see below).
- **Theme system** (`engines/…/data.js THEMES`, `js/theme.js`, CSS variables).
  Four themes (midnight, slate, hacker, cayman) applied via
  `data-theme` on the root. `.text-themed-*` / `.bg-themed-*` utility
  classes route through `--text`, `--text-soft`, `--text-mute` so any new
  screen stays theme-aware.
- **Cache killer** in `index.html` (lines 10–31). Checks an `APP_VER`
  localStorage value; on bump, clears caches and unregisters service
  workers. Real production hygiene.
- **`spectrum:v3`** as the storage key, with migration logic v3→v4→v5.
  We must preserve and extend this — Phase 5 needs a v5→v6 step for
  the new state shape, not a key change.
- **`refresh()` exported from router** so a screen can request an
  in-place rerender on state changes.

## Dignity gaps in v18 — the full picture

### Same gaps as Phase 0 (regression-free is the *bad* outcome here)

- **Rapport is monotonic.** `engines/rapport.js` still exports `accrualPerTick`
  (lines 24–35) and has no decay function. v18 actually made it *worse*:
  line 33 adds a shared-hobby accrual bonus on top of the passive
  proximity drive. The `state.js` tick (lines 461–467) only ever increments
  rapport — never decays.
- **Identity elevates by score.** `engines/identity.js:33–45` still has the
  Phase-0 Finding B shape: `if (matchPct < gate) → avatar; else switch(visMode)`.
  When subject's `visMode='photo'` and `matchPct ≥ gate`, the viewer sees
  the photo without the subject ever having flagged them. Same for `hybrid`
  and `reveal` — score-conditional unlocks unchanged.
- **No reveal-grant TTL.** `reveals[id]` is still just a timestamp stored
  forever. `state.js:483–486` flips presence without expiry. "No permanence
  without review" is unmet.
- **No global override pill in the header.** `index.html:78` has only the
  `#persona-pill` (mode/persona switcher). Going private is reachable only
  from `/privacy` and `/layer3`. From Status, Match, Alignment, Identity,
  Rapport, Profile, People, Theme — no one-click leave.

### New gaps introduced in v18

- **`match_gated` tier in `privacy.js`.** `engines/privacy.js:43–46` defines
  a privacy tier whose semantics are *"visible if matchPct ≥ subject's
  gate."* This is the harmful model installed as a first-class privacy
  axis option. The `match_gated` defaults in `data.js:259, 268, 271` apply
  this to `showHobbies` and `receiveRevealRequests` — both *default* to
  reputation-gated access. Subjects can opt out, but the canon's stance is
  the opposite: dignity is the default; gating is the opt-in.
- **Floor leaderboards multiplied.** `floor.js:160, 186, 206` sort visible
  people by a combined composite (~55% match-pct + 20% proximity + 15%
  hobbies + 10% rapport). Three rendering paths, three leaderboards: a
  "Top of shortlist" 8-list, a full sorted shortlist tab, and per-zone
  sort. All ranking people as desirability objects.
- **Layer 2 / Alignment leaderboards.** `layer2.js:110` and
  `alignment.js:95` both sort candidates by `b.r.pct - a.r.pct` and render
  a "Live ranking" sidebar. v18 doubled the surface area of the original
  Phase-0 leaderboard problem.
- **Match-% as a visibility filter on the user's own screen.**
  `layer2.js:76` (status `selective`/`focused` hides < 50% candidates)
  and `layer4.js:124–127` (visMatchGate). The Layer-2 instance is
  defensible as a self-filter; the Layer-4 instance pulls the gate into
  the reveal flow — combined with the identity engine's score elevation,
  this still amounts to score-equals-access.
- **Rapport leaderboard.** `layer5.js:103` sorts all contacts by
  `b.r.points - a.r.points`.
- **Score-as-label on People.** `people.js:77–78` renders match-pct and
  alignment-pct as pills on the person header, framed as labels about the
  person rather than the viewer's private filter result.

## Engines — wired / partial / stub against the dignity frame

| Engine | Status | Notes |
|---|---|---|
| `match.js` | wired (clean) | Pure preference math; gender-aware schema; correctly self-filter. |
| `alignment.js` (NEW) | wired (clean) | Clean mirror of match for networking axis. No new gaps. |
| `proximity.js` | wired | `dwellFactor` is in the classification score, but state's accrual gate is what makes it dangerous — not the engine itself. |
| `identity.js` | **partial** | Score-elevation lines 33–45 unchanged from Phase 0 Finding B. v18 added a `canSee` downgrade hook (lines 49–56) — good — but the upward path is still unilateral by score. |
| `rapport.js` | **partial** | Same monotonic-accrual gap as Phase 0. v18 added the shared-hobby bonus, making it worse. No decay. |
| `hobbies.js` | wired (clean) | Unchanged from Phase 0; aligned. |
| `privacy.js` (NEW) | **partial** | Excellent architecture; `match_gated` tier is the new gap; `same_room` default for `countRapportWith` makes proximity = consent. |

## Screens — wired / partial / stub

| Screen | Status | Notes |
|---|---|---|
| `floor.js` | **partial** | Three leaderboard sorts (`:160, :186, :206`). Visual radar is fine; the side feed is the problem. |
| `layer1.js` | wired (clean) | No people lists; self-state only. |
| `layer2.js` | **partial** | Live ranking sort `:110`; selective-status hides `:76`. |
| `alignment.js` | **partial** | Live ranking sort `:95`. Same shape as Layer 2. |
| `layer3.js` | wired (clean) | Proximity-grouped, no ranking. Mute + go-private buttons here. |
| `layer4.js` | **partial** | visMatchGate `:124–127` combined with identity engine = unilateral elevation. |
| `layer5.js` | **partial** | Rapport leaderboard `:103`. Teacher/student sort by strength is OK (demand-based). |
| `profile.js` | wired (clean) | Identity/personas/alter-egos; no rankings. |
| `people.js` | **partial** | Score-as-label `:77–78`; otherwise privacy-gates are wired correctly. |
| `privacy.js` (NEW) | wired (clean) | Per-axis matrix UI, presets, temp overrides. The control surface is exemplary; the *match_gated tier* lives in the engine, not the screen. |
| `theme.js` (NEW) | wired (clean) | Theme picker; no dignity surface. |

## Phase 5 — the concrete change list

Engines:
1. **`rapport.js`** — delete `accrualPerTick`; add `decayPerTick`,
   `reachingFractionFromLast`, `HALF_LIFE_TICKS`, `DECAY_LAMBDA_PER_TICK`,
   `REACHING_WINDOW_MS`, `POINTS_SNAP_THRESHOLD`. Drop the shared-hobby
   accrual bonus along with the function.
2. **`identity.js`** — strip score-elevation. `hybrid`/`reveal` modes
   collapse to `avatar` without mutual handshake. `visMatchGate` becomes
   downward self-simplify only. Add `REVEAL_GRANT_TTL_MS`,
   `sweepExpiredReveals`, `revealGrantRemainingMs`. Keep the `canSee`
   downgrade hook (it's the right architecture — privacy matrix as a
   ceiling).
3. **`privacy.js`** — delete the `match_gated` tier branch (lines 43–46).
   Its sites of use in `data.js` are migrated below.

Data:
4. **`data.js`** — remove `match_gated` from `PRIVACY_TIERS`. Change
   defaults for `showHobbies`, `receiveRevealRequests` from `match_gated`
   to `reveal_mutual`. Change `countRapportWith` default from `same_room`
   to `reveal_mutual` (proximity ≠ consent). Add the v6 migration.

State:
5. **`state.js`** — tick removes `accrualPerTick` call. Adds rapport decay
   sweep using `decayPerTick` + `reachingFractionFromLast`. Adds
   reveal-grant TTL sweep using `sweepExpiredReveals`. Migration v5→v6.

Screens:
6. **`floor.js`** — remove the three leaderboard sorts. Replace with the
   Phase 1 `peopleByZone` shape (proximity-grouped, alphabetical within
   zone).
7. **`layer2.js`** — remove "Live ranking" sort. Replace with count-only
   projection panel. Header reframed as private filter.
8. **`alignment.js`** (screen) — same as Layer 2.
9. **`layer5.js`** — remove `b.r.points - a.r.points` sort. Replace with
   "People you've recently reached with" (lastReachingTs desc).
   Teacher/student lists stay (demand-based role-fit).
10. **`layer4.js`** — copy reframe. Gate becomes "self-simplify filter."
11. **`people.js`** — score-as-label reframed as "your fit"; reveal-grant
    TTL countdown shown.

Shell:
12. **`index.html`** — add `#override-pill` to the persistent header.
13. **`app.js`** — `paintOverride` + click binding, bound to `state:changed`.

## Phase 6 — Society Standing (new scope, user-invited)

A new layer that uses the same master equation, applied to *societies* —
places, communities, recurring crews — that operate as Living Mesh local
authority nodes. The user gains standing by **contributing to the
society's flourishing** (logging sessions there, mentoring, fulfilling a
need it has advertised), and that standing decays toward neutral when
they stop showing up. Hated → Exalted as a descriptive depth surface;
never gating access to the society. Maps onto the canon's
local-authority-node concept directly.

Sketch:
- `engines/society.js` — pure: `tierForStanding`, `standingProgress`,
  `accrueAtSociety(action, intensity)`, `decayAtSociety(points, reaching)`
  (reuses the master equation), `summary(memberships)`.
- `data.js` — add `SOCIETIES` seed array. Examples: "Cafe Frida"
  (place), "Enschede Climbing Crew" (interest crew), "Tuesday Chess
  Pickup" (recurring event).
- `state.js` — `memberships[societyId] = { points, lastReachingTs,
  visits, contributions[], lastNeedFulfilledTs }`. Tick decays the
  same way per-person rapport decays. Society-aware mutators:
  `visitSociety(id)`, `contributeToSociety(id, kind, intensity)`,
  `fulfillSocietyNeed(id, needId)`.
- `js/societies.js` (new screen) — list standings, recency, recent
  contributions, currently-open needs. Buttons to log visits and fulfill
  needs.
- App: register `/societies` route. Optional integration:
  `logSharedSession` learns an optional `societyId` and contributes to
  that society's standing too.

## What did NOT change (preserved verbatim)

`hobbies.js`, `proximity.js`, `match.js`, `alignment.js` (engine) are
clean. The persona system, theme system, privacy-matrix structure (minus
the one tier), cache killer, router, and `spectrum.css` theme tokens all
stay. Layer 3, Layer 1, Profile, Privacy (screen), Theme — untouched.

## What I ran

Three parallel Explore agents read the v18 codebase concurrently —
engines, screens, platform — and reported with file:line evidence. The
findings above are the synthesis. No code was changed in Phase 4. The
working tree on `dignity-on-v18` is identical to `origin/claude/implement-jekyll-theme-D0ovz`.
Phase 5 work begins next.
