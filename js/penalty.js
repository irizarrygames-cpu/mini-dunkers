// THE 3-POINT CONTEST and FREE THROWS: the shootout modes. Five shots each, taking turns, then one
// each until one makes it and the other does not. In the 3-point contest your five go round the arc,
// corner to corner (sudden death carries on round it); free throws are all from the line.
//
// A shot is all in the release: hold SHOOT, the meter fills, let go in the green at the top. The meter
// fills at a slightly different speed every shot, so it is your timing, not your memory. It is drawn
// from behind the shooter, looking at the hoop; the camera goes round the arc with you.
//
// PEN is the shot in plain numbers, the same as server/pens.js (tools/contestscan.js checks they
// agree and measures how often each kind of release drops).
const PEN = {
  Z: { GOOD: 0.68, PERFECT: 0.84, TOP: 0.98, LATE: 1.2 },
  SPOTS: 5,
  // where the five spots are round the arc (radians from straight on), and how far out (metres from
  // the middle of the rim): a three is 6.75, a free throw 4.23
  ANGLES: [-1.25, -0.66, 0, 0.66, 1.25], R3: 6.75, RFT: 4.23,
  // seconds for the meter to fill: a little different every shot
  fillT(r = Math.random) { return 0.78 + r() * 0.3; },
  zone(rel) { const Z = this.Z; return rel < Z.GOOD ? 'early' : rel < Z.PERFECT ? 'good' : rel <= Z.TOP ? 'perfect' : 'late'; },
  // how likely a release this good is to drop. q: the shooter's touch 0..1 (helps a three a little)
  chance(rel, q, ft) {
    const Z = this.Z;
    if (rel >= Z.PERFECT && rel <= Z.TOP) return ft ? 0.96 : 0.84 + q * 0.08;
    if (rel >= Z.GOOD && rel < Z.PERFECT) { const u = (rel - Z.GOOD) / (Z.PERFECT - Z.GOOD); return ft ? lerp(0.62, 0.88, u) : lerp(0.3, 0.6, u) + q * 0.06; }
    if (rel < Z.GOOD) { const u = clamp(rel / Z.GOOD, 0, 1); return ft ? lerp(0.12, 0.5, u) : lerp(0.03, 0.22, u); }
    return ft ? 0.45 : 0.24;
  },
  // what the ball does: early falls short, late goes long, a perfect one is usually all net
  how(rel, made, r) {
    const Z = this.Z, perfect = rel >= Z.PERFECT && rel <= Z.TOP;
    if (made) return perfect ? (r < 0.72 ? 'swish' : r < 0.9 ? 'rimIn' : 'boardIn') : (r < 0.3 ? 'swish' : r < 0.72 ? 'rimIn' : 'boardIn');
    if (rel < 0.35) return 'air';
    if (rel < Z.GOOD) return r < 0.7 ? 'short' : 'rimOut';
    if (rel > Z.TOP) return r < 0.65 ? 'long' : 'rimOut';
    return r < 0.6 ? 'rimOut' : r < 0.85 ? 'short' : 'long';
  },
  shot(rel, q, ft, r = Math.random) {
    rel = clamp(Number.isFinite(rel) ? rel : 0.5, 0, this.Z.LATE);
    const made = r() < this.chance(rel, clamp(q, 0, 1), ft);
    return { rel, made, how: this.how(rel, made, r()), T: ft ? 0.9 : 1.05, ft: !!ft };
  },
  // a computer-controlled shooter's release: `perfect` of them in the green, most of the rest close
  botRel(perfect, r = Math.random) {
    const Z = this.Z, a = r();
    if (a < perfect) return lerp(Z.PERFECT + 0.01, Z.TOP - 0.01, r());
    if (a < perfect + (1 - perfect) * 0.65) return lerp(Z.GOOD, Z.PERFECT, r());
    return r() < 0.6 ? lerp(0.4, Z.GOOD, r()) : lerp(Z.TOP, 1.12, r());
  },
  // who has won, if anyone yet: five each, stopping early when one side cannot catch up, then one
  // each until one makes it and the other does not
  decided(kicks) {
    const b = kicks.blue, r = kicks.red, gb = b.filter(Boolean).length, gr = r.filter(Boolean).length;
    if (b.length < 5 || r.length < 5) {
      if (gb + (5 - b.length) < gr) return 'red';
      if (gr + (5 - r.length) < gb) return 'blue';
      return null;
    }
    if (b.length === r.length && gb !== gr) return gb > gr ? 'blue' : 'red';
    return null;
  },
};

// perfect: how often their shooter lets go in the green; q: their touch
const PEN_LEVELS = {
  easy: { perfect: 0.28, q: 0.3 },
  normal: { perfect: 0.42, q: 0.45 },
  hard: { perfect: 0.56, q: 0.6 },
};
const PEN_SAY = {
  swish: [tl('SWISH!'), '#ffe14d'], rimIn: [tl('BUCKET!'), '#ffe14d'], boardIn: [tl('OFF THE GLASS!'), '#ffe14d'],
  rimOut: [tl('IN AND OUT!'), '#ffffff'], short: [tl('SHORT!'), '#ffffff'], long: [tl('OFF THE BACK RIM!'), '#ffffff'], air: [tl('AIRBALL!'), '#ff8a8e'],
};
// the hoop and the ball at the game's own sizes (twice real, as in a match): rim radius and height,
// the board's face (behind the rim), its width and height, the ball's radius
const PEN_HOOP = { R: 0.4, Z: 3.05, BOARD: -0.62, BOARD_W: 2.6, BOARD_H: 1.5, BALL: 0.2 };
const PEN_SPOT_NAMES = [tl('LEFT CORNER'), tl('LEFT WING'), tl('TOP OF THE KEY'), tl('RIGHT WING'), tl('RIGHT CORNER')];
const PEN_ZONE_SAY = { early: [tl('EARLY'), '#ff8a8e'], good: [tl('GOOD'), '#ffe14d'], perfect: [tl('PERFECT!'), '#3fe07a'], late: [tl('LATE'), '#ff8a8e'] };

const Pens = {
  // ---------- setup ----------
  // fk: free throws rather than the 3-point contest
  init(m, fk = false) {
    const lvl = PEN_LEVELS[Save.data.settings.difficulty] || PEN_LEVELS.normal, cl = m.club.level || 0;
    const ch = Save.character();
    const rng = mulberry32((Math.random() * 1e9) | 0);
    const takerLook = () => { const bc = pickBotCharacter(rng); return { hair: bc.hair, hairColor: bc.hairColor, skin: bc.skin, cap: bc.cap, band: bc.band, acc: null }; };
    m.mode = 'pens'; m.format = 'pens'; m.phase = 'play'; m.challenges = null;
    m.pens = {
      bot: { perfect: clamp(lvl.perfect + cl * 0.02, 0, 0.8), q: clamp(lvl.q + cl * 0.03, 0, 0.95) },
      q: clamp(((ch.r && ch.r.sht) || 70) - 50, 0, 50) / 50 * 0.9 + 0.1,
      kicks: { blue: [], red: [] }, first: Math.random() < 0.5 ? 'blue' : 'red',
      fk: !!fk, n: 0, team: null, phase: 'start', t: 0, winner: null, spot: 0,
      saves: 0, theirSaves: 0, swishes: { blue: 0, red: 0 },
      meter: 0, fill: 1, holding: false, holdInputSeen: false, holdT: 0, clock: 0, rel: null, botRel: 0, zoneSay: null,
      shot: null, result: null, say: null, cheerT: 0, shake: 0, net: false,
      takers: [0, 1, 2, 3, 4].map((i) => ({ look: takerLook(), number: [9, 7, 11, 8, 10][i] })),
      you: this.actor('blue', m.human.look, 10), them: null,
    };
    m.human.celebKind = null;
    m.score = { blue: 0, red: 0 };
    this.next(m, true);
  },

  // something the sprite code can draw
  actor(team, look, number) {
    return { team, isKeeper: false, look, number, vx: 0, vy: 0, fx: 0, fy: -1, faceX: 0.001, kickT: 0, kickDur: 0.22,
      celebrateT: 0, celebKind: null, diveT: 0, diveDir: 0, stunT: 0, recoverT: 0, seed: Math.random() * 10, runPhase: 0, sad: false,
      slideT: 0, slideWindT: 0, fallT: 0, hopT: 0, skill: null, ultOn: false, ultShot: null, sprintOn: false, speed: 0,
      hasBall: true, charging: false, shootT: 0, blockT: 0, z: 0, dunk: null, dribble: 0 };
  },
  // (the online and the old code's names for things that no longer exist: nothing to do)
  setWall() {},
  mouseAim() {},

  // the next shot (or the end)
  next(m, first) {
    const P = m.pens;
    if (!first) {
      if (P.chal) { if (P.chal.kicks >= P.chal.total) { SkillRun.finishShots(m); return; } }
      else {
        P.winner = PEN.decided(P.kicks);
        if (P.winner) { P.phase = 'end'; P.t = 0; this.label(tl('SHOOT')); if (P.winner === 'blue') { Sound.cheer(true); Sound.goalJingle(true); } else Sound.ooh(); return; }
      }
      P.n++;
    }
    const other = P.first === 'blue' ? 'red' : 'blue';
    P.team = P.chal ? 'blue' : P.n % 2 === 0 ? P.first : other;
    P.spot = this.spotFor(P, P.team);
    this.resetShot(P);
    P.clock = 10; P.fill = PEN.fillT();
    const taker = P.team === 'blue' ? P.you : (P.them = this.actor('red', P.takers[Math.floor(P.n / 2) % 5].look, P.takers[Math.floor(P.n / 2) % 5].number));
    this.freshTaker(taker);
    P.runup = rand(0.8, 1.3); P.botRel = PEN.botRel(P.bot.perfect);
    P.phase = first ? 'start' : 'ready';
    this.label(tl('SHOOT'));
    this.flushInput();
  },
  spotFor(P, team) {
    if (P.fk) return -1;
    const n = P.chal ? P.chal.kicks : P.kicks[team].length;
    return n % PEN.SPOTS;
  },
  resetShot(P) {
    P.t = 0; P.shot = null; P.result = null; P.say = null; P.meter = 0; P.holding = false; P.holdInputSeen = false; P.holdT = 0; P.rel = null; P.zoneSay = null;
  },
  freshTaker(a) {
    Object.assign(a, { celebrateT: 0, celebKind: null, sad: false, kickT: 0, fy: -1, fx: 0, faceX: 0.001, vx: 0, vy: 0, hasBall: true, charging: false, shootT: 0, z: 0, blockT: 0 });
  },

  fit(text, room) { return text.length > room ? room / text.length : 1; }, // a long name should not run off the sides
  // (the SHOOT button says JUMP on defence in a match: never here)
  label(text) { const b = typeof document !== 'undefined' && document.getElementById('btn-shoot'); if (!b) return; b.classList.remove('jump'); const l = b.querySelector('.l-shoot') || b.querySelector('.label'); if (l && l.textContent !== text) l.textContent = text; },
  taker(P) { return P.team === 'blue' ? P.you : P.them; },
  sudden(P) { return !P.chal && P.n >= 10; },

  // ---------- the game ----------
  step(m, dt) {
    const P = m.pens;
    if (P.net) return this.netStep(m, dt);
    P.t += dt;
    this.tick(P, dt);
    switch (P.phase) {
      case 'start':
      case 'ready':
        if (P.t >= (P.n === 0 && P.phase === 'start' ? 1.6 : 1.1)) { P.phase = P.team === 'blue' ? 'aim' : 'runup'; P.t = 0; Sound.whistle(); this.flushInput(); }
        break;

      case 'aim': {
        // your shot: hold SHOOT, the meter fills, let go
        const rel = this.holdMeter(P, dt);
        P.clock -= dt;
        if (rel === null && P.clock <= 0 && !P.holding) this.release(m, 0.5);
        else if (rel !== null) this.release(m, rel);
        break;
      }

      case 'runup': {
        // theirs: they line it up, then the meter fills to where they let go
        this.flushInput();
        const a = P.them;
        if (P.t < P.runup) { a.charging = false; a.dribble = P.t * 9; break; }
        a.charging = true;
        P.meter = (P.t - P.runup) / P.fill;
        if (P.meter >= P.botRel) { P.meter = P.botRel; this.release(m, P.botRel); }
        break;
      }

      case 'rise':
        // up into the jump; the ball goes at the top of it
        if (P.t >= 0.22) this.strike(m);
        break;

      case 'flight':
        if (P.t >= P.shot.T) this.resolve(m);
        break;

      case 'after':
        if (P.t >= 2.1) this.next(m, false);
        break;

      case 'end':
        if (P.t >= 2.6 && m.phase !== 'over' && !P.chal) this.finish(m);
        break;
    }
  },

  tick(P, dt) {
    P.cheerT = Math.max(0, P.cheerT - dt);
    P.shake = Math.max(0, P.shake - dt);
    for (const a of [P.you, P.them]) if (a) { a.kickT = Math.max(0, a.kickT - dt); a.celebrateT = Math.max(0, a.celebrateT - dt); a.shootT = Math.max(0, a.shootT - dt); a.dribble += dt * 9; }
  },

  // Holding SHOOT fills the meter; letting go (or holding far too long) gives back how full it was.
  // Both the queued edge and the live held state count: browsers can drop a pointer edge when focus
  // changes, which used to leave SHOOT held on screen while nothing charged.
  holdMeter(P, dt) {
    const press = Input.consumeShootPress();
    if ((press || Input.shootHeld) && !P.holding) {
      P.holding = true; P.holdInputSeen = !!Input.shootHeld; P.holdT = 0; Sound.chargeStart();
      const a = this.taker(P); if (a) a.charging = true;
    }
    let release = Input.consumeShootRelease();
    if (!P.holding) return null;
    if (Input.shootHeld) P.holdInputSeen = true;
    if (P.holdInputSeen && !Input.shootHeld) release = true;
    P.holdT += dt; P.meter = P.holdT / P.fill;
    if (P.meter >= PEN.Z.LATE) { P.meter = PEN.Z.LATE; release = true; }
    if (!release) return null;
    P.holding = false; P.holdInputSeen = false; Sound.chargeStop();
    return P.meter;
  },

  flushInput() { Input.consumeShootPress(); Input.consumeShootRelease(); Input.consumeSkill(); Input.consumeSlide(); Input.consumePass(); if (Input.consumePassPress) Input.consumePassPress(); },

  // the ball is let go of (offline: decided here)
  release(m, rel) {
    const P = m.pens, a = this.taker(P);
    P.rel = rel; P.meter = rel; P.zoneSay = PEN_ZONE_SAY[PEN.zone(rel)];
    const q = P.team === 'blue' ? P.q : P.bot.q;
    P.shot = PEN.shot(rel, q, P.fk);
    a.charging = true;
    P.phase = 'rise'; P.t = 0;
  },
  strike(m) {
    const P = m.pens, a = this.taker(P);
    a.charging = false; a.hasBall = false; a.shootT = 0.6; a.kickT = 0;
    Sound.shoot(0.6);
    P.phase = 'flight'; P.t = 0;
  },

  resolve(m) {
    const P = m.pens, s = P.shot, taker = this.taker(P);
    const res = s.how, scored = !!s.made;
    P.result = res; P.say = PEN_SAY[res];
    if (P.chal) SkillRun.scoreShot(m, s);
    else {
      P.kicks[P.team].push(scored);
      m.score = { blue: P.kicks.blue.filter(Boolean).length, red: P.kicks.red.filter(Boolean).length };
      if (res === 'swish') P.swishes[P.team]++;
    }
    if (P.team === 'blue') { m.human.stats.shots++; m.stats.blue.shots++; if (scored) m.human.stats.goals++; }
    else m.stats.red.shots++;
    this.react(P, taker, res, scored);
  },
  // the sound, the shooter, the crowd
  react(P, taker, res, scored) {
    if (res === 'swish') Sound.swish(); else if (res === 'boardIn' || res === 'long') { Sound.backboard(); if (scored) Sound.swish(); }
    else if (res !== 'air') { Sound.rim(); if (scored) Sound.swish(); }
    if (scored) { taker.celebrateT = CELE_TIME; taker.celebKind = P.team === 'blue' && !P.watch ? Save.celebration() : null; taker.fy = -1; }
    else taker.sad = true;
    const good = (scored && P.team === 'blue') || (!scored && P.team === 'red');
    if (good) { Sound.cheer(true); P.cheerT = 1.8; } else Sound.ooh();
    P.shake = res === 'rimOut' || res === 'long' ? 0.18 : scored ? 0.12 : 0;
    P.phase = 'after'; P.t = 0;
  },

  finish(m) {
    const P = m.pens, won = P.winner === 'blue';
    const mult = COIN_MULT[Save.data.settings.difficulty] || 1;
    const scored = m.score.blue;
    const coins = Math.round((20 + scored * 8 + P.swishes.blue * 4 + (won ? 50 : 0)) * mult);
    const mvp = won ? m.human : (m.players.find((p) => p.team === 'red') || m.human);
    m.result = { outcome: won ? 'win' : 'loss', mvp, coins, base: coins, challengeCoins: 0, cupBonus: 0, mult };
    m.phase = 'over';
    this.label(tl('SHOOT'));
    if (!Game.headless) UI.showResults(m);
  },

  xp(m) { const P = m.pens; return 30 + m.score.blue * 15 + P.swishes.blue * 5 + (P.winner === 'blue' ? 50 : 0); },

  // ---------- server-authoritative online contest ----------
  // A shot online, as it happens:
  //   pen.turn    whose shot it is, and from where. Everyone back to their places.
  //   you shoot:  hold, let go. You go up at once, here; the server is told (pen.shot).
  //   pen.runup   the shooter has gone up (a filled-in shooter, or the clock ran out for you).
  //   pen.kick    the ball has left the hand: what it will do.
  //   pen.result  what happened. It shows when the ball gets there.
  // Nothing waits for the other player.
  netTeam(P, team) { return team === P.serverSide ? 'blue' : 'red'; },
  netTurn(m, msg) {
    const P = m.pens; P.team = this.netTeam(P, msg.team); P.n = msg.n; P.phase = 'ready'; P.t = 0;
    // the server's deadline as time left on this device (its clock may not agree with the server's)
    const left = Number.isFinite(msg.in) ? msg.in : msg.deadline - Date.now();
    P.netDeadline = Date.now() + Math.max(0, Math.min(10000, left)); P.clock = Math.max(0, (P.netDeadline - Date.now()) / 1000);
    this.resetShot(P);
    P.netSent = false; P.netShot = null; P.netResultData = null; P.fill = PEN.fillT(); P.theirGo = 0;
    P.kicks = P.serverSide === 'blue' ? { blue: [...msg.kicks.blue], red: [...msg.kicks.red] } : { blue: [...msg.kicks.red], red: [...msg.kicks.blue] };
    m.score = P.serverSide === 'blue' ? { ...msg.score } : { blue: msg.score.red, red: msg.score.blue };
    P.spot = P.fk ? -1 : Number.isFinite(msg.spot) ? msg.spot : this.spotFor(P, P.team);
    if (P.team === 'red') P.them = this.actor('red', P.takers[Math.floor(msg.n / 2) % 5].look, P.takers[Math.floor(msg.n / 2) % 5].number);
    this.freshTaker(this.taker(P));
    this.label(P.watch ? tl('WATCHING') : tl('SHOOT')); this.flushInput(); if (Game.state === 'intro') { $('intro').hidden = true; Game.state = 'match'; }
  },
  // joined part-way through a shot (back after a dropped connection, or come to watch)
  netCatchUp(P, team, n) {
    P.team = this.netTeam(P, team); P.n = n;
    if (P.team === 'red' && !P.them) P.them = this.actor('red', P.takers[Math.floor(n / 2) % 5].look, P.takers[Math.floor(n / 2) % 5].number);
    if (Game.state === 'intro') { $('intro').hidden = true; Game.state = 'match'; }
  },
  // the shooter has gone up
  netRunup(m, msg) {
    const P = m.pens;
    if (P.phase === 'wait' && !P.netShot) this.netCatchUp(P, msg.team, msg.n);
    if (msg.n !== P.n || P.netShot) return;
    if (P.team === 'blue' && !P.watch) {
      // your shot, taken for you (the clock ran out before you let go)
      if (P.phase === 'aim' || P.phase === 'ready' || P.phase === 'wait') { if (P.holding) Sound.chargeStop(); P.holding = false; P.netSent = true; P.rel = 0.5; P.phase = 'rise'; P.t = 0; }
      return;
    }
    if (P.phase === 'ready' || P.phase === 'idle' || P.phase === 'wait') { P.phase = 'theirs'; P.t = 0; P.theirGo = clamp((Number(msg.ms) || 300) / 1000, 0.15, 1.5); const a = this.taker(P); if (a) a.charging = true; }
  },
  // the ball has left the hand
  netKick(m, msg) {
    const P = m.pens;
    if (P.phase === 'wait' && !P.netShot) this.netCatchUp(P, msg.team, msg.n);
    if (msg.n !== P.n || P.netShot || !msg.shot) return;
    P.netShot = msg.shot;
    if (P.team === 'red' || P.watch) { P.rel = msg.shot.rel; P.meter = msg.shot.rel; P.zoneSay = PEN_ZONE_SAY[PEN.zone(msg.shot.rel)]; }
    // your own jump finishes first (netStep lets go at the top of it); done already, it goes now
    if (P.phase !== 'rise' || P.t >= 0.22) this.netStrike(m);
  },
  netStrike(m) {
    const P = m.pens, a = this.taker(P);
    P.shot = P.netShot; P.phase = 'flight'; P.t = 0;
    a.charging = false; a.hasBall = false; a.shootT = 0.6; Sound.shoot(0.6);
  },
  netResult(m, msg) {
    const P = m.pens;
    // a result for a shot this screen never saw start (back after a dropped connection): play it all
    if (!P.netShot || msg.n - 1 !== P.n) { this.netCatchUp(P, msg.team, msg.n - 1); P.netShot = msg.shot; P.phase = 'wait'; }
    P.netResultData = msg;
    if (P.phase !== 'flight' && P.phase !== 'rise' && P.phase !== 'after') this.netStrike(m);
  },
  netApply(m) {
    const P = m.pens, r = P.netResultData, taker = this.taker(P);
    P.result = r.result; P.say = PEN_SAY[r.result] || PEN_SAY.rimOut;
    P.kicks = P.serverSide === 'blue' ? { blue: [...r.kicks.blue], red: [...r.kicks.red] } : { blue: [...r.kicks.red], red: [...r.kicks.blue] };
    m.score = P.serverSide === 'blue' ? { ...r.score } : { blue: r.score.red, red: r.score.blue };
    if (r.result === 'swish') P.swishes[P.team]++;
    if (P.team === 'blue') { m.human.stats.shots++; m.stats.blue.shots++; if (r.scored) m.human.stats.goals++; }
    P.netResultData = null;
    this.react(P, taker, r.result, !!r.scored);
  },
  // your shot: hold, let go (the same meter as offline)
  netAim(m, dt) {
    const P = m.pens;
    const rel = this.holdMeter(P, dt);
    P.clock = Math.max(0, (P.netDeadline - Date.now()) / 1000);
    const go = rel !== null ? rel : P.clock <= 0 && !P.holding ? 0.5 : null;
    if (go !== null && !P.netSent) {
      P.netSent = true; P.rel = go; P.meter = go; P.zoneSay = PEN_ZONE_SAY[PEN.zone(go)];
      Net.send({ t: 'pen.shot', rel: Math.round(go * 1000) / 1000 });
      const a = this.taker(P); a.charging = true;
      P.phase = 'rise'; P.t = 0;   // straight up: nothing waits
    }
  },
  netStep(m, dt) {
    const P = m.pens; P.t += dt; this.tick(P, dt);
    const shooting = P.team === 'blue' && !P.watch;
    switch (P.phase) {
      case 'ready':
        if (P.t > 0.65) { P.phase = shooting ? 'aim' : 'idle'; P.t = 0; Sound.whistle(); this.flushInput(); }
        return;
      case 'aim': this.netAim(m, dt); return;
      case 'rise':
        if (P.t >= 0.22 && P.netShot) this.netStrike(m);
        return;
      case 'idle':
        // they are lining it up
        this.flushInput();
        return;
      case 'theirs':
        // they have gone up: the meter fills to wherever they let go (it shows when pen.kick says)
        this.flushInput();
        P.meter = Math.min(P.netShot ? P.netShot.rel : 1.1, P.t / Math.max(0.2, P.theirGo));
        return;
      case 'flight':
        if (P.t >= P.shot.T && P.netResultData) this.netApply(m);
        return;
    }
  },

  // ---------- the picture ----------
  // A camera behind the shooter, looking at the rim; it goes round the arc with the spot. Everything
  // on the court is in metres: (u, v) on the floor with the middle of the rim at 0 (u out towards
  // half-way, v across), z up. view() turns that into the screen.
  layout(W, H, fk = false) {
    const L = this._lay;
    if (L && L.W === W && L.H === H && L.fk === fk) return L;
    const portrait = W < H;
    // the focal length and the horizon, so the backboard's top and the shooter's feet both fit
    const f = portrait ? Math.min(W * 1.5, H * 0.8) : H * 1.12;
    const y0 = portrait ? H * 0.4 : H * 0.35;
    const lay = { W, H, fk, f, y0, camH: 2.6, back: 5.2, side: -0.9, cx: W / 2, crowd: null, corner: null };
    // the far end: where the stand meets the floor (the same for every spot: it is a long way off)
    lay.standY = y0 + lay.camH * f / ((fk ? PEN.RFT : PEN.R3) + lay.back + 4.2);
    lay.sky = Math.min(lay.standY * 0.34, H * 0.2); lay.roofH = Math.max(6, lay.standY * 0.045);
    lay.board = Math.max(14, (H - lay.standY) * 0.06);
    // the pause button lives in the top corner over the canvas: remember where, so the scorecard
    // can keep out of its way on a narrow screen
    const pauseEl = typeof $ === 'function' ? $('btn-pause') : null;
    if (pauseEl && !pauseEl.hidden) {
      const r = pauseEl.getBoundingClientRect();
      if (r.width > 1 && r.height > 1) lay.corner = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }
    // the crowd behind the hoop, placed once per screen size
    const rng = mulberry32(7), crowd = [];
    const rowH = Math.max(10, H * 0.03), top = lay.standY - lay.board;
    for (let y = top - rowH * 0.3, row = 0; y > lay.sky + lay.roofH; y -= rowH * 0.78, row++) {
      const size = rowH * Math.max(0.3, 0.5 - row * 0.012);
      for (let x = (row % 2) * size * 0.6 - size; x < W + size; x += size * 1.25 + rng() * size * 0.5) crowd.push({ x, y, size: Math.max(4, size), c: (rng() * 8) | 0, skin: (rng() * 4) | 0, ph: rng() * 6 });
    }
    lay.crowd = crowd;
    this._lay = lay;
    return lay;
  },
  // the camera for a spot: where it stands and which way it looks
  cam(L, spot) {
    const th = spot < 0 ? 0 : PEN.ANGLES[spot], R = spot < 0 ? PEN.RFT : PEN.R3;
    const c = Math.cos(th), s = Math.sin(th), D = R + L.back;
    return { th, R, cu: D * c, cv: D * s, fu: -c, fv: -s, ru: -s, rv: c };
  },
  // court metres -> screen. Behind the camera gives null.
  view(L, C, u, v, z) {
    const du = u - C.cu, dv = v - C.cv;
    const Y = du * C.fu + dv * C.fv, X = du * C.ru + dv * C.rv;
    if (Y < 0.4) return null;
    const k = L.f / Y;
    return { x: L.cx + X * k, y: L.y0 - (z - L.camH) * k, k };
  },
  // where the shooter stands, and so where the ball leaves from (a little to the left of the camera's line)
  shooterAt(L, C) { const D = C.R; return { u: D * Math.cos(C.th) + L.side * C.ru, v: D * Math.sin(C.th) + L.side * C.rv }; },

  draw(m, dt, t) {
    const ctx = Render.ctx, W = Render.W, H = Render.H, P = m.pens, L = this.layout(W, H, !!P.fk);
    ctx.setTransform(Render.dpr, 0, 0, Render.dpr, 0, 0);
    const shake = P.shake > 0 ? P.shake * 14 : 0;
    ctx.save();
    if (shake) ctx.translate(rand(-shake, shake), rand(-shake, shake));
    const bg = this.backdrop(L);
    ctx.drawImage(bg, 0, 0, W, H);
    if (P.cheerT > 0) { const hop = Math.abs(Math.sin(t * 10)) * H * 0.008, ch = L.standY - L.board; ctx.drawImage(bg, 0, 0, bg.width, ch * (bg.height / H), 0, -hop, W, ch); }
    const C = this.cam(L, P.spot);
    this.drawFloor(ctx, L, C);
    const ball = this.ballPos(L, C, P, t);
    // the ball is behind the hoop when it is past the rim's plane and dropping through or behind it
    const hoopBack = this.drawHoop(ctx, L, C, P, t, ball);
    if (ball && ball.behind) this.drawBall(ctx, ball, t);
    hoopBack();
    this.drawTaker(ctx, L, C, P, t);
    if (ball && !ball.behind) this.drawBall(ctx, ball, t);
    ctx.restore();
    Render.drawWeather(ctx, t, { W, H, S: Render.S, st: Save.stadium(), seasonOnly: true, px: () => -999, py: () => -999, k: () => 1 });
    this.drawOverlay(ctx, L, C, P, t);
  },

  backdrop(L) {
    const st = Save.stadium(), dpr = Render.dpr;
    const key = [st.id, st.season || '', TEAMS.blue.jersey, TEAMS.red.jersey, dpr, document.fonts ? document.fonts.status : ''].join('|');
    if (L.bg && L.bgKey === key) return L.bg;
    const c = document.createElement('canvas');
    c.width = Math.ceil(L.W * dpr); c.height = Math.ceil(L.H * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawStands(g, L, { cheerT: 0 }, 0);
    // the floor, in the court's own wood
    const cs = Render.courtStyle(st);
    g.fillStyle = cs.floor; g.fillRect(0, L.standY, L.W, L.H - L.standY);
    // boards (or the painted court's bands) that get wider as they come nearer
    g.fillStyle = cs.wood ? cs.plank : shadeHex(cs.floor, -0.05);
    let y = L.standY, h = Math.max(3, (L.H - L.standY) * 0.025), i = 0;
    while (y < L.H) { if (i % 2) g.fillRect(0, y, L.W, h); y += h; h *= 1.12; i++; }
    L.bg = c; L.bgKey = key;
    return c;
  },

  drawStands(ctx, L, P, t) {
    const st = Save.stadium();
    const sky = L.sky, roofY = sky, roofH = L.roofH, standY = L.standY;
    ctx.fillStyle = st.sky ? st.sky[1] : '#a8dcff'; ctx.fillRect(0, 0, L.W, sky);
    ctx.fillStyle = st.sky ? st.sky[0] : '#6fc2ff'; ctx.fillRect(0, 0, L.W, sky * 0.5);
    const rs = mulberry32(11);
    if (st.stars) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) { const r = 1 + rs() * 1.6; ctx.fillRect(rs() * L.W, rs() * sky * 0.8, r, r); }
    } else if (st.kind === 'dusk') {
      ctx.fillStyle = '#ffd86a'; ctx.beginPath(); ctx.arc(L.W * 0.78, sky * 0.4, sky * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 3; i++) {
        const cx = L.W * (0.12 + i * 0.33), cy = sky * (0.26 + (i % 2) * 0.16), r = sky * 0.11;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.arc(cx + r, cy + r * 0.2, r * 0.8, 0, Math.PI * 2); ctx.arc(cx - r, cy + r * 0.2, r * 0.7, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (typeof drawSkyline === 'function') drawSkyline(ctx, st, -L.W * 0.04, L.W * 1.04, sky + 1, sky * 0.78);
    ctx.fillStyle = st.stands[0]; ctx.fillRect(0, roofY, L.W, standY - roofY);
    ctx.fillStyle = st.roof || st.stands[1]; ctx.fillRect(0, roofY, L.W, roofH);
    ctx.fillStyle = st.trim || '#ffe14d'; ctx.fillRect(0, roofY + roofH - Math.max(2, roofH * 0.22), L.W, Math.max(2, roofH * 0.22));
    ctx.fillStyle = OUTLINE; ctx.fillRect(0, roofY - 3, L.W, 3); ctx.fillRect(0, roofY + roofH, L.W, 3);
    if (st.lights) {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        const lx = L.W * (0.14 + i * 0.24), lw = L.W * 0.07, lh = roofH * 1.1;
        ctx.fillStyle = '#39406a'; ctx.fillRect(lx - lw / 2, roofY - lh, lw, lh); ctx.strokeRect(lx - lw / 2, roofY - lh, lw, lh);
        ctx.fillStyle = '#fff6c8';
        for (let q = 0; q < 3; q++) ctx.fillRect(lx - lw / 2 + lw * (0.12 + q * 0.3), roofY - lh * 0.72, lw * 0.18, lh * 0.45);
      }
    }
    const cols = [TEAMS.blue.jersey, TEAMS.red.jersey, '#ffffff', '#ffe14d', TEAMS.blue.jersey, '#ff8a1f', TEAMS.red.jersey, '#46d9ff'];
    const skins = ['#f2c29b', '#d99a6c', '#a86b43', '#6b4228'];
    const jump = P.cheerT > 0 ? 1 : 0;
    const tf = this.tifo(L);
    for (const f of L.crowd) {
      const hop = jump ? Math.abs(Math.sin(t * 9 + f.ph)) * f.size * 0.5 : Math.sin(t * 2 + f.ph) * f.size * 0.04;
      const y = f.y - hop;
      const card = tf ? this.tifoColor(tf, f.x, f.y) : null;
      if (card) { ctx.fillStyle = card; ctx.fillRect(f.x - f.size * 0.62, y - f.size * 0.42, f.size * 1.24, f.size * 1.24); continue; }
      ctx.fillStyle = cols[f.c]; ctx.fillRect(f.x - f.size * 0.45, y, f.size * 0.9, f.size * 0.9);
      ctx.fillStyle = skins[f.skin]; ctx.beginPath(); ctx.arc(f.x, y - f.size * 0.2, f.size * 0.32, 0, Math.PI * 2); ctx.fill();
      if (jump && f.c % 3 === 0) { ctx.fillStyle = cols[f.c]; ctx.fillRect(f.x - f.size * 0.55, y - f.size * 0.75, f.size * 0.2, f.size * 0.5); }
    }
    // the boards along the baseline: the arena and what its fans sing
    const by = standY - L.board;
    ctx.fillStyle = shadeHex(st.seat || '#1b2a6b', -0.45); ctx.fillRect(0, by, L.W, L.board);
    ctx.fillStyle = OUTLINE; ctx.fillRect(0, by - 3, L.W, 3); ctx.fillRect(0, standY - 3, L.W, 3);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = L.board * 0.5;
    const words = [st.name || 'MINI DUNKERS', st.chant || tl("LET'S GO!")];
    ctx.font = `400 ${fs}px "Lilita One", system-ui, sans-serif`;
    let bx = -((t * 20) % 900);
    for (let i = 0; bx < L.W + 400; i++) {
      const word = words[i % words.length], w = ctx.measureText(word).width;
      ctx.fillStyle = i % 2 ? '#ffffff' : st.trim || '#ffe14d';
      ctx.fillText(word, bx + w / 2, by + L.board / 2 + 1);
      bx += w + fs * 2.2;
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bx - fs * 1.1, by + L.board / 2, fs * 0.18, 0, Math.PI * 2); ctx.fill();
    }
  },

  // the fans in the middle of the stand hold up cards that make the country's flag
  tifo(L) {
    const club = (typeof Clubs !== 'undefined' && (Clubs.home || (Clubs.mine && Clubs.mine()))) || null;
    if (!club || typeof document === 'undefined' || typeof UI === 'undefined' || !UI.flagBadge) return null;
    const key = club.id + '|' + Math.round(L.W) + 'x' + Math.round(L.standY);
    if (this._tifo && this._tifo.key === key) return this._tifo.box;
    let box = null;
    try {
      const cw = 52, ch = 34, cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      UI.flagBadge(cv, club);
      const pix = cv.getContext('2d').getImageData(0, 0, cw, ch).data;
      const standTop = L.sky + L.roofH, standH = L.standY - L.board - standTop;
      const y0 = standTop + standH * 0.16, h = standH * 0.56;
      const pad = L.W * 0.015, mid = L.W * 0.17;
      const blocks = [{ x0: pad, x1: L.W / 2 - mid, y0, y1: y0 + h }, { x0: L.W / 2 + mid, x1: L.W - pad, y0, y1: y0 + h }].filter((b) => b.x1 - b.x0 > L.W * 0.1);
      for (const b of blocks) { b.w = b.x1 - b.x0; b.h = b.y1 - b.y0; }
      box = blocks.length ? { blocks, pix, cw, ch } : null;
    } catch (e) { box = null; }
    this._tifo = { key, box };
    return box;
  },
  tifoColor(tf, x, y) {
    const b = tf.blocks.find((q) => x > q.x0 && x < q.x1 && y > q.y0 && y < q.y1);
    if (!b) return null;
    const px = Math.max(0, Math.min(tf.cw - 1, Math.floor(((x - b.x0) / b.w) * tf.cw)));
    const py = Math.max(0, Math.min(tf.ch - 1, Math.floor(((y - b.y0) / b.h) * tf.ch)));
    const i = (py * tf.cw + px) * 4;
    if (tf.pix[i + 3] < 120) return null;
    return `rgb(${tf.pix[i]},${tf.pix[i + 1]},${tf.pix[i + 2]})`;
  },

  // the lines on the floor for this spot: the baseline, the painted key, the free-throw circle, the arc
  drawFloor(ctx, L, C) {
    const line = (pts, close, fill) => {
      const sp = [];
      for (const [u, v] of pts) { const p = this.view(L, C, u, v, 0); if (p) sp.push(p); }
      if (sp.length < 2) return;
      ctx.beginPath(); sp.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      if (close) ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.stroke();
    };
    const arc = (cu, cv, r, a0, a1, n = 40) => { const out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); out.push([cu + Math.cos(a) * r, cv + Math.sin(a) * r]); } return out; };
    ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = Math.max(2.5, L.H * 0.006); ctx.lineJoin = 'round';
    const BL = -1.575, FT = 4.225;
    // the key, painted
    ctx.globalAlpha = 0.62; line([[BL, -2.45], [FT, -2.45], [FT, 2.45], [BL, 2.45]], true, TEAMS.blue.jersey); ctx.globalAlpha = 1;
    line([[BL, -2.45], [FT, -2.45], [FT, 2.45], [BL, 2.45]], true);
    // the free-throw circle and the baseline
    line(arc(FT, 0, 1.8, -Math.PI / 2, Math.PI / 2));
    line([[BL, -8], [BL, 8]]);
    // the three-point line: straight in the corners, then the arc
    const side = 6.6, meet = Math.sqrt(PEN.R3 * PEN.R3 - side * side);
    const al = Math.asin(side / PEN.R3);
    line([[BL, -side], ...arc(0, 0, PEN.R3, -al, al, 60), [BL, side]]);
    // where you shoot from: a spot on the floor
    const s = this.shooterAt(L, C), p = this.view(L, C, s.u - L.side * C.ru * 0.5, s.v - L.side * C.rv * 0.5, 0);
    if (p) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.5 * p.k, 0.18 * p.k, 0, 0, Math.PI * 2); ctx.fill(); }
  },

  // The hoop: the post and arm, the backboard, the net and the rim. The front of the rim goes over a
  // ball dropping through, so the back is drawn now and the front is handed back to draw later.
  // (Sizes are the game's: HOOP below.)
  drawHoop(ctx, L, C, P, t, ball) {
    const V = (u, v, z) => this.view(L, C, u, v, z), H = PEN_HOOP;
    const lw = (k, w) => Math.max(1.5, k * w);
    // the post behind the baseline and its arm out to the board
    const base = V(-2.8, 0, 0), top = V(-2.8, 0, H.Z + 0.55), arm = V(H.BOARD - 0.1, 0, H.Z + 0.55);
    if (base && top && arm) {
      for (const [col, w] of [[OUTLINE, 0.3], ['#c9d2de', 0.19]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw(top.k, w); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.lineTo(arm.x, arm.y); ctx.stroke();
      }
      const pb = V(-2.8, 0, 1.4);
      if (pb) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = lw(pb.k, 0.58); ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.strokeStyle = TEAMS.blue.jersey; ctx.lineWidth = lw(pb.k, 0.44); ctx.stroke(); }
      ctx.lineCap = 'butt';
    }
    // the backboard: a clear-ish board with the square over the rim
    const quad = (pts, fill, stroke, w) => {
      const sp = pts.map(([u, v, zz]) => V(u, v, zz)); if (sp.some((q) => !q)) return;
      ctx.beginPath(); sp.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.stroke(); }
    };
    const bu = H.BOARD, bw = H.BOARD_W / 2, b0 = H.Z - 0.2, b1 = b0 + H.BOARD_H;
    quad([[bu, -bw, b0], [bu, bw, b0], [bu, bw, b1], [bu, -bw, b1]], 'rgba(235, 246, 255, 0.94)', OUTLINE, 3);
    quad([[bu + 0.01, -bw * 0.33, H.Z + 0.02], [bu + 0.01, bw * 0.33, H.Z + 0.02], [bu + 0.01, bw * 0.33, H.Z + H.BOARD_H * 0.42], [bu + 0.01, -bw * 0.33, H.Z + H.BOARD_H * 0.42]], null, '#ff3a3f', Math.max(2, L.H * 0.005));
    // the rim and the net
    const R = H.R, Z = H.Z, n = 24;
    const made = P.result && P.shot && P.shot.made && P.phase === 'after';
    const swing = made ? Math.sin(P.t * 22) * Math.max(0, 1 - P.t / 0.7) * R * 0.25 : 0;
    const stretch = made ? Math.max(0, 1 - Math.abs(P.t - 0.15) / 0.35) * R * 0.5 : 0;
    const rimPts = [], netPts = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2, cu = Math.cos(ang), cv = Math.sin(ang);
      rimPts.push({ p: V(cu * R, cv * R, Z), near: cu * C.fu + cv * C.fv < 0 });
      netPts.push(V(cu * R * 0.55 + swing, cv * R * 0.55, Z - R * 1.8 - stretch));
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = Math.max(1.4, L.H * 0.003);
    for (let i = 0; i < n; i += 2) {
      const q = rimPts[i].p, b = netPts[(i + 3) % n], c = netPts[(i + n - 3) % n];
      if (!q || !b || !c) continue;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(b.x, b.y); ctx.moveTo(q.x, q.y); ctx.lineTo(c.x, c.y); ctx.stroke();
    }
    ctx.beginPath(); netPts.forEach((q, i) => q && (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); ctx.stroke();
    this.rimArc(ctx, rimPts, false, L);
    // the bracket from the board to the back of the rim
    const k1 = V(bu, 0, Z), k2 = V(-R, 0, Z);
    if (k1 && k2) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(3, L.H * 0.007); ctx.beginPath(); ctx.moveTo(k1.x, k1.y); ctx.lineTo(k2.x, k2.y); ctx.stroke(); }
    return () => this.rimArc(ctx, rimPts, true, L);
  },
  rimArc(ctx, pts, near, L) {
    const w = Math.max(3, L.H * 0.009);
    for (const [col, lw] of [[OUTLINE, w + 2.5], ['#ff6a1f', w]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
      for (let i = 0; i < pts.length; i++) {
        const q = pts[i], b = pts[(i + 1) % pts.length];
        if (!q.p || !b.p || q.near !== near) continue;
        ctx.beginPath(); ctx.moveTo(q.p.x, q.p.y); ctx.lineTo(b.p.x, b.p.y); ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  },

  // The ball in court metres, then on screen: in the shooter's hands, in the air, and what happens at
  // the rim (all net, rattling in, off the glass, in and out, short, long, an airball).
  ballWorld(L, C, P, t) {
    const a = this.taker(P), H = PEN_HOOP, R = H.R, Z = H.Z;
    const s = this.shooterAt(L, C);
    const hand = { u: s.u + C.ru * 0.12, v: s.v + C.rv * 0.12, z: 2.45 };
    if (P.phase === 'end') return null;
    if (!P.shot || P.phase === 'aim' || P.phase === 'ready' || P.phase === 'start' || P.phase === 'runup' || P.phase === 'idle' || P.phase === 'theirs' || P.phase === 'wait' || P.phase === 'rise') {
      if (!a) return null;
      if (a.charging || P.phase === 'rise') {
        const lift = P.phase === 'rise' ? Math.sin(clamp(P.t / 0.22, 0, 1) * Math.PI / 2) * 0.35 : 0;
        return { ...hand, z: 1.95 + lift };
      }
      // dribbling at their side while they line it up
      const b = Math.abs(Math.sin(a.dribble));
      return { u: s.u + C.ru * 0.45 - C.fu * 0.15, v: s.v + C.rv * 0.45 - C.fv * 0.15, z: H.BALL + b * 0.75, low: true };
    }
    const sh = P.shot, rel = { u: hand.u, v: hand.v, z: 2.4 };
    // where it meets the rim (or misses it), by what it does
    const hits = { swish: [0, 0, Z + 0.2], rimIn: [R * 0.8, R * 0.25, Z + 0.15], boardIn: [H.BOARD + H.BALL, R * 0.6, Z + 0.55], rimOut: [R * 0.95, -R * 0.35, Z + 0.15],
      short: [R * 1.25, 0, Z + 0.05], long: [-R * 1.05, 0, Z + 0.2], air: [R + 1.1, 0.1, Z - 0.75] };
    const [hu, hv, hz] = hits[sh.how] || hits.swish;
    if (P.phase === 'flight') {
      const u = clamp(P.t / sh.T, 0, 1), apex = sh.ft ? 3.75 : 3.95;
      const zz = lerp(rel.z, hz, u) + (apex - Math.max(rel.z, hz)) * 4 * u * (1 - u) * (sh.how === 'air' ? 0.75 : 1);
      return { u: lerp(rel.u, hu, u), v: lerp(rel.v, hv, u), z: zz, spin: u * 14 };
    }
    if (P.phase !== 'after') return null;
    const k = P.t;
    const drop = (u0, v0, z0, du, dv, t0) => {
      // fall from (u0, v0, z0), bounce off the floor and roll out towards the camera
      const tt = Math.max(0, k - t0), g = 9.8;
      const tFloor = Math.sqrt((2 * Math.max(0.1, z0 - H.BALL)) / g);
      if (tt < tFloor) return { u: u0 + du * tt, v: v0 + dv * tt, z: z0 - 0.5 * g * tt * tt };
      const b = tt - tFloor, hop = Math.max(0, Math.sin(b * 5.5) * 0.9 * Math.exp(-b * 1.6));
      return { u: u0 + du * tt, v: v0 + dv * tt, z: H.BALL + Math.abs(hop), low: true };
    };
    switch (sh.how) {
      case 'swish': { const w = drop(0, 0, Z + 0.1, 0.9, 0, 0); return { ...w, behind: k < 0.25, spin: 14 + k * 4 }; }
      case 'rimIn': {
        if (k < 0.32) { const h = Math.sin((k / 0.32) * Math.PI) * R * 0.9; return { u: lerp(hu, 0.02, k / 0.32), v: lerp(hv, 0, k / 0.32), z: hz + h, spin: 14 }; }
        const w = drop(0.02, 0, Z + 0.1, 0.8, 0, 0.32); return { ...w, behind: k < 0.55, spin: 16 };
      }
      case 'boardIn': {
        if (k < 0.22) return { u: lerp(hu, 0, k / 0.22), v: lerp(hv, 0, k / 0.22), z: lerp(hz, Z + 0.15, k / 0.22), spin: 14, behind: true };
        const w = drop(0, 0, Z + 0.1, 0.8, 0, 0.22); return { ...w, behind: k < 0.45, spin: 16 };
      }
      case 'rimOut': {
        // round the rim and out to the side
        if (k < 0.35) { const ang = lerp(0.35, 2.6, k / 0.35); return { u: Math.cos(ang) * R, v: -Math.sin(ang) * R, z: Z + 0.15 + Math.sin((k / 0.35) * Math.PI) * 0.3, spin: 16, behind: Math.cos(ang) * C.fu - Math.sin(ang) * C.fv > 0 }; }
        const w = drop(-R * 0.85, -R * 0.5, Z + 0.3, 1.6, -1.6, 0.35); return { ...w, spin: 18 };
      }
      case 'short': {
        const w = drop(hu, hv, hz, 2.4, 0.3, 0);
        return { ...w, z: w.low ? w.z : w.z + Math.max(0, 0.9 * Math.sin(Math.min(1, k / 0.5) * Math.PI)), spin: 18 };
      }
      case 'long': {
        if (k < 0.4) { const f = k / 0.4; return { u: lerp(hu, 1.2, f), v: hv + f * 0.3, z: hz + Math.sin(f * Math.PI) * 1.1 + f * 0.1, spin: 16 }; }
        const w = drop(1.2, 0.3, Z + 0.3, 1.8, 0.4, 0.4); return { ...w, spin: 18 };
      }
      default: { const w = drop(hu, hv, hz, 1.2, 0.1, 0); return { ...w, spin: 12 }; }
    }
  },
  ballPos(L, C, P, t) {
    const w = this.ballWorld(L, C, P, t);
    if (!w) return null;
    const p = this.view(L, C, w.u, w.v, w.z);
    if (!p) return null;
    const g = w.low ? this.view(L, C, w.u, w.v, 0) : null;
    return { x: p.x, y: p.y, r: PEN_HOOP.BALL * p.k, spin: w.spin || 0, behind: !!w.behind, shadow: g };
  },

  drawBall(ctx, bp, t) {
    const b = this._ballObj || (this._ballObj = { x: 0, y: 0, z: 0, vx: 1, vy: 0, roll: 0, shot: null, owner: null, skin: null });
    b.roll = bp.spin || 0;
    if (bp.shadow) {
      ctx.fillStyle = 'rgba(22, 26, 51, 0.32)';
      ctx.beginPath(); ctx.ellipse(bp.shadow.x, bp.shadow.y, bp.r * 0.95, bp.r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    }
    Sprites.ball(ctx, b, bp.x, bp.y, bp.r / CFG.BALL_R, t);
  },

  // the shooter, from behind: dribbling, set with the ball up, up in the jump, the follow-through
  drawTaker(ctx, L, C, P, t) {
    const a = this.taker(P);
    if (!a) return;
    const s = this.shooterAt(L, C), feet = this.view(L, C, s.u, s.v, 0);
    if (!feet) return;
    const k = (1.9 * feet.k) / 70;
    let jump = 0;
    if (P.phase === 'rise') jump = Math.sin(clamp(P.t / 0.22, 0, 1) * Math.PI / 2) * 0.35;
    else if (P.phase === 'flight') jump = Math.max(0, Math.cos(clamp(P.t / 0.3, 0, 1) * Math.PI / 2)) * 0.35;
    a.z = jump > 0.1 ? 20 : 0;
    a.hasBall = !(P.phase === 'flight' || P.phase === 'after' || P.phase === 'end');
    if (P.phase === 'rise') a.charging = true;
    if (a.celebrateT <= 0 && P.phase !== 'after') { a.fy = -1; a.faceX = 0.001; a.fx = 0; }
    a.vx = 0; a.vy = 0;
    Sprites.player(ctx, a, feet.x, feet.y - jump * feet.k, k, t);
  },

  // the tally, the spot, the meter, the call and what to press
  drawOverlay(ctx, L, C, P, t) {
    const W = L.W, H = L.H;
    const boxes = this.boxes = {}; // where each piece landed, for the fit check
    Render.boxes = null;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const chal = !!P.chal;
    const n = Math.max(5, P.kicks.blue.length, P.kicks.red.length), from = Math.max(0, n - 5);
    const dot = clamp(H * 0.02, 7, 11), gap = dot * 2.7, rowH = dot * 2.6;
    const pw = gap * 5 + dot * 7.5, ph = rowH * 2 + dot * 0.8, px = W / 2 - pw / 2;
    let py = 10;
    const corner = L.corner;
    if (corner && px < corner.right + 4 && py < corner.bottom + 4) py = corner.bottom + 6;
    boxes.board = [px, py, px + pw, py + ph];
    if (chal) SkillRun.drawShots(ctx, L, P, t, boxes.board);
    else {
      ctx.fillStyle = OUTLINE; Sprites.rr(ctx, px + 3, py + 4, pw, ph, dot); ctx.fill();
      ctx.fillStyle = '#ffffff'; Sprites.rr(ctx, px, py, pw, ph, dot); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
      ['blue', 'red'].forEach((team, row) => {
        const cy = py + dot * 0.4 + rowH * (row + 0.5);
        const fcv = this.flag(team, dot * 3.2);
        if (fcv) ctx.drawImage(fcv, px + dot * 0.8, cy - dot * 1.07, dot * 3.2, dot * 2.13);
        Render.chunkyText(ctx, String(P.kicks[team].filter(Boolean).length), px + dot * 5.4, cy, dot * 1.9, team === 'blue' ? '#ffffff' : '#ffd0d3', 3);
        for (let i = 0; i < 5; i++) {
          const kk = from + i, v = P.kicks[team][kk], cx = px + dot * 7.6 + gap * i + dot;
          const nextUp = P.phase !== 'end' && P.team === team && kk === P.kicks[team].length;
          ctx.beginPath(); ctx.arc(cx, cy, dot * (nextUp ? 1 + Math.sin(t * 8) * 0.12 : 1), 0, Math.PI * 2);
          ctx.fillStyle = v === true ? '#3fcf4a' : v === false ? '#ff3a3f' : nextUp ? '#ffe14d' : '#e4e7f5';
          ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = OUTLINE; ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, dot * 0.28); ctx.lineCap = 'round';
          if (v === true) { ctx.beginPath(); ctx.moveTo(cx - dot * 0.45, cy); ctx.lineTo(cx - dot * 0.1, cy + dot * 0.38); ctx.lineTo(cx + dot * 0.48, cy - dot * 0.36); ctx.stroke(); }
          if (v === false) { const e = dot * 0.4; ctx.beginPath(); ctx.moveTo(cx - e, cy - e); ctx.lineTo(cx + e, cy + e); ctx.moveTo(cx + e, cy - e); ctx.lineTo(cx - e, cy + e); ctx.stroke(); }
          ctx.lineCap = 'butt';
        }
      });
    }
    const big = clamp(Math.min(W, H) * 0.11, 30, 76);
    const sub = clamp(big * 0.42, 14, 30);
    let cy = py + ph + sub * 1.1;
    // where this one is from
    const spotName = P.fk ? tl('FREE THROW') : PEN_SPOT_NAMES[P.spot] || '';
    if (P.phase !== 'end' && P.phase !== 'flight' && P.phase !== 'after' && spotName) { Render.chunkyText(ctx, spotName, W / 2, cy, sub * 0.85, '#ffffff'); boxes.spot = [W / 2 - sub * 0.3 * spotName.length, cy - sub * 0.6, W / 2 + sub * 0.3 * spotName.length, cy + sub * 0.6]; cy += sub * 1.1; }
    const midY = L.y0 + (H - L.y0) * 0.12;
    // who is up
    if (P.phase === 'start' || P.phase === 'ready') {
      const u = clamp(P.t / 0.3, 0, 1), z = easeOut(u);
      ctx.save(); ctx.translate(W / 2, midY); ctx.scale(z, z);
      if (chal) Render.chunkyText(ctx, P.chal.id === 'keeper' ? tl('FREE THROW') : tl('LET IT FLY'), 0, 0, big, '#ffe14d');
      else {
        const mine = P.watch ? tl('{0} SHOOTS', [P.watchName || tl('THEY')]) : tl('YOUR SHOT');
        const shout = this.sudden(P) && P.team === P.first ? tl('SUDDEN DEATH') : P.team === 'blue' ? mine : tl('{0} SHOOT', [TEAMS.red.name]);
        const first = P.first === 'blue' ? (P.watch ? tl('{0} SHOOTS FIRST', [P.watchName || tl('THEY')]) : tl('YOU SHOOT FIRST')) : tl('{0} SHOOT FIRST', [TEAMS.red.name]);
        if (P.phase === 'start') Render.chunkyText(ctx, first, 0, -big * 0.8, big * 0.55 * this.fit(first, 17), '#ffffff');
        const sh = big * this.fit(shout, 12), sw = sh * 0.56 * shout.length;
        boxes.shout = [W / 2 - sw / 2, midY - sh * 0.6, W / 2 + sw / 2, midY + sh * 0.6];
        Render.chunkyText(ctx, shout, 0, 0, sh, P.team === 'blue' ? '#ffe14d' : '#46d9ff');
      }
      ctx.restore();
    } else if (P.phase !== 'after' && P.phase !== 'end' && this.sudden(P)) {
      Render.chunkyText(ctx, tl('SUDDEN DEATH'), W / 2, cy, sub, '#ff8a8e');
    }
    // the meter, beside the shooter: grey, then the yellow of a good one, the green of a perfect
    // one, red past it
    const showMeter = P.phase === 'aim' || P.phase === 'runup' || P.phase === 'theirs' || P.phase === 'rise' || (P.phase === 'flight' && P.t < 0.6);
    if (showMeter && !(P.phase === 'runup' && P.t < P.runup)) {
      const s = this.shooterAt(L, C), feet = this.view(L, C, s.u, s.v, 0);
      const bw = Math.max(14, H * 0.03), bh = H * 0.34;
      let bx = (feet ? feet.x : W / 2) + H * 0.2, by = (feet ? feet.y : H * 0.9) - bh - H * 0.08;
      bx = Math.min(W - bw - 16, bx); by = Math.max(cy + sub, by);
      const shootEl = !document.body.classList.contains('kb') && typeof $ === 'function' ? $('btn-shoot') : null;
      if (shootEl) {
        const r = shootEl.getBoundingClientRect();
        if (r.width > 1 && r.left < bx + bw + 6 && r.right > bx - 6 && r.top < by + bh + 6) bx = Math.max(16, r.left - bw - 18);
      }
      const max = PEN.Z.LATE, yAt = (v) => by + bh - (bh - 4) * (v / max) - 2;
      ctx.fillStyle = OUTLINE; Sprites.rr(ctx, bx + 3, by + 3, bw, bh, bw / 2); ctx.fill();
      ctx.fillStyle = '#e4e7f5'; Sprites.rr(ctx, bx, by, bw, bh, bw / 2); ctx.fill();
      ctx.fillStyle = '#ffc9cb'; ctx.fillRect(bx + 2, yAt(max) + 2, bw - 4, yAt(PEN.Z.TOP) - yAt(max) - 2);
      ctx.fillStyle = 'rgba(255,225,77,0.75)'; ctx.fillRect(bx + 2, yAt(PEN.Z.PERFECT), bw - 4, yAt(PEN.Z.GOOD) - yAt(PEN.Z.PERFECT));
      ctx.fillStyle = '#7ee89a'; ctx.fillRect(bx + 2, yAt(PEN.Z.TOP), bw - 4, yAt(PEN.Z.PERFECT) - yAt(PEN.Z.TOP));
      const v = clamp(P.meter || 0, 0, max), zone = PEN.zone(v);
      if (v > 0) {
        ctx.fillStyle = zone === 'perfect' ? '#1fb84a' : zone === 'good' ? '#f0b400' : zone === 'late' ? '#ff3a3f' : '#ffffff';
        ctx.fillRect(bx + bw * 0.22, yAt(v), bw * 0.56, by + bh - 3 - yAt(v));
        ctx.fillStyle = OUTLINE; ctx.fillRect(bx - 4, yAt(v) - 2, bw + 8, 4);
      }
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; Sprites.rr(ctx, bx, by, bw, bh, bw / 2); ctx.stroke();
      boxes.power = [bx - 4, by, bx + bw + 4, by + bh + sub * 1.2];
      if (P.zoneSay && P.rel !== null) Render.chunkyText(ctx, P.zoneSay[0], bx + bw / 2, by - sub * 0.8, sub * 0.8, P.zoneSay[1], 3);
      if (P.phase === 'aim' && P.clock < 3.5) Render.chunkyText(ctx, String(Math.ceil(P.clock)), bx + bw / 2, by + bh + sub * 0.8, sub * 1.1, '#ff8a8e');
    }
    // the call
    if (P.say && P.phase === 'after') {
      const u = clamp(P.t / 0.25, 0, 1), z = easeOut(u) * (1 + Math.sin(P.t * 5) * 0.03);
      ctx.save(); ctx.translate(W / 2, midY); ctx.rotate(-0.04); ctx.scale(z, z);
      Render.chunkyText(ctx, P.say[0], 0, 0, big * (P.say[0].length > 10 ? 0.7 : P.say[0].length > 7 ? 0.85 : 1), P.say[1]);
      ctx.restore();
    }
    if (P.phase === 'end' && !chal) {
      const u = clamp(P.t / 0.35, 0, 1), z = easeOut(u);
      ctx.save(); ctx.translate(W / 2, midY); ctx.scale(z, z);
      const won = P.watch ? tl('{0} WINS IT!', [P.watchName || tl('THEY')]) : P.fk ? tl('YOU WIN THE FREE THROWS!') : tl('YOU WIN THE CONTEST!');
      Render.chunkyText(ctx, P.winner === 'blue' ? won : tl('{0} WIN IT', [TEAMS.red.name]), 0, 0, big * 0.8 * this.fit(P.winner === 'blue' ? won : TEAMS.red.name + '  WIN IT', 20), P.winner === 'blue' ? '#ffe14d' : '#ffffff');
      ctx.restore();
    }
    // what to press
    const kb = document.body.classList.contains('kb');
    let hint = null;
    if (P.watch) hint = null;
    else if (P.phase === 'aim') hint = P.holding ? tl('LET GO IN THE GREEN') : kb ? tl('HOLD SPACE OR CLICK  ·  LET GO IN THE GREEN') : tl('HOLD SHOOT  ·  LET GO IN THE GREEN');
    if (hint) {
      const hs = clamp(Math.min(W, H) * 0.034, 12, 18);
      ctx.font = `400 ${hs}px "Lilita One", system-ui, sans-serif`;
      const w = ctx.measureText(hint).width + hs * 1.6, hy = kb ? H - hs * 2.2 : L.y0 + (H - L.y0) * 0.3;
      boxes.hint = [W / 2 - w / 2, hy - hs, W / 2 + w / 2, hy + hs];
      ctx.fillStyle = 'rgba(22, 26, 51, 0.78)'; Sprites.rr(ctx, W / 2 - w / 2, hy - hs, w, hs * 2, hs * 0.6); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillText(hint, W / 2, hy + 1);
    }
  },

  flag(team, w) {
    const club = team === 'blue' ? Clubs.home : Clubs.current;
    if (!club) return null;
    const key = club.id + ':' + Math.round(w);
    this._flags = this._flags || {};
    if (!this._flags[key]) {
      const cv = document.createElement('canvas'); cv.width = 48; cv.height = 32;
      UI.flagBadge(cv, club);
      this._flags[key] = cv;
    }
    return this._flags[key];
  },
};
