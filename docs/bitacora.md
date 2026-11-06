# Bitácora de desarrollo

Entradas más recientes primero.

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
