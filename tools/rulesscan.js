// PRO MATCH, the basketball rules (js/rules.js), on the real engine with no screen:
//   node tools/rulesscan.js
// 1. Out of bounds over a sideline and over a baseline: whose ball, from where, the taker outside
//    the line with it over their head, the other side standing back, never from behind the board.
// 2. The shot clock: hold it for 12 seconds and it is the other side's ball; a shot starts it again.
// 3. Fouls: a reach-in on a shooter is free throws (two, three for a three), anywhere else their ball.
// 4. Free throws: by the release, a made last one is the other side's inbound, a missed one is live.
// 5. Whole matches with bots on both sides: nothing throws, nothing gets stuck, the score adds up,
//    and an ordinary match never has a restart.
'use strict';
const { createSim } = require('../server/sim');

const sim = createSim();
sim.run('Game.headless = true; Save.data = Save.defaults(); Save.data.tutorialSeen = true;');
const { CFG, Clubs } = sim;
const Rules = sim.run('Rules');
let fail = 0;
const check = (label, ok, info) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${info !== undefined ? '  ' + JSON.stringify(info) : ''}`); if (!ok) fail++; };

class SI {
  constructor() { this.move = { x: 0, y: 0 }; this.q = 0; this.shootHeld = false; this.sprintHeld = false; }
  take(b) { const v = (this.q & b) !== 0; this.q &= ~b; return v; }
  consumePass() { return this.take(1); } consumeSkill() { return this.take(2); } consumeSlide() { return this.take(4); }
  consumeShootPress() { return this.take(8); } consumeShootRelease() { return this.take(16); } consumePassPress() { return this.take(32); } consumeUlt() { return this.take(64); }
}
function proMatch(format = '2v2', mode = 'pro') {
  sim.run(`Pitch.use('${mode === 'pro' ? 'pro' : 'normal'}')`);
  const m = sim.Match.create({ mode, club: Clubs.get('croatia'), format, minutes: 2 });
  for (const h of m.humans) h.input = new SI();
  for (let i = 0; i < 600 && m.phase !== 'play'; i++) sim.Match.step(m, CFG.STEP);
  return m;
}
const steps = (m, n) => { for (let i = 0; i < n; i++) sim.Match.step(m, CFG.STEP); };
const W = () => CFG.FIELD_W, H = () => CFG.FIELD_H;

console.log('out of bounds');
{
  const m = proMatch();
  const b = m.ball;
  b.owner = null; b.x = 700; b.y = -40; b.z = 0; b.vx = 0; b.vy = 0; b.shot = null; b.lastTouchTeam = 'red';
  steps(m, 2);
  const R = m.restart;
  check('over a sideline: a restart, the other side\'s ball (blue)', m.phase === 'restart' && R && R.kind === 'throw' && R.team === 'blue', R && { kind: R.kind, team: R.team });
  check('from the sideline, where it went out', R && R.by === 0 && Math.abs(R.bx - 700) < 2, R && [R.bx, R.by]);
  check('the taker outside the line, the ball over their head', R && R.taker.y < 0 && b.owner === R.taker && b.z > 40, R && { y: R.taker.y, z: b.z });
  check('you take your own side\'s (offline)', R && R.taker === m.human && R.human);
  steps(m, 120);
  const near = m.players.filter((p) => p.team !== R.team && Math.hypot(p.x - R.bx, p.y - R.by) < Rules.CLEAR - 5);
  check('the other side stands back', near.length === 0, near.map((p) => Math.round(Math.hypot(p.x - R.bx, p.y - R.by))));
  check('the clock stops while it is set up', (() => { const t0 = m.time; steps(m, 60); return m.time === t0; })());
  m.human.input.move.x = 0.3; m.human.input.move.y = 1; m.human.input.q |= 1;
  steps(m, 3);
  check('PASS plays it in, into the court', m.phase === 'play' && !m.restart && b.vy > 0, { phase: m.phase, vy: Math.round(b.vy) });

  // over a baseline, right behind the board: from beside the board instead
  steps(m, 30);
  b.owner = null; b.x = -30; b.y = H() / 2 + 10; b.vx = 0; b.vy = 0; b.z = 0; b.shot = null; b.lastTouchTeam = 'blue';
  steps(m, 2);
  const R2 = m.restart;
  check('over a baseline: red\'s ball from the baseline', R2 && R2.team === 'red' && R2.base && R2.bx === 0, R2 && { team: R2.team, base: R2.base, bx: R2.bx });
  check('never from right behind the backboard', R2 && Math.abs(R2.by - H() / 2) >= CFG.BOARD_W / 2 + 50, R2 && R2.by);
  let t = 0; while (m.phase === 'restart' && t < 600) { sim.Match.step(m, CFG.STEP); t++; }
  check('a bot takes its own within a second and a half', m.phase === 'play' && t <= 1.6 * 120, { steps: t });

  // carried over the line
  steps(m, 20);
  const red = m.players.find((p) => p.team === 'red');
  b.owner = red; red.x = 900; red.y = H() + 30; b.x = red.x; b.y = red.y;
  steps(m, 2);
  check('carried over a line: the other side\'s ball', m.restart && m.restart.team === 'blue', m.restart && m.restart.team);
}

console.log('the shot clock');
{
  const m = proMatch();
  const b = m.ball, h = m.human;
  // you have it, and stand there
  for (const p of m.players) if (p.team !== h.team) { p.x = 100; p.y = 100; p.speedMul = 0; }
  b.owner = h; h.protectT = 99; m.shotClock = CFG.SHOT_CLOCK;
  let t = 0;
  while (m.phase === 'play' && t < 120 * 14) { sim.Match.step(m, CFG.STEP); b.owner = h; t++; }
  check('12 seconds and it is the other side\'s ball', m.phase === 'restart' && m.restart.why === 'clock' && m.restart.team !== h.team, { secs: (t / 120).toFixed(1), why: m.restart && m.restart.why });
  check('from the sideline', m.restart && (m.restart.by === 0 || m.restart.by === H()));
  // a shot in the air starts it again
  const m2 = proMatch();
  m2.shotClock = 3; m2.ball.shot = { team: 'blue', T: 1, t: 0, x0: 0, y0: 0, z0: 0, ex: 0, ey: 0, ez: 0, apex: 0 };
  Rules.check(m2, CFG.STEP);
  check('a shot in the air starts it again', m2.shotClock === CFG.SHOT_CLOCK, m2.shotClock);
}

console.log('fouls');
{
  const m = proMatch();
  const h = m.human, def = m.players.find((p) => p.team !== h.team);
  // a shooter, from behind: always a foul here (the dice say so), three shots from behind the arc
  const hx = sim.run(`hoopX('${h.team}')`), dir = sim.run(`TEAMS['${h.team}'].dir`);
  h.x = hx - dir * 560; h.y = H() / 2; h.charging = true; m.ball.owner = h;
  const wasThree = sim.run(`isThree('${h.team}', ${h.x}, ${h.y})`);
  sim.run('globalThis.__rnd = globalThis.__rnd || Math.random; Math.random = () => 0.01');
  Rules.reachIn(m, def, h, true);
  sim.run('Math.random = globalThis.__rnd');
  check('a reach-in on a shooter is free throws', m.phase === 'restart' && m.restart.kind === 'ft' && m.restart.taker === h, m.restart && m.restart.kind);
  check('three of them for a three', m.restart && m.restart.n === 3 && wasThree, m.restart && m.restart.n);
  check('the foul is counted', (def.stats.fouls || 0) === 1 && m.fouls && m.fouls[def.team] === 1);
  // a dribbler away from the basket: their ball from the side
  const m2 = proMatch(), h2 = m2.human, d2 = m2.players.find((p) => p.team !== h2.team);
  h2.x = CFG.FIELD_W / 2; h2.y = 300; h2.charging = false; m2.ball.owner = h2;
  sim.run('globalThis.__rnd = globalThis.__rnd || Math.random; Math.random = () => 0.01');
  Rules.reachIn(m2, d2, h2, true);
  sim.run('Math.random = globalThis.__rnd');
  check('anywhere else: their ball from the side', m2.restart && m2.restart.kind === 'throw' && m2.restart.why === 'foul' && m2.restart.team === h2.team, m2.restart && { kind: m2.restart.kind, why: m2.restart.why });
  // and not every miss is a foul
  let fouls = 0;
  for (let i = 0; i < 400; i++) {
    const m3 = proMatch('1v1'), h3 = m3.human, d3 = m3.players.find((p) => p.team !== h3.team);
    h3.x = CFG.FIELD_W / 2; h3.y = 300; m3.ball.owner = h3;
    Rules.reachIn(m3, d3, h3, false);
    if (m3.restart) fouls++;
    if (i >= 150) break;
  }
  check('a reach-in from in front is only now and then a foul', fouls > 2 && fouls < 40, { of: 151, fouls });
}

console.log('free throws');
{
  const go = (at) => {
    let made = 0, shots = 0, live = 0, inbound = 0;
    for (let i = 0; i < 120; i++) {
      const m = proMatch(), h = m.human;
      Rules.freeThrows(m, h, 2);
      const before = m.score[h.team];
      let pressed = false, g = 0, lastMade = null;
      while (m.phase === 'restart' && m.restart.kind === 'ft' && g++ < 120 * 20) {
        const R = m.restart;
        if (!R.fly) {
          if (!pressed && R.t > 0.4) { h.input.q |= 8; h.input.shootHeld = true; pressed = true; }
          if (pressed && h.charging && h.chargeT / CFG.METER_T >= at) { h.input.q |= 16; h.input.shootHeld = false; pressed = false; }
        } else lastMade = R.fly.make;
        sim.Match.step(m, CFG.STEP);
      }
      made += m.score[h.team] - before; shots += 2;
      if (lastMade === false && m.phase === 'play') live++;
      if (lastMade === true && m.restart && m.restart.kind === 'throw' && m.restart.team !== h.team && m.restart.base) inbound++;
      const goalsSum = m.goals.reduce((n, gg) => n + (gg.pts || 1), 0);
      if (goalsSum !== m.score.blue + m.score.red) { check('the score matches the baskets', false, { goalsSum, score: m.score }); break; }
    }
    return { pct: made / shots, live, inbound };
  };
  const perfect = go(0.9), early = go(0.5);
  check('let go in the green: nearly always in', perfect.pct > 0.88, (perfect.pct * 100).toFixed(0) + '%');
  check('let go early: more often out than in', early.pct < 0.6 && early.pct > 0.2, (early.pct * 100).toFixed(0) + '%');
  check('a made last one: the other side\'s ball from their baseline', perfect.inbound > 50, perfect.inbound);
  check('a missed last one: the ball is live', early.live > 20, early.live);
}

console.log('whole matches, bots on both sides');
{
  let restarts = 0, stuck = 0, errors = [], bad = 0, ordinaryRestarts = 0, pts = 0;
  for (let i = 0; i < 8; i++) {
    const m = proMatch(i % 2 ? '3v3' : '2v2');
    m.autopilot = true;
    let rT = 0, last = null, g = 0;
    while (m.phase !== 'over' && g++ < 120 * 60 * 6) {
      try { sim.Match.step(m, CFG.STEP); } catch (e) { errors.push(e.message); break; }
      if (m.restart && m.restart !== last) restarts++;
      last = m.restart;
      if (m.phase === 'restart') { rT += CFG.STEP; if (rT > 12) { stuck++; break; } } else rT = 0;
    }
    if (m.goals.reduce((n, gg) => n + (gg.pts || 1), 0) !== m.score.blue + m.score.red) bad++;
    pts += m.score.blue + m.score.red;
  }
  for (let i = 0; i < 4; i++) {
    const m = proMatch('3v3', 'quick');
    m.autopilot = true;
    let g = 0;
    while (m.phase !== 'over' && g++ < 120 * 60 * 6) { sim.Match.step(m, CFG.STEP); if (m.phase === 'restart' || m.restart) { ordinaryRestarts++; break; } }
  }
  check('nothing throws', errors.length === 0, errors.slice(0, 3));
  check('no restart is ever stuck', stuck === 0, stuck);
  check('the score always matches the baskets', bad === 0, bad);
  check('restarts happen (out of bounds, fouls)', restarts > 4, { restarts, pointsPerMatch: (pts / 8).toFixed(1) });
  check('an ordinary match never has one', ordinaryRestarts === 0, ordinaryRestarts);
}

console.log(fail ? `\nrulesscan: ${fail} FAILED` : '\nrulesscan: all good');
process.exit(fail ? 1 : 0);
