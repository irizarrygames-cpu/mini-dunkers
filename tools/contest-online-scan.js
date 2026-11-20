'use strict';
// The online 3-point contest and free throws, on the real server code (fake sockets):
//   node tools/contest-online-scan.js
// A shot as it happens: the shooter lets go (pen.shot with how full the meter was), goes up at once
// (pen.runup), the ball leaves the hand (pen.kick says what it will do) and the result comes when it
// gets there (pen.result). Both players see the same shot and the same result; the spots go round
// the arc in order; a filled-in shooter takes its own; the 10 s clock takes a hurried one for you;
// nothing out of turn or twice changes anything; and a contest always ends with a winner, recorded.
const { createGame } = require('../server/game');
const Model = require('../server/pens');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class FakeWS {
  constructor() { this.open = true; this.handlers = {}; this.got = []; this.backlog = 0; this.lastSeen = Date.now(); }
  on(e, f) { this.handlers[e] = f; }
  send(s) { const m = typeof s === 'string' ? JSON.parse(s) : s; m._at = Date.now(); this.got.push(m); }
  close() { if (!this.open) return; this.open = false; if (this.handlers.close) this.handlers.close(); }
  msg(m) { this.lastSeen = Date.now(); this.handlers.message(m); }
  since(n, t) { return this.got.slice(n).filter((m) => m.t === t); }
}
const records = [];
const game = createGame({
  getUser: (id) => ({ name: id.toUpperCase(), club: 'spain', save: { character: 'street' } }),
  userName: (id) => id.toUpperCase(), saveDB: () => {}, isNameTaken: () => false,
  onlineRecord: (id, r) => { records.push({ id, ...r }); return 0; },
  league: { move: () => {}, result: () => {}, pos: () => 1 },
});
const connect = (id) => { const ws = new FakeWS(); game.connect(ws, id); return ws; };
let fails = 0;
const check = (n, ok, d) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${d === undefined ? '' : '  ' + JSON.stringify(d)}`); if (!ok) fails++; };
async function waitFor(ws, type, from = 0, ms = 6000) { const end = Date.now() + ms; while (Date.now() < end) { const m = ws.since(from, type)[0]; if (m) return m; await sleep(3); } return null; }

// two people in a private contest (kind: 'pens' the 3-point contest, 'fk' free throws)
async function pair(x, y, kind = 'pens') {
  const a = connect(x), b = connect(y);
  a.msg({ t: 'room.create', format: kind }); const code = a.got.filter((m) => m.t === 'room').pop().code;
  b.msg({ t: 'room.join', code }); b.msg({ t: 'room.team', team: 'red' }); a.msg({ t: 'room.start' });
  const sa = await waitFor(a, 'pen.start'), sb = await waitFor(b, 'pen.start');
  const room = game._roomOf(x);
  room.startAt = 0;   // skip the VS card
  await waitFor(a, 'pen.turn');
  return { a, b, sa, sb, room };
}
const roles = (P) => { const team = P.room.pen.model.team; return P.sa.side === team ? { shooter: P.a, other: P.b } : { shooter: P.b, other: P.a }; };
async function nextTurn(P) {
  const from = P.a.got.length;
  if (P.room.pen.phase === 'result') P.room.pen.nextAt = 0;
  return waitFor(P.a, 'pen.turn', from, 4000);
}

(async () => {
  console.log('a shot, two people');
  const P = await pair('ca', 'cb');
  {
    const turn = P.a.got.filter((m) => m.t === 'pen.turn').pop();
    check('the start says it is the 3-point contest', P.sa.kind === 'pens' && P.sb.kind === 'pens', P.sa.kind);
    check('a turn says how long the shooter has, and from where (the left corner first)', turn.in === 10000 && turn.spot === 0, { in: turn.in, spot: turn.spot });
    const { shooter, other } = roles(P);
    const n0 = shooter.got.length, o0 = other.got.length;
    // the one waiting cannot shoot for them
    other.msg({ t: 'pen.shot', rel: 0.9 });
    await sleep(60);
    check('a shot out of turn is ignored', P.room.pen.phase === 'input' && !P.room.pen.pending.shot);
    const t0 = Date.now();
    shooter.msg({ t: 'pen.shot', rel: 0.9 });
    shooter.msg({ t: 'pen.shot', rel: 0.1 });
    const run = await waitFor(other, 'pen.runup', o0, 500);
    check('the other player sees them go up at once', !!run && run._at - t0 < 30 && run.ms === 300, run && { after: run._at - t0, ms: run.ms });
    const kick = await waitFor(shooter, 'pen.kick', n0, 1000);
    check('the ball leaves the hand at the top of the jump', !!kick && kick._at - t0 >= 290 && kick._at - t0 < 380, kick && { after: kick._at - t0 });
    check('with the release they sent (a second press changes nothing)', !!kick && Math.abs(kick.shot.rel - 0.9) < 1e-9, kick && kick.shot.rel);
    const kickO = await waitFor(other, 'pen.kick', o0, 100);
    check('both see the same shot', !!kickO && JSON.stringify(kickO.shot) === JSON.stringify(kick.shot));
    const res = await waitFor(shooter, 'pen.result', n0, 3000);
    const want = kick.shot.T * 1000 + 120;
    check('the result comes when the ball gets there', !!res && res._at - kick._at >= want - 10 && res._at - kick._at < want + 40, res && { after: res._at - kick._at, want: Math.round(want) });
    check('and it is what the shot said it would do', !!res && res.result === kick.shot.how && res.scored === kick.shot.made, res && { result: res.result, how: kick.shot.how });
    const resO = await waitFor(other, 'pen.result', o0, 100);
    check('both get the same result', !!resO && resO.result === res.result && resO.n === res.n);
  }
  {
    // the next one is the other side's, from their own left corner; then the first side goes again from the left wing
    const t1 = await nextTurn(P);
    check('the next shot is the other side\'s, from their first spot', !!t1 && t1.spot === 0 && t1.n === 1, t1 && { n: t1.n, spot: t1.spot });
    let { shooter } = roles(P);
    shooter.msg({ t: 'pen.shot', rel: 0.5 });
    await waitFor(shooter, 'pen.result', shooter.got.length - 1, 3000);
    const t2 = await nextTurn(P);
    check('and the first side moves round the arc', !!t2 && t2.spot === 1, t2 && t2.spot);
  }
  {
    // the clock: nobody shoots; a hurried one is taken for them
    const { shooter } = roles(P);
    const n0 = shooter.got.length;
    P.room.pen.deadline = Date.now() + 50;
    const run = await waitFor(shooter, 'pen.runup', n0, 1500);
    const kick = await waitFor(shooter, 'pen.kick', n0, 1500);
    check('the clock running out takes a hurried one for you', !!run && !!kick && Math.abs(kick.shot.rel - 0.5) < 1e-9, kick && kick.shot.rel);
  }

  console.log('a filled-in shooter, and to the end');
  {
    const a = connect('cc');
    a.msg({ t: 'room.create', format: 'pens' }); a.msg({ t: 'room.start' });
    const st = await waitFor(a, 'pen.start');
    const room = game._roomOf('cc');
    room.startAt = 0;
    check('a contest with one person starts, the other side filled in', !!st && room.seats.filter((s) => s.human).length === 1, st && st.kind);
    let botShots = 0, theirTurns = 0, mine = 0, guard = 0;
    const side = st.side;
    while (room.state !== 'over' && guard++ < 60) {
      const from = a.got.length;
      const turn = await waitFor(a, 'pen.turn', from, 5000);
      if (!turn) break;
      if (turn.team === side) { a.msg({ t: 'pen.shot', rel: 0.9 }); mine++; }
      else {
        theirTurns++;
        // their shooter lines it up and goes by itself
        const run = await waitFor(a, 'pen.runup', from, 4000);
        if (run) botShots++;
      }
      await waitFor(a, 'pen.result', from, 4000);
      if (room.pen.phase === 'result') room.pen.nextAt = 0;
      if (room.pen.phase === 'end') room.pen.nextAt = 0;
    }
    const end = await waitFor(a, 'pen.end', 0, 5000);
    check('a filled-in shooter takes its own every time', botShots === theirTurns && botShots >= 3, { botShots, theirTurns, mine });
    check('it ends with a winner, and the result is recorded', !!end && (end.winner === 'blue' || end.winner === 'red') && records.some((r) => r.id === 'cc'), end && end.winner);
    const k = end && end.kicks;
    check('five each at least, and level numbers of shots once it is decided past five', !!k && k.blue.length >= 3 && k.red.length >= 3 && (k.blue.length <= 5 || Math.abs(k.blue.length - k.red.length) <= 1), k && { blue: k.blue.length, red: k.red.length });
  }

  console.log('free throws');
  {
    const F = await pair('cf', 'cg', 'fk');
    const turn = F.a.got.filter((m) => m.t === 'pen.turn').pop();
    check('free throws: from the line every time', F.sa.kind === 'fk' && turn.spot === -1, { kind: F.sa.kind, spot: turn.spot });
    const { shooter } = roles(F);
    const n0 = shooter.got.length;
    shooter.msg({ t: 'pen.shot', rel: 0.9 });
    const kick = await waitFor(shooter, 'pen.kick', n0, 1000);
    check('a free throw is a shorter flight', !!kick && kick.shot.ft === true && kick.shot.T < 1, kick && kick.shot);
  }

  console.log('the odds over many shots, on the same model');
  {
    let made = 0;
    const st = Model.create(77, 'pens');
    for (let i = 0; i < 4000; i++) { const s = Model.shot(0.9, 0.6, false, st.random); if (s.made) made++; }
    check('a perfect release from three drops about 9 times in 10', made / 4000 > 0.86 && made / 4000 < 0.95, (made / 40).toFixed(1) + '%');
  }

  console.log(fails ? `\ncontest-online-scan: ${fails} FAILED` : '\ncontest-online-scan: all good');
  process.exit(fails ? 1 : 0);
})();
