// Players, the ball, and everything they do: dribble, pass, shoot, dunk, rebound, steal, block.
//
// The court is drawn from behind the baseline on neither side: blue attacks the right-hand hoop.
// The ball has a height (z). It is either in somebody's hands (dribbled, or held up to shoot), in
// the air on a shot (a set arc to the rim, its outcome decided the moment it was let go of), going
// down through a net, or loose (a pass, a rebound, a ball knocked away) under ordinary physics.
let _nextPlayerId = 1;

class Player {
  constructor(o) {
    this.id = _nextPlayerId++;
    this.team = o.team;
    this.isKeeper = false;          // (basketball has none; kept so code that asks gets "no")
    this.isHuman = !!o.human;
    this.role = o.role;
    this.number = o.number;
    this.look = o.look;
    this.r = CFG.PLAYER_R;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.z = 0; this.vz = 0;        // off the floor: a jump, a dunk, a block
    this.fx = TEAMS[o.team].dir; this.fy = 0;
    this.faceX = this.fx;
    this.mx = 0; this.my = 0; this.mSpeed = 1;
    this.runPhase = rand(0, 6);
    this.kickT = 0; this.kickDur = 0.2;      // (the reach of a steal and a pass, drawn as the arm going out)
    this.stunT = 0; this.noPickupT = 0; this.protectT = 0;
    this.diveT = 0; this.diveDir = 0; this.recoverT = 0; this.holdT = 0;
    this.celebrateT = 0; this.sad = false;
    this.touchT = 0; this.dustT = 0;
    this.charging = false; this.chargeT = 0; this.passCharging = false; this.passChargeT = 0;
    this.bufferT = 0; this.bufferCharge = 0;
    this.speedMul = 1;
    this.attr = o.attr || NEUTRAL_ATTR;
    this.slideT = 0; this.slideCd = 0; this.slideDirX = 0; this.slideDirY = 0; this.slideHit = false;   // the steal (a reach)
    this.fallT = 0; this.slideWindT = 0; this.slideWindX = 1; this.slideWindY = 0;
    this.skill = null; this.skillCd = 0; this.burstT = 0; this.streakT = 0;
    this.hopT = 0; this.dodgeT = 0;
    this.ult = 0; this.ultOn = false; this.ultShot = null;
    this.stamina = 1; this.sprinting = false; this.exhausted = false; this.staminaDelay = 0;
    this.shootT = 0;                 // the follow-through after a shot: arms up
    this.dunk = null;                // a dunk or a layup on its way
    this.blockT = 0;                 // arms up for a block or a rebound
    this.jumpCd = 0;
    this.dribble = rand(0, 6);       // where the dribble is in its bounce
    this.seed = Math.random() * 10;
    this.ai = { tx: 0, ty: 0, decideT: rand(0, 0.3), spotT: 0, chargeGoal: 0, holdT: 0, sideY: 0, slideT: 0, man: null, cutT: 0, jumpAt: 0 };
    this.stats = { goals: 0, points: 0, shots: 0, makes: 0, threes: 0, dunks: 0, passes: 0, steals: 0, saves: 0, blocks: 0, rebounds: 0, assists: 0, skills: 0, tackles: 0 };
  }
  clearActions() {
    this.ultShot = null;
    this.slideT = 0; this.slideWindT = 0; this.fallT = 0; this.skill = null; this.burstT = 0;
    this.slideCd = 0; this.skillCd = 0; this.slideHit = false;
    this.hopT = 0; this.dodgeT = 0;
    this.stamina = 1; this.sprinting = false; this.exhausted = false; this.staminaDelay = 0;
    this.z = 0; this.vz = 0; this.shootT = 0; this.dunk = null; this.blockT = 0; this.jumpCd = 0;
  }
  get speed() { return Math.hypot(this.vx, this.vy); }
  get airborne() { return this.z > 0.5 || this.vz > 0 || !!this.dunk; }
}

class Ball {
  constructor() { this.trail = []; this.reset(CFG.FIELD_W / 2, CFG.FIELD_H / 2); }
  reset(x, y) {
    this.x = x; this.y = y; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.owner = null;
    this.spinX = 0; this.spinY = 0; this.spinT = 0;
    this.trail.length = 0; this.trailType = null; this.trailT = 0;
    this.shot = null; this.through = null; this.lastKicker = null; this.lastPass = null; this.lastTouchTeam = null;
    this.assist = null;
    this.roll = 0; this.touchKick = 0; this.pickupCd = 0;
    this.netBulge = { left: 0, right: 0 };   // how hard each net is swinging (a basket just went through)
    this.rim = { left: 0, right: 0 };        // how hard each rim is shaking (something hit it)
    this.dead = false;                       // through the net: nobody can play it until it is put back in
    this.safeX = x; this.safeY = y;
  }
}

// ===== The court ======================================================
const inField = (x, y) => x >= 0 && x <= CFG.FIELD_W && y >= 0 && y <= CFG.FIELD_H;
const otherTeam = (team) => (team === 'blue' ? 'red' : 'blue');
// the rim you attack, and the one you defend (the names say goal: the rest of the game asks that)
const hoopX = (team) => (TEAMS[team].dir > 0 ? CFG.FIELD_W - CFG.HOOP_IN : CFG.HOOP_IN);
const ownHoopX = (team) => (TEAMS[team].dir > 0 ? CFG.HOOP_IN : CFG.FIELD_W - CFG.HOOP_IN);
const attackGoalX = hoopX;
const ownGoalX = ownHoopX;
const hoopY = () => CFG.FIELD_H / 2;
const hoopSide = (x) => (x > CFG.FIELD_W / 2 ? 'right' : 'left');
const toHoop = (team, x, y) => dist(x, y, hoopX(team), hoopY());
// a ball let go of from here is worth 3: behind the arc, or out in a corner past the straight lines
function isThree(team, x, y) {
  const hx = hoopX(team), cy = hoopY(), dir = TEAMS[team].dir;
  const along = (hx - x) * dir;                         // how far in front of the rim (negative: behind it)
  const cornerY = CFG.FIELD_H / 2 - CFG.THREE_SIDE;
  if (Math.abs(y - cy) >= cornerY) return true;          // out past the corner lines
  // the corner lines run straight from the baseline until they meet the arc
  const meet = Math.sqrt(Math.max(0, CFG.THREE_R * CFG.THREE_R - cornerY * cornerY));
  if (along <= meet) return Math.abs(y - cy) >= cornerY;
  return dist(x, y, hx, cy) > CFG.THREE_R;
}
function inOwnBox(team, x, y) {
  const gx = ownHoopX(team);
  return Math.abs(x - gx) <= CFG.KEY_D && Math.abs(y - hoopY()) <= CFG.KEY_W / 2;
}
// the hoop stands behind each baseline: nobody runs through them
const STANDS = () => [{ x: -CFG.END_M * 0.55, y: CFG.FIELD_H / 2 }, { x: CFG.FIELD_W + CFG.END_M * 0.55, y: CFG.FIELD_H / 2 }];

// Move a carried ball out from the carrier's body in small steps so the fence stops it.
function sweepBallFrom(b, fromX, fromY, toX, toY) {
  const dx = toX - fromX, dy = toY - fromY;
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 6));
  b.x = fromX; b.y = fromY; b.vx = 0; b.vy = 0;
  for (let i = 0; i < n; i++) { b.x += dx / n; b.y += dy / n; collideWalls(b, CFG.BALL_R, 0); }
}

// ===== Player movement ==============================================
function turnToward(p, tx, ty, maxAngle) {
  const cur = Math.atan2(p.fy, p.fx), want = Math.atan2(ty, tx);
  let d = want - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const a = cur + clamp(d, -maxAngle, maxAngle);
  p.fx = Math.cos(a); p.fy = Math.sin(a);
}

// a jump: blocks, rebounds and jump shots all go up this way (a dunk is drawn on its own path)
function jump(p, v = CFG.JUMP_V) {
  if (p.airborne || p.fallT > 0 || p.jumpCd > 0) return false;
  p.vz = v * (1 + p.attr.def * 0.04);
  p.jumpCd = 0.25;
  return true;
}

function movePlayers(m, dt) {
  const ps = m.players, b = m.ball;
  for (const p of ps) {
    p.kickT = Math.max(0, p.kickT - dt);
    p.stunT = Math.max(0, p.stunT - dt);
    p.noPickupT = Math.max(0, p.noPickupT - dt);
    p.protectT = Math.max(0, p.protectT - dt);
    p.recoverT = Math.max(0, p.recoverT - dt);
    p.celebrateT = Math.max(0, p.celebrateT - dt);
    p.slideCd = Math.max(0, p.slideCd - dt);
    p.skillCd = Math.max(0, p.skillCd - dt);
    p.burstT = Math.max(0, p.burstT - dt);
    p.fallT = Math.max(0, p.fallT - dt);
    p.hopT = Math.max(0, p.hopT - dt);
    p.dodgeT = Math.max(0, p.dodgeT - dt);
    p.shootT = Math.max(0, p.shootT - dt);
    p.blockT = Math.max(0, p.blockT - dt);
    p.jumpCd = Math.max(0, p.jumpCd - dt);
    p.slideT = Math.max(0, p.slideT - dt);
    if (p.ultShot) { p.ultShot.t += dt; if (p.ultShot.t >= p.ultShot.dur) p.ultShot = null; }

    // sprint + stamina: running dry locks sprint until it refills to SPRINT.unlock
    const canSprint = p.sprinting && !p.exhausted && !p.airborne && p.fallT <= 0 && p.speed > 60;
    p.sprintOn = canSprint;
    if (canSprint) {
      p.stamina -= SPRINT.drain * dt;
      p.staminaDelay = SPRINT.delay;
      if (p.stamina <= 0) { p.stamina = 0; p.exhausted = true; if (p.isHuman) FX.text(p.x, p.y, tl('TIRED!'), '#ff8a8e', 14); }
    } else {
      p.staminaDelay = Math.max(0, p.staminaDelay - dt);
      if (p.staminaDelay <= 0) p.stamina = Math.min(1, p.stamina + SPRINT.regen * dt);
      if (p.exhausted && p.stamina >= SPRINT.unlock) p.exhausted = false;
    }

    if (p.dunk) {
      // a dunk or layup: up along its own path to the rim, the ball goes at the top, then down
      stepDunk(m, p, dt);
    } else if (p.skill) {
      // spin move: glide sideways while the body (and ball) turn a full circle
      const s = p.skill;
      s.t += dt;
      const a = s.a0 + ((Math.PI * 2 * s.t) / s.dur) * s.turn;
      p.fx = Math.cos(a); p.fy = Math.sin(a); p.faceX = p.fx;
      p.vx = s.dx * CFG.SPEED * 0.95; p.vy = s.dy * CFG.SPEED * 0.95;
      if (s.t >= s.dur) { p.skill = null; p.fx = s.dx; p.fy = s.dy; }
    } else if (p.ultShot) {
      const d = Math.exp(-9 * dt);
      p.vx *= d; p.vy *= d;
    } else if (p.airborne) {
      // in the air: no steering, only a little drag
      const d = Math.exp(-1.2 * dt);
      p.vx *= d; p.vy *= d;
    } else {
      let max = b.owner === p ? CFG.SPEED_WITH_BALL : CFG.SPEED;
      if (p.charging && b.owner === p) max *= 0.22;            // set your feet to shoot
      if (p.passCharging && b.owner === p) max *= 0.8;
      if (p.stunT > 0) max *= 0.25;
      if (p.recoverT > 0) max *= 0.35;
      if (p.fallT > 0) max = 0;
      if (p.burstT > 0) max *= 1.32;
      else if (p.sprintOn) max *= b.owner === p ? SPRINT.ballMul : SPRINT.mul;
      max *= p.speedMul * p.attr.speed;
      const tx = p.mx * p.mSpeed * max, ty = p.my * p.mSpeed * max;
      const idle = p.mx === 0 && p.my === 0;
      const acc = p.isHuman && !m.autopilot ? (idle ? CFG.HUMAN_DECEL : CFG.HUMAN_ACCEL) : CFG.ACCEL;
      const k = 1 - Math.exp(-acc * (p.fallT > 0 ? 2 : 1) * dt);
      p.vx += (tx - p.vx) * k;
      p.vy += (ty - p.vy) * k;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // off the floor and back down (a dunk sets its own height)
    if (!p.dunk && (p.z > 0 || p.vz > 0)) {
      p.vz -= CFG.GRAVITY * dt;
      p.z += p.vz * dt;
      if (p.z <= 0) { p.z = 0; p.vz = 0; p.recoverT = Math.max(p.recoverT, 0.06); }
    }

    const sp = p.speed;
    if (p.kickT <= 0 && !p.skill && p.fallT <= 0 && !p.dunk && !p.airborne) {
      let fx, fy;
      if (sp > 25) { fx = p.vx / sp; fy = p.vy / sp; }
      else if (p.celebrateT > 0 && p.celeFaceX) { fx = p.celeFaceX; fy = 0.25; }
      else if (b.owner === p) { const dx = hoopX(p.team) - p.x, dy = hoopY() - p.y, l = Math.hypot(dx, dy) || 1; fx = dx / l; fy = dy / l; }
      else { const dx = b.x - p.x, dy = b.y - p.y, l = Math.hypot(dx, dy) || 1; fx = dx / l; fy = dy / l; }
      let tfx = fx, tfy = fy;
      const you = p.isHuman && !m.autopilot;
      if (you && (p.mx || p.my)) { tfx = p.mx; tfy = p.my; }
      turnToward(p, tfx, tfy, (you ? 22 : 10) * dt);
    }
    if (!p.skill) {
      const wantX = Math.abs(p.fx) > 0.12 ? Math.sign(p.fx) : Math.sign(p.faceX) || 1;
      p.faceX += (wantX - p.faceX) * (1 - Math.exp(-18 * dt));
    }
    p.runPhase += sp * dt * 0.075;
    p.dribble += dt * (b.owner === p ? lerp(8.5, 13, clamp(sp / CFG.SPEED, 0, 1)) : 8.5);

    if (sp > 230 && !p.airborne) {
      p.dustT -= dt;
      if (p.dustT <= 0) { p.dustT = 0.13; FX.dust(p.x - p.vx / sp * 8, p.y - p.vy / sp * 4); }
    }
    if ((p.burstT > 0 || p.sprintOn) && sp > 150) {
      p.streakT -= dt;
      if (p.streakT <= 0) { p.streakT = p.burstT > 0 ? 0.05 : 0.09; FX.speedLine(p.x, p.y, p.vx, p.vy); }
    }
  }

  // push apart so nobody stands inside anybody (two players in the air pass over each other)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], c = ps[j];
        if (a.dunk || c.dunk) continue;
        const dx = c.x - a.x, dy = c.y - a.y, min = a.r + c.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2);
        const ux = d > 0.001 ? dx / d : 1, uy = d > 0.001 ? dy / d : 0;
        const overlap = (min - d) / 2;
        a.x -= ux * overlap; a.y -= uy * overlap;
        c.x += ux * overlap; c.y += uy * overlap;
      }
    }
  }
  const stands = STANDS();
  for (const p of ps) {
    for (const s of stands) {
      const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy), min = p.r + 14;
      if (d < min && d > 0.001) { p.x = s.x + (dx / d) * min; p.y = s.y + (dy / d) * min; }
    }
    collideWalls(p, p.r, 0);
  }
}

// ===== Dunks and layups =================================================
// A dunk (or a layup) is a short scripted flight: off the floor towards the rim, the ball goes in
// at the top (or is blocked, or rattles out on a layup), a moment on the rim, and down.
const DUNK = { dur: 0.62, top: 0.36, peak: 78, layupDur: 0.52, layupTop: 0.3, layupPeak: 46 };

function stepDunk(m, p, dt) {
  const d = p.dunk;
  d.t += dt;
  const u = d.t / d.dur;
  if (d.t <= d.top) {
    const k = easeOut(clamp(d.t / d.top, 0, 1));
    p.x = lerp(d.x0, d.tx, k); p.y = lerp(d.y0, d.ty, k);
  }
  p.z = Math.max(0, Math.sin(clamp(u, 0, 1) * Math.PI) * d.peak);
  p.vx = 0; p.vy = 0;
  const fx = d.hx - p.x, fy = d.hy - p.y, fl = Math.hypot(fx, fy);
  if (fl > 4) { p.fx = fx / fl; p.fy = fy / fl; p.faceX = Math.abs(p.fx) > 0.1 ? Math.sign(p.fx) : p.faceX; }
  if (!d.done && d.t >= d.top) { d.done = true; finishDunk(m, p); }
  if (u >= 1) { p.dunk = null; p.z = 0; p.vz = 0; p.recoverT = 0.12; }
}

// the moment at the top: in, or blocked, or (a layup) off the rim
function finishDunk(m, p) {
  const b = m.ball, d = p.dunk;
  if (b.owner !== p) return;                     // it was knocked away on the way up
  const side = hoopSide(d.hx);
  // a defender in the air at the rim can get a hand to it
  const blocker = rimBlocker(m, p);
  if (blocker && !d.ult) {
    const chance = (d.kind === 'dunk' ? 0.22 : 0.3) * blockSkill(m, blocker) * (1 - p.attr.ctl * 0.1);
    if (Math.random() < chance) { swat(m, blocker, p); return; }
  }
  if (d.kind === 'layup' && !d.ult) {
    // a layup is let go of at the top: it rolls in or off, like any shot
    releaseShot(m, p, { kind: 'layup', make: Math.random() < d.chance, pts: 2, perfect: false, power: false, x0: p.x, y0: p.y, z0: p.z + 76 });
    return;
  }
  // slammed through
  b.owner = null;
  b.x = d.hx; b.y = d.hy; b.z = CFG.RIM_Z + 4; b.vx = 0; b.vy = 0; b.vz = -260;
  b.lastKicker = p; b.lastTouchTeam = p.team;
  b.rim[side] = 1;
  p.stats.shots++; m.stats[p.team].shots++;
  p.stats.dunks++;
  p.shootT = 0.3;
  if (!d.ult) { Sound.dunk(); FX.doShake(9, 0.25); vibrate([30, 30, 40]); }
  basketThrough(m, { team: p.team, shooter: p, pts: 2, kind: 'dunk', alley: !!d.alley, ult: !!d.ult, power: false, perfect: false });
}

// a defender up in the air close enough to the rim (and the dunker) to get a hand to it
function rimBlocker(m, p) {
  let best = null, bestD = 1e9;
  for (const o of m.players) {
    if (o.team === p.team || o.z < 22 || o.fallT > 0) continue;
    const d = dist(o.x, o.y, p.x, p.y);
    if (d < 48 && d < bestD) { best = o; bestD = d; }
  }
  return best;
}
const blockSkill = (m, o) => (o.isHuman && !m.autopilot ? 1.15 : 0.9 * ((m.diff || {}).blockSkill || 1)) * (1 + o.attr.def * 0.15);

// knock it away: off a dunk, a layup or a jump shot on its way up
function swat(m, o, shooter) {
  const b = m.ball;
  const dx = b.x - o.x, dy = b.y - o.y, l = Math.hypot(dx, dy) || 1;
  const away = TEAMS[o.team].dir;     // towards the side the blocker attacks, mostly
  b.owner = null; b.shot = null; b.through = null;
  b.vx = (dx / l) * 140 + away * rand(220, 380); b.vy = (dy / l) * 140 + rand(-260, 260); b.vz = rand(80, 220);
  b.z = Math.max(b.z, o.z + 70);
  b.lastTouchTeam = o.team; b.lastKicker = o; b.lastPass = null; b.assist = null;
  b.pickupCd = 0.18;
  o.noPickupT = 0.2; o.blockT = 0.4;
  if (shooter) { shooter.noPickupT = 0.5; if (shooter.dunk) shooter.dunk.done = true; }
  o.stats.blocks++; m.stats[o.team].blocks = (m.stats[o.team].blocks || 0) + 1;
  Sound.block();
  FX.burst(b.x, b.y, b.z, '#ffffff', 30, 0.28);
  FX.stars(b.x, b.y, b.z);
  FX.text(o.x, o.y, tl('BLOCKED!'), '#ff5a5f', 20);
  FX.doShake(6, 0.18);
  if (o.isHuman || (shooter && shooter.isHuman)) vibrate(o.isHuman ? 35 : 20);
  addMeter(m, o, o.isHuman ? 12 : 8);
  addUlt(m, o, CFG.ULT_TACKLE);
  if (m.events) m.events.push({ e: 'block', p: m.players.indexOf(o) });
}

// ===== Ball =========================================================
function updateBall(m, dt) {
  const b = m.ball;
  b.pickupCd = Math.max(0, b.pickupCd - dt);
  for (const s of ['left', 'right']) { b.netBulge[s] = Math.max(0, b.netBulge[s] - dt * 1.6); b.rim[s] = Math.max(0, b.rim[s] - dt * 4); }

  const o = b.owner;
  if (o) {
    if (o.dunk || o.charging || o.ultShot || (o.ai && o.ai.holdUp)) {
      // held: up in both hands, over the head going up for a dunk or a shot
      const up = o.dunk ? 70 : o.charging ? 66 : 48;
      b.x += (o.x + o.fx * 6 - b.x) * 0.6; b.y += (o.y + o.fy * 3 - b.y) * 0.6;
      b.z = o.z + up; b.vx = o.vx; b.vy = o.vy; b.vz = 0;
    } else {
      // a dribble: down and up at the side you're going, quicker when you run
      const sp = clamp(o.speed / CFG.SPEED, 0, 1.4);
      const side = o.faceX >= 0 ? 1 : -1;
      const off = o.r + CFG.BALL_R - 1 + sp * 6;
      const tx = o.x + o.fx * off - o.fy * side * 7, ty = o.y + o.fy * off + o.fx * side * 5;
      const k = 1 - Math.exp(-(o.skill ? 45 : 26) * dt);
      const px0 = b.x, py0 = b.y;
      sweepBallFrom(b, o.x, o.y, b.x + (tx - b.x) * k, b.y + (ty - b.y) * k);
      b.vx = (b.x - px0) / dt; b.vy = (b.y - py0) / dt;
      const ph = Math.abs(Math.sin(o.dribble));
      const was = b.z;
      b.z = o.z + ph * CFG.DRIBBLE_H * (o.hopT > 0 ? 0.3 : 1);
      if (was > 4 && b.z <= 4 && !o.airborne) Sound.dribble(sp);
      b.vz = 0;
      if (dist(b.x, b.y, o.x, o.y) > o.r + CFG.BALL_R + 60) loseBall(m, o, 0.3);
      if (o.isHuman) o.dribbleDist = (o.dribbleDist || 0) + o.speed * dt;
    }
    b.roll += Math.hypot(b.vx, b.vy) * dt / CFG.BALL_R;
  } else if (b.shot) {
    flyShot(m, b, dt);
  } else if (b.through) {
    // down through the net and onto the floor under the hoop
    const t = b.through;
    t.t += dt;
    b.vz -= CFG.GRAVITY * 0.55 * dt;
    b.z = Math.max(0, b.z + b.vz * dt);
    b.vx = 0; b.vy = 0;
    if (b.z <= 0) { b.through = null; b.vz = 140; b.vx = TEAMS[t.team].dir * -40; }
  } else {
    looseBall(m, b, dt);
  }
  // safety: a ball that ends up outside the fence goes back to the last spot it was legal
  if (insideArena(b.x, b.y)) { b.safeX = b.x; b.safeY = b.y; }
  else {
    if (b.owner) loseBall(m, b.owner, 0.3);
    b.x = b.safeX; b.y = b.safeY; b.vx *= -0.3; b.vy *= -0.3;
  }
  if (!isFinite(b.x + b.y + b.z + b.vx + b.vy + b.vz)) b.reset(CFG.FIELD_W / 2, CFG.FIELD_H / 2);

  // trail samples at a fixed rate so it looks the same at any frame rate
  b.trailT -= dt;
  if (b.trailT <= 0) {
    b.trailT = 1 / 60;
    const s = Math.hypot(b.vx, b.vy) + Math.abs(b.vz) * 0.5;
    const maxLen = TRAIL_LEN[b.trailType] || 0;
    if (b.shot && b.shot.ult && !Game.headless) FX.ember(b.x, b.y, b.z + CFG.BALL_R, pick(FIRE_COLS));
    if (!b.owner && b.trailType && (s > 200 || b.shot)) {
      b.trail.unshift({ x: b.x, y: b.y, z: b.z });
      if (b.trail.length > maxLen) b.trail.length = maxLen;
    } else if (b.trail.length) {
      b.trail.pop();
      if (!b.trail.length) b.trailType = null;
    } else b.trailType = null;
  }
}

// a loose ball: gravity, bounces off the floor, the fence and the backboards, and anyone can take it
function looseBall(m, b, dt) {
  const sp0 = Math.hypot(b.vx, b.vy, b.vz);
  const n = Math.max(1, Math.ceil((sp0 * dt) / 6));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const z0 = b.z;
    if (b.z > 0 || b.vz > 0) {
      b.vz -= CFG.GRAVITY * h;
      b.z += b.vz * h;
      if (b.z <= 0) {
        b.z = 0;
        if (b.vz < -90) { Sound.bounce(-b.vz); b.vz = -b.vz * CFG.BALL_BOUNCE; } else b.vz = 0;
      }
    }
    const damp = Math.exp(-(b.z > 0.5 ? CFG.BALL_AIR_DRAG : CFG.BALL_FRICTION) * h);
    b.vx *= damp; b.vy *= damp;
    if (b.z <= 0.5) {
      const s = Math.hypot(b.vx, b.vy);
      if (s < 30 * h + 0.5) { b.vx = 0; b.vy = 0; } else { const f = (s - 30 * h) / s; b.vx *= f; b.vy *= f; }
    }
    const x0 = b.x;
    b.x += b.vx * h; b.y += b.vy * h;
    backboards(b, x0);
    // dropping through a hoop from above counts (a tip-in, a putback, a lucky bounce)
    if (z0 > CFG.RIM_Z && b.z <= CFG.RIM_Z && b.vz < 0 && !b.dead && m.phase === 'play') {
      for (const hx of [CFG.HOOP_IN, CFG.FIELD_W - CFG.HOOP_IN]) {
        if (dist(b.x, b.y, hx, hoopY()) < CFG.RIM_R * 0.8) {
          const team = hx > CFG.FIELD_W / 2 ? 'blue' : 'red';   // the side that attacks this hoop
          const by = b.lastKicker && b.lastKicker.team === team ? b.lastKicker : null;
          b.x = hx; b.y = hoopY(); b.vx = 0; b.vy = 0; b.vz = Math.min(b.vz, -120);
          if (by) { by.stats.shots++; m.stats[team].shots++; }
          basketThrough(m, { team, shooter: by, pts: 2, kind: 'tip', power: false, perfect: false });
          return;
        }
      }
    }
    const hit = collideWalls(b, CFG.BALL_R, CFG.WALL_BOUNCE);
    if (hit.hit > 160) Sound.board(hit.hit);
    ballContacts(m, b);
    if (b.owner) break;
  }
  b.roll += Math.hypot(b.vx, b.vy) * dt / CFG.BALL_R;
}

// the backboards stand above the floor behind each rim: a ball that gets there comes back off them
function backboards(b, x0) {
  if (b.z < CFG.BOARD_Z0 || b.z > CFG.BOARD_Z1 || Math.abs(b.y - hoopY()) > CFG.BOARD_W / 2 + CFG.BALL_R) return;
  for (const [bx, dir] of [[CFG.BOARD_IN, 1], [CFG.FIELD_W - CFG.BOARD_IN, -1]]) {
    const face = bx + dir * CFG.BALL_R;
    if ((x0 - face) * dir >= 0 && (b.x - face) * dir < 0) {
      b.x = face; b.vx = -b.vx * 0.55;
      if (Math.abs(b.vx) > 60) Sound.backboard();
    }
  }
}

function loseBall(m, p, noPickup) {
  const b = m.ball;
  if (b.owner !== p) return;
  b.owner = null;
  p.noPickupT = noPickup;
  if (p.isHuman && p.charging) { p.charging = false; Sound.chargeStop(); }
}

// who touches a loose ball first takes it: close enough, and it's low enough to reach
function ballContacts(m, b) {
  if (b.pickupCd > 0 || m.phase !== 'play' || b.dead) return;
  let best = null, bestD = 1e9;
  for (const p of m.players) {
    if (p.noPickupT > 0 || p.stunT > 0 || p.fallT > 0 || p.dunk || p.ultShot) continue;
    const reachZ = p.z + CFG.REACH + (p.blockT > 0 || p.z > 10 ? 22 : 0);
    if (b.z > reachZ) continue;
    const reach = p.r + CFG.BALL_R + 7 + (p.z > 10 ? 6 : 0);
    const d = dist(p.x, p.y, b.x, b.y);
    if (d < reach && d < bestD) { best = p; bestD = d; }
  }
  if (!best) return;
  const lp = b.lastPass;
  // a pass going past a defender: a hand on it doesn't always mean it's caught (one try each)
  if (lp && lp.team !== best.team && Math.hypot(b.vx, b.vy) > 250) {
    lp.tried = lp.tried || [];
    if (lp.tried.includes(best)) return;
    lp.tried.push(best);
    const you = best.isHuman && !m.autopilot;
    const chance = (you ? 0.5 : 0.3 * ((m.diff || {}).stealSkill || 1)) * (1 + best.attr.def * 0.2) * (best.z > 10 ? 1.3 : 1);
    if (Math.random() >= chance) {
      // got a touch on it: knocked a little off its line, it carries on
      if (Math.random() < 0.35) { b.vx *= 0.8; b.vy = b.vy * 0.8 + rand(-90, 90); b.vz = Math.max(b.vz, 60); Sound.catchBall(); }
      best.noPickupT = 0.25;
      return;
    }
  }
  // a lob to a teammate by the rim is an alley-oop: caught in the air and put straight down
  if (lp && lp.lob && lp.team === best.team && lp.from !== best && b.z > 58 && toHoop(best.team, best.x, best.y) < CFG.DUNK_R * 1.35 && m.phase === 'play') {
    takePossession(m, best);
    startDunk(m, best, { alley: true });
    return;
  }
  takePossession(m, best);
}

function takePossession(m, p) {
  const b = m.ball;
  b.restartBy = null; // (PRO MATCH: somebody has touched an inbound, so the clock runs)
  const prevTeam = b.lastTouchTeam;
  const lp = b.lastPass;
  const wasShotMiss = b.missFrom && m.clock - b.missFrom.t < 6;
  if (lp && lp.from !== p && lp.team === p.team && m.clock - lp.t < 5) {
    lp.from.stats.passes++;
    m.stats[p.team].passes++;
    b.assist = { from: lp.from, t: m.clock };
    if (lp.from.isHuman) { addMeter(m, lp.from, 8); FX.text(p.x, p.y, tl('+PASS'), '#ffffff', 15); }
    else if (p.isHuman) addMeter(m, p, 3);
    if (p.team === 'red') addMeter(m, p, 5);
  }
  if (lp && lp.team !== p.team) {
    b.assist = null;
    // a pass picked off
    p.stats.steals++; m.stats[p.team].steals++;
    FX.text(p.x, p.y, tl('PICKED OFF!'), '#ffb03a', 16);
    addMeter(m, p, p.isHuman ? 10 : 6);
    addUlt(m, p, CFG.ULT_TACKLE);
  }
  if (wasShotMiss) {
    p.stats.rebounds++; m.stats[p.team].rebounds = (m.stats[p.team].rebounds || 0) + 1;
    if (p.isHuman || Math.random() < 0.5) FX.text(p.x, p.y, b.missFrom.team === p.team ? tl('OFFENSIVE BOARD!') : tl('REBOUND!'), '#ffffff', 15);
    if (p.z > 10) Sound.catchBall();
    b.missFrom = null;
    if (b.missFrom === null && p.team !== prevTeam) b.assist = null;
  }
  b.lastPass = null;
  b.owner = p;
  b.lastKicker = p;
  b.shot = null; b.through = null; b.spinT = 0; b.vz = 0;
  b.touchKick = 0;
  b.pickupCd = 0.08;
  p.touchT = 0.15;
  p.holdT = 0;
  p.ai.holdT = 0;
  if (prevTeam && prevTeam !== p.team) {
    p.protectT = p.isHuman ? 0.7 : 0.55;
    b.assist = null;
    Sound.possession();
    FX.ring(p.x, p.y, TEAMS[p.team].fx, 8, 30, 0.3, 3);
  } else Sound.catchBall();
  b.lastTouchTeam = p.team;
  if (m.shotClock !== undefined && prevTeam !== p.team) m.shotClock = CFG.SHOT_CLOCK;
}

// ULT: ON FIRE. Fills from your baskets, skills, assists, steals and blocks.
function addUlt(m, p, amt) {
  if (!p.isHuman || m.autopilot || p.ultOn) return;
  const before = p.ult;
  p.ult = Math.min(CFG.ULT_MAX, p.ult + amt);
  if (before < CFG.ULT_MAX && p.ult >= CFG.ULT_MAX && !Game.headless) {
    Sound.powerReady();
    FX.text(p.x, p.y, tl('ULT READY!'), '#ff4df0', 19);
    if (p === m.human) vibrate([25, 40, 25]);
  }
}

// switch it on: you're on fire until your next shot
function performUlt(m, p) {
  if (!p.isHuman || m.autopilot || p.ultOn || p.ultShot || p.ult < CFG.ULT_MAX || m.phase !== 'play') return false;
  p.ultOn = true;
  if (!Game.headless) {
    for (let i = 0; i < 7; i++) FX.ring(p.x, p.y, rainbow(i * 0.12), 8 + i * 4, 60 + i * 12, 0.5, 4);
    FX.burst(p.x, p.y, 10, '#ff4df0', 40, 0.4);
    FX.doFlash('#ff8a1f', 0.3);
    FX.doShake(7, 0.2);
    FX.text(p.x, p.y, tl("YOU'RE ON FIRE!"), '#ffb03a', 24);
    Sound.powerShot();
    if (p === m.human) vibrate(60);
  }
  return true;
}

// The ON FIRE shot: whatever you were going to do, it goes in. Close to the rim it is a monster dunk,
// anywhere else a flaming shot that drops through from wherever you are.
function ultShot(m, p) {
  const b = m.ball;
  if (b.owner !== p) return false;
  const near = toHoop(p.team, p.x, p.y) < CFG.DUNK_R * 1.6;
  const kind = randomUlt(near);
  p.ultOn = false; p.ult = 0;
  p.ultShot = { kind, t: 0, dur: near ? DUNK.dur : 0.8 };
  p.charging = false; p.passCharging = false;
  m.slowmo = 0.45;
  if (!Game.headless) {
    for (let i = 0; i < 7; i++) FX.sparks(b.x, b.y, 30, FIRE_COLS[i % 3], 7, 300 + i * 40, 0.5);
    FX.burst(b.x, b.y, 40, '#fff6c8', 58, 0.35);
    FX.ring(p.x, p.y, FIRE_COLS[1], 10, 90, 0.4, 6);
    FX.doFlash('#ffb03a', 0.45);
    FX.doShake(12, 0.3);
    Sound.powerShot();
    if (p.isHuman) vibrate([40, 30, 60]);
  }
  if (near) { startDunk(m, p, { ult: kind }); return true; }
  const pts = isThree(p.team, p.x, p.y) ? 3 : 2;
  releaseShot(m, p, { kind: 'jumper', make: true, pts, perfect: true, power: true, ult: kind, x0: p.x, y0: p.y, z0: 86 });
  return true;
}

function addMeter(m, p, amt) {
  const team = p.team;
  if (m.teamHuman && m.teamHuman[team] && !p.isHuman && !m.autopilot) return;
  const before = m.meter[team];
  m.meter[team] = Math.min(CFG.POWER_MAX, m.meter[team] + amt);
  if (p.isHuman && before < CFG.POWER_MAX && m.meter[team] >= CFG.POWER_MAX && !Game.headless) {
    Sound.powerReady();
    FX.text(p.x, p.y, tl('POWER READY!'), '#46d9ff', 17);
  }
}

// A pass from your own side on its way to you: SKILL waits for it rather than reaching for a steal.
function passComing(m, p) {
  const b = m.ball;
  if (b.owner || b.shot || b.lastTouchTeam !== p.team) return false;
  const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy), v = Math.hypot(b.vx, b.vy);
  if (d > 900 || v < 40) return false;
  if (b.lastPass && b.lastPass.target === p) return true;
  return d < 220 && (b.vx * dx + b.vy * dy) / (d * v) > 0.8;
}

// ===== Pass =========================================================
function laneBlocked(m, team, x1, y1, x2, y2, width) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  for (const o of m.players) {
    if (o.team === team) continue;
    const t = ((o.x - x1) * dx + (o.y - y1) * dy) / l2;
    if (t < 0.08 || t > 0.96) continue;
    const px = x1 + dx * t, py = y1 + dy * t;
    if (dist(o.x, o.y, px, py) < width + o.r) return true;
  }
  return false;
}

function choosePassTarget(m, p, ax, ay) {
  let best = null, bestScore = -1e9;
  for (const q of m.players) {
    if (q.team !== p.team || q === p) continue;
    const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
    if (d < 40 || d > 1500) continue;
    const cos = (dx * ax + dy * ay) / d;
    if (cos < 0.3) continue;
    let score = cos * 1.6 - d / 1100;
    if (laneBlocked(m, p.team, p.x, p.y, q.x, q.y, 14)) score -= 0.35;
    if (score > bestScore) { bestScore = score; best = q; }
  }
  return best;
}

// charge: seconds PASS was held. A tap is a chest pass; held all the way it is a lob, high over
// everyone — and a lob to a teammate by the rim is an alley-oop.
function performPass(m, p, ax, ay, forced, charge = 0) {
  const b = m.ball;
  if (b.owner !== p || p.dunk || p.ultShot) return false;
  p.skill = null;
  let l = Math.hypot(ax, ay);
  if (l < 0.1) { ax = p.fx; ay = p.fy; l = 1; }
  ax /= l; ay /= l;
  const target = forced || choosePassTarget(m, p, ax, ay);
  const power = charge > CFG.PASS_CHARGE_TAP ? clamp((charge - CFG.PASS_CHARGE_TAP) / (CFG.PASS_CHARGE_FULL - CFG.PASS_CHARGE_TAP), 0, 1) : 0;
  let tx, ty;
  if (target) {
    const d0 = dist(b.x, b.y, target.x, target.y);
    const lead = (d0 / 900) * 0.8;
    tx = clamp(target.x + target.vx * lead, 10, CFG.FIELD_W - 10);
    ty = clamp(target.y + target.vy * lead, 10, CFG.FIELD_H - 10);
  } else {
    tx = b.x + ax * (380 + power * 300); ty = b.y + ay * (380 + power * 300);
  }
  // a bot's pass wobbles, and now and then it's just a bad ball
  const slip = target ? botSlip(m, p) : 0;
  if (slip) {
    const pressed = underPressure(m, p, 70) ? 2 : 1;
    let err = rand(-1, 1) * BOT_MISTAKES.passAim * slip * pressed;
    if (Math.random() < BOT_MISTAKES.passBad * slip * (pressed > 1 ? 1.5 : 1)) err += (Math.random() < 0.5 ? -1 : 1) * rand(0.18, 0.36);
    const D = dist(b.x, b.y, tx, ty), a = Math.atan2(ty - b.y, tx - b.x) + err;
    tx = b.x + Math.cos(a) * D; ty = b.y + Math.sin(a) * D;
  }
  const D = Math.max(30, dist(b.x, b.y, tx, ty));
  const lob = power >= 0.85 && D > 140;
  const z0 = 44;
  let T, z1;
  if (lob) { T = 0.55 + D / 1700; z1 = 100; }
  else { T = D / (clamp(CFG.PASS_MIN + D * 0.5, CFG.PASS_MIN, CFG.PASS_MAX) * p.attr.pass); z1 = 40; }
  b.owner = null;
  b.x = p.x + ax * (p.r + 2); b.y = p.y + ay * (p.r + 2); b.z = z0;
  b.vx = (tx - b.x) / T; b.vy = (ty - b.y) / T;
  b.vz = (z1 - z0) / T + (CFG.GRAVITY * T) / 2;
  b.shot = null; b.spinT = 0;
  b.trailType = 'pass'; b.trail.length = 0;
  b.lastPass = { from: p, team: p.team, t: m.clock, target, lob };
  b.lastKicker = p; b.lastTouchTeam = p.team;
  m.stats[p.team].passTries = (m.stats[p.team].passTries || 0) + 1;
  p.noPickupT = 0.25; p.kickT = 0.18; p.kickDur = 0.18;
  p.fx = ax; p.fy = ay;
  if (p.isHuman && p.charging) { p.charging = false; Sound.chargeStop(); }
  Sound.pass();
  FX.ring(b.x, b.y, '#ffffff', 4, lob ? 30 : 18, lob ? 0.3 : 0.22, lob ? 4 : 2.5);
  return true;
}

// ===== Shoot ========================================================
// How tightly a shot is guarded: 0 wide open, 1 a hand in your face. Only defenders between you and
// the rim count, and one in the air counts for more.
function contestOf(m, p) {
  const hx = hoopX(p.team), hy = hoopY();
  const tx = hx - p.x, ty = hy - p.y, tl0 = Math.hypot(tx, ty) || 1;
  let c = 0;
  for (const o of m.players) {
    if (o.team === p.team || o.fallT > 0) continue;
    const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy);
    if (d > 105) continue;
    const front = (dx * tx + dy * ty) / (d * tl0 || 1);
    if (front < -0.2 && d > 30) continue;          // behind you: no hand in your face
    let k = clamp((105 - d) / 80, 0, 1);
    if (o.z > 14 || o.blockT > 0) k = Math.min(1, k * 1.45);
    if (o.stunT > 0 || o.recoverT > 0) k *= 0.4;
    c = Math.max(c, k * (1 + o.attr.def * 0.1));
  }
  return clamp(c, 0, 1);
}

// how likely a jump shot from here goes in, before anyone contests it, with a good release
function shotBase(d) {
  if (d < CFG.LAYUP_R) return 0.62;
  if (d < CFG.THREE_R) return lerp(0.56, 0.46, (d - CFG.LAYUP_R) / (CFG.THREE_R - CFG.LAYUP_R));
  if (d < 620) return lerp(0.42, 0.31, (d - CFG.THREE_R) / (620 - CFG.THREE_R));
  if (d < 950) return lerp(0.28, 0.07, (d - 620) / 330);
  return 0.04;
}
// timing: 'perfect' (the green at the top of the meter), 'good', 'early' or 'late'
function shotChance(m, p, d, timing, contest) {
  const f = clamp(p.attr.shot - 1, -0.1, 0.12) * 1.2;   // a better shooter, a little more often in
  let c;
  if (timing === 'perfect') c = Math.max(0.24, 0.93 - Math.max(0, d - 620) * 0.0013) * (1 - 0.5 * contest);
  else if (timing === 'good') c = shotBase(d) * (1 - 0.6 * contest);
  else c = shotBase(d) * 0.42 * (1 - 0.6 * contest);
  return clamp(c * (1 + f), 0.02, 0.97);
}
function timingOf(u) {
  if (u >= CFG.PERFECT_LO && u <= CFG.PERFECT_HI) return 'perfect';
  if (u >= CFG.GOOD_LO && u <= 1.12) return 'good';
  return u < CFG.GOOD_LO ? 'early' : 'late';
}
// a bot's release: how often it nails the timing is its difficulty
function botTiming(m, p) {
  const d = m.diff || Game.difficulty();
  const r = Math.random(), perfect = (d.shotPerfect || 0.3) * (1 - botSlip(m, p) * 0.1), good = d.shotGood || 0.45;
  return r < perfect ? 'perfect' : r < perfect + good ? 'good' : Math.random() < 0.5 ? 'early' : 'late';
}

// SHOOT. Close to the rim it's a dunk or a layup at once; further out it's a jump shot, and chargeT
// (how long SHOOT was held) says how good the release was. Bots pass chargeT < 0: they time it
// their own way (botTiming).
function performShot(m, p, chargeT, sideY, noise = 0) {
  const b = m.ball;
  if (b.owner !== p || p.dunk || p.ultShot || m.phase !== 'play') return false;
  if (p.ultOn) return ultShot(m, p);
  p.skill = null;
  const d = toHoop(p.team, p.x, p.y);
  if (d < CFG.LAYUP_R && !p.airborne) {
    startDunk(m, p, {});
    return true;
  }
  const you = p.isHuman && !m.autopilot;
  let timing = chargeT >= 0 ? timingOf(chargeT / CFG.METER_T) : botTiming(m, p);
  const canPower = p.isHuman || !(m.teamHuman && m.teamHuman[p.team]) || m.autopilot;
  const power = canPower && m.meter[p.team] >= CFG.POWER_MAX && timing !== 'early' && timing !== 'late';
  if (power) { timing = 'perfect'; m.meter[p.team] = 0; } else addMeter(m, p, 4);
  const contest = contestOf(m, p);
  const pts = isThree(p.team, p.x, p.y) ? 3 : 2;
  const chance = shotChance(m, p, d, timing, contest);
  const make = Math.random() < chance;
  if (you && !Game.headless) {
    const say = { perfect: [tl('PERFECT!'), '#3fe07a'], good: [tl('GOOD'), '#ffe14d'], early: [tl('EARLY'), '#ff8a8e'], late: [tl('LATE'), '#ff8a8e'] }[timing];
    FX.text(p.x, p.y, say[0], say[1], timing === 'perfect' ? 19 : 15);
  }
  // up: a jump shot leaves the hands at the top of a quick jump
  jump(p, CFG.JUMP_V * 0.72);
  releaseShot(m, p, { kind: 'jumper', make, pts, timing, perfect: timing === 'perfect', power, contest, x0: p.x, y0: p.y, z0: 82 });
  return true;
}

// go up for a dunk (or a layup when there isn't the room or the run-up for one)
function startDunk(m, p, o = {}) {
  const b = m.ball, hx = hoopX(p.team), hy = hoopY(), dir = TEAMS[p.team].dir;
  const d = toHoop(p.team, p.x, p.y);
  const toward = ((hx - p.x) * p.vx + (hy - p.y) * p.vy) / (d || 1);
  const dunk = !!o.ult || !!o.alley || (d < CFG.DUNK_R && (toward > 60 || d < 95));
  const kind = dunk ? 'dunk' : 'layup';
  // the spot you go up to: just in front of the rim, on the side you came from
  const ang = Math.atan2(p.y - hy, (p.x - hx) * -dir);
  const ox = Math.cos(clamp(ang, -1.2, 1.2)) * (dunk ? 22 : 54), oy = Math.sin(clamp(ang, -1.2, 1.2)) * (dunk ? 22 : 54);
  const tx = hx - dir * ox, ty = hy + oy;
  const contest = contestOf(m, p);
  const chance = clamp(0.84 * (1 - 0.55 * contest) * (1 + clamp(p.attr.shot - 1, -0.1, 0.12)), 0.2, 0.95);
  p.dunk = { kind, t: 0, dur: dunk ? DUNK.dur : DUNK.layupDur, top: dunk ? DUNK.top : DUNK.layupTop, peak: dunk ? DUNK.peak : DUNK.layupPeak,
    x0: p.x, y0: p.y, tx, ty, hx, hy, done: false, chance, alley: !!o.alley, ult: o.ult || null };
  p.charging = false; p.passCharging = false; p.skill = null;
  p.vx = 0; p.vy = 0;
  b.owner = p;
  if (!o.ult) Sound.whoosh(true);
  if (o.alley) { FX.text(p.x, p.y, tl('ALLEY-OOP!'), '#ff8af0', 20); if (p.isHuman || b.lastKicker && b.lastKicker.isHuman) vibrate(30); }
  return true;
}

// the ball leaves the hands on its way to the rim: the arc, how long it takes, and what happens
function releaseShot(m, p, s) {
  const b = m.ball, hx = hoopX(p.team), hy = hoopY(), side = hoopSide(hx);
  const d = dist(s.x0, s.y0, hx, hy);
  // where it comes down: the middle of the rim for a swish, the front or back iron for a miss
  let ex = hx, ey = hy, ez = CFG.RIM_Z, end = 'swish';
  const toward = Math.atan2(hy - s.y0, hx - s.x0);
  const R = CFG.RIM_R;
  if (s.make) {
    end = s.perfect || s.ult || Math.random() < 0.45 ? 'swish' : 'rimIn';
    if (end === 'rimIn') { const a = toward + rand(-0.5, 0.5); ex = hx + Math.cos(a) * R * 0.75; ey = hy + Math.sin(a) * R * 0.75; }
  } else {
    const r = Math.random();
    const air = s.kind === 'jumper' && (s.timing === 'early' || s.timing === 'late') && r < 0.18;
    if (air) {
      end = 'air';
      const short = s.timing === 'early' ? 1 : -1;
      ex = hx - Math.cos(toward) * R * rand(1.8, 3.2) * short; ey = hy - Math.sin(toward) * R * rand(1.8, 3.2) * short + rand(-14, 14);
      ez = CFG.RIM_Z - 10;
    } else if (r < 0.62) {
      end = 'rimOut';
      const a = toward + rand(-0.9, 0.9) + (Math.random() < 0.5 ? 0 : Math.PI);
      ex = hx + Math.cos(a) * R * 1.05; ey = hy + Math.sin(a) * R * 1.05;
    } else {
      end = 'board';
      ex = hx + Math.cos(toward) * (R + 10); ey = hy + rand(-R, R); ez = CFG.RIM_Z + rand(14, 40);
    }
  }
  const T = (s.kind === 'layup' ? 0.32 : 0.5) + d / 1500;
  const apex = s.kind === 'layup' ? 20 : 70 + d * 0.22;
  b.owner = null; b.through = null;
  b.x = s.x0; b.y = s.y0; b.z = s.z0;
  b.shot = { team: p.team, from: p, kind: s.kind, x0: s.x0, y0: s.y0, z0: s.z0, ex, ey, ez, T, t: 0, apex, make: !!s.make, end, pts: s.pts,
    perfect: !!s.perfect, power: !!s.power, ult: s.ult || null, level: s.power ? 2 : s.perfect ? 1 : 0, id: ++m.shotId, side, decided: true, save: false };
  b.trailType = s.ult ? 'fire' : s.power || s.perfect ? (p.trailId || (p.isHuman && !m.online && !m.autopilot ? Save.trail().id : 'shot')) : 'shot';
  b.trail.length = 0;
  b.lastKicker = p; b.lastTouchTeam = p.team; b.lastPass = null;
  p.noPickupT = 0.35; p.shootT = 0.45;
  p.charging = false;
  p.stats.shots++; m.stats[p.team].shots++;
  if (s.pts === 3) p.stats.threeTries = (p.stats.threeTries || 0) + 1;
  if (m.events) m.events.push({ e: 'shot', s: shotNet(b.shot) });
  if (s.kind === 'jumper' && !s.ult) Sound.shoot(s.power ? 1 : s.perfect ? 0.7 : 0.4);
  if (s.power) {
    const tr = TRAILS.find((x) => x.id === b.trailType) || TRAILS[1];
    FX.burst(b.x, b.y, b.z, tr.a, 40, 0.3);
    FX.ring(p.x, p.y, tr.b, 10, 70, 0.35, 5);
    FX.doFlash(tr.b, 0.3);
    FX.text(p.x, p.y, tl('POWER SHOT!'), tr.a, 20);
    Sound.powerShot();
  }
  if (p.isHuman) vibrate(s.power ? 40 : 12);
}
// a shot in flight, small enough to send to every screen (they draw the same arc from it)
function shotNet(s) {
  return [Math.round(s.x0), Math.round(s.y0), Math.round(s.z0), Math.round(s.ex), Math.round(s.ey), Math.round(s.ez), Math.round(s.T * 1000), Math.round(s.apex), s.id];
}
// where a shot is at time t on its arc
function shotPos(s, t) {
  const u = clamp(t / s.T, 0, 1);
  return { x: lerp(s.x0, s.ex, u), y: lerp(s.y0, s.ey, u), z: lerp(s.z0, s.ez, u) + 4 * s.apex * u * (1 - u), u };
}

function flyShot(m, b, dt) {
  const s = b.shot;
  s.t += dt;
  const P = shotPos(s, s.t);
  b.vx = (P.x - b.x) / dt; b.vy = (P.y - b.y) / dt; b.vz = (P.z - b.z) / dt;
  b.x = P.x; b.y = P.y; b.z = P.z;
  b.roll += 18 * dt;
  // on its way up it can still be blocked by a defender in the air right there
  if (P.u < 0.4 && !s.ult && s.kind === 'jumper') {
    for (const o of m.players) {
      if (o.team === s.team || o.z < 12) continue;
      const dxy = dist(o.x, o.y, b.x, b.y), handZ = o.z + CFG.REACH + 26;
      if (dxy < 28 && b.z < handZ + 10 && b.z > o.z + 36) {
        const chance = 0.3 * blockSkill(m, o) * (s.perfect ? 0.75 : 1);
        if (Math.random() < chance) { s.from && (s.from.noPickupT = 0.4); swat(m, o, null); return; }
        s.blockTried = true;
      }
    }
  }
  if (P.u < 1) return;
  // it has got there
  const side = s.side, hx = hoopX(s.team), hy = hoopY();
  b.shot = null;
  if (s.make) {
    if (s.end === 'rimIn') { b.rim[side] = 0.7; Sound.rim(0.4); }
    b.x = hx; b.y = hy; b.z = CFG.RIM_Z; b.vz = -200;
    basketThrough(m, { team: s.team, shooter: s.from, pts: s.pts, kind: s.kind, power: s.power, perfect: s.perfect, ult: s.ult, swish: s.end === 'swish' });
    return;
  }
  // off the iron, off the board, or nothing at all
  b.missFrom = { team: s.team, t: m.clock };
  b.lastTouchTeam = s.team;
  if (s.end === 'rimOut') {
    b.rim[side] = 1; Sound.rim(0.8);
    const a = Math.atan2(b.y - hy, b.x - hx) + rand(-0.8, 0.8);
    const v = rand(150, 340);
    b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; b.vz = rand(160, 380);
    b.z = CFG.RIM_Z + 4;
  } else if (s.end === 'board') {
    Sound.backboard(); b.rim[side] = 0.3;
    const out = -TEAMS[s.team].dir;   // back towards the court
    b.vx = out * rand(160, 300); b.vy = rand(-180, 180); b.vz = rand(-60, 120);
  } else {
    // an airball: it carries on and drops
    const T = s.T, vx = (s.ex - s.x0) / T, vy = (s.ey - s.y0) / T;
    b.vx = vx * 0.8; b.vy = vy * 0.8; b.vz = -120;
    if (s.from && s.from.isHuman) FX.text(b.x, b.y, tl('AIRBALL!'), '#ff8a8e', 16);
  }
  if (s.from && !s.from.isHuman) Sound.ooh();
  b.pickupCd = 0.06;
}

// a basket: the ball goes down through the net, and the points go up
function basketThrough(m, info) {
  const b = m.ball;
  b.through = { t: 0, team: info.team };
  b.shot = null; b.owner = null; b.dead = true;
  b.netBulge[hoopSide(hoopX(info.team))] = 1;
  if (typeof Match !== 'undefined' && Match.basket) Match.basket(m, info);
}

// ===== Sprint =======================================================
// Full tank lasts ~2.4s of sprinting. Empty = no sprint until 35% refilled.
const SPRINT = { mul: 1.3, ballMul: 1.18, drain: 0.42, regen: 0.3, delay: 0.35, unlock: 0.35 };

// ===== Steal (the old tackle button; identifiers still say "slide") ===
// Without the ball, the button reaches for it: a quick swipe at the ball. Close enough and it might
// come loose; reach from behind or into a ball the dribbler is shielding and it mostly won't.
const SLIDE = { time: 0.22, cooldown: 0.75, humanCooldown: 0.75, reach: 34, humanReach: 40, range: 90 };

function canAct(p) {
  if (p.ultShot || p.dunk) return false;
  return p.fallT <= 0 && p.recoverT <= 0 && p.stunT <= 0;
}

// (soccer's tackle warning: there is no lunge to see coming in basketball)
function slideIncoming() { return null; }

function tackleCooldown(p) {
  const base = p.isHuman ? SLIDE.humanCooldown : SLIDE.cooldown;
  return base * (1 - p.attr.def * 0.2);
}

// the steal: a swipe at the ball
function performSlide(m, p, ix, iy) {
  const b = m.ball;
  if (b.owner === p || p.slideCd > 0 || !canAct(p) || p.airborne) return false;
  let l = Math.hypot(ix, iy);
  let dx = l > 0.2 ? ix / l : p.fx, dy = l > 0.2 ? iy / l : p.fy;
  // reach for the ball if it is anywhere near, whatever way you're pointing
  const bx = b.x - p.x, by = b.y - p.y, bd = Math.hypot(bx, by);
  const mates = b.owner && b.owner.team === p.team;
  if (!mates && bd > 1 && bd < SLIDE.range + 40) { dx = bx / bd; dy = by / bd; }
  if (p.charging) { p.charging = false; Sound.chargeStop(); }
  p.slideT = SLIDE.time; p.slideHit = false; p.slideDirX = dx; p.slideDirY = dy;
  p.slideCd = tackleCooldown(p) + SLIDE.time;
  p.kickT = SLIDE.time; p.kickDur = SLIDE.time;
  p.fx = dx; p.fy = dy; p.faceX = Math.abs(dx) > 0.1 ? Math.sign(dx) : p.faceX;
  // a little lunge into it
  p.vx += dx * 160; p.vy += dy * 160;
  p.stats.slides = (p.stats.slides || 0) + 1;
  m.stats[p.team].slides = (m.stats[p.team].slides || 0) + 1;
  Sound.slide();
  return true;
}

// a clean steal: the ball comes loose towards you (or straight into your hands)
function trip(m, thief, c) {
  const b = m.ball;
  if (c.charging) { c.charging = false; Sound.chargeStop(); }
  c.skill = null; c.burstT = 0;
  c.stunT = 0.3; c.noPickupT = 0.45;
  thief.slideHit = true;
  thief.stats.steals++; thief.stats.tackles++;
  m.stats[thief.team].steals++; m.stats[thief.team].tackles = (m.stats[thief.team].tackles || 0) + 1;
  b.owner = null; b.lastPass = null; b.assist = null; b.shot = null;
  if (Math.random() < 0.55) { thief.noPickupT = 0; b.pickupCd = 0; takePossession(m, thief); }
  else {
    b.vx = thief.slideDirX * rand(160, 280) + rand(-80, 80); b.vy = thief.slideDirY * rand(160, 280) + rand(-80, 80); b.vz = rand(60, 140);
    b.z = Math.max(b.z, 10); b.lastTouchTeam = thief.team; b.lastKicker = thief;
    thief.noPickupT = 0.08;
  }
  FX.burst(b.x, b.y, 10, '#ffffff', 22, 0.22);
  FX.doShake(3, 0.1);
  Sound.tackle();
  if (thief.isHuman || c.isHuman) FX.text(thief.x, thief.y, tl('STEAL!'), '#ffb03a', 17);
  if (thief.isHuman || c.isHuman) vibrate(c.isHuman ? 30 : 15);
  addMeter(m, thief, thief.isHuman ? 12 : 8);
  addUlt(m, thief, CFG.ULT_TACKLE);
  if (m.rules && typeof Rules !== 'undefined' && Rules.onSteal) Rules.onSteal(m, thief, c);
}

function dodged(m, thief, c) {
  thief.slideHit = true;
  c.stats.dodges = (c.stats.dodges || 0) + 1;
  m.stats[c.team].dodges = (m.stats[c.team].dodges || 0) + 1;
  if (c.isHuman || thief.isHuman) FX.text(c.x, c.y, tl('TOO QUICK!'), '#46d9ff', 15);
  Sound.skill();
  addMeter(m, c, c.isHuman ? 8 : 5);
}

// each reach in progress: did the hand get to the ball?
function checkSlides(m) {
  const b = m.ball;
  for (const p of m.players) {
    if (p.slideT <= 0 || p.slideHit) continue;
    const handX = p.x + p.slideDirX * (p.r + 12), handY = p.y + p.slideDirY * (p.r + 12);
    const c = b.owner;
    const reach = p.isHuman && !m.autopilot ? SLIDE.humanReach + p.attr.def * 6 : SLIDE.reach;
    if (c && c.team !== p.team && !c.dunk) {
      if (dist(handX, handY, b.x, b.y) > reach || b.z > 56) continue;
      p.slideHit = true;
      if (c.dodgeT > 0 || c.protectT > 0) { dodged(m, p, c); continue; }
      // the ball on your side of the dribbler is there to take; on the far side, shielded, it's not
      const toThief = ((p.x - c.x) * (b.x - c.x) + (p.y - c.y) * (b.y - c.y)) / ((dist(p.x, p.y, c.x, c.y) * dist(b.x, b.y, c.x, c.y)) || 1);
      const exposed = toThief > 0.2 ? 1.5 : toThief > -0.3 ? 1 : 0.45;
      const behind = c.fx * (p.x - c.x) + c.fy * (p.y - c.y) < -10;
      let chance = 0.3 * exposed * (behind ? 0.7 : 1) * (1 + p.attr.def * 0.25) * (1 - c.attr.ctl * 0.25);
      if (c.charging || c.passCharging) chance *= 1.35;     // standing there with it out
      if (c.isHuman && !m.autopilot) chance *= (m.diff || Game.difficulty()).slideOnHuman || 1;
      if (!(p.isHuman && !m.autopilot)) chance *= (m.diff || Game.difficulty()).stealSkill || 1;
      if (Math.random() < BOT_MISTAKES.tackleMiss * botSlip(m, p)) chance = 0;
      if (Math.random() < chance) trip(m, p, c);
      else {
        p.recoverT = 0.18;
        if (m.rules && typeof Rules !== 'undefined' && Rules.reachIn) Rules.reachIn(m, p, c, behind);
        if (c.isHuman || p.isHuman) FX.text(c.x, c.y, tl('MISSED!'), '#ffffff', 13);
      }
    } else if (!c && !b.shot && !b.through && !b.dead && b.z < 50 && dist(handX, handY, b.x, b.y) < reach) {
      // reaching for a loose ball just takes it
      p.slideHit = true;
      p.noPickupT = 0; b.pickupCd = 0;
      takePossession(m, p);
    }
  }
}

// how prone this player is to average-player mistakes: 0 for real players, else the bot's factor
function botSlip(m, p) {
  if (p.isHuman && !m.autopilot) return 0;
  return AI.rates(m, p).mistakes || 1;
}
const underPressure = (m, p, r) => AI.minOppDist(m, p.team, p.x, p.y) < r;

// ===== Skill moves ==================================================
// Every move gives a short window in which a reach for the ball misses.
// No stick: a HESITATION (a stutter that freezes them). Stick forward: a burst past them.
// Stick sideways: CROSSOVER (or a SPIN with someone right on you). Stick back: a STEPBACK.
const SKILL = { cooldown: 1.0, extra: 0.1, hopDodge: 0.45 };
const skillCooldown = (p) => SKILL.cooldown * (1 - p.attr.ctl * 0.2) + SKILL.extra;

function skillKind(m, p, ix, iy) {
  const mag = Math.hypot(ix, iy);
  const fwd = mag > 0.3 ? (ix * p.fx + iy * p.fy) / mag : 0;
  let front = null, frontD = 1e9;
  for (const o of m.players) {
    if (o.team === p.team || o.fallT > 0) continue;
    const ox = o.x - p.x, oy = o.y - p.y, d = Math.hypot(ox, oy);
    if (d < 95 && d > 1 && (ox * p.fx + oy * p.fy) / d > 0.4 && d < frontD) { front = o; frontD = d; }
  }
  let kind;
  if (mag <= 0.3) kind = 'hop';
  else if (fwd > 0.45) kind = 'burst';
  else if (fwd < -0.45) kind = 'cruyff';
  else kind = front && frontD < 52 ? 'spin' : 'cross';
  return { kind, front, mag };
}

// A signature move, run off its own numbers. Returns false if this player has not got one on,
// in which case the read-the-stick moves take over.
function performSignature(m, p, ix, iy) {
  const def = typeof skillDef === 'function' ? skillDef(p.skillId || 'classic') : null;
  if (!def || def.read) return false;
  const b = m.ball;
  const mag = Math.hypot(ix, iy);
  const dx = mag > 0.25 ? ix / mag : p.fx;
  const dy = mag > 0.25 ? iy / mag : p.fy;
  const selfDef = def.self || {}, hitDef = def.hit, fx = def.fx || {};
  if (selfDef.turn === 'aim') { p.fx = dx; p.fy = dy; }
  else if (selfDef.turn === 'reverse') { p.fx = -p.fx; p.fy = -p.fy; }
  if (Math.abs(p.fx) > 0.1) p.faceX = Math.sign(p.fx);
  if (selfDef.dash) {
    // a dash jumps rather than travels: walk the landing spot back until it is inside the fence
    const fromX = p.x, fromY = p.y;
    const ddx = selfDef.side ? -dy * Math.sign((p.fx * dy - p.fy * dx) || 1) : p.fx, ddy = selfDef.side ? dx * Math.sign((p.fx * dy - p.fy * dx) || 1) : p.fy;
    let nx = fromX + ddx * selfDef.dash, ny = fromY + ddy * selfDef.dash;
    if (!insideArena(nx, ny)) {
      let found = false;
      for (let step = 0.85; step >= 0.1; step -= 0.15) {
        const tx = fromX + (nx - fromX) * step, ty = fromY + (ny - fromY) * step;
        if (insideArena(tx, ty)) { nx = tx; ny = ty; found = true; break; }
      }
      if (!found) { nx = fromX; ny = fromY; }
    }
    p.x = nx; p.y = ny;
    b.x = p.x + p.fx * (p.r + CFG.BALL_R); b.y = p.y + p.fy * (p.r + CFG.BALL_R);
  }
  if (selfDef.burst) p.burstT = selfDef.burst;
  if (selfDef.dodge) p.dodgeT = selfDef.dodge;
  if (selfDef.hop) p.hopT = selfDef.hop;
  if (selfDef.spin) p.skill = { kind: 'spin', t: 0, dur: 0.42 * selfDef.spin, dx, dy, a0: Math.atan2(p.fy, p.fx), turn: (p.fx * dy - p.fy * dx) >= 0 ? 1 : -1 };
  if (hitDef) {
    for (const o of m.players) {
      if (o.team === p.team || o === p) continue;
      const ox = o.x - p.x, oy = o.y - p.y, d = Math.hypot(ox, oy) || 1;
      if (d > hitDef.radius) continue;
      if (hitDef.stun) { o.stunT = Math.max(o.stunT, hitDef.stun); o.noPickupT = Math.max(o.noPickupT, hitDef.stun); }
      if (hitDef.push) { o.vx += (ox / d) * hitDef.push; o.vy += (oy / d) * hitDef.push; }
      if (hitDef.fall && !o.airborne) { o.fallT = Math.max(o.fallT, 0.6); anklesBroken(m, p, o); }
    }
  }
  if (fx.kind === 'ring') FX.ring(p.x, p.y, fx.color || '#ffffff', fx.r0 || 8, fx.r1 || 40, fx.life || 0.3, fx.width || 3);
  else if (fx.kind === 'sparks') FX.sparks(p.x, p.y, 20, fx.color || '#ffffff', fx.n || 12, fx.speed || 140, fx.life || 0.3);
  else if (fx.kind === 'burst') FX.burst(p.x, p.y, 20, fx.color || '#ffffff', fx.size || 24, 0.3);
  else if (fx.kind === 'stars') FX.stars(p.x, p.y, 30);
  if (fx.shake) FX.doShake(fx.shake, 0.18);
  if (fx.flash) FX.doFlash(fx.color || '#ffffff', fx.flash);
  if (p.isHuman || Math.random() < 0.5) FX.text(p.x, p.y, def.say || '!', def.color || '#ffffff', 16);
  addMeter(m, p, def.meter || 4);
  return true;
}

// a defender put on the floor by a move: the crowd loves it
function anklesBroken(m, p, o) {
  FX.text(o.x, o.y, tl('ANKLES BROKEN!'), '#ff8af0', 17);
  FX.stars(o.x, o.y, 30);
  Sound.ooh();
  if (p.isHuman) { m.flags.ankles = true; m.flags.ankleCount = (m.flags.ankleCount || 0) + 1; }
}

function performSkill(m, p, ix, iy) {
  const b = m.ball;
  if (b.owner !== p || p.skillCd > 0 || !canAct(p) || p.skill || p.airborne || p.charging) return false;
  if (performSignature(m, p, ix, iy)) {
    p.skillCd = skillCooldown(p);
    p.stats.skills++;
    m.stats[p.team].skills = (m.stats[p.team].skills || 0) + 1;
    addUlt(m, p, CFG.ULT_SKILL);
    Sound.skill();
    return true;
  }
  const { kind, front, mag } = skillKind(m, p, ix, iy);
  const fx = p.fx, fy = p.fy;
  p.skillCd = skillCooldown(p);
  p.stats.skills++;
  m.stats[p.team].skills = (m.stats[p.team].skills || 0) + 1;
  addUlt(m, p, CFG.ULT_SKILL);
  const say = (s, c) => { if (p.isHuman || Math.random() < 0.5) FX.text(p.x, p.y, s, c, 15); };
  Sound.skill();
  // a defender right on you, reading it wrong: a quick move can leave them on the floor
  const shake = (base) => {
    if (!front || dist(front.x, front.y, p.x, p.y) > 70 || front.airborne) return;
    const chance = base * (1 + p.attr.ctl * 0.3) * (1 - front.attr.def * 0.2) * (p.isHuman && !m.autopilot ? 1.2 : 0.8);
    if (Math.random() < chance) { front.fallT = 0.75; front.noPickupT = 0.75; anklesBroken(m, p, front); }
    else { front.stunT = Math.max(front.stunT, 0.28); }
  };
  switch (kind) {
    case 'hop':
      // a hesitation: stop, sell it, go
      p.hopT = 0.3; p.dodgeT = SKILL.hopDodge; p.vx *= 0.2; p.vy *= 0.2; p.burstT = 0.35;
      say(tl('HESI!'), '#ffffff');
      shake(0.12);
      addMeter(m, p, 2);
      break;
    case 'burst':
      p.burstT = 0.7; p.dodgeT = 0.3;
      say(tl('BURST!'), '#46d9ff');
      addMeter(m, p, 2);
      break;
    case 'cross': {
      // across the body and away the other way
      let sx = ix / mag, sy = iy / mag;
      const along = sx * fx + sy * fy;
      sx -= fx * along * 0.6; sy -= fy * along * 0.6;
      const sl = Math.hypot(sx, sy) || 1; sx /= sl; sy /= sl;
      p.vx = (sx * 0.8 + fx * 0.5) * CFG.SPEED * 1.25; p.vy = (sy * 0.8 + fy * 0.5) * CFG.SPEED * 1.25;
      p.faceX = Math.abs(p.vx) > 1 ? Math.sign(p.vx) : p.faceX;
      p.dribble += Math.PI / 2;
      p.burstT = 0.45; p.dodgeT = 0.4;
      FX.ring(p.x, p.y, '#ffffff', 6, 28, 0.25, 3);
      say(tl('CROSSOVER!'), '#ffe14d');
      shake(0.22);
      addMeter(m, p, 4);
      break;
    }
    case 'spin': {
      let sx = ix, sy = iy;
      const along = sx * fx + sy * fy;
      sx -= fx * along * 0.7; sy -= fy * along * 0.7;
      const sl = Math.hypot(sx, sy) || 1; sx /= sl; sy /= sl;
      const cross = fx * sy - fy * sx;
      p.skill = { kind: 'spin', t: 0, dur: 0.42, dx: sx, dy: sy, a0: Math.atan2(fy, fx), turn: cross >= 0 ? 1 : -1 };
      p.dodgeT = 0.45;
      FX.ring(p.x, p.y, '#ffffff', 10, 30, 0.3, 3);
      say(tl('SPIN!'), '#ffffff');
      shake(0.15);
      addMeter(m, p, 3);
      break;
    }
    case 'cruyff': {
      // a stepback: a hop away from them, the ball with you, room to shoot
      const dx = ix / mag, dy = iy / mag;
      p.x += dx * 34; p.y += dy * 34;
      p.vx = dx * CFG.SPEED * 0.35; p.vy = dy * CFG.SPEED * 0.35;
      p.fx = -dx; p.fy = -dy; p.faceX = Math.abs(dx) > 0.1 ? -Math.sign(dx) : p.faceX;
      collideWalls(p, p.r, 0);
      p.hopT = 0.25; p.dodgeT = 0.35;
      say(tl('STEPBACK!'), '#86e8e2');
      addMeter(m, p, 3);
      break;
    }
  }
  return kind;
}
