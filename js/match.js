/* MÍSTER FÚTBOL 26·27 — motor de partido en tiempo real (vista cenital)
   Coordenadas en metros: x 0..105 (largo), y 0..68 (ancho). Sin dependencias de dibujo:
   el mismo motor se usa para VISIONADO, JUGAR y para las pruebas automáticas. */
(function (G) {
  'use strict';
  const MF = G.MF; const U = MF.U; const DB = MF.DB;

  const PL = 105, PW = 68, GOAL_W = 7.32, GOAL_H = 2.44, GRAV = 9.8;
  const GY1 = PW / 2 - GOAL_W / 2, GY2 = PW / 2 + GOAL_W / 2;
  const BOX_D = 16.5, BOX_W = 40.32;
  const STEP = 1 / 60;

  function Match(world, cfg) {
    this.w = world; this.cfg = cfg;
    this.R = U.rng(cfg.seed || (Date.now() >>> 0));
    this.duration = cfg.duration || 240; // segundos reales por partido a velocidad x1
    this.minPerSec = 90 / this.duration;
    this.human = cfg.human === undefined ? -1 : cfg.human;
    this.diff = cfg.difficulty || 1;
    this.neutral = !!cfg.neutral;
    this.T = [world.teams[cfg.home], world.teams[cfg.away]];
    this.tac = [cfg.thome || this.T[0], cfg.taway || this.T[1]];
    this.L = [JSON.parse(JSON.stringify(cfg.lhome)), JSON.parse(JSON.stringify(cfg.laway))];
    this.kits = cfg.kits || [this.T[0].kit.home, this.T[1].kit.away];
    this.t = 0; this.half = 1; this.added = [1 + this.R.int(0, 3), 2 + this.R.int(0, 4)];
    // campo elegido en el sorteo: dirHome = +1 → el local ataca hacia x = 105 en la primera parte
    this.dir = cfg.dirHome === -1 ? [-1, 1] : [1, -1];
    this.phase = 'kickoff'; this.phaseT = 1.2; this.restart = null;
    this.score = [0, 0];
    this.events = []; this.subsIn = [[], []]; this.subsLeft = [5, 5]; this.subWindows = [3, 3];
    this.stats = { shots: [0, 0], onTarget: [0, 0], corners: [0, 0], fouls: [0, 0], possT: [1, 1], offside: [0, 0], saves: [0, 0] };
    this.msgQ = []; this.hooks = cfg.hooks || {};
    this.excite = 0; this.realT = 0;
    this.ball = { x: PL / 2, y: PW / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, kickBy: null, kickCd: 0, type: null, target: null, offside: null, shotSaveTried: false, shotFrom: null, spin: 0 };
    this.ref = { x: PL / 2 - 8, y: PW / 2 + 10, vx: 0, vy: 0, face: 0, anim: 0 };
    this.P = [[], []];
    for (let s = 0; s < 2; s++) this.L[s].xi.forEach((id, i) => this.P[s].push(this.makeMP(world.players[id], s, i)));
    this.ctrl = null; this.input = { mx: 0, my: 0, btnRel: false, btnHeldT: 0, passRel: false, shootRel: false, switch: false, lastA: null, idleT: 0 };
    this.chasers = [null, null]; this.chasePt = [null, null]; this.chaseTimer = 0;
    // saque inicial según el sorteo; en la segunda parte saca el otro equipo
    this.firstKick = cfg.kickoff === 1 ? 1 : 0; this.waitingHuman = false;
    this.setKickoff(this.firstKick);
    this.goalScale = cfg.goalScale || 1;
  }

  const MP = Match.prototype;

  MP.makeMP = function (d, side, slot) {
    const f = DB.FORMATIONS[this.L[side].formation][slot];
    // atributos amplificados: en el motor las diferencias de calidad se notan más
    const a = {}; const home = side === 0 && !this.neutral ? 2 : 0;
    const pen = DB.rolePenalty(d.role, f[0]) * 0.6;
    Object.keys(d.at).forEach((k) => { a[k] = U.clamp(74 + (d.at[k] - 74) * 1.55 + home - pen + (d.fit - 100) * 0.1, 10, 125); });
    return {
      d, a, side, slot, role: f[0], line: DB.LINE_OF[f[0]], hx: f[1], hy: f[2], isGK: f[0] === 'POR',
      x: 0, y: 0, vx: 0, vy: 0, face: 0, tx: 0, ty: 0, want: 0.6,
      stam: U.clamp(d.fit / 100, 0.4, 1), think: this.R() * 0.3, tackleCd: 0, kickCd: 0, state: '', stateT: 0,
      yel: 0, off: false, anim: this.R() * 6, run: 0, runT: 0, runX: 0, runY: 0,
      st: { touch: 0, pass: 0, passOk: 0, shots: 0, tackles: 0, saves: 0, goals: 0, ast: 0 },
      maxSp: 0, eff: 1,
    };
  };

  // --------- utilidades de geometría por equipo
  MP.ax = function (side, x) { return this.dir[side] === 1 ? x / PL : (PL - x) / PL; };
  MP.wx = function (side, ax) { return this.dir[side] === 1 ? ax * PL : PL - ax * PL; };
  MP.wy = function (side, ny) { return this.dir[side] === 1 ? ny * PW : PW - ny * PW; };
  MP.oppGoalX = function (side) { return this.dir[side] === 1 ? PL : 0; };
  MP.ownGoalX = function (side) { return this.dir[side] === 1 ? 0 : PL; };
  MP.active = function (side) { return this.P[side].filter((p) => !p.off); };
  MP.all = function () { return this.P[0].concat(this.P[1]).filter((p) => !p.off); };
  MP.gk = function (side) { return this.P[side].find((p) => p.isGK && !p.off) || null; };
  MP.minute = function () { return Math.min(this.half === 1 ? 45 + this.added[0] : 90 + this.added[1], Math.floor(this.t) + 1); };
  MP.dispMinute = function () { const m = Math.floor(this.t); return this.half === 1 ? Math.min(m, 45 + this.added[0]) : Math.min(m, 90 + this.added[1]); };
  MP.inBox = function (side, x, y) { // ¿(x,y) dentro del área que defiende "side"?
    const ax = this.ax(side, x);
    return ax * PL < BOX_D && Math.abs(y - PW / 2) < BOX_W / 2;
  };

  MP.speedOf = function (p) {
    const vel = p.a.vel * (p.side === this.human || this.human < 0 ? 1 : this.diff);
    return (6.0 + vel * 0.032) * (0.84 + 0.16 * p.stam);
  };

  MP.say = function (type, data) {
    const ev = Object.assign({ type, min: this.minute() }, data || {});
    this.msgQ.push(ev);
    if (this.hooks.event) this.hooks.event(ev, this);
    return ev;
  };

  // --------- saques y colocación
  MP.setKickoff = function (side) {
    this.kickoffSide = side;
    if (this.input) { this.input.passRel = false; this.input.shootRel = false; this.input.btnRel = false; }
    const b = this.ball; Object.assign(b, { x: PL / 2, y: PW / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: null, type: null, target: null, offside: null });
    for (let s = 0; s < 2; s++) this.P[s].forEach((p) => {
      if (p.off) return;
      let ax = Math.min(p.hx * 0.85, 0.45); if (p.isGK) ax = 0.03;
      p.x = this.wx(s, ax); p.y = this.wy(s, p.hy); p.vx = p.vy = 0; p.face = this.dir[s] === 1 ? 0 : Math.PI; p.state = '';
    });
    const att = this.P[side].filter((p) => !p.off && p.line === 'DEL');
    const k = att[0] || this.P[side].filter((p) => !p.off && !p.isGK).sort((a, b) => b.hx - a.hx)[0];
    k.x = PL / 2 - this.dir[side] * 0.6; k.y = PW / 2;
    if (att[1]) { att[1].x = PL / 2 - this.dir[side] * 1; att[1].y = PW / 2 + 6; }
    k.tx = k.x; k.ty = k.y; k.want = 0; k.vx = k.vy = 0; // el sacador espera junto al balón
    this.restart = { type: 'kickoff', side, taker: k };
    b.owner = k; this.phase = 'kickoff'; this.phaseT = 1.0;
  };

  MP.place = function (type, side, x, y) {
    // side = equipo que saca
    const b = this.ball; Object.assign(b, { x, y, z: 0, vx: 0, vy: 0, vz: 0, owner: null, type: null, target: null, offside: null, shotSaveTried: false });
    let taker = null;
    if (type === 'goalkick') taker = this.gk(side);
    else if (type === 'penalty') {
      taker = this.active(side).filter((p) => !p.isGK).sort((a, b) => b.a.tir + b.d.ovr - a.a.tir - a.d.ovr)[0];
    } else if (type === 'corner') {
      taker = this.active(side).filter((p) => !p.isGK).sort((a, b) => (b.a.pas - a.a.pas) + (b.line === 'DEF' ? -15 : 0) - (a.line === 'DEF' ? -15 : 0))[0];
    } else {
      taker = this.active(side).filter((p) => !p.isGK || type === 'free' && this.ax(side, x) < 0.2).sort((a, b) => U.dist(a.x, a.y, x, y) - U.dist(b.x, b.y, x, y))[0];
    }
    if (!taker) taker = this.active(side)[0];
    this.restart = { type, side, taker, x, y };
    this.phase = 'restart'; this.phaseT = type === 'penalty' ? 2.2 : type === 'corner' ? 1.6 : type === 'throw' ? 0.9 : 1.2;
    // el ejecutor se coloca junto al balón
    const og = this.oppGoalX(side);
    const ang = Math.atan2(PW / 2 - y, og - x);
    taker.x = x - Math.cos(ang) * 0.7; taker.y = y - Math.sin(ang) * 0.7; taker.vx = taker.vy = 0;
    if (type === 'throw') { taker.x = x; taker.y = y < 1 ? -0.4 : PW + 0.4; }
    taker.tx = taker.x; taker.ty = taker.y; taker.want = 0;
    if (type === 'penalty') {
      // resto de jugadores fuera del área
      this.all().forEach((p) => {
        if (p === taker || p.isGK && p.side !== side) return;
        if (this.inBox(1 - side, p.x, p.y) || U.dist(p.x, p.y, x, y) < 9.5) {
          p.x = this.wx(1 - side, 0.22 + this.R() * 0.06); p.y = PW / 2 + (this.R() - 0.5) * 30;
        }
      });
      const gk = this.gk(1 - side); if (gk) { gk.x = this.ownGoalX(1 - side) + this.dir[1 - side] * 0.3; gk.y = PW / 2; }
    }
    // los rivales a distancia reglamentaria en faltas
    if (type === 'free' || type === 'corner' || type === 'goalkick') {
      this.active(1 - side).forEach((p) => {
        const d = U.dist(p.x, p.y, x, y);
        if (d < 9.15 && !p.isGK) { const a = Math.atan2(p.y - y, p.x - x); p.x = x + Math.cos(a) * 9.4; p.y = y + Math.sin(a) * 9.4; }
      });
    }
    b.owner = taker;
  };

  // --------- bucle principal
  MP.step = function (dt) {
    dt = dt || STEP; this.realT += dt;
    if (this.phase === 'end') return;
    const b = this.ball;
    if (this.phase === 'halftime') { this.phaseT -= dt; if (this.phaseT <= 0 && !this.cfg.waitHalftime) this.startSecondHalf(); return; }
    if (this.phase === 'goal') {
      this.phaseT -= dt; this.moveAll(dt, true);
      if (this.phaseT <= 0) this.setKickoff(this.lastConceded);
      return;
    }
    // reloj
    // saque de centro de la persona: el balón no se pone en juego hasta que pulse PASE o TIRO
    this.waitingHuman = this.phase === 'kickoff' && this.restart && this.restart.side === this.human && this.human >= 0;
    if (this.waitingHuman) {
      this.thinkPositions(dt, true); this.moveAll(dt, true);
      this.ball.x = PL / 2; this.ball.y = PW / 2; this.ball.z = 0;
      if (this.phaseT > 0) { this.phaseT -= dt; this.input.btnRel = this.input.passRel = this.input.shootRel = false; return; }
      if (this.input.btnRel || this.input.passRel || this.input.shootRel) { this.input.btnRel = this.input.passRel = this.input.shootRel = false; this.waitingHuman = false; this.input.lastA = null; this.executeRestart(); }
      return;
    }
    this.t += dt * this.minPerSec * (this.phase === 'play' ? 1 : 0.35);
    if (this.half === 1 && this.t >= 45 + this.added[0] && this.phase === 'play' && this.safeToStop()) { this.endHalf(); return; }
    if (this.half === 2 && this.t >= 90 + this.added[1] && this.phase === 'play' && this.safeToStop()) { this.endMatch(); return; }

    if (this.phase === 'kickoff' || this.phase === 'restart') {
      this.phaseT -= dt;
      this.thinkPositions(dt, true);
      this.moveAll(dt, true);
      const tk = this.restart && this.restart.taker; if (tk) { b.x = this.restart.type === 'kickoff' ? PL / 2 : this.restart.x; b.y = this.restart.type === 'kickoff' ? PW / 2 : this.restart.y; b.z = 0; }
      if (this.phaseT <= 0) this.executeRestart();
      return;
    }

    // juego en curso
    if (b.owner) this.stats.possT[b.owner.side] += dt; else if (b.last) this.stats.possT[b.last.side] += dt * 0.5;
    this.chaseTimer -= dt; if (this.chaseTimer <= 0) { this.computeChasers(); this.chaseTimer = 0.1; }
    this.updateControl();
    this.thinkPositions(dt, false);
    this.ownerDecision(dt);
    this.humanAct(dt);
    this.tackles(dt);
    this.moveAll(dt, false);
    this.ballPhysics(dt);
    this.subsAI();
    // emoción (para audio)
    const ex = Math.max(0, 1 - Math.min(U.dist(b.x, b.y, 0, PW / 2), U.dist(b.x, b.y, PL, PW / 2)) / 30);
    this.excite += (ex - this.excite) * dt * 2;
  };

  MP.safeToStop = function () {
    const b = this.ball; const ax = b.x / PL;
    return (ax > 0.3 && ax < 0.7) || this.t > (this.half === 1 ? 47 + this.added[0] : 92 + this.added[1]);
  };

  MP.endHalf = function () {
    this.say('halftime', {}); this.phase = 'halftime'; this.phaseT = 2.5; this.half = 1.5;
  };
  MP.startSecondHalf = function () {
    this.half = 2; this.t = 45; this.dir = [-this.dir[0], -this.dir[1]]; // cambio de campo
    this.P.forEach((arr) => arr.forEach((p) => { p.stam = Math.min(1, p.stam + 0.08); }));
    this.say('second', {}); this.setKickoff(1 - this.firstKick);
  };
  MP.endMatch = function () {
    this.phase = 'end'; this.t = 90 + this.added[1];
    this.say('end', {});
    if (this.hooks.end) this.hooks.end(this.result(), this);
  };

  // --------- ¿quién persigue el balón suelto? (punto de interceptación más temprano por equipo)
  MP.predictBall = function (t) {
    const b = this.ball; const k = 0.9;
    if (b.z > 0.3 || b.vz > 1) {
      // en el aire: tiempo hasta caer
      const tf = (b.vz + Math.sqrt(b.vz * b.vz + 2 * GRAV * b.z)) / GRAV;
      if (t <= tf) return [b.x + b.vx * t, b.y + b.vy * t];
      const lx = b.x + b.vx * tf, ly = b.y + b.vy * tf, rt = t - tf, f = (1 - Math.exp(-k * rt)) / k;
      return [lx + b.vx * 0.55 * f, ly + b.vy * 0.55 * f];
    }
    const f = (1 - Math.exp(-k * t)) / k;
    return [b.x + b.vx * f, b.y + b.vy * f];
  };
  MP.computeChasers = function () {
    const b = this.ball;
    if (b.owner) { this.chasers = [null, null]; return; }
    for (let s = 0; s < 2; s++) {
      let best = null, bt = 99, bpt = null;
      for (let t = 0.05; t <= 2.6; t += 0.15) {
        const [px, py] = this.predictBall(t);
        if (px < -2 || px > PL + 2 || py < -2 || py > PW + 2) break;
        for (const p of this.P[s]) {
          if (p.off || p.state === 'down') continue;
          if (p.isGK && !this.inBox(s, px, py)) continue;
          const reach = U.dist(p.x, p.y, px, py) / this.speedOf(p) + 0.12;
          if (reach <= t && t < bt) { bt = t; best = p; bpt = [px, py]; }
        }
        if (best) break;
      }
      if (!best) { // nadie llega: el más cercano al punto final
        const [px, py] = this.predictBall(2.6);
        best = this.P[s].filter((p) => !p.off && !p.isGK).sort((a, c) => U.dist(a.x, a.y, px, py) - U.dist(c.x, c.y, px, py))[0];
        bpt = [U.clamp(px, 0, PL), U.clamp(py, 0, PW)];
      }
      // el receptor designado siempre persigue un pase de su equipo
      if (b.target && b.target.side === s && !b.target.off) { best = b.target; const tt = U.dist(best.x, best.y, b.x, b.y) / 14; bpt = this.predictBall(Math.min(2, tt)); }
      this.chasers[s] = best; this.chasePt[s] = bpt;
    }
  };

  // --------- jugador controlado por la persona
  MP.updateControl = function () {
    if (this.human < 0) { this.ctrl = null; return; }
    const s = this.human; const b = this.ball;
    if (b.owner && b.owner.side === s && !b.owner.isGK) { this.ctrl = b.owner; return; }
    if (b.owner && b.owner.side === s && b.owner.isGK) { this.ctrl = b.owner; return; } // el portero con el balón lo controla la persona
    if (this.input.switch) { this.input.switch = false; this.ctrl = null; this.switchLock = 0; }
    if (this.ctrl && (this.ctrl.off || this.ctrl.isGK)) this.ctrl = null;
    this.switchLock = (this.switchLock || 0) - STEP;
    // receptor de un pase propio
    if (b.target && b.target.side === s && !b.owner) { this.ctrl = b.target; return; }
    if (!this.ctrl || this.switchLock <= 0) {
      const cand = this.active(s).filter((p) => !p.isGK);
      const near = cand.sort((a, c) => U.dist(a.x, a.y, b.x, b.y) - U.dist(c.x, c.y, b.x, b.y))[0];
      if (!this.ctrl || (near !== this.ctrl && U.dist(this.ctrl.x, this.ctrl.y, b.x, b.y) > U.dist(near.x, near.y, b.x, b.y) + 4)) { this.ctrl = near; this.switchLock = 0.6; }
    }
  };

  // --------- posicionamiento sin balón
  MP.thinkPositions = function (dt, setPiece) {
    const b = this.ball;
    const owner = b.owner;
    const rs = this.restart;
    for (let s = 0; s < 2; s++) {
      const tac = this.tac[s];
      const inPos = owner ? owner.side === s : (b.last ? b.last.side === s : false);
      const bax = this.ax(s, b.x);
      const styleOff = tac.style === 'ofensiva' ? 0.04 : tac.style === 'defensiva' ? -0.06 : 0;
      const shift = inPos ? (bax - 0.45) * 0.55 + 0.1 + styleOff : (bax - 0.5) * 0.45 - 0.05 + styleOff;
      const bny = this.dir[s] === 1 ? b.y / PW : 1 - b.y / PW;
      // línea defensiva rival (para no quedar en fuera de juego)
      const oppDefs = this.active(1 - s).map((p) => this.ax(s, p.x)).sort((a, c) => c - a);
      const offLine = Math.max(oppDefs[1] !== undefined ? oppDefs[1] : 0.5, 0.5, bax);
      const markers = new Set();
      for (const p of this.P[s]) {
        if (p.off) continue;
        p.think -= dt;
        if (p === this.ctrl && !setPiece && p.humanMove) continue;
        if (owner === p) continue;
        if (p.isGK) { this.gkPosition(p); continue; }
        if (!setPiece && this.chasers[s] === p && !owner) { const c = this.chasePt[s]; p.tx = c[0]; p.ty = c[1]; p.want = 1; continue; }
        // posición zonal
        let ax = p.hx + shift * (p.line === 'DEF' ? 0.85 : p.line === 'MED' ? 1 : 0.8);
        if (p.line === 'DEF') ax = U.clamp(ax, 0.07, inPos ? 0.6 : 0.42);
        if (p.line === 'MED') ax = U.clamp(ax, 0.15, 0.8);
        if (p.line === 'DEL') ax = U.clamp(ax, 0.3, 0.92);
        if (inPos) ax = Math.min(ax, offLine - 0.01);
        let ny = inPos ? 0.5 + (p.hy - 0.5) * 1.12 : p.hy + (bny - p.hy) * 0.33;
        ny = U.clamp(ny, 0.04, 0.96);
        let tx = this.wx(s, ax), ty = this.wy(s, ny);
        let want = 0.55;
        if (inPos && owner && !setPiece) {
          // desmarques al espacio
          if (p.runT > 0) { p.runT -= dt; tx = p.runX; ty = p.runY; want = 1; }
          else if ((p.line === 'DEL' || p.role === 'ED' || p.role === 'EI' || p.role === 'MCO') && p.think <= 0 && this.R() < 0.18 && this.ax(s, owner.x) > 0.35) {
            const rx = this.wx(s, Math.min(0.97, offLine + 0.05 + this.R() * 0.12));
            p.runX = rx; p.runY = U.clamp(p.y + (this.R() - 0.5) * 14, 4, PW - 4); p.runT = 1.4;
          }
          // apoyo cercano al poseedor
          const dOwn = U.dist(p.x, p.y, owner.x, owner.y);
          if (p.runT <= 0 && dOwn < 22 && p.line !== 'DEF' && p.think <= 0) {
            const ang = Math.atan2(p.y - owner.y, p.x - owner.x);
            tx = owner.x + Math.cos(ang) * 11 + this.dir[s] * 3; ty = owner.y + Math.sin(ang) * 11;
            p.supX = tx; p.supY = ty; p.supT = 0.8;
          } else if (p.supT > 0) { p.supT -= dt; tx = p.supX; ty = p.supY; }
        } else if (!inPos && !setPiece) {
          // presión al poseedor y marcajes
          const carrier = owner;
          if (carrier) {
            const dC = U.dist(p.x, p.y, carrier.x, carrier.y);
            if (p === this.presser(s, carrier, 0)) {
              const og = this.ownGoalX(s);
              const a = Math.atan2(PW / 2 - carrier.y, og - carrier.x);
              tx = carrier.x + Math.cos(a) * 0.9; ty = carrier.y + Math.sin(a) * 0.9; want = 1;
            } else if ((tac.press === 'alta' || this.ax(s, carrier.x) < 0.35) && p === this.presser(s, carrier, 1) && dC < 18) {
              const og = this.ownGoalX(s);
              const a = Math.atan2(PW / 2 - carrier.y, og - carrier.x);
              tx = carrier.x + Math.cos(a) * 4; ty = carrier.y + Math.sin(a) * 4 + (p.y > carrier.y ? 2 : -2); want = 0.9;
            } else if (p.line !== 'DEL') {
              // marcaje: rival más cercano a mi zona, por el lado de mi portería
              let best = null, bd = 11;
              for (const o of this.P[1 - s]) {
                if (o.off || o.isGK || o === carrier || markers.has(o)) continue;
                const d = U.dist(o.x, o.y, tx, ty);
                if (d < bd) { bd = d; best = o; }
              }
              if (best) {
                markers.add(best);
                const og = this.ownGoalX(s);
                const a = Math.atan2(PW / 2 - best.y, og - best.x);
                tx = best.x + Math.cos(a) * 1.6; ty = best.y + Math.sin(a) * 1.6; want = 0.75;
              }
            }
          }
        }
        if (setPiece && rs) { const r = this.setPiecePos(p, rs, tx, ty); tx = r[0]; ty = r[1]; want = 0.8; }
        if (p.think <= 0) p.think = 0.15 + this.R() * 0.2;
        p.tx = U.clamp(tx, 0.5, PL - 0.5); p.ty = U.clamp(ty, 0.5, PW - 0.5); p.want = want;
      }
    }
  };

  MP.presser = function (s, carrier, rank) {
    const key = s + ':' + rank;
    if (!this._pressCache || this._pressCache.t !== this.realT) this._pressCache = { t: this.realT };
    if (this._pressCache[key] !== undefined) return this._pressCache[key];
    const c = this.active(s).filter((p) => !p.isGK && p !== this.ctrl).sort((a, b) => U.dist(a.x, a.y, carrier.x, carrier.y) - U.dist(b.x, b.y, carrier.x, carrier.y));
    this._pressCache[key] = c[rank] || null;
    return this._pressCache[key];
  };

  MP.setPiecePos = function (p, rs, tx, ty) {
    if (p === rs.taker) return [p.x, p.y];
    const att = p.side === rs.side;
    if (rs.type === 'corner') {
      const gx = this.oppGoalX(rs.side);
      if (att && (p.line !== 'DEF' || p.role === 'DFC') && p.hx > 0.15) {
        const k = (U.hash(p.d.name) % 7);
        return [gx - this.dir[rs.side] * (5 + k * 1.4), PW / 2 + (k - 3) * 2.6];
      }
      if (!att) {
        const k = (U.hash(p.d.name) % 8);
        return [gx - this.dir[rs.side] * (3 + k * 1.3), PW / 2 + (k - 4) * 2.2];
      }
    }
    if (rs.type === 'penalty') {
      if (p.isGK) return [p.x, p.y];
      const bx = this.ownGoalX(1 - rs.side) + this.dir[1 - rs.side] * 20;
      return [bx + (this.R() - 0.5) * 2, p.y];
    }
    return [tx, ty];
  };

  MP.gkPosition = function (p) {
    const s = p.side; const b = this.ball; const gx = this.ownGoalX(s);
    const d = U.dist(b.x, b.y, gx, PW / 2);
    // sale a por el balón suelto dentro del área
    if (!b.owner && this.inBox(s, b.x, b.y) && this.chasers[s] === p && b.z < 2.5) {
      const c = this.chasePt[s]; p.tx = c[0]; p.ty = c[1]; p.want = 1; return;
    }
    const off = U.clamp(d * 0.12, 0.6, 5.5);
    const a = Math.atan2(b.y - PW / 2, b.x - gx);
    p.tx = gx + Math.cos(a) * off; p.ty = U.clamp(PW / 2 + Math.sin(a) * off, GY1 - 0.6, GY2 + 0.6);
    p.want = d < 25 ? 0.9 : 0.5;
  };

  // --------- decisiones del poseedor
  MP.threat = function (side, x, y) {
    const d = U.dist(x, y, this.oppGoalX(side), PW / 2);
    return 0.015 + 0.55 * Math.exp(-d / 13);
  };
  MP.xg = function (side, x, y) {
    const gx = this.oppGoalX(side);
    const d = U.dist(x, y, gx, PW / 2);
    const a1 = Math.atan2(GY1 - y, gx - x), a2 = Math.atan2(GY2 - y, gx - x);
    let ang = Math.abs(a2 - a1); if (ang > Math.PI) ang = 2 * Math.PI - ang;
    return U.clamp(1.25 * ang * Math.exp(-d / 30) - 0.01, 0, 0.75);
  };
  MP.pressureOn = function (p) {
    let m = 99;
    for (const o of this.P[1 - p.side]) { if (o.off) continue; const d = U.dist(o.x, o.y, p.x, p.y); if (d < m) m = d; }
    return m;
  };
  MP.laneOpen = function (side, x1, y1, x2, y2) {
    // distancia mínima de un rival a la línea de pase
    let m = 99; const dx = x2 - x1, dy = y2 - y1; const L2 = dx * dx + dy * dy || 1;
    for (const o of this.P[1 - side]) {
      if (o.off) continue;
      let t = ((o.x - x1) * dx + (o.y - y1) * dy) / L2; if (t < 0.05 || t > 1.05) continue;
      const px = x1 + dx * t, py = y1 + dy * t; const d = U.dist(o.x, o.y, px, py) - (o.isGK ? 1.2 : 0);
      if (d < m) m = d;
    }
    return m;
  };
  MP.isOffside = function (r) {
    const s = r.side; const rax = this.ax(s, r.x);
    if (rax <= 0.5) return false;
    const b = this.ball; if (rax <= this.ax(s, b.x)) return false;
    const defs = this.active(1 - s).map((p) => this.ax(s, p.x)).sort((a, c) => c - a);
    return rax > (defs[1] !== undefined ? defs[1] : 1) + 0.004;
  };

  MP.bestPass = function (p, dirBias) {
    const s = p.side; let best = null, bv = -1;
    const pas = p.a.pas;
    for (const r of this.P[s]) {
      if (r === p || r.off) continue;
      const d = U.dist(p.x, p.y, r.x, r.y); if (d < 4 || d > 48) continue;
      if (r.isGK && this.ax(s, p.x) > 0.3) continue;
      // anticipar el movimiento del receptor
      const lead = Math.min(1.2, d / 18);
      const tx = U.clamp(r.x + r.vx * lead, 1, PL - 1), ty = U.clamp(r.y + r.vy * lead, 1, PW - 1);
      const lane = this.laneOpen(s, p.x, p.y, tx, ty);
      const space = this.pressureOn({ x: tx, y: ty, side: s });
      const acc = 1 - (d / 60) * (1.3 - pas / 100);
      const pOk = U.clamp(1 / (1 + Math.exp(-(lane - (d > 28 ? 1.2 : 1.9)) / 0.9)) * (0.55 + 0.45 * Math.min(1, space / 4)) * acc, 0, 1);
      let v = Math.pow(this.threat(s, tx, ty), 0.6) * Math.pow(pOk, 1.6);
      if (this.isOffside(r)) v *= 0.3;
      if (dirBias) { const a = Math.atan2(ty - p.y, tx - p.x); const da = Math.abs(Math.atan2(Math.sin(a - dirBias), Math.cos(a - dirBias))); v *= Math.exp(-da * 2.2) * 3; }
      if (this.tac[s].passing === 'corto' && d > 25) v *= 0.7;
      if (this.tac[s].passing === 'largo' && d > 25) v *= 1.25;
      if (v > bv) { bv = v; best = { r, tx, ty, d, v, pOk, loft: d > 30 || lane < 1.4 && d > 16 }; }
    }
    return best;
  };

  MP.ownerDecision = function (dt) {
    const b = this.ball; const p = b.owner;
    if (!p || p === this.ctrl) return;
    const s = p.side;
    p.think -= dt;
    // conducción hacia la portería rival evitando rivales
    const gx = this.oppGoalX(s);
    const press = this.pressureOn(p);
    if (p.think > 0 && press > 1.6) { this.dribbleTarget(p); return; }
    p.think = press < 3 ? 0.12 + this.R() * 0.12 : 0.28 + this.R() * 0.25;
    const noise = this.human >= 0 && s !== this.human ? (1.08 - this.diff) * 0.5 : 0.08;
    if (p.isGK) { // el portero saca rápido
      if ((p.holdT = (p.holdT || 0) + 0.3) < 1.0) { p.tx = p.x; p.ty = p.y; return; }
      p.holdT = 0;
      const bp = this.bestPass(p);
      if (bp && bp.pOk > 0.55 && this.R() < 0.6) this.pass(p, bp.r, bp.tx, bp.ty, bp.loft);
      else this.longBall(p);
      return;
    }
    const xg = this.xg(s, p.x, p.y) * (0.6 + p.a.tir / 160);
    const bp = this.bestPass(p);
    const here = this.threat(s, p.x, p.y);
    // espacio por delante para conducir
    const fx = p.x + this.dir[s] * 6, fy = p.y + (PW / 2 - p.y) * 0.15;
    const spaceAhead = this.pressureOn({ x: fx, y: fy, side: s });
    const dribOk = U.clamp((spaceAhead - 1.5) / 4, 0, 1) * (0.55 + p.a.reg / 220);
    const uDrib = this.threat(s, fx, fy) * dribOk * 0.95 + (press > 4 ? here * 0.4 : 0);
    const uShoot = xg * 2.6 * (press < 1.5 ? 1.1 : 1) * this.goalScale;
    const uPass = bp ? this.threat(s, bp.tx, bp.ty) * bp.pOk * 1.08 : 0;
    const r = () => 1 + (this.R() - 0.5) * noise * 2;
    const ax = this.ax(s, p.x);
    // centro desde la banda
    if (ax > 0.82 && Math.abs(p.y - PW / 2) > 13 && this.R() < 0.55) {
      const tgt = this.active(s).filter((q) => q !== p && this.inBox(1 - s, q.x, q.y)).sort((a, c) => (c.a.agr + c.d.ovr) - (a.a.agr + a.d.ovr))[0];
      if (tgt) { this.cross(p, tgt); return; }
    }
    // despeje en campo propio bajo presión
    if (ax < 0.25 && press < 2 && (!bp || bp.pOk < 0.45)) { this.longBall(p); return; }
    const options = [['shoot', uShoot * r()], ['pass', uPass * r()], ['drib', uDrib * r()]];
    if (U.dist(p.x, p.y, gx, PW / 2) > 32) options[0][1] = 0;
    options.sort((a, c) => c[1] - a[1]);
    const choice = options[0][0];
    if (choice === 'shoot') this.shoot(p);
    else if (choice === 'pass' && bp) this.pass(p, bp.r, bp.tx, bp.ty, bp.loft);
    else this.dribbleTarget(p);
  };

  MP.dribbleTarget = function (p) {
    const s = p.side; const gx = this.oppGoalX(s);
    let tx = p.x + this.dir[s] * 8, ty = p.y + (PW / 2 - p.y) * (this.ax(s, p.x) > 0.7 ? 0.35 : 0.1);
    // esquivar al rival más cercano
    let near = null, nd = 99;
    for (const o of this.P[1 - s]) { if (o.off) continue; const d = U.dist(o.x, o.y, p.x, p.y); if (d < nd) { nd = d; near = o; } }
    if (near && nd < 5) {
      const side = (near.y > p.y ? -1 : 1);
      ty += side * (6 - nd) * 1.6;
      if (this.ax(s, near.x) > this.ax(s, p.x)) tx -= this.dir[s] * (5 - nd) * 0.5;
    }
    if (Math.abs(gx - p.x) < 12) ty = PW / 2 + (p.y - PW / 2) * 0.6;
    p.tx = U.clamp(tx, 1, PL - 1); p.ty = U.clamp(ty, 1, PW - 1); p.want = 0.95;
  };

  // --------- acciones con balón
  MP.kick = function (p, vx, vy, vz, type, target) {
    const b = this.ball;
    b.owner = null; b.vx = vx; b.vy = vy; b.vz = vz; b.z = Math.max(b.z, 0.05);
    b.last = p; b.kickBy = p; b.kickCd = 0.22; b.type = type; b.target = target || null; b.shotSaveTried = false; b.otCounted = false; b.magnet = 0; b.curveT = 0;
    b.offside = target && this.isOffside(target) ? target : null;
    b.shotFrom = type === 'shot' ? [p.x, p.y] : null;
    p.kickCd = 0.3; p.state = 'kick'; p.stateT = 0.18;
    if (this.hooks.sound) this.hooks.sound(type === 'shot' ? 'shot' : 'kick', this);
    this.computeChasers();
  };

  MP.pass = function (p, r, tx, ty, loft) {
    const pas = p.a.pas; const press = this.pressureOn(p);
    const d = U.dist(p.x, p.y, tx, ty);
    // pases más precisos: el error depende sobre todo del pase del jugador y de la presión
    const err = (0.012 + U.clamp(1 - pas / 100, 0, 1) * 0.045 + (press < 1.5 ? 0.025 : 0)) * this.R.normal();
    const a = Math.atan2(ty - p.y, tx - p.x) + err;
    const dd = d * (1 + this.R.normal() * (0.02 + U.clamp(1 - pas / 100, 0, 1) * 0.04));
    p.st.pass++;
    // "imán" del receptor: más fuerte cuanto mejor pasa el que da el pase y mejor controla el que recibe
    const magnet = r ? U.clamp((p.a.pas + r.a.cal) / 200, 0.3, 1.25) : 0;
    if (loft) {
      const T = 0.75 + dd / 24;
      const v = dd / T; this.kick(p, Math.cos(a) * v, Math.sin(a) * v, GRAV * T / 2, 'pass', r);
    } else {
      const v = U.clamp(dd * 1.05 + 5, 8, 28);
      this.kick(p, Math.cos(a) * v, Math.sin(a) * v, 0, 'pass', r);
    }
    this.ball.magnet = magnet;
    p.face = a;
  };

  MP.cross = function (p, r) {
    const s = p.side; const gx = this.oppGoalX(s);
    const tx = gx - this.dir[s] * (6 + this.R() * 6), ty = PW / 2 + (r.y - PW / 2) * 0.5 + (this.R() - 0.5) * 6;
    r.runX = tx; r.runY = ty; r.runT = 1.6;
    this.pass(p, r, tx, ty, true);
    this.ball.type = 'cross';
  };

  MP.longBall = function (p) {
    const s = p.side;
    const fw = this.active(s).filter((q) => q.line !== 'DEF' && !q.isGK).sort((a, c) => this.ax(s, c.x) - this.ax(s, a.x));
    const r = fw[Math.floor(this.R() * Math.min(3, fw.length))];
    if (r) this.pass(p, r, r.x + this.dir[s] * 4, r.y, true);
    else { const v = 22; this.kick(p, this.dir[s] * v * 0.8, (this.R() - 0.5) * 10, 8, 'clear', null); }
    this.ball.type = 'clear';
  };

  MP.shoot = function (p, aimY, power) {
    const s = p.side; const gx = this.oppGoalX(s);
    const d = U.dist(p.x, p.y, gx, PW / 2);
    const tir = p.a.tir * (s === this.human || this.human < 0 ? 1 : this.diff);
    const gk = this.gk(1 - s);
    let ty;
    if (aimY !== undefined && aimY !== null) ty = PW / 2 + aimY * (GOAL_W / 2 - 0.3);
    else { const far = gk && gk.y < PW / 2 ? 1 : -1; ty = PW / 2 + far * (1.6 + this.R() * 1.8); }
    const press = this.pressureOn(p);
    const sigma = (0.9 + d * 0.085) * (1.45 - tir / 100) * (press < 1.3 ? 1.35 : 1) * (power > 0.9 ? 1.25 : 1);
    ty += this.R.normal() * sigma;
    const speed = (19 + tir / 100 * 9) * (power ? 0.75 + power * 0.4 : 1) + this.R() * 2;
    const a = Math.atan2(ty - p.y, gx - p.x);
    const T = d / speed;
    const h = 0.3 + this.R() * 1.6 + Math.abs(this.R.normal()) * sigma * 0.35;
    const vz = (h + 0.5 * GRAV * T * T) / T;
    p.st.shots++; this.stats.shots[s]++;
    this.kick(p, Math.cos(a) * speed, Math.sin(a) * speed, Math.min(vz, 9), 'shot', null);
    p.face = a;
  };

  // --------- control humano
  // Control de la persona al estilo PC Fútbol 2.0:
  // - el jugador sigue corriendo en la última dirección indicada (carrera automática);
  // - un solo botón: toque corto = pase, mantener = tiro (más potencia cuanto más tiempo);
  // - sin balón: toque = entrada (o cambio de jugador si estás lejos), mantener = segada más larga;
  // - tras tirar, empujar hacia un lado da efecto al balón (ver ballPhysics).
  MP.humanAct = function (dt) {
    if (this.human < 0 || !this.ctrl) return;
    const p = this.ctrl; const I = this.input; const b = this.ball;
    const mag = Math.hypot(I.mx, I.my);
    const hasBall = b.owner === p;
    if (mag > 0.15) { I.lastA = Math.atan2(I.my, I.mx); I.idleT = 0; } else I.idleT += dt || 0;
    if (hasBall && p.isGK) { this.humanKeeper(p, dt, mag); return; }
    this.gkAim = null;
    // al recibir el balón sin tocar el mando, arranca hacia la portería rival
    if (hasBall && this._lastHumanOwner !== p) { if (mag <= 0.15) I.lastA = this.dir[p.side] === 1 ? 0 : Math.PI; }
    this._lastHumanOwner = hasBall ? p : null;
    if (p.state === 'slide') { p.humanMove = true; }
    else if (p.autoSlide && mag <= 0.15 && !hasBall) {
      // corre hacia el rival tocado y le hace la segada al llegar
      const q = p.autoSlide; p.autoSlideT -= dt || 0;
      if (q.off || p.autoSlideT <= 0 || this.ball.owner && this.ball.owner.side === p.side) p.autoSlide = null;
      else {
        p.tx = q.x + q.vx * 0.4; p.ty = q.y + q.vy * 0.4; p.want = 1; p.humanMove = true;
        if (U.dist(p.x, p.y, q.x, q.y) < 4.5 && p.tackleCd <= 0) this.startSlide(p, this.leadAngle(p, q, 0.6), 0.6);
      }
    }
    else {
      if (mag > 0.15) p.autoSlide = null;
      let runA = null;
      if (mag > 0.15) runA = I.lastA;
      else if (I.lastA !== null && (hasBall || I.idleT < 0.5)) runA = I.lastA;
      if (runA !== null) {
        let tx = p.x + Math.cos(runA) * 5, ty = p.y + Math.sin(runA) * 5;
        // la carrera automática se detiene antes de salirse del campo
        if (mag <= 0.15 && (tx < 1 || tx > PL - 1 || ty < 1 || ty > PW - 1)) { tx = p.x; ty = p.y; I.lastA = null; p.want = 0; }
        else p.want = mag > 0.15 ? Math.min(1, mag * 1.25) : (hasBall ? 0.85 : 0.7);
        p.tx = U.clamp(tx, 0.6, PL - 0.6); p.ty = U.clamp(ty, 0.6, PW - 0.6); p.humanMove = true;
      } else p.humanMove = false; // sin órdenes: la IA lo coloca en su sitio
    }
    if (!I.btnRel) return;
    I.btnRel = false;
    const held = I.btnHeldT || 0; const TAP = 0.22;
    let aimA = I.lastA !== null && mag > 0.15 ? I.lastA : (I.lastA !== null ? I.lastA : p.face);
    if (hasBall) {
      if (held < TAP) {
        const bp = this.bestPass(p, aimA);
        if (bp) this.pass(p, bp.r, bp.tx, bp.ty, bp.loft);
        else { const v = 14; this.kick(p, Math.cos(aimA) * v, Math.sin(aimA) * v, 0, 'pass', null); }
      } else {
        const power = U.clamp((held - TAP) / 0.55, 0.2, 1);
        const gx = this.oppGoalX(p.side);
        if (Math.abs(gx - p.x) < 40) {
          const lat = this.dir[p.side] === 1 ? I.my : -I.my;
          const aim = mag > 0.15 ? U.clamp(lat / Math.max(0.2, mag), -1, 1) : 0;
          this.shoot(p, aim, power);
        } else { const v = 18 + 14 * power; this.kick(p, Math.cos(aimA) * v, Math.sin(aimA) * v, 4 + 6 * power, 'clear', null); }
        this.ball.curveT = 0.9; // ventana para dar efecto
      }
      I.lastA = null;
    } else {
      const c = b.owner;
      const dC = c && c.side !== p.side ? U.dist(p.x, p.y, c.x, c.y) : 99;
      if (c && c.side !== p.side && dC < 7 && mag <= 0.15) aimA = Math.atan2(c.y - p.y, c.x - p.x);
      if (p.tackleCd > 0) return;
      if (held < TAP) {
        if (dC < 2.4) this.tryTackle(p, c, true, false);
        else this.input.switch = true; // lejos del balón: cambia al compañero más cercano
      } else {
        // segada: más larga cuanto más tiempo se mantiene el botón
        const len = U.clamp((held - TAP) / 0.5, 0, 1);
        if (c && c.side !== p.side && dC < 9 && mag <= 0.15) aimA = this.leadAngle(p, c, len);
        this.startSlide(p, aimA, len);
      }
    }
  };

  // Portero de la persona con el balón en las manos (blocaje o saque de puerta):
  // se mueve dentro de su área, apunta con el mando y saca donde quiera.
  // Toque = pase en esa dirección · mantener = despeje largo (más tiempo, más lejos).
  MP.humanKeeper = function (p, dt, mag) {
    const I = this.input; const s = p.side;
    if (this._lastHumanOwner !== p) { this.gkAim = this.dir[s] === 1 ? 0 : Math.PI; p.gkHold = 0; I.lastA = null; }
    this._lastHumanOwner = p;
    p.gkHold = (p.gkHold || 0) + (dt || 0);
    if (mag > 0.15) this.gkAim = Math.atan2(I.my, I.mx);
    // movimiento lento dentro del área propia
    const gx = this.ownGoalX(s);
    if (mag > 0.15) {
      p.tx = U.clamp(p.x + Math.cos(this.gkAim) * 3, Math.min(gx, gx + this.dir[s] * (BOX_D - 1)), Math.max(gx, gx + this.dir[s] * (BOX_D - 1)));
      p.ty = U.clamp(p.y + Math.sin(this.gkAim) * 3, PW / 2 - BOX_W / 2 + 1, PW / 2 + BOX_W / 2 - 1); p.want = 0.45 * Math.min(1, mag);
    } else { p.tx = p.x; p.ty = p.y; p.want = 0; }
    p.humanMove = true; p.face = this.gkAim;
    const a = this.gkAim;
    // si la persona no saca en 8 segundos, el portero saca solo
    if (!I.btnRel && p.gkHold > 8) { this.gkAim = null; this.longBall(p); return; }
    if (!I.btnRel) return;
    I.btnRel = false; const held = I.btnHeldT || 0;
    this.gkAim = null;
    if (held < 0.22) {
      const bp = this.bestPass(p, a);
      if (bp && Math.abs(Math.atan2(Math.sin(Math.atan2(bp.ty - p.y, bp.tx - p.x) - a), Math.cos(Math.atan2(bp.ty - p.y, bp.tx - p.x) - a))) < 0.6) this.pass(p, bp.r, bp.tx, bp.ty, bp.loft);
      else { const v = 16; this.kick(p, Math.cos(a) * v, Math.sin(a) * v, 0, 'pass', null); }
    } else {
      const power = U.clamp((held - 0.22) / 0.55, 0, 1);
      const dist = 25 + 40 * power; const T = 0.9 + dist / 26; const v = dist / T;
      this.kick(p, Math.cos(a) * v, Math.sin(a) * v, GRAV * T / 2, 'clear', null);
      this.ball.curveT = 0.6;
    }
  };

  // Ángulo hacia donde estará el rival cuando llegue la segada
  MP.leadAngle = function (p, c, len) {
    const sp = this.speedOf(p) + 3 + len * 3; const t = U.clamp(U.dist(p.x, p.y, c.x, c.y) / sp, 0, 0.6);
    return Math.atan2(c.y + c.vy * t - p.y, c.x + c.vx * t - p.x);
  };
  // Segada: len 0..1 (más larga y más fuerte cuanto más se mantiene el botón)
  MP.startSlide = function (p, a, len) {
    const sp = this.speedOf(p) + 3 + len * 3; // incluso la segada corta alcanza unos 4-5 m
    p.state = 'slide'; p.stateT = 0.45 + len * 0.4; p.slideDone = false; p.slideLen = len; p.tackleCd = 1.1;
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.face = a; p.autoSlide = null;
    if (this.hooks.sound) this.hooks.sound('kick', this);
  };

  // --------- toques en la pantalla
  // Tocar a un compañero: si tu equipo tiene el balón, se lo pasas; si no, pasas a controlarlo.
  MP.tapPlayer = function (q) {
    if (this.human < 0 || !q || q.off || this.phase !== 'play') return false;
    const s = this.human; const b = this.ball; const own = b.owner;
    if (q.side === s) {
      if (own && own.side === s && own !== q && own === this.ctrl) {
        const d = U.dist(own.x, own.y, q.x, q.y); const lead = Math.min(1, d / 20);
        const tx = U.clamp(q.x + q.vx * lead, 1, PL - 1), ty = U.clamp(q.y + q.vy * lead, 1, PW - 1);
        const lane = this.laneOpen(s, own.x, own.y, tx, ty);
        this.pass(own, q, tx, ty, d > 30 || (lane < 1.4 && d > 12));
        this.input.lastA = null; this.gkAim = null; this.tapMark = { x: q.x, y: q.y, t: 0.6, c: '#9dff7a' };
        return true;
      }
      if (!own || own.side !== s) { if (!q.isGK) { this.ctrl = q; this.switchLock = 1; this.tapMark = { x: q.x, y: q.y, t: 0.5, c: '#ffe14d' }; } return true; }
      return false;
    }
    // Tocar a un rival: el defensor más cercano va a por él con una segada
    const defs = this.active(s).filter((p) => !p.isGK && p.state !== 'down');
    if (!defs.length) return false;
    defs.sort((a, c) => U.dist(a.x, a.y, q.x, q.y) - U.dist(c.x, c.y, q.x, q.y));
    const d = defs[0]; this.ctrl = d; this.switchLock = 1.2; this.input.lastA = null;
    this.tapMark = { x: q.x, y: q.y, t: 0.7, c: '#ff5a4f' };
    if (d.tackleCd > 0 && d.state === 'slide') return true;
    if (U.dist(d.x, d.y, q.x, q.y) < 5) this.startSlide(d, this.leadAngle(d, q, 0.6), 0.6);
    else { d.autoSlide = q; d.autoSlideT = 3; }
    return true;
  };

  // --------- entradas, faltas y tarjetas
  MP.tackles = function (dt) {
    const b = this.ball; const c = b.owner;
    this.all().forEach((p) => { p.tackleCd -= dt; p.kickCd -= dt; });
    if (!c) return;
    if (c.isGK && this.inBox(c.side, c.x, c.y)) return; // nadie puede entrar al portero con el balón en las manos
    const hc = this.ctrl;
    if (hc && hc.side !== c.side && hc.state === 'slide' && !hc.slideDone && U.dist(hc.x, hc.y, c.x, c.y) < 2.1) { hc.slideDone = true; this.tryTackle(hc, c, true, true); if (b.owner !== c) return; }
    for (const p of this.P[1 - c.side]) {
      if (p.off || p.isGK || p === this.ctrl || p.tackleCd > 0) continue;
      const d = U.dist(p.x, p.y, c.x, c.y);
      if (d < 1.35) { this.tryTackle(p, c, false); if (b.owner !== c) return; }
    }
  };

  MP.tryTackle = function (p, c, human, slide) {
    const b = this.ball; p.tackleCd = 0.9 + this.R() * 0.5; p.st.tackles++;
    const diffB = c.side !== this.human && this.human >= 0 ? (this.diff - 1) * 40 : (p.side !== this.human && this.human >= 0 ? (this.diff - 1) * 40 : 0);
    const def = p.a.dfn + (p.side === this.human ? 0 : diffB), drb = c.a.reg + (c.side === this.human ? 0 : diffB);
    // entrada por detrás
    const behind = Math.cos(Math.atan2(p.y - c.y, p.x - c.x) - c.face) < -0.55;
    let pWin, pFoul, sev = 0;
    if (slide) {
      // segada: muy eficaz para robar; si es fuerte (botón mantenido) o por detrás, más riesgo de falta y tarjeta
      const len = p.slideLen || 0.5;
      sev = U.clamp(len * 0.7 + (behind ? 0.45 : 0), 0, 1);
      pWin = U.clamp(0.72 + (def - drb) / 220 + (human ? 0.06 : 0), 0.5, 0.93);
      pFoul = 0.04 + len * 0.1 + (behind ? 0.16 : 0) + p.a.agr / 1500;
    } else {
      pWin = U.clamp(0.36 + (def - drb) / 140 + (human ? 0.08 : 0), 0.12, 0.85);
      pFoul = 0.11 + p.a.agr / 650 + (behind ? 0.1 : 0) + (human ? 0.04 : 0);
      p.state = 'slide'; p.stateT = 0.35;
    }
    const r = this.R();
    if (r < pFoul) { this.foul(p, c, behind, sev); return; }
    if (r < pFoul + pWin) {
      // balón recuperado o suelto
      if (this.R() < (slide ? 0.68 : 0.55)) { b.owner = p; b.last = p; p.st.touch++; this.say('steal', { pid: p.d.id, side: p.side }); if (slide) { p.vx *= 0.4; p.vy *= 0.4; p.state = ''; p.stateT = 0; } }
      else if (slide) { // el balón sale despedido hacia un lado, lejos del rival caído
        const side = this.R() < 0.5 ? 1 : -1; const a = p.face + side * (0.9 + this.R() * 0.5);
        this.kick(p, Math.cos(a) * 6 + p.vx * 0.5, Math.sin(a) * 6 + p.vy * 0.5, 0, 'loose', null); b.kickCd = 0.05;
      } else { const a = this.R() * Math.PI * 2; this.kick(p, Math.cos(a) * 6, Math.sin(a) * 6, 0, 'loose', null); }
      c.state = 'stumble'; c.stateT = slide ? 0.9 : 0.4;
    }
  };

  MP.foul = function (p, victim, hard, sev) {
    sev = sev || 0; // gravedad de una segada (0 suave … 1 muy dura)
    const s = victim.side; this.stats.fouls[p.side]++;
    victim.state = 'down'; victim.stateT = 1.2;
    const inBox = this.inBox(p.side, victim.x, victim.y);
    let card = null;
    const rc = this.R();
    const pYel = 0.2 + p.a.agr / 400 + (hard ? 0.12 : 0) + sev * 0.35;
    if (rc < 0.012 + (hard ? 0.02 : 0) + sev * sev * 0.12) card = 'red';
    else if (rc < pYel) card = p.yel ? 'red2' : 'yellow';
    this.say('foul', { pid: p.d.id, side: p.side, victim: victim.d.id, sev });
    if (card === 'yellow') { p.yel = 1; this.events.push({ type: 'yellow', side: p.side, min: this.minute(), pid: p.d.id }); this.say('yellow', { pid: p.d.id, side: p.side }); }
    if (card === 'red' || card === 'red2') {
      if (card === 'red2') this.events.push({ type: 'yellow', side: p.side, min: this.minute(), pid: p.d.id });
      this.events.push({ type: 'red', side: p.side, min: this.minute(), pid: p.d.id, second: card === 'red2' });
      this.say('red', { pid: p.d.id, side: p.side }); this.sendOff(p);
    }
    if (this.R() < 0.022 + sev * 0.03) {
      const weeks = this.R.weighted([1, 1, 2, 2, 3, 4, 6, 10], () => 1);
      this.events.push({ type: 'injury', side: s, min: this.minute(), pid: victim.d.id, weeks });
      this.say('injury', { pid: victim.d.id, side: s });
      victim.injured = true;
    }
    if (this.hooks.sound) this.hooks.sound('whistle', this);
    if (inBox) { this.say('penalty', { side: s }); this.place('penalty', s, this.oppGoalX(s) - this.dir[s] * 11, PW / 2); }
    else this.place('free', s, U.clamp(victim.x, 1, PL - 1), U.clamp(victim.y, 1, PW - 1));
  };

  MP.sendOff = function (p) {
    p.off = true; p.x = -20; p.y = -20;
    if (this.ball.owner === p) this.ball.owner = null;
    if (this.ctrl === p) this.ctrl = null;
    if (p.isGK) { // un jugador de campo pasa a la portería
      const cand = this.active(p.side).filter((q) => !q.isGK).sort((a, b) => a.d.ovr - b.d.ovr)[0];
      if (cand) { cand.isGK = true; cand.role = 'POR'; cand.line = 'POR'; cand.hx = 0.04; cand.hy = 0.5; }
    }
  };

  // --------- sustituciones automáticas
  MP.subsAI = function () {
    if (this.t < 58 || ((this.t * 4) | 0) % 7 !== 0) return;
    for (let s = 0; s < 2; s++) {
      if (s === this.human || (this.cfg.manualSubs && this.cfg.manualSubs[s])) continue;
      if (this.subsLeft[s] <= 0) continue;
      if (this._lastSub && this._lastSub[s] && this.t - this._lastSub[s] < 7) continue;
      const tired = this.active(s).filter((p) => !p.isGK && (p.stam < 0.55 || p.injured)).sort((a, b) => a.stam - b.stam)[0];
      if (tired && this.R() < 0.5) this.substitute(s, tired, null);
    }
  };

  MP.benchAvail = function (s) {
    const used = new Set(this.P[s].map((p) => p.d.id).concat(this.subsIn[s]).concat(this.subbedOut ? this.subbedOut[s] || [] : []));
    return (this.L[s].bench || []).filter((id) => !used.has(id)).map((id) => this.w.players[id]).filter(Boolean);
  };

  MP.substitute = function (s, out, inId) {
    if (this.subsLeft[s] <= 0 || out.off) return false;
    const bench = this.benchAvail(s);
    let inP = inId !== null && inId !== undefined ? bench.find((p) => p.id === inId) : null;
    if (!inP) {
      bench.sort((a, b) => (DB.effOvr(b, out.role)) - (DB.effOvr(a, out.role)));
      inP = bench.find((p) => (out.isGK ? p.role === 'POR' : p.role !== 'POR'));
    }
    if (!inP) return false;
    const np = this.makeMP(inP, s, out.slot);
    Object.assign(np, { x: out.x < 0 ? this.wx(s, 0.5) : out.x, y: out.y < 0 ? 0 : out.y, role: out.role, line: out.line, hx: out.hx, hy: out.hy, isGK: out.isGK });
    np.stam = U.clamp(inP.fit / 100, 0.5, 1);
    const idx = this.P[s].indexOf(out);
    this.P[s][idx] = np;
    if (this.ball.owner === out) this.ball.owner = np;
    if (this.ctrl === out) this.ctrl = np;
    this.subsIn[s].push(inP.id); this.subsLeft[s]--;
    this.subbedOut = this.subbedOut || [[], []]; this.subbedOut[s].push(out.d.id);
    this._lastSub = this._lastSub || [0, 0]; this._lastSub[s] = this.t;
    this.events.push({ type: 'sub', side: s, min: this.minute(), pid: inP.id, out: out.d.id });
    this.say('sub', { side: s, pid: inP.id, out: out.d.id });
    return true;
  };

  // --------- movimiento
  MP.moveAll = function (dt, calm) {
    const b = this.ball;
    for (let s = 0; s < 2; s++) for (const p of this.P[s]) {
      if (p.off) continue;
      if (p.stateT > 0) { p.stateT -= dt; if (p.stateT <= 0) p.state = ''; }
      if (this.phase === 'goal') {
        // celebración / vuelta a su campo
        if (p.side === this.lastScorerSide) { if (p.d.id === this.lastScorerId) { p.tx = this.celebX; p.ty = this.celebY; } else { p.tx = this.celebX + Math.cos(p.anim) * 3; p.ty = this.celebY + Math.sin(p.anim) * 3; } p.want = 0.8; }
        else { p.tx = this.wx(s, Math.min(p.hx, 0.4)); p.ty = this.wy(s, p.hy); p.want = 0.4; }
      }
      const down = p.state === 'down' || p.state === 'stumble';
      let maxSp = this.speedOf(p) * (down ? 0.1 : 1);
      if (b.owner === p) maxSp *= 0.86 + p.a.reg / 1000;
      const want = calm ? Math.min(p.want, 0.75) : p.want;
      let dx = p.tx - p.x, dy = p.ty - p.y; const d = Math.hypot(dx, dy);
      let desV = d > 0.25 ? Math.min(maxSp * want, d * 2.6) : 0;
      let dvx = d > 0 ? dx / d * desV : 0, dvy = d > 0 ? dy / d * desV : 0;
      if (p.state === 'slide') { p.vx *= 1 - 2.2 * dt; p.vy *= 1 - 2.2 * dt; dvx = p.vx; dvy = p.vy; } // la segada frena poco a poco
      const acc = 11 * dt;
      p.vx += U.clamp(dvx - p.vx, -acc, acc); p.vy += U.clamp(dvy - p.vy, -acc, acc);
      // separación entre jugadores
      for (const q of this.P[s]) { if (q === p || q.off) continue; const ddx = p.x - q.x, ddy = p.y - q.y; const dd = ddx * ddx + ddy * ddy; if (dd < 1.4 && dd > 0.0001) { const k = (1.4 - dd) * 2.5 * dt; p.vx += ddx * k; p.vy += ddy * k; } }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.x = U.clamp(p.x, -3, PL + 3); p.y = U.clamp(p.y, -3, PW + 3);
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 0.4) p.face = Math.atan2(p.vy, p.vx);
      else if (b) p.face = Math.atan2(b.y - p.y, b.x - p.x);
      p.anim += sp * dt * 2.4; p.run = sp;
      // cansancio
      if (!calm) p.stam = Math.max(0.15, p.stam - dt * this.minPerSec * (sp > 5.5 ? 0.0105 : 0.0032) * (1.35 - p.a.res / 100) * (this.tac[s].press === 'alta' ? 1.12 : 1));
    }
    // árbitro
    const r = this.ref; const ra = Math.atan2(b.y - r.y, b.x - r.x);
    const rtx = b.x - Math.cos(ra) * 14, rty = b.y - Math.sin(ra) * 14 + 4;
    r.vx += U.clamp((rtx - r.x) * 0.9 - r.vx, -6 * dt, 6 * dt); r.vy += U.clamp((rty - r.y) * 0.9 - r.vy, -6 * dt, 6 * dt);
    const rs = Math.hypot(r.vx, r.vy); if (rs > 6.5) { r.vx *= 6.5 / rs; r.vy *= 6.5 / rs; }
    r.x += r.vx * dt; r.y += r.vy * dt; r.face = rs > 0.3 ? Math.atan2(r.vy, r.vx) : ra; r.anim += rs * dt * 2.4;
  };

  // --------- física del balón, controles, paradas, goles y fueras
  MP.ballPhysics = function (dt) {
    const b = this.ball;
    b.kickCd -= dt;
    if (b.owner) {
      const p = b.owner;
      b.x = p.x + Math.cos(p.face) * 0.55; b.y = p.y + Math.sin(p.face) * 0.55; b.z = 0;
      b.vx = p.vx; b.vy = p.vy; b.vz = 0; b.spin += Math.hypot(p.vx, p.vy) * dt * 3;
      this.checkOut();
      return;
    }
    // integración
    if (b.z > 0 || b.vz > 0) {
      b.vz -= GRAV * dt; b.z += b.vz * dt;
      b.vx *= (1 - 0.06 * dt); b.vy *= (1 - 0.06 * dt);
      if (b.z <= 0) {
        b.z = 0;
        if (b.vz < -2.5) { b.vz = -b.vz * 0.45; b.vx *= 0.75; b.vy *= 0.75; } else b.vz = 0;
      }
    } else {
      const k = Math.exp(-0.9 * dt); b.vx *= k; b.vy *= k;
      const sp = Math.hypot(b.vx, b.vy); if (sp < 0.25) { b.vx = b.vy = 0; }
    }
    // imán: el balón se curva suavemente hacia los pies del receptor
    const tg = b.target;
    if (tg && !tg.off && b.magnet > 0 && (b.type === 'pass' || b.type === 'cross') && b.z < 1.7) {
      const dx = tg.x - b.x, dy = tg.y - b.y, d = Math.hypot(dx, dy);
      const radius = 2 + 4.5 * b.magnet;
      if (d < radius && d > 0.05) {
        const sp = Math.hypot(b.vx, b.vy);
        const k = Math.min(1, b.magnet * 5 * dt * (1 + (radius - d) / radius));
        b.vx += (dx / d * sp - b.vx) * k; b.vy += (dy / d * sp - b.vy) * k;
        if (sp > 14 && d < 3) { b.vx *= 1 - 2 * dt; b.vy *= 1 - 2 * dt; } // amortigua los pases fuertes
      }
    }
    // efecto: tras un tiro de la persona, empujar en otra dirección curva el balón
    if (b.curveT > 0) {
      b.curveT -= dt;
      const I = this.input; const sp = Math.hypot(b.vx, b.vy);
      if (sp > 4 && Math.hypot(I.mx, I.my) > 0.3) {
        const nx = -b.vy / sp, ny = b.vx / sp; const lat = U.clamp(I.mx * nx + I.my * ny, -1, 1);
        b.vx += nx * lat * 7.5 * dt; b.vy += ny * lat * 7.5 * dt; b.curving = lat;
      } else b.curving = 0;
    } else b.curving = 0;
    const px = b.x, py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.spin += Math.hypot(b.vx, b.vy) * dt * 3;
    // postes y travesaño
    for (const gx of [0, PL]) {
      for (const gy of [GY1, GY2]) {
        if (Math.abs(b.x - gx) < 0.25 && Math.abs(b.y - gy) < 0.25 && b.z < GOAL_H) {
          b.vx = -b.vx * 0.6; b.vy += (b.y - gy) * 8; b.x = px; b.y = py; this.say('post', {}); if (this.hooks.sound) this.hooks.sound('post', this);
        }
      }
    }
    // portero: intento de parada
    this.goalkeeping();
    if (this.ball.owner) return;
    // control del balón por jugadores
    if (b.kickCd <= 0 || true) {
      let best = null, bd = 99;
      for (const p of this.all()) {
        if (p.state === 'down') continue;
        if (p === b.kickBy && b.kickCd > 0) continue;
        let reach = p.isGK && this.inBox(p.side, b.x, b.y) ? 1.3 : 0.85;
        if (p === b.target && b.magnet) reach += 0.9 * b.magnet; // el receptor "atrae" el pase
        const zMax = p.isGK && this.inBox(p.side, b.x, b.y) ? 2.6 : 2.3;
        if (b.z > zMax) continue;
        const d = U.dist(p.x, p.y, b.x, b.y);
        if (d < reach && d < bd) { bd = d; best = p; }
      }
      if (best) this.touchBall(best);
    }
    this.checkOut();
  };

  MP.touchBall = function (p) {
    const b = this.ball; const sp = Math.hypot(b.vx, b.vy);
    const s = p.side;
    // fuera de juego
    if (b.offside && b.offside === p && b.last && b.last.side === s) {
      this.stats.offside[s]++;
      this.say('offside', { pid: p.d.id, side: s });
      if (this.hooks.sound) this.hooks.sound('whistle', this);
      this.place('free', 1 - s, U.clamp(p.x, 1, PL - 1), U.clamp(p.y, 1, PW - 1));
      return;
    }
    b.offside = null;
    // remate de cabeza / volea en el área rival
    if (b.z > 0.9 && this.inBox(1 - s, b.x, b.y) && !p.isGK && (b.type === 'cross' || b.type === 'pass')) {
      p.st.touch++;
      b.last = p; b.owner = null;
      if (this.R() < 0.75) { this.header(p); return; }
    }
    if (b.z > 0.9 && this.inBox(s, b.x, b.y) && !p.isGK && b.last && b.last.side !== s) {
      p.st.touch++; b.owner = null;
      if (this.R() < 0.22) this.kick(p, -this.dir[s] * (4 + this.R() * 4), (this.R() - 0.5) * 16, 3, 'loose', null);
      else this.kick(p, this.dir[s] * (8 + this.R() * 7), (this.R() - 0.5) * 18, 4 + this.R() * 3, 'clear', null);
      return;
    }
    const tough = sp > 15 && b.target !== p;
    const ctrlP = p.isGK ? 0.9 : U.clamp(0.55 + p.a.cal / 230 - (sp - 15) * 0.03, 0.25, 0.97);
    if (tough && this.R() > ctrlP) {
      // rechace
      const a = Math.atan2(b.vy, b.vx) + (this.R() - 0.5) * 2.2;
      b.vx = Math.cos(a) * sp * 0.4; b.vy = Math.sin(a) * sp * 0.4; b.vz = Math.abs(b.vz) * 0.3;
      b.last = p; b.kickBy = p; b.kickCd = 0.2; b.type = 'loose'; b.target = null;
      this.computeChasers();
      return;
    }
    if (b.type === 'pass' && b.kickBy && b.kickBy.side === s && b.kickBy !== p) b.kickBy.st.passOk++;
    if (b.type === 'pass' && b.kickBy && b.kickBy.side === s) this.lastPasser = [s, b.kickBy.d.id, this.t];
    b.owner = p; b.last = p; b.type = null; b.target = null; b.z = 0; b.vz = 0;
    p.st.touch++; p.think = Math.min(p.think, 0.05 + this.R() * 0.12);
    if (p.isGK && this.inBox(s, b.x, b.y)) p.holdT = 0;
    this.computeChasers();
  };

  MP.header = function (p) {
    const s = p.side; const gx = this.oppGoalX(s);
    const d = U.dist(p.x, p.y, gx, PW / 2);
    if (d > 15) { const a = Math.atan2(PW / 2 - p.y, gx - p.x) + (this.R() - 0.5); this.kick(p, Math.cos(a) * 10, Math.sin(a) * 10, 2, 'loose', null); return; }
    const skill = (p.a.agr * 0.4 + p.a.tir * 0.4 + p.d.ovr * 0.2);
    const ty = PW / 2 + (this.R() - 0.5) * GOAL_W * (1.15 - skill / 250) * 1.6;
    const speed = 13 + skill / 12;
    const a = Math.atan2(ty - p.y, gx - p.x); const T = d / speed;
    const h = 0.4 + this.R() * 2.4;
    p.st.shots++; this.stats.shots[s]++;
    this.kick(p, Math.cos(a) * speed, Math.sin(a) * speed, (h - 1.8 + 0.5 * GRAV * T * T) / T, 'shot', null);
    this.say('header', { pid: p.d.id, side: s });
  };

  MP.goalkeeping = function () {
    const b = this.ball;
    if (b.owner || b.type !== 'shot' || b.shotSaveTried) return;
    const s = b.last ? 1 - b.last.side : -1; if (s < 0) return;
    const gk = this.gk(s); if (!gk) return;
    const gx = this.ownGoalX(s);
    const vxT = b.vx; if (Math.abs(vxT) < 0.5) return;
    const tCross = (gk.x - b.x) / vxT;
    if (tCross < 0 || tCross > 0.12) return;
    b.shotSaveTried = true;
    // ¿va a puerta?
    const tGoal = (gx - b.x) / vxT;
    const yAtGoal = b.y + b.vy * tGoal;
    const zAtGoal = b.z + b.vz * tGoal - 0.5 * GRAV * tGoal * tGoal;
    const onTarget = yAtGoal > GY1 && yAtGoal < GY2 && zAtGoal < GOAL_H && zAtGoal > -0.5;
    if (onTarget) { this.stats.onTarget[1 - s]++; b.otCounted = true; }
    const yC = b.y + b.vy * tCross, zC = Math.max(0, b.z + b.vz * tCross - 0.5 * GRAV * tCross * tCross);
    const por = gk.a.por * (s === this.human || this.human < 0 ? 1 : this.diff);
    const reach = 1.0 + por / 100 * 1.95;
    const lat = Math.abs(yC - gk.y) + Math.max(0, zC - 1.9) * 0.8;
    gk.state = 'dive'; gk.stateT = 0.7; gk.diveDir = Math.sign(yC - gk.y) || 1;
    if (!onTarget) { if (lat < reach * 0.6 && this.R() < 0.5) this.saveBall(gk, false); return; }
    if (lat > reach + 0.35) return;
    const sp = Math.hypot(b.vx, b.vy);
    let pSave = (1.04 - (lat / reach) * 0.42) * (0.62 + por / 250) - Math.max(0, sp - 22) * 0.01;
    // los disparos desde muy cerca son más difíciles
    const dShot = b.shotFrom ? U.dist(b.shotFrom[0], b.shotFrom[1], gx, PW / 2) : 20;
    if (dShot < 9) pSave -= (9 - dShot) * 0.035;
    pSave = 1 - (1 - U.clamp(pSave, 0.05, 0.96)) * this.goalScale;
    if (this.R() < pSave) this.saveBall(gk, true);
  };

  MP.saveBall = function (gk, onTarget) {
    const b = this.ball; const s = gk.side;
    gk.st.saves++; if (onTarget) { this.stats.saves[s]++; this.events.push({ type: 'save', side: s, min: this.minute(), pid: gk.d.id }); }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp < 21 && this.R() < 0.35 + gk.a.por / 300) {
      b.owner = gk; b.last = gk; b.type = null; b.vx = b.vy = b.vz = 0; b.z = 0; gk.holdT = -0.6;
      this.say('catch', { pid: gk.d.id, side: s });
    } else {
      const out = this.dir[s]; const dd = gk.diveDir || 1;
      if (this.R() < 0.45) { // despeje a córner (por encima o junto al poste)
        b.vx = -out * (3 + this.R() * 2); b.vy = dd * (9 + this.R() * 5); b.vz = 5 + this.R() * 3;
      } else {
        b.vx = out * (3 + this.R() * 5); b.vy = dd * sp * (0.2 + this.R() * 0.25); b.vz = 1.5 + this.R() * 3;
      }
      b.last = gk; b.kickBy = gk; b.kickCd = 0.3; b.type = 'loose'; b.target = null;
      this.say('save', { pid: gk.d.id, side: s });
      this.computeChasers();
    }
    if (this.hooks.sound) this.hooks.sound('save', this);
  };

  MP.checkOut = function () {
    const b = this.ball;
    if (b.x < 0 || b.x > PL) {
      const gx = b.x < 0 ? 0 : PL;
      const defSide = this.ownGoalX(0) === gx ? 0 : 1; // equipo que defiende esa portería
      if (b.y > GY1 && b.y < GY2 && b.z < GOAL_H) { this.goal(1 - defSide); return; }
      const lastSide = b.last ? b.last.side : defSide;
      if (lastSide === defSide) {
        this.stats.corners[1 - defSide]++;
        this.say('corner', { side: 1 - defSide });
        this.place('corner', 1 - defSide, gx === 0 ? 0.3 : PL - 0.3, b.y < PW / 2 ? 0.3 : PW - 0.3);
      } else {
        this.say('goalkick', { side: defSide });
        if (this.hooks.sound) this.hooks.sound('whistle', this);
        this.place('goalkick', defSide, gx === 0 ? 5.5 : PL - 5.5, PW / 2 + (b.y < PW / 2 ? -9 : 9));
      }
      return;
    }
    if (b.y < 0 || b.y > PW) {
      const side = b.last ? 1 - b.last.side : 0;
      this.say('throw', { side });
      this.place('throw', side, U.clamp(b.x, 1, PL - 1), b.y < 0 ? 0.2 : PW - 0.2);
    }
  };

  MP.goal = function (side) {
    const b = this.ball;
    let scorer = b.last; let own = false;
    if (!scorer || scorer.side !== side) { own = true; }
    this.score[side]++;
    if (!own && b.type === 'shot' && !b.otCounted) this.stats.onTarget[side]++;
    let assist = null;
    if (!own && this.lastPasser && this.lastPasser[0] === side && this.lastPasser[1] !== scorer.d.id && this.t - this.lastPasser[2] < 8 * this.minPerSec) assist = this.lastPasser[1];
    const ev = { type: 'goal', side, min: this.minute(), pid: scorer ? scorer.d.id : null, assist, own, pen: this.lastRestartPenalty === true };
    this.events.push(ev);
    if (scorer && !own) scorer.st.goals++;
    if (assist) { const ap = this.P[side].find((q) => q.d.id === assist); if (ap) ap.st.ast++; }
    this.lastPasser = null;
    this.lastConceded = 1 - side; this.lastScorerSide = side; this.lastScorerId = scorer ? scorer.d.id : null;
    this.celebX = U.clamp(b.x < PL / 2 ? 14 : PL - 14, 0, PL); this.celebY = b.y < PW / 2 ? 6 : PW - 6;
    b.vx *= 0.1; b.vy *= 0.1; b.vz = 0; b.z = 0; b.x = U.clamp(b.x, -1.5, PL + 1.5); b.owner = null; b.type = null;
    this.phase = 'goal'; this.phaseT = 3.2;
    this.say('goal', ev);
    if (this.hooks.sound) this.hooks.sound('goal', this);
  };

  MP.executeRestart = function () {
    const rs = this.restart; this.phase = 'play'; this.lastRestartPenalty = false;
    if (!rs) return;
    const p = rs.taker; const b = this.ball; const s = rs.side;
    b.owner = p; b.x = rs.type === 'kickoff' ? PL / 2 : rs.x; b.y = rs.type === 'kickoff' ? PW / 2 : rs.y;
    if (this.hooks.sound && (rs.type === 'kickoff' || rs.type === 'penalty' || rs.type === 'free')) this.hooks.sound('whistle', this);
    this.restart = null;
    if (rs.type === 'kickoff') {
      const r = this.active(s).filter((q) => q !== p && !q.isGK).sort((a, c) => U.dist(a.x, a.y, p.x, p.y) - U.dist(c.x, c.y, p.x, p.y))[0];
      if (r) this.pass(p, r, r.x, r.y, false);
      return;
    }
    if (s === this.human && rs.type !== 'penalty' && p === this.ctrl) {
      // la persona decide: le damos el balón parado
      p.think = 0.4; return;
    }
    if (rs.type === 'penalty') { this.lastRestartPenalty = true; this.shoot(p, this.R() < 0.5 ? -0.7 : 0.7, 0.85); this.ball.shotFrom = [p.x, p.y]; return; }
    if (rs.type === 'corner') {
      const tgt = this.active(s).filter((q) => q !== p && this.inBox(1 - s, q.x, q.y)).sort((a, c) => (c.a.agr + c.d.ovr * 0.5) - (a.a.agr + a.d.ovr * 0.5));
      const r = tgt[Math.floor(this.R() * Math.min(3, tgt.length))];
      if (r) { this.cross(p, r); return; }
    }
    if (rs.type === 'free') {
      const gx = this.oppGoalX(s); const d = U.dist(rs.x, rs.y, gx, PW / 2);
      if (d < 28 && Math.abs(rs.y - PW / 2) < 18 && this.R() < 0.6) {
        const shooter = this.active(s).filter((q) => !q.isGK).sort((a, c) => c.a.tir - a.a.tir)[0];
        if (shooter && shooter !== p) { b.owner = shooter; shooter.x = rs.x - this.dir[s] * 0.7; shooter.y = rs.y; }
        this.shoot(b.owner, null, 0.9); return;
      }
    }
    if (rs.type === 'goalkick' && s === this.human && p.isGK) { this.ctrl = p; p.gkHold = 0; return; }
    if (rs.type === 'goalkick') {
      const bp = this.bestPass(p);
      if (bp && bp.pOk > 0.6 && this.R() < 0.5) this.pass(p, bp.r, bp.tx, bp.ty, bp.loft); else this.longBall(p);
      return;
    }
    const bp = this.bestPass(p);
    if (bp) this.pass(p, bp.r, bp.tx, bp.ty, rs.type === 'throw' ? false : bp.loft);
    else this.longBall(p);
  };

  // --------- resultado en el mismo formato que la simulación rápida
  MP.result = function () {
    const res = MF.SIM.emptyResult(this.cfg.home, this.cfg.away);
    res.score = this.score.slice();
    res.events = this.events.slice().sort((a, b) => a.min - b.min);
    const tot = this.stats.possT[0] + this.stats.possT[1];
    res.stats = { shots: this.stats.shots.slice(), onTarget: this.stats.onTarget.slice(), corners: this.stats.corners.slice(), fouls: this.stats.fouls.slice(), poss: [Math.round(this.stats.possT[0] / tot * 100), 100 - Math.round(this.stats.possT[0] / tot * 100)] };
    res.subsIn = this.subsIn.map((a) => a.slice());
    res.ratings = MF.SIM.ratings(this.w, res, this.L, this.R);
    // ajuste por rendimiento real en el motor
    this.P.forEach((arr) => arr.forEach((p) => {
      if (res.ratings[p.d.id] === undefined) return;
      const st = p.st; let r = res.ratings[p.d.id];
      r += (st.passOk - (st.pass - st.passOk) * 1.2) * 0.03 + st.tackles * 0.04 + st.saves * 0.15;
      res.ratings[p.d.id] = Math.round(U.clamp(r, 3, 10) * 10) / 10;
    }));
    res.fatigue = {};
    this.P.forEach((arr) => arr.forEach((p) => { res.fatigue[p.d.id] = p.stam; }));
    res.done = true;
    return res;
  };

  // Termina el partido con la simulación rápida desde el minuto actual
  MP.finishQuick = function () {
    const partial = this.result(); partial.done = false;
    const min = Math.min(89, Math.floor(this.t));
    const lh = { formation: this.L[0].formation, xi: this.P[0].map((p) => (p.off ? null : p.d.id)) };
    const la = { formation: this.L[1].formation, xi: this.P[1].map((p) => (p.off ? null : p.d.id)) };
    lh.xi = lh.xi.map((x) => x); la.xi = la.xi.map((x) => x);
    const res = MF.SIM.play(this.w, { home: this.cfg.home, away: this.cfg.away, lhome: lh, laway: la, neutral: this.neutral, rng: this.R, fromMinute: min, base: partial });
    res.subsIn = this.subsIn.map((a) => a.slice());
    res.fatigue = {}; this.P.forEach((arr) => arr.forEach((p) => { res.fatigue[p.d.id] = Math.max(0.3, p.stam - 0.1); }));
    this.score = res.score.slice(); this.events = res.events; this.phase = 'end';
    return res;
  };

  Match.PL = PL; Match.PW = PW; Match.GOAL_W = GOAL_W; Match.GY1 = GY1; Match.GY2 = GY2; Match.BOX_D = BOX_D; Match.BOX_W = BOX_W; Match.STEP = STEP;
  MF.Match = Match;
})(typeof window !== 'undefined' ? window : globalThis);
