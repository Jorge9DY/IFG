# Motor de reglas

Lógica pura del juego, sin interfaz ni acceso al navegador. Todo lo que hay aquí se puede ejecutar en Node y probar con tests.

Módulos previstos (ver `docs/plan-de-desarrollo.md`, fase 1):

| Módulo | Responsabilidad | Sección del diseño |
| --- | --- | --- |
| `azar.js` | Generador aleatorio con semilla | 17 |
| `heroes.js` | Generación de héroes, rangos, XP, valor de mercado | 5, 8 |
| `pujas.js` | Puntuación de oferta y subasta en 3 rondas | 7 |
| `ventas.js` | Traspasos, contraofertas y consecuencias | 8 |
| `misiones.js` | Tablón, formación, resolución, heridas, muerte y Modo Clemente | 9 |
| `economia.js` | Ingresos, gastos, deuda y quiebra | 10 |
| `ranking.js` | Prestigio, reputación y Puntos de Gremio | 11 |
| `vinculos.js` | Vínculos, afinidad y moral | 12 |
| `ia.js` | Comportamiento de los 4 gremios rivales | 13 |
| `partida.js` | Estado de la partida y bucle semanal | 6, 14 |
