# Plan de desarrollo — Gremio Rango D

Objetivo: tener un **prototipo jugable de la temporada 1** (prólogo + 20 semanas) en el navegador, con todos los sistemas de gestión del [documento de diseño](diseno-del-juego.md), una sede 3D explorable y el balance validado por simulación.

## Stack

| Capa | Tecnología | Para qué |
| --- | --- | --- |
| Lenguaje | **TypeScript** | Todo el proyecto; los tipos evitan errores en el motor y en la escena 3D |
| 3D | **Three.js** | Sede del gremio, protagonista, cámara, luces |
| Modelos y animaciones | **glTF/GLB**, Blender, Mixamo | Assets 3D; packs CC0 de Kenney y Quaternius en el prototipo |
| Paneles de gestión | HTML + CSS sobre la escena 3D | Mercado, plantilla, misiones, clasificación |
| Desarrollo y build | **Vite** | Servidor local con recarga y build para publicar |
| Tests | **Vitest** | Tests del motor con los ejemplos del diseño |
| Simulador | **Node.js** + `tsx` | Simulación de temporadas sin navegador |
| Datos | JSON en `src/datos/` | El balance se ajusta sin tocar el código |
| Guardado | `localStorage` | Partidas guardadas en el navegador |
| Integración continua | **GitHub Actions** | Tipos y tests en cada push y pull request |
| Publicación | **GitHub Pages** (repositorio público) | Jugar desde una URL pública |

**Reglas de arquitectura**

1. El motor (`src/motor/`) es lógica pura: no importa nada de `ui/`, `escena3d/` ni del navegador.
2. La interfaz y la escena 3D solo **leen** el estado y **envían acciones** al motor.
3. Toda la aleatoriedad pasa por el generador con semilla del motor: misma semilla, misma partida.

## Estructura del repositorio

```
IFG/
├── docs/                    Diseño y plan
├── src/
│   ├── motor/               Reglas del juego (lógica pura)
│   ├── datos/               Contenido y balance en JSON
│   ├── ui/                  Paneles de gestión (HTML/CSS)
│   ├── escena3d/            Sede 3D: escena, protagonista, cámara, interacciones
│   └── narrativa/           Prólogo, eventos, textos
├── herramientas/simulador/  Simulación de balance
├── tests/                   Tests del motor
├── public/modelos/          Modelos 3D (.glb) servidos tal cual
└── assets/                  Fuentes de arte (Blender, imágenes, audio)
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm install` | Instala dependencias |
| `npm run dev` | Arranca el juego en local |
| `npm test` | Ejecuta los tests |
| `npm run typecheck` | Comprueba los tipos |
| `npm run build` | Genera la versión publicable en `dist/` |
| `npm run simular` | Ejecuta el simulador de balance (fase 2) |

## Fases

### Fase 0 — Preparación

- [x] Proyecto con Vite, TypeScript y Vitest
- [x] Página que arranca con `npm run dev` y muestra una escena 3D mínima
- [x] `npm test` y `npm run typecheck` funcionando
- [x] GitHub Actions: tipos y tests en cada push y pull request
- [x] Publicación automática en GitHub Pages al actualizar `main` (el propietario activa Pages una vez: Settings → Pages → Source: GitHub Actions)
- [x] Escáner de secretos (gitleaks) en CI: el repositorio es público

### Fase 1 — Motor de reglas

- [x] `azar.ts`: generador aleatorio con semilla
- [x] `tipos.ts`: modelo de datos (héroe, misión, gremio, partida)
- [x] `misiones.ts`: poder de equipo, P(éxito), resultados, riesgo de muerte, Modo Clemente
- [x] `pujas.ts`: Puntuación de Oferta y subasta en 3 rondas
- [x] `economia.ts`: patrocinio, gastos semanales, quiebra
- [x] `ranking.ts`: Puntos de Gremio y clasificación
- [x] `heroes.ts`: rango por suma de combate y valor de mercado
- [x] `heroes.ts`: generación aleatoria de héroes, vínculos, XP, subida de rango y envejecimiento
- [x] `ventas.ts`: ofertas de la IA, contraofertas y consecuencias
- [x] `vinculos.ts`: afinidad, moral, luto y abandonos
- [x] `ia.ts`: los 4 perfiles rivales (pujas, misiones abstractas, fichajes)
- [x] `estado.ts` y `partida.ts`: estado completo, acciones del jugador y `terminarSemana()`
- [x] Acciones especiales de los rivales: Veto del Duque, espionaje, rumores, robo de misiones y oferta anual de la Corona
- [x] Soborno del Colmillo y modo "amenaza" de los rivales cuando el jugador sube 2 puestos
- [x] Cesiones, cláusulas de rescisión y mejoras de la sede como acciones del jugador (motor)

**Tests con los ejemplos del diseño:**

- [x] Puja de Mira Solenne: 84,0 contra 87,0 (ronda 1) y 85,5 contra 100,5 (ronda 2)
- [x] P(éxito) del 75%, 55% y 95% con el 100%, 80% y 120% del poder recomendado
- [x] Economía de las 4 primeras semanas: 1.495 → 2.355 → 1.615 → 850 (cifras del diseño corregidas al tener en cuenta el cambio de prestigio)
- [x] El Modo Clemente nunca produce muertes

**Terminado cuando:** se puede jugar una temporada completa por código y todos los tests pasan.

### Fase 2 — Simulador de balance

- [x] Jugador automático con dos estrategias (prudente y arriesgada)
- [x] 1.000 temporadas con semillas distintas
- [x] Informe en Markdown con las métricas: [informe-balance.md](informe-balance.md)
- [x] Primer ajuste (IA de los rivales, riesgo de muerte)
- [x] Decisiones del propietario aplicadas: clasificación por temporada, manutención por héroe y objetivo de muertes 0,3–1
- [ ] Simulación de varias temporadas (cuando exista la temporada 2) para medir si se puede llegar al 1.º en 5

| Métrica | Objetivo inicial |
| --- | --- |
| Quiebras en la temporada 1 (jugador automático) | 10–25% |
| Muertes por temporada (modo normal) | 0,3–1 |
| Puesto medio al final de la temporada 1 | 4.º–5.º |
| Semanas con oro por debajo de 500 | Al menos 3 por temporada |
| Fichajes ganados por la Llama Menguante | 3–6 por temporada |

### Fase 3 — Paneles de gestión

- [x] Barra superior y botón "Terminar semana"
- [x] Plantilla (stats, estado, vínculos, venta y ofertas recibidas)
- [x] Tablón de misiones y Formación (P(éxito) y riesgo en vivo)
- [x] Informe de la semana (misiones y sucesos)
- [x] Mercado y Puja (con desglose de la puntuación)
- [x] Clasificación
- [x] Panel de Elara con consejos según la situación
- [x] Construir mejoras de la sede desde el panel
- [x] Mercado: héroes de otros gremios con pago de cláusula y cesiones
- [x] Plantilla: aviso de soborno con botón para retener y cedidos marcados
- [x] Guardado y carga automáticos
- [x] Nueva partida: nombre del protagonista y Modo Clemente
- [ ] Elección del aspecto del protagonista
- [x] Menú lateral para abrir cualquier panel sin caminar
- [x] Pantalla de fin (quiebra o fin de temporada)

**Terminado cuando:** se pueden jugar las 20 semanas desde los paneles.

### Fase 4 — Sede 3D

- [x] Sala de la sede con formas simples (suelo, paredes, muebles como cajas)
- [x] Protagonista con movimiento por teclado (WASD y flechas), colisiones básicas y cámara que lo sigue
- [ ] Movimiento con clic o toque en el suelo
- [x] Puntos de interacción con aviso y tecla E (tablón, mostrador, Elara, dormitorios, pizarra, puerta)
- [x] Conectar cada punto con su panel
- [ ] Sustituir formas simples por assets CC0 (Kenney, Quaternius) y animaciones de Mixamo
- [ ] Héroes de la plantilla en la sede según su estado
- [ ] Estados de la sede (ruina → legendaria) y mejoras visibles
- [ ] Personalización básica del protagonista
- [ ] Rendimiento: 60 fps en portátil, menos de 30 MB de assets

### Fase 5 — Narrativa

- [ ] Prólogo: invocación, Prueba del Despertar, Draft, Promesa
- [ ] Draft de la semana 1 con 12–20 candidatos
- [ ] Consejos de Elara según la situación
- [ ] 10 eventos cortos de vínculos
- [ ] Despertar I y afinidad con Elara hasta 40
- [ ] Plantillas de texto para los informes de misión

### Fase 6 — Pulido y prueba con jugadores

- [ ] Arte provisional coherente (marcos de rango, emblemas)
- [ ] Pruebas con 3–5 personas jugando una temporada
- [ ] Ajustes de balance, interfaz y controles
- [ ] Decidir el alcance de la v0.2

## Hitos

| Hito | Contenido | Resultado visible |
| --- | --- | --- |
| H1 | Fases 0 y 1 | Tests verdes; una temporada jugada por código |
| H2 | Fase 2 | Informe de balance con 1.000 temporadas |
| H3 | Fase 3 | Temporada 1 jugable desde los paneles |
| H4 | Fase 4 | Sede 3D explorable conectada a los paneles |
| H5 | Fases 5 y 6 | Prototipo completo publicado en GitHub Pages |

## Después del prototipo

**v0.2** (temporadas 2–3, misiones A y S, Despertares II y III, mejoras de la sede, cesiones), **v0.3** (arco de la conspiración, Torneo de Gremios, sabotajes) y **v1.0** (temporadas 4–5, finales, arte y audio definitivos, modo libre).

## Forma de trabajar

- Cada bloque de trabajo en una rama propia que entra en `main` mediante pull request.
- Ningún cambio en `src/motor/` sin su test.
- Si una cifra cambia por el balance, se actualiza también `docs/diseno-del-juego.md`.
- Los assets 3D de terceros solo con licencia CC0 o compatible; se anotan en `assets/CREDITOS.md`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El balance no funciona | Fase 2 antes de la interfaz; cifras en JSON |
| La sede 3D consume demasiado tiempo | Va después de los paneles; empieza con formas simples; el juego es jugable sin ella |
| Los assets 3D no encajan entre sí o pesan mucho | Un solo estilo low-poly; presupuesto de triángulos y MB |
| El alcance crece antes de terminar la temporada 1 | Lo que no esté en el checklist del prototipo va a v0.2 |
| La interfaz o el 3D se mezclan con las reglas | El motor no importa nada de `ui/` ni de `escena3d/` |
