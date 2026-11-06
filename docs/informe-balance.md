# Informe de balance — temporada 1

Resultado: la temporada 1 es superable y tensa al principio, pero se relaja a partir de la semana 6 y el jugador nunca sale del 5.º puesto. Las dos cosas necesitan una decisión de diseño antes de seguir ajustando números.

Generado con `npm run simular -- 1000 1` (1.000 temporadas por estrategia, semillas 1–1.000). Versión del balance: `src/datos/balance.json` a 6 de noviembre de 2026.

## Resultados

| Métrica | Prudente (≥ 70% de éxito) | Arriesgado (≥ 55% de éxito) | Objetivo |
| --- | --- | --- | --- |
| Quiebras en la temporada 1 | 7,4% | 21,7% | 10–25% |
| Semana media de la quiebra | 8,0 | 7,4 | — |
| Muertes por temporada | 0,4 | 0,6 | 1–3 |
| Puesto final (sin quiebra) | 5.º en el 100% | 5.º en el 100% | 4.º–5.º |
| Semanas con oro por debajo de 500 | 0,9 | 1,7 | ≥ 3 |
| Fichajes ganados | 5,2 | 5,1 | 3–6 |
| Misiones resueltas | 18,5 | 17,1 | — |
| Tasa de éxito en misiones | 88,2% | 81,5% | — |
| Oro al final (sin quiebra) | 10.899 | 10.957 | — |
| Prestigio al final | 31,7 | 27,3 | — |

## Ajustes ya aplicados

| Cambio | Antes | Ahora | Motivo |
| --- | --- | --- | --- |
| Misiones de los rivales por semana | 1–3, sin ocupar a sus héroes | 1–2; el equipo queda ocupado lo que dura la misión | Llegaban a prestigio 100 en 5 semanas |
| Fichajes de los rivales | Fichaban cualquier agente libre | Ignoran héroes muy por debajo del nivel de su plantilla; máximo 13 héroes | Vaciaban el mercado del jugador |
| Riesgo base de muerte (2+ / 1 / mismo rango) | 25% / 12% / 5% | 35% / 18% / 8% | Casi no había muertes |

## Hallazgos y decisiones pendientes

1. **El jugador no puede alcanzar a los rivales.** Al final de la temporada 1 los rivales tienen unos 500–600 Puntos de Gremio y el jugador unos 200. Sus prestigios se quedan en el tope de 100 y el ranking depende de `3 × prestigio`, así que la distancia no se cierra ni en 5 temporadas. Opciones:
    - que los Puntos de Gremio se basen solo en la temporada en curso (puntos de misión y prestigio ganado en la temporada);
    - que el prestigio de los rivales decaiga más deprisa o tenga un tope por debajo de 100;
    - que el jugador acceda antes a misiones de rango alto (con Elara, el equipo ya podría hacer misiones A).
2. **La economía se relaja a mitad de temporada.** Tras la semana 6 el oro crece sin parar (unos 11.000 al final). Opciones: subir los salarios, añadir gastos por héroe (equipo y comida) o reducir el oro de las misiones C y B.
3. **Pocas muertes con un juego sensato.** El jugador automático casi siempre manda misiones por debajo del rango de sus héroes. Es un comportamiento legítimo; quizá el objetivo de 1–3 muertes por temporada sea demasiado alto, o las misiones que más pagan deberían exigir más riesgo.

Hasta que se decidan estos puntos, el balance se considera **provisional**.
