# Gremio Rango D

Juego de gestión de fantasía isekai. El sistema te clasificó como rango D, pero tienes un poder de nivel dios. Te unes al peor gremio de la ciudad, con una sola maga y una montaña de deudas, y prometes llevarlo a lo más alto: pujando por héroes, vendiéndolos y enviándolos a misiones donde pueden morir.

## Documentación

- [Documento de diseño](docs/diseno-del-juego.md): historia, mundo, sistemas, fórmulas y balance.
- [Plan de desarrollo](docs/plan-de-desarrollo.md): tecnología, fases, tareas e hitos.

## Estado

Fase de diseño terminada. Siguiente paso: **fase 0** (preparar el proyecto) y **fase 1** (motor de reglas).

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `docs/` | Diseño y plan de desarrollo |
| `src/motor/` | Reglas del juego, sin interfaz |
| `src/datos/` | Contenido y balance en JSON |
| `src/ui/` | Pantallas del juego |
| `src/narrativa/` | Prólogo, eventos y textos |
| `herramientas/simulador/` | Simulación automática para ajustar el balance |
| `tests/` | Tests del motor |
| `assets/` | Imágenes y audio |
