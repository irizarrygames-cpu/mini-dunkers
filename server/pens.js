'use strict';

// The shootouts, on the server: the 3-POINT CONTEST ('pens') and FREE THROWS ('fk'). Five shots
// each, taking turns, then one each until one makes it and the other does not. There is nobody to
// beat but the rim: a shot is the moment you let go of the meter (rel, 0 = the moment you pressed,
// 1 = full, past 1 = held too long), and how good that was decides the chance it drops.
//
// The same numbers live in js/penalty.js (PEN): tools/contestscan.js checks they agree.
const Z = { GOOD: 0.68, PERFECT: 0.84, TOP: 0.98, LATE: 1.2 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
// the five spots round the arc, left corner to right corner (a free throw is always the line)
const SPOTS = 5;

// how likely a release this good is to go in. q: the shooter's touch 0..1 (helps a three a little)
function chance(rel, q, ft) {
  if (rel >= Z.PERFECT && rel <= Z.TOP) return ft ? 0.96 : 0.84 + q * 0.08;
  if (rel >= Z.GOOD && rel < Z.PERFECT) { const u = (rel - Z.GOOD) / (Z.PERFECT - Z.GOOD); return ft ? lerp(0.62, 0.88, u) : lerp(0.3, 0.6, u) + q * 0.06; }
  if (rel < Z.GOOD) { const u = clamp(rel / Z.GOOD, 0, 1); return ft ? lerp(0.12, 0.5, u) : lerp(0.03, 0.22, u); }
  return ft ? 0.45 : 0.24;   // held too long: flat and long
}
// What the ball does, on two throws of the dice (made or not, then how). Early releases fall short,
// late ones go long off the back of the rim, a perfect one is usually all net.
function how(rel, made, r) {
  const perfect = rel >= Z.PERFECT && rel <= Z.TOP;
  if (made) return perfect ? (r < 0.72 ? 'swish' : r < 0.9 ? 'rimIn' : 'boardIn') : (r < 0.3 ? 'swish' : r < 0.72 ? 'rimIn' : 'boardIn');
  if (rel < 0.35) return 'air';
  if (rel < Z.GOOD) return r < 0.7 ? 'short' : 'rimOut';
  if (rel > Z.TOP) return r < 0.65 ? 'long' : 'rimOut';
  return r < 0.6 ? 'rimOut' : r < 0.85 ? 'short' : 'long';
}
// a shot: { rel, made, how, T (seconds in the air), ft }
function shot(rel, q, ft, random) {
  rel = clamp(Number.isFinite(rel) ? rel : 0.5, 0, Z.LATE);
  const made = random() < chance(rel, clamp(q, 0, 1), ft);
  return { rel, made, how: how(rel, made, random()), T: ft ? 0.9 : 1.05, ft: !!ft };
}
// a filled-in shooter's release: `perfect` of them in the green, most of the rest close to it
function botRel(perfect, random) {
  const r = random();
  if (r < perfect) return lerp(Z.PERFECT + 0.01, Z.TOP - 0.01, random());
  if (r < perfect + (1 - perfect) * 0.65) return lerp(Z.GOOD, Z.PERFECT, random());
  return random() < 0.6 ? lerp(0.4, Z.GOOD, random()) : lerp(Z.TOP, 1.12, random());
}
const BOT_PERFECT = 0.42;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function decided(kicks) {
  const b = kicks.blue, r = kicks.red, gb = b.filter(Boolean).length, gr = r.filter(Boolean).length;
  if (b.length < 5 || r.length < 5) {
    if (gb + (5 - b.length) < gr) return 'red';
    if (gr + (5 - r.length) < gb) return 'blue';
    return null;
  }
  return b.length === r.length && gb !== gr ? (gb > gr ? 'blue' : 'red') : null;
}
// which spot a side shoots from next (0..4 round the arc; free throws: always the line)
function spotOf(state, team) { return state.kind === 'fk' ? -1 : state.kicks[team].length % SPOTS; }
// kind: 'pens' (the 3-point contest) or 'fk' (free throws)
function create(seed = Date.now(), kind = 'pens') {
  const random = rng(seed), first = random() < 0.5 ? 'blue' : 'red';
  return { seed, random, kind: kind === 'fk' ? 'fk' : 'pens', first, n: 0, team: first, kicks: { blue: [], red: [] }, score: { blue: 0, red: 0 }, winner: null };
}
// The ball leaves the hand: where it goes is settled now, on the contest's own dice; the result is
// shown when it gets there (settle). resolve() does both at once.
function strike(state, input, quality = 0.55) {
  if (state.winner) throw new Error('shootout finished');
  const s = shot(Number(input && input.rel), quality, state.kind === 'fk', state.random);
  s.spot = spotOf(state, state.team);
  return s;
}
function settle(state, s) {
  if (state.winner) throw new Error('shootout finished');
  const result = s.how, scored = !!s.made;
  state.kicks[state.team].push(scored); state.score[state.team] += scored ? 1 : 0;
  const team = state.team; state.winner = decided(state.kicks); state.n++;
  if (!state.winner) state.team = state.n % 2 === 0 ? state.first : (state.first === 'blue' ? 'red' : 'blue');
  return { team, shot: s, result, scored, score: { ...state.score }, kicks: { blue: [...state.kicks.blue], red: [...state.kicks.red] }, winner: state.winner, n: state.n, next: state.team, spot: s.spot, nextSpot: state.winner ? null : spotOf(state, state.team) };
}
function resolve(state, input, quality = 0.55) { return settle(state, strike(state, input, quality)); }

module.exports = { create, resolve, strike, settle, decided, shot, chance, how, botRel, spotOf, Z, SPOTS, BOT_PERFECT };
