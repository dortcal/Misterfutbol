# Míster Fútbol 26·27

Juego de fútbol y mánager para navegador (ordenador, tablet y móvil) con los equipos y plantillas de **Primera y Segunda División 2026/27**. Está inspirado en los mánager de los 90: menús de barras verdes, rótulo dorado y partidos con **cámara cenital**.

## Modos de juego

- **Partido amistoso**: elige dos equipos de Primera, Segunda o la bolsa de Primera RFEF y decide cómo vivir el partido:
  - **Visionado**: ves el partido simulado en tiempo real (x1, x2 o x4), con cambios y táctica durante el partido.
  - **Resultado**: teletipo minuto a minuto que puedes pausar para cambiar la táctica y hacer sustituciones, o dejar que dirija el segundo entrenador.
  - **2 jugadores**: cada persona elige su equipo y escribe su nombre; preparan alineación y táctica y el partido lo dirigen los segundos entrenadores. El resumen anuncia quién gana.
  - El modo **Jugar** está desactivado temporalmente (se reactiva con `UI.PLAY_ENABLED = true` en `js/ui.js`).
- **Liga Manager**: dirige a un club durante varias temporadas.
  - **Partida de 2 jugadores por turnos** en el mismo dispositivo: cada uno con su club, su plantilla, su personal, sus finanzas y su directiva. En cada jornada juega primero uno y luego el otro (pantalla de «pasa el dispositivo»); cuando ambos han terminado se disputa la jornada. Cuando los dos equipos se enfrentan, el partido lo dirigen obligatoriamente los segundos entrenadores y se ve juntos. No se pueden fichar jugadores del otro mánager. Si uno es destituido elige nuevo club o se retira y el otro sigue en solitario.
  - **Equipos reconocibles**: los clubes de la IA cambian como mucho 3 jugadores de una temporada a otra (3 altas y 3 bajas, incluidas retiradas), así siguen siendo reconocibles aunque pasen muchas temporadas.
  - Alineación (6 sistemas), estilo, presión y tipo de pase. **No hay táctica ideal**: cada opción rinde según los atributos de tus jugadores y los del rival (centro del campo, bandas, velocidad de delanteros y defensas, calidad de pase, resistencia). El segundo entrenador da un informe antes de cada partido.
  - **Personal del club** (1 a 5 estrellas, con caras y nombres divertidos): segundo entrenador, recuperador de lesiones, preparador físico, psicólogo, director deportivo, director de marketing y entrenador de cantera. Se pueden despedir y contratar en el mercado libre.
  - **Competiciones internacionales**: Champions, Europa League y Conference League con el formato actual (fase de liga de 36 equipos, previa 9º-24º, eliminatorias a doble partido y final en campo neutral), Supercopa de Europa, Copa Intercontinental de la FIFA y Mundial de Clubes (2029 y cada cuatro años). 130 clubes extranjeros no seleccionables.
  - Cansancio durante el partido (los jugadores cansados corren menos y fallan más), barrera de cuatro jugadores en las faltas cercanas y rivales fuera del área en los saques de meta.
  - Música de los menús: cinco temas originales en estilos deportivos (himno coral de gala, synth de acción ochentero, fanfarria de retransmisión, rock de entrenamiento y eurodance), seleccionables en Opciones.
  - Efectos de partido sintetizados: golpeo, cabezazo, entrada, palo y larguero, red, «¡uyyy!», aplausos, silbidos, abucheos, cánticos, palmas y bombo de la grada.
  - Los veteranos anuncian su retirada durante la temporada y ya no se pueden traspasar. Los filiales no fichan ni pueden subir a Primera.
  - Plantilla y **mercado abierto hasta la jornada 29** (cerrado de la 30 al final de la temporada): Primera, Segunda, Primera RFEF y estrellas de otras ligas (Premier, Serie A, Bundesliga, Ligue 1, Liga Portugal, Saudi Pro League, MLS, Süper Lig). Ofertas recibidas (también de clubes extranjeros) y venta de jugadores.
  - **Supercopa de España** (campeón y subcampeón de Liga y finalistas de Copa). La edición 2027 se juega en Estambul con los emparejamientos reales.
  - **Premios** por ronda superada y por título en todas las competiciones, según su importancia.
  - **Eliminatorias**: con empate (o global igualado) se juega la prórroga, con un cambio más, y la tanda de penaltis dentro del propio partido.
  - **Polivalencia**: algunos jugadores dominan dos o tres posiciones; fuera de ellas rinden algo menos en su misma línea y bastante menos en otra.
  - En el resumen del partido aparecen los espectadores y el porcentaje de ocupación del estadio.
  - **Copa del Rey** entre semana con Primera, Segunda (sin filiales) y Primera RFEF: partido único en el campo del equipo con peor media de plantilla, prórroga y penaltis si hay empate, y final en campo neutral (estadio del club más potente de Primera que no la juega).
  - Entrenamiento semanal, finanzas (taquilla, TV, salarios, precio de la entrada), cantera.
  - Objetivo de la directiva visible al elegir club y durante la temporada (en objetivo / en riesgo / lejos). Si te alejas mucho, llegan avisos y un ultimátum, y te pueden destituir a mitad de temporada; después recibes ofertas de otros clubes.
  - Palmarés real de cada club (Liga, Copa, Champions, Europa League, Recopa hasta 2025-26) y títulos ganados en la partida.
  - **34 logros** desbloqueables (en el campo, mercado, títulos y carrera), guardados en el navegador para todas las partidas.
  - Clasificación con desempate por enfrentamiento directo, calendario, estadísticas (Pichichi, Zamora, asistencias, tarjetas, nota media).
  - **Ascensos y descensos**: bajan los 3 últimos de Primera; suben los 2 primeros de Segunda y el ganador del **playoff** (3º-6º, eliminatorias a doble partido; con empate global pasa el mejor clasificado). Los 4 últimos de Segunda bajan a Primera RFEF y suben 4 de la bolsa. Los filiales no pueden coincidir en categoría con su primer equipo.
  - **Resumen de fin de temporada**: todos los campeones del año (Liga, Segunda, playoff, Copa, Supercopas, Champions, Europa League, Conference, Intercontinental y Mundial), tu balance, una nota de 1 a 5 estrellas con una frase divertida y una imagen de 1080 × 1350 para compartir en redes.
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
js/europe.js          Champions, Europa League, Conference, Supercopa, Intercontinental y Mundial de Clubes
js/data/world.js      130 clubes extranjeros: figuras reales y resto de la plantilla generado
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
- Clubes extranjeros: participantes reales de la fase de liga 2026/27 según los sorteos de UEFA (agosto de 2026), más otros grandes clubes y campeones de otras confederaciones. Solo sus figuras son reales; el resto de cada plantilla lo genera el juego y aparece como «generado». Finales 2027: Champions en el Metropolitano (Madrid), Europa League en Fráncfort y Conference en Estambul. La Supercopa de Europa 2026 (PSG 2-1 Aston Villa) se muestra con su resultado real.
- Las **medias son estimaciones** basadas en el nivel y el rendimiento reciente de cada jugador; los equipos más potentes tienen mejores jugadores. El tono de piel es aproximado y se puede corregir en `players.js`.
- Escudos, equipaciones, gráficos, música y efectos son **originales y generados por código**; no se usan escudos oficiales ni material de otros juegos. Los nombres de clubes y jugadores se usan solo para identificarlos.
- Proyecto de aficionados sin relación con LaLiga, la RFEF ni los clubes.

Código bajo licencia MIT (ver `LICENSE`).
