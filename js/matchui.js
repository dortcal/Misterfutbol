/* MÍSTER FÚTBOL 26·27 — pantalla de partido: VISIONADO, JUGAR y RESULTADO (teletipo) */
(function (G) {
  'use strict';
  const MF = G.MF; const U = MF.U; const DB = MF.DB; const GFX = MF.GFX; const A = MF.Audio; const UI = MF.UI;
  const esc = U.esc;
  const MUI = {};

  // ---------- narración
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  MUI.comment = function (ev, m, w) {
    const P = (id) => (w.players[id] ? w.players[id].short : '');
    const T = (s) => m.T[s].short;
    switch (ev.type) {
      case 'goal': return ev.own ? pick(['¡Gol en propia puerta! Desgracia para el ' + T(1 - ev.side) + '.', '¡Autogol! El balón acaba dentro tras tocar en un defensa.']) :
        pick(['¡GOOOL de ' + P(ev.pid) + '! ', '¡Golazo de ' + P(ev.pid) + '! ', '¡' + P(ev.pid) + ' no perdona! ']) + (ev.assist ? 'Asistencia de ' + P(ev.assist) + '.' : '');
      case 'save': return pick(['¡Paradón de ' + P(ev.pid) + '!', 'Mano salvadora de ' + P(ev.pid) + '.', '¡Qué reflejos de ' + P(ev.pid) + '!', P(ev.pid) + ' saca una mano providencial.']);
      case 'catch': return pick(['Blocaje seguro de ' + P(ev.pid) + '.', P(ev.pid) + ' atrapa el balón sin problemas.']);
      case 'post': return pick(['¡Al palo! ¡Uyyy!', '¡La madera lo evita!', '¡El poste escupe el balón!']);
      case 'yellow': return 'Tarjeta amarilla para ' + P(ev.pid) + '.';
      case 'red': return '¡Roja! ' + P(ev.pid) + ' se va a la calle.';
      case 'foul': return ev.sev > 0.5 ? pick(['¡Segada durísima de ' + P(ev.pid) + '!', '¡Qué entrada de ' + P(ev.pid) + '! El árbitro saca la tarjeta del bolsillo…']) : pick(['Falta de ' + P(ev.pid) + '.', 'El árbitro pita falta.', 'Entrada dura de ' + P(ev.pid) + '.']);
      case 'penalty': return '¡PENALTI a favor del ' + T(ev.side) + '!';
      case 'offside': return 'Fuera de juego de ' + P(ev.pid) + '.';
      case 'corner': return 'Córner para el ' + T(ev.side) + '.';
      case 'goalkick': return 'Fuera de meta. Saque de puerta para el ' + T(ev.side) + '.';
      case 'header': return 'Remate de cabeza de ' + P(ev.pid) + '…';
      case 'sub': return 'Cambio en el ' + T(ev.side) + ': entra ' + P(ev.pid) + ', sale ' + P(ev.out) + '.';
      case 'injury': return P(ev.pid) + ' se duele en el suelo. Parece lesionado.';
      case 'steal': return null;
      case 'halftime': return 'Final de la primera parte.';
      case 'second': return 'Comienza la segunda parte.';
      case 'end': return 'Final del partido.';
      default: return null;
    }
  };

  MUI.statRow = function (l, a, b, kits) {
    const t = a + b;
    const bar = (v, c) => (v > 0 ? '<i style="width:' + (v / t * 100) + '%;background:' + c + ';box-shadow:inset 0 0 0 1px rgba(0,0,0,.45)"></i>' : '');
    return '<div class="stat-row"><b class="center">' + a + '</b><div><div class="lbl">' + l + '</div><div class="bars" style="background:' + (t ? 'transparent' : '#9aa0a6') + '">' + bar(a, kits[0].p) + bar(b, kits[1].p) + '</div></div><b class="center">' + b + '</b></div>';
  };

  MUI.start = function (cfg) {
    const w = cfg.world;
    cfg.kits = cfg.kits || GFX.pickKits(w.teams[cfg.home], w.teams[cfg.away]);
    if (cfg.mode === 'resultado') MUI.teletipo(cfg); else MUI.intro(cfg);
  };

  // ---------- presentación previa
  MUI.intro = function (cfg) {
    const w = cfg.world; const th = w.teams[cfg.home], ta = w.teams[cfg.away];
    const xi = (L) => L.xi.map((id, i) => { const p = w.players[id]; return '<div>' + p.num + ' · ' + esc(p.short) + ' <span class="muted">' + DB.FORMATIONS[L.formation][i][0] + '</span></div>'; }).join('');
    const clima = { dia: 'Tarde soleada', noche: 'Partido nocturno', lluvia: 'Lluvia intensa' }[cfg.weather || 'dia'];
    UI.show(UI.head(cfg.label || 'Partido amistoso', esc(th.stadium) + ' · ' + clima, cfg.manager ? null : 'back') + '<div class="wrap">' +
      '<div class="panel vs-card"><div>' + GFX.badgeImg(th, 72) + '<div class="tn">' + esc(th.name) + '</div><img src="' + GFX.shirt(cfg.kits[0], 64) + '" width="40" height="40" alt=""></div><div class="vs">VS</div><div>' + GFX.badgeImg(ta, 72) + '<div class="tn">' + esc(ta.name) + '</div><img src="' + GFX.shirt(cfg.kits[1], 64) + '" width="40" height="40" alt=""></div></div>' +
      '<div class="grid2"><div class="panel"><h3>' + esc(th.short) + ' · ' + cfg.lhome.formation + '</h3><div class="grid2" style="gap:2px 10px;font-size:15px">' + xi(cfg.lhome) + '</div></div><div class="panel"><h3>' + esc(ta.short) + ' · ' + cfg.laway.formation + '</h3><div class="grid2" style="gap:2px 10px;font-size:15px">' + xi(cfg.laway) + '</div></div></div>' +
      (cfg.human >= 0 ? '<div class="panel"><b>Controles (un solo botón):</b> flechas o WASD para moverte; el jugador sigue corriendo en la última dirección. <b>Espacio</b> (o X/Z): toque corto = pase, mantener = tiro (más tiempo, más potencia). Justo después de tirar, pulsa hacia un lado para dar efecto al balón. Sin balón: toque = entrada o cambio de jugador, mantener = segada más larga. P = pausa. En pantalla táctil: joystick y botón de acción.</div>' : '') +
      '<button class="bar gold" data-act="go" data-key="Enter" autofocus><span class="n">▶</span><span class="t">' + (cfg.human >= 0 ? 'Saltar al campo' : 'Comenzar el partido') + '</span></button></div>',
      { go: () => MUI.toss(cfg), back: () => cfg.onExit && cfg.onExit() });
  };


  // ---------- sorteo: cara o cruz para elegir saque o campo
  MUI.toss = function (cfg) {
    const w = cfg.world; const T = [w.teams[cfg.home], w.teams[cfg.away]];
    // la persona pide para su equipo (o para el local en un visionado neutral)
    const me = cfg.human >= 0 ? cfg.human : (cfg.userSide !== undefined && cfg.userSide >= 0 ? cfg.userSide : 0);
    const cpu = 1 - me;
    const portrait = G.innerHeight > G.innerWidth * 1.08;
    const dirTxt = (d) => (portrait ? (d === 1 ? '▲ Atacar hacia arriba' : '▼ Atacar hacia abajo') : (d === 1 ? 'Atacar hacia la derecha ▶' : '◀ Atacar hacia la izquierda'));
    const res = { kick: null, end: null }; // kick: equipo que saca; end: {team, dir}
    const coin = '<div class="coin-wrap"><div class="coin" id="coin"><div class="face cara"><span class="cf-star">★</span><span>CARA</span></div><div class="face cruz"><span class="cf-cross">✚</span><span>CRUZ</span></div></div></div>';
    const head = UI.head('Sorteo inicial', esc(T[0].short) + ' – ' + esc(T[1].short) + ' · el ganador elige saque o campo', null);
    const finish = () => {
      if (res.kick === null) res.kick = 1 - res.end.team;
      if (!res.end) res.end = { team: 1 - res.kick, dir: U.R() < 0.5 ? 1 : -1 };
      cfg.kickoff = res.kick;
      cfg.dirHome = res.end.team === 0 ? res.end.dir : -res.end.dir;
      const msg = esc(T[res.kick].short) + ' saca de centro en la primera parte; ' + esc(T[1 - res.kick].short) + ' en la segunda. ' + esc(T[res.end.team].short) + ' elige campo.';
      UI.show(head + '<div class="wrap">' + coin + '<div class="panel center"><p class="big" style="margin:0">' + msg + '</p></div><nav class="menu" style="max-width:none"><button class="bar gold" data-act="go" data-key="Enter" autofocus><span class="n">▶</span><span class="t">' + (cfg.human >= 0 ? 'Saltar al campo' : 'Comenzar el partido') + '</span></button></nav></div>', { go: () => MUI.live(cfg) });
    };
    const chooseEnd = (team, title) => {
      UI.show(head + '<div class="wrap"><div class="panel center"><p class="big" style="margin:0">' + title + '</p><p class="muted">Elige hacia qué portería ataca el ' + esc(T[team].short) + ' en la primera parte. En la segunda se cambia de campo.' + (cfg.human >= 0 ? ' Mientras juegas, la cámara siempre muestra a tu equipo atacando hacia delante.' : '') + '</p></div>' +
        '<nav class="menu" style="max-width:none"><button class="bar" data-act="d" data-d="1" autofocus><span class="t">' + dirTxt(1) + '</span></button><button class="bar" data-act="d" data-d="-1"><span class="t">' + dirTxt(-1) + '</span></button></nav></div>',
        { d: (el) => { res.end = { team, dir: +el.dataset.d }; finish(); } });
    };
    const won = (winner) => {
      if (winner === me) {
        UI.show(head + '<div class="wrap">' + coin + '<div class="panel center"><p class="big" style="margin:0">¡Has ganado el sorteo con el ' + esc(T[me].short) + '!</p><p class="muted">Elige: sacar de centro o escoger campo. El rival se queda con la otra opción.</p></div>' +
          '<nav class="menu" style="max-width:none"><button class="bar gold" data-act="kick" autofocus><span class="n">●</span><span class="t">Sacar de centro</span></button><button class="bar" data-act="end"><span class="n">⇄</span><span class="t">Elegir campo</span></button></nav></div>',
          { kick: () => { res.kick = me; res.end = { team: cpu, dir: U.R() < 0.5 ? 1 : -1 }; finish(); }, end: () => chooseEnd(me, 'Elige campo') });
        document.getElementById('coin').classList.add('rest-' + MUI._side);
      } else {
        // el rival decide
        if (U.R() < 0.5) { res.kick = cpu; chooseEnd(me, 'El ' + esc(T[cpu].short) + ' gana el sorteo y elige sacar. Te toca elegir campo.'); }
        else { res.end = { team: cpu, dir: U.R() < 0.5 ? 1 : -1 }; res.kick = me; finish(); }
      }
    };
    UI.show(head + '<div class="wrap">' + coin + '<div class="panel center"><p class="big" style="margin:0">Pides para el ' + esc(T[me].short) + ': ¿cara o cruz?</p></div>' +
      '<nav class="menu" style="max-width:none"><button class="bar gold" data-act="call" data-c="cara" data-key="c" autofocus><span class="n">C</span><span class="t">Cara</span></button><button class="bar gold" data-act="call" data-c="cruz" data-key="x"><span class="n">X</span><span class="t">Cruz</span></button></nav></div>',
      {
        call: (el) => {
          const call = el.dataset.c; const side = U.R() < 0.5 ? 'cara' : 'cruz'; MUI._side = side;
          document.querySelectorAll('[data-act=call]').forEach((b) => { b.disabled = true; });
          const c = document.getElementById('coin'); c.classList.add('flip-' + side); A.sfxPlay('click');
          setTimeout(() => {
            A.sfxPlay(call === side ? 'win' : 'card');
            UI.toast('Ha salido ' + side.toUpperCase() + '. ' + (call === side ? '¡Aciertas!' : 'Gana el ' + T[cpu].short + '.'));
            won(call === side ? me : cpu);
          }, 1900);
        },
      });
  };

  // ---------- partido en directo
  MUI.live = function (cfg) {
    const w = cfg.world;
    A.init(); A.stopMusic(); A.startCrowd();
    UI.inMatch = true; UI.closeModal();
    const touch = cfg.human >= 0 && (('ontouchstart' in G) || (G.matchMedia && G.matchMedia('(pointer: coarse)').matches));
    const S = UI.settings;
    const th = w.teams[cfg.home], ta = w.teams[cfg.away];
    const app = UI.app();
    app.innerHTML = '<div class="match' + (touch ? ' has-touch' : '') + '"><canvas class="field" aria-label="Campo de fútbol, vista cenital"></canvas>' +
      '<div class="hud-top"><div class="score" aria-live="polite"><span class="chip" style="background:' + cfg.kits[0].p + '"></span><span class="tm">' + esc(th.abbr) + '</span><span class="g" id="g0">0</span><span class="g" id="g1">0</span><span class="tm">' + esc(ta.abbr) + '</span><span class="chip" style="background:' + cfg.kits[1].p + '"></span><span class="clock" id="clk">00\'</span></div>' +
      '<div class="hud-btns">' + (cfg.human < 0 ? '<button class="hbtn" id="spd" aria-label="Velocidad">x1</button>' : '') + '<button class="hbtn" id="snd" aria-label="Sonido">' + (A.on ? '♪' : '✕') + '</button><button class="hbtn" id="pau" aria-label="Pausa">❚❚</button></div></div>' +
      ((S.camera || 'total') === 'total' ? '' : '<canvas class="radar" width="110" height="72"></canvas>') + '<div class="ticker" id="tick" hidden></div><div class="banner" id="ban"></div>' +
      (touch ? '<div class="touch"><div class="joy" id="joy"><div class="knob"></div></div><div class="abtn shoot act" id="ba">PASE<br>TIRO</div><div class="power" id="pow" hidden><i></i></div></div>' : (cfg.human >= 0 ? '<div class="keys-help">Flechas mover · ESPACIO: toque = pase, mantener = tiro / segada · clic en un compañero = pase, en un rival = segada · P pausa</div><div class="power" id="pow" hidden><i></i></div>' : '')) +
      '<div id="ovl"></div></div>';
    const root = app.querySelector('.match');
    const canvas = root.querySelector('canvas.field'); const radar = root.querySelector('canvas.radar');
    const hooks = {};
    const m = new MF.Match(w, {
      home: cfg.home, away: cfg.away, lhome: cfg.lhome, laway: cfg.laway, thome: cfg.thome, taway: cfg.taway, kits: cfg.kits,
      human: cfg.human, kickoff: cfg.kickoff, dirHome: cfg.dirHome, duration: (S.duration || 4) * 60, difficulty: cfg.human >= 0 ? S.difficulty : 1, neutral: false, waitHalftime: true,
      manualSubs: cfg.userSide !== undefined && !S.autoSubs ? [cfg.userSide === 0, cfg.userSide === 1] : null, hooks,
    });
    MUI.m = m; MUI.R = null;
    const R = new MF.Renderer(canvas, m, { zoom: S.zoom, weather: cfg.weather, camera: S.camera || 'total', touch }); MUI.R = R;
    if (radar && R.rot) { radar.width = 72; radar.height = 110; }
    let speed = 1, paused = false, ended = false, last = performance.now(), acc = 0, raf = 0, frame = 0, tickT = 0, banT = 0;
    const ban = root.querySelector('#ban'); const tick = root.querySelector('#tick');
    const showTick = (txt) => { if (!txt) return; tick.textContent = txt; tick.hidden = false; tickT = 4; };
    const showBanner = (html, t) => { ban.innerHTML = html; banT = t || 2.4; };
    hooks.sound = (name) => {
      if (name === 'whistle') A.sfxPlay('whistle', 1);
      else A.sfxPlay(name);
    };
    hooks.event = (ev) => {
      const txt = MUI.comment(ev, m, w);
      if (ev.type === 'goal') {
        const p = w.players[ev.pid]; const team = m.T[ev.side];
        showBanner('<div class="big">¡GOOOL!</div><span class="sm">' + (ev.own ? 'En propia puerta' : esc(p ? p.name : '')) + ' · ' + esc(team.short) + ' ' + m.score[0] + '-' + m.score[1] + '</span>', 3);
        R.burst(m.ball.x, m.ball.y, [m.kits[ev.side].p, m.kits[ev.side].s, '#ffd60a', '#ffffff']);
        A.say('¡Gol! ' + (ev.own ? 'en propia puerta' : 'de ' + (p ? p.short : '')));
      }
      if (ev.type === 'yellow' || ev.type === 'red') { showBanner('<span class="card" style="background:' + (ev.type === 'red' ? '#e5202e' : '#ffd60a') + '"></span><span class="sm">' + esc(w.players[ev.pid].short) + '</span>', 1.8); A.sfxPlay('card'); }
      if (ev.type === 'goalkick') showBanner('<div class="big" style="font-size:clamp(30px,7vw,64px)">FUERA DE META</div>', 1.6);
      if (ev.type === 'penalty') showBanner('<div class="big" style="font-size:clamp(36px,9vw,80px)">¡PENALTI!</div>', 2);
      if (ev.type === 'halftime') { A.sfxPlay('whistle', 2); setTimeout(() => halftime(), 900); }
      if (ev.type === 'end') A.sfxPlay('whistle', 3);
      if (ev.type === 'second') showBanner('<span class="sm">Segunda parte</span>', 1.5);
      showTick(txt);
    };
    hooks.end = () => { ended = true; setTimeout(() => finish(m.result()), 1600); };

    // ---- entrada (teclado y táctil)
    const keys = {}; let scr = [0, 0];
    const I = m.input;
    const press = (k, down) => { // un único botón de acción
      if (down) { if (!I._bd) I._bd = performance.now(); }
      else if (I._bd) { I.btnRel = true; I.btnHeldT = (performance.now() - I._bd) / 1000; I._bd = 0; }
    };
    const onKey = (e, down) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].indexOf(k) >= 0) e.preventDefault();
      if (down && (k === 'p' || k === 'escape')) { togglePause(); return; }
      if (paused) return;
      keys[k] = down;
      if (['x', 'j', 'z', 'k', ' ', 'enter'].indexOf(k) >= 0 && !e.repeat) press('btn', down);
      const x = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
      const y = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
      if (!touch || x || y) scr = [x, y];
    };
    const kd = (e) => onKey(e, true), ku = (e) => onKey(e, false);
    G.addEventListener('keydown', kd); G.addEventListener('keyup', ku);
    if (touch) {
      const joy = root.querySelector('#joy'), knob = joy.querySelector('.knob');
      let jid = null;
      const jmove = (e) => {
        const r = joy.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), max = r.width / 2;
        if (d > max) { dx *= max / d; dy *= max / d; }
        knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        scr = [dx / max, dy / max];
      };
      joy.addEventListener('pointerdown', (e) => { jid = e.pointerId; joy.setPointerCapture(jid); jmove(e); });
      joy.addEventListener('pointermove', (e) => { if (e.pointerId === jid) jmove(e); });
      const jend = (e) => { if (e.pointerId === jid) { jid = null; scr = [0, 0]; knob.style.transform = ''; } };
      joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);
      [['#ba', 'btn']].forEach(([sel, k]) => {
        const b = root.querySelector(sel);
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('down'); press(k, true); });
        const up = () => { b.classList.remove('down'); press(k, false); };
        b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      });
    }
    // tocar o hacer clic sobre un jugador: pase a ese compañero o segada sobre ese rival
    if (cfg.human >= 0) {
      canvas.addEventListener('pointerdown', (e) => {
        if (paused || ended) return;
        const r = canvas.getBoundingClientRect();
        const [wx, wy] = R.screenToWorld(e.clientX - r.left, e.clientY - r.top);
        const tol = Math.max(2.2, 26 / R.S); // radio de toque en metros
        let best = null, bd = tol;
        m.all().forEach((p) => { const d = U.dist(p.x, p.y, wx, wy); if (d < bd) { bd = d; best = p; } });
        if (best && m.tapPlayer(best)) e.preventDefault();
      });
    }
    const resize = () => { R.resize(); };
    G.addEventListener('resize', resize);

    // ---- botones HUD
    const spd = root.querySelector('#spd');
    if (spd) spd.addEventListener('click', () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; spd.textContent = 'x' + speed; spd.classList.toggle('on', speed > 1); });
    root.querySelector('#snd').addEventListener('click', (e) => { A.setOn(!A.on); e.currentTarget.textContent = A.on ? '♪' : '✕'; });
    root.querySelector('#pau').addEventListener('click', () => togglePause());
    const ovl = root.querySelector('#ovl');
    const userSide = cfg.userSide !== undefined ? cfg.userSide : cfg.human;

    function togglePause() {
      if (ended) return;
      if (paused) { paused = false; ovl.innerHTML = ''; return; }
      paused = true; pauseMenu();
    }
    function pauseMenu() {
      ovl.innerHTML = '<div class="overlay"><div class="modal"><div class="head"><div class="ttl">Pausa · ' + m.dispMinute() + '\'</div></div><div class="body"><div class="menu" style="max-width:none">' +
        '<button class="bar small" data-o="resume"><span class="n">▶</span><span class="t">Reanudar</span></button>' +
        (userSide >= 0 ? '<button class="bar small" data-o="subs"><span class="n">⇄</span><span class="t">Cambios (' + m.subsLeft[userSide] + ' restantes)</span></button><button class="bar small" data-o="tac"><span class="n">♟</span><span class="t">Táctica</span></button>' : '') +
        '<button class="bar small grey" data-o="quick"><span class="n">»</span><span class="t">Simular hasta el final</span></button>' +
        (cfg.friendly ? '<button class="bar small red" data-o="quit"><span class="n">✕</span><span class="t">Abandonar el partido</span></button>' : '') +
        '</div>' + statsHTML() + '</div></div></div>';
      bindOverlay();
    }
    function bindOverlay() {
      ovl.querySelectorAll('[data-o]').forEach((b) => b.addEventListener('click', () => {
        A.sfxPlay('click');
        const o = b.dataset.o;
        if (o === 'resume') togglePause();
        if (o === 'subs') subsMenu();
        if (o === 'tac') tacMenu();
        if (o === 'quick') { const res = m.finishQuick(); ended = true; finish(res); }
        if (o === 'quit') { cleanup(); cfg.onExit && cfg.onExit(); }
        if (o === 'second') { ovl.innerHTML = ''; paused = false; m.startSecondHalf(); }
        if (o === 'back') { if (m.phase === 'halftime') halftime(); else pauseMenu(); }
      }));
    }
    function statsHTML() {
      const st = m.stats; const tot = st.possT[0] + st.possT[1]; const pos = Math.round(st.possT[0] / tot * 100);
      const row = (l, a, b) => MUI.statRow(l, a, b, cfg.kits);
      return '<div class="panel" style="display:grid;gap:6px">' + row('Posesión %', pos, 100 - pos) + row('Tiros', st.shots[0], st.shots[1]) + row('A puerta', st.onTarget[0], st.onTarget[1]) + row('Córners', st.corners[0], st.corners[1]) + row('Faltas', st.fouls[0], st.fouls[1]) + '</div>';
    }
    function subsMenu() {
      const s = userSide; const onp = m.P[s].filter((p) => !p.off); const bench = m.benchAvail(s);
      let outSel = null;
      const draw = () => {
        ovl.innerHTML = '<div class="overlay"><div class="modal"><div class="head"><div class="ttl">Cambios · quedan ' + m.subsLeft[s] + '</div><button class="btn alt" data-o="back">◀</button></div><div class="body"><p class="muted" style="margin:0">Elige quién sale y después quién entra.</p><div class="cols-2"><div><h3>En el campo</h3><table class="tbl"><tbody>' +
          onp.map((p) => '<tr class="click ' + (outSel === p ? 'me' : '') + '" data-out="' + p.d.id + '"><td>' + p.role + '</td><td>' + esc(p.d.short) + (p.injured ? ' <span class="tag t-inj">LES</span>' : '') + (p.yel ? ' <span class="tag" style="background:#e0a800">TA</span>' : '') + '</td><td>' + UI.fit(p.stam * 100) + '</td></tr>').join('') +
          '</tbody></table></div><div><h3>Banquillo</h3><table class="tbl"><tbody>' + (bench.length ? bench.map((p) => '<tr class="click" data-in="' + p.id + '"><td>' + UI.pos(p) + '</td><td>' + esc(p.short) + '</td><td>' + UI.ovr(p.ovr) + '</td></tr>').join('') : '<tr><td>Sin suplentes disponibles</td></tr>') + '</tbody></table></div></div></div></div></div>';
        bindOverlay();
        ovl.querySelectorAll('[data-out]').forEach((r) => r.addEventListener('click', () => { outSel = onp.find((p) => p.d.id === +r.dataset.out); draw(); }));
        ovl.querySelectorAll('[data-in]').forEach((r) => r.addEventListener('click', () => {
          if (!outSel) { UI.toast('Primero elige quién sale.'); return; }
          if (m.subsLeft[s] <= 0) { UI.toast('Ya no quedan cambios.'); return; }
          if (m.substitute(s, outSel, +r.dataset.in)) { A.sfxPlay('whistle', 1); UI.toast('Cambio realizado.'); if (m.phase === 'halftime') halftime(); else pauseMenu(); }
        }));
      };
      draw();
    }
    function tacMenu() {
      const s = userSide; const t = m.tac[s] = Object.assign({}, m.tac[s]);
      const seg = (k, v, opts) => '<div class="seg">' + opts.map(([x, l]) => '<button class="btn ' + (v === x ? 'on' : '') + '" data-tk="' + k + '" data-tv="' + x + '">' + l + '</button>').join('') + '</div>';
      ovl.innerHTML = '<div class="overlay"><div class="modal"><div class="head"><div class="ttl">Táctica</div><button class="btn alt" data-o="back">◀</button></div><div class="body">' +
        '<div class="row"><b style="min-width:80px">Estilo</b>' + seg('style', t.style, [['defensiva', 'Defensivo'], ['equilibrada', 'Equilibrado'], ['ofensiva', 'Ofensivo']]) + '</div>' +
        '<div class="row"><b style="min-width:80px">Presión</b>' + seg('press', t.press, [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta']]) + '</div>' +
        '<div class="row"><b style="min-width:80px">Pases</b>' + seg('passing', t.passing, [['corto', 'Cortos'], ['mixto', 'Mixtos'], ['largo', 'Largos']]) + '</div></div></div></div>';
      bindOverlay();
      ovl.querySelectorAll('[data-tk]').forEach((b) => b.addEventListener('click', () => { t[b.dataset.tk] = b.dataset.tv; if (cfg.onTactics) cfg.onTactics(t); tacMenu(); }));
    }
    function halftime() {
      paused = true;
      ovl.innerHTML = '<div class="overlay"><div class="modal"><div class="head"><div class="ttl">Descanso · ' + esc(th.short) + ' ' + m.score[0] + '-' + m.score[1] + ' ' + esc(ta.short) + '</div></div><div class="body">' + statsHTML() +
        '<div class="menu" style="max-width:none"><button class="bar small gold" data-o="second"><span class="n">▶</span><span class="t">Segunda parte</span></button>' +
        (userSide >= 0 ? '<button class="bar small" data-o="subs"><span class="n">⇄</span><span class="t">Cambios (' + m.subsLeft[userSide] + ')</span></button><button class="bar small" data-o="tac"><span class="n">♟</span><span class="t">Táctica</span></button>' : '') +
        '<button class="bar small grey" data-o="quick"><span class="n">»</span><span class="t">Simular hasta el final</span></button></div></div></div></div>';
      bindOverlay();
      const fb = ovl.querySelector('[data-o="second"]'); if (fb) fb.focus();
    }
    function cleanup() {
      cancelAnimationFrame(raf); G.removeEventListener('keydown', kd); G.removeEventListener('keyup', ku); G.removeEventListener('resize', resize);
      A.stopCrowd(); UI.inMatch = false; MUI.m = null;
    }
    function finish(res) {
      cleanup();
      MUI.summary(cfg, res);
    }

    // ---- bucle
    const STEP = MF.Match.STEP;
    function loop(now) {
      raf = requestAnimationFrame(loop);
      let dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!paused && !ended) {
        if (m.human >= 0) {
          R.flip = m.dir[m.human] === -1;
          const v = R.screenVecToWorld(scr[0], scr[1]);
          I.mx = v[0]; I.my = v[1];
          const pow = root.querySelector('#pow');
          // barra de potencia: aparece al mantener el botón (tiro o segada)
          const held = I._bd ? (performance.now() - I._bd) / 1000 : 0;
          if (pow) { if (held > 0.22) { pow.hidden = false; pow.firstChild.style.width = Math.min(100, (held - 0.22) / 0.55 * 100) + '%'; } else pow.hidden = true; }
        }
        acc += dt * speed;
        let n = 0;
        while (acc >= STEP && n < 12) { m.step(STEP); acc -= STEP; n++; if (m.phase === 'end' || m.phase === 'halftime') { acc = 0; break; } }
        if (A.crowd) A.crowdLevel(m.excite);
      }
      R.draw(paused ? 0 : dt * speed);
      frame++;
      if (frame % 2 === 0) {
        root.querySelector('#g0').textContent = m.score[0]; root.querySelector('#g1').textContent = m.score[1];
        root.querySelector('#clk').textContent = U.pad2(Math.min(m.dispMinute(), 99)) + '\'';
        if (radar) R.drawRadar(radar);
      }
      if (m.ctrl && m.ctrl.isGK && m.ball.owner === m.ctrl && m.gkAim !== null && m.gkAim !== undefined && tickT <= 0.31) { tick.textContent = 'Portero: apunta y pulsa ' + (touch ? 'el botón' : 'ESPACIO') + ' (mantén para despejar largo)'; tick.hidden = false; tickT = 0.3; }
      if (m.waitingHuman && m.phaseT <= 0) { tick.textContent = touch ? 'Pulsa el botón para sacar de centro' : 'Pulsa ESPACIO para sacar de centro'; tick.hidden = false; tickT = 0.3; }
      if (tickT > 0) { tickT -= dt; if (tickT <= 0) tick.hidden = true; }
      if (banT > 0) { banT -= dt; if (banT <= 0) ban.innerHTML = ''; }
    }
    raf = requestAnimationFrame(loop);
    A.sfxPlay('whistle', 1);
    setTimeout(() => { const kh = root.querySelector('.keys-help'); if (kh) kh.remove(); }, 8000);
  };

  // ---------- resumen final
  MUI.summary = function (cfg, res) {
    const w = cfg.world; const th = w.teams[cfg.home], ta = w.teams[cfg.away];
    UI.inMatch = false;
    const us = cfg.userSide !== undefined ? cfg.userSide : cfg.human;
    if (us >= 0) A.sfxPlay(res.score[us] > res.score[1 - us] ? 'win' : res.score[us] < res.score[1 - us] ? 'lose' : 'click');
    const mvpId = Object.keys(res.ratings).sort((a, b) => res.ratings[b] - res.ratings[a])[0];
    const mvp = w.players[mvpId];
    const evs = res.events.filter((e) => ['goal', 'red', 'yellow', 'sub', 'injury'].indexOf(e.type) >= 0);
    const icon = (e) => ({ goal: '<i class="ev ev-goal" aria-label="Gol"></i>', red: '<i class="ev ev-red" aria-label="Roja"></i>', yellow: '<i class="ev ev-yel" aria-label="Amarilla"></i>', sub: '⇄', injury: '<i class="ev ev-inj" aria-label="Lesión">+</i>' })[e.type];
    const line = (e) => {
      const p = w.players[e.pid]; let t = icon(e) + ' ' + esc(p ? p.short : '');
      if (e.type === 'goal' && e.own) t += ' (p.p.)'; if (e.type === 'goal' && e.pen) t += ' (pen.)';
      if (e.type === 'sub') t = '<span class="muted">⇄ ' + esc(p ? p.short : '') + ' x ' + esc(w.players[e.out] ? w.players[e.out].short : '') + '</span>';
      return t;
    };
    const rows = evs.map((e) => '<span class="l">' + (e.side === 0 ? line(e) : '') + '</span><span class="m">' + e.min + '\'</span><span>' + (e.side === 1 ? line(e) : '') + '</span>').join('');
    const st = res.stats;
    const srow = (l, a, b) => MUI.statRow(l, a, b, cfg.kits);
    UI.show(UI.head('Final del partido', esc(cfg.label || 'Partido amistoso'), null) + '<div class="wrap">' +
      '<div class="panel"><div class="bigscore">' + GFX.badgeImg(th, 56) + '<span>' + esc(th.abbr) + '</span><span>' + res.score[0] + '</span><span class="sep">-</span><span>' + res.score[1] + '</span><span>' + esc(ta.abbr) + '</span>' + GFX.badgeImg(ta, 56) + '</div>' +
      (evs.length ? '<div class="evlist" style="margin-top:10px">' + rows + '</div>' : '<p class="center muted">Sin goles ni incidencias destacadas.</p>') + '</div>' +
      '<div class="grid2"><div class="panel" style="display:grid;gap:6px"><h3>Estadísticas</h3>' + srow('Posesión %', st.poss[0], st.poss[1]) + srow('Tiros', st.shots[0], st.shots[1]) + srow('A puerta', st.onTarget[0], st.onTarget[1]) + srow('Córners', st.corners[0], st.corners[1]) + srow('Faltas', st.fouls[0], st.fouls[1]) + '</div>' +
      '<div class="panel"><h3>Mejor jugador</h3>' + (mvp ? '<div class="pcard"><img class="face" src="' + GFX.face(mvp, w.teams[mvp.team].kit.home.p, 76) + '" width="76" height="76" alt=""><div><div class="big">' + esc(mvp.name) + '</div><div>' + esc(w.teams[mvp.team].short) + ' · nota ' + res.ratings[mvpId].toFixed(1) + '</div></div></div>' : '') + '</div></div>' +
      '<nav class="menu" style="max-width:none">' + (cfg.onEnd ? '<button class="bar gold" data-act="cont" data-key="Enter" autofocus><span class="n">▶</span><span class="t">Continuar</span></button>' :
        '<button class="bar gold" data-act="again" autofocus><span class="n">↻</span><span class="t">Revancha</span></button><button class="bar" data-act="exit" data-key="Escape"><span class="n">◀</span><span class="t">Volver al amistoso</span></button>') + '</nav></div>',
      { cont: () => cfg.onEnd(res), again: () => MUI.start(cfg), exit: () => cfg.onExit && cfg.onExit() });
    if (UI.wantMusic && A.on) setTimeout(() => A.startMusic(), 800);
  };

  // ---------- modo RESULTADO: teletipo
  MUI.teletipo = function (cfg) {
    const w = cfg.world; const th = w.teams[cfg.home], ta = w.teams[cfg.away];
    A.init();
    const res = cfg.precomputed || MF.SIM.play(w, { home: cfg.home, away: cfg.away, lhome: cfg.lhome, laway: cfg.laway, neutral: false });
    const evs = res.events.filter((e) => ['goal', 'red', 'injury'].indexOf(e.type) >= 0);
    UI.show(UI.head(cfg.label || 'Partido amistoso', 'Resultado', null) + '<div class="wrap">' +
      '<div class="panel"><div class="bigscore">' + GFX.badgeImg(th, 56) + '<span>' + esc(th.abbr) + '</span><span id="s0">0</span><span class="sep">-</span><span id="s1">0</span><span>' + esc(ta.abbr) + '</span>' + GFX.badgeImg(ta, 56) + '</div></div>' +
      '<div class="teletipo" aria-live="polite"><div>&gt; ' + esc(th.stadium.toUpperCase()) + ' · MINUTO <span id="tmin">0</span></div><div id="tl"></div></div>' +
      '<nav class="menu" style="max-width:none"><button class="bar" data-act="skip" data-key="Enter" id="skipb" autofocus><span class="n">»</span><span class="t">Ver resultado final</span></button></nav></div>',
      { skip: () => { min = 91; } });
    let min = 0, k = 0; const sc = [0, 0];
    const tl = document.getElementById('tl');
    const iv = setInterval(() => {
      min++;
      const tm = document.getElementById('tmin'); if (!tm) { clearInterval(iv); return; }
      tm.textContent = Math.min(90, min);
      while (k < evs.length && evs[k].min <= min) {
        const e = evs[k++]; const p = w.players[e.pid];
        const team = (e.side === 0 ? th : ta).short.toUpperCase();
        let txt = '', cls = '';
        if (e.type === 'goal') { sc[e.side]++; cls = 'gol'; txt = e.min + '\' GOL DEL ' + team + ': ' + (p ? p.name.toUpperCase() : '') + (e.own ? ' (P.P.)' : '') + ' · ' + sc[0] + '-' + sc[1]; A.sfxPlay('goal'); }
        if (e.type === 'red') { cls = 'roja'; txt = e.min + '\' EXPULSADO ' + (p ? p.name.toUpperCase() : '') + ' (' + team + ')'; }
        if (e.type === 'injury') { txt = e.min + '\' SE LESIONA ' + (p ? p.name.toUpperCase() : '') + ' (' + team + ')'; }
        const d = document.createElement('div'); d.className = 'ln ' + cls; d.textContent = '> ' + txt; tl.appendChild(d);
        document.getElementById('s0').textContent = sc[0]; document.getElementById('s1').textContent = sc[1];
      }
      if (min >= 90) {
        clearInterval(iv);
        while (k < evs.length) { const e = evs[k++]; if (e.type === 'goal') sc[e.side]++; }
        document.getElementById('s0').textContent = res.score[0]; document.getElementById('s1').textContent = res.score[1];
        const d = document.createElement('div'); d.className = 'ln'; d.textContent = '> FINAL DEL PARTIDO'; tl.appendChild(d);
        setTimeout(() => MUI.summary(cfg, res), 900);
      }
    }, 50);
  };

  MF.MUI = MUI;
})(typeof window !== 'undefined' ? window : globalThis);
