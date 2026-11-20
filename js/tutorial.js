// HOW TO PLAY: a ninety-second animated tutorial.
//
// Ten chapters, each one a little scene that loops two or three times while the caption explains
// it — moving, sprinting, passing, shooting, dunking, skill moves, stealing, blocking, the ult,
// then the 3-point contest. Every scene is drawn with the game's own sprites, so what you watch is
// what you play. SKIP leaves at any point; NEXT jumps a chapter.
//
// Every scene is a pure function of its own clock, so nothing can drift or get stuck: pause,
// resize or jump chapters and it draws exactly the same frame for the same time.
const Tutorial = {
  chapters: [
    { id: 'move', title: tl('MOVE'), dur: 9, loop: 3 },
    { id: 'sprint', title: tl('SPRINT'), dur: 9, loop: 3 },
    { id: 'pass', title: tl('PASS'), dur: 9, loop: 3 },
    { id: 'shoot', title: tl('SHOOT'), dur: 10, loop: 3.4 },
    { id: 'curl', title: tl('DUNK'), dur: 9, loop: 3 },
    { id: 'skill', title: tl('SKILLS'), dur: 10, loop: 3.4 },
    { id: 'tackle', title: tl('STEAL'), dur: 9, loop: 3 },
    { id: 'block', title: tl('BLOCK'), dur: 9, loop: 3 },
    { id: 'ult', title: tl('THE ULT'), dur: 9, loop: 4.5 },
    { id: 'penkick', title: tl('3-POINT CONTEST'), dur: 8, loop: 4 },
  ],

  // the words, with the right keys or buttons for how you are playing
  caption(id, kb) {
    const k = (s) => `<span class="kc">${s}</span>`;
    const btn = (s) => `<span class="kc wide">${s}</span>`;
    const move = kb ? k('W') + k('A') + k('S') + k('D') : tl('the joystick');
    const say = {
      move: kb ? tl('{0} to run. You always control the player nearest the ball.', [move])
        : tl('Drag {0} to run. You always control the player nearest the ball.', [move]),
      sprint: kb ? tl('Hold {0} to sprint. It empties the bar above your head, and an empty bar leaves you jogging.', [k(tl('SHIFT'))])
        : tl('Hold {0} to run faster, or tap it to keep sprinting with your thumb free. It empties the bar above your head, and an empty bar leaves you jogging.', [btn(tl('SPRINT'))]),
      pass: kb ? tl('{0} passes to the team-mate you are facing. Hold it for a lob; a lob to a team-mate by the rim is an alley-oop.', [k('E')])
        : tl('Tap {0} to the team-mate you are facing. Hold it for a lob; a lob to a team-mate by the rim is an alley-oop.', [btn(tl('PASS'))]),
      shoot: kb ? tl('Hold {0}: the meter fills. Let go in the green at the top for a perfect release. Behind the arc it is worth three.', [k(tl('SPACE'))])
        : tl('Hold {0}: the meter fills. Let go in the green at the top for a perfect release. Behind the arc it is worth three.', [btn(tl('SHOOT'))]),
      curl: kb ? tl('Close to the rim, {0} goes straight up: running at it, a dunk; otherwise a layup.', [k(tl('SPACE'))])
        : tl('Close to the rim, {0} goes straight up: running at it, a dunk; otherwise a layup.', [btn(tl('SHOOT'))]),
      skill: kb ? tl('{0} with a direction: crossover, spin, burst or stepback. No direction is a hesitation. Right on top of them, it can put them on the floor.', [k('Q')])
        : tl('{0} with a direction: crossover, spin, burst or stepback. No direction is a hesitation. Right on top of them, it can put them on the floor.', [btn(tl('SKILL'))]),
      tackle: kb ? tl('Without the ball, {0} reaches in for it. Go for the side they are dribbling on — a miss leaves you a step behind.', [k('F')])
        : tl('Without the ball, {0} reaches in for it. Go for the side they are dribbling on — a miss leaves you a step behind.', [btn(tl('STEAL'))]),
      block: kb ? tl('Without the ball, {0} jumps. Time it as they let go and you swat it away. It grabs rebounds too.', [k(tl('SPACE'))])
        : tl('Without the ball, {0} jumps. Time it as they let go and you swat it away. It grabs rebounds too.', [btn(tl('JUMP'))]),
      ult: kb ? tl('Baskets, skills, assists, steals and blocks fill the ULT bar. Full, and {0} sets you on fire: your next shot goes in, with its own cutscene.', [k(tl('SPACE'))])
        : tl('Baskets, skills, assists, steals and blocks fill the ULT bar. Full, and {0} sets you on fire: your next shot goes in, with its own cutscene.', [btn(tl('ULT'))]),
      penkick: kb ? tl('Five shots each from round the arc. Hold {0} and let go in the green. Most made wins; level, and it is sudden death.', [k(tl('SPACE'))])
        : tl('Five shots each from round the arc. Hold {0} and let go in the green. Most made wins; level, and it is sudden death.', [btn(tl('SHOOT'))]),
    };
    return say[id] || '';
  },

  // ---------- running it ----------
  start(after) {
    this.after = after || null;
    this.i = 0;
    this.t = 0;
    this.done = false;
    this.total = this.chapters.reduce((n, c) => n + c.dur, 0);
    this.cv = $('tut-canvas');
    this.g = this.cv.getContext('2d');
    this.resize();
    this.show();
    $('howto-ok').hidden = true;
    $('tut-next').hidden = false;
  },

  stop() { this.done = true; },

  resize() {
    if (!this.cv) return;
    const r = this.cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(200, Math.round(r.width)), h = Math.max(120, Math.round(r.height));
    if (this.cv.width !== Math.round(w * dpr) || this.cv.height !== Math.round(h * dpr)) {
      this.cv.width = Math.round(w * dpr);
      this.cv.height = Math.round(h * dpr);
    }
    this.W = w; this.H = h; this.dpr = dpr;
  },

  next() {
    if (this.i >= this.chapters.length - 1) { this.finish(); return; }
    this.i++; this.t = 0;
    this.show();
  },

  finish() {
    this.done = true;
    $('tut-next').hidden = true;
    $('howto-ok').hidden = false;
    $('tut-title').textContent = tl('THAT IS THE LOT');
    $('tut-caption').innerHTML = tl('Have a go. Everything here is in the pause menu if you want it again.');
    $('tut-time').textContent = '';
    this.bar();
  },

  show() {
    const c = this.chapters[this.i];
    $('tut-title').textContent = `${this.i + 1}/${this.chapters.length}  ${c.title}`;
    $('tut-caption').innerHTML = this.caption(c.id, document.body.classList.contains('kb'));
    this.bar();
  },

  bar() {
    const pips = this.chapters.map((c, i) => `<i class="${i < this.i || this.done ? 'on' : i === this.i ? 'now' : ''}"></i>`).join('');
    $('tut-bar').innerHTML = pips;
  },

  update(dt) {
    if (this.done || !this.cv) return;
    this.resize();
    this.t += dt;
    const c = this.chapters[this.i];
    if (this.t >= c.dur) { this.next(); return; }
    // the clock in the corner: how much is left of the whole thing
    let left = -this.t;
    for (let i = this.i; i < this.chapters.length; i++) left += this.chapters[i].dur;
    const s = Math.max(0, Math.ceil(left));
    $('tut-time').textContent = tl('{0}:{1} LEFT', [Math.floor(s / 60), String(s % 60).padStart(2, '0')]);
    this.draw();
  },

  // ---------- the drawing kit ----------
  // a fake player the sprite code is happy with, posed however the scene needs
  pose(o) {
    const p = UI.fakePlayer(o.look || Save.look(), o.team || 'blue', false, o.number || 10);
    p.vx = o.vx || 0; p.vy = o.vy || 0;
    p.faceX = o.faceX === undefined ? 1 : o.faceX;
    p.fx = o.fx === undefined ? p.faceX : o.fx;
    p.fy = o.fy === undefined ? 0.2 : o.fy;
    p.runPhase = o.runPhase || 0;
    p.kickT = o.kickT || 0; p.kickDur = 0.24;
    p.slideT = o.slideT || 0; p.slideDirX = o.faceX || 1; p.slideDirY = 0;
    p.hopT = o.hopT || 0; p.fallT = o.fallT || 0; p.stunT = o.stunT || 0;
    p.sprintOn = !!o.sprint; p.seed = o.seed || 0;
    p.hasBall = !!o.ball; p.dribble = o.dribble || 0; p.charging = !!o.charging;
    p.shootT = o.shootT || 0; p.blockT = o.blockT || 0; p.z = o.z || 0;
    p.dunk = o.dunk ? { kind: 'dunk', t: o.dunk, top: 0.36, dur: 0.62 } : null;
    if (o.ult) p.ultShot = { kind: o.ult, t: o.ultT || 0, dur: 0.8 };
    if (o.skill) p.skill = { kind: o.skill };
    return p;
  },

  man(g, x, y, k, o, t) { Sprites.player(g, this.pose(o), x, y - (o.z || 0) * k, k, t); },

  pill(g, x, y, w, h, fill, fillPct) {
    g.fillStyle = OUTLINE; Sprites.rr(g, x - 2, y - 2, w + 4, h + 4, (h + 4) / 2); g.fill();
    g.fillStyle = '#dfe3f2'; Sprites.rr(g, x, y, w, h, h / 2); g.fill();
    if (fillPct > 0) { g.fillStyle = fill; Sprites.rr(g, x, y, Math.max(h, w * clamp(fillPct, 0, 1)), h, h / 2); g.fill(); }
  },

  // a wooden court floor
  turf(g, W, H) {
    g.fillStyle = '#e2ad6f'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#d29a5b'; g.lineWidth = 1.5;
    for (let y = 8; y < H; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  },

  // a hoop seen from the side with the rim facing left, in the game's own sizes (k is the scale):
  // the pole, the backboard edge on, the rim 108 up, the net. x is the backboard's face.
  // Gives back the middle of the rim.
  sideHoop(g, x, gy, k, swing = 0) {
    const rimY = gy - CFG.RIM_Z * k, top = gy - 172 * k, bot = gy - 92 * k, rw = CFG.RIM_R * 2 * k;
    const px = x + 30 * k, armY = top + 28 * k;
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [col, w] of [[OUTLINE, Math.max(6, 9 * k)], ['#c9d2de', Math.max(3, 5 * k)]]) {
      g.strokeStyle = col; g.lineWidth = w;
      g.beginPath(); g.moveTo(px, gy); g.lineTo(px, armY); g.lineTo(x + 4 * k, armY); g.stroke();
    }
    g.fillStyle = '#ffffff'; g.strokeStyle = OUTLINE; g.lineWidth = 2.5;
    Sprites.rr(g, x, top, Math.max(4, 6 * k), bot - top, 2); g.fill(); g.stroke();
    const r0 = x - 3 * k - rw, cx = r0 + rw / 2;
    g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(1.2, 1.4 * k);
    for (let i = 0; i <= 4; i++) {
      const f = i / 4;
      g.beginPath(); g.moveTo(r0 + rw * f, rimY); g.lineTo(cx - rw * 0.3 + rw * 0.6 * f + swing, rimY + 30 * k); g.stroke();
    }
    g.beginPath(); g.moveTo(r0 + rw * 0.08 + swing * 0.4, rimY + 14 * k); g.lineTo(r0 + rw * 0.92 + swing * 0.4, rimY + 14 * k); g.stroke();
    for (const [col, w] of [[OUTLINE, Math.max(5, 5 * k)], ['#ff6a1f', Math.max(2.5, 2.8 * k)]]) {
      g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x, rimY); g.lineTo(r0, rimY); g.stroke();
    }
    return { x: cx, y: rimY };
  },

  // the scale and the floor line for the scenes with a hoop in them: smaller, so the hoop fits
  hoopScale(H) { return [H / 190, H * 0.94]; },

  // a big word across the top of the frame
  shout(g, txt, W, H, col, x) { this.label(g, txt, x === undefined ? W * 0.42 : x, H * 0.13, Math.max(14, H * 0.12), col); },

  bal(g, x, y, z, k, t, o = {}) {
    const b = { x, y, z: z || 0, shot: o.shot || null, owner: null, trailType: o.trail || null, roll: t * 6, skin: Save.ball(), netBulge: { left: 0, right: 0 }, vx: 0, vy: 0 };
    Sprites.ball(g, b, x, y - (z || 0), k, t);
  },
  // a dribble at somebody's side
  dribbleBall(g, x, gy, k, t, side = 1) {
    this.bal(g, x + side * 13 * k, gy - 2 * k, Math.abs(Math.sin(t * 9)) * 26 * k, k, t);
  },

  puff(g, x, y, k, n, seed) {
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < n; i++) {
      const a = seed + i * 1.7;
      g.beginPath(); g.arc(x - i * 5 * k, y - Math.abs(Math.sin(a)) * 3 * k, (2.6 - i * 0.5) * k, 0, Math.PI * 2); g.fill();
    }
  },

  // a solid arrow, for showing where somebody is going
  arrow(g, x1, y1, x2, y2, col, w) {
    const a = Math.atan2(y2 - y1, x2 - x1), head = w * 3.2;
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2 - Math.cos(a) * head * 0.8, y2 - Math.sin(a) * head * 0.8); g.stroke();
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x2, y2);
    g.lineTo(x2 - Math.cos(a - 0.5) * head, y2 - Math.sin(a - 0.5) * head);
    g.lineTo(x2 - Math.cos(a + 0.5) * head, y2 - Math.sin(a + 0.5) * head);
    g.closePath(); g.fill();
  },

  label(g, txt, x, y, size, col) {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    Render.chunkyText(g, txt, x, y, size, col || '#ffffff', 0);
  },

  // the shot meter, the way it looks in a match: fill it and let go in the green
  meter(g, x, y, w, h, u) {
    g.fillStyle = 'rgba(22,26,51,0.65)'; Sprites.rr(g, x - 3, y - 3, w + 6, h + 6, 4); g.fill();
    const zone = (lo, hi, col) => { g.fillStyle = col; g.fillRect(x, y + h - h * hi, w, h * (hi - lo)); };
    zone(CFG.GOOD_LO, CFG.PERFECT_LO, 'rgba(255,225,77,0.6)');
    zone(CFG.PERFECT_LO, CFG.PERFECT_HI, '#3fe07a');
    const f = clamp(u, 0, 1);
    g.fillStyle = f >= CFG.PERFECT_LO && f <= CFG.PERFECT_HI ? '#3fe07a' : '#ffffff';
    g.fillRect(x + 2, y + h - h * f, w - 4, h * f);
    g.strokeStyle = OUTLINE; g.lineWidth = 2.5; Sprites.rr(g, x - 3, y - 3, w + 6, h + 6, 4); g.stroke();
  },

  // a ball's arc from a hand to the rim
  arcTo(f, x0, y0, x1, y1, lift) { return [lerp(x0, x1, f), lerp(y0, y1, f) - Math.sin(f * Math.PI) * lift]; },

  // ---------- the scenes ----------
  draw() {
    const g = this.g, W = this.W, H = this.H, c = this.chapters[this.i];
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    this.turf(g, W, H);
    const u = (this.t % c.loop) / c.loop;     // 0..1 through this loop of the scene
    const k = H / 135;                        // sprite scale: big enough to read, small enough to fit
    const gy = H * 0.86;                      // where feet stand
    const scene = this['sc_' + c.id];
    if (scene) scene.call(this, g, u, W, H, k, gy, this.t);
    // a tidy frame
    g.strokeStyle = OUTLINE; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6);
  },

  // Everything below is laid out as a fraction of the frame; only details that belong to a body
  // (the ball at his side, dust) are in units of k, the sprite scale.
  sc_move(g, u, W, H, k, gy, t) {
    const pts = [[W * 0.2, gy - H * 0.2], [W * 0.6, gy - H * 0.2], [W * 0.7, gy], [W * 0.28, gy]];
    const seg = u * 3, i = Math.min(2, Math.floor(seg)), f = seg - i;
    const a = pts[i], b = pts[i + 1];
    const x = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f);
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    g.setLineDash([9, 8]); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (const q of pts.slice(1)) g.lineTo(q[0], q[1]);
    g.stroke(); g.setLineDash([]);
    const fx = Math.sign(dx) || 1;
    this.man(g, x, y, k, { vx: dx, vy: dy, faceX: fx, fx, runPhase: t * 14, ball: true, dribble: t * 9 }, t);
    this.dribbleBall(g, x, y, k, t, fx);
    this.arrow(g, x + (dx / L) * W * 0.06, y + (dy / L) * W * 0.06 - 40 * k,
      x + (dx / L) * W * 0.15, y + (dy / L) * W * 0.15 - 40 * k, '#ffe14d', Math.max(3, W * 0.008));
  },

  sc_sprint(g, u, W, H, k, gy, t) {
    const sprinting = u < 0.62;
    const x = sprinting ? lerp(W * 0.12, W * 0.72, u / 0.62) : lerp(W * 0.72, W * 0.8, (u - 0.62) / 0.38);
    const stam = sprinting ? 1 - u / 0.62 : 0.02;
    if (sprinting) {
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3;
      for (let i = 1; i < 6; i++) { const lx = x - i * W * 0.035; g.beginPath(); g.moveTo(lx, gy - 30 * k + i * 2); g.lineTo(lx - W * 0.03, gy - 30 * k + i * 2); g.stroke(); }
      this.puff(g, x - 8 * k, gy, k, 3, t * 9);
    }
    this.man(g, x, gy, k, { vx: sprinting ? 300 : 60, faceX: 1, runPhase: t * (sprinting ? 22 : 8), sprint: sprinting, ball: true, dribble: t * 12 }, t);
    this.dribbleBall(g, x, gy, k, t);
    const bw = W * 0.1, bh = Math.max(6, H * 0.04);
    const by = gy - 92 * k;
    this.pill(g, x - bw / 2, by, bw, bh, stam > 0.25 ? '#3fcf4a' : '#ff3a3f', stam);
    if (!sprinting) this.label(g, tl('EMPTY'), x - bw / 2 - W * 0.08, by + bh / 2, Math.max(11, H * 0.085), '#ff5a5f');
  },

  sc_pass(g, u, W, H, k, gy, t) {
    const ax = W * 0.18, ay = gy, bx = W * 0.76, by = gy - H * 0.2;
    const back = u >= 0.5;
    const fly = clamp(((back ? u - 0.5 : u) - 0.06) / 0.3, 0, 1);
    const from = back ? [bx, by] : [ax, ay], to = back ? [ax, ay] : [bx, by];
    const dir = to[0] > from[0] ? 1 : -1;
    const x = lerp(from[0] + dir * 14 * k, to[0] - dir * 14 * k, fly), y = lerp(from[1], to[1], fly) - 38 * k;
    const throwing = fly > 0 && fly < 0.3;
    this.arrow(g, from[0] + dir * W * 0.07, from[1] - 60 * k, to[0] - dir * W * 0.07, to[1] - 60 * k, '#ffe14d', Math.max(3, W * 0.007));
    const aHas = back ? fly >= 1 : fly <= 0, bHas = back ? fly <= 0 : fly >= 1;
    this.man(g, ax, ay, k, { faceX: 1, fx: 1, kickT: !back && throwing ? 0.12 : 0, ball: aHas, dribble: t * 9 }, t);
    this.man(g, bx, by, k, { faceX: -1, fx: -1, number: 7, kickT: back && throwing ? 0.12 : 0, ball: bHas, dribble: t * 9 }, t);
    if (aHas) this.dribbleBall(g, ax, ay, k, t);
    if (bHas) this.dribbleBall(g, bx, by, k, t, -1);
    if (fly > 0 && fly < 1) this.bal(g, x, y, 0, k, t);
  },

  sc_shoot(g, u, W, H, k, gy, t) {
    [k, gy] = this.hoopScale(H);
    const charge = clamp(u / 0.4, 0, 1) * 0.92;           // let go in the green
    const shot = u > 0.42, f = clamp((u - 0.42) / 0.34, 0, 1), after = u - 0.76;
    const rim = this.sideHoop(g, W * 0.8, gy, k, after > 0 && after < 0.16 ? Math.sin(t * 30) * 3 * k : 0);
    const px = W * 0.3;
    if (!shot) {
      this.man(g, px, gy, k, { faceX: 1, fx: 1, ball: true, charging: true }, t);
      this.bal(g, px + 1 * k, gy - 74 * k, 0, k, t);
      this.meter(g, px + 30 * k, gy - 100 * k, Math.max(7, 7 * k), 72 * k, charge);
      return;
    }
    const jump = Math.sin(clamp(f * 1.6, 0, 1) * Math.PI) * 18;
    this.man(g, px, gy, k, { faceX: 1, fx: 1, shootT: f < 0.6 ? 0.3 : 0, z: jump }, t);
    if (after < 0) {
      const [bx, by] = this.arcTo(f, px + 11 * k, gy - (84 + 18) * k, rim.x, rim.y - 8 * k, H * 0.32);
      this.bal(g, bx, by, 0, k, t);
    } else {
      this.bal(g, rim.x, Math.min(gy - CFG.BALL_R * k, rim.y - 8 * k + after * after * H * 14), 0, k, t);
    }
    this.label(g, tl('PERFECT!'), px, gy - 120 * k, Math.max(12, H * 0.09), '#3fe07a');
    if (after > 0) this.shout(g, tl('SPLASH!'), W, H, '#ffe14d', W * 0.5);
  },

  // the dunk: a run at the rim, up, and hammered through
  sc_curl(g, u, W, H, k, gy, t) {
    [k, gy] = this.hoopScale(H);
    const rim = this.sideHoop(g, W * 0.8, gy, k, u > 0.64 && u < 0.86 ? Math.sin(t * 30) * 4 * k : 0);
    const takeoff = rim.x - 100 * k, under = rim.x - 9 * k;
    if (u < 0.4) {
      const x = lerp(W * 0.06, takeoff, u / 0.4);
      this.man(g, x, gy, k, { faceX: 1, fx: 1, runPhase: t * 16, vx: 260, ball: true, dribble: t * 12 }, t);
      this.dribbleBall(g, x, gy, k, t);
      return;
    }
    const d = clamp((u - 0.4) / 0.36, 0, 1), top = 0.58;   // through the dunk: up, the top, down
    const x = d < top ? lerp(takeoff, under, d / top) : under;
    const z = Math.sin(d * Math.PI) * 62;
    this.man(g, x, gy, k, { faceX: 1, fx: 1, z, dunk: d < 1 ? d * 0.62 : 0, runPhase: t * 8 }, t);
    if (d < top) this.bal(g, x + 9 * k, gy - (z + 84) * k, 0, k, t);
    else {
      const f = (d - top) / (1 - top);
      const y = f < 0.35 ? lerp(gy - (62 + 84) * k, rim.y + 6 * k, f / 0.35) : rim.y + 6 * k + (f - 0.35) * (f - 0.35) * H * 3;
      this.bal(g, rim.x, Math.min(gy - CFG.BALL_R * k, y), 0, k, t);
    }
    if (d > 0.62) this.shout(g, tl('SLAM DUNK!'), W, H, '#ffe14d');
  },

  // a crossover that puts the defender on the floor
  sc_skill(g, u, W, H, k, gy, t) {
    const defX = W * 0.56;
    const run = clamp(u / 0.4, 0, 1);
    const trick = u > 0.4 && u < 0.62, past = u >= 0.62;
    const x = past ? lerp(defX + W * 0.02, W * 0.9, (u - 0.62) / 0.38)
      : trick ? defX - W * 0.15 + ((u - 0.4) / 0.22) * W * 0.17 : lerp(W * 0.08, defX - W * 0.15, run);
    const side = trick ? Math.sin(((u - 0.4) / 0.22) * Math.PI / 2) * H * 0.14 : past ? H * 0.14 : 0;
    const hand = trick && u < 0.47 ? -1 : 1;
    // the defender bites on the first step, then goes down
    this.man(g, defX, gy + (trick ? H * 0.03 : 0), k, { team: 'red', faceX: -1, fx: -1, number: 5, fallT: past ? 0.5 : 0, runPhase: t * 8, vx: past ? 0 : -40 }, t);
    this.man(g, x, gy - side, k, { faceX: 1, fx: 1, runPhase: t * 16, vx: 240, ball: true, dribble: t * 12 }, t);
    this.dribbleBall(g, x, gy - side, k, t, hand);
    if (trick) this.shout(g, tl('CROSSOVER!'), W, H, '#ffe14d', W * 0.5);
    if (past) this.shout(g, tl('ANKLES BROKEN!'), W, H, '#ff8af0', W * 0.5);
  },

  // a reach for the ball as they go past
  sc_tackle(g, u, W, H, k, gy, t) {
    const mx = W * 0.32;
    const carrier = lerp(W * 0.88, mx + W * 0.12, clamp(u / 0.5, 0, 1));
    const reach = u > 0.4 && u < 0.62, won = u >= 0.55;
    this.man(g, carrier, gy, k, { team: 'red', faceX: -1, fx: -1, number: 9, runPhase: t * 15, vx: won ? 0 : -260, ball: !won, dribble: t * 12, stunT: won ? 0.3 : 0 }, t);
    if (!won) this.dribbleBall(g, carrier, gy, k, t, -1);
    this.man(g, mx, gy, k, { faceX: 1, fx: 1, slideT: reach && !won ? 0.2 : 0, ball: won, dribble: t * 10 }, t);
    if (won) this.dribbleBall(g, mx, gy, k, t);
    if (reach && !won) this.shout(g, tl('STEAL!'), W, H, '#ffb03a', W * 0.5);
    if (won) this.shout(g, tl('BALL WON!'), W, H, '#46d9ff', W * 0.5);
  },

  // a jump as they let go, and it is swatted away
  sc_block(g, u, W, H, k, gy, t) {
    const sx = W * 0.3, dx = W * 0.47;
    const rise = u > 0.3, swatted = u >= 0.5;
    const sz = rise ? Math.sin(clamp((u - 0.3) / 0.4, 0, 1) * Math.PI) * 16 : 0;
    const dz = rise ? Math.sin(clamp((u - 0.33) / 0.4, 0, 1) * Math.PI) * 30 : 0;
    this.man(g, sx, gy, k, { team: 'red', faceX: 1, fx: 1, number: 4, z: sz, charging: !rise, ball: !rise, shootT: rise && !swatted ? 0.3 : 0 }, t);
    this.man(g, dx, gy, k, { faceX: -1, fx: -1, z: dz, blockT: rise && u < 0.73 ? 0.3 : 0 }, t);
    if (!rise) this.bal(g, sx + 1 * k, gy - 74 * k, 0, k, t);
    else if (!swatted) {
      const f = (u - 0.3) / 0.2;
      this.bal(g, lerp(sx + 11 * k, dx - 14 * k, f), gy - (84 + sz) * k - f * 12 * k, 0, k, t);
    } else {
      const f = clamp((u - 0.5) / 0.4, 0, 1);
      this.bal(g, lerp(dx - 14 * k, W * 0.06, f), Math.min(gy - CFG.BALL_R * k, gy - (96 + 30) * k + f * f * H * 1.2 - Math.sin(f * Math.PI) * H * 0.12), 0, k, t);
      this.shout(g, tl('BLOCKED!'), W, H, '#ff5a5f', W * 0.66);
    }
  },

  sc_ult(g, u, W, H, k, gy, t) {
    const [hk, hgy] = this.hoopScale(H);
    const fill = clamp(u / 0.45, 0, 1), full = fill >= 1;
    const fired = u > 0.52, f = clamp((u - 0.52) / 0.34, 0, 1), after = u - 0.86;
    const rim = this.sideHoop(g, W * 0.82, hgy, hk, after > 0 && after < 0.12 ? Math.sin(t * 30) * 3 * hk : 0);
    const px = W * 0.22;
    const bh = Math.max(7, H * 0.05);
    this.pill(g, W * 0.05, H * 0.07, W * 0.24, bh, full && Math.sin(t * 18) > 0 ? '#ffffff' : rainbow(t * 0.7), fill);
    g.textAlign = 'left'; g.textBaseline = 'middle';
    Render.chunkyText(g, full ? tl('ULT READY') : tl('ULT'), W * 0.31, H * 0.07 + bh / 2, Math.max(10, H * 0.08), full ? '#ffe14d' : '#ffffff', 0);
    g.textAlign = 'center';
    if (!fired) {
      this.man(g, px, hgy, hk, { faceX: 1, fx: 1, runPhase: t * 10, vx: 80, ball: true, dribble: t * 9 }, t);
      this.dribbleBall(g, px, hgy, hk, t);
      if (full) this.label(g, tl('PRESS IT'), px, hgy - 100 * hk, Math.max(12, H * 0.095), '#ffe14d');
      return;
    }
    this.man(g, px, hgy, hk, { faceX: 1, fx: 1, ult: 'fadeaway', ultT: clamp(f * 1.4, 0, 1) * 0.8 }, t);
    if (after < 0) {
      const p0 = [px + 10 * hk, hgy - 110 * hk], p1 = [rim.x, rim.y - 8 * hk];
      const [bx, by] = this.arcTo(f, p0[0], p0[1], p1[0], p1[1], H * 0.2);
      const [nx, ny] = this.arcTo(Math.min(1, f + 0.02), p0[0], p0[1], p1[0], p1[1], H * 0.2);
      Sprites.fireball(g, bx, by, CFG.BALL_R * hk, (nx - bx) * 60, ((ny - by) * 60) / CFG.TILT, t);
      this.bal(g, bx, by, 0, hk, t);
    } else {
      this.bal(g, rim.x, Math.min(hgy - CFG.BALL_R * hk, rim.y - 8 * hk + after * after * H * 20), 0, hk, t);
      this.shout(g, tl('ON FIRE!'), W, H, '#ffb03a', W * 0.62);
    }
  },

  // the 3-point contest: from behind, the arc, the hoop, and a perfect release
  sc_penkick(g, u, W, H, k, gy, t) {
    const cx = W * 0.5;
    // the hoop straight ahead: pole, backboard, rim, net
    const by = H * 0.08, bw = H * 0.62, bh = H * 0.36;
    g.lineCap = 'round';
    g.strokeStyle = OUTLINE; g.lineWidth = 9; g.beginPath(); g.moveTo(cx, by + bh); g.lineTo(cx, H * 0.6); g.stroke();
    g.strokeStyle = '#c9d2de'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx, by + bh); g.lineTo(cx, H * 0.6); g.stroke();
    g.fillStyle = '#ffffff'; g.strokeStyle = OUTLINE; g.lineWidth = 3;
    Sprites.rr(g, cx - bw / 2, by, bw, bh, 4); g.fill(); g.stroke();
    g.strokeStyle = '#ff3a3f'; g.lineWidth = 2.5; g.strokeRect(cx - bw * 0.18, by + bh * 0.42, bw * 0.36, bh * 0.4);
    const ry = by + bh * 0.9, rw = bw * 0.2;
    const after = u - 0.84;
    const swing = after > 0 && after < 0.12 ? Math.sin(t * 30) * 2 : 0;
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.6;
    for (let i = 0; i <= 6; i++) { const f = i / 6; g.beginPath(); g.moveTo(cx - rw + rw * 2 * f, ry); g.lineTo(cx - rw * 0.6 + rw * 1.2 * f + swing, ry + H * 0.14); g.stroke(); }
    g.strokeStyle = OUTLINE; g.lineWidth = 6; g.beginPath(); g.ellipse(cx, ry, rw, rw * 0.3, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#ff6a1f'; g.lineWidth = 3.5; g.beginPath(); g.ellipse(cx, ry, rw, rw * 0.3, 0, 0, Math.PI * 2); g.stroke();
    // the arc on the floor
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(cx, H * 0.62, W * 0.42, H * 0.3, 0, 0.15, Math.PI - 0.15); g.stroke();
    const charge = clamp(u / 0.45, 0, 1) * 0.92, shot = u > 0.48, f = clamp((u - 0.48) / 0.36, 0, 1);
    const sx = cx + W * 0.14, sy = H * 0.99, kk = k * 0.95;
    if (!shot) {
      this.man(g, sx, sy, kk, { faceX: -1, fx: 0, fy: -1, ball: true, charging: true }, t);
      this.bal(g, sx, sy - 74 * kk, 0, kk, t);
      this.meter(g, sx + 30 * kk, sy - 100 * kk, Math.max(7, 7 * kk), 72 * kk, charge);
      return;
    }
    this.man(g, sx, sy, kk, { faceX: -1, fx: 0, fy: -1, shootT: 0.3 }, t);
    if (after < 0) {
      const [bx, bby] = this.arcTo(f, sx, sy - 84 * kk, cx, ry - 6, H * 0.3);
      this.bal(g, bx, bby, 0, kk * (1 - f * 0.35), t);
    } else {
      this.bal(g, cx, Math.min(H * 0.9, ry - 6 + after * after * H * 18), 0, kk * 0.65, t);
      this.shout(g, tl('SPLASH!'), W, H, '#ffe14d', W * 0.16);
    }
  },
};
