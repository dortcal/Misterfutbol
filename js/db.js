/* MÍSTER FÚTBOL 26·27 — base de datos en memoria, formaciones y alineaciones */
(function (G) {
  'use strict';
  const MF = G.MF; const U = MF.U;
  const DB = {};

  DB.SEASON_LABEL = (y) => y + '/' + String((y + 1) % 100).padStart(2, '0');

  // ---------- Formaciones (x: 0 propia portería → 1 portería rival; y: 0 banda izquierda → 1 derecha)
  DB.FORMATIONS = {
    '4-4-2': [['POR', .04, .5], ['LI', .21, .13], ['DFC', .17, .38], ['DFC', .17, .62], ['LD', .21, .87], ['EI', .43, .15], ['MC', .40, .39], ['MC', .40, .61], ['ED', .43, .85], ['DC', .63, .40], ['DC', .63, .60]],
    '4-3-3': [['POR', .04, .5], ['LI', .21, .13], ['DFC', .17, .38], ['DFC', .17, .62], ['LD', .21, .87], ['MC', .40, .30], ['MCD', .34, .5], ['MC', .40, .70], ['EI', .62, .16], ['DC', .66, .5], ['ED', .62, .84]],
    '4-2-3-1': [['POR', .04, .5], ['LI', .21, .13], ['DFC', .17, .38], ['DFC', .17, .62], ['LD', .21, .87], ['MCD', .34, .40], ['MCD', .34, .60], ['EI', .52, .16], ['MCO', .52, .5], ['ED', .52, .84], ['DC', .67, .5]],
    '3-5-2': [['POR', .04, .5], ['DFC', .18, .27], ['DFC', .16, .5], ['DFC', .18, .73], ['LI', .42, .09], ['MC', .38, .34], ['MCD', .33, .5], ['MC', .38, .66], ['LD', .42, .91], ['DC', .63, .40], ['DC', .63, .60]],
    '5-3-2': [['POR', .04, .5], ['LI', .25, .09], ['DFC', .18, .30], ['DFC', .16, .5], ['DFC', .18, .70], ['LD', .25, .91], ['MC', .39, .30], ['MCD', .36, .5], ['MC', .39, .70], ['DC', .62, .40], ['DC', .62, .60]],
    '4-1-4-1': [['POR', .04, .5], ['LI', .21, .13], ['DFC', .17, .38], ['DFC', .17, .62], ['LD', .21, .87], ['MCD', .31, .5], ['EI', .46, .15], ['MC', .44, .39], ['MC', .44, .61], ['ED', .46, .85], ['DC', .65, .5]],
  };
  DB.LINE_OF = { POR: 'POR', DFC: 'DEF', LD: 'DEF', LI: 'DEF', MCD: 'MED', MC: 'MED', MCO: 'MED', ED: 'DEL', EI: 'DEL', DC: 'DEL' };
  DB.ROLE_NAME = { POR: 'Portero', DFC: 'Defensa central', LD: 'Lateral derecho', LI: 'Lateral izquierdo', MCD: 'Mediocentro defensivo', MC: 'Centrocampista', MCO: 'Mediapunta', ED: 'Extremo derecho', EI: 'Extremo izquierdo', DC: 'Delantero centro' };

  // Penalización por jugar fuera de su demarcación
  DB.rolePenalty = function (playerRole, slotRole) {
    if (playerRole === slotRole) return 0;
    if (playerRole === 'POR' || slotRole === 'POR') return 45;
    const pair = playerRole + '>' + slotRole;
    const P = {
      'LD>LI': 4, 'LI>LD': 4, 'DFC>LD': 6, 'DFC>LI': 6, 'LD>DFC': 6, 'LI>DFC': 6,
      'MCD>MC': 2, 'MC>MCD': 3, 'MC>MCO': 3, 'MCO>MC': 3, 'MCD>MCO': 7, 'MCO>MCD': 8,
      'ED>EI': 3, 'EI>ED': 3, 'ED>DC': 5, 'EI>DC': 5, 'DC>ED': 6, 'DC>EI': 6,
      'MCO>ED': 5, 'MCO>EI': 5, 'ED>MCO': 5, 'EI>MCO': 5, 'MCO>DC': 6, 'DC>MCO': 7,
      'MCD>DFC': 6, 'DFC>MCD': 7, 'LD>ED': 7, 'LI>EI': 7, 'ED>LD': 8, 'EI>LI': 8, 'MC>ED': 7, 'MC>EI': 7, 'ED>MC': 7, 'EI>MC': 7,
    };
    if (P[pair] !== undefined) return P[pair];
    const la = DB.LINE_OF[playerRole], lb = DB.LINE_OF[slotRole];
    if (la === lb) return 6;
    if ((la === 'DEF' && lb === 'MED') || (la === 'MED' && lb === 'DEF')) return 11;
    if ((la === 'MED' && lb === 'DEL') || (la === 'DEL' && lb === 'MED')) return 9;
    return 20;
  };

  // ---------- Economía
  DB.playerValue = function (p) {
    const base = 0.6 * Math.exp((p.ovr - 60) * 0.17);
    const a = p.age;
    const f = a <= 21 ? 1.6 : a <= 24 ? 1.3 : a <= 28 ? 1.0 : a <= 30 ? 0.75 : a <= 32 ? 0.5 : 0.3;
    return Math.max(0.05, Math.round(base * f * 10) / 10);
  };
  DB.playerWage = function (p) { // M€ por temporada
    return Math.max(0.05, Math.round(0.45 * Math.exp((p.ovr - 62) * 0.13) * 100) / 100);
  };

  // ---------- Construcción del mundo a partir de los datos
  const GK_KITS = ['#39d353', '#ff7a1a', '#1b1b1b', '#f6e03b', '#8f3bd6', '#13c2c2', '#ff4fa3', '#9be15d'];
  function colorDist(a, b) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const dr = (pa >> 16) - (pb >> 16), dg = ((pa >> 8) & 255) - ((pb >> 8) & 255), db = (pa & 255) - (pb & 255);
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }
  DB.colorDist = colorDist;

  DB.makePlayer = function (row) {
    const [id, team, num, name, line, role, ovr, age, tone, hair, nat, vel, res, agr, cal, pas, tir, reg, dfn, por, gen] = row;
    const p = {
      id, team, num, name, short: U.surname(name), line, role, ovr, age, tone, hair, nat,
      at: { vel, res, agr, cal, pas, tir, reg, dfn, por }, gen: !!gen,
      fit: 100, mor: 70, inj: 0, sus: 0, yel: 0,
      st: { pj: 0, g: 0, a: 0, ta: 0, tr: 0, rat: 0, ps: 0 },
      pot: 0,
    };
    p.pot = Math.min(94, ovr + (age <= 20 ? 8 : age <= 23 ? 4 : age <= 26 ? 1 : 0) + (U.hash(name) % 5));
    p.value = DB.playerValue(p); p.wage = DB.playerWage(p);
    return p;
  };

  DB.makeWorld = function () {
    const teams = {}, players = {};
    (G.MF_TEAMS || []).forEach((t) => {
      const tt = JSON.parse(JSON.stringify(t));
      let gk = GK_KITS[U.hash(t.id) % GK_KITS.length];
      let guard = 0;
      while ((colorDist(gk, t.kit.home.p) < 140 || colorDist(gk, t.kit.away.p) < 140) && guard++ < 10) gk = GK_KITS[(U.hash(t.id) + guard) % GK_KITS.length];
      tt.kit.gk = { p: gk, s: '#111111', pat: 'plain', sh: '#111111', so: gk };
      tt.formation = '4-4-2'; tt.style = 'equilibrada'; tt.press = 'media'; tt.passing = 'mixto';
      tt.mor = 70; tt.ticket = t.div === 1 ? 45 : 22; tt.fans = 0.85;
      teams[t.id] = tt;
    });
    (G.MF_PLAYERS || []).forEach((r) => { const p = DB.makePlayer(r); players[p.id] = p; });
    const w = { teams, players, nextPid: Math.max.apply(null, Object.keys(players).map(Number)) + 1 };
    Object.values(teams).forEach((t) => { const l = DB.autoLineup(w, t.id); t.formation = DB.bestFormation(w, t.id); });
    return w;
  };

  DB.teamPlayers = (w, tid) => Object.values(w.players).filter((p) => p.team === tid);
  DB.available = (p) => p.inj <= 0 && p.sus <= 0;

  // Efectividad del jugador en un puesto (media ajustada por forma y moral)
  DB.effOvr = function (p, slotRole) {
    const pen = slotRole ? DB.rolePenalty(p.role, slotRole) : 0;
    return p.ovr - pen - (100 - p.fit) * 0.12 + (p.mor - 70) * 0.04;
  };

  // Alineación automática: asigna los mejores jugadores disponibles a cada puesto
  DB.autoLineup = function (w, tid, formation, opts) {
    const t = w.teams[tid];
    formation = formation || t.formation || '4-4-2';
    const slots = DB.FORMATIONS[formation];
    const pool = DB.teamPlayers(w, tid).filter((p) => DB.available(p) || (opts && opts.ignoreAvail));
    const xi = new Array(11).fill(null); const used = new Set();
    // Pares (puesto, jugador) ordenados por idoneidad
    const pairs = [];
    slots.forEach((s, i) => pool.forEach((p) => pairs.push([i, p, DB.effOvr(p, s[0]) + (s[0] === 'POR' ? 5 : 0)])));
    pairs.sort((a, b) => b[2] - a[2]);
    for (const [i, p] of pairs) {
      if (xi[i] !== null || used.has(p.id)) continue;
      xi[i] = p.id; used.add(p.id);
    }
    const rest = pool.filter((p) => !used.has(p.id)).sort((a, b) => DB.effOvr(b) - DB.effOvr(a));
    // Banquillo: 1 portero + los mejores 8
    const bench = [];
    const gk = rest.find((p) => p.role === 'POR'); if (gk) bench.push(gk.id);
    rest.forEach((p) => { if (bench.length < 9 && bench.indexOf(p.id) < 0) bench.push(p.id); });
    return { formation, xi, bench };
  };

  DB.lineupRating = function (w, lineup) {
    const slots = DB.FORMATIONS[lineup.formation];
    return U.avg(lineup.xi.filter((x) => x !== null), (id) => DB.effOvr(w.players[id], slots[lineup.xi.indexOf(id)][0]));
  };

  DB.bestFormation = function (w, tid) {
    let best = '4-4-2', bv = -1;
    Object.keys(DB.FORMATIONS).forEach((f) => {
      const l = DB.autoLineup(w, tid, f, { ignoreAvail: true });
      const v = DB.lineupRating(w, l) + (f === '4-4-2' || f === '4-3-3' || f === '4-2-3-1' ? 0.3 : 0);
      if (v > bv) { bv = v; best = f; }
    });
    return best;
  };

  DB.teamStrength = function (w, tid) {
    const l = DB.autoLineup(w, tid, w.teams[tid].formation, { ignoreAvail: true });
    return DB.lineupRating(w, l);
  };

  // Valida una alineación guardada (por si hay lesionados o vendidos) y la completa
  DB.validLineup = function (w, tid, lineup) {
    if (!lineup) return DB.autoLineup(w, tid);
    const ok = lineup.xi.every((id) => id !== null && w.players[id] && w.players[id].team === tid && DB.available(w.players[id]));
    if (ok && new Set(lineup.xi).size === 11) {
      const bench = (lineup.bench || []).filter((id) => w.players[id] && w.players[id].team === tid && DB.available(w.players[id]) && lineup.xi.indexOf(id) < 0);
      return { formation: lineup.formation, xi: lineup.xi.slice(), bench };
    }
    // Sustituye solo los huecos no válidos
    const auto = DB.autoLineup(w, tid, lineup.formation);
    const slots = DB.FORMATIONS[lineup.formation];
    const xi = lineup.xi.map((id) => (id !== null && w.players[id] && w.players[id].team === tid && DB.available(w.players[id]) ? id : null));
    const used = new Set(xi.filter((x) => x !== null));
    const pool = DB.teamPlayers(w, tid).filter((p) => DB.available(p) && !used.has(p.id));
    xi.forEach((id, i) => {
      if (id !== null) return;
      pool.sort((a, b) => DB.effOvr(b, slots[i][0]) - DB.effOvr(a, slots[i][0]));
      const p = pool.shift();
      xi[i] = p ? p.id : auto.xi[i];
    });
    const bench = DB.teamPlayers(w, tid).filter((p) => DB.available(p) && xi.indexOf(p.id) < 0).sort((a, b) => b.ovr - a.ovr).slice(0, 9).map((p) => p.id);
    return { formation: lineup.formation, xi, bench };
  };

  MF.DB = DB;
})(typeof window !== 'undefined' ? window : globalThis);
