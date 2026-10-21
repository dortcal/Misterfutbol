# Míster Fútbol 26·27

Juego de fútbol y mánager para navegador (ordenador, tablet y móvil) con los equipos y plantillas de **Primera y Segunda División 2026/27**. Está inspirado en los mánager de los 90: menús de barras verdes, rótulo dorado y partidos con **cámara cenital**.

## Modos de juego

- **Partido amistoso**: elige dos equipos de Primera, Segunda o la bolsa de Primera RFEF y decide cómo vivir el partido:
  - **Jugar**: controlas a tu equipo (teclado o mandos táctiles).
  - **Visionado**: ves el partido simulado en tiempo real (x1, x2 o x4), con cambios y táctica durante el partido.
  - **Resultado**: marcador final al instante con el teletipo del partido.
- **Sorteo inicial** (Jugar y Visionado): pide cara o cruz; quien gana elige sacar de centro o escoger campo y el rival se queda con la otra opción. En la segunda parte saca el otro equipo y se cambia de campo. En Jugar, tu saque de centro no se pone en juego hasta que pulsas PASE.
- **Liga Manager**: dirige a un club durante varias temporadas.
  - Alineación (6 sistemas), estilo, presión y tipo de pase.
  - Plantilla, fichajes (ventanas de verano e invierno), ofertas recibidas, venta de jugadores.
  - Entrenamiento semanal, finanzas (taquilla, TV, salarios, precio de la entrada), cantera.
  - Objetivos de la directiva: si no los cumples, te destituyen y recibes ofertas de otros clubes.
  - Clasificación con desempate por enfrentamiento directo, calendario, estadísticas (Pichichi, Zamora, asistencias, tarjetas, nota media).
  - **Ascensos y descensos**: bajan los 3 últimos de Primera; suben los 2 primeros de Segunda y el ganador del **playoff** (3º-6º, eliminatorias a doble partido; con empate global pasa el mejor clasificado). Los 4 últimos de Segunda bajan a Primera RFEF y suben 4 de la bolsa. Los filiales no pueden coincidir en categoría con su primer equipo.
  - Temporadas sucesivas: los jugadores envejecen, progresan o declinan y se retiran; se generan canteranos.
  - Guardado automático en el navegador (3 ranuras) y exportación/importación de partidas.

## Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Mover | Flechas o WASD | Joystick |
| Pase (mantén = pase largo) / entrada sin balón | X o J | Botón PASE |
| Tiro (mantén = potencia; apunta con la dirección) / cambiar de jugador sin balón | Z, K o Espacio | Botón TIRO |
| Pausa | P o Esc | Botón ❚❚ |

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
js/data/teams.js      46 clubes: nombre, estadio, aforo, presupuesto, colores de equipaciones
js/data/players.js    1.091 jugadores: dorsal, demarcación, media, edad, tono de piel y atributos
js/util.js            utilidades
js/db.js              formaciones, alineación automática, valor y salario de los jugadores
js/sim.js             simulación rápida (modo Resultado y resto de partidos de la jornada)
js/match.js           motor del partido en tiempo real (física, IA, faltas, fuera de juego, saques)
js/render.js          dibujo cenital del partido (Canvas 2D)
js/league.js          Liga Manager: calendario, clasificación, playoff, mercado, finanzas, temporadas
js/graphics.js        escudos, camisetas y caras generados por código
js/audio.js           música original y efectos sintetizados (Web Audio)
js/ui.js, matchui.js, manager.js, main.js   pantallas
```

## Editar datos

- **Equipos** (`js/data/teams.js`): colores `kit.home` / `kit.away` (`p` color principal, `s` secundario, `pat` dibujo: `plain`, `stripes`, `hoops`, `halves`, `quarters`, `sash`, `band`; `sh` pantalón; `so` medias), presupuesto en millones de euros.
- **Jugadores** (`js/data/players.js`): cada fila es `[id, equipo, dorsal, nombre, línea, demarcación, media, edad, tono de piel 1-4, pelo 0-4, nacionalidad, VEL, RES, AGR, CAL, PAS, TIR, REG, DEF, POR]`.

## Datos y avisos

- Plantillas obtenidas de las listas públicas de cada club en Wikipedia (octubre de 2026). Algunas listas estaban incompletas (Córdoba, Real Zaragoza, CD Mirandés): se completaron con información de la temporada anterior o con canteranos generados (marcados como "generado" en su ficha).
- Las **medias son estimaciones** basadas en el nivel y el rendimiento reciente de cada jugador; los equipos más potentes tienen mejores jugadores. El tono de piel es aproximado y se puede corregir en `players.js`.
- Escudos, equipaciones, gráficos, música y efectos son **originales y generados por código**; no se usan escudos oficiales ni material de otros juegos. Los nombres de clubes y jugadores se usan solo para identificarlos.
- Proyecto de aficionados sin relación con LaLiga, la RFEF ni los clubes.

Código bajo licencia MIT (ver `LICENSE`).
