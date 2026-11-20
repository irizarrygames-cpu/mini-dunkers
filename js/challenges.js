// SKILL CHALLENGES: three solo tests with medals, for when nobody else is around.
//   targets  — AROUND THE WORLD: ten threes, twice round the arc (the 3-point contest's scene)
//   keeper   — the FREE THROW LINE: ten free throws
//   gauntlet — beat two defenders and score as fast as you can, on the court
// (the ids are the old ones, so a record is always found under the same name)
// Best scores and medals live in Save.data.challenges; each medal pays out once.
const MEDALS = ['bronze', 'silver', 'gold'];
const MEDAL_COLORS = { bronze: '#c87d3a', silver: '#c9d2e4', gold: '#ffc21a' };
const CHALLENGE_LIST = [
  { id: 'targets', name: tl('AROUND THE WORLD'), kind: 'pens', icon: 'target',
    blurb: tl('Ten threes, twice round the arc. Let go in the green.'), unit: tl('MADE'), cuts: [4, 6, 8], coins: [80, 150, 300] },
  { id: 'keeper', name: tl('FREE THROW LINE'), kind: 'pens', icon: 'target',
    blurb: tl('Ten free throws. Nobody to beat but the rim.'), unit: tl('MADE'), cuts: [6, 8, 9], coins: [80, 150, 300] },
  { id: 'gauntlet', name: tl('DRIBBLE GAUNTLET'), kind: 'match', icon: 'boot',
    blurb: tl('Beat two defenders and score. The clock is running.'), unit: tl('SEC'), lower: true, cuts: [34, 24, 16], coins: [80, 150, 300] },
];
const challengeById = (id) => CHALLENGE_LIST.find((c) => c.id === id);
// which medal a score earns (time challenges want a LOW score)
function medalFor(ch, score) {
  if (score === null || score === undefined) return null;
  let best = null;
  ch.cuts.forEach((cut, i) => { if (ch.lower ? score <= cut : score >= cut) best = MEDALS[i]; });
  return best;
}

const SkillRun = {
  // ---------- records ----------
  store() {
    const d = Save.data;
    if (!d.challenges || typeof d.challenges !== 'object') d.challenges = {};
    return d.challenges;
  },
  best(id) { const r = this.store()[id]; return r && typeof r.best === 'number' ? r.best : null; },
  medal(id) { return medalFor(challengeById(id), this.best(id)); },
  // returns the coins earned this go (only for medals you had not reached before)
  record(id, score) {
    const ch = challengeById(id), rec = this.store()[id] || (this.store()[id] = { best: null, paid: [] });
    if (!Array.isArray(rec.paid)) rec.paid = [];
    const better = rec.best === null || (ch.lower ? score < rec.best : score > rec.best);
    if (better) rec.best = score;
    let coins = 0;
    const got = medalFor(ch, score);
    if (got) {
      for (let i = 0; i <= MEDALS.indexOf(got); i++) {
        if (rec.paid.includes(MEDALS[i])) continue;
        rec.paid.push(MEDALS[i]);
        coins += ch.coins[i];
      }
    }
    if (coins) { Save.data.coins += coins; }
    Save.write();
    // a finished run counts for the missions, and a medal (any, not just a new one) too
    if (typeof Missions !== 'undefined') { Missions.bump('challenge'); if (got) Missions.bump('medal'); }
    return { coins, medal: got, best: rec.best, better };
  },

  // ---------- starting one ----------
  start(id) {
    const ch = challengeById(id);
    if (!ch) return;
    if (Pitch.use('normal')) Game.demo = null; // the challenges are laid out on the normal pitch
    Sound.unlock();
    Game.goFullscreen();
    UI.closeAll();
    this.run = { id, ch, score: 0, done: false, t: 0 };
    if (ch.kind === 'pens') this.startPens(ch);
    else this.startGauntlet(ch);
  },

  startPens(ch) {
    const club = Clubs.random(Clubs.mine());
    Game.lastOpts = { mode: 'challenge', id: ch.id };
    Game.match = Match.create({ mode: 'pens', club, format: '1v1' });
    Pens.init(Game.match, ch.id === 'keeper');
    const P = Game.match.pens;
    P.chal = { id: ch.id, kicks: 0, total: 10, score: 0 };
    P.first = 'blue'; P.n = 0;
    Pens.next(Game.match, true);
    $('hud').classList.add('pens');
    Game.state = 'match';
    UI.show('match');
    Sound.startMusic(); Sound.startAmbience();
  },

  startGauntlet(ch) {
    const club = Clubs.random(Clubs.mine());
    Game.lastOpts = { mode: 'challenge', id: ch.id };
    const m = Match.create({ mode: 'quick', club, format: 'training' });
    m.challenges = null;
    Game.match = m;
    m.challenge = { id: ch.id, t: 0, lost: 0, done: false };
    // you, and two defenders strung out between you and the hoop
    m.players = m.players.filter((p) => p === m.human);
    const rng = mulberry32((Math.random() * 1e9) | 0);
    for (let i = 0; i < 2; i++) {
      const bc = pickBotCharacter(rng);
      const p = new Player({ team: 'red', role: 'def', number: 2 + i, attr: ratingAttr(bc.r), look: { hair: bc.hair, hairColor: bc.hairColor, skin: bc.skin, cap: bc.cap, band: bc.band, thin: 0, anime: false, mewing: false, acc: null } });
      p.speedMul = (m.diff && m.diff.redSpeed) || 1;
      p.sig = sigKind(bc);
      p.x = CFG.FIELD_W * (0.55 + i * 0.17); p.y = CFG.FIELD_H / 2 + (i % 2 ? -230 : 230);
      m.players.push(p);
    }
    m.human.x = 260; m.human.y = CFG.FIELD_H / 2;
    m.ball.owner = m.human; m.ball.x = m.human.x + 16; m.ball.y = m.human.y; m.ball.z = 0; m.ball.vx = 0; m.ball.vy = 0;
    m.phase = 'play'; m.phaseT = 0; m.clock = 0;
    m.teamHuman = { blue: true, red: false };
    Game.state = 'match';
    UI.show('match');
    Render.updateCamera(m, 0, true);
    FX.showBanner(tl('GO!'), '#ffe14d', 0.9, tl('BEAT THE DEFENDERS AND SCORE'));
    Sound.startMusic(); Sound.startAmbience();
  },

  // ---------- the contest scene, driven as a drill ----------
  // a shot has landed (the scene has already said what it did)
  scoreShot(m, s) {
    const C = m.pens.chal;
    C.kicks++;
    if (s.made) C.score++;
  },
  // the last of the ten: the end card
  finishShots(m) {
    const P = m.pens;
    P.phase = 'end'; P.t = 0;
    Pens.label(tl('SHOOT'));
    this.show(P.chal.score);
  },

  // ---------- the gauntlet's own little loop ----------
  step(m, dt) {
    const c = m.challenge;
    if (!c || c.done) return;
    c.t += dt;
    c.lost = m.ball.owner === m.human ? 0 : c.lost + dt;
    if (m.score.blue > 0) { this.finishGauntlet(m, c.t); return; }
    // they are defending, not attacking: anything they put in your net is wiped and costs you time
    if (m.score.red > 0) { m.score.red = 0; c.t += 3; c.lost = 0; this.resetGauntlet(m); }
    // lost it for three seconds: back to the start, and it costs you three on the clock
    if (c.lost > 3) { c.lost = 0; c.t += 3; c.resets = (c.resets || 0) + 1; this.resetGauntlet(m); }
    if (c.t > 60) this.finishGauntlet(m, null);
  },

  // put you, the ball and the defenders back where they started
  resetGauntlet(m) {
    const h = m.human, b = m.ball;
    h.x = 260; h.y = CFG.FIELD_H / 2; h.vx = 0; h.vy = 0; h.stunT = 0; h.fallT = 0; h.slideT = 0;
    b.owner = h; b.x = h.x + 16; b.y = h.y; b.z = 0; b.vx = 0; b.vy = 0; b.vz = 0; b.shot = null;
    let i = 0;
    for (const p of m.players) {
      if (p === h) continue;
      p.x = CFG.FIELD_W * (0.55 + i * 0.17); p.y = CFG.FIELD_H / 2 + (i % 2 ? -230 : 230);
      p.vx = 0; p.vy = 0; p.stunT = 0; p.slideT = 0; p.slideWindT = 0;
      i++;
    }
    if (!Game.headless) { FX.showBanner(tl('BALL LOST  +3s'), '#ff8a8e', 0.7); Sound.whistle(); }
  },

  finishGauntlet(m, seconds) {
    const c = m.challenge;
    if (c.done) return;
    c.done = true;
    m.phase = 'over';
    this.show(seconds === null ? null : Math.round(seconds * 10) / 10);
  },

  // ---------- the end card ----------
  show(score) {
    const r = this.run;
    if (!r || r.done) return;
    r.done = true; r.score = score;
    const ch = r.ch;
    const failed = score === null;
    const res = failed ? { coins: 0, medal: null, best: this.best(ch.id), better: false } : this.record(ch.id, score);
    Game.state = 'results';
    const medal = res.medal;
    const line = failed ? tl('NO SCORE') : ch.lower ? `${score.toFixed(1)}s` : `${score} / 10 ${ch.unit}`;
    const bestLine = res.best === null ? '' : ch.lower ? `${(+res.best).toFixed(1)}s` : `${res.best} ${ch.unit}`;
    const el = $('challenge-end');
    el.innerHTML = `
      <div class="panel small chal-end">
        <h2>${ch.name}</h2>
        ${medal ? `<div class="chal-medal ${medal}" style="--m:${MEDAL_COLORS[medal]}"><span></span><b>${tl(medal.toUpperCase())}</b></div>` : `<div class="chal-medal none"><b>${tl('NO MEDAL')}</b></div>`}
        <div class="chal-score">${line}</div>
        ${res.better && !failed ? `<div class="chal-new">${tl('NEW BEST!')}</div>` : bestLine ? `<div class="note">${tl('BEST: {0}', [bestLine])}</div>` : ''}
        ${res.coins ? `<div class="chal-coins"><span class="coin"></span>+${res.coins}</div>` : ''}
        <div class="chal-cuts">${ch.cuts.map((cut, i) => `<span class="${MEDALS[i]}"><i style="background:${MEDAL_COLORS[MEDALS[i]]}"></i>${ch.lower ? `${cut}s` : cut}</span>`).join('')}</div>
        <div class="chal-buttons"><button class="big-btn green" data-a="again">${tl('TRY AGAIN')}</button><button class="mid-btn" data-a="home">${tl('BACK')}</button></div>
      </div>`;
    el.hidden = false;
    el.querySelector('[data-a="again"]').addEventListener('click', () => { UI.tap(); el.hidden = true; this.start(ch.id); });
    el.querySelector('[data-a="home"]').addEventListener('click', () => { UI.tap(); el.hidden = true; this.quit(); });
    if (medal === 'gold') { Sound.goalJingle(true); Sound.cheer(true); } else if (medal) Sound.powerReady(); else Sound.ooh();
  },

  quit() {
    $('challenge-end').hidden = true;
    this.run = null;
    $('hud').classList.remove('pens');
    Pens.label(tl('SHOOT'));
    Game.goHome();
  },

  // ---------- drawing over the scene ----------
  // the scoreline at the top, where the contest keeps its tally: name on top, score and shot under
  drawShots(ctx, L, P, t, box) {
    const ch = challengeById(P.chal.id), W = L.W;
    const big = clamp(Math.min(L.W, L.H) * 0.038, 12, 20), small = big * 0.62;
    const score = `${P.chal.score} ${ch.unit}`, shot = tl('SHOT {0}/{1}', [Math.min(P.chal.total, P.chal.kicks + 1), P.chal.total]);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 ${big}px "Lilita One", system-ui, sans-serif`;
    const wScore = ctx.measureText(score + '   ' + shot).width;
    ctx.font = `400 ${small}px "Lilita One", system-ui, sans-serif`;
    const w = Math.max(wScore, ctx.measureText(ch.name).width) + big * 1.6;
    const h = small + big * 2.1, x = W / 2 - w / 2, y = box ? box[1] : 10;
    ctx.fillStyle = OUTLINE; Sprites.rr(ctx, x + 3, y + 4, w, h, big * 0.6); ctx.fill();
    ctx.fillStyle = '#ffffff'; Sprites.rr(ctx, x, y, w, h, big * 0.6); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.stroke();
    ctx.fillStyle = '#6b7299';
    ctx.font = `400 ${small}px "Lilita One", system-ui, sans-serif`;
    ctx.fillText(ch.name, W / 2, y + small * 0.95);
    ctx.font = `400 ${big}px "Lilita One", system-ui, sans-serif`;
    ctx.fillStyle = OUTLINE;
    ctx.fillText(score + '   ' + shot, W / 2, y + small + big * 0.95);
  },

  drawGauntlet(ctx, m) {
    const c = m.challenge;
    if (!c) return;
    const W = Render.W, big = clamp(Math.min(W, Render.H) * 0.05, 14, 24);
    ctx.setTransform(Render.dpr, 0, 0, Render.dpr, 0, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = `${c.t.toFixed(1)}s`;
    ctx.font = `400 ${big}px "Lilita One", system-ui, sans-serif`;
    const w = ctx.measureText(txt).width + big * 1.2;
    ctx.fillStyle = OUTLINE; Sprites.rr(ctx, W / 2 - w / 2 + 3, 13, w, big * 1.8, big * 0.5); ctx.fill();
    ctx.fillStyle = c.t > 30 ? '#ffd0d3' : '#ffffff'; Sprites.rr(ctx, W / 2 - w / 2, 10, w, big * 1.8, big * 0.5); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = OUTLINE; ctx.stroke();
    Render.chunkyText(ctx, txt, W / 2, 10 + big * 0.9, big, '#161a33', 0);
  },
};

/* ---------------- the menu ---------------- */
Object.assign(UI, {
  panel_challenges(body) {
    $('modal-title').textContent = tl('SKILL CHALLENGES');
    body.innerHTML = `
      <p class="note">${tl('Three tests on your own. Beat the marks for a medal — each medal pays out once.')}</p>
      <div class="chal-grid">${CHALLENGE_LIST.map((ch) => {
        const best = SkillRun.best(ch.id), medal = SkillRun.medal(ch.id);
        const bestTxt = best === null ? tl('NOT PLAYED') : ch.lower ? tl('BEST {0}s', [(+best).toFixed(1)]) : tl('BEST {0} {1}', [best, ch.unit]);
        return `<button class="chal-card ${medal || ''}" data-chal="${ch.id}">
          <strong>${ch.name}</strong>
          <p>${ch.blurb}</p>
          <div class="chal-row"><span class="chal-best">${bestTxt}</span>${medal ? `<span class="chal-badge" style="--m:${MEDAL_COLORS[medal]}">${tl(medal.toUpperCase())}</span>` : ''}</div>
          <div class="chal-cuts">${ch.cuts.map((cut, i) => `<span><i style="background:${MEDAL_COLORS[MEDALS[i]]}"></i>${ch.lower ? `${cut}s` : cut}</span>`).join('')}</div>
        </button>`;
      }).join('')}</div>`;
    body.querySelectorAll('[data-chal]').forEach((b) => b.addEventListener('click', () => { this.tap(); this.closeModal(); SkillRun.start(b.dataset.chal); }));
  },
});
