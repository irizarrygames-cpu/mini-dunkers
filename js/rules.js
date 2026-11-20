// PRO MATCH: the real rules on a bigger court.
//   OUT OF BOUNDS  the ball over a sideline or a baseline (or carried over one) -> an INBOUND to the
//                  side that did not touch it last, from where it went out
//   THE SHOT CLOCK 12 seconds to get a shot up (a shot in the air, or one off the rim, starts it
//                  again); run it down and it is the other side's ball from the sideline
//   FOULS          a reach-in that misses can be a foul. On a shooter (going up with it, or driving in
//                  the paint) it is FREE THROWS (two, three for a three), otherwise their ball from the sideline
// The side's real player takes an inbound (offline: you; online: one of them at random; a side of
// fill-ins: the nearest): aim with the stick, PASS to play it in, SHOOT for a long one. A bot takes
// its own after a moment. The other side stands back while it is set up, and the clock stops.
// A free throw is taken by whoever was fouled: hold SHOOT and let go in the green, as in a match.
// Everyone else waits outside the paint. Miss the last one and the ball is live off the rim.
//
// The match calls check() every step of play, step() in the 'restart' phase, and reachIn() when a
// steal misses (js/match.js, js/entities.js). The server runs the same code for an online PRO MATCH.
const Rules = {
  CLEAR: 170,           // how far back the other side stands from an inbound
  BOT_WAIT: [0.9, 1.5], // how long a bot takes over an inbound
  FT_WAIT: [0.9, 1.4],  // ...and over a free throw
  YOU_WAIT: 8,          // you get this long, then it is taken for you
  THROW_Z: 62,          // an inbound is held up over the head
  BACK_SPEED: 900,      // how fast the other side gets out of the way
  // a reach-in that misses is a foul this often (from in front / from behind), times `shooter` on a
  // player going up to shoot (tools/rulesscan.js measures how many a match has)
  FOUL: { front: 0.08, behind: 0.26, shooter: 1.6 },
  // a free throw goes in this often, by the release (the same meter as a jump shot)
  FT: { perfect: 0.95, good: 0.78, off: 0.42 },

  // is the ball out of play? Wholly over a sideline or a baseline
  out(b) {
    const R = CFG.BALL_R, W = CFG.FIELD_W, H = CFG.FIELD_H;
    return b.y < -R || b.y > H + R || b.x < -R || b.x > W + R;
  },
  // a player with the ball who has stepped over a line
  carriedOut(p) {
    const W = CFG.FIELD_W, H = CFG.FIELD_H, e = p.r * 0.4;
    return p.y < -e || p.y > H + e || p.x < -e || p.x > W + e;
  },

  // every step of play: is it out, has the shot clock gone? (true: a restart has begun)
  check(m, dt) {
    const b = m.ball;
    if (b.dead || b.through) { m.shotClock = CFG.SHOT_CLOCK; return false; }
    if (this.out(b) || (b.owner && this.carriedOut(b.owner))) { this.inbound(m, { why: 'out' }); return true; }
    if (b.shot) { m.shotClock = CFG.SHOT_CLOCK; return false; }
    const holder = b.owner ? b.owner.team : b.lastTouchTeam;
    if (!holder) return false;
    m.shotClock = (m.shotClock === undefined ? CFG.SHOT_CLOCK : m.shotClock) - dt;
    if (m.shotClock <= 0) { this.inbound(m, { why: 'clock', team: otherTeam(holder) }); return true; }
    return false;
  },

  // a steal that missed: a foul, now and then (and more often from behind, or on a shooter)
  reachIn(m, p, c, behind) {
    if (m.phase !== 'play' || !c || c.team === p.team) return;
    let chance = behind ? this.FOUL.behind : this.FOUL.front;
    // in the act of shooting: going up with it held, or driving in the paint
    const shooting = !!c.charging || toHoop(c.team, c.x, c.y) < CFG.LAYUP_R + 90;
    if (shooting) chance *= this.FOUL.shooter;
    if (Math.random() >= chance) return;
    p.stats.fouls = (p.stats.fouls || 0) + 1;
    m.fouls = m.fouls || { blue: 0, red: 0 };
    m.fouls[p.team]++;
    if (shooting) this.freeThrows(m, c, isThree(c.team, c.x, c.y) ? 3 : 2);
    else this.inbound(m, { why: 'foul', team: c.team });
  },
  onSteal() {},

  // everyone stops what they were doing for the whistle
  whistle(m) {
    const b = m.ball;
    if (b.owner) loseBall(m, b.owner, 0);
    b.owner = null; b.vx = 0; b.vy = 0; b.vz = 0; b.shot = null; b.through = null; b.dead = false; b.trailType = null; b.trail.length = 0;
    b.lastPass = null; b.assist = null;
    for (const p of m.players) {
      p.kickT = 0; p.slideT = 0; p.slideWindT = 0; p.charging = false; p.passCharging = false; p.bufferT = 0; p.passBufferT = 0; p.skillBufferT = 0; p.skill = null;
      if (p.isHuman && !Game.headless) Sound.chargeStop();
    }
    Replay.clear(m);
    if (!Game.headless) Sound.whistle();
  },

  // who takes it for a side: a real player of theirs if they have one, else the nearest
  takerFor(m, team, bx, by) {
    const people = m.autopilot ? [] : m.players.filter((p) => p.team === team && p.isHuman && !p.away);
    if (people.length) return people.length === 1 ? people[0] : people[Math.floor(Math.random() * people.length)];
    let best = 1e9, taker = null;
    for (const p of m.players) {
      if (p.team !== team) continue;
      const d = dist(p.x, p.y, bx, by);
      if (d < best) { best = d; taker = p; }
    }
    return taker || m.players.find((p) => p.team === team) || m.players[0];
  },

  // An inbound. o.why: 'out' (from where it went out), 'clock' or 'foul' (from the nearest sideline),
  // 'ft' (after a made free throw: from the baseline under that basket). o.team: whose ball (out:
  // the side that did not touch it last).
  inbound(m, o) {
    const b = m.ball, W = CFG.FIELD_W, H = CFG.FIELD_H;
    const ox = b.owner ? b.owner.x : b.x, oy = b.owner ? b.owner.y : b.y;
    const last = b.owner ? b.owner.team : b.lastTouchTeam || 'blue';
    const team = o.team || otherTeam(last);
    this.whistle(m);
    let bx, by, base = false;
    if (o.why === 'ft') {
      // under the basket that was just scored on: the side that defends it takes it in
      bx = TEAMS[team].dir > 0 ? 0 : W; by = H / 2 + (Math.random() < 0.5 ? -1 : 1) * (CFG.BOARD_W / 2 + 70); base = true;
    } else if (o.why === 'out' && (ox < 0 || ox > W) && oy >= 0 && oy <= H) {
      bx = ox < 0 ? 0 : W; by = clamp(oy, 60, H - 60); base = true;
      // never from right behind the backboard
      const gap = CFG.BOARD_W / 2 + 60;
      if (Math.abs(by - H / 2) < gap) by = H / 2 + (by < H / 2 ? -gap : gap);
    } else {
      bx = clamp(ox, 80, W - 80); by = oy < H / 2 ? 0 : H;
    }
    let ax, ay;
    if (base) { ax = bx === 0 ? 1 : -1; ay = by < H / 2 ? 0.25 : -0.25; }
    else { ax = TEAMS[team].dir * 0.4; ay = by === 0 ? 1 : -1; }
    { const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al; }
    const taker = this.takerFor(m, team, bx, by);
    // the taker stands just outside the line, facing in
    const tx = base ? (bx === 0 ? -16 : W + 16) : bx, ty = base ? by : by === 0 ? -16 : H + 16;
    m.restart = { kind: 'throw', team, taker, bx, by, tx, ty, ax, ay, t: 0, base, why: o.why, wait: rand(this.BOT_WAIT[0], this.BOT_WAIT[1]), human: !!(taker.isHuman && !m.autopilot) };
    m.phase = 'restart'; m.phaseT = 0;
    this.place(m);
    if (!Game.headless) {
      const label = o.why === 'clock' ? tl('SHOT CLOCK!') : o.why === 'foul' ? tl('FOUL!') : o.why === 'ft' ? tl('INBOUND') : tl('OUT OF BOUNDS');
      FX.showBanner(label, '#ffffff', 1.2, ((team === 'blue' ? m.home : m.club) || {}).name || '');
    }
  },

  // Free throws for `p`: n of them from the line, one at a time
  freeThrows(m, p, n) {
    const W = CFG.FIELD_W, H = CFG.FIELD_H, team = p.team, dir = TEAMS[team].dir;
    this.whistle(m);
    const bx = (dir > 0 ? W : 0) - dir * CFG.KEY_D, by = H / 2;
    m.restart = { kind: 'ft', team, taker: p, bx, by, tx: bx - dir * (p.r + 2), ty: by, ax: dir, ay: 0, t: 0, n, left: n, made: 0, fly: null,
      wait: rand(this.FT_WAIT[0], this.FT_WAIT[1]), human: !!(p.isHuman && !m.autopilot) };
    m.phase = 'restart'; m.phaseT = 0;
    this.place(m);
    if (!Game.headless) FX.showBanner(tl('FOUL!'), '#ffffff', 1.2, tl('{0} FREE THROWS', [n]));
  },

  // the taker on the spot, the ball in their hands
  place(m) {
    const R = m.restart, p = R.taker, b = m.ball;
    p.x = R.tx; p.y = R.ty; p.vx = 0; p.vy = 0; p.mx = 0; p.my = 0; p.vz = 0; p.z = 0; p.dunk = null;
    p.fx = R.ax; p.fy = R.ay; p.faceX = Math.abs(R.ax) > 0.1 ? Math.sign(R.ax) : p.faceX;
    p.throwIn = R.kind === 'throw';
    if (R.fly) return; // a free throw on its way
    b.owner = p;
    if (R.kind === 'throw') {
      b.x = p.x + (R.base ? (R.bx === 0 ? 1 : -1) : 0); b.y = p.y + (R.base ? 0 : R.by === 0 ? 1 : -1); b.z = this.THROW_Z;
    } else { b.x = p.x + R.ax * (p.r + 4); b.y = p.y; b.z = p.charging ? 66 : 40; }
    b.vx = 0; b.vy = 0; b.vz = 0;
    b.safeX = b.x; b.safeY = b.y;
  },

  // the 'restart' phase, every step
  step(m, dt) {
    const R = m.restart;
    if (!R) { m.phase = 'play'; return; }
    // online: the one taking it left (a bot plays for them now) or dropped out: it is a bot's to take
    if (R.human && (!R.taker.isHuman || R.taker.away)) R.human = false;
    R.t += dt;
    const b = m.ball, taker = R.taker;
    // you, when you are not the one taking it: move about; PASS asks for it
    for (const h of m.humans) {
      if (h === taker || m.autopilot) continue;
      const I = h.input || Input, mv = I.move, mag = Math.hypot(mv.x, mv.y);
      h.mx = mag > 0.01 ? mv.x / mag : 0; h.my = mag > 0.01 ? mv.y / mag : 0; h.mSpeed = Math.min(1, mag); h.sprinting = I.sprintHeld;
      if (I.consumePass()) { if (h.team === R.team && R.kind === 'throw') { h.passRequestT = 1.2; R.wait = Math.min(R.wait, R.t + 0.25); FX.ring(h.x, h.y, '#ffffff', 10, 34, 0.35, 3); } }
      I.consumeShootPress(); I.consumeShootRelease(); I.consumeSkill(); I.consumeSlide(); if (I.consumeUlt) I.consumeUlt();
      if (I.consumePassPress) I.consumePassPress();
      if (I.aim) I.aim = null;
    }
    AI.update(m, dt);
    movePlayers(m, dt);
    this.keepBack(m, dt);
    this.place(m);
    if (R.kind === 'ft' && R.fly) { this.flyFT(m, dt); return; }
    if (R.human) this.yours(m, dt);
    else if (R.t >= R.wait) this.botTake(m);
    b.trail.length = 0;
  },

  // Everyone gets out of the way: the other side out of a circle round an inbound; for a free throw,
  // everybody out of the paint and away from the shooter.
  keepBack(m, dt) {
    const R = m.restart, W = CFG.FIELD_W, H = CFG.FIELD_H, step = this.BACK_SPEED * dt;
    const ft = R.kind === 'ft';
    for (const p of m.players) {
      if (p === R.taker || (!ft && p.team === R.team)) continue;
      let x = p.x, y = p.y;
      if (ft) {
        // the paint: from the baseline to the line, KEY_W wide
        const base = R.bx < W / 2 ? 0 : W, inX = base === 0 ? x < CFG.KEY_D + p.r : x > W - CFG.KEY_D - p.r;
        if (inX && Math.abs(y - H / 2) < CFG.KEY_W / 2 + p.r) y = H / 2 + (y < H / 2 ? -1 : 1) * (CFG.KEY_W / 2 + p.r + 2);
        const d = dist(x, y, R.bx, R.by);
        if (d < 110) { const ux = d > 1 ? (x - R.bx) / d : -TEAMS[R.team].dir, uy = d > 1 ? (y - R.by) / d : 0; x = R.bx + ux * 111; y = R.by + uy * 111; }
      } else {
        const dx = x - R.bx, dy = y - R.by, d = Math.hypot(dx, dy);
        if (d < this.CLEAR) {
          const ux = d > 1 ? dx / d : -TEAMS[R.team].dir, uy = d > 1 ? dy / d : 0;
          x = R.bx + ux * (this.CLEAR + 1); y = R.by + uy * (this.CLEAR + 1);
        }
      }
      x = clamp(x, 20, W - 20); y = clamp(y, 20, H - 20);
      const mx = x - p.x, my = y - p.y, ml = Math.hypot(mx, my);
      if (ml < 0.01) continue;
      const k = Math.min(1, step / ml);
      p.x += mx * k; p.y += my * k;
    }
  },

  // which way an inbound may be played: into the court, never back out over the line
  legalAim(m, ax, ay, R = m.restart) {
    const W = CFG.FIELD_W, H = CFG.FIELD_H, MIN = 0.14;
    let l = Math.hypot(ax, ay);
    if (l < 0.2) { ax = R.ax; ay = R.ay; l = Math.hypot(ax, ay) || 1; }
    ax /= l; ay /= l;
    const atLeastX = (lo) => { if (ax < lo) { ax = lo; ay = (ay < 0 ? -1 : 1) * Math.sqrt(1 - lo * lo); } };
    const atMostX = (hi) => { if (ax > hi) { ax = hi; ay = (ay < 0 ? -1 : 1) * Math.sqrt(1 - hi * hi); } };
    const atLeastY = (lo) => { if (ay < lo) { ay = lo; ax = (ax < 0 ? -1 : 1) * Math.sqrt(1 - lo * lo); } };
    const atMostY = (hi) => { if (ay > hi) { ay = hi; ax = (ax < 0 ? -1 : 1) * Math.sqrt(1 - hi * hi); } };
    if (R.by <= 20) atLeastY(MIN);
    if (R.by >= H - 20) atMostY(-MIN);
    if (R.bx <= 20) atLeastX(MIN);
    if (R.bx >= W - 20) atMostX(-MIN);
    l = Math.hypot(ax, ay) || 1;
    return [ax / l, ay / l];
  },

  // you take it. An inbound: aim with the stick, PASS to play it in, SHOOT for a long one.
  // A free throw: hold SHOOT, let go in the green.
  yours(m, dt) {
    const R = m.restart, h = R.taker, I = h.input || Input;
    I.consumeSkill(); I.consumeSlide(); if (I.consumeUlt) I.consumeUlt();
    if (R.kind === 'ft') {
      I.consumePass(); if (I.consumePassPress) I.consumePassPress(); if (I.aim) I.aim = null;
      if (I.consumeShootPress() || (I.shootHeld && !h.charging && R.t > 0.3)) { if (!h.charging) { h.charging = true; h.chargeT = 0; if (!Game.headless) Sound.chargeStart(); } }
      let release = I.consumeShootRelease();
      if (h.charging) { h.chargeT += dt; if (h.chargeT >= CFG.CHARGE_AUTO) release = true; }
      if (release && h.charging) {
        h.charging = false; if (!Game.headless) Sound.chargeStop();
        this.shootFT(m, timingOf(h.chargeT / CFG.METER_T));
        return;
      }
      if (R.t >= this.YOU_WAIT && !h.charging) this.shootFT(m, 'early');
      return;
    }
    const mv = I.move, mag = Math.hypot(mv.x, mv.y);
    if (mag > 0.3) { const [ax, ay] = this.legalAim(m, mv.x, mv.y); R.ax = ax; R.ay = ay; }
    // online: a button carries the stick as it was when it was pressed: that is the aim it goes with
    const pressed = I.aim;
    if (pressed) { I.aim = null; if (Math.hypot(pressed.x, pressed.y) > 0.3) { const [ax, ay] = this.legalAim(m, pressed.x, pressed.y); R.ax = ax; R.ay = ay; } }
    h.fx = R.ax; h.fy = R.ay;
    if (I.consumePassPress && I.consumePassPress()) { h.passCharging = true; h.passChargeT = 0; }
    if (h.passCharging) h.passChargeT = Math.min(CFG.PASS_CHARGE_FULL, (h.passChargeT || 0) + dt);
    if (I.consumePass()) {
      const charge = h.passCharging ? h.passChargeT : 0;
      h.passCharging = false; h.passChargeT = 0;
      this.take(m, 'pass', R.ax, R.ay, charge);
      return;
    }
    if (I.consumeShootPress()) { h.charging = true; h.chargeT = 0; }
    let release = I.consumeShootRelease();
    if (h.charging) { h.chargeT += dt; if (h.chargeT >= CFG.CHARGE_AUTO) release = true; }
    if (release && h.charging) { h.charging = false; this.take(m, 'long', R.ax, R.ay, h.chargeT); return; }
    if (R.t >= this.YOU_WAIT) this.botTake(m);
  },

  // a bot takes it (or it is taken for you)
  botTake(m) {
    const R = m.restart, p = R.taker, dir = TEAMS[R.team].dir;
    if (R.kind === 'ft') { this.shootFT(m, botTiming(m, p)); return; }
    const mates = m.players.filter((q) => q.team === R.team && q !== p);
    if (!mates.length) { this.take(m, 'long', R.ax, R.ay, 0.4); return; }
    // the one who asked for it, if anyone did
    const asked = !m.autopilot && mates.find((q) => q.isHuman && (q.passRequestT || 0) > 0);
    const free = (q) => { let near = 1e9; for (const o of m.players) if (o.team !== R.team) near = Math.min(near, dist(o.x, o.y, q.x, q.y)); return near; };
    let target = asked || null;
    if (!target) {
      let best = -1e9;
      for (const q of mates) {
        const d = dist(q.x, q.y, R.bx, R.by);
        if (d > 760 || d < 60) continue;
        const up = (q.x - R.bx) * dir;
        const score = Math.min(free(q), 260) * 1.2 + up * 0.2 - d * 0.12 + (q.isHuman ? 60 : 0);
        if (score > best) { best = score; target = q; }
      }
    }
    if (!target) target = mates.slice().sort((a, c) => dist(a.x, a.y, R.bx, R.by) - dist(c.x, c.y, R.bx, R.by))[0];
    const d = dist(R.bx, R.by, target.x, target.y) || 1;
    const [ax, ay] = this.legalAim(m, (target.x - R.bx) / d, (target.y - R.by) / d);
    this.take(m, 'pass', ax, ay, d > 520 ? CFG.PASS_CHARGE_FULL : 0, target);
  },

  // an inbound into play
  take(m, how, ax, ay, charge, target = null) {
    const R = m.restart;
    if (!R || R.kind !== 'throw') return;
    const p = R.taker, b = m.ball;
    [ax, ay] = this.legalAim(m, ax, ay);
    m.restart = null;
    m.phase = 'play'; m.phaseT = 0;
    m.shotClock = CFG.SHOT_CLOCK;
    p.throwIn = false;
    b.owner = p; b.z = 0;
    b.x = R.bx + ax * 2; b.y = R.by + ay * 2;
    b.safeX = b.x; b.safeY = b.y;
    p.fx = ax; p.fy = ay;
    const ok = performPass(m, p, ax, ay, how === 'long' ? null : target, how === 'long' ? CFG.PASS_CHARGE_FULL : charge);
    if (!ok) { b.owner = null; b.vx = ax * 420; b.vy = ay * 420; b.lastKicker = p; b.lastTouchTeam = p.team; }
    // never straight back out over the line it came in from
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 1) { const [vx, vy] = this.legalAim(m, b.vx, b.vy, R); b.vx = vx * sp; b.vy = vy * sp; }
    b.z = Math.max(b.z, 30); b.vz = Math.max(b.vz, 150);
    b.shot = null; b.trailType = 'pass';
    b.lastTouchTeam = p.team; b.lastKicker = p;
    b.restartBy = p; b.restartKind = R.kind; b.restartT = m.clock;
    // no second touch until somebody else has had it
    p.noPickupT = Math.max(p.noPickupT, 0.55);
    p.charging = false; p.passCharging = false;
  },

  // a free throw goes up: in or out is settled now (by the release), as with any shot
  shootFT(m, timing) {
    const R = m.restart, p = R.taker, b = m.ball;
    if (!R || R.kind !== 'ft' || R.fly) return;
    const chance = timing === 'perfect' ? this.FT.perfect : timing === 'good' ? this.FT.good : this.FT.off;
    const make = Math.random() < chance;
    if (p.isHuman && !m.autopilot && !Game.headless) {
      const say = { perfect: [tl('PERFECT!'), '#3fe07a'], good: [tl('GOOD'), '#ffe14d'], early: [tl('EARLY'), '#ff8a8e'], late: [tl('LATE'), '#ff8a8e'] }[timing];
      FX.text(p.x, p.y, say[0], say[1], timing === 'perfect' ? 19 : 15);
    }
    b.owner = p;
    releaseShot(m, p, { kind: 'ft', make, pts: 1, timing, perfect: timing === 'perfect', power: false, contest: 0, x0: p.x + R.ax * 8, y0: p.y, z0: 80 });
    if (!Game.headless) Sound.shoot(0.5);
    p.charging = false;
    R.fly = { make };
  },

  // the free throw in the air; when it gets there, the point (or not), then the next one, or play on
  flyFT(m, dt) {
    const R = m.restart, b = m.ball, s = b.shot, p = R.taker;
    if (!s) { R.fly = null; return; }
    s.t += dt;
    const P = shotPos(s, s.t);
    b.vx = (P.x - b.x) / dt; b.vy = (P.y - b.y) / dt; b.vz = (P.z - b.z) / dt;
    b.x = P.x; b.y = P.y; b.z = P.z; b.roll += 18 * dt;
    if (s.t < s.T) return;
    const side = hoopSide(hoopX(R.team));
    R.left--;
    if (R.fly.make) {
      R.made++;
      this.point(m, R.team, p);
      b.netBulge[side] = 1;
      if (!Game.headless) Sound.swish();
    } else {
      b.rim[side] = 1;
      if (!Game.headless) Sound.rim();
    }
    R.fly = null; b.shot = null;
    if (R.left > 0) {
      // the next one
      R.t = 0; R.wait = rand(this.FT_WAIT[0], this.FT_WAIT[1]);
      this.place(m);
      return;
    }
    if (s.make) { this.inbound(m, { why: 'ft', team: otherTeam(R.team) }); return; }
    // missed the last: off the rim and live
    const dir = TEAMS[R.team].dir;
    m.restart = null; m.phase = 'play'; m.phaseT = 0; m.shotClock = CFG.SHOT_CLOCK;
    b.owner = null; b.x = hoopX(R.team) - dir * CFG.RIM_R; b.y = hoopY(); b.z = CFG.RIM_Z;
    b.vx = -dir * rand(160, 280); b.vy = rand(-180, 180); b.vz = rand(170, 260);
    b.lastTouchTeam = R.team; b.lastKicker = p; b.missFrom = { team: R.team, t: m.clock };
    p.noPickupT = 0.4;
  },

  // a free throw's point: the score, the scorer, the list of baskets, and the moment on every screen
  point(m, team, p) {
    m.score[team] += 1;
    m.lastConceded = otherTeam(team);
    if (p) { p.stats.goals += 1; p.stats.points = (p.stats.points || 0) + 1; p.stats.ftMade = (p.stats.ftMade || 0) + 1; }
    m.goals.push({ team, scorer: p, assist: null, pts: 1, kind: 'ft', big: false, own: false, how: 'ft', time: m.overtime ? m.duration + m.otTime : m.duration - m.time });
    if (m.events) {
      m.events.push({ e: 'goal', team, scorer: p ? m.players.indexOf(p) : -1, assist: -1, pts: 1, power: false, big: false, hype: '', ft: true, x: hoopX(team), y: hoopY(), z: CFG.RIM_Z });
      return;
    }
    if (Game.headless) return;
    FX.text(hoopX(team), hoopY(), '+1', '#ffe14d', 20);
    if (team === 'blue') Sound.cheer(true); else Sound.ooh();
    // overtime: the next basket wins, and a free throw is a basket
    if (m.overtime) Match.endMatch(m);
  },

  // your inbound or free throw: the arrow, the countdown and what to press
  drawAim(ctx, m, t) {
    const R = m.restart;
    if (!R || !R.human) return;
    const x0 = Render.sx(R.bx, R.by), y0 = Render.sy(R.by, 0), k = Render.k(R.by);
    const W = Render.W, H = Render.H, kb = document.body.classList.contains('kb');
    ctx.save();
    if (R.kind === 'throw') {
      const len = 120, x1 = Render.sx(R.bx + R.ax * len, R.by + R.ay * len), y1 = Render.sy(R.by + R.ay * len, 0);
      const pulse = 1 + Math.sin(t * 8) * 0.08;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.setLineDash([10 * k, 8 * k]);
      ctx.lineWidth = 8 * k; ctx.strokeStyle = OUTLINE;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.lineWidth = 4.5 * k; ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.setLineDash([]);
      const ang = Math.atan2(y1 - y0, x1 - x0), hs = 13 * k * pulse;
      ctx.beginPath(); ctx.moveTo(x1 + Math.cos(ang) * hs, y1 + Math.sin(ang) * hs);
      ctx.lineTo(x1 + Math.cos(ang + 2.4) * hs, y1 + Math.sin(ang + 2.4) * hs);
      ctx.lineTo(x1 + Math.cos(ang - 2.4) * hs, y1 + Math.sin(ang - 2.4) * hs); ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 3 * k; ctx.strokeStyle = OUTLINE; ctx.stroke();
    }
    if (R.fly) { ctx.restore(); return; }
    // the countdown before it is taken for you
    const left = Math.ceil(this.YOU_WAIT - R.t);
    if (left <= 3 && left > 0) Render.chunkyText(ctx, String(left), x0, y0 - 70 * k, 26 * k, '#ffe14d', 4 * k);
    const how = R.kind === 'ft' ? (kb ? tl('HOLD SPACE, LET GO IN THE GREEN') : tl('HOLD SHOOT, LET GO IN THE GREEN'))
      : tl('AIM, THEN PASS TO INBOUND IT · SHOOT FOR A LONG ONE');
    let size = clamp(H * 0.037, 14, 20);
    ctx.font = `400 ${size}px "Lilita One", system-ui, sans-serif`;
    const tw = ctx.measureText(how).width + size * 0.4, room = W * 0.6;
    if (tw > room) size *= room / tw;
    const hy = y0 < H * 0.5 ? H * 0.72 : H * 0.28;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    Render.chunkyText(ctx, how, W / 2, hy, size, '#ffffff', size * 0.22);
    if (R.kind === 'ft') Render.chunkyText(ctx, tl('FREE THROW {0} OF {1}', [R.n - R.left + 1, R.n]), W / 2, hy + size * 1.5, size * 0.85, '#ffe14d', size * 0.2);
    ctx.restore();
  },
};
