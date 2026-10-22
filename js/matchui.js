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
      case 'wall': return pick(['¡Rebota en la barrera!', 'El disparo se estrella en la barrera.']);
      case 'wallset': return 'El ' + T(ev.side) + ' forma una barrera de cuatro jugadores.';
      case 'header': return 'Remate de cabeza de ' + P(ev.pid) + '…';
      case 'sub': return 'Cambio en el ' + T(ev.side) + ': entra ' + P(ev.pid) + ', sale ' + P(ev.out) + '.';
      case 'injury': return P(ev.pid) + ' se duele en el suelo. Parece lesionado.';
      case 'steal': return null;
      case 'halftime': return 'Final de la primera parte.';
      case 'et_break': return '¡Empate en la eliminatoria! Habrá prórroga.';
      case 'et1': return 'Comienza la prórroga.';
      case 'et_half': return 'Descanso de la prórroga.';
      case 'et2': return 'Arranca la segunda parte de la prórroga.';
      case 'shootout': return '¡Todo se decide en los penaltis!';
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
    UI.show(UI.head(cfg.label || 'Partido amistoso', esc(cfg.venue || th.stadium) + (cfg.neutral ? ' (campo neutral)' : '') + ' · ' + clima, cfg.manager ? null : 'back') + '<div class="wrap">' +
      '<div class="panel vs-card"><div>' + GFX.badgeImg(th, 72) + '<div class="tn">' + esc(th.name) + '</div>' + (cfg.players ? '<div class="muted">👤 ' + esc(cfg.players[0]) + '</div>' : '') + '<img src="' + GFX.shirt(cfg.kits[0], 64) + '" width="40" height="40" alt=""></div><div class="vs">VS</div><div>' + GFX.badgeImg(ta, 72) + '<div class="tn">' + esc(ta.name) + '</div>' + (cfg.players ? '<div class="muted">👤 ' + esc(cfg.players[1]) + '</div>' : '') + '<img src="' + GFX.shirt(cfg.kits[1], 64) + '" width="40" height="40" alt=""></div></div>' +
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
      human: cfg.human, kickoff: cfg.kickoff, dirHome: cfg.dirHome, duration: (S.duration || 4) * 60, difficulty: cfg.human >= 0 ? S.difficulty : 1, neutral: !!cfg.neutral, waitHalftime: true,
      manualSubs: cfg.userSide !== undefined && cfg.userSide >= 0 && !S.assistant ? [cfg.userSide === 0, cfg.userSide === 1] : null, hooks,
      drainMul: cfg.simExtra && cfg.simExtra.drainMul,
      // eliminatoria: si acaba igualada (con el global de la ida) hay prórroga y penaltis en el propio partido
      agg: cfg.agg || [0, 0], etCheck: cfg.ko ? (sc) => sc[0] + (cfg.agg ? cfg.agg[0] : 0) === sc[1] + (cfg.agg ? cfg.agg[1] : 0) : null,
    });
    MUI.m = m; MUI.R = null;
    const R = new MF.Renderer(canvas, m, { zoom: S.zoom, weather: cfg.weather, camera: S.camera || 'total', touch }); MUI.R = R;
    if (radar && R.rot) { radar.width = 72; radar.height = 110; }
    let speed = 1, paused = false, ended = false, last = performance.now(), acc = 0, raf = 0, frame = 0, tickT = 0, banT = 0, chantT = 12, tackleT = 0;
    const ban = root.querySelector('#ban'); const tick = root.querySelector('#tick');
    const showTick = (txt) => { if (!txt) return; tick.textContent = txt; tick.hidden = false; tickT = 4; };
    const showBanner = (html, t) => { ban.innerHTML = html; banT = t || 2.4; };
    hooks.sound = (name) => {
      if (name === 'whistle') A.sfxPlay('whistle', 1);
      else if (name === 'post') A.sfxPlay(Math.random() < 0.4 ? 'crossbar' : 'post');
      else A.sfxPlay(name);
    };
    // efectos de ambiente según lo que pasa en el campo
    const crowdFx = (ev) => {
      switch (ev.type) {
        case 'goal': A.sfxPlay('net'); setTimeout(() => A.sfxPlay('applause', 2.5), 600); setTimeout(() => A.sfxPlay('chant', Math.random() < 0.5 ? 'ole' : 'vamos'), 3200); chantT = 25; break;
        case 'goalkick': if (m.ball && m.ball.shotFrom) A.sfxPlay('ooh'); break;
        case 'save': setTimeout(() => A.sfxPlay('applause', 1.2), 300); break;
        case 'header': A.sfxPlay('header'); break;
        case 'steal': if (tackleT <= 0) { A.sfxPlay('tackle'); tackleT = 1.5; } break;
        case 'foul': if (ev.sev > 0.5) A.sfxPlay('whistles', 1.6); break;
        case 'red': setTimeout(() => A.sfxPlay('boo'), 400); break;
        case 'yellow': setTimeout(() => A.sfxPlay('whistles', 1), 300); break;
        case 'penalty': A.crowdSwell(0.8, 2.5); break;
        case 'halftime': case 'end': setTimeout(() => A.sfxPlay('applause', 3), 700); break;
        case 'wall': A.sfxPlay('tackle'); break;
      }
    };
    hooks.event = (ev) => {
      const txt = MUI.comment(ev, m, w);
      try { crowdFx(ev); } catch (e) { /* sonido opcional */ }
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
      if (ev.type === 'et_break') { A.sfxPlay('whistle', 3); showBanner('<div class="big" style="font-size:clamp(34px,8vw,72px)">PRÓRROGA</div>', 2.4); setTimeout(() => halftime('Final de los 90 minutos · Prórroga', 'Empezar la prórroga'), 1400); }
      if (ev.type === 'et_half') { A.sfxPlay('whistle', 2); setTimeout(() => halftime('Descanso de la prórroga', 'Segunda parte de la prórroga'), 900); }
      if (ev.type === 'shootout') { A.sfxPlay('whistle', 3); showBanner('<div class="big" style="font-size:clamp(30px,7vw,64px)">PENALTIS</div>', 2); }
      if (ev.type === 'end') A.sfxPlay('whistle', 3);
      if (ev.type === 'second') showBanner('<span class="sm">Segunda parte</span>', 1.5);
      showTick(txt);
    };
    hooks.end = () => { ended = true; setTimeout(() => finish(m.result()), 1600); };
    // tanda de penaltis animada lanzamiento a lanzamiento
    hooks.shootout = (so) => {
      setTimeout(() => {
        paused = true; const sc = [0, 0]; let i = 0;
        const row = (side) => so.kicks.filter((k, j) => j < i && k.side === side).map((k) => '<span class="pk ' + (k.goal ? 'g' : 'f') + '">' + (k.goal ? '●' : '✕') + '</span>').join('');
        const draw = (msg) => {
          ovl.innerHTML = '<div class="overlay"><div class="modal"><div class="head"><div class="ttl">Tanda de penaltis</div></div><div class="body"><div class="shootout">' +
            '<div class="so-team">' + GFX.badgeImg(th, 40) + '<b>' + esc(th.short) + '</b><span class="so-row">' + row(0) + '</span><span class="so-n">' + sc[0] + '</span></div>' +
            '<div class="so-team">' + GFX.badgeImg(ta, 40) + '<b>' + esc(ta.short) + '</b><span class="so-row">' + row(1) + '</span><span class="so-n">' + sc[1] + '</span></div>' +
            '<p class="so-msg">' + msg + '</p></div></div></div></div>';
        };
        draw('Se preparan los lanzadores…');
        const next = () => {
          if (i >= so.kicks.length) {
            const wn = sc[0] > sc[1] ? th : ta; draw('<b>¡' + esc(wn.short) + ' gana en los penaltis (' + sc[0] + '-' + sc[1] + ')!</b>'); A.sfxPlay('win');
            setTimeout(() => { ovl.innerHTML = ''; paused = false; m.finishShootout(so.p); }, 2600); return;
          }
          const k = so.kicks[i]; const p = w.players[k.pid];
          draw(esc(p ? p.name : '') + ' coge el balón…');
          setTimeout(() => {
            i++; if (k.goal) sc[k.side]++;
            draw(k.goal ? '¡GOL de ' + esc(p ? p.short : '') + '!' : k.miss ? '¡Fuera! ' + esc(p ? p.short : '') + ' lo manda lejos.' : '¡PARADA! ' + esc(w.players[k.gk] ? w.players[k.gk].short : 'el portero') + ' adivina el lanzamiento.');
            A.sfxPlay(k.goal ? 'goal' : 'save');
            setTimeout(next, 1100);
          }, 900);
        };
        setTimeout(next, 900);
      }, 1500);
    };

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
    // Pantalla táctil / ratón sobre el campo:
    //  · toque sobre un compañero = pase (también en saques) · toque sobre un rival = segada del defensa más cercano
    //  · mantener pulsado en cualquier otro punto = el balón va allí (en la portería, tiro muy preciso)
    if (cfg.human >= 0) {
      let tp = null;
      const toWorld = (e) => { const r = canvas.getBoundingClientRect(); return R.screenToWorld(e.clientX - r.left, e.clientY - r.top); };
      const playerAt = (wx, wy) => { const tol = Math.max(2.2, 26 / R.S); let best = null, bd = tol; m.all().forEach((p) => { const d = U.dist(p.x, p.y, wx, wy); if (d < bd) { bd = d; best = p; } }); return best; };
      canvas.addEventListener('pointerdown', (e) => {
        if (paused || ended) return;
        const [wx, wy] = toWorld(e); tp = { id: e.pointerId, t: performance.now(), p: playerAt(wx, wy) };
        try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ }
        const t0 = tp; setTimeout(() => { if (tp === t0 && !tp.p) m.aimPoint = [wx, wy]; }, 200); // puntería aunque no se mueva el dedo
        e.preventDefault();
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!tp || tp.id !== e.pointerId) return;
        const [wx, wy] = toWorld(e); if (!tp.p || U.dist(tp.p.x, tp.p.y, wx, wy) > 4) tp.p = null;
        if (performance.now() - tp.t > 200) m.aimPoint = [wx, wy];
      });
      const tpEnd = (e) => {
        if (!tp || tp.id !== e.pointerId) return;
        const held = (performance.now() - tp.t) / 1000; const [wx, wy] = toWorld(e);
        m.aimPoint = null;
        if (tp.p && held < 0.45) m.tapPlayer(tp.p);
        else if (held >= 0.2 && !paused && !ended) m.kickToPoint(wx, wy, held);
        tp = null;
      };
      canvas.addEventListener('pointerup', tpEnd); canvas.addEventListener('pointercancel', (e) => { tp = null; m.aimPoint = null; });
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
        if (o === 'second') { ovl.innerHTML = ''; paused = false; m.resumeBreak(); }
        if (o === 'back') { if (m.phase === 'halftime') halftime(MUI._htTitle, MUI._htBtn); else pauseMenu(); }
      }));
    }
    function statsHTML() {
      const row = (l, a, b) => MUI.statRow(l, a, b, cfg.kits);
      if (m.director && m.dres) {   // estadísticas del motor de simulación (las mismas que decide el partido)
        const st = m.dres.stats; const tp = st.possT[0] + st.possT[1]; const pos = tp ? Math.round(st.possT[0] / tp * 100) : 50;
        return '<div class="panel" style="display:grid;gap:6px">' + row('Posesión %', pos, 100 - pos) + row('Tiros', st.shots[0], st.shots[1]) + row('A puerta', st.onTarget[0], st.onTarget[1]) + row('Goles esperados (xG)', +st.xg[0].toFixed(1), +st.xg[1].toFixed(1)) + row('Córners', st.corners[0], st.corners[1]) + row('Faltas', st.fouls[0], st.fouls[1]) + '</div>';
      }
      const st = m.stats; const tot = st.possT[0] + st.possT[1]; const pos = Math.round(st.possT[0] / tot * 100);
      return '<div class="panel" style="display:grid;gap:6px">' + row('Posesión %', pos, 100 - pos) + row('Tiros', st.shots[0], st.shots[1]) + row('A puerta', st.onTarget[0], st.onTarget[1]) + row('Córners', st.corners[0], st.corners[1]) + row('Faltas', st.fouls[0], st.fouls[1]) + '</div>';
    }
    function subsMenu(done) {
      done = done || [];
      const s = userSide; const onp = m.P[s].filter((p) => !p.off); const bench = m.benchAvail(s);
      let outSel = null;
      const draw = () => {
        ovl.innerHTML = '<div class="overlay"><div class="modal"><div class="head"><div class="ttl">Cambios · quedan ' + m.subsLeft[s] + '</div><button class="btn goldb" data-o="back">' + (done.length ? '✓ Listo' : '◀') + '</button></div><div class="body"><p class="muted" style="margin:0">Elige quién sale y después quién entra. Puedes hacer varios cambios seguidos.' + (done.length ? '<br><b>Cambios hechos:</b> ' + done.map(esc).join(' · ') : '') + '</p><div class="cols-2"><div><h3>En el campo</h3><table class="tbl"><tbody>' +
          onp.map((p) => '<tr class="click ' + (outSel === p ? 'me' : '') + '" data-out="' + p.d.id + '"><td>' + p.role + '</td><td>' + UI.ovr(p.d.ovr) + ' ' + esc(p.d.short) + (p.injured ? ' <span class="tag t-inj">LES</span>' : '') + (p.yel ? ' <span class="tag" style="background:#e0a800">TA</span>' : '') + '</td><td>' + UI.fit(p.stam * 100) + '</td></tr>').join('') +
          '</tbody></table></div><div><h3>Banquillo</h3><table class="tbl"><tbody>' + (bench.length ? bench.map((p) => '<tr class="click" data-in="' + p.id + '"><td>' + UI.pos(p) + '</td><td>' + esc(p.short) + '</td><td>' + UI.ovr(p.ovr) + '</td></tr>').join('') : '<tr><td>Sin suplentes disponibles</td></tr>') + '</tbody></table></div></div></div></div></div>';
        bindOverlay();
        ovl.querySelectorAll('[data-out]').forEach((r) => r.addEventListener('click', () => { outSel = onp.find((p) => p.d.id === +r.dataset.out); draw(); }));
        ovl.querySelectorAll('[data-in]').forEach((r) => r.addEventListener('click', () => {
          if (!outSel) { UI.toast('Primero elige quién sale.'); return; }
          if (m.subsLeft[s] <= 0) { UI.toast('Ya no quedan cambios.'); return; }
          // se queda en el menú para poder programar varios cambios seguidos
          if (m.substitute(s, outSel, +r.dataset.in)) { A.sfxPlay('whistle', 1); done.push(outSel.d.short + ' ⇄ ' + (w.players[+r.dataset.in] ? w.players[+r.dataset.in].short : '')); subsMenu(done); }
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
      ovl.querySelectorAll('[data-tk]').forEach((b) => b.addEventListener('click', () => { t[b.dataset.tk] = b.dataset.tv; m.retune(); if (m.dres) m.dres.tacMod[s] = null; if (cfg.onTactics) cfg.onTactics(t); tacMenu(); }));
    }
    function halftime(title, btn) {
      paused = true; MUI._htTitle = title; MUI._htBtn = btn;
      const agg = cfg.agg && m.half >= 2.5 ? ' · global ' + (m.score[0] + cfg.agg[0]) + '-' + (m.score[1] + cfg.agg[1]) : '';
      ovl.innerHTML = '<div class="overlay"><div class="modal"><div class="head"><div class="ttl">' + esc(title || 'Descanso') + ' · ' + esc(th.short) + ' ' + m.score[0] + '-' + m.score[1] + ' ' + esc(ta.short) + agg + '</div></div><div class="body">' + (m.half === 2.5 ? '<p style="margin:0 0 6px"><b>La eliminatoria está igualada.</b> Se juega una prórroga de 30 minutos y, si sigue el empate, penaltis. Tienes un cambio más.</p>' : '') + statsHTML() +
        '<div class="menu" style="max-width:none"><button class="bar small gold" data-o="second"><span class="n">▶</span><span class="t">' + esc(btn || 'Segunda parte') + '</span></button>' +
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
        // cánticos y palmas de la grada de vez en cuando
        tackleT -= dt; chantT -= dt;
        if (chantT <= 0 && m.phase === 'play') { A.sfxPlay('chant'); chantT = 22 + Math.random() * 30; }
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
        root.querySelector('#clk').textContent = U.pad2(Math.min(m.dispMinute(), 120)) + '\'';
        if (radar) R.drawRadar(radar);
      }
      if (m.ctrl && m.ctrl.isGK && m.ball.owner === m.ctrl && m.gkAim !== null && m.gkAim !== undefined && tickT <= 0.31) { tick.textContent = 'Portero: apunta y pulsa ' + (touch ? 'el botón' : 'ESPACIO') + ' (mantén para despejar largo)'; tick.hidden = false; tickT = 0.3; }
      if (m.waitingHuman && m.phaseT <= 0 && m.restart) {
        const nm = { kickoff: 'Saque de centro', corner: 'Córner', free: 'Falta', penalty: 'Penalti', throw: 'Saque de banda' }[m.restart.type] || 'Saque';
        tick.textContent = nm + ': toca a un compañero, mantén pulsado en un punto para lanzar allí' + (touch ? ' o usa el botón' : ' o pulsa ESPACIO (mantén = tiro)');
        tick.hidden = false; tickT = 0.3;
      }
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
    if (MF.ACH) MF.ACH.matchEnd(cfg, res);
    const cupDraw = cfg.cup && !res.decided && res.score[0] === res.score[1];
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
      (evs.length ? '<div class="evlist" style="margin-top:10px">' + rows + '</div>' : '<p class="center muted">Sin goles ni incidencias destacadas.</p>') +
      (res.et || res.pens ? '<p class="center" style="margin:8px 0 0;font-weight:800">' + (res.et ? 'Tras la prórroga' : '') + (res.pens ? (res.et ? ' · ' : '') + 'Penaltis: ' + esc(th.short) + ' ' + res.pens[0] + '-' + res.pens[1] + ' ' + esc(ta.short) : '') + '</p>' : '') +
      (cfg.players ? '<p class="center big" style="margin:10px 0 0">' + (function () { const ws = res.decided ? res.winSide : res.score[0] > res.score[1] ? 0 : res.score[1] > res.score[0] ? 1 : -1; return ws < 0 ? '🤝 Empate entre ' + esc(cfg.players[0]) + ' y ' + esc(cfg.players[1]) : '🏆 ¡Gana ' + esc(cfg.players[ws]) + ' con el ' + esc((ws === 0 ? th : ta).short) + '!'; })() + '</p>' : '') +
      (cfg.agg && res.decided ? '<p class="center" style="margin:4px 0 0">Global: ' + esc(th.short) + ' ' + (res.score[0] + cfg.agg[0]) + '-' + (res.score[1] + cfg.agg[1]) + ' ' + esc(ta.short) + ' · <b>se clasifica el ' + esc((res.winSide === 0 ? th : ta).short) + '</b></p>' : (res.decided ? '<p class="center" style="margin:4px 0 0"><b>Gana el ' + esc((res.winSide === 0 ? th : ta).short) + '</b></p>' : '')) +
      (function () { const cap = cfg.capacity || th.cap; let att = cfg.attendance; if (!att && cap) { const fill = U.clamp(0.55 + (Math.max(th.base || 70, ta.base || 70) - 70) * 0.02 + (cfg.friendly ? -0.1 : 0) + ((U.hash(cfg.home + cfg.away) % 12) - 6) / 100, 0.3, 0.99); att = Math.round(cap * fill); } return att && cap ? '<p class="center muted" style="margin:8px 0 0">🏟️ ' + att.toLocaleString('es-ES') + ' espectadores · ' + Math.round(att / cap * 100) + '% del aforo de ' + esc(cfg.venue || th.stadium) + ' (' + cap.toLocaleString('es-ES') + ')</p>' : ''; })() +
      (cupDraw ? '<p class="center" style="margin:10px 0 0"><b>Empate al final de los 90 minutos:</b> la eliminatoria se decide en la prórroga y, si hace falta, en la tanda de penaltis. Pulsa Continuar para conocer el desenlace.</p>' : '') + '</div>' +
      '<div class="grid2"><div class="panel" style="display:grid;gap:6px"><h3>Estadísticas</h3>' + srow('Posesión %', st.poss[0], st.poss[1]) + srow('Tiros', st.shots[0], st.shots[1]) + srow('A puerta', st.onTarget[0], st.onTarget[1]) + srow('Córners', st.corners[0], st.corners[1]) + srow('Faltas', st.fouls[0], st.fouls[1]) +
      (st.xg ? srow('Goles esperados (xG)', +st.xg[0].toFixed(1), +st.xg[1].toFixed(1)) + srow('Paradas', st.saves[0], st.saves[1]) + (st.passes && st.passes[0] ? srow('Pases', st.passes[0], st.passes[1]) + srow('Acierto en el pase %', Math.round(st.passOk[0] / Math.max(1, st.passes[0]) * 100), Math.round(st.passOk[1] / Math.max(1, st.passes[1]) * 100)) : '') : '') + '</div>' +
      '<div class="panel"><h3>Mejor jugador</h3>' + (mvp ? '<div class="pcard"><img class="face" src="' + GFX.face(mvp, w.teams[mvp.team].kit.home.p, 76) + '" width="76" height="76" alt=""><div><div class="big">' + esc(mvp.name) + '</div><div>' + esc(w.teams[mvp.team].short) + ' · nota ' + res.ratings[mvpId].toFixed(1) + '</div></div></div>' : '') + '</div></div>' +
      '<nav class="menu" style="max-width:none">' + (cfg.onEnd ? '<button class="bar gold" data-act="cont" data-key="Enter" autofocus><span class="n">▶</span><span class="t">Continuar</span></button>' :
        '<button class="bar gold" data-act="again" autofocus><span class="n">↻</span><span class="t">Revancha</span></button><button class="bar" data-act="exit" data-key="Escape"><span class="n">◀</span><span class="t">Volver al amistoso</span></button>') + '</nav></div>',
      { cont: () => cfg.onEnd(res), again: () => MUI.start(cfg), exit: () => cfg.onExit && cfg.onExit() });
    if (UI.wantMusic && A.on) setTimeout(() => A.startMusic(), 800);
  };

  // ---------- modo RESULTADO: teletipo interactivo (se simula minuto a minuto)
  // Puedes pausar para cambiar la táctica y hacer sustituciones, o dejar que dirija el segundo entrenador.
  MUI.teletipo = function (cfg) {
    const w = cfg.world; const th = w.teams[cfg.home], ta = w.teams[cfg.away];
    const S = UI.settings; A.init();
    const us = cfg.userSide !== undefined ? cfg.userSide : -1;
    const R = U.rng(cfg.seed || (Date.now() >>> 0));
    let L = [JSON.parse(JSON.stringify(cfg.lhome)), JSON.parse(JSON.stringify(cfg.laway))];
    const TT = [Object.assign({}, cfg.thome || th), Object.assign({}, cfg.taway || ta)];
    const ex = cfg.simExtra || {};
    let res = null, min = 0, paused = false, speed = S.teleSpeed || 2, timer = null, done = false, iv = null, et = false;
    const agg = cfg.agg || [0, 0];
    const level = () => res.score[0] + agg[0] === res.score[1] + agg[1];
    const simTo = (to, auto) => { res = MF.SIM.play(w, Object.assign({}, ex, { home: cfg.home, away: cfg.away, lhome: L[0], laway: L[1], thome: TT[0], taway: TT[1], neutral: !!cfg.neutral, rng: R, fromMinute: min, toMinute: to, endMinute: et ? 120 : 90, base: res, autoSubs: auto || autoS(), coach: coachFlags() })); L = res.L; min = to; };
    const decide = (pens) => { if (!cfg.ko) return; res.decided = true; res.et = et; if (pens) res.pens = pens; const t0 = res.score[0] + agg[0], t1 = res.score[1] + agg[1]; res.winSide = t0 > t1 ? 0 : t1 > t0 ? 1 : (res.pens[0] > res.pens[1] ? 0 : 1); };
    const onPitch = (s) => { const reds = new Set(res.events.filter((e) => e.type === 'red' && e.side === s).map((e) => e.pid)); return L[s].xi.filter((id) => id !== null && !reds.has(id)); };
    const sc = [0, 0]; const evShown = new Set();
    const stars = cfg.assistantStars === undefined ? 3 : cfg.assistantStars;
    const assist = () => !!S.assistant;
    const name = (id) => (w.players[id] ? w.players[id].short : '');
    UI.show(UI.head(cfg.label || 'Partido amistoso', esc(cfg.venue || th.stadium) + (cfg.neutral ? ' (campo neutral)' : '') + ' · Resultado', null) + '<div class="wrap">' +
      '<div class="panel"><div class="bigscore">' + GFX.badgeImg(th, 56) + '<span>' + esc(th.abbr) + '</span><span id="s0">0</span><span class="sep">-</span><span id="s1">0</span><span>' + esc(ta.abbr) + '</span>' + GFX.badgeImg(ta, 56) + '</div></div>' +
      '<div class="teletipo" aria-live="polite"><div>&gt; ' + esc((cfg.venue || th.stadium).toUpperCase()) + ' · MINUTO <span id="tmin">0</span></div><div id="tl"></div></div>' +
      '<div class="tele-ctl">' +
      (us >= 0 ? '<button class="bar small" data-act="pause" data-key="p"><span class="n">⏸</span><span class="t">Pausa · táctica y cambios</span></button>' : '') +
      '<button class="bar small grey" data-act="speed"><span class="n">»</span><span class="t">Velocidad <b id="spdv">x' + speed + '</b></span></button>' +
      (us >= 0 ? '<button class="bar small grey" data-act="assist"><span class="n">🧑‍💼</span><span class="t">Dirige el 2º entrenador: <b id="asv">' + (assist() ? 'SÍ' : 'NO') + '</b></span></button>' : '') +
      '<button class="bar small" data-act="skip" data-key="Enter" id="skipb"><span class="n">⏭</span><span class="t">Ver resultado final</span></button></div><div id="tovl"></div></div>',
      {
        skip: () => { finishFast(); },
        speed: () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; S.teleSpeed = speed; UI.saveSettings(); document.getElementById('spdv').textContent = 'x' + speed; restart(); },
        assist: () => { S.assistant = !S.assistant; UI.saveSettings(); document.getElementById('asv').textContent = assist() ? 'SÍ' : 'NO'; UI.toast(assist() ? 'El segundo entrenador hará los cambios y ajustes.' : 'Tú decides los cambios: el partido se parará en el descanso.'); },
        pause: () => { if (!done) openPanel(''); },
      });
    const tl = document.getElementById('tl');
    const line = (txt, cls) => { const d = document.createElement('div'); d.className = 'ln ' + (cls || ''); d.textContent = '> ' + txt; tl.appendChild(d); tl.scrollTop = tl.scrollHeight; };
    const tickMs = () => ({ 1: 260, 2: 110, 4: 35 }[speed] || 110);
    function restart() { if (iv) clearInterval(iv); if (!paused && !done) iv = setInterval(step, tickMs()); }
    function autoS() { return [us === 0 ? assist() : true, us === 1 ? assist() : true]; }
    // decisiones del segundo entrenador (o de la IA rival) durante el partido
    // el cambio de plan según el marcador lo decide el propio motor (SIM.coach) para la IA y el segundo entrenador
    function coachFlags() { const a = autoS(); if (us >= 0 && stars < 2) a[us] = false; return a; }
    function step() {
      if (paused || done) return;
      if (!document.getElementById('tmin')) { clearInterval(iv); return; }
      const m = min + 1;
      simTo(m);
      document.getElementById('tmin').textContent = m;
      let stop = '';
      res.events.forEach((e, i) => {
        if (evShown.has(i) || e.min > m) return; evShown.add(i);
        const team = (e.side === 0 ? th : ta).short.toUpperCase(); const nm = name(e.pid).toUpperCase();
        if (e.type === 'goal') { sc[e.side]++; line(e.min + '\' GOL DEL ' + team + ': ' + nm + (e.own ? ' (P.P.)' : e.pen ? ' (PEN.)' : '') + ' · ' + sc[0] + '-' + sc[1], 'gol'); A.sfxPlay('goal'); A.sfxPlay('net'); if (speed < 4) setTimeout(() => A.sfxPlay('chant', 'ole'), 900); }
        if (e.type === 'red') line(e.min + '\' EXPULSADO ' + nm + ' (' + team + ')', 'roja');
        if (e.type === 'injury') { line(e.min + '\' SE LESIONA ' + nm + ' (' + team + ')'); if (e.side === us && !assist() && L[us].xi.indexOf(e.pid) >= 0) stop = 'Lesión de ' + name(e.pid) + ': haz un cambio.'; }
        if (e.type === 'sub') line(e.min + '\' CAMBIO EN EL ' + team + ': ENTRA ' + nm + ', SALE ' + name(e.out).toUpperCase(), 'cambio');
        if (e.type === 'save' && (e.big || e.kind === 'pen') && e.pid) line(e.min + '\' ¡' + (e.kind === 'pen' ? 'PENALTI PARADO' : 'PARADÓN') + ' DE ' + nm + '! (' + team + ') A ' + name(e.shooter).toUpperCase());
        if (e.type === 'chance') line(e.min + '\' ' + (e.out === 'post' ? '¡AL PALO! ' + nm + ' (' + team + ')' : e.kind === 'pen' ? nm + ' (' + team + ') FALLA EL PENALTI' : e.out === 'block' ? '¡QUÉ OCASIÓN! LA DEFENSA BLOQUEA EL REMATE DE ' + nm + ' (' + team + ')' : '¡SE LE ESCAPA A ' + nm + '! (' + team + ') OCASIÓN CLARÍSIMA'));
        if (e.type === 'tactic' && (e.side === us || us < 0)) line(e.min + '\' ' + (e.side === us ? 'EL SEGUNDO ENTRENADOR' : 'EL ' + team) + (e.style === 'ofensiva' ? ' SE LANZA AL ATAQUE' : e.style === 'defensiva' ? ' SE ATRINCHERA PARA GUARDAR LA VENTAJA' : ' ORDENA GUARDAR LA VENTAJA'));
      });
      document.getElementById('s0').textContent = res.score[0]; document.getElementById('s1').textContent = res.score[1];
      if (m === 45) { line('DESCANSO · ' + res.score[0] + '-' + res.score[1]); if (us >= 0 && !assist()) stop = 'Descanso'; }
      // eliminatoria igualada: prórroga (con un cambio más) y, si hace falta, penaltis
      if (m === 90 && cfg.ko && !et && level()) {
        et = true; res.subsLeft = res.subsLeft.map((x) => x + 1);
        line('FINAL DE LOS 90 MINUTOS' + (cfg.agg ? ' · GLOBAL ' + (res.score[0] + agg[0]) + '-' + (res.score[1] + agg[1]) : '') + ' · ¡HAY PRÓRROGA!', 'gol');
        A.sfxPlay('whistle', 3); if (us >= 0 && !assist()) stop = 'Prórroga (tienes un cambio más)';
      }
      if (m === 105 && et) { line('DESCANSO DE LA PRÓRROGA · ' + res.score[0] + '-' + res.score[1]); if (us >= 0 && !assist()) stop = 'Descanso de la prórroga'; }
      if (m >= (et ? 120 : 90)) { if (et && level()) { shootout(); return; } decide(); end(); return; }
      if (stop) openPanel(stop);
    }
    // tanda de penaltis en el teletipo
    function shootout() {
      clearInterval(iv); done = true;
      const so = MF.SIM.shootout(w, onPitch(0), onPitch(1), R); const sc = [0, 0];
      line('¡PENALTIS!', 'gol'); A.sfxPlay('whistle', 3);
      let i = 0;
      const nx = () => {
        if (i >= so.kicks.length) { decide(so.p); line('PENALTIS ' + so.p[0] + '-' + so.p[1] + ' · PASA EL ' + (so.p[0] > so.p[1] ? th : ta).short.toUpperCase(), 'gol'); end(); return; }
        const k = so.kicks[i++]; if (k.goal) sc[k.side]++;
        line((k.side === 0 ? th : ta).short.toUpperCase() + ': ' + name(k.pid).toUpperCase() + (k.goal ? ' MARCA' : k.miss ? ' LA ECHA FUERA' : ' FALLA, PARA ' + name(k.gk).toUpperCase()) + ' · ' + sc[0] + '-' + sc[1], k.goal ? '' : 'roja');
        A.sfxPlay(k.goal ? 'goal' : 'save');
        setTimeout(nx, speed === 4 ? 250 : 750);
      };
      setTimeout(nx, 700);
    }
    function end() {
      done = true; clearInterval(iv);
      line('FINAL DEL PARTIDO');
      setTimeout(() => MUI.summary(cfg, res), 900);
    }
    function finishFast() {
      if (done) return; paused = false; document.getElementById('tovl').innerHTML = ''; clearInterval(iv);
      if (min < 90) simTo(90, [true, true]);
      if (cfg.ko && !et && level()) { et = true; res.subsLeft = res.subsLeft.map((x) => x + 1); }
      if (et && min < 120) simTo(120, [true, true]);
      if (et && level()) decide(MF.SIM.shootout(w, onPitch(0), onPitch(1), R).p); else decide();
      done = true; MUI.summary(cfg, res);
    }
    // panel de pausa: táctica y sustituciones
    function openPanel(title) {
      paused = true; clearInterval(iv);
      const s = us; const lu = L[s]; const slots = DB.FORMATIONS[lu.formation];
      const reds = new Set((res ? res.events : []).filter((e) => e.type === 'red' && e.side === s).map((e) => e.pid));
      const subbedOut = new Set((res ? res.events : []).filter((e) => e.type === 'sub' && e.side === s).map((e) => e.out));
      const injured = new Set((res ? res.events : []).filter((e) => e.type === 'injury' && e.side === s).map((e) => e.pid));
      const stam = (id) => Math.round(((res && res.stam[id] !== undefined) ? res.stam[id] : w.players[id].fit / 100) * 100);
      const left = res ? res.subsLeft[s] : 5;
      const bench = (lu.bench || []).filter((id) => w.players[id] && !subbedOut.has(id) && lu.xi.indexOf(id) < 0 && DB.available(w.players[id]));
      const t = TT[s]; let outSel = MUI._outSel || null;
      const seg = (k, v, opts) => '<div class="seg">' + opts.map(([x, l]) => '<button class="btn ' + (v === x ? 'on' : '') + '" data-tk="' + k + '" data-tv="' + x + '">' + l + '</button>').join('') + '</div>';
      document.getElementById('tovl').innerHTML = '<div class="overlay"><div class="modal"><div class="head"><div class="ttl">' + esc(title || 'Pausa') + ' · ' + min + '\' · ' + (res ? res.score[0] + '-' + res.score[1] : '0-0') + '</div><button class="btn goldb" data-p="go">▶ Seguir</button></div><div class="body">' +
        '<div class="panel" style="display:grid;gap:6px"><div class="row"><b style="min-width:70px">Estilo</b>' + seg('style', t.style, [['defensiva', 'Defensivo'], ['equilibrada', 'Equilibrado'], ['ofensiva', 'Ofensivo']]) + '</div>' +
        '<div class="row"><b style="min-width:70px">Presión</b>' + seg('press', t.press, [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta']]) + '</div>' +
        '<div class="row"><b style="min-width:70px">Pases</b>' + seg('passing', t.passing, [['corto', 'Cortos'], ['mixto', 'Mixtos'], ['largo', 'Largos']]) + '</div></div>' +
        '<p class="muted" style="margin:6px 0">Cambios: quedan <b>' + left + '</b>. Toca quién sale y después quién entra.</p><div class="cols-2"><div><h3>En el campo</h3><table class="tbl"><tbody>' +
        lu.xi.map((id, i) => (id === null || reds.has(id)) ? '' : '<tr class="click ' + (outSel === id ? 'me' : '') + '" data-out="' + id + '"><td>' + slots[i][0] + '</td><td>' + UI.ovr(w.players[id].ovr) + ' ' + esc(name(id)) + (injured.has(id) ? ' <span class="tag t-inj">LES</span>' : '') + '</td><td style="white-space:nowrap">' + UI.fit(stam(id)) + ' <small>' + stam(id) + '%</small></td></tr>').join('') +
        '</tbody></table></div><div><h3>Banquillo</h3><table class="tbl"><tbody>' + (bench.length ? bench.map((id) => '<tr class="click" data-in="' + id + '"><td>' + UI.pos(w.players[id]) + '</td><td>' + UI.ovr(w.players[id].ovr) + ' ' + esc(name(id)) + '</td><td>' + UI.fit(w.players[id].fit) + '</td></tr>').join('') : '<tr><td>Sin suplentes</td></tr>') + '</tbody></table></div></div></div></div></div>';
      const box = document.getElementById('tovl');
      box.querySelector('[data-p="go"]').addEventListener('click', () => { MUI._outSel = null; box.innerHTML = ''; paused = false; restart(); });
      box.querySelectorAll('[data-tk]').forEach((b) => b.addEventListener('click', () => { t[b.dataset.tk] = b.dataset.tv; if (res && res.tacMod) res.tacMod[us] = null; if (cfg.onTactics) cfg.onTactics(t); A.sfxPlay('click'); openPanel(title); }));
      box.querySelectorAll('[data-out]').forEach((r) => r.addEventListener('click', () => { MUI._outSel = +r.dataset.out; openPanel(title); }));
      box.querySelectorAll('[data-in]').forEach((r) => r.addEventListener('click', () => {
        const o = MUI._outSel; if (!o) { UI.toast('Primero elige quién sale.'); return; }
        if (left <= 0) { UI.toast('Ya no quedan cambios.'); return; }
        if (!res) res = MF.SIM.emptyResult(cfg.home, cfg.away);
        res.subsIn = res.subsIn || [[], []]; res.subsLeft = res.subsLeft || [5, 5];
        if (!res.startXI) res.startXI = [L[0].xi.slice(), L[1].xi.slice()];
        MF.SIM.applySub(res, L[s], s, o, +r.dataset.in, Math.max(1, min), null, null);
        line(Math.max(1, min) + '\' CAMBIO: ENTRA ' + name(+r.dataset.in).toUpperCase() + ', SALE ' + name(o).toUpperCase(), 'cambio');
        evShown.add(res.events.length - 1);
        MUI._outSel = null; A.sfxPlay('whistle', 1); openPanel(title);
      }));
    }
    restart();
  };

  MF.MUI = MUI;
})(typeof window !== 'undefined' ? window : globalThis);
