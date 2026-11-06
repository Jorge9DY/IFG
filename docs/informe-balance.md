# Informe de balance

Simulación con `npm run simular -- 300 1`: 300 partidas por estrategia (semillas 1–300), hasta 4 temporadas (112 días) o la victoria. Cifras provisionales de `src/datos/balance.json` y `src/datos/gremios.json` (ver `preguntas.md`).

## Estrategias del jugador automático

- **Prudente:** solo lanza misiones con al menos un 70% de éxito, puja hasta el valor del novato y no vende ni compra en el mercado.
- **Ambiciosa:** acepta un 55% de éxito, puja hasta el doble del valor, vende al más flojo para hacer sitio y compra en el mercado a quien mejore su top 5.

## Resultados

| Métrica | Prudente | Ambiciosa |
| --- | --: | --: |
| Puesto medio al cerrar la temporada 1 | 5,0 | 5,0 |
| Puesto medio al cerrar la temporada 2 | 5,0 | 4,6 |
| Puesto medio al cerrar la temporada 3 | 4,9 | 3,3 |
| Puesto medio al cerrar la temporada 4 | 4,9 | 2,2 |
| Victoria en 4 temporadas o menos | 0% | 24% |
| Semanas con sueldos impagados (de 16) | 0,0 | 0,1 |
| Semanas con menos de 1.000 de oro tras sueldos | 0,0 | 0,3 |
| Tasa de éxito en misiones | 85% | 85% |
| Novatos fichados | 11,0 | 21,1 |
| Ventas / compras en el mercado | 0 / 0 | 19,5 / 8,7 |
| Oro al final | 89.132 | 22.487 |
| Fuerza final (top 5) | 268 | 422 |

## Lectura

- **El arco funciona:** se empieza último y solo se sube invirtiendo en héroes (pujas fuertes, compras y ventas). Quien acumula oro sin arriesgar no sale del 5.º puesto.
- **La partida dura varias temporadas,** como pide la biblia: con un juego activo, el 1.º puesto llega entre la temporada 3 y la 4.
- **Falta tensión económica a medio plazo:** el oro solo aprieta las primeras semanas. Con 16 semanas casi nunca se baja de 1.000 de oro tras pagar sueldos. Hacen falta más usos del oro o sueldos más altos (pregunta 11).
- **Las lesiones** apartan a los héroes unos días, pero sin muertes el riesgo es moderado; encaja con «Fracasar puede reducir la recompensa y causar lesiones».
