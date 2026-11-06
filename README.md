# Gremio de héroes

Juego de gestión de fantasía isekai. Diriges el peor gremio de héroes del reino, último del ranking, y tienes que convertirlo en el número uno: ganas oro con misiones, pujas por novatos, compras y vendes héroes y mejoras tu sede. La sede del gremio es un espacio 3D por el que se mueve tu personaje.

## Documentación

- [Biblia del proyecto](docs/biblia.md): fuente única de verdad del diseño.
- [Plan de desarrollo](docs/plan-de-desarrollo.md): hoja de ruta por fases y tareas.
- [Preguntas abiertas](docs/preguntas.md) e [informe de balance](docs/informe-balance.md).

## Stack

TypeScript · Three.js · Vite · Vitest · GitHub Actions · GitHub Pages

## Cómo arrancarlo

Requisitos: Node.js 22 o superior.

```bash
npm install
```

```bash
npm run dev
```

Abre la dirección que aparece en la terminal (normalmente `http://localhost:5173`). Cada día lanzas misiones para ganar oro, compras o vendes héroes, reclutas y mejoras tus instalaciones; el día 7 de cada semana pagas los sueldos y pujas por turnos por los novatos. La partida se guarda sola en el navegador.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Arranca el juego en local |
| `npm test` | Ejecuta los tests del motor |
| `npm run typecheck` | Comprueba los tipos |
| `npm run build` | Genera la versión publicable en `dist/` |
| `npm run simular -- 300` | Simula 300 partidas por estrategia y muestra el informe de balance |

## Estado

- **Fase 1 (núcleo económico):** jugable de principio a fin con cifras provisionales.
- **Fase 2 (competencia):** Prueba de los Novatos por turnos, mercado, rivales e instalaciones en una primera versión.
- **Fases 3 y 4 (héroes con voluntad y narrativa):** pendientes, como marca la biblia.
- **Sede 3D:** formas simples, movimiento y puntos de interacción que abren los paneles.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `docs/` | Diseño y plan de desarrollo |
| `src/motor/` | Reglas del juego, sin interfaz |
| `src/datos/` | Contenido y balance en JSON |
| `src/ui/` | Paneles de gestión |
| `src/escena3d/` | Sede 3D |
| `src/narrativa/` | Acontecimientos y textos (fases 3 y 4) |
| `herramientas/simulador/` | Simulación automática para ajustar el balance |
| `tests/` | Tests del motor |
| `public/modelos/` | Modelos 3D (.glb) |
| `assets/` | Fuentes de arte y créditos |
