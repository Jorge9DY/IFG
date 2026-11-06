# Motor de reglas

Lógica pura del juego, sin interfaz ni acceso al navegador. Se ejecuta en Node y se prueba con tests. Las cifras de balance están en `src/datos/`. El diseño está en `docs/biblia.md`.

| Módulo | Responsabilidad | Biblia |
| --- | --- | --- |
| `tipos.ts` | Modelo de datos (héroe, misión, gremio) | 9, 14 |
| `azar.ts` | Generador aleatorio con semilla | — |
| `estado.ts` | Estado de la partida, calendario y consultas | 2 |
| `heroes.ts` | Generación, potencial en rango, sueldo, valor y experiencia | 4, 8, 9 |
| `misiones.ts` | Tablón diario, probabilidad de éxito, resultado y lesiones | 5 |
| `economia.ts` | Sueldos semanales | 4 |
| `instalaciones.ts` | Sede y ojeadores | 4 |
| `ranking.ts` | Fuerza + Prestigio y premios de temporada | 6 |
| `rivales.ts` | Misiones, inversión, límite de puja e interés de los rivales | 8, 14 |
| `subasta.ts` | Subasta ascendente por turnos | 8 |
| `mercado.ts` | Comprar, vender y reclutar | 4, 7 |
| `partida.ts` | Crear partida, acciones del jugador, «Finalizar día» y Prueba de los Novatos | 2, 15 |
