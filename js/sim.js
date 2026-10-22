/* MÍSTER FÚTBOL 26·27 — simulación rápida de partidos (modo RESULTADO y resto de la jornada) */
(function (G) {
  'use strict';
  const MF = G.MF; const U = MF.U; const DB = MF.DB;
  const SIM = {};

  const SCORE_W = { DC: 5, ED: 3, EI: 3, MCO: 2.6, MC: 1.2, MCD: 0.6, LD: 0.45, LI: 0.45, DFC: 0.5, POR: 0.01 };
  const ASSIST_W = { DC: 1.6, ED: 3, EI: 3, MCO: 3.4, MC: 2.2, MCD: 1.1, LD: 1.6, LI: 1.6, DFC: 0.35, POR: 0.05 };
  const CARD_W = { DC: 0.7, ED: 0.6, EI: 0.6, MCO: 0.7, MC: 1.1, MCD: 1.6, LD: 1.1, LI: 1.1, DFC: 1.4, POR: 0.15 };

  // Fuerzas del once según su colocación
  SIM.teamFactors = function (w, lineup, tactic) {
    const slots = DB.FORMATIONS[lineup.formation];
    const by = { POR: [], DEF: [], MED: [], DEL: [] };
    lineup.xi.forEach((id, i) => { const p = w.players[id]; if (!p) return; by[DB.LINE_OF[slots[i][0]]].push(DB.effOvr(p, slots[i][0])); });
    const a = (arr, d) => (arr.length ? U.avg(arr) : d);
    const POR = a(by.POR, 50), DEF = a(by.DEF, 55), MED = a(by.MED, 55), DEL = a(by.DEL, 55);
    let att = DEL * 0.5 + MED * 0.35 + DEF * 0.15;
    let def = DEF * 0.52 + MED * 0.36 + POR * 0.12;   // el portero actúa además en cada tiro
    const n = lineup.xi.filter((x) => x !== null).length;
    if (n < 11) { att -= (11 - n) * 2.5; def -= (11 - n) * 3; }
    tactic = tactic || {};
    return { att, def, mid: MED, style: tactic.style || 'equilibrada', press: tactic.press || 'media', passing: tactic.passing || 'mixto' };
  };

  // ---------- MODELO TÁCTICO
  // No hay una táctica ideal: cada opción rinde según los atributos de tu once y los del rival.
  SIM.profile = function (w, L) {
    const slots = DB.FORMATIONS[L.formation]; const out = [], del = [], def = [], med = [];
    L.xi.forEach((id, i) => {
      const p = w.players[id]; if (!p) return; const r = slots[i][0];
      if (r !== 'POR') out.push(p);
      if (DB.LINE_OF[r] === 'DEL') del.push(p); if (DB.LINE_OF[r] === 'DEF') def.push(p); if (DB.LINE_OF[r] === 'MED') med.push(p);
    });
    const av = (arr, k) => (arr.length ? U.avg(arr, (p) => p.at[k]) : 60);
    const roles = slots.map((x) => x[0]);
    return {
      vel: av(out, 'vel'), res: av(out, 'res'), pas: av(out, 'pas'), cal: av(out, 'cal'), reg: av(out, 'reg'), tir: av(out, 'tir'), dfn: av(out, 'dfn'),
      delVel: av(del, 'vel'), defVel: av(def, 'vel'), medPas: av(med, 'pas'),
      med: med.length ? U.avg(med, (p) => p.ovr) : 60, nMED: med.length,
      back3: roles.filter((r) => r === 'DFC').length === 3 && roles.indexOf('LD') < 0, back5: L.formation === '5-3-2',
      wingers: roles.indexOf('ED') >= 0 || roles.indexOf('EI') >= 0, dcs: roles.filter((r) => r === 'DC').length,
    };
  };
  SIM.tacticEdge = function (w, L, Tt) {
    const P = [SIM.profile(w, L[0]), SIM.profile(w, L[1])];
    const t = [Object.assign({ style: 'equilibrada', press: 'media', passing: 'mixto' }, Tt[0] || {}), Object.assign({ style: 'equilibrada', press: 'media', passing: 'mixto' }, Tt[1] || {})];
    const E = { A: [1, 1], K: [1, 1], drain: [1, 1], notes: [[], []] };
    const add = (s, kind, m, txt) => { E[kind][s] *= m; if (txt && Math.abs(m - 1) >= 0.02) E.notes[s].push({ txt, v: Math.round((kind === 'A' ? m - 1 : 1 - m) * 100) }); };
    for (let s = 0; s < 2; s++) {
      const o = 1 - s; const me = P[s], op = P[o], T = t[s], TO = t[o];
      // centro del campo
      const md = (me.med + (me.nMED - 4) * 2.2) - (op.med + (op.nMED - 4) * 2.2);
      add(s, 'A', 1 + U.clamp(md * 0.004, -0.05, 0.05), md > 0 ? 'Superioridad en el centro del campo' : 'Inferioridad en el centro del campo');
      // dibujo
      if (me.wingers && op.back3) add(s, 'A', 1.07, 'Los extremos castigan la defensa de tres');
      if (op.back5 && me.wingers) add(s, 'A', 0.95, 'La línea de cinco rival cierra las bandas');
      if (me.back5) { add(s, 'A', 0.94, 'Defensa de cinco: menos llegada'); add(s, 'K', 0.92, 'Defensa de cinco: más solidez atrás'); }
      if (me.dcs >= 2 && !op.back3 && !op.back5 && me.delVel > op.defVel + 4) add(s, 'A', 1.04, 'Dos puntas rápidos contra dos centrales');
      // estilo
      if (T.style === 'ofensiva') { add(s, 'A', 1.1, 'Estilo ofensivo: más ocasiones'); add(s, 'K', 1.1, 'Estilo ofensivo: más espacios atrás'); }
      if (T.style === 'defensiva') {
        add(s, 'A', 0.86, 'Estilo defensivo: menos ocasiones'); add(s, 'K', 0.84, 'Estilo defensivo: bloque bajo y ordenado');
        if (me.delVel >= 76 && (TO.style === 'ofensiva' || TO.press === 'alta')) add(s, 'A', 1.12, 'Contragolpes con delanteros rápidos');
      }
      // presión
      if (T.press === 'alta') {
        const e = U.clamp((72 - op.pas) * 0.005, -0.06, 0.08);
        add(s, 'A', 1 + e, e > 0 ? 'La presión alta fuerza errores del rival' : 'El rival sale jugando bien ante la presión');
        add(s, 'K', 1 + U.clamp((op.delVel - 72) * 0.004, 0, 0.08), 'Espacio a la espalda ante delanteros rápidos');
        E.drain[s] *= 1.22; if (me.res < 70) E.notes[s].push({ txt: 'Poca resistencia: la presión alta os pasará factura en la segunda parte', v: -4 });
      }
      if (T.press === 'baja') {
        add(s, 'A', 0.96, 'Presión baja: se recupera el balón lejos'); add(s, 'K', 0.95, 'Presión baja: menos espacios atrás'); E.drain[s] *= 0.86;
        if (op.pas >= 76) add(s, 'K', 1.05, 'El rival domina el balón si no se le presiona');
      }
      // tipo de pase
      if (T.passing === 'corto') {
        add(s, 'A', 1 + U.clamp(((me.pas + me.cal) / 2 - 72) * 0.005, -0.06, 0.07), (me.pas + me.cal) / 2 >= 72 ? 'Buenos pasadores para el juego corto' : 'Falta calidad para jugar en corto');
        if (TO.press === 'alta' && me.pas < 72) add(s, 'K', 1.06, 'Salida en corto arriesgada ante la presión alta');
      }
      if (T.passing === 'largo') {
        add(s, 'A', 1 + U.clamp((me.delVel - op.defVel) * 0.004, -0.05, 0.07), me.delVel > op.defVel ? 'Balones largos a la espalda de una defensa lenta' : 'Balón largo sin delanteros más rápidos que su defensa');
        if (TO.press === 'alta') add(s, 'A', 1.04, 'El pase largo salta la presión rival');
        if (me.medPas >= 78) add(s, 'A', 0.97, 'Se desaprovecha la calidad de vuestros centrocampistas');
      }
    }
    for (let s = 0; s < 2; s++) { E.A[s] = U.clamp(E.A[s], 0.78, 1.28); E.K[s] = U.clamp(E.K[s], 0.78, 1.28); E.notes[s].sort((a, b) => Math.abs(b.v) - Math.abs(a.v)); }
    return E;
  };

  SIM.expected = function (fh, fa, neutral, edge) {
    let lh = 1.2 * Math.exp((fh.att - fa.def) * 0.034 + (neutral ? 0 : 0.1));
    let la = 1.02 * Math.exp((fa.att - fh.def) * 0.034 - (neutral ? -0.1 : 0));
    if (edge) { lh *= edge.A[0] * edge.K[1]; la *= edge.A[1] * edge.K[0]; }
    return [U.clamp(lh, 0.12, 3.6), U.clamp(la, 0.1, 3.4)];
  };

  // Probabilidades de victoria/empate/derrota con dos Poisson (para la IA y el informe táctico)
  SIM.outcome = function (l0, l1) {
    const pois = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
    let w = 0, d = 0, x = 0;
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) { const p = pois(l0, i) * pois(l1, j); if (i > j) w += p; else if (i === j) d += p; else x += p; }
    return { w, d, l: x, pts: w * 3 + d };
  };
  SIM.TACTICS = (function () { const out = []; ['equilibrada', 'ofensiva', 'defensiva'].forEach((st) => ['media', 'alta', 'baja'].forEach((pr) => ['mixto', 'corto', 'largo'].forEach((pa) => out.push({ style: st, press: pr, passing: pa })))); return out; })();
  // Mejor combinación de estilo, presión y pase para el lado "side" ante un rival concreto.
  // skill (0-1): cuanto menor, más se equivoca el que decide (IA o segundo entrenador).
  SIM.bestTactic = function (w, L, Tt, side, neutral, skill, R) {
    R = R || U.R; skill = skill === undefined ? 0.8 : skill;
    const F = [SIM.teamFactors(w, L[0], {}), SIM.teamFactors(w, L[1], {})];
    let best = null, bv = -1;
    SIM.TACTICS.forEach((tac) => {
      const T2 = Tt.slice(); T2[side] = tac;
      const e = SIM.tacticEdge(w, L, T2); const lam = SIM.expected(F[0], F[1], neutral, e);
      const o = SIM.outcome(side === 0 ? lam[0] : lam[1], side === 0 ? lam[1] : lam[0]);
      const v = o.pts + R.normal() * (1 - skill) * 0.12;
      if (v > bv) { bv = v; best = tac; }
    });
    return best;
  };

  // Estado físico estimado en la simulación (0-1), parecido al del motor
  const drainRate = (p, mul) => 0.0041 * (1.4 - p.at.res / 100) * mul * (p.line === 'POR' ? 0.3 : 1);

  /**
   * Simula un partido completo o un tramo.
   * opts: { home, away, lhome, laway (alineaciones), thome, taway (tácticas), neutral, rng,
   *         fromMinute, toMinute, base (resultado parcial), autoSubs: [bool, bool] }
   * Devuelve un objeto resultado con goles, tarjetas, lesiones, estadísticas, valoraciones y cansancio.
   */
  // ======================================================================
  // MOTOR DE SIMULACIÓN POR OCASIONES
  // Cada minuto se decide quién domina el balón (posesión real del partido), se juegan los pases, se
  // cometen faltas (tarjetas y penaltis salen de ellas) y se generan tiros. Cada tiro tiene un tipo de
  // ocasión y un valor de gol esperado (xG) que depende de la calidad del ataque, de la defensa, del
  // rematador y del portero. Los goles, paradas, tiros bloqueados, córners y estadísticas salen de esos
  // mismos eventos: el marcador nunca se decide aparte.
  // Parámetros calibrados con SIM.CAL (ver tests/calib): hipótesis de diseño documentadas en el README.
  // ======================================================================
  SIM.CAL = {
    SHOTS: 12.3,        // tiros por equipo y partido con un ataque medio (hipótesis LaLiga: 12-13)
    LAM_REF: 1.25,      // goles esperados de referencia de un equipo medio
    SHOT_EXP: 0.62,     // reparto de la calidad del ataque entre «más tiros» (0.62) y «mejores tiros» (0.38)
    PEN_XG: 0.12,       // parte de los goles esperados que llegan de penalti (se resta del juego abierto)
    FOULS: 12.2, YELLOW: 0.17, RED: 0.0028, BOX_FOUL: 0.019, PEN_GOAL: 0.77, SECOND_YELLOW: 0.3,
    PASSES: 10.4, CORNERS: 2.6, OFFSIDES: 1.7, OWN_GOAL: 0.035,
  };
  // tipos de ocasión: xG base, probabilidad de ir a puerta si no se bloquea, probabilidad de bloqueo
  SIM.CHANCES = {
    lejano: { xg: 0.035, ot: 0.38, bl: 0.34, name: 'disparo lejano' },
    area: { xg: 0.10, ot: 0.47, bl: 0.24, name: 'remate en el área' },
    cabeza: { xg: 0.085, ot: 0.42, bl: 0.07, name: 'remate de cabeza' },
    clara: { xg: 0.36, ot: 0.68, bl: 0.05, name: 'ocasión clarísima' },
    abp: { xg: 0.075, ot: 0.38, bl: 0.16, name: 'jugada a balón parado' },
    falta: { xg: 0.07, ot: 0.4, bl: 0.3, name: 'falta directa' },
  };
  const SHOOT_W = {
    lejano: { DC: 1.4, ED: 2, EI: 2, MCO: 3, MC: 2.4, MCD: 1.2, LD: 0.5, LI: 0.5, DFC: 0.4, POR: 0 },
    area: { DC: 5, ED: 2.8, EI: 2.8, MCO: 2.4, MC: 1, MCD: 0.4, LD: 0.4, LI: 0.4, DFC: 0.3, POR: 0 },
    cabeza: { DC: 5, ED: 1.2, EI: 1.2, MCO: 1, MC: 1.2, MCD: 1, LD: 0.4, LI: 0.4, DFC: 1.4, POR: 0 },
    clara: { DC: 5.5, ED: 3, EI: 3, MCO: 2.4, MC: 0.9, MCD: 0.3, LD: 0.4, LI: 0.4, DFC: 0.2, POR: 0 },
    abp: { DC: 3, ED: 0.8, EI: 0.8, MCO: 1.2, MC: 1.2, MCD: 1.4, LD: 0.5, LI: 0.5, DFC: 3, POR: 0 },
  };
  const ASSIST_T = {
    lejano: ASSIST_W, area: ASSIST_W, clara: { DC: 1.6, ED: 3, EI: 3, MCO: 4, MC: 2.6, MCD: 1, LD: 1.2, LI: 1.2, DFC: 0.3, POR: 0.05 },
    cabeza: { DC: 0.8, ED: 4, EI: 4, MCO: 1.6, MC: 1.4, MCD: 0.6, LD: 3.2, LI: 3.2, DFC: 0.2, POR: 0 },
    abp: { DC: 0.5, ED: 2, EI: 2, MCO: 3, MC: 2.4, MCD: 1, LD: 1.4, LI: 1.4, DFC: 0.3, POR: 0 },
  };
  const ASSIST_P = { lejano: 0.3, area: 0.78, cabeza: 0.93, clara: 0.88, abp: 0.85 };
  // reparto de tipos de ocasión según el plan de juego y la calidad del ataque frente a la defensa
  SIM.chanceMix = function (T, P, q) {
    const m = { lejano: 0.31, area: 0.37, cabeza: 0.12, clara: 0.08, abp: 0.12 };
    if (T.passing === 'corto') { m.area += 0.05; m.lejano -= 0.04; m.cabeza -= 0.02; }
    if (T.passing === 'largo') { m.cabeza += 0.04; m.clara += 0.015; m.area -= 0.04; }
    if (T.style === 'ofensiva') { m.lejano += 0.03; m.cabeza += 0.02; }
    if (T.style === 'defensiva') { m.clara += 0.025; m.lejano += 0.02; m.area -= 0.04; }
    if (P && P.wingers) m.cabeza += 0.03;
    // un ataque muy superior a la defensa rival llega más veces solo frente al portero
    m.clara *= U.clamp(Math.pow(q, 0.8), 0.6, 1.8); m.lejano *= U.clamp(Math.pow(q, -0.4), 0.7, 1.3);
    return m;
  };
  // jugadores de un lado con su puesto en el once
  const roleOf = (w, L, id) => { const i = L.xi.indexOf(id); return i >= 0 ? DB.FORMATIONS[L.formation][i][0] : w.players[id].role; };
  // cambio de plan del entrenador de la IA (o del segundo) según el marcador: una vez por tramo y sin bandazos
  SIM.coach = function (res, s, m, tactic) {
    const gd = res.score[s] - res.score[1 - s]; const mod = res.tacMod[s];
    if (m !== 60 && m !== 75) return;
    if (gd < 0 && tactic.style !== 'ofensiva') { res.tacMod[s] = 'ofensiva'; res.events.push({ type: 'tactic', side: s, min: m, style: 'ofensiva' }); }
    else if (gd > 0 && m === 75 && (mod === 'ofensiva' || tactic.style === 'ofensiva')) { res.tacMod[s] = 'equilibrada'; res.events.push({ type: 'tactic', side: s, min: m, style: 'equilibrada' }); }
    else if (gd === 1 && m === 75 && tactic.style === 'equilibrada' && res.stats.xg && res.stats.xg[1 - s] > res.stats.xg[s] + 0.6) { res.tacMod[s] = 'defensiva'; res.events.push({ type: 'tactic', side: s, min: m, style: 'defensiva' }); }
  };

  /**
   * Simula un partido completo o un tramo.
   * opts: { home, away, lhome, laway (alineaciones), thome, taway (tácticas), neutral, rng,
   *         fromMinute, toMinute, endMinute, base (resultado parcial), autoSubs: [bool, bool], coach: [bool, bool] }
   */
  SIM.play = function (w, opts) {
    const R = opts.rng || U.R; const C = SIM.CAL;
    const cl = (l) => ({ formation: l.formation, xi: l.xi.slice(), bench: (l.bench || []).slice() });
    const L = [cl(opts.lhome), cl(opts.laway)];
    const T = [w.teams[opts.home], w.teams[opts.away]];
    const from = opts.fromMinute || 0; const to = opts.toMinute === undefined || opts.toMinute === null ? 90 : opts.toMinute;
    const res = opts.base ? JSON.parse(JSON.stringify(opts.base)) : SIM.emptyResult(opts.home, opts.away);
    const S = res.stats;
    ['blocked', 'saves', 'xg', 'big', 'passes', 'passOk', 'offsides', 'yellows', 'possT'].forEach((k) => { if (!S[k]) S[k] = [0, 0]; });
    res.subsIn = res.subsIn || [[], []]; res.subsLeft = res.subsLeft || [5, 5]; res.stam = res.stam || {}; res.tacMod = res.tacMod || [null, null];
    const auto = opts.autoSubs || [true, true]; const coachOn = opts.coach || auto;
    if (!res.startXI) res.startXI = [L[0].xi.slice(), L[1].xi.slice()];
    const onPitch = [L[0].xi.filter((x) => x !== null).slice(), L[1].xi.filter((x) => x !== null).slice()];
    res.events.forEach((e) => { if (e.type === 'red') { const s = e.side; onPitch[s] = onPitch[s].filter((x) => x !== e.pid); } });
    onPitch.forEach((arr) => arr.forEach((id) => { if (res.stam[id] === undefined) res.stam[id] = U.clamp(w.players[id].fit / 100, 0.4, 1); }));
    const bench = [0, 1].map((s) => (L[s].bench || []).filter((id) => w.players[id] && res.subsIn[s].indexOf(id) < 0 && onPitch[s].indexOf(id) < 0 && !res.events.some((e) => e.type === 'sub' && e.out === id)));
    // ---- modelo del partido (se recalcula si cambian el once o el plan)
    let M = null;
    const tacticOf = (s) => { const base = Object.assign({ style: 'equilibrada', press: 'media', passing: 'mixto' }, s === 0 ? (opts.thome || T[0]) : (opts.taway || T[1])); return res.tacMod[s] ? Object.assign({}, base, { style: res.tacMod[s] }) : base; };
    const build = () => {
      const TT = [tacticOf(0), tacticOf(1)];
      const LL = [{ formation: L[0].formation, xi: L[0].xi.map((id) => (onPitch[0].indexOf(id) >= 0 ? id : null)) }, { formation: L[1].formation, xi: L[1].xi.map((id) => (onPitch[1].indexOf(id) >= 0 ? id : null)) }];
      const F = [SIM.teamFactors(w, LL[0], TT[0]), SIM.teamFactors(w, LL[1], TT[1])];
      const edge = SIM.tacticEdge(w, LL, TT);
      const lam = SIM.expected(F[0], F[1], opts.neutral, edge);
      const P = [SIM.profile(w, LL[0]), SIM.profile(w, LL[1])];
      const gk = [0, 1].map((s) => { const id = onPitch[s].find((x) => w.players[x].line === 'POR'); return id ? w.players[id] : null; });
      const dfn = [0, 1].map((s) => U.avg(onPitch[s].filter((x) => ['DEF', 'MED'].indexOf(w.players[x].line) >= 0), (x) => w.players[x].at.dfn) || 55);
      const side = [0, 1].map((s) => {
        const o = 1 - s; const t = TT[s];
        const lamOpen = Math.max(0.05, lam[s] * (1 - C.PEN_XG));
        const q = lamOpen / C.LAM_REF;
        const mix = SIM.chanceMix(t, P[s], q);
        const meanXg = Object.keys(mix).reduce((a, k) => a + mix[k] * SIM.CHANCES[k].xg, 0) / Object.keys(mix).reduce((a, k) => a + mix[k], 0);
        return {
          t, lamOpen, mix,
          shotRate: C.SHOTS / 90 * Math.pow(q, C.SHOT_EXP),
          xgScale: (C.LAM_REF * (1 - 0) / C.SHOTS) * Math.pow(q, 1 - C.SHOT_EXP) / meanXg,
          foulRate: C.FOULS / 90 * (t.press === 'alta' ? 1.15 : t.press === 'baja' ? 0.88 : 1) * (t.style === 'defensiva' ? 1.06 : 1) * Math.pow(U.avg(onPitch[s], (x) => w.players[x].at.agr) / 62, 0.6),
          passRate: C.PASSES * (t.passing === 'corto' ? 1.18 : t.passing === 'largo' ? 0.82 : 1) * (t.style === 'defensiva' ? 0.92 : 1),
          passAcc: U.clamp(0.79 + (P[s].pas - 68) * 0.0055 + (P[s].cal - 68) * 0.002 - (TT[o].press === 'alta' ? 0.025 : TT[o].press === 'baja' ? -0.015 : 0) + (t.passing === 'corto' ? 0.025 : t.passing === 'largo' ? -0.065 : 0), 0.6, 0.93),
          cornerRate: C.CORNERS / 90 * Math.pow(q, 0.5) * (P[s].wingers ? 1.12 : 0.95) * (t.style === 'ofensiva' ? 1.12 : t.style === 'defensiva' ? 0.88 : 1),
          offRate: C.OFFSIDES / 90 * (t.passing === 'largo' ? 1.35 : t.passing === 'corto' ? 0.85 : 1) * U.clamp(P[s].delVel / 74, 0.8, 1.25) * (TT[o].press === 'alta' ? 1.2 : 1),
        };
      });
      // posesión: centro del campo, calidad de pase, plan de juego y campo
      const pass = (s) => P[s].pas * 0.6 + P[s].cal * 0.4;
      let poss = 0.5 + (F[0].mid - F[1].mid) * 0.007 + (pass(0) - pass(1)) * 0.006 + (opts.neutral ? 0 : 0.015);
      const tp = (t) => (t.passing === 'corto' ? 0.045 : t.passing === 'largo' ? -0.045 : 0) + (t.style === 'defensiva' ? -0.04 : t.style === 'ofensiva' ? 0.02 : 0) + (t.press === 'alta' ? 0.02 : t.press === 'baja' ? -0.02 : 0);
      poss += tp(TT[0]) - tp(TT[1]);
      M = { TT, edge, lam, P, gk, dfn, side, poss: U.clamp(poss, 0.22, 0.78), key: onPitch[0].join() + '|' + onPitch[1].join() + '|' + res.tacMod.join() };
      res.edge = { A: edge.A, K: edge.K };
    };
    const key = () => onPitch[0].join() + '|' + onPitch[1].join() + '|' + res.tacMod.join();
    build();
    const pickW = (arr, f) => { const ws = arr.map(f); const tot = ws.reduce((a, b) => a + b, 0); if (!(tot > 0)) return R.pick(arr); let x = R() * tot; for (let i = 0; i < arr.length; i++) { x -= ws[i]; if (x <= 0) return arr[i]; } return arr[arr.length - 1]; };
    const gkFactor = (s) => { const g = M.gk[1 - s]; if (!g) return 1.6; const st = res.stam[g.id] || 1; return Math.exp(-(g.at.por - 72) * 0.014) * (st < 0.6 ? 1.05 : 1); };
    // córners y faltas peligrosas quedan como eventos: el campo 2D los escenifica
    const corner = (s, m, shotFrom) => { S.corners[s]++; res.events.push({ type: 'corner', side: s, min: m, shot: !!shotFrom }); };
    const freekick = (s, m, zone, shotFrom) => { res.events.push({ type: 'freekick', side: s, min: m, zone, shot: !!shotFrom }); };
    // tiro: tipo de ocasión → rematador → bloqueo / fuera / parada / gol
    const shot = (s, m, kind, statMul) => {
      const sd = M.side[s]; const o = 1 - s;
      // balón parado: córner, falta lateral (centro) o falta directa
      let setp = null;
      if (kind === 'abp') { const r = R(); setp = r < 0.55 ? 'corner' : r < 0.8 ? 'lateral' : 'directa'; if (setp === 'directa') kind = 'falta'; }
      if (setp === 'corner') corner(s, m, true); else if (setp) freekick(s, m, setp === 'directa' ? 'frontal' : 'lateral', true);
      const ch = SIM.CHANCES[kind];
      const outfield = onPitch[s].filter((id) => w.players[id].line !== 'POR'); if (!outfield.length) return;
      const wk = kind === 'falta' ? 'lejano' : kind;
      const shooter = kind === 'falta' ? outfield.slice().sort((a, b) => (w.players[b].at.tir + w.players[b].at.cal * 0.5) - (w.players[a].at.tir + w.players[a].at.cal * 0.5))[R() < 0.75 ? 0 : 1] || outfield[0] : pickW(outfield, (id) => {
        const p = w.players[id]; const r = roleOf(w, L[s], id);
        const skill = kind === 'cabeza' || kind === 'abp' ? (p.at.agr * 0.4 + p.ovr * 0.6) : kind === 'lejano' ? (p.at.tir * 0.7 + p.at.cal * 0.3) : (p.at.tir * 0.75 + p.at.reg * 0.25);
        return SHOOT_W[wk][r] * Math.pow(skill / 70, 2.2) * (0.6 + 0.4 * (res.stam[id] || 1));
      });
      const p = w.players[shooter]; const stam = res.stam[shooter] || 1;
      const fin = kind === 'cabeza' || kind === 'abp' ? (p.at.agr * 0.35 + p.ovr * 0.65) : (p.at.tir * 0.8 + p.at.cal * 0.2);
      let xg = ch.xg * sd.xgScale * U.clamp(Math.exp((fin - 72) * 0.016), 0.6, 1.5) * (0.85 + 0.15 * stam) * (statMul || 1);
      xg = U.clamp(xg, 0.008, 0.85);
      const pGoal = U.clamp(xg * gkFactor(s), 0.004, 0.92);
      S.shots[s]++; S.xg[s] += xg; if (xg >= 0.3) S.big[s]++;
      let assist = null;
      if (kind !== 'falta' && R() < ASSIST_P[kind]) { const cands = onPitch[s].filter((id) => id !== shooter); if (cands.length) assist = pickW(cands, (id) => (ASSIST_T[kind][roleOf(w, L[s], id)] || 0.3) * Math.pow(w.players[id].at.pas / 70, 2)); }
      const blP = ch.bl * U.clamp(Math.pow(M.dfn[o] / 68, 1.2), 0.7, 1.4);
      if (R() < blP) { S.blocked[s]++; if (R() < 0.35) corner(s, m); if (xg >= 0.3) res.events.push({ type: 'chance', side: s, min: m, pid: shooter, kind, out: 'block' }); return; }
      const pg = pGoal / (1 - blP); const otP = Math.max(ch.ot, Math.min(0.97, pg + 0.06));
      if (R() >= otP) { const post = R() < 0.045; if (xg >= 0.3 || post) res.events.push({ type: 'chance', side: s, min: m, pid: shooter, kind, out: post ? 'post' : 'miss' }); return; }
      S.onTarget[s]++;
      if (R() < pg / otP) {
        res.score[s]++;
        // cómo llega el gol (para narrarlo y escenificarlo en el campo)
        let how = setp === 'directa' ? (R() < 0.25 ? 'barrera' : 'directa') : setp;
        if (!how && kind === 'clara' && R() < 0.24 * U.clamp((p.at.reg + p.at.vel) / 160, 0.6, 1.3)) how = 'regate';
        res.events.push({ type: 'goal', side: s, min: m, pid: shooter, assist, kind, setp: how, xg: Math.round(xg * 100) / 100 });
      } else {
        S.saves[o]++; const g = M.gk[o];
        res.events.push({ type: 'save', side: o, min: m, pid: g ? g.id : null, shooter, kind, big: xg >= 0.3 });
        if (R() < 0.3) corner(s, m);
      }
    };
    const penalty = (s, m) => {
      const outfield = onPitch[s].filter((id) => w.players[id].line !== 'POR'); if (!outfield.length) return;
      const taker = outfield.slice().sort((a, b) => w.players[b].at.tir - w.players[a].at.tir)[0]; const p = w.players[taker];
      const g = M.gk[1 - s]; const pr = U.clamp(C.PEN_GOAL + (p.at.tir - 75) * 0.004 - (g ? (g.at.por - 72) * 0.004 : -0.1), 0.55, 0.92);
      S.shots[s]++; S.xg[s] += C.PEN_GOAL; S.big[s]++;
      if (R() < pr) { S.onTarget[s]++; res.score[s]++; res.events.push({ type: 'goal', side: s, min: m, pid: taker, pen: true, kind: 'pen', xg: C.PEN_GOAL }); return; }
      if (R() < 0.7) { S.onTarget[s]++; S.saves[1 - s]++; res.events.push({ type: 'save', side: 1 - s, min: m, pid: g ? g.id : null, shooter: taker, kind: 'pen', big: true }); }
      else res.events.push({ type: 'chance', side: s, min: m, pid: taker, kind: 'pen', out: 'miss' });
    };

    for (let m = from + 1; m <= to; m++) {
      // cansancio
      for (let s = 0; s < 2; s++) onPitch[s].forEach((id) => { res.stam[id] = Math.max(0.2, res.stam[id] - drainRate(w.players[id], M.edge.drain[s] * (opts.drainMul ? opts.drainMul[s] : 1)) * (m > 45 ? 1.1 : 1)); });
      const avgS = onPitch.map((arr) => U.avg(arr.filter((id) => w.players[id].line !== 'POR'), (id) => res.stam[id]) || 0.8);
      // decisiones del banquillo: plan según el marcador y cambios (IA o segundo entrenador)
      for (let s = 0; s < 2; s++) if (coachOn[s]) SIM.coach(res, s, m, tacticOf(s));
      for (let s = 0; s < 2; s++) {
        if (!auto[s] || res.subsLeft[s] <= 0 || m < 58 || (m > 86 && m < 91) || m > 112 || (m % 7)) continue;
        const tired = onPitch[s].filter((id) => w.players[id].line !== 'POR').sort((a, b) => res.stam[a] - res.stam[b])[0];
        if (!tired || res.stam[tired] > (m >= 77 ? 0.86 : 0.78)) continue;
        const role = roleOf(w, L[s], tired);
        const cand = bench[s].filter((id) => w.players[id].role !== 'POR' && DB.available(w.players[id])).sort((a, b) => DB.effOvr(w.players[b], role) - DB.effOvr(w.players[a], role))[0];
        if (!cand) continue;
        SIM.applySub(res, L[s], s, tired, cand, m, onPitch, bench);
        res.stam[cand] = U.clamp(w.players[cand].fit / 100, 0.5, 1);
      }
      if (M.key !== key()) build();
      // posesión del minuto
      const gd0 = res.score[0] - res.score[1]; const late = m > 70 ? 1.4 : 1;
      const pm = U.clamp(M.poss - U.clamp(gd0, -2, 2) * 0.025 * late - (11 - onPitch[0].length) * 0.05 + (11 - onPitch[1].length) * 0.05, 0.2, 0.8);
      const own = R() < pm ? 0 : 1; S.possT[own]++;
      for (let s = 0; s < 2; s++) {
        const o = 1 - s; const sd = M.side[s];
        // pases del minuto (solo el equipo con el balón)
        if (s === own) {
          const n = Math.max(0, Math.round(sd.passRate * (0.75 + 0.5 * R()) * (0.9 + 0.1 * avgS[s])));
          const acc = U.clamp(sd.passAcc - (1 - avgS[s]) * 0.08, 0.5, 0.95);
          const ok = U.clamp(Math.round(n * acc + R.normal() * Math.sqrt(n * acc * (1 - acc))), 0, n);
          S.passes[s] += n; S.passOk[s] += ok;
        }
        const red = 11 - onPitch[s].length, redO = 11 - onPitch[o].length;
        const fat = U.clamp(0.75 + 0.3 * avgS[s], 0.85, 1.05) * U.clamp(1.25 - 0.3 * avgS[o], 0.95, 1.12);
        // contexto del marcador: el que gana administra, el que pierde arriesga (y deja espacios)
        const gd = res.score[s] - res.score[o];
        const state = gd > 0 ? Math.pow(0.92, Math.min(gd, 3) * late) : gd < 0 ? 1 + 0.1 * Math.min(-gd, 3) * late : (m > 65 && res.score[0] + res.score[1] === 0 ? 1.12 : 1);   // con 0-0 al final, los dos buscan el gol
        const exposed = gd > 0 ? 1 + 0.02 * Math.min(gd, 3) * late : 1;   // el rival que pierde se descubre
        const mult = (1 - red * 0.14) * (1 + redO * 0.16) * (m > 90 ? 0.85 : m > 75 ? 1.08 : 1) * fat * state * exposed;
        if (R() < sd.shotRate * mult) shot(s, m, pickW(Object.keys(sd.mix), (k) => sd.mix[k]));
        if (R() < sd.cornerRate * mult) corner(s, m);
        if (R() < sd.offRate) { S.offsides[s]++; res.events.push({ type: 'offside', side: s, min: m }); }
        if (R() < C.OWN_GOAL / 90 * (M.lam[s] / C.LAM_REF)) {
          const pid = R.pick(onPitch[o].filter((id) => w.players[id].line === 'DEF').concat(onPitch[o])); res.score[s]++;
          res.events.push({ type: 'goal', side: s, min: m, pid, own: true });
        }
        // faltas (de este equipo): más cuando defiende; de ellas salen tarjetas y penaltis
        if (R() < sd.foulRate * (own === s ? 0.65 : 1.35)) {
          S.fouls[s]++;
          // falta en zona de peligro a favor del rival (frontal o lateral): sin remate, también se ve en el campo
          if (own !== s) { const rz = R(); if (rz < 0.06) freekick(o, m, 'frontal'); else if (rz < 0.14) freekick(o, m, 'lateral'); }
          const pid = R.weighted(onPitch[s], (id) => CARD_W[roleOf(w, L[s], id)] * (w.players[id].at.agr / 60));
          if (R() < C.RED) { res.events.push({ type: 'red', side: s, min: m, pid }); onPitch[s] = onPitch[s].filter((x) => x !== pid); }
          else if (R() < C.YELLOW * (w.players[pid].at.agr / 62) * (m > 75 ? 1.15 : 1) * (res.events.some((e) => e.type === 'yellow' && e.pid === pid) ? 0.5 : 1)) {
            const prev = res.events.find((e) => e.type === 'yellow' && e.pid === pid);
            if (prev && R() < C.SECOND_YELLOW) { res.events.push({ type: 'red', side: s, min: m, pid, second: true }); onPitch[s] = onPitch[s].filter((x) => x !== pid); }
            else if (!prev) { S.yellows[s]++; res.events.push({ type: 'yellow', side: s, min: m, pid }); }
          }
          if (R() < C.BOX_FOUL * (own === s ? 0.5 : 1) * (M.lam[o] / C.LAM_REF)) penalty(o, m);
        }
        // lesiones: más probables con el jugador muy cansado
        const injP = (0.11 / 90) * (opts.injuryMul ? opts.injuryMul[s] : 1);
        if (R() < injP * (avgS[s] < 0.55 ? 1.6 : 1)) {
          const pid = R.pick(onPitch[s]);
          res.events.push({ type: 'injury', side: s, min: m, pid, weeks: R.weighted([1, 1, 1, 2, 2, 3, 4, 6, 8, 12], () => 1) });
          if (auto[s] && res.subsLeft[s] > 0) {
            const role = roleOf(w, L[s], pid);
            const cand = bench[s].filter((id) => (w.players[pid].line === 'POR') === (w.players[id].role === 'POR')).sort((a, b) => DB.effOvr(w.players[b], role) - DB.effOvr(w.players[a], role))[0];
            if (cand) { SIM.applySub(res, L[s], s, pid, cand, m, onPitch, bench); res.stam[cand] = U.clamp(w.players[cand].fit / 100, 0.5, 1); }
          }
        }
      }
    }
    res.minute = to;
    // posesión = minutos con el balón (sale de la propia simulación)
    const tp = S.possT[0] + S.possT[1];
    if (tp > 0) { const p0 = Math.round(S.possT[0] / tp * 100); S.poss = [p0, 100 - p0]; }
    res.events.sort((a, b) => a.min - b.min);
    res.fatigue = {}; Object.keys(res.stam).forEach((id) => { res.fatigue[id] = res.stam[id]; });
    res.L = L;   // alineaciones tras los cambios (para continuar el partido por tramos)
    if (to >= (opts.endMinute || 90)) { res.ratings = SIM.ratings(w, res, [{ xi: res.startXI[0] }, { xi: res.startXI[1] }], R); res.done = true; }
    return res;
  };
  // Tanda de penaltis (5 lanzamientos y muerte súbita). xi = jugadores en el campo de cada lado.
  SIM.shootout = function (w, xi0, xi1, R) {
    R = R || U.R;
    const takers = [xi0, xi1].map((xi) => xi.filter((id) => id !== null && w.players[id] && w.players[id].line !== 'POR').sort((a, b) => w.players[b].at.tir - w.players[a].at.tir));
    const gks = [xi0, xi1].map((xi) => w.players[xi.find((id) => id !== null && w.players[id] && w.players[id].line === 'POR')] || { at: { por: 60 }, id: null });
    const p = [0, 0], n = [0, 0], kicks = [];
    const kick = (side) => {
      const list = takers[side]; const id = list[n[side] % Math.max(1, list.length)]; const sh = w.players[id];
      const pr = U.clamp(0.76 + ((sh ? sh.at.tir : 65) - gks[1 - side].at.por) / 320, 0.55, 0.92);
      const goal = R() < pr; n[side]++; if (goal) p[side]++;
      kicks.push({ side, pid: id, gk: gks[1 - side].id, goal, miss: !goal && R() < 0.35 });
    };
    for (let k = 0; k < 5; k++) {
      for (const side of [0, 1]) { kick(side); if (p[0] + (5 - n[0]) < p[1] || p[1] + (5 - n[1]) < p[0]) return { p, kicks }; }
    }
    let g = 0; while (p[0] === p[1] && g++ < 30) { kick(0); kick(1); }
    if (p[0] === p[1]) p[R() < 0.5 ? 0 : 1]++;
    return { p, kicks };
  };

  // Sustitución en la simulación: cambia la alineación (L se modifica) y registra el evento
  SIM.applySub = function (res, L, s, outId, inId, m, onPitch, bench) {
    const i = L.xi.indexOf(outId); if (i >= 0) L.xi[i] = inId;
    if (onPitch) onPitch[s] = onPitch[s].map((x) => (x === outId ? inId : x));
    if (bench) bench[s] = bench[s].filter((x) => x !== inId);
    L.bench = (L.bench || []).filter((x) => x !== inId);
    res.subsIn[s].push(inId); res.subsLeft[s]--;
    res.events.push({ type: 'sub', side: s, min: m, pid: inId, out: outId });
  };

  SIM.emptyResult = (home, away) => ({
    home, away, score: [0, 0], events: [],
    stats: { shots: [0, 0], onTarget: [0, 0], corners: [0, 0], fouls: [0, 0], poss: [50, 50], blocked: [0, 0], saves: [0, 0], xg: [0, 0], big: [0, 0], passes: [0, 0], passOk: [0, 0], offsides: [0, 0], yellows: [0, 0], possT: [0, 0] },
    ratings: {}, done: false,
  });

  // Valoraciones individuales (escala 1-10)
  SIM.ratings = function (w, res, L, R) {
    R = R || U.R;
    const out = {};
    for (let s = 0; s < 2; s++) {
      const gf = res.score[s], ga = res.score[1 - s];
      const ids = L[s].xi.filter((x) => x !== null).concat(res.subsIn ? res.subsIn[s] || [] : []);
      ids.forEach((id) => {
        const p = w.players[id]; if (!p) return;
        let r = 6.0 + (p.ovr - 72) * 0.03 + R.normal() * 0.45 + (gf > ga ? 0.4 : gf < ga ? -0.35 : 0);
        if (p.line === 'POR' || p.line === 'DEF') r += ga === 0 ? 0.5 : -0.18 * Math.min(ga, 5);
        out[id] = r;
      });
    }
    res.events.forEach((e) => {
      if (e.type === 'goal') { if (out[e.pid] !== undefined) out[e.pid] += 1.0; if (e.assist && out[e.assist] !== undefined) out[e.assist] += 0.6; }
      if (e.type === 'yellow' && out[e.pid] !== undefined) out[e.pid] -= 0.3;
      if (e.type === 'red' && out[e.pid] !== undefined) out[e.pid] -= 1.5;
      if (e.type === 'save' && out[e.pid] !== undefined) out[e.pid] += e.kind === 'pen' ? 0.8 : e.big ? 0.35 : 0.14;
      if (e.type === 'chance' && out[e.pid] !== undefined && e.out !== 'block') out[e.pid] -= e.kind === 'pen' ? 0.5 : 0.15;
    });
    Object.keys(out).forEach((k) => { out[k] = Math.round(U.clamp(out[k], 3, 10) * 10) / 10; });
    return out;
  };

  MF.SIM = SIM;
})(typeof window !== 'undefined' ? window : globalThis);
