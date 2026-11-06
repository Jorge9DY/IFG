# Informe de balance — temporada 1

Resultado: con las decisiones del propietario aplicadas, la temporada 1 es superable para un jugador prudente (12,9% de quiebras), castiga al arriesgado (28,2%) y la distancia con los rivales en la clasificación se ha reducido a la mitad. El jugador sigue terminando 5.º la temporada 1, que es lo esperado al empezar desde cero.

Generado con `npm run simular -- 1000 1` (1.000 temporadas por estrategia, semillas 1–1.000). Versión del balance: `src/datos/balance.json` a 6 de noviembre de 2026.

## Resultados

| Métrica | Prudente (≥ 70% de éxito) | Arriesgado (≥ 55% de éxito) | Objetivo |
| --- | --- | --- | --- |
| Quiebras en la temporada 1 | 12,9% | 28,2% | 10–25% |
| Muertes por temporada | 0,4 | 0,6 | 0,3–1 |
| Puesto final (sin quiebra) | 5.º en el 99,5% | 5.º en el 98,7% | 4.º–5.º |
| Semanas con oro por debajo de 500 | 1,5 | 1,9 | ≥ 3 |
| Fichajes ganados | 5,2 | 5,2 | 3–6 |
| Tasa de éxito en misiones | 88,1% | 81,3% | — |
| Oro al final (sin quiebra) | 8.879 | 8.904 | — |
| Prestigio al final | 30,3 | 25,8 | — |

Puntos de Gremio medios al final de la temporada 1 (jugador prudente, 200 partidas sin quiebra): Tejedores 271 · Colmillo 254 · Alba 233 · Corona 207 · **Llama Menguante 124**. Con la fórmula anterior la distancia era de unos 200 frente a 550.

## Decisiones del propietario aplicadas

| Pregunta | Decisión | Cómo se aplicó |
| --- | --- | --- |
| 1. Distancia con los rivales | A: clasificación por temporada | Puntos de Gremio = 3 × prestigio ganado en la temporada + puntos de misión. La reputación ya no suma puntos. |
| 2. Tensión económica | A: gasto por héroe | Manutención semanal según rango (F/D 20 · C 25 · B 30 · A 35 · S 40; Elara no cuenta). |
| 3. Muertes | Están bien como están | Objetivo nuevo: 0,3–1 por temporada. |

## Ajustes aplicados

| Cambio | Antes | Ahora | Motivo |
| --- | --- | --- | --- |
| Misiones de los rivales por semana | 1–3, sin ocupar a sus héroes | 1–2; el equipo queda ocupado lo que dura la misión | Llegaban a prestigio 100 en 5 semanas |
| Fichajes de los rivales | Fichaban cualquier agente libre | Ignoran héroes muy por debajo de su nivel; máximo 13 héroes | Vaciaban el mercado del jugador |
| Riesgo base de muerte (2+ / 1 / mismo rango) | 25% / 12% / 5% | 35% / 18% / 8% | Casi no había muertes |
| Sabotajes del Colmillo | Desde la semana 1 | Desde la semana 5 | Las quiebras subían al 20% / 32% |
| Manutención de Elara | 40 por semana | 0 | Es la dueña del gremio; con ella las quiebras subían al 28% / 41% |
| Oro inicial | 3.000 | 3.500 | Compensa la manutención en las primeras semanas (quiebras 21% / 36% sin el cambio) |

## Observaciones

1. **El jugador arriesgado quiebra algo por encima del objetivo (28,2%).** Se considera aceptable: arriesgar debe tener coste. Si las pruebas con jugadores lo confirman como frustrante, la palanca es el oro inicial.
2. **La tensión económica sigue concentrada al principio.** A mitad de temporada el oro crece (unos 8.900 al final). Las mejoras de la sede (33.000 en total) son el sumidero previsto; el jugador automático todavía no las compra, así que el simulador no lo refleja.
3. **El ascenso es cosa de varias temporadas.** En la temporada 1 los rivales hacen misiones A (12 puntos) y el jugador C (4 puntos). Cuando haya más temporadas (v0.2), el simulador deberá medir si el jugador puede llegar al 1.º en 5.
