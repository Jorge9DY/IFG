# Instrucciones para Claude — Gremio de héroes

Juego de gestión isekai en el navegador (TypeScript + Three.js + Vite). La fuente única de verdad del diseño es `docs/biblia.md`: si algo no está ahí, no está decidido. Lee también `docs/plan-de-desarrollo.md`. El diseño anterior (`docs/archivo/`) es solo referencia histórica. Todo el texto del juego, los comentarios y los documentos están en español.

## Seguridad: el repositorio es PÚBLICO

Todo lo que se sube a este repositorio (archivos, commits, mensajes de commit, ramas, historial) es visible para cualquiera y no se puede borrar del todo. Por eso:

- Nunca subas contraseñas, claves de API, tokens, certificados, archivos `.env`, cookies ni credenciales de ningún tipo, ni siquiera de prueba o caducadas.
- Nunca incluyas datos personales del propietario: nombre real, emails, teléfonos, direcciones, ubicación, cuentas, capturas de su escritorio, rutas de su ordenador ni identificadores de cuentas o sesiones.
- No pongas enlaces a sesiones, documentos o artefactos privados de claude.ai ni de otros servicios del propietario, ni en archivos ni en mensajes de commit. Los commits llevan solo `Co-Authored-By: Claude <noreply@anthropic.com>`, sin enlace de sesión.
- Autor de los commits: `Claude <noreply@anthropic.com>`.
- Si un servicio necesita una clave, no la pidas por el chat ni la escribas en el código: anótalo en `docs/preguntas.md` y que el propietario la configure como secreto fuera del repositorio.
- Antes de cada commit revisa `git diff --staged` buscando cualquiera de lo anterior. CI ejecuta además un escáner de secretos (gitleaks); si falla, no se sube nada hasta corregirlo.
- Si descubres que se subió algo sensible, no intentes taparlo con otro commit: avisa en `docs/preguntas.md` y en el resumen para que el propietario lo revoque.

## Diseño de la experiencia

- La esencia del juego: tienes oro, ¿cómo lo gestionas para hacer más fuerte a tu gremio? Ganar (misiones, vender), gastar en héroes (Prueba de Novatos, comprar) o gastar en el gremio (mejorar la sede). La interfaz debe ser tan sencilla como un juego infantil. No añadas sistemas ni botones nuevos sin que el propietario lo pida (pilares de diseño y sección 3 de la biblia).
- El juego debe ser intuitivo y fácil de usar, al estilo Nintendo, sin perder profundidad: cada pantalla propone una opción razonable por defecto (equipo recomendado, ofertas sugeridas, objetivo del momento) y deja el detalle plegado para quien lo quiera.
- Disposición fija: fondo negro, la habitación del gremio pequeña en el centro, menús a los lados. Estética táctica sobria: grises, líneas finas, cajas translúcidas y acentos cian, oliva y naranja.

## Arquitectura (no romperla)

- `src/motor/`: reglas puras. No importa nada de `src/ui/`, `src/escena3d/` ni del navegador (ni `window` ni `document`).
- Las cifras de balance viven en `src/datos/*.json`, no en el código.
- Toda la aleatoriedad pasa por `Azar` (con semilla). El estado de la partida (`EstadoJuego`) es un objeto plano serializable con JSON.
- `src/ui/` y `src/escena3d/` solo leen el estado y llaman a acciones del motor (`src/motor/partida.ts`, `ventas.ts`).
- Ningún cambio en `src/motor/` sin su test en `tests/`.

## Comandos

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run simular -- 300 1
```

Los cuatro primeros deben pasar antes de cada commit.

## Trabajo autónomo

Cuando trabajes sin supervisión (por ejemplo, desde una tarea programada):

1. `git pull origin main`. Trabaja directamente en `main`: el propietario lo ha autorizado.
2. Lee `docs/bitacora.md` (lo último que se hizo) y `docs/preguntas.md` (decisiones que esperan respuesta del propietario).
3. Elige **una** tarea: la primera casilla `- [ ]` del plan, en orden de fases, que no dependa de una pregunta abierta. Si una tarea necesita una decisión de diseño que el documento no resuelve, no la inventes: añádela a `docs/preguntas.md` y pasa a la siguiente.
4. Impleméntala con sus tests. Mantén los cambios pequeños y coherentes con el estilo existente.
5. Ejecuta `npm run typecheck`, `npm test` y `npm run build`. Si algo falla y no lo puedes arreglar, deshaz tus cambios y anota el problema en la bitácora; nunca subas código roto.
6. Si tocas el balance, ejecuta el simulador y actualiza `docs/informe-balance.md`.
7. Marca la casilla en el plan, actualiza la biblia (y su registro de cambios) solo si el propietario cambió una decisión y añade una entrada al principio de `docs/bitacora.md` (fecha, qué hiciste, qué queda, problemas).
8. Revisa `git diff --staged` según la sección de seguridad. Commit en español, descriptivo, y `git push origin main`.
9. Si la interfaz o la escena 3D cambiaron, comprueba con Playwright que la página carga sin errores en la consola.

Límites:

- Una tarea del plan por ejecución (o varias pequeñas relacionadas).
- No borres historial, ramas ni archivos del propietario; no hagas `push --force`.
- No cambies las decisiones marcadas **[Aceptado]** en `docs/biblia.md`, ni implementes lo **[Abierto]** sin anotarlo antes en `docs/preguntas.md`. Lo provisional se marca como tal en el código y en los datos.
- Assets de terceros solo con licencia CC0 o compatible, anotados en `assets/CREDITOS.md`.
- Nada de secretos, claves ni datos personales en el repositorio.
