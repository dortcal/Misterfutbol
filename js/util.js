/* MÍSTER FÚTBOL 26·27 — utilidades comunes */
(function (G) {
  'use strict';
  const U = {};

  // Generador pseudoaleatorio reproducible (mulberry32)
  U.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const f = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    f.normal = () => { let u = 0, v = 0; while (u === 0) u = f(); while (v === 0) v = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    f.poisson = (l) => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= f(); } while (p > L); return k - 1; };
    f.weighted = (items, wfn) => {
      let tot = 0; const ws = items.map((it) => { const w = Math.max(0, wfn(it)); tot += w; return w; });
      if (tot <= 0) return items[Math.floor(f() * items.length)];
      let r = f() * tot;
      for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
      return items[items.length - 1];
    };
    f.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    return f;
  };
  U.R = U.rng((Date.now() ^ 0x5bd1e995) >>> 0);

  U.hash = function (str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  U.sum = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
  U.avg = (arr, f) => (arr.length ? U.sum(arr, f) / arr.length : 0);
  U.by = (f, desc) => (a, b) => (desc ? f(b) - f(a) : f(a) - f(b));

  U.money = function (m) { // m en millones de euros
    if (m === undefined || m === null || isNaN(m)) return '—';
    const neg = m < 0; m = Math.abs(m);
    let s;
    if (m >= 100) s = Math.round(m) + ' M€';
    else if (m >= 1) s = (Math.round(m * 10) / 10).toString().replace('.', ',') + ' M€';
    else s = Math.round(m * 1000) + ' mil €';
    return (neg ? '−' : '') + s;
  };
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.pad2 = (n) => (n < 10 ? '0' : '') + n;
  U.surname = function (name) {
    const parts = name.split(' ');
    if (parts.length === 1) return name;
    const lower = ['de', 'del', 'la', 'van', 'von', 'da', 'dos', 'el', 'le', 'di'];
    // conserva partículas (De Jong, Van de Beek, Del Castillo…)
    let i = parts.length - 1;
    while (i > 1 && lower.indexOf(parts[i - 1].toLowerCase()) >= 0) i--;
    const s = parts.slice(i).join(' ');
    return s.length > 14 ? parts[parts.length - 1] : s;
  };

  U.store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } },
  };

  G.MF = G.MF || {};
  G.MF.U = U;
})(typeof window !== 'undefined' ? window : globalThis);
