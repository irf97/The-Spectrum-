# The Spectrum: A Dignity-Constrained Social Operating System as a Living-Mesh Projection

*A working paper accompanying the reference implementation. Simulation-stage; the
mathematics is a structural model, not an empirically calibrated law. The paper
carries its own adversary throughout.*

---

## Abstract

The Spectrum is a local-first, proximity-aware social operating system for
third spaces — cafés, gyms, study rooms, events. It coordinates dating,
networking, and community participation over five layered signals (Social
Status, Physical/Networking fit, Third-Space Proximity, Identity & Anonymity,
Rapport & Hobbies) and a sixth surface for per-society standing. It is built as
a deliberate *projection* of the Living Mesh semantic-runtime architecture onto
the social domain: pure engines are the seven-primitive kernel; the screens are
thin renderers over them; a one-hertz tick simulates the radio layer behind a
preserved seam.

The paper's central claim is not that proximity-aware social software is new,
but that such software is *only legitimate under a dignity constraint*, and that
the constraint is concrete, falsifiable, and implementable. We show how a build
that "worked" — rendered, ran, persisted — nonetheless violated the constraint
in three structural ways (rank-by-desirability leaderboards, reputation that
gated access, and identity reveal unlocked unilaterally by a desirability
score), and we report the reconciliation that removed each, verified by an
executable test suite rather than by narration. We then introduce a novel layer,
*society standing*: World-of-Warcraft-style faction reputation re-grounded as
gradual acceptance into a community, earned by contributing to that community's
flourishing and decaying when one stops showing up — held only by reaching,
never gating the door. We give the formal model (one master equation,
`dℋ/dt = gℛ − λ(1−ℛ)ℋ`, instantiated across the reputation and expiry layers),
the four falsifiable acceptance checks the implementation passes, and an honest
account of what is simulated, what is unproven, and where the design can still
be gamed.

---

## 1. Introduction

Contemporary social, dating, and professional-networking applications share a
structural habit: they convert people into ranked objects. A match queue is a
list of humans ordered by a desirability score. A reputation number gates who
may be seen or contacted. "Premium visibility" sells rank. The interface that
results trains its users to evaluate a screen rather than notice a room, and it
encodes, as architecture, a claim the designers would never defend in words:
that a person's standing determines their right to participate.

The Spectrum begins from the opposite commitment, drawn from the *Rules of the
Aeon*: *every one you meet is complete, irreducible, from birth — not reducible
to any description, score, or classification* (Axis Two). The engineering
question is whether that commitment can be more than a mission statement — whether
it can be expressed as constraints a reviewer can check and a test can fail.

This paper reports a system that makes the attempt, and the process by which it
was forced to. The implementation was first built wide — five layers, dual
dating/networking personas, a per-axis privacy matrix, theming — and *then
audited against the dignity frame*. The audit found the system in violation. The
reconciliation is the contribution; the new society-standing layer is its
generalization; the test suite is its evidence.

### 1.1 Contributions

1. A demonstration that artifact-creation success (renders, runs, persists) is
   orthogonal to dignity-constraint satisfaction, with three concrete,
   file-line-cited violations in a working build.
2. A reconciliation of reputation and match scoring to a forgiving,
   demand-based, access-neutral model, expressed as four *falsifiable*
   invariants and verified by an executable suite.
3. *Society standing*: a per-community reputation layer that models gradual
   belonging as contribution-held and idleness-decayed, mapping the
   World-of-Warcraft faction-reputation metaphor onto the Living Mesh
   local-authority node without reintroducing access-gating.
4. A single formal model — the Living Mesh master equation — shown to drive
   per-person rapport, per-society standing, reveal-grant expiry, and presence
   freshness as instances of one law.
5. An honest evaluation that pre-registers where the design loses and names the
   surfaces on which it can still be gamed.

---

## 2. Background

### 2.1 The Living Mesh kernel

Living Mesh is a local-first semantic runtime whose central primitive is the
*session*, and whose objects pass through a seven-element kernel: **Object**
(what is this), **Authority** (who may act), **Propagation** (how state moves),
**Projection** (how it is shown), **Anchor** (where truth is committed),
**Expiry** (when it goes stale), and **Override/Escalation** (how control is
returned). Three ground rules bear directly on social software: *no authority
without override*, *no permanence without review*, and the central ethical
claim that *a coordination system becomes legitimate only when it increases
human agency without converting people into ranked objects.*

Its reputation model is explicitly oppositional to platform-labor practice.
Where algorithmic management ranks workers and makes score equal access (Rahman
2021; Kellogg, Valentine & Christin 2020; Duggan et al. 2020), Living Mesh makes
reputation *forgiving and demand-based*: it conditions support, supervision, and
suggestion depth, but never participation; it guarantees a minimum access floor;
and negative signals decay.

### 2.2 The dignity ground

The *Rules of the Aeon* supply the normative axioms the architecture treats as
testable criteria rather than aspirations. Two are load-bearing here:

- *Translate toward the one you meet. Do not require them to translate toward
  you.* (Axis Two) — which we read as: visibility must be mutual, never a
  unilateral unlock.
- *Hold the floor for every aeon. No flourishing of yours is legitimate if it
  rests on another's lack.* (Axis Two) — which we read as: no person's standing
  may lower another's access below the floor.
- *The one who rises above has already fallen.* (Axis Five) — which we read as:
  no leaderboard of persons.

### 2.3 The master equation

The Living Mesh formal model reduces its runtime, governance, and economic
layers to one dynamic on a held quantity `ℋ`, a reaching intensity
`ℛ ∈ [0,1]`, and per-layer gain `g` and decay `λ`:

```
dℋ/dt = g·ℛ(t) − λ·(1 − ℛ(t))·ℋ
```

While reaching (`ℛ → 1`) the hold is built and sustained; while idle
(`ℛ → 0`) it decays as `ℋ(t) = ℋ₀·e^(−λt)` and releases. There is a
distinguished floor subset `F` on which `λ = 0`, so `ℋ` is held unconditionally
regardless of reaching. *Above the floor you hold only by reaching; at the floor
you hold unconditionally.* The Spectrum is, in the terms of the canon's
specialization table, an instance of this equation at the **reputation** layer
(standing held by participation, decayed by signal-loss, floored at minimum
access) and the **runtime** layer (permissions and reveal grants held by use,
decayed by expiry).

---

## 3. System Overview

The Spectrum runs entirely in the browser, local-first, with all state under a
single `localStorage` namespace and no mandatory cloud. It is **simulation-stage**:
proximity, signal strength, and presence are produced by a one-hertz tick that
drifts simulated people through a ten-metre venue bubble. The README's
load-bearing promise — *replace the tick with real BLE/UWB and nothing else
changes* — defines a seam the implementation never crosses.

### 3.1 The layers

| Layer | Surface | What it computes |
|---|---|---|
| 1 — Social Status | per-mode status (dating / networking), per-persona | the user's own emitted intent; shapes their own surface, gates no-one else |
| 2 — Physical Match / 2b — Alignment | a private fit number on the user's own search | preference-fit for dating (gender-aware) and networking, computed on-device |
| 3 — Third-Space Proximity | zone buckets (Reach / Nearby / Room / Passing / …) | proximity classification inside a 10 m bubble; buckets, never coordinates |
| 4 — Identity & Anonymity | per-person resolved view | what the viewer sees of a subject, under mutual-consent reveal |
| 5 — Rapport & Hobbies | per-individual standing + role matching | reputation held by reaching; demand-based teacher/student fit |
| 5b — Societies | per-community standing | belonging earned by contribution, decayed by idleness |

Personas are first-class: each mode carries an array of alter-egos, each with
its own self-description, preference vector, and privacy overrides. A per-axis
privacy matrix (nine axes: visibility, inbound, rapport) sits above the
visibility engine as a ceiling.

### 3.2 Platform-first architecture

The engines under `js/engines/` are pure functions — no DOM, no global state,
no I/O. Every screen is a renderer over them. This is what made the audit and
the reconciliation tractable: the dignity violations lived in identifiable
engine logic and identifiable screen sorts, not diffused through the UI, and the
fixes were unit-testable in isolation.

---

## 4. The Kernel Projection

Each engine maps to the seven primitives. The full table with file-line
evidence is in `KERNEL.md`; we summarize the load-bearing rows.

- **Object.** `scoreCandidate`/`alignmentCandidate` return a *score result*
  (a private filter output), not a labelled person. `classify` returns a *zone
  bucket*, never a coordinate. `resolveView` returns a *view*; `rapport[id]` and
  `memberships[societyId]` are *standings*.
- **Authority.** Match results are self-computed and never written about another
  user. Reveal richer than the subject's chosen mode requires mutual consent.
  Society standing is written only by explicit, attributable contribution acts.
- **Expiry.** Reveal grants carry a TTL and are swept on the tick
  (`sweepExpiredReveals`); per-person rapport and per-society standing decay on
  the tick via `decayPerTick`; presence freshness degrades as simulated signal
  drifts. *Nothing is held by inertia.*
- **Override.** A global "go private" control sits in the persistent header,
  one action from every screen. Per-person mute and reveal-cancel live on the
  people pages. Mute is absolute — it wins over every other signal in the
  visibility engine.

The two primitives that were *missing or weak* in the audited build, Expiry and
Override, are exactly the two the reconciliation had to make real.

---

## 5. Formal Model

### 5.1 Per-person rapport

Let `ℋ_p(t)` be the user's standing with person `p` and `ℛ_p(t) ∈ {0,1}` an
indicator of recent reaching — an explicit interaction (a logged shared session
or a manual rating) within a window `W`. The discrete tick applies

```
ℋ_p(t+1) = ℋ_p(t) · (1 − λ·(1 − ℛ_p(t)))
```

with `λ = ln 2 / H` for a half-life of `H` ticks. Accrual is *not* in this
equation: standing rises only through the explicit reaching events, which set
`ℛ_p = 1` for the window `W` and add a bounded delta. Passive proximity — being
near someone — is deliberately excluded as an accrual driver, because rewarding
proximity rewards proximity-pressure. Decay is symmetric: negative standings
also relax toward the neutral floor, so a bad incident fades on the same law a
good one does.

### 5.2 Per-society standing

Let `ℋ_s(t)` be the user's standing with society `s`. The same equation governs
it, with `ℛ_s = 1` for the window `W` following a contribution act
(visit, host, mentor, fulfil-a-need). Standing modifies *depth* — richer
suggestions inside the society, mentor visibility, crosswalks to sister places —
and never *access*. Formally, there exists no function in the society engine of
type `(viewer, society) → bool` that gates entry, messaging, or visibility on
`ℋ_s`; the engine deliberately exposes none.

### 5.3 The floor

For both layers the neutral baseline `ℋ = 0` is the floor `F`: at the floor,
`λ` is irrelevant because there is nothing to decay, and access is
unconditional. A person you have never reached, and a society you have never
visited, sit at the floor — fully able to be seen, contacted, entered. This is
the line the equation draws between the conditional economy of reaching (depth,
suggestions, warmth) and the unconditional guarantee beneath it (access,
participation, presence).

### 5.4 Mutual-consent reveal as a predicate

Visibility is not a function of score. Let `mode(s)` be the subject's chosen
visibility ceiling, `M ⊆ {viewer, subject}` the set of parties who have flagged
reveal, and `π` the subject's privacy matrix. The resolved view is

```
view(v, s) =
  hidden                          if muted ∨ mode(s)=hidden
  reveal                          if M = {viewer, subject}        (mutual handshake)
  downgrade(mode(s), π)           otherwise
```

where `downgrade` lowers the subject's mode to honour `π` (e.g. a
`showPhoto=nobody` matrix collapses a photo-derived view to avatar) and the
viewer's own match-gate may *further* simplify the viewer's own surface
downward, never upward. Match percentage `m` appears nowhere in the unlock path;
it can only reduce what the viewer sees of `s`, never increase it. The
legitimacy constraint is that no `m` raises `view` above `mode(s)` without
`M = {viewer, subject}`.

### 5.5 The legitimacy constraint

Collecting the layers, a configuration of the held social world is legitimate
when: every floor is inviolable (`ℋ|_F ≡ 0`, access unconditional); all
authority is bounded and reversible (override one action away, mute absolute,
reveals expiring); reputation never gates below the floor; and the system names
what would prove it wrong. The last clause is discharged in §6 and §9.

---

## 6. The Dignity Reconciliation

### 6.1 What a working build got wrong

The deployed build rendered, ran, persisted, and was in violation. The audit
(`STATUS-v18.md`) found, with file-line evidence:

1. **Rank-by-desirability leaderboards.** The integrated "floor" view sorted
   visible people by a combined composite (≈55 % match + 20 % proximity +
   15 % hobbies + 10 % rapport) and rendered the result as an ordered list of
   humans — three separate rendering paths doing so. The match and alignment
   screens each sorted candidates by fit percentage into a "live ranking"
   sidebar. The rapport screen sorted contacts by points.
2. **Reputation gating access.** A privacy tier, `match_gated`, made an axis
   visible iff the viewer's match percentage cleared the subject's gate — *score
   equals access*, installed as a first-class, and partly default, privacy
   option.
3. **Score-unlocked reveal.** The identity engine elevated a subject's
   visibility (`reveal`/`hybrid` modes resolving to photo/glance) on the basis
   of a one-sided match percentage, with the reason string literally reading
   `needs-mutual` while showing more anyway.

A fourth, quieter violation: rapport accrued passively from proximity dwell-time
and never decayed — a monotonic gamified score, the opposite of the forgiving
model the canon requires.

### 6.2 What changed

- **Match becomes a private self-filter.** The number is computed on-device,
  framed throughout the UI as *your fit*, used only to glow the viewer's own
  radar and to summarize the room as aggregate counts — never to order people.
  The leaderboards are gone; the floor groups people by proximity zone,
  alphabetical within zone.
- **Reputation decays and never gates.** `accrualPerTick` (the passive driver)
  is deleted. `decayPerTick` implements §5.1. Accrual is explicit only. No
  engine that decides visibility, proximity, or fit references a reputation
  value in executable code.
- **Reveal is mutual-only.** The score-elevation branches are removed; richer
  than the subject's mode requires the two-sided handshake. The viewer's
  match-gate is reframed as a downward *self-simplify* filter.
- **`match_gated` is removed.** The tier is deleted from the catalog; persisted
  state pointing at it is migrated to `reveal_mutual` — stronger consent, the
  safe direction.
- **Expiry and override made real.** Reveal grants carry a TTL swept on the
  tick; a global go-private control is added to the header.

### 6.3 The four falsifiable checks

A reviewer can refute the reconciliation by failing any of:

- **(a) No screen ranks people by desirability or rapport.** Verified by
  source-scanning every screen for the disallowed sort patterns and confirming
  only allowed organisations remain (proximity grouping, recency, demand-based
  role-fit).
- **(b) No access path is gated by a reputation value.** Verified structurally:
  the identity, proximity, and match engines contain no rapport/points/tier
  reference in executable code.
- **(c) Rapport decay is observable on the tick.** Verified by running: 1000
  points halve in one half-life of idleness; reaching freezes decay; negative
  standings relax symmetrically.
- **(d) Reveal requires both sides.** Verified by sweeping match from 0 to 1
  across every subject mode with no mutual flag and observing zero `reveal`
  resolutions; with the mutual flag, `reveal` resolves regardless of match.

All four pass in the reference implementation. They are intentionally phrased so
that a single counterexample falsifies them — the Popperian discipline the canon
demands of itself.

---

## 7. Society Standing

### 7.1 The metaphor, re-grounded

World-of-Warcraft faction reputation — Hated → Hostile → … → Honored → Revered →
Exalted, earned by repeated contribution to a faction — is a familiar model of
*gradual acceptance into a community*. The Spectrum borrows the ladder and
re-grounds it: a *society* is a place, a recurring crew, or a pickup event
(Café Frida, the climbing crew, the Tuesday chess pickup, an exam-season study
room). Standing with a society is built by contributing to *its flourishing* —
showing up, hosting a session there, mentoring a newcomer, answering a need the
society has advertised — and it fades, under §5.2, when the contribution stops.

This is the canon's student-neighbourhood worked example made concrete: a
newcomer with no local history is not ranked last or locked out; they earn
standing simply by taking part, and the floor guarantees access in the meantime.
A society maps directly onto the Living Mesh *local-authority node* — it owns
its own scope and resolves its own needs; standing at one society says nothing
about standing at another.

### 7.2 Why it does not become a caste system

The danger of any reputation ladder is that it hardens into a gate. Three
properties prevent it:

1. **Standing modifies depth, never access.** No society function gates entry,
   messaging, or visibility on standing. A person at the floor is fully able to
   walk into the café.
2. **It decays.** Belonging is held by reaching, not by inertia; a member who
   stops contributing relaxes toward neutral. There is no permanent elevated
   caste because there is no permanence.
3. **Needs are demand-based, not ranked.** A society advertises concrete needs
   (a Saturday barista, a tutor for two beginners, an organiser for a trip).
   Surfacing candidates who could fill a need is matchmaking against a declared
   demand — not an ordering of members by worth. Fulfilling a need is the
   strongest reaching event precisely because it is the most generative
   contribution to the commons.

### 7.3 Relation to the floor

Negative standing exists (a rough experience can be noted) and decays on the
same law as positive standing. There is no stigma that outlives the reaching
that caused it — *one rough night nine months ago should not define a member*.
The empty state is written to make the floor explicit: before you have reached
with a society, *your standing is the neutral baseline — which is exactly the
floor.*

---

## 8. Implementation and Verification

The engines are pure ES modules with zero runtime dependencies. Verification
uses Node's built-in test runner — no framework, no install. The suite is **201
unit tests across 67 suites**, covering match bucketing and gender-aware option
selection, proximity zone classification and the override paths, the identity
reveal handshake and the TTL sweep, rapport accrual-and-decay, hobby
teacher/student matching, the privacy matrix tiers, and the society standing
engine. It includes the adversarial cases the design's own evaluation demands:
attempting reveal without consent, the excluded-trait edge, gaming rapport, and
score-equals-access through the legacy privacy tier.

The suite did real work. It caught a live engine defect during authoring — the
reveal-grant countdown guarded its input with `typeof === 'number'`, which
admits `NaN` (`typeof NaN` is `'number'`) and propagated `NaN` into the UI; the
fix switched to `Number.isFinite`. This is the paper's small, honest proof that
"verified" here means *exercised*, not *asserted*: a claim that survived only
because a test could fail it.

A separate structural smoke verifies the cross-cutting invariants — that the
engines contain no reputation references in access logic, that no screen carries
a desirability sort, that the override control is wired, and that the store
migration normalises the removed privacy tier — at the level of the source text,
not just the unit behaviour.

The system is deployed local-first; the reference build runs as a static site
with no server-side component.

---

## 9. Evaluation with an Internal Adversary

Following the canon's methodological commitment, the evaluation pre-registers
where the design loses and what would falsify it.

**Where a conventional app wins.** On pure engagement metrics, a ranked match
queue almost certainly out-performs a proximity-grouped, un-ranked floor: the
leaderboard is sticky by design, and removing it removes a compulsion loop. The
Spectrum bets the opposite is the point — that a screen which is *less* sticky,
that pushes the user to look at the room, is the better social technology. That
bet is not won by this paper; it requires a live deployment to test.

**The keystone bet.** The whole forgiving, un-ranked model rests on the Living
Mesh claim that people, given real ways to contribute and a secured floor, will
*reach rather than idle*. If they do not, an un-gamified social surface simply
goes quiet. We name this as the load-bearing, least-tested assumption, exactly
as the canon names its own.

**Surfaces that can still be gamed.**

- *Gaming rapport.* Because reaching is operationalised as an explicit
  interaction within a window, a user could tap a manual-rating button to keep
  the window fresh and prevent decay without any real reaching. Detecting this
  requires tying reaching events to proof-of-presence — a §10 co-presence
  concern the simulation does not implement.
- *Gaming society standing.* Symmetrically, spamming low-value "visit"
  contributions could keep a membership alive without real participation. The
  same proof-of-presence binding is the real defence.
- *Forgiveness as attack surface.* Symmetric decay means negative incidents
  fade. This is deliberate forgiveness, but it is also a recovery-exploitation
  surface; distinguishing genuine recovery from cynical reuse is, per the canon,
  a measurement problem the evaluation must own rather than a thing the engine
  can decide.

**Tuning versus principle.** The half-lives (two minutes for rapport, five
minutes for reveal grants, a sixty-second reaching window) are demo-tuned for
legibility — a user can watch the equation reshape state in real time.
Production values would be days or session-bounded. The reconciled object is the
*law* (hold-by-reaching, decay-on-idle, floor-unconditional); the constants are
knobs and are reported as such.

---

## 10. Related Work

**Local-first software** (Kleppmann et al. 2019) supplies the ownership and
offline-operation substrate; The Spectrum stores all state client-side and
treats the cloud as optional. **Platform-labor reputation** research (Rahman
2021; Kellogg, Valentine & Christin 2020; Duggan et al. 2020) is the position
the system most directly opposes: where algorithmic management makes score equal
access, The Spectrum makes reputation condition depth only. **Commons
governance** (Ostrom 1990) grounds the society-as-local-authority-node: bounded
local scope, contextual trust, graduated and recovery-oriented response. The
**WoW faction-reputation** ladder is borrowed as an interaction metaphor, not as
a mechanic — the borrowed part is the *felt sense of gradual belonging*; the
rejected part is the gating that, in the game, locks content behind standing.
The dating-app literature's well-documented harms of desirability-ranking and
gamified scarcity are the practices the four invariants are written to make
structurally impossible.

---

## 11. Limitations and Open Problems

- **Simulation-stage.** No real radios. Proximity, signal, and presence are
  produced by the tick. The seam to BLE/UWB is preserved but uncrossed.
- **No proof of physical co-presence.** The five-layer presence proof the canon
  specifies (secure element → freshness → distance-bounding → quorum →
  liveness) is not implemented; the simulation trusts its own state. This is the
  single largest gap between the model and a deployable system, and it is the
  defence the two gaming surfaces in §9 actually need.
- **No peer-to-peer propagation.** Reveals, mutes, rapport, and society standing
  live in one browser. The "mutual" handshake is two-sided storage on the same
  device; a real deployment would propagate it over the network.
- **No real sessions.** The Spectrum models the room as a continuous projection
  rather than discrete session formation; the canon's session lifecycle is the
  natural next layer.
- **Seed-data societies.** Each society's advertised needs are hardcoded; a
  live system would have societies post their own.
- **The keystone bet is untested.** Stated plainly, not assumed.

---

## 12. Conclusion

The Spectrum's claim is narrow and, we hope, durable: proximity-aware social
software is legitimate only under a dignity constraint, and that constraint is
not a slogan but a set of falsifiable invariants — no ranking of persons, no
access gated by reputation, reputation that decays toward an unconditional
floor, and visibility unlocked only by mutual consent. We showed that a build
can pass every functional check and still fail the constraint, that the failures
are concrete and locatable, and that the reconciliation is verifiable by a suite
that can fail. We added a layer — society standing — that takes the most
gamified of reputation metaphors and re-grounds it as gradual, decaying,
non-gating belonging, mapping it onto the Living Mesh local-authority node. The
result is one master equation driving reputation and expiry alike, beneath a
floor that holds for everyone unconditionally.

What remains is the part no implementation settles: whether people, met as
aeons rather than ranked as objects, reach. The system is built to find out, and
honest about not yet knowing.

---

## Artifacts

- `STATUS.md`, `DIGNITY.md`, `KERNEL.md` — the original lean-codebase phases
  (integration audit; dignity reconciliation with the four checks; kernel
  primitive map).
- `STATUS-v18.md` — audit of the deployed build that this paper's reconciliation
  was applied to.
- `js/engines/*.js` — the pure kernel (match, alignment, proximity, identity,
  rapport, hobbies, privacy, society).
- `tests/*.test.mjs` — the 201-test verification suite (`npm test`).
- Reference deployment: a static, local-first build, separate from the prior
  GitHub Pages site.

## References

1. Rules of the Aeon. (Canon — the prescriptive dignity layer.)
2. On the Aeon. (Canon — the testament.)
3. Living Mesh: *Self is Empire, Empire is Selfless* — a local-first semantic
   runtime for agentic coordination, forgiving governance, and verifiable
   co-presence. (Canon — architecture, kernel, master equation, forgiving
   reputation.)
4. Kleppmann, M., Wiggins, A., van Hardenberg, P., & McGranaghan, M. (2019).
   Local-first software. *Onward! 2019*.
5. Ostrom, E. (1990). *Governing the Commons.* Cambridge University Press.
6. Rahman, H. A. (2021). The invisible cage: workers' reactivity to opaque
   algorithmic evaluations. *Administrative Science Quarterly, 66*(4).
7. Kellogg, K. C., Valentine, M. A., & Christin, A. (2020). Algorithms at work:
   the new contested terrain of control. *Academy of Management Annals, 14*(1).
8. Duggan, J., Sherman, U., Carbery, R., & McDonnell, A. (2020). Algorithmic
   management and app-work in the gig economy. *Human Resource Management
   Journal, 30*(1).
9. Popper, K. (1959). *The Logic of Scientific Discovery.* Basic Books.

---

*Honest edge. This paper is a structural and architectural account, not an
empirical study. The mathematics makes the "hold only by reaching, unconditional
at the floor" principle precise; it is not a measured law, and the reaching
intensity, gains, and decay rates are demo-tuned rather than estimated from data.
The verification establishes that the implementation satisfies the four dignity
invariants and that the engines behave as specified — not that the resulting
social experience is good, adopted, or safe at scale. Those are the questions a
live deployment, with real co-presence proof and real users, would have to
answer.*
