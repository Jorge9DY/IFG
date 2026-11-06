# Gremio Rango D

Juego de gestión de fantasía isekai. El sistema te clasificó como rango D, pero tienes un poder de nivel dios. Te unes al peor gremio de la ciudad, con una sola maga y una montaña de deudas, y prometes llevarlo a lo más alto: pujando por héroes, vendiéndolos y enviándolos a misiones donde pueden morir. La sede del gremio es un espacio 3D por el que se mueve tu personaje.

## Documentación

- [Documento de diseño](docs/diseno-del-juego.md): historia, mundo, sistemas, fórmulas y balance.
- [Plan de desarrollo](docs/plan-de-desarrollo.md): stack, fases, tareas e hitos.

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

Abre la dirección que aparece en la terminal (normalmente `http://localhost:5173`). Muévete con WASD o las flechas y pulsa E junto a los puntos marcados en el suelo.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Arranca el juego en local |
| `npm test` | Ejecuta los tests del motor |
| `npm run typecheck` | Comprueba los tipos |
| `npm run build` | Genera la versión publicable en `dist/` |

## Estado

- **Fase 0 (preparación):** terminada.
- **Fase 1 (motor de reglas):** en curso. Misiones, pujas, economía, ranking y valor de los héroes ya funcionan y tienen tests.
- **Sede 3D:** primera versión con formas simples, movimiento y puntos de interacción.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `docs/` | Diseño y plan de desarrollo |
| `src/motor/` | Reglas del juego, sin interfaz |
| `src/datos/` | Contenido y balance en JSON |
| `src/ui/` | Paneles de gestión |
| `src/escena3d/` | Sede 3D |
| `src/narrativa/` | Prólogo, eventos y textos |
| `herramientas/simulador/` | Simulación automática para ajustar el balance |
| `tests/` | Tests del motor |
| `public/modelos/` | Modelos 3D (.glb) |
| `assets/` | Fuentes de arte y créditos |
