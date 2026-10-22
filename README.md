# Míster Fútbol 26·27

Juego de fútbol y mánager para navegador (ordenador, tablet y móvil) con los equipos y plantillas de **Primera y Segunda División 2026/27**. Está inspirado en los mánager de los 90: menús de barras verdes, rótulo dorado y partidos con **cámara cenital**.

## Modos de juego

- **Partido amistoso**: elige dos equipos de Primera, Segunda o la bolsa de Primera RFEF y decide cómo vivir el partido:
  - **Visionado**: ves el partido simulado en tiempo real (x1, x2 o x4), con cambios y táctica durante el partido.
  - **Resultado**: teletipo minuto a minuto que puedes pausar para cambiar la táctica y hacer sustituciones, o dejar que dirija el segundo entrenador.
  - **2 jugadores**: cada persona elige su equipo y escribe su nombre; preparan alineación y táctica y el partido lo dirigen los segundos entrenadores. El resumen anuncia quién gana.
  - El modo **Jugar** está desactivado temporalmente (se reactiva con `UI.PLAY_ENABLED = true` en `js/ui.js`).
- **Liga Manager**: dirige a un club durante varias temporadas.
  - **Partida de 2 jugadores por turnos** en el mismo dispositivo: cada uno con su club, su plantilla, su personal, sus finanzas y su directiva. En cada jornada juega primero uno y luego el otro (pantalla de «pasa el dispositivo»); cuando ambos han terminado se disputa la jornada. Cuando los dos equipos se enfrentan, el partido lo dirigen obligatoriamente los segundos entrenadores y se ve juntos. Los dos mánagers pueden comprarse y venderse jugadores: la oferta debe estar entre el 50% y el 150% del valor real del futbolista y el otro la acepta o la rechaza en su turno. Si uno es destituido recibe 3 ofertas de clubes de la liga en la que juega el otro (nunca de los 6 primeros clasificados), o se retira y el otro sigue en solitario.
  - **Equipos reconocibles**: los clubes de la IA cambian como mucho 3 jugadores de una temporada a otra (3 altas y 3 bajas, incluidas retiradas), así siguen siendo reconocibles aunque pasen muchas temporadas. En la primera temporada no se fichan entre ellos: solo compran o venden jugadores a los mánagers humanos.
  - Alineación (6 sistemas), estilo, presión y tipo de pase. **No hay táctica ideal**: cada opción rinde según los atributos de tus jugadores y los del rival (centro del campo, bandas, velocidad de delanteros y defensas, calidad de pase, resistencia). El segundo entrenador da un informe antes de cada partido.
  - **Personal del club** (1 a 5 estrellas, con caras y nombres divertidos): segundo entrenador, recuperador de lesiones, preparador físico, psicólogo, director deportivo, director de marketing y entrenador de cantera. Se pueden despedir y contratar en el mercado libre.
  - **Competiciones internacionales**: Champions, Europa League y Conference League con el formato actual (fase de liga de 36 equipos, previa 9º-24º, eliminatorias a doble partido y final en campo neutral), Supercopa de Europa, Copa Intercontinental de la FIFA y Mundial de Clubes (2029 y cada cuatro años). 130 clubes extranjeros no seleccionables.
  - Cansancio durante el partido (los jugadores cansados corren menos y fallan más), barrera de cuatro jugadores en las faltas cercanas y rivales fuera del área en los saques de meta.
  - Música de los menús: cinco temas originales en estilos deportivos (himno coral de gala, synth de acción ochentero, fanfarria de retransmisión, rock de entrenamiento y eurodance), seleccionables en Opciones.
  - **Sonido en el móvil**: si el sistema pausa el sonido (pantalla bloqueada, cambio de app, llamada), el siguiente toque lo reanuda. En iPhone/iPad (iOS 16.4 o posterior) suena aunque el interruptor de silencio esté activado, como un vídeo; para silenciarlo está el botón ♪.
  - Efectos de partido sintetizados: golpeo, cabezazo, entrada, palo y larguero, red, «¡uyyy!», aplausos, silbidos, abucheos, cánticos, palmas y bombo de la grada.
  - Los veteranos anuncian su retirada durante la temporada y ya no se pueden traspasar. Nadie juega más allá de los 42 años. Los filiales no fichan ni pueden subir a Primera.
  - Plantilla y **mercado abierto hasta la jornada 29** (cerrado de la 30 al final de la temporada): Primera, Segunda, Primera RFEF y estrellas de otras ligas (Premier, Serie A, Bundesliga, Ligue 1, Liga Portugal, Saudi Pro League, MLS, Süper Lig). Ofertas recibidas (también de clubes extranjeros) y venta de jugadores.
  - **Supercopa de España** (campeón y subcampeón de Liga y finalistas de Copa). La edición 2027 se juega en Estambul con los emparejamientos reales.
  - **Premios** por ronda superada y por título en todas las competiciones, según su importancia.
  - **Eliminatorias**: con empate (o global igualado) se juega la prórroga, con un cambio más, y la tanda de penaltis dentro del propio partido.
  - **Alineación cómoda en el móvil**: al tocar un titular, la pantalla baja sola hasta los suplentes (con los de su posición en verde) y aparece un aviso abajo con «Cancelar». Al hacer el cambio vuelve al campo para verlo. La página ya no salta arriba con cada toque.
  - **Plantilla** con dos vistas: «Datos» (media, edad, forma, moral, goles, asistencias, nota y valor) y «Estadísticas de Liga» (partidos, goles, asistencias, nota media, amarillas y rojas, con totales). Se puede ordenar por cualquier columna y la vista de estadísticas cabe en el móvil en vertical.
  - **Tarjetas y sanciones por competición**:
    - En Liga, 5 amarillas suponen un partido de sanción en Liga.
    - En Copa, Supercopa y competiciones europeas, 3 amarillas suponen un partido de sanción en esa competición.
    - Una roja (directa o por doble amarilla) deja al jugador fuera del siguiente partido de esa competición. Las dos amarillas de la doble amarilla no cuentan para el ciclo.
    - Si el siguiente partido es una final, se perdona la sanción por acumulación de amarillas (la de una roja, no).
    - En la alineación, cada jugador muestra sus amarillas en la competición del próximo partido (por ejemplo 2/3); en naranja, los apercibidos. Arriba aparecen los sancionados y los apercibidos, y la ficha del jugador detalla las tarjetas en cada competición.
    - En el modo Resultado, el teletipo muestra amarillas y rojas. En el panel de táctica y cambios (Resultado y Visionado) se ve quién tiene amarilla en el partido y cuántas lleva acumuladas en la competición.
  - **Polivalencia**: algunos jugadores dominan dos o tres posiciones; fuera de ellas rinden algo menos en su misma línea y bastante menos en otra.
  - En el resumen del partido aparecen los espectadores y el porcentaje de ocupación del estadio.
  - **Copa del Rey** entre semana con Primera, Segunda (sin filiales) y Primera RFEF: partido único en el campo del equipo con peor media de plantilla, prórroga y penaltis si hay empate, y final en campo neutral (estadio del club más potente de Primera que no la juega).
  - Entrenamiento semanal, finanzas (taquilla, TV, salarios, precio de la entrada), cantera.
  - Objetivo de la directiva visible al elegir club y durante la temporada (en objetivo / en riesgo / lejos). Si te alejas mucho, llegan avisos y un ultimátum, y te pueden destituir a mitad de temporada; después recibes ofertas de otros clubes.
  - Palmarés real de cada club (Liga, Copa, Champions, Europa League, Recopa hasta 2025-26) y títulos ganados en la partida.
  - **34 logros** desbloqueables (en el campo, mercado, títulos y carrera), guardados en el navegador para todas las partidas.
  - Clasificación con desempate por enfrentamiento directo, calendario, estadísticas (Pichichi, Zamora, asistencias, tarjetas, nota media).
  - **Ascensos y descensos**: bajan los 3 últimos de Primera; suben los 2 primeros de Segunda y el ganador del **playoff** (3º-6º, eliminatorias a doble partido; con empate global pasa el mejor clasificado). Los 4 últimos de Segunda bajan a Primera RFEF y suben 4 de la bolsa. Los filiales no pueden coincidir en categoría con su primer equipo.
  - **Premios individuales** al final de cada temporada: Balón de Oro (el jugador más destacado del campeón de la Champions o del Mundial de Clubes), Bota de Oro (máximo goleador sumando todas las competiciones), mejor portero, defensa, centrocampista y delantero, y el máximo goleador de cada competición (Primera, Segunda, Copa, Champions, Europa League, Conference y Mundial). Los clubes de los premiados reciben una pequeña cantidad (de 0,1 a 1,5 M€).
  - **Resumen de fin de temporada**: todos los campeones del año (Liga, Segunda, playoff, Copa, Supercopas, Champions, Europa League, Conference, Intercontinental y Mundial), tu balance, una nota de 1 a 5 estrellas con una frase divertida y una imagen de 1080 × 1350 para compartir en redes.
  - Temporadas sucesivas: los jugadores envejecen, progresan o declinan y se retiran; se generan canteranos.
  - **Canteranos reales**: además de los nombres generados, en las canteras aparecen los 165 convocados con las selecciones españolas sub-15, sub-16, sub-17, sub-18, sub-19 y sub-20 (listas de la RFEF de septiembre-octubre de 2026). Salen en su club cuando cumplen 16 años (los que juegan fuera de España, en cualquier club) y llevan la etiqueta 🇪🇸 de su categoría. Los que ya están en el juego no se repiten. Datos en `js/data/youth.js`.
  - **Fin de carrera opcional** a partir de la 5ª temporada: resumen de toda tu trayectoria (clubes, palmarés, mejor temporada, temporada a temporada y una valoración de 1 a 5 estrellas como entrenador) con imagen para redes. Puedes seguir jugando o retirarte; en la partida de 2 jugadores, el otro sigue en solitario.
  - **Clubes extranjeros vivos**: desde la tercera temporada sus jugadores envejecen y evolucionan, los veteranos se retiran y llegan jóvenes con nombres de su país.
  - Guardado automático en el navegador (3 ranuras).
  - **Seguir en otro dispositivo**: «Copia de seguridad» (tecla B) dentro de la partida, o «Exportar partida» en Liga Manager, descarga un archivo `.json` con la partida (en el móvil también se puede enviar con el menú de compartir). En el otro navegador, «Liga Manager → Importar partida» la carga en una ranura libre o, si las tres están ocupadas, en la que elijas. Funciona entre navegadores y dispositivos distintos, y también en las partidas de dos jugadores.

## Motor de simulación (modo Resultado y resto de partidos)

`js/sim.js` simula el partido minuto a minuto con un modelo **por ocasiones**:

- **Posesión**: cada minuto domina el balón uno de los dos equipos según su centro del campo, su calidad de pase, el plan de juego, el campo y el marcador. La posesión final es el tiempo con el balón.
- **Pases**: se juegan en los minutos con el balón; el acierto depende del pase y la calidad del equipo, del tipo de pase (corto, mixto, largo), de la presión rival y del cansancio.
- **Tiros y goles esperados (xG)**: los tiros salen de la calidad del ataque frente a la defensa rival. Un ataque mejor genera más tiros y de más calidad. Cada tiro es de un tipo (disparo lejano, remate en el área, de cabeza, ocasión clarísima o balón parado) con su propio xG y probabilidad de bloqueo y de ir a puerta. El rematador se elige según el tipo de ocasión, su puesto y sus atributos.
- **Portero**: cada tiro a puerta se resuelve como gol o parada según la calidad del portero. Las paradas, los bloqueos, los córners y las ocasiones falladas se registran como eventos.
- **Faltas**: de ellas salen las tarjetas (con el riesgo de la segunda amarilla) y los penaltis. Hay más faltas con presión alta, con jugadores agresivos y cuando se defiende.
- **Contexto**: el cansancio, las expulsiones y el marcador influyen (el que gana administra la ventaja; el que pierde arriesga y se descubre). La IA y el segundo entrenador cambian el plan a los minutos 60 y 75 según el resultado.
- **Coherencia**: el marcador, las estadísticas y el teletipo salen de los mismos eventos.

`node tools/calib.js <etiqueta> <vueltas>` simula ligas completas, tácticas, fatiga, porteros y partidos por tramos con semillas fijas, y comprueba que las estadísticas cuadran. `tools/result_antes.json` y `tools/result_despues.json` guardan la comparación del cambio de motor.

| Primera (10 temporadas simuladas) | Motor anterior | Motor actual | LaLiga 2024-25 |
|---|---|---|---|
| Goles por partido | 2,45 | 2,58 | 2,62 |
| Local / empate / visitante | 44,9 / 25,4 / 29,7 % | 44,9 / 26,6 / 28,5 % | 44,5 / 25,5 / 30,0 % |
| Partidos con 4+ goles de diferencia | 2,9 % | 5,2 % | 5,0 % |
| Tiros por equipo · a puerta | 8,7 · 3,9 | 11,3 · 4,0 | hipótesis: 12-13 · 4-4,5 |
| Córners por partido | 4,6 | 9,9 | hipótesis: 9-10 |
| Rojas por partido | 0,53 | 0,19 | hipótesis: 0,2-0,25 |
| Penaltis por partido | 0,23 | 0,33 | 0,34 (130 en la temporada) |

Los datos de LaLiga 2024-25 (goles, resultados, penaltis) salen de los resultados publicados de la temporada; los marcados como «hipótesis» son valores de diseño aproximados, sin una fuente verificada, que se pueden recalibrar en `SIM.CAL`.

**Visionado con el mismo motor**: en el campo 2D el partido también lo decide `js/sim.js`. El campo va pidiendo a la simulación cada minuto que pasa en el reloj; los goles, tarjetas, lesiones y cambios que salen de ella se representan en el campo (el goleador recibe el balón y marca; si la jugada no llega, el gol llega a balón parado), y los tiros de la física nunca deciden el marcador (el portero para o el balón sale rozando el palo). Los cambios y la táctica que hagas durante el partido se aplican también a la simulación. El modo Jugar (desactivado) sigue usando la física pura.

**Balón parado de la simulación**: el motor genera córners y faltas peligrosas (laterales y frontales). Algunos goles llegan de córner, de falta lateral, de falta directa (a veces con desvío en la barrera) o regateando al portero. En Visionado se escenifican así:
- **Córners**: una jugada de ataque se desvía en un defensa y sale por la línea de fondo, y el córner se ejecuta con su rutina.
- **Faltas**: el árbitro pita la falta donde está el atacante. Las laterales se juegan como un córner; las frontales, con barrera.
- **Goles**: el gol de córner o de falta lateral lo marca de cabeza el goleador que decide la simulación; el de falta directa entra por la escuadra o tras tocar en la barrera; en el regate, el delantero deja atrás al portero que sale a por él y marca a puerta vacía.
- **Narración**: el teletipo y el resumen cuentan cómo llegó cada gol.

**Campo 2D (Visionado)**:
- **Córners**: hay seis rutinas ofensivas (primer palo, segundo palo, punto de penalti, entre portero y defensa, en corto y pase atrás al borde del área) y tres esquemas defensivos (zonal, al hombre y mixto). Se eligen según el juego aéreo de los dos equipos, la táctica, el marcador y el minuto, y se evita repetir la última rutina.
- **Papeles en el córner**: cada jugador tiene uno (rematador, arrastre, segundo rematador, llegada desde segunda línea, rechace, vigilancia, marcaje, primer palo, borde del área, contraataque).
- **Colocación sin teletransportes**: los jugadores llegan corriendo a sus puestos y el saque espera a que estén colocados. Después del centro, los atacantes atacan su zona y los defensores siguen su marca o su zona.
- **Movimiento**: aceleración propia de cada jugador (velocidad y cansancio), separación también entre rivales, giro progresivo, carrera hacia atrás de cara al balón y pasos laterales al bascular. El que salta a rematar de cabeza se ve en el aire.
- **Sin saltos del balón**: el balón nunca aparece de golpe en otra zona. Si la simulación decide un gol, el equipo construye la jugada con pases (o roba el balón con un pase fallado del rival) hasta que el goleador llega a una zona de disparo; los goles de balón parado solo se escenifican si la falta o el córner ocurren en su zona.
- **Saques sin teletransportes**: al pitar una falta, un penalti o un saque, el balón viaja hasta el punto del saque (rodando o por el aire) y los jugadores que deben moverse (lanzador, barrera, rivales a 9,15 m, jugadores fuera del área en el penalti, portero en el saque de puerta) van corriendo a su sitio. El saque espera a que lleguen. El especialista en faltas va hasta el balón antes de lanzar.
- **Balón fuera**: en saques de puerta, córners y bandas, el balón cruza la línea y sigue rodando antes de que se reanude el juego.
- **Tarjetas con motivo**: el jugador amonestado comete una entrada a destiempo (con segada si llega tarde) y el árbitro pita falta antes de mostrar la tarjeta. Si no hay ocasión de hacer la falta, la tarjeta se enseña en una parada del juego con un motivo que encaje con el momento. Los motivos son: protestar, una falta anterior en la que se dio ventaja, quitarse la camiseta al celebrar su gol, perder tiempo (solo si su equipo gana), encararse con un rival, con el público o con el entrenador rival. En las tanganas, a veces también ve la amarilla el rival, y eso cuenta para el resto del partido. Las rojas directas son por agresión o por dirigirse de malas maneras al árbitro.
- **Final de cada parte**: el árbitro no pita mientras hay un disparo o un centro en el aire, durante el segundo y medio siguiente (por si hay rechace) ni con el balón dentro de un área, salvo si lo tiene el portero.
- **Fueras de juego**: los de la simulación se ven en el campo (pase al delantero adelantado, bandera y libre indirecto).
- **Sorteo de campo**: la moneda sale cara o cruz al 50 %, así que el rival también puede ganarlo.
- **Sin bloqueos**: hay vigilancia contra partidos parados. Fuerza la reanudación si el saque se atasca, quita el balón a un jugador sustituido o expulsado y cancela jugadas preparadas que no avanzan.
- **Táctica en el campo**: el jugador que presiona mantiene la presión salvo que otro esté claramente mejor situado, y el centro del campo se mantiene compacto sin balón. Los saques de puerta salen en corto o en largo según el tipo de pase elegido.

**Limitaciones conocidas**: los 0-0 (8,7 %) siguen algo por encima de los de la temporada real tomada como referencia. En Visionado, un gol puede verse uno o dos minutos después del minuto en que lo decide la simulación.

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
