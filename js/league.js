/* MÍSTER FÚTBOL 26·27 — Liga Manager: calendario, clasificación, ascensos/descensos, playoff,
   finanzas, mercado de fichajes, directiva y temporadas sucesivas. Sin dependencias del DOM. */
(function (G) {
  'use strict';
  const MF = G.MF; const U = MF.U; const DB = MF.DB; const SIM = MF.SIM;
  const LG = {};

  LG.ROUNDS = { 1: 38, 2: 42 };
  LG.PLAYOFF_DAYS = [42, 43, 44, 45];
  LG.LAST_DAY = 45;
  LG.WINDOW_DAYS = [0, 19, 20];

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
    const div = { 1: [], 2: [], 3: [] };
    Object.values(world.teams).forEach((t) => div[t.div].push(t.id));
    const st = {
      v: 1, seed, rngState: seed ^ 0x9e3779b9, season: 2026, userTeam: opts.team, userName: opts.name || 'Míster',
      difficulty: opts.difficulty || 1, world, div, comp: {}, day: 0, playoff: null,
      lineup: null, tactics: null, training: 'equilibrado', board: null, news: [], history: [], finance: { log: [] },
      offers: [], youthUsed: false, fired: false, seasonOver: false, created: Date.now(), lastUser: null, mvpLog: [],
    };
    st.comp[1] = LG.makeComp(1, div[1], R);
    st.comp[2] = LG.makeComp(2, div[2], R);
    const t = world.teams[st.userTeam];
    st.tactics = { style: 'equilibrada', press: 'media', passing: 'mixto' };
    st.lineup = DB.autoLineup(world, st.userTeam, t.formation);
    LG.setObjective(st);
    st.finance.start = t.budget;
    LG.news(st, '¡Bienvenido, ' + st.userName + '! La directiva del ' + t.name + ' te presenta como nuevo entrenador. Objetivo: ' + st.board.objective.text + '.', 'board');
    LG.news(st, 'El mercado de fichajes está abierto hasta el inicio de la Liga.', 'market');
    return st;
  };

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
  LG.setObjective = function (st) {
    const t = LG.team(st, st.userTeam);
    const ids = st.div[t.div].slice().sort((a, b) => DB.teamStrength(st.world, b) - DB.teamStrength(st.world, a));
    const rank = ids.indexOf(t.id) + 1;
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
    st.board = { objective: obj, conf: st.board ? U.clamp(st.board.conf + 10, 40, 85) : 65, rank };
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

  LG.dayFixtures = function (st) {
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
  LG.lineupFor = (st, tid) => (tid === st.userTeam ? LG.userLineup(st) : LG.aiLineup(st, tid));
  LG.tacticsFor = (st, tid) => (tid === st.userTeam ? st.tactics : LG.team(st, tid));

  LG.simFixture = function (st, f, R) {
    return SIM.play(st.world, { home: f.h, away: f.a, lhome: LG.lineupFor(st, f.h), laway: LG.lineupFor(st, f.a), rng: R, neutral: false });
  };

  // Juega la jornada completa. userRes: resultado del partido del usuario (si lo ha jugado/visto)
  LG.playDay = function (st, userRes) {
    if (st.seasonOver) return null;
    const R = LG.rng(st);
    const fx = LG.dayFixtures(st);
    const played = new Set(); const summary = [];
    fx.forEach((f) => {
      const isUser = f.h === st.userTeam || f.a === st.userTeam;
      const lh = LG.lineupFor(st, f.h), la = LG.lineupFor(st, f.a);
      const res = isUser && userRes ? userRes : SIM.play(st.world, { home: f.h, away: f.a, lhome: lh, laway: la, rng: R, neutral: false });
      LG.applyResult(st, f, res, [lh, la]);
      played.add(f.h); played.add(f.a);
      summary.push({ f, res });
      if (isUser) st.lastUser = { f, score: res.score.slice(), events: res.events.filter((e) => e.type === 'goal' || e.type === 'red'), stats: res.stats, ratings: res.ratings };
    });
    // recuperación, lesiones y sanciones
    Object.values(st.world.players).forEach((p) => {
      const t = st.world.teams[p.team]; if (!t || t.div > 2) { p.fit = 100; return; }
      const user = p.team === st.userTeam;
      let rec = 15;
      if (user) rec = { equilibrado: 15, fisico: 19, tecnico: 13, tactico: 14, descanso: 24 }[st.training] || 15;
      p.fit = Math.min(100, p.fit + rec);
      if (played.has(p.team)) {
        if (p.inj > 0) p.inj--;
        if (p.sus > 0 && !p._justSus) p.sus--;
      }
      p._justSus = false;
    });
    if (st.training === 'tecnico') LG.trainTechnical(st, R);
    if (st.training === 'tactico') st.tacticBonus = 1; else st.tacticBonus = 0;
    LG.finances(st, fx);
    // mercado (ventana abierta)
    if (LG.WINDOW_DAYS.indexOf(st.day) >= 0) { LG.aiTransfers(st, R, st.day === 0 ? 10 : 4); LG.incomingOffers(st, R); }
    st.offers = st.offers.filter((o) => o.day >= st.day - 1);
    st.day++;
    // fin de liga regular de Segunda → playoff
    if (st.day === 42 && !st.playoff) LG.setupPlayoff(st);
    if (st.day === 44 && st.playoff && !st.playoff.final) LG.setupFinal(st);
    if (st.day > LG.LAST_DAY || (st.day >= 42 && !LG.dayFixtures(st).length && st.playoff && st.playoff.winner)) LG.endSeason(st);
    st.window = LG.WINDOW_DAYS.indexOf(st.day) >= 0;
    if (!st.seasonOver && st.day >= 12 && st.board.conf <= 4) { st.fired = true; LG.news(st, 'La directiva ha decidido prescindir de tus servicios.', 'board'); }
    return summary;
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
      p.mor = U.clamp(p.mor + (gf > ga ? 5 : gf < ga ? -4 : 1), 30, 99);
    }));
    res.events.forEach((e) => {
      const p = w.players[e.pid]; if (!p) return;
      if (e.type === 'goal' && !e.own) { p.st.g++; if (e.assist && w.players[e.assist]) w.players[e.assist].st.a++; }
      if (e.type === 'yellow') { p.st.ta++; p.yel++; if (p.yel >= 5) { p.yel = 0; p.sus = Math.max(p.sus, 1); p._justSus = true; if (p.team === st.userTeam) LG.news(st, p.name + ' cumple ciclo de amarillas: 1 partido de sanción.', 'sus'); } }
      if (e.type === 'red') { p.st.tr++; p.sus = Math.max(p.sus, e.second ? 1 : 2); p._justSus = true; if (p.team === st.userTeam) LG.news(st, p.name + ' es expulsado y será baja ' + p.sus + ' partido(s).', 'sus'); }
      if (e.type === 'injury') { p.inj = Math.max(p.inj, e.weeks); p.fit = Math.min(p.fit, 60); if (p.team === st.userTeam) LG.news(st, 'Lesión: ' + p.name + ' estará ' + e.weeks + ' jornada(s) de baja.', 'injury'); }
    });
    // moral de equipo y confianza de la directiva
    [f.h, f.a].forEach((tid, s) => {
      const t = w.teams[tid]; const gf = res.score[s], ga = res.score[1 - s];
      t.mor = U.clamp((t.mor || 70) + (gf > ga ? 4 : gf < ga ? -4 : 0), 30, 99);
      if (tid === st.userTeam && f.comp !== 'playoff') {
        const myS = DB.teamStrength(w, tid), opS = DB.teamStrength(w, s === 0 ? f.a : f.h);
        const exp = U.clamp(1.35 + (myS - opS) * 0.09 + (s === 0 ? 0.2 : -0.1), 0.4, 2.3);
        const pts = gf > ga ? 3 : gf === ga ? 1 : 0;
        st.board.conf = U.clamp(st.board.conf + (pts - exp) * 1.9 + (58 - st.board.conf) * 0.03, 0, 100);
      }
    });
  };

  LG.trainTechnical = function (st, R) {
    DB.teamPlayers(st.world, st.userTeam).forEach((p) => {
      if (p.age <= 23 && p.ovr < p.pot && R() < 0.06) { p.ovr++; LG.bumpAttrs(p, 1); p.value = DB.playerValue(p); p.wage = DB.playerWage(p); }
    });
  };
  LG.bumpAttrs = function (p, d) { Object.keys(p.at).forEach((k) => { p.at[k] = U.clamp(p.at[k] + d, 10, 99); }); };

  // ---------- finanzas
  LG.ticketIncome = function (st, t, oppId) {
    const pos = LG.position(st, t.id) || 10; const n = st.comp[t.div].teams.length;
    const base = t.div === 1 ? 45 : 22;
    let fill = 0.62 + (t.mor - 70) * 0.004 + (1 - pos / n) * 0.18 - (t.ticket - base) * 0.007;
    if (oppId && ['rma', 'fcb', 'atm'].indexOf(oppId) >= 0) fill += 0.12;
    fill = U.clamp(fill, 0.2, 1);
    const att = Math.round(t.cap * fill);
    return { att, money: att * t.ticket / 1e6 };
  };
  LG.tvIncome = (t) => (t.div === 1 ? Math.max(0.55, 0.6 + (t.base - 70) * 0.085) : 0.2);
  LG.wageBill = (st, tid) => U.sum(DB.teamPlayers(st.world, tid), (p) => p.wage);

  LG.finances = function (st, fx) {
    const uid = st.userTeam; const t = LG.team(st, uid);
    const f = fx.find((x) => x.h === uid || x.a === uid);
    let inc = 0, exp = 0; const items = [];
    if (f && f.h === uid) { const ti = LG.ticketIncome(st, t, f.a); inc += ti.money; items.push(['Taquilla (' + ti.att.toLocaleString('es-ES') + ' espectadores)', ti.money]); st.lastAttendance = ti.att; }
    if (f) { const tv = LG.tvIncome(t); inc += tv; items.push(['Derechos de TV', tv]); }
    const sponsor = (t.div === 1 ? 0.08 : 0.02) + t.base / 2500; inc += sponsor; items.push(['Patrocinio', sponsor]);
    const wages = LG.wageBill(st, uid) / 42; exp += wages; items.push(['Salarios', -wages]);
    t.budget = Math.round((t.budget + inc - exp) * 100) / 100;
    st.finance.log.unshift({ s: st.season, d: st.day, inc, exp, items, bal: t.budget });
    if (st.finance.log.length > 50) st.finance.log.length = 50;
    if (t.budget < -5 && st.day % 4 === 0) { st.board.conf = Math.max(0, st.board.conf - 4); LG.news(st, 'La directiva está preocupada por las cuentas: el club está en números rojos.', 'board'); }
  };

  // ---------- mercado
  LG.isWindow = (st) => LG.WINDOW_DAYS.indexOf(st.day) >= 0 && !st.seasonOver;

  LG.askingPrice = function (st, p) {
    const mates = DB.teamPlayers(st.world, p.team).sort((a, b) => b.ovr - a.ovr);
    const rank = mates.indexOf(p);
    const f = rank < 3 ? 1.45 : rank < 11 ? 1.2 : 1.0;
    return Math.round(p.value * f * 10) / 10;
  };

  LG.makeOffer = function (st, pid, amount) {
    const w = st.world; const p = w.players[pid]; const me = LG.team(st, st.userTeam);
    if (!LG.isWindow(st)) return { ok: false, msg: 'El mercado está cerrado. Abre en pretemporada y entre las jornadas 19 y 21.' };
    if (!p || p.team === st.userTeam) return { ok: false, msg: 'Jugador no disponible.' };
    if (amount > me.budget) return { ok: false, msg: 'No tienes presupuesto suficiente (' + U.money(me.budget) + ').' };
    if (DB.teamPlayers(w, st.userTeam).length >= 30) return { ok: false, msg: 'Tu plantilla ya tiene 30 jugadores. Vende antes de fichar.' };
    const seller = LG.team(st, p.team);
    if (DB.teamPlayers(w, p.team).length <= 18) return { ok: false, msg: 'El ' + seller.short + ' no quiere desprenderse de más jugadores.' };
    if (st.offerLog && st.offerLog[pid] === st.day) return { ok: false, msg: 'El ' + seller.short + ' ya ha rechazado una oferta tuya esta jornada.' };
    // voluntad del jugador
    const myStr = DB.teamStrength(w, st.userTeam), hisStr = DB.teamStrength(w, p.team);
    if (me.div > seller.div && p.ovr >= 74 && amount < LG.askingPrice(st, p) * 1.6) return { ok: false, msg: p.name + ' no quiere bajar a Segunda División.' };
    if (p.ovr > myStr + 9 && hisStr > myStr + 4) return { ok: false, msg: p.name + ' prefiere seguir en un club más ambicioso.' };
    const ask = LG.askingPrice(st, p);
    st.offerLog = st.offerLog || {};
    if (amount >= ask) { LG.transfer(st, p, st.userTeam, amount); return { ok: true, msg: '¡Fichaje cerrado! ' + p.name + ' llega por ' + U.money(amount) + '.' }; }
    if (amount >= ask * 0.85) return { ok: false, counter: ask, msg: 'El ' + seller.short + ' pide ' + U.money(ask) + '. ¿Aceptas su contraoferta?' };
    st.offerLog[pid] = st.day;
    return { ok: false, msg: 'Oferta rechazada. El ' + seller.short + ' la considera insuficiente.' };
  };

  LG.transfer = function (st, p, toId, fee) {
    const w = st.world; const from = w.teams[p.team], to = w.teams[toId];
    from.budget = Math.round((from.budget + fee) * 100) / 100; to.budget = Math.round((to.budget - fee) * 100) / 100;
    const oldTeam = p.team;
    p.team = toId; p.yel = 0; p.mor = 75;
    const used = new Set(DB.teamPlayers(w, toId).filter((q) => q !== p).map((q) => q.num));
    if (used.has(p.num)) { let n = p.num; for (let k = 1; k < 99; k++) if (!used.has(k) && k > 12) { n = k; break; } p.num = n; }
    if (oldTeam === st.userTeam || toId === st.userTeam) {
      if (st.lineup) { st.lineup.xi = st.lineup.xi.map((x) => (x === p.id && oldTeam === st.userTeam ? null : x)); st.lineup.bench = (st.lineup.bench || []).filter((x) => x !== p.id); }
      st.finance.log.unshift({ s: st.season, d: st.day, inc: oldTeam === st.userTeam ? fee : 0, exp: toId === st.userTeam ? fee : 0, items: [[(toId === st.userTeam ? 'Fichaje de ' : 'Venta de ') + p.name, toId === st.userTeam ? -fee : fee]], bal: w.teams[st.userTeam].budget });
    }
    if (fee >= 8 || p.ovr >= 78 || oldTeam === st.userTeam || toId === st.userTeam) LG.news(st, 'Mercado: ' + p.name + ' (' + from.short + ') ficha por el ' + to.short + ' por ' + U.money(fee) + '.', 'market');
  };

  LG.aiTransfers = function (st, R, n) {
    const w = st.world;
    const buyers = st.div[1].concat(st.div[2]).filter((id) => id !== st.userTeam);
    for (let k = 0; k < n; k++) {
      const b = w.teams[R.pick(buyers)];
      const mine = DB.teamPlayers(w, b.id);
      if (mine.length >= 27 || b.budget < 1) continue;
      const lines = ['DEF', 'MED', 'DEL'];
      const line = R.pick(lines);
      const weakest = mine.filter((p) => p.line === line).sort((a, c) => a.ovr - c.ovr)[0];
      const thr = weakest ? weakest.ovr + 2 : 60;
      const cands = Object.values(w.players).filter((p) => p.line === line && p.team !== b.id && p.team !== st.userTeam && w.teams[p.team].div <= 3 && p.ovr >= thr && p.ovr <= thr + 8 && p.age <= 31)
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
      const p = R.pick(mine.slice(0, 16)); if (!p) continue;
      const buyers = st.div[1].concat(st.div[2]).filter((id) => id !== st.userTeam && w.teams[id].budget > p.value * 0.9 && DB.teamStrength(w, id) >= p.ovr - 10);
      if (!buyers.length) continue;
      const b = R.pick(buyers); const amount = Math.round(p.value * (0.85 + R() * 0.4) * 10) / 10;
      st.offers.push({ id: 'o' + st.day + '_' + i + '_' + p.id, pid: p.id, from: b, amount, day: st.day });
      LG.news(st, 'Oferta recibida: el ' + w.teams[b].short + ' ofrece ' + U.money(amount) + ' por ' + p.name + '.', 'offer');
    }
  };

  LG.acceptOffer = function (st, oid) {
    const o = st.offers.find((x) => x.id === oid); if (!o) return { ok: false, msg: 'La oferta ha caducado.' };
    const p = st.world.players[o.pid];
    if (!p || p.team !== st.userTeam) return { ok: false, msg: 'El jugador ya no está en tu plantilla.' };
    if (DB.teamPlayers(st.world, st.userTeam).length <= 18) return { ok: false, msg: 'No puedes quedarte con menos de 18 jugadores.' };
    if (st.world.teams[o.from].budget < o.amount) return { ok: false, msg: 'El comprador ya no tiene dinero suficiente.' };
    LG.transfer(st, p, o.from, o.amount);
    st.offers = st.offers.filter((x) => x.pid !== o.pid);
    return { ok: true, msg: p.name + ' vendido al ' + st.world.teams[o.from].short + ' por ' + U.money(o.amount) + '.' };
  };

  LG.listForSale = function (st, pid) {
    const w = st.world; const p = w.players[pid]; const R = LG.rng(st);
    if (!LG.isWindow(st)) return { ok: false, msg: 'El mercado está cerrado.' };
    const buyers = st.div[1].concat(st.div[2], st.div[3]).filter((id) => id !== st.userTeam && w.teams[id].budget > p.value * 0.6 && DB.teamStrength(w, id) >= p.ovr - 12 && DB.teamPlayers(w, id).length < 28);
    if (!buyers.length) return { ok: false, msg: 'Ningún club está interesado en ' + p.name + ' ahora mismo.' };
    R.shuffle(buyers);
    const n = Math.min(buyers.length, R.int(1, 3));
    for (let i = 0; i < n; i++) {
      const amount = Math.round(p.value * (0.7 + R() * 0.45) * 10) / 10;
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
    w.players[p.id] = p;
    return p;
  };
  LG.youthProspects = function (st) {
    const R = U.rng(U.hash(st.userTeam + st.season + 'cantera'));
    const t = LG.team(st, st.userTeam);
    const roles = ['POR', 'DFC', 'LD', 'LI', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC'];
    const out = [];
    for (let i = 0; i < 3; i++) {
      const role = R.pick(roles); const ovr = U.clamp(Math.round(t.base - 18 + R.int(-3, 6)), 48, 72);
      out.push({ role, ovr, age: R.int(17, 18), name: R.pick(NOM) + ' ' + R.pick(APE), pot: U.clamp(ovr + R.int(8, 22), ovr, 92), tone: R.int(1, 4), hair: R.int(0, 4) });
    }
    return out;
  };
  LG.signYouth = function (st, idx) {
    if (st.youthUsed) return { ok: false, msg: 'Ya has subido un canterano esta temporada.' };
    if (DB.teamPlayers(st.world, st.userTeam).length >= 30) return { ok: false, msg: 'La plantilla está completa (30 jugadores).' };
    const y = LG.youthProspects(st)[idx]; const R = U.rng(U.hash(y.name));
    const p = LG.genPlayer(st, st.userTeam, y.role, y.ovr, y.age, R);
    p.name = y.name; p.short = U.surname(y.name); p.pot = y.pot; p.tone = y.tone; p.hair = y.hair;
    st.youthUsed = true;
    LG.news(st, 'El canterano ' + p.name + ' (' + y.role + ', ' + y.age + ' años) sube al primer equipo.', 'youth');
    return { ok: true, msg: p.name + ' ya entrena con el primer equipo.' };
  };

  // ---------- playoff de ascenso (3º-6º de Segunda)
  LG.promotionEligible = function (st, tid, nextPrimera) {
    const t = LG.team(st, tid); if (!t.parent) return true;
    return nextPrimera.indexOf(t.parent) < 0;
  };
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
    const uT = LG.team(st, st.userTeam);
    const uPos = uT.div <= 2 ? LG.table(st, uT.div).find((r) => r.id === uT.id).pos : null;
    const prize = (div, pos) => (div === 1 ? Math.max(2, 22 - pos) : Math.max(0.5, (23 - pos) * 0.25));
    [1, 2].forEach((dv) => LG.table(st, dv).forEach((r) => { const t = LG.team(st, r.id); t.budget = Math.round((t.budget + prize(dv, r.pos)) * 100) / 100; }));
    if (up.indexOf(st.userTeam) >= 0) { uT.budget += 10; }
    // objetivo
    const obj = st.board.objective; let met = uPos !== null && uPos <= obj.maxPos;
    if (uT.div === 2 && up.indexOf(st.userTeam) >= 0) met = true;
    const near = uPos !== null && uPos <= obj.maxPos + 2;
    st.board.conf = U.clamp(st.board.conf + (met ? 22 : near ? -10 : -28), 0, 100);
    // estadísticas de la temporada
    const all = Object.values(st.world.players);
    const top = (f, n) => all.filter((p) => st.world.teams[p.team] && st.world.teams[p.team].div <= 2).sort((a, b) => f(b) - f(a)).slice(0, n || 1);
    const pich1 = all.filter((p) => LG.team(st, p.team).div === 1).sort((a, b) => b.st.g - a.st.g)[0];
    const pich2 = all.filter((p) => LG.team(st, p.team).div === 2).sort((a, b) => b.st.g - a.st.g)[0];
    st.history.unshift({
      season: st.season, champ1, champ2, relegated: relegated1.slice(), promoted: up.slice(), playoff: P.winner || null, down2: down2.slice(), up3: upPool.slice(),
      user: { team: st.userTeam, div: uT.div, pos: uPos, met, objective: obj.text },
      pich1: pich1 ? [pich1.name, pich1.team, pich1.st.g] : null, pich2: pich2 ? [pich2.name, pich2.team, pich2.st.g] : null,
      mvp: top((p) => (p.st.ps >= 15 ? p.st.rat / p.st.ps : 0))[0] ? (function () { const p = top((q) => (q.st.ps >= 15 ? q.st.rat / q.st.ps : 0))[0]; return [p.name, p.team]; })() : null,
    });
    st.pendingDivs = {
      1: st.div[1].filter((id) => relegated1.indexOf(id) < 0).concat(up),
      2: st.div[2].filter((id) => up.indexOf(id) < 0 && down2.indexOf(id) < 0).concat(relegated1, upPool),
      3: st.div[3].filter((id) => upPool.indexOf(id) < 0).concat(down2),
    };
    st.seasonOver = true;
    LG.news(st, 'Fin de la temporada ' + DB.SEASON_LABEL(st.season) + '. Campeón de Liga: ' + LG.team(st, champ1).name + '.', 'league');
    if (st.board.conf < 20) st.fired = true;
    if (st.pendingDivs[3].indexOf(st.userTeam) >= 0) { st.fired = true; st.outOfLeague = true; LG.news(st, 'El ' + uT.name + ' desciende a Primera RFEF, categoría que no se juega en esta versión. Elige un nuevo club.', 'board'); }
  };

  // ---------- nueva temporada
  LG.newSeason = function (st) {
    if (!st.seasonOver) return;
    const R = LG.rng(st); const w = st.world;
    st.div = st.pendingDivs; delete st.pendingDivs;
    [1, 2, 3].forEach((d) => st.div[d].forEach((id) => { w.teams[id].div = d; }));
    // evolución de jugadores
    Object.values(w.players).forEach((p) => {
      p.age++;
      const avg = p.st.ps ? p.st.rat / p.st.ps : 6.2;
      let d = p.age <= 21 ? R.int(1, 4) : p.age <= 24 ? R.int(0, 3) : p.age <= 29 ? R.int(-1, 1) : p.age <= 32 ? R.int(-2, 0) : R.int(-4, -1);
      if (avg >= 7.1 && p.st.ps >= 10) d += 1;
      if (p.st.pj < 5 && p.age < 24) d -= 1;
      let nv = p.ovr + d; if (d > 0) nv = Math.min(nv, Math.max(p.pot, p.ovr));
      d = nv - p.ovr; p.ovr = U.clamp(nv, 40, 95); LG.bumpAttrs(p, d);
      if (p.age >= 30) { p.at.vel = U.clamp(p.at.vel - R.int(0, 2), 10, 99); p.at.res = U.clamp(p.at.res - R.int(0, 2), 10, 99); }
      p.value = DB.playerValue(p); p.wage = DB.playerWage(p);
      p.st = { pj: 0, g: 0, a: 0, ta: 0, tr: 0, rat: 0, ps: 0 }; p.fit = 100; p.inj = 0; p.sus = 0; p.yel = 0; p.mor = 70;
    });
    // retiradas y reposición con canteranos generados
    Object.values(w.players).forEach((p) => {
      if ((p.age >= 38) || (p.age >= 35 && R() < 0.35) || (p.age >= 33 && p.ovr < 62 && R() < 0.4)) {
        if (p.team === st.userTeam) LG.news(st, p.name + ' anuncia su retirada del fútbol profesional.', 'info');
        delete w.players[p.id];
      }
    });
    Object.values(w.teams).forEach((t) => {
      const sq = DB.teamPlayers(w, t.id);
      const need = Math.max(0, 22 - sq.length);
      const roles = ['POR', 'DFC', 'MC', 'DC', 'LD', 'LI', 'ED', 'EI', 'MCD', 'MCO', 'DFC', 'MC'];
      const gks = sq.filter((p) => p.role === 'POR').length;
      for (let i = 0; i < need || (i === 0 && gks < 2); i++) {
        const role = gks + i < 2 && i < 2 ? 'POR' : roles[(i + 1) % roles.length];
        LG.genPlayer(st, t.id, role, U.clamp(t.base - 10 + R.int(-3, 4), 50, 80), R.int(18, 20), R);
        if (t.id === st.userTeam) LG.news(st, 'Un nuevo canterano se incorpora a la plantilla.', 'youth');
      }
      // presupuesto de los equipos de la IA
      if (t.id !== st.userTeam) {
        const base = (G.MF_TEAMS.find((x) => x.id === t.id) || {}).budget || 5;
        t.budget = Math.round(base * (t.div === 1 ? 1 : 0.5) * (0.8 + R() * 0.5) * 10) / 10;
      }
      t.base = Math.round(DB.teamStrength(w, t.id));
      t.formation = DB.bestFormation(w, t.id);
      t.mor = 70;
    });
    st.season++; st.day = 0; st.seasonOver = false; st.playoff = null; st.youthUsed = false; st.offers = []; st.offerLog = {};
    st.comp[1] = LG.makeComp(1, st.div[1], R); st.comp[2] = LG.makeComp(2, st.div[2], R);
    st.lineup = DB.autoLineup(w, st.userTeam, st.lineup ? st.lineup.formation : w.teams[st.userTeam].formation);
    LG.setObjective(st);
    st.window = true;
    LG.aiTransfers(st, R, 14);
    LG.news(st, 'Arranca la temporada ' + DB.SEASON_LABEL(st.season) + '. Objetivo de la directiva: ' + st.board.objective.text + '.', 'board');
  };

  // Aceptar oferta de otro club tras un despido
  LG.jobOffers = function (st) {
    const R = U.rng(U.hash(st.season + 'jobs' + st.userTeam));
    const t = LG.team(st, st.userTeam);
    const D = st.seasonOver && st.pendingDivs ? st.pendingDivs : st.div;
    let pool = D[1].concat(D[2]).filter((id) => id !== st.userTeam && DB.teamStrength(st.world, id) < DB.teamStrength(st.world, st.userTeam) + 1);
    if (pool.length < 3) pool = D[2].filter((id) => id !== st.userTeam);
    R.shuffle(pool);
    return pool.slice(0, 3);
  };
  LG.changeTeam = function (st, tid) {
    st.userTeam = tid; st.fired = false; st.lineup = DB.autoLineup(st.world, tid, st.world.teams[tid].formation);
    st.board = null; st.outOfLeague = false; if (!st.seasonOver) LG.setObjective(st); else st.board = { objective: { maxPos: 20, text: '' }, conf: 55, rank: 10 };
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
  LG.save = function (st, slot) { st.saved = Date.now(); return U.store.set(LG.SAVE_KEY + (slot || 1), st); };
  LG.load = function (slot) { return U.store.get(LG.SAVE_KEY + (slot || 1), null); };
  LG.slotInfo = function (slot) {
    const s = LG.load(slot); if (!s) return null;
    const t = s.world.teams[s.userTeam];
    return { team: t.name, id: t.id, season: DB.SEASON_LABEL(s.season), day: s.day, div: t.div, saved: s.saved };
  };

  MF.LG = LG;
})(typeof window !== 'undefined' ? window : globalThis);
