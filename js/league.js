/* MÍSTER FÚTBOL 26·27 — Liga Manager: calendario, clasificación, ascensos/descensos, playoff,
   finanzas, mercado de fichajes, directiva y temporadas sucesivas. Sin dependencias del DOM. */
(function (G) {
  'use strict';
  const MF = G.MF; const U = MF.U; const DB = MF.DB; const SIM = MF.SIM;
  const LG = {};

  LG.ROUNDS = { 1: 38, 2: 42 };
  LG.PLAYOFF_DAYS = [42, 43, 44, 45];
  LG.LAST_DAY = 45;
  // Copa del Rey: eliminatorias a partido único entre semana, antes de estas jornadas de Liga
  LG.CUP_DAYS = [5, 12, 17, 23, 26, 32];
  LG.CUP_ROUNDS = ['Primera eliminatoria', 'Dieciseisavos de final', 'Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'];
  LG.CUP_PRIZE = [0.3, 0.6, 1, 2, 3, 3];   // M€ por superar cada ronda (y 6 M€ más para el campeón)
  // Premios por títulos (M€), según la importancia de la competición
  LG.TITLE_PRIZE = { liga: 15, segunda: 3, playoff: 2, copa: 6, supes: 8, supes_final: 5, supes_semi: 3 };
  LG.MARKET_CLOSE = 29;
  LG.MAX_CHANGES = 3;
  // primera temporada: los equipos de la IA no se fichan entre ellos (solo operan con los mánagers humanos)
  LG.firstSeason = (st) => st.season === (st.firstSeason || 2026);   // equipos de la IA: como mucho 3 caras nuevas (y 3 salidas) de una temporada a otra   // el mercado se cierra desde la jornada 30 hasta la temporada siguiente
  const ACH = (id, st) => { if (MF.ACH && (!st || !st.noAch)) MF.ACH.unlock(id); };
  LG.ach = ACH;

  // ---------- calendario (método del círculo, ida y vuelta)
  LG.fixtures = function (ids, R) {
    const t = ids.slice(); R.shuffle(t);
    if (t.length % 2) t.push(null);
    const n = t.length, half = n / 2, rounds = [];
    let arr = t.slice();
    const lastHome = {}, homes = {};
    t.forEach((x) => { lastHome[x] = null; homes[x] = 0; });
    for (let r = 0; r < n - 1; r++) {
      const games = [];
      for (let i = 0; i < half; i++) {
        let h = arr[i], a = arr[n - 1 - i];
        if (h === null || a === null) continue;
        // alterna local/visitante: juega en casa quien jugó fuera la jornada anterior
        const hScore = (lastHome[h] === true ? 2 : 0) + homes[h] * 0.1, aScore = (lastHome[a] === true ? 2 : 0) + homes[a] * 0.1;
        if (aScore < hScore || (aScore === hScore && (r + i) % 2)) { const x = h; h = a; a = x; }
        lastHome[h] = true; lastHome[a] = false; homes[h]++;
        games.push([h, a]);
      }
      rounds.push(games);
      arr = [arr[0]].concat([arr[n - 1]], arr.slice(1, n - 1));
    }
    const second = rounds.map((g) => g.map(([h, a]) => [a, h]));
    return rounds.concat(second);
  };

  LG.makeComp = function (div, ids, R) {
    return { div, teams: ids.slice(), rounds: LG.fixtures(ids, R), res: {}, round: 0 };
  };

  // ---------- nueva carrera
  LG.newCareer = function (opts) {
    const seed = opts.seed || (Date.now() >>> 0);
    const R = U.rng(seed);
    const world = DB.makeWorld();
    const div = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    Object.values(world.teams).forEach((t) => div[t.div].push(t.id));
    const st = {
      v: 2, firstSeason: 2026, seed, rngState: seed ^ 0x9e3779b9, season: 2026, userTeam: opts.team, userName: opts.name || 'Míster',
      difficulty: opts.difficulty || 1, world, div, comp: {}, day: 0, playoff: null,
      lineup: null, tactics: null, training: 'equilibrado', board: null, news: [], history: [], finance: { log: [] },
      offers: [], youthUsed: false, fired: false, seasonOver: false, created: Date.now(), lastUser: null, mvpLog: [],
      trophies: [], ach: { cs: 0, unb: 0, ws: 0, seasons: 0, clubs: [opts.team] }, noAch: !!opts.noAch,
    };
    st.comp[1] = LG.makeComp(1, div[1], R);
    st.comp[2] = LG.makeComp(2, div[2], R);
    const t = world.teams[st.userTeam];
    st.tactics = { style: 'equilibrada', press: 'media', passing: 'mixto' };
    st.lineup = DB.autoLineup(world, st.userTeam, t.formation);
    LG.setObjective(st);
    st.cup = LG.setupCup(st, R);
    if (MF.EU) MF.EU.setup(st, true);
    st.supes = LG.setupSupes(st, true);
    LG.initStaff(st, R); LG.staffMarket(st, R);
    st.finance.start = t.budget;
    LG.news(st, '¡Bienvenido, ' + st.userName + '! La directiva del ' + t.name + ' te presenta como nuevo entrenador. Objetivo: ' + st.board.objective.text + '.', 'board');
    LG.news(st, 'El mercado de fichajes está abierto hasta la jornada 29.', 'market');
    if (opts.team2 && opts.team2 !== opts.team) LG.addManager(st, opts.team2, opts.name2, R);
    st.squadChg = {};
    LG.flushBackground(st);
    return st;
  };

  // ---------- PARTIDA DE DOS JUGADORES (por turnos, mismo dispositivo)
  // Los datos propios de cada mánager se guardan en st.mgrs; los del mánager activo están en el nivel superior de st.
  LG.MGR_FIELDS = ['userTeam', 'userName', 'lineup', 'tactics', 'training', 'board', 'staff', 'staffMarket', 'offers', 'offerLog', 'youthUsed', 'finance', 'trophies', 'ach', 'lastUser', 'fired', 'outOfLeague', 'tacticBonus', 'lastAttendance'];
  LG.isMulti = (st) => !!(st.mgrs && st.mgrs.length > 1);
  LG.nMgrs = (st) => (st.mgrs ? st.mgrs.length : 1);
  LG.switchTo = function (st, i) {
    if (!LG.isMulti(st) || i === st.cur) return;
    LG.MGR_FIELDS.forEach((k) => { st.mgrs[st.cur][k] = st[k]; });
    LG.MGR_FIELDS.forEach((k) => { st[k] = st.mgrs[i][k]; });
    st.cur = i;
  };
  LG.withMgr = function (st, i, fn) { const prev = st.cur; LG.switchTo(st, i); try { return fn(); } finally { LG.switchTo(st, prev); } };
  LG.mgrTeam = (st, i) => (i === (st.cur || 0) ? st.userTeam : st.mgrs[i].userTeam);
  LG.mgrIndexOf = function (st, tid) {
    if (!LG.isMulti(st)) return tid === st.userTeam ? 0 : -1;
    for (let i = 0; i < st.mgrs.length; i++) if (LG.mgrTeam(st, i) === tid) return i;
    return -1;
  };
  LG.isManaged = (st, tid) => LG.mgrIndexOf(st, tid) >= 0;
  LG.mgrData = function (st, tid) { const i = LG.mgrIndexOf(st, tid); if (i < 0) return null; return i === (st.cur || 0) ? st : st.mgrs[i]; };
  // ejecuta fn con el mánager dueño de tid como activo (si lo hay)
  LG.own = function (st, tid, fn) { const i = LG.mgrIndexOf(st, tid); if (i < 0 || !LG.isMulti(st) || i === st.cur) return fn(); return LG.withMgr(st, i, fn); };
  LG.forEachMgr = function (st, fn) { if (!LG.isMulti(st)) { fn(0); return; } for (let i = 0; i < st.mgrs.length; i++) LG.withMgr(st, i, () => fn(i)); };
  LG.addTrophy = function (st, tid, comp) { LG.own(st, tid, () => { if (tid === st.userTeam) { st.trophies = st.trophies || []; st.trophies.push({ season: st.season, comp, team: tid }); } }); };
  // crea los datos del segundo mánager
  LG.addManager = function (st, team, name, R) {
    if (!st.mgrs) { st.mgrs = [{}]; st.cur = 0; LG.MGR_FIELDS.forEach((k) => { st.mgrs[0][k] = st[k]; }); }
    const prev = st.cur; const i = st.mgrs.length; st.mgrs.push({});
    LG.MGR_FIELDS.forEach((k) => { st.mgrs[prev][k] = st[k]; });
    st.cur = i;
    const t = st.world.teams[team];
    Object.assign(st, { userTeam: team, userName: name || ('Míster ' + (i + 1)), tactics: { style: 'equilibrada', press: 'media', passing: 'mixto' }, training: 'equilibrado', board: null,
      offers: [], offerLog: {}, youthUsed: false, finance: { log: [], start: t.budget }, trophies: [], ach: { cs: 0, unb: 0, ws: 0, seasons: 0, clubs: [team] }, lastUser: null, fired: false, outOfLeague: false, tacticBonus: 0, lastAttendance: 0 });
    st.lineup = DB.autoLineup(st.world, team, t.formation);
    LG.setObjective(st); LG.initStaff(st, R); LG.staffMarket(st, R);
    LG.MGR_FIELDS.forEach((k) => { st.mgrs[i][k] = st[k]; });
    LG.MGR_FIELDS.forEach((k) => { st[k] = st.mgrs[prev][k]; }); st.cur = prev;
    LG.news(st, '¡Bienvenido, ' + st.mgrs[i].userName + '! La directiva del ' + t.name + ' te presenta como nuevo entrenador.', 'board');
  };
  // resultados ya jugados en esta jornada (partidos de cada mánager)
  LG.takeRes = function (st, f, userRes) {
    if (st.pendingRes && st.pendingRes[f.key]) return st.pendingRes[f.key];
    if (userRes && (f.h === st.userTeam || f.a === st.userTeam)) return userRes;
    return null;
  };
  // datos de la temporada (historial) del mánager activo
  LG.histUser = function (st, h) {
    if (h.users && h.users.length) { const u = h.users.find((x) => x.user.name === st.userName) || h.users[st.cur || 0] || h.users[0]; return u; }
    return { user: h.user, report: h.report };
  };
  // un mánager abandona la partida (la otra persona sigue jugando sola)
  LG.removeManager = function (st, i) {
    if (!LG.isMulti(st)) return false;
    LG.MGR_FIELDS.forEach((k) => { st.mgrs[st.cur][k] = st[k]; });
    const name = st.mgrs[i].userName;
    st.mgrs.splice(i, 1); if (st.turnDone) st.turnDone.splice(i, 1);
    LG.MGR_FIELDS.forEach((k) => { st[k] = st.mgrs[0][k]; }); st.cur = 0;
    if (st.mgrs.length === 1) { delete st.mgrs; delete st.cur; st.turnDone = null; }
    LG.news(st, name + ' se retira de los banquillos.', 'board');
    return true;
  };
  LG.involvesMgr = (st, f) => LG.isManaged(st, f.h) || LG.isManaged(st, f.a);

  LG.rng = function (st) { st.rngState = (st.rngState + 0x6D2B79F5) >>> 0; return U.rng(st.rngState); };
  LG.team = (st, id) => st.world.teams[id];
  LG.userDiv = (st) => LG.team(st, st.userTeam).div;
  LG.news = function (st, text, type) { st.news.unshift({ d: st.day, s: st.season, text, type: type || 'info' }); if (st.news.length > 60) st.news.length = 60; };

  // ---------- clasificación con desempate por enfrentamiento directo (criterio de LaLiga)
  LG.table = function (st, divN) {
    const comp = st.comp[divN]; const rows = {};
    comp.teams.forEach((id) => { rows[id] = { id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, form: [] }; });
    Object.keys(comp.res).sort((a, b) => +a.split('_')[0] - +b.split('_')[0]).forEach((k) => {
      const r = comp.res[k]; const H = rows[r.h], A = rows[r.a]; if (!H || !A) return;
      H.pj++; A.pj++; H.gf += r.hg; H.gc += r.ag; A.gf += r.ag; A.gc += r.hg;
      if (r.hg > r.ag) { H.g++; A.p++; H.pts += 3; H.form.push('V'); A.form.push('D'); }
      else if (r.hg < r.ag) { A.g++; H.p++; A.pts += 3; H.form.push('D'); A.form.push('V'); }
      else { H.e++; A.e++; H.pts++; A.pts++; H.form.push('E'); A.form.push('E'); }
    });
    const list = Object.values(rows);
    const h2h = (ids) => {
      const m = {}; ids.forEach((i) => { m[i] = { pts: 0, gd: 0 }; });
      Object.values(comp.res).forEach((r) => {
        if (m[r.h] && m[r.a]) {
          m[r.h].gd += r.hg - r.ag; m[r.a].gd += r.ag - r.hg;
          if (r.hg > r.ag) m[r.h].pts += 3; else if (r.hg < r.ag) m[r.a].pts += 3; else { m[r.h].pts++; m[r.a].pts++; }
        }
      });
      return m;
    };
    list.sort((a, b) => b.pts - a.pts);
    // agrupa empatados a puntos
    const out = []; let i = 0;
    while (i < list.length) {
      let j = i; while (j < list.length && list[j].pts === list[i].pts) j++;
      const grp = list.slice(i, j);
      if (grp.length > 1) {
        const m = h2h(grp.map((x) => x.id));
        grp.sort((a, b) => (m[b.id].pts - m[a.id].pts) || (m[b.id].gd - m[a.id].gd) || ((b.gf - b.gc) - (a.gf - a.gc)) || (b.gf - a.gf) || a.id.localeCompare(b.id));
      }
      out.push.apply(out, grp); i = j;
    }
    out.forEach((r, k) => { r.pos = k + 1; r.form = r.form.slice(-5); });
    return out;
  };

  LG.position = function (st, tid) {
    const d = LG.team(st, tid).div; if (d > 2) return null;
    return LG.table(st, d).find((r) => r.id === tid).pos;
  };

  // ---------- objetivos de la directiva
  // Objetivo según la plantilla del club respecto a su división (también se usa al elegir equipo)
  LG.objectiveFor = function (w, divIds, tid) {
    const t = w.teams[tid];
    const ids = divIds.slice().sort((a, b) => DB.teamStrength(w, b) - DB.teamStrength(w, a));
    const rank = ids.indexOf(tid) + 1;
    let obj;
    if (t.div === 1) {
      if (rank <= 2) obj = { maxPos: 2, text: 'Luchar por el título (top 2)' };
      else if (rank <= 4) obj = { maxPos: 4, text: 'Clasificarse para la Champions (top 4)' };
      else if (rank <= 7) obj = { maxPos: 7, text: 'Puestos europeos (top 7)' };
      else if (rank <= 12) obj = { maxPos: 12, text: 'Mitad de tabla (top 12)' };
      else obj = { maxPos: 17, text: 'Evitar el descenso' };
    } else {
      if (rank <= 3) obj = { maxPos: 2, text: 'Ascenso directo (top 2)' };
      else if (rank <= 8) obj = { maxPos: 6, text: 'Jugar el playoff (top 6)' };
      else if (rank <= 15) obj = { maxPos: 12, text: 'Mitad de tabla (top 12)' };
      else obj = { maxPos: 18, text: 'Evitar el descenso' };
    }
    return { obj, rank };
  };
  LG.setObjective = function (st) {
    const t = LG.team(st, st.userTeam);
    const o = LG.objectiveFor(st.world, st.div[t.div], t.id);
    // si llegas a mitad de temporada con el equipo muy lejos de su objetivo natural, la directiva lo rebaja
    const pos = st.day >= 5 && !st.seasonOver ? LG.position(st, t.id) : null;
    if (pos && pos > o.obj.maxPos + 2) o.obj = { maxPos: t.div === 1 ? 17 : 18, text: 'Salvar la temporada (evitar el descenso)' };
    st.board = { objective: o.obj, conf: st.board ? U.clamp(st.board.conf + 10, 40, 85) : 65, rank: o.rank, warn: 0, since: st.day };
  };
  // Estado respecto al objetivo: ok (cumpliendo), riesgo (cerca) o lejos
  LG.objectiveStatus = function (st) {
    const pos = LG.position(st, st.userTeam); const obj = st.board.objective;
    if (!pos || st.day === 0) return { pos, gap: 0, level: 'ok', text: 'Aún no ha empezado la Liga' };
    if (st.day < 6) return { pos, gap: 0, level: 'ok', text: 'Temporada recién empezada: la directiva aún no juzga' };
    const gap = pos - obj.maxPos;
    if (gap <= 0) return { pos, gap, level: 'ok', text: 'Cumpliendo el objetivo' };
    if (gap <= 3) return { pos, gap, level: 'riesgo', text: 'Objetivo en riesgo (' + gap + (gap === 1 ? ' puesto' : ' puestos') + ' por debajo)' };
    return { pos, gap, level: 'lejos', text: 'Lejos del objetivo (' + gap + ' puestos por debajo)' };
  };
  // Presión de la directiva cuando el equipo se aleja del objetivo a lo largo de la temporada
  LG.boardPressure = function (st) {
    const B = st.board; if (st.seasonOver || st.day < 8 || !B.objective.text || st.day - (B.since || 0) < 6) return;
    const s = LG.objectiveStatus(st); const t = LG.team(st, st.userTeam);
    if (s.level === 'lejos') {
      B.conf = U.clamp(B.conf - (s.gap - 3) * 0.7 * Math.min(1.4, st.day / 25), 0, 100);
      if (!B.warn) { B.warn = 1; LG.news(st, 'La directiva del ' + t.short + ' te recuerda el objetivo (' + B.objective.text + '). Ahora mismo sois ' + s.pos + 'º.', 'board'); }
      else if (B.warn === 1 && B.conf < 25) { B.warn = 2; B.ultimatum = st.day; LG.news(st, 'ULTIMÁTUM: el presidente avisa de que, si el equipo no se acerca al objetivo en las próximas jornadas, buscará otro entrenador.', 'board'); }
      else if (B.warn === 2 && st.day >= B.ultimatum + 3 && (B.conf < 15 || s.gap >= 7)) { st.fired = true; }
    } else if (s.level === 'ok' && B.warn) {
      B.warn = 0; B.ultimatum = null; LG.news(st, 'La directiva valora la reacción del equipo: vuelve a estar en línea con el objetivo.', 'board');
    }
  };

  // ---------- partidos de la jornada
  LG.playoffFixtures = function (st) {
    const P = st.playoff; if (!P) return [];
    const d = st.day;
    if (d === 42) return P.semis.map((s) => ({ h: s.b, a: s.a, key: 's' + P.semis.indexOf(s) + '_0', comp: 'playoff', label: 'Playoff · Semifinal (ida)' }));
    if (d === 43) return P.semis.map((s) => ({ h: s.a, a: s.b, key: 's' + P.semis.indexOf(s) + '_1', comp: 'playoff', label: 'Playoff · Semifinal (vuelta)' }));
    if (d === 44 && P.final) return [{ h: P.final.b, a: P.final.a, key: 'f_0', comp: 'playoff', label: 'Playoff · Final (ida)' }];
    if (d === 45 && P.final) return [{ h: P.final.a, a: P.final.b, key: 'f_1', comp: 'playoff', label: 'Playoff · Final (vuelta)' }];
    return [];
  };

  // ---------- partidos entre semana (Copa del Rey y competiciones internacionales)
  LG.nextEvent = function (st) {
    if (st.seasonOver) return null;
    const evs = [];
    if (LG.cupDue(st)) evs.push({ type: 'cup', day: LG.CUP_DAYS[st.cup.round], order: 5 });
    if (LG.supesDue(st)) evs.push({ type: 'supes', day: LG.SUPES_DAY, order: 6 + st.supes.round });
    if (MF.EU) MF.EU.events(st).forEach((e) => evs.push(e));
    evs.sort((a, b) => a.day - b.day || a.order - b.order);
    return evs[0] || null;
  };
  LG.eventFixtures = (st, ev) => (ev.type === 'cup' ? LG.cupFixtures(st) : ev.type === 'supes' ? LG.supesFixtures(st) : MF.EU.fixtures(st, ev));
  LG.playEvent = (st, ev, userRes) => (ev.type === 'cup' ? LG.playCupDay(st, userRes) : ev.type === 'supes' ? LG.playSupes(st, userRes) : MF.EU.play(st, ev, userRes));
  // juega en segundo plano las fechas en las que no participa tu equipo (all: también las tuyas)
  LG.flushBackground = function (st, all) {
    for (let g = 0; g < 60; g++) {
      const ev = LG.nextEvent(st); if (!ev) return;
      if (!all && LG.eventFixtures(st, ev).some((f) => LG.involvesMgr(st, f))) return;
      LG.playEvent(st, ev, null);
    }
  };

  LG.dayFixtures = function (st) {
    const ev = LG.nextEvent(st); if (ev) return LG.eventFixtures(st, ev);
    const out = [];
    [1, 2].forEach((dv) => {
      const c = st.comp[dv]; if (st.day >= c.rounds.length) return;
      c.rounds[st.day].forEach(([h, a], i) => out.push({ h, a, key: st.day + '_' + i, comp: dv, label: (dv === 1 ? 'Primera' : 'Segunda') + ' · Jornada ' + (st.day + 1) }));
    });
    return out.concat(LG.playoffFixtures(st));
  };

  LG.userFixture = function (st) {
    return LG.dayFixtures(st).find((f) => f.h === st.userTeam || f.a === st.userTeam) || null;
  };

  LG.aiLineup = function (st, tid) {
    const t = LG.team(st, tid);
    return DB.autoLineup(st.world, tid, t.formation);
  };
  LG.userLineup = function (st) {
    st.lineup = DB.validLineup(st.world, st.userTeam, st.lineup);
    return st.lineup;
  };
  LG.lineupFor = function (st, tid) {
    if (tid === st.userTeam) return LG.userLineup(st);
    const M = LG.mgrData(st, tid); if (M) { M.lineup = DB.validLineup(st.world, tid, M.lineup); return M.lineup; }
    return LG.aiLineup(st, tid);
  };

  // ---------- PERSONAL DEL CLUB
  LG.STAFF_ROLES = [
    ['segundo', 'Segundo entrenador', 'Diseña los entrenamientos, prepara el once automático y el informe táctico, y dirige el partido si se lo pides.'],
    ['fisio', 'Recuperador de lesiones', 'Menos lesiones y recuperaciones más rápidas.'],
    ['fisico', 'Preparador físico', 'Menos cansancio en los partidos y mejor recuperación entre jornadas.'],
    ['psico', 'Psicólogo', 'Mejora la moral del vestuario y amortigua las derrotas.'],
    ['dirdep', 'Director deportivo', 'Fichajes más baratos y mejores ofertas por tus jugadores.'],
    ['marketing', 'Director de marketing', 'Más público en el estadio, más dinero de televisión y de patrocinio.'],
    ['cantera', 'Entrenador de cantera', 'Mejores canteranos y más progresión de los menores de 23 años.'],
  ];
  LG.STAFF_WAGE = [0, 0.005, 0.01, 0.018, 0.028, 0.04];   // M€ por semana (jornada) según estrellas
  // Nombres de broma (los que llevan guiño a entrenadores célebres son parodias, no las personas reales)
  const STAFF_NAMES = {
    segundo: ['Paco Pizarra', 'Aitor Tilla', 'Armando Jugadas', 'Rafa Rondo', 'Elvis Tácticas', 'Lucho Contragolpe', 'Tomás Notas', 'Pepe Libreta', 'Marcos Marcaje', 'Ana Lítica', 'Rosendo Rombo', 'Bernabé Banquillo',
      'José Mouriñito', 'Pep Guardiolilla', 'Louis van Gol', 'Carletto Cejotti', 'Cholo Sinmeone', 'Jürgen Kloppeteo', 'Johan Cruyffeta', 'Arrigo Sacchetti', 'Fabio Capellini', 'Vicente del Bosquete', 'Luis Aragonazo', 'Mikel Arteteta', 'Xabi Alonsete', 'Unai Emerito', 'Rafa Benitocracia', 'Marcelo Bielsista', 'Alex Fergusonrisa', 'Arsène Wengerito', 'Zinedine Zidanito', 'Javier Clementazo', 'Luis Enriquecido', 'Thomas Tuchelito', 'Julian Nagelsmanito', 'Hansi Flickflack', 'Ernesto Valverdetti', 'Marcelino Toralito', 'Míchel Pizarrín', 'Imanol Alguacilazo'],
    fisio: ['Esteban Dajes', 'Remedios Rápidos', 'Curro Curas', 'Rosa Masaje', 'Luis Ligamento', 'Menisco Martínez', 'Tirita Gómez', 'Alivio Sánchez', 'Hielo Ramírez', 'Camila Camilla',
      'Doctor Mourinhielo', 'Pep Vendaiola', 'Louis van Gasa', 'Carlo Ancelotión', 'Cholo Sinmenisco', 'Jürgen Klopprótesis', 'Ernesto Valverdugón', 'Fidel Fisioterapio', 'Paca Pomada', 'Lola Lumbago', 'Tito Tobillera', 'Gema Gelfrío', 'Benito Bálsamo', 'Rosario Rodillera', 'Teodoro Tendón', 'Sole Esguince', 'Fermín Férula'],
    fisico: ['Armando Músculo', 'Germán Cuestas', 'Paca Carrera', 'Benito Burpees', 'Dina Mita', 'Marcial Abdominal', 'Lucas Sprint', 'Fausto Fondo', 'Elena Estiramiento', 'Cristóbal Cardio',
      'Pep Sentadiola', 'José Mouriflexión', 'Louis van Gym', 'Cholo Sinsudor', 'Jürgen Klopponing', 'Carlo Abdominelotti', 'Luis Aragonfondo', 'Zinedine Zumbanito', 'Rocky Rodríguez', 'Paco Pesas', 'Juana Jogging', 'Toño Tonificado', 'Vicente Vatios', 'Merche Mancuerna', 'Sergio Series', 'Puri Pulsómetro', 'Roque Rodillo'],
    psico: ['Serena Mente', 'Feliciano Calma', 'Consuelo Siempre', 'Paz Interior', 'Positivo López', 'Alegría Ruiz', 'Zen García', 'Esperanza Gana', 'Clemente Tranquilo', 'Sonrisa Torres',
      'José Mourizen', 'Pep Guardiolapaz', 'Louis van Calma', 'Carlo Ancelchilli', 'Cholo Sinestrés', 'Jürgen Kloppabrazos', 'Vicente del Sosiego', 'Unai Emoción', 'Arsène Wenmantra', 'Marcelo Bielsofá', 'Dalia Diván', 'Moti Vación', 'Tomasa Terapia', 'Ramón Relax', 'Nieves Nirvana', 'Abel Autoestima', 'Coral Coraje'],
    dirdep: ['Ramón Regateo', 'Rebaja Fernández', 'Chollo Martín', 'Oferta Gómez', 'Tasio Tasación', 'Duro Negociador', 'Fichaje Ruiz', 'Precio Justo', 'Cifra Baja', 'Gangas Pérez',
      'Monchi Rebajas', 'José Mourichollo', 'Pep Guardiolarebaja', 'Louis van Gangas', 'Florentino Fichajez', 'Jorge Mendescuento', 'Pini Zahaviceo', 'Txiki Beginregateo', 'Cholo Sinpagar', 'Carlo Ancheques', 'Paco Pagaré', 'Cirilo Cláusula', 'Mercedes Mercado', 'Benito Bonus', 'Facunda Factura', 'Lucio Lucro', 'Teresa Traspaso'],
    marketing: ['Taquilla Llena', 'Lleno Total', 'Sponsor Pérez', 'Marca Ponce', 'Logo Martínez', 'Eslogan García', 'Viral Romero', 'Abono Díaz', 'Bufanda Gil', 'Camiseta Ortiz',
      'José Mouriñeta', 'Pep Guardiolanzamiento', 'Louis van Gala', 'Carlo Anuncelotti', 'Cholo Simeonline', 'Jürgen Klopphashtag', 'Pancarta Ruiz', 'Hashtag Hernández', 'Trending Torres', 'Merchan Morales', 'Paquita Palco', 'Telmo Televisión', 'Valla Publicitaria', 'Rosa Redes', 'Influencer Iglesias', 'Bruno Bombo', 'Estela Estadio'],
    cantera: ['Juanito Promesas', 'Talento Ruiz', 'Semillero Gil', 'Benjamín Alevín', 'Cadete Pérez', 'Prometeo Joven', 'Perla Escondida', 'Diamante Bruto', 'Futuro Martín', 'Vivero López',
      'Louis van Canteral', 'Johan Cruyffuturo', 'Pep Guardiolamasía', 'José Mourinfantil', 'Vicente del Bosquejo', 'Cholo Simeonito', 'Carletto Cejaalzada', 'Marcelo Bielsazo', 'Lezama Larrañaga', 'Paco Pañales', 'Iker Infantil', 'Mateo Mocoso', 'Rubén Revelación', 'Gloria Granja', 'Tino Talentoso', 'Pili Pipiola', 'Nacho Novato'],
  };
  LG.aiStaffStars = (t) => U.clamp(Math.round((((t && t.base) || 66) - 63) / 5), 1, 5);
  // nombres en uso (personal propio y mercado libre) para no repetir
  LG.staffNamesUsed = (st) => new Set(Object.values((st && st.staff) || {}).filter(Boolean).map((x) => x.name).concat(((st && st.staffMarket) || []).map((x) => x.name)));
  LG.makeStaff = function (role, stars, R, used) {
    const all = STAFF_NAMES[role]; const free = used ? all.filter((n) => !used.has(n)) : all;
    const name = R.pick(free.length ? free : all); if (used) used.add(name);
    return {
      id: 's' + Math.floor(R() * 1e9).toString(36), role, stars, name, age: R.int(31, 66),
      wage: LG.STAFF_WAGE[stars], tone: R.int(1, 4), hair: R.int(0, 5), glasses: R() < 0.35, beard: R.int(0, 3), cap: R() < 0.2, bald: R() < 0.22, smile: R() < 0.6,
    };
  };
  LG.initStaff = function (st, R) {
    const t = LG.team(st, st.userTeam); const base = LG.aiStaffStars(t);
    st.staff = {};
    st.staff = {}; const used = LG.staffNamesUsed(st);
    LG.STAFF_ROLES.forEach(([k]) => { st.staff[k] = LG.makeStaff(k, U.clamp(base + R.int(-1, 1), 1, 5), R, used); });
  };
  LG.staffMarket = function (st, R, keep) {
    const out = keep ? st.staffMarket.slice() : [];
    const used = new Set(Object.values(st.staff || {}).filter(Boolean).map((x) => x.name).concat(out.map((x) => x.name)));
    LG.STAFF_ROLES.forEach(([k]) => {
      while (out.filter((x) => x.role === k).length < 3) {
        const have = out.filter((x) => x.role === k).map((x) => x.stars);
        let stars = R.weighted([1, 2, 3, 4, 5], (n) => [0, 2, 3, 3, 2, 1.2][n]);
        if (have.indexOf(5) < 0 && have.indexOf(4) < 0 && have.length === 2) stars = R() < 0.5 ? 5 : 4;   // siempre hay alguien top
        out.push(LG.makeStaff(k, stars, R, used));
      }
    });
    st.staffMarket = out;
  };
  // estrellas del personal (0 = puesto vacante)
  LG.stf = function (st, role, tid) {
    tid = tid || st.userTeam;
    const M = LG.mgrData(st, tid);
    if (M) { const x = M.staff && M.staff[role]; return x ? x.stars : 0; }
    return LG.aiStaffStars(LG.team(st, tid));
  };
  LG.staffWages = (st) => U.sum(Object.values(st.staff || {}).filter(Boolean), (x) => x.wage);
  LG.hireStaff = function (st, id) {
    const c = (st.staffMarket || []).find((x) => x.id === id); if (!c) return { ok: false, msg: 'Ese profesional ya no está disponible.' };
    const me = LG.team(st, st.userTeam); const cur = st.staff[c.role];
    const fee = c.wage * 4 + (cur ? cur.wage * 6 : 0);
    if (me.budget < fee) return { ok: false, msg: 'No tienes presupuesto suficiente (' + U.money(fee) + ' entre prima de fichaje e indemnización).' };
    me.budget = Math.round((me.budget - fee) * 1000) / 1000;
    st.finance.log.unshift({ s: st.season, d: st.day, inc: 0, exp: fee, items: [['Contratación de ' + c.name + (cur ? ' e indemnización a ' + cur.name : ''), -fee]], bal: me.budget });
    st.staff[c.role] = c; st.staffMarket = st.staffMarket.filter((x) => x.id !== id);
    if (cur) st.staffMarket.push(Object.assign({}, cur, { id: cur.id + 'x' }));
    LG.news(st, c.name + ' se incorpora como ' + LG.STAFF_ROLES.find((r) => r[0] === c.role)[1].toLowerCase() + ' (' + '★'.repeat(c.stars) + ').', 'staff');
    if (c.stars === 5) ACH('staff_top', st);
    if (LG.STAFF_ROLES.every(([k]) => st.staff[k] && st.staff[k].stars >= 4)) ACH('staff_pleno', st);
    return { ok: true, msg: c.name + ' ya trabaja en el club.' };
  };
  LG.fireStaff = function (st, role) {
    const cur = st.staff[role]; if (!cur) return { ok: false, msg: 'El puesto ya está vacante.' };
    const me = LG.team(st, st.userTeam); const fee = cur.wage * 6;
    me.budget = Math.round((me.budget - fee) * 1000) / 1000;
    st.finance.log.unshift({ s: st.season, d: st.day, inc: 0, exp: fee, items: [['Indemnización a ' + cur.name, -fee]], bal: me.budget });
    st.staff[role] = null; st.staffMarket.push(Object.assign({}, cur, { id: cur.id + 'x' }));
    return { ok: true, msg: cur.name + ' deja el club (indemnización ' + U.money(fee) + ').' };
  };

  // ---------- tácticas de cada partido
  // La IA elige estilo, presión y pase según su plantilla y el rival (con más o menos acierto según su cuerpo técnico)
  LG.aiTactic = function (st, tid, f, L) {
    st._tac = st._tac || {};
    const key = st.season + '_' + st.day + '_' + f.key + '_' + tid;
    if (st._tac[key]) return st._tac[key];
    const side = f.h === tid ? 0 : 1; const opp = side === 0 ? f.a : f.h;
    if (LG.team(st, tid).foreign && LG.team(st, opp).foreign) return LG.team(st, tid);
    const Mo = LG.mgrData(st, opp);
    const Tt = [null, null]; Tt[1 - side] = Mo ? Mo.tactics : { style: 'equilibrada', press: 'media', passing: 'mixto' };
    const R = U.rng(U.hash(key));
    const tac = SIM.bestTactic(st.world, L, Tt, side, !!f.neutral, 0.3 + 0.12 * LG.stf(st, 'segundo', tid), R);
    const keys = Object.keys(st._tac); if (keys.length > 400) keys.slice(0, 200).forEach((k) => delete st._tac[k]);
    st._tac[key] = tac; return tac;
  };
  LG.tacticsFor = function (st, tid, f, L) {
    const M = LG.mgrData(st, tid); if (M) return M.tactics;
    if (!f || !L) return LG.team(st, tid);
    return LG.aiTactic(st, tid, f, L);
  };
  // opciones de simulación con los efectos del personal (cansancio y lesiones)
  LG.simOpts = function (st, f, L, R, extra) {
    const T = [LG.tacticsFor(st, f.h, f, L), LG.tacticsFor(st, f.a, f, L)];
    const fis = [f.h, f.a].map((tid) => LG.stf(st, 'fisico', tid)), fio = [f.h, f.a].map((tid) => LG.stf(st, 'fisio', tid));
    return Object.assign({ home: f.h, away: f.a, lhome: L[0], laway: L[1], thome: T[0], taway: T[1], rng: R, neutral: !!f.neutral,
      drainMul: fis.map((n) => 1.15 - 0.06 * n), injuryMul: fio.map((n) => 1.35 - 0.13 * n) }, extra || {});
  };
  // once y táctica que propone el segundo entrenador ante el próximo rival
  LG.assistantPlan = function (st, formation) {
    const n = LG.stf(st, 'segundo'); const w = st.world; const f = LG.userFixture(st);
    if (!n) return { lineup: DB.autoLineup(w, st.userTeam, formation), tactics: null, msg: 'Sin segundo entrenador: once automático básico.' };
    const side = f ? (f.h === st.userTeam ? 0 : 1) : 0; const opp = f ? (side === 0 ? f.a : f.h) : null;
    const R = U.rng(U.hash(st.season + '_' + st.day + 'plan'));
    // con 3★ o más prueba también otros sistemas
    const forms = n >= 3 ? Object.keys(DB.FORMATIONS) : [formation];
    let best = null;
    forms.forEach((fm) => {
      const L = DB.autoLineup(w, st.userTeam, fm);
      if (!opp) { const v = DB.lineupRating(w, L); if (!best || v > best.v) best = { v, L, tac: null }; return; }
      const Lo = LG.aiLineup(st, opp); const Ls = side === 0 ? [L, Lo] : [Lo, L];
      const Tt = [null, null]; Tt[1 - side] = LG.aiTactic(st, opp, f, Ls);
      const tac = SIM.bestTactic(w, Ls, Tt, side, !!f.neutral, 0.35 + 0.13 * n, R);
      Tt[side] = tac; const e = SIM.tacticEdge(w, Ls, Tt);
      const F = [SIM.teamFactors(w, Ls[0], {}), SIM.teamFactors(w, Ls[1], {})]; const lam = SIM.expected(F[0], F[1], !!f.neutral, e);
      const o = SIM.outcome(lam[side], lam[1 - side]); const v = o.pts + R.normal() * (5 - n) * 0.04;
      if (!best || v > best.v) best = { v, L, tac };
    });
    return { lineup: best.L, tactics: best.tac, msg: 'Propuesta de ' + st.staff.segundo.name + ': ' + best.L.formation + (best.tac ? ', estilo ' + best.tac.style + ', presión ' + best.tac.press + ', pases ' + best.tac.passing : '') + '.' };
  };
  // informe táctico del segundo entrenador para la alineación y táctica elegidas
  LG.tacticReport = function (st, L, T) {
    const n = LG.stf(st, 'segundo'); const f = LG.userFixture(st);
    if (!f) return { n, text: 'No hay partido a la vista.' };
    if (!n) return { n, text: 'No tienes segundo entrenador: contrata uno en «Personal» para recibir el informe del rival.' };
    const w = st.world; const side = f.h === st.userTeam ? 0 : 1; const opp = side === 0 ? f.a : f.h;
    const Lo = LG.aiLineup(st, opp); const Ls = side === 0 ? [L, Lo] : [Lo, L];
    const Tt = [null, null]; Tt[side] = T; Tt[1 - side] = LG.aiTactic(st, opp, f, Ls);
    const e = SIM.tacticEdge(w, Ls, Tt);
    const F = [SIM.teamFactors(w, Ls[0], {}), SIM.teamFactors(w, Ls[1], {})]; const lam = SIM.expected(F[0], F[1], !!f.neutral, e);
    const o = SIM.outcome(lam[side], lam[1 - side]);
    const notes = e.notes[side].slice(0, n + 1);
    const oppT = Tt[1 - side];
    return { n, notes, opp, win: n >= 3 ? o : null, oppTac: n >= 2 ? oppT : null };
  };

  LG.simFixture = function (st, f, R) {
    return SIM.play(st.world, LG.simOpts(st, f, [LG.lineupFor(st, f.h), LG.lineupFor(st, f.a)], R));
  };

  // Juega la jornada completa. userRes: resultado del partido del usuario (si lo ha jugado/visto)
  LG.playDay = function (st, userRes) {
    if (st.seasonOver) return null;
    LG.flushBackground(st);
    const ev = LG.nextEvent(st);
    if (ev) { const sm = LG.playEvent(st, ev, userRes); LG.flushBackground(st); return sm; }
    const R = LG.rng(st);
    const fx = LG.dayFixtures(st);
    const played = new Set(); const summary = [];
    fx.forEach((f) => {
      const lh = LG.lineupFor(st, f.h), la = LG.lineupFor(st, f.a);
      const res = LG.takeRes(st, f, userRes) || SIM.play(st.world, LG.simOpts(st, f, [lh, la], R));
      LG.applyResult(st, f, res, [lh, la]);
      played.add(f.h); played.add(f.a);
      summary.push({ f, res });
      LG.userSides(st, f).forEach((tid) => LG.own(st, tid, () => { st.lastUser = { f, score: res.score.slice(), events: res.events.filter((e) => e.type === 'goal' || e.type === 'red'), stats: res.stats, ratings: res.ratings }; LG.userMatchDone(st, f, res); }));
    });
    LG.recover(st, played, true);
    LG.forEachMgr(st, () => {
      if (st.training === 'tecnico') LG.trainTechnical(st, R);
      if (st.training === 'tactico') { st.tacticBonus = 1; DB.teamPlayers(st.world, st.userTeam).forEach((p) => { p.mor = U.clamp(p.mor + 0.5 + 0.3 * LG.stf(st, 'segundo'), 30, 99); }); } else st.tacticBonus = 0;
      LG.finances(st, fx);
      // el mercado de personal se renueva poco a poco
      if (st.staffMarket && st.day % 6 === 5) { st.staffMarket.splice(R.int(0, st.staffMarket.length - 1), 1); st.staffMarket.splice(R.int(0, st.staffMarket.length - 1), 1); LG.staffMarket(st, R, true); }
    });
    LG.retirementNews(st, R);
    // mercado abierto toda la temporada: la IA ficha poco a poco y llegan ofertas cada pocas jornadas
    if (st.day === LG.MARKET_CLOSE - 1) LG.news(st, 'Se cierra el mercado de fichajes hasta la próxima temporada.', 'market');
    if (st.day >= LG.MARKET_CLOSE - 1) { /* mercado cerrado */ }
    else if (st.day === 0) { if (!LG.firstSeason(st)) LG.aiTransfers(st, R, 10); LG.forEachMgr(st, () => LG.incomingOffers(st, R)); }
    else { if (R() < 0.55 && !LG.firstSeason(st)) LG.aiTransfers(st, R, 1); if (st.day % 3 === 0) LG.forEachMgr(st, () => LG.incomingOffers(st, R)); }
    LG.forEachMgr(st, () => { if (st.day >= LG.MARKET_CLOSE - 1) st.offers = []; st.offers = st.offers.filter((o) => o.day >= st.day - 1 || (o.human && o.day >= st.day - 3)); });
    st.day++;
    // fin de liga regular de Segunda → playoff
    if (st.day === 42 && !st.playoff) LG.setupPlayoff(st);
    if (st.day === 44 && st.playoff && !st.playoff.final) LG.setupFinal(st);
    if (st.day > LG.LAST_DAY || (st.day >= 42 && !LG.dayFixtures(st).length && st.playoff && st.playoff.winner)) LG.endSeason(st);
    LG.forEachMgr(st, () => {
      if (st.fired) return;
      LG.boardPressure(st);
      if (!st.seasonOver && st.day >= 12 && st.day - (st.board.since || 0) >= 6 && st.board.conf <= 4) st.fired = true;
      if (st.fired && !st.seasonOver) { LG.news(st, 'La directiva del ' + LG.team(st, st.userTeam).short + ' ha decidido prescindir de ' + st.userName + '.', 'board'); ACH('despedido', st); }
    });
    LG.flushBackground(st);
    return summary;
  };

  // equipos dirigidos por personas en un partido
  LG.userSides = (st, f) => [f.h, f.a].filter((tid, i, a) => LG.isManaged(st, tid) && a.indexOf(tid) === i);

  // ---------- retiradas anunciadas: a lo largo de la temporada algunos veteranos anuncian que lo dejan
  LG.willRetire = (p, R) => (p.age >= 41) || (p.age >= 38 && R() < 0.5) || (p.age >= 35 && R() < 0.35) || (p.age >= 33 && p.ovr < 62 && R() < 0.4);
  LG.retirementNews = function (st, R) {
    if (st.day < 8 || st.day > 34) return;
    Object.values(st.world.players).forEach((p) => {
      if (p.retiring || p.age < 33 || p.fx) return;
      const t = st.world.teams[p.team]; if (!t || t.div > 3) return;
      // cada jugador tiene su jornada de decisión
      if ((U.hash(p.name + st.season) % 27) + 8 !== st.day) return;
      const Rp = U.rng(U.hash(p.name + 'ret' + st.season));
      if (!LG.willRetire(p, Rp)) return;
      // los equipos de la IA pierden como mucho 3 jugadores por temporada (para que sigan siendo reconocibles)
      if (!LG.isManaged(st, p.team) && t.div <= 2) {
        st.squadChg = st.squadChg || {}; const c = st.squadChg[p.team] = st.squadChg[p.team] || { in: 0, out: 0 };
        if (c.out >= LG.MAX_CHANGES) return;
        c.out++;
      }
      p.retiring = true;
      if (LG.isManaged(st, p.team) || p.ovr >= 78) LG.news(st, p.name + ' (' + t.short + ') anuncia que se retirará al final de la temporada. Ya no puede ser traspasado.', 'info');
    });
  };

  // recuperación física, lesiones y sanciones (tick: descuenta jornadas de baja)
  LG.recover = function (st, played, tick) {
    Object.values(st.world.players).forEach((p) => {
      const t = st.world.teams[p.team]; if (!t || t.div > 2) { p.fit = 100; return; }
      const M = LG.mgrData(st, p.team); const user = !!M;
      let rec = 15;
      if (user) rec = ({ equilibrado: 15, fisico: 19, tecnico: 13, tactico: 14, descanso: 24 }[M.training] || 15) + (LG.stf(st, 'fisico', p.team) - 2) * 1.5;
      p.fit = Math.min(100, p.fit + rec);
      if (user && tick) p.mor = U.clamp(p.mor + (75 - p.mor) * 0.02 * LG.stf(st, 'psico', p.team), 30, 99);
      if (tick && played.has(p.team)) {
        if (p.inj > 0) p.inj--;
        if (p.inj > 0 && user && (U.hash(p.id + '_' + st.day + '_' + st.season) % 100) < LG.stf(st, 'fisio', p.team) * 8) p.inj--;   // el recuperador acelera la vuelta
        if (p.sus > 0 && !p._justSus) p.sus--;
      }
      if (tick) p._justSus = false;
    });
  };

  // ---------- logros ligados al partido del usuario (Liga, playoff o Copa)
  LG.userMatchDone = function (st, f, res) {
    if (!MF.ACH || st.noAch) return;
    const A = st.ach = st.ach || { cs: 0, unb: 0, ws: 0, seasons: 0, clubs: [st.userTeam] };
    const side = f.h === st.userTeam ? 0 : 1; const gf = res.score[side], ga = res.score[1 - side];
    const won = res.winSide !== undefined ? res.winSide === side : gf > ga;
    const lost = res.winSide !== undefined ? res.winSide !== side : gf < ga;
    ACH('debut');
    if (won) ACH('primera_victoria');
    if (gf - ga >= 4) ACH('goleada');
    // remontada: ganar después de ir por detrás en el marcador
    let a = 0, b = 0, behind = false;
    res.events.filter((e) => e.type === 'goal').sort((x, y) => x.min - y.min).forEach((e) => { if (e.side === side) a++; else b++; if (b > a) behind = true; });
    if (won && behind && gf > ga) ACH('remontada');
    A.cs = ga === 0 ? A.cs + 1 : 0; if (A.cs >= 5) ACH('muro');
    A.unb = lost ? 0 : A.unb + 1; if (A.unb >= 10) ACH('invicto');
    A.ws = won ? A.ws + 1 : 0; if (A.ws >= 5) ACH('racha');
    const opp = side === 0 ? f.a : f.h;
    if (won && ['rma', 'fcb'].indexOf(opp) >= 0 && ['rma', 'fcb'].indexOf(st.userTeam) < 0) ACH('gigante');
    const goals = {}; res.events.forEach((e) => { if (e.type === 'goal' && !e.own && e.side === side) goals[e.pid] = (goals[e.pid] || 0) + 1; });
    if (Object.values(goals).some((n) => n >= 3)) ACH('hat_trick');
    if (res.mode === 'jugar' && won) ACH('victoria_jugando');
  };

  LG.applyResult = function (st, f, res, L) {
    const w = st.world;
    if (f.comp === 'playoff') {
      const P = st.playoff; const [kind, leg] = f.key.split('_');
      const tie = kind === 'f' ? P.final : P.semis[+kind.slice(1)];
      tie.legs[+leg] = { h: f.h, a: f.a, hg: res.score[0], ag: res.score[1] };
    } else {
      const g = res.events.filter((e) => e.type === 'goal').map((e) => [e.side, e.min, e.pid, e.own ? 1 : 0]);
      st.comp[f.comp].res[f.key] = { h: f.h, a: f.a, hg: res.score[0], ag: res.score[1], g };
    }
    // estadísticas individuales
    const ids = [L[0].xi.filter((x) => x !== null).concat(res.subsIn ? res.subsIn[0] : []), L[1].xi.filter((x) => x !== null).concat(res.subsIn ? res.subsIn[1] : [])];
    ids.forEach((arr, s) => arr.forEach((id) => {
      const p = w.players[id]; if (!p) return;
      p.st.pj++;
      const r = res.ratings[id]; if (r) { p.st.rat += r; p.st.ps++; }
      const fat = res.fatigue && res.fatigue[id] !== undefined ? (1 - res.fatigue[id]) * 55 : 14 + (110 - p.at.res) * 0.18;
      p.fit = Math.max(25, p.fit - fat);
      if (p.line === 'POR' && L[s].xi.indexOf(id) >= 0) { p.st.gc = (p.st.gc || 0) + res.score[1 - s]; p.st.pjp = (p.st.pjp || 0) + 1; }
      const gf = res.score[s], ga = res.score[1 - s];
      const ps = LG.stf(st, 'psico', p.team);
      p.mor = U.clamp(p.mor + (gf > ga ? 5 * (0.9 + 0.05 * ps) : gf < ga ? -4 * (1.25 - 0.11 * ps) : 1), 30, 99);
    }));
    res.events.forEach((e) => {
      const p = w.players[e.pid]; if (!p) return;
      if (e.type === 'goal' && !e.own) { p.st.g++; if (e.assist && w.players[e.assist]) w.players[e.assist].st.a++; }
      if (e.type === 'yellow') { p.st.ta++; p.yel++; if (p.yel >= 5) { p.yel = 0; p.sus = Math.max(p.sus, 1); p._justSus = true; if (LG.isManaged(st, p.team)) LG.news(st, p.name + ' cumple ciclo de amarillas: 1 partido de sanción.', 'sus'); } }
      if (e.type === 'red') { p.st.tr++; p.sus = Math.max(p.sus, e.second ? 1 : 2); p._justSus = true; if (LG.isManaged(st, p.team)) LG.news(st, p.name + ' es expulsado y será baja ' + p.sus + ' partido(s).', 'sus'); }
      if (e.type === 'injury') { p.inj = Math.max(p.inj, e.weeks); p.fit = Math.min(p.fit, 60); if (LG.isManaged(st, p.team)) LG.news(st, 'Lesión: ' + p.name + ' estará ' + e.weeks + ' jornada(s) de baja.', 'injury'); }
    });
    // moral de equipo y confianza de la directiva
    [f.h, f.a].forEach((tid, s) => {
      const t = w.teams[tid]; const gf = res.score[s], ga = res.score[1 - s];
      const ps = LG.stf(st, 'psico', tid);
      t.mor = U.clamp((t.mor || 70) + (gf > ga ? 4 : gf < ga ? -4 * (1.25 - 0.11 * ps) : 0), 30, 99);
      if (LG.isManaged(st, tid) && f.comp !== 'playoff') LG.own(st, tid, () => {
        const myS = DB.teamStrength(w, tid), opS = DB.teamStrength(w, s === 0 ? f.a : f.h);
        const exp = U.clamp(1.35 + (myS - opS) * 0.09 + (s === 0 ? 0.2 : -0.1), 0.4, 2.3);
        const pts = gf > ga ? 3 : gf === ga ? 1 : 0;
        st.board.conf = U.clamp(st.board.conf + (pts - exp) * 1.9 + (58 - st.board.conf) * 0.03, 0, 100);
      });
    });
  };

  LG.trainTechnical = function (st, R) {
    DB.teamPlayers(st.world, st.userTeam).forEach((p) => {
      if (p.age <= 23 && p.ovr < p.pot && R() < 0.06 * (0.55 + 0.12 * LG.stf(st, 'segundo')) * (0.8 + 0.1 * LG.stf(st, 'cantera'))) { p.ovr++; LG.bumpAttrs(p, 1); p.value = DB.playerValue(p); p.wage = DB.playerWage(p); }
    });
  };
  LG.bumpAttrs = function (p, d) { Object.keys(p.at).forEach((k) => { p.at[k] = U.clamp(p.at[k] + d, 10, 99); }); };

  // ---------- finanzas
  LG.ticketIncome = function (st, t, oppId) {
    const pos = LG.position(st, t.id) || 10; const n = st.comp[t.div].teams.length;
    const base = t.div === 1 ? 45 : 22;
    let fill = 0.62 + (t.mor - 70) * 0.004 + (1 - pos / n) * 0.18 - (t.ticket - base) * 0.007 + (LG.isManaged(st, t.id) ? 0.025 * (LG.stf(st, 'marketing', t.id) - 2) : 0);
    if (oppId && ['rma', 'fcb', 'atm'].indexOf(oppId) >= 0) fill += 0.12;
    fill = U.clamp(fill, 0.2, 1);
    const att = Math.round(t.cap * fill);
    return { att, money: att * t.ticket / 1e6 };
  };
  // espectadores de cualquier partido (los del usuario en casa coinciden con la taquilla)
  LG.attendance = function (st, f) {
    const t = LG.team(st, f.h);
    if (f.neutral) { const cap = (f.comp === 'cup' && st.cup && st.cup.venue && LG.team(st, st.cup.venue.tid)) ? LG.team(st, st.cup.venue.tid).cap : 62000; return { att: Math.round(cap * (0.9 + (U.hash(f.key + st.season) % 9) / 100)), cap }; }
    if (LG.isManaged(st, t.id) && t.div <= 2) { const ti = LG.ticketIncome(st, t, f.a); return { att: ti.att, cap: t.cap }; }
    const o = LG.team(st, f.a); const big = typeof f.comp === 'string' && f.comp !== 'playoff' ? 0.12 : 0;
    const fill = U.clamp(0.58 + ((t.mor || 70) - 70) * 0.004 + (((o && o.base) || 70) - 70) * 0.01 + big + ((U.hash(f.key + st.season) % 10) - 5) / 100, 0.3, 1);
    return { att: Math.round(t.cap * fill), cap: t.cap };
  };
  LG.tvIncome = (t, st) => (t.div === 1 ? Math.max(0.55, 0.6 + (t.base - 70) * 0.085) : 0.2) * (st && LG.isManaged(st, t.id) ? 0.93 + 0.035 * LG.stf(st, 'marketing', t.id) : 1);
  LG.wageBill = (st, tid) => U.sum(DB.teamPlayers(st.world, tid), (p) => p.wage);

  LG.finances = function (st, fx) {
    const uid = st.userTeam; const t = LG.team(st, uid);
    const f = fx.find((x) => x.h === uid || x.a === uid);
    let inc = 0, exp = 0; const items = [];
    if (f && f.h === uid) { const ti = LG.ticketIncome(st, t, f.a); inc += ti.money; items.push(['Taquilla (' + ti.att.toLocaleString('es-ES') + ' espectadores)', ti.money]); st.lastAttendance = ti.att; }
    if (f) { const tv = LG.tvIncome(t, st); inc += tv; items.push(['Derechos de TV', tv]); }
    const sponsor = ((t.div === 1 ? 0.08 : 0.02) + t.base / 2500) * (0.75 + 0.1 * LG.stf(st, 'marketing')); inc += sponsor; items.push(['Patrocinio', sponsor]);
    const sw = LG.staffWages(st); if (sw > 0) { exp += sw; items.push(['Personal del club', -sw]); }
    const wages = LG.wageBill(st, uid) / 42; exp += wages; items.push(['Salarios', -wages]);
    t.budget = Math.round((t.budget + inc - exp) * 100) / 100;
    st.finance.log.unshift({ s: st.season, d: st.day, inc, exp, items, bal: t.budget });
    if (st.finance.log.length > 50) st.finance.log.length = 50;
    if (t.budget >= 100) ACH('millonario', st);
    if (t.budget < -5 && st.day % 4 === 0) { st.board.conf = Math.max(0, st.board.conf - 4); LG.news(st, 'La directiva está preocupada por las cuentas: el club está en números rojos.', 'board'); }
  };

  // ingreso de premios (con apunte en las finanzas del usuario)
  LG.prize = function (st, tid, amount, text) {
    if (LG.isMulti(st) && LG.isManaged(st, tid) && tid !== st.userTeam) return LG.own(st, tid, () => LG.prize(st, tid, amount, text));
    const t = LG.team(st, tid); if (!t || t.foreign || !amount) return;
    t.budget = Math.round((t.budget + amount) * 100) / 100;
    if (tid === st.userTeam) { st.finance.log.unshift({ s: st.season, d: st.day, inc: amount, exp: 0, items: [[text, amount]], bal: t.budget }); LG.news(st, text + ': ' + U.money(amount) + '.', 'market'); }
  };

  // ---------- mercado
  LG.isWindow = (st) => !st.seasonOver && st.day < LG.MARKET_CLOSE;   // abierto hasta la jornada 29

  LG.askingPrice = function (st, p) {
    const mates = DB.teamPlayers(st.world, p.team).sort((a, b) => b.ovr - a.ovr);
    const rank = mates.indexOf(p);
    const f = st.world.teams[p.team].div >= 4 ? 1.3 : rank < 3 ? 1.45 : rank < 11 ? 1.2 : 1.0;
    const dd = p.team !== st.userTeam ? 1.08 - 0.035 * LG.stf(st, 'dirdep') : 1;   // el director deportivo negocia a la baja
    return Math.round(p.value * f * dd * 10) / 10;
  };

  LG.makeOffer = function (st, pid, amount) {
    const w = st.world; const p = w.players[pid]; const me = LG.team(st, st.userTeam);
    if (!LG.isWindow(st)) return { ok: false, msg: 'El mercado está cerrado desde la jornada 30 hasta la próxima temporada.' };
    if (!p || p.team === st.userTeam) return { ok: false, msg: 'Jugador no disponible.' };
    if (LG.isManaged(st, p.team)) return LG.humanOffer(st, p, amount);
    const sc = st.squadChg && st.squadChg[p.team];
    if (sc && sc.out >= LG.MAX_CHANGES && LG.team(st, p.team).div <= 2) return { ok: false, msg: 'El ' + LG.team(st, p.team).short + ' ya ha cerrado su plantilla: no venderá más jugadores esta temporada.' };
    if (p.retiring) return { ok: false, msg: p.name + ' ha anunciado su retirada al final de la temporada y no puede ser traspasado.' };
    if (me.parent) return { ok: false, msg: 'Los filiales no fichan: solo pueden subir jugadores de su cantera.' };
    if (amount > me.budget) return { ok: false, msg: 'No tienes presupuesto suficiente (' + U.money(me.budget) + ').' };
    if (DB.teamPlayers(w, st.userTeam).length >= 30) return { ok: false, msg: 'Tu plantilla ya tiene 30 jugadores. Vende antes de fichar.' };
    const seller = LG.team(st, p.team);
    const foreign = seller.div >= 4;
    if (!foreign && DB.teamPlayers(w, p.team).length <= 18) return { ok: false, msg: 'El ' + seller.short + ' no quiere desprenderse de más jugadores.' };
    if (st.offerLog && st.offerLog[pid] === st.day) return { ok: false, msg: 'El ' + seller.short + ' ya ha rechazado una oferta tuya esta jornada.' };
    // voluntad del jugador
    const myStr = DB.teamStrength(w, st.userTeam), hisStr = DB.teamStrength(w, p.team);
    if (me.div > seller.div && p.ovr >= 74 && amount < LG.askingPrice(st, p) * 1.6) return { ok: false, msg: p.name + ' no quiere bajar a Segunda División.' };
    if (foreign && p.ovr > myStr + 12) return { ok: false, msg: p.name + ' no ve atractivo el proyecto: prefiere seguir en el ' + seller.short + '.' };
    if (foreign && p.ovr >= 84 && me.div === 2) return { ok: false, msg: p.name + ' no quiere jugar en Segunda División.' };
    if (!foreign && p.ovr > myStr + 9 && hisStr > myStr + 4) return { ok: false, msg: p.name + ' prefiere seguir en un club más ambicioso.' };
    const ask = LG.askingPrice(st, p);
    st.offerLog = st.offerLog || {};
    if (amount >= ask) { LG.transfer(st, p, st.userTeam, amount); return { ok: true, msg: '¡Fichaje cerrado! ' + p.name + ' llega por ' + U.money(amount) + '.' }; }
    if (amount >= ask * 0.85) return { ok: false, counter: ask, msg: 'El ' + seller.short + ' pide ' + U.money(ask) + '. ¿Aceptas su contraoferta?' };
    st.offerLog[pid] = st.day;
    return { ok: false, msg: 'Oferta rechazada. El ' + seller.short + ' la considera insuficiente.' };
  };

  // ---------- traspasos entre los dos mánagers humanos (entre el 50% y el 150% del valor real)
  LG.HUMAN_MIN = 0.5; LG.HUMAN_MAX = 1.5;
  LG.humanRange = (p) => [Math.ceil(p.value * LG.HUMAN_MIN * 10) / 10, Math.floor(p.value * LG.HUMAN_MAX * 10) / 10];
  LG.humanOffer = function (st, p, amount) {
    const w = st.world; const me = LG.team(st, st.userTeam); const seller = LG.team(st, p.team); const M = LG.mgrData(st, p.team);
    const [lo, hi] = LG.humanRange(p); amount = Math.round(amount * 10) / 10;
    if (p.retiring) return { ok: false, msg: p.name + ' ha anunciado su retirada al final de la temporada y no puede ser traspasado.' };
    if (me.parent) return { ok: false, msg: 'Los filiales no fichan: solo pueden subir jugadores de su cantera.' };
    if (amount < lo || amount > hi) return { ok: false, msg: 'Entre mánagers la oferta debe estar entre el 50% y el 150% del valor real de ' + p.name + ': de ' + U.money(lo) + ' a ' + U.money(hi) + '.' };
    if (amount > me.budget) return { ok: false, msg: 'No tienes presupuesto suficiente (' + U.money(me.budget) + ').' };
    if (DB.teamPlayers(w, st.userTeam).length >= 30) return { ok: false, msg: 'Tu plantilla ya tiene 30 jugadores. Vende antes de fichar.' };
    if (DB.teamPlayers(w, p.team).length <= 18) return { ok: false, msg: 'El ' + seller.short + ' no puede quedarse con menos de 18 jugadores.' };
    M.offers = (M.offers || []).filter((o) => !(o.human && o.pid === p.id && o.from === st.userTeam));
    M.offers.push({ id: 'h' + st.season + '_' + st.day + '_' + p.id + '_' + st.userTeam, pid: p.id, from: st.userTeam, amount, day: st.day, human: true, by: st.userName });
    LG.news(st, 'Oferta entre mánagers: ' + st.userName + ' (' + me.short + ') ofrece ' + U.money(amount) + ' por ' + p.name + ' (' + seller.short + ').', 'offer');
    return { ok: false, sent: true, msg: 'Oferta enviada a ' + M.userName + '. La verá en su turno y decidirá si la acepta.' };
  };

  LG.transfer = function (st, p, toId, fee) {
    // las consecuencias para un mánager (finanzas, alineación, logros) se apuntan en sus datos
    if (LG.isMulti(st) && p.team !== st.userTeam && toId !== st.userTeam) { const own = [p.team, toId].find((x) => LG.isManaged(st, x)); if (own) return LG.own(st, own, () => LG.transfer(st, p, toId, fee)); }
    const w = st.world;
    st.squadChg = st.squadChg || {};
    const chg = (id, k) => { if (LG.isManaged(st, id)) return; const c = st.squadChg[id] = st.squadChg[id] || { in: 0, out: 0 }; c[k]++; };
    chg(toId, 'in'); chg(p.team, 'out'); const from = w.teams[p.team], to = w.teams[toId];
    from.budget = Math.round((from.budget + fee) * 100) / 100; to.budget = Math.round((to.budget - fee) * 100) / 100;
    const oldTeam = p.team;
    p.team = toId; p.yel = 0; p.mor = 75; DB.touch(w);
    if (p.fx) { delete p.fx; st.fxOut = st.fxOut || {}; st.fxOut[p.id] = 1; }   // deja de ser plantilla de referencia
    const used = new Set(DB.teamPlayers(w, toId).filter((q) => q !== p).map((q) => q.num));
    if (used.has(p.num)) { let n = p.num; for (let k = 1; k < 99; k++) if (!used.has(k) && k > 12) { n = k; break; } p.num = n; }
    // apuntes de cada mánager implicado (alineación, finanzas y logros)
    const book = () => {
      if (oldTeam !== st.userTeam && toId !== st.userTeam) return;
      if (st.lineup) { st.lineup.xi = st.lineup.xi.map((x) => (x === p.id && oldTeam === st.userTeam ? null : x)); st.lineup.bench = (st.lineup.bench || []).filter((x) => x !== p.id); }
      st.finance.log.unshift({ s: st.season, d: st.day, inc: oldTeam === st.userTeam ? fee : 0, exp: toId === st.userTeam ? fee : 0, items: [[(toId === st.userTeam ? 'Fichaje de ' : 'Venta de ') + p.name, toId === st.userTeam ? -fee : fee]], bal: w.teams[st.userTeam].budget });
      if (toId === st.userTeam) { ACH('fichaje', st); if (p.ovr >= 85) ACH('fichaje_estrella', st); if (from.div >= 4) ACH('fichaje_extranjero', st); }
      if (oldTeam === st.userTeam && fee >= 30) ACH('gran_venta', st);
    };
    book();
    [oldTeam, toId].forEach((x) => { if (x !== st.userTeam && LG.isManaged(st, x)) LG.own(st, x, book); });
    if (fee >= 8 || p.ovr >= 78 || LG.isManaged(st, oldTeam) || LG.isManaged(st, toId)) LG.news(st, 'Mercado: ' + p.name + ' (' + from.short + ') ficha por el ' + to.short + ' por ' + U.money(fee) + '.', 'market');
  };

  LG.aiTransfers = function (st, R, n) {
    const w = st.world;
    // los filiales no fichan; ningún equipo de la IA cambia más de 3 jugadores de una temporada a otra
    st.squadChg = st.squadChg || {};
    const room = (id, k) => ((st.squadChg[id] || { in: 0, out: 0 })[k] < LG.MAX_CHANGES);
    const buyers = st.div[1].concat(st.div[2]).filter((id) => !LG.isManaged(st, id) && !w.teams[id].parent && room(id, 'in'));
    for (let k = 0; k < n; k++) {
      const okB = buyers.filter((id) => room(id, 'in')); if (!okB.length) return;
      const b = w.teams[R.pick(okB)];
      const mine = DB.teamPlayers(w, b.id);
      if (mine.length >= 27 || b.budget < 1) continue;
      const lines = ['DEF', 'MED', 'DEL'];
      const line = R.pick(lines);
      const weakest = mine.filter((p) => p.line === line).sort((a, c) => a.ovr - c.ovr)[0];
      const thr = weakest ? weakest.ovr + 2 : 60;
      const cands = Object.values(w.players).filter((p) => p.line === line && !p.retiring && p.team !== b.id && !LG.isManaged(st, p.team) && room(p.team, 'out') && w.teams[p.team].div <= 3 && p.ovr >= thr && p.ovr <= thr + 8 && p.age <= 31)
        .filter((p) => { const pr = LG.askingPrice(st, p); return pr <= b.budget * 0.7 && DB.teamPlayers(w, p.team).length > 19; });
      if (!cands.length) continue;
      const p = R.pick(cands);
      LG.transfer(st, p, b.id, LG.askingPrice(st, p));
    }
  };

  LG.incomingOffers = function (st, R) {
    const w = st.world; const mine = DB.teamPlayers(w, st.userTeam).sort((a, b) => b.ovr - a.ovr);
    const nOff = R.int(0, 2);
    for (let i = 0; i < nOff; i++) {
      const p = R.pick(mine.slice(0, 16)); if (!p || p.retiring) continue;
      let buyers = st.div[1].concat(st.div[2]).filter((id) => !LG.isManaged(st, id) && (!st.squadChg || !st.squadChg[id] || st.squadChg[id].in < LG.MAX_CHANGES) && !w.teams[id].parent && w.teams[id].budget > p.value * 0.9 && (w.teams[id].base || 70) >= p.ovr - 10);
      // clubes extranjeros también pujan por los buenos jugadores
      const fx = (st.div[5] || []).filter((id) => w.teams[id] && w.teams[id].base >= p.ovr - 6 && w.teams[id].base <= p.ovr + 12);
      if (p.ovr >= 68 && fx.length && (R() < 0.45 || !buyers.length)) buyers = fx;
      if (!buyers.length) continue;
      const b = R.pick(buyers); const amount = Math.round(p.value * (0.85 + R() * 0.4) * (0.92 + 0.035 * LG.stf(st, 'dirdep')) * 10) / 10;
      st.offers.push({ id: 'o' + st.day + '_' + i + '_' + p.id, pid: p.id, from: b, amount, day: st.day });
      LG.news(st, 'Oferta recibida: el ' + w.teams[b].short + (w.teams[b].foreign ? ' (' + w.teams[b].country + ')' : '') + ' ofrece ' + U.money(amount) + ' por ' + p.name + '.', 'offer');
    }
  };

  LG.acceptOffer = function (st, oid) {
    const o = st.offers.find((x) => x.id === oid); if (!o) return { ok: false, msg: 'La oferta ha caducado.' };
    const p = st.world.players[o.pid];
    if (!p || p.team !== st.userTeam) return { ok: false, msg: 'El jugador ya no está en tu plantilla.' };
    if (p.retiring) return { ok: false, msg: p.name + ' ha anunciado su retirada y no puede ser traspasado.' };
    if (DB.teamPlayers(st.world, st.userTeam).length <= 18) return { ok: false, msg: 'No puedes quedarte con menos de 18 jugadores.' };
    if (st.world.teams[o.from].budget < o.amount) return { ok: false, msg: 'El comprador ya no tiene dinero suficiente.' };
    if (o.human) {
      if (!LG.isWindow(st)) return { ok: false, msg: 'El mercado está cerrado.' };
      if (DB.teamPlayers(st.world, o.from).length >= 30) return { ok: false, msg: 'La plantilla del ' + st.world.teams[o.from].short + ' ya está completa (30 jugadores).' };
    }
    LG.transfer(st, p, o.from, o.amount);
    st.offers = st.offers.filter((x) => x.pid !== o.pid);
    return { ok: true, msg: p.name + ' vendido al ' + st.world.teams[o.from].short + ' por ' + U.money(o.amount) + '.' };
  };

  LG.rejectOffer = function (st, oid) {
    const o = st.offers.find((x) => x.id === oid); st.offers = st.offers.filter((x) => x.id !== oid);
    if (o && o.human && st.world.players[o.pid]) LG.news(st, st.userName + ' rechaza la oferta de ' + o.by + ' (' + U.money(o.amount) + ') por ' + st.world.players[o.pid].name + '.', 'offer');
  };
  LG.listForSale = function (st, pid) {
    const w = st.world; const p = w.players[pid]; const R = LG.rng(st);
    if (p.retiring) return { ok: false, msg: p.name + ' se retira al final de la temporada: nadie puede ficharlo.' };
    if (!LG.isWindow(st)) return { ok: false, msg: 'El mercado está cerrado desde la jornada 30: espera a la próxima temporada para vender.' };
    const buyers = st.div[1].concat(st.div[2], st.div[3], p.ovr >= 68 ? (st.div[5] || []).filter((id) => w.teams[id] && w.teams[id].base >= p.ovr - 6 && w.teams[id].base <= p.ovr + 12) : []).filter((id) => !LG.isManaged(st, id) && (!st.squadChg || !st.squadChg[id] || st.squadChg[id].in < LG.MAX_CHANGES) && !w.teams[id].parent && w.teams[id].budget > p.value * 0.6 && DB.teamStrength(w, id) >= p.ovr - 12 && DB.teamPlayers(w, id).length < 28);
    if (!buyers.length) return { ok: false, msg: 'Ningún club está interesado en ' + p.name + ' ahora mismo.' };
    R.shuffle(buyers);
    const n = Math.min(buyers.length, R.int(1, 3));
    for (let i = 0; i < n; i++) {
      const amount = Math.round(p.value * (0.7 + R() * 0.45) * (0.92 + 0.035 * LG.stf(st, 'dirdep')) * 10) / 10;
      st.offers.push({ id: 'l' + st.day + '_' + i + '_' + p.id + '_' + Math.floor(R() * 1e6), pid, from: buyers[i], amount, day: st.day });
    }
    return { ok: true, msg: 'Has recibido ' + n + ' oferta(s) por ' + p.name + '.' };
  };

  // ---------- cantera
  const NOM = ['Álex', 'Hugo', 'Iker', 'Pablo', 'Mario', 'Dani', 'Adrián', 'Raúl', 'Marcos', 'Unai', 'Jon', 'Sergio', 'Carlos', 'Rubén', 'Asier', 'Nico', 'Javi', 'Diego', 'Aitor', 'Óscar', 'Izan', 'Leo', 'Bruno', 'Gael', 'Thiago', 'Erik', 'Ander', 'Pau', 'Marc', 'Oriol', 'Yeray', 'Moha', 'Samu', 'Kike', 'Jorge', 'Luca'];
  const APE = ['Arregui', 'Sotomayor', 'Valdés', 'Cifuentes', 'Lobato', 'Urrutia', 'Peralta', 'Mendívil', 'Quesada', 'Barrios', 'Ocaña', 'Larraz', 'Toribio', 'Bermejo', 'Escalante', 'Zubiri', 'Carrasco', 'Montes', 'Salcedo', 'Villena', 'Iturbe', 'Gallardo', 'Ferrán', 'Rojas', 'Benítez', 'Aranda', 'Pineda', 'Solano', 'Echeverría', 'Calvo', 'Navas', 'Del Río', 'Mora', 'Cortés', 'Galindo', 'Robles', 'Lozano', 'Prieto', 'Vidal', 'Ibáñez'];
  LG.genPlayer = function (st, tid, role, ovr, age, R) {
    const w = st.world; const name = R.pick(NOM) + ' ' + R.pick(APE);
    const used = new Set(DB.teamPlayers(w, tid).map((p) => p.num));
    let num = 26; while (used.has(num)) num++;
    const prof = { POR: { vel: -20, res: -10, agr: -15, cal: -5, pas: -20, tir: -40, reg: -35, dfn: -30, por: 2 }, DFC: { vel: -4, res: 0, agr: 3, cal: -3, pas: -8, tir: -25, reg: -15, dfn: 4, por: -55 }, LD: { vel: 4, res: 3, agr: -2, cal: -2, pas: -3, tir: -18, reg: -4, dfn: 0, por: -55 }, LI: { vel: 4, res: 3, agr: -2, cal: -2, pas: -3, tir: -18, reg: -4, dfn: 0, por: -55 }, MCD: { vel: -5, res: 3, agr: 2, cal: 0, pas: 1, tir: -10, reg: -6, dfn: 1, por: -55 }, MC: { vel: -3, res: 2, agr: -3, cal: 1, pas: 3, tir: -5, reg: 0, dfn: -8, por: -55 }, MCO: { vel: -1, res: -1, agr: -8, cal: 2, pas: 3, tir: 0, reg: 3, dfn: -18, por: -55 }, ED: { vel: 6, res: 0, agr: -8, cal: 0, pas: -2, tir: -2, reg: 4, dfn: -20, por: -55 }, EI: { vel: 6, res: 0, agr: -8, cal: 0, pas: -2, tir: -2, reg: 4, dfn: -20, por: -55 }, DC: { vel: 1, res: -2, agr: -3, cal: 0, pas: -6, tir: 5, reg: 0, dfn: -25, por: -55 } }[role];
    const at = {}; Object.keys(prof).forEach((k) => { at[k] = U.clamp(ovr + prof[k] + R.int(-4, 4), 15, 99); });
    const row = [w.nextPid++, tid, num, name, DB.LINE_OF[role], role, ovr, age, R.int(1, 4), R.int(0, 4), 'ESP', at.vel, at.res, at.agr, at.cal, at.pas, at.tir, at.reg, at.dfn, at.por, 1];
    const p = DB.makePlayer(row);
    p.pot = U.clamp(ovr + R.int(4, 20), ovr, 92);
    w.players[p.id] = p; DB.touch(w);
    return p;
  };
  LG.youthProspects = function (st) {
    const R = U.rng(U.hash(st.userTeam + st.season + 'cantera'));
    const t = LG.team(st, st.userTeam);
    const roles = ['POR', 'DFC', 'LD', 'LI', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC'];
    const out = [];
    for (let i = 0; i < 3; i++) {
      const cs = LG.stf(st, 'cantera');
      const role = R.pick(roles); const ovr = U.clamp(Math.round(t.base - 18 + R.int(-3, 6) + (cs - 2) * 2), 48, 76);
      out.push({ role, ovr, age: R.int(17, 18), name: R.pick(NOM) + ' ' + R.pick(APE), pot: U.clamp(ovr + R.int(8, 22) + (cs - 2) * 3, ovr, 94), tone: R.int(1, 4), hair: R.int(0, 4) });
    }
    return out;
  };
  LG.signYouth = function (st, idx) {
    if (st.youthUsed) return { ok: false, msg: 'Ya has subido un canterano esta temporada.' };
    if (DB.teamPlayers(st.world, st.userTeam).length >= 30) return { ok: false, msg: 'La plantilla está completa (30 jugadores).' };
    const y = LG.youthProspects(st)[idx]; const R = U.rng(U.hash(y.name));
    const p = LG.genPlayer(st, st.userTeam, y.role, y.ovr, y.age, R);
    p.name = y.name; p.short = U.surname(y.name); p.pot = y.pot; p.tone = y.tone; p.hair = y.hair;
    st.youthUsed = true; ACH('cantera', st);
    LG.news(st, 'El canterano ' + p.name + ' (' + y.role + ', ' + y.age + ' años) sube al primer equipo.', 'youth');
    return { ok: true, msg: p.name + ' ya entrena con el primer equipo.' };
  };

  // ---------- COPA DEL REY
  // Participan Primera, Segunda (sin filiales) y la bolsa de Primera RFEF. Eliminatorias a partido único
  // en el campo del equipo con peor media de plantilla; la final, en campo neutral (estadio de un grande de Primera).
  LG.squadAvg = function (w, tid) {
    const o = DB.teamPlayers(w, tid).map((p) => p.ovr).sort((a, b) => b - a).slice(0, 16);
    return o.length ? U.sum(o) / o.length : 0;
  };
  LG.setupCup = function (st, R) {
    const w = st.world;
    const teams = st.div[1].concat(st.div[2].filter((id) => !w.teams[id].parent), st.div[3] || []);
    const byStr = teams.slice().sort((a, b) => LG.squadAvg(w, b) - LG.squadAvg(w, a));
    const byes = byStr.slice(0, U.clamp(64 - teams.length, 0, 32));   // los más fuertes entran en dieciseisavos
    const C = { season: st.season, teams: teams.slice(), alive: teams.filter((id) => byes.indexOf(id) < 0), byes, round: 0, rounds: [], winner: null, runnerUp: null, venue: null, goals: {} };
    LG.drawCupRound(st, C, R);
    return C;
  };
  LG.drawCupRound = function (st, C, R) {
    const w = st.world; const r = C.rounds.length; let pool = C.alive.slice(); R.shuffle(pool);
    // hasta octavos, como en la Copa real, los equipos de menor categoría se cruzan con los de mayor categoría
    const pairs = [];
    if (r <= 2) {
      pool.sort((a, b) => w.teams[a].div - w.teams[b].div);
      for (let i = 0; i < pool.length / 2; i++) pairs.push([pool[i], pool[pool.length - 1 - i]]);
    } else for (let i = 0; i + 1 < pool.length; i += 2) pairs.push([pool[i], pool[i + 1]]);
    R.shuffle(pairs);
    const ties = [];
    for (const pr of pairs) {
      let h = pr[0], a = pr[1];
      // juega en casa el equipo con peor media de jugadores
      if (LG.squadAvg(w, a) < LG.squadAvg(w, h)) { const x = h; h = a; a = x; }
      ties.push({ h, a, hg: null, ag: null, pens: null, et: false, w: null });
    }
    const rd = { label: LG.CUP_ROUNDS[r] || ('Ronda ' + (r + 1)), day: LG.CUP_DAYS[r], ties };
    if (r === LG.CUP_ROUNDS.length - 1 && ties.length === 1) {
      // final en campo neutral: estadio del club más fuerte de Primera que no la juega
      const host = st.div[1].filter((id) => id !== ties[0].h && id !== ties[0].a).sort((a, b) => LG.squadAvg(w, b) - LG.squadAvg(w, a))[0];
      const ht = w.teams[host];
      C.venue = { tid: host, stadium: ht.stadium, city: ht.city };
      const [x, y] = [ties[0].h, ties[0].a].sort((a, b) => LG.squadAvg(w, b) - LG.squadAvg(w, a));
      ties[0].h = x; ties[0].a = y; ties[0].neutral = true;
    }
    C.rounds.push(rd);
    ties.filter((t) => LG.involvesMgr(st, t)).forEach((ut) => { if (st.day > 0) LG.news(st, 'Sorteo de Copa del Rey (' + rd.label + '): ' + w.teams[ut.h].short + ' - ' + w.teams[ut.a].short + (ties[0].neutral ? ' en el ' + C.venue.stadium + ' (campo neutral)' : '') + '.', 'cup'); });
  };
  LG.cupDue = (st) => !!(st.cup && !st.seasonOver && !st.cup.winner && st.cup.rounds[st.cup.round] && st.day >= LG.CUP_DAYS[st.cup.round]);
  LG.cupFixtures = function (st) {
    const C = st.cup; const rd = C.rounds[C.round];
    return rd.ties.map((t, i) => ({ h: t.h, a: t.a, key: 'c' + C.round + '_' + i, comp: 'cup', cupRound: C.round, neutral: !!t.neutral, venue: t.neutral ? C.venue.stadium : null, label: 'Copa del Rey · ' + rd.label }));
  };
  // Si hay empate: prórroga y, si persiste, tanda de penaltis (simuladas)
  LG.cupResolve = function (st, f, res, L, R) {
    const w = st.world;
    if (res.decided) { res.winSide = res.score[0] > res.score[1] ? 0 : res.score[0] < res.score[1] ? 1 : (res.pens && res.pens[0] > res.pens[1] ? 0 : 1); return res; }   // ya resuelto en el partido
    res.score = res.score.slice(); res.events = res.events.slice();
    if (res.score[0] === res.score[1]) {
      res.et = true;
      const sA = [LG.squadAvg(w, f.h), LG.squadAvg(w, f.a)];
      [0, 1].forEach((side) => {
        const pr = U.clamp(0.24 + (sA[side] - sA[1 - side]) * 0.015, 0.06, 0.45);
        const xi = L[side].xi.filter((id) => id !== null && w.players[id] && w.players[id].line !== 'POR');
        let n = 0;
        while (xi.length && n < 3 && R() < pr / (n + 1)) {
          n++; res.score[side]++;
          const tot = U.sum(xi, (id) => w.players[id].at.tir + (w.players[id].line === 'DEL' ? 30 : 0));
          let x = R() * tot, pid = xi[0];
          for (const id of xi) { x -= w.players[id].at.tir + (w.players[id].line === 'DEL' ? 30 : 0); if (x <= 0) { pid = id; break; } }
          res.events.push({ type: 'goal', side, min: 91 + R.int(0, 29), pid, et: true });
        }
      });
      res.events.sort((a, b) => a.min - b.min);
    }
    if (res.score[0] === res.score[1]) {
      const takers = [0, 1].map((side) => L[side].xi.filter((id) => id !== null && w.players[id] && w.players[id].line !== 'POR').sort((a, b) => w.players[b].at.tir - w.players[a].at.tir));
      const gks = [0, 1].map((side) => w.players[L[side].xi[0]] || { at: { por: 60 } });
      const kick = (side, k) => { const sh = w.players[takers[side][k % takers[side].length]]; const pr = U.clamp(0.76 + ((sh ? sh.at.tir : 65) - gks[1 - side].at.por) / 320, 0.55, 0.92); return R() < pr ? 1 : 0; };
      const p = [0, 0], n = [0, 0]; let k = 0;
      tanda: for (; k < 5; k++) {
        for (const side of [0, 1]) {
          p[side] += kick(side, k); n[side]++;
          if (p[0] + (5 - n[0]) < p[1] || p[1] + (5 - n[1]) < p[0]) { k++; break tanda; }
        }
      }
      while (p[0] === p[1] && k < 30) { p[0] += kick(0, k); p[1] += kick(1, k); k++; }
      if (p[0] === p[1]) p[R() < 0.5 ? 0 : 1]++;
      res.pens = p;
    }
    res.winSide = res.score[0] > res.score[1] ? 0 : res.score[0] < res.score[1] ? 1 : (res.pens[0] > res.pens[1] ? 0 : 1);
    return res;
  };
  LG.applyCupResult = function (st, f, res, L) {
    const w = st.world; const C = st.cup; const tie = C.rounds[f.cupRound].ties[+f.key.split('_')[1]];
    tie.hg = res.score[0]; tie.ag = res.score[1]; tie.et = !!res.et; tie.pens = res.pens || null; tie.w = res.winSide === 0 ? f.h : f.a;
    tie.g = res.events.filter((e) => e.type === 'goal').map((e) => [e.side, e.min, e.pid, e.own ? 1 : 0]);
    [0, 1].forEach((s) => L[s].xi.filter((x) => x !== null).concat(res.subsIn ? res.subsIn[s] : []).forEach((id) => {
      const p = w.players[id]; if (!p) return;
      const fat = res.fatigue && res.fatigue[id] !== undefined ? (1 - res.fatigue[id]) * 55 : 14 + (110 - p.at.res) * 0.18;
      p.fit = Math.max(25, p.fit - fat);
      p.mor = U.clamp(p.mor + (res.winSide === s ? 4 : -3), 30, 99);
    }));
    res.events.forEach((e) => {
      const p = w.players[e.pid]; if (!p) return;
      if (e.type === 'goal' && !e.own) C.goals[e.pid] = (C.goals[e.pid] || 0) + 1;
      if (e.type === 'injury') { p.inj = Math.max(p.inj, e.weeks); p.fit = Math.min(p.fit, 60); if (LG.isManaged(st, p.team)) LG.news(st, 'Lesión en Copa: ' + p.name + ' estará ' + e.weeks + ' jornada(s) de baja.', 'injury'); }
    });
    [f.h, f.a].forEach((tid, s) => { const t = w.teams[tid]; t.mor = U.clamp((t.mor || 70) + (res.winSide === s ? 3 : -3), 30, 99); });
  };
  LG.playCupDay = function (st, userRes) {
    const R = LG.rng(st); const w = st.world; const C = st.cup; const r = C.round;
    const fx = LG.cupFixtures(st); const played = new Set(); const summary = [];
    fx.forEach((f) => {
      const L = [LG.lineupFor(st, f.h), LG.lineupFor(st, f.a)];
      let res = LG.takeRes(st, f, userRes) || SIM.play(w, LG.simOpts(st, f, L, R));
      res = LG.cupResolve(st, f, res, L, R);
      LG.applyCupResult(st, f, res, L);
      played.add(f.h); played.add(f.a); summary.push({ f, res });
      LG.userSides(st, f).forEach((tid) => LG.own(st, tid, () => {
        const side = f.h === st.userTeam ? 0 : 1; const won = res.winSide === side; const opp = w.teams[side === 0 ? f.a : f.h];
        st.lastUser = { f, score: res.score.slice(), events: res.events.filter((e) => e.type === 'goal' || e.type === 'red'), stats: res.stats, ratings: res.ratings };
        LG.userMatchDone(st, f, res);
        if (won) {
          const prize = LG.CUP_PRIZE[r] || 0; const me = w.teams[st.userTeam];
          me.budget = Math.round((me.budget + prize) * 100) / 100;
          st.finance.log.unshift({ s: st.season, d: st.day, inc: prize, exp: 0, items: [['Copa del Rey: premio por superar ' + C.rounds[r].label.toLowerCase(), prize]], bal: me.budget });
          if (opp.div < w.teams[st.userTeam].div) ACH('matagigantes', st);
          LG.news(st, r === LG.CUP_ROUNDS.length - 1 ? '¡CAMPEONES DE COPA! El ' + me.name + ' gana la Copa del Rey.' : 'Copa del Rey: el ' + me.short + ' supera ' + C.rounds[r].label.toLowerCase() + ' ante el ' + opp.short + '.', 'cup');
        } else LG.news(st, 'Copa del Rey: el ' + w.teams[st.userTeam].short + ' cae eliminado ante el ' + opp.short + ' (' + C.rounds[r].label.toLowerCase() + ').', 'cup');
        if (f.h === st.userTeam && !f.neutral) {
          const ti = LG.ticketIncome(st, w.teams[st.userTeam], f.a); const m = ti.money * 0.8; const me = w.teams[st.userTeam];
          me.budget = Math.round((me.budget + m) * 100) / 100;
          st.finance.log.unshift({ s: st.season, d: st.day, inc: m, exp: 0, items: [['Taquilla de Copa (' + Math.round(ti.att * 0.85).toLocaleString('es-ES') + ' espectadores)', m]], bal: me.budget });
        }
      }));
    });
    LG.recover(st, played, false);
    const winners = C.rounds[r].ties.map((t) => t.w);
    C.round++;
    if (r === LG.CUP_ROUNDS.length - 1) {
      const fin = C.rounds[r].ties[0]; C.winner = fin.w; C.runnerUp = fin.w === fin.h ? fin.a : fin.h;
      const wt = w.teams[C.winner]; wt.gtitles = wt.gtitles || {}; wt.gtitles.copa = (wt.gtitles.copa || 0) + 1;
      if (!LG.isManaged(st, C.winner)) { wt.budget = Math.round((wt.budget + LG.TITLE_PRIZE.copa) * 100) / 100; LG.news(st, 'El ' + wt.name + ' gana la Copa del Rey ante el ' + w.teams[C.runnerUp].short + ' en el ' + C.venue.stadium + '.', 'cup'); }
      [C.winner, C.runnerUp].filter((x) => LG.isManaged(st, x)).forEach((x) => LG.own(st, x, () => ACH('final_copa', st)));
      if (LG.isManaged(st, C.winner)) LG.own(st, C.winner, () => { ACH('copa', st); LG.addTrophy(st, C.winner, 'copa'); LG.prize(st, C.winner, LG.TITLE_PRIZE.copa, 'Copa del Rey: premio al campeón'); });
    } else {
      C.alive = winners.concat(r === 0 ? C.byes : []);
      LG.drawCupRound(st, C, R);
    }
    return summary;
  };
  LG.userInCup = (st) => { const C = st.cup; return !!(C && !C.winner && (C.alive.indexOf(st.userTeam) >= 0 || (C.round === 0 && C.byes.indexOf(st.userTeam) >= 0))); };

  // ---------- SUPERCOPA DE ESPAÑA (4 equipos: campeón y subcampeón de Liga y finalistas de Copa; semifinales y final)
  LG.SUPES_DAY = 22;
  LG.setupSupes = function (st, first) {
    const w = st.world;
    if (first) {
      // edición real 2027 (Estambul, 2-6 de febrero): Barcelona-Atlético y Real Sociedad-Real Madrid
      return { season: st.season, round: 0, done: false, winner: null, final: null, finalVenue: 'RAMS Park (Estambul)',
        semis: [{ a: 'fcb', b: 'atm', venue: 'Şükrü Saracoğlu (Estambul)' }, { a: 'rso', b: 'rma', venue: 'Tüpraş Stadyumu (Estambul)' }].filter((x) => w.teams[x.a] && w.teams[x.b]) };
    }
    const h = st.history[0]; if (!h) return null;
    const t1 = h.table1 || []; const four = [];
    const add = (id) => { if (id && w.teams[id] && !w.teams[id].foreign && !w.teams[id].parent && four.indexOf(id) < 0 && four.length < 4) four.push(id); };
    add(t1[0]); add(t1[1]); if (h.cup) { add(h.cup[0]); add(h.cup[1]); }
    let k = 2; while (four.length < 4 && k < t1.length) add(t1[k++]);
    if (four.length < 4) return null;
    const V = 'Sede neutral de la Supercopa';
    return { season: st.season, round: 0, done: false, winner: null, final: null, finalVenue: V,
      semis: [{ a: four[0], b: four[3], venue: V }, { a: four[2], b: four[1], venue: V }] };
  };
  LG.supesDue = (st) => !!(st.supes && !st.supes.done && !st.seasonOver && st.day >= LG.SUPES_DAY);
  LG.supesFixtures = function (st) {
    const S = st.supes;
    if (S.round === 0) return S.semis.map((t, i) => ({ h: t.a, a: t.b, key: 'se' + i, comp: 'supes', neutral: true, venue: t.venue, label: 'Supercopa de España · Semifinal', ko: true, tie: t }));
    return [{ h: S.final.a, a: S.final.b, key: 'sef', comp: 'supes', neutral: true, venue: S.finalVenue, label: 'Supercopa de España · Final', ko: true, tie: S.final }];
  };
  LG.playSupes = function (st, userRes) {
    const R = LG.rng(st); const S = st.supes; const w = st.world; const summary = []; const played = new Set();
    LG.supesFixtures(st).forEach((f) => {
      const L = [LG.lineupFor(st, f.h), LG.lineupFor(st, f.a)];
      let res = LG.takeRes(st, f, userRes) || SIM.play(w, LG.simOpts(st, f, L, R));
      res = LG.cupResolve(st, f, res, L, R);
      if (MF.EU) MF.EU.applySpanish(st, f, res, L);
      const t = f.tie; t.hg = res.score[0]; t.ag = res.score[1]; t.pens = res.pens || null; t.et = !!res.et; t.w = res.winSide === 0 ? f.h : f.a;
      const loser = t.w === f.h ? f.a : f.h;
      LG.prize(st, loser, S.round === 0 ? LG.TITLE_PRIZE.supes_semi : LG.TITLE_PRIZE.supes_final, 'Supercopa de España: ' + (S.round === 0 ? 'semifinalista' : 'finalista'));
      played.add(f.h); played.add(f.a); summary.push({ f, res });
      LG.userSides(st, f).forEach((tid) => LG.own(st, tid, () => { st.lastUser = { f, score: res.score.slice(), events: res.events.filter((e) => e.type === 'goal' || e.type === 'red'), stats: res.stats, ratings: res.ratings }; LG.userMatchDone(st, f, res); }));
    });
    LG.recover(st, played, false);
    if (S.round === 0) { S.final = { a: S.semis[0].w, b: S.semis[1].w }; S.round = 1; LG.news(st, 'Final de la Supercopa de España: ' + w.teams[S.final.a].short + ' - ' + w.teams[S.final.b].short + '.', 'cup'); }
    else {
      S.done = true; S.winner = S.final.w; const wt = w.teams[S.winner];
      wt.gtitles = wt.gtitles || {}; wt.gtitles.supes = (wt.gtitles.supes || 0) + 1;
      LG.prize(st, S.winner, LG.TITLE_PRIZE.supes, 'Supercopa de España: premio al campeón');
      if (LG.isManaged(st, S.winner)) LG.own(st, S.winner, () => { LG.addTrophy(st, S.winner, 'supes'); ACH('supercopa_es', st); });
      LG.news(st, 'El ' + wt.name + ' gana la Supercopa de España.', 'cup');
    }
    return summary;
  };

  // ---------- playoff de ascenso (3º-6º de Segunda)
  // los filiales (Real Sociedad B, Celta Fortuna) no pueden ascender a Primera
  LG.promotionEligible = function (st, tid) { return !LG.team(st, tid).parent; };
  LG.setupPlayoff = function (st) {
    const t1 = LG.table(st, 1), t2 = LG.table(st, 2);
    const relegated = t1.slice(-3).map((r) => r.id);
    const stay = t1.slice(0, -3).map((r) => r.id);
    const elig = t2.filter((r) => LG.promotionEligible(st, r.id, stay)).map((r) => r.id);
    const direct = elig.slice(0, 2); const po = elig.slice(2, 6);
    st.playoff = { relegated, direct, teams: po, semis: [{ a: po[0], b: po[3], legs: [] }, { a: po[1], b: po[2], legs: [] }], final: null, winner: null };
    LG.news(st, 'Ascienden directamente a Primera: ' + direct.map((id) => LG.team(st, id).short).join(' y ') + '. Playoff: ' + po.map((id) => LG.team(st, id).short).join(', ') + '.', 'league');
  };
  LG.tieWinner = function (st, tie) {
    let ga = 0, gb = 0;
    tie.legs.forEach((l) => { if (!l) return; if (l.h === tie.a) { ga += l.hg; gb += l.ag; } else { gb += l.hg; ga += l.ag; } });
    if (ga > gb) return tie.a; if (gb > ga) return tie.b;
    return tie.a; // empate global: avanza el mejor clasificado
  };
  LG.setupFinal = function (st) {
    const P = st.playoff;
    const a = LG.tieWinner(st, P.semis[0]), b = LG.tieWinner(st, P.semis[1]);
    const order = P.teams; const fa = order.indexOf(a) < order.indexOf(b) ? a : b; const fb = fa === a ? b : a;
    P.final = { a: fa, b: fb, legs: [] };
    LG.news(st, 'Final del playoff: ' + LG.team(st, fa).short + ' - ' + LG.team(st, fb).short + '.', 'league');
  };

  // ---------- fin de temporada
  LG.endSeason = function (st) {
    if (st.seasonOver) return;
    const P = st.playoff || {};
    if (P.final && !P.winner) P.winner = LG.tieWinner(st, P.final);
    const t1 = LG.table(st, 1), t2 = LG.table(st, 2);
    const champ1 = t1[0].id, champ2 = t2[0].id;
    const relegated1 = P.relegated || t1.slice(-3).map((r) => r.id);
    const up = (P.direct || []).concat(P.winner ? [P.winner] : []);
    let down2 = t2.slice(-4).map((r) => r.id).filter((id) => up.indexOf(id) < 0);
    // filiales: no pueden coincidir con su primer equipo
    const nextSeg = st.div[2].filter((id) => up.indexOf(id) < 0 && down2.indexOf(id) < 0).concat(relegated1);
    nextSeg.forEach((id) => { const t = LG.team(st, id); if (t.parent && nextSeg.indexOf(t.parent) >= 0 && down2.indexOf(id) < 0) down2.push(id); });
    const pool = st.div[3].slice().sort((a, b) => DB.teamStrength(st.world, b) - DB.teamStrength(st.world, a));
    const upPool = pool.slice(0, down2.length);
    // premios
    const prize = (div, pos) => (div === 1 ? Math.max(2, 22 - pos) : Math.max(0.5, (23 - pos) * 0.25));
    [1, 2].forEach((dv) => LG.table(st, dv).forEach((r) => LG.prize(st, r.id, prize(dv, r.pos), 'Premio de la Liga por terminar ' + r.pos + 'º')));
    LG.prize(st, champ1, LG.TITLE_PRIZE.liga, 'Liga: premio al campeón'); LG.prize(st, champ2, LG.TITLE_PRIZE.segunda, 'Segunda: premio al campeón');
    if (P.winner) LG.prize(st, P.winner, LG.TITLE_PRIZE.playoff, 'Playoff de ascenso: premio al ganador');
    // estadísticas de la temporada
    const all = Object.values(st.world.players);
    const top = (f, n) => all.filter((p) => st.world.teams[p.team] && st.world.teams[p.team].div <= 2).sort((a, b) => f(b) - f(a)).slice(0, n || 1);
    const pich1 = all.filter((p) => LG.team(st, p.team).div === 1).sort((a, b) => b.st.g - a.st.g)[0];
    const pich2 = all.filter((p) => LG.team(st, p.team).div === 2).sort((a, b) => b.st.g - a.st.g)[0];
    // títulos conseguidos en la partida y logros
    const addT = (tid, k) => { const t = LG.team(st, tid); t.gtitles = t.gtitles || {}; t.gtitles[k] = (t.gtitles[k] || 0) + 1; };
    addT(champ1, 'liga'); addT(champ2, 'segunda');
    // ---- parte de cada mánager: objetivo, títulos y logros
    const per = [];
    LG.forEachMgr(st, (j) => {
    const uT = LG.team(st, st.userTeam);
    const uPos = uT.div <= 2 ? LG.table(st, uT.div).find((r) => r.id === uT.id).pos : null;
    if (up.indexOf(st.userTeam) >= 0) LG.prize(st, st.userTeam, 10, 'Premio por el ascenso a Primera');
    const obj = st.board.objective; let met = uPos !== null && uPos <= obj.maxPos;
    if (uT.div === 2 && up.indexOf(st.userTeam) >= 0) met = true;
    const near = uPos !== null && uPos <= obj.maxPos + 2;
    st.board.conf = U.clamp(st.board.conf + (met ? 22 : near ? -10 : -28), 0, 100);
    per[j] = { uT, uPos, met, near, obj };
    st.trophies = st.trophies || [];
    if (champ1 === st.userTeam) { st.trophies.push({ season: st.season, comp: 'liga', team: st.userTeam }); ACH('campeon_liga', st); }
    if (champ2 === st.userTeam) { st.trophies.push({ season: st.season, comp: 'segunda', team: st.userTeam }); ACH('campeon_segunda', st); }
    if (up.indexOf(st.userTeam) >= 0) { ACH('ascenso', st); if (P.winner === st.userTeam) { ACH('playoff', st); st.trophies.push({ season: st.season, comp: 'playoff', team: st.userTeam }); } }
    if (champ1 === st.userTeam && st.cup && st.cup.winner === st.userTeam) ACH('doblete', st);
    if (uT.div === 1 && uPos && uPos <= 4) ACH('champions', st);
    if (met) ACH('objetivo', st);
    if (met && obj.text === 'Evitar el descenso') ACH('salvacion', st);
    const myDivTop = all.filter((p) => LG.team(st, p.team).div === uT.div).sort((a, b) => b.st.g - a.st.g)[0];
    if (myDivTop && myDivTop.team === st.userTeam && myDivTop.st.g > 0) ACH('pichichi', st);
    st.ach = st.ach || { cs: 0, unb: 0, ws: 0, seasons: 0, clubs: [st.userTeam] };
    st.ach.seasons++;
    if (st.ach.seasons >= 3) ACH('veterano', st);
    if (st.ach.seasons >= 10) ACH('leyenda', st);
    });
    if (MF.EU) MF.EU.endSeason(st);
    const users = [];
    LG.forEachMgr(st, (j) => { const q = per[j]; users[j] = { user: { team: st.userTeam, div: q.uT.div, pos: q.uPos, met: q.met, objective: q.obj.text, name: st.userName }, report: LG.seasonReport(st, q.uT, q.uPos, q.met, q.near, up, relegated1, down2) }; });
    const eh = st.euro && st.euro.history && st.euro.history[0] && st.euro.history[0].season === st.season ? st.euro.history[0] : null;
    const u0 = users[st.cur || 0];
    st.history.unshift({
      supes: st.supes && st.supes.winner ? st.supes.winner : null,
      eu: eh ? { ucl: eh.ucl, uel: eh.uel, uecl: eh.uecl, sup: eh.sup, inter: eh.inter, cwc: eh.cwc } : null,
      report: u0.report, users: LG.isMulti(st) ? users : undefined,
      table1: t1.map((r) => r.id),
      cup: st.cup && st.cup.winner ? [st.cup.winner, st.cup.runnerUp] : null,
      season: st.season, champ1, champ2, relegated: relegated1.slice(), promoted: up.slice(), playoff: P.winner || null, down2: down2.slice(), up3: upPool.slice(),
      user: u0.user,
      pich1: pich1 ? [pich1.name, pich1.team, pich1.st.g] : null, pich2: pich2 ? [pich2.name, pich2.team, pich2.st.g] : null,
      mvp: top((p) => (p.st.ps >= 15 ? p.st.rat / p.st.ps : 0))[0] ? (function () { const p = top((q) => (q.st.ps >= 15 ? q.st.rat / q.st.ps : 0))[0]; return [p.name, p.team]; })() : null,
    });
    st.pendingDivs = {
      1: st.div[1].filter((id) => relegated1.indexOf(id) < 0).concat(up),
      2: st.div[2].filter((id) => up.indexOf(id) < 0 && down2.indexOf(id) < 0).concat(relegated1, upPool),
      3: st.div[3].filter((id) => upPool.indexOf(id) < 0).concat(down2),
      4: (st.div[4] || []).slice(),
      5: (st.div[5] || []).slice(),
    };
    st.seasonOver = true;
    LG.news(st, 'Fin de la temporada ' + DB.SEASON_LABEL(st.season) + '. Campeón de Liga: ' + LG.team(st, champ1).name + '.', 'league');
    LG.forEachMgr(st, () => {
      const uT = LG.team(st, st.userTeam);
      if (st.board.conf < 20 && !st.fired) { st.fired = true; ACH('despedido', st); }
      if (st.pendingDivs[3].indexOf(st.userTeam) >= 0) { st.fired = true; st.outOfLeague = true; LG.news(st, 'El ' + uT.name + ' desciende a Primera RFEF, categoría que no se juega en esta versión. Elige un nuevo club.', 'board'); }
    });
  };

  // ---------- balance de la temporada del usuario (para el resumen y la imagen para redes)
  LG.seasonReport = function (st, uT, uPos, met, near, up, relegated1, down2) {
    const w = st.world; const u = st.userTeam;
    const row = uT.div <= 2 ? LG.table(st, uT.div).find((r) => r.id === u) : null;
    // Copa del Rey
    let cup = '—'; const C = st.cup;
    if (C) {
      if (C.winner === u) cup = 'Campeón';
      else if (C.teams.indexOf(u) >= 0) { let last = null; C.rounds.forEach((rd) => { if (rd.ties.some((t) => t.h === u || t.a === u)) last = rd; }); if (last) cup = (C.runnerUp === u ? 'Finalista' : 'Eliminado en ' + last.label.toLowerCase()); }
      else cup = 'No participa';
    }
    // Europa
    let euro = null;
    if (MF.EU && st.euro && st.euro.comps) {
      const codes = MF.EU.compsOf(st, u);
      if (codes.length) {
        const c = codes[0]; const E = st.euro.comps[c]; let txt;
        if (E.winner === u) txt = 'Campeón'; else if (E.runnerUp === u) txt = 'Finalista';
        else { let last = null; E.ko.forEach((K) => { if (K.ties.some((t) => t.a === u || t.b === u)) last = K; }); const tab = MF.EU.table(st, E); const pos = (tab.find((r) => r.id === u) || {}).pos; txt = last ? 'Eliminado en ' + last.label.toLowerCase() : 'Fase de liga (' + pos + 'º)'; }
        euro = { comp: E.name, txt };
      }
    }
    const sq = DB.teamPlayers(w, u);
    const scorer = sq.slice().sort((a, b) => b.st.g - a.st.g)[0];
    const star = sq.filter((p) => p.st.ps >= 8).sort((a, b) => b.st.rat / b.st.ps - a.st.rat / a.st.ps)[0];
    const titles = (st.trophies || []).filter((x) => x.season === st.season && x.team === u).map((x) => x.comp);
    const promoted = up.indexOf(u) >= 0, relegated = relegated1.indexOf(u) >= 0 || down2.indexOf(u) >= 0;
    // valoración de 1 a 5 estrellas
    const gap = uPos ? uPos - st.board.objective.maxPos : 99;
    let sc = met ? 3 : gap <= 2 ? 2.2 : gap <= 6 ? 1.6 : 1;
    if (euro && /Campeón|Finalista|semifinal|cuartos/i.test(euro.txt)) sc += 0.5;
    if (/Campeón|Finalista|semifinal/i.test(cup)) sc += 0.5;
    if (uPos && met && st.board.objective.maxPos - uPos >= 3) sc += 1;
    const big = { liga: 2, ucl: 2, copa: 1, uel: 1, mundial: 2, segunda: 1, uecl: 1, supes: 0.5, supercopa: 0.5, inter: 0.5, playoff: 0.5 };
    titles.forEach((k) => { sc += big[k] || 0.5; });
    if (promoted) sc += 1; if (relegated) sc = Math.min(sc, 1); if (st.fired) sc = Math.min(sc, 1);
    const stars = U.clamp(Math.round(sc), 1, 5);
    const pool = LG.RATING_TEXT[stars]; const phrase = pool[U.hash(u + st.season + (st.seed || 0)) % pool.length];
    return {
      team: u, div: uT.div, pos: uPos, objective: st.board.objective.text, met, stars, phrase,
      rec: row ? [row.g, row.e, row.p, row.gf, row.gc, row.pts] : null, cup, euro, titles, promoted, relegated,
      scorer: scorer && scorer.st.g ? [scorer.name, scorer.st.g] : null, star: star ? [star.name, Math.round(star.st.rat / star.st.ps * 100) / 100] : null,
      manager: st.userName, conf: Math.round(st.board.conf),
    };
  };
  LG.RATING_TEXT = {
    1: ['Temporada para olvidar: hasta el utillero pidió el traslado', 'El presidente ya busca tu foto para el álbum de ex entrenadores', 'Ni el VAR encontró algo bueno', 'Año de travesía por el desierto sin cantimplora', 'La afición pidió el reembolso del abono', 'Más pinchazos que una bici de montaña', 'El equipo jugó con el freno de mano puesto', 'Para enmarcar… en la sala de los horrores', 'Hasta la mascota se cambió de club', 'Ni rezándole al patrón se arreglaba esto', 'Una temporada de las de apagar la tele', 'Los rivales te mandaron flores de agradecimiento'],
    2: ['Aprobado raspado y con faltas de ortografía', 'Ni fu ni fa: temporada de café descafeinado', 'Hubo luces, pero el plomo saltó demasiadas veces', 'Se intentó, que no es poco', 'El equipo prometía más que un anuncio de colonia', 'Entre el quiero y el no puedo', 'Una temporada de ir tirando con muletas', 'Mucho calentamiento y poco partido', 'Más dudas que certezas en el banquillo', 'Toca hacer autocrítica y mucha pizarra', 'Temporada de «el año que viene, sí»', 'Hay que pasar por el taller de chapa y pintura'],
    3: ['Objetivo cumplido sin despeinarse', 'Temporada de notable bajo, la directiva respira', 'Cumpliste, que en el fútbol ya es mucho', 'Ni para tirar cohetes ni para esconderse', 'Sólido como un central de los de antes', 'Trabajo de obrero bien hecho', 'Sin fuegos artificiales, pero con la luz encendida', 'El míster se ha ganado la renovación', 'Temporada de pan con tomate: sencilla y rica', 'Ordenados, serios y cumplidores', 'La afición sale del estadio silbando una canción alegre', 'Se cumplió el guion sin sobresaltos'],
    4: ['Temporada de sobresaliente, la ciudad está en la calle', 'El equipo jugó de memoria y con el pañuelo de seda', '¡Qué manera de disfrutar! Temporada de matrícula', 'La directiva ya prepara una estatua… pequeñita', 'Partidazos a pares y la grada cantando tu nombre', 'Hoy tu pizarra cotiza en bolsa', 'Has convertido el estadio en un fortín', 'La prensa te llama «el nuevo gurú de los banquillos»', 'Temporada para guardar en DVD y en la memoria', 'Juego bonito y resultados: el combo perfecto', 'Hasta los rivales aplaudieron tu fútbol', 'El club vive un sueño del que nadie quiere despertar'],
    5: ['¡LEYENDA! Esta temporada se estudiará en las escuelas de entrenadores', 'Temporada histórica: bautizan una calle con tu nombre', 'Galáctico, mítico, irrepetible', '¡Pentakill futbolero! No se recuerda nada igual', 'La vitrina necesita una ampliación urgente', 'Ni en la Play se gana tanto', 'Tu nombre ya brilla junto a los más grandes del banquillo', 'Temporada de cine: Oscar al mejor míster', 'El fútbol se rinde a tus pies', 'Ahora mismo eres trending topic mundial', 'Desfile en autobús descapotable asegurado', 'Que alguien llame al museo del club: hay que hacer sitio'],
  };

  // ---------- nueva temporada
  LG.newSeason = function (st) {
    if (!st.seasonOver) return;
    const R = LG.rng(st); const w = st.world;
    st.div = st.pendingDivs; delete st.pendingDivs;
    [1, 2, 3, 4, 5].forEach((d) => (st.div[d] || []).forEach((id) => { if (w.teams[id]) w.teams[id].div = d; }));
    // evolución de jugadores
    Object.values(w.players).forEach((p) => {
      if (p.fx) { p.st = { pj: 0, g: 0, a: 0, ta: 0, tr: 0, rat: 0, ps: 0 }; return; }   // plantillas extranjeras de referencia: no cambian
      p.age++;
      const avg = p.st.ps ? p.st.rat / p.st.ps : 6.2;
      let d = p.age <= 21 ? R.int(1, 4) : p.age <= 24 ? R.int(0, 3) : p.age <= 29 ? R.int(-1, 1) : p.age <= 32 ? R.int(-2, 0) : R.int(-4, -1);
      if (avg >= 7.1 && p.st.ps >= 10) d += 1;
      if (p.st.pj < 5 && p.age < 24) d -= 1;
      if (LG.isManaged(st, p.team) && p.age <= 23 && R() < 0.1 * LG.stf(st, 'cantera', p.team)) d += 1;   // el entrenador de cantera ayuda a los jóvenes
      let nv = p.ovr + d; if (d > 0) nv = Math.min(nv, Math.max(p.pot, p.ovr));
      d = nv - p.ovr; p.ovr = U.clamp(nv, 40, 95); LG.bumpAttrs(p, d);
      if (p.age >= 30) { p.at.vel = U.clamp(p.at.vel - R.int(0, 2), 10, 99); p.at.res = U.clamp(p.at.res - R.int(0, 2), 10, 99); }
      p.value = DB.playerValue(p); p.wage = DB.playerWage(p);
      p.st = { pj: 0, g: 0, a: 0, ta: 0, tr: 0, rat: 0, ps: 0 }; p.fit = 100; p.inj = 0; p.sus = 0; p.yel = 0; p.mor = 70;
    });
    // retiradas y reposición con canteranos generados
    Object.values(w.players).forEach((p) => {
      if (p.fx) return;
      if (p.retiring || p.age >= 42) {   // edad máxima de retirada: 42 años
        if (LG.isManaged(st, p.team)) LG.news(st, p.name + ' se retira del fútbol profesional. ¡Gracias por todo!', 'info');
        delete w.players[p.id];
      }
    });
    DB.touch(w);
    Object.values(w.teams).forEach((t) => {
      if (t.div >= 4 || t.foreign) return;   // clubes de otras ligas: plantillas de referencia
      const sq = DB.teamPlayers(w, t.id);
      const need = Math.max(0, 22 - sq.length);
      const roles = ['POR', 'DFC', 'MC', 'DC', 'LD', 'LI', 'ED', 'EI', 'MCD', 'MCO', 'DFC', 'MC'];
      const gks = sq.filter((p) => p.role === 'POR').length;
      for (let i = 0; i < need || (i === 0 && gks < 2); i++) {
        const role = gks + i < 2 && i < 2 ? 'POR' : roles[(i + 1) % roles.length];
        LG.genPlayer(st, t.id, role, U.clamp(t.base - 10 + R.int(-3, 4), 50, 80), R.int(18, 20), R);
        if (LG.isManaged(st, t.id)) LG.news(st, 'Un nuevo canterano se incorpora a la plantilla del ' + t.short + '.', 'youth');
        else { st.squadChg = st.squadChg || {}; const c = st.squadChg[t.id] = st.squadChg[t.id] || { in: 0, out: 0 }; c.in++; }
      }
      // presupuesto de los equipos de la IA
      if (!LG.isManaged(st, t.id)) {
        const base = (G.MF_TEAMS.find((x) => x.id === t.id) || {}).budget || 5;
        t.budget = Math.round(base * (t.div === 1 ? 1 : 0.5) * (0.8 + R() * 0.5) * 10) / 10;
      }
      t.base = Math.round(DB.teamStrength(w, t.id));
      t.formation = DB.bestFormation(w, t.id);
      t.mor = 70;
    });
    st.season++; st.day = 0; st.seasonOver = false; st.playoff = null; st.pendingRes = null; st.turnDone = null;
    st.comp[1] = LG.makeComp(1, st.div[1], R); st.comp[2] = LG.makeComp(2, st.div[2], R);
    LG.forEachMgr(st, () => {
      st.youthUsed = false; st.offers = []; st.offerLog = {};
      st.lineup = DB.autoLineup(w, st.userTeam, st.lineup ? st.lineup.formation : w.teams[st.userTeam].formation);
      LG.setObjective(st);
    });
    st.cup = LG.setupCup(st, R);
    if (MF.EU) MF.EU.setup(st, false);
    st.supes = LG.setupSupes(st, false);
    LG.forEachMgr(st, () => { if (!st.staff) LG.initStaff(st, R); LG.staffMarket(st, R); });
    // fichajes del verano: cierran el periodo de «3 cambios como mucho» de los equipos de la IA
    LG.aiTransfers(st, R, 14);
    st.squadChg = {};
    LG.forEachMgr(st, () => LG.news(st, 'Arranca la temporada ' + DB.SEASON_LABEL(st.season) + '. Objetivo de la directiva del ' + LG.team(st, st.userTeam).short + ': ' + st.board.objective.text + '.', 'board'));
    LG.flushBackground(st);
  };

  // Aceptar oferta de otro club tras un despido
  LG.JOB_TOP = 6;   // los 6 primeros clasificados nunca hacen ofertas a un mánager destituido (partida de 2 jugadores)
  LG.jobOffers = function (st) {
    const R = U.rng(U.hash(st.season + 'jobs' + st.userTeam));
    const t = LG.team(st, st.userTeam);
    const D = st.seasonOver && st.pendingDivs ? st.pendingDivs : st.div;
    // partida de dos jugadores: ofertas de clubes de la liga del otro jugador, nunca de los mejor clasificados
    if (LG.isMulti(st)) {
      const j = st.mgrs.findIndex((m, i) => i !== st.cur && !(m.fired && m.outOfLeague));
      const other = j >= 0 ? LG.mgrTeam(st, j) : null;
      const dv = other ? [1, 2].find((d) => D[d].indexOf(other) >= 0) : null;
      if (dv) {
        const played = st.seasonOver || st.day > 0;
        const byStr = D[dv].slice().sort((a, b) => DB.teamStrength(st.world, b) - DB.teamStrength(st.world, a));
        const rank = (id) => (played && LG.position(st, id) ? LG.position(st, id) : byStr.indexOf(id) + 1);
        let mp = D[dv].filter((id) => !LG.isManaged(st, id) && id !== st.userTeam && !LG.team(st, id).parent && rank(id) > LG.JOB_TOP);
        if (mp.length >= 3) { R.shuffle(mp); return mp.slice(0, 3); }
      }
    }
    let pool = D[1].concat(D[2]).filter((id) => !LG.isManaged(st, id) && DB.teamStrength(st.world, id) < DB.teamStrength(st.world, st.userTeam) + 1);
    if (pool.length < 3) pool = D[2].filter((id) => !LG.isManaged(st, id));
    R.shuffle(pool);
    return pool.slice(0, 3);
  };
  LG.changeTeam = function (st, tid) {
    st.userTeam = tid; st.fired = false; st.lineup = DB.autoLineup(st.world, tid, st.world.teams[tid].formation);
    LG.initStaff(st, LG.rng(st));   // el personal pertenece al club
    st.board = null; st.outOfLeague = false; if (!st.seasonOver) LG.setObjective(st); else st.board = { objective: { maxPos: 20, text: '' }, conf: 55, rank: 10 };
    st.ach = st.ach || { cs: 0, unb: 0, ws: 0, seasons: 0, clubs: [] };
    if (st.ach.clubs.indexOf(tid) < 0) st.ach.clubs.push(tid);
    st.ach.cs = st.ach.unb = st.ach.ws = 0;
    if (st.ach.clubs.length >= 3) ACH('trotamundos', st);
    LG.news(st, 'Firmas como nuevo entrenador del ' + st.world.teams[tid].name + '.', 'board');
  };

  // ---------- estadísticas
  LG.scorers = function (st, divN, n) {
    return Object.values(st.world.players).filter((p) => st.world.teams[p.team] && st.world.teams[p.team].div === divN && p.st.g > 0).sort((a, b) => b.st.g - a.st.g || a.st.pj - b.st.pj).slice(0, n || 15);
  };
  LG.keepers = function (st, divN, n) {
    return Object.values(st.world.players).filter((p) => p.line === 'POR' && st.world.teams[p.team] && st.world.teams[p.team].div === divN && (p.st.pjp || 0) >= Math.max(1, Math.floor(st.day * 0.5)))
      .sort((a, b) => (a.st.gc / a.st.pjp) - (b.st.gc / b.st.pjp)).slice(0, n || 10);
  };

  // ---------- guardado
  LG.SAVE_KEY = 'mf27_career_';
  // Las plantillas extranjeras de referencia (p.fx) no se guardan: se regeneran al cargar
  LG.save = function (st, slot) {
    st.saved = Date.now();
    if (LG.isMulti(st)) LG.MGR_FIELDS.forEach((k) => { st.mgrs[st.cur][k] = st[k]; });
    const players = {}; Object.values(st.world.players).forEach((p) => { if (!p.fx) players[p.id] = p; });
    const fxTeams = {}; Object.values(st.world.teams).forEach((t) => { if (t.foreign) fxTeams[t.id] = 1; });
    const teams = {}; Object.values(st.world.teams).forEach((t) => { if (!t.foreign) teams[t.id] = t; });
    const out = Object.assign({}, st, { world: Object.assign({}, st.world, { players, teams }), fxTeamsSaved: Object.keys(fxTeams).length });
    delete out._tac;
    return U.store.set(LG.SAVE_KEY + (slot || 1), out);
  };
  LG.load = function (slot) { return LG.migrate(U.store.get(LG.SAVE_KEY + (slot || 1), null)); };
  // partidas guardadas con versiones anteriores
  LG.migrate = function (st) {
    if (!st || !st.world) return st;
    // versiones anteriores: grupos «otras ligas» (div 4) → se sustituyen por los clubes reales
    Object.values(st.world.teams).filter((t) => t.div === 4 && /^x(eng|ita|ger|fra|por|ksa|usa|tur)$/.test(t.id)).forEach((t) => {
      Object.values(st.world.players).forEach((p) => { if (p.team === t.id) delete st.world.players[p.id]; });
      delete st.world.teams[t.id];
    });
    DB.addForeign(st.world, st.fxOut);
    st.div[4] = [];
    st.div[5] = Object.values(st.world.teams).filter((t) => t.foreign).map((t) => t.id);
    st.trophies = st.trophies || [];
    st.ach = st.ach || { cs: 0, unb: 0, ws: 0, seasons: st.history ? st.history.length : 0, clubs: [st.userTeam] };
    if (st.cup === undefined) {
      if (!st.seasonOver && st.day <= LG.CUP_DAYS[0]) st.cup = LG.setupCup(st, LG.rng(st));
      else st.cup = null;   // la Copa empezará con la próxima temporada
    }
    if (st.board && st.board.warn === undefined) st.board.warn = 0;
    if (!st.staff) { const R = LG.rng(st); LG.initStaff(st, R); LG.staffMarket(st, R); }
    if (st.euro && MF.EU) MF.EU.repair(st);
    if (st.supes === undefined) st.supes = st.season === 2026 && !st.seasonOver && st.day < LG.SUPES_DAY ? LG.setupSupes(st, true) : null;
    Object.values(st.world.players).forEach((p) => { if (!p.alt) p.alt = DB.altRoles(p.name, p.role); });
    if (st.euro === undefined && MF.EU) {
      st.euro = null;
      if (!st.seasonOver) { MF.EU.setup(st, st.season === 2026); LG.flushBackground(st, true); }   // las fechas ya pasadas se simulan
    }
    st.v = 3;
    return st;
  };
  LG.slotInfo = function (slot) {
    const s = LG.load(slot); if (!s) return null;
    const t = s.world.teams[s.userTeam];
    const multi = LG.isMulti(s) ? s.mgrs.map((m, i) => (i === s.cur ? s.userName : m.userName) + ' (' + s.world.teams[i === s.cur ? s.userTeam : m.userTeam].short + ')').join(' vs ') : null;
    return { team: t.name, id: t.id, season: DB.SEASON_LABEL(s.season), day: s.day, div: t.div, saved: s.saved, multi };
  };

  MF.LG = LG;
})(typeof window !== 'undefined' ? window : globalThis);
