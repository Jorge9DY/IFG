# Informe de balance

## Decisiones de la revisión de diseño (2026-11-15)

`npm run simular -- 150 1`, historia completa. Ranking por puntos de temporada (vuelven a 0), recompensas −28%, desbloqueo progresivo y rivales con un tope de unas 1,3 misiones al día.

| Métrica | Prudente | Ambiciosa |
| --- | --: | --: |
| Puesto medio al cerrar las temporadas 1 / 2 / 3 / 4 / 5 | 5,0 / 4,6 / 4,0 / 3,1 / 2,8 | 5,0 / 4,5 / 3,3 / 2,2 / 2,0 |
| Final «Leyenda» / «Respeto» / «Olvido» | 33% / 33% / 35% | 51% / 33% / 16% |
| Semanas con sueldos impagados (media) | 0,5 | 0,5 |
| Oro final | 35.920 | 18.854 |

Lectura:

- **El arco de remontada funciona:** último en la temporada 1 (a unos 50 puntos del 4.º, no a 450), escalada en la 2 y la 3, y lucha por el título en la 4 y la 5.
- **El oro vuelve a apretar:** al final quedan 19.000–36.000 (antes 40.000–100.000), y algún impago ocasional.
- **Invertir se paga:** la estrategia ambiciosa gana la historia el 51% de las veces; la prudente, el 33%.
- **Tope de misiones de los rivales:** sin él, un rival con 10 héroes ganaba siempre por volumen (con 2 al día, el ambicioso seguía 5.º en la temporada 1 y ganaba poco). Es provisional.

## Sistema social (2026-11-15)

`npm run simular -- 150 1`, historia completa. El ánimo (±15% de poder) desaparece; ahora cuentan las relaciones del equipo (±15% con tope) y el estrés alto (−5%).

| Métrica | Prudente | Ambiciosa |
| --- | --: | --: |
| Puesto medio al cerrar la temporada 5 | 5,0 | 3,3 |
| Final «Leyenda» / «Respeto» / «Olvido» | 0% / 1% / 99% | 29% / 17% / 54% |
| Héroes muertos en el gremio (media) | 0,0 | 3,9 |
| Tasa de éxito de misiones | 88% | 89% |
| Oro final | 103.609 | 37.701 |

Lectura: la estrategia ambiciosa gana algo menos (29% frente a 37%), porque ya no hay bonificación de ánimo y el bot no cuida las relaciones. El Segador casi nunca mata, porque las relaciones ya no empeoran solas con el tiempo. En 10 partidas del bot ambicioso hubo de media 31 amistades, 24 rivalidades, 10 rescates en misión, 11 discusiones y menos de una pareja por partida (el bot rota mucho los equipos).

## Modo historia con el catálogo de héroes (2026-11-14)

Simulación con `npm run simular -- 300 1`: 300 partidas por estrategia (semillas 1–300), la historia completa (5 temporadas, 140 días). Héroes del catálogo (`src/datos/heroes.json`), escala de diez rangos, relaciones, ánimo, muerte y las 80 habilidades. Cifras provisionales.

Cambios de balance para la nueva escala: dificultad base de las misiones 10/28/60 (antes 24/65/150) con multiplicadores por categoría ×1–×4; el valor de un héroe crece con el cuadrado del poder (comprar a un S cuesta unos 20.000 de oro); los rivales empiezan con 40.000–55.000 de oro y sede de nivel 5, porque pagan sueldos de héroes A y S.

| Métrica | Prudente | Ambiciosa |
| --- | --: | --: |
| Puesto medio al cerrar la temporada 1 | 5,0 | 5,0 |
| Puesto medio al cerrar la temporada 3 | 5,0 | 4,8 |
| Puesto medio al cerrar la temporada 4 | 5,0 | 3,8 |
| Puesto medio al cerrar la temporada 5 | 5,0 | 2,9 |
| Final «Leyenda» / «Respeto» / «Olvido» | 0% / 0% / 100% | 37% / 19% / 44% |
| Héroes muertos en el gremio (media) | 1,6 | 4,1 |
| Tasa de éxito de misiones | 88% | 90% |
| Novatos fichados | 13,4 | 26,0 |
| Compras / ventas en el mercado | 0 / 0 | 10,2 / 21,5 |
| Ascensiones intentadas | 0 | 7,7 |
| Oro final | 113.066 | 44.459 |
| Fuerza final (top 5) | 307 | 487 |

Lectura:

- **Historia de remontada:** el jugador empieza último y muy lejos (los rivales tienen héroes A y S). Nadie sale del 5.º puesto las dos primeras temporadas; quien invierte (fichajes, mercado, Ascensiones) empieza a escalar en la tercera y llega al 1.º en la última el 37% de las veces.
- **El prudente no remonta:** no compra en el mercado ni arriesga Ascensiones y acaba con 113.000 de oro sin gastar. Sobra oro si no se invierte; habrá que ajustar recompensas o dar más en qué gastar cuando se prueben los eventos.
- **Muertes:** el ambicioso pierde unos 4 héroes por partida, casi todos en Ascensiones; el prudente pierde 1–2, casi siempre por el Segador si lo ficha. Chimoku muere en su gremio rival a veces (los rivales lo guardan cuando le quedan 3 vidas).
- **Pendiente:** jugar a mano la historia completa para ver si el arranque (dos temporadas sin poder salir del último puesto) se hace largo.

## Prototipo anterior (héroes generados)

Simulación con `npm run simular -- 300 1`: 300 partidas por estrategia (semillas 1–300), hasta 4 temporadas (112 días) o la victoria. Cifras provisionales de `src/datos/balance.json` y `src/datos/gremios.json` (ver `preguntas.md`).

## Estrategias del jugador automático

- **Prudente:** solo lanza misiones con al menos un 70% de éxito, puja hasta el valor del novato y no vende ni compra en el mercado.
- **Ambiciosa:** acepta un 55% de éxito, puja hasta el doble del valor, vende al más flojo para hacer sitio y compra en el mercado a quien mejore su top 5.

## Resultados

Tras aplicar las decisiones del propietario (sueldos más altos, instalaciones más caras, impagos que hacen irse a los héroes).

| Métrica | Prudente | Ambiciosa |
| --- | --: | --: |
| Puesto medio al cerrar la temporada 1 | 5,0 | 5,0 |
| Puesto medio al cerrar la temporada 2 | 4,9 | 4,4 |
| Puesto medio al cerrar la temporada 3 | 4,5 | 3,6 |
| Puesto medio al cerrar la temporada 4 | 4,2 | 3,2 |
| Victoria en 4 temporadas o menos | 0% | 5% (8% sin reclutamiento; 10% con las subidas de +3) |
| Semanas con sueldos impagados (de 16) | 0,1 | 0,2 |
| Tasa de éxito en misiones | 88% | 87% |
| Novatos fichados | 6,1 | 8,8 |
| Ventas / compras en el mercado | 0 / 0 | 5,5 / 2,6 |
| Mejoras de instalaciones | 4,2 | 4,5 |
| Oro al final | 29.392 | 13.336 |
| Fuerza final (top 5) | 283 | 338 |

Versión anterior (sueldos e instalaciones baratos): el ambicioso ganaba en el 24% de las partidas y acababa con unos 22.000 de oro; el prudente acumulaba unos 89.000 sin usarlos.

## Techo tras la Ascensión (2026-11-07)

Tras ascender, el techo queda 1–3 rangos por encima. El bot ambicioso gana el 68% de las partidas en 4 temporadas (antes el 58%) e intenta unas 4 Ascensiones por partida. El prudente no cambia (0%). Pendiente de confirmar jugando si la Ascensión compensa demasiado.

## Con clases, tipos de misión y retos (2026-11-07)

| Métrica | Prudente | Ambiciosa |
| --- | --: | --: |
| Puesto medio al cerrar la temporada 2 | 5,0 | 4,2 |
| Puesto medio al cerrar la temporada 3 | 4,7 | 2,9 |
| Puesto medio al cerrar la temporada 4 | 4,6 | 2,1 |
| Victoria en 4 temporadas o menos | 0% | 52% |

- Las clases y los retos ayudan sobre todo al jugador que compone bien sus equipos. Sin ajustar, el bot ambicioso ganaba el 84%. Los rivales ahora también reciben misiones con tipo y eligen equipo según sus clases.
- El Explorador era lo que más desequilibraba (acortar misiones dispara los ingresos): ahora solo acorta las de rango alto. Además, la dificultad base sube a 24/65/150.
- Con todo, un jugador activo llega al n.º 1 hacia la temporada 3 o 4 (52% del bot ambicioso) y uno pasivo no sale de abajo. Pendiente de confirmar jugando.

## Tras el tablón que crece y la Ascensión (2026-11-07)

| Métrica | Prudente | Ambiciosa |
| --- | --: | --: |
| Puesto medio al cerrar la temporada 2 | 5,0 | 4,5 |
| Puesto medio al cerrar la temporada 3 | 4,7 | 3,4 |
| Puesto medio al cerrar la temporada 4 | 4,4 | 2,8 |
| Victoria en 4 temporadas o menos | 0% | 25% |
| Ascensiones intentadas | 0 | 4,7 |
| Oro al final | 29.837 | 10.633 |
| Fuerza final (top 5) | 279 | 391 |

- El tablón que crece da al jugador activo ingresos que acompañan a los gastos: sin la Ascensión, el bot ambicioso ganaba el 46% de las partidas. Los rivales también juegan con el tablón de su categoría y les cuesta más llenarlo.
- La Ascensión pesa: el bot la intenta con un 50% o más de probabilidad y pierde héroes; con ella gana el 25%. Una persona elegirá mejor a quién arriesgar.
- Cifras provisionales: categorías a 0/80/160/260/380 de prestigio, dificultad ×1–1,8, recompensa ×1–1,75; Ascensión al 60–35% por la mitad del valor del héroe.

## Lectura

- **El oro sobra mucho menos:** los sueldos crecen con la plantilla y cada nivel de la sede cuesta mucho más. El oro final baja de ~89.000 a ~29.000 (prudente) y de ~22.000 a ~13.000 (ambicioso). Aun así, el bot casi nunca baja de 1.000 de oro tras pagar sueldos: la tensión está en elegir entre pujar, mejorar o curar, no en quedarse sin nada.
- **Los rivales también sufren los sueldos:** varios se quedan sin oro, no pueden pujar y alguno pierde héroes que no cobran. Eso abre huecos para el jugador.
- **Subir cuesta más:** el bot ambicioso acaba de media 3.º tras 4 temporadas y gana el 5% de las veces. Una persona juega mejor, pero conviene probarlo (pregunta 12).
- **El prudente sigue acumulando oro** (~29.000 tras 4 temporadas) porque el bot no se atreve a pujar fuerte; no es un fallo de la economía.
- Ajustes hechos al equilibrar: experiencia por punto de poder 10 → 7, prestigio por misión alta 3 → 2, y la Corona Dorada y las Sombras Negras empiezan con menos instalaciones y novatos destacados.
