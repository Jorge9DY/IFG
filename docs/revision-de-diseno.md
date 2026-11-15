# Revisión de diseño — 2026-11-15

Revisión pedida por el propietario («hay cosas que no funcionan bien y el diseño no se siente bien»). Se hizo como la haría un diseñador de videojuegos: jugando y midiendo, no solo leyendo el código.

## Método

1. **Playtest guiado:** un jugador nuevo que sigue las recomendaciones del juego durante 15 días, con capturas de cada pantalla y registro de errores de consola (Playwright).
2. **Simulación:** 150 partidas completas por estrategia (`npm run simular`) para medir el ritmo, la economía y las estrategias dominantes.
3. **Herramientas de análisis:**
   - **MDA:** de las mecánicas a la experiencia que se busca.
   - **Bucle principal y recorrido del jugador:** los primeros 15 minutos y la primera temporada.
   - **Curva de progreso:** cada cuánto siente el jugador que avanza.
   - **Economía de fuentes y sumideros de oro.**
   - **Calidad de las decisiones** («una sucesión de decisiones interesantes»).
   - **Carga cognitiva y jerarquía de la información**, frente al pilar «sencillo como un juego infantil».
   - **Feedback y ruido.**
   - **Heurísticas de usabilidad de juegos:** el estado siempre visible, el siguiente paso siempre claro y los errores evitables.

## Experiencia buscada (MDA)

- **Fantasía:** un gremio miserable que remonta hasta ser el mejor. Las emociones clave son la **esperanza**, el **progreso visible** y el **apego a los héroes**.
- **Dinámica central:** el oro entra (misiones), se convierte en héroes (Prueba y mercado) o en gremio (sede), y eso da puntos en el ranking.
- **Lo que se ve hoy:** el bucle funciona mecánicamente, pero tres de las cuatro emociones fallan en la primera temporada.

## Diagnóstico, de más a menos grave

| # | Problema | Herramienta | Gravedad | Estado |
| --- | --- | --- | --- | --- |
| 1 | **No se siente progreso.** Empiezas con 90 puntos y el 4.º tiene 547. Durante unas 10 semanas el resumen semanal decía «Te mantienes en el mismo puesto». La meta está tan lejos que deja de motivar (desesperanza aprendida). | Curva de progreso | Muy alta | Mitigado en la interfaz; **necesita decisión** (pregunta 21) |
| 2 | **El oro se acumula sin un destino claro.** 18.000–25.000 de oro el día 16, y en las simulaciones 40.000–100.000 al final. El pilar «¿cómo gestiono mi oro?» se diluye: no hay tensión. | Fuentes y sumideros | Alta | Mitigado (el objetivo sugiere en qué gastar); **necesita decisión** |
| 3 | **No había un «siguiente paso» claro.** El HUD solo decía «Prueba de los Novatos en N días». | Heurísticas y recorrido del jugador | Alta | **Corregido:** objetivo del momento |
| 4 | **La sede 3D no reflejaba el gremio.** El elemento más grande de la pantalla era decorado: siempre igual, tuvieras 4 o 15 héroes. | Feedback diegético | Media | **Corregido:** tus héroes aparecen en la sede |
| 5 | **Ruido en el resumen del día.** Cuatro líneas diarias de «X completa una misión de rango alto» tapaban lo importante. | Feedback y ruido | Media | **Corregido:** una sola línea |
| 6 | **Retos imposibles.** El maestro rival podía retarte con una clase que no tienes en ese rango, y el aviso rojo parpadeaba para nada. | Calidad de decisiones | Media | **Corregido:** elige retos a los que puedes responder |
| 7 | **Carga cognitiva alta en las cartas.** Poder, techo, experiencia, sueldo, lealtad, habilidad, rasgos, felicidad, estrés y vínculos en la misma carta, frente al pilar «infantil». | Jerarquía de la información | Media | **Mejorado:** el estado mental es una palabra, y las barras solo salen si algo va mal |
| 8 | **Demasiados sistemas a la vez para un jugador nuevo.** Diez rangos, 80 habilidades, sistema social, Ascensión, retos, torneo y mercado, todo desde el día 1. | Recorrido del jugador | Media | **Propuesta:** desbloqueo progresivo (pregunta 21) |
| 9 | **Las parejas casi no surgen.** Hace falta repetir muchas misiones juntos y nada te lo enseña. | Calidad de decisiones | Baja | Propuesta |

No hubo errores de consola en todo el playtest.

## Cambios aplicados

- **Objetivo del momento** bajo «Finalizar día», con una sola recomendación por orden de urgencia (`objetivoDelMomento` en `src/ui/ayudas.ts`):
  1. Un asunto urgente.
  2. Los sueldos en peligro.
  3. Héroes libres sin misión.
  4. Oro parado con la sede llena.
  5. Guardar oro antes de la Prueba.
  6. El siguiente gremio al que alcanzar.
  Si se puede resolver en un panel, al tocarla se abre.
- **Progreso semanal visible:** el resumen semanal dice cuántos puntos has ganado, cuántos te faltan para el gremio de delante y cuántas semanas tardarás a ese ritmo.
- **Sede viva:** cada héroe libre aparece como figura del color de su clase y los lesionados, tumbados junto a los dormitorios. Los que están de misión no están.
- **Noticias agrupadas** y **retos a los que puedes responder**.
- **Cartas más ligeras:** «Contento · tranquilo» en una línea; las barras de felicidad y estrés solo cuando hace falta.

## Decisiones que necesita el propietario (pregunta 21)

1. **La brecha del ranking.** Es el problema de fondo: ningún texto lo arregla si la meta está a 15 semanas.
   - **Recomendación:** que el ranking de cada temporada cuente **puntos de temporada** (misiones, retos, torneo, novatos destacados), que vuelven a 0 al empezar cada temporada. La fuerza se mantiene para el torneo y como desempate. Así cada temporada es una carrera que se puede ganar, y la remontada sigue siendo la historia de fondo.
   - **Alternativa más pequeña:** que tu meta sea alcanzar al gremio de justo delante, con un premio por adelantarlo.
2. **Economía.** Bajar un 25–30% las recompensas de las misiones o subir los sueldos con el rango, para que el oro vuelva a apretar. Se recomienda probarlo junto con la decisión 1.
3. **Desbloqueo progresivo.**
   - Semana 1: misiones y Prueba.
   - Semana 2: mercado y relaciones.
   - Temporada 2: Ascensión y retos.

   Son los mismos sistemas, presentados poco a poco, como en los juegos de Nintendo.
4. **Pista de relaciones:** al formar equipo, una frase del tipo «Si van juntos a menudo, se acercarán». No es un sistema nuevo; solo explica el que ya existe.
