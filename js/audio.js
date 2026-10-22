/* MÍSTER FÚTBOL 26·27 — sonido sintetizado con Web Audio (música original, ambiente y efectos) */
(function (G) {
  'use strict';
  const MF = G.MF; const U = MF.U;
  const A = { ctx: null, on: true, musicVol: 0.5, sfxVol: 0.8, playing: false, crowd: null };

  const cfg = U.store.get('mf27_audio', null);
  if (cfg) { A.musicVol = cfg.m; A.sfxVol = cfg.s; A.on = cfg.on !== false; }
  A.save = () => U.store.set('mf27_audio', { m: A.musicVol, s: A.sfxVol, on: A.on });

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return true; }
    const AC = G.AudioContext || G.webkitAudioContext; if (!AC) return false;
    try { A.ctx = new AC(); } catch (e) { return false; }
    const c = A.ctx;
    A.master = c.createGain(); A.master.gain.value = A.on ? 1 : 0; A.master.connect(c.destination);
    A.mus = c.createGain(); A.mus.gain.value = A.musicVol * 0.5; A.mus.connect(A.master);
    A.sfx = c.createGain(); A.sfx.gain.value = A.sfxVol; A.sfx.connect(A.master);
    // ruido reutilizable
    const len = c.sampleRate * 2; const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noise = buf;
    return true;
  };
  A.setOn = function (v) { A.on = v; if (A.master) A.master.gain.setTargetAtTime(v ? 1 : 0, A.ctx.currentTime, 0.05); A.save(); };
  A.trackGain = 1;   // cada tema se nivela para que todos suenen a un volumen parecido
  A.setVolumes = function (m, s) { A.musicVol = m; A.sfxVol = s; if (A.mus) { A.mus.gain.value = m * 0.5 * A.trackGain; A.sfx.gain.value = s; } A.save(); };
  A.applyTrackGain = function (tr) { A.trackGain = (tr && tr.gain) || 1; if (A.mus) A.mus.gain.setTargetAtTime(A.musicVol * 0.5 * A.trackGain, A.ctx.currentTime, 0.3); };

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function tone(type, freq, t, dur, vol, dest, opts) {
    const c = A.ctx; const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (opts && opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t + dur);
    if (opts && opts.vib) { const l = c.createOscillator(); const lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = freq * 0.012; l.connect(lg); lg.connect(o.frequency); l.start(t + 0.08); l.stop(t + dur + 0.05); }
    const a = (opts && opts.a) || 0.005, r = (opts && opts.r) || dur * 0.6;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setTargetAtTime(vol * ((opts && opts.sus) || 0.6), t + a, dur * 0.3);
    g.gain.setTargetAtTime(0.0001, t + dur, r * 0.3);
    let node = o;
    if (opts && opts.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.lp; o.connect(f); node = f; }
    node.connect(g); g.connect(dest || A.sfx);
    o.start(t); o.stop(t + dur + r + 0.1);
  }
  function noiseHit(t, dur, vol, hp, lp, dest) {
    const c = A.ctx; const s = c.createBufferSource(); s.buffer = A.noise;
    const g = c.createGain(); const f1 = c.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = hp || 1000;
    const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp || 12000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f1); f1.connect(f2); f2.connect(g); g.connect(dest || A.sfx);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  // ======================================================================
  // MÚSICA DE LOS MENÚS: cinco temas ORIGINALES (composición propia) en estilos asociados al deporte:
  // himno coral de gala, synth de acción ochentero, fanfarria de retransmisión, rock de entrenamiento
  // y eurodance noventero. Están inspirados en esos géneros, pero no reproducen ninguna melodía existente.
  // ======================================================================
  const I = {};   // instrumentos sintetizados
  let distCurve = null;
  const env = (g, t, a, peak, d, sus, rel, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(peak * sus, t + a, d); g.gain.setTargetAtTime(0.0001, t + dur, rel); };
  I.kick = (t, v) => tone('sine', 150, t, 0.13, 0.65 * (v || 1), A.mus, { slide: 40, r: 0.05 });
  I.snare = (t, v) => { noiseHit(t, 0.16, 0.32 * (v || 1), 1300, 9000, A.mus); tone('triangle', 190, t, 0.06, 0.12 * (v || 1), A.mus, { slide: 140, r: 0.03 }); };
  I.hat = (t, v, open) => noiseHit(t, open ? 0.12 : 0.025, 0.05 * (v || 1), 8000, 15000, A.mus);
  I.clap = (t, v) => { [0, 0.012, 0.024].forEach((d) => noiseHit(t + d, 0.05, 0.12 * (v || 1), 1200, 5000, A.mus)); };
  I.crash = (t, v) => noiseHit(t, 1.2, 0.12 * (v || 1), 5000, 14000, A.mus);
  I.timp = (t, n, v) => { tone('sine', mtof(n), t, 0.5, 0.45 * (v || 1), A.mus, { slide: mtof(n) * 0.92, r: 0.5 }); noiseHit(t, 0.08, 0.1 * (v || 1), 100, 900, A.mus); };
  I.roll = (t, dur, n, v) => { const k = Math.floor(dur / 0.045); for (let i = 0; i < k; i++) I.timp(t + i * 0.045, n, (v || 0.5) * (0.4 + 0.6 * i / k)); };
  I.snareRoll = (t, dur, v) => { const k = Math.floor(dur / 0.04); for (let i = 0; i < k; i++) noiseHit(t + i * 0.04, 0.05, (v || 0.2) * (0.3 + 0.7 * i / k), 1500, 9000, A.mus); };
  I.bass = (t, n, dur, v, type) => tone(type || 'sawtooth', mtof(n), t, dur, 0.13 * (v || 1), A.mus, { r: 0.04, sus: 0.7, lp: 900 });
  // pad de cuerdas: dos sierras desafinadas con ataque lento
  I.pad = (t, notes, dur, v) => {
    const c = A.ctx;
    notes.forEach((n) => [-7, 7].forEach((cents) => {
      const o = c.createOscillator(); const f = c.createBiquadFilter(); const g = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = cents; f.type = 'lowpass'; f.frequency.value = 1600;
      env(g, t, 0.35, 0.018 * (v || 1), 0.5, 0.85, 0.35, dur); o.connect(f); f.connect(g); g.connect(A.mus); o.start(t); o.stop(t + dur + 1.5);
    }));
  };
  // coro: sierra con dos formantes de vocal «a» y vibrato
  I.choir = (t, notes, dur, v) => {
    const c = A.ctx;
    notes.forEach((n) => {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n);
      const l = c.createOscillator(); const lg = c.createGain(); l.frequency.value = 5; lg.gain.value = mtof(n) * 0.008; l.connect(lg); lg.connect(o.frequency);
      const g = c.createGain(); env(g, t, 0.25, 0.05 * (v || 1), 0.6, 0.9, 0.4, dur);
      [[750, 6], [1150, 7], [2600, 9]].forEach(([fq, q], i) => { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q; const gg = c.createGain(); gg.gain.value = [1, 0.6, 0.25][i]; o.connect(bp); bp.connect(gg); gg.connect(g); });
      g.connect(A.mus); o.start(t); o.stop(t + dur + 1.6); l.start(t); l.stop(t + dur + 1.6);
    });
  };
  // metales: sierra con filtro que se abre al atacar
  I.brass = (t, n, dur, v) => {
    const c = A.ctx; const o = c.createOscillator(); const o2 = c.createOscillator(); const f = c.createBiquadFilter(); const g = c.createGain();
    o.type = 'sawtooth'; o2.type = 'sawtooth'; o.frequency.value = mtof(n); o2.frequency.value = mtof(n); o2.detune.value = 9;
    f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(3200, t + 0.06); f.frequency.setTargetAtTime(1500, t + 0.08, 0.2);
    env(g, t, 0.03, 0.06 * (v || 1), 0.2, 0.75, 0.08, dur);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(A.mus); o.start(t); o.stop(t + dur + 0.5); o2.start(t); o2.stop(t + dur + 0.5);
  };
  I.lead = (t, n, dur, v, vib) => tone('square', mtof(n), t, dur, 0.065 * (v || 1), A.mus, { vib, lp: 3000, sus: 0.75 });
  I.bell = (t, n, dur, v) => { tone('sine', mtof(n), t, dur, 0.06 * (v || 1), A.mus, { r: dur }); tone('sine', mtof(n) * 2.76, t, dur * 0.5, 0.02 * (v || 1), A.mus, { r: dur * 0.5 }); };
  // guitarra eléctrica (acorde de quinta con distorsión); mute = apagada con la palma
  I.guitar = (t, root, dur, v, mute) => {
    const c = A.ctx;
    if (!distCurve) { distCurve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; distCurve[i] = Math.tanh(x * 6); } }
    const ws = c.createWaveShaper(); ws.curve = distCurve; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = mute ? 1100 : 2800; const g = c.createGain();
    env(g, t, 0.005, 0.05 * (v || 1), mute ? 0.05 : 0.4, mute ? 0.2 : 0.8, 0.06, dur);
    [0, 7, 12].forEach((iv, k) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(root + iv); o.detune.value = k * 4; const gg = c.createGain(); gg.gain.value = 0.35; o.connect(gg); gg.connect(ws); o.start(t); o.stop(t + dur + 0.3); });
    ws.connect(f); f.connect(g); g.connect(A.mus);
  };
  const playLine = (t, e, line, fn) => { let tt = t; line.forEach(([n, l]) => { if (n) fn(tt, n, l * e); tt += l * e; }); };

  // ---------- 1. «Noche de gala»: himno coral solemne (Re mayor, 84 ppm)
  const GALA_CH = [[62, 66, 69], [61, 64, 69], [59, 62, 66], [59, 62, 67], [62, 66, 69], [59, 62, 67], [61, 64, 69], [61, 64, 69], [59, 62, 66], [59, 62, 67], [62, 66, 69], [61, 64, 69], [59, 62, 67], [61, 64, 69], [62, 66, 69], [62, 66, 69]];
  const GALA_B = [38, 37, 35, 31, 38, 31, 33, 33, 35, 31, 38, 33, 31, 33, 38, 38];
  const GALA_L = [[[78, 2], [81, 2]], [[76, 3], [73, 1]], [[74, 2], [78, 2]], [[79, 4]], [[81, 2], [78, 2]], [[79, 2], [83, 2]], [[81, 4]], [[76, 4]], [[83, 3], [81, 1]], [[79, 2], [78, 2]], [[78, 2], [74, 2]], [[76, 4]], [[79, 2], [83, 2]], [[85, 2], [88, 2]], [[86, 4]], [[86, 4]]];
  // ---------- 2. «Persecución en Marte»: synth de acción ochentero (La menor, 132 ppm)
  const MARS_R = [45, 45, 41, 43, 45, 45, 41, 40, 38, 41, 43, 45, 41, 43, 40, 45];
  const MARS_L = [[[69, 2], [76, 2], [74, 1], [72, 1], [71, 2]], [[72, 2], [74, 2], [76, 4]], [[77, 2], [76, 1], [74, 1], [72, 4]], [[71, 2], [72, 2], [74, 4]], [[69, 2], [76, 2], [74, 1], [72, 1], [71, 2]], [[72, 2], [74, 2], [79, 4]], [[77, 2], [76, 2], [74, 2], [72, 2]], [[71, 4], [68, 4]], [[74, 4], [77, 4]], [[77, 2], [76, 2], [72, 4]], [[79, 4], [74, 4]], [[76, 6], [0, 2]], [[81, 2], [79, 2], [77, 2], [76, 2]], [[74, 2], [76, 2], [79, 4]], [[76, 2], [74, 2], [71, 2], [68, 2]], [[69, 8]]];
  // ---------- 3. «Gran retransmisión»: fanfarria de metales para la previa (Si bemol mayor, 116 ppm)
  const TV_CH = [[58, 62, 65], [63, 67, 70], [65, 69, 72], [58, 62, 65], [55, 58, 62], [63, 67, 70], [60, 63, 67], [65, 69, 72]];
  const TV_B = [34, 39, 41, 34, 31, 39, 36, 41];
  const TV_L = [[[70, 1], [74, 1], [77, 2], [82, 4]], [[79, 2], [77, 2], [75, 4]], [[77, 1], [77, 1], [79, 2], [81, 4]], [[82, 6], [0, 2]], [[74, 2], [77, 2], [79, 2], [74, 2]], [[75, 2], [79, 2], [82, 4]], [[84, 2], [82, 2], [79, 2], [81, 2]], [[82, 8]]];
  // ---------- 4. «Ojo del campeón»: rock de entrenamiento (Mi menor, 106 ppm). Riff y melodía propios.
  const ROCK_R = [40, 40, 36, 38, 40, 40, 43, 38, 36, 38, 40, 40, 36, 38, 43, 40];
  const ROCK_RIFF = [1, 0, 0, 1, 0, 1, 0, 0];   // golpes acentuados del riff (corcheas)
  const ROCK_L = [[[0, 8]], [[0, 8]], [[0, 8]], [[0, 8]], [[76, 2], [79, 2], [81, 1], [79, 1], [76, 2]], [[74, 2], [76, 6]], [[79, 2], [81, 2], [83, 2], [86, 2]], [[83, 4], [81, 4]], [[79, 3], [76, 1], [74, 2], [72, 2]], [[74, 2], [76, 6]], [[76, 2], [79, 2], [83, 2], [81, 2]], [[79, 8]], [[84, 2], [83, 2], [81, 2], [79, 2]], [[81, 4], [83, 4]], [[86, 3], [83, 1], [81, 2], [79, 2]], [[76, 8]]];
  // ---------- 5. «Míster 90»: eurodance noventero (Re mayor, 140 ppm)
  const D = [62, 66, 69], Aa = [61, 64, 69], Bm = [62, 66, 71], Gg = [62, 67, 71], Em = [64, 67, 71];
  const CH = [D, Aa, Bm, Gg, D, Aa, Gg, Aa, Bm, Gg, Em, Aa, D, Aa, Gg, D];
  const BASS = [38, 33, 35, 31, 38, 33, 31, 33, 35, 31, 40, 33, 38, 33, 31, 38];
  const HOOK1 = [[78, 1], [78, 1], [81, 2], [78, 1], [76, 1], [74, 2]], HOOK2 = [[76, 1], [76, 1], [78, 1], [76, 1], [73, 2], [69, 2]];
  const LEAD = [
    HOOK1, HOOK2, [[71, 1], [74, 1], [78, 2], [76, 1], [74, 1], [73, 1], [74, 1]], [[76, 3], [74, 1], [71, 4]],
    HOOK1, HOOK2, [[71, 1], [74, 1], [79, 2], [78, 1], [76, 1], [74, 2]], [[76, 2], [78, 2], [73, 4]],
    [[83, 2], [81, 1], [78, 1], [81, 2], [78, 2]], [[79, 2], [78, 1], [76, 1], [74, 4]], [[76, 1], [79, 1], [83, 2], [81, 1], [79, 1], [76, 2]], [[81, 2], [83, 1], [85, 1], [88, 4]],
    HOOK1, HOOK2, [[79, 1], [78, 1], [76, 1], [78, 1], [81, 2], [83, 2]], [[86, 3], [81, 1], [86, 4]],
  ];

  // cada tema: compases y función que programa un compás (t = inicio, k = compás, e = corchea, L = vuelta)
  A.TRACKS = [
    { id: 'gala', gain: 1.8, name: 'Noche de gala', style: 'Himno coral solemne, como las grandes noches europeas', bpm: 84, bars: 16, bar(t, k, e, L) {
      const q = e * 2; const ch = GALA_CH[k];
      I.choir(t, ch.map((n) => n - 12), q * 4 - 0.05, 0.9); I.pad(t, ch, q * 4, 1);
      I.bass(t, GALA_B[k], q * 4 * 0.95, 0.55, 'triangle');
      for (let i = 0; i < 12; i++) I.bell(t + i * q / 3, ch[i % 3] + 12, q / 3, 0.45);   // tresillos de cuerda/campanas
      if (L > 0 || k >= 4) playLine(t, q, GALA_L[k], (tt, n, d) => { I.choir(tt, [n, n - 12], d * 0.97, 1.6); I.brass(tt, n, d * 0.95, 0.55); tone('triangle', mtof(n + 12), tt, d * 0.95, 0.035, A.mus, { vib: true, sus: 0.8 }); });
      if (k % 4 === 3) I.roll(t + q * 3, q, GALA_B[k] + 12, 0.45);
      if (k % 4 === 0) { I.timp(t, GALA_B[k] + 12, 0.8); I.crash(t, 0.5); }
    } },
    { id: 'mars', gain: 1.0, name: 'Persecución en Marte', style: 'Synth de acción de los 80, con bajo galopante y metales', bpm: 132, bars: 16, bar(t, k, e, L) {
      const s = e / 2; const r = MARS_R[k];
      for (let i = 0; i < 16; i++) { I.bass(t + i * s, r + [0, 0, 12, 0, 0, 12, 0, 10][i % 8], s * 0.8, 0.9); I.hat(t + i * s, i % 4 === 2 ? 1.4 : 0.6); }
      [0, 4, 8, 12].forEach((i) => I.kick(t + i * s)); [4, 12].forEach((i) => I.snare(t + i * s, 0.9));
      [0, 3, 6].forEach((i) => [12, 19, 24].forEach((iv) => I.brass(t + i * e, r + iv, e * 0.8, 0.55)));
      if (L > 0 || k >= 2) playLine(t, e, MARS_L[k], (tt, n, d) => { I.brass(tt, n, d * 0.95, 1); I.lead(tt, n + 12, d * 0.9, 0.35, d > e * 2); });
      if (k % 8 === 7) I.snareRoll(t + e * 6, e * 2, 0.25);
      if (k % 8 === 0) I.crash(t, 0.7);
    } },
    { id: 'tv', gain: 1.15, name: 'Gran retransmisión', style: 'Fanfarria de metales y tambores para la previa televisiva', bpm: 116, bars: 8, bar(t, k, e, L) {
      const ch = TV_CH[k];
      I.pad(t, ch, e * 8, 0.8); I.bass(t, TV_B[k], e * 3.8, 1, 'triangle'); I.bass(t + e * 4, TV_B[k] + 7, e * 3.8, 1, 'triangle');
      for (let i = 0; i < 8; i++) { I.snare(t + i * e, i % 2 ? 0.25 : 0.45); if (i % 4 === 0) I.kick(t + i * e, 0.9); }
      [0, 1.5, 3].forEach((d) => ch.forEach((n) => I.brass(t + d * e, n, e * 0.9, 0.45)));
      playLine(t, e, TV_L[k], (tt, n, d) => { I.brass(tt, n, d * 0.95, 1.1); I.brass(tt, n - 12, d * 0.95, 0.6); });
      if (k === 3 || k === 7) { I.roll(t + e * 6, e * 2, TV_B[k] + 12, 0.5); I.snareRoll(t + e * 6, e * 2, 0.3); }
      if (k % 4 === 0) { I.crash(t, 0.6); I.timp(t, TV_B[k] + 12, 0.9); }
    } },
    { id: 'rock', gain: 0.5, name: 'Ojo del campeón', style: 'Rock de guitarras para entrenar como un campeón', bpm: 106, bars: 16, bar(t, k, e, L) {
      const r = ROCK_R[k];
      for (let i = 0; i < 8; i++) {
        const acc = ROCK_RIFF[i] && (k % 2 === 0 || i < 4);
        I.guitar(t + i * e, r, acc ? e * 1.6 : e * 0.5, acc ? 1.1 : 0.7, !acc);
        I.hat(t + i * e, 0.8); if (i % 4 === 0) I.kick(t + i * e); if (i % 4 === 2) I.snare(t + i * e, 1.1);
        if (i === 7 && k % 2) I.kick(t + i * e + e / 2, 0.8);
        I.bass(t + i * e, r - 12, e * 0.85, 1.1);
      }
      playLine(t, e, ROCK_L[k], (tt, n, d) => I.lead(tt, n, d * 0.92, 0.9, d >= e * 3));
      if (k % 4 === 0) I.crash(t, 0.8);
      if (k === 3) I.snareRoll(t + e * 4, e * 4, 0.3);
    } },
    { id: 'euro', gain: 0.95, name: 'Míster 90', style: 'Eurodance alegre de los 90', bpm: 140, bars: 16, bar(t, k, e, L) {
      const ch = CH[k]; const intro = L === 0 && k < 2;
      for (let i = 0; i < 8; i++) {
        const tt = t + i * e;
        if (i % 2 === 0) I.kick(tt);
        if (i % 4 === 2 && !intro) noiseHit(tt, 0.15, 0.34, 1400, 9000, A.mus);
        noiseHit(tt, 0.025, 0.05, 8000, 15000, A.mus); noiseHit(tt + e / 2, 0.02, 0.035, 8000, 15000, A.mus);
      }
      if (k === 11 || k === 15) for (let i = 0; i < 4; i++) noiseHit(t + 6 * e + i * e / 2, 0.08, 0.18 + i * 0.04, 900, 6000, A.mus);
      for (let i = 0; i < 8; i++) tone('sawtooth', mtof(BASS[k] + (i % 2 ? 12 : 0)), t + i * e, e * 0.85, 0.12, A.mus, { r: 0.04, sus: 0.7, lp: 900 });
      for (let i = 1; i < 8; i += 2) ch.forEach((n) => tone('square', mtof(n), t + i * e, e * 0.45, 0.022, A.mus, { r: 0.03, lp: 2400 }));
      for (let i = 0; i < 16; i++) tone('triangle', mtof(ch[i % 3] + 12 + (i % 8 > 3 ? 12 : 0)), t + i * e / 2, e / 2 * 0.7, 0.03, A.mus, { r: 0.02 });
      if (!intro) {
        let tt = t;
        LEAD[k].forEach(([n, l]) => {
          if (n) {
            tone('square', mtof(n), tt, l * e * 0.9, 0.07, A.mus, { vib: l >= 3, lp: 3000, sus: 0.75 });
            tone('square', mtof(n), tt + e * 1.5, l * e * 0.7, 0.022, A.mus, { lp: 1800, sus: 0.6 });
            if (k >= 12) tone('triangle', mtof(n - 12), tt, l * e * 0.9, 0.05, A.mus, { sus: 0.7 });
          }
          tt += l * e;
        });
      }
    } },
  ];
  A.MUSIC_ENABLED = true;
  A.musicMode = U.store.get('mf27_track', 'lista');   // 'lista' (todas en orden aleatorio), 'off' o el id de un tema
  A.setTrack = function (mode) { A.musicMode = mode; U.store.set('mf27_track', mode); A.stopMusic(); if (mode !== 'off') { A._cur = mode === 'lista' ? A._cur : A.TRACKS.findIndex((x) => x.id === mode); A.startMusic(); } };
  A.nextTrack = function () { A.stopMusic(); A._cur = ((A._cur || 0) + 1) % A.TRACKS.length; A.startMusic(true); };
  A.currentTrack = () => A.TRACKS[A._cur || 0];
  A.startMusic = function (keep) {
    if (!A.MUSIC_ENABLED || A.musicMode === 'off') { A.init(); return; }
    if (!A.init() || A.playing) return;
    if (A.musicMode !== 'lista') A._cur = Math.max(0, A.TRACKS.findIndex((x) => x.id === A.musicMode));
    else if (A._cur === undefined) A._cur = Math.floor(Math.random() * A.TRACKS.length);
    A.playing = true; A.applyTrackGain(A.TRACKS[A._cur]);
    const c = A.ctx; let bar = 0; let loops = 0;
    A._next = c.currentTime + 0.12;
    A._timer = setInterval(() => {
      if (!A.playing) return;
      const tr = A.TRACKS[A._cur]; const e = 60 / tr.bpm / 2;
      while (A._next < c.currentTime + 0.3) {
        try { tr.bar(A._next, bar % tr.bars, e, loops); } catch (er) { /* nada */ }
        A._next += e * 8; bar++;
        if (bar % tr.bars === 0) {
          loops++;
          // en modo lista, cada tema suena dos vueltas y pasa al siguiente
          if (A.musicMode === 'lista' && loops >= 2) { A._cur = (A._cur + 1) % A.TRACKS.length; bar = 0; loops = 0; A._next += 0.6; A.applyTrackGain(A.TRACKS[A._cur]); if (A.onTrack) A.onTrack(A.TRACKS[A._cur]); break; }
        }
      }
    }, 40);
  };
  A.stopMusic = function () { A.playing = false; clearInterval(A._timer); };

  // ---------- efectos
  A.sfxPlay = function (name, arg) {
    if (!A.ctx || !A.on) return;
    const c = A.ctx; const t = c.currentTime;
    switch (name) {
      case 'click': tone('square', 880, t, 0.04, 0.08, A.sfx, { r: 0.02, lp: 4000 }); tone('square', 1320, t + 0.04, 0.05, 0.06, A.sfx, { r: 0.02, lp: 4000 }); break;
      case 'back': tone('square', 660, t, 0.05, 0.07, A.sfx, { r: 0.02, lp: 3000 }); tone('square', 440, t + 0.05, 0.06, 0.06, A.sfx, { r: 0.02, lp: 3000 }); break;
      case 'kick': tone('sine', 190, t, 0.06, 0.5, A.sfx, { slide: 70, r: 0.03 }); noiseHit(t, 0.03, 0.15, 2000, 8000); break;
      case 'shot': tone('sine', 160, t, 0.09, 0.8, A.sfx, { slide: 50, r: 0.04 }); noiseHit(t, 0.05, 0.3, 1500, 9000); break;
      case 'post': [820, 1240, 1890, 2610].forEach((f, i) => tone('sine', f, t, 0.5, 0.12 / (i + 1), A.sfx, { r: 0.5 })); A.crowdSwell(0.5, 1.2); break;
      case 'save': noiseHit(t, 0.12, 0.35, 200, 1500); A.crowdSwell(0.45, 1.0); break;
      case 'whistle': A.whistle(arg || 1); break;
      case 'goal': A.crowdSwell(1.0, 4.0); [0, 0.12, 0.24, 0.42].forEach((d, i) => tone('square', mtof([72, 76, 79, 84][i]), t + d, i === 3 ? 0.5 : 0.12, 0.1, A.sfx, { lp: 3500, vib: i === 3 })); break;
      case 'card': tone('square', 520, t, 0.08, 0.08, A.sfx, { lp: 2500 }); break;
      case 'win': [72, 76, 79, 84, 79, 84].forEach((n, i) => tone('square', mtof(n), t + i * 0.13, 0.12 + (i === 5 ? 0.5 : 0), 0.09, A.sfx, { lp: 3000, vib: i === 5 })); break;
      case 'logro': [79, 84, 88, 91].forEach((n, i) => tone('square', mtof(n), t + i * 0.08, i === 3 ? 0.4 : 0.07, 0.07, A.sfx, { lp: 4200, vib: i === 3 })); tone('sine', mtof(103), t + 0.32, 0.5, 0.04, A.sfx, { r: 0.4 }); break;
      // --- nuevos efectos de partido
      case 'net': { const c2 = A.ctx; const sr = c2.createBufferSource(); sr.buffer = A.noise; const bp = c2.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(3200, t); bp.frequency.exponentialRampToValueAtTime(700, t + 0.35); const g = c2.createGain(); g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); sr.connect(bp); bp.connect(g); g.connect(A.sfx); sr.start(t, Math.random()); sr.stop(t + 0.45); tone('sine', 90, t, 0.12, 0.25, A.sfx, { slide: 50 }); break; }
      case 'header': tone('sine', 240, t, 0.07, 0.4, A.sfx, { slide: 110, r: 0.03 }); noiseHit(t, 0.04, 0.12, 300, 2500); break;
      case 'tackle': noiseHit(t, 0.12, 0.3, 60, 600); tone('sine', 85, t, 0.1, 0.35, A.sfx, { slide: 45 }); break;
      case 'crossbar': [620, 935, 1460, 2120].forEach((f, i) => tone('sine', f, t, 0.6, 0.1 / (i + 1), A.sfx, { r: 0.6 })); A.crowdSwell(0.6, 1.4); break;
      case 'ooh': A.crowdVoice('ooh'); break;
      case 'applause': A.applause(arg || 1.6, 1); break;
      case 'whistles': A.crowdWhistles(arg || 1.4); break;
      case 'boo': A.crowdVoice('boo'); break;
      case 'chant': A.chant(arg); break;
      case 'lose': [67, 63, 60].forEach((n, i) => tone('triangle', mtof(n), t + i * 0.25, 0.3, 0.12, A.sfx, {})); break;
    }
  };
  A.whistle = function (n) {
    const c = A.ctx; let t = c.currentTime;
    for (let k = 0; k < n; k++) {
      const len = n === 3 && k === 2 ? 0.75 : n > 1 ? 0.28 : 0.32;
      [2900, 3050].forEach((f) => {
        const o = c.createOscillator(); const g = c.createGain(); const l = c.createOscillator(); const lg = c.createGain();
        o.type = 'sine'; o.frequency.value = f; l.frequency.value = 32; lg.gain.value = 0.5; l.connect(lg);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11, t + 0.02); g.gain.setValueAtTime(0.11, t + len - 0.04); g.gain.linearRampToValueAtTime(0, t + len);
        lg.connect(g.gain);
        o.connect(g); g.connect(A.sfx); o.start(t); o.stop(t + len + 0.05); l.start(t); l.stop(t + len + 0.05);
      });
      t += len + 0.12;
    }
  };

  // ---------- ambiente del estadio
  A.startCrowd = function () {
    if (!A.init() || A.crowd) return;
    const c = A.ctx; const s = c.createBufferSource(); s.buffer = A.noise; s.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.5;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    const g = c.createGain(); g.gain.value = 0.0;
    const lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = 0.23; lg.gain.value = 0.025; lfo.connect(lg); lg.connect(g.gain);
    s.connect(bp); bp.connect(lp); lp.connect(g); g.connect(A.sfx); s.start(); lfo.start();
    g.gain.setTargetAtTime(0.12, c.currentTime, 1.0);
    A.crowd = { s, g, lfo, base: 0.12 };
  };
  A.crowdLevel = function (x) { if (A.crowd) A.crowd.g.gain.setTargetAtTime(0.1 + x * 0.12, A.ctx.currentTime, 0.4); };
  A.crowdSwell = function (amt, dur) {
    if (!A.ctx) return; const c = A.ctx; const t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = A.noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(500, t); bp.frequency.linearRampToValueAtTime(900, t + dur * 0.3); bp.Q.value = 0.7;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * amt, t + 0.25); g.gain.setTargetAtTime(0.0001, t + dur * 0.5, dur * 0.25);
    s.connect(bp); bp.connect(g); g.connect(A.sfx); s.start(t, Math.random()); s.stop(t + dur + 1);
  };
  // voces del público: «¡uyyy!» (ocasión fallada) y abucheo
  A.crowdVoice = function (kind) {
    if (!A.ctx) return; const c = A.ctx; const t = c.currentTime; const dur = kind === 'boo' ? 1.8 : 1.3;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(kind === 'boo' ? 1.2 : 1.1, t + 0.2); g.gain.setTargetAtTime(0.0001, t + dur * 0.55, dur * 0.2); g.connect(A.sfx);
    for (let k = 0; k < 14; k++) {   // muchas voces ligeramente distintas
      const o = c.createOscillator(); o.type = 'sawtooth'; const f0 = (kind === 'boo' ? 110 : 190) * (0.85 + Math.random() * 0.4);
      o.frequency.setValueAtTime(f0, t); if (kind === 'ooh') { o.frequency.linearRampToValueAtTime(f0 * 1.35, t + 0.5); o.frequency.linearRampToValueAtTime(f0 * 1.1, t + dur); }
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(kind === 'boo' ? 420 : 500, t); if (kind === 'ooh') bp.frequency.linearRampToValueAtTime(380, t + dur);
      const gg = c.createGain(); gg.gain.value = 0.11; o.connect(bp); bp.connect(gg); gg.connect(g); o.start(t + Math.random() * 0.08); o.stop(t + dur + 0.6);
    }
    const s2 = c.createBufferSource(); s2.buffer = A.noise; const bp2 = c.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 600; bp2.Q.value = 0.8; const g2 = c.createGain(); g2.gain.value = 0.25; s2.connect(bp2); bp2.connect(g2); g2.connect(g); s2.start(t, Math.random()); s2.stop(t + dur + 0.6);
  };
  // aplausos: muchas palmadas cortas al azar
  A.applause = function (dur, v) {
    if (!A.ctx) return; const t = A.ctx.currentTime; const n = Math.floor(dur * 90);
    for (let i = 0; i < n; i++) { const tt = t + Math.random() * dur; const fade = 1 - Math.max(0, (tt - t) / dur - 0.6) * 2; noiseHit(tt, 0.02 + Math.random() * 0.02, (0.07 + Math.random() * 0.08) * v * fade, 1200 + Math.random() * 1500, 9000); }
  };
  // silbidos de la grada (protesta)
  A.crowdWhistles = function (dur) {
    if (!A.ctx) return; const c = A.ctx; const t = c.currentTime;
    for (let k = 0; k < 10; k++) {
      const o = c.createOscillator(); o.type = 'sine'; const f = 2200 + Math.random() * 1400; const st = t + Math.random() * 0.4; const d = 0.4 + Math.random() * dur;
      o.frequency.setValueAtTime(f, st); o.frequency.linearRampToValueAtTime(f * (0.9 + Math.random() * 0.25), st + d);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, st); g.gain.linearRampToValueAtTime(0.018, st + 0.05); g.gain.setTargetAtTime(0.0001, st + d, 0.08);
      o.connect(g); g.connect(A.sfx); o.start(st); o.stop(st + d + 0.4);
    }
  };
  // cánticos de la grada: «¡oé, oé!», palmas rítmicas, bombo o «¡a por ellos!»
  A.chant = function (kind) {
    if (!A.ctx) return; const c = A.ctx; const t0 = c.currentTime + 0.05;
    kind = kind || ['ole', 'palmas', 'bombo', 'vamos'][Math.floor(Math.random() * 4)];
    const voice = (t, dur, vowel, pitch, v) => {
      const F = { o: [450, 800], e: [500, 1700], a: [750, 1200], u: [350, 700] }[vowel];
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.65 * (v || 1), t + 0.06); g.gain.setTargetAtTime(0.0001, t + dur, 0.07); g.connect(A.sfx);
      for (let k = 0; k < 10; k++) {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(pitch) * (0.97 + Math.random() * 0.06) / (k % 2 ? 2 : 1);
        F.forEach((fq, j) => { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 5; const gg = c.createGain(); gg.gain.value = j ? 0.12 : 0.25; o.connect(bp); bp.connect(gg); gg.connect(g); });
        o.start(t); o.stop(t + dur + 0.4);
      }
    };
    const clap = (t, v) => { for (let k = 0; k < 18; k++) noiseHit(t + Math.random() * 0.03, 0.03, 0.075 * (v || 1), 1100, 6000); };
    const drum = (t, v) => { tone('sine', 85, t, 0.25, 0.5 * (v || 1), A.sfx, { slide: 55, r: 0.15 }); noiseHit(t, 0.06, 0.08, 80, 500); };
    const b = 0.32;   // pulso
    if (kind === 'ole') { [[0, 2, 'o', 64], [2, 2, 'e', 67], [4, 1, 'o', 64], [5, 1, 'e', 67], [6, 2, 'o', 64], [8, 2, 'e', 60]].forEach(([s0, d, vw, p]) => voice(t0 + s0 * b, d * b * 0.9, vw, p)); }
    if (kind === 'vamos') { [[0, 1, 'a', 62], [1, 1, 'a', 64], [2, 2, 'o', 67], [5, 1, 'e', 64], [6, 2, 'o', 62]].forEach(([s0, d, vw, p]) => voice(t0 + s0 * b, d * b * 0.9, vw, p, 1.1)); [0, 2, 4, 6].forEach((k) => drum(t0 + k * b, 0.8)); }
    if (kind === 'palmas') { [0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13].forEach((k) => clap(t0 + k * b * 0.5)); }
    if (kind === 'bombo') { [0, 2, 3, 4, 6, 8, 10, 11, 12, 14].forEach((k) => drum(t0 + k * b * 0.5, k % 4 === 0 ? 1 : 0.7)); }
  };
  A.stopCrowd = function () { if (A.crowd) { try { A.crowd.s.stop(); A.crowd.lfo.stop(); } catch (e) { /* ya parado */ } A.crowd = null; } };

  // ---------- narración por voz (opcional, usa la voz del sistema)
  A.voiceOn = U.store.get('mf27_voice', false);
  A.say = function (txt) {
    if (!A.voiceOn || !G.speechSynthesis || !A.on) return;
    try {
      G.speechSynthesis.cancel();
      const u = new G.SpeechSynthesisUtterance(txt); u.lang = 'es-ES'; u.rate = 1.12; u.pitch = 1.05;
      G.speechSynthesis.speak(u);
    } catch (e) { /* sin voz */ }
  };

  MF.Audio = A;
})(typeof window !== 'undefined' ? window : globalThis);
