# Plan de desarrollo — Gremio Rango D

Objetivo: tener un **prototipo jugable de la temporada 1** (prólogo + 20 semanas) en el navegador, con todos los sistemas de gestión del [documento de diseño](diseno-del-juego.md) y el balance validado por simulación.

## Decisiones técnicas

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Plataforma | Juego web (navegador) | Sin instalación; se puede publicar gratis en GitHub Pages |
| Lenguaje | JavaScript moderno (módulos ES) | El mismo código corre en el navegador y en Node (simulador y tests) |
| Herramienta de desarrollo | Vite | Servidor local rápido y build para publicar |
| Tests | Vitest | Integrado con Vite, sintaxis sencilla |
| Datos | JSON en `src/datos/` | El balance se ajusta sin tocar el código |
| Guardado | `localStorage` del navegador | Suficiente para el prototipo |
| Aleatoriedad | Generador con semilla | Partidas reproducibles para depurar y simular |

**Regla de arquitectura:** el motor (`src/motor/`) no sabe nada de la interfaz. La interfaz (`src/ui/`) solo lee el estado y envía acciones. Así el simulador y los tests usan exactamente las mismas reglas que el juego.

## Estructura del repositorio

```
IFG/
├── docs/                    Diseño y plan
├── src/
│   ├── motor/               Reglas del juego (lógica pura)
│   ├── datos/               Contenido y balance en JSON
│   ├── ui/                  Pantallas
│   └── narrativa/           Prólogo, eventos, textos
├── herramientas/simulador/  Simulación de balance
├── tests/                   Tests del motor
└── assets/                  Imágenes y audio
```

## Fases

### Fase 0 — Preparación

- [ ] Inicializar el proyecto (`package.json`, Vite, Vitest)
- [ ] Página vacía que arranca con `npm run dev`
- [ ] Comando `npm test` funcionando con un test de ejemplo
- [ ] Integración continua en GitHub Actions: ejecutar los tests en cada push
- [ ] Publicación automática en GitHub Pages

**Terminado cuando:** cualquiera puede clonar el repositorio, ejecutar `npm install && npm run dev` y ver la página.

### Fase 1 — Motor de reglas

Un módulo por sistema del diseño, cada uno con sus tests.

- [ ] `azar.js`: generador aleatorio con semilla
- [ ] Modelo de datos (héroe, misión, gremio, partida) según la sección 17
- [ ] `heroes.js`: generación de héroes con rango, clase, raza, elemento, rasgos, potencial y vínculos; valor de mercado; XP y subida de rango
- [ ] `misiones.js`: tablón semanal, poder de equipo, P(éxito), resultados, heridas, muerte y Modo Clemente
- [ ] `pujas.js`: Puntuación de Oferta y subasta en 3 rondas; agentes libres; cláusulas
- [ ] `ventas.js`: ofertas de la IA, contraofertas y consecuencias
- [ ] `economia.js`: patrocinio, gastos, deuda, préstamo y quiebra
- [ ] `ranking.js`: prestigio, reputación, Puntos de Gremio y orden del Draft
- [ ] `vinculos.js`: afinidad, moral y luto
- [ ] `ia.js`: los 4 perfiles rivales (pujas, misiones y acciones especiales)
- [ ] `partida.js`: estado completo y función `terminarSemana()`

**Tests obligatorios con los ejemplos del diseño:**

- Puja de Mira Solenne: 84,0 contra 87,0 en la ronda 1 y 85,5 contra 100,5 en la ronda 2 (sección 7)
- P(éxito) del 75%, 55% y 95% con el 100%, 80% y 120% del poder recomendado (sección 9)
- Simulación de las 4 primeras semanas: 1.495 → 2.340 → 1.585 → 830 de oro (sección 10)
- El Modo Clemente nunca produce muertes

**Terminado cuando:** se puede jugar una temporada completa por código (sin interfaz) y todos los tests pasan.

### Fase 2 — Simulador de balance

- [ ] Jugador automático con estrategia simple (fichar barato, misiones con P(éxito) ≥ 70%)
- [ ] Ejecutar 1.000 temporadas con semillas distintas
- [ ] Informe en Markdown con las métricas de la tabla siguiente
- [ ] Ajustar las cifras de `src/datos/` y actualizar el diseño si cambian

| Métrica | Objetivo inicial |
| --- | --- |
| Quiebras en la temporada 1 (jugador automático) | 10–25% |
| Muertes por temporada (modo normal) | 1–3 |
| Puesto medio al final de la temporada 1 | 4.º–5.º |
| Semanas con oro por debajo de 500 | Al menos 3 por temporada (tensión) |
| Fichajes ganados por la Llama Menguante | 3–6 por temporada |

**Terminado cuando:** las métricas están dentro de los objetivos o se ha decidido cambiar el objetivo.

### Fase 3 — Prototipo jugable (interfaz)

En este orden, cada pantalla usable antes de pasar a la siguiente:

- [ ] Barra superior (oro, deuda, prestigio, reputación, semana, puesto) y botón "Terminar semana"
- [ ] Plantilla y ficha de héroe
- [ ] Tablón de misiones y Formación (con P(éxito) y riesgo de muerte en vivo)
- [ ] Informe de misión
- [ ] Mercado y Puja
- [ ] Clasificación
- [ ] Sede (consejos de Elara, avisos)
- [ ] Guardado y carga automáticos
- [ ] Pantalla de nueva partida: nombre y aspecto del protagonista, Modo Clemente

**Terminado cuando:** se pueden jugar las 20 semanas de la temporada 1 de principio a fin en el navegador.

### Fase 4 — Narrativa

- [ ] Prólogo: invocación, Prueba del Despertar, Draft, Promesa
- [ ] Draft de la semana 1 con 12–20 candidatos
- [ ] Consejos de Elara según la situación
- [ ] 10 eventos cortos de vínculos
- [ ] Despertar I y afinidad con Elara hasta 40
- [ ] Plantillas de texto para los informes de misión

### Fase 5 — Pulido y prueba con jugadores

- [ ] Arte provisional coherente (marcos de rango, emblemas de gremio)
- [ ] Pruebas con 3–5 personas jugando una temporada completa
- [ ] Recoger dónde se aburren, se atascan o no entienden algo
- [ ] Ajustes de balance y de interfaz
- [ ] Decidir el alcance de la v0.2

## Hitos

| Hito | Contenido | Resultado visible |
| --- | --- | --- |
| H1 | Fases 0 y 1 | Tests verdes; una temporada jugada por código |
| H2 | Fase 2 | Informe de balance con 1.000 temporadas |
| H3 | Fase 3 | Temporada 1 jugable en el navegador |
| H4 | Fases 4 y 5 | Prototipo completo publicado en GitHub Pages |

## Después del prototipo

Según la sección 17 del diseño: **v0.2** (temporadas 2–3, misiones A y S, Despertares II y III, mejoras de la sede, cesiones), **v0.3** (arco de la conspiración, Torneo de Gremios, sabotajes) y **v1.0** (temporadas 4–5, finales, arte y audio definitivos, modo libre).

## Forma de trabajar

- Cada tarea se hace en una rama propia y entra en `main` mediante un pull request.
- Ningún cambio en `src/motor/` sin su test.
- Si una cifra cambia por el balance, se actualiza también `docs/diseno-del-juego.md`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El balance no funciona y el jugador quiebra siempre (o nunca) | Fase 2 antes de la interfaz; cifras en JSON |
| La IA rival es demasiado simple o demasiado lista | Perfiles con pesos ajustables; medir en el simulador |
| El alcance crece antes de terminar la temporada 1 | Todo lo que no esté en el checklist del prototipo va a v0.2 |
| La interfaz se mezcla con las reglas | Regla de arquitectura: el motor no importa nada de `ui/` |
