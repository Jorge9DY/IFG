# Bitácora de desarrollo

Entradas más recientes primero.

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
