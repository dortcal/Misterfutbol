/* MÍSTER FÚTBOL 26·27 — sistema de logros. Se guardan en este navegador y son comunes a todas
   las partidas (amistosos y Liga Manager). Para añadir uno nuevo: inclúyelo en DEFS y llama a
   MF.ACH.unlock('id') desde el lugar del juego donde se consigue. */
(function (G) {
  'use strict';
  const MF = G.MF; const U = MF.U;
  const KEY = 'mf27_achievements';
  const ACH = {};

  // [id, icono, título, descripción, categoría]
  ACH.CATS = { partido: 'En el campo', mercado: 'Mercado y club', titulos: 'Títulos', carrera: 'Carrera de entrenador' };
  ACH.DEFS = [
    ['amistoso', '⚽', 'Calentando motores', 'Juega un partido amistoso.', 'partido'],
    ['gol_jugando', '🎯', '¡Golazo!', 'Marca un gol controlando a tu equipo (modo Jugar).', 'partido'],
    ['victoria_jugando', '🕹️', 'A los mandos', 'Gana un partido oficial jugándolo tú (modo Jugar).', 'partido'],
    ['debut', '📋', 'Primer pitido', 'Dirige tu primer partido oficial en Liga Manager.', 'partido'],
    ['primera_victoria', '✅', 'Tres puntos', 'Gana tu primer partido oficial.', 'partido'],
    ['goleada', '🖐️', 'Goleada', 'Gana un partido oficial por cuatro goles o más de diferencia.', 'partido'],
    ['remontada', '🔄', 'Remontada', 'Gana un partido oficial después de ir perdiendo.', 'partido'],
    ['hat_trick', '🎩', 'Hat-trick', 'Un jugador de tu equipo marca tres goles en un partido oficial.', 'partido'],
    ['muro', '🧱', 'El muro', 'Cinco partidos oficiales seguidos sin encajar.', 'partido'],
    ['racha', '🔥', 'En racha', 'Cinco victorias oficiales seguidas.', 'partido'],
    ['invicto', '🛡️', 'Imbatibles', 'Diez partidos oficiales seguidos sin perder.', 'partido'],
    ['gigante', '🗡️', 'Tumbagigantes', 'Gana al Real Madrid o al Barcelona con otro equipo.', 'partido'],
    ['fichaje', '✍️', 'Primer fichaje', 'Ficha a tu primer jugador.', 'mercado'],
    ['fichaje_estrella', '⭐', 'Fichaje galáctico', 'Ficha a un jugador de 85 de media o más.', 'mercado'],
    ['fichaje_extranjero', '✈️', 'Desde el extranjero', 'Ficha a un jugador de otra liga (Premier, Serie A, Bundesliga…).', 'mercado'],
    ['gran_venta', '💰', 'Gran venta', 'Vende a un jugador por 30 M€ o más.', 'mercado'],
    ['millonario', '🏦', 'Caja fuerte', 'Alcanza un presupuesto de 100 M€.', 'mercado'],
    ['cantera', '🌱', 'De la casa', 'Sube un canterano al primer equipo.', 'mercado'],
    ['campeon_liga', '🏆', 'Campeón de Liga', 'Gana la Primera División.', 'titulos'],
    ['campeon_segunda', '🥇', 'Campeón de Segunda', 'Termina primero en Segunda División.', 'titulos'],
    ['ascenso', '⬆️', '¡Ascenso!', 'Sube a Primera División.', 'titulos'],
    ['playoff', '🎢', 'Por la puerta grande', 'Asciende ganando el playoff.', 'titulos'],
    ['final_copa', '🎟️', 'Finalista', 'Llega a la final de la Copa del Rey.', 'titulos'],
    ['copa', '🏅', 'Campeón de Copa', 'Gana la Copa del Rey.', 'titulos'],
    ['doblete', '👑', 'Doblete', 'Gana Liga y Copa en la misma temporada.', 'titulos'],
    ['matagigantes', '🪓', 'Matagigantes', 'Elimina en Copa a un equipo de una categoría superior.', 'titulos'],
    ['champions', '🌟', 'Noches europeas', 'Termina entre los cuatro primeros de Primera.', 'titulos'],
    ['pichichi', '👟', 'Pichichi de la casa', 'Un jugador tuyo termina como máximo goleador de tu división.', 'titulos'],
    ['objetivo', '🎯', 'Misión cumplida', 'Cumple el objetivo de la directiva en una temporada.', 'carrera'],
    ['salvacion', '🛟', 'Salvados', 'Evita el descenso cuando ese era el objetivo.', 'carrera'],
    ['veterano', '🧥', 'Veterano del banquillo', 'Completa tres temporadas como entrenador.', 'carrera'],
    ['leyenda', '🗿', 'Leyenda', 'Completa diez temporadas como entrenador.', 'carrera'],
    ['trotamundos', '🧳', 'Trotamundos', 'Entrena a tres clubes distintos en una misma partida.', 'carrera'],
    ['despedido', '📦', 'Se acabó el crédito', 'Sé destituido por la directiva (también se aprende).', 'carrera'],
  ].map(([id, icon, title, desc, cat]) => ({ id, icon, title, desc, cat }));
  ACH.byId = {}; ACH.DEFS.forEach((d) => { ACH.byId[d.id] = d; });

  ACH.all = () => U.store.get(KEY, {}) || {};
  ACH.has = (id) => !!ACH.all()[id];
  ACH.count = () => Object.keys(ACH.all()).filter((k) => ACH.byId[k]).length;
  ACH.onUnlock = null;   // la interfaz muestra el aviso
  ACH.unlock = function (id) {
    const d = ACH.byId[id]; if (!d) return false;
    const got = ACH.all(); if (got[id]) return false;
    got[id] = Date.now(); U.store.set(KEY, got);
    if (ACH.onUnlock) { try { ACH.onUnlock(d); } catch (e) { /* aviso opcional */ } }
    return true;
  };
  ACH.reset = () => U.store.del(KEY);

  // logros que se comprueban al terminar cualquier partido jugado en el motor (amistoso o manager)
  ACH.matchEnd = function (cfg, res) {
    if (cfg.friendly) ACH.unlock('amistoso');
    if (cfg.human >= 0 && res.events.some((e) => e.type === 'goal' && !e.own && e.side === cfg.human)) ACH.unlock('gol_jugando');
  };

  MF.ACH = ACH;
})(typeof window !== 'undefined' ? window : globalThis);
