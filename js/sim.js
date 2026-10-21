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
    let def = DEF * 0.45 + MED * 0.3 + POR * 0.25;
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
      if (T.style === 'equilibrada') { add(s, 'A', 1.02, 'Equipo compensado'); add(s, 'K', 0.98, null); }
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
    let lh = 1.24 * Math.exp((fh.att - fa.def) * 0.034 + (neutral ? 0 : 0.12));
    let la = 1.05 * Math.exp((fa.att - fh.def) * 0.034 - (neutral ? -0.1 : 0));
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
  SIM.play = function (w, opts) {
    const R = opts.rng || U.R;
    const cl = (l) => ({ formation: l.formation, xi: l.xi.slice(), bench: (l.bench || []).slice() });
    const L = [cl(opts.lhome), cl(opts.laway)];
    const T = [w.teams[opts.home], w.teams[opts.away]];
    const TT = [opts.thome || T[0], opts.taway || T[1]];
    const F = [SIM.teamFactors(w, L[0], TT[0]), SIM.teamFactors(w, L[1], TT[1])];
    const edge = SIM.tacticEdge(w, L, TT);
    const lam = SIM.expected(F[0], F[1], opts.neutral, edge);
    const from = opts.fromMinute || 0; const to = opts.toMinute || 90;
    const res = opts.base ? JSON.parse(JSON.stringify(opts.base)) : SIM.emptyResult(opts.home, opts.away);
    res.subsIn = res.subsIn || [[], []]; res.subsLeft = res.subsLeft || [5, 5]; res.stam = res.stam || {};
    res.edge = { A: edge.A, K: edge.K };
    if (!res.startXI) res.startXI = [L[0].xi.slice(), L[1].xi.slice()];
    const onPitch = [L[0].xi.filter((x) => x !== null).slice(), L[1].xi.filter((x) => x !== null).slice()];
    res.events.forEach((e) => { if (e.type === 'red') { const s = e.side; onPitch[s] = onPitch[s].filter((x) => x !== e.pid); } });
    onPitch.forEach((arr) => arr.forEach((id) => { if (res.stam[id] === undefined) res.stam[id] = U.clamp(w.players[id].fit / 100, 0.4, 1); }));
    const slotRole = (s, id) => { const i = L[s].xi.indexOf(id); return i >= 0 ? DB.FORMATIONS[L[s].formation][i][0] : w.players[id].role; };
    const auto = opts.autoSubs || [true, true];
    const bench = [0, 1].map((s) => (L[s].bench || []).filter((id) => w.players[id] && res.subsIn[s].indexOf(id) < 0 && onPitch[s].indexOf(id) < 0 && !res.events.some((e) => e.type === 'sub' && e.out === id)));

    for (let m = from + 1; m <= to; m++) {
      // cansancio
      for (let s = 0; s < 2; s++) onPitch[s].forEach((id) => { res.stam[id] = Math.max(0.2, res.stam[id] - drainRate(w.players[id], edge.drain[s] * (opts.drainMul ? opts.drainMul[s] : 1)) * (m > 45 ? 1.1 : 1)); });
      const avgS = onPitch.map((arr) => U.avg(arr.filter((id) => w.players[id].line !== 'POR'), (id) => res.stam[id]) || 0.8);
      // cambios automáticos (IA o segundo entrenador)
      for (let s = 0; s < 2; s++) {
        if (!auto[s] || res.subsLeft[s] <= 0 || m < 58 || m > 86 || (m % 7)) continue;
        const tired = onPitch[s].filter((id) => w.players[id].line !== 'POR').sort((a, b) => res.stam[a] - res.stam[b])[0];
        if (!tired || res.stam[tired] > (m >= 77 ? 0.86 : 0.78)) continue;
        const role = slotRole(s, tired);
        const cand = bench[s].filter((id) => w.players[id].role !== 'POR' && DB.available(w.players[id])).sort((a, b) => DB.effOvr(w.players[b], role) - DB.effOvr(w.players[a], role))[0];
        if (!cand) continue;
        SIM.applySub(res, L[s], s, tired, cand, m, onPitch, bench);
        res.stam[cand] = U.clamp(w.players[cand].fit / 100, 0.5, 1);
      }
      for (let s = 0; s < 2; s++) {
        const red = 11 - onPitch[s].length, redO = 11 - onPitch[1 - s].length;
        // el cansancio propio resta llegada y el del rival le abre espacios
        const fat = U.clamp(0.75 + 0.3 * avgS[s], 0.85, 1.05) * U.clamp(1.25 - 0.3 * avgS[1 - s], 0.95, 1.12);
        let pm = (lam[s] / 90) * (1 - red * 0.13) * (1 + redO * 0.15) * (m > 75 ? 1.1 : 1) * fat;
        // goleadas raras: con ventaja clara el equipo levanta el pie
        const diff = res.score[s] - res.score[1 - s];
        if (diff >= 3) pm *= 0.6; if (res.score[s] >= 5) pm *= 0.5;
        if (R() < pm * 6.2) { res.stats.shots[s]++; if (R() < 0.36) res.stats.onTarget[s]++; }
        if (R() < pm) {
          const scorer = R.weighted(onPitch[s], (id) => SCORE_W[slotRole(s, id)] * Math.pow(w.players[id].at.tir / 70, 2.2));
          let assist = null;
          if (R() < 0.72) {
            const cands = onPitch[s].filter((id) => id !== scorer);
            assist = R.weighted(cands, (id) => ASSIST_W[slotRole(s, id)] * Math.pow(w.players[id].at.pas / 70, 2));
          }
          res.score[s]++; res.stats.shots[s]++; res.stats.onTarget[s]++;
          res.events.push({ type: 'goal', side: s, min: m, pid: scorer, assist, pen: R() < 0.09 });
        }
        if (R() < (lam[s] / 90) * 1.9) res.stats.corners[s]++;
        if (R() < 12.5 / 90) res.stats.fouls[s]++;
        // Tarjetas
        if (R() < 2.1 / 90) {
          const pid = R.weighted(onPitch[s], (id) => CARD_W[slotRole(s, id)] * (w.players[id].at.agr / 60));
          const prev = res.events.find((e) => e.type === 'yellow' && e.pid === pid);
          if (prev) { res.events.push({ type: 'red', side: s, min: m, pid, second: true }); onPitch[s] = onPitch[s].filter((x) => x !== pid); }
          else res.events.push({ type: 'yellow', side: s, min: m, pid });
        } else if (R() < 0.07 / 90) {
          const pid = R.weighted(onPitch[s], (id) => CARD_W[slotRole(s, id)]);
          res.events.push({ type: 'red', side: s, min: m, pid }); onPitch[s] = onPitch[s].filter((x) => x !== pid);
        }
        // lesiones: más probables con el jugador muy cansado
        const injP = (0.11 / 90) * (opts.injuryMul ? opts.injuryMul[s] : 1);
        if (R() < injP * (avgS[s] < 0.55 ? 1.6 : 1)) {
          const pid = R.pick(onPitch[s]);
          res.events.push({ type: 'injury', side: s, min: m, pid, weeks: R.weighted([1, 1, 1, 2, 2, 3, 4, 6, 8, 12], () => 1) });
          // el lesionado sale si quedan cambios
          if (auto[s] && res.subsLeft[s] > 0) {
            const role = slotRole(s, pid);
            const cand = bench[s].filter((id) => (w.players[pid].line === 'POR') === (w.players[id].role === 'POR')).sort((a, b) => DB.effOvr(w.players[b], role) - DB.effOvr(w.players[a], role))[0];
            if (cand) { SIM.applySub(res, L[s], s, pid, cand, m, onPitch, bench); res.stam[cand] = U.clamp(w.players[cand].fit / 100, 0.5, 1); }
          }
        }
      }
    }
    res.minute = to;
    // posesión
    if (!opts.base || !res.stats.possSet) {
      const pos = U.clamp(50 + (F[0].mid - F[1].mid) * 1.1 + (edge.A[0] - edge.A[1]) * 40 + (opts.neutral ? 0 : 2) + R.normal() * 4, 28, 72);
      res.stats.poss = [Math.round(pos), 100 - Math.round(pos)]; res.stats.possSet = true;
    }
    res.events.sort((a, b) => a.min - b.min);
    res.fatigue = {}; Object.keys(res.stam).forEach((id) => { res.fatigue[id] = res.stam[id]; });
    res.L = L;   // alineaciones tras los cambios (para continuar el partido por tramos)
    if (to >= 90) { res.ratings = SIM.ratings(w, res, [{ xi: res.startXI[0] }, { xi: res.startXI[1] }], R); res.done = true; }
    return res;
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
    stats: { shots: [0, 0], onTarget: [0, 0], corners: [0, 0], fouls: [0, 0], poss: [50, 50] },
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
      if (e.type === 'save' && out[e.pid] !== undefined) out[e.pid] += 0.12;
    });
    Object.keys(out).forEach((k) => { out[k] = Math.round(U.clamp(out[k], 3, 10) * 10) / 10; });
    return out;
  };

  MF.SIM = SIM;
})(typeof window !== 'undefined' ? window : globalThis);
