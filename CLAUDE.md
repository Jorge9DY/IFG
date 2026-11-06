# Instrucciones para Claude — Gremio Rango D

Juego de gestión isekai en el navegador (TypeScript + Three.js + Vite). Lee primero `docs/plan-de-desarrollo.md` y, cuando haga falta, `docs/diseno-del-juego.md`. Todo el texto del juego, los comentarios y los documentos están en español.

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
7. Marca la casilla en el plan, actualiza el diseño si cambió alguna regla o cifra y añade una entrada al principio de `docs/bitacora.md` (fecha, qué hiciste, qué queda, problemas).
8. Commit en español, descriptivo, y `git push origin main`.
9. Si la interfaz o la escena 3D cambiaron, comprueba con Playwright que la página carga sin errores en la consola.

Límites:

- Una tarea del plan por ejecución (o varias pequeñas relacionadas).
- No borres historial, ramas ni archivos del propietario; no hagas `push --force`.
- No cambies las decisiones de `docs/diseno-del-juego.md` ("Decisiones tomadas") ni las del informe de balance marcadas como pendientes sin respuesta en `docs/preguntas.md`.
- Assets de terceros solo con licencia CC0 o compatible, anotados en `assets/CREDITOS.md`.
- Nada de secretos, claves ni datos personales en el repositorio.
