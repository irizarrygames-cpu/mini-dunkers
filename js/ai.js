// The bots. Man-to-man defence, a floor spread on offence, drives, kick-outs, cuts, rebounds.
// Everything they decide is on a reaction timer (rates(m, p).react), and how well they do it is
// their difficulty (DIFFICULTY in config.js): how often they nail a release, reach in, contest.
const AI = {
  rates(m, p) {
    // your teammates play to MATE_BASE (levelled with you); everyone else to the match's own level
    if (m.teamHuman && m.teamHuman[p.team] && !m.autopilot) return m.mateDiff || MATE_BASE;
    return m.diff || Game.difficulty();
  },

  minOppDist(m, team, x, y) {
    let best = 1e9;
    for (const o of m.players) if (o.team !== team) best = Math.min(best, dist(o.x, o.y, x, y));
    return best;
  },

  // who guards whom: worked out again whenever the ball changes sides
  assign(m) {
    const b = m.ball, att = b.owner ? b.owner.team : b.lastTouchTeam || 'blue';
    const key = att + ':' + (m.goals.length) + ':' + (m.possN || 0);
    if (m.aiAssign && m.aiAssign.key === key) return m.aiAssign;
    const def = otherTeam(att);
    const ds = m.players.filter((p) => p.team === def), os = m.players.filter((p) => p.team === att);
    const map = new Map(), taken = new Set();
    // greedy: the closest pairs first
    const pairs = [];
    for (const d of ds) for (const o of os) pairs.push([dist(d.x, d.y, o.x, o.y), d, o]);
    pairs.sort((a, c) => a[0] - c[0]);
    for (const [, d, o] of pairs) { if (map.has(d) || taken.has(o)) continue; map.set(d, o); taken.add(o); }
    m.aiAssign = { key, map, att };
    return m.aiAssign;
  },

  update(m, dt) {
    const b = m.ball;
    // a new possession (a steal, a rebound) re-matches everyone
    const ownerTeam = b.owner ? b.owner.team : null;
    if (ownerTeam && ownerTeam !== m.aiLastOwner) { m.possN = (m.possN || 0) + 1; m.aiLastOwner = ownerTeam; }
    for (const p of m.players) {
      if (p.isHuman && !m.autopilot) continue;
      if (p.dunk || p.ultShot) { p.mx = 0; p.my = 0; continue; }
      const r = this.rates(m, p);
      // a gathered jump shot goes when it's ready
      if (p.charging && b.owner === p && p.ai.shootAt !== undefined && m.clock >= p.ai.shootAt) {
        p.charging = false; p.ai.shootAt = undefined;
        // somebody closed out on the shot: a pump fake and go, unless time's up
        const late = (!m.overtime && m.time < 2.6) || (m.rules && m.shotClock !== undefined && m.shotClock < 2.2);
        if (m.phase === 'play' && !late && contestOf(m, p) > 0.6 && Math.random() < 0.65) { p.ai.decideT = 0.05; p.ai.holdT = Math.max(0, p.ai.holdT - 0.5); }
        else if (m.phase === 'play') performShot(m, p, -1, 0);
      } else if (p.charging && b.owner !== p) { p.charging = false; p.ai.shootAt = undefined; }
      // a jump that was waiting for its moment
      if (p.ai.jumpAt && m.clock >= p.ai.jumpAt) { p.ai.jumpAt = 0; if (jump(p)) p.blockT = 0.45; }
      p.ai.decideT -= dt;
      if (p.ai.decideT <= 0) {
        p.ai.decideT = r.react * rand(0.75, 1.25);
        this.decide(m, p, r);
      }
      this.steer(m, p, dt);
    }
  },

  // run at the target: flat out when it's far, easing in when it's close
  steer(m, p, dt) {
    if (p.fallT > 0 || p.airborne) { p.mx = 0; p.my = 0; return; }
    const dx = p.ai.tx - p.x, dy = p.ai.ty - p.y, d = Math.hypot(dx, dy);
    if (d < 6) { p.mx = 0; p.my = 0; p.sprinting = false; return; }
    p.mx = dx / d; p.my = dy / d;
    p.mSpeed = clamp(d / 70, 0.25, 1);
    p.sprinting = d > (p.ai.hurry ? 160 : 320) && p.stamina > 0.35 && !p.exhausted;
  },
  go(p, x, y, hurry = false) {
    p.ai.tx = clamp(x, 16, CFG.FIELD_W - 16); p.ai.ty = clamp(y, 16, CFG.FIELD_H - 16); p.ai.hurry = hurry;
  },

  decide(m, p, r) {
    const b = m.ball, o = b.owner;
    if (m.phase !== 'play') { this.setUp(m, p); return; }
    if (o === p) this.withBall(m, p, r);
    else if (o && o.team === p.team) this.offBall(m, p, r);
    else if (o) this.defend(m, p, r, o);
    else this.loose(m, p, r);
  },

  // a tip-off, an inbound or a basket going in: get where you should be
  setUp(m, p) {
    const b = m.ball;
    if (m.tip) { p.ai.tx = p.x; p.ai.ty = p.y; return; }
    const att = m.inbound ? m.inbound.team : m.phase === 'goal' && m.goals.length ? otherTeam(m.goals[m.goals.length - 1].team) : b.lastTouchTeam;
    if (m.inbound && m.inbound.taker === p) { p.ai.tx = p.x; p.ai.ty = p.y; return; }
    if (p.team === att) {
      // spread out up the court, ready to go
      const s = this.slot(m, p, true);
      this.go(p, s.x, s.y);
    } else {
      // back on defence: between your man and your own hoop
      const A = this.assign(m), man = A.map.get(p) || this.nearestOpp(m, p);
      const own = ownHoopX(p.team);
      if (man) this.go(p, lerp(man.x, own, 0.35), lerp(man.y, hoopY(), 0.3), true);
      else this.go(p, lerp(CFG.FIELD_W / 2, own, 0.5), hoopY(), true);
    }
  },

  nearestOpp(m, p) {
    let best = null, bd = 1e9;
    for (const o of m.players) if (o.team !== p.team) { const d = dist(o.x, o.y, p.x, p.y); if (d < bd) { bd = d; best = o; } }
    return best;
  },

  // the spots a team spreads to round the hoop it attacks: the top, the wings, the corners, and
  // close in (where a cutter or a big waits for the dump-off)
  SLOTS: [['wingL', 0], ['wingR', 0], ['cornerL', 1], ['cornerR', 1], ['top', 2], ['dunkL', 3], ['dunkR', 3]],
  slotPos(team, name) {
    const hx = hoopX(team), hy = hoopY(), dir = TEAMS[team].dir, R = CFG.THREE_R + 40, H = CFG.FIELD_H;
    switch (name) {
      case 'top': return { x: hx - dir * R, y: hy };
      case 'wingL': return { x: hx - dir * R * 0.7, y: hy - R * 0.72 };
      case 'wingR': return { x: hx - dir * R * 0.7, y: hy + R * 0.72 };
      case 'cornerL': return { x: hx - dir * 80, y: 46 };
      case 'cornerR': return { x: hx - dir * 80, y: H - 46 };
      case 'dunkL': return { x: hx - dir * 90, y: hy - 130 };
      default: return { x: hx - dir * 90, y: hy + 130 };
    }
  },
  // a spot nobody on your side is already in, a good way from the ball
  slot(m, p, upCourt) {
    const b = m.ball, mates = m.players.filter((q) => q.team === p.team && q !== p);
    let best = null, bs = -1e9;
    for (const [name] of this.SLOTS) {
      const s = this.slotPos(p.team, name);
      let score = 0;
      for (const q of mates) { const d = dist(q.ai.slot === name ? q.ai.tx : q.x, q.ai.slot === name ? q.ai.ty : q.y, s.x, s.y); score -= d < 260 ? (260 - d) / 40 : 0; }
      const db = dist(b.x, b.y, s.x, s.y);
      score += db > 220 ? 1.5 : -2;
      score -= dist(p.x, p.y, s.x, s.y) / 500;
      if (p.role === 'big' && name.startsWith('dunk')) score += 1.6;
      if (p.role === 'wing' && (name.startsWith('corner') || name.startsWith('wing'))) score += 0.8;
      if (score > bs) { bs = score; best = name; }
    }
    p.ai.slot = best;
    const s = this.slotPos(p.team, best);
    if (upCourt) {
      // still bringing it up: hang back a little
      const half = CFG.FIELD_W / 2, dir = TEAMS[p.team].dir;
      if ((b.x - half) * dir < 0) s.x = lerp(s.x, half + dir * 120, 0.35);
    }
    return s;
  },

  // ---------- with the ball ----------
  withBall(m, p, r) {
    const b = m.ball, hx = hoopX(p.team), hy = hoopY(), dir = TEAMS[p.team].dir;
    const d = dist(p.x, p.y, hx, hy);
    p.ai.holdT += r.react;
    if (p.charging) { this.go(p, p.x, p.y); return; }
    const contest = contestOf(m, p);
    const def = this.nearestOpp(m, p), dd = def ? dist(def.x, def.y, p.x, p.y) : 1e9;
    const late = (!m.overtime && m.time < 2.6 && m.time > 0) || (m.rules && m.shotClock !== undefined && m.shotClock < 2.2);
    const behindMe = def ? ((def.x - p.x) * (hx - p.x) + (def.y - p.y) * (hy - p.y)) / ((dd * d) || 1) < -0.15 : true;
    const three = isThree(p.team, p.x, p.y);

    // 1. at the rim: go up
    if (d < CFG.LAYUP_R && (contest < 0.75 || behindMe || Math.random() < 0.5)) { performShot(m, p, -1, 0); return; }
    // 2. out of time: get it up from wherever
    if (late && d < 1000) { this.gather(m, p, r); return; }
    // 3. a teammate asked for it (you, mostly), or someone is wide open in a better spot
    const pass = this.passOption(m, p, r, contest, d);
    if (pass && (pass.asked || pass.better > r.passBar)) {
      const lob = pass.lob && Math.random() < 0.7;
      this.passTo(m, p, pass.q, lob);
      return;
    }
    // 4. open with a decent look: shoot it
    const openBar = (r.openBar || 0.32) * (1 + (p.ai.holdT > 3.5 ? 0.8 : 0));
    const range = three ? (d < CFG.THREE_R + 120 ? r.shoot3 : 0) : d < CFG.THREE_R ? r.shootMid : 0;
    if (contest < openBar && Math.random() < range) { this.gather(m, p, r); return; }
    // 5. somebody on you: a move to shake them
    if (def && dd < 62 && !behindMe && p.skillCd <= 0 && Math.random() < r.aiSkill) {
      const side = ((def.x - p.x) * -(hy - p.y) + (def.y - p.y) * (hx - p.x)) >= 0 ? -1 : 1;
      const tx = (hx - p.x) / (d || 1), ty = (hy - p.y) / (d || 1);
      const k = Math.random();
      if (k < 0.15 && d < 640 && d > CFG.THREE_R - 60) performSkill(m, p, -tx, -ty);         // a stepback into a three
      else performSkill(m, p, -ty * side + tx * 0.2, tx * side + ty * 0.2);                // across and away
      return;
    }
    // 6. drive: at the rim, round whoever is in the way
    let gx = hx - dir * 40, gy = hy;
    if (def && !behindMe && dd < 140) {
      const side = ((def.x - p.x) * -(gy - p.y) + (def.y - p.y) * (gx - p.x)) >= 0 ? -1 : 1;
      const tx = (gx - p.x) / (d || 1), ty = (gy - p.y) / (d || 1);
      gx = p.x + tx * 120 - ty * side * 90; gy = p.y + ty * 120 + tx * side * 90;
    }
    // a pass is the better idea after holding it a while
    if (p.ai.holdT > 2.4 && pass && pass.better > -0.2) { this.passTo(m, p, pass.q, pass.lob && Math.random() < 0.5); return; }
    this.go(p, gx, gy, true);
  },

  // up to shoot: set your feet and let it go a moment later (a defender gets a chance to contest)
  gather(m, p, r) {
    if (p.charging) return;
    p.charging = true; p.chargeT = 0;
    p.ai.shootAt = m.clock + rand(0.3, 0.46) * (r.release || 1);
    this.go(p, p.x, p.y);
  },

  passTo(m, p, q, lob) {
    const dx = q.x - p.x, dy = q.y - p.y;
    if (!performPass(m, p, dx, dy, q, lob ? CFG.PASS_CHARGE_FULL : 0)) return;
    p.ai.holdT = 0;
    // the one it's going to stops running off and comes to meet it
    this.meet(m, q);
  },
  // where a pass will be catchable, and get there
  meet(m, q) {
    const b = m.ball;
    if (q.isHuman && !m.autopilot) return;
    let bx = b.x, by = b.y, bz = b.z, vz = b.vz, best = null;
    for (let t = 0; t < 1.6; t += 0.04) {
      bx = b.x + b.vx * t; by = b.y + b.vy * t; bz = b.z + vz * t - (CFG.GRAVITY * t * t) / 2;
      if (bz < CFG.REACH - 4 && t > 0.08) { best = { x: bx, y: by, t }; if (dist(q.x, q.y, bx, by) < CFG.SPEED * t + 20) break; }
    }
    if (best) { q.ai.tx = best.x; q.ai.ty = best.y; q.ai.hurry = true; q.ai.decideT = Math.max(q.ai.decideT, Math.min(0.5, best.t)); q.ai.waitPass = m.clock + best.t + 0.3; }
  },

  // who's worth passing to, and how much better off they are than you
  passOption(m, p, r, myContest, myD) {
    let best = null;
    const mine = this.lookValue(m, p, myContest, myD);
    for (const q of m.players) {
      if (q.team !== p.team || q === p || q.airborne) continue;
      const D = dist(p.x, p.y, q.x, q.y);
      if (D < 70 || D > 1100) continue;
      const asked = q.isHuman && !m.autopilot && (q.passRequestT || 0) > 0;
      const open = this.minOppDist(m, p.team, q.x, q.y);
      const qd = toHoop(q.team, q.x, q.y);
      const lane = laneBlocked(m, p.team, p.x, p.y, q.x, q.y, 16);
      const nearRim = qd < CFG.DUNK_R * 1.3;
      const lob = nearRim && open > 50;
      let v = this.lookValue(m, q, clamp((120 - open) / 90, 0, 1), qd) - mine - (lane && !lob ? 0.45 : 0) - D / 3000;
      v += (Math.random() - 0.5) * BOT_MISTAKES.wrongPass;
      if (asked && !lane) v += 1;
      if (!best || v > best.better) best = { q, better: v, asked: asked && !lane, lob };
    }
    return best;
  },
  // how good a look this player has from here (roughly: the chance it goes in times its points)
  lookValue(m, q, contest, d) {
    const pts = isThree(q.team, q.x, q.y) ? 3 : 2;
    const c = d < CFG.LAYUP_R ? 0.8 * (1 - 0.55 * contest) : shotBase(d) * (1 - 0.6 * contest);
    return c * pts;
  },

  // ---------- your side has it ----------
  offBall(m, p, r) {
    const b = m.ball, o = b.owner, hx = hoopX(p.team), hy = hoopY(), dir = TEAMS[p.team].dir;
    if (p.ai.cutT > 0) p.ai.cutT -= r.react;
    // a cut to the rim when your man isn't watching, now and then
    const A = this.assign(m);
    let myDef = null;
    for (const [d, man] of A.map) if (man === p) myDef = d;
    const loose = !myDef || dist(myDef.x, myDef.y, p.x, p.y) > 110;
    const frontcourt = (o.x - CFG.FIELD_W / 2) * dir > 0;
    if (frontcourt && p.ai.cutT <= 0 && loose && Math.random() < (r.cut || 0.18)) p.ai.cutT = 1.2;
    if (p.ai.cutT > 0) { this.go(p, hx - dir * 70, hy + (p.y < hy ? -60 : 60), true); return; }
    const s = this.slot(m, p, !frontcourt);
    // don't stand in the passing lane between the ball and the rim
    this.go(p, s.x, s.y, !frontcourt);
  },

  // ---------- they have it ----------
  defend(m, p, r, o) {
    const A = this.assign(m), man = A.map.get(p) || o;
    const own = ownHoopX(p.team), hy = hoopY();
    const b = m.ball;
    // the shooter is going up: get a hand up at the right moment
    if (o.charging && dist(o.x, o.y, p.x, p.y) < 85 && !p.ai.jumpAt && !p.airborne) {
      const wait = (o.ai && o.ai.shootAt !== undefined) ? Math.max(0, o.ai.shootAt - m.clock) : rand(0.25, 0.5);
      p.ai.jumpAt = m.clock + Math.max(0.02, wait - 0.08 + rand(-0.12, 0.16) / (r.blockSkill || 1));
    }
    // a dunk or layup going up right by you: jump with it
    if (o.dunk && dist(o.x, o.y, p.x, p.y) < 90 && !p.airborne && Math.random() < (r.rimProtect || 0.5)) { if (jump(p)) p.blockT = 0.45; }
    if (man === o) {
      // on the ball: between them and the rim, close, and reach in when it's showing
      const d = dist(o.x, o.y, own, hy) || 1;
      const gap = (r.gap || 44) * (d > 700 ? 1.6 : 1);
      const tx = o.x + ((own - o.x) / d) * gap, ty = o.y + ((hy - o.y) / d) * gap;
      this.go(p, tx + o.vx * 0.12, ty + o.vy * 0.12, true);
      const close = dist(o.x, o.y, p.x, p.y) < 58;
      if (close && p.slideCd <= 0 && o.protectT <= 0 && !o.dunk && Math.random() < r.aiSteal) performSlide(m, p, b.x - p.x, b.y - p.y);
    } else {
      // off the ball: between your man and the rim, sagging towards the ball the further they are from it
      const toBall = dist(man.x, man.y, b.x, b.y);
      const sag = clamp(toBall / 900, 0.1, 0.55);
      let tx = lerp(man.x, own, 0.18) , ty = lerp(man.y, hy, 0.18);
      tx = lerp(tx, b.x, sag * 0.5); ty = lerp(ty, b.y, sag * 0.5);
      // help: a driver in the paint and their own man beaten — step across
      const od = dist(o.x, o.y, own, hy);
      if (od < CFG.KEY_D * 0.9 && this.beaten(m, o) && Math.random() < (r.help || 0.5)) { tx = lerp(o.x, own, 0.5); ty = lerp(o.y, hy, 0.5); }
      this.go(p, tx, ty, dist(p.x, p.y, tx, ty) > 260);
      // jump a pass into the lane now and then
      if (b.lastPass && !o && Math.random() < 0.3) this.go(p, b.x, b.y, true);
    }
  },
  // has the ball carrier got past whoever was on them?
  beaten(m, o) {
    const own = ownHoopX(otherTeam(o.team)), hy = hoopY();
    for (const d of m.players) {
      if (d.team === o.team) continue;
      if (dist(d.x, d.y, o.x, o.y) < 70 && dist(d.x, d.y, own, hy) < dist(o.x, o.y, own, hy)) return false;
    }
    return true;
  },

  // ---------- nobody has it: a shot in the air, a rebound, a pass, a ball knocked loose ----------
  loose(m, p, r) {
    const b = m.ball;
    if (b.shot) {
      // crash the boards: round the rim it's going at, on your side of the paint
      const s = b.shot, hx = hoopX(s.team), hy = hoopY(), dir = TEAMS[s.team].dir;
      const mine = s.team === p.team;
      const rank = this.rankTo(m, p, hx, hy);
      if (rank > (mine ? 1 : 2)) { const sp = mine ? this.slot(m, p) : { x: lerp(p.x, hx, 0.3), y: lerp(p.y, hy, 0.3) }; this.go(p, sp.x, sp.y); return; }
      const a = Math.atan2(p.y - hy, (p.x - hx) * -dir);
      this.go(p, hx - dir * Math.cos(a) * 95, hy + Math.sin(clamp(a, -1.3, 1.3)) * 95, true);
      return;
    }
    if (b.through || b.dead) { this.setUp(m, p); return; }
    // a pass to a teammate: let them take it; a pass of theirs: jump the lane if you're right there
    const lp = b.lastPass;
    if (lp && lp.team === p.team && lp.target === p) { this.meet(m, p); return; }
    if (lp && lp.team === p.team && lp.target && lp.target !== p) { const s = this.slot(m, p); this.go(p, s.x, s.y); return; }
    // where the ball will be by the time you get there
    const t = clamp(dist(p.x, p.y, b.x, b.y) / (CFG.SPEED * 1.2), 0, 1.2);
    const fx = b.x + b.vx * t * 0.7, fy = b.y + b.vy * t * 0.7;
    const rank = this.rankTo(m, p, fx, fy, true);
    if (rank > 1 && !(lp && lp.target === p)) {
      // not first to it: get set for whichever way it goes
      const side = b.lastTouchTeam === p.team ? this.slot(m, p) : { x: lerp(p.x, ownHoopX(p.team), 0.25), y: lerp(p.y, hoopY(), 0.25) };
      this.go(p, side.x, side.y);
      return;
    }
    this.go(p, fx, fy, true);
    // up for it when it's coming down just out of reach
    const dz = b.z - (p.z + CFG.REACH);
    if (dz > 0 && dz < 70 && b.vz < 120 && dist(p.x, p.y, b.x, b.y) < 46 && !p.airborne && Math.random() < (r.board || 0.7)) { if (jump(p)) p.blockT = 0.4; }
  },
  // how many on your side are nearer this spot than you (0 = you're the nearest)
  rankTo(m, p, x, y, anyone = false) {
    const mine = dist(p.x, p.y, x, y);
    let n = 0;
    for (const q of m.players) if (q !== p && (anyone || q.team === p.team) && q.team === p.team && dist(q.x, q.y, x, y) < mine) n++;
    return n;
  },
};
