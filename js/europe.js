/* MÍSTER FÚTBOL 26·27 — competiciones internacionales:
   Champions League, Europa League y Conference League (formato actual: fase de liga de 36 equipos,
   eliminatoria previa 9º-24º, octavos, cuartos y semifinales a doble partido y final a partido único),
   Supercopa de Europa, Copa Intercontinental de la FIFA y Mundial de Clubes (cada cuatro años).
   Los clubes extranjeros no se pueden dirigir: sirven de rivales y de mercado. Sin dependencias del DOM. */
(function (G) {
  'use strict';
  const MF = G.MF; const U = MF.U; const DB = MF.DB; const SIM = MF.SIM; const LG = MF.LG;
  const EU = {};
  const ACH = (id, st) => LG.ach(id, st);

  // Calendario (jornada de Liga ANTES de la cual se juega cada fecha europea)
  EU.CFG = {
    ucl: { name: 'Champions League', short: 'Champions', md: 8, mdDays: [3, 6, 9, 11, 13, 15, 20, 21], order: 3, prize: { part: 7, win: 0.8, draw: 0.3, ko: [1, 1.5, 2, 3, 4], champ: 10 } },
    uel: { name: 'Europa League', short: 'Europa League', md: 8, mdDays: [3, 6, 9, 11, 13, 15, 20, 21], order: 2, prize: { part: 1.7, win: 0.2, draw: 0.07, ko: [0.3, 0.5, 0.8, 1.2, 1.6], champ: 4 } },
    uecl: { name: 'Conference League', short: 'Conference', md: 6, mdDays: [8, 9, 11, 13, 15, 16], order: 1, prize: { part: 1.2, win: 0.12, draw: 0.04, ko: [0.2, 0.3, 0.5, 0.8, 1], champ: 2.5 } },
  };
  EU.KO = [['po', 'Eliminatoria de playoff', [24, 25]], ['r16', 'Octavos de final', [27, 28]], ['qf', 'Cuartos de final', [30, 31]], ['sf', 'Semifinales', [33, 34]], ['f', 'Final', [38]]];
  EU.FINAL_VENUES = { 2026: { ucl: ['Estadio Metropolitano', 'Madrid'], uel: ['Waldstadion', 'Fráncfort'], uecl: ['Beşiktaş Stadium', 'Estambul'] } };
  EU.CODES = ['ucl', 'uel', 'uecl'];
  EU.INTER_DAY = 16;
  EU.cwcYear = (season) => season >= 2029 && (season - 2029) % 4 === 0;

  const T = (st, id) => st.world.teams[id];
  const isSp = (st, id) => { const t = T(st, id); return !!t && !t.foreign; };
  const R_ = (st, k) => U.rng(U.hash(st.season + '_' + k + '_' + st.seed));

  // ---------- montaje de la temporada
  EU.setup = function (st, first) {
    const R = R_(st, 'eu');
    const E = st.euro = st.euro || { history: [], coef: {}, holders: null };
    E.season = st.season;
    let lists;
    if (first && G.MF_WORLD) lists = { ucl: G.MF_WORLD.ucl.slice(), uel: G.MF_WORLD.uel.slice(), uecl: G.MF_WORLD.uecl.slice() };
    else lists = EU.qualify(st, R);
    E.comps = {};
    EU.CODES.forEach((c) => { E.comps[c] = EU.makeComp(st, c, lists[c].filter((id) => T(st, id)), R); });
    // Supercopa de Europa (agosto): campeón de Champions contra campeón de Europa League
    const H = E.holders;
    if (first) E.supercup = { h: 'xpsg', a: 'xavl', hg: 2, ag: 1, played: true, real: true, w: 'xpsg', venue: 'Stadio Friuli (Udine)', season: st.season };
    else if (H && H.ucl && H.uel && H.ucl !== H.uel) E.supercup = { h: H.ucl, a: H.uel, played: false, season: st.season, venue: EU.neutralVenue(st, [H.ucl, H.uel], R) };
    else E.supercup = null;
    // Copa Intercontinental (diciembre): campeón de Champions contra el ganador de la Copa Challenger
    const champ = first ? 'xpsg' : H && H.ucl;
    E.inter = champ && T(st, champ) ? { champ, opp: null, path: [], played: false, season: st.season, venue: first ? 'King Abdullah Sports City (Yeda)' : EU.neutralVenue(st, [champ], R, true) } : null;
    // Mundial de Clubes (verano, cada cuatro años: 2029, 2033…)
    E.cwc = EU.cwcYear(st.season) ? EU.setupCWC(st, R) : null;
    // premio de participación y aviso
    EU.CODES.forEach((c) => E.comps[c].teams.forEach((id) => {
      EU.pay(st, id, EU.CFG[c].prize.part, E.comps[c].name + ': premio de participación');
      if (LG.isManaged(st, id)) LG.news(st, '¡El ' + T(st, id).short + ' jugará la ' + E.comps[c].name + ' esta temporada!', 'cup');
    }));
  };
  EU.neutralVenue = function (st, avoid, R, world) {
    const pool = Object.values(st.world.teams).filter((t) => avoid.indexOf(t.id) < 0 && t.cap >= 40000 && (world || !t.conf || t.conf === 'UEFA'));
    const t = pool[Math.floor(R() * pool.length)] || { stadium: 'Estadio neutral', city: '' };
    return t.stadium + (t.city ? ' (' + t.city + ')' : '');
  };

  // Liga de 36 con el método del círculo: cada equipo juega N rivales distintos, mitad en casa y mitad fuera
  EU.leagueRounds = function (ids, md, R) {
    const n = ids.length; let arr = ids.slice(); const rounds = [];
    const start = R.int(0, Math.max(0, n - 1 - md));   // siempre quedan md jornadas completas
    for (let r = 0; r < n - 1 && rounds.length < md; r++) {
      if (r >= start) {
        const games = [];
        for (let i = 0; i < n / 2; i++) { let h = arr[i], a = arr[n - 1 - i]; if ((r + i) % 2) { const x = h; h = a; a = x; } games.push([h, a]); }
        rounds.push(games);
      }
      arr = [arr[0]].concat([arr[n - 1]], arr.slice(1, n - 1));
    }
    // equilibra casa/fuera: nadie con más de md/2 partidos en casa
    const home = {}; ids.forEach((x) => { home[x] = 0; });
    rounds.forEach((g) => g.forEach((m) => { home[m[0]]++; }));
    rounds.forEach((g) => g.forEach((m) => { if (home[m[0]] > md / 2 && home[m[1]] < md / 2) { home[m[0]]--; home[m[1]]++; const x = m[0]; m[0] = m[1]; m[1] = x; } }));
    return rounds;
  };
  EU.makeComp = function (st, code, teams, R) {
    const cfg = EU.CFG[code]; const ids = teams.slice(); R.shuffle(ids);
    if (ids.length % 2) ids.pop();
    const rounds = EU.leagueRounds(ids, cfg.md, R);
    const fv = (EU.FINAL_VENUES[st.season] || {})[code];
    return {
      code, name: cfg.name, teams: ids, md: rounds, mdDays: cfg.mdDays.slice(), res: {}, mdPlayed: 0, ko: [], koIdx: 0, phase: 'league',
      winner: null, runnerUp: null, goals: {}, venue: fv ? fv[0] + ' (' + fv[1] + ')' : EU.neutralVenue(st, ids.slice(0, 4), R),
    };
  };

  EU.table = function (st, C) {
    const rows = {}; C.teams.forEach((id) => { rows[id] = { id, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 }; });
    Object.values(C.res).forEach((r) => {
      const H = rows[r.h], A = rows[r.a]; if (!H || !A) return;
      H.pj++; A.pj++; H.gf += r.hg; H.gc += r.ag; A.gf += r.ag; A.gc += r.hg;
      if (r.hg > r.ag) { H.g++; A.p++; H.pts += 3; } else if (r.hg < r.ag) { A.g++; H.p++; A.pts += 3; } else { H.e++; A.e++; H.pts++; A.pts++; }
    });
    const out = Object.values(rows).sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf || b.g - a.g || a.id.localeCompare(b.id));
    out.forEach((r, i) => { r.pos = i + 1; });
    return out;
  };

  // ---------- eventos pendientes (los usa LG.nextEvent)
  EU.events = function (st) {
    const E = st.euro; if (!E || E.season !== st.season) return [];
    const out = [];
    if (E.cwc && !E.cwc.done) out.push({ type: 'cwc', day: 0, order: -10 + E.cwc.stage });
    if (E.supercup && !E.supercup.played) out.push({ type: 'supercup', day: 0, order: 0 });
    if (E.inter && !E.inter.played) out.push({ type: 'inter', day: EU.INTER_DAY, order: 4 });
    EU.CODES.forEach((c) => {
      const C = E.comps[c]; if (!C || C.phase === 'done') return;
      if (C.phase === 'league' && C.mdPlayed < C.md.length) out.push({ type: 'euro', code: c, day: C.mdDays[C.mdPlayed], order: EU.CFG[c].order });
      if (C.phase === 'ko') { const K = C.ko[C.koIdx]; if (K) out.push({ type: 'euro', code: c, day: K.days[K.leg], order: EU.CFG[c].order }); }
    });
    return out.filter((e) => st.day >= e.day);
  };

  const lbl = (C, txt) => C.name + ' · ' + txt;
  EU.fixtures = function (st, ev) {
    const E = st.euro;
    if (ev.type === 'supercup') { const S = E.supercup; return [{ h: S.h, a: S.a, key: 'sup', comp: 'supercup', neutral: true, venue: S.venue, label: 'Supercopa de Europa · Final', ko: true }]; }
    if (ev.type === 'inter') { const I = E.inter; EU.interPath(st); return [{ h: I.champ, a: I.opp, key: 'int', comp: 'inter', neutral: true, venue: I.venue, label: 'Copa Intercontinental de la FIFA · Final', ko: true }]; }
    if (ev.type === 'cwc') return EU.cwcFixtures(st);
    const C = E.comps[ev.code];
    if (C.phase === 'league') return C.md[C.mdPlayed].map(([h, a], i) => ({ h, a, key: 'm' + C.mdPlayed + '_' + i, comp: ev.code, label: lbl(C, 'Fase de liga · Jornada ' + (C.mdPlayed + 1)) }));
    const K = C.ko[C.koIdx];
    return K.ties.map((t, i) => {
      if (K.stage === 'f') return { h: t.a, a: t.b, key: 'k' + C.koIdx + '_' + i + '_0', comp: ev.code, neutral: true, venue: C.venue, label: lbl(C, 'Final'), ko: true, final: true };
      // ida en casa del peor clasificado; vuelta en casa del mejor (t.a)
      const first = K.leg === 0; return { h: first ? t.b : t.a, a: first ? t.a : t.b, key: 'k' + C.koIdx + '_' + i + '_' + K.leg, comp: ev.code, label: lbl(C, K.label + (first ? ' (ida)' : ' (vuelta)')), ko: !first, leg: K.leg, tie: t };
    });
  };

  // partido simulado entre dos equipos cualesquiera (con tácticas de la IA y personal)
  EU.sim = function (st, f, R) {
    const L = [LG.lineupFor(st, f.h), LG.lineupFor(st, f.a)];
    return { res: SIM.play(st.world, LG.simOpts(st, f, L, R)), L };
  };
  // efectos de un partido internacional en los equipos españoles (cansancio, lesiones, moral)
  EU.applySpanish = function (st, f, res, L) {
    const w = st.world;
    [0, 1].forEach((s) => {
      const tid = s === 0 ? f.h : f.a; if (!isSp(st, tid)) return;
      const ids = L[s].xi.filter((x) => x !== null).concat(res.subsIn ? res.subsIn[s] : []);
      const gf = res.score[s], ga = res.score[1 - s]; const won = res.winSide !== undefined ? res.winSide === s : gf > ga;
      ids.forEach((id) => {
        const p = w.players[id]; if (!p) return;
        const fat = res.fatigue && res.fatigue[id] !== undefined ? (1 - res.fatigue[id]) * 55 : 18;
        p.fit = Math.max(25, p.fit - fat);
        p.mor = U.clamp(p.mor + (won ? 4 : gf < ga ? -3 : 1), 30, 99);
      });
      const t = w.teams[tid]; t.mor = U.clamp((t.mor || 70) + (won ? 3 : gf < ga ? -3 : 0), 30, 99);
    });
    res.events.forEach((e) => {
      const p = w.players[e.pid]; if (!p || !isSp(st, p.team)) return;
      if (e.type === 'injury') { p.inj = Math.max(p.inj, e.weeks); p.fit = Math.min(p.fit, 60); if (LG.isManaged(st, p.team)) LG.news(st, 'Lesión en Europa: ' + p.name + ' estará ' + e.weeks + ' jornada(s) de baja.', 'injury'); }
    });
    LG.applyCards(st, f, res, (p) => isSp(st, p.team));
    LG.compStats(st, f, res, L, (p) => isSp(st, p.team));
  };
  EU.coef = function (st, tid, pts) { const E = st.euro; const k = String(st.season); E.coef[tid] = E.coef[tid] || {}; E.coef[tid][k] = (E.coef[tid][k] || 0) + pts; };
  EU.pay = function (st, tid, amount, text) {
    if (!amount) return; const t = T(st, tid); if (!t || t.foreign) return;
    if (LG.isMulti(st) && LG.isManaged(st, tid) && tid !== st.userTeam) return LG.own(st, tid, () => EU.pay(st, tid, amount, text));
    t.budget = Math.round((t.budget + amount) * 100) / 100;
    if (tid === st.userTeam) {
      st.finance.log.unshift({ s: st.season, d: st.day, inc: amount, exp: 0, items: [[text, amount]], bal: t.budget });
      if (/superar|campeón|finalista/.test(text)) LG.news(st, text + ': ' + U.money(amount) + '.', 'market');
    }
  };
  // tanda de penaltis / prórroga en partido único o en la vuelta (con el global)
  EU.decide = function (st, f, res, L, R, agg) {
    // agg: goles previos [de f.h, de f.a] en la eliminatoria (ida)
    const base = agg || [0, 0];
    const tot = () => [res.score[0] + base[0], res.score[1] + base[1]];
    if (res.decided) { const t = tot(); res.winSide = t[0] > t[1] ? 0 : t[0] < t[1] ? 1 : (res.pens && res.pens[0] > res.pens[1] ? 0 : 1); return res; }
    if (tot()[0] !== tot()[1]) { res.winSide = tot()[0] > tot()[1] ? 0 : 1; return res; }
    // prórroga y penaltis con la misma lógica que la Copa del Rey
    const fake = { h: f.h, a: f.a };
    const save = res.score.slice();
    res.score = [0, 0];
    LG.cupResolve(st, fake, res, L, R);
    const etG = res.score.slice();
    res.score = [save[0] + etG[0], save[1] + etG[1]];
    const t2 = tot();
    if (t2[0] !== t2[1]) { delete res.pens; res.winSide = t2[0] > t2[1] ? 0 : 1; }
    else if (!res.pens) { res.pens = R() < 0.5 ? [5, 4] : [4, 5]; res.winSide = res.pens[0] > res.pens[1] ? 0 : 1; }
    else res.winSide = res.pens[0] > res.pens[1] ? 0 : 1;
    return res;
  };

  // ---------- jugar un evento
  EU.play = function (st, ev, userRes) {
    const R = LG.rng(st); const fx = EU.fixtures(st, ev); const summary = []; const played = new Set();
    fx.forEach((f) => {
      const L = [LG.lineupFor(st, f.h), LG.lineupFor(st, f.a)];
      let res = LG.takeRes(st, f, userRes) || SIM.play(st.world, LG.simOpts(st, f, L, R));
      res.score = res.score.slice(); res.events = res.events.slice();
      if (f.ko) {
        let agg = null;
        if (f.leg === 1) { const l0 = f.tie.legs[0]; agg = [l0.ag, l0.hg]; }   // en la vuelta los locales eran visitantes en la ida
        EU.decide(st, f, res, L, R, agg);
      }
      EU.applySpanish(st, f, res, L);
      played.add(f.h); played.add(f.a);
      summary.push({ f, res });
      LG.userSides(st, f).forEach((tid) => LG.own(st, tid, () => { st.lastUser = { f, score: res.score.slice(), events: res.events.filter((e) => e.type === 'goal' || e.type === 'red'), stats: res.stats, ratings: res.ratings }; LG.userMatchDone(st, f, res); ACH('debut_europa', st); }));
      EU.record(st, ev, f, res);
    });
    LG.recover(st, played, false); LG.serveSus(st, played, ev.code);
    EU.advance(st, ev, summary, R);
    return summary;
  };

  EU.record = function (st, ev, f, res) {
    const E = st.euro;
    const goals = (C) => res.events.forEach((e) => { if (e.type === 'goal' && !e.own) C.goals[e.pid] = (C.goals[e.pid] || 0) + 1; });
    if (ev.type === 'euro') {
      const C = E.comps[ev.code]; goals(C);
      const P = EU.CFG[ev.code].prize;
      const gf = res.score[0], ga = res.score[1];
      if (C.phase === 'league') {
        C.res[f.key] = { h: f.h, a: f.a, hg: gf, ag: ga, g: res.events.filter((e) => e.type === 'goal').map((e) => [e.side, e.min, e.pid, e.own ? 1 : 0]) };
        [[f.h, gf, ga], [f.a, ga, gf]].forEach(([tid, x, y]) => {
          EU.coef(st, tid, x > y ? 2 : x === y ? 1 : 0);
          EU.pay(st, tid, x > y ? P.win : x === y ? P.draw : 0, C.name + (x > y ? ': premio por victoria' : ': premio por empate'));
        });
      } else {
        const K = C.ko[C.koIdx]; const t = f.tie || K.ties[+f.key.split('_')[1]];
        t.legs[f.leg || 0] = { h: f.h, a: f.a, hg: gf, ag: ga, et: !!res.et, pens: res.pens || null };
        if (f.ko) t.w = res.winSide === 0 ? f.h : f.a;
        [[f.h, gf, ga], [f.a, ga, gf]].forEach(([tid, x, y]) => EU.coef(st, tid, x > y ? 2 : x === y ? 1 : 0));
      }
      return;
    }
    if (ev.type === 'supercup') {
      const S = E.supercup; S.hg = res.score[0]; S.ag = res.score[1]; S.pens = res.pens || null; S.et = !!res.et; S.w = res.winSide === 0 ? f.h : f.a; S.played = true;
      EU.pay(st, S.w, 4, 'Supercopa de Europa: premio al campeón'); EU.pay(st, S.w === f.h ? f.a : f.h, 2.5, 'Supercopa de Europa: finalista');
      EU.title(st, S.w, 'supercopa', 'la Supercopa de Europa');
    }
    if (ev.type === 'inter') {
      const I = E.inter; I.hg = res.score[0]; I.ag = res.score[1]; I.pens = res.pens || null; I.et = !!res.et; I.w = res.winSide === 0 ? f.h : f.a; I.played = true;
      EU.pay(st, I.w, 5, 'Copa Intercontinental: premio al campeón'); EU.pay(st, I.w === f.h ? f.a : f.h, 2.5, 'Copa Intercontinental: finalista');
      EU.title(st, I.w, 'inter', 'la Copa Intercontinental');
    }
    if (ev.type === 'cwc') EU.cwcRecord(st, f, res);
  };

  // título ganado: palmarés de la partida, trofeos del usuario, logros y noticia
  EU.title = function (st, tid, k, text) {
    const t = T(st, tid); if (!t) return;
    t.gtitles = t.gtitles || {}; t.gtitles[k] = (t.gtitles[k] || 0) + 1;
    if (LG.isManaged(st, tid)) LG.own(st, tid, () => {
      st.trophies.push({ season: st.season, comp: k, team: tid });
      ACH({ ucl: 'ucl', uel: 'uel', uecl: 'uecl', supercopa: 'supercopa_eu', inter: 'intercontinental', mundial: 'mundial' }[k], st);
      LG.news(st, '¡CAMPEONES! El ' + t.name + ' gana ' + text + '.', 'cup');
    }); else if (!t.foreign || k === 'ucl' || k === 'mundial') LG.news(st, 'El ' + t.name + ' gana ' + text + '.', 'cup');
  };

  // avanza la competición tras jugar una fecha
  EU.advance = function (st, ev, summary, R) {
    const E = st.euro;
    if (ev.type === 'cwc') { EU.cwcAdvance(st, R); return; }
    if (ev.type !== 'euro') return;
    const C = E.comps[ev.code]; const P = EU.CFG[ev.code].prize;
    if (C.phase === 'league') {
      C.mdPlayed++;
      if (C.mdPlayed >= C.md.length) {
        const tab = EU.table(st, C);
        C.final = tab.map((r) => r.id);
        // 1º-8º a octavos; 9º-24º, eliminatoria previa (9 vs 24, 10 vs 23…)
        C.top8 = C.final.slice(0, 8);
        const po = C.final.slice(8, 24);
        const ties = []; for (let i = 0; i < 8; i++) ties.push({ a: po[i], b: po[15 - i], legs: [], w: null });
        C.ko.push({ stage: 'po', label: EU.KO[0][1], days: EU.KO[0][2], ties, leg: 0 });
        C.phase = 'ko'; C.koIdx = 0;
        tab.filter((r) => LG.isManaged(st, r.id)).forEach((u) => LG.news(st, C.name + ': el ' + T(st, u.id).short + ' termina ' + u.pos + 'º en la fase de liga' + (u.pos <= 8 ? ' y pasa directamente a octavos.' : u.pos <= 24 ? ' y jugará la eliminatoria previa.' : ' y queda eliminado.'), 'cup'));
        tab.forEach((r) => {
          if (r.pos <= 24) EU.pay(st, r.id, P.ko[0], C.name + ': premio por superar la fase de liga');
          if (r.pos <= 8) EU.pay(st, r.id, P.ko[1], C.name + ': premio por superar la previa (acceso directo a octavos)');
        });
      }
      return;
    }
    const K = C.ko[C.koIdx];
    if (K.stage !== 'f' && K.leg === 0) { K.leg = 1; return; }
    // eliminatoria resuelta
    const winners = K.ties.map((t) => t.w);
    const si = EU.KO.findIndex((x) => x[0] === K.stage);
    K.ties.forEach((t) => { const lost = t.w === t.a ? t.b : t.a; if (LG.isManaged(st, lost)) LG.news(st, C.name + ': el ' + T(st, lost).short + ' cae en ' + K.label.toLowerCase() + ' ante el ' + T(st, t.w).short + '.', 'cup'); });
    winners.forEach((id) => { EU.coef(st, id, 1); if (K.stage !== 'f') EU.pay(st, id, P.ko[Math.min(si + 1, P.ko.length - 1)], C.name + ': premio por superar ' + K.label.toLowerCase()); });
    if (K.stage === 'f') {
      const t = K.ties[0]; C.winner = t.w; C.runnerUp = t.w === t.a ? t.b : t.a; C.phase = 'done';
      EU.pay(st, C.winner, P.champ, C.name + ': campeón');
      EU.title(st, C.winner, ev.code, 'la ' + C.name);
      [C.winner, C.runnerUp].filter((x) => LG.isManaged(st, x)).forEach((x) => LG.own(st, x, () => ACH('final_europa', st)));
      return;
    }
    const next = EU.KO[si + 1];
    let ties = [];
    if (K.stage === 'po') {
      // octavos: los 8 primeros contra los ganadores de la previa (el mejor clasificado juega la vuelta en casa)
      const seeds = C.top8.slice(); const w2 = winners.slice(); R.shuffle(w2);
      ties = seeds.map((s, i) => ({ a: s, b: w2[i], legs: [], w: null }));
    } else {
      const order = (id) => C.final.indexOf(id);
      const ws = winners.slice(); R.shuffle(ws);
      for (let i = 0; i < ws.length; i += 2) { const [a, b] = [ws[i], ws[i + 1]].sort((x, y) => order(x) - order(y)); ties.push({ a, b, legs: [], w: null }); }
    }
    C.ko.push({ stage: next[0], label: next[1], days: next[2], ties, leg: 0 });
    C.koIdx++;
    ties.filter((t) => LG.isManaged(st, t.a) || LG.isManaged(st, t.b)).forEach((ut) => LG.news(st, C.name + ' (' + next[1].toLowerCase() + '): ' + T(st, ut.a).short + ' - ' + T(st, ut.b).short + '.', 'cup'));
  };

  // ---------- Copa Intercontinental: camino de la Copa Challenger (simulado) para conocer al rival
  EU.interPath = function (st) {
    const I = st.euro.inter; if (!I || I.opp) return;
    const R = R_(st, 'inter'); const w = st.world;
    const by = (conf) => Object.values(w.teams).filter((t) => t.conf === conf);
    const pickW = (arr) => { const tot = U.sum(arr, (t) => Math.pow(t.base - 50, 3)); let x = R() * tot; for (const t of arr) { x -= Math.pow(t.base - 50, 3); if (x <= 0) return t.id; } return arr[0].id; };
    const fixedS = st.season === 2026 ? { AFC: 'xahl', CAF: 'xmsd', CONCACAF: 'xtol' } : {};
    const lib = pickW(by('CONMEBOL')), afc = fixedS.AFC || pickW(by('AFC')), caf = fixedS.CAF || pickW(by('CAF')), cc = fixedS.CONCACAF || pickW(by('CONCACAF')), ofc = 'xakl';
    const q = (h, a) => { const f = { h, a, key: 'iq', neutral: true }; const r = EU.sim(st, f, R); EU.decide(st, f, r.res, r.L, R); return { h, a, s: r.res.score, p: r.res.pens, w: r.res.winSide === 0 ? h : a }; };
    const m1 = q(afc, ofc), m2 = q(caf, m1.w), m3 = q(lib, cc), m4 = q(m3.w, m2.w);
    I.path = [['Copa África-Asia-Pacífico (previa)', m1], ['Copa África-Asia-Pacífico', m2], ['Derbi de las Américas', m3], ['Copa Challenger', m4]];
    I.opp = m4.w;
  };

  // ---------- Mundial de Clubes (32 equipos: 8 grupos de 4 y eliminatorias a partido único)
  EU.setupCWC = function (st, R) {
    const w = st.world; const E = st.euro;
    const sum4 = (id) => { const c = E.coef[id] || {}; return Object.keys(c).filter((k) => +k >= st.season - 4).reduce((s, k) => s + c[k], 0); };
    const winners = ['xpsg'].concat((E.history || []).filter((h) => h.season >= st.season - 3 && h.ucl).map((h) => h.ucl)).filter((id, i, a) => a.indexOf(id) === i && w.teams[id]);
    const uefa = winners.slice(0, 4);
    const country = (id) => (w.teams[id].foreign ? w.teams[id].country : 'ESP');
    const cnt = {}; uefa.forEach((id) => { cnt[country(id)] = (cnt[country(id)] || 0) + 1; });
    const cands = Object.values(w.teams).filter((t) => (t.conf === 'UEFA' || !t.foreign) && t.div !== 3 && t.div !== 4 && !t.parent && uefa.indexOf(t.id) < 0)
      .map((t) => ({ id: t.id, v: sum4(t.id) + DB.teamStrength(w, t.id) * 0.05 })).sort((a, b) => b.v - a.v);
    for (const c of cands) { if (uefa.length >= 12) break; const k = country(c.id); if ((cnt[k] || 0) >= 2) continue; uefa.push(c.id); cnt[k] = (cnt[k] || 0) + 1; }
    const by = (conf, n, fixed) => { const f = (fixed || []).filter((id) => w.teams[id]); const rest = Object.values(w.teams).filter((t) => t.conf === conf && f.indexOf(t.id) < 0).sort((a, b) => b.base + R() * 4 - a.base - R() * 4).map((t) => t.id); return f.concat(rest).slice(0, n); };
    const others = [].concat(by('CONMEBOL', 6), by('AFC', 4, ['xahl']), by('CAF', 4, ['xpyr', 'xmsd']), by('CONCACAF', 4, ['xcru', 'xtol']), by('OFC', 1));
    const all = uefa.concat(others);
    const host = Object.values(w.teams).filter((t) => t.foreign && all.indexOf(t.id) < 0 && t.conf !== 'UEFA').sort((a, b) => b.base - a.base)[0];
    if (host) all.push(host.id);
    while (all.length < 32) { const x = Object.values(w.teams).find((t) => t.foreign && all.indexOf(t.id) < 0); if (!x) break; all.push(x.id); }
    // bombos por nivel y grupos sin dos equipos de la misma confederación (si se puede)
    const sorted = all.slice(0, 32).sort((a, b) => DB.teamStrength(w, b) - DB.teamStrength(w, a));
    const groups = Array.from({ length: 8 }, () => []);
    for (let pot = 0; pot < 4; pot++) {
      const potT = sorted.slice(pot * 8, pot * 8 + 8); R.shuffle(potT);
      potT.forEach((id) => {
        const conf = w.teams[id].conf || 'UEFA';
        let gi = groups.findIndex((g) => g.length === pot && !g.some((x) => (w.teams[x].conf || 'UEFA') === conf && conf !== 'UEFA'));
        if (gi < 0) gi = groups.findIndex((g) => g.length === pot);
        groups[gi].push(id);
      });
    }
    all.slice(0, 32).forEach((id) => EU.pay(st, id, 15, 'Mundial de Clubes: premio de participación'));
    LG.news(st, 'Arranca el Mundial de Clubes ' + st.season + ' con 32 equipos' + (all.indexOf(st.userTeam) >= 0 ? ': ¡tu equipo está clasificado!' : '.'), 'cup');
    return { season: st.season, teams: all.slice(0, 32), groups, res: {}, stage: 0, ko: [], done: false, winner: null, venue: 'Sede del Mundial de Clubes ' + st.season, goals: {} };
  };
  const GROUP_MD = [[[0, 1], [2, 3]], [[0, 2], [3, 1]], [[3, 0], [1, 2]]];
  EU.CWC_KO = ['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'];
  EU.cwcFixtures = function (st) {
    const W = st.euro.cwc; const L = 'Mundial de Clubes · ';
    if (W.stage < 3) {
      const out = [];
      W.groups.forEach((g, gi) => GROUP_MD[W.stage].forEach(([x, y], k) => out.push({ h: g[x], a: g[y], key: 'g' + gi + '_' + W.stage + '_' + k, comp: 'cwc', neutral: true, venue: W.venue, label: L + 'Grupo ' + 'ABCDEFGH'[gi] + ' · Jornada ' + (W.stage + 1), group: gi })));
      return out;
    }
    const K = W.ko[W.stage - 3];
    return K.ties.map((t, i) => ({ h: t.a, a: t.b, key: 'c' + (W.stage - 3) + '_' + i, comp: 'cwc', neutral: true, venue: W.venue, label: L + K.label, ko: true, tie: t }));
  };
  EU.cwcRecord = function (st, f, res) {
    const W = st.euro.cwc;
    res.events.forEach((e) => { if (e.type === 'goal' && !e.own) W.goals[e.pid] = (W.goals[e.pid] || 0) + 1; });
    if (f.group !== undefined) {
      W.res[f.key] = { h: f.h, a: f.a, hg: res.score[0], ag: res.score[1], gi: f.group };
      [[f.h, res.score[0], res.score[1]], [f.a, res.score[1], res.score[0]]].forEach(([tid, x, y]) => EU.pay(st, tid, x > y ? 2 : x === y ? 0.7 : 0, 'Mundial de Clubes: premio por ' + (x > y ? 'victoria' : 'empate')));
    }
    else { f.tie.hg = res.score[0]; f.tie.ag = res.score[1]; f.tie.pens = res.pens || null; f.tie.et = !!res.et; f.tie.w = res.winSide === 0 ? f.h : f.a; }
  };
  EU.cwcGroup = function (st, gi) {
    const W = st.euro.cwc; const rows = {}; W.groups[gi].forEach((id) => { rows[id] = { id, pj: 0, pts: 0, gf: 0, gc: 0 }; });
    Object.values(W.res).filter((r) => r.gi === gi).forEach((r) => {
      const H = rows[r.h], A = rows[r.a]; H.pj++; A.pj++; H.gf += r.hg; H.gc += r.ag; A.gf += r.ag; A.gc += r.hg;
      if (r.hg > r.ag) H.pts += 3; else if (r.hg < r.ag) A.pts += 3; else { H.pts++; A.pts++; }
    });
    return Object.values(rows).sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf);
  };
  EU.cwcAdvance = function (st, R) {
    const W = st.euro.cwc; W.stage++;
    if (W.stage < 3) return;
    if (W.stage === 3) {
      const g = W.groups.map((x, gi) => EU.cwcGroup(st, gi));
      // 1A-2B, 1C-2D, 1E-2F, 1G-2H, 1B-2A, 1D-2C, 1F-2E, 1H-2G
      const P = [[0, 1], [2, 3], [4, 5], [6, 7], [1, 0], [3, 2], [5, 4], [7, 6]];
      W.ko.push({ label: EU.CWC_KO[0], ties: P.map(([x, y]) => ({ a: g[x][0].id, b: g[y][1].id })) });
      W.teams.filter((id) => LG.isManaged(st, id) && !g.some((rows) => rows.slice(0, 2).some((r) => r.id === id))).forEach((id) => LG.news(st, 'Mundial de Clubes: el ' + T(st, id).short + ' cae en la fase de grupos.', 'cup'));
      return;
    }
    const K = W.ko[W.stage - 4]; const ws = K.ties.map((t) => t.w);
    ws.forEach((id) => EU.pay(st, id, [4, 6, 8, 12][W.stage - 4] || 4, 'Mundial de Clubes: premio por superar ' + K.label.toLowerCase()));
    if (W.stage - 4 >= EU.CWC_KO.length - 1) { W.done = true; W.winner = ws[0]; const t = K.ties[0]; W.runnerUp = t.w === t.a ? t.b : t.a; EU.title(st, W.winner, 'mundial', 'el Mundial de Clubes ' + W.season); return; }
    const ties = []; for (let i = 0; i < ws.length; i += 2) ties.push({ a: ws[i], b: ws[i + 1] });
    W.ko.push({ label: EU.CWC_KO[W.stage - 3], ties });
  };

  // ---------- clasificación para la temporada siguiente
  EU.qualify = function (st, R) {
    const w = st.world; const E = st.euro; const H = E.holders || {};
    const h0 = st.history[0];   // temporada que acaba de terminar
    const table1 = h0 && h0.table1 ? h0.table1 : [];
    const sp = { ucl: [], uel: [], uecl: [] }; const used = new Set();
    const add = (c, id) => { if (id && w.teams[id] && !w.teams[id].foreign && !w.teams[id].parent && !used.has(id) && st.div[1].concat(st.div[2]).indexOf(id) >= 0) { sp[c].push(id); used.add(id); } };
    table1.slice(0, 4).forEach((id) => add('ucl', id));
    if (H.ucl) add('ucl', H.ucl); if (H.uel) add('ucl', H.uel);
    if (H.uecl) add('uel', H.uecl);
    if (h0 && h0.cup) add('uel', h0.cup[0]);
    let k = 4; while (sp.uel.length < 2 + (H.uecl && sp.uel.indexOf(H.uecl) >= 0 ? 1 : 0) && k < table1.length) add('uel', table1[k++]);
    while (sp.uecl.length < 1 && k < table1.length) add('uecl', table1[k++]);
    // clubes extranjeros por nivel (con algo de azar) y los campeones vigentes
    const pool = Object.values(w.teams).filter((t) => t.foreign && t.conf === 'UEFA').map((t) => ({ id: t.id, v: t.base + R.normal() * 2.2 + (H.ucl === t.id || H.uel === t.id ? 20 : 0) })).sort((a, b) => b.v - a.v).map((x) => x.id);
    const take = (n) => pool.splice(0, Math.max(0, n));
    return { ucl: sp.ucl.concat(take(36 - sp.ucl.length)), uel: sp.uel.concat(take(36 - sp.uel.length)), uecl: sp.uecl.concat(take(36 - sp.uecl.length)) };
  };

  // fin de temporada: campeones vigentes e historial
  EU.endSeason = function (st) {
    const E = st.euro; if (!E || E.season !== st.season) return;
    const c = E.comps;
    E.holders = { ucl: c.ucl && c.ucl.winner, uel: c.uel && c.uel.winner, uecl: c.uecl && c.uecl.winner };
    E.history.unshift({ season: st.season, ucl: E.holders.ucl, uel: E.holders.uel, uecl: E.holders.uecl, sup: E.supercup && E.supercup.w, inter: E.inter && E.inter.w, cwc: E.cwc && E.cwc.winner,
      fin: EU.CODES.map((k) => (c[k] ? [c[k].winner, c[k].runnerUp] : null)) });
    if (E.history.length > 30) E.history.length = 30;
    // borra coeficientes antiguos (5 temporadas)
    Object.keys(E.coef).forEach((id) => Object.keys(E.coef[id]).forEach((k) => { if (+k < st.season - 4) delete E.coef[id][k]; }));
    LG.forEachMgr(st, () => { const u = st.userTeam;
    if (c.ucl && c.ucl.winner === u && st.trophies.some((x) => x.season === st.season && x.comp === 'liga') && st.trophies.some((x) => x.season === st.season && x.comp === 'copa')) ACH('triplete', st); });
  };
  // repara calendarios con jornadas vacías (error de versiones anteriores)
  EU.repair = function (st) {
    const E = st.euro; if (!E || !E.comps) return;
    EU.CODES.forEach((c) => {
      const C = E.comps[c]; if (!C || C.phase !== 'league') return;
      if (!C.md.slice(C.mdPlayed).some((g) => !g.length)) return;
      const fresh = EU.leagueRounds(C.teams, C.md.length, R_(st, 'repair' + c));
      for (let k = C.mdPlayed; k < C.md.length; k++) C.md[k] = fresh[k];
    });
  };

  // competiciones en las que está un equipo esta temporada
  EU.compsOf = function (st, tid) {
    const E = st.euro; if (!E || !E.comps) return [];
    return EU.CODES.filter((c) => E.comps[c] && E.comps[c].teams.indexOf(tid) >= 0);
  };
  EU.alive = function (st, code, tid) {
    const C = st.euro && st.euro.comps && st.euro.comps[code]; if (!C || C.teams.indexOf(tid) < 0) return false;
    if (C.phase === 'league') return true; if (C.phase === 'done') return C.winner === tid;
    const K = C.ko[C.koIdx]; return !!K && K.ties.some((t) => t.a === tid || t.b === tid);
  };

  MF.EU = EU;
})(typeof window !== 'undefined' ? window : globalThis);
