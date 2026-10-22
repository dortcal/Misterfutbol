// Banco de pruebas estadísticas del motor (SIM.play). Uso: node tools/calib.js [etiqueta] [vueltas]
// Simula ligas completas de Primera y Segunda, tácticas, fatiga, porteros y partidos por tramos con semillas fijas,
// y guarda el informe en tools/result_<etiqueta>.json para comparar antes y después de cada cambio.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..', 'js') + '/';
globalThis.window = undefined;
const lib = (f, fix) => { let c = fs.readFileSync(root + f, 'utf8'); if (fix) c = c.replace(fix[0], fix[1]); vm.runInThisContext(c, { filename: f }); };
lib('data/teams.js', ['window.MF_TEAMS', 'globalThis.MF_TEAMS']); lib('data/players.js', ['window.MF_PLAYERS', 'globalThis.MF_PLAYERS']);
['data/world.js', 'data/youth.js', 'util.js', 'achievements.js', 'db.js', 'sim.js', 'match.js', 'league.js', 'europe.js'].forEach((f) => lib(f));
const MF = globalThis.MF;
const { LG, DB, SIM, U } = MF;
const TAG = process.argv[2] || 'run'; const REPS = +(process.argv[3] || 8);
const st = LG.newCareer({ team: 'rma', name: 'T', seed: 1 });
const w = st.world; const D1 = st.div[1].slice(), D2 = st.div[2].slice();
const L = (tid) => DB.autoLineup(w, tid, w.teams[tid].formation);
const str = (tid) => DB.teamStrength(w, tid);
const out = { tag: TAG, reps: REPS, date: new Date().toISOString() };
const play = (h, a, seed, extra) => { const LL = [L(h), L(a)]; const f = { h, a, key: 'x', comp: 1 }; return SIM.play(w, LG.simOpts(st, f, LL, U.rng(seed), extra)); };
const pct = (x) => Math.round(x * 1000) / 10;
// ---------- A + G: dobles vueltas completas de Primera y Segunda
function league(div, reps) {
  const R = { n: 0, g: 0, gh: 0, ga: 0, H: 0, D: 0, A: 0, sc: {}, m3: 0, m4: 0, nil: 0, sh: 0, ot: 0, bl: 0, cor: 0, fou: 0, yel: 0, red: 0, pen: 0, xg: 0, pass: 0, passOk: 0, off: 0, possSd: 0, viol: [] };
  const champ = [], last = [], bucket = {};
  for (let r = 0; r < reps; r++) {
    const pts = {}; div.forEach((t) => (pts[t] = 0));
    div.forEach((h, i) => div.forEach((a, j) => {
      if (h === a) return; const res = play(h, a, (r * 1e6 + i * 1000 + j) >>> 0);
      const [x, y] = res.score; R.n++; R.g += x + y; R.gh += x; R.ga += y;
      if (x > y) { R.H++; pts[h] += 3; } else if (x === y) { R.D++; pts[h]++; pts[a]++; } else { R.A++; pts[a] += 3; }
      const k = x + '-' + y; R.sc[k] = (R.sc[k] || 0) + 1; if (Math.abs(x - y) >= 3) R.m3++; if (Math.abs(x - y) >= 4) R.m4++; if (x + y === 0) R.nil++;
      const S = res.stats; R.sh += S.shots[0] + S.shots[1]; R.ot += S.onTarget[0] + S.onTarget[1]; R.cor += S.corners[0] + S.corners[1]; R.fou += S.fouls[0] + S.fouls[1];
      if (S.blocked) R.bl += S.blocked[0] + S.blocked[1]; if (S.xg) R.xg += S.xg[0] + S.xg[1]; if (S.passes) { R.pass += S.passes[0] + S.passes[1]; R.passOk += S.passOk[0] + S.passOk[1]; } if (S.offsides) R.off += S.offsides[0] + S.offsides[1];
      R.possSd += Math.abs(S.poss[0] - 50);
      res.events.forEach((e) => { if (e.type === 'yellow') R.yel++; if (e.type === 'red') R.red++; if (e.type === 'goal' && e.pen) R.pen++; });
      // ---------- F: coherencia
      for (let s = 0; s < 2; s++) {
        const goalsShot = res.events.filter((e) => e.type === 'goal' && e.side === s && !e.own).length;
        if (S.onTarget[s] < goalsShot) R.viol.push('a puerta < goles ' + k);
        if (S.shots[s] < S.onTarget[s] + (S.blocked ? S.blocked[s] : 0)) R.viol.push('tiros < a puerta + bloqueados');
        if (S.saves && S.saves[s] !== S.onTarget[1 - s] - res.events.filter((e) => e.type === 'goal' && e.side === 1 - s && !e.own).length) R.viol.push('paradas incoherentes');
        if (S.passOk && S.passOk[s] > S.passes[s]) R.viol.push('pases completados > intentados');
      }
      if (res.events.filter((e) => e.type === 'goal' && e.side === 0).length !== x || res.events.filter((e) => e.type === 'goal' && e.side === 1).length !== y) R.viol.push('marcador ≠ eventos de gol');
      if (S.poss[0] + S.poss[1] !== 100) R.viol.push('posesión no suma 100');
      // calidad: diferencia de fuerza (local - visitante)
      const d = Math.round((str(h) - str(a)) / 3) * 3; const B = bucket[d] = bucket[d] || { n: 0, W: 0, D: 0, L: 0, gd: 0 };
      B.n++; B.gd += x - y; if (x > y) B.W++; else if (x === y) B.D++; else B.L++;
    }));
    const tab = Object.values(pts).sort((p, q) => q - p); champ.push(tab[0]); last.push(tab[tab.length - 1]);
  }
  const n = R.n;
  return {
    partidos: n, goles: +(R.g / n).toFixed(2), golesLocal: +(R.gh / n).toFixed(2), golesVisit: +(R.ga / n).toFixed(2),
    local: pct(R.H / n), empate: pct(R.D / n), visitante: pct(R.A / n), cero_cero: pct(R.nil / n), margen3: pct(R.m3 / n), margen4: pct(R.m4 / n),
    marcadores: Object.entries(R.sc).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => k + ' ' + pct(v / n) + '%').join(', '),
    tirosEquipo: +(R.sh / n / 2).toFixed(1), aPuertaEquipo: +(R.ot / n / 2).toFixed(1), bloqueadosEquipo: +(R.bl / n / 2).toFixed(1), conversion: pct(R.g / R.sh), golesPorAPuerta: pct(R.g / R.ot),
    xgPartido: +(R.xg / n).toFixed(2), corners: +(R.cor / n).toFixed(1), faltas: +(R.fou / n).toFixed(1), amarillas: +(R.yel / n).toFixed(2), rojas: +(R.red / n).toFixed(2), penaltis: +(R.pen / n).toFixed(2),
    pases: +(R.pass / n / 2).toFixed(0), aciertoPase: R.pass ? pct(R.passOk / R.pass) : null, fuerasJuego: +(R.off / n).toFixed(1), posesionDesvMedia: +(R.possSd / n).toFixed(1),
    campeonPts: +(champ.reduce((a, b) => a + b, 0) / champ.length).toFixed(1), colistaPts: +(last.reduce((a, b) => a + b, 0) / last.length).toFixed(1),
    porDiferencia: Object.keys(bucket).map(Number).sort((a, b) => a - b).filter((k) => bucket[k].n >= 40).map((k) => { const B = bucket[k]; return (k > 0 ? '+' : '') + k + ': ' + pct(B.W / B.n) + '/' + pct(B.D / B.n) + '/' + pct(B.L / B.n) + ' (n' + B.n + ')'; }),
    incoherencias: R.viol.length, ejemplos: [...new Set(R.viol)].slice(0, 5),
  };
}
const t0 = Date.now();
out.A_primera = league(D1, REPS);
out.A_segunda = league(D2, Math.max(2, Math.round(REPS / 2)));
// ---------- C: tácticas (mismo emparejamiento, equipos parecidos)
const pairs = [['rso', 'vil'], ['bet', 'val'], ['ath', 'sev'], ['osa', 'cel']];
const tacs = { base: {}, ofensiva: { style: 'ofensiva' }, defensiva: { style: 'defensiva' }, presionAlta: { press: 'alta' }, corto: { passing: 'corto' }, largo: { passing: 'largo' } };
out.C_tacticas = {};
Object.entries(tacs).forEach(([nm, t]) => {
  let n = 0, pts = 0, gf = 0, gc = 0, sh = 0, sha = 0, pos = 0;
  pairs.forEach(([h, a], pi) => { for (let k = 0; k < 300; k++) {
    const LL = [L(h), L(a)]; const T0 = Object.assign({ style: 'equilibrada', press: 'media', passing: 'mixto' }, t);
    const res = SIM.play(w, { home: h, away: a, lhome: LL[0], laway: LL[1], thome: T0, taway: { style: 'equilibrada', press: 'media', passing: 'mixto' }, rng: U.rng(pi * 1e5 + k + 7) });
    n++; gf += res.score[0]; gc += res.score[1]; pts += res.score[0] > res.score[1] ? 3 : res.score[0] === res.score[1] ? 1 : 0; sh += res.stats.shots[0]; sha += res.stats.shots[1]; pos += res.stats.poss[0];
  } });
  out.C_tacticas[nm] = { ptsPorPartido: +(pts / n).toFixed(2), gf: +(gf / n).toFixed(2), gc: +(gc / n).toFixed(2), tiros: +(sh / n).toFixed(1), tirosRival: +(sha / n).toFixed(1), posesion: +(pos / n).toFixed(1) };
});
// ---------- D: fatiga (el local sale con el 70% de forma física)
const fatigue = (fit) => { let gf = 0, gc = 0, n = 0, pts = 0; pairs.forEach(([h, a], pi) => { const sq = DB.teamPlayers(w, h); const keep = sq.map((p) => p.fit); sq.forEach((p) => { p.fit = fit; });
  for (let k = 0; k < 300; k++) { const res = play(h, a, pi * 7e5 + k); n++; gf += res.score[0]; gc += res.score[1]; pts += res.score[0] > res.score[1] ? 3 : res.score[0] === res.score[1] ? 1 : 0; }
  sq.forEach((p, i) => { p.fit = keep[i]; }); }); return { pts: +(pts / n).toFixed(2), gf: +(gf / n).toFixed(2), gc: +(gc / n).toFixed(2) }; };
out.D_fatiga = { descansado: fatigue(100), forma85: fatigue(85), forma70: fatigue(70) };
// ---------- E: porteros (el portero titular del local con ±12 en portería)
const gk = (delta) => { let gc = 0, n = 0, sv = 0; pairs.forEach(([h, a], pi) => { const g = DB.teamPlayers(w, h).filter((p) => p.role === 'POR').sort((x, y) => y.ovr - x.ovr)[0]; const k0 = [g.at.por, g.ovr]; g.at.por += delta; g.ovr += delta;
  for (let k = 0; k < 300; k++) { const res = play(h, a, pi * 9e5 + k); n++; gc += res.score[1]; if (res.stats.saves) sv += res.stats.saves[0]; }
  g.at.por = k0[0]; g.ovr = k0[1]; }); return { golesEncajados: +(gc / n).toFixed(2), paradas: +(sv / n).toFixed(1) }; };
out.E_porteros = { peor12: gk(-12), igual: gk(0), mejor12: gk(12) };
// ---------- H: estabilidad (tramos, prórroga, valores imposibles)
let bad = 0; for (let k = 0; k < 300; k++) {
  const h = D1[k % 20], a = D1[(k * 7 + 3) % 20]; if (h === a) continue; const LL = [L(h), L(a)]; const R = U.rng(k + 99);
  let res = null; for (const to of [30, 45, 60, 75, 90, 105, 120]) res = SIM.play(w, { home: h, away: a, lhome: res ? res.L[0] : LL[0], laway: res ? res.L[1] : LL[1], rng: R, fromMinute: res ? res.minute : 0, toMinute: to, endMinute: 120, base: res, autoSubs: [true, true] });
  const S = res.stats; if (!res.done || res.score.some((v) => !(v >= 0 && v < 20)) || S.poss.some((v) => !(v >= 0 && v <= 100)) || res.subsLeft.some((v) => v < 0)) bad++;
  if (Object.values(res.ratings).some((r) => !(r >= 1 && r <= 10))) bad++;
}
out.H_estabilidad = { partidosPorTramos: 300, errores: bad };
out.segundos = Math.round((Date.now() - t0) / 1000);
fs.writeFileSync(__dirname + '/result_' + TAG + '.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
