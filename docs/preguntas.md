# Preguntas para el propietario

Decisiones que la biblia deja **[Abierto]** y que el juego necesita para ser jugable. Mientras no haya respuesta, el juego usa una versión **provisional** (cifras en `src/datos/*.json`). Responde debajo de cada pregunta (o en el chat) y se aplicará.

Las preguntas del diseño anterior (temporadas de 20 semanas, deuda, muertes, etc.) quedaron obsoletas con la biblia.

## 1. Hoja de ruta: ¿qué contiene cada fase y qué supera cada puerta?

La biblia cita «4 fases, 3 puertas» pero el esquema no venía en el documento. El plan las reparte así, siguiendo la sección 18: 1 núcleo económico, 2 competencia (Prueba, mercado, rivales, instalaciones), 3 héroes con voluntad, 4 narrativa. ¿Es correcto?

## 2. Condición de victoria (sección 2) — RESUELTA

Respuesta: de momento, la partida termina al cerrar una temporada en el n.º 1.

## 3. Fórmula de éxito de misión y lesiones (sección 5) — RESUELTA

Respuesta: de momento sirve (75% de éxito con el poder justo; dificultades 20/55/125; fracasar paga el 25%; lesiones de 1 a 5 días). Además, los lesionados se pueden curar con oro desde el inventario de héroes (coste provisional: 150 + 8 × poder por cada día de lesión que queda).

## 4. ¿Qué pasa si no puedes pagar los sueldos? (sección 4) — RESUELTA

Respuesta: si un héroe no cobra durante un tiempo, se va a otro gremio. Aplicado: quien no cobra pierde 15 de lealtad y avisa; a las 2 semanas seguidas sin cobrar se va al rival con plaza que más oro tiene. Cuando no llega para todos, cobran primero los más poderosos (confirmado por el propietario).

## 5. Reclutamiento fuera de la Prueba (sección 18, fase 1) — RESUELTA

Respuesta: no hay reclutamiento. Fuera de la Prueba de los Novatos, solo se ficha comprando a otros gremios en el mercado.

## 6. Precios del mercado (sección 7)

Provisional: valor = 80 × poder + 50 × margen de crecimiento + 20 × reputación. Comprar cuesta el 90% del valor y vender da el 85%, al instante, al rival más interesado que tenga plaza y oro (vender por debajo de lo que cuesta comprar evita revender con beneficio). La Última Esperanza no vende a sus héroes. Ningún héroe se niega todavía (eso llega con la lealtad, fase 3).

El propietario pidió bajar los precios de compra (casi nunca se compraba): un héroe de poder 60–75 pasa de unos 12.000–15.000 a unos 5.500–7.000.

## 7. Instalaciones (sección 4)

Provisional: **Sede** (niveles 1–5; plazas 5/7/9/12/15; mejoras por 2.000/5.000/10.000/20.000) y **Ojeadores** (niveles 0–3; el rango de potencial pasa de 4 letras a 3, 2 y 1; mejoras por 1.500/4.000/8.000). Cada nivel suma prestigio. ¿Qué otras instalaciones quieres?

## 8. Pesos del ranking (sección 6)

Provisional: Prestigio = 20 por nivel de instalación + 3 por misión de rango alto completada + 15 por novato destacado (potencial real A o S) fichado. Así, al empezar, fuerza y prestigio pesan parecido en los rivales.

## 9. Prueba de los Novatos (sección 8)

Provisional: 5 candidatos; se ve su poder y su potencial en rango; salida al 30% de su valor e incrementos del 10% (mínimo 50); el jugador puja primero en cada ronda y los rivales después en orden fijo (eso resuelve los empates); sin plaza libre no se puede pujar. Al empezar cada subasta se ve qué maestros están interesados, pero no cuánto pagarían.

## 10. Rivales (sección 14)

Provisional: los cuatro primeros de la tabla (Dragón Carmesí, Corona Dorada, Sombras Negras y Última Esperanza), sin maestros con nombre. Cada día lanzan hasta 2 misiones con sus mejores héroes si tienen al menos un 60% de éxito; el día 7 pagan sueldos, pueden mejorar instalaciones y pujan según su estrategia. Mantienen 8 héroes como máximo: si fichan a alguien mejor, dejan marchar al más flojo. ¿Quieres el Gremio del León, nombres de maestros o más rivales?

## 11. Tensión económica (informe de balance) — RESUELTA

Respuesta: instalaciones más caras y sueldos más altos. Aplicado: sueldo = 100 + 25 × poder + 12 × reputación; la sede llega al nivel 7 con mejoras de 3.000 a 60.000; ojeadores por 3.000, 9.000 y 20.000. Ver `informe-balance.md`.

## 12. ¿Está bien la dificultad para llegar al n.º 1?

Con sueldos e instalaciones más caros, el oro aprieta toda la partida, pero subir cuesta más: el jugador automático ambicioso gana solo en el 5% de las partidas en 4 temporadas (antes, el 24%), y acaba de media 3.º. Una persona juega mejor que el bot, pero conviene que lo pruebes. Si se hace demasiado largo, las palancas son: premios de temporada más altos, rivales con menos prestigio inicial o héroes que crezcan más rápido.

## 13. Experiencia, subidas de poder y feedback al volver de misión — RESUELTA

Respuesta: el propietario acepta la propuesta completa. Barra de experiencia visible; al llenarse (21 puntos) el poder sube +3 de golpe; rangos F–S según el poder, y ascender solo sube el sueldo; techo al llegar al potencial; regreso de la misión en el resumen del día; sin experiencia extra. Recogido en la sección 9 de la biblia.

## 14. El estancamiento a partir de la segunda temporada — RESUELTA

Respuesta del propietario:
- **Tablón que crece:** sí. La categoría sube por prestigio y nunca baja. Aplicado: categorías D–S a 0/80/160/260/380 de prestigio; dificultad ×1–1,8 y recompensa ×1–1,75.
- **Ascensión:** sí, pero si fracasa el héroe muere. Aplicado: cuesta la mitad de su valor (mínimo 1.500), dura 3 días, éxito del 60% (desde F) al 35% (desde A). Si la supera, sube a la letra siguiente y su techo también.
- **Retos de los maestros:** sí, pero como duelos de héroes por clase y rango (ver la sección 14 de la biblia, \[Propuesta\]). Necesitan antes las clases (pregunta 15).

## 15. Clases y habilidades de los héroes — RESUELTA

Respuesta del propietario:
1. Cuatro clases: Guerrero, Mago, Explorador y Sanador.
2. Un solo efecto pasivo por clase.
3. Tipos de misión que favorecen a una clase concreta y, en las de grupo, a combinaciones de clases.
4. Retos: apuesta en oro; si ganas, oro y prestigio.
5. El título por Ascensión, para la fase 3 (apuntado en la biblia, sección 9).

Aplicado (cifras provisionales): Guerrero −50% de lesión; Mago +15% de poder en rango alto y +50% de lesión; Explorador −1 día en misiones de rango alto (al principio era en las de 2 días o más, pero desequilibraba los ingresos); Sanador −50% de lesión a sus compañeros. +5% de éxito por clase favorecida y +5% con la combinación completa. Retos: apuesta de 300 (F) a 2.500 (S) de oro y 8 de prestigio al ganar. Para compensar, la dificultad base de las misiones sube a 24/65/150.
