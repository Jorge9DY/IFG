# Motor de reglas

Lógica pura del juego, sin interfaz ni acceso al navegador. Todo lo que hay aquí se puede ejecutar en Node y probar con tests. Las cifras de balance están en `src/datos/balance.json`.

Módulos previstos (ver `docs/plan-de-desarrollo.md`, fase 1):

| Módulo | Responsabilidad | Sección del diseño |
| --- | --- | --- |
| `tipos.ts` | Modelo de datos | 17 |
| `azar.ts` | Generador aleatorio con semilla | 17 |
| `heroes.ts` | Generación de héroes, rangos, XP, valor de mercado | 5, 8 |
| `pujas.ts` | Puntuación de oferta y subasta en 3 rondas | 7 |
| `ventas.ts` | Traspasos, contraofertas y consecuencias | 8 |
| `misiones.ts` | Tablón, formación, resolución, heridas, muerte y Modo Clemente | 9 |
| `economia.ts` | Ingresos, gastos, deuda y quiebra | 10 |
| `ranking.ts` | Prestigio, reputación y Puntos de Gremio | 11 |
| `vinculos.ts` | Vínculos, afinidad y moral | 12 |
| `ia.ts` | Comportamiento de los 4 gremios rivales | 13 |
| `partida.ts` | Estado de la partida y bucle semanal | 6, 14 |
