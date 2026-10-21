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
  A.setVolumes = function (m, s) { A.musicVol = m; A.sfxVol = s; if (A.mus) { A.mus.gain.value = m * 0.5; A.sfx.gain.value = s; } A.save(); };

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

  // ---------- Música del menú (composición original, 16 compases en La menor)
  const CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62],
    [53, 57, 60], [55, 59, 62], [52, 55, 59], [57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59], [57, 60, 64]];
  const BASS = [45, 41, 48, 43, 45, 41, 48, 43, 41, 43, 40, 45, 41, 43, 40, 45];
  const LEAD = [
    [[76, 2], [81, 2], [79, 1], [76, 1], [72, 2]], [[74, 1], [72, 1], [69, 2], [72, 2], [74, 2]], [[76, 2], [79, 2], [84, 3], [83, 1]], [[83, 2], [81, 1], [79, 1], [74, 4]],
    [[76, 1], [76, 1], [81, 2], [83, 1], [84, 1], [83, 2]], [[81, 2], [77, 2], [81, 2], [84, 2]], [[79, 3], [76, 1], [79, 2], [84, 2]], [[83, 2], [86, 2], [83, 2], [79, 2]],
    [[81, 4], [84, 2], [81, 2]], [[83, 4], [86, 2], [83, 2]], [[79, 2], [76, 2], [83, 2], [79, 2]], [[81, 6], [76, 2]],
    [[77, 2], [81, 2], [84, 2], [89, 2]], [[86, 2], [83, 2], [79, 2], [86, 2]], [[80, 2], [83, 2], [88, 2], [86, 2]], [[84, 2], [83, 1], [80, 1], [81, 4]],
  ];
  A.startMusic = function () {
    if (!A.init() || A.playing) return;
    A.playing = true;
    const c = A.ctx; const bpm = 132; const e = 60 / bpm / 2; // corchea
    let bar = 0, t0 = c.currentTime + 0.1;
    A._next = t0;
    const scheduleBar = (t, b) => {
      const ch = CH[b % 16];
      // batería
      for (let i = 0; i < 8; i++) {
        const tt = t + i * e;
        if (i % 4 === 0) tone('sine', 150, tt, 0.12, 0.55, A.mus, { slide: 45, r: 0.05 });
        if (i % 4 === 2) noiseHit(tt, 0.13, 0.32, 1500, 9000, A.mus);
        noiseHit(tt, 0.03, i % 2 ? 0.06 : 0.1, 7000, 14000, A.mus);
      }
      // bajo
      for (let i = 0; i < 8; i++) tone('triangle', mtof(BASS[b % 16] + (i % 2 ? 12 : 0)), t + i * e, e * 0.9, 0.32, A.mus, { r: 0.04, sus: 0.8 });
      // arpegio
      for (let i = 0; i < 16; i++) tone('square', mtof(ch[i % 3] + 12 + (i % 6 > 2 ? 12 : 0)), t + i * e / 2, e / 2 * 0.8, 0.035, A.mus, { r: 0.03, lp: 3200 });
      // melodía (las 8 primeras vueltas sin melodía en el primer pase de 4 compases para una intro)
      if (b >= 4 || A._loops > 0) {
        let tt = t;
        LEAD[b % 16].forEach(([n, l]) => { if (n) tone('square', mtof(n), tt, l * e * 0.92, 0.075, A.mus, { vib: true, lp: 2600, sus: 0.7 }); tt += l * e; });
      }
    };
    A._loops = 0;
    A._timer = setInterval(() => {
      if (!A.playing) return;
      while (A._next < c.currentTime + 0.25) {
        scheduleBar(A._next, bar); A._next += e * 8; bar++;
        if (bar % 16 === 0) A._loops++;
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
