# Informe de balance

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

## Tres ramas de desarrollo (2026-11-07, rama `claude/tres-ramas-desarrollo`)

300 partidas por estrategia, hasta 4 temporadas. Nueva estrategia «Comerciante»: construye establecimientos pronto y deja a sus héroes trabajando.

| Métrica | Prudente | Comerciante | Ambiciosa |
| --- | --: | --: | --: |
| Puesto medio en la temporada 4 | 4,5 | 4,8 | 1,7 |
| Victoria en 4 temporadas o menos | 0% | 0% | 79% |
| Rama dominante al final | militar (96%) | económica 44%, militar 34%, investigación 18% | militar (100%) |
| Oro de misiones / de establecimientos | 268.000 / 3.500 | 134.000 / 26.000 | 289.000 / 600 |

- La especialización militar era demasiado fuerte al principio (el bot ambicioso llegaba al 90% de victorias): se bajaron sus puntos y bonificaciones.
- Un héroe en un establecimiento rinde como en una misión baja (unos 500 de oro al día), sin riesgo pero sin experiencia ni prestigio. La primera versión daba casi el doble y dejaba sin sentido las misiones.
- La vía económica es viable pero no gana partidas por sí sola: el ranking depende de la fuerza y el prestigio, y el oro solo ayuda si se gasta en héroes. Pendiente de probarlo jugando.

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
