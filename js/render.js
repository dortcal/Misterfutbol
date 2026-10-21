/* MÍSTER FÚTBOL 26·27 — dibujo del partido en vista cenital (Canvas 2D) */
(function (G) {
  'use strict';
  const MF = G.MF; const U = MF.U;
  const Match = MF.Match;
  const PL = 105, PW = 68;
  const WX0 = -17, WY0 = -15, WX1 = 122, WY1 = 83; // mundo dibujado (incluye gradas)
  const PS = 14; // píxeles por metro del césped prerenderizado

  const SKIN = ['#f3cfae', '#f3cfae', '#d8a47a', '#a66d45', '#5a3721'];
  const HAIR = ['#17120e', '#3a2416', '#6b4423', '#cfa65c', null];
  const SPONSORS = ['MÍSTER FÚTBOL', 'TEMPORADA 26·27', 'PIXEL FORGE', 'LA CANTERA', 'GOLAZO TV', 'BALÓN DE BARRIO', 'EL LARGUERO DIGITAL', 'TACOS & TACTICAS'];

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }

  function Renderer(canvas, match, opts) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.m = match; this.opts = opts || {};
    this.zoom = this.opts.zoom || 1; this.camera = this.opts.camera || 'total'; this.k = 1.5; this.weather = this.opts.weather || 'dia';
    this.camX = PL / 2; this.camY = PW / 2; this.flip = false; this.rot = false;
    this.particles = []; this.rain = []; this.flash = 0; this.crowdFrame = 0; this.shake = 0;
    this.buildPitch();
    this.resize();
  }
  const RP = Renderer.prototype;

  RP.resize = function () {
    const dpr = Math.min(2, G.devicePixelRatio || 1);
    const r = this.cv.getBoundingClientRect();
    this.W = Math.max(50, r.width); this.H = Math.max(50, r.height); this.dpr = dpr;
    this.cv.width = Math.round(this.W * dpr); this.cv.height = Math.round(this.H * dpr);
    this.rot = this.H > this.W * 1.08;
    const across = this.rot ? this.W : this.H, along = this.rot ? this.H : this.W;
    // metros visibles: más campo en horizontal, algo más cerca en móvil vertical
    this.ox = this.W / 2; this.oy = this.H / 2;
    if (this.camera === 'total') {
      // vista cenital total (como en PC Fútbol 2.0): todo el campo a la vista y cámara fija
      const top = 54, bottom = this.rot && this.opts.touch ? 210 : 0;
      const availAcross = this.rot ? this.W : this.H - top, availAlong = this.rot ? this.H - top - bottom : this.W;
      this.S = Math.max(2, Math.min(availAcross / (PW + 6), availAlong / (PL + 8)));
      this.oy = top + (this.H - top - bottom) / 2;
      this.camX = PL / 2; this.camY = PW / 2;
    } else {
      const mAcross = (this.rot ? 25 : 36) / this.zoom, mAlong = (this.rot ? 44 : 62) / this.zoom;
      this.S = U.clamp(Math.min(across / mAcross, along / mAlong), 11, 40);
    }
    // con el campo entero los jugadores se dibujan algo más grandes para que se distingan
    this.k = U.clamp(24 / this.S, 1.5, 3.2);
  };

  // ---------- césped, líneas, porterías y gradas (una sola vez)
  RP.buildPitch = function () {
    const m = this.m; const home = m.T[0];
    const c = document.createElement('canvas');
    c.width = (WX1 - WX0) * PS; c.height = (WY1 - WY0) * PS;
    const g = c.getContext('2d');
    g.scale(PS, PS); g.translate(-WX0, -WY0);
    const night = this.weather === 'noche';
    // fondo de grada
    g.fillStyle = night ? '#1c1f26' : '#3b3f47'; g.fillRect(WX0, WY0, WX1 - WX0, WY1 - WY0);
    // césped con franjas de corte
    const gA = night ? '#2f6b2a' : '#3f8f35', gB = night ? '#2a6326' : '#378330';
    g.fillStyle = gA; g.fillRect(-7, -6, PL + 14, PW + 12);
    for (let i = 0; i < 20; i++) { if (i % 2) { g.fillStyle = gB; g.fillRect(i * PL / 20, -6, PL / 20, PW + 12); } }
    // textura
    const R = U.rng(U.hash(home.id + 'grass'));
    for (let i = 0; i < 9000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'; g.fillRect(-7 + R() * (PL + 14), -6 + R() * (PW + 12), 0.25, 0.08); }
    // líneas
    g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = 0.14;
    g.strokeRect(0, 0, PL, PW);
    g.beginPath(); g.moveTo(PL / 2, 0); g.lineTo(PL / 2, PW); g.stroke();
    g.beginPath(); g.arc(PL / 2, PW / 2, 9.15, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(PL / 2, PW / 2, 0.25, 0, 7); g.fill();
    [0, PL].forEach((gx) => {
      const d = gx === 0 ? 1 : -1;
      g.strokeRect(gx === 0 ? 0 : PL - 16.5, PW / 2 - 20.16, 16.5, 40.32);
      g.strokeRect(gx === 0 ? 0 : PL - 5.5, PW / 2 - 9.16, 5.5, 18.32);
      g.beginPath(); g.arc(gx + d * 11, PW / 2, 0.22, 0, 7); g.fill();
      g.beginPath(); g.arc(gx + d * 11, PW / 2, 9.15, d === 1 ? -0.927 : Math.PI - 0.927, d === 1 ? 0.927 : Math.PI + 0.927); g.stroke();
      // redes
      const nx = gx === 0 ? -2.2 : PL;
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(nx, PW / 2 - 3.66, 2.2, 7.32);
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.04;
      for (let k = 0; k <= 7.32; k += 0.4) { g.beginPath(); g.moveTo(nx, PW / 2 - 3.66 + k); g.lineTo(nx + 2.2, PW / 2 - 3.66 + k); g.stroke(); }
      for (let k = 0; k <= 2.2; k += 0.4) { g.beginPath(); g.moveTo(nx + k, PW / 2 - 3.66); g.lineTo(nx + k, PW / 2 + 3.66); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = 0.14;
    });
    [[0, 0, 0], [PL, 0, Math.PI / 2], [PL, PW, Math.PI], [0, PW, -Math.PI / 2]].forEach(([x, y, a]) => { g.beginPath(); g.arc(x, y, 1, a, a + Math.PI / 2); g.stroke(); });
    // banderines
    [[0, 0], [PL, 0], [0, PW], [PL, PW]].forEach(([x, y]) => { g.fillStyle = '#ffd400'; g.fillRect(x - 0.15, y - 0.15, 0.3, 0.3); });
    // vallas publicitarias
    const boards = (x, y, w, h, vertical) => {
      g.fillStyle = '#111'; g.fillRect(x, y, w, h);
      const n = Math.floor((vertical ? h : w) / 14);
      for (let i = 0; i < n; i++) {
        const txt = SPONSORS[(i + (vertical ? 3 : 0) + (y > 0 ? 5 : 0)) % SPONSORS.length];
        const col = [home.kit.home.p, '#ffffff', '#ffd400', '#e63946', '#1d9bf0'][i % 5];
        g.save();
        if (vertical) { g.translate(x + w / 2, y + i * 14 + 7); g.rotate(x < 0 ? Math.PI / 2 : -Math.PI / 2); }
        else g.translate(x + i * 14 + 7, y + h / 2);
        g.fillStyle = i % 2 ? '#0d2a52' : '#1a1a1a'; g.fillRect(-6.8, -h * 0 - 0.6, 13.6, 1.2);
        g.fillStyle = col; g.font = 'bold 0.85px Russo One, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(txt, 0, 0.05); g.restore();
      }
    };
    boards(0, -5.2, PL, 1.2, false); boards(0, PW + 4, PL, 1.2, false);
    boards(-6.4, 6, 1.2, PW - 12, true); boards(PL + 5.2, 6, 1.2, PW - 12, true);
    this.pitch = c;
    // gradas (dos fotogramas para animar a la afición)
    this.crowd = [0, 1].map((f) => this.buildCrowd(f));
  };

  RP.buildCrowd = function (frame) {
    const m = this.m; const c = document.createElement('canvas');
    c.width = (WX1 - WX0) * PS / 2; c.height = (WY1 - WY0) * PS / 2;
    const g = c.getContext('2d'); g.scale(PS / 2, PS / 2); g.translate(-WX0, -WY0);
    const R = U.rng(U.hash(m.T[0].id) + frame * 77);
    const homeCols = [m.T[0].kit.home.p, m.T[0].kit.home.s];
    const awayCols = [m.T[1].kit.home.p, m.T[1].kit.home.s];
    const rings = [[WX0, WY0, WX1 - WX0, -7 - WY0], [WX0, PW + 7, WX1 - WX0, WY1 - PW - 7], [WX0, -7, -8 - WX0, PW + 14], [PL + 8, -7, WX1 - PL - 8, PW + 14]];
    rings.forEach(([x, y, w, h], idx) => {
      // gradas escalonadas
      for (let k = 0; k < 6; k++) {
        g.fillStyle = k % 2 ? '#2a2d34' : '#323640';
        if (idx < 2) g.fillRect(x, y + (idx === 0 ? k : h - k - 1) * h / 6, w, h / 6); else g.fillRect(x + (idx === 2 ? k : w - k - 1) * w / 6, y, w / 6, h);
      }
      const n = Math.floor(w * h * 2.3);
      for (let i = 0; i < n; i++) {
        const px = x + R() * w, py = y + R() * h;
        const awayEnd = idx === 3;
        const r = R();
        g.fillStyle = r < 0.42 ? (awayEnd && R() < 0.6 ? awayCols : homeCols)[R() < 0.7 ? 0 : 1] : ['#e8d6c3', '#c79b77', '#8a5a3c', '#f1f1f1', '#333', '#556', '#a33'][Math.floor(R() * 7)];
        const s = 0.42 + R() * 0.2;
        g.fillRect(px + (frame ? (R() - 0.5) * 0.3 : 0), py + (frame ? -R() * 0.35 : 0), s, s);
      }
    });
    return c;
  };

  // ---------- cámara
  RP.updateCamera = function (dt) {
    const m = this.m; const b = m.ball;
    if (this.camera === 'total') { this.camX = PL / 2; this.camY = PW / 2; if (this.shake > 0) this.shake -= dt; return; }
    let tx = b.x + b.vx * 0.35, ty = b.y + b.vy * 0.35;
    if (m.phase === 'goal') { tx = b.x; ty = b.y; }
    const k = 1 - Math.exp(-dt * 3.2);
    this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k;
    // límites
    const halfAlong = (this.rot ? this.H : this.W) / 2 / this.S, halfAcross = (this.rot ? this.W : this.H) / 2 / this.S;
    this.camX = U.clamp(this.camX, Math.min(PL / 2, -6 + halfAlong), Math.max(PL / 2, PL + 6 - halfAlong));
    this.camY = U.clamp(this.camY, Math.min(PW / 2, -6 + halfAcross), Math.max(PW / 2, PW + 6 - halfAcross));
    if (this.shake > 0) this.shake -= dt;
  };

  RP.applyWorld = function (g) {
    const S = this.S * this.dpr, W = this.ox * 2 * this.dpr, H = this.oy * 2 * this.dpr;
    let cx = this.camX, cy = this.camY;
    if (this.flip) { cx = PL - cx; cy = PW - cy; }
    const sx = this.shake > 0 ? (Math.random() - 0.5) * 6 : 0, sy = this.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
    if (!this.rot) g.setTransform(S, 0, 0, S, W / 2 - cx * S + sx, H / 2 - cy * S + sy);
    else g.setTransform(0, -S, S, 0, W / 2 - cy * S + sx, H / 2 + cx * S + sy);
    if (this.flip) { g.translate(PL, PW); g.scale(-1, -1); }
  };

  // mundo → pantalla (para textos)
  RP.toScreen = function (x, y) {
    if (this.flip) { x = PL - x; y = PW - y; }
    let cx = this.camX, cy = this.camY; if (this.flip) { cx = PL - cx; cy = PW - cy; }
    if (!this.rot) return [this.ox + (x - cx) * this.S, this.oy + (y - cy) * this.S];
    return [this.ox + (y - cy) * this.S, this.oy - (x - cx) * this.S];
  };
  // vector de pantalla → vector del mundo (para el mando)
  // pantalla → mundo (para tocar jugadores)
  RP.screenToWorld = function (sx, sy) {
    let cx = this.camX, cy = this.camY; if (this.flip) { cx = PL - cx; cy = PW - cy; }
    let x, y;
    if (!this.rot) { x = cx + (sx - this.ox) / this.S; y = cy + (sy - this.oy) / this.S; }
    else { y = cy + (sx - this.ox) / this.S; x = cx - (sy - this.oy) / this.S; }
    if (this.flip) { x = PL - x; y = PW - y; }
    return [x, y];
  };
  RP.screenVecToWorld = function (sx, sy) {
    let wx, wy;
    if (!this.rot) { wx = sx; wy = sy; } else { wx = -sy; wy = sx; }
    if (this.flip) { wx = -wx; wy = -wy; }
    return [wx, wy];
  };

  // ---------- jugadores
  RP.drawPlayer = function (g, p, kit, isRef) {
    const run = Math.min(1, (p.run || 0) / 6.5);
    const sw = Math.sin(p.anim) * 0.34 * run;
    const k = this.k; // exageración para que se vean bien con el campo entero o en el móvil
    g.save(); g.translate(p.x, p.y);
    // sombra
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(0.32, 0.38, 0.5 * k, 0.32 * k, 0.5, 0, 7); g.fill();
    g.rotate(p.face || 0); g.scale(k, k);
    const skin = isRef ? SKIN[2] : SKIN[p.d.tone] || SKIN[1];
    let diving = p.state === 'dive' ? (p.diveDir || 1) : 0;
    if (p.state === 'down') { g.rotate(Math.PI / 2); }
    if (diving) { g.rotate(diving * Math.PI / 2 * Math.min(1, (0.7 - p.stateT) * 5)); }
    // piernas
    const sock = kit.so, shorts = kit.sh;
    g.lineCap = 'round';
    g.strokeStyle = sock; g.lineWidth = 0.17;
    if (p.state === 'slide') { g.beginPath(); g.moveTo(0, 0.12); g.lineTo(0.62, 0.18); g.stroke(); g.beginPath(); g.moveTo(0, -0.12); g.lineTo(0.3, -0.2); g.stroke(); }
    else {
      g.beginPath(); g.moveTo(0, 0.13); g.lineTo(sw, 0.15); g.stroke();
      g.beginPath(); g.moveTo(0, -0.13); g.lineTo(-sw, -0.15); g.stroke();
      if (p.state === 'kick') { g.beginPath(); g.moveTo(0, 0.13); g.lineTo(0.5, 0.12); g.stroke(); }
    }
    g.fillStyle = shorts; g.beginPath(); g.ellipse(-0.02, 0, 0.17, 0.27, 0, 0, 7); g.fill();
    // brazos
    const arm = -sw * 0.8;
    g.fillStyle = isRef ? '#111' : kit.p;
    g.beginPath(); g.arc(arm, 0.42, 0.11, 0, 7); g.fill(); g.beginPath(); g.arc(-arm, -0.42, 0.11, 0, 7); g.fill();
    g.fillStyle = p.isGK ? '#f2f2f2' : skin;
    g.beginPath(); g.arc(arm + 0.07, 0.47, 0.075, 0, 7); g.fill(); g.beginPath(); g.arc(-arm + 0.07, -0.47, 0.075, 0, 7); g.fill();
    // torso con dibujo de la camiseta
    g.save();
    g.beginPath(); g.ellipse(0, 0, 0.21, 0.44, 0, 0, 7); g.closePath();
    g.fillStyle = kit.p; g.fill(); g.clip();
    g.fillStyle = kit.s;
    switch (kit.pat) {
      case 'stripes': for (let y = -0.44; y < 0.45; y += 0.2) g.fillRect(-0.3, y, 0.6, 0.09); break;
      case 'hoops': g.fillRect(-0.06, -0.5, 0.11, 1); g.fillRect(0.12, -0.5, 0.08, 1); g.fillRect(-0.22, -0.5, 0.08, 1); break;
      case 'halves': g.fillRect(-0.3, 0, 0.6, 0.5); break;
      case 'quarters': g.fillRect(-0.3, 0, 0.3, 0.5); g.fillRect(0, -0.5, 0.3, 0.5); break;
      case 'sash': g.beginPath(); g.moveTo(-0.3, -0.5); g.lineTo(-0.14, -0.5); g.lineTo(0.3, 0.42); g.lineTo(0.3, 0.55); g.lineTo(0.14, 0.55); g.closePath(); g.fill(); break;
      case 'band': g.fillRect(0.02, -0.5, 0.1, 1); break;
      default: g.fillRect(0.14, -0.5, 0.06, 1); // cuello / ribete
    }
    g.restore();
    // cabeza: piel + pelo
    g.fillStyle = skin; g.beginPath(); g.arc(0.03, 0, 0.17, 0, 7); g.fill();
    let hair = isRef ? '#1a1a1a' : HAIR[p.d.hair];
    if (!hair) hair = shade(skin.length === 7 ? skin : '#a66d45', -0.35);
    g.fillStyle = hair; g.beginPath(); g.ellipse(-0.035, 0, 0.13, 0.15, 0, 0, 7); g.fill();
    g.restore();
  };

  RP.drawBall = function (g) {
    const b = this.m.ball;
    const z = b.z || 0;
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.ellipse(b.x + z * 0.35 + 0.05, b.y + z * 0.35 + 0.05, 0.13 * this.k, 0.09 * this.k, 0, 0, 7); g.fill();
    const r = 0.16 * this.k * (1 + z * 0.09);
    // al elevarse, se desplaza un poco en pantalla (falsa perspectiva)
    const bx = b.x - z * 0.15, by = b.y - z * 0.15;
    g.save(); g.translate(bx, by); g.rotate(b.spin || 0);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(0, 0, r * 0.36, 0, 7); g.fill();
    for (let i = 0; i < 5; i++) { const a = i * 1.2566; g.beginPath(); g.arc(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, r * 0.2, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.03; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
    g.restore();
  };

  RP.drawGoals = function (g) {
    // portería: postes en la línea de gol (y = GY1 y GY2) y red de 2,2 m hacia fuera del campo
    const y1 = Match.GY1, y2 = Match.GY2, depth = 2.2, w = 0.14;
    [0, PL].forEach((gx) => {
      const out = gx === 0 ? -1 : 1; // hacia fuera del campo
      const back = gx + out * depth;
      // sombra del larguero (proyectada hacia el campo)
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(Math.min(gx, gx - out * 0.6), y1 + 0.5, 0.6, y2 - y1);
      g.fillStyle = '#ffffff';
      g.fillRect(gx - w / 2, y1 - w / 2, w, y2 - y1 + w); // larguero sobre la línea de gol
      g.fillRect(Math.min(gx, back), y1 - w / 2, depth, w); // lateral de la red
      g.fillRect(Math.min(gx, back), y2 - w / 2, depth, w);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(back - 0.04, y1, 0.08, y2 - y1); // fondo de la red
      g.fillStyle = '#e8e8e8'; [y1, y2].forEach((y) => { g.beginPath(); g.arc(gx, y, 0.13, 0, 7); g.fill(); }); // postes
    });
  };

  // ---------- partículas (confeti, lluvia)
  RP.burst = function (x, y, cols) {
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 9;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.6 + Math.random(), c: cols[i % cols.length], s: 0.2 + Math.random() * 0.25, r: Math.random() * 6 });
    }
    this.flash = 0.5; this.shake = 0.35;
  };

  RP.draw = function (dt) {
    const g = this.ctx; const m = this.m;
    this.updateCamera(dt);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#20232a'; g.fillRect(0, 0, this.cv.width, this.cv.height);
    this.applyWorld(g);
    g.imageSmoothingEnabled = true;
    // gradas animadas cuando hay emoción
    this.crowdFrame += dt * (m.phase === 'goal' ? 9 : 1 + m.excite * 3);
    const cf = this.crowd[(this.crowdFrame | 0) % 2];
    g.drawImage(cf, WX0, WY0, WX1 - WX0, WY1 - WY0);
    // el lienzo del césped empieza en (WX0, WY0): se recorta la zona de juego (-7..PL+7, -6..PW+6) con su desplazamiento real
    g.drawImage(this.pitch, (-7 - WX0) * PS, (-6 - WY0) * PS, (PL + 14) * PS, (PW + 12) * PS, -7, -6, PL + 14, PW + 12);
    // jugadores ordenados por profundidad
    const list = [];
    for (let s = 0; s < 2; s++) for (const p of m.P[s]) if (!p.off) list.push(p);
    list.sort((a, b) => a.y - b.y);
    // indicador del jugador controlado
    if (m.ctrl) {
      const p = m.ctrl; g.strokeStyle = '#ffe14d'; g.lineWidth = 0.07 * this.k;
      g.beginPath(); g.arc(p.x, p.y, 0.6 * this.k, 0, 7); g.stroke();
    }
    const b = m.ball;
    if (b.owner) { g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 0.08; g.beginPath(); g.arc(b.owner.x, b.owner.y, 0.5 * this.k, 0, 7); g.stroke(); }
    for (const p of list) {
      const kit = p.isGK ? m.T[p.side].kit.gk : m.kits[p.side];
      this.drawPlayer(g, p, kit, false);
    }
    // árbitro
    const ref = m.ref; this.drawPlayer(g, { x: ref.x, y: ref.y, face: ref.face, anim: ref.anim, run: Math.hypot(ref.vx, ref.vy), d: { tone: 2, hair: 0 }, state: '' }, { p: '#111111', s: '#222222', pat: 'plain', sh: '#111111', so: '#111111' }, true);
    // puntería al mantener pulsado sobre un punto
    if (m.aimPoint && m.human >= 0) {
      const [ax, ay] = m.aimPoint; const b0 = m.ball;
      const gx = m.oppGoalX(m.human); const onGoal = Math.abs(ax - gx) < 7 && Math.abs(ay - PW / 2) < 6.7;
      g.strokeStyle = onGoal ? 'rgba(255,214,10,0.95)' : 'rgba(255,255,255,0.85)'; g.lineWidth = 0.09 * this.k; g.setLineDash([0.9, 0.6]);
      g.beginPath(); g.moveTo(b0.x, b0.y); g.lineTo(ax, ay); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(ax, ay, 0.45 * this.k, 0, 7); g.stroke();
    }
    // marca del jugador tocado
    if (m.tapMark && m.tapMark.t > 0) { const t = m.tapMark; t.t -= dt; g.strokeStyle = t.c; g.lineWidth = 0.1 * this.k; g.beginPath(); g.arc(t.x, t.y, (1.4 - t.t) * this.k, 0, 7); g.stroke(); }
    // flecha de puntería del portero controlado
    if (m.gkAim !== null && m.gkAim !== undefined && m.ctrl && m.ctrl.isGK && m.ball.owner === m.ctrl) {
      const p = m.ctrl, a = m.gkAim, L = 10;
      g.strokeStyle = 'rgba(255,225,77,0.9)'; g.lineWidth = 0.12 * this.k; g.setLineDash([0.8, 0.6]);
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + Math.cos(a) * L, p.y + Math.sin(a) * L); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ffe14d'; g.beginPath();
      g.moveTo(p.x + Math.cos(a) * (L + 1.6), p.y + Math.sin(a) * (L + 1.6));
      g.lineTo(p.x + Math.cos(a + 2.6) * 1.2 + Math.cos(a) * L, p.y + Math.sin(a + 2.6) * 1.2 + Math.sin(a) * L);
      g.lineTo(p.x + Math.cos(a - 2.6) * 1.2 + Math.cos(a) * L, p.y + Math.sin(a - 2.6) * 1.2 + Math.sin(a) * L);
      g.fill();
    }
    this.drawBall(g);
    this.drawGoals(g);
    // partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i]; q.life -= dt; if (q.life <= 0) { this.particles.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.vy *= 0.97; q.r += dt * 8;
      g.save(); g.translate(q.x, q.y); g.rotate(q.r); g.fillStyle = q.c; g.globalAlpha = Math.min(1, q.life); g.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); g.restore();
    }
    g.globalAlpha = 1;
    // capa de pantalla: textos, noche, lluvia, destello
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawLabels(g);
    if (this.weather === 'noche') {
      const grd = g.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.25, this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.75);
      grd.addColorStop(0, 'rgba(10,15,40,0)'); grd.addColorStop(1, 'rgba(5,8,25,0.55)');
      g.fillStyle = grd; g.fillRect(0, 0, this.W, this.H);
    }
    if (this.weather === 'lluvia') this.drawRain(g, dt);
    if (this.flash > 0) { this.flash -= dt; g.fillStyle = 'rgba(255,255,255,' + Math.max(0, this.flash) * 0.6 + ')'; g.fillRect(0, 0, this.W, this.H); }
  };

  RP.drawLabels = function (g) {
    const m = this.m;
    g.font = '600 ' + (this.camera === 'total' ? 11 : 12) + 'px Rajdhani, Arial Narrow, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom';
    const show = [];
    if (m.ball.owner) show.push([m.ball.owner, '#fff']);
    if (m.ctrl && m.ctrl !== m.ball.owner) show.push([m.ctrl, '#ffe14d']);
    show.forEach(([p, col]) => {
      const [sx, sy] = this.toScreen(p.x, p.y);
      const txt = p.d.num + ' ' + p.d.short.toUpperCase();
      const w = g.measureText(txt).width + 8;
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(sx - w / 2, sy - this.S * 0.85 * this.k - 15, w, 15);
      g.fillStyle = col; g.fillText(txt, sx, sy - this.S * 0.85 * this.k - 1);
      if (p === m.ctrl) { g.fillStyle = '#ffe14d'; g.beginPath(); g.moveTo(sx - 5, sy - this.S * 0.85 * this.k + 2); g.lineTo(sx + 5, sy - this.S * 0.85 * this.k + 2); g.lineTo(sx, sy - this.S * 0.85 * this.k + 8); g.fill(); }
    });
  };

  RP.drawRain = function (g, dt) {
    while (this.rain.length < 160) this.rain.push({ x: Math.random() * this.W, y: Math.random() * this.H, v: 500 + Math.random() * 300 });
    g.strokeStyle = 'rgba(200,215,255,0.35)'; g.lineWidth = 1;
    g.beginPath();
    for (const d of this.rain) { d.y += d.v * dt; d.x -= d.v * dt * 0.15; if (d.y > this.H) { d.y = -10; d.x = Math.random() * this.W * 1.2; } g.moveTo(d.x, d.y); g.lineTo(d.x + 3, d.y - 12); }
    g.stroke();
    g.fillStyle = 'rgba(40,50,70,0.12)'; g.fillRect(0, 0, this.W, this.H);
  };

  // ---------- radar (minimapa)
  RP.drawRadar = function (cv) {
    const g = cv.getContext('2d'); const m = this.m;
    const w = cv.width, h = cv.height;
    const rot = this.rot;
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(20,60,20,0.75)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, h - 1);
    const map = (x, y) => {
      if (this.flip) { x = PL - x; y = PW - y; }
      return rot ? [y / PW * w, h - x / PL * h] : [x / PL * w, y / PW * h];
    };
    if (rot) { g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); } else { g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke(); }
    for (let s = 0; s < 2; s++) for (const p of m.P[s]) {
      if (p.off) continue; const [x, y] = map(p.x, p.y);
      g.fillStyle = s === 0 ? m.kits[0].p : m.kits[1].p; g.strokeStyle = '#000';
      g.beginPath(); g.arc(x, y, p === m.ctrl ? 3.6 : 2.6, 0, 7); g.fill(); g.stroke();
    }
    const [bx, by] = map(m.ball.x, m.ball.y);
    g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(bx, by, 2.4, 0, 7); g.fill();
  };

  MF.Renderer = Renderer;
  MF.shade = shade;
  MF.SKIN = SKIN; MF.HAIR = HAIR;
})(typeof window !== 'undefined' ? window : globalThis);
