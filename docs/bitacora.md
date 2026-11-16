# Bitácora de desarrollo

Entradas más recientes primero.

## 2026-11-16 — Dirección de arte del nuevo apartado gráfico (fase 0)

- Encargo del propietario: rehacer el apartado gráfico (héroes low poly con texturas pintadas por código, sede que crece, escenas de diálogo y retratos sacados del modelo). Encargo y dirección de arte en `docs/direccion-de-arte.md`.
- Hecho: la sección «Dirección de arte detallada», con paleta, proporciones y polígonos, texturas, luz, cámara, interfaz, generación de cada héroe desde el catálogo, formas especiales, sede por niveles, rendimiento, organización del código, plan por fases y riesgos.
- No se ha programado nada: no cambian el código, los datos ni los tests.
- Queda: el visto bueno del propietario y sus respuestas a la pregunta 24. Después, la fase 1 (muestra en `muestra.html` con una sala, HalfGoblin, Lumia, AllBlack y una escena de diálogo).
- Rama de trabajo aparte; no se mezcla con `main` sin permiso.

## 2026-11-16 — Habilidad desplegable al formar equipo y género visible

- Petición del propietario: al elegir héroes para una misión, cada uno tiene su habilidad desplegable debajo (con la misma regla de visibilidad). El género (♂ Hombre / ♀ Mujer) se ve en las cartas, en el inventario y en la formación. 147 tests; probado en navegador sin errores.

## 2026-11-16 — Mejoras del análisis de diseño

- Petición del propietario: desarrollar las mejoras del análisis.
- **Arcos de héroe** (`src/motor/historia.ts`, `src/datos/historia.json`):
  - 20 momentos con condiciones, opciones y marcas: los 4 Prota, Chimoku, Heredero y Topo, y Solus como némesis.
  - Epílogos «Qué fue de ellos» al terminar la historia.
  - Contenido provisional (pregunta 23).
- **Momentos destacados:** la escena sale en el centro con el retrato y las opciones (reutiliza el estilo de la gran revelación).
- **Rivales que crecen:**
  - El tope de misiones al día sube por temporada.
  - Entrenan cada semana a los héroes que pueden crecer.
- **Dilema diario:** al formar equipo, «Equipo más seguro» o «Equipo que une» (`equipoQueUne` en `src/ui/ayudas.ts`).
- **Carta en dos niveles:** a la vista poder, techo, habilidad y avisos; personalidad y relaciones, plegadas.
- **Importador de la hoja:** `herramientas/importar-hoja.ts` (CSV exportado → `heroes.json`; conserva habilidades, rasgos e índices).
- **Guía de playtest:** `docs/guia-playtest.md`.
- El bot del simulador decide los momentos de historia evitando vender o perder héroes.
- Simulación: la estrategia ambiciosa gana el 31% y la prudente el 11%. 147 tests; probado en navegador sin errores.

## 2026-11-16 — Romance con índices por personaje

- Respuestas del propietario a la pregunta 22:
  - **Romance mucho más frecuente**, sobre todo el no correspondido, con dos índices por personaje: «enamoradizo» y «atractivo» (1–5, en `src/datos/heroes.json`). Multiplican la atracción que se gana en cada misión juntos. La química oculta es más alta y ya no exige afinidad previa.
  - **Mascota y Chibi con puntos de temporada:** la Mascota da 2 puntos por semana y Chibi cuenta prestigio más puntos de temporada.
  - **Choques de carácter aprobados.**
- Medido con `herramientas/auditoria/social.ts` (10 partidas del bot ambicioso):
  - Unos 2 de cada 3 héroes del gremio acaban enamorados de alguien (66 de 102).
  - 1,5 parejas por partida (antes 0,1).
  - Unos 9 rechazos por partida.
- Los índices se ven en la ficha del héroe y en el detalle de cada pareja.
- Simulación: la estrategia ambiciosa gana el 55% y la prudente el 34%. 138 tests; probado en navegador sin errores.

## 2026-11-15 — Auditoría de habilidades

- Petición del propietario: comprobar las 80 habilidades (si funcionan, si el diseño es bueno, si se sienten con impacto) y que la descripción solo se vea tras fichar al héroe o con los ojeadores al máximo.
- Herramientas nuevas:
  - `herramientas/auditoria/habilidades.ts`: mide el efecto de cada habilidad y dónde actúa.
  - `herramientas/auditoria/social.ts`: mide cuánto actúa el sistema social en partidas completas.
- Informe en `docs/auditoria-habilidades.md`.
- Hecho:
  - «Habilidades en esta misión» al formar equipo (`efectosEnMision`).
  - Descripción oculta hasta fichar o con los ojeadores al máximo (`conoceHabilidad`; partida con `habilidadesConocidas`).
  - Choques de carácter.
  - Veyra y Aimul con umbrales más bajos.
  - La obsesión de Yandere crece el doble.
  - Zancadilla quita puntos de temporada.
- Simulación: la estrategia ambiciosa gana el 55% y la prudente el 27%. 136 tests; probado en navegador sin errores.
- Pendiente: pregunta 22.

## 2026-11-15 — Decisiones de la revisión de diseño aplicadas

- El propietario aprueba las cuatro propuestas de la pregunta 21.
- **Ranking por puntos de temporada** (`ranking.ts`: `sumarPuntos`, `puntosDe`). Puntos por misiones cumplidas, retos, novatos destacados, Ascensiones y torneo; vuelven a 0 al cerrar la temporada; la fuerza desempata.
- **Tope de misiones de los rivales** (unas 1,3 al día), para que no ganen solo por tener más héroes.
- **Recompensas −28%** (350 / 1.100 / 2.900).
- **Desbloqueo progresivo** (`desbloqueos.ts`): el mercado y las relaciones el día 8; la Ascensión y los retos el día 29. Se anuncian con «¡Nuevo!» y, mientras tanto, el mercado sale con candado. Las partidas guardadas lo tienen todo abierto.
- **Pista de relaciones** al formar equipo.
- 129 tests; probado en navegador sin errores. Simulación en `docs/informe-balance.md`.

## 2026-11-15 — Revisión de diseño

- Petición del propietario: revisar el juego con herramientas de diseñador profesional. Informe en `docs/revision-de-diseno.md` (playtest guiado de 15 días con capturas, simulación, MDA, curva de progreso, economía, decisiones, carga cognitiva y feedback).
- Corregido o mejorado:
  - Objetivo del momento en el HUD.
  - Progreso semanal en el ranking (puntos ganados y lo que falta para el de delante).
  - La sede 3D muestra a los héroes del gremio.
  - Noticias de rivales agrupadas.
  - Retos a los que puedes responder.
  - Cartas más ligeras.
- Pendiente de decisión (pregunta 21): la brecha del ranking, la economía con oro sobrante, el desbloqueo progresivo de sistemas y la pista de relaciones.
- 124 tests; probado en navegador sin errores.

## 2026-11-15 — Sistema social de los héroes

- Documento del propietario «Sistema social de héroes» v1.0, integrado con lo que ya había y con las habilidades.
- `relaciones.ts` (núcleo): un registro por pareja con afinidad, atracción en cada dirección, pareja/expareja, rivalidad e historial; rasgos de personalidad; felicidad y estrés (sustituyen al ánimo); memoria de hechos importantes; modificadores en misión con tope; consecuencias de misiones (protecciones, discusiones, rivalidades, celos por subir de poder), marchas y muertes.
- `eventosSociales.ts` y `src/datos/eventos-sociales.json`: declaración, rechazo, ruptura, celos, petición de no compartir equipo, descontento, abandono, crisis y duelo, con opciones (algunas cuestan oro), cooldowns, eventos únicos, prioridad y caducidad.
- Cifras en `src/datos/social.json`. Rasgos de los 80 héroes en el catálogo.
- Partida versión 10; las guardadas antiguas se convierten (`migracion.ts`).
- Interfaz: pestaña «Relaciones» en Gestionar gremio (asuntos pendientes, tabla de quién se lleva con quién y detalle con la historia de cada pareja); rasgos, felicidad y estrés en las cartas; desglose social y avisos al formar equipo; aviso de asuntos en el resumen del día y en el botón del gremio.
- Tests de los 14 criterios de aceptación y de la prueba de prototipo del documento (`tests/social.test.ts`). 122 tests; probado en navegador sin errores.
- Decisiones técnicas en la pregunta 20. Pendiente: jugar a mano la prueba de prototipo; pocas parejas con el bot.

## 2026-11-14 — Catálogo de héroes, relaciones y muerte

- Petición del propietario: clases y géneros del catálogo a criterio de Claude, escala de rangos de la hoja (rivales en su rango máximo, libres en F por la Prueba), crear los sistemas que falten con las relaciones como pilar, y resolver la muerte.
- Hoja de cálculo: columna O «Clase» y columna G «Género» rellenas (20 por clase; 40/40, 5 y 5 por rival).
- `src/datos/heroes.json`: los 80 héroes. El jugador empieza con los 4 «Prota»; cada rival, con sus 10 héroes; los 36 libres forman la bolsa de la Prueba (los no fichados vuelven a ella; si se vacía, llegan genéricos).
- Escala de diez rangos (F, E, D, C, C+, B, B+, A, A+, S); misiones, ojeo, Ascensión, retos y estilos adaptados.
- `relaciones.ts`: afinidad, compatibilidad oculta, química del equipo, amor y parejas, celos, ánimo (±15% de poder) y lealtad (a 0, se va).
- `muerte.ts`: muerte por Ascensión, por misiones altas con menos del 35% de éxito (marcadas), por habilidades (Chimoku, Segador, InsectLover); muro de los caídos, Nox hereda, Beato salva una vez por temporada.
- `habilidades.ts`: las 80 habilidades, enganchadas en misión, lesiones, oro, experiencia, semana, mercado, Prueba, sueldos, instalaciones y Ascensión. Las misiones piden huecos (AllBlack ocupa 3; Pacto, 2).
- Modo historia de 5 temporadas con tres finales por puesto (provisional).
- Interfaz: habilidad plegada, ánimo y vínculos en las cartas y el inventario; química y «Riesgo de muerte» al formar equipo; «En el gremio» en el resumen del día; muro de los caídos.
- Simulador: ahora juega la historia completa. El bot ambicioso termina 1.º el 37% de las veces; el prudente se queda último (no compra en el mercado).
- 117 tests; probado en navegador sin errores.
- Pendiente: supuestos de la pregunta 19; ascensiones de Bastión y Roble; eventos y finales por héroe.

## 2026-11-14 — Nueva dirección: modo historia

- Decisión del propietario: se descartan las tres ramas de desarrollo (economía e investigación). La rama `claude/tres-ramas-desarrollo` se conserva en GitHub sin integrar; el trabajo sigue en `claude/nifty-brown-p6ih7z`.
- Nueva dirección: modo historia con héroes diseñados (catálogo en una hoja de cálculo del propietario), duración de X temporadas, eventos con guion y rejugabilidad según en qué héroes se invierte (eventos y finales distintos). Foco en misiones, héroes y fichajes.
- El torneo de fin de temporada, que solo existía en la rama descartada, pasa a la versión principal (módulo `torneo.ts`, cifras en `balance.json`, resultados en el ranking de fin de temporada).
- Biblia, plan y preguntas (pregunta 18) actualizados. 83 tests.
- Pendiente: el enlace a la hoja de héroes y las decisiones de la pregunta 18.

## 2026-11-07 — Misiones repetibles y retratos de los héroes

- Petición del propietario: cada misión del tablón se puede lanzar tantas veces como equipos libres tengas, para decidir entre varias bajas o una alta. La carta muestra cuántas veces se ha lanzado hoy («×2 hoy») y avisa si el oro llegaría después de la Prueba de los Novatos; la formación indica qué día vuelve el equipo. Los rivales también reparten a todos sus héroes (ya no tienen tope de 2 misiones).
- Retratos provisionales (`src/ui/retrato.ts`, unas 50 líneas): una cara en SVG generada a partir del id del héroe, con piel, pelo, ojos y boca variados y un accesorio y color según su clase (casco, sombrero de mago, capucha, cinta de sanador). Aparecen en cartas, inventario, formación, regreso de misiones, barra de Ascensión y gran reveal.
- Equilibrio: el bot ambicioso gana el 72% en 4 temporadas (antes el 68%). 81 tests; probado en navegador sin errores.

## 2026-11-07 — Techo tras la Ascensión

- Petición del propietario: era raro que, al ascender a C, el techo fuera también C. Ahora el techo queda por encima del nuevo rango: +1 (75%), +2 «despertar extraordinario» (20%) o +3 «despertar legendario» (5%), con S como máximo. El techo nuevo se conoce con exactitud (campo `techoConocido`).
- El gran reveal lo celebra: línea extra y veredicto violeta (extraordinario) o dorado con destello (legendario).
- Equilibrio: la Ascensión rinde más y el bot ambicioso gana el 68% en 4 temporadas (antes el 58%). Se probó bajar su probabilidad de éxito, pero el bot deja de intentarla y la medida se distorsiona; queda como estaba (35–60%) a falta de probarlo jugando.
- 78 tests; probado en navegador sin errores.

## 2026-11-07 — Ascensión en la pantalla principal y gran reveal

- Peticiones del propietario:
  - El inventario muestra primero a los héroes libres (luego lesionados, entrenando y de misión).
  - Mientras dura una Ascensión, una barra bajo «Finalizar día» avanza cada día con una línea de lo que está sufriendo el héroe (textos en `src/narrativa/ascension.json`).
  - El día que termina, un gran reveal en el centro de la pantalla: líneas de tensión una a una y después el veredicto (asciende o cae). Se cierra con la ✕ o con Escape, tapa lo de detrás para no destripar el resultado y respeta «reducir movimiento».
- Solo interfaz y textos (el motor no cambia). 77 tests; probado en navegador sin errores.

## 2026-11-07 — Ojeo, fichajes ocultos y Prueba tipo gacha

- Fallo de diseño corregido: los rivales conocían el potencial real de todos los héroes, y el precio de salida de la subasta lo delataba. Ahora cada gremio valora con lo que ven sus ojeadores (`potencialEstimado`, `valorEstimado`) y los precios salen del valor público (`valorPublico`), así que puede haber joyas ocultas que se escapan a los gremios con pocos ojeadores.
- Cada héroe muestra por separado su rango actual (hexágono), su poder y su techo: las letras posibles más una interrogación, que desaparece al ver el techo exacto. A los héroes propios se les ve con un nivel más de ojeo. Etiquetas «Joya oculta» y «Sobrevalorado».
- La Prueba de los Novatos mejora con la categoría (de 5 a 7 novatos, más poder y más techos altos) y se presenta como sobres que brillan según el techo que ven tus ojeadores; se revelan uno a uno o todos, con animación.
- 77 tests; probado en navegador sin errores. Equilibrio: el bot ambicioso gana el 58% en 4 temporadas.

## 2026-11-07 — Análisis del estancamiento y zona de entrenamiento

- Análisis semana a semana con el simulador (nuevo `analisis.ts`). Las causas del estancamiento hacia la temporada 2 están en la pregunta 16: héroes que tocan techo, una Prueba de los Novatos que no crece, hitos muy separados, sueldos que se comen el crecimiento e instalaciones que daban poco.
- Idea del propietario aplicada: **zona de entrenamiento**, una instalación nueva (3 niveles: 4.000/10.000/20.000). Un héroe libre que no está al límite entrena 3 días a cambio de oro (150 + 5 × poder por día), gana 21/30/42 de experiencia según el nivel y no se lesiona. Botón en el inventario; vuelve en el resumen del día como el regreso de una misión. Da prestigio como el resto de instalaciones.
- 70 tests; guardado versión 8; probado en navegador sin errores. Equilibrio sin cambios (bot ambicioso: 54%).

## 2026-11-07 — Clases, tipos de misión y retos de los maestros

- Decisiones del propietario (biblia, secciones 5, 9 y 14):
  - **Clases** con un efecto pasivo cada una: Guerrero (se lesiona menos), Mago (más poder en rango alto, más lesiones), Explorador (vuelve antes de las misiones de rango alto), Sanador (protege a sus compañeros). Los rivales se especializan en una clase y pujan más por ella.
  - **Tipos de misión** que favorecen a una clase (misiones de un héroe) o a una combinación (de grupo): +5% de éxito por clase y +5% con la combinación completa. El equipo recomendado los tiene en cuenta; la formación muestra qué clases cubre el equipo.
  - **Retos de los maestros:** duelo de un héroe tuyo contra uno suyo de la misma clase y rango, sin ver el suyo. Apuesta en oro; si ganas, oro y prestigio. Vive arriba del Mercado; caduca el día 7.
  - **Título por Ascensión:** apuntado para la fase 3.
- Equilibrio: los rivales también juegan misiones con tipo; el Explorador solo acorta las de rango alto; dificultad base 24/65/150. Bot ambicioso: 52% de victorias en 4 temporadas.
- Nuevo módulo `retos.ts`; 66 tests. Guardado versión 7. Probado en navegador sin errores.

## 2026-11-07 — Tablón que crece y Ascensión

- Contra el estancamiento del medio juego (decisiones del propietario):
  - **Categoría del gremio** D–S por prestigio, que nunca baja. Cada categoría ofrece misiones más difíciles y mejor pagadas (también para los rivales). Se anuncia al subir; el tablón muestra cuánto prestigio falta.
  - **Ascensión:** un héroe al límite puede ir solo a una misión muy difícil. Si la supera, asciende de rango y su techo sube una letra; si fracasa, muere. Botón en el inventario con confirmación que avisa de la muerte; el resultado llega en el resumen del día.
- Nuevos módulos `categorias.ts` y `ascension.ts` con sus tests (53 en total). Guardado versión 6.
- Simulador: el bot ambicioso gana el 25% en 4 temporadas (intenta unas 5 Ascensiones por partida).
- Retos de los maestros: anotados en la biblia como \[Propuesta\]; dependen de las clases de héroe, que son lo siguiente a diseñar (pregunta 15).

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
