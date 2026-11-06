# Plan de desarrollo — Gremio de héroes

La fuente de verdad del diseño es la [biblia del proyecto](biblia.md). Este plan traduce su hoja de ruta (sección 17) en tareas. El diseño anterior está archivado en [archivo/diseno-original.md](archivo/diseno-original.md) solo como referencia.

## Hoja de ruta: 4 fases, 3 puertas

No se pasa a la siguiente fase sin superar su puerta (biblia, sección 17). El reparto de sistemas por fase sigue la sección 18 de la biblia; la definición exacta de cada fase y de sus puertas está pendiente de confirmar (ver `preguntas.md`).

| Fase | Contenido | Puerta para pasar a la siguiente |
| --- | --- | --- |
| 1. Núcleo económico | Días, misiones, sueldos, ranking, temporadas, reclutamiento básico. Héroes que son solo números. | La economía engancha con héroes que son solo números. |
| 2. Competencia | Prueba de los Novatos (subasta por turnos), mercado, rivales con identidad, instalaciones. | Pujar y fichar crea dilemas reales cada semana. |
| 3. Héroes con voluntad | Rasgos, necesidades ocultas, ánimo, lealtad con avisos, relaciones, autonomía moderada. | Los héroes se distinguen y se recuerdan sin trabajo administrativo. |
| 4. Narrativa | Acontecimientos con decisión, historias por capítulos, ficha del héroe, registro del gremio. | — |

## Stack

| Capa | Tecnología |
| --- | --- |
| Lenguaje | TypeScript |
| Sede 3D | Three.js |
| Paneles | HTML + CSS sobre la escena 3D |
| Build | Vite |
| Tests | Vitest |
| Simulador | Node.js + `tsx` |
| Datos de balance | JSON en `src/datos/` |
| Guardado | `localStorage` |
| CI | GitHub Actions (tipos, tests, build y gitleaks) |
| Publicación | GitHub Pages |

**Reglas de arquitectura:** el motor (`src/motor/`) es lógica pura y no importa nada de `ui/`, `escena3d/` ni del navegador; la interfaz solo lee el estado y llama a acciones del motor; toda la aleatoriedad pasa por `Azar` con semilla; el estado es un objeto plano serializable.

## Fase 1 — Núcleo económico (foco actual)

- [x] Calendario por días con «Finalizar día»; semanas de 7 días y temporadas de 28
- [x] Tablón diario con tres misiones (bajo, medio, alto), duraciones 1/2/3 días y equipos de 1/2/3 héroes
- [x] Varias misiones el mismo día si hay héroes libres
- [x] Fracaso: menos recompensa y lesiones que obligan a descansar (sin muertes)
- [x] Héroes con poder, potencial, experiencia, reputación y lealtad; la experiencia sube el poder hasta el potencial
- [x] Sueldos semanales el día 7 que crecen con poder y reputación
- [x] Ranking = Fuerza (5 mejores) + Prestigio; actualización semanal y cierre de temporada con premio
- [x] Reclutamiento básico (provisional): candidatos modestos que se renuevan cada semana
- [x] Interfaz de cinco elementos (sección 3) sobre la sede 3D
- [x] Simulador con dos estrategias e informe de balance
- [x] Condición de victoria: cerrar una temporada en el n.º 1
- [x] Fórmula de éxito y lesiones aceptada de momento; curar lesionados con oro
- [ ] Cifras equilibradas: recompensas, sueldos, costes y premios
- [x] Impagos: el héroe avisa, pierde lealtad y se va a otro gremio tras 2 semanas sin cobrar
- [x] Inventario de héroes en Gestionar gremio: libres, de misión y lesionados
- [x] Sueldos e instalaciones más caros para mantener la tensión económica
- [ ] Puerta 1: prueba con jugadores de la economía sin narrativa

## Fase 2 — Competencia

- [x] Prueba de los Novatos: presentación, subasta ascendente por turnos y resultados
- [x] Límite oculto de cada rival = valor percibido × prioridad × presupuesto
- [x] Potencial en rango (p. ej. B–S) que la instalación de ojeadores estrecha
- [x] Mercado: comprar a rivales (la Última Esperanza no vende) y vender a los tuyos
- [x] Cuatro rivales con personalidad y estrategia; misiones diarias, inversión en instalaciones
- [x] Instalaciones provisionales: sede (plazas y prestigio) y ojeadores
- [ ] Candidatos por Prueba, información visible u oculta, incrementos y desempates confirmados
- [ ] Precios, ofertas y traspasos del mercado; si un héroe puede negarse
- [ ] Número de rivales, nombres, maestros y simulación diaria confirmados
- [ ] Lista definitiva de instalaciones, niveles, costes y efectos
- [ ] Reacciones de los maestros con nombre y personalidad
- [ ] Puerta 2

## Fases 3 y 4 — Héroes con voluntad y narrativa

Se detallarán al superar la puerta 2 (biblia, secciones 9–13 y 18).

## Sede 3D

- [x] Sala con formas simples, protagonista con teclado y puntos de interacción (tablón, mostrador, recepción, dormitorios, pizarra, puerta)
- [ ] Assets CC0 (Kenney, Quaternius) y héroes de la plantilla visibles en la sede
- [ ] Movimiento con clic o toque

## Comandos

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run simular -- 300 1
```
