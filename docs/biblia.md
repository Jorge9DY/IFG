# Biblia del proyecto — Gremio de héroes (isekai)

Versión del 6 de noviembre de 2026.

Esta biblia es la fuente única de verdad del proyecto: si algo no está aquí, no está decidido.

## Cómo usar esta biblia

Cada decisión lleva una etiqueta de estado. Cambiarla es una decisión explícita y se anota en el Registro de cambios.

| Etiqueta | Significado | Qué se puede hacer |
| --- | --- | --- |
| **\[Aceptado\]** | Decisión tomada. | Implementar. Cambiarla exige anotar el motivo. |
| **\[Propuesta\]** | Dirección planteada, no confirmada. | Prototipar y probar; no construir encima sin confirmar. |
| **\[Abierto\]** | Sin respuesta todavía. | Discutir; no implementar. |

Reglas de mantenimiento:

- Las cifras de ejemplo se marcan como *ilustrativas* hasta que se equilibren.
- Ningún sistema nuevo entra como \[Aceptado\] sin pasar antes por \[Propuesta\].
- Si dos secciones se contradicen, gana la de fecha más reciente en el Registro de cambios y se corrige la otra.

## 1. Visión

**\[Aceptado\]** El jugador dirige el peor gremio de héroes de un mundo isekai, último del ranking, y debe convertirlo en el número uno.

No es solo administrar una empresa: es levantar una organización legendaria con héroes a los que llegas a conocer. El juego debe dejar recuerdos: el héroe que se convirtió en leyenda, el que vendiste demasiado pronto, el que se fue.

**Género y tono \[Aceptado\]:** juego de gestión con mucho drama, personajes y acontecimientos narrativos, por encima de un simulador puramente estratégico.

### Arco de progresión

1. Gremio miserable, sin prestigio y con poco dinero.
2. Reclutar, descubrir talentos ocultos y desarrollar a los miembros.
3. Tomar decisiones duras sobre dinero, misiones, fichajes y mejoras.
4. Competir con otros gremios y sus maestros.
5. Alcanzar el primer puesto.

### Pilares de diseño \[Aceptado\]

| Pilar | Qué significa en la práctica |
| --- | --- |
| Pocas acciones, con consecuencias | Antes de añadir un botón, dar más peso a una decisión que ya existe. |
| Toda decisión cuesta algo | Las decisiones interesantes implican sacrificio y coste de oportunidad. |
| Los héroes son el corazón | Nunca cifras intercambiables; tienen voluntad propia. |
| El jugador manda | Los héroes deciden lo pequeño; lo importante pasa por el maestro. |
| Profundo por dentro, simple por fuera | La complejidad genera historias, no trabajo administrativo. |

> **Regla de oro:** el sistema puede ser profundo por dentro, pero la experiencia del jugador debe ser sencilla, intuitiva y emocionalmente significativa.

## 2. Bucle de juego y calendario

**\[Aceptado\]** El juego avanza por días con el botón «Finalizar día»; cada 7 días se celebra la Prueba de los Novatos. («Terminar semana» quedó descartado.)

### Bucle diario \[Aceptado; el orden fino puede ajustarse\]

1. Empieza el día: el jugador ve el estado del gremio y el resumen del día anterior.
2. Decide cómo ganar dinero: misiones o venta de héroes.
3. Decide en qué invertir: pujar por novatos, comprar héroes o mejorar instalaciones.
4. Gestiona el mercado.
5. Atiende los acontecimientos que de verdad requieren su intervención.
6. Pulsa «Finalizar día» y el mundo se resuelve (ver Resolución diaria).

### Ritmo semanal y temporadas \[Aceptado\]

| Escala | Duración | Qué ocurre |
| --- | --- | --- |
| Día | 1 turno | Misiones, mercado, eventos. |
| Semana | 7 días | Día 7: pago de sueldos y después Prueba de los Novatos. Se actualiza el ranking. |
| Temporada | 4 semanas (28 días) | Cierre oficial del ranking y premio en oro según la posición. |
| Partida | Varias temporadas | Termina al cerrar una temporada en el n.º 1 **\[Aceptado\]**. |

Motivo: sin temporadas no hay presión de tiempo ni un final claro. Pagar sueldos justo antes de la subasta genera cada semana el dilema «¿pago a todos o pujo fuerte?».

## 3. Interfaz principal

**\[Aceptado\]** La pantalla principal muestra solo cinco elementos; todo lo demás vive dentro de sus menús o no aparece.

| Posición | Elemento | Función |
| --- | --- | --- |
| Arriba izquierda | Oro actual | Dinero disponible. |
| Arriba derecha | Finalizar día | Avanzar al día siguiente. |
| Centro izquierda | Gestionar gremio | Inventario de héroes y mejorar instalaciones. |
| Centro derecha | Lanzar misiones | Tablón con las tres misiones. |
| Centro inferior | Mercado de héroes | Comprar a otros gremios o vender los propios. |

Pantallas secundarias propuestas, accesibles desde estos menús: ficha del héroe, registro del gremio y ranking (ver Motor narrativo).

**\[Aceptado\] Inventario de héroes** dentro de Gestionar gremio: muestra de un vistazo quién está libre, de misión (cuál y cuándo vuelve) o lesionado (cuántos días), y desde ahí se cura a los lesionados con oro. Dónde se accede al ranking: \[Abierto\].

## 4. Economía

**\[Aceptado\]** El dilema central es invertir en el presente o preparar el futuro: cada moneda gastada en algo es una moneda que no va a otra cosa.

Moneda única: **oro**. (En el diseño original aparece también «monedas»; se unifica como oro.)

### Flujos de dinero

| Tipo | Concepto | Estado |
| --- | --- | --- |
| Ingreso | Recompensas de misiones | \[Aceptado\] |
| Ingreso | Venta de héroes a otros gremios | \[Aceptado\] |
| Ingreso | Premio de fin de temporada según posición | \[Aceptado\] |
| Gasto | Comprar héroes en el mercado | \[Aceptado\] |
| Gasto | Mejorar instalaciones | \[Aceptado\] |
| Gasto | Pujas en la Prueba de los Novatos | \[Aceptado\] |
| Gasto | **Sueldos semanales**, pagados el día 7 | \[Aceptado\] |

### Sueldos \[Aceptado\]

Los sueldos son el gasto fijo semanal del gremio. El diseño ya los daba por hecho (peticiones de aumento, el bienestar depende del salario, la oferta a Kael), pero no figuraban como gasto.

- Cada héroe tiene un sueldo que crece con su poder y su reputación.
- Se pagan el día 7, antes de la Prueba de los Novatos.
- Tener plantilla cuesta: acumular héroes sin usarlos deja de ser gratis.
- **\[Aceptado\]** No poder pagar: el héroe que no cobra pierde lealtad y avisa; si pasa varias semanas seguidas sin cobrar (*ilustrativo:* 2), se va a otro gremio. Cobrar reinicia la cuenta. Orden de pago cuando no llega para todos: los más poderosos primero.
- **\[Aceptado\]** Sueldos altos: tener plantilla debe costar de verdad durante toda la partida.

### Decisiones tipo

- Mandar al mejor héroe a una misión peligrosa o reservarlo.
- Comprar un héroe mediocre que tapa un hueco o ahorrar para un novato prometedor.
- Vender a un héroe valioso para pagar una mejora o conservarlo.
- Mejorar instalaciones o fichar.

### Instalaciones

**\[Aceptado\]** Mejorar el gremio aumenta la capacidad de plantilla y el prestigio.

**\[Aceptado\]** Instalación de ojeadores: estrecha el rango de potencial que se ve de los novatos (ver Prueba de los Novatos).

**\[Aceptado\] Zona de entrenamiento** (idea del propietario): manda a un héroe unos días a entrenar. Gana experiencia a cambio de oro y no se lesiona. Sirve para subir a héroes demasiado flojos para las misiones y es otra decisión de gestión además de las misiones. No supera el límite del héroe (para eso está la Ascensión). Cada nivel da una plaza más y más experiencia por día. Cifras: *ilustrativas*.

**\[Aceptado\]** Las instalaciones son caras: junto con los sueldos, son el gran destino del oro y evitan que se acumule sin uso.

**\[Abierto\]** Lista de instalaciones, niveles, costes y efectos concretos.

## 5. Misiones

**\[Aceptado\]** El tablón muestra siempre tres misiones (rango bajo, medio y alto) y se renueva cada día. Se pueden lanzar las tres si hay héroes libres, y los enviados no están disponibles hasta que vuelven.

| Rango | Duración | Recompensa | Riesgo | Equipo |
| --- | --: | --: | --- | --: |
| Bajo | 1 día | 500 oro | Bajo | 1 héroe |
| Medio | 2 días | 1.500 oro | Medio | 2 héroes |
| Alto | 3 días | 4.000 oro | Alto | 3 héroes |

Duraciones y recompensas: *ilustrativas*, sin equilibrar.

### Tipos de misión \[Aceptado\]

Cada misión tiene un tipo que favorece a una clase (misiones de un héroe: Caza → Guerrero, Encantamiento → Mago, Rastreo → Explorador, Socorro → Sanador) o a una combinación de clases (misiones de grupo: por ejemplo, Escolta → Guerrero + Sanador, Mazmorra → Guerrero + Mago + Sanador). Cada clase favorecida que lleve el equipo suma éxito, y la combinación completa suma un poco más (*ilustrativo:* +5% por clase y +5% con todas). Elegir equipo pasa a ser leer la misión; el equipo recomendado ya lo tiene en cuenta.

### Un tablón que crece con el gremio \[Aceptado\]

El gremio tiene una **categoría** (D, C, B, A, S) que sube con el **prestigio** y **nunca baja**, para no frustrar al jugador. Cada categoría mantiene las tres misiones diarias (bajo, medio, alto), pero más difíciles y mejor pagadas. Subir de categoría se anuncia como un hito («La Asociación asciende a tu gremio a categoría B») y el tablón muestra cuánto prestigio falta para la siguiente. Los rivales juegan con el tablón de su propia categoría. Umbrales y multiplicadores: *ilustrativos*.

Motivo: sin esto, a partir de la segunda temporada los gastos subían y los ingresos no, y las misiones dejaban de ser un reto.

### Por qué varias misiones y no una

El diseño original permitía elegir solo una de las tres. Con misiones de hasta 3 días, la mayoría de la plantilla habría estado parada, y eso dispararía sin parar el evento «El héroe olvidado» sin que el jugador pudiera evitarlo. Ahora el dilema es a quién mandas a cada misión.

### Fracaso y lesiones

**\[Aceptado\]** Fracasar puede reducir la recompensa y causar lesiones que obligan a descansar.

**\[Aceptado\]** Un lesionado se puede curar al momento pagando oro (más caro cuantos más días le quedan y cuanto más poder tiene), desde el inventario de héroes.

**\[Aceptado de momento\]** La fórmula provisional de éxito y lesiones del prototipo sirve como base; se revisará al equilibrar.

**\[Abierto\]**

- Fórmula de éxito (poder del equipo frente a dificultad, rasgos, relaciones, estado de ánimo).
- Si hay requisitos de composición o especialidad.
- Lesiones, duración del descanso y recuperación.

## 6. Ranking y puntos de gremio

**\[Aceptado\]** El ranking se escala sumando puntos de gremio, que dependen de la fuerza de los héroes y del desarrollo y prestigio del establecimiento.

### Problema del «poder medio»

Usar la media del poder castiga la fantasía central: vender a los héroes débiles sube la puntuación, así que no compensa conservar a una Aria mediocre con talento oculto.

### Fórmula \[Aceptado\]

```latex
\text{Puntos} = \text{Fuerza} + \text{Prestigio}
```

| Componente | Cómo se calcula | Por qué |
| --- | --- | --- |
| Fuerza | Suma del poder de los 5 mejores héroes. | El banquillo no resta; tener cantera no penaliza. |
| Prestigio | Nivel de instalaciones + misiones de rango alto completadas + novatos destacados fichados. | Premia construir el gremio, no solo comprar poder. |

Peso de cada componente: aproximadamente igual al principio; se ajustará al equilibrar \[Abierto\].

### Actualización \[Aceptado\]

- Ranking semanal, al terminar el día 7.
- Cierre oficial al final de cada temporada de 4 semanas, con premio en oro según la posición.

**\[Abierto\]** Cómo puntúan los rivales simulados y la condición exacta de victoria.

## 7. Mercado de héroes

**\[Aceptado\]** El mercado permite comprar héroes de otros gremios y vender los propios; es una decisión estratégica y emocional a la vez.

**\[Aceptado\]** Fuera de la Prueba de los Novatos, comprar en el mercado es la única forma de fichar: no hay reclutamiento aparte.

Un héroe puede valer por lo que rinde hoy, por su potencial o por el interés que despierta en otros. Vender a alguien con una historia en el gremio debe doler.

**\[Abierto\]**

- Precios: fijos o según poder, rareza, potencial y reputación.
- Cómo y con qué frecuencia se generan ofertas de compra y venta.
- Si un héroe puede negarse a un traspaso y cómo influye su lealtad.
- Negociación de condiciones.
- Relación con los eventos externos («un gremio rival quiere fichar a uno de tus héroes»).

## 8. Prueba de los Novatos

**\[Aceptado\]** Cada 7 días, jóvenes aventureros despiertan sus poderes y los gremios pujan por ellos; es el gran evento semanal de tensión y competencia.

### Secuencia del evento \[Aceptado\]

1. Presentación de los novatos (ejemplo ilustrativo: 5 por edición).
2. Revelación de sus habilidades.
3. Reacciones de los maestros de gremio.
4. Subastas.
5. Reacciones de quienes ganan y pierden candidatos.

### Información incompleta \[Aceptado\]

El jugador no conoce el valor real de todos los candidatos; la incertidumbre forma parte de la decisión.

**\[Aceptado\]** El potencial se muestra como un rango (p. ej. «Potencial: B–S»). La instalación de ojeadores lo estrecha.

### Formato de puja

**\[Aceptado\]** Subasta ascendente por turnos: en cada ronda, cada gremio sube la puja o se retira. Sustituye a las pujas en tiempo real del diseño original.

Motivo: con la IA, el tiempo real es difícil de programar y de equilibrar, y convierte la estrategia en una prueba de reflejos.

**\[Aceptado\]** Cada rival tiene un límite oculto por candidato:

```latex
\text{Límite} = \text{valor percibido} \times \text{prioridad del gremio} \times \text{presupuesto disponible}
```

### Rivales con prioridades \[Aceptado\]

- Un gremio especializado en magia puja fuerte por un talento mágico; otro lo ignora y guarda su dinero para un guerrero.
- Presupuestos y prioridades distintos hacen que cada subasta sea diferente.
- Novatos especiales con historia propia (p. ej. un joven con una habilidad legendaria cuya familia odia a tu gremio).

**\[Abierto\]** Número de candidatos, qué se ve y qué se oculta, incrementos mínimos, desempates, interfaz y qué pasa si no tienes plaza en la plantilla.

## 9. Héroes

**\[Aceptado\]** Cada héroe es un personaje reconocible con cuatro bloques: estadísticas, personalidad, relaciones e historia.

### Estadísticas \[Aceptado\]

| Estadística | Función |
| --- | --- |
| Poder | Capacidad de combate actual. |
| Potencial | Techo de crecimiento futuro. |
| Experiencia | Progreso acumulado: una barra visible que, al llenarse, sube el poder. |
| Reputación | Reconocimiento público. |
| Lealtad | Compromiso con el gremio (ver sección 11). |

### Experiencia, subidas y rangos \[Aceptado\]

Los héroes mejoran misión a misión y el jugador lo ve. No se añade ninguna estadística nueva: solo se hacen visibles el Poder y la Experiencia.

- **Experiencia:** cada misión llena la barra del héroe (más cuanto más alto es el rango de la misión; la mitad si fracasa). No hay experiencia extra por otros motivos.
- **Subidas de poder:** al llenarse la barra, el poder sube de golpe (*ilustrativo:* +3 por barra de 21 puntos).
- **Rangos F, D, C, B, A, S** según el poder, con las mismas letras que el potencial. Ascender de rango solo sube el sueldo, y se muestra cuánto.
- **Techo:** al llegar a su potencial, el héroe deja de crecer, se avisa («Ha llegado a su límite») y se revela su potencial real.
- **Regreso de la misión:** en el resumen del día, cada héroe enseña su barra llenándose, la subida de poder, el ascenso y la lesión. Sin pantallas ni botones nuevos.
- **Descartado:** un «nivel» aparte del poder (dos números para lo mismo) y árboles de habilidades o reparto de puntos (trabajo administrativo).

### Ascensión \[Aceptado\]

Un héroe que ha llegado a su límite puede intentar romperlo. El jugador paga por enviarlo, **solo**, a una misión de Ascensión muy difícil durante unos días.

- **Si la supera:** asciende de rango (su poder sube hasta la letra siguiente) y su techo sube a esa letra, así que vuelve a crecer.
- **Si fracasa: muere.** Es la única forma de morir del juego y por eso pesa: ¿lo vendes o lo arriesgas todo para convertirlo en leyenda?
- La probabilidad y el coste se muestran antes de enviarlo, con un paso de confirmación que avisa de la muerte. Cuanto más alto el rango, más difícil (*ilustrativo:* 60% desde F, 35% desde A). Desde S no se puede ascender.
- Se puede repetir tras cada ascenso, siempre más difícil.

### Clases \[Aceptado\]

Cada héroe tiene una de cuatro clases desde que aparece y no cambia (cambiar de especialidad será un acontecimiento personal, fase 3). Cada clase tiene **un solo efecto pasivo**, sin habilidades que activar:

| Clase | Efecto pasivo |
| --- | --- |
| Guerrero | Se lesiona menos. |
| Mago | Más poder en misiones de rango alto, pero se lesiona más. |
| Explorador | El equipo vuelve un día antes de las misiones de rango alto. |
| Sanador | Sus compañeros de misión se lesionan menos. |

Cada rival se especializa en una clase: la mitad de su plantilla es de ella y puja más fuerte por los novatos de esa clase. Cifras: *ilustrativas*.

Habilidades y rarezas: \[Abierto\]. Descartado de momento: árboles de habilidades, habilidades que se activan a mano y subclases.

**Para la fase 3** (idea del propietario, apuntada para no olvidarla): superar una Ascensión podría dar al héroe un **título** («Maga del Alba») con un pequeño extra de su clase.

### Rasgos de personalidad \[Aceptado\]

Cada héroe tiene 2 o 3 rasgos combinables. **Regla:** ningún rasgo es solo bueno o solo malo.

| Rasgo | Tendencia | Lado bueno | Lado malo |
| --- | --- | --- | --- |
| Ambicioso | Quiere progresar rápido. | Empuja a mejorar. | Se frustra sin oportunidades. |
| Tímido | Le cuesta relacionarse. | Sin conflictos. | Tarda en adaptarse. |
| Alegre | Anima el ambiente. | Hace amigos con facilidad. | — por definir |
| Orgulloso | No tolera críticas. | Exigente consigo mismo. | Choca con arrogantes. |
| Disciplinado | Valora el esfuerzo. | Cumple y se prepara. | — por definir |
| Travieso | Bromea y salta normas. | Situaciones inesperadas. | Rompe normas en mal momento. |
| Compasivo | Se preocupa por otros. | Apoya tras lesiones. | Sufre con el sufrimiento ajeno. |
| Codicioso | Valora el dinero. | Motivado por recompensas. | Pide mejores condiciones. |

Los lados marcados «por definir» incumplen la regla y hay que completarlos. Lista final de rasgos: \[Abierto\] (objetivo inicial: 8–10).

### Antecedentes \[Aceptado\]

Un origen breve que alimenta acontecimientos; no una novela.

| Antecedente | Líneas narrativas |
| --- | --- |
| Antiguo noble | Familia, herencias, prejuicios. |
| Huérfano | Buscar familia o referentes. |
| Exmiembro de otro gremio | Rivalidad con antiguos compañeros. |
| Prodigio mágico | Interés de gremios y academias. |
| Aventurero fracasado | Inseguridad, necesidad de demostrar. |
| Familia humilde | Problemas económicos, ambición social. |
| Exsoldado | Recuerdos de guerra, antiguos superiores. |

Algunos héroes guardan un secreto, no necesariamente negativo: una habilidad, contactos, una oportunidad o un conflicto.

### Objetivos personales \[Aceptado\]

Cada héroe tiene un objetivo que avanza por etapas. Ayudarle sube la lealtad; ignorarlo una y otra vez le frustra.

Ejemplos: ser el más poderoso, ayudar a su familia, encontrar a un desaparecido, superar a un rival, liderar un grupo, conseguir reconocimiento, descubrir el origen de sus poderes.

Ejemplo de etapas (mejor espadachín): pide entrenamiento especial → busca un duelo con un rival → participa en un torneo.

## 10. Relaciones entre héroes

**\[Aceptado\]** Cada relación relevante tiene una afinidad de −100 a 100 y, opcionalmente, una etiqueta de vínculo; solo se calculan y muestran las relevantes.

### Afinidad

| Afinidad | Estado |
| --: | --- |
| 60 a 100 | Mejores amigos |
| 20 a 59 | Amigos |
| −19 a 19 | Neutrales |
| −59 a −20 | Mala relación |
| −100 a −60 | Enemigos |

Cambia al completar misiones juntos, ayudarse tras una lesión, discutir por una recompensa, competir por el reconocimiento del maestro, compartir experiencias o convivir.

### Tipos de vínculo y efectos

| Vínculo | Descripción | Efecto jugable propuesto |
| --- | --- | --- |
| Amistad | Se llevan bien. | Se apoyan en acontecimientos; mejores amigos: bonificación de cooperación en misiones. |
| Rivalidad | Quieren superarse. | Compiten por mejorar. |
| Enemistad | Hostilidad. | Más probabilidad de discutir. |
| Admiración | Uno es referente del otro. | Por definir. |
| Mentoría | Uno ayuda a crecer al otro. | Por definir. |
| Romance | Interés sentimental. | Desbloquea acontecimientos exclusivos. |

Las etiquetas evolucionan: una rivalidad puede convertirse en amistad y una amistad romperse tras una traición.

**Ejemplo de vínculo especial:** dos héroes quieren ser el mejor espadachín del gremio. Se provocan, entrenan juntos y acaban reconociendo el talento del otro; la rivalidad sana mejora a ambos.

**\[Abierto\]** Cómo se calculan los cambios de afinidad y el tamaño de cada bonificación.

## 11. Emociones, necesidades y lealtad

**\[Aceptado\]** Tres capas distintas: la personalidad es estable, el estado de ánimo es temporal y la lealtad cambia despacio; las necesidades son internas y nunca se muestran como barras.

### Estado de ánimo

Feliz, motivado, triste, enfadado, frustrado, asustado y confiado. No aplica penalizaciones constantes: sirve sobre todo para dar contexto a acontecimientos y decisiones (un asustado rinde peor en misiones peligrosas; un enfadado discute más).

### Necesidades internas (0–100, ocultas)

| Necesidad | Qué representa | Sube con | Baja con |
| --- | --- | --- | --- |
| Reconocimiento | Sentirse valorado. | Misiones difíciles completadas. | Ser ignorado. |
| Progreso | Mejorar. | Misiones y entrenamiento. | No poder desarrollarse. |
| Pertenencia | Sentirse parte del grupo. | Tiempo con amigos. | Aislamiento, conflictos. |
| Bienestar | Buenas condiciones de vida. | Buen sueldo, descanso. | Sueldo bajo, lesiones. |
| Ambición | Avanzar en su objetivo. | Etapas del objetivo cumplidas. | Objetivo bloqueado. |

La personalidad decide cuánto pesa cada necesidad: un ambicioso necesita mucho progreso y reconocimiento; uno tranquilo se conforma con estabilidad.

### Lealtad

Un héroe puede estar frustrado y seguir siendo leal.

| Lealtad | Estado |
| --: | --- |
| 90–100 | Incondicional |
| 70–89 | Muy leal |
| 50–69 | Leal |
| 30–49 | Dudoso |
| 10–29 | Descontento |
| 0–9 | Al borde de abandonar |

Escalada orientativa (no obligatoria): se frustra → lo comenta a un compañero → pide hablar con el maestro → si se le ignora, escucha otras ofertas → otro gremio le hace una propuesta.

### Abandono

**\[Aceptado\]** Irse es excepcional y siempre va precedido de avisos con margen para reaccionar; nunca por una tirada aleatoria. Cada héroe tiene su tolerancia.

**\[Aceptado\]** Excepción: si las condiciones son extremas y el jugador ignora reiteradamente las oportunidades, el héroe se va por iniciativa propia.

**\[Abierto\]** Valores iniciales de necesidades y lealtad y cómo se calculan sus cambios.

## 12. Autonomía de los héroes

**\[Aceptado\] Modelo B, autonomía moderada:** los héroes toman pequeñas decisiones solos; las grandes generan una oportunidad de intervención para el jugador.

| Nivel | Quién decide | Ejemplos |
| --- | --- | --- |
| 1. Autónomo | El héroe, sin aviso. | Hacer amigos o rivales, cambiar de ánimo, compartir experiencias, intereses personales, actividades sociales. |
| 2. Semiautónomo | El héroe propone, el jugador puede intervenir. | Pedir aumento, pedir misión, pedir entrenamiento especial, pedir que se resuelva un conflicto, pedir descanso, querer cambiar de equipo. |
| 3. Importante | Evento obligatorio con decisión. | Amenazar con irse, recibir oferta de otro gremio, conflicto grave, revelar un secreto, giro en su historia personal. |

### Acciones autónomas (primera versión)

| Acción | Consecuencia |
| --- | --- |
| Socializar | Mejora relaciones. |
| Entrenar por su cuenta | Pequeño progreso. |
| Descansar | Recupera bienestar. |
| Ayudar a otro héroe | Sube afinidad. |
| Practicar una habilidad | Puede mejorar una especialización. |
| Discutir | Puede empeorar relaciones. |
| Buscar reconocimiento | Puede generar un acontecimiento. |
| Reflexionar sobre su objetivo | Puede avanzar su historia. |

**Límite \[Aceptado\]:** la autonomía nunca gasta recursos importantes del gremio sin permiso (puede entrenar solo, no contratar un instructor con el oro del gremio).

### Cómo elige una acción

Al finalizar el día, el sistema mira necesidades, estado emocional, relaciones y objetivo, y elige una acción con sentido. La personalidad decide cómo resuelve el problema. Ante falta de progreso: el independiente entrena solo, el ambicioso pide una misión más difícil, el inseguro busca consejo y el muy frustrado se queja al maestro.

## 13. Motor narrativo y acontecimientos

**\[Aceptado\]** Los acontecimientos nacen del estado de los personajes, sus relaciones y las decisiones del jugador, nunca de ventanas aleatorias; sus consecuencias persisten.

### Dos capas

| Capa interna (simulador) | Capa visible (jugador) |
| --- | --- |
| Personalidades, necesidades, relaciones, lealtad, ánimo, objetivos, acciones autónomas, consecuencias pendientes. | Situaciones que merecen atención, personajes que necesitan algo, oportunidades, consecuencias de decisiones pasadas, noticias breves. |

Ejemplo: internamente Aria tiene poco reconocimiento y un objetivo mágico. El jugador solo lee: «Aria lleva varios días entrenando hasta tarde. Hoy ha pedido hablar contigo».

### Categorías

| Categoría | Ejemplo |
| --- | --- |
| Personal | Quiere cambiar de especialidad. |
| Social | Dos héroes empiezan una amistad. |
| Conflicto | Discuten por una recompensa. |
| Económico | Pide un aumento. |
| Externo | Otro gremio quiere fichar a un héroe. |
| Especial | Historias personales, calendario, rivales. |

### Niveles de presentación

| Nivel | Formato | Ejemplo |
| --- | --- | --- |
| Cotidiano | Línea en el resumen del día; no interrumpe. | «Leo y Aria han empezado a llevarse mejor.» |
| Importante | Evento con decisión; pausa la gestión. | «Aria quiere demostrar su talento.» |
| Crítico | Evento prioritario. | «Un gremio rival quiere fichar a uno de tus héroes.» |

### Plantilla de evento importante

1. Título claro y personaje implicado.
2. Texto breve de la situación.
3. Pregunta.
4. Dos o tres opciones con una línea de explicación cada una.
5. Consecuencias coherentes con personalidad, relaciones e historial.

**Ejemplo — El héroe olvidado.** «Maestro, llevo días esperando una oportunidad. ¿Ya no confías en mí?» Opciones: darle una misión (sube lealtad), explicarle la situación (puede aceptar o no) o ignorarlo (baja lealtad, busca otro gremio). La consecuencia puede llegar días después.

### Selección y anti-saturación

Cada evento importante tiene cuatro valores internos: relevancia, urgencia, interés e interrupción. Antes de mostrarlo se pregunta: ¿importa a alguien?, ¿tiene consecuencias?, ¿necesita al jugador?, ¿aporta algo nuevo? Si no, se resuelve solo o pasa al resumen.

| Regla | Valor |
| --- | --- |
| Eventos importantes pendientes a la vez | Máximo 1; el resto espera. |
| Eventos menores | 0–2 al día, en el resumen. |
| Eventos importantes | 2–3 por semana (orientativo). |
| Prioridad | Historia personal en marcha > evento menor; riesgo de perder a un héroe > todo. |
| Repetición | El mismo conflicto no vuelve una y otra vez. |

### Historias por capítulos

Cadenas de 2 a 4 eventos; no todos los héroes tienen una larga. Ejemplo **El talento oculto**: Aria muestra una habilidad que no controla (pagar instructor o dejarla sola) → descubre una afinidad mágica → un rival ofrece dinero por ella y quiere tu opinión → despierta un poder extraordinario, se va o se convierte en pilar del gremio.

### Memoria y registro

- El juego recuerda decisiones pasadas (p. ej. cuántas veces rechazaste a un héroe).
- **Ficha del héroe:** estadísticas, rasgos y ánimo, relaciones, historia y eventos vividos.
- **Registro del gremio:** historial de hitos («Día 8: Aria descubrió una habilidad mágica»).

### Vida cotidiana visible \[Abierto, con recomendación\]

Opción A: noticias pequeñas frecuentes (más vida). Opción B: solo lo que produce algo relevante (más limpio). **Recomendación:** mezcla cercana a B; pendiente de confirmar.

## 14. Gremios rivales

**\[Aceptado\]** Los rivales no son números en un ranking: cada uno tiene identidad, estrategia y un maestro reconocible que reacciona a lo que hace el jugador.

### Candidatos \[Abierto: nombres, número y emparejamiento tentativo de las dos listas\]

| Gremio | Nombre alternativo | Personalidad | Estrategia |
| --- | --- | --- | --- |
| Dragón Carmesí | Gremio del Dragón | Arrogante | Héroes muy poderosos, instalaciones mediocres. |
| Corona Dorada | Gremio de la Corona | Ambicioso | Invierte en prestigio e instalaciones. |
| Sombras Negras | Gremio de las Sombras | Calculador | Compra talento barato antes que nadie. |
| Última Esperanza | — | Tradicional | Conserva a sus veteranos. |
| — | Gremio del León | Por definir | Plantilla equilibrada. |

### Comportamiento esperado

- Reclutan, mejoran instalaciones y evolucionan.
- Pujan por novatos según sus prioridades y presupuesto.
- Intentan fichar a héroes del jugador.
- Generan rivalidades entre maestros y reaccionan a los éxitos y fracasos del jugador.

Ejemplo: el maestro del Dragón Carmesí se burla de ti por ser el último; semanas después le arrebatas un novato extraordinario en la subasta.

### Retos de los maestros \[Aceptado\]

Una vez por semana, el maestro de un gremio rival puede retarte: «¿Tienes un mago de rango C más fuerte que el mío?».

- La clase y el rango salen de un héroe del rival con el mismo rango que alguno de los tuyos.
- Eliges a uno de los tuyos de esa clase y rango **sin ver el suyo**. El rival no saca a su mejor héroe, sino a uno de ese mismo rango. Gana el de más poder; con empate, nadie paga.
- **Apuesta en oro.** Si ganas, te llevas la apuesta y prestigio; si pierdes, pagas la apuesta. Rechazar no cuesta nada.
- El reto vive arriba del Mercado de héroes (a veces hay que comprar al héroe para responder) y caduca el día 7.
- Cada maestro tiene su frase. Sus nombres siguen \[Abierto\].

**\[Abierto\]** Qué acciones hacen cada día, cómo se simula su progreso y cómo puntúan en el ranking.

## 15. Resolución diaria

**\[Aceptado como base; el orden puede cambiar al cerrar misiones y economía\]** Al pulsar «Finalizar día» el mundo se resuelve en seis pasos.

1. **Gestión del jugador** (ya hecha durante el día): misiones, mercado, instalaciones.
2. **Regreso de misiones:** recompensas, heridas, experiencia y eventos derivados.
3. **Vida social:** se actualizan relaciones, necesidades y estados de ánimo.
4. **Autonomía:** cada héroe elige una acción autónoma.
5. **Acontecimientos:** se evalúan condiciones y se elige qué se muestra.
6. **Mundo y rivales:** los gremios rivales avanzan y preparan movimientos.

Día 7 **\[Aceptado\]:** añade pago de sueldos, Prueba de los Novatos y actualización del ranking.

No se simula cada conversación: se hacen cálculos diarios y solo se generan las interacciones relevantes.

## 16. Reglas anti-frustración

**\[Aceptado\]** Estas reglas se comprueban contra cada sistema nuevo antes de aceptarlo.

- Los héroes no sabotean al jugador constantemente.
- Toda consecuencia es comprensible: si un héroe pierde lealtad, se entiende por qué.
- Las decisiones importantes dan margen de reacción.
- Dos héroes con las mismas estadísticas pueden comportarse distinto.
- Los héroes recuerdan decisiones anteriores.
- La autonomía no gasta recursos importantes sin permiso.
- Ninguna barra interna obligatoria para el jugador.
- Eventos breves, relevantes, con 2–3 opciones.
- La pantalla principal sigue limpia aunque la simulación sea profunda.
- **\[Aceptado\]** Ningún sistema debe castigar al jugador por algo que no puede evitar (motivo de permitir varias misiones, sección 5).
- **\[Aceptado\]** La muerte solo llega por una decisión explícita del jugador (la Ascensión), nunca por azar en una misión normal, y siempre con aviso y confirmación.
- **\[Aceptado\]** Lo que se gana no se pierde por mala suerte: la categoría del gremio nunca baja.

## 17. Alcance y hoja de ruta

**\[Aceptado\]** Construir en cuatro fases y no pasar a la siguiente sin superar su puerta: si la economía no engancha con héroes que son solo números, la narrativa no la salvará.

La hoja de ruta (4 fases, 3 puertas) está en [plan-de-desarrollo.md](plan-de-desarrollo.md).

La fase 1 es el foco actual; la narrativa entra cuando ya hay algo que la multiplique.

### Primera versión narrativa \[Aceptado como alcance\]

| Sistema | Alcance inicial |
| --- | --- |
| Personalidad | 8–10 rasgos combinables. |
| Relaciones | Afinidad entre héroes. |
| Historia | Antecedentes y objetivos. |
| Estado de ánimo | 6–7 estados. |
| Acontecimientos | Eventos con condiciones y elecciones; consecuencias persistentes. |
| Historias | Cadenas de 2–4 eventos. |
| Registro | Historial de hitos. |
| Autonomía | Acciones sencillas, modelo moderado. |
| Necesidades | Cinco, ocultas. |
| Lealtad | Valor propio con avisos antes del abandono. |

**Fuera de alcance por ahora:** romances complejos, familias y matrimonios, traiciones elaboradas, árboles narrativos gigantes.

## 18. Decisiones pendientes

Primero se cierran las que bloquean la fase 1; las demás pueden esperar.

### Bloquean la fase 1

- [x] Varias misiones al día si hay héroes libres; tablón renovado a diario (sección 5).
- [x] Sueldos semanales pagados el día 7 (sección 4).
- [x] Ranking = Fuerza (top 5) + Prestigio (sección 6).
- [x] Temporadas de 4 semanas con premio final (sección 2).
- [x] Condición de victoria: cerrar una temporada en el n.º 1.
- [x] Fórmula de éxito de misión, lesiones y recuperación (base provisional aceptada de momento; curación con oro).
- [x] Tablón que crece con la categoría del gremio (sube por prestigio, nunca baja).
- [x] Ascensión: romper el límite de un héroe con riesgo de muerte.
- [ ] Cifras equilibradas: recompensas, sueldos, costes y premios de temporada.
- [x] No hay reclutamiento aparte: fuera de la Prueba de los Novatos, solo se ficha comprando a otros gremios en el mercado.
- [x] Qué pasa si no puedes pagar los sueldos: tras varias semanas sin cobrar, el héroe se va.

### Fase 2

- [x] Subasta ascendente por turnos en lugar de tiempo real.
- [ ] Candidatos por Prueba, información visible u oculta, incrementos y desempates.
- [ ] Precios, ofertas y traspasos del mercado; si un héroe puede negarse.
- [ ] Número de rivales, nombres, maestros y simulación diaria.
- [ ] Lista de instalaciones, niveles, costes y efectos.

### Fases 3 y 4

- [ ] Lista final de rasgos y completar sus lados buenos y malos.
- [ ] Valores iniciales de estadísticas, necesidades y lealtad.
- [ ] Cálculo de cambios de afinidad y de ánimo.
- [ ] Selección, encadenado y no repetición de historias.
- [ ] Diseño visual de la ficha del héroe y del registro.
- [ ] Confirmar la presentación de la vida cotidiana (mezcla cercana a la opción B).

## 19. Registro de cambios

| Fecha | Cambio |
| --- | --- |
| 2026-11-07 | Idea del propietario: zona de entrenamiento como instalación (entrenar unos días a cambio de oro, sin lesiones, sin superar el límite). |
| 2026-11-07 | Decisiones del propietario: cuatro clases (Guerrero, Mago, Explorador, Sanador) con un solo efecto pasivo; tipos de misión que favorecen a una clase o a una combinación; retos de los maestros con apuesta en oro (si ganas, oro y prestigio), pasan a \[Aceptado\]; el título por Ascensión queda apuntado para la fase 3. |
| 2026-11-07 | Decisiones del propietario contra el estancamiento del medio juego: tablón que crece con la categoría del gremio (sube por prestigio, nunca baja); Ascensión para romper el límite de un héroe (si fracasa, muere: única muerte del juego, siempre por decisión del jugador); retos de los maestros como \[Propuesta\], pendientes de las clases de héroe. Mercado más barato. |
| 2026-11-06 | Decisión del propietario: experiencia visible en barra, subidas de poder de golpe al llenarla, rangos F–S según el poder (ascender solo sube el sueldo), techo al llegar al potencial y regreso de la misión en el resumen del día. Sin experiencia extra. |
| 2026-11-06 | Decisiones del propietario: se elimina el reclutamiento; fuera de la Prueba de los Novatos solo se ficha comprando a otros gremios en el mercado. Confirmado el orden de pago de sueldos (los más poderosos primero). |
| 2026-11-06 | Decisiones del propietario tras probar el prototipo: victoria al cerrar una temporada en el n.º 1; un héroe que no cobra varias semanas seguidas se va a otro gremio; sueldos e instalaciones más caros para que el oro siga apretando; inventario de héroes con su estado en Gestionar gremio; curar lesionados con oro; la fórmula de éxito y lesiones vale de momento. |
| 2026-11-06 | Aprobadas y pasadas a \[Aceptado\]: sueldos semanales el día 7, varias misiones al día con equipos de 1/2/3 héroes y tablón diario, ranking Fuerza (top 5) + Prestigio, ranking semanal, temporadas de 4 semanas con premio, subasta por turnos con límite oculto de los rivales, potencial en rango con ojeadores, regla de no castigar lo inevitable, hoja de ruta por fases, consecuencias de fracasar misiones (menos recompensa y lesiones) y marcha voluntaria de un héroe ignorado reiteradamente. |
| 2026-11-06 | Biblia creada a partir del documento de diseño original. Moneda unificada como oro. |
| (anterior) | Calendario semanal sustituido por avance diario con «Finalizar día». |
