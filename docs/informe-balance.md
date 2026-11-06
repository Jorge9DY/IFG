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

## Lectura

- **El oro sobra mucho menos:** los sueldos crecen con la plantilla y cada nivel de la sede cuesta mucho más. El oro final baja de ~89.000 a ~29.000 (prudente) y de ~22.000 a ~13.000 (ambicioso). Aun así, el bot casi nunca baja de 1.000 de oro tras pagar sueldos: la tensión está en elegir entre pujar, mejorar o curar, no en quedarse sin nada.
- **Los rivales también sufren los sueldos:** varios se quedan sin oro, no pueden pujar y alguno pierde héroes que no cobran. Eso abre huecos para el jugador.
- **Subir cuesta más:** el bot ambicioso acaba de media 3.º tras 4 temporadas y gana el 5% de las veces. Una persona juega mejor, pero conviene probarlo (pregunta 12).
- **El prudente sigue acumulando oro** (~29.000 tras 4 temporadas) porque el bot no se atreve a pujar fuerte; no es un fallo de la economía.
- Ajustes hechos al equilibrar: experiencia por punto de poder 10 → 7, prestigio por misión alta 3 → 2, y la Corona Dorada y las Sombras Negras empiezan con menos instalaciones y novatos destacados.
