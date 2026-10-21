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
  const unlock = () => { MF.Audio.init(); if (MF.UI.wantMusic && MF.Audio.on && !MF.UI.inMatch) MF.Audio.startMusic(); G.removeEventListener('pointerdown', unlock); G.removeEventListener('keydown', unlock); };
  G.addEventListener('pointerdown', unlock); G.addEventListener('keydown', unlock);
  const boot = () => { try { MF.UI.mainMenu(); } catch (e) { document.getElementById('app').innerHTML = '<div class="screen"><p>Error al iniciar: ' + MF.U.esc(e.message) + '</p></div>'; throw e; } };
  // espera a las fuentes (los escudos se dibujan con ellas) sin bloquear más de 1,5 s
  const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
  fontsReady.then(boot);
})(window);
