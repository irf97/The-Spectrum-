// Layer 5 — Hobbies + Skill ranks + Teacher/Student matching engine.
// Pure functions. Inputs: a "self" hobby list and a "candidate" hobby list. Outputs: relations.

import { SKILL_RANKS, HOBBY_CATALOG } from '../data.js';

/** Rank object for a numeric skill (1..100). */
export function rankFor(skill) {
  const s = Number(skill) || 0;
  for (const r of SKILL_RANKS) {
    if (s >= r.min && s <= r.max) return r;
  }
  return SKILL_RANKS[0];
}

/** Index of a rank within SKILL_RANKS (0..5). */
export function rankIndex(skill) {
  const r = rankFor(skill);
  return SKILL_RANKS.indexOf(r);
}

/** Hobby meta lookup. */
export function hobbyMeta(key) { return HOBBY_CATALOG.find(h => h.key === key); }

/** Returns the set of hobby keys present in both lists. */
export function sharedKeys(selfHobbies, otherHobbies) {
  const a = new Set((selfHobbies || []).map(h => h.key));
  const out = [];
  for (const h of (otherHobbies || [])) if (a.has(h.key)) out.push(h.key);
  return out;
}

/**
 * Compute the relations between self and a candidate for one hobby.
 *
 * relation kinds:
 *  - 'teacher-for-self'   candidate can teach self (self looking for teacher OR rank gap >= 2 and candidate open to teaching)
 *  - 'student-for-self'   candidate would be a student of self (self looking for student OR rank gap >= 2 the other way)
 *  - 'peer'               within one rank of each other and at least one side wants peers/practicing
 *  - 'mismatch'           skill-gap > 1 tier but neither is open to it
 */
export function relationForHobby(selfH, otherH) {
  if (!selfH || !otherH || selfH.key !== otherH.key) return null;
  const si = rankIndex(selfH.skill);
  const oi = rankIndex(otherH.skill);
  const gap = oi - si;       // + → other is more skilled
  const selfRole = selfH.role;
  const otherRole = otherH.role;
  const otherOpenToTeach = otherRole === 'student' || otherRole === 'practicing' || otherRole === 'peers';
  const otherOpenToLearn = otherRole === 'teacher' || otherRole === 'practicing' || otherRole === 'peers';

  // Teacher-for-self: other is at least 2 ranks higher and self is asking, or self asking + other can teach
  if (selfRole === 'teacher' && gap >= 1 && otherOpenToTeach) {
    return { kind:'teacher-for-self', gap, hobby:selfH.key, strength: clamp01(0.5 + gap * 0.15) };
  }
  // Student-for-self: self is teaching someone -2+ ranks lower
  if (selfRole === 'student' && gap <= -1 && otherOpenToLearn) {
    return { kind:'student-for-self', gap, hobby:selfH.key, strength: clamp01(0.5 + (-gap) * 0.15) };
  }
  // No roles asked, but gap suggests it
  if (gap >= 2 && otherOpenToTeach) {
    return { kind:'teacher-for-self', gap, hobby:selfH.key, strength: clamp01(0.4 + gap * 0.1) };
  }
  if (gap <= -2 && otherOpenToLearn) {
    return { kind:'student-for-self', gap, hobby:selfH.key, strength: clamp01(0.4 + (-gap) * 0.1) };
  }
  // Peers within one rank
  if (Math.abs(gap) <= 1) {
    return { kind:'peer', gap, hobby:selfH.key, strength: 0.7 - Math.abs(gap) * 0.15 };
  }
  return { kind:'mismatch', gap, hobby:selfH.key, strength: 0.1 };
}

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * Run relation analysis across all shared hobbies between self and other.
 * Returns the strongest single relation + a full list.
 */
export function relate(selfHobbies, otherHobbies) {
  const out = [];
  const indexSelf = new Map((selfHobbies || []).map(h => [h.key, h]));
  for (const o of otherHobbies || []) {
    const s = indexSelf.get(o.key);
    if (!s) continue;
    const r = relationForHobby(s, o);
    if (r) out.push(r);
  }
  out.sort((a,b) => b.strength - a.strength);
  const headline = out[0] || null;
  const teacher = out.find(r => r.kind === 'teacher-for-self') || null;
  const student = out.find(r => r.kind === 'student-for-self') || null;
  const peers   = out.filter(r => r.kind === 'peer');
  return { headline, teacher, student, peers, all: out };
}

/**
 * Aggregate score that combines:
 *   shared hobbies, role compatibility, and rank-gap fit.
 * Returns 0..1.
 */
export function compatibility(selfHobbies, otherHobbies) {
  const r = relate(selfHobbies, otherHobbies);
  if (!r.all.length) return 0;
  let s = 0;
  for (const rel of r.all) {
    if (rel.kind === 'teacher-for-self' || rel.kind === 'student-for-self') s += 0.6 * rel.strength;
    else if (rel.kind === 'peer') s += 0.4 * rel.strength;
    else s += 0.05 * rel.strength;
  }
  return clamp01(s / Math.max(1, r.all.length * 0.6));
}
