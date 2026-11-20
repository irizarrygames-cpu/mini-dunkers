// Match flow: tip-off → play → basket → inbound → ... → full time → results.
// (The phase names are the soccer game's, kept because the screens, the server and the network all
// speak them: 'kickoff' is the moment before play — a tip-off or an inbound — and 'goal' is a basket.)
const COIN_MULT = { easy: 0.8, normal: 1, hard: 1.3 };
const Match = {
  create(opts = {}) {
    const minutes = opts.minutes || CFG.MATCH_MINUTES;
    const home = opts.home || Clubs.mine();
    const club = opts.club || Clubs.random(home);
    if (!Game.headless) Clubs.setMatch(home, club);
    if (!opts.diff) Game.setDifficulty(club);
    let fmt0 = FORMATS[opts.format] ? opts.format : (FORMATS[Save.data.format] ? Save.data.format : '3v3');
    // PRO MATCH is 2v2 or bigger
    if (opts.mode === 'pro' && fmt0 === '1v1') fmt0 = '2v2';
    const diff = opts.online ? (opts.diff || Game.difficulty()) : formatRamp(opts.diff || Game.difficulty(), fmt0);
    const m = {
      players: [], ball: new Ball(), human: null, keepers: {},
      score: { blue: 0, red: 0 },
      stats: { blue: { shots: 0, passes: 0, steals: 0, saves: 0, blocks: 0, rebounds: 0 }, red: { shots: 0, passes: 0, steals: 0, saves: 0, blocks: 0, rebounds: 0 } },
      meter: { blue: 0, red: 0 },
      poss: { blue: 0, red: 0 },
      duration: minutes * 60, time: minutes * 60, overtime: false, otTime: 0, buzzer: 0,
      phase: 'kickoff', phaseT: 0, clock: 0, kickoffWait: 1.0,
      kickoffTeam: 'blue', shotId: 0, slowmo: 0, freeze: 0, timeScale: 1, ultCut: null,
      autopilot: !!opts.autopilot, diff, mateDiff: opts.mateDiff || levelDiff(MATE_BASE, home.level), home, humans: [], teamHuman: { blue: false, red: false }, online: !!opts.online,
      goals: [], result: null, resetDone: false, exciteT: 0, lastConceded: null,
      mode: opts.mode || 'quick', club, noDraw: opts.mode === 'cup' || !!opts.noDraw, flags: {}, challenges: null, challengeT: 0,
      format: fmt0, tip: null, inbound: null,
    };
    if (m.online) m.mode = 'online';
    // PRO MATCH: the real rules (out of bounds, the shot clock, fouls: js/rules.js)
    m.rules = opts.mode === 'pro' && typeof Pitch !== 'undefined' && Pitch.size === 'pro';
    m.restart = null;
    if (m.rules) m.shotClock = CFG.SHOT_CLOCK;
    m.training = m.mode === 'training';
    if (m.training) m.format = 'training';
    if (!m.autopilot && !Game.headless && !m.training && !m.online && m.mode !== 'pens') m.challenges = Challenges.roll(m.format);
    const roster = FORMATS[m.format];
    const rng = mulberry32((Math.random() * 1e9) | 0);
    const r = (arr) => arr[(rng() * arr.length) | 0];
    const aiLook = () => ({ hair: r(AI_HAIRS), hairColor: r(HAIR_COLORS), skin: r(SKINS), band: r(['#ffffff', '#ffe14d', '#1b1d33']), cap: r(['#2f7bff', '#ff8a1f', '#3fcf4a', '#1b1d33']) });
    const lookOf = (ch, acc) => ({ hair: ch.hair, hairColor: ch.hairColor, skin: ch.skin, cap: ch.cap, band: ch.band, thin: ch.thin || 0, buff: ch.buff || 0, anime: !!ch.anime, mewing: !!ch.mewing, acc: acc && ACCESSORY_IDS.has(acc) ? acc : null });
    if (opts.seats) {
      // online: both sides the same, real players take roles from the front of their side
      const sides = SIDES[m.format] || SIDES['3v3'];
      for (const team of ['blue', 'red']) {
        const mine = opts.seats.filter((s) => s.team === team);
        sides[team].forEach(([role, n], i) => {
          const s = mine[i];
          if (s && s.human) {
            const custom = !!(s.look && typeof s.look === 'object');
            const ch = custom ? null : CHARACTERS.find((c) => c.id === s.character) || CHARACTERS[0];
            const rr = custom ? statRatings(s.stats) : ch.r;
            const p = new Player({ team, human: true, role, number: n, attr: ratingAttr(rr), look: custom ? lookFromCustom(s.look, s.accessories) : lookOf(ch, s.accessory) });
            Object.assign(p, { seat: s.seat, name: s.name, trailId: s.trail, celebId: s.celebration, skillId: s.skill || 'classic', rarity: custom ? ovrGrade(overall(rr)) : ch.rarity, input: s.input });
            m.players.push(p); m.humans.push(p);
          } else {
            const ch = s && s.character && CHARACTERS.find((c) => c.id === s.character);
            const p = new Player({ team, role, number: n, look: ch ? lookOf(ch, s.accessory) : aiLook(), attr: ch ? ratingAttr(ch.r) : null });
            p.speedMul = diff.redSpeed; p.seat = s ? s.seat : null; p.name = s ? s.name : null; p.celebId = s ? s.celebration : null; p.skillId = (s && s.skill) || 'classic';
            m.players.push(p);
          }
        });
      }
      m.human = m.humans[0] || m.players[0];
    } else {
      // you: your own player, with your stats and everything you have on
      const me = Save.character();
      const human = new Player({ team: 'blue', human: true, role: 'pg', number: 10, attr: m.autopilot ? null : ratingAttr(me.r), look: m.autopilot ? lookFromCustom(Save.data.look, []) : Save.look() });
      human.rarity = me.rarity;
      human.skillId = m.autopilot ? 'classic' : Save.skill();
      m.human = human;
      m.players.push(human); m.humans.push(human);
      const botSkill = () => {
        if (rng() > 0.22) return 'classic';
        const pool = SKILLS.filter((k) => k.rarity === 'rare' || k.rarity === 'epic');
        return pool.length ? pool[(rng() * pool.length) | 0].id : 'classic';
      };
      const botChar = () => { const bc = pickBotCharacter(rng); return { look: lookOf(bc, null), attr: ratingAttr(bc.r) }; };
      roster.blue.forEach(([role, n]) => {
        const p = new Player({ team: 'blue', role, number: n, ...botChar() });
        p.skillId = botSkill();
        p.speedMul = m.mateDiff.redSpeed;
        m.players.push(p);
      });
      roster.red.forEach(([role, n]) => {
        const p = new Player({ team: 'red', role, number: n, ...botChar() });
        p.skillId = botSkill();
        p.speedMul = diff.redSpeed;
        m.players.push(p);
      });
    }
    if (!m.autopilot) for (const h of m.humans) m.teamHuman[h.team] = true;
    if (m.autopilot) m.human.speedMul = 0.95;
    m.humanRarity = m.autopilot ? null : m.human.rarity || null;
    this.setupTipoff(m);
    if (!Game.headless && !m.online && m.mode !== 'pens') FX.showBanner(tl('TIP-OFF!'), '#ffffff', 1.0, `${home.name} vs ${club.name}`);
    return m;
  },

  // where everyone stands to start: each side in its own half, spread out
  spots(m, p, attackTeam) {
    const W = CFG.FIELD_W, H = CFG.FIELD_H, dir = TEAMS[p.team].dir;
    const mates = m.players.filter((q) => q.team === p.team), i = mates.indexOf(p), n = mates.length;
    const across = n === 1 ? [0.5] : n === 2 ? [0.35, 0.65] : [0.5, 0.25, 0.75];
    const u = i === 0 ? 0.44 : 0.36 - (i % 2) * 0.04;
    return { x: dir > 0 ? u * W : (1 - u) * W, y: across[i] * H };
  },

  // the tip-off: the two nearest the middle jump for a ball thrown up between them
  setupTipoff(m) {
    const W = CFG.FIELD_W, H = CFG.FIELD_H, b = m.ball;
    b.reset(W / 2, H / 2);
    for (const p of m.players) {
      const s = this.spots(m, p);
      p.x = s.x; p.y = s.y; this.freshen(m, p);
    }
    // the jumpers face each other at the centre
    const jumper = (team) => m.players.filter((q) => q.team === team).sort((a, c) => (a === m.human ? -1 : c === m.human ? 1 : 0))[0];
    const a = jumper('blue'), c = jumper('red');
    if (a) { a.x = W / 2 - 26; a.y = H / 2; }
    if (c) { c.x = W / 2 + 26; c.y = H / 2; }
    b.z = 40; b.vz = 0; b.dead = true;
    m.tip = { a, c, t: 0, thrown: false, tipped: false };
    m.inbound = null;
    m.kickoffWait = 1.05;
    if (!Game.headless) Sound.chargeStop();
  },

  freshen(m, p) {
    const dir = TEAMS[p.team].dir;
    p.vx = 0; p.vy = 0; p.mx = 0; p.my = 0;
    p.fx = dir; p.fy = 0; p.faceX = dir;
    p.kickT = 0; p.stunT = 0; p.noPickupT = 0; p.diveT = 0; p.recoverT = 0;
    p.celebrateT = 0; p.sad = false; p.celebKind = null; p.charging = false; p.chargeT = 0; p.passCharging = false; p.passChargeT = 0; p.bufferT = 0; p.holdT = 0;
    p.ai.spotT = 0; p.ai.decideT = rand(0.2, 0.5); p.ai.holdT = 0; p.ai.slideT = 0; p.ai.man = null;
    p.clearActions();
  },

  // After a basket the side that was scored on takes it out from under their own hoop. Only the one
  // taking it out is moved there; everyone else carries on from where they are.
  setupInbound(m, team) {
    const b = m.ball, H = CFG.FIELD_H, own = ownHoopX(team), dir = TEAMS[team].dir;
    const mates = m.players.filter((q) => q.team === team);
    // a person takes it out when there is one on that side (online: whoever is nearest)
    let taker = mates.filter((q) => q.isHuman && !m.autopilot)[0] && !m.online ? m.human.team === team ? m.human : null : null;
    if (!taker) taker = mates.slice().sort((a, c) => dist(a.x, a.y, own, H / 2) - dist(c.x, c.y, own, H / 2))[0];
    const side = taker.y < H / 2 ? -1 : 1;
    taker.x = own - dir * (CFG.HOOP_IN - 24); taker.y = H / 2 + side * 96;
    taker.vx = 0; taker.vy = 0; taker.fx = dir; taker.fy = 0; taker.faceX = dir;
    taker.charging = false; taker.passCharging = false; taker.clearActions();
    b.reset(taker.x, taker.y);
    b.owner = taker; b.lastKicker = taker; b.lastTouchTeam = team;
    taker.protectT = 1.4;
    for (const p of m.players) { p.celebrateT = 0; p.celebKind = null; p.sad = false; p.charging = false; p.ultShot = null; if (p.dunk) { p.dunk = null; p.z = 0; } }
    m.inbound = { team, taker };
    m.tip = null;
    m.kickoffWait = 0.45;
    if (m.rules) m.shotClock = CFG.SHOT_CLOCK;
    for (const h of m.humans) h.passRequestT = 0;
    if (!Game.headless) Sound.chargeStop();
  },

  // the kickoff of old: the start of the match and of overtime is a tip-off
  setupKickoff(m) { this.setupTipoff(m); },

  stepTip(m, dt) {
    const T = m.tip, b = m.ball;
    if (!T) return;
    T.t += dt;
    if (!T.thrown && T.t >= 0.2) { T.thrown = true; b.vz = 640; b.z = 46; Sound.whistle(); }
    // the jumpers go up as it comes down to them
    if (T.thrown && !T.jumped && b.vz < 140) { T.jumped = true; for (const p of [T.a, T.c]) if (p) { p.vz = CFG.JUMP_V * 1.05; } }
    if (T.thrown && !T.tipped && b.vz < -40 && b.z < 150) {
      T.tipped = true;
      // who gets a hand to it: a coin flip, nudged by how high each can jump
      const pa = 0.5 + ((T.a ? T.a.attr.def : 0) - (T.c ? T.c.attr.def : 0)) * 0.08;
      const winner = Math.random() < pa ? T.a : T.c;
      const team = winner ? winner.team : 'blue', dir = TEAMS[team].dir;
      const mate = m.players.filter((q) => q.team === team && q !== winner).sort((a, c) => dist(a.x, a.y, b.x, b.y) - dist(c.x, c.y, b.x, b.y))[0];
      const tx = mate ? mate.x : b.x - dir * 160, ty = mate ? mate.y : b.y + rand(-60, 60);
      const D = Math.max(60, dist(b.x, b.y, tx, ty)), Tt = 0.45 + D / 1600;
      b.vx = (tx - b.x) / Tt; b.vy = (ty - b.y) / Tt; b.vz = 120;
      b.lastTouchTeam = team; b.lastKicker = winner; b.dead = false;
      if (winner) { winner.kickT = 0.2; winner.kickDur = 0.2; winner.blockT = 0.3; }
      if (winner) for (const p of m.players) if (p !== winner) p.noPickupT = 0;
      if (winner) winner.noPickupT = 0.35;
      Sound.kick(0.3);
    }
  },

  step(m, dt) {
    let sdt = dt;
    if (m.freeze > 0) { m.freeze -= dt; sdt = 0; }
    else if (m.ultCut) { if (m.slowmo > 0) m.slowmo -= dt; sdt = dt * UltCut.scale(m); }
    else if (m.slowmo > 0) { m.slowmo -= dt; sdt = dt * 0.35; }
    m.timeScale = sdt / dt;
    m.phaseT += dt;

    switch (m.phase) {
      case 'kickoff':
        // a tip-off or an inbound being set up: people can get back into position, nobody plays it yet
        if (sdt > 0) {
          if (!m.autopilot) for (const h of m.humans) this.humanControl(m, h, sdt, true);
          AI.update(m, sdt);
          if (m.inbound) { const t = m.inbound.taker; t.mx = 0; t.my = 0; t.vx = 0; t.vy = 0; }
          if (m.tip) { for (const p of [m.tip.a, m.tip.c]) if (p) { p.mx = 0; p.my = 0; } this.stepTip(m, sdt); }
          movePlayers(m, sdt); updateBall(m, sdt);
        }
        if (m.phaseT >= m.kickoffWait && (!m.tip || m.tip.tipped)) {
          m.phase = 'play'; m.phaseT = 0;
          m.ball.dead = false;
          if (m.inbound) Sound.whistle();
          m.tip = null;
        }
        break;

      case 'play':
        if (sdt <= 0) break;
        m.clock += sdt;
        if (!m.autopilot) for (const h of m.humans) this.humanControl(m, h, sdt);
        AI.update(m, sdt);
        movePlayers(m, sdt);
        updateBall(m, sdt);
        if (m.phase !== 'play') break;
        // PRO MATCH: over the line is out, the shot clock, fouls
        if (m.rules && Rules.check(m, sdt)) break;
        checkSlides(m);
        if (m.phase !== 'play') break;
        for (const h of m.humans) if ((h.dribbleDist || 0) > 100) { h.dribbleDist -= 100; addMeter(m, h, 1.1); }
        if (m.ball.owner) m.poss[m.ball.owner.team] += sdt;
        this.tickClock(m, sdt);
        m.challengeT -= dt;
        if (m.challengeT <= 0) { m.challengeT = 0.25; Challenges.check(m); }
        m.exciteT -= dt;
        if (m.exciteT <= 0) {
          m.exciteT = 0.3;
          const b = m.ball;
          Sound.setExcitement(Math.min(b.x, CFG.FIELD_W - b.x) < 460 ? 1 : 0);
        }
        break;

      case 'restart':
        // PRO MATCH: an inbound from the side or free throws (the clock is stopped)
        if (sdt > 0) Rules.step(m, sdt);
        break;

      case 'goal':
        // the ball is going down through the net: a moment for it, the clock stopped
        if (sdt > 0) {
          if (!m.autopilot) for (const h of m.humans) this.humanControl(m, h, sdt, true);
          AI.update(m, sdt);
          this.celebrate(m, sdt);
          movePlayers(m, sdt); updateBall(m, sdt);
        }
        if (m.phaseT >= (this.wantsCutscene(m) ? 0.75 : 0.85)) {
          if (this.startCutscene(m)) break;
          this.afterGoal(m);
        }
        break;

      case 'cele': {
        // offline you can tap through it; online everyone watches the same moment
        if (!m.online && !m.autopilot && m.phaseT > 0.4) {
          const I = m.human.input || Input;
          if (I.consumePass() | I.consumeShootPress() | I.consumeSkill() | I.consumeSlide()) m.cele.skip = true;
        }
        this.discardInput(m);
        if (sdt > 0) { this.celebrate(m, sdt); movePlayers(m, sdt); updateBall(m, sdt); }
        if (m.phaseT >= CELE_TIME || m.cele.skip) this.afterGoal(m);
        break;
      }

      case 'replay':
        // (no replays in basketball: a basket comes round too often for one each time)
        this.afterGoal(m);
        break;

      case 'reset':
        this.discardInput(m);
        if (m.phaseT >= 0.22 && !m.resetDone) {
          m.resetDone = true;
          if (m.inboundNext) this.setupInbound(m, m.inboundNext); else this.setupTipoff(m);
          m.inboundNext = null;
        }
        if (m.phaseT >= 0.45) { m.phase = 'kickoff'; m.phaseT = 0; }
        break;

      case 'timeup':
        this.discardInput(m);
        for (const p of m.players) { p.mx = 0; p.my = 0; }
        movePlayers(m, dt); updateBall(m, dt);
        if (m.phaseT >= 1.7) {
          m.phase = 'over';
          Challenges.check(m);
          m.result = this.result(m);
          if (!Game.headless) UI.showResults(m);
        }
        break;
    }
  },

  discardInput(m) {
    if (m.autopilot || (Game.headless && !m.online)) return;
    for (const h of m.humans) {
      const I = h.input || Input;
      I.consumePass(); I.consumeShootPress(); I.consumeShootRelease();
      I.consumeSkill(); I.consumeSlide(); if (I.consumeUlt) I.consumeUlt();
      if (I.consumePassPress) I.consumePassPress();
      if (I.aim) I.aim = null;
      if (h.charging) { h.charging = false; Sound.chargeStop(); }
      h.mx = 0; h.my = 0; h.sprinting = false;
      h.bufferT = 0; h.passBufferT = 0; h.skillBufferT = 0;
    }
  },

  // One real player's controls: the local Input, or that player's network input on the server.
  //   with the ball:    SHOOT (hold, let go at the top) · PASS (tap; hold for a lob) · SKILL
  //   without it:       SHOOT jumps (a block, a rebound) · SKILL reaches for a steal · PASS calls for it
  // moveOnly: the ball is dead (an inbound being set up, a basket going in) — run, nothing else.
  humanControl(m, h, dt, moveOnly = false) {
    const b = m.ball, I = h.input || Input;
    const mv = I.move, mag = Math.hypot(mv.x, mv.y);
    const aim = I.aim || mv, amag = Math.hypot(aim.x, aim.y);
    if (I.aim) I.aim = null;
    h.mx = mag > 0.01 ? mv.x / mag : 0; h.my = mag > 0.01 ? mv.y / mag : 0;
    h.mSpeed = Math.min(1, mag);
    h.sprinting = I.sprintHeld;
    if (moveOnly) {
      I.consumePass(); I.consumeShootPress(); I.consumeShootRelease(); I.consumeSkill(); I.consumeSlide();
      if (I.consumeUlt) I.consumeUlt();
      if (I.consumePassPress) I.consumePassPress();
      if (h.charging) { h.charging = false; Sound.chargeStop(); }
      h.passCharging = false;
      return;
    }

    if (I.consumeUlt && I.consumeUlt()) performUlt(m, h);

    // SKILL with the ball, a steal without it (the mobile button does both)
    if (I.consumeSkill()) {
      if (b.owner === h) performSkill(m, h, aim.x, aim.y);
      else if (passComing(m, h)) h.skillBufferT = 0.4; // your own pass on its way: the skill when it gets here
      else performSlide(m, h, aim.x, aim.y);
    }
    if (h.skillBufferT > 0) {
      h.skillBufferT -= dt;
      if (b.owner === h) { h.skillBufferT = 0; performSkill(m, h, aim.x, aim.y); }
    }
    if (I.consumeSlide() && b.owner !== h) performSlide(m, h, aim.x, aim.y);

    // PASS charges while held and goes on release; a tap is a chest pass, held is a lob
    if (I.consumePassPress && I.consumePassPress()) { h.passCharging = true; h.passChargeT = 0; }
    if (h.passCharging) {
      h.passHeldT = (h.passHeldT || 0) + dt;
      h.passChargeT = Math.min(CFG.PASS_CHARGE_FULL, h.passChargeT + dt);
      if (h.passHeldT > 4) { h.passCharging = false; h.passChargeT = 0; }
    } else h.passHeldT = 0;
    if (I.consumePass()) {
      const charge = h.passCharging ? h.passChargeT : 0;
      h.passCharging = false; h.passChargeT = 0;
      if (b.owner === h) performPass(m, h, amag > 0.1 ? aim.x : h.fx, amag > 0.1 ? aim.y : h.fy, null, charge);
      else if (b.owner && b.owner.team === h.team && !b.owner.isHuman) { h.passRequestT = 0.8; FX.ring(h.x, h.y, '#ffffff', 10, 34, 0.35, 3); }
      else { h.passBufferT = 0.3; h.passBufferCharge = charge; }
    }
    if (h.passBufferT > 0) {
      h.passBufferT -= dt;
      if (b.owner === h) { h.passBufferT = 0; performPass(m, h, amag > 0.1 ? aim.x : h.fx, amag > 0.1 ? aim.y : h.fy, null, h.passBufferCharge || 0); }
    }

    // SHOOT: with the ball, close in it goes straight up for a dunk or layup, further out it charges
    // the meter; without the ball it is a jump
    if (I.consumeShootPress()) {
      if (b.owner === h) {
        if (h.ultOn) performShot(m, h, 0, 0);
        else if (toHoop(h.team, h.x, h.y) < CFG.LAYUP_R && !h.airborne) performShot(m, h, 0, 0);
        else { h.charging = true; h.chargeT = 0; Sound.chargeStart(); }
      } else if (!b.owner || b.owner.team !== h.team) {
        if (jump(h)) { h.blockT = 0.45; Sound.whoosh(true); }
      } else h.bufferT = 0.3;  // a teammate is passing it to you: shoot when it gets here
    }
    let release = I.consumeShootRelease();
    if (h.charging) {
      if (b.owner !== h) { h.charging = false; Sound.chargeStop(); }
      else {
        h.chargeT += dt;
        if (h.chargeT >= CFG.CHARGE_AUTO) release = true;
      }
    }
    if (release && h.charging) {
      h.charging = false;
      Sound.chargeStop();
      if (b.owner === h) performShot(m, h, h.chargeT, aim.y);
    }
    if (h.bufferT > 0) {
      h.bufferT -= dt;
      if (b.owner === h) { h.bufferT = 0; if (toHoop(h.team, h.x, h.y) < CFG.LAYUP_R) performShot(m, h, 0, 0); else { h.charging = true; h.chargeT = 0; Sound.chargeStart(); } }
    }
  },

  // dunks, threes and ON FIRE shots get the celebration cutscene (not in training or bot-only matches)
  wantsCutscene(m) {
    const g = m.goals[m.goals.length - 1];
    return !!(g && g.scorer && g.big && !m.autopilot && !m.training && !m.demo);
  },

  startCutscene(m) {
    if (!this.wantsCutscene(m)) return false;
    const g = m.goals[m.goals.length - 1], s = g.scorer;
    if (!s.celebId || !CELE_POSES[s.celebId]) s.celebId = s.isHuman && !m.online ? Save.celebration() : pick(BOT_CELEBS);
    const kind = s.celebId;
    const toCenter = Math.sign(CFG.FIELD_W / 2 - s.x) || 1;
    let dx = toCenter * 0.75, dy = s.y < CFG.FIELD_H * 0.7 ? 0.65 : -0.45;
    const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
    m.phase = 'cele'; m.phaseT = 0;
    m.cele = { scorer: s, kind, team: g.team, dir: { x: dx, y: dy }, skip: false };
    let mate = 0;
    for (const p of m.players) {
      p.celebKind = null; p.celebrateT = 0; p.charging = false;
      if (p.dunk) { p.dunk = null; p.z = 0; p.vz = 0; }
      if (p.team === g.team) {
        p.celebrateT = CELE_TIME; p.celebKind = p === s ? kind : 'hype'; p.celeFaceX = toCenter;
        if (p !== s && dist(p.x, p.y, s.x, s.y) > 300) {
          const a = mate * 2.1 + 0.6;
          p.x = clamp(s.x + Math.cos(a) * 240, 20, CFG.FIELD_W - 20); p.y = clamp(s.y + Math.sin(a) * 170, 20, CFG.FIELD_H - 20);
          p.vx = 0; p.vy = 0;
        }
        if (p !== s) mate++;
      } else p.sad = true;
    }
    if (m.events) m.events.push({ e: 'cele', scorer: m.players.indexOf(s), kind });
    else if (!Game.headless) { FX.banner = null; Sound.whoosh(true); Sound.cheer(true); }
    return true;
  },

  // after a basket: the other side takes it out (overtime: the next basket won it)
  afterGoal(m) {
    const g = m.goals[m.goals.length - 1];
    if (m.overtime) { this.endMatch(m); return; }
    const to = m.training ? 'blue' : g ? otherTeam(g.team) : 'blue';
    if (m.phase === 'cele') {
      // from a celebration: everyone back in their places behind a quick wipe
      m.phase = 'reset'; m.phaseT = 0; m.resetDone = false; m.inboundNext = to;
      return;
    }
    this.setupInbound(m, to);
    m.phase = 'kickoff'; m.phaseT = 0;
  },

  celebrate(m, dt) {
    const g = m.goals[m.goals.length - 1], s = g && g.scorer;
    const cele = m.phase === 'cele' ? m.cele : null;
    if (!cele) return;
    let mate = 0;
    for (const p of m.players) {
      p.mx = 0; p.my = 0;
      if (p.team !== g.team || !s) continue;
      if (p === s) {
        const move = CELE_MOVES[cele.kind], e = CELE_TIME - p.celebrateT;
        const speed = move ? move(e) : 0;
        if (speed > 0) {
          const a = Math.atan2(cele.dir.y, cele.dir.x) + (CELE_TURN[cele.kind] || 0) * e;
          p.mx = Math.cos(a); p.my = Math.sin(a);
          p.mSpeed = speed / (CFG.SPEED * p.speedMul * p.attr.speed);
        }
        continue;
      }
      const a = mate++ * 2.1 + 0.6;
      const tx = s.x + Math.cos(a) * 72, ty = s.y + Math.sin(a) * 48;
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      if (d > 24) { p.mx = dx / d; p.my = dy / d; p.mSpeed = d > 220 ? 1.15 : 0.75; }
    }
  },

  tickClock(m, dt) {
    if (m.training) return;
    if (!m.overtime) {
      m.time -= dt;
      if (m.time <= 0) {
        m.time = 0;
        // a shot already on its way at the buzzer still counts
        if (m.ball.shot && m.buzzer < 2.5) { m.buzzer += dt; return; }
        if (m.ball.owner && m.ball.owner.dunk && m.buzzer < 1) { m.buzzer += dt; return; }
        Sound.buzzer();
        if (m.score.blue === m.score.red) this.startOvertime(m);
        else this.endMatch(m);
      }
    } else {
      m.otTime += dt;
      if (!m.noDraw && m.otTime >= CFG.OVERTIME_SECONDS) this.endMatch(m);
    }
  },

  startOvertime(m) {
    m.overtime = true;
    m.phase = 'reset'; m.phaseT = 0; m.resetDone = false; m.inboundNext = null;
    Sound.whistle('long');
    FX.showBanner(tl('OVERTIME!'), '#ffe14d', 2.0, m.noDraw ? tl('CUP MATCH · NEXT BASKET WINS') : tl('NEXT BASKET WINS'));
  },

  endMatch(m) {
    m.phase = 'timeup'; m.phaseT = 0;
    m.ball.owner = null; m.ball.shot = null;
    for (const p of m.players) { if (p.dunk) { p.dunk = null; p.z = 0; } p.charging = false; }
    Sound.whistle('end');
    Sound.setExcitement(0);
    FX.showBanner(tl('FULL TIME'), '#ffffff', 1.6);
  },

  // the ball has just gone down through the net (entities.js basketThrough)
  basket(m, info) {
    const b = m.ball, team = info.team;
    if (m.phase !== 'play' && m.phase !== 'kickoff') return;
    m.phase = 'goal'; m.phaseT = 0;
    const pts = info.pts || 2;
    m.score[team] += pts;
    m.lastConceded = otherTeam(team);
    const scorer = info.shooter && info.shooter.team === team ? info.shooter : null;
    if (scorer) {
      scorer.stats.goals += pts; scorer.stats.makes++; scorer.stats.points += pts;
      if (pts === 3) scorer.stats.threes++;
    }
    let assist = null;
    if (scorer && b.assist && b.assist.from !== scorer && b.assist.from.team === team && m.clock - b.assist.t < 7) {
      assist = b.assist.from; assist.stats.assists++;
      if (assist.isHuman) { addMeter(m, assist, 10); addUlt(m, assist, CFG.ULT_ASSIST); }
    }
    b.assist = null; b.lastPass = null; b.missFrom = null;
    if (scorer && scorer.isHuman) { addMeter(m, scorer, 12); addUlt(m, scorer, CFG.ULT_GOAL); }
    const nowLeads = m.score[team] > m.score[otherTeam(team)];
    m.trailed = m.trailed || {};
    for (const t of ['blue', 'red']) if (m.score[t] < m.score[otherTeam(t)]) m.trailed[t] = true;
    if (scorer && scorer.isHuman) {
      if (info.kind === 'dunk') { m.flags.dunk = true; m.flags.dunks = (m.flags.dunks || 0) + 1; }
      if (pts === 3) { m.flags.three = true; m.flags.threes = (m.flags.threes || 0) + 1; }
      if (info.swish) { m.flags.swish = true; m.flags.swishes = (m.flags.swishes || 0) + 1; }
      if (info.power) { m.flags.powerGoal = true; m.flags.powerGoals = (m.flags.powerGoals || 0) + 1; }
      if (info.alley) m.flags.alley = true;
    }
    const big = info.kind === 'dunk' || pts === 3 || !!info.ult;
    m.goals.push({ team, scorer, assist, pts, kind: info.kind, big, own: !scorer, how: info.kind, time: m.overtime ? m.duration + m.otTime : m.duration - m.time });
    m.freeze = big ? 0.12 : 0;
    m.slowmo = big ? 0.35 : 0;
    for (const p of m.players) {
      if (p === scorer) p.celebrateT = 1.2;
      if (p.isHuman && p.charging) { p.charging = false; Sound.chargeStop(); }
    }
    let hype = '';
    if (m.overtime) hype = tl('GAME WINNER!');
    else if (info.ult) hype = tl('ON FIRE!');
    else if (info.alley) hype = tl('ALLEY-OOP!');
    else if (info.kind === 'dunk') hype = tl('SLAM DUNK!');
    else if (m.time < 5 && pts) hype = tl('BUZZER BEATER!');
    else if (pts === 3) hype = info.swish ? tl('SPLASH!') : tl('FROM DOWNTOWN!');
    else if (info.kind === 'tip') hype = tl('PUTBACK!');
    if (m.events) {
      const idx = (p) => (p ? m.players.indexOf(p) : -1);
      m.events.push({ e: 'goal', team, scorer: idx(scorer), assist: idx(assist), pts, power: !!info.power, big, hype, x: hoopX(team), y: hoopY(), z: CFG.RIM_Z });
      return; // each screen plays the moment itself (see Online.goalFX)
    }
    if (Game.headless) return;
    this.basketFX(m, team, scorer, pts, big, hype, nowLeads);
  },

  basketFX(m, team, scorer, pts, big, hype, nowLeads) {
    const mine = team === 'blue', col = mine ? '#ffe14d' : TEAMS.red.jersey, kit = TEAMS[team];
    const gx = hoopX(team), gy = hoopY();
    if (m.trailed && m.trailed[team] && nowLeads && !m.comeback && !hype) { hype = tl('COMEBACK!'); m.comeback = true; }
    let sub = tl('{0} POINTS', [pts]);
    if (scorer) sub = scorer.isHuman ? (pts === 3 ? tl('YOU HIT A THREE!') : tl('YOU SCORED!')) : `#${scorer.number} ${TEAMS[team].name} · +${pts}`;
    const title = hype || (pts === 3 ? tl('THREE!') : tl('BUCKET!'));
    FX.showBanner(title, mine ? '#ffe14d' : shadeHex(TEAMS.red.jersey, 0.15), big ? 1.6 : 1.0, sub);
    FX.makeRoom(mine ? 120 : 70);
    FX.confetti(gx, gy, [col, '#ffffff', kit.jersey], big ? (mine ? 46 : 26) : (mine ? 18 : 8));
    FX.ring(gx, gy, '#ffffff', 10, big ? 120 : 70, 0.45, 5);
    FX.burst(gx, gy, CFG.RIM_Z, col, big ? 42 : 20, 0.35);
    if (big) { FX.doShake(mine ? 8 : 5, 0.35); FX.doFlash(col, mine ? 0.25 : 0.14); FX.stars(gx, gy, CFG.RIM_Z); }
    Sound.swish(big ? 1 : 0.6);
    if (big || mine) Sound.cheer(big);
    if (big) Sound.goalJingle(mine);
    vibrate(big ? [30, 40, 30] : 18);
  },

  // (soccer's goal: kept for anything that still calls it)
  goalScored(m, team) { this.basket(m, { team, shooter: null, pts: 2, kind: 'jumper' }); },

  result(m) {
    const outcome = m.score.blue > m.score.red ? 'win' : m.score.blue < m.score.red ? 'loss' : 'draw';
    let mvp = null, best = -1;
    for (const p of m.players) {
      const s = p.stats;
      let rating = s.points * 1 + s.assists * 1.6 + s.rebounds * 0.8 + s.steals * 1.4 + s.blocks * 1.4 + s.passes * 0.2;
      if ((p.team === 'blue' && outcome === 'win') || (p.team === 'red' && outcome === 'loss')) rating += 2;
      if (rating > best) { best = rating; mvp = p; }
    }
    const mult = COIN_MULT[Save.data.settings.difficulty] || 1;
    // a basket is about a third of a goal: the coins per match stay where they were
    const base = Math.round((20 + Math.round(m.score.blue * 3.4) + (outcome === 'win' ? 50 : outcome === 'draw' ? 20 : 0)) * mult);
    const challengeCoins = (m.challenges || []).filter((c) => c.complete).reduce((a, c) => a + c.coins, 0);
    const cupBonus = m.mode === 'cup' && outcome === 'win' ? 40 : 0;
    return { outcome, mvp, coins: base + challengeCoins + cupBonus, base, challengeCoins, cupBonus, mult };
  },
};

// Headless balance check: Sim.run(50) plays AI-vs-AI matches with no rendering.
const Sim = {
  run(n = 30, opts = {}) {
    const prev = Game.headless;
    Game.headless = true;
    const out = { matches: n, blue: 0, red: 0, shots: 0, makes: 0, threes: 0, threeTries: 0, dunks: 0, steals: 0, blocks: 0, rebounds: 0, passes: 0, passTries: 0, draws: 0, overtime: 0, perTeam: [], how: {} };
    for (let i = 0; i < n; i++) {
      const m = Match.create({ autopilot: true, minutes: opts.minutes || CFG.MATCH_MINUTES, club: opts.club, format: opts.format, diff: opts.diff });
      let steps = 0;
      while (m.phase !== 'over' && steps < 200000) { Match.step(m, CFG.STEP); steps++; }
      out.blue += m.score.blue; out.red += m.score.red;
      out.shots += m.stats.blue.shots + m.stats.red.shots;
      out.passes += m.stats.blue.passes + m.stats.red.passes;
      out.passTries += (m.stats.blue.passTries || 0) + (m.stats.red.passTries || 0);
      out.steals += m.stats.blue.steals + m.stats.red.steals;
      out.blocks += (m.stats.blue.blocks || 0) + (m.stats.red.blocks || 0);
      out.rebounds += (m.stats.blue.rebounds || 0) + (m.stats.red.rebounds || 0);
      out.reach = (out.reach || 0) + (m.stats.blue.tackles || 0) + (m.stats.red.tackles || 0);
      out.reachTries = (out.reachTries || 0) + (m.stats.blue.slides || 0) + (m.stats.red.slides || 0);
      out.possessions = (out.possessions || 0) + (m.possN || 0);
      for (const p of m.players) { out.makes += p.stats.makes; out.threes += p.stats.threes; out.threeTries += p.stats.threeTries || 0; out.dunks += p.stats.dunks; }
      if (m.overtime) out.overtime++;
      if (m.score.blue === m.score.red) out.draws++;
      out.perTeam.push(m.score.blue, m.score.red);
      for (const g of m.goals) out.how[g.kind] = (out.how[g.kind] || 0) + 1;
    }
    Game.headless = prev;
    return {
      pointsPerTeam: +((out.blue + out.red) / (2 * n)).toFixed(1),
      shotsPerTeam: +(out.shots / (2 * n)).toFixed(1),
      fgPct: Math.round((out.makes / Math.max(1, out.shots)) * 100) + '%',
      threePct: Math.round((out.threes / Math.max(1, out.threeTries)) * 100) + '%',
      threesPerTeam: +(out.threes / (2 * n)).toFixed(1),
      dunksPerTeam: +(out.dunks / (2 * n)).toFixed(1),
      passesPerTeam: +(out.passes / (2 * n)).toFixed(1),
      passCompletion: Math.round((out.passes / Math.max(1, out.passTries)) * 100) + '%',
      stealsPerTeam: +(out.steals / (2 * n)).toFixed(1),
      blocksPerTeam: +(out.blocks / (2 * n)).toFixed(1),
      reboundsPerTeam: +(out.rebounds / (2 * n)).toFixed(1),
      overtimePct: Math.round((out.overtime / n) * 100) + '%',
      reachStealsPerTeam: +((out.reach || 0) / (2 * n)).toFixed(1), reachTriesPerTeam: +((out.reachTries || 0) / (2 * n)).toFixed(1),
      interceptionsPerTeam: +((out.steals - (out.reach || 0)) / (2 * n)).toFixed(1),
      possessionsPerTeam: +((out.possessions || 0) / (2 * n)).toFixed(1),
      blue: out.blue, red: out.red, how: out.how,
    };
  },
};
