# Míster Fútbol 26·27

Juego de fútbol y mánager para navegador (ordenador, tablet y móvil) con los equipos y plantillas de **Primera y Segunda División 2026/27**. Está inspirado en los mánager de los 90: menús de barras verdes, rótulo dorado y partidos con **cámara cenital**.

## Modos de juego

- **Partido amistoso**: elige dos equipos de Primera, Segunda o la bolsa de Primera RFEF y decide cómo vivir el partido:
  - **Jugar**: controlas a tu equipo (teclado o mandos táctiles).
  - **Visionado**: ves el partido simulado en tiempo real (x1, x2 o x4), con cambios y táctica durante el partido.
  - **Resultado**: marcador final al instante con el teletipo del partido.
- **Liga Manager**: dirige a un club durante varias temporadas.
  - Alineación (6 sistemas), estilo, presión y tipo de pase.
  - Plantilla y **mercado abierto toda la temporada**: Primera, Segunda, Primera RFEF y estrellas de otras ligas (Premier, Serie A, Bundesliga, Ligue 1, Liga Portugal, Saudi Pro League, MLS, Süper Lig). Ofertas recibidas y venta de jugadores.
  - **Copa del Rey** entre semana con Primera, Segunda (sin filiales) y Primera RFEF: partido único en el campo del equipo con peor media de plantilla, prórroga y penaltis si hay empate, y final en campo neutral (estadio del club más potente de Primera que no la juega).
  - Entrenamiento semanal, finanzas (taquilla, TV, salarios, precio de la entrada), cantera.
  - Objetivo de la directiva visible al elegir club y durante la temporada (en objetivo / en riesgo / lejos). Si te alejas mucho, llegan avisos y un ultimátum, y te pueden destituir a mitad de temporada; después recibes ofertas de otros clubes.
  - Palmarés real de cada club (Liga, Copa, Champions, Europa League, Recopa hasta 2025-26) y títulos ganados en la partida.
  - **34 logros** desbloqueables (en el campo, mercado, títulos y carrera), guardados en el navegador para todas las partidas.
  - Clasificación con desempate por enfrentamiento directo, calendario, estadísticas (Pichichi, Zamora, asistencias, tarjetas, nota media).
  - **Ascensos y descensos**: bajan los 3 últimos de Primera; suben los 2 primeros de Segunda y el ganador del **playoff** (3º-6º, eliminatorias a doble partido; con empate global pasa el mejor clasificado). Los 4 últimos de Segunda bajan a Primera RFEF y suben 4 de la bolsa. Los filiales no pueden coincidir en categoría con su primer equipo.
  - Temporadas sucesivas: los jugadores envejecen, progresan o declinan y se retiran; se generan canteranos.
  - Guardado automático en el navegador (3 ranuras) y exportación/importación de partidas.

## Controles (un solo botón, al estilo PC Fútbol 2.0)

| Acción | Teclado | Táctil |
|---|---|---|
| Mover (el jugador sigue corriendo en la última dirección) | Flechas o WASD | Joystick |
| Pase (toque corto) | Espacio, X, Z, J o K | Botón naranja |
| Tiro (mantener: más tiempo = más potencia) | Mantener el botón | Mantener el botón |
| Efecto en el tiro | Justo después de tirar, pulsa hacia un lado | Joystick hacia un lado |
| Sin balón: entrada (toque) o cambio de jugador si estás lejos | Toque | Toque |
| Sin balón: segada más larga y fuerte (roba con facilidad; si es dura o por detrás puede ser falta, amarilla o roja) | Mantener el botón | Mantener el botón |
| Pasar a un compañero concreto | Clic sobre él | Tocarlo |
| Segada del defensa más cercano sobre un rival | Clic sobre el rival | Tocarlo |
| Lanzar el balón a un punto (sobre la portería: tiro preciso) | Mantener clic en ese punto | Mantener el dedo en ese punto |
| Portero con el balón (blocaje o saque de puerta): apuntar | Flechas | Joystick |
| Portero: pase (toque) o despeje largo (mantener) | Botón | Botón |
| Pausa | P o Esc | Botón ❚❚ |

En tus saques (centro, córner, falta, penalti y banda) el balón espera a que actúes: toca a un compañero para pasarle, mantén pulsado en un punto para lanzar allí o usa el botón (si no haces nada en 12 segundos, saca la máquina). Antes del saque de centro cada equipo se queda en su campo y el rival fuera del círculo central.

Cuando un disparo sale por la línea de fondo, el árbitro pita y aparece "FUERA DE META". Si tu portero bloca el balón o tienes saque de puerta, decides tú dónde sacar: aparece una flecha de puntería (si no sacas en 8 segundos, saca solo).

El receptor de un pase tiene un "imán": el balón se curva hacia sus pies y lo controla mejor cuanto mejor pasa quien lo envía y mejor controla quien lo recibe. La cámara muestra **todo el campo desde arriba** y no se mueve (en Opciones puedes elegir una cámara de seguimiento).

## Publicarlo en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `mister-futbol`).
2. Sube **todo el contenido de esta carpeta** a la raíz del repositorio (`index.html`, `css/`, `js/`, `icons/`, `manifest.webmanifest`, `sw.js`, `README.md`).
3. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`. Guarda.
4. En uno o dos minutos el juego estará en `https://TU-USUARIO.github.io/mister-futbol/`.

No necesita servidor ni compilación. También funciona abriendo `index.html` directamente en el navegador. Desde GitHub Pages se puede **instalar como app** y jugar sin conexión.

## Estructura

```
index.html            página principal
css/style.css         estética de menús y pantallas
js/data/teams.js      58 clubes (+8 grupos «otras ligas»): nombre, estadio, aforo, presupuesto, colores, palmarés
js/data/players.js    1.553 jugadores: dorsal, demarcación, media, edad, tono de piel y atributos
js/util.js            utilidades
js/achievements.js    sistema de logros
js/db.js              formaciones, alineación automática, valor y salario de los jugadores
js/sim.js             simulación rápida (modo Resultado y resto de partidos de la jornada)
js/match.js           motor del partido en tiempo real (física, IA, faltas, fuera de juego, saques)
js/render.js          dibujo cenital del partido (Canvas 2D)
js/league.js          Liga Manager: calendario, clasificación, playoff, Copa del Rey, mercado, objetivos, finanzas, temporadas
js/graphics.js        escudos, camisetas y caras generados por código
js/audio.js           música original y efectos sintetizados (Web Audio)
js/ui.js, matchui.js, manager.js, main.js   pantallas
```

## Editar datos

- **Equipos** (`js/data/teams.js`): colores `kit.home` / `kit.away` (`p` color principal, `s` secundario, `pat` dibujo: `plain`, `stripes`, `hoops`, `halves`, `quarters`, `sash`, `band`; `sh` pantalón; `so` medias), presupuesto en millones de euros.
- **Jugadores** (`js/data/players.js`): cada fila es `[id, equipo, dorsal, nombre, línea, demarcación, media, edad, tono de piel 1-4, pelo 0-4, nacionalidad, VEL, RES, AGR, CAL, PAS, TIR, REG, DEF, POR]`.

## Datos y avisos

- Plantillas de Primera y de la bolsa de Primera RFEF obtenidas de las listas públicas de cada club en Wikipedia; plantillas de Segunda (19 clubes, entre ellos el Real Valladolid) revisadas en octubre de 2026 con las listas publicadas por la prensa deportiva. Granada, Real Sociedad B y Celta Fortuna mantienen la lista de Wikipedia. Si a algún club le faltaban jugadores, se completó con canteranos generados.
- Jugadores de otras ligas: selección de figuras con su club a octubre de 2026; aparecen agrupados por liga en el mercado.
- Las **medias son estimaciones** basadas en el nivel y el rendimiento reciente de cada jugador; los equipos más potentes tienen mejores jugadores. El tono de piel es aproximado y se puede corregir en `players.js`.
- Escudos, equipaciones, gráficos, música y efectos son **originales y generados por código**; no se usan escudos oficiales ni material de otros juegos. Los nombres de clubes y jugadores se usan solo para identificarlos.
- Proyecto de aficionados sin relación con LaLiga, la RFEF ni los clubes.

Código bajo licencia MIT (ver `LICENSE`).
