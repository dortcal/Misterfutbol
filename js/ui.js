/* MÍSTER FÚTBOL 26·27 — interfaz: pantallas, menú principal, amistoso, opciones,
   editor de alineaciones y ficha de jugador. */
(function (G) {
  'use strict';
  const MF = G.MF; const U = MF.U; const DB = MF.DB; const GFX = MF.GFX; const A = MF.Audio;
  const UI = { act: {}, keys: null };
  const esc = U.esc;

  UI.settings = Object.assign({ duration: 4, difficulty: 1, zoom: 1, camera: 'total', weather: 'dia', autoSubs: true }, U.store.get('mf27_settings', {}));
  UI.saveSettings = () => U.store.set('mf27_settings', UI.settings);

  // ---------- infraestructura de pantallas
  UI.app = () => document.getElementById('app');
  UI.show = function (html, acts, keys) {
    UI.closeModal();
    UI.act = acts || {}; UI.keys = keys || null;
    UI.app().innerHTML = '<div class="screen">' + html + '</div>';
    G.scrollTo(0, 0);
    const first = UI.app().querySelector('[autofocus]'); if (first) first.focus({ preventScroll: true });
  };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const name = el.getAttribute('data-act');
    const fn = (UI.modalActs && UI.modalActs[name]) || UI.act[name] || UI.global[name];
    if (fn) { e.preventDefault(); A.init(); A.sfxPlay(el.classList.contains('back') ? 'back' : 'click'); fn(el, e); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-chg]'); if (!el) return;
    const fn = (UI.modalActs && UI.modalActs[el.getAttribute('data-chg')]) || UI.act[el.getAttribute('data-chg')]; if (fn) fn(el, e);
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-inp]'); if (!el) return;
    const fn = (UI.modalActs && UI.modalActs[el.getAttribute('data-inp')]) || UI.act[el.getAttribute('data-inp')]; if (fn) fn(el, e);
  });
  document.addEventListener('keydown', (e) => {
    if (UI.inMatch) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    const bars = Array.from(document.querySelectorAll(UI.modalOpen() ? '.modal .bar, .modal .btn' : '.screen .menu .bar:not([disabled])'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!bars.length) return;
      const i = bars.indexOf(document.activeElement);
      const n = e.key === 'ArrowDown' ? (i + 1) % bars.length : (i <= 0 ? bars.length - 1 : i - 1);
      bars[n].focus(); e.preventDefault(); return;
    }
    if (e.key === 'Escape') {
      if (UI.modalOpen()) { UI.closeModal(); return; }
      const back = document.querySelector('.screen [data-act].back'); if (back) back.click(); return;
    }
    const hot = document.querySelector('.screen [data-key="' + e.key + '"]:not([disabled])');
    if (hot && !UI.modalOpen()) { hot.click(); e.preventDefault(); }
  });

  UI.global = {
    menu: () => UI.mainMenu(),
    closeModal: () => UI.closeModal(),
    sound: (el) => { A.init(); A.setOn(!A.on); if (A.on && UI.wantMusic) A.startMusic(); el.textContent = A.on ? '♪ SONIDO: SÍ' : '♪ SONIDO: NO'; },
  };

  UI.toast = function (msg, ms) {
    const old = document.querySelector('.toast'); if (old) old.remove();
    const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = msg;
    document.body.appendChild(d); setTimeout(() => d.remove(), ms || 3200);
  };

  // aviso de logro desbloqueado (se apilan si llegan varios a la vez)
  UI.achQueue = [];
  UI.achToast = function (d) {
    UI.achQueue.push(d); if (UI.achQueue.length > 1) return;
    const next = () => {
      const x = UI.achQueue[0]; if (!x) return;
      const el = document.createElement('div'); el.className = 'ach-toast'; el.setAttribute('role', 'status');
      el.innerHTML = '<span class="ach-ico" aria-hidden="true">' + x.icon + '</span><span><small>LOGRO DESBLOQUEADO</small><b>' + U.esc(x.title) + '</b><span>' + U.esc(x.desc) + '</span></span>';
      document.body.appendChild(el); A.sfxPlay('logro');
      setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); UI.achQueue.shift(); next(); }, 350); }, 3600);
    };
    next();
  };
  if (MF.ACH) MF.ACH.onUnlock = (d) => UI.achToast(d);

  // ---------- LOGROS
  UI.achievements = function (back) {
    const ACH = MF.ACH; const got = ACH.all(); const n = ACH.count(), tot = ACH.DEFS.length;
    const fmt = (ts) => { try { return new Date(ts).toLocaleDateString('es-ES'); } catch (e) { return ''; } };
    UI.show(UI.head('Logros', n + ' de ' + tot + ' desbloqueados', 'back') + '<div class="wrap">' +
      '<div class="panel"><div class="row" style="gap:10px"><span class="meter" style="flex:1;max-width:none"><i style="width:' + Math.round(n / tot * 100) + '%"></i></span><b>' + Math.round(n / tot * 100) + '%</b></div><p class="muted" style="margin:6px 0 0">Los logros se guardan en este navegador y valen para todas tus partidas.</p></div>' +
      Object.entries(ACH.CATS).map(([c, l]) => '<div class="panel"><h3>' + l + '</h3><div class="ach-grid">' + ACH.DEFS.filter((d) => d.cat === c).map((d) => '<div class="ach ' + (got[d.id] ? 'on' : 'off') + '"><span class="ach-ico" aria-hidden="true">' + (got[d.id] ? d.icon : '🔒') + '</span><span><b>' + U.esc(d.title) + '</b><span>' + U.esc(d.desc) + '</span>' + (got[d.id] ? '<small>Conseguido el ' + fmt(got[d.id]) + '</small>' : '<small>Bloqueado</small>') + '</span></div>').join('') + '</div></div>').join('') + '</div>',
      { back: () => (back ? back() : UI.mainMenu()) });
  };

  UI.modalOpen = () => !!document.querySelector('.modal-bg');
  UI.modal = function (title, body, acts) {
    UI.closeModal();
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="head"><div class="ttl">' + esc(title) + '</div><button class="btn alt back" data-act="closeModal" aria-label="Cerrar">✕</button></div><div class="body">' + body + '</div></div>';
    bg.addEventListener('click', (e) => { if (e.target === bg) UI.closeModal(); });
    document.body.appendChild(bg);
    UI.modalActs = acts || {};
    const f = bg.querySelector('.body .btn, .body input, .body .bar'); if (f) f.focus({ preventScroll: true });
    return bg;
  };
  UI.closeModal = function () { document.querySelectorAll('.modal-bg').forEach((m) => m.remove()); UI.modalActs = null; };
  UI.confirm = function (text, yes, cb, danger) {
    UI.modal('Confirmar', '<p style="margin:0;font-size:17px">' + esc(text) + '</p><div class="row"><button class="btn ' + (danger ? 'warn' : '') + '" data-act="yes">' + esc(yes) + '</button><button class="btn alt back" data-act="closeModal">Cancelar</button></div>',
      { yes: () => { UI.closeModal(); cb(); } });
  };

  // ---------- piezas reutilizables
  UI.ballSVG = '<svg class="title-ball" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47" fill="#fff" stroke="#111" stroke-width="3"/><polygon points="50,33 66,45 60,64 40,64 34,45" fill="#111"/><polygon points="50,4 62,12 50,22 38,12" fill="#111"/><polygon points="92,38 95,55 82,52 80,38" fill="#111"/><polygon points="8,38 20,38 18,52 5,55" fill="#111"/><polygon points="24,86 30,74 42,80 38,94" fill="#111"/><polygon points="76,86 62,94 58,80 70,74" fill="#111"/><path d="M50 33 L50 22 M66 45 L80 38 M60 64 L70 74 M40 64 L30 74 M34 45 L20 38" stroke="#111" stroke-width="3"/></svg>';
  UI.title = function (sub) {
    return '<div class="title-row">' + UI.ballSVG + '<h1 class="title">Míster Fútbol<small>' + esc(sub || 'Temporada 2026·27') + '</small></h1>' + UI.ballSVG + '</div>';
  };
  UI.head = function (title, sub, backAct, extra) {
    return '<div class="head">' + (backAct ? '<button class="btn alt back" data-act="' + backAct + '" aria-label="Volver">◀ Volver</button>' : '') +
      '<div class="ttl">' + esc(title) + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' + (extra || '') + '</div>';
  };
  UI.ovr = function (v) { const c = v >= 85 ? 'o5' : v >= 78 ? 'o4' : v >= 70 ? 'o3' : v >= 62 ? 'o2' : 'o1'; return '<span class="ovr ' + c + '">' + Math.round(v) + '</span>'; };
  UI.pos = (p) => '<span class="pos-tag l-' + p.line + '" title="' + esc(DB.ROLE_NAME[p.role]) + '">' + p.role + '</span>';
  UI.fit = function (f) { f = Math.round(f); return '<span class="fit ' + (f < 60 ? 'low' : f < 80 ? 'mid' : '') + '" title="Forma física ' + f + '%"><b style="width:' + f + '%"></b></span>'; };
  UI.stars = function (str) { const n = U.clamp(Math.round((str - 58) / 6), 1, 5); return '<span class="stars" aria-label="' + n + ' de 5">' + '★'.repeat(n) + '☆'.repeat(5 - n) + '</span>'; };
  UI.status = function (p) {
    let s = '';
    if (p.inj > 0) s += '<span class="tag t-inj" title="Lesionado">+' + p.inj + '</span>';
    if (p.sus > 0) s += '<span class="tag t-sus" title="Sancionado">S' + p.sus + '</span>';
    return s;
  };
  UI.formHTML = (f) => '<span class="form">' + f.map((x) => '<i class="' + x + '">' + x + '</i>').join('') + '</span>';

  // ---------- MENÚ PRINCIPAL
  UI.mainMenu = function () {
    UI.inMatch = false; UI.wantMusic = true;
    if (A.ctx && A.on) A.startMusic();
    const w = UI.baseWorld();
    const badges = (G.MF_TEAMS || []).filter((t) => t.div === 1).map((t) => GFX.badgeImg(w.teams[t.id], 30)).join('');
    const slot = MF.LG.slotInfo(1) || MF.LG.slotInfo(2) || MF.LG.slotInfo(3);
    UI.show(
      UI.title() +
      '<div class="badge-row" aria-label="Equipos de Primera">' + badges + '</div>' +
      '<nav class="menu" aria-label="Menú principal">' +
      '<button class="bar" data-act="friendly" data-key="1" autofocus><span class="n">1</span><span class="t">Partido amistoso</span></button>' +
      '<button class="bar" data-act="manager" data-key="2"><span class="n">2</span><span class="t">Liga manager</span></button>' +
      '<div class="strip">Plantillas actualizadas · Primera y Segunda <span class="led">26/27</span>' + (slot ? '<span class="spacer"></span>Partida: ' + esc(slot.team) + ' · J' + (slot.day + 1) : '') + '</div>' +
      '<button class="bar small" data-act="logros" data-key="3"><span class="n">3</span><span class="t">Logros</span><span class="meta">' + MF.ACH.count() + '/' + MF.ACH.DEFS.length + '</span></button>' +
      '<button class="bar small grey" data-act="options" data-key="4"><span class="n">4</span><span class="t">Opciones</span></button>' +
      '<button class="bar small grey" data-act="help" data-key="5"><span class="n">5</span><span class="t">Cómo se juega</span></button>' +
      '</nav>' +
      '<div class="foot"><button class="btn alt" data-act="sound">' + (A.on ? '♪ SONIDO: SÍ' : '♪ SONIDO: NO') + '</button>' + (UI.canInstall ? '<button class="btn alt" data-act="install">Instalar app</button>' : '') + '</div>' +
      '<p class="muted center" style="max-width:640px;margin:0">Juego independiente hecho por aficionados. Escudos y equipaciones generados por el juego; nombres de clubes y jugadores usados solo para identificarlos. Plantillas a octubre de 2026.</p>',
      {
        friendly: () => UI.friendly(),
        manager: () => MF.MGR.start(),
        options: () => UI.options(),
        logros: () => UI.achievements(),
        help: () => UI.help(),
        install: () => { if (UI.installEvt) { UI.installEvt.prompt(); UI.installEvt = null; UI.canInstall = false; } },
      });
  };

  UI.baseWorld = function () { if (!UI._world) UI._world = DB.makeWorld(); return UI._world; };

  // ---------- OPCIONES
  UI.options = function () {
    const s = UI.settings;
    const seg = (name, val, opts) => '<div class="seg" role="group">' + opts.map(([v, l]) => '<button class="btn ' + (String(val) === String(v) ? 'on' : '') + '" data-act="set" data-k="' + name + '" data-v="' + v + '">' + l + '</button>').join('') + '</div>';
    UI.show(UI.head('Opciones', null, 'menu') + '<div class="wrap"><div class="panel grid2">' +
      '<div><h3>Sonido</h3><div class="row"><button class="btn ' + (A.on ? '' : 'alt') + '" data-act="toggleSound">' + (A.on ? 'Activado' : 'Desactivado') + '</button></div>' +
      '<label class="f" style="margin-top:10px">Música <input type="range" min="0" max="1" step="0.05" value="' + A.musicVol + '" data-inp="vol" data-k="m" id="vol-m"></label>' +
      '<label class="f">Efectos y público <input type="range" min="0" max="1" step="0.05" value="' + A.sfxVol + '" data-inp="vol" data-k="s" id="vol-s"></label>' +
      '<div style="margin-top:8px"><h3>Narración por voz</h3>' + seg('voice', A.voiceOn ? 1 : 0, [[1, 'Sí'], [0, 'No']]) + '<p class="muted">Usa la voz en español de tu dispositivo para cantar los goles.</p></div></div>' +
      '<div><h3>Duración del partido</h3>' + seg('duration', s.duration, [[2, '2 min'], [4, '4 min'], [6, '6 min'], [10, '10 min']]) +
      '<h3 style="margin-top:12px">Dificultad (modo Jugar)</h3>' + seg('difficulty', s.difficulty, [[0.9, 'Fácil'], [1, 'Normal'], [1.08, 'Difícil']]) +
      '<h3 style="margin-top:12px">Cámara</h3>' + seg('cam', (s.camera || 'total') === 'total' ? 'total' : s.zoom, [['total', 'Total (campo entero)'], [1.3, 'Seguimiento cerca'], [1, 'Seguimiento']]) +
      '<h3 style="margin-top:12px">Cambios automáticos en tu equipo</h3>' + seg('autoSubs', s.autoSubs ? 1 : 0, [[1, 'Sí'], [0, 'No']]) + '</div>' +
      '</div><div class="panel"><h3>Datos guardados</h3><p class="muted" style="margin-top:0">Las partidas se guardan en este navegador. Puedes exportarlas desde Liga Manager.</p><button class="btn warn" data-act="wipe">Borrar todas las partidas y ajustes</button></div></div>',
      {
        set: (el) => {
          const k = el.dataset.k, v = el.dataset.v;
          if (k === 'voice') { A.voiceOn = v === '1'; U.store.set('mf27_voice', A.voiceOn); }
          else if (k === 'autoSubs') s.autoSubs = v === '1';
          else if (k === 'cam') { if (v === 'total') s.camera = 'total'; else { s.camera = 'follow'; s.zoom = parseFloat(v); } }
          else s[k] = parseFloat(v);
          UI.saveSettings(); UI.options();
        },
        toggleSound: () => { A.init(); A.setOn(!A.on); UI.options(); },
        vol: (el) => { const m = el.dataset.k === 'm' ? +el.value : A.musicVol, x = el.dataset.k === 's' ? +el.value : A.sfxVol; A.init(); A.setVolumes(m, x); },
        wipe: () => UI.confirm('¿Borrar todas las partidas guardadas y los ajustes? No se puede deshacer.', 'Borrar', () => {
          [1, 2, 3].forEach((k) => U.store.del(MF.LG.SAVE_KEY + k)); U.store.del('mf27_settings'); U.store.del('mf27_audio');
          UI.toast('Datos borrados.'); UI.mainMenu();
        }, true),
      });
  };

  // ---------- AYUDA
  UI.help = function () {
    UI.show(UI.head('Cómo se juega', null, 'menu') + '<div class="wrap">' +
      '<div class="grid2"><div class="panel"><h2>Partido amistoso</h2><p>Elige local y visitante entre los 42 equipos de Primera y Segunda 2026/27 y decide cómo vivir el partido:</p>' +
      '<p><b>JUGAR</b>: controlas al jugador marcado con el aro amarillo. <b>VISIONADO</b>: ves el partido con cámara cenital y puedes acelerar, pausar o hacer cambios. <b>RESULTADO</b>: el marcador final al instante con el teletipo del partido.</p></div>' +
      '<div class="panel"><h2>Controles</h2><p style="margin-top:0">Un solo botón, como en los clásicos: <b>Espacio</b> (también X, Z, J o K) o el botón naranja en pantalla táctil.</p><div class="kv"><b>Mover</b><span>Flechas o WASD · joystick. El jugador sigue corriendo en la última dirección.</span><b>Pase</b><span>Toque corto. El compañero recibe mejor cuanto mejor pasas tú y mejor controla él.</span><b>Tiro</b><span>Mantén pulsado: cuanto más tiempo, más potencia. Apunta con la dirección.</span><b>Efecto</b><span>Justo después de tirar, pulsa hacia un lado para curvar el balón.</span><b>Sin balón</b><span>Toque = entrada (o cambio de jugador si estás lejos) · mantener = segada más larga y fuerte (roba mucho, pero si es dura o por detrás puede ser falta y tarjeta)</span><b>Tocar jugadores</b><span>Toca o haz clic en un compañero para pasarle el balón (también en saques de centro, córner, falta, penalti y banda). Toca a un rival y tu defensa más cercano irá a por él con una segada.</span><b>Mantener en un punto</b><span>Mantén pulsado en cualquier zona del campo y el balón irá allí. Sobre la portería rival es un tiro colocado muy preciso.</span><b>Saques</b><span>En tus saques el balón espera a que actúes (si no haces nada en 12 segundos, saca la máquina). Antes del saque de centro cada equipo se queda en su campo.</span><b>Pausa</b><span>P o Esc</span></div></div>' +
      '<div class="panel"><h2>Liga Manager</h2><p>Dirige a un club de Primera o Segunda: alineación y táctica, fichajes, entrenamiento, finanzas y cantera. Al elegir club verás el objetivo de la directiva; si durante la temporada te alejas mucho de él, recibirás avisos, un ultimátum y puedes ser destituido.</p><p>El <b>mercado está abierto toda la temporada</b>: puedes fichar en Primera, Segunda, Primera RFEF y estrellas de otras ligas (Premier, Serie A, Bundesliga, Ligue 1…), aunque las grandes figuras solo aceptan proyectos ambiciosos.</p><p><b>Copa del Rey</b>: la juegan Primera, Segunda (sin filiales) y Primera RFEF. Eliminatorias a partido único entre semana en el campo del equipo con peor media; si hay empate, prórroga y penaltis. La final se juega en campo neutral, en el estadio de uno de los grandes de Primera.</p>' +
      '<p>Al final de la temporada descienden los 3 últimos de Primera. En Segunda suben los 2 primeros y el ganador del playoff a doble partido entre el 3º y el 6º (en caso de empate global pasa el mejor clasificado). Los 4 últimos de Segunda bajan a Primera RFEF.</p></div>' +
      '<div class="panel"><h2>Medias y datos</h2><p>Las medias de los jugadores son una estimación basada en su nivel y rendimiento reciente. Los equipos más potentes tienen mejores jugadores. Las plantillas proceden de las listas públicas de los clubes en octubre de 2026.</p><p class="muted">VEL velocidad · RES resistencia · AGR agresividad · CAL calidad · PAS pase · TIR tiro · REG regate · DEF defensa · POR portería.</p></div></div></div>',
      {});
  };

  // ---------- AMISTOSO
  UI.fr = Object.assign({ home: 'rma', away: 'fcb', divH: 1, divA: 1, mode: 'visionado', side: 0, weather: 'dia', lh: null, la: null, th: null, ta: null }, U.store.get('mf27_friendly', {}));
  UI.friendly = function () {
    const w = UI.baseWorld(); const F = UI.fr;
    if (!w.teams[F.home]) F.home = 'rma'; if (!w.teams[F.away]) F.away = 'fcb';
    const list = (side) => {
      const dv = side === 0 ? F.divH : F.divA; const sel = side === 0 ? F.home : F.away;
      const ids = Object.values(w.teams).filter((t) => t.div === dv).sort((a, b) => a.short.localeCompare(b.short, 'es'));
      return '<div class="tabs" role="tablist">' + [[1, 'Primera'], [2, 'Segunda'], [3, '1ª RFEF']].map(([d, l]) => '<button class="tab ' + (dv === d ? 'on' : '') + '" data-act="div" data-s="' + side + '" data-d="' + d + '" role="tab" aria-selected="' + (dv === d) + '">' + l + '</button>').join('') + '</div>' +
        '<div class="teamlist" style="margin-top:8px">' + ids.map((t) => '<button class="tpick ' + (t.id === sel ? 'on' : '') + '" data-act="pick" data-s="' + side + '" data-id="' + t.id + '">' + GFX.badgeImg(t, 26) + '<span>' + esc(t.short) + '</span></button>').join('') + '</div>';
    };
    const th = w.teams[F.home], ta = w.teams[F.away];
    const kits = GFX.pickKits(th, ta);
    const seg = (k, v, opts) => '<div class="seg" role="group">' + opts.map(([x, l]) => '<button class="btn ' + (String(v) === String(x) ? 'on' : '') + '" data-act="opt" data-k="' + k + '" data-v="' + x + '">' + l + '</button>').join('') + '</div>';
    UI.show(UI.head('Partido amistoso', 'Elige equipos, modo y clima', 'menu') + '<div class="wrap">' +
      '<div class="panel vs-card"><div>' + GFX.badgeImg(th, 64) + '<div class="tn">' + esc(th.name) + '</div><div class="kits"><img src="' + GFX.shirt(kits[0], 64) + '" width="34" height="34" alt="Equipación local"></div>' + UI.stars(DB.teamStrength(w, th.id)) + '</div>' +
      '<div class="vs">VS</div><div>' + GFX.badgeImg(ta, 64) + '<div class="tn">' + esc(ta.name) + '</div><div class="kits"><img src="' + GFX.shirt(kits[1], 64) + '" width="34" height="34" alt="Equipación visitante"></div>' + UI.stars(DB.teamStrength(w, ta.id)) + '</div></div>' +
      '<div class="panel" style="display:flex;flex-direction:column;gap:10px"><div class="row"><b style="min-width:110px">MODO</b>' + seg('mode', F.mode, [['jugar', 'Jugar'], ['visionado', 'Visionado'], ['resultado', 'Resultado']]) + '</div>' +
      (F.mode === 'jugar' ? '<div class="row"><b style="min-width:110px">CONTROLAS</b>' + seg('side', F.side, [[0, esc(th.short)], [1, esc(ta.short)]]) + '</div>' : '') +
      (F.mode !== 'resultado' ? '<div class="row"><b style="min-width:110px">CLIMA</b>' + seg('weather', F.weather, [['dia', 'Día'], ['noche', 'Noche'], ['lluvia', 'Lluvia']]) + '</div>' +
        '<div class="row"><b style="min-width:110px">DURACIÓN</b>' + seg('duration', UI.settings.duration, [[2, '2 min'], [4, '4 min'], [6, '6 min'], [10, '10 min']]) + '</div>' : '') +
      '<div class="row"><button class="btn alt" data-act="lineup" data-s="0">Alineación ' + esc(th.short) + '</button><button class="btn alt" data-act="lineup" data-s="1">Alineación ' + esc(ta.short) + '</button><button class="btn alt" data-act="swap">⇄ Intercambiar</button><button class="btn alt" data-act="random">Al azar</button></div>' +
      '<button class="bar gold" data-act="play" data-key="Enter"><span class="n">▶</span><span class="t">¡A jugar!</span><span class="meta">' + esc(th.stadium) + '</span></button></div>' +
      '<div class="grid2"><div class="panel"><h3>Local</h3>' + list(0) + '</div><div class="panel"><h3>Visitante</h3>' + list(1) + '</div></div></div>',
      {
        div: (el) => { if (el.dataset.s === '0') F.divH = +el.dataset.d; else F.divA = +el.dataset.d; UI.friendly(); },
        pick: (el) => { if (el.dataset.s === '0') { F.home = el.dataset.id; F.lh = null; F.th = null; } else { F.away = el.dataset.id; F.la = null; F.ta = null; } UI.saveFr(); UI.friendly(); },
        opt: (el) => { const k = el.dataset.k, v = el.dataset.v; if (k === 'duration') { UI.settings.duration = +v; UI.saveSettings(); } else F[k] = k === 'side' ? +v : v; UI.saveFr(); UI.friendly(); },
        swap: () => { [F.home, F.away] = [F.away, F.home]; [F.divH, F.divA] = [F.divA, F.divH]; [F.lh, F.la] = [F.la, F.lh]; [F.th, F.ta] = [F.ta, F.th]; UI.saveFr(); UI.friendly(); },
        random: () => { const ids = Object.keys(w.teams).filter((id) => w.teams[id].div <= 2); F.home = U.R.pick(ids); do { F.away = U.R.pick(ids); } while (F.away === F.home); F.divH = w.teams[F.home].div; F.divA = w.teams[F.away].div; F.lh = F.la = F.th = F.ta = null; UI.saveFr(); UI.friendly(); },
        lineup: (el) => {
          const s = +el.dataset.s; const tid = s === 0 ? F.home : F.away;
          const lu = (s === 0 ? F.lh : F.la) || DB.autoLineup(w, tid, w.teams[tid].formation);
          const tac = (s === 0 ? F.th : F.ta) || { style: 'equilibrada', press: 'media', passing: 'mixto' };
          UI.lineupEditor({ world: w, tid, lineup: lu, tactics: tac, title: 'Alineación · ' + w.teams[tid].short, onDone: (l, t) => { if (s === 0) { F.lh = l; F.th = t; } else { F.la = l; F.ta = t; } UI.friendly(); } });
        },
        play: () => {
          if (F.home === F.away) { UI.toast('Elige dos equipos distintos.'); return; }
          const lh = DB.validLineup(w, F.home, F.lh || DB.autoLineup(w, F.home, w.teams[F.home].formation));
          const la = DB.validLineup(w, F.away, F.la || DB.autoLineup(w, F.away, w.teams[F.away].formation));
          const cfg = { world: w, home: F.home, away: F.away, lhome: lh, laway: la, thome: F.th || w.teams[F.home], taway: F.ta || w.teams[F.away], mode: F.mode, human: F.mode === 'jugar' ? F.side : -1, weather: F.weather, friendly: true,
            onExit: () => UI.friendly() };
          MF.MUI.start(cfg);
        },
      });
  };
  UI.saveFr = () => { const F = UI.fr; U.store.set('mf27_friendly', { home: F.home, away: F.away, divH: F.divH, divA: F.divA, mode: F.mode, side: F.side, weather: F.weather }); };

  // ---------- EDITOR DE ALINEACIÓN Y TÁCTICA
  UI.lineupEditor = function (o) {
    const w = o.world; const tid = o.tid; const team = w.teams[tid];
    let L = JSON.parse(JSON.stringify(o.lineup)); const T = Object.assign({}, o.tactics);
    let sel = null; // {type:'slot', i} | {type:'pl', id}
    const kit = team.kit.home;
    const render = () => {
      const slots = DB.FORMATIONS[L.formation];
      const squad = DB.teamPlayers(w, tid).sort((a, b) => { const ia = L.xi.indexOf(a.id), ib = L.xi.indexOf(b.id); if ((ia >= 0) !== (ib >= 0)) return ia >= 0 ? -1 : 1; if (ia >= 0) return ia - ib; return ['POR', 'DEF', 'MED', 'DEL'].indexOf(a.line) - ['POR', 'DEF', 'MED', 'DEL'].indexOf(b.line) || b.ovr - a.ovr; });
      const pitch = slots.map((s, i) => {
        const p = w.players[L.xi[i]];
        const bad = p && DB.rolePenalty(p.role, s[0]) > 5;
        const col = s[0] === 'POR' ? team.kit.gk.p : kit.p;
        const st = 'left:' + (s[2] * 100) + '%;top:' + ((1 - s[1] / 0.75) * 92 + 4) + '%';
        return '<button class="slot ' + (bad ? 'bad ' : '') + (sel && sel.type === 'slot' && sel.i === i ? 'sel ' : '') + (p ? '' : 'empty') + '" style="' + st + '" data-act="slot" data-i="' + i + '" aria-label="' + s[0] + ': ' + (p ? esc(p.name) : 'vacío') + '">' +
          '<span class="sh" style="background:' + col + ';color:' + (MF.DB.colorDist(col, '#ffffff') < 120 ? '#111' : '#fff') + '">' + (p ? p.num : '?') + '</span><span class="nm">' + (p ? esc(p.short) : '—') + '</span><span class="rl">' + s[0] + (p ? ' · ' + Math.round(DB.effOvr(p, s[0])) : '') + '</span></button>';
      }).join('');
      const rating = DB.lineupRating(w, L);
      const seg = (k, v, opts) => '<div class="seg">' + opts.map(([x, l]) => '<button class="btn ' + (v === x ? 'on' : '') + '" data-act="tac" data-k="' + k + '" data-v="' + x + '">' + l + '</button>').join('') + '</div>';
      UI.show(UI.head(o.title || 'Alineación', 'Toca un puesto y después un jugador para cambiarlo · Media del once: ' + rating.toFixed(1), 'done') + '<div class="wrap">' +
        '<div class="panel" style="display:flex;flex-direction:column;gap:8px"><div class="row"><b style="min-width:92px">SISTEMA</b><div class="seg">' + Object.keys(DB.FORMATIONS).map((f) => '<button class="btn ' + (f === L.formation ? 'on' : '') + '" data-act="form" data-f="' + f + '">' + f + '</button>').join('') + '</div></div>' +
        '<div class="row"><b style="min-width:92px">ESTILO</b>' + seg('style', T.style, [['defensiva', 'Defensivo'], ['equilibrada', 'Equilibrado'], ['ofensiva', 'Ofensivo']]) + '</div>' +
        '<div class="row"><b style="min-width:92px">PRESIÓN</b>' + seg('press', T.press, [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta']]) + '</div>' +
        '<div class="row"><b style="min-width:92px">PASES</b>' + seg('passing', T.passing, [['corto', 'Cortos'], ['mixto', 'Mixtos'], ['largo', 'Largos']]) + '<span class="spacer"></span><button class="btn alt" data-act="auto">Once automático</button><button class="btn goldb" data-act="done">Confirmar</button></div></div>' +
        '<div class="lineup"><div><div class="pitchbox"><div class="cc"></div>' + pitch + '</div><p class="muted">El borde rojo indica que el jugador está fuera de su demarcación natural y rinde menos.</p></div>' +
        '<div class="panel" style="padding:6px"><div class="tbl-wrap" style="max-height:70vh;overflow-y:auto"><table class="tbl sq"><thead><tr><th>#</th><th>Pos</th><th>Jugador</th><th class="num">Med</th><th class="hide-sm">Forma</th><th></th></tr></thead><tbody>' +
        squad.map((p) => { const i = L.xi.indexOf(p.id); return '<tr class="click ' + (sel && sel.type === 'pl' && sel.id === p.id ? 'sel' : '') + '" data-act="pl" data-id="' + p.id + '"><td>' + p.num + '</td><td>' + UI.pos(p) + '</td><td>' + esc(p.name) + UI.status(p) + (i >= 0 ? '<span class="tag t-xi">' + DB.FORMATIONS[L.formation][i][0] + '</span>' : '') + '</td><td class="num">' + UI.ovr(p.ovr) + '</td><td class="hide-sm">' + UI.fit(p.fit) + '</td><td><button class="btn alt" style="min-height:26px;padding:0 6px;font-size:11px" data-act="info" data-id="' + p.id + '" aria-label="Ficha de ' + esc(p.name) + '">i</button></td></tr>'; }).join('') +
        '</tbody></table></div></div></div></div>',
        {
          done: () => { const v = DB.validLineup(w, tid, L); o.onDone(v, T); },
          form: (el) => { L = DB.autoLineup(w, tid, el.dataset.f); sel = null; render(); },
          tac: (el) => { T[el.dataset.k] = el.dataset.v; render(); },
          auto: () => { L = DB.autoLineup(w, tid, L.formation); sel = null; render(); },
          info: (el, e) => { e.stopPropagation(); UI.playerModal(w, +el.dataset.id, {}); },
          slot: (el) => {
            const i = +el.dataset.i;
            if (sel && sel.type === 'pl') { assign(i, sel.id); sel = null; }
            else if (sel && sel.type === 'slot' && sel.i !== i) { const t = L.xi[i]; L.xi[i] = L.xi[sel.i]; L.xi[sel.i] = t; sel = null; }
            else sel = sel && sel.type === 'slot' && sel.i === i ? null : { type: 'slot', i };
            render();
          },
          pl: (el) => {
            const id = +el.dataset.id;
            if (sel && sel.type === 'slot') { assign(sel.i, id); sel = null; }
            else sel = sel && sel.type === 'pl' && sel.id === id ? null : { type: 'pl', id };
            render();
          },
        });
    };
    const assign = (i, id) => {
      const p = w.players[id];
      if (!DB.available(p)) { UI.toast(p.name + (p.inj > 0 ? ' está lesionado.' : ' está sancionado.')); return; }
      const cur = L.xi.indexOf(id);
      if (cur >= 0) { L.xi[cur] = L.xi[i]; }
      L.xi[i] = id;
      L.bench = (L.bench || []).filter((x) => L.xi.indexOf(x) < 0);
    };
    render();
  };

  // ---------- FICHA DE JUGADOR
  UI.playerModal = function (w, pid, ctx) {
    const p = w.players[pid]; if (!p) return;
    const t = w.teams[p.team];
    const attrs = [['VEL', 'vel'], ['RES', 'res'], ['AGR', 'agr'], ['CAL', 'cal'], ['PAS', 'pas'], ['TIR', 'tir'], ['REG', 'reg'], ['DEF', 'dfn']];
    if (p.line === 'POR') attrs.unshift(['POR', 'por']);
    const avg = p.st.ps ? (p.st.rat / p.st.ps).toFixed(2) : '—';
    let actions = '';
    if (ctx.actions) actions = ctx.actions;
    UI.modal(p.name, '<div class="pcard"><img class="face" src="' + GFX.face(p, t.kit.home.p, 76) + '" width="76" height="76" alt=""><div style="flex:1;min-width:0"><div class="big">' + esc(p.name) + '</div><div>' + GFX.badgeImg(t, 22) + ' ' + esc(t.name) + ' · Dorsal ' + p.num + '</div><div class="muted">' + DB.ROLE_NAME[p.role] + ' · ' + p.age + ' años · ' + esc(p.nat) + (p.gen ? ' · <span class="tag t-gen">generado</span>' : '') + '</div></div><div class="center"><div class="bigovr">' + p.ovr + '</div><div class="muted">MEDIA</div></div></div>' +
      '<div class="grid2" style="gap:6px 16px">' + attrs.map(([l, k]) => '<div class="attr"><span>' + l + '</span><span class="b"><i style="width:' + p.at[k] + '%"></i></span><span>' + p.at[k] + '</span></div>').join('') + '</div>' +
      '<div class="kv"><b>Valor de mercado</b><span>' + U.money(p.value) + '</span><b>Salario</b><span>' + U.money(p.wage) + ' / temporada</span><b>Forma física</b><span>' + UI.fit(p.fit) + ' ' + Math.round(p.fit) + '%</span><b>Moral</b><span>' + Math.round(p.mor) + '/99</span>' +
      '<b>Estado</b><span>' + (p.inj > 0 ? 'Lesionado (' + p.inj + ' jornadas)' : p.sus > 0 ? 'Sancionado (' + p.sus + ')' : 'Disponible') + '</span>' +
      '<b>Temporada</b><span>' + p.st.pj + ' PJ · ' + p.st.g + ' goles · ' + p.st.a + ' asist. · ' + p.st.ta + ' TA · ' + p.st.tr + ' TR · nota ' + avg + '</span></div>' + actions, ctx.acts || {});
  };

  MF.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
