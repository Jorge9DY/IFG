# Análisis del gameplay — noviembre de 2026

Conclusión: los sistemas funcionan y están equilibrados, pero el jugador toma pocas decisiones difíciles. Las misiones se resuelven con "el equipo más fuerte en su posición natural", los fichajes casi siempre se ganan, los vínculos casi no aparecen y el poder oculto del protagonista no se usa. La profundidad está en el motor, pero no llega a las manos del jugador. Las mejoras de mayor impacto son dar identidad a cada tipo de misión, convertir el poder oculto en una mecánica activa, añadir fatiga para que importe tener una plantilla amplia y hacer visibles los vínculos.

## Datos medidos

300 temporadas con el jugador automático prudente (`npm run simular` y una medición específica de decisiones).

| Medida | Valor | Lectura |
| --- | --- | --- |
| Misiones por temporada | 17,3 | Ritmo correcto |
| Éxito en misiones | 88,2% | Demasiado seguro: casi nunca hay tensión |
| Misiones por rango (F / D / C / B) | 8% / 49% / 23% / 21% | Se repiten misiones D; las B llegan tarde |
| Tipos de misión (Caza, Escolta, Exploración, Rescate, Mazmorra) | ~20% cada uno | Las etiquetas son decorativas: no cambian nada |
| Pujas ganadas | 86,9% | Fichar casi nunca es una lucha |
| Subidas de rango por temporada (toda la plantilla) | 0,88 | La progresión de los héroes apenas se nota |
| Vínculos entre héroes de tu plantilla al final | 0,13 | El sistema de vínculos, central en la premisa, casi no existe en partida |
| Semanas sin ninguna decisión nueva | 24% | Una de cada cuatro semanas solo se pulsa "Terminar semana" |
| Oro (semana 10 → final) | 3.692 → 9.003 | La presión económica desaparece en la segunda mitad |
| Oro de misiones / patrocinio / gastos por temporada | 22.991 / 7.349 / 23.441 | Las misiones lo son todo; el patrocinio es pasivo |

## Análisis por áreas

### 1. Bucle principal y ritmo
La semana es siempre igual: fichar si falta alguien, mandar al equipo fuerte a la misión mejor pagada y terminar. No hay variación entre semanas ni un ritmo de tensión y alivio. El 24% de semanas sin decisión es la señal más clara.

### 2. Misiones y formación
La decisión real se reduce a "suma de stats contra poder recomendado". La posición solo penaliza (×0,8) y el elemento solo multiplica. Como el tipo de misión no importa, todos los equipos se forman igual. Además falta el "¿y si arriesgo un poco más?" que hace memorables los juegos de este tipo.

### 3. Fichajes
Se ganan el 87% de las pujas porque el jugador compra perfiles baratos que a los rivales no les interesan. La puja a ciegas está bien, pero el jugador no sabe quién compite contra él, así que no puede ajustar su estrategia. Football Manager añadió por eso explicaciones de por qué un club interesado no pujó; reducir la falta de información sin eliminarla es la clave.

### 4. Economía
Con tensión al principio y holgura al final, el oro deja de ser una decisión a mitad de temporada. Las mejoras de la sede absorben el excedente, pero son compras únicas sin compromiso. No hay contratos que caduquen ni renovaciones, que son la otra mitad de la gestión en el género deportivo.

### 5. Progresión de héroes
Menos de una subida de rango por temporada en toda la plantilla: los héroes no crecen de forma visible. Subir de nivel no ofrece elecciones (rasgos, especialización), así que encariñarse con un héroe depende solo de su nombre.

### 6. Vínculos y moral
Es la seña de identidad del diseño (fichar al hermano o a la pareja de alguien) y en partida casi no se ve: 0,13 vínculos dentro de la plantilla al final de la temporada. La moral tiende sola a 60 y el jugador apenas puede influir en ella.

### 7. Riesgo y muerte
Con un 88% de éxito y 0,4 muertes por temporada, la muerte es rara, tal como se decidió. Pero entonces el riesgo debe estar en otra parte: heridas, fatiga o botín perdido. En Darkest Dungeon el estrés obliga a rotar la plantilla y a mantener un banquillo amplio; aquí no hay razón para tener más de 5–6 héroes.

### 8. Rivales y clasificación
El jugador termina 5.º el 99% de las veces en la temporada 1. Es coherente con la historia, pero deja sin metas intermedias a 20 semanas de juego. Los rivales actúan, pero no tienen cara: no hay momentos de "el Duque me ha quitado a ese héroe".

### 9. Fantasía central: el poder oculto
La premisa es "tengo poder de dios y el sistema dice que soy D", y hoy ese poder solo da una ventaja pasiva (ver el potencial) a partir de 5 éxitos. Es la mayor oportunidad desaprovechada: el jugador debería sentir el poder y el riesgo de que lo descubran.

### 10. Facilidad de uso
Las cartas, las ofertas sugeridas y el equipo recomendado van en la dirección correcta. Falta enseñar los sistemas de uno en uno. El diseño de niveles de Nintendo presenta cada mecánica en un lugar seguro, la desarrolla, le da un giro y pasa a la siguiente (kishōtenketsu). Aplicado aquí: no abrir los seis paneles el primer día.

### 11. Rejugabilidad
Las partidas se parecen mucho entre sí: el mismo orden de acciones y una estrategia dominante. Faltan elecciones que definan el estilo de cada partida (qué tipo de gremio construyes).

## Propuestas, por prioridad

| # | Propuesta | Qué resuelve | Impacto | Esfuerzo |
| --- | --- | --- | --- | --- |
| 1 | **Resonancia, el poder oculto como acción.** 1 carga por semana (más con cada Despertar). Usos: repetir la tirada de una misión, salvar a un héroe de la muerte o ver los rivales interesados en una puja. Cada uso sube la Sospecha; a 100, investigación de la Asociación. | Fantasía central, decisiones de riesgo y recompensa, momentos memorables | Muy alto | Medio |
| 2 | **Misiones con identidad.** Cada tipo pesa un stat y tiene su consecuencia: Caza (Poder ×1,5), Escolta (Defensa; el fracaso resta reputación), Exploración (Agilidad; puede descubrir una misión rara), Rescate (Magia; si sale bien, un héroe se une gratis) y Mazmorra (dos fases: al volver eliges "salir con el botín" o "bajar otra planta" con el doble de oro y +riesgo). | Formaciones distintas para cada misión, tensión de "push your luck" | Muy alto | Medio |
| 3 | **Fatiga.** Cada misión seguida suma fatiga (−5% de poder por punto); una semana en la sede la recupera. | Obliga a rotar, da sentido a una plantilla amplia, a los Dormitorios y a fichar | Alto | Bajo |
| 4 | **Vínculos que se ven y se buscan.** En cada Draft y semana, al menos un candidato tiene vínculo con alguien de tu plantilla; las cartas lo destacan ("Hermana de Brann"). Reunir a una pareja o familia en el mismo equipo da escenas cortas y +moral. | Hace visible la seña de identidad del juego | Alto | Bajo |
| 5 | **Enseñar un sistema por semana.** Semana 1: mercado y misiones. Semana 2: ventas. Semana 3: mejoras de la sede. Semana 4: otros gremios. Cada panel nuevo llega con una escena breve de Elara. | Juego fácil de aprender al estilo Nintendo, sin quitar profundidad | Alto | Medio |
| 6 | **Encargos de la Asociación.** 1–2 objetivos opcionales por semana ("completa 2 Escoltas", "ficha a un sanador") con prestigio u oro. | Metas a corto plazo y variedad entre semanas | Alto | Bajo |
| 7 | **Pujas con información parcial.** Antes de pujar se ve quién está interesado ("La Corona y los Tejedores miran a este héroe"), sin ver sus ofertas. Los rivales también pujan por héroes baratos con potencial alto. | Fichajes con tensión; las pujas ganadas bajan del 87% a ~60% | Medio | Bajo |
| 8 | **Subida de nivel con elección.** Al subir de rango, el héroe elige uno de dos rasgos o especializaciones (por ejemplo, Tanque: "Muralla" o "Guardián"). | Apego a los héroes, builds distintas | Medio | Medio |
| 9 | **Contratos que vencen y renovaciones.** Héroes que piden más al renovar según su rendimiento. | Economía viva en la segunda mitad, decisiones de plantilla | Medio | Medio |
| 10 | **Patrocinadores con condiciones.** Elegir un patrocinador por temporada con una condición ("+40% si haces 10 Cazas"). | El patrocinio deja de ser pasivo, define el estilo de la partida | Medio | Bajo |
| 11 | **Rivales con cara.** Mensajes de los líderes rivales tras momentos clave (te ganan una puja, les robas un fichaje, te superan en la clasificación). | Narrativa emergente y rivalidad | Medio | Bajo |
| 12 | **Metas de temporada intermedias.** "Supera a un rival en puntos de misión esta temporada", "llega a 30 de prestigio". Con recompensa y escena con Elara. | Sensación de progreso aunque se termine 5.º | Medio | Bajo |

### Orden recomendado
1. **Primero, lo que cambia cada decisión:** propuestas 2 (misiones con identidad), 3 (fatiga) y 1 (Resonancia). Juntas convierten "manda al equipo fuerte" en una decisión semanal con matices.
2. **Después, lo que da alma:** propuestas 4 (vínculos visibles), 11 (rivales con cara) y 12 (metas de temporada).
3. **Con eso, el tutorial:** propuesta 5, enseñando los sistemas ya mejorados.
4. **Por último, la economía y el mercado:** propuestas 6, 7, 8, 9 y 10.

Cada propuesta se valida con el simulador. Objetivos nuevos: éxito en misiones entre 70% y 80%, pujas ganadas entre 50% y 65%, menos del 10% de semanas sin decisión, al menos 1 vínculo activo en la plantilla y más de 2 subidas de rango por temporada.

## Lo que no hay que cambiar
- Disposición de pantalla, estética y ayudas de un clic (equipo recomendado, ofertas sugeridas, objetivo del momento).
- Muertes raras (decisión del propietario): el riesgo nuevo viene de la fatiga, las heridas y las decisiones de la Mazmorra.
- La clasificación por temporada y la manutención.

## Fuentes
- [Engadget: por qué los niveles de Mario son brillantes](https://www.engadget.com/2015/03/17/super-mario-3d-world-design/) y [MCV: los secretos del diseño de niveles de Nintendo en cuatro pasos](https://www.mcvuk.com/development/video-nintendos-level-design-secrets-in-four-steps): enseñar cada mecánica en un lugar seguro, desarrollarla, darle un giro y pasar a la siguiente.
- [Den of Geek: Darkest Dungeon y la muerte permanente](https://www.denofgeek.com/?p=98073) y [Game Developer: el diseño narrativo de Darkest Dungeon](https://www.gamedeveloper.com/design/opinion-finding-meaning-in-i-darkest-dungeon-i-s-narrative-design): la plantilla, el estrés y la rotación como fuente de decisiones.
- [FTBL: transferencias y contratos en Football Manager 2012](https://www.ftbl.com.au/analysis/fm2012-transfers-and-contracts-272455): explicar por qué un club interesado no puja. [PC Gamer: el fallo de la IA de transferencias de Football Manager](https://www.pcgamer.com/football-manager-players-are-exploiting-a-bug-in-its-naive-ai-to-buy-the-best-players-in-history-for-less-than-1-of-their-value): una IA predecible rompe el equilibrio de información.
