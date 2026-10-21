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
    return { att, def, mid: MED, style: tactic.style || 'equilibrada', press: tactic.press || 'media' };
  };

  SIM.expected = function (fh, fa, neutral) {
    let lh = 1.35 * Math.exp((fh.att - fa.def) * 0.036 + (neutral ? 0 : 0.12));
    let la = 1.12 * Math.exp((fa.att - fh.def) * 0.036 - (neutral ? -0.1 : 0));
    const mod = { ofensiva: [1.12, 1.08], equilibrada: [1, 1], defensiva: [0.86, 0.88] };
    lh *= mod[fh.style][0] * mod[fa.style][1]; la *= mod[fa.style][0] * mod[fh.style][1];
    if (fh.press === 'alta') { lh *= 1.04; la *= 1.02; } if (fa.press === 'alta') { la *= 1.04; lh *= 1.02; }
    if (fh.press === 'baja') { lh *= 0.97; la *= 0.97; } if (fa.press === 'baja') { la *= 0.97; lh *= 0.97; }
    return [U.clamp(lh, 0.12, 5.5), U.clamp(la, 0.1, 5)];
  };

  /**
   * Simula un partido completo.
   * opts: { home, away, lhome, laway (alineaciones), neutral, rng, fromMinute, base (resultado parcial) }
   * Devuelve un objeto resultado con goles, tarjetas, lesiones, estadísticas y valoraciones.
   */
  SIM.play = function (w, opts) {
    const R = opts.rng || U.R;
    const L = [opts.lhome, opts.laway];
    const T = [w.teams[opts.home], w.teams[opts.away]];
    const F = [SIM.teamFactors(w, L[0], T[0]), SIM.teamFactors(w, L[1], T[1])];
    const lam = SIM.expected(F[0], F[1], opts.neutral);
    const from = opts.fromMinute || 0;
    const res = opts.base ? JSON.parse(JSON.stringify(opts.base)) : SIM.emptyResult(opts.home, opts.away);
    const remain = (90 - from) / 90;
    const onPitch = [L[0].xi.filter((x) => x !== null).slice(), L[1].xi.filter((x) => x !== null).slice()];
    // quita expulsados ya registrados
    res.events.forEach((e) => { if (e.type === 'red') { const s = e.side; onPitch[s] = onPitch[s].filter((x) => x !== e.pid); } });
    const slotRole = (s, id) => { const i = L[s].xi.indexOf(id); return i >= 0 ? DB.FORMATIONS[L[s].formation][i][0] : w.players[id].role; };

    for (let m = from + 1; m <= 90; m++) {
      for (let s = 0; s < 2; s++) {
        const red = 11 - onPitch[s].length, redO = 11 - onPitch[1 - s].length;
        let pm = (lam[s] / 90) * (1 - red * 0.13) * (1 + redO * 0.15) * (m > 75 ? 1.12 : 1);
        // tiros (no goles)
        if (R() < pm * 6.2) {
          res.stats.shots[s]++;
          if (R() < 0.36) res.stats.onTarget[s]++;
        }
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
        if (R() < 0.11 / 90) {
          const pid = R.pick(onPitch[s]);
          res.events.push({ type: 'injury', side: s, min: m, pid, weeks: R.weighted([1, 1, 1, 2, 2, 3, 4, 6, 8, 12], () => 1) });
        }
      }
    }
    // posesión
    if (!opts.base) {
      const pos = U.clamp(50 + (F[0].mid - F[1].mid) * 1.1 + (opts.neutral ? 0 : 2) + R.normal() * 4, 28, 72);
      res.stats.poss = [Math.round(pos), 100 - Math.round(pos)];
    }
    res.events.sort((a, b) => a.min - b.min);
    res.ratings = SIM.ratings(w, res, L, R);
    res.done = true;
    return res;
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
        if (p.line === 'POR' || p.line === 'DEF') r += ga === 0 ? 0.5 : -0.18 * ga;
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
