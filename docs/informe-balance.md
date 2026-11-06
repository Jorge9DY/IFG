# Informe de balance — temporada 1

Resultado: tras sintetizar el gameplay (tablón Segura/Justa/Arriesgada, sin elementos ni posiciones), la temporada 1 tiene una decisión de riesgo cada semana y escalar en la clasificación ya es posible. Antes, con las decisiones del propietario aplicadas, la temporada 1 es superable para un jugador prudente (12,9% de quiebras), castiga al arriesgado (28,2%) y la distancia con los rivales en la clasificación se ha reducido a la mitad. El jugador sigue terminando 5.º la temporada 1, que es lo esperado al empezar desde cero.

Generado con `npm run simular -- 1000 1` (1.000 temporadas por estrategia, semillas 1–1.000). Versión del balance: `src/datos/balance.json` a 6 de noviembre de 2026.

## Resultados (tras la síntesis del gameplay)

| Métrica | Prudente (≥ 70% de éxito) | Arriesgado (≥ 55% de éxito) | Objetivo |
| --- | --- | --- | --- |
| Quiebras en la temporada 1 | 24,3% | 26,2% | 10–25% |
| Muertes por temporada | 0,6 | 1,5 | 0,3–1 |
| Misiones por temporada | 15,7 | 15,2 | — |
| Tasa de éxito en misiones | 76,7% | 61,6% | 70–80% |
| Semanas sin ninguna decisión | ~1% | ~1% | < 10% |
| Oro al final (sin quiebra) | 9.643 | 14.320 | — |
| Puestos finales (sin quiebra) | 1.º 12 · 2.º 35 · 3.º 93 · 4.º 161 · 5.º 456 | 1.º 41 · 2.º 22 · 3.º 61 · 4.º 108 · 5.º 506 | Que escalar sea posible |

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
