/* MÍSTER FÚTBOL 26·27 — pantallas de LIGA MANAGER */
(function (G) {
  'use strict';
  const MF = G.MF; const U = MF.U; const DB = MF.DB; const GFX = MF.GFX; const LG = MF.LG; const UI = MF.UI; const A = MF.Audio;
  const esc = U.esc;
  const MGR = { st: null, slot: 1 };
  const T = (id) => MGR.st.world.teams[id];
  const save = () => { if (MGR.st && !LG.save(MGR.st, MGR.slot)) UI.toast('No se ha podido guardar (almacenamiento lleno o bloqueado).'); };
  const divName = (d) => (d === 1 ? 'Primera División' : d === 2 ? 'Segunda División' : d === 3 ? 'Primera RFEF' : 'Otras ligas');
  MGR.divName = divName;
  const objChip = (s) => '<span class="obj-chip ' + s.level + '">' + (s.level === 'ok' ? 'En objetivo' : s.level === 'riesgo' ? 'En riesgo' : 'Lejos') + '</span>';

  // ---------- partidas guardadas
  MGR.start = function () {
    UI.wantMusic = true;
    const slots = [1, 2, 3].map((k) => [k, LG.slotInfo(k)]);
    UI.show(UI.head('Liga Manager', 'Elige una partida o empieza una nueva', 'menu') + '<div class="wrap"><nav class="menu" style="max-width:none">' +
      slots.map(([k, s]) => s ?
        '<button class="bar" data-act="load" data-k="' + k + '" data-key="' + k + '"><span class="n">' + k + '</span><span class="t">' + esc(s.team) + '</span><span class="meta">' + (s.multi ? '👥 ' + esc(s.multi) + ' · ' : '') + s.season + ' · ' + divName(s.div) + ' · Jornada ' + Math.min(s.day + 1, 46) + '</span></button>' :
        '<button class="bar grey" data-act="new" data-k="' + k + '" data-key="' + k + '"><span class="n">' + k + '</span><span class="t">Partida vacía</span><span class="meta">Nueva partida</span></button>').join('') +
      '</nav><div class="panel"><h3>Copias de seguridad</h3><p class="muted" style="margin-top:0">Las partidas se guardan automáticamente en este navegador después de cada jornada.</p><div class="row">' +
      slots.filter(([, s]) => s).map(([k]) => '<button class="btn alt" data-act="export" data-k="' + k + '">Exportar partida ' + k + '</button><button class="btn warn" data-act="del" data-k="' + k + '">Borrar ' + k + '</button>').join('') +
      '<label class="btn alt" style="cursor:pointer">Importar partida<input type="file" accept=".json,application/json" data-chg="import" hidden></label></div></div></div>',
      {
        load: (el) => { const st = LG.load(+el.dataset.k); if (!st) { UI.toast('No se ha podido cargar la partida.'); return; } MGR.st = st; MGR.slot = +el.dataset.k; MGR.route(); },
        new: (el) => { MGR.slot = +el.dataset.k; MGR.ng = { players: 1, step: 0, picks: [] }; MGR.newGame(1); },
        del: (el) => UI.confirm('¿Borrar la partida ' + el.dataset.k + '?', 'Borrar', () => { U.store.del(LG.SAVE_KEY + el.dataset.k); MGR.start(); }, true),
        export: (el) => {
          const data = JSON.stringify(LG.load(+el.dataset.k));
          try {
            const blob = new Blob([data], { type: 'application/json' }); const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = 'mister-futbol-partida-' + el.dataset.k + '.json'; document.body.appendChild(a); a.click(); a.remove();
            UI.toast('Partida exportada.');
          } catch (e) { UI.toast('Tu navegador no permite descargar el archivo.'); }
        },
        import: (el) => {
          const f = el.files && el.files[0]; if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            try {
              const st = JSON.parse(r.result); if (!st.world || !st.userTeam) throw new Error('formato');
              const k = [1, 2, 3].find((x) => !LG.slotInfo(x)) || 3;
              LG.save(st, k); UI.toast('Partida importada en la ranura ' + k + '.'); MGR.start();
            } catch (e) { UI.toast('El archivo no es una partida válida de Míster Fútbol.'); }
          };
          r.readAsText(f);
        },
      });
  };

  // ---------- nueva partida: elegir club
  MGR.ng = { players: 1, step: 0, picks: [] };
  MGR.newGame = function (dv, sel) {
    const w = UI.baseWorld(); const NG = MGR.ng;
    const taken = NG.step === 1 ? NG.picks[0].team : null;
    const ids = Object.values(w.teams).filter((t) => t.div === dv && t.id !== taken).sort((a, b) => DB.teamStrength(w, b.id) - DB.teamStrength(w, a.id));
    sel = sel && sel !== taken ? sel : ids[0].id; const t = w.teams[sel];
    const who = NG.players === 2 ? 'Jugador ' + (NG.step + 1) : null;
    const defName = NG.step === 1 ? U.store.get('mf27_name2', 'Míster 2') : U.store.get('mf27_name', 'Míster');
    const objective = LG.objectiveFor(w, ids.map((x) => x.id), sel).obj;
    const best = DB.teamPlayers(w, sel).sort((a, b) => b.ovr - a.ovr).slice(0, 5);
    UI.show(UI.head('Nueva partida', who ? who + ': elige el club que vas a dirigir' : 'Elige el club que vas a dirigir', 'back') + '<div class="wrap">' +
      (NG.step === 0 ? '<div class="panel row" style="gap:10px;align-items:center"><b>Jugadores</b><div class="seg">' + [[1, '👤 1 jugador'], [2, '👥 2 jugadores (por turnos)']].map(([n, l]) => '<button class="btn ' + (NG.players === n ? 'on' : '') + '" data-act="np" data-n="' + n + '">' + l + '</button>').join('') + '</div>' +
        (NG.players === 2 ? '<span class="muted" style="flex-basis:100%">Dos personas en el mismo dispositivo, cada una con su club. Se juega por turnos y, cuando vuestros equipos se enfrentan, el partido lo dirigen los segundos entrenadores.</span>' : '') + '</div>' :
        '<div class="panel row" style="gap:8px">' + GFX.badgeImg(w.teams[NG.picks[0].team], 28) + '<span><b>Jugador 1:</b> ' + esc(NG.picks[0].name) + ' (' + esc(w.teams[NG.picks[0].team].short) + ')</span></div>') +
      '<div class="tabs">' + [[1, 'Primera'], [2, 'Segunda']].map(([d, l]) => '<button class="tab ' + (d === dv ? 'on' : '') + '" data-act="div" data-d="' + d + '">' + l + '</button>').join('') + '</div>' +
      '<div class="cols-2"><div class="panel"><div class="teamlist" style="max-height:60vh">' + ids.map((x) => '<button class="tpick ' + (x.id === sel ? 'on' : '') + '" data-act="sel" data-id="' + x.id + '">' + GFX.badgeImg(x, 26) + '<span>' + esc(x.short) + '</span></button>').join('') + '</div></div>' +
      '<div class="panel" style="display:flex;flex-direction:column;gap:10px"><div class="pcard">' + GFX.badgeImg(t, 72) + '<div><div class="big">' + esc(t.name) + '</div><div>' + UI.stars(DB.teamStrength(w, t.id)) + '</div><div class="muted">' + esc(t.stadium) + ' · ' + t.cap.toLocaleString('es-ES') + ' espectadores</div></div></div>' +
      '<div class="panel" style="margin:0;background:#fff3b0;border-color:#1d2126"><h3 style="margin:0 0 2px">🎯 Objetivo de la directiva</h3><div class="big" style="font-size:20px">' + esc(objective.text) + '</div><div class="muted">Si durante la temporada te alejas mucho de este objetivo, la directiva puede destituirte.</div></div>' +
      '<div class="kv"><b>Presupuesto</b><span>' + U.money(t.budget) + '</span><b>Media del once</b><span>' + DB.teamStrength(w, t.id).toFixed(1) + '</span><b>Plantilla</b><span>' + DB.teamPlayers(w, t.id).length + ' jugadores</span></div>' +
      '<div><h3>Figuras</h3>' + best.map((p) => '<div>' + UI.ovr(p.ovr) + ' ' + UI.pos(p) + ' ' + esc(p.name) + '</div>').join('') + '</div>' +
      '<label class="f">' + (who ? 'Nombre del ' + who.toLowerCase() : 'Tu nombre de entrenador') + '<input type="text" id="mgrname" maxlength="24" value="' + esc(defName) + '"></label>' +
      '<button class="bar gold" data-act="go"><span class="n">▶</span><span class="t">' + (NG.players === 2 && NG.step === 0 ? 'Elegir y pasar al jugador 2' : 'Firmar con el ' + esc(t.short)) + '</span></button></div></div></div>',
      {
        back: () => { if (NG.step === 1) { NG.step = 0; NG.picks = []; MGR.newGame(1); } else MGR.start(); },
        div: (el) => MGR.newGame(+el.dataset.d), sel: (el) => MGR.newGame(dv, el.dataset.id),
        np: (el) => { NG.players = +el.dataset.n; MGR.newGame(dv, sel); },
        go: () => {
          const name = (document.getElementById('mgrname').value || 'Míster').trim().slice(0, 24);
          if (NG.players === 2 && NG.step === 0) { U.store.set('mf27_name', name); NG.picks = [{ team: sel, name }]; NG.step = 1; MGR.newGame(1); return; }
          if (NG.step === 1) {
            if (name === NG.picks[0].name) { UI.toast('Elige un nombre distinto al del jugador 1.'); return; }
            U.store.set('mf27_name2', name);
            MGR.st = LG.newCareer({ team: NG.picks[0].team, name: NG.picks[0].name, team2: sel, name2: name, difficulty: UI.settings.difficulty });
          } else { U.store.set('mf27_name', name); MGR.st = LG.newCareer({ team: sel, name, difficulty: UI.settings.difficulty }); }
          MGR.ng = { players: 1, step: 0, picks: [] };
          save(); MGR.route();
        },
      });
  };

  MGR.route = function () {
    const st = MGR.st;
    if (st.seasonOver) return MGR.seasonEnd();
    if (LG.isMulti(st)) return MGR.turnIntro();
    if (st.fired) return MGR.fired();
    MGR.hub();
  };

  // ---------- PARTIDA DE DOS JUGADORES: pantalla de cambio de turno (pasar el dispositivo)
  MGR.turnIntro = function (msg) {
    const st = MGR.st; if (!LG.isMulti(st)) return MGR.route();
    const t = T(st.userTeam); const f = LG.userFixture(st);
    const duel = f && LG.isManaged(st, f.h) && LG.isManaged(st, f.a);
    UI.wantMusic = true; if (A.ctx && A.on) A.startMusic();
    UI.show(UI.title('Turno de ' + st.userName) + '<div class="wrap"><div class="panel center turn-card" style="border-color:' + t.kit.home.p + '">' +
      '<div class="muted">Jugador ' + (st.cur + 1) + ' de ' + LG.nMgrs(st) + ' · ' + DB.SEASON_LABEL(st.season) + ' · ' + (st.seasonOver ? 'fin de temporada' : LG.nextEvent(st) ? 'partido entre semana' : 'Jornada ' + (st.day + 1)) + '</div>' +
      GFX.badgeImg(t, 96) + '<div class="big" style="font-size:30px">' + esc(st.userName) + '</div><div>' + esc(t.name) + '</div>' +
      (msg ? '<p style="margin:8px 0 0">' + esc(msg) + '</p>' : '') +
      (st.fired ? '<p style="margin:8px 0 0"><span class="tag t-inj">DESTITUIDO</span> La directiva quiere hablar contigo.</p>' :
        f ? '<p style="margin:8px 0 0"><b>' + esc(f.label) + '</b>: ' + esc(T(f.h).short) + ' - ' + esc(T(f.a).short) + (duel ? '<br><span class="tag t-xi">DUELO ENTRE JUGADORES</span> lo dirigen los segundos entrenadores' : '') + '</p>' : '<p class="muted" style="margin:8px 0 0">Tu equipo no juega en esta fecha.</p>') +
      '<p class="muted" style="margin:8px 0 0">Pasa el dispositivo a ' + esc(st.userName) + '.</p></div>' +
      '<nav class="menu" style="max-width:none"><button class="bar gold" data-act="go" data-key="Enter" autofocus><span class="n">▶</span><span class="t">Soy ' + esc(st.userName) + ': empezar mi turno</span></button>' +
      '<button class="bar small grey" data-act="exit"><span class="n">0</span><span class="t">Guardar y salir</span></button></nav></div>',
      { go: () => (st.fired ? MGR.fired() : MGR.hub()), exit: () => { save(); UI.mainMenu(); } });
  };
  // fin del turno de un jugador: pasa al siguiente o, si todos han jugado, se disputa la jornada
  MGR.endTurn = function () {
    const st = MGR.st;
    if (!LG.isMulti(st)) { const s = LG.playDay(st, null); st.pendingRes = null; st.turnDone = null; save(); MGR.dayResults(s); return; }
    st.turnDone = st.turnDone || []; st.turnDone[st.cur] = true;
    const next = st.mgrs.findIndex((m, i) => !st.turnDone[i]);
    if (next >= 0) { LG.switchTo(st, next); save(); MGR.turnIntro(); return; }
    LG.switchTo(st, 0);
    const s = LG.playDay(st, null);
    st.pendingRes = null; st.turnDone = null;
    save(); MGR.dayResults(s);
  };

  // ---------- cabecera común
  MGR.top = function () {
    const st = MGR.st; const t = T(st.userTeam);
    const conf = Math.round(st.board.conf);
    const pos = LG.position(st, t.id);
    const rounds = LG.ROUNDS[t.div];
    return (LG.isMulti(st) ? '<div class="turn-bar" style="border-left-color:' + t.kit.home.p + ';border-right-color:' + t.kit.home.s + '">👥 Turno de <b>' + esc(st.userName) + '</b> · jugador ' + (st.cur + 1) + ' de ' + LG.nMgrs(st) + '</div>' : '') + '<div class="panel hub-top">' + GFX.badgeImg(t, 64) + '<div style="min-width:0"><div class="club">' + esc(t.name) + '</div><div class="muted">' + esc(st.userName) + ' · ' + DB.SEASON_LABEL(st.season) + ' · ' + divName(t.div) + ' · ' + (LG.cupDue(st) ? 'Copa del Rey' : 'Jornada ' + Math.min(st.day + 1, rounds) + '/' + rounds) + (pos && st.day > 0 ? ' · ' + pos + 'º' : '') + '</div>' +
      (st.board.objective.text ? '<div class="row" style="gap:6px;margin-top:3px;font-size:14px"><span>🎯 ' + esc(st.board.objective.text) + '</span>' + objChip(LG.objectiveStatus(st)) + '</div>' : '') +
      '<div class="row" style="gap:8px;margin-top:4px"><span class="muted">Directiva</span><span class="meter" title="Confianza ' + conf + '%"><i style="width:' + conf + '%"></i></span><span class="muted">' + conf + '%</span></div></div><div class="money" title="Presupuesto">' + U.money(t.budget) + '</div></div>';
  };

  // ---------- HUB
  MGR.hub = function () {
    const st = MGR.st; UI.wantMusic = true; if (A.ctx && A.on) A.startMusic();
    if (st.seasonOver) return MGR.seasonEnd();
    if (st.fired) return MGR.fired();
    const t = T(st.userTeam); const f = LG.userFixture(st);
    const multi = LG.isMulti(st);
    const done = f && st.pendingRes && st.pendingRes[f.key];
    const duel = f && LG.isManaged(st, f.h) && LG.isManaged(st, f.a);
    const seg2 = (tid) => { const M = LG.mgrData(st, tid); return M && M.staff && M.staff.segundo ? M.staff.segundo.name : 'sin segundo entrenador'; };
    let next;
    if (done) {
      const r = done;
      next = '<div class="panel next"><h3>' + esc(f.label) + ' · ya disputado</h3><div class="bigscore">' + GFX.badgeImg(T(f.h), 48) + '<span>' + esc(T(f.h).abbr) + '</span><span>' + r.score[0] + '</span><span class="sep">-</span><span>' + r.score[1] + '</span><span>' + esc(T(f.a).abbr) + '</span>' + GFX.badgeImg(T(f.a), 48) + '</div>' +
        (r.pens ? '<p class="center" style="margin:4px 0 0">Penaltis ' + r.pens[0] + '-' + r.pens[1] + '</p>' : '') +
        '<p class="muted center" style="margin:6px 0">' + (duel ? 'Duelo entre jugadores dirigido por los segundos entrenadores.' : 'Partido jugado en este turno.') + (multi ? ' Revisa tu club y termina el turno.' : '') + '</p>' +
        '<button class="bar gold" data-act="endturn" data-key="Enter"><span class="n">▶</span><span class="t">' + (multi ? 'Terminar mi turno' : 'Continuar') + '</span></button></div>';
    } else if (f) {
      const h = T(f.h), a = T(f.a); const started = st.day > 0 && f.comp !== 'playoff';
      const euroInfo = f.leg === 1 && f.tie && f.tie.legs[0] ? '<div class="center" style="margin-bottom:6px"><b>Vuelta</b> · Ida: ' + esc(T(f.tie.legs[0].h).short) + ' ' + f.tie.legs[0].hg + '-' + f.tie.legs[0].ag + ' ' + esc(T(f.tie.legs[0].a).short) + ' · si el global acaba empatado, prórroga y penaltis</div>' : (f.ko && f.neutral ? '<div class="center" style="margin-bottom:6px"><b>Final a partido único</b> en campo neutral · si hay empate, prórroga y penaltis</div>' : '');
      const cupInfo = f.comp !== 'cup' ? euroInfo : f.comp === 'cup' ? '<div class="center" style="margin-bottom:6px"><b>Partido único</b> · ' + (f.neutral ? 'Final en campo neutral' : 'en casa del equipo con peor media (' + LG.squadAvg(st.world, f.h).toFixed(1) + ' vs ' + LG.squadAvg(st.world, f.a).toFixed(1) + ')') + ' · si hay empate, prórroga y penaltis</div>' : ''; const ph = started ? LG.position(st, f.h) : null, pa = started ? LG.position(st, f.a) : null;
      const tab = h.div <= 2 ? LG.table(st, h.div) : [];
      const fh = (tab.find((r) => r.id === f.h) || { form: [] }).form, fa = (tab.find((r) => r.id === f.a) || { form: [] }).form;
      next = '<div class="panel next"><h3>' + (f.comp === 'cup' ? '🏆 ' : '') + 'Próximo partido · ' + esc(f.label) + '</h3>' + cupInfo + '<div class="vs-card"><div>' + GFX.badgeImg(h, 56) + '<div class="tn">' + esc(h.short) + '</div><div class="muted">' + (ph ? ph + 'º · ' : '') + UI.formHTML(fh) + '</div></div><div class="vs">VS</div><div>' + GFX.badgeImg(a, 56) + '<div class="tn">' + esc(a.short) + '</div><div class="muted">' + (pa ? pa + 'º · ' : '') + UI.formHTML(fa) + '</div></div></div>' +
        '<div class="muted center">' + esc(f.venue || h.stadium) + (f.neutral ? ' (neutral)' : '') + ' · Tu once: ' + DB.lineupRating(st.world, LG.userLineup(st)).toFixed(1) + ' (' + st.lineup.formation + ') · Rival: ' + DB.teamStrength(st.world, f.h === st.userTeam ? f.a : f.h).toFixed(1) + '</div>' +
        (duel ? '<div class="duel-note"><b>👥 Duelo entre jugadores:</b> cada equipo sale con su alineación y su táctica, pero durante el partido mandan los segundos entrenadores (' + esc(seg2(f.h)) + ' y ' + esc(seg2(f.a)) + '). ¡Miradlo juntos!</div>' : '') +
        '<div class="' + (UI.PLAY_ENABLED && !duel ? 'grid3' : 'grid2') + '">' + (UI.PLAY_ENABLED && !duel ? '<button class="bar gold small" data-act="play" data-m="jugar" data-key="j"><span class="n">J</span><span class="t">Jugar</span></button>' : '') + '<button class="bar small' + (UI.PLAY_ENABLED && !duel ? '' : ' gold') + '" data-act="play" data-m="visionado" data-key="v"><span class="n">V</span><span class="t">Visionado</span></button><button class="bar small" data-act="play" data-m="resultado" data-key="r"><span class="n">R</span><span class="t">Resultado</span></button></div></div>';
    } else {
      const cupDay = LG.cupDue(st);
      next = '<div class="panel next"><h3>' + (cupDay ? '🏆 Copa del Rey · ' + esc(st.cup.rounds[st.cup.round].label) : 'Jornada ' + (st.day + 1)) + '</h3><p style="margin:0">' + (cupDay ? esc(t.short) + (st.cup.teams.indexOf(t.id) < 0 ? ' no disputa la Copa (los filiales no participan).' : ' ya está eliminado de la Copa. Se juega la ronda sin tu equipo.') : esc(t.short) + ' no juega en esta jornada' + (st.day >= 38 && t.div === 1 ? ': la Primera ha terminado y se completan la Segunda y el playoff de ascenso.' : '.')) + '</p>' +
        (multi ? '<div class="grid2"><button class="bar small gold" data-act="endturn"><span class="n">▶</span><span class="t">Terminar mi turno</span></button></div></div>' :
        '<div class="grid3"><button class="bar small" data-act="simday"><span class="n">»</span><span class="t">' + (cupDay ? 'Simular ronda de Copa' : 'Simular jornada') + '</span></button><button class="bar small grey" data-act="simall"><span class="n">⏭</span><span class="t">Hasta final de temporada</span></button></div></div>');
    }
    const offers = st.offers.filter((o) => st.world.players[o.pid] && st.world.players[o.pid].team === st.userTeam);
    const news = st.news.slice(0, 3).map((n) => '<div class="news-item ' + n.type + '">' + esc(n.text) + '</div>').join('');
    const C = st.cup; const cupMeta = !C ? '—' : C.winner ? 'Campeón: ' + T(C.winner).short : LG.userInCup(st) ? C.rounds[C.round].label : (C.teams.indexOf(st.userTeam) < 0 ? 'No participas' : 'Eliminado');
    UI.show(MGR.top() + '<div class="wrap">' + next +
      (offers.length ? '<div class="panel"><h3>Ofertas recibidas</h3>' + MGR.offersHTML(offers) + '</div>' : '') +
      '<div class="cols-2"><nav class="menu" style="max-width:none">' +
      '<button class="bar small" data-act="lineup" data-key="1"><span class="n">1</span><span class="t">Alineación y táctica</span></button>' +
      '<button class="bar small" data-act="squad" data-key="2"><span class="n">2</span><span class="t">Plantilla</span></button>' +
      '<button class="bar small" data-act="market" data-key="3"><span class="n">3</span><span class="t">Fichajes</span><span class="meta">' + (LG.isWindow(st) ? 'ABIERTO HASTA LA J' + LG.MARKET_CLOSE : 'CERRADO') + '</span></button>' +
      '<button class="bar small" data-act="table" data-key="4"><span class="n">4</span><span class="t">Clasificación</span></button>' +
      '<button class="bar small" data-act="calendar" data-key="5"><span class="n">5</span><span class="t">Calendario y resultados</span></button>' +
      '<button class="bar small" data-act="stats" data-key="6"><span class="n">6</span><span class="t">Estadísticas</span></button>' +
      '<button class="bar small" data-act="training" data-key="7"><span class="n">7</span><span class="t">Entrenamiento</span><span class="meta">' + esc(MGR.TRAIN[st.training][0]) + '</span></button>' +
      '<button class="bar small" data-act="finance" data-key="8"><span class="n">8</span><span class="t">Finanzas</span></button>' +
      '<button class="bar small" data-act="club" data-key="9"><span class="n">9</span><span class="t">Club, directiva y cantera</span></button>' +
      '<button class="bar small" data-act="staff" data-key="p"><span class="n">P</span><span class="t">Personal del club</span><span class="meta">' + LG.STAFF_ROLES.filter(([k]) => st.staff && st.staff[k]).length + '/7</span></button>' +
      '<button class="bar small" data-act="europe" data-key="e"><span class="n">E</span><span class="t">Competiciones internacionales</span><span class="meta">' + esc(MGR.euroMeta()) + '</span></button>' +
      '<button class="bar small" data-act="cup" data-key="c"><span class="n">C</span><span class="t">Copa del Rey</span><span class="meta">' + esc(cupMeta) + '</span></button>' +
      '<button class="bar small grey" data-act="quit" data-key="0"><span class="n">0</span><span class="t">Guardar y salir</span></button>' +
      '</nav><div class="panel"><h3>Noticias</h3>' + (news || '<p class="muted">Sin noticias.</p>') + '<div class="row" style="margin-top:8px"><button class="btn alt" data-act="news">Todas las noticias</button></div></div></div></div>',
      Object.assign(MGR.offerActs(() => MGR.hub()), {
        play: (el) => MGR.play(el.dataset.m), endturn: () => MGR.endTurn(),
        simday: () => { const s = LG.playDay(st, null); save(); MGR.dayResults(s); },
        simall: () => UI.confirm('¿Simular todas las jornadas que quedan hasta el final de la temporada?', 'Simular', () => { let g = 0; while (!st.seasonOver && !st.fired && g++ < 90) { if (LG.userFixture(st)) { LG.playDay(st, null); } else LG.playDay(st, null); } save(); MGR.route(); }),
        lineup: () => MGR.lineup(), squad: () => MGR.squad(), market: () => MGR.market(), table: () => MGR.table(T(st.userTeam).div), calendar: () => MGR.calendar(), stats: () => MGR.stats(T(st.userTeam).div),
        training: () => MGR.training(), finance: () => MGR.finance(), club: () => MGR.club(), cup: () => MGR.cup(), staff: () => MGR.staff(), europe: () => MGR.europe(), news: () => MGR.news(), quit: () => { save(); UI.toast('Partida guardada.'); UI.mainMenu(); },
      }));
  };

  MGR.offersHTML = function (offers) {
    const st = MGR.st;
    return '<div class="tbl-wrap"><table class="tbl"><tbody>' + offers.map((o) => { const p = st.world.players[o.pid]; return '<tr><td>' + GFX.badgeImg(T(o.from), 20) + ' ' + esc(T(o.from).short) + '</td><td>' + esc(p.name) + ' ' + UI.ovr(p.ovr) + '</td><td class="num"><b>' + U.money(o.amount) + '</b> <span class="muted hide-sm">(valor ' + U.money(p.value) + ')</span></td><td><button class="btn" data-act="oacc" data-id="' + o.id + '">Aceptar</button> <button class="btn alt" data-act="orej" data-id="' + o.id + '">Rechazar</button></td></tr>'; }).join('') + '</tbody></table></div>';
  };
  MGR.offerActs = function (refresh) {
    const st = MGR.st;
    return {
      oacc: (el) => { const r = LG.acceptOffer(st, el.dataset.id); UI.toast(r.msg); save(); refresh(); },
      orej: (el) => { st.offers = st.offers.filter((o) => o.id !== el.dataset.id); save(); refresh(); },
    };
  };

  // ---------- jugar la jornada
  MGR.play = function (mode) {
    const st = MGR.st; const f = LG.userFixture(st); if (!f) return;
    const duel = LG.isManaged(st, f.h) && LG.isManaged(st, f.a);
    if (duel && mode === 'jugar') mode = 'visionado';
    const w = st.world; const userSide = duel ? -1 : f.h === st.userTeam ? 0 : 1;
    const lh = LG.lineupFor(st, f.h), la = LG.lineupFor(st, f.a);
    const so = LG.simOpts(st, f, [lh, la], null);
    const R = U.rng(st.season * 100 + st.day);
    const weather = R() < 0.12 ? 'lluvia' : R() < 0.45 ? 'noche' : 'dia';
    MF.MUI.start({
      world: w, home: f.h, away: f.a, lhome: lh, laway: la, thome: so.thome, taway: so.taway,
      simExtra: { drainMul: so.drainMul, injuryMul: so.injuryMul }, assistantStars: LG.stf(st, 'segundo'), seed: st.season * 1000 + st.day * 7 + 3,
      ko: f.comp === 'cup' || !!f.ko, agg: f.leg === 1 && f.tie && f.tie.legs[0] ? [f.tie.legs[0].ag, f.tie.legs[0].hg] : null,
      attendance: LG.attendance(st, f).att, capacity: LG.attendance(st, f).cap,
      mode, human: mode === 'jugar' ? userSide : -1, userSide, weather, label: f.label + (duel ? ' · Duelo de mánagers' : ''), manager: true,
      neutral: !!f.neutral, venue: f.venue || null, cup: f.comp === 'cup' || !!f.final || f.comp === 'supercup' || f.comp === 'inter' || (f.comp === 'cwc' && !!f.ko),
      onEnd: (res) => {
        res.mode = mode;
        if (LG.isMulti(st)) { st.pendingRes = st.pendingRes || {}; st.pendingRes[f.key] = res; save(); MGR.hub(); return; }
        const s = LG.playDay(st, res); save(); MGR.dayResults(s);
      },
      onTactics: (t) => { if (!duel) st.tactics = Object.assign({}, t); },
    });
  };

  MGR.dayResults = function (summary) {
    const st = MGR.st; if (!summary) return MGR.route();
    const myDiv = T(st.userTeam).div;
    const sec = (title, list) => '<div class="panel"><h3>' + title + '</h3><div class="tbl-wrap"><table class="tbl"><tbody>' + list.map(({ f, res }) => {
      const me = LG.isManaged(st, f.h) || LG.isManaged(st, f.a);
      const g = res.events.filter((e) => e.type === 'goal');
      const extra = (res.et ? ' <small>pr.</small>' : '') + (res.pens ? '<br><small>pen. ' + res.pens[0] + '-' + res.pens[1] + '</small>' : '') + (f.leg === 1 && f.tie && f.tie.legs[0] ? '<br><small>ida ' + f.tie.legs[0].hg + '-' + f.tie.legs[0].ag + ' · global ' + (res.score[0] + f.tie.legs[0].ag) + '-' + (res.score[1] + f.tie.legs[0].hg) + '</small>' : '');
      const wcls = (s) => ((f.comp === 'cup' || f.ko) && res.winSide === s ? ' style="font-weight:800"' : '');
      return '<tr class="' + (me ? 'me' : '') + '"><td' + wcls(0) + '>' + GFX.badgeImg(T(f.h), 18) + ' ' + esc(T(f.h).short) + '</td><td class="c"><b>' + res.score[0] + ' - ' + res.score[1] + '</b>' + extra + '</td><td' + wcls(1) + '>' + GFX.badgeImg(T(f.a), 18) + ' ' + esc(T(f.a).short) + '</td><td class="muted hide-sm" style="white-space:normal">' + g.map((e) => esc(st.world.players[e.pid] ? st.world.players[e.pid].short : '') + ' ' + e.min + '\'').join(', ') + '</td></tr>';
    }).join('') + '</tbody></table></div></div>';
    const d1 = summary.filter((x) => x.f.comp === 1), d2 = summary.filter((x) => x.f.comp === 2), po = summary.filter((x) => x.f.comp === 'playoff');
    const parts = [];
    const lbl = (arr) => arr[0].f.label;
    const order = myDiv === 1 ? [d1, d2] : [d2, d1];
    order.forEach((arr) => { if (arr.length) parts.push(sec(esc(lbl(arr)), arr)); });
    if (po.length) parts.push(sec(esc(po[0].f.label), po));
    const cupR = summary.filter((x) => x.f.comp === 'cup');
    if (cupR.length) {
      cupR.sort((x, y) => (LG.involvesMgr(st, y.f) ? 1 : 0) - (LG.involvesMgr(st, x.f) ? 1 : 0));
      parts.push(sec('🏆 ' + esc(cupR[0].f.label), cupR));
      const C = st.cup;
      if (C.winner) parts.unshift('<div class="panel center"><div class="big">' + GFX.badgeImg(T(C.winner), 56) + ' ' + esc(T(C.winner).name) + '</div><p style="margin:4px 0 0">¡Campeón de la Copa del Rey ' + DB.SEASON_LABEL(C.season) + '! Final en el ' + esc(C.venue.stadium) + '.</p></div>');
      else if (C.rounds[C.round]) parts.push('<div class="panel"><h3>Sorteo: ' + esc(C.rounds[C.round].label) + '</h3><p class="muted" style="margin:0">Se jugará antes de la jornada ' + (C.rounds[C.round].day + 1) + ' de Liga. Consulta los cruces en el apartado Copa del Rey.</p></div>');
    }
    const intl = summary.filter((x) => typeof x.f.comp === 'string' && x.f.comp !== 'cup' && x.f.comp !== 'playoff');
    if (intl.length) {
      const mine = (x) => (LG.involvesMgr(st, x.f) ? 1 : 0);
      const sp = (x) => (!T(x.f.h).foreign || !T(x.f.a).foreign ? 1 : 0);
      intl.sort((x, y) => mine(y) - mine(x) || sp(y) - sp(x));
      parts.push(sec((intl[0].f.comp === 'supes' ? '🎖️ ' : '🌍 ') + esc(intl[0].f.label), intl.slice(0, 18)));
      if (intl.length > 18) parts.push('<p class="muted" style="margin:-4px 0 8px">… y ' + (intl.length - 18) + ' partidos más en «Competiciones internacionales».</p>');
    }
    UI.show(UI.head(cupR.length ? 'Resultados de Copa' : intl.length ? 'Resultados internacionales' : 'Resultados de la jornada', null, null) + '<div class="wrap">' + parts.join('') +
      '<nav class="menu" style="max-width:none"><button class="bar gold" data-act="cont" data-key="Enter" autofocus><span class="n">▶</span><span class="t">Continuar</span></button><button class="bar small" data-act="tbl"><span class="n">4</span><span class="t">Ver clasificación</span></button></nav></div>',
      { cont: () => MGR.route(), tbl: () => MGR.table(myDiv) });
  };

  // ---------- alineación (con informe táctico y once del segundo entrenador)
  MGR.reportHTML = function (L, T) {
    const st = MGR.st; const r = LG.tacticReport(st, L, T);
    const tn = { equilibrada: 'equilibrado', ofensiva: 'ofensivo', defensiva: 'defensivo' };
    const who = st.staff && st.staff.segundo ? '<img src="' + GFX.staffFace(st.staff.segundo, 40) + '" width="32" height="32" alt="" style="vertical-align:middle;border:2px solid #1d2126"> ' + esc(st.staff.segundo.name) + ' ' + UI.starsN(r.n) : '';
    if (!r.notes) return '<h3>Informe táctico</h3><p style="margin:0">' + esc(r.text) + '</p>';
    return '<h3>Informe táctico · ' + who + '</h3>' +
      (r.oppTac ? '<p style="margin:0 0 4px">Esperamos al ' + esc(T_(r.opp).short) + ' con estilo ' + tn[r.oppTac.style] + ', presión ' + r.oppTac.press + ' y pases ' + r.oppTac.passing + 's.</p>' : '') +
      '<div class="notes">' + (r.notes.length ? r.notes.map((x) => '<span class="' + (x.v >= 0 ? 'pos' : 'neg') + '">' + (x.v >= 0 ? '▲ ' : '▼ ') + esc(x.txt) + '</span>').join('') : '<span>Planteamiento neutro: ni ventajas ni desventajas claras.</span>') + '</div>' +
      (r.win ? '<p class="muted" style="margin:6px 0 0">Previsión: victoria ' + Math.round(r.win.w * 100) + '% · empate ' + Math.round(r.win.d * 100) + '% · derrota ' + Math.round(r.win.l * 100) + '%</p>' : '<p class="muted" style="margin:6px 0 0">Un segundo entrenador con más estrellas os daría un informe más completo.</p>');
  };
  const T_ = (id) => MGR.st.world.teams[id];
  MGR.lineup = function () {
    const st = MGR.st;
    UI.lineupEditor({ world: st.world, tid: st.userTeam, lineup: LG.userLineup(st), tactics: st.tactics, title: 'Alineación y táctica',
      report: (L, T) => MGR.reportHTML(L, T), autoFn: (fm) => LG.assistantPlan(st, fm), onDone: (l, t) => { st.lineup = l; st.tactics = t; T(st.userTeam).formation = l.formation; save(); MGR.hub(); } });
  };

  // ---------- plantilla
  MGR.sortSquad = 'line';
  MGR.squad = function () {
    const st = MGR.st; const w = st.world;
    const sq = DB.teamPlayers(w, st.userTeam);
    const so = MGR.sortSquad;
    const L = ['POR', 'DEF', 'MED', 'DEL'];
    sq.sort((a, b) => so === 'ovr' ? b.ovr - a.ovr : so === 'age' ? a.age - b.age : so === 'value' ? b.value - a.value : so === 'g' ? b.st.g - a.st.g : (L.indexOf(a.line) - L.indexOf(b.line)) || b.ovr - a.ovr);
    const th = (k, l, cls) => '<th class="' + (cls || '') + '"><button class="tab ' + (so === k ? 'on' : '') + '" style="padding:2px 6px;font-size:11px" data-act="sort" data-k="' + k + '">' + l + '</button></th>';
    UI.show(MGR.top() + UI.head('Plantilla', sq.length + ' jugadores · masa salarial ' + U.money(LG.wageBill(st, st.userTeam)) + '/temporada', 'back') + '<div class="wrap"><div class="panel" style="padding:6px"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th>' + th('line', 'Pos') + '<th>Jugador</th>' + th('ovr', 'Med', 'num') + th('age', 'Edad', 'num hide-sm') + '<th class="hide-sm">Forma</th><th class="num hide-sm">Moral</th>' + th('g', 'G', 'num') + '<th class="num hide-sm">PJ</th><th class="num hide-sm">Nota</th>' + th('value', 'Valor', 'num hide-sm') + '</tr></thead><tbody>' +
      sq.map((p) => '<tr class="click" data-act="pl" data-id="' + p.id + '"><td>' + p.num + '</td><td>' + UI.pos(p) + '</td><td><img src="' + GFX.face(p, T(p.team).kit.home.p, 40) + '" width="20" height="20" alt="" style="vertical-align:middle"> ' + esc(p.name) + UI.status(p) + (st.lineup.xi.indexOf(p.id) >= 0 ? '<span class="tag t-xi">XI</span>' : '') + '</td><td class="num">' + UI.ovr(p.ovr) + '</td><td class="num hide-sm">' + p.age + '</td><td class="hide-sm">' + UI.fit(p.fit) + '</td><td class="num hide-sm">' + Math.round(p.mor) + '</td><td class="num">' + p.st.g + '</td><td class="num hide-sm">' + p.st.pj + '</td><td class="num hide-sm">' + (p.st.ps ? (p.st.rat / p.st.ps).toFixed(1) : '—') + '</td><td class="num hide-sm">' + U.money(p.value) + '</td></tr>').join('') +
      '</tbody></table></div></div></div>',
      { back: () => MGR.hub(), sort: (el) => { MGR.sortSquad = el.dataset.k; MGR.squad(); }, pl: (el) => MGR.playerModal(+el.dataset.id, () => MGR.squad()) });
  };

  MGR.playerModal = function (pid, refresh) {
    const st = MGR.st; const p = st.world.players[pid]; const mine = p.team === st.userTeam;
    const win = LG.isWindow(st);
    let actions = '', acts = {};
    if (mine) {
      const offers = st.offers.filter((o) => o.pid === pid);
      actions = '<div class="panel"><h3>Mercado</h3>' + (offers.length ? MGR.offersHTML(offers) : '<p class="muted" style="margin:0 0 8px">' + (win ? 'Puedes ponerlo en venta para recibir ofertas (también de clubes extranjeros).' : 'El mercado está cerrado hasta la próxima temporada.') + '</p>') +
        (win ? '<button class="btn" data-act="sell">Poner en venta</button>' : '') + '</div>';
      acts = Object.assign(MGR.offerActs(() => { UI.closeModal(); refresh(); }), { sell: () => { const r = LG.listForSale(st, pid); UI.toast(r.msg); save(); MGR.playerModal(pid, refresh); } });
    } else {
      const ask = LG.askingPrice(st, p); const fx = T(p.team).div >= 4;
      actions = '<div class="panel"><h3>Hacer una oferta</h3>' + (win ? '<p class="muted" style="margin-top:0">' + (fx ? 'Juega en el ' + esc(T(p.team).name) + ' (' + esc(T(p.team).country || '') + '). Su club pide en torno a ' : 'El ' + esc(T(p.team).short) + ' valora al jugador en torno a ') + U.money(ask) + '. Tu presupuesto: ' + U.money(T(st.userTeam).budget) + '.' + (fx ? ' Las estrellas solo aceptan proyectos a su altura.' : '') + '</p><div class="row"><label class="f" style="flex:1">Importe (millones de €)<input type="number" id="offer" min="0" step="0.1" value="' + Math.max(0.1, Math.round(p.value * 10) / 10) + '"></label><button class="btn goldb" data-act="offer">Enviar oferta</button></div><div id="offerMsg"></div>' : '<p class="muted" style="margin:0">El mercado está cerrado desde la jornada 30 hasta la próxima temporada.</p>') + '</div>';
      acts = {
        offer: () => {
          const v = parseFloat(document.getElementById('offer').value); if (!(v > 0)) { UI.toast('Introduce un importe válido.'); return; }
          const r = LG.makeOffer(st, pid, v); const box = document.getElementById('offerMsg');
          if (r.ok) { save(); UI.closeModal(); UI.toast(r.msg); A.sfxPlay('win'); refresh(); return; }
          box.innerHTML = '<p style="margin:8px 0 0;font-weight:700">' + esc(r.msg) + '</p>' + (r.counter ? '<button class="btn" data-act="counter" data-v="' + r.counter + '" style="margin-top:6px">Aceptar ' + U.money(r.counter) + '</button>' : '');
        },
        counter: (el) => { const r = LG.makeOffer(st, pid, +el.dataset.v); UI.toast(r.msg); if (r.ok) { save(); UI.closeModal(); refresh(); } },
      };
    }
    UI.playerModal(st.world, pid, { actions, acts });
  };

  // ---------- mercado
  MGR.mf = { line: 'ALL', div: 0, min: 65, max: 0, q: '', page: 0, sort: 'ovr' };
  MGR.market = function () {
    const st = MGR.st; const w = st.world; const F = MGR.mf; const me = T(st.userTeam);
    const win = LG.isWindow(st);
    let list = Object.values(w.players).filter((p) => p.team !== st.userTeam && w.teams[p.team] && (F.div ? (F.div === 4 ? w.teams[p.team].div >= 4 : w.teams[p.team].div === F.div) : true) && (F.line === 'ALL' || p.line === F.line) && p.ovr >= F.min);
    if (F.q) { const q = F.q.toLowerCase(); list = list.filter((p) => p.name.toLowerCase().indexOf(q) >= 0 || w.teams[p.team].short.toLowerCase().indexOf(q) >= 0); }
    if (F.max) list = list.filter((p) => LG.askingPrice(st, p) <= F.max);
    list.sort((a, b) => F.sort === 'value' ? a.value - b.value : F.sort === 'age' ? a.age - b.age : b.ovr - a.ovr || a.value - b.value);
    const per = 40; const pages = Math.max(1, Math.ceil(list.length / per)); F.page = Math.min(F.page, pages - 1);
    const shown = list.slice(F.page * per, F.page * per + per);
    const offers = st.offers.filter((o) => w.players[o.pid] && w.players[o.pid].team === st.userTeam);
    UI.show(MGR.top() + UI.head('Mercado de fichajes', (win ? 'Abierto hasta la jornada ' + LG.MARKET_CLOSE : 'CERRADO hasta la próxima temporada') + ' · Presupuesto ' + U.money(me.budget), 'back') + '<div class="wrap">' +
      (offers.length ? '<div class="panel"><h3>Ofertas por tus jugadores</h3>' + MGR.offersHTML(offers) + '</div>' : '') +
      '<div class="panel" style="display:flex;flex-direction:column;gap:8px"><div class="row"><div class="tabs">' + [['ALL', 'Todos'], ['POR', 'Porteros'], ['DEF', 'Defensas'], ['MED', 'Medios'], ['DEL', 'Delanteros']].map(([k, l]) => '<button class="tab ' + (F.line === k ? 'on' : '') + '" data-act="f" data-k="line" data-v="' + k + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="row"><div class="tabs">' + [[0, 'Todas'], [1, 'Primera'], [2, 'Segunda'], [3, '1ª RFEF'], [4, 'Otras ligas']].map(([k, l]) => '<button class="tab ' + (F.div === k ? 'on' : '') + '" data-act="f" data-k="div" data-v="' + k + '">' + l + '</button>').join('') + '</div>' +
      '<label class="f" style="flex:1;min-width:140px">Buscar jugador o club<input type="text" id="mq" value="' + esc(F.q) + '" placeholder="Nombre…"></label>' +
      '<label class="f" style="width:110px">Media mínima<input type="number" id="mmin" min="40" max="95" value="' + F.min + '"></label><label class="f" style="width:130px">Precio máx. (M€)<input type="number" id="mmax" min="0" step="1" value="' + (F.max || '') + '" placeholder="sin límite"></label><button class="btn" data-act="apply">Filtrar</button></div></div>' +
      '<div class="panel" style="padding:6px"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pos</th><th>Jugador</th><th>Club</th><th class="num">Med</th><th class="num hide-sm">Edad</th><th class="num">Precio</th></tr></thead><tbody>' +
      (shown.length ? shown.map((p) => '<tr class="click" data-act="pl" data-id="' + p.id + '"><td>' + UI.pos(p) + '</td><td>' + esc(p.name) + '</td><td>' + GFX.badgeImg(w.teams[p.team], 18) + ' <span class="hide-sm">' + esc(w.teams[p.team].short) + '</span></td><td class="num">' + UI.ovr(p.ovr) + '</td><td class="num hide-sm">' + p.age + '</td><td class="num">' + U.money(LG.askingPrice(st, p)) + '</td></tr>').join('') : '<tr><td colspan="6">No hay jugadores con esos filtros.</td></tr>') +
      '</tbody></table></div><div class="pager"><button class="btn alt" data-act="pg" data-d="-1" ' + (F.page <= 0 ? 'disabled' : '') + '>◀</button><span>Página ' + (F.page + 1) + ' de ' + pages + ' · ' + list.length + ' jugadores</span><button class="btn alt" data-act="pg" data-d="1" ' + (F.page >= pages - 1 ? 'disabled' : '') + '>▶</button></div></div></div>',
      Object.assign(MGR.offerActs(() => MGR.market()), {
        back: () => MGR.hub(),
        f: (el) => { F[el.dataset.k] = el.dataset.k === 'line' ? el.dataset.v : +el.dataset.v; F.page = 0; MGR.market(); },
        apply: () => { F.q = document.getElementById('mq').value.trim(); F.min = +document.getElementById('mmin').value || 0; F.max = +document.getElementById('mmax').value || 0; F.page = 0; MGR.market(); },
        pg: (el) => { F.page += +el.dataset.d; MGR.market(); },
        pl: (el) => MGR.playerModal(+el.dataset.id, () => MGR.market()),
      }));
    const q = document.getElementById('mq'); if (q) q.addEventListener('keydown', (e) => { if (e.key === 'Enter') UI.act.apply(); });
  };

  // ---------- clasificación
  MGR.table = function (dv) {
    const st = MGR.st; const rows = LG.table(st, dv);
    const zone = (pos) => {
      if (dv === 1) return pos <= 4 ? 'z-ucl' : pos === 5 ? 'z-uel' : pos === 6 ? 'z-uecl' : pos >= 18 ? 'z-down' : '';
      return pos <= 2 ? 'z-up' : pos <= 6 ? 'z-po' : pos >= 19 ? 'z-down' : '';
    };
    const legend = dv === 1 ? '<span class="zone z-ucl"></span>Champions <span class="zone z-uel"></span>Europa League <span class="zone z-uecl"></span>Conference <span class="zone z-down"></span>Descenso' : '<span class="zone z-up"></span>Ascenso directo <span class="zone z-po"></span>Playoff de ascenso <span class="zone z-down"></span>Descenso a 1ª RFEF';
    UI.show(MGR.top() + UI.head('Clasificación', divName(dv) + ' ' + DB.SEASON_LABEL(st.season), 'back') + '<div class="wrap"><div class="tabs">' + [[1, 'Primera'], [2, 'Segunda']].map(([d, l]) => '<button class="tab ' + (d === dv ? 'on' : '') + '" data-act="dv" data-d="' + d + '">' + l + '</button>').join('') + '</div>' +
      '<div class="panel" style="padding:6px"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Equipo</th><th class="num">Pts</th><th class="num">PJ</th><th class="num hide-sm">G</th><th class="num hide-sm">E</th><th class="num hide-sm">P</th><th class="num">GF</th><th class="num">GC</th><th class="num">DG</th><th class="hide-sm">Racha</th></tr></thead><tbody>' +
      rows.map((r) => '<tr class="' + (r.id === st.userTeam ? 'me' : '') + '"><td><span class="zone ' + zone(r.pos) + '"></span>' + r.pos + '</td><td>' + GFX.badgeImg(T(r.id), 20) + ' ' + esc(T(r.id).short) + '</td><td class="num"><b>' + r.pts + '</b></td><td class="num">' + r.pj + '</td><td class="num hide-sm">' + r.g + '</td><td class="num hide-sm">' + r.e + '</td><td class="num hide-sm">' + r.p + '</td><td class="num">' + r.gf + '</td><td class="num">' + r.gc + '</td><td class="num">' + (r.gf - r.gc > 0 ? '+' : '') + (r.gf - r.gc) + '</td><td class="hide-sm">' + UI.formHTML(r.form) + '</td></tr>').join('') +
      '</tbody></table></div><p class="muted" style="margin:6px">' + legend + '. Desempate: enfrentamientos directos, diferencia de goles y goles a favor.</p></div>' +
      (dv === 2 && st.playoff ? MGR.bracketHTML() : '') + '</div>',
      { back: () => MGR.hub(), dv: (el) => MGR.table(+el.dataset.d) });
  };

  MGR.bracketHTML = function () {
    const st = MGR.st; const P = st.playoff; if (!P) return '';
    const tie = (t, title) => {
      if (!t) return '<div class="tie"><b>' + title + '</b><br>Por decidir</div>';
      const legs = t.legs.map((l, i) => l ? (i ? 'Vuelta: ' : 'Ida: ') + esc(T(l.h).short) + ' ' + l.hg + '-' + l.ag + ' ' + esc(T(l.a).short) : '').filter(Boolean).join('<br>');
      const w = t.legs.length === 2 && t.legs[1] ? LG.tieWinner(st, t) : null; const nm = (id) => (w === id ? '<b>' + esc(T(id).short) + ' ✓</b>' : esc(T(id).short));
      return '<div class="tie"><b>' + title + '</b><br>' + nm(t.a) + ' vs ' + nm(t.b) + (legs ? '<br>' + legs : '') + '</div>';
    };
    return '<div class="panel"><h3>Playoff de ascenso</h3><div class="bracket">' + tie(P.semis[0], 'Semifinal 1 (3º-6º)') + tie(P.semis[1], 'Semifinal 2 (4º-5º)') + '</div><div style="margin-top:8px">' + tie(P.final, 'Final') + '</div>' + (P.winner ? '<p><b>Asciende: ' + esc(T(P.winner).name) + '</b></p>' : '') + '<p class="muted">Ida en el campo del peor clasificado. Si hay empate en el global, pasa el mejor clasificado.</p></div>';
  };

  // ---------- calendario
  MGR.calendar = function (rnd, dvSel) {
    const st = MGR.st; const dv = dvSel || T(st.userTeam).div; const c = st.comp[dv];
    if (rnd === undefined) rnd = Math.min(st.day, c.rounds.length - 1);
    rnd = U.clamp(rnd, 0, c.rounds.length - 1);
    const games = c.rounds[rnd].map(([h, a], i) => { const r = c.res[rnd + '_' + i]; return '<tr class="' + (h === st.userTeam || a === st.userTeam ? 'me' : '') + '"><td>' + GFX.badgeImg(T(h), 18) + ' ' + esc(T(h).short) + '</td><td class="c"><b>' + (r ? r.hg + ' - ' + r.ag : '–') + '</b></td><td>' + GFX.badgeImg(T(a), 18) + ' ' + esc(T(a).short) + '</td><td class="muted hide-sm" style="white-space:normal">' + (r && r.g ? r.g.map((g) => esc(st.world.players[g[2]] ? st.world.players[g[2]].short : '') + ' ' + g[1] + '\'').join(', ') : '') + '</td></tr>'; }).join('');
    const mine = c.teams.indexOf(st.userTeam) >= 0 ? c.rounds.map((r, ri) => { const i = r.findIndex(([h, a]) => h === st.userTeam || a === st.userTeam); if (i < 0) return ''; const [h, a] = r[i]; const res = c.res[ri + '_' + i]; const home = h === st.userTeam; const opp = home ? a : h; let cls = ''; if (res) { const gf = home ? res.hg : res.ag, ga = home ? res.ag : res.hg; cls = gf > ga ? 'V' : gf < ga ? 'D' : 'E'; } return '<tr class="click" data-act="go" data-r="' + ri + '"><td>J' + (ri + 1) + '</td><td>' + (home ? 'Casa' : 'Fuera') + '</td><td>' + GFX.badgeImg(T(opp), 18) + ' ' + esc(T(opp).short) + '</td><td class="c">' + (res ? '<span class="form"><i class="' + cls + '">' + cls + '</i></span> ' + res.hg + '-' + res.ag : '') + '</td></tr>'; }).join('') : '';
    UI.show(MGR.top() + UI.head('Calendario y resultados', divName(dv), 'back') + '<div class="wrap"><div class="tabs">' + [[1, 'Primera'], [2, 'Segunda']].map(([d, l]) => '<button class="tab ' + (d === dv ? 'on' : '') + '" data-act="dv" data-d="' + d + '">' + l + '</button>').join('') + '</div>' +
      '<div class="cols-2"><div class="panel"><div class="pager"><button class="btn alt" data-act="go" data-r="' + (rnd - 1) + '" ' + (rnd <= 0 ? 'disabled' : '') + '>◀</button><b>Jornada ' + (rnd + 1) + ' de ' + c.rounds.length + '</b><button class="btn alt" data-act="go" data-r="' + (rnd + 1) + '" ' + (rnd >= c.rounds.length - 1 ? 'disabled' : '') + '>▶</button></div><div class="tbl-wrap"><table class="tbl"><tbody>' + games + '</tbody></table></div></div>' +
      (mine ? '<div class="panel" style="padding:6px"><h3 style="margin:4px">Calendario del ' + esc(T(st.userTeam).short) + '</h3><div class="tbl-wrap" style="max-height:60vh;overflow-y:auto"><table class="tbl"><tbody>' + mine + '</tbody></table></div></div>' : '') + '</div>' +
      (st.playoff ? MGR.bracketHTML() : '') + '</div>',
      { back: () => MGR.hub(), go: (el) => MGR.calendar(+el.dataset.r, dv), dv: (el) => MGR.calendar(undefined, +el.dataset.d) });
  };

  // ---------- estadísticas
  MGR.stats = function (dv) {
    const st = MGR.st; const w = st.world;
    const pool = Object.values(w.players).filter((p) => w.teams[p.team] && w.teams[p.team].div === dv);
    const tbl = (title, list, val, extra) => '<div class="panel" style="padding:6px"><h3 style="margin:4px">' + title + '</h3><div class="tbl-wrap"><table class="tbl"><tbody>' + (list.length ? list.map((p, i) => '<tr class="click ' + (p.team === st.userTeam ? 'me' : '') + '" data-act="pl" data-id="' + p.id + '"><td>' + (i + 1) + '</td><td>' + esc(p.name) + '</td><td>' + GFX.badgeImg(w.teams[p.team], 18) + ' <span class="hide-sm">' + esc(w.teams[p.team].short) + '</span></td><td class="num"><b>' + val(p) + '</b></td>' + (extra ? '<td class="num muted">' + extra(p) + '</td>' : '') + '</tr>').join('') : '<tr><td>Aún no hay datos.</td></tr>') + '</tbody></table></div></div>';
    const minPs = Math.max(1, Math.floor(st.day * 0.4));
    UI.show(MGR.top() + UI.head('Estadísticas', divName(dv), 'back') + '<div class="wrap"><div class="tabs">' + [[1, 'Primera'], [2, 'Segunda']].map(([d, l]) => '<button class="tab ' + (d === dv ? 'on' : '') + '" data-act="dv" data-d="' + d + '">' + l + '</button>').join('') + '</div><div class="grid2">' +
      tbl('Pichichi (goles)', LG.scorers(st, dv, 12), (p) => p.st.g, (p) => p.st.pj + ' PJ') +
      tbl('Asistencias', pool.filter((p) => p.st.a > 0).sort((a, b) => b.st.a - a.st.a).slice(0, 12), (p) => p.st.a) +
      tbl('Zamora (goles encajados por partido)', LG.keepers(st, dv, 10), (p) => (p.st.gc / p.st.pjp).toFixed(2), (p) => p.st.pjp + ' PJ') +
      tbl('Mejor nota media', pool.filter((p) => p.st.ps >= minPs).sort((a, b) => b.st.rat / b.st.ps - a.st.rat / a.st.ps).slice(0, 12), (p) => (p.st.rat / p.st.ps).toFixed(2)) +
      tbl('Tarjetas', pool.filter((p) => p.st.ta + p.st.tr > 0).sort((a, b) => (b.st.ta + b.st.tr * 3) - (a.st.ta + a.st.tr * 3)).slice(0, 12), (p) => p.st.ta + ' TA', (p) => p.st.tr + ' TR') +
      '</div></div>',
      { back: () => MGR.hub(), dv: (el) => MGR.stats(+el.dataset.d), pl: (el) => MGR.playerModal(+el.dataset.id, () => MGR.stats(dv)) });
  };

  // ---------- entrenamiento
  MGR.TRAIN = {
    equilibrado: ['Equilibrado', 'Recuperación normal y mantenimiento del nivel.'],
    fisico: ['Físico', 'Mejor recuperación entre jornadas. Ideal con calendario cargado.'],
    tecnico: ['Técnico', 'Los jóvenes (23 años o menos) pueden mejorar su media; la recuperación es algo menor.'],
    tactico: ['Táctico', 'El grupo gana confianza: la moral sube cada semana.'],
    descanso: ['Descanso', 'Máxima recuperación física. Útil tras varios partidos exigentes.'],
  };
  MGR.training = function () {
    const st = MGR.st; const sq = DB.teamPlayers(st.world, st.userTeam).sort((a, b) => a.fit - b.fit);
    UI.show(MGR.top() + UI.head('Entrenamiento', 'Plan semanal del primer equipo', 'back') + '<div class="wrap"><div class="grid3">' +
      Object.entries(MGR.TRAIN).map(([k, [n, d]]) => '<button class="panel" style="text-align:left;cursor:pointer;border-color:' + (st.training === k ? '#1d2126' : '#6e7378') + ';background:' + (st.training === k ? '#fff3b0' : '') + '" data-act="set" data-k="' + k + '"><h3>' + n + (st.training === k ? ' ✓' : '') + '</h3><span class="muted">' + d + '</span></button>').join('') +
      '</div><div class="panel" style="padding:6px"><h3 style="margin:4px">Estado físico de la plantilla</h3><div class="tbl-wrap"><table class="tbl"><tbody>' + sq.map((p) => '<tr><td>' + UI.pos(p) + '</td><td>' + esc(p.name) + UI.status(p) + '</td><td>' + UI.fit(p.fit) + ' ' + Math.round(p.fit) + '%</td><td class="num">Moral ' + Math.round(p.mor) + '</td></tr>').join('') + '</tbody></table></div></div></div>',
      { back: () => MGR.hub(), set: (el) => { st.training = el.dataset.k; save(); MGR.training(); } });
  };

  // ---------- finanzas
  MGR.finance = function () {
    const st = MGR.st; const t = T(st.userTeam);
    const est = LG.ticketIncome(st, t, null);
    const wages = LG.wageBill(st, t.id);
    const log = st.finance.log.slice(0, 15);
    UI.show(MGR.top() + UI.head('Finanzas', esc(t.stadium) + ' · ' + t.cap.toLocaleString('es-ES') + ' localidades', 'back') + '<div class="wrap"><div class="grid2">' +
      '<div class="panel"><h3>Resumen</h3><div class="kv"><b>Presupuesto</b><span>' + U.money(t.budget) + '</span><b>Masa salarial</b><span>' + U.money(wages) + ' / temporada</span><b>Derechos de TV</b><span>' + U.money(LG.tvIncome(t)) + ' por jornada</span><b>Último público</b><span>' + (st.lastAttendance ? st.lastAttendance.toLocaleString('es-ES') : '—') + '</span></div></div>' +
      '<div class="panel"><h3>Precio de la entrada</h3><div class="row"><input type="range" min="10" max="150" step="1" value="' + t.ticket + '" data-inp="tp" id="tp" aria-label="Precio de la entrada"><b id="tpv" style="min-width:56px">' + t.ticket + ' €</b></div><p class="muted" id="tpe">Asistencia estimada: ' + est.att.toLocaleString('es-ES') + ' · ' + U.money(est.money) + ' por partido en casa</p></div></div>' +
      '<div class="panel"><h3>Premios por competición</h3><div class="tbl-wrap"><table class="tbl"><tbody>' +
      [['Liga (Primera)', 'Por puesto: de ' + U.money(21) + ' (1º) a ' + U.money(2) + ' · campeón +' + U.money(LG.TITLE_PRIZE.liga)], ['Segunda', 'Por puesto hasta ' + U.money(5.5) + ' · campeón +' + U.money(LG.TITLE_PRIZE.segunda) + ' · ascenso +' + U.money(10)],
        ['Copa del Rey', 'Por ronda superada ' + LG.CUP_PRIZE.slice(0, 5).map((x) => U.money(x)).join(' · ') + ' · campeón +' + U.money(LG.CUP_PRIZE[5] + LG.TITLE_PRIZE.copa)], ['Supercopa de España', U.money(LG.TITLE_PRIZE.supes_semi) + ' semifinal · ' + U.money(LG.TITLE_PRIZE.supes_final) + ' final · campeón ' + U.money(LG.TITLE_PRIZE.supes)]]
        .concat(MF.EU ? ['ucl', 'uel', 'uecl'].map((c) => { const P = MF.EU.CFG[c].prize; return [MF.EU.CFG[c].name, 'Participación ' + U.money(P.part) + ' · victoria ' + U.money(P.win) + ' · por ronda superada (fase de liga, previa, octavos, cuartos, semifinales): ' + P.ko.map((x) => U.money(x)).join(' · ') + ' · campeón +' + U.money(P.champ)]; }).concat([['Supercopa de Europa', 'Campeón ' + U.money(4) + ' · finalista ' + U.money(2.5)], ['Intercontinental', 'Campeón ' + U.money(5) + ' · finalista ' + U.money(2.5)], ['Mundial de Clubes', 'Participación ' + U.money(15) + ' · victoria ' + U.money(2) + ' · rondas ' + U.money(4) + '-' + U.money(12)]]) : [])
        .map(([a, b]) => '<tr><td><b>' + esc(a) + '</b></td><td style="white-space:normal">' + esc(b) + '</td></tr>').join('') + '</tbody></table></div></div>' +
      '<div class="panel" style="padding:6px"><h3 style="margin:4px">Movimientos recientes</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Jornada</th><th>Concepto</th><th class="num">Importe</th></tr></thead><tbody>' +
      (log.length ? log.map((l) => l.items.map((it, i) => '<tr><td>' + (i === 0 ? 'J' + (l.d + 1) + ' · ' + DB.SEASON_LABEL(l.s) : '') + '</td><td>' + esc(it[0]) + '</td><td class="num" style="color:' + (it[1] < 0 ? '#a01818' : '#1e6b2a') + '">' + U.money(it[1]) + '</td></tr>').join('')).join('') : '<tr><td colspan="3">Todavía no hay movimientos.</td></tr>') + '</tbody></table></div></div></div>',
      {
        back: () => MGR.hub(),
        tp: (el) => { t.ticket = +el.value; const e = LG.ticketIncome(st, t, null); document.getElementById('tpv').textContent = t.ticket + ' €'; document.getElementById('tpe').textContent = 'Asistencia estimada: ' + e.att.toLocaleString('es-ES') + ' · ' + U.money(e.money) + ' por partido en casa'; save(); },
      });
  };

  // ---------- club, directiva, palmarés, cantera e historial
  MGR.TROPHY = { liga: ['🏆', 'Liga'], copa: ['🏅', 'Copa del Rey'], ucl: ['🌟', 'Champions'], uel: ['⭐', 'Europa League'], uecl: ['💠', 'Conference League'], recopa: ['🥈', 'Recopa'], supercopa: ['🛡️', 'Supercopa de Europa'], inter: ['🌐', 'Intercontinental'], mundial: ['🌍', 'Mundial de Clubes'], supes: ['🎖️', 'Supercopa de España'], segunda: ['🥇', 'Liga de Segunda'], playoff: ['🎢', 'Playoff de ascenso'] };
  MGR.palmaresHTML = function (t) {
    const st = MGR.st; const real = t.titles || {}; const game = t.gtitles || {};
    const tile = (k, n, cls) => '<div class="trophy ' + (cls || '') + '"><span class="ico" aria-hidden="true">' + MGR.TROPHY[k][0] + '</span><span class="num">' + n + '</span><span class="lbl">' + MGR.TROPHY[k][1] + '</span></div>';
    const realT = ['liga', 'copa', 'ucl', 'uel', 'recopa'].filter((k) => real[k] > 0);
    const gameT = ['liga', 'copa', 'supes', 'ucl', 'uel', 'uecl', 'supercopa', 'inter', 'mundial', 'segunda'].filter((k) => game[k] > 0);
    const mine = (st.trophies || []).filter((x) => x.team === t.id);
    return '<div class="panel"><h3>Palmarés del ' + esc(t.short) + '</h3>' +
      '<p class="muted" style="margin:0 0 6px">Títulos oficiales reales hasta la temporada 2025-26 (Liga, Copa del Rey y competiciones europeas).</p>' +
      (realT.length ? '<div class="trophies">' + realT.map((k) => tile(k, real[k])).join('') + '</div>' : '<p style="margin:0">Todavía sin títulos de Liga, Copa ni europeos. ¡Puede ser tu oportunidad!</p>') +
      '<h3 style="margin-top:12px">Conquistados en esta partida</h3>' +
      (gameT.length ? '<div class="trophies">' + gameT.map((k) => tile(k, game[k], 'game')).join('') + '</div>' : '<p class="muted" style="margin:0">Aún no ha ganado títulos en tu partida.</p>') +
      (mine.length ? '<p style="margin:8px 0 0"><b>Con ' + esc(st.userName) + ' en el banquillo:</b> ' + mine.map((x) => MGR.TROPHY[x.comp][0] + ' ' + MGR.TROPHY[x.comp][1] + ' ' + DB.SEASON_LABEL(x.season)).join(' · ') + '</p>' : '') + '</div>';
  };
  MGR.club = function () {
    const st = MGR.st; const t = T(st.userTeam); const ys = LG.youthProspects(st); const os = LG.objectiveStatus(st);
    const career = (st.trophies || []);
    UI.show(MGR.top() + UI.head('Club', esc(t.name) + ' · ' + esc(t.city), 'back') + '<div class="wrap"><div class="grid2">' +
      '<div class="panel"><h3>Directiva</h3><div class="kv"><b>Objetivo</b><span>' + esc(st.board.objective.text) + '</span><b>Situación</b><span>' + objChip(os) + ' ' + esc(os.text) + '</span><b>Confianza</b><span>' + Math.round(st.board.conf) + '%</span><b>Posición actual</b><span>' + (st.day > 0 && LG.position(st, t.id) ? LG.position(st, t.id) + 'º' : '—') + '</span></div><p class="muted">Si te alejas mucho del objetivo, la directiva te avisará y después te dará un ultimátum: si no reaccionas en unas jornadas, o si la confianza cae por debajo del 5%, serás destituido. Al terminar la temporada, por debajo del 20% también.</p></div>' +
      MGR.palmaresHTML(t) + '</div>' +
      '<div class="grid2"><div class="panel"><h3>Tu carrera</h3><div class="kv"><b>Temporadas completadas</b><span>' + ((st.ach && st.ach.seasons) || 0) + '</span><b>Clubes dirigidos</b><span>' + ((st.ach && st.ach.clubs) || [st.userTeam]).map((id) => esc(T(id).short)).join(', ') + '</span><b>Títulos</b><span>' + (career.length ? career.map((x) => MGR.TROPHY[x.comp][0] + ' ' + esc(T(x.team).short) + ' ' + DB.SEASON_LABEL(x.season)).join(' · ') : 'ninguno todavía') + '</span><b>Logros</b><span>' + MF.ACH.count() + ' de ' + MF.ACH.DEFS.length + '</span></div><div class="row" style="margin-top:8px"><button class="btn goldb" data-act="logros">🏅 Ver logros</button></div></div>' +
      '<div class="panel"><h3>Cantera</h3>' + (st.youthUsed ? '<p class="muted">Ya has subido un canterano esta temporada.</p>' : '<p class="muted" style="margin-top:0">Puedes subir a uno de estos juveniles al primer equipo (uno por temporada). Son jugadores generados por el juego.</p>') +
      ys.map((y, i) => '<div class="row" style="justify-content:space-between;border-top:1px solid #a3a8ad;padding:4px 0"><span>' + UI.ovr(y.ovr) + ' <span class="pos-tag l-' + DB.LINE_OF[y.role] + '">' + y.role + '</span> ' + esc(y.name) + ' · ' + y.age + ' años · potencial ' + (y.pot >= 80 ? 'alto' : y.pot >= 70 ? 'medio' : 'bajo') + '</span>' + (st.youthUsed ? '' : '<button class="btn" data-act="youth" data-i="' + i + '">Subir</button>') + '</div>').join('') + '</div></div>' +
      '<div class="panel" style="padding:6px"><h3 style="margin:4px">Historial</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Temporada</th><th>Tu club</th><th>Puesto</th><th>Campeón de Liga</th><th>Copa del Rey</th><th class="hide-sm">Ascienden</th><th class="hide-sm">Pichichi</th></tr></thead><tbody>' +
      (st.history.length ? st.history.map((h) => { const hu = LG.histUser(st, h).user; return '<tr><td>' + DB.SEASON_LABEL(h.season) + '</td><td>' + esc(T(hu.team).short) + '</td><td>' + (hu.pos ? hu.pos + 'º ' + (hu.div === 1 ? '1ª' : '2ª') : '—') + (hu.met ? ' ✓' : '') + '</td><td>' + esc(T(h.champ1).short) + '</td><td>' + (h.cup ? esc(T(h.cup[0]).short) : '—') + '</td><td class="hide-sm">' + h.promoted.map((id) => esc(T(id).short)).join(', ') + '</td><td class="hide-sm">' + (h.pich1 ? esc(h.pich1[0]) + ' (' + h.pich1[2] + ')' : '') + '</td></tr>'; }).join('') : '<tr><td colspan="7">Tu primera temporada está en marcha.</td></tr>') + '</tbody></table></div></div></div>',
      { back: () => MGR.hub(), logros: () => UI.achievements(() => MGR.club()), youth: (el) => { const r = LG.signYouth(st, +el.dataset.i); UI.toast(r.msg); save(); MGR.club(); } });
  };

  // ---------- Competiciones internacionales
  MGR.euroMeta = function () {
    const st = MGR.st; const EU = MF.EU; if (!EU || !st.euro || !st.euro.comps) return '—';
    const mine = EU.compsOf(st, st.userTeam);
    if (!mine.length) return 'Sin competición europea';
    const c = mine[0]; const C = st.euro.comps[c];
    if (C.phase === 'done') return C.winner === st.userTeam ? '¡Campeón!' : EU.CFG[c].short + ': eliminado';
    if (!EU.alive(st, c, st.userTeam)) return EU.CFG[c].short + ': eliminado';
    return EU.CFG[c].short + ' · ' + (C.phase === 'league' ? 'fase de liga' : C.ko[C.koIdx].label.toLowerCase());
  };
  MGR.euroTab = null; MGR.euroMd = null;
  MGR.europe = function (tab) {
    const st = MGR.st; const EU = MF.EU; const E = st.euro;
    if (!EU || !E || !E.comps) { UI.show(MGR.top() + UI.head('Competiciones internacionales', null, 'back') + '<div class="wrap"><div class="panel"><p>Las competiciones europeas arrancarán con la próxima temporada.</p></div></div>', { back: () => MGR.hub() }); return; }
    tab = tab || MGR.euroTab || EU.compsOf(st, st.userTeam)[0] || 'ucl'; MGR.euroTab = tab;
    const tabs = [['ucl', '🌟 Champions'], ['uel', '⭐ Europa League'], ['uecl', '💠 Conference'], ['mundo', '🌐 Supercopa, Intercontinental y Mundial'], ['palm', '📜 Palmarés']];
    const nm = (id) => (T(id) ? esc(T(id).short) : '—');
    const badge = (id, n) => (T(id) ? GFX.badgeImg(T(id), n || 18) : '');
    const me = (id) => (id === st.userTeam ? ' class="me"' : !T(id).foreign ? ' style="font-weight:700"' : '');
    let body = '';
    if (EU.CFG[tab]) {
      const C = E.comps[tab]; const tb = EU.table(st, C);
      const zone = (pos) => (pos <= 8 ? 'z-ucl' : pos <= 24 ? 'z-po' : 'z-down');
      const md = MGR.euroMd === null || MGR.euroMd === undefined ? Math.max(0, Math.min(C.mdPlayed - 1, C.md.length - 1)) : MGR.euroMd;
      const mdRows = C.md[md].map(([h, a], i) => { const r = C.res['m' + md + '_' + i]; return '<tr' + (h === st.userTeam || a === st.userTeam ? ' class="me"' : '') + '><td>' + badge(h) + ' ' + nm(h) + '</td><td class="c"><b>' + (r ? r.hg + ' - ' + r.ag : 'vs') + '</b></td><td>' + badge(a) + ' ' + nm(a) + '</td></tr>'; }).join('');
      const koHTML = C.ko.map((K) => '<div class="cup-round"><h4>' + esc(K.label) + ' · ' + (K.stage === 'f' ? 'final en ' + esc(C.venue) : 'antes de las jornadas ' + K.days.map((d) => d + 1).join(' y ')) + '</h4><div class="tbl-wrap"><table class="tbl"><tbody>' + K.ties.map((t) => {
        const legs = t.legs.filter(Boolean).map((l) => nm(l.h) + ' ' + l.hg + '-' + l.ag + ' ' + nm(l.a) + (l.et ? ' (pr.)' : '') + (l.pens ? ' (pen. ' + l.pens[0] + '-' + l.pens[1] + ')' : '')).join(' · ');
        const bold = (id) => (t.w === id ? ' style="font-weight:800"' : '');
        return '<tr' + (t.a === st.userTeam || t.b === st.userTeam ? ' class="me"' : '') + '><td' + bold(t.a) + '>' + badge(t.a) + ' ' + nm(t.a) + '</td><td class="c">vs</td><td' + bold(t.b) + '>' + badge(t.b) + ' ' + nm(t.b) + '</td><td class="muted" style="white-space:normal">' + legs + '</td></tr>';
      }).join('') + '</tbody></table></div></div>').join('');
      const top = Object.entries(C.goals).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([pid, g]) => { const p = st.world.players[pid]; return p ? '<tr><td>' + esc(p.name) + '</td><td>' + badge(p.team) + ' ' + nm(p.team) + '</td><td class="num"><b>' + g + '</b></td></tr>' : ''; }).join('');
      body = (C.winner ? '<div class="panel center"><div class="big">' + badge(C.winner, 44) + ' ' + esc(T(C.winner).name) + '</div><p style="margin:4px 0 0">Campeón de la ' + esc(C.name) + ' · final ante el ' + nm(C.runnerUp) + ' en ' + esc(C.venue) + '</p></div>' : '') +
        '<div class="cols-2"><div class="panel" style="padding:6px"><h3 style="margin:4px">Fase de liga · ' + C.mdPlayed + '/' + C.md.length + ' jornadas</h3><div class="tbl-wrap" style="max-height:70vh;overflow-y:auto"><table class="tbl"><thead><tr><th>#</th><th>Equipo</th><th class="num">Pts</th><th class="num">PJ</th><th class="num hide-sm">DG</th></tr></thead><tbody>' +
        tb.map((r) => '<tr' + me(r.id) + '><td><span class="zone ' + zone(r.pos) + '"></span>' + r.pos + '</td><td>' + badge(r.id) + ' ' + nm(r.id) + '</td><td class="num"><b>' + r.pts + '</b></td><td class="num">' + r.pj + '</td><td class="num hide-sm">' + (r.gf - r.gc > 0 ? '+' : '') + (r.gf - r.gc) + '</td></tr>').join('') +
        '</tbody></table></div><p class="muted" style="margin:6px"><span class="zone z-ucl"></span>1º-8º a octavos <span class="zone z-po"></span>9º-24º eliminatoria previa <span class="zone z-down"></span>eliminados</p></div>' +
        '<div><div class="panel" style="padding:6px"><div class="pager"><button class="btn alt" data-act="md" data-d="' + (md - 1) + '" ' + (md <= 0 ? 'disabled' : '') + '>◀</button><b>Jornada ' + (md + 1) + ' de ' + C.md.length + '</b><button class="btn alt" data-act="md" data-d="' + (md + 1) + '" ' + (md >= C.md.length - 1 ? 'disabled' : '') + '>▶</button></div><div class="tbl-wrap"><table class="tbl"><tbody>' + mdRows + '</tbody></table></div></div>' +
        (koHTML ? '<div class="panel" style="padding:6px"><h3 style="margin:4px">Eliminatorias</h3>' + koHTML + '</div>' : '') +
        (top ? '<div class="panel" style="padding:6px"><h3 style="margin:4px">Goleadores</h3><div class="tbl-wrap"><table class="tbl"><tbody>' + top + '</tbody></table></div></div>' : '') + '</div></div>' +
        '<p class="muted">Formato actual: 36 equipos en una fase de liga (' + C.md.length + ' partidos contra rivales distintos), eliminatoria previa entre el 9º y el 24º, octavos, cuartos y semifinales a doble partido (vuelta en casa del mejor clasificado) y final a partido único en campo neutral.</p>';
    } else if (tab === 'mundo') {
      const S = E.supercup, I = E.inter, W = E.cwc;
      const pens = (x) => (x.pens ? ' (pen. ' + x.pens[0] + '-' + x.pens[1] + ')' : x.et ? ' (pr.)' : '');
      body = '<div class="grid2"><div class="panel"><h3>🛡️ Supercopa de Europa</h3>' + (S ? '<p style="margin:0">' + badge(S.h) + ' ' + nm(S.h) + ' vs ' + badge(S.a) + ' ' + nm(S.a) + ' · ' + esc(S.venue) + '</p>' + (S.played ? '<p><b>' + S.hg + '-' + S.ag + pens(S) + '</b> · campeón: ' + nm(S.w) + (S.real ? ' <span class="muted">(resultado real, agosto de 2026)</span>' : '') + '</p>' : '<p class="muted">Se juega en pretemporada.</p>') : '<p class="muted">Esta temporada no se disputa.</p>') + '</div>' +
        '<div class="panel"><h3>🌐 Copa Intercontinental de la FIFA</h3>' + (I ? '<p style="margin:0">Final: ' + badge(I.champ) + ' ' + nm(I.champ) + ' (campeón de Europa) contra el ganador de la Copa Challenger · ' + esc(I.venue) + ' · antes de la jornada ' + (MF.EU.INTER_DAY + 1) + '</p>' + (I.path.length ? '<p class="muted">' + I.path.map(([l, m]) => esc(l) + ': ' + nm(m.h) + ' ' + m.s[0] + '-' + m.s[1] + ' ' + nm(m.a) + (m.p ? ' (pen.)' : '')).join('<br>') + '</p>' : '') + (I.played ? '<p><b>' + nm(I.champ) + ' ' + I.hg + '-' + I.ag + ' ' + nm(I.opp) + pens(I) + '</b> · campeón: ' + nm(I.w) + '</p>' : '') : '<p class="muted">Sin datos.</p>') + '</div></div>' +
        '<div class="panel"><h3>🌍 Mundial de Clubes</h3>' + (W ? '<p class="muted" style="margin-top:0">32 equipos de las seis confederaciones · 8 grupos de 4 y eliminatorias a partido único · ' + esc(W.venue) + ' (sede por designar por la FIFA).</p><div class="grid2">' + W.groups.map((g, gi) => '<div><h4 style="margin:4px 0">Grupo ' + 'ABCDEFGH'[gi] + '</h4><table class="tbl"><tbody>' + MF.EU.cwcGroup(st, gi).map((r) => '<tr' + me(r.id) + '><td>' + badge(r.id) + ' ' + nm(r.id) + '</td><td class="num">' + r.pts + '</td></tr>').join('') + '</tbody></table></div>').join('') + '</div>' +
          W.ko.map((K) => '<h4 style="margin:8px 0 4px">' + esc(K.label) + '</h4>' + K.ties.map((t) => '<div' + (t.a === st.userTeam || t.b === st.userTeam ? ' style="font-weight:800"' : '') + '>' + nm(t.a) + ' ' + (t.w ? t.hg + '-' + t.ag + pens(t) : 'vs') + ' ' + nm(t.b) + '</div>').join('')).join('') + (W.winner ? '<p><b>Campeón del mundo: ' + esc(T(W.winner).name) + '</b></p>' : '')
          : '<p class="muted" style="margin:0">El próximo Mundial de Clubes (32 equipos) se jugará en el verano de 2029, antes de la temporada 2029/30, y después cada cuatro años. Se clasifican los cuatro últimos campeones de Champions y los mejores clubes europeos del ranking de las últimas temporadas (máximo dos por país), junto a los campeones de las demás confederaciones.</p>') + '</div>';
    } else {
      const H = E.history;
      body = '<div class="panel" style="padding:6px"><h3 style="margin:4px">Campeones en tu partida</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Temporada</th><th>Champions</th><th>Europa League</th><th>Conference</th><th class="hide-sm">Supercopa</th><th class="hide-sm">Intercontinental</th><th class="hide-sm">Mundial</th></tr></thead><tbody>' +
        (H.length ? H.map((h) => '<tr><td>' + DB.SEASON_LABEL(h.season) + '</td><td>' + nm(h.ucl) + '</td><td>' + nm(h.uel) + '</td><td>' + nm(h.uecl) + '</td><td class="hide-sm">' + nm(h.sup) + '</td><td class="hide-sm">' + nm(h.inter) + '</td><td class="hide-sm">' + (h.cwc ? nm(h.cwc) : '—') + '</td></tr>').join('') : '<tr><td colspan="7">Aún no ha terminado ninguna temporada.</td></tr>') + '</tbody></table></div></div>' +
        '<div class="panel"><p class="muted" style="margin:0">Temporada 2025/26 (real): Champions para el Paris Saint-Germain y Europa League para el Aston Villa.</p></div>';
    }
    const mine = EU.compsOf(st, st.userTeam);
    UI.show(MGR.top() + UI.head('Competiciones internacionales', mine.length ? esc(T(st.userTeam).short) + ' juega la ' + esc(EU.CFG[mine[0]].name) : esc(T(st.userTeam).short) + ' no juega en Europa esta temporada', 'back') + '<div class="wrap"><div class="tabs" style="flex-wrap:wrap">' + tabs.map(([k, l]) => '<button class="tab ' + (k === tab ? 'on' : '') + '" data-act="tab" data-t="' + k + '">' + l + '</button>').join('') + '</div>' + body + '</div>',
      { back: () => { MGR.euroMd = null; MGR.hub(); }, tab: (el) => { MGR.euroMd = null; MGR.europe(el.dataset.t); }, md: (el) => { MGR.euroMd = +el.dataset.d; MGR.europe(tab); } });
  };

  // ---------- Personal del club
  MGR.staffTab = 'mine';
  MGR.staff = function () {
    const st = MGR.st; const me = T(st.userTeam);
    const perWeek = (x) => U.money(x);
    const card = (x, role, acts) => '<div class="staff' + (x ? '' : ' vac') + '">' + (x ? '<img src="' + GFX.staffFace(x, 72) + '" width="64" height="64" alt="">' : '<div style="width:64px;height:64px;display:grid;place-items:center;border:2px dashed #6e7378;font-size:28px">?</div>') +
      '<div class="info"><small>' + esc(role[1]) + '</small>' + (x ? '<b>' + esc(x.name) + '</b>' + UI.starsN(x.stars) + '<small>' + x.age + ' años · ' + perWeek(x.wage) + '/semana</small>' : '<b>Puesto vacante</b><small>' + esc(role[2]) + '</small>') + '</div><div class="acts">' + acts + '</div></div>';
    const mine = LG.STAFF_ROLES.map((r) => card(st.staff[r[0]], r, st.staff[r[0]] ? '<button class="btn alt" data-act="fire" data-k="' + r[0] + '">Despedir</button>' : '<button class="btn" data-act="tab" data-t="' + r[0] + '">Buscar</button>')).join('');
    const tab = MGR.staffTab;
    const market = tab !== 'mine' ? (st.staffMarket || []).filter((x) => x.role === tab).sort((a, b) => b.stars - a.stars).map((x) => card(x, LG.STAFF_ROLES.find((r) => r[0] === x.role), '<button class="btn goldb" data-act="hire" data-id="' + x.id + '">Contratar</button><small class="muted">' + U.money(x.wage * 4 + (st.staff[x.role] ? st.staff[x.role].wage * 6 : 0)) + '</small>')).join('') : '';
    const role = LG.STAFF_ROLES.find((r) => r[0] === tab);
    UI.show(MGR.top() + UI.head('Personal del club', 'Coste semanal ' + perWeek(LG.staffWages(st)) + ' · Presupuesto ' + U.money(me.budget), 'back') + '<div class="wrap">' +
      '<div class="tabs" style="flex-wrap:wrap">' + [['mine', 'Mi personal']].concat(LG.STAFF_ROLES.map((r) => [r[0], r[1]])).map(([k, l]) => '<button class="tab ' + (tab === k ? 'on' : '') + '" data-act="tab" data-t="' + k + '">' + esc(l) + '</button>').join('') + '</div>' +
      (tab === 'mine' ? '<div class="panel"><p class="muted" style="margin-top:0">Cada empleado tiene de 1 a 5 estrellas. Cuantas más estrellas, más se nota su trabajo y más cobra por semana. Al contratar pagas una prima de 4 semanas; despedir cuesta una indemnización de 6 semanas.</p><div class="staff-grid">' + mine + '</div></div>' :
        '<div class="panel"><h3>' + esc(role[1]) + '</h3><p class="muted" style="margin-top:0">' + esc(role[2]) + '</p><h4 style="margin:6px 0">Ahora en el club</h4><div class="staff-grid">' + card(st.staff[tab], role, '') + '</div><h4 style="margin:10px 0 6px">Mercado libre</h4><div class="staff-grid">' + (market || '<p>No hay candidatos ahora mismo. Vuelve dentro de unas jornadas.</p>') + '</div></div>') + '</div>',
      {
        back: () => MGR.hub(), tab: (el) => { MGR.staffTab = el.dataset.t; MGR.staff(); },
        hire: (el) => { const c = st.staffMarket.find((x) => x.id === el.dataset.id); const cur = st.staff[c.role]; const go = () => { const r = LG.hireStaff(st, el.dataset.id); UI.toast(r.msg); if (r.ok) { A.sfxPlay('win'); save(); } MGR.staff(); }; if (cur) UI.confirm('¿Sustituir a ' + cur.name + ' (' + cur.stars + '★) por ' + c.name + ' (' + c.stars + '★)? Pagarás su indemnización.', 'Contratar', go); else go(); },
        fire: (el) => { const cur = st.staff[el.dataset.k]; UI.confirm('¿Despedir a ' + cur.name + '? La indemnización es de ' + U.money(cur.wage * 6) + '.', 'Despedir', () => { const r = LG.fireStaff(st, el.dataset.k); UI.toast(r.msg); save(); MGR.staff(); }, true); },
      });
  };

  // ---------- Copa del Rey: cuadro de eliminatorias
  MGR.cup = function (sel) {
    const st = MGR.st; const C = st.cup;
    if (!C) { UI.show(MGR.top() + UI.head('Copa del Rey', null, 'back') + '<div class="wrap"><div class="panel"><p>La Copa del Rey arrancará con la próxima temporada.</p></div></div>', { back: () => MGR.hub() }); return; }
    const r = sel === undefined ? Math.min(C.round, C.rounds.length - 1) : sel;
    const rd = C.rounds[r];
    const row = (t) => {
      const me = t.h === st.userTeam || t.a === st.userTeam; const done = t.w !== null && t.w !== undefined;
      const b = (id) => '<td' + (done && t.w === id ? ' style="font-weight:800"' : '') + '>' + GFX.badgeImg(T(id), 18) + ' ' + esc(T(id).short) + ' <span class="muted">' + (T(id).div === 3 ? '1ª RFEF' : T(id).div === 2 ? '2ª' : '1ª') + '</span></td>';
      return '<tr class="' + (me ? 'me' : '') + '">' + b(t.h) + '<td class="c"><b>' + (done ? t.hg + ' - ' + t.ag : 'vs') + '</b>' + (t.et ? ' <small>pr.</small>' : '') + (t.pens ? '<br><small>pen. ' + t.pens[0] + '-' + t.pens[1] + '</small>' : '') + '</td>' + b(t.a) + '</tr>';
    };
    const top = Object.entries(C.goals || {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([pid, g]) => { const p = st.world.players[pid]; return p ? '<tr><td>' + esc(p.name) + '</td><td>' + GFX.badgeImg(T(p.team), 18) + ' ' + esc(T(p.team).short) + '</td><td class="num"><b>' + g + '</b></td></tr>' : ''; }).join('');
    UI.show(MGR.top() + UI.head('Copa del Rey ' + DB.SEASON_LABEL(C.season), C.teams.length + ' equipos · Primera, Segunda y Primera RFEF', 'back') + '<div class="wrap">' +
      (C.winner ? '<div class="panel center"><div class="big">🏆 ' + GFX.badgeImg(T(C.winner), 48) + ' ' + esc(T(C.winner).name) + '</div><p style="margin:4px 0 0">Campeón de Copa. Subcampeón: ' + esc(T(C.runnerUp).name) + '.</p></div>' : '') +
      '<div class="tabs">' + C.rounds.map((x, i) => '<button class="tab ' + (i === r ? 'on' : '') + '" data-act="rd" data-r="' + i + '">' + esc(x.label.replace(' de final', '')) + '</button>').join('') + '</div>' +
      '<div class="cols-2"><div class="panel" style="padding:6px"><h3 style="margin:4px">' + esc(rd.label) + ' · antes de la jornada ' + (rd.day + 1) + '</h3>' +
      (r === 0 && C.byes.length ? '<p class="muted" style="margin:4px">Exentos hasta dieciseisavos (mejores medias): ' + C.byes.map((id) => esc(T(id).short)).join(', ') + '.</p>' : '') +
      (rd.ties[0] && rd.ties[0].neutral ? '<p style="margin:4px"><b>Final en campo neutral:</b> ' + esc(C.venue.stadium) + ' (' + esc(C.venue.city) + ').</p>' : '') +
      '<div class="tbl-wrap"><table class="tbl"><tbody>' + rd.ties.map(row).join('') + '</tbody></table></div></div>' +
      '<div class="panel"><h3>Reglamento</h3><p style="margin-top:0">Eliminatorias a <b>partido único</b> entre semana. Juega en casa el equipo con <b>peor media de jugadores</b>. Si hay empate: prórroga y, si persiste, penaltis. La <b>final</b> se disputa en campo neutral: el estadio del club más potente de Primera que no la juega.</p><p class="muted">Premios por ronda superada: ' + LG.CUP_PRIZE.slice(0, 5).map((x) => U.money(x)).join(' · ') + ' · el campeón suma ' + U.money(LG.CUP_PRIZE[5] + LG.TITLE_PRIZE.copa) + '.</p>' +
      (top ? '<h3>Goleadores de Copa</h3><div class="tbl-wrap"><table class="tbl"><tbody>' + top + '</tbody></table></div>' : '') + '</div></div></div>',
      { back: () => MGR.hub(), rd: (el) => MGR.cup(+el.dataset.r) });
    // Supercopa de España
    const S = st.supes; const box = document.querySelector('.wrap');
    if (box) {
      const nm = (id) => (T(id) ? GFX.badgeImg(T(id), 18) + ' ' + esc(T(id).short) : '—');
      const res = (t) => (t.w ? ' <b>' + t.hg + '-' + t.ag + '</b>' + (t.pens ? ' (pen. ' + t.pens[0] + '-' + t.pens[1] + ')' : t.et ? ' (pr.)' : '') : ' vs ');
      const row = (t) => '<div style="padding:3px 0' + (t.a === st.userTeam || t.b === st.userTeam ? ';background:#fff3b0' : '') + '">' + (t.w === t.a ? '<b>' + nm(t.a) + '</b>' : nm(t.a)) + res(t) + (t.w === t.b ? '<b>' + nm(t.b) + '</b>' : nm(t.b)) + '</div>';
      const d = document.createElement('div'); d.className = 'panel';
      d.innerHTML = '<h3>🎖️ Supercopa de España ' + DB.SEASON_LABEL(st.season) + '</h3>' + (S ? '<p class="muted" style="margin-top:0">Campeón y subcampeón de Liga y finalistas de Copa de la temporada anterior. Semifinales y final a partido único en campo neutral antes de la jornada ' + (LG.SUPES_DAY + 1) + '. Premios: ' + U.money(LG.TITLE_PRIZE.supes_semi) + ' por semifinal, ' + U.money(LG.TITLE_PRIZE.supes_final) + ' al finalista y ' + U.money(LG.TITLE_PRIZE.supes) + ' al campeón.</p><h4 style="margin:4px 0">Semifinales</h4>' + S.semis.map((t) => row(t) + '<div class="muted" style="font-size:12px">' + esc(t.venue) + '</div>').join('') + (S.final ? '<h4 style="margin:8px 0 4px">Final · ' + esc(S.finalVenue) + '</h4>' + row(S.final) : '') + (S.winner ? '<p><b>Campeón: ' + esc(T(S.winner).name) + '</b></p>' : '') : '<p class="muted">Esta temporada no se disputa.</p>');
      box.appendChild(d);
    }
  };

  MGR.news = function () {
    const st = MGR.st;
    UI.show(MGR.top() + UI.head('Noticias', null, 'back') + '<div class="wrap"><div class="panel" style="display:grid;gap:6px">' + (st.news.length ? st.news.map((n) => '<div class="news-item ' + n.type + '"><span class="muted">J' + (n.d + 1) + ' · ' + DB.SEASON_LABEL(n.s) + '</span><br>' + esc(n.text) + '</div>').join('') : '<p>Sin noticias.</p>') + '</div></div>', { back: () => MGR.hub() });
  };

  // ---------- fin de temporada
  MGR.seasonEnd = function () {
    const st = MGR.st; const h = st.history[0]; if (!h) return MGR.hub();
    const t1 = LG.table(st, 1), t2 = LG.table(st, 2);
    const mini = (rows, dv) => '<table class="tbl"><tbody>' + rows.map((r) => '<tr class="' + (r.id === st.userTeam ? 'me' : '') + '"><td>' + r.pos + '</td><td>' + GFX.badgeImg(T(r.id), 18) + ' ' + esc(T(r.id).short) + '</td><td class="num"><b>' + r.pts + '</b></td><td>' + (dv === 1 && r.pos >= 18 ? '<span class="tag t-inj">DESCIENDE</span>' : '') + (dv === 2 && h.promoted.indexOf(r.id) >= 0 ? '<span class="tag t-xi">ASCIENDE</span>' : '') + (dv === 2 && h.down2.indexOf(r.id) >= 0 ? '<span class="tag t-inj">A 1ª RFEF</span>' : '') + '</td></tr>').join('') + '</tbody></table>';
    const multi = !!(h.users && h.users.length > 1);
    const list = multi ? h.users : [{ user: h.user, report: h.report }];
    const u = list[0].user;
    const verdictOf = (uu, nm) => (uu.met ? (nm ? nm + ' cumple el objetivo.' : '¡Objetivo cumplido! La directiva está satisfecha con tu trabajo.') : (nm ? nm + ' no cumple el objetivo' : 'No has cumplido el objetivo') + ' (' + esc(uu.objective) + ').');
    const lineOf = (uu, nm) => esc(T(uu.team).short) + ' termina ' + (uu.pos ? uu.pos + 'º en ' + (uu.div === 1 ? 'Primera' : 'Segunda') : 'la temporada') + '. ' + verdictOf(uu, nm);
    A.sfxPlay(list.some((x) => x.user.met) ? 'win' : 'lose');
    // todos los campeones de la temporada
    const champ = (ico, comp, id, extra) => (id && T(id) ? '<div class="champ' + (LG.isManaged(st, id) ? ' mine' : '') + '"><span class="ico">' + ico + '</span>' + GFX.badgeImg(T(id), 30) + '<span><small>' + esc(comp) + '</small><b>' + esc(T(id).name) + '</b>' + (extra ? '<small>' + esc(extra) + '</small>' : '') + '</span></div>' : '');
    const e = h.eu || {};
    const champs = [
      champ('🏆', 'Primera División', h.champ1), champ('🥇', 'Segunda División', h.champ2), champ('🎢', 'Playoff de ascenso', h.playoff),
      champ('🏅', 'Copa del Rey', h.cup && h.cup[0], h.cup ? 'final ante el ' + T(h.cup[1]).short : ''), champ('🎖️', 'Supercopa de España', h.supes),
      champ('🌟', 'Champions League', e.ucl), champ('⭐', 'Europa League', e.uel), champ('💠', 'Conference League', e.uecl),
      champ('🛡️', 'Supercopa de Europa', e.sup), champ('🌐', 'Copa Intercontinental', e.inter), champ('🌍', 'Mundial de Clubes', e.cwc),
    ].join('');
    const cardOf = (R, j) => (R ? '<div class="panel season-card"><div class="sc-head">' + GFX.badgeImg(T(R.team), 64) + '<div><h3 style="margin:0">' + (multi ? 'Temporada de ' + esc(R.manager) : 'Tu temporada') + '</h3><div class="sc-stars">' + '★'.repeat(R.stars) + '<span>' + '★'.repeat(5 - R.stars) + '</span></div><p class="sc-phrase">«' + esc(R.phrase) + '»</p></div></div>' +
      '<div class="kv"><b>Liga</b><span>' + (R.pos ? R.pos + 'º en ' + (R.div === 1 ? 'Primera' : 'Segunda') : '—') + (R.rec ? ' · ' + R.rec[0] + 'V ' + R.rec[1] + 'E ' + R.rec[2] + 'D · ' + R.rec[3] + '-' + R.rec[4] + ' · ' + R.rec[5] + ' pts' : '') + '</span><b>Objetivo</b><span>' + esc(R.objective) + (R.met ? ' ✓' : ' ✗') + '</span><b>Copa del Rey</b><span>' + esc(R.cup) + '</span>' + (R.euro ? '<b>' + esc(R.euro.comp) + '</b><span>' + esc(R.euro.txt) + '</span>' : '') +
      (R.scorer ? '<b>Máximo goleador</b><span>' + esc(R.scorer[0]) + ' (' + R.scorer[1] + ')</span>' : '') + (R.star ? '<b>Mejor jugador</b><span>' + esc(R.star[0]) + ' (' + R.star[1].toFixed(2) + ')</span>' : '') +
      (R.titles.length ? '<b>Títulos</b><span>' + R.titles.map((k) => (MGR.TROPHY[k] || ['🏆', k])[0] + ' ' + (MGR.TROPHY[k] || ['', k])[1]).join(' · ') + '</span>' : '') + '</div>' +
      '<div class="row" style="margin-top:8px"><button class="btn goldb" data-act="share" data-j="' + j + '">📸 Crear imagen para redes sociales</button></div></div>' : '');
    const card = (multi ? '<div class="cols-2">' : '') + list.map((x, j) => cardOf(x.report, j)).join('') + (multi ? '</div>' : '');
    const anyFired = LG.isMulti(st) ? st.mgrs.some((m, i) => (i === st.cur ? st.fired : m.fired)) : st.fired;
    UI.show(UI.title('Fin de temporada ' + DB.SEASON_LABEL(h.season)) + '<div class="wrap">' +
      '<div class="panel center"><div class="big">' + GFX.badgeImg(T(h.champ1), 48) + ' ' + esc(T(h.champ1).name) + ', campeón de Liga</div>' + list.map((x) => '<p style="margin:6px 0 0">' + lineOf(x.user, multi ? x.user.name : null) + '</p>').join('') +
      (h.pich1 ? '<p class="muted" style="margin:4px 0 0">Pichichi: ' + esc(h.pich1[0]) + ' (' + esc(T(h.pich1[1]).short) + ') con ' + h.pich1[2] + ' goles' + (h.mvp ? ' · Mejor jugador: ' + esc(h.mvp[0]) : '') + '</p>' : '') + '</div>' +
      card +
      '<div class="panel"><h3>Campeones de la temporada</h3><div class="champs">' + champs + '</div></div>' +
      '<div class="grid2"><div class="panel" style="padding:6px"><h3 style="margin:4px">Primera · arriba y abajo</h3>' + mini(t1.slice(0, 6).concat(t1.slice(-3)), 1) + '</div><div class="panel" style="padding:6px"><h3 style="margin:4px">Segunda</h3>' + mini(t2.slice(0, 6).concat(t2.slice(-4)), 2) + '</div></div>' +
      MGR.bracketHTML() +
      '<div class="panel"><b>Suben a Primera:</b> ' + h.promoted.map((id) => esc(T(id).name)).join(', ') + '<br><b>Bajan a Segunda:</b> ' + h.relegated.map((id) => esc(T(id).name)).join(', ') + '<br><b>Bajan a Primera RFEF:</b> ' + h.down2.map((id) => esc(T(id).name)).join(', ') + '<br><b>Suben desde Primera RFEF:</b> ' + h.up3.map((id) => esc(T(id).name)).join(', ') + '</div>' +
      '<nav class="menu" style="max-width:none">' + (anyFired ? '<button class="bar red" data-act="next" autofocus><span class="n">!</span><span class="t">Reunión con la directiva</span></button>' : '<button class="bar gold" data-act="next" autofocus><span class="n">▶</span><span class="t">Empezar temporada ' + DB.SEASON_LABEL(h.season + 1) + '</span></button>') +
      '<button class="bar small grey" data-act="exit"><span class="n">0</span><span class="t">Guardar y salir</span></button></nav></div>',
      { next: () => MGR.seasonNext(), exit: () => { save(); UI.mainMenu(); }, share: (el) => MGR.shareSeason(h, list[+el.dataset.j || 0].report) });
  };
  // tras el resumen: primero los mánagers destituidos eligen club y después arranca la nueva temporada
  MGR.seasonNext = function () {
    const st = MGR.st;
    if (LG.isMulti(st)) {
      const j = st.mgrs.findIndex((m, i) => (i === st.cur ? st.fired : m.fired));
      if (j >= 0) { LG.switchTo(st, j); save(); return MGR.turnIntro(); }
    } else if (st.fired) return MGR.fired();
    LG.newSeason(st);
    if (LG.isMulti(st)) LG.switchTo(st, 0);
    save(); UI.toast('¡Nueva temporada! El mercado de fichajes está abierto.'); MGR.route();
  };

  // ---------- imagen de la temporada para compartir en redes (1080 x 1350)
  MGR.GAME_URL = 'dortcal.github.io/Misterfutbol';
  MGR.seasonImage = async function (h, R) {
    const st = MGR.st; R = R || h.report; const t = T(R.team);
    try { await Promise.all(['900 64px "Russo One"', '700 40px "Rajdhani"', '40px "VT323"'].map((f) => document.fonts.load(f))); } catch (e) { /* tipografías opcionales */ }
    const W = 1080, H = 1350; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.lineJoin = 'round'; g.miterLimit = 2;
    const kit = t.kit.home; const col1 = kit.p, col2 = kit.s;
    // fondo: noche de estadio con focos y franjas del club
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1020'); bg.addColorStop(0.55, '#14213d'); bg.addColorStop(1, '#0a3d1f'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.18; g.translate(W / 2, H / 2); g.rotate(-0.35);
    for (let i = -8; i < 8; i++) { g.fillStyle = i % 2 ? col1 : col2; g.fillRect(i * 120, -1200, 60, 2400); }
    g.restore();
    [[120, 0], [W - 120, 0]].forEach(([x, y]) => { const rg = g.createRadialGradient(x, y, 10, x, y, 700); rg.addColorStop(0, 'rgba(255,255,230,0.35)'); rg.addColorStop(1, 'rgba(255,255,230,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); });
    // césped abajo
    const grass = g.createLinearGradient(0, H - 260, 0, H); grass.addColorStop(0, 'rgba(47,120,40,0)'); grass.addColorStop(0.35, 'rgba(47,120,40,0.65)'); grass.addColorStop(1, 'rgba(36,96,30,0.95)'); g.fillStyle = grass; g.fillRect(0, H - 260, W, 260);
    const gold = (y0, y1) => { const gg = g.createLinearGradient(0, y0, 0, y1); gg.addColorStop(0, '#fff3b8'); gg.addColorStop(0.5, '#f2c14a'); gg.addColorStop(1, '#a8740d'); return gg; };
    const text = (txt, x, y, font, fill, align, stroke) => { g.font = font; g.textAlign = align || 'center'; g.textBaseline = 'alphabetic'; if (stroke) { g.lineWidth = stroke; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.strokeText(txt, x, y); } g.fillStyle = fill; g.fillText(txt, x, y); };
    // cabecera con el logo del juego
    text('MÍSTER FÚTBOL', W / 2, 120, 'italic 900 92px "Russo One", Impact, sans-serif', gold(40, 130), 'center', 10);
    text('26·27', W / 2, 175, '900 44px "Russo One", Impact, sans-serif', '#ffffff', 'center', 6);
    text('MI TEMPORADA ' + DB.SEASON_LABEL(h.season), W / 2, 232, '700 40px "Rajdhani", sans-serif', '#cfe8ff', 'center', 0);
    // escudo
    const img = new Image(); img.src = GFX.badge(t, 360);
    await new Promise((res) => { img.onload = res; img.onerror = res; });
    g.save(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 30; g.drawImage(img, W / 2 - 150, 260, 300, 300); g.restore();
    text(t.name.toUpperCase(), W / 2, 625, '900 58px "Russo One", Impact, sans-serif', '#ffffff', 'center', 8);
    text('Míster ' + R.manager, W / 2, 672, '700 36px "Rajdhani", sans-serif', '#ffd966', 'center', 0);
    // estrellas
    for (let i = 0; i < 5; i++) {
      const cx = W / 2 + (i - 2) * 110, cy = 760, r1 = 46, r2 = 20;
      g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5; const r = k % 2 ? r2 : r1; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath();
      g.fillStyle = i < R.stars ? gold(cy - 46, cy + 46) : 'rgba(255,255,255,0.18)'; g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.stroke();
    }
    // frase (con salto de línea automático)
    g.font = 'italic 700 40px "Rajdhani", sans-serif'; const words = ('«' + R.phrase + '»').split(' '); const lines = []; let cur = '';
    words.forEach((wd) => { const tt = cur ? cur + ' ' + wd : wd; if (g.measureText(tt).width > 900) { lines.push(cur); cur = wd; } else cur = tt; }); if (cur) lines.push(cur);
    lines.slice(0, 2).forEach((ln, k) => text(ln, W / 2, 850 + k * 46, 'italic 700 40px "Rajdhani", sans-serif', '#ffffff', 'center', 0));
    // datos en cajas (dos filas)
    const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    const short = (x) => cap(String(x).replace('Eliminado en ', '').replace(' de final', '').replace('Primera eliminatoria', '1ª ronda'));
    const rows = [[
      ['LIGA', R.pos ? R.pos + 'º ' + (R.div === 1 ? 'Primera' : 'Segunda') : '—'],
      ['BALANCE', R.rec ? R.rec[0] + 'V ' + R.rec[1] + 'E ' + R.rec[2] + 'D' : '—'],
      ['GOLES', R.rec ? R.rec[3] + ' - ' + R.rec[4] : '—'],
    ], [['COPA DEL REY', short(R.cup)]].concat(R.euro ? [[R.euro.comp.toUpperCase(), short(R.euro.txt)]] : [['PUNTOS', R.rec ? String(R.rec[5]) : '—']])];
    rows.forEach((row, ri) => {
      const bw = row.length === 3 ? 320 : 490, gap = 16, bx0 = (W - (row.length * bw + (row.length - 1) * gap)) / 2, by = 920 + ri * 132;
      row.forEach(([lb, val], k) => {
        const x = bx0 + k * (bw + gap); g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x, by, bw, 116); g.fillStyle = gold(by, by + 6); g.fillRect(x, by, bw, 6);
        text(lb, x + bw / 2, by + 40, '700 26px "Rajdhani", sans-serif', '#ffd966', 'center', 0);
        let fs = 44; g.font = '700 ' + fs + 'px "Rajdhani", sans-serif'; while (g.measureText(val).width > bw - 20 && fs > 24) { fs -= 2; g.font = '700 ' + fs + 'px "Rajdhani", sans-serif'; }
        text(val, x + bw / 2, by + 94, '700 ' + fs + 'px "Rajdhani", sans-serif', '#ffffff', 'center', 0);
      });
    });
    // títulos o figuras del equipo
    const titles = R.titles.map((k) => (MGR.TROPHY[k] || ['', k])[1]).join(' · ');
    if (titles) { text('¡CAMPEÓN!', W / 2, 1222, '900 38px "Russo One", Impact, sans-serif', gold(1190, 1224), 'center', 5); text(titles, W / 2, 1262 - 6, '700 30px "Rajdhani", sans-serif', '#fff3b8', 'center', 3); }
    else {
      if (R.scorer) text('Máximo goleador: ' + R.scorer[0] + ' (' + R.scorer[1] + ')', W / 2, 1218, '700 32px "Rajdhani", sans-serif', '#ffffff', 'center', 4);
      if (R.star) text('Mejor jugador: ' + R.star[0], W / 2, 1254 - 4, '700 30px "Rajdhani", sans-serif', '#cfe8ff', 'center', 4);
    }
    // pie con la llamada a jugar
    g.fillStyle = 'rgba(0,0,0,0.78)'; g.fillRect(0, H - 82, W, 82);
    text('¿Te atreves a superarlo? Juega gratis en ' , 28, H - 46, '700 28px "Rajdhani", sans-serif', '#ffffff', 'left', 0);
    text(MGR.GAME_URL, 28, H - 14, '900 28px "Russo One", Impact, sans-serif', gold(H - 40, H - 12), 'left', 0);
    text('Diseñado por David OZC', W - 28, H - 30, '700 24px "Rajdhani", sans-serif', 'rgba(255,255,255,0.8)', 'right', 0);
    return c;
  };
  MGR.shareSeason = async function (h, R) {
    UI.toast('Preparando la imagen…'); R = R || h.report; h = Object.assign({}, h, { report: R });
    let c; try { c = await MGR.seasonImage(h, R); } catch (e) { UI.toast('No se ha podido crear la imagen.'); return; }
    const url = c.toDataURL('image/png'); const name = 'mister-futbol-' + h.report.team + '-' + h.season + '.png';
    UI.modal('Imagen para redes', '<img src="' + url + '" alt="Resumen de la temporada" style="width:100%;max-width:420px;display:block;margin:0 auto;border:3px solid #1d2126"><div class="row" style="justify-content:center;margin-top:10px"><button class="btn goldb" data-act="dl">⬇ Descargar imagen</button>' + (navigator.share ? '<button class="btn" data-act="sh">📤 Compartir</button>' : '') + '</div><p class="muted center" style="margin:6px 0 0">Comparte tu temporada en redes y reta a tus amigos.</p>', {
      dl: () => { try { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { UI.toast('Mantén pulsada la imagen para guardarla.'); } },
      sh: () => { c.toBlob(async (blob) => {
        try {
          const file = new File([blob], name, { type: 'image/png' });
          const data = { title: 'Míster Fútbol 26·27', text: 'Mi temporada con el ' + T(h.report.team).name + ': ' + '★'.repeat(h.report.stars) + ' «' + h.report.phrase + '». ¿Te atreves a superarlo? https://' + MGR.GAME_URL };
          if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share(Object.assign({ files: [file] }, data)); else await navigator.share(data);
        } catch (e) { /* cancelado */ }
      }, 'image/png'); },
    });
  };

  MGR.fired = function () {
    const st = MGR.st; const offers = LG.jobOffers(st);
    UI.show(UI.head(st.outOfLeague ? 'Tu club ha descendido a Primera RFEF' : 'Destituido', esc(T(st.userTeam).name), null) + '<div class="wrap"><div class="panel"><p style="margin-top:0">' + (st.outOfLeague ? 'Primera RFEF no se juega en esta versión, pero otros clubes quieren contar contigo.' : 'La directiva ha perdido la confianza en tu proyecto y ha decidido prescindir de tus servicios. Algunos clubes se han interesado por ti:') + '</p>' +
      '<nav class="menu" style="max-width:none">' + offers.map((id, i) => '<button class="bar" data-act="take" data-id="' + id + '"><span class="n">' + (i + 1) + '</span><span class="t">' + GFX.badgeImg(T(id), 28) + ' ' + esc(T(id).name) + '</span><span class="meta">' + divName(st.seasonOver && st.pendingDivs ? (st.pendingDivs[1].indexOf(id) >= 0 ? 1 : 2) : T(id).div) + '</span></button>').join('') +
      '<button class="bar red" data-act="quit"><span class="n">✕</span><span class="t">' + (LG.isMulti(st) ? 'Retirarse (el otro jugador sigue)' : 'Retirarse (terminar la partida)') + '</span></button></nav></div></div>',
      {
        take: (el) => { LG.changeTeam(st, el.dataset.id); save(); if (st.seasonOver) return MGR.seasonNext(); MGR.hub(); },
        quit: () => {
          if (LG.isMulti(st)) return UI.confirm('¿Retirarte? ' + st.userName + ' deja la partida y el otro jugador sigue en solitario.', 'Retirarse', () => { LG.removeManager(st, st.cur); save(); if (st.seasonOver) MGR.seasonNext(); else MGR.route(); }, true);
          UI.confirm('¿Terminar esta partida? Se borrará de la ranura ' + MGR.slot + '.', 'Terminar', () => { U.store.del(LG.SAVE_KEY + MGR.slot); MGR.st = null; UI.mainMenu(); }, true);
        },
      });
  };

  MF.MGR = MGR;
})(typeof window !== 'undefined' ? window : globalThis);
