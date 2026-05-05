# The Spectrum

A real-life social operating system built around five layered signals. The Spectrum
augments in-person noticing — it does not replace it. Social proximity is shown as
buckets (Nearby / Adjacent / SameZone / Passing / Hidden), never as exact locations.

Open `index.html` in any modern browser, or visit the GitHub Pages deployment.

## The five layers

1. **Social Status** — Two real-life status spectrums (Dating, Networking) with eight
   states each. The state you set drives how everything else is filtered.
2. **Physical Match %** — Hard filters, weighted preferences, and excluded traits
   collapse into a single "physical preference fit" bucket (Ideal → Unknown).
3. **Third-Space Proximity** — Presence + signal + opt-in + dwell-time + venue
   stability classify nearby people into Nearby / Adjacent / SameZone / Passing /
   Hidden / Muted / OutRange / Unknown.
4. **Identity & Anonymity** — Per-person reveal engine. Avatar, photo, alias, hidden,
   match-gated, and lookaround modes. High-percentage matches encourage looking
   around the room, not staring at a screen.
5. **Rapport & Hobbies** — World-of-Warcraft-style reputation tracks per individual,
   gained through user input, proximity dwell-time, and shared hobby sessions.
   Hobby skill ranks (Novice → Grandmaster) drive auto teacher/student matches when
   someone is looking for one.

## Architecture (platform first, app second)

```
js/
  data.js                catalogs (statuses, hobbies, ranks, tiers, sample people)
  state.js               local-first store + 1s simulation tick (uses engines)
  util.js                tiny DOM/math helpers + event bus
  router.js              hash router & nav

  engines/               PURE PLATFORM — no UI, no DOM
    match.js             Layer 2: filters / weights / excluded → bucketed score
    proximity.js         Layer 3: zone classifier (BLE/UWB/dwell/stability)
    identity.js          Layer 4: visibility + match-gate + reveal handshake
    rapport.js           Layer 5: WoW tiers, accrual, manual ratings
    hobbies.js           Layer 5: skill ranks + teacher/student matcher

  layer1.js              APP UI — Social Status screen
  layer2.js              APP UI — Physical Match %
  layer3.js              APP UI — Proximity
  layer4.js              APP UI — Identity
  layer5.js              APP UI — Rapport + Hobbies
  floor.js               APP UI — Live Floor (integrates every engine)
  profile.js             APP UI — your profile
  people.js              APP UI — single person detail
  app.js                 bootstrap & route registry
```

The engines are pure functions — no DOM, no global state, no I/O. Every screen
is a thin renderer over those engines. Replace the simulation tick in `state.js`
with real BLE/UWB later and nothing else needs to change.

## Notes

- Local-first: everything is in `localStorage` under the `spectrum:v1` namespace.
- The Live Floor runs a 1-second simulation tick that moves nearby people through
  zones and accrues rapport for time spent in proximity.
- No real radios are used; signal strength, BLE/UWB, etc. are simulated.
- Press `0`–`5` to jump between Live Floor / Status / Match / Proximity / Identity /
  Rapport. Press `p` for your profile.
