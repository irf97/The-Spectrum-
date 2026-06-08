// The proof / evidence seam.
//
// Material reward must rest on evidence that the deed was actually done — but
// the privacy-first rule is absolute: prove the TASK, never surveil the PERSON.
// The trilemma (reward ⟷ proof ⟷ privacy) is resolved by letting the task's
// own trace prove itself wherever possible: a grow-unit sensor confirms the
// nutrient check; a kitchen log confirms the meal; a commit confirms the
// automation. No movement record of the person is ever required or kept.
//
// Evidence resolves to one of three proof tiers:
//
//   none    — no evidence. Standing/depth only; no material reward.
//   ping    — a fresh, nonce'd, node-local presence ping. Light. Earns grace.
//   strong  — task-intrinsic machine trace (REAL now), or distance-bounded
//             co-presence with secure-element identity (STUBBED behind the
//             seam; real radios later, and nothing else changes). Required for
//             material housing-priority reward.
//
// The seam is the deliverable, not the radio. `coPresenceStrong` returns a
// typed `strong` result in simulation but is flagged `real:false` so the
// current-build invariant (i) can refuse it for material reward until the
// hardware exists. `taskIntrinsic` returns `real:true`.

export const PROOF_TIERS = ['none', 'ping', 'strong'];

// Freshness window for a presence ping. Demo-tuned.
export const PING_TTL_MS = 2 * 60 * 1000;

/**
 * Primary evidence path: the task's OWN trace. If the need declares an
 * intrinsic evidence source and the site's readings confirm it, this is a
 * REAL strong proof. No person is tracked — only the task asserts itself.
 *
 * @param {Object} need          has { evidence: { intrinsic } }
 * @param {Object} siteReadings  map needId → boolean (false = trace absent/failed).
 *                               Absent key is treated as confirmed in simulation.
 * @returns {{ tier, source, real }}
 */
export function taskIntrinsic(need, siteReadings = {}) {
  const src = need?.evidence?.intrinsic;
  if (!src) return { tier: 'none', source: null, real: true };
  const confirmed = siteReadings[need.id] !== false;
  return confirmed
    ? { tier: 'strong', source: src, real: true }
    : { tier: 'none', source: src, real: true };
}

/**
 * A fresh, nonce'd, node-local presence ping. Light evidence that the person
 * was at the node now — enough for grace, never enough for material reward.
 * Real now (the node issues a nonce; freshness is checked locally). No
 * location history is stored; the ping is ephemeral by construction.
 *
 * @param {string} personId
 * @param {string} siteId
 * @param {Object} ctx  { nonce, issuedAt?, now?, ttlMs? }
 * @returns {{ tier, source, real }}
 */
export function presencePing(personId, siteId, ctx = {}) {
  const hasNonce = ctx.nonce != null;
  const issuedAt = ctx.issuedAt;
  const now = ctx.now ?? Date.now();
  const ttl = ctx.ttlMs ?? PING_TTL_MS;
  const fresh = hasNonce && (issuedAt == null || (now - issuedAt) < ttl);
  return fresh
    ? { tier: 'ping', source: 'presence-ping', real: true }
    : { tier: 'none', source: 'presence-ping', real: true };
}

/**
 * STUB behind the seam. Distance-bounding (UWB time-of-flight) + secure-element
 * identity would establish that a specific, unclonable identity was physically
 * present — defeating relay and spoofing. NOT built. Returns a typed `strong`
 * result in simulation so the rest of the system can be exercised, but flagged
 * `real:false` so invariant (i) refuses it for material reward until the
 * hardware exists. When the radios land, this function becomes real and
 * NOTHING ELSE CHANGES — that is the seam.
 *
 * @returns {{ tier:'strong', source:'co-presence-stub', real:false, stub:true }}
 */
export function coPresenceStrong(/* personId, siteId, ctx */) {
  return { tier: 'strong', source: 'co-presence-stub', real: false, stub: true };
}

/**
 * Resolve the best available proof for a need, in priority order:
 *   1. task-intrinsic (REAL, primary)
 *   2. co-presence strong (STUB, only if explicitly enabled — not for material
 *      reward in the current build)
 *   3. presence ping
 *   4. none
 *
 * @param {Object} need  the need being fulfilled
 * @param {Object} ctx   { siteReadings?, personId?, nonce?, issuedAt?, now?,
 *                         ttlMs?, useStrongStub? }
 * @returns {{ tier, source, real, stub? }}
 */
export function resolveProof(need, ctx = {}) {
  const intrinsic = taskIntrinsic(need, ctx.siteReadings || {});
  if (intrinsic.tier === 'strong') return intrinsic;

  if (ctx.useStrongStub) {
    const strong = coPresenceStrong(ctx.personId, need?.siteId, ctx);
    if (strong.tier === 'strong') return strong;
  }

  const ping = presencePing(ctx.personId, need?.siteId, ctx);
  if (ping.tier === 'ping') return ping;

  return { tier: 'none', source: null, real: true };
}
