/* MÍSTER FÚTBOL 26·27 — arranque */
(function (G) {
  'use strict';
  const MF = G.MF;
  // Instalación como app (PWA) cuando el navegador lo permite
  G.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); MF.UI.installEvt = e; MF.UI.canInstall = true; });
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|claudeusercontent/.test(location.hostname)) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo sin conexión */ });
  }
  // Primer gesto del usuario: activa el audio y la música del menú
  // el primer toque crea el sonido; los siguientes lo reanudan si el sistema lo ha pausado (pantalla bloqueada, otra app, llamada…)
  let unlocked = false;
  const unlock = () => {
    const Au = MF.Audio;
    if (!unlocked) { unlocked = Au.init(); if (unlocked && MF.UI.wantMusic && Au.on && !MF.UI.inMatch) Au.startMusic(); return; }
    Au.wake();
  };
  ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((t) => G.addEventListener(t, unlock, { capture: true, passive: true }));
  if (G.document) G.document.addEventListener('visibilitychange', () => { if (G.document.visibilityState === 'visible') MF.Audio.wake(); });
  const boot = () => { try { MF.UI.mainMenu(); } catch (e) { document.getElementById('app').innerHTML = '<div class="screen"><p>Error al iniciar: ' + MF.U.esc(e.message) + '</p></div>'; throw e; } };
  // espera a las fuentes (los escudos se dibujan con ellas) sin bloquear más de 1,5 s
  const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
  fontsReady.then(boot);
})(window);
