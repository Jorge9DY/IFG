# Auditoría de las habilidades — 2026-11-15

El propietario pidió comprobar si las 80 habilidades funcionan, si el juego está bien diseñado y si las habilidades se sienten con impacto.

## Método

1. **Medición automática** (`herramientas/auditoria/habilidades.ts`): el poder del equipo con y sin cada habilidad en tres situaciones tipo, más lesiones forzadas, días, oro y en qué momentos del juego actúa cada una. La tabla completa está al final.
2. **Partidas completas** (`herramientas/auditoria/social.ts` y el simulador): cuántas veces actúan las habilidades que dependen de las relaciones.
3. **Tests** de las 80 habilidades y de los arreglos (`tests/muerte-habilidades.test.ts` y `tests/auditoria.test.ts`).
4. **Revisión con criterios de diseño:**
   - **Impacto:** cambia decisiones, no solo números.
   - **Legibilidad:** el jugador ve cuándo actúa y cuánto.
   - **Frecuencia:** ocurre en una partida normal.
   - **Coste y contrapartida.**
   - **Sinergias y choques con otros héroes.**

## ¿Funcionan?

Las 80 están en el juego y la medición confirma que cada una actúa donde dice su texto.

- **Con impacto inmediato:** AllBlack, HalfGoblin, Sable, Sombra, Pacto, Ñam, Cobra, Barón, Míster, Farolillo y Posadero (×1,2 a ×3 en su caso), además de Dado, Rastro, Garra y Pirita en el oro y de Blup, Bastión, Vampire y Alaim en las lesiones.
- **Con contrapartida clara:** Medianoche (×0,5 toda la temporada y ×4 el último día), Heredero (×0,6 hasta cumplir su misión), Fondista (×0,6 en misiones de un día) y Ventri (alterna ×0,6 y ×1,5).
- **Que crecen con el tiempo:** Récord, Chimoku, Hartox, Rin, Tomo, Pipo, Némesis, Tiburón, Vael y Luciérnaga.
- **De mercado, Prueba y economía:** Entrman, Lucre, Mimi, Disfraz, Aldo, Don Hueso, Letra, Martillo, Profe, Yunque, Usura, Chapuzas, Dep, Topo, Su Alteza, Vigilia y Mascota.

## Problemas encontrados

| # | Problema | Afectaba a | Arreglo |
| --- | --- | --- | --- |
| 1 | **Impacto invisible.** El efecto de las habilidades de poder no se veía en ninguna parte: HalfGoblin multiplicaba por 2,5 en silencio. | Unas 30 habilidades | **«Habilidades en esta misión»** al formar el equipo: qué hará cada una, con su número, en verde si ayuda y en naranja si perjudica. |
| 2 | **Riesgos sin aviso.** Alaim y Vampire lesionan a sus compañeros y Tokopi anula al equipo, pero nada lo decía antes de lanzar la misión. | Alaim, Vampire, Tokopi, Chimoku, Ñam | Los mismos avisos: «sus compañeros volverán lesionados», «anulada por «...»», «le quedan N misiones de vida». |
| 3 | **Habilidades sociales dormidas.** Tras el sistema social, las relaciones casi nunca empeoraban. Lumia, el Segador, Diván, Teo y la Redención de Vael casi no actuaban. | Lumia, Segador, Diván, Teo, Vael | **Choques de carácter** (orgulloso con orgulloso, competitivo con orgulloso, reservado con sociable…): dos caracteres incompatibles en la misma misión pueden chocar (−6 de afinidad). Es la fuente natural de las malas relaciones, ligada a la personalidad. |
| 4 | **Umbrales demasiado altos.** Veyra solo contaba amistades plenas (≥ 50) y Aimul solo enamoramientos (≥ 70): casi nunca pasaban. | Veyra, Aimul | Veyra cuenta las buenas relaciones (≥ 25); Aimul, a quien se ha fijado en ella (≥ 40). |
| 5 | **Yandere sin obsesión.** Casi nunca llegaba a enamorarse. | Yandere | Su atracción crece el doble de rápido. |
| 6 | **Zancadilla desconectada.** Con el ranking por puntos de temporada, el sabotaje solo quitaba prestigio. | Zancadilla | También quita 3 puntos de temporada al gremio de delante (y al suyo, si la pillan). |

## Visibilidad de la habilidad (decisión del propietario)

La descripción de la habilidad de un héroe solo se ve si lo has **fichado alguna vez** (sigue conocida aunque se vaya) o si tienes los **ojeadores al nivel máximo** (3). Si no, la carta muestra el nombre con un «?» y la pista de cómo descubrirla. Así la Prueba de los Novatos vuelve a ser una apuesta, y mejorar los ojeadores hasta el final tiene una recompensa clara. Reglas en `conoceHabilidad` y `apuntarConocidas` (`src/motor/habilidades.ts`).

## Diseño: lo que queda abierto (pregunta 22)

- **El romance sigue siendo raro** (menos de una pareja por partida con el bot): hacen falta muchas misiones con la misma pareja de héroes. Es coherente con «el romance surge de interacciones», pero Aimul y Yandere lucen menos. ¿Se acepta así o se acelera?
- **Habilidades sin efecto propio:** InsectLover (solo su Ascensión) y Mascota (no sale de misión). Están bien como diseño, pero conviene que su carta lo diga claro. Ya lo hace.
- **Prestigio:** con el ranking por puntos de temporada, Mascota (+3 de prestigio por semana) y Chibi solo ayudan a la categoría. ¿Deben dar también puntos de temporada?
- **Echo copiando a AllBlack** multiplica por 3 sin ocupar tres huecos: es una sinergia fuerte, pero rara. Se deja como premio al jugador que la descubra.

## Tabla medida

Generado con `npx tsx herramientas/auditoria/habilidades.ts`. Poder del equipo con la habilidad frente a sin ella (héroe a poder 40, compañeros neutros de poder 40, sin relaciones): solo en misión baja · en pareja en media · en trío en alta. Lesión forzada, días y oro de una misión alta cumplida de 1.000 de oro.

| ID | Héroe | Habilidad | Poder (baja · media · alta) | Lesión forzada | Días | Oro | Dónde actúa |
| --- | --- | --- | --- | --- | --- | --: | --- |
| H01 | Entrman | Robo de fichaje | ×1.00 · ×1.00 · ×1.00 | — | — | — | al volver, mercado |
| H02 | AllBlack | Multiplicación | ×3.00 · ×2.00 · ×1.67 | — | — | — | misión (huecos), misión (poder), partida |
| H03 | Bateman | Vendetta | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (poder), al volver, economia, misiones |
| H04 | InsectLover | Hablar con los insectos | ×1.00 · ×1.00 · ×1.00 | — | — | — | ascension |
| H05 | Lumia | Haters gonna hate | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (poder) |
| H06 | Aimul | Look at me | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (poder), relaciones |
| H07 | HalfGoblin | Goblin Draft | ×2.50 · ×1.00 · ×1.00 | — | — | — | misión (poder) |
| H08 | Solus | Cima solitaria | ×0.85 · ×0.93 · ×0.95 | — | — | — | misión (poder) |
| H09 | Veyra | Hilo rojo | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (poder) |
| H10 | Chimoku | Por las últimas | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (poder), al volver, efectosEnMision, misiones, rivales |
| H11 | Bastión | Muro | ×1.00 · ×1.00 · ×1.00 | — | — | — | lesiones, efectosEnMision |
| H12 | Hartox | Furia | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (poder), al salir |
| H13 | Récord | Racha | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (poder), al volver |
| H14 | Tiburón | Devorar | ×1.00 · ×1.00 · ×1.00 | — | — | — | mercado |
| H15 | Su Alteza | Tratado | ×1.00 · ×1.00 · ×1.00 | — | — | — | cada semana |
| H16 | Segador | Sacrificio | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (poder), cada semana |
| H17 | Lucre | Ojo de oro | ×1.00 · ×1.00 · ×1.00 | — | — | — | ojeo, heroes |
| H18 | Lirio | Cuidados | ×1.00 · ×1.00 · ×1.00 | — | — | — | cada día |
| H19 | Roble | Legado | ×1.00 · ×1.00 · ×1.00 | — | — | — | experiencia, efectosEnMision |
| H20 | Dado | Doble o nada | ×1.00 · ×1.00 · ×1.00 | — | — | 2000 | oro, efectosEnMision |
| H21 | Rima | Balada | ×1.00 · ×1.00 · ×1.00 | — | — | — | efectosEnMision, relaciones |
| H22 | Pirita | Tesoro | ×1.00 · ×1.00 · ×1.00 | — | — | 800 | oro, mercado, efectosEnMision |
| H23 | Gabardina | Caja sorpresa | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (poder), cada día |
| H24 | Farolillo | Farolillo rojo | ×1.32 · ×1.16 · ×1.11 | — | — | — | misión (poder) |
| H25 | Crisálida | Muda | ×1.00 · ×1.00 · ×1.00 | — | — | — | Ascensión |
| H26 | Martillo | A la una, a las dos | ×1.00 · ×1.00 · ×1.00 | — | — | — | Prueba |
| H27 | Yandere | Obsesión | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (quién va), misión (poder), misión (compañeros), al salir, efectosEnMision, relaciones |
| H28 | Minshi | Todo junto | ×1.00 · ×1.00 · ×1.00 | — | — | — | experiencia, al volver |
| H29 | Barón | Deuda de honor | ×1.25 · ×1.13 · ×1.08 | — | — | — | misión (poder) |
| H30 | Nox | Herencia | ×1.00 · ×1.00 · ×1.00 | — | — | — | muerte |
| H31 | Teo | Mediador | ×1.00 · ×1.00 · ×1.00 | — | — | — | efectosEnMision, relaciones |
| H32 | Sable | Sin testigos | ×2.00 · ×1.00 · ×1.00 | — | — | — | misión (poder), relaciones |
| H33 | Echo | Eco (anulada) | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión, efectosEnMision |
| H34 | Ventri | Dos voces | ×0.60 · ×0.80 · ×0.86 | — | — | — | misión (poder), lesiones, al volver, efectosEnMision |
| H35 | Don Hueso | Auditoría | ×1.00 · ×1.00 · ×1.00 | — | — | — | mercado, sueldos |
| H36 | Topo | Doble juego | ×1.00 · ×1.00 · ×1.00 | — | — | — | cada semana, Prueba |
| H37 | Retorta | Poción rara | ×1.00 · ×1.13 · ×1.08 | — | — | — | misión (compañeros), cada día, efectosEnMision |
| H38 | Rastro | Presa grande | ×1.00 · ×1.00 · ×1.00 | — | — | 1300 | oro, efectosEnMision |
| H39 | Pacto | Invocación | ×1.60 · ×1.30 · ×1.19 | — | — | — | misión (huecos), poderHeroeEnMision, al salir, al volver, efectosEnMision |
| H40 | Vael | Redención | ×1.00 · ×1.00 · ×1.00 | — | — | — | relaciones |
| H41 | Nevada | Imperturbable | ×1.00 · ×1.00 · ×1.00 | — | — | — | poderHeroeEnMision, al salir, relaciones |
| H42 | Letra | Letra pequeña | ×1.00 · ×1.00 · ×1.00 | — | — | — | mercado, sueldos |
| H43 | Míster | Banquillo | ×1.25 · ×1.10 · ×1.05 | — | — | — | misión (poder) |
| H44 | Sparring | Entrenamiento | ×1.00 · ×1.00 · ×1.00 | — | — | — | entrenamiento |
| H45 | Cambiazo | Cambiazo | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (poder) |
| H46 | Némesis | Rivalidad | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (poder), al volver, cada semana, relaciones |
| H47 | Ñam | Banquete | ×1.40 · ×1.20 · ×1.13 | — | — | — | misión (poder), al salir, efectosEnMision |
| H48 | Cobra | Paga o nada | ×1.30 · ×1.15 · ×1.10 | — | — | — | misión (poder), economia |
| H49 | Rin | Hielo que se derrite | ×1.00 · ×1.00 · ×1.00 | — | — | — | al volver |
| H50 | Pipo | Aprende de las derrotas | ×1.00 · ×1.00 · ×1.00 | — | — | — | al volver |
| H51 | Aldo | Juramento | ×1.00 · ×1.00 · ×1.00 | — | — | — | mercado |
| H52 | Tokopi | «...» (anulada) | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión, efectosEnMision |
| H53 | Chapuzas | Chapuza | ×1.00 · ×1.00 · ×1.00 | — | — | — | cada semana |
| H54 | Dep | Dopamina | ×1.00 · ×1.00 · ×1.00 | — | — | — | cada semana |
| H55 | Heredero | Misión de vida | ×0.60 · ×0.80 · ×0.87 | — | — | — | misión (poder), al volver |
| H56 | Fondista | Maratón | ×0.60 · ×1.00 · ×1.15 | — | — | — | misión (poder) |
| H57 | Diván | Sesión | ×1.00 · ×1.00 · ×1.00 | — | — | — | cada semana |
| H58 | Chispa | Contagio | ×1.00 · ×1.05 · ×1.07 | — | — | — | misión (compañeros), efectosEnMision |
| H59 | Sombra | Primer golpe | ×2.00 · ×1.50 · ×1.33 | — | — | — | misión (poder) |
| H60 | Tomo | Estudioso | ×1.00 · ×1.00 · ×1.00 | — | — | — | al volver |
| H61 | Mimi | Fama | ×1.00 · ×1.00 · ×1.00 | — | — | — | al volver, mercado |
| H62 | Alaim | God's hate me | ×1.00 · ×1.00 · ×1.00 | segura/segura | — | — | lesiones, efectosEnMision |
| H63 | Medianoche | Cierre de temporada | ×0.50 · ×0.75 · ×0.82 | — | — | — | misión (poder) |
| H64 | Zancadilla | Mala jugada | ×1.00 · ×1.00 · ×1.00 | — | — | — | cada semana |
| H65 | Posadero | Casa llena | ×1.20 · ×1.10 · ×1.07 | — | — | — | misión (poder), sueldos |
| H66 | Profe | Cantera | ×1.00 · ×1.00 · ×1.00 | — | — | — | Prueba |
| H67 | Trébol | Karma | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (éxito), al salir, efectosEnMision |
| H68 | Luciérnaga | Brillo fugaz | ×1.00 · ×1.00 · ×1.00 | — | — | — | experiencia, cada semana |
| H69 | Vampire | Robo de poder | ×1.00 · ×1.00 · ×1.00 | nunca/grave/grave | — | — | lesiones, al volver, efectosEnMision |
| H70 | Blup | Cuerpo gelatinoso | ×1.00 · ×1.00 · ×1.00 | nunca | — | — | lesiones, al salir, al volver, efectosEnMision |
| H71 | Garra | Botín | ×1.00 · ×1.00 · ×1.00 | — | — | 1400 | oro, efectosEnMision |
| H72 | Bolita | Mejor amigo | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (poder), misión (compañeros), cada semana, efectosEnMision |
| H73 | Chibi | Sombra de gigantes | ×1.07 · ×1.04 · ×1.03 | — | — | — | misión (poder) |
| H74 | Beato | Última oración | ×1.00 · ×1.00 · ×1.00 | — | — | — | muerte |
| H75 | Yunque | Forja | ×1.00 · ×1.00 · ×1.00 | — | — | — | gasto de oro |
| H76 | Brújula | Atajo | ×1.00 · ×1.00 · ×1.00 | — | −1 día | — | duración, efectosEnMision |
| H77 | Usura | Préstamo | ×1.00 · ×1.00 · ×1.00 | — | — | — | economia |
| H78 | Disfraz | Falso rango | ×1.00 · ×1.00 · ×1.00 | — | — | — | mercado |
| H79 | Vigilia | Guardia | ×1.00 · ×1.00 · ×1.00 | — | — | — | cada semana, Prueba |
| H80 | Mascota | Mimo | ×1.00 · ×1.00 · ×1.00 | — | — | — | misión (quién va), cada semana, mercado, rivales |
