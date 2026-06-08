// Local-authority node — domain-agnostic advertised-need matching.
//
// A *node* owns a bounded scope and advertises *needs*. A social society
// (Café Frida) is a node whose needs are asks ("barista required Tue 7–9pm").
// A contribution *site* (the Enschede kitchen + grow-unit) is a node whose
// needs are *tasks* (nutrient_check, cook_session, clean_down, restock). This
// module is the shared core: it surfaces a node's open needs to a person as a
// swipeable feed, matched on persona × proximity × available-now.
//
// Dignity boundary (the load-bearing one):
//
//   matchOffers ranks NEEDS for a person — it surfaces tasks to whoever fits
//   them. It NEVER ranks people. There is no function here that orders persons
//   by desirability, fit, or standing. "Work finds you" is the inversion: jobs
//   surface to the right person, not people sorted for a job.
//
// This module reads only a node's needs and a person's self-set persona
// (preferences, availability, constraints — Claude's-memory-style, not a
// dossier). It does not read standing, rapport, reward, or fulfilment. The
// feed a person sees is a function of what they like and what is near and now,
// never of how much standing they have accrued.

import { clamp } from '../util.js';

/** Proximity falloff: closer needs score higher. 0..1. */
function proximityScore(distanceM, maxDistanceM = 1000) {
  if (distanceM == null) return 0.5;
  return clamp(1 - distanceM / Math.max(1, maxDistanceM), 0, 1);
}

/**
 * Persona-tag overlap: how well a need's tags match what the person likes.
 * Pure preference fit on the TASK — not a judgment of the person.
 */
function tagOverlapScore(persona, need) {
  const likes = new Set(persona?.likes || persona?.tags || []);
  const tags = need?.tags || [];
  if (!tags.length) return 0.5;
  if (!likes.size) return 0.5;
  let hits = 0;
  for (const t of tags) if (likes.has(t)) hits++;
  return clamp(hits / tags.length, 0, 1);
}

/**
 * Availability fit: is the person typically free at this need's time, and is
 * the need within their stated constraints. Sharp, simple, demo-tuned.
 */
function availabilityScore(persona, need, ctx = {}) {
  // If the person flagged "available now" (opted into the feed), and the need
  // is open-now, that's a strong fit. Otherwise neutral.
  const availableNow = ctx.availableNow ?? persona?.availableNow ?? true;
  let s = availableNow ? 1 : 0.4;
  // Physical-constraint gate: a need can declare a constraint key the person
  // must NOT have flagged as a limit (e.g., 'heavy-lifting'). This shapes the
  // person's OWN feed; it never excludes the person from the node.
  const limits = new Set(persona?.constraints || []);
  if (need?.requires && need.requires.some(r => limits.has(r))) s *= 0.2;
  return clamp(s, 0, 1);
}

/**
 * Surface a node's open needs to a person as ranked offers (the swipe feed).
 *
 * @param {Object} node    has { needs: [...] }
 * @param {Object} persona { likes/tags[], constraints[], availableNow? }
 * @param {Object} ctx     { fulfilledNeedIds?: string[], maxDistanceM?, availableNow? }
 * @returns {Array<{ need, fit, tagScore, proxScore, availScore }>} sorted by fit DESC.
 *          The ordering is over TASKS, for this one person. Never over people.
 */
export function matchOffers(node, persona, ctx = {}) {
  const fulfilled = new Set(ctx.fulfilledNeedIds || []);
  const open = (node?.needs || []).filter(n => !fulfilled.has(n.id));
  const maxD = ctx.maxDistanceM ?? 1000;
  return open.map(need => {
    const tagScore = tagOverlapScore(persona, need);
    const proxScore = proximityScore(need.distanceM, maxD);
    const availScore = availabilityScore(persona, need, ctx);
    const fit = clamp(0.5 * tagScore + 0.3 * proxScore + 0.2 * availScore, 0, 1);
    return { need, fit, tagScore, proxScore, availScore };
  }).sort((a, b) => b.fit - a.fit);
}

/** Count of currently-open (unfulfilled) needs on a node. */
export function openNeedCount(node, fulfilledNeedIds = []) {
  const fulfilled = new Set(fulfilledNeedIds);
  return (node?.needs || []).filter(n => !fulfilled.has(n.id)).length;
}

/** Look up a need by id within a node. */
export function needById(node, needId) {
  return (node?.needs || []).find(n => n.id === needId) || null;
}

/**
 * The unswiped-residue signal (the pilot's demand-side validation): of a node's
 * open needs, which carry no recent acceptance. Surfaced as a count and a list
 * of needs — never a list of people who "should" have done them. A high residue
 * is the instrumented failure signal that willingness is not covering the work.
 */
export function residue(node, fulfilledNeedIds = []) {
  const fulfilled = new Set(fulfilledNeedIds);
  const open = (node?.needs || []).filter(n => !fulfilled.has(n.id));
  return { count: open.length, needs: open };
}
