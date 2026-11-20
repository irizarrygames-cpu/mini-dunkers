// The 3-point contest and free throws: the game and the server must agree on every number, and the
// odds have to feel right.
//   node tools/contestscan.js
// 1. js/penalty.js (PEN) and server/pens.js give the same chance and the same outcome for every
//    release, on the same dice.
// 2. How often each kind of release drops (perfect / good / early / late), for threes and free throws.
// 3. Whole contests on the server's own model: a filled-in shooter against you at three skill levels
//    (you: let go in the green this often), and that the contest always finishes with a winner.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Model = require('../server/pens');

const root = path.join(__dirname, '..');
const ctx = { Math, Number, console, tl: (s) => s, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, t) => a + (b - a) * t };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/penalty.js'), 'utf8') + '\nthis.PEN = PEN; this.PEN_HOOP = PEN_HOOP;', ctx);
const PEN = ctx.PEN;
let fail = 0;
const bad = (msg) => { console.log('FAIL ' + msg); fail++; };

// ---- 1. the same numbers
for (const k of ['GOOD', 'PERFECT', 'TOP', 'LATE']) if (PEN.Z[k] !== Model.Z[k]) bad(`zone ${k}: game ${PEN.Z[k]} server ${Model.Z[k]}`);
if (PEN.SPOTS !== Model.SPOTS) bad('spots differ');
let checked = 0;
for (let rel = 0; rel <= 1.2001; rel += 0.01) {
  for (const q of [0, 0.3, 0.6, 1]) for (const ft of [false, true]) {
    const a = PEN.chance(rel, q, ft), b = Model.chance(rel, q, ft);
    if (Math.abs(a - b) > 1e-12) { bad(`chance(${rel.toFixed(2)}, ${q}, ${ft}): game ${a} server ${b}`); break; }
    for (const made of [true, false]) for (const r of [0.05, 0.4, 0.66, 0.8, 0.95]) {
      if (PEN.how(rel, made, r) !== Model.how(rel, made, r)) { bad(`how(${rel.toFixed(2)}, ${made}, ${r})`); break; }
    }
    checked++;
  }
}
// the same dice give the same shot
const dice = (seed) => { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
for (let i = 0; i < 2000; i++) {
  const rel = (i % 121) / 100, q = (i % 7) / 6, ft = i % 2 === 0;
  const a = PEN.shot(rel, q, ft, dice(i + 1)), b = Model.shot(rel, q, ft, dice(i + 1));
  if (a.made !== b.made || a.how !== b.how || a.T !== b.T) { bad(`shot ${i}: game ${JSON.stringify(a)} server ${JSON.stringify(b)}`); break; }
  const ra = PEN.botRel(0.42, dice(i + 7)), rb = Model.botRel(0.42, dice(i + 7));
  if (Math.abs(ra - rb) > 1e-12) { bad(`botRel ${i}`); break; }
}
console.log(`the game and the server agree (${checked} chances, 2000 shots)`);

// ---- 2. how often each release drops
const N = 40000;
const rate = (lo, hi, ft, q = 0.6) => { let m = 0; for (let i = 0; i < N; i++) if (PEN.shot(lo + Math.random() * (hi - lo), q, ft).made) m++; return m / N; };
const Z = PEN.Z;
const table = [['perfect', Z.PERFECT, Z.TOP], ['good', Z.GOOD, Z.PERFECT], ['early', 0.35, Z.GOOD], ['late', Z.TOP, 1.15]];
console.log('\nhow often it drops        three   free throw');
const rates = {};
for (const [name, lo, hi] of table) {
  const t3 = rate(lo, hi, false), ft = rate(lo, hi, true);
  rates[name] = { t3, ft };
  console.log(`  ${name.padEnd(8)} release      ${(t3 * 100).toFixed(0).padStart(3)}%       ${(ft * 100).toFixed(0).padStart(3)}%`);
}
if (rates.perfect.t3 < 0.85 || rates.perfect.t3 > 0.95) bad('a perfect three should drop about 9 times in 10');
if (rates.good.t3 > 0.6) bad('a good (not perfect) three should miss about half the time');
if (rates.early.t3 > 0.25 || rates.late.t3 > 0.3) bad('an early or late three should mostly miss');
if (rates.perfect.ft < 0.93) bad('a perfect free throw should nearly always drop');

// ---- 3. whole contests on the server's model
function contest(kind, youPerfect, seed) {
  const st = Model.create(seed, kind);
  const youRel = () => Model.botRel(youPerfect, Math.random);
  let guard = 0;
  while (!st.winner && guard++ < 200) {
    const rel = st.team === 'blue' ? youRel() : Model.botRel(Model.BOT_PERFECT, Math.random);
    Model.resolve(st, { rel }, st.team === 'blue' ? 0.6 : 0.5);
  }
  return st;
}
console.log('\nwhole contests (you against a filled-in shooter, who lets go in the green 42% of the time)');
for (const kind of ['pens', 'fk']) {
  for (const [label, p] of [['new to it (in the green 20%)', 0.2], ['decent (45%)', 0.45], ['sharp (75%)', 0.75]]) {
    let wins = 0, made = 0, shots = 0, sudden = 0, unfinished = 0;
    const games = 4000;
    for (let i = 0; i < games; i++) {
      const st = contest(kind, p, (i * 2654435761) >>> 0);
      if (!st.winner) { unfinished++; continue; }
      if (st.winner === 'blue') wins++;
      made += st.kicks.blue.filter(Boolean).length; shots += st.kicks.blue.length;
      if (st.kicks.blue.length > 5) sudden++;
    }
    if (unfinished) bad(`${kind}: ${unfinished} contests never finished`);
    console.log(`  ${kind === 'pens' ? '3-point contest' : 'free throws    '}  ${label.padEnd(28)} you win ${(wins / games * 100).toFixed(0).padStart(3)}%   make ${(made / shots * 100).toFixed(0).padStart(3)}%   sudden death ${(sudden / games * 100).toFixed(0).padStart(3)}%`);
  }
}
// a spot for every shot: 0..4 round the arc in order, and -1 (the line) for free throws
const st = Model.create(5, 'pens');
const spots = [];
for (let i = 0; i < 6; i++) { spots.push(Model.spotOf(st, st.team)); Model.resolve(st, { rel: 0.9 }, 0.6); }
if (spots[0] !== 0 || spots[1] !== 0 || spots[2] !== 1 || spots[4] !== 2) bad('the spots should go round the arc, one per shot each: ' + spots.join(','));
if (Model.spotOf(Model.create(5, 'fk'), 'blue') !== -1) bad('free throws are from the line');

console.log(fail ? `\ncontestscan: ${fail} failure(s)` : '\ncontestscan: ok');
process.exit(fail ? 1 : 0);
