# Bitácora de desarrollo

Entradas más recientes primero.

## 2026-11-07 — Mercado más barato

- Petición del propietario: comprar en el mercado era tan caro que casi nunca se hacía. La reputación pesa menos en el valor (60 → 20 por punto), comprar cuesta el 90% del valor (antes el 130%) y vender da el 85% (antes el 90%), justo por debajo para que revender no dé beneficio.
- Un héroe de poder 60–75 pasa de 12.000–15.000 a 5.500–7.000. El bot ambicioso compra el doble (5,8 compras en 4 temporadas). Gana el 6% de las partidas.
- Pendiente de diseñar con el propietario: el estancamiento a partir de la segunda temporada (pregunta 14).

## 2026-11-06 — Experiencia, subidas de poder y rangos

- Diseñado con el propietario y aceptado (biblia, sección 9): barra de experiencia visible; al llenarse (21 puntos) el poder sube +3 de golpe, al mismo ritmo que antes (+1 cada 7), así que el balance no cambia; rangos F–S según el poder, y ascender solo sube el sueldo; techo al llegar al potencial, que revela el potencial real.
- Interfaz: rango y barra en el inventario y en las cartas. El resumen del día muestra el regreso de cada misión héroe a héroe, con la barra animada (respeta «reducir movimiento»), «¡Sube de poder!», «¡Asciende a rango C!» con el sueldo nuevo, «Ha llegado a su límite» y las lesiones.
- Arreglado el signo «−» que pisaba el texto del botón Gestionar gremio.
- 44 tests; probado en navegador sin errores.

## 2026-11-06 — Sin reclutamiento y sin aviso flotante en la sede

- Decisión del propietario: se elimina el reclutamiento. Fuera de la Prueba de los Novatos solo se ficha comprando a otros gremios en el mercado. Quitados la pestaña Reclutar, los reclutas del motor y sus cifras. La recepción de la sede 3D abre ahora las instalaciones.
- Bug visual: el aviso «E · acción» de la sede tapaba el botón del Mercado. Eliminado; los anillos cian siguen marcando los puntos y E los usa.
- Confirmado el orden de pago de sueldos (los más poderosos primero).
- Guardado versión 5. Simulador: el ambicioso gana el 8% en 4 temporadas (antes, 5%).
- Pendiente de diseñar con el propietario: feedback al volver de misión, experiencia y subidas de poder (propuesta en `preguntas.md`, pregunta 13).

## 2026-11-06 — Decisiones del propietario: impagos, curación, inventario y oro más caro

- Victoria: cerrar una temporada en el n.º 1 (ya era así; ahora es decisión aceptada en la biblia).
- Impagos: si no llega el oro, cobran primero los más poderosos; quien no cobra pierde 15 de lealtad y avisa; a las 2 semanas seguidas sin cobrar se va al rival con plaza más rico (si estaba de misión, el equipo sigue sin él).
- Curación: los lesionados se curan al momento pagando oro (150 + 8 × poder por día que queda).
- Inventario de héroes en Gestionar gremio → Héroes: lesionados (con botón Curar), de misión (cuál y cuándo vuelve) y libres, con aviso de quién no ha cobrado. El botón principal resume cuántos hay de cada. La formación de misión indica quién no está disponible.
- Economía: sueldos 100 + 25 × poder + 12 × reputación; sede hasta nivel 7 (3.000–60.000); ojeadores 3.000/9.000/20.000. Rebalanceo con el simulador (ver informe).
- Biblia actualizada con las decisiones y su registro de cambios. Guardado versión 4: las partidas anteriores empiezan de cero.
- 43 tests; probado en navegador sin errores.
- Queda: pregunta 12 (¿es demasiado difícil llegar al n.º 1?), orden de pago de los sueldos y el resto de preguntas abiertas.

## 2026-11-06 — El juego rehecho según la biblia del proyecto

- Petición del propietario: rehacer el juego con la nueva biblia (`docs/biblia.md`) manteniendo la interfaz. El diseño anterior pasa a `docs/archivo/`.
- Motor reescrito: «Finalizar día», tablón diario de tres misiones (bajo, medio, alto) con duraciones 1/2/3 y equipos de 1/2/3 héroes, varias misiones por día, lesiones en lugar de muertes, sueldos el día 7 antes de la Prueba, ranking Fuerza (top 5) + Prestigio actualizado cada semana, temporadas de 28 días con premio y varias temporadas por partida.
- Prueba de los Novatos con subasta ascendente por turnos y límite oculto de los rivales; potencial en rango que estrechan los ojeadores; mercado de compra y venta; cuatro rivales con estrategia propia.
- Eliminado: Elara, deuda y quiebra, muertes, clases, razas, rasgos y vínculos antiguos, moral, patrocinio, Modo Clemente. Rasgos, relaciones y lealtad con efectos llegan en la fase 3, como dice la biblia.
- Interfaz: los cinco elementos de la sección 3; Gestionar gremio con pestañas Plantilla, Reclutar, Instalaciones y Ranking.
- Lo que la biblia deja [Abierto] tiene una versión provisional y una pregunta en `docs/preguntas.md` (11 preguntas).
- 36 tests; simulador nuevo (varias temporadas); probado en navegador con Playwright sin errores.
- Queda: respuestas del propietario, más tensión económica a medio plazo (pregunta 11), puerta de la fase 1.

## 2026-11-06 — El juego rehecho por días, con extrema sencillez

- Petición del propietario: reducir el juego a "tienes oro, ¿cómo lo gestionas para hacer más fuerte a tu gremio?" con una interfaz de juego infantil.
- Pantalla principal: oro en grande arriba a la izquierda, Terminar día arriba a la derecha, Gestionar gremio a la izquierda, Mercado en el centro y Lanzar misión a la derecha. Se mantiene la sede 3D en el centro.
- Motor: `terminarDia()` (28 días, 4 semanas), 3 misiones diarias y una sola elegible, equipos de 1 a 5, Prueba de Novatos el día 7 con subasta en tiempo real (`subasta.ts`), mercado de compra y venta inmediata (`mercado.ts`), nivel de sede (`sede.ts`). Los rivales hacen misiones a diario.
- Eliminado: sobornos y acciones especiales de los rivales, ofertas y contraofertas, agentes libres, cesiones, las seis mejoras sueltas.
- Balance: quiebras 3% (prudente) y 16% (arriesgado); cualquier puesto final es posible.
- 68 tests; probado en navegador (una semana completa con subasta) sin errores.

## 2026-11-06 — Síntesis del gameplay

- Petición del propietario: dejar el juego en su esencia más divertida sin añadir sistemas.
- Tablón: 3 misiones semanales a medida (Segura, Justa, Arriesgada; una Justa más con 7+ héroes), todas de 1 semana.
- Eliminados: elementos, efecto de las posiciones, cesiones. Héroes con un único número de Poder. Riesgo base de muerte 25/12/6%.
- Resultado: 1% de semanas sin decisión (antes 24%), 77% de éxito prudente, y ya se puede terminar en el Top 3. Ver sección 0 del diseño e informe de balance.

## 2026-11-06 — Interfaz intuitiva sin perder profundidad

- Cartas de héroe en mercado, plantilla y otros gremios: rango, clase, elemento, barras de stats (la principal en cian), moral, rasgos con explicación al pasar el ratón y vínculos.
- Mercado con pestañas (héroes libres / otros gremios) y puja en un clic: ofertas Justa, Generosa y Todo lo posible con su probabilidad estimada; el ajuste manual sigue disponible plegado.
- Misiones con etiqueta de dificultad (Fácil, Asequible, Arriesgada, Muy difícil) calculada con tu mejor equipo.
- Formación visual en tres columnas: el equipo recomendado aparece ya colocado (el más modesto que llega al 80%, para no gastar a los mejores), se mueve con ‹ › y se quita con ×; medidor grande de éxito y riesgo por héroe.
- Nuevo `src/ui/ayudas.ts` con 9 tests (89 en total).

## 2026-11-06 — Estilo táctico (segunda referencia del propietario)

- Se mantiene la disposición: fondo negro, habitación pequeña en el centro, menús a los lados.
- Nuevo aspecto: grises, líneas blancas finas, cajas negras translúcidas, acentos cian, oliva y naranja; tipografías Rajdhani y Noto Sans.
- Emblema propio del gremio (llama en un triángulo), código de operación «temporada-semana», objetivo sobre barra naranja entre 「」, menú como lista de respuestas con atajos <1>–<6>, rangos en hexágonos.
- Escena con colores desaturados: personaje oliva con visor cian y marcadores cian.

## 2026-11-06 — Nuevo estilo visual (referencia del propietario)

- Fondo negro (#2b2b2b) con la habitación del gremio recortada en el centro como una viñeta.
- HUD en las cuatro esquinas: semana y lugar, objetivo del momento (qué hacer ahora), botón principal verde "Terminar semana" y plantilla con barras de estado.
- Menú lateral de etiquetas de papel con atajos 1–6; el menú resalta el panel que resuelve el objetivo.
- Sede 3D con sombreado de dibujo animado, contornos negros, cámara isométrica fija y personaje rosa con marcador.
- Tipografías Permanent Marker y Patrick Hand (Google Fonts).
- Principio de diseño nuevo: juego intuitivo y fácil de usar, al estilo Nintendo.

## 2026-11-06 — Respuestas del propietario aplicadas

- Pregunta 1 (A): la clasificación cuenta solo la temporada en curso (3 × prestigio ganado + puntos de misión). La distancia con los rivales baja de ~200/550 a ~124/207–271.
- Pregunta 2 (A): manutención semanal por héroe (20–40 según rango; Elara no cuenta). Para no disparar las quiebras, oro inicial 3.500.
- Pregunta 3: las muertes se quedan como están; objetivo 0,3–1 por temporada.
- Resultado: quiebras 12,9% (prudente) y 28,2% (arriesgado). Informe de balance reescrito; diseño (secciones 10 y 11) y tests actualizados (80 tests).
- Interfaz: la clasificación muestra puntos de misión y prestigio ganado; la estimación de gastos incluye la manutención.

## 2026-11-06 — Interfaz de mejoras, cláusulas, cesiones y sobornos

- Panel de Elara: tabla de mejoras de la sede con coste, efecto y botón Construir.
- Mercado: sección "Héroes de otros gremios" con pestañas por gremio, pago de cláusula y cesión de 4 semanas.
- Plantilla: aviso de soborno con botón Retener; los cedidos muestran hasta qué semana se quedan.
- Probado con Playwright (mejora, retener, cláusula, cesión y cierre de semana) sin errores.
- Queda: aspecto del protagonista, movimiento con clic, assets 3D, narrativa; preguntas 1–3 de balance.

## 2026-11-06 — Mejoras de la sede, cláusulas y cesiones (motor)

- `src/motor/sede.ts`: construir las 6 mejoras con sus efectos (plantilla 10/15, enfermería, +20% XP, biblioteca, banquetes). Costes y efectos en `balance.json`.
- `src/motor/traspasos.ts`: pagar la cláusula de rescisión de un héroe rival y pedir héroes cedidos 4–8 semanas (20% del oro de sus misiones para su gremio; vuelven al terminar).
- Los cedidos no se pueden vender ni sobornar. 13 tests nuevos (78 en total). Balance sin cambios: el bot no usa estas acciones.
- Nota para la pregunta 2: las mejoras son un sumidero de oro para la segunda mitad de la temporada.
- Falta la interfaz de estas acciones (bloque C).

## 2026-11-06 — Soborno y modo amenaza

- Soborno del Colmillo: tienta a un héroe Codicioso; si no se le sube el salario un 30% antes del cierre siguiente, se va al Colmillo (`retenerHeroe`, `resolverSobornos`).
- Modo amenaza: si el jugador sube 2 puestos en la temporada, los rivales pujan un 10% más fuerte y el Colmillo sabotea el doble.
- El jugador automático retiene a los sobornados si tiene más de 2.000 de oro. Balance sin cambios apreciables (quiebras 12,7% / 25,1%).
- 5 tests nuevos (65 en total). Falta el botón de retener en la interfaz (bloque C).

## 2026-11-06 — Acciones especiales de los rivales (turno del agente)

- Nuevo `src/motor/rivales.ts`: Veto del Duque, espionaje de los Tejedores, rumores y robo de misiones del Colmillo, y oferta anual de la Corona por tu mejor héroe. Cifras en `balance.json` (`sabotajes`). 9 tests nuevos (60 en total).
- Los sucesos de tus acciones durante la semana (fichajes, vetos, espionaje) ya no se borran al cerrarla: aparecen en el informe.
- Balance: con sabotajes desde la semana 1 las quiebras subían al 20–32%. Ahora empiezan en la semana 5: 13,2% (prudente) y 25,1% (arriesgado). Informe actualizado.
- Queda: soborno y modo "amenaza", cesiones, cláusulas y mejoras de la sede; aspecto del protagonista; preguntas 1–3 de balance sin responder.

## 2026-11-06 — Fase 3: la temporada se juega en el navegador

- Paneles de gestión sobre la sede 3D: nueva partida (nombre y Modo Clemente), plantilla con ventas y ofertas, tablón y formación con probabilidad de éxito y riesgo en vivo, mercado con puja y desglose de puntuación, clasificación, informe de la semana, consejos de Elara, terminar semana y pantalla de fin.
- Los puntos de la sede 3D abren su panel; el personaje se queda quieto mientras hay un panel abierto.
- Guardado automático en el navegador.
- Motor: `vistaPreviaMision` (con tests) para que la Formación no duplique reglas.
- Probado con Playwright: partida nueva, 3 fichajes, misión enviada, 3 semanas cerradas y recarga sin errores.
- Queda: mejoras de la sede, aspecto del protagonista, acciones especiales de los rivales, cesiones y cláusulas; preguntas de balance 1–3.

## 2026-11-06 — Repositorio público

- El repositorio pasa a ser público. Revisado el historial: sin claves, contraseñas ni emails personales.
- Nuevas reglas de seguridad en `CLAUDE.md`, `.gitignore` reforzado y escáner de secretos (gitleaks) en CI.
- Vuelve la publicación en GitHub Pages.

## 2026-11-06 — Publicación

- Eliminado el flujo de GitHub Pages: no es gratis en repositorios privados. El build usa rutas relativas y sirve para cualquier hosting estático. Pendiente de decidir dónde publicar (pregunta 4).

## 2026-11-06 — Fase 1 completa y simulador de balance

- Motor: generación de héroes y vínculos, XP y envejecimiento, ventas y contraofertas, vínculos y moral, IA de los rivales, estado de la partida y `terminarSemana()`. Una temporada completa se juega por código.
- Simulador (`npm run simular`) con jugador prudente y arriesgado; informe en `docs/informe-balance.md`.
- Ajustes: los rivales hacen 1–2 misiones por semana y sus héroes quedan ocupados; no fichan héroes muy por debajo de su nivel; riesgo de muerte subido a 35/18/8%.
- 49 tests pasan.
- Queda: acciones especiales de los rivales, cesiones, cláusulas y mejoras de la sede; decisiones de balance pendientes (ver `docs/preguntas.md`); fase 3 (paneles).

## 2026-11-06 — Fase 0 y primer bloque de la fase 1

- Proyecto con TypeScript, Vite, Vitest y Three.js; CI y publicación en GitHub Pages.
- Motor: azar, tipos, misiones, pujas, economía, ranking. Sede 3D con formas simples.
