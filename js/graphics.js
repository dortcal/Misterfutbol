/* MÍSTER FÚTBOL 26·27 — escudos genéricos, camisetas y caras (generados por código, no oficiales) */
(function (G) {
  'use strict';
  const MF = G.MF; const U = MF.U;
  const GFX = {}; const cache = {};

  function shapePath(g, shape, w, h) {
    g.beginPath();
    if (shape === 'round') { g.arc(w / 2, h / 2, w * 0.46, 0, 7); return; }
    if (shape === 'diamond') { g.moveTo(w / 2, h * 0.03); g.lineTo(w * 0.95, h * 0.45); g.lineTo(w / 2, h * 0.97); g.lineTo(w * 0.05, h * 0.45); g.closePath(); return; }
    if (shape === 'crest') {
      g.moveTo(w * 0.1, h * 0.12); g.quadraticCurveTo(w * 0.5, h * 0.0, w * 0.9, h * 0.12);
      g.lineTo(w * 0.88, h * 0.55); g.quadraticCurveTo(w * 0.82, h * 0.85, w * 0.5, h * 0.97);
      g.quadraticCurveTo(w * 0.18, h * 0.85, w * 0.12, h * 0.55); g.closePath(); return;
    }
    // escudo clásico
    g.moveTo(w * 0.08, h * 0.06); g.lineTo(w * 0.92, h * 0.06); g.lineTo(w * 0.92, h * 0.5);
    g.quadraticCurveTo(w * 0.9, h * 0.82, w * 0.5, h * 0.97); g.quadraticCurveTo(w * 0.1, h * 0.82, w * 0.08, h * 0.5); g.closePath();
  }

  GFX.badge = function (team, size) {
    size = size || 64;
    const key = 'b' + team.id + size + team.kit.home.p + team.kit.home.s;
    if (cache[key]) return cache[key];
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const g = c.getContext('2d');
    const map = { pot: 'crest', bear: 'shield', heart: 'shield', bat: 'round' };
    const shape = map[team.badge] || team.badge || 'shield';
    const k = team.kit.home; const p = k.p, s = k.s;
    const gold = '#e8c25a';
    g.save(); shapePath(g, shape, size, size); g.fillStyle = p; g.fill(); g.clip();
    g.fillStyle = s;
    const pat = k.pat;
    if (pat === 'stripes') for (let x = size * 0.18; x < size; x += size * 0.22) g.fillRect(x, 0, size * 0.11, size);
    else if (pat === 'hoops') for (let y = size * 0.3; y < size; y += size * 0.2) g.fillRect(0, y, size, size * 0.1);
    else if (pat === 'halves' || pat === 'quarters') { g.fillRect(size / 2, 0, size / 2, size); if (pat === 'quarters') { g.fillStyle = p; g.fillRect(size / 2, size / 2, size / 2, size / 2); g.fillStyle = s; g.fillRect(0, size / 2, size / 2, size / 2); } }
    else if (pat === 'sash') { g.beginPath(); g.moveTo(0, size * 0.2); g.lineTo(size * 0.2, 0); g.lineTo(size, size * 0.8); g.lineTo(size * 0.8, size); g.closePath(); g.fill(); }
    else { g.fillRect(0, size * 0.62, size, size * 0.14); }
    // banda superior para las siglas
    g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(0, size * 0.28, size, size * 0.3);
    g.restore();
    // contorno
    shapePath(g, shape, size, size); g.lineWidth = Math.max(1.5, size * 0.06); g.strokeStyle = gold; g.stroke();
    shapePath(g, shape, size, size); g.lineWidth = Math.max(0.6, size * 0.018); g.strokeStyle = '#3a2a08'; g.stroke();
    // siglas
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 ' + Math.round(size * 0.24) + 'px "Russo One", "Arial Black", sans-serif';
    g.lineWidth = size * 0.05; g.strokeStyle = 'rgba(0,0,0,0.6)';
    g.strokeText(team.abbr, size / 2, size * 0.44); g.fillText(team.abbr, size / 2, size * 0.44);
    // estrella
    if (size >= 32) {
      g.fillStyle = gold; g.beginPath();
      const cx = size / 2, cy = size * 0.16, r1 = size * 0.07, r2 = size * 0.03;
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? r2 : r1; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.fill();
    }
    const url = c.toDataURL();
    cache[key] = url; return url;
  };

  GFX.badgeImg = function (team, size, cls) {
    return '<img class="badge ' + (cls || '') + '" src="' + GFX.badge(team, size * 2) + '" width="' + size + '" height="' + size + '" alt="Escudo ' + U.esc(team.short) + '">';
  };

  GFX.shirt = function (kit, size) {
    size = size || 40;
    const key = 's' + kit.p + kit.s + kit.pat + kit.sh + size;
    if (cache[key]) return cache[key];
    const c = document.createElement('canvas'); c.width = size; c.height = size; const g = c.getContext('2d');
    const w = size, h = size;
    const path = () => { g.beginPath(); g.moveTo(w * .32, h * .1); g.lineTo(w * .12, h * .2); g.lineTo(w * .02, h * .42); g.lineTo(w * .2, h * .5); g.lineTo(w * .24, h * .4); g.lineTo(w * .24, h * .78); g.lineTo(w * .76, h * .78); g.lineTo(w * .76, h * .4); g.lineTo(w * .8, h * .5); g.lineTo(w * .98, h * .42); g.lineTo(w * .88, h * .2); g.lineTo(w * .68, h * .1); g.quadraticCurveTo(w * .5, h * .22, w * .32, h * .1); g.closePath(); };
    g.save(); path(); g.fillStyle = kit.p; g.fill(); g.clip(); g.fillStyle = kit.s;
    if (kit.pat === 'stripes') for (let x = w * .3; x < w * .8; x += w * .14) g.fillRect(x, 0, w * .07, h);
    else if (kit.pat === 'hoops') for (let y = h * .3; y < h * .8; y += h * .13) g.fillRect(0, y, w, h * .065);
    else if (kit.pat === 'halves') g.fillRect(w / 2, 0, w / 2, h);
    else if (kit.pat === 'quarters') { g.fillRect(w / 2, 0, w / 2, h * .45); g.fillRect(0, h * .45, w / 2, h); }
    else if (kit.pat === 'sash') { g.beginPath(); g.moveTo(w * .2, h * .1); g.lineTo(w * .35, h * .1); g.lineTo(w * .85, h * .8); g.lineTo(w * .7, h * .8); g.closePath(); g.fill(); }
    else if (kit.pat === 'band') g.fillRect(0, h * .36, w, h * .12);
    else { g.fillRect(0, h * .72, w, h * .06); g.fillRect(w * .02, h * .38, w * .2, h * .04); g.fillRect(w * .78, h * .38, w * .2, h * .04); }
    g.restore();
    path(); g.lineWidth = Math.max(1, size * 0.035); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.stroke();
    // pantalón
    g.fillStyle = kit.sh; g.fillRect(w * .28, h * .8, w * .44, h * .16); g.strokeRect(w * .28, h * .8, w * .44, h * .16);
    const url = c.toDataURL(); cache[key] = url; return url;
  };

  GFX.face = function (p, kitP, size) {
    size = size || 28;
    const key = 'f' + p.tone + '_' + p.hair + '_' + kitP + size;
    if (cache[key]) return cache[key];
    const c = document.createElement('canvas'); c.width = size; c.height = size; const g = c.getContext('2d');
    const skin = MF.SKIN[p.tone] || MF.SKIN[1];
    let hair = MF.HAIR[p.hair]; if (!hair) hair = MF.shade(skin, -0.35);
    g.fillStyle = kitP; g.beginPath(); g.ellipse(size / 2, size * 1.02, size * .46, size * .3, 0, 0, 7); g.fill();
    g.fillStyle = skin; g.fillRect(size * .42, size * .62, size * .16, size * .14);
    g.beginPath(); g.ellipse(size / 2, size * .45, size * .24, size * .28, 0, 0, 7); g.fill();
    g.fillStyle = hair; g.beginPath(); g.ellipse(size / 2, size * .3, size * .25, size * .16, 0, Math.PI, 0); g.fill();
    g.fillRect(size * .25, size * .27, size * .06, size * .14); g.fillRect(size * .69, size * .27, size * .06, size * .14);
    g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(size * .4, size * .45, size * .05, size * .05); g.fillRect(size * .56, size * .45, size * .05, size * .05);
    const url = c.toDataURL(); cache[key] = url; return url;
  };

  // Caras caricaturizadas para el personal del club (cabeza grande, gafas, bigote, gorra…)
  const ROLE_COL = { segundo: '#2b4c9b', fisio: '#e8e8e8', fisico: '#d9480f', psico: '#7b2cbf', dirdep: '#20262d', marketing: '#c2185b', cantera: '#2f9e44' };
  GFX.staffFace = function (x, size) {
    size = size || 56;
    const key = 'st' + x.id + size; if (cache[key]) return cache[key];
    const c = document.createElement('canvas'); c.width = size; c.height = size; const g = c.getContext('2d'); const S = size;
    const skin = MF.SKIN[x.tone] || MF.SKIN[1]; const hairC = MF.HAIR[x.hair] || '#3b2a1d';
    // fondo y ropa
    g.fillStyle = '#cfd6dc'; g.fillRect(0, 0, S, S);
    g.fillStyle = ROLE_COL[x.role] || '#555'; g.beginPath(); g.ellipse(S / 2, S * 1.05, S * .48, S * .32, 0, 0, 7); g.fill();
    if (x.role === 'dirdep') { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(S * .44, S * .74); g.lineTo(S * .5, S * .9); g.lineTo(S * .56, S * .74); g.fill(); g.fillStyle = '#b3001b'; g.fillRect(S * .485, S * .76, S * .03, S * .14); }
    if (x.role === 'fisio') { g.fillStyle = '#d22'; g.fillRect(S * .64, S * .82, S * .1, S * .03); g.fillRect(S * .675, S * .785, S * .03, S * .1); }
    // cuello y cabeza grande
    g.fillStyle = skin; g.fillRect(S * .43, S * .62, S * .14, S * .12);
    g.beginPath(); g.ellipse(S / 2, S * .42, S * .27, S * .3, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(S * .23, S * .45, S * .045, S * .07, 0, 0, 7); g.ellipse(S * .77, S * .45, S * .045, S * .07, 0, 0, 7); g.fill();
    // pelo
    g.fillStyle = hairC;
    if (x.bald) { g.fillRect(S * .23, S * .34, S * .05, S * .1); g.fillRect(S * .72, S * .34, S * .05, S * .1); }
    else if (x.hair === 5) { g.beginPath(); for (let i = 0; i < 7; i++) g.arc(S * (.27 + i * .077), S * .17, S * .06, 0, 7); g.fill(); }
    else { g.beginPath(); g.ellipse(S / 2, S * .22, S * .27, S * .14, 0, Math.PI, 0); g.fill(); g.fillRect(S * .23, S * .2, S * .06, S * .17); g.fillRect(S * .71, S * .2, S * .06, S * .17); if (x.hair >= 3) { g.fillRect(S * .23, S * .2, S * .54, S * .07); } }
    if (x.cap) { g.fillStyle = ROLE_COL[x.role] || '#333'; g.beginPath(); g.ellipse(S / 2, S * .2, S * .28, S * .12, 0, Math.PI, 0); g.fill(); g.fillRect(S * .45, S * .18, S * .36, S * .05); }
    // ojos, cejas y boca
    g.fillStyle = '#1d1d1d';
    g.beginPath(); g.arc(S * .4, S * .42, S * .03, 0, 7); g.arc(S * .6, S * .42, S * .03, 0, 7); g.fill();
    g.lineWidth = Math.max(1, S * .025); g.strokeStyle = hairC; g.beginPath(); g.moveTo(S * .34, S * .35); g.lineTo(S * .45, S * .36); g.moveTo(S * .55, S * .36); g.lineTo(S * .66, S * .35); g.stroke();
    if (x.glasses) { g.strokeStyle = '#111'; g.lineWidth = Math.max(1, S * .02); g.beginPath(); g.arc(S * .4, S * .42, S * .07, 0, 7); g.moveTo(S * .67, S * .42); g.arc(S * .6, S * .42, S * .07, 0, 7); g.moveTo(S * .47, S * .42); g.lineTo(S * .53, S * .42); g.stroke(); }
    g.fillStyle = MF.shade ? MF.shade(skin, -0.25) : '#a66'; g.beginPath(); g.ellipse(S / 2, S * .5, S * .035, S * .05, 0, 0, 7); g.fill();
    if (x.beard === 1) { g.fillStyle = hairC; g.fillRect(S * .4, S * .555, S * .2, S * .035); }
    if (x.beard === 2) { g.fillStyle = hairC; g.beginPath(); g.ellipse(S / 2, S * .62, S * .2, S * .1, 0, 0, Math.PI); g.fill(); }
    g.strokeStyle = '#5a1f1f'; g.lineWidth = Math.max(1, S * .025); g.beginPath();
    if (x.smile) g.arc(S / 2, S * .56, S * .07, 0.2, Math.PI - 0.2); else { g.moveTo(S * .44, S * .6); g.lineTo(S * .56, S * .6); }
    g.stroke();
    const url = c.toDataURL(); cache[key] = url; return url;
  };

  // Elige equipaciones que no choquen
  GFX.pickKits = function (th, ta) {
    const h = th.kit.home;
    let a = ta.kit.home;
    if (MF.DB.colorDist(h.p, a.p) < 150 || (h.pat === a.pat && MF.DB.colorDist(h.s, a.s) < 90 && MF.DB.colorDist(h.p, a.p) < 220)) a = ta.kit.away;
    if (MF.DB.colorDist(h.p, a.p) < 120) a = { p: '#f2f2f2', s: ta.kit.home.p, pat: 'plain', sh: '#f2f2f2', so: '#f2f2f2' };
    return [h, a];
  };

  MF.GFX = GFX;
})(typeof window !== 'undefined' ? window : globalThis);
