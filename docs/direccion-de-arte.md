# Dirección de arte — encargo

Encargo del propietario (2026-11-16) para rehacer el apartado gráfico en un chat nuevo. Este documento recoge el encargo; el chat que lo ejecute debe completarlo con la dirección de arte detallada (sección final) antes de programar.

## Referencias

El propietario las adjunta en el chat. **No se suben al repositorio:** son de juegos con derechos y sirven solo como estilo. No se copian personajes, logos ni textos.

1. **Despacho con dos personajes y opciones de diálogo** (ambiente e interfaz).
2. **Calle con tres personajes** (ambiente e interfaz).
3. **Chica de pelo gris con sudadera negra** (personajes).
4. **Chica de pelo azul con gafas y vestido de cuadros** (personajes).

- **Imágenes 1 y 2 — ambiente e interfaz:**
  - escenas en 3D con cámara cercana y personajes dentro del escenario;
  - luz suave con sombras de persiana;
  - colores apagados con acentos (cian);
  - nombres flotando sobre los personajes;
  - bocadillos de texto en cajas oscuras translúcidas;
  - opciones de diálogo en botones inclinados apilados.
- **Imágenes 3 y 4 — personajes:**
  - low poly al estilo PS1/PS2, con pocos polígonos y siluetas marcadas (ropa holgada, mangas grandes, zapatillas grandes, pelo en pocos bloques);
  - proporciones estilizadas, no chibi de cabeza gigante;
  - todo el detalle pintado en la textura: ojos grandes con brillo, rubor, flequillo, rayas, cuadros, lazos y pliegues.

## Objetivos

1. **Héroes low poly con texturas pintadas, generados por código.** No hay modelos ni texturas externos: geometría creada con Three.js y texturas dibujadas por código en canvas.
   - **Datos del catálogo:** cada uno de los 80 héroes de `src/datos/heroes.json` tiene un aspecto propio a partir de sus datos: clase, género, rasgos, nombre e id (colores, peinado, ropa y accesorio de clase).
   - **Héroes con forma especial:** AllBlack, InsectLover/GodInsect, Blup, Gabardina, Pacto con su bestia, Mascota y Zombies.
   - **Animaciones sencillas:** respirar, andar, saludar, celebrar y lesionado.
   - **Diseño preparado para crecer:** un héroe se puede sustituir más adelante por un modelo hecho a mano sin tocar el resto.
2. **Una sede que crece con el gremio.** Cada mejora de instalaciones (sede, zona de entrenamiento, ojeadores) añade o cambia salas: dormitorios con más camas, sala de entrenamiento, despacho de ojeadores, etc.
   - **Héroes en la sede:** caminan por ella según su estado (libres por las salas, lesionados en la enfermería, los que están de misión no aparecen).
   - **Estilo:** el mismo low poly con texturas pintadas y la luz de las referencias 1 y 2.
3. **Interfaz al estilo de las referencias 1 y 2:**
   - Los momentos de historia y los asuntos sociales como escenas: el héroe en 3D en primer plano, bocadillo de texto y opciones apiladas.
   - Nombres sobre los personajes.
   - Se mantienen la disposición del juego y lo que ya funciona (paneles laterales, «Finalizar día», objetivo del momento), con una estética coherente.
4. **Retratos** para cartas y listas sacados del propio modelo 3D (render de la cara) en lugar de los retratos SVG actuales.

## Reglas

- No se toca `src/motor/`: la escena y la interfaz solo leen el estado y llaman a acciones del motor.
- Las cifras y colores configurables van en datos (por ejemplo `src/datos/aspecto.json`), no repartidos por el código.
- Nada de recursos externos. Si alguna vez hiciera falta alguno, solo con licencia CC0, anotado en `assets/CREDITOS.md` y con el visto bueno del propietario.
- Rendimiento: tiene que ir fluido en un portátil normal con 15–20 héroes en pantalla.
- Todo el texto, los comentarios y los documentos, en español.

## Forma de trabajo

1. **Dirección de arte primero.** Completar este documento (sección siguiente) con:
   - la paleta;
   - las proporciones y el número de polígonos aproximado por personaje;
   - cómo se pintan las texturas (cara, pelo, ropa);
   - la luz, la cámara y la interfaz;
   - cómo se genera cada héroe desde el catálogo y cómo crece la sede con cada mejora;
   - un plan por fases.

   Enseñárselo al propietario antes de programar.
2. **Muestra pequeña.** Una sala y tres héroes muy distintos (por ejemplo HalfGoblin, Lumia y AllBlack), más una escena de diálogo con opciones. Hacer capturas con Playwright, compararlas con las referencias, decir con sinceridad en qué se parecen y en qué no, y esperar el visto bueno.
3. **Después, por fases:** los 80 héroes; la sede que crece; la interfaz y las escenas; los retratos. Al terminar cada fase:
   - ejecutar `npm run typecheck`, `npm test` y `npm run build`;
   - comprobar con Playwright que no hay errores de consola;
   - enseñar capturas;
   - anotar el trabajo en `docs/bitacora.md`.
4. Trabajar en una rama nueva y no mezclarla con `main` sin permiso del propietario.

## Expectativas

- **Lo que se puede igualar:** la silueta, la forma low poly, los colores planos por zonas y la interfaz de diálogos.
- **Lo que quedará más sencillo:** la cara y los detalles pintados a mano, porque las texturas se dibujan por código.
- **Si la cara no convence:** probar dos o tres variantes antes de hacer los 80 héroes. Opción intermedia: encargar o dibujar solo las texturas de las caras.

## Dirección de arte detallada

Escrita el 2026-11-16 por el chat del apartado gráfico. **Estado: propuesta, pendiente del visto bueno del propietario.** No se ha programado nada todavía. Las cifras son de partida: se ajustan en la muestra (fase 1) y viven en `src/datos/aspecto.json`.

### 1. Resumen en diez líneas

1. Personajes low poly de **350–550 triángulos**, de unas **5,3 cabezas** de alto: piernas largas y finas, zapatos grandes, prenda de arriba holgada con mangas anchas y pelo en pocos bloques.
2. Todo el detalle va **pintado por código** en un atlas de 256 × 256 píxeles por héroe: cara, pelo, ropa, calcetines y accesorio.
3. Paleta apagada: escenario en grises, personajes con dos neutros, un color propio y el acento de su clase.
4. Luz suave y fría de ambiente más un **sol cálido de ventana con rayas de persiana**. Una sola luz con sombras.
5. Sombreado de dibujo animado en **dos tonos** sobre la textura, sin brillos.
6. La sede es un plano de salas con huecos fijos: lo que aún no has construido se ve como **solar**, y cada mejora levanta o amplía una sala.
7. Los héroes viven en la sede según su estado y su carácter, con el **nombre flotando** encima.
8. Los momentos de historia y los asuntos sociales pasan a ser **escenas**: cámara cercana, bocadillo oscuro translúcido y opciones inclinadas apiladas.
9. Los retratos de cartas y listas son **renders de la cara** del propio modelo.
10. Cada héroe sale de una función pura `catálogo → aspecto → figura`; un modelo hecho a mano puede sustituir a cualquiera sin tocar el resto.

### 2. Paleta

Regla de reparto en cada personaje: **70% neutros, 20% color propio y 10% acento de clase**. El escenario no usa colores vivos: los acentos se reservan para los personajes y la interfaz.

**Interfaz** (se mantienen las variables actuales de `src/ui/estilos.css`):

| Uso | Color |
| --- | --- |
| Fondo de pantalla | `#1c1d1f` |
| Caja translúcida | `rgba(12, 13, 15, 0.72)` |
| Línea fina | `rgba(235, 238, 240, 0.85)` y `0.22` la suave |
| Texto y texto tenue | `#eceef0` y `#9aa0a6` |
| Cian (acento principal) | `#3fd8e8` |
| Oliva | `#8a9a4b` |
| Naranja | `#b8673a` |
| Alerta | `#e8574f` |

**Escenario:**

| Uso | Luz | Sombra |
| --- | --- | --- |
| Pared | `#8a8780` | `#5e5c58` |
| Suelo de baldosa | `#a9b0b4` | `#7f858a` (junta) |
| Madera | `#9a8468` | `#6b5a4a` |
| Mueble oscuro y tela | `#4a4e54` | `#3a3d40` |
| Metal | `#8d9499` | `#5f666b` |
| Papel y sábanas | `#e6e1d3` | `#bdb8aa` |
| Sol de ventana | `#fff1d6` | — |
| Ambiente | `#cfd8dd` (cielo) | `#4a4f55` (suelo) |

**Personajes:**

| Grupo | Colores |
| --- | --- |
| Piel (6) | `#f6e3d3` `#f0cfb4` `#e6b995` `#c99468` `#a8744e` `#7d5236` |
| Piel de fantasía | goblin `#9fb37a`, ceniza `#b9bcc4`, zombie `#9aa79a` |
| Pelo (12) | `#24211f` `#4a3426` `#7a5233` `#c9b07a` `#e9dfc8` `#b9bcc0` `#ecebe6` `#a8452f` `#d49aa5` `#8fa3d9` `#7f9a78` `#7e6aa8` |
| Ojos (8) | `#6f9a4a` `#d9952f` `#4f86c6` `#3fb8c8` `#8a6fd1` `#c2473d` `#7d868c` `#6b4a2e` |
| Ropa neutra (6) | `#26272a` `#4a4e54` `#c9cdd0` `#eeeae2` `#cdbb9a` `#2f3a55` |
| Acento de clase | Guerrero `#b8673a`, Mago `#7d62c4`, Explorador `#6f8f4a`, Sanador `#3fb8c8` (los que ya usan los retratos actuales) |
| Color de gremio (brazalete o pañuelo) | el tuyo, cian `#3fd8e8`; Dragón Carmesí `#a8322d`; Sombras Negras `#3a3550`; Corona Dorada `#c9a13a`; Última Esperanza `#6f9fb0` |

Cada color de ropa y de pelo tiene, además, un tono de sombra (−18% de luminosidad, algo más frío) y uno de luz (+10%) que se calculan solos al pintar.

### 3. Proporciones y polígonos

Unidad: 1 = 1 metro. Altura estándar **1,60**.

| Parte | Medida de partida | Nota |
| --- | --- | --- |
| Cabeza | 0,30 de alto × 0,27 de ancho (0,36 con el pelo) | 5,3 cabezas de alto: estilizado, no chibi |
| Piernas | 48% de la altura, radio 0,045–0,06 | Largas y finas, como en las referencias 3 y 4 |
| Zapatos | 0,26 × 0,13 × 0,11 | Grandes: dan peso a la silueta |
| Torso con prenda | hombros de 0,42 | La prenda cuelga más ancha que el cuerpo |
| Mangas | radio 0,07 en el hombro → 0,11 en el puño | Tapan media mano |
| Manos | manopla de 6 caras | Sin dedos |

Variación por héroe (desde su semilla y sus ajustes): altura × 0,86–1,12, complexión delgada, media o ancha, y ancho de hombros y cadera según el género, sin exagerar.

**Presupuesto de triángulos:**

| Parte | Triángulos |
| --- | --: |
| Cabeza (8 lados × 5 anillos) | 60–80 |
| Pelo (casquete + flequillo en cuñas + masa trasera o coletas) | 60–140 |
| Torso y prenda de arriba, con faldón | 60–90 |
| Brazos (2 × dos tramos de 5 lados y mano) | 70 |
| Piernas (2 × dos tramos de 4–5 lados) | 56 |
| Zapatos (2) | 40 |
| Accesorio de clase | 20–60 |
| **Total típico** | **350–550** (tope 700) |

- Las formas especiales pueden llegar a 1.200 (AllBlack son tres cuerpos que comparten geometría).
- 20 héroes son unos 10.000 triángulos: los triángulos no son el problema. Lo que cuenta son las llamadas de dibujo y las sombras (apartado 10).

**Cómo se construye:** geometría propia con `BufferGeometry`. Torso, mangas, piernas y faldas son «tubos» de anillos de 4–6 vértices con radios distintos; la cabeza es un huevo de 8 lados con la cara algo aplanada; el pelo son bloques sueltos. Todo el héroe es **una sola malla** con un esqueleto de unos 13 huesos y *skinning* rígido (cada vértice sigue a un solo hueso, como en PS1): una llamada de dibujo por héroe, y las articulaciones se esconden bajo la ropa holgada.

### 4. Texturas pintadas

Un atlas de **256 × 256** por héroe, dibujado con la API 2D de canvas al crear la figura. Filtro «vecino más cercano», sin *mipmaps*: el píxel se ve, como en las referencias 3 y 4. En la muestra se compara con una versión suavizada.

| Zona del atlas | Tamaño | Contenido |
| --- | --- | --- |
| Caras | 8 celdas de 64 × 64 | neutra, parpadeo, sonrisa, seria, dolor, sorpresa y dos libres |
| Prenda de arriba | 96 × 64 | frente y espalda |
| Mangas | 32 × 64 | |
| Piernas | 32 × 64 | piel, medias, calcetines o pantalón |
| Pelo | 64 × 64 | |
| Zapatos y accesorio | 32 × 32 cada uno | |

La expresión y el parpadeo se cambian moviendo las coordenadas de la cara a otra celda, sin repintar.

**Cara** (lo más delicado; ver riesgos):

- Ojos grandes: forma (redonda, almendrada, caída, rasgada o entrecerrada), iris en dos tonos, pupila, uno o dos brillos blancos y pestaña superior gruesa.
- Ceja corta, boca mínima (línea, sonrisa, abierta, puchero o colmillo) y rubor en dos óvalos rosados al 35%.
- Sin nariz, o un punto.
- Extras según el héroe: pecas, lunar, cicatriz, ojeras, gafas, colmillos o venda.
- En la muestra se enseñan **tres variantes** para elegir:
  - **A, «anime»:** iris grande en dos tonos con brillo, como las referencias 3 y 4.
  - **B, «sencilla»:** ojos oscuros ovalados con un brillo. Aguanta mejor la baja resolución.
  - **C, «de trazo»:** ojos y bocas de línea gruesa, muy expresivos, como en las referencias 1 y 2.

**Pelo:**

- El volumen lo dan los bloques; la textura pone el color base, los mechones (cuñas más oscuras) y una banda de brillo.
- El flequillo son 3–5 cuñas de geometría sobre la frente, con el borde en zigzag.
- 14 peinados de partida: corto, bob, melena, largo liso, coleta, dos coletas, trenza, moño, pincho, flequillo lateral que tapa un ojo, rapado, rizado en bloques, tupé y recogido bajo.

**Ropa:**

- Relleno plano, un degradado de sombra en la parte baja (luz pintada) y pliegues como líneas de un píxel más oscuras.
- Estampados: liso, rayas, cuadros, rombos o ribete.
- Detalles: cuello, botones, cremallera, bolsillo, lazo, cinturón, parches y el emblema o el color del gremio.
- Las piernas se pintan por bandas (piel, calcetín, media), como los calcetines naranjas de la referencia 4.

### 5. Luz y materiales

- **Material:** `MeshToonMaterial` con la textura y una rampa de **dos tonos**. La sombra no baja del 62% para que el dibujo se siga leyendo. Sin brillos especulares.
- **Contorno:** las referencias 3 y 4 no lo tienen; las 1 y 2, uno fino. En la muestra se enseña con y sin contorno fino marrón oscuro (no negro).
- **Luces:**
  - Hemisférica fría y tenue para el ambiente.
  - Un **sol de ventana** cálido en diagonal, la única luz con sombras (mapa de 2048).
  - En la sala común, el fuego de la chimenea como luz puntual sin sombras.
- **Rayas de persiana:** en la muestra se prueban dos técnicas y se elige la que dé rayas limpias a 60 fotogramas por segundo:
  - lamas reales delante de la ventana que proyectan su sombra;
  - un foco con una plantilla de rayas pintada en canvas.
- **Escenario:** la geometría fija de cada sala se une en una o dos mallas con un atlas pintado por código (baldosas, zócalo, madera, libros, corcho, ventanas).
- Sin posprocesado. Se mantiene el filtro CSS de saturación actual sobre el lienzo, que ya da el tono apagado.

### 6. Cámara

| Plano | Cámara | Uso |
| --- | --- | --- |
| **Sede** | Perspectiva de 30°, unos 38° de picado y girada 32°. Sigue al maestro con suavidad y encuadra una sala y un poco más: los héroes ocupan cerca del 20% del alto. Las paredes del lado de la cámara se cortan bajas. | Juego normal |
| **Maqueta** | La misma cámara, alejada hasta ver toda la sede | Sola durante 2–3 segundos al mejorar una instalación, para ver crecer la sala; también con la rueda del ratón |
| **Escena** | Perspectiva de 35° a 1,35 de altura y a 2,2–2,8 del héroe, que queda de rodillas para arriba y algo descentrado. El hombro del maestro, de espaldas, en primer plano | Momentos de historia y asuntos sociales |
| **Retrato** | Perspectiva de 20°, cabeza y hombros, girada 15°, con luz fija | Cartas y listas |

Se mantiene la disposición del juego: el recuadro de la sede sigue en el centro, con los menús a los lados. El maestro (el jugador) pasa de cápsula a figura low poly, siempre vista de espaldas en las escenas: abrigo largo oliva y bufanda naranja.

### 7. Interfaz

No se añaden botones ni sistemas. Cambia la presentación de lo que ya existe.

- **Nombres flotantes:** etiquetas HTML sobre cada héroe, proyectadas desde la escena. Texto blanco pequeño con borde oscuro y el rango al lado («Lumia · C»), sin caja. Con muchos héroes, los lejanos se atenúan y se resalta el más cercano al maestro.
- **Escenas** (sustituyen a la ventana modal actual de los momentos y a las tarjetas de «Asuntos pendientes»):
  - **Arriba a la derecha:** el título del momento sobre barra naranja.
  - **Arriba a la izquierda:** el lugar («Sede · Sala común») con borde cian.
  - **Junto al héroe:** el bocadillo, una caja oscura translúcida con línea fina y el texto del momento. Con dos héroes, cada uno puede tener el suyo.
  - **Abajo, en el centro:** las opciones, botones grises translúcidos **inclinados y apilados**, con el coste o el efecto en cian a la derecha («−300 oro»). Se eligen con clic, con 1, 2 y 3 o con flechas e Intro.
  - Las opciones son exactamente las que da el motor (`momentoPendiente`, `pendientes`), con sus bloqueos y su opción por defecto.
- **Asuntos sociales:**
  - El héroe con un asunto espera en la sede con una marca «!» sobre la cabeza.
  - La escena se abre al acercarse y pulsar E, al tocar el objetivo del momento o al tocar el asunto en la pestaña Relaciones, que queda como índice.
  - El aviso de «si no decides en N días…» se conserva dentro de la escena.
- **Paneles laterales, «Finalizar día» y objetivo del momento:** misma disposición y mismo funcionamiento. Solo cambian los retratos y pequeños ajustes de estilo para que todo combine.
- Se respeta «reducir movimiento»: sin transiciones de cámara ni texto que se escribe solo.

### 8. Cómo se genera cada héroe

`aspectoDe(heroe)` es una función pura: lee los datos del héroe y `src/datos/aspecto.json`, y devuelve un objeto plano con colores, medidas, peinado, prendas, accesorio, expresión y forma especial. No usa Three.js ni el navegador y tiene tests (mismo héroe → mismo aspecto; los 80 son distintos). Las variaciones salen de una semilla propia calculada con el id del catálogo y el nombre, mediante un `Azar` aparte que no toca el de la partida (igual que los retratos actuales).

Orden de decisión; cada paso puede corregir al anterior:

1. **Clase:** silueta, prenda y accesorio.

   | Clase | Silueta | Prenda | Accesorio |
   | --- | --- | --- | --- |
   | Guerrero | Hombros anchos, botas grandes | Chaqueta corta con peto u hombrera y guantes grandes | Espada, hacha, maza o escudo a la espalda |
   | Mago | Triángulo: mangas enormes y faldón largo | Abrigo o túnica larga, con capucha o sombrero | Bastón, libro u orbe |
   | Explorador | Ligera, con las piernas a la vista | Capa corta o poncho con capucha, pantalón corto y mochila | Arco, catalejo, cuerda o daga |
   | Sanador | Campana | Bata o delantal claro y bolsa en bandolera | Frasco, botiquín, cofia o cinta |

2. **Género:** proporciones de hombros y cadera, y qué prendas y peinados son más probables.
3. **Rasgos:** expresión, postura y un detalle.

   | Rasgo | Cara | Postura y detalle |
   | --- | --- | --- |
   | Orgulloso | Cejas inclinadas, ojos rasgados | Barbilla alta, cuello subido |
   | Ambicioso | Media sonrisa | Un detalle dorado |
   | Celoso | Ojos afilados | Brazos pegados al cuerpo |
   | Leal | Mirada franca | Emblema del gremio grande |
   | Tímido | Rubor fuerte, mirada baja | Hombros hacia dentro, flequillo que tapa un ojo |
   | Sociable | Sonrisa abierta | Gestos amplios, colores algo más vivos |
   | Paciente | Ojos entrecerrados | Movimientos lentos |
   | Competitivo | Ceño fruncido | Cinta en la frente o vendas en las manos |
   | Amable | Ojos redondos | Lazo o flor |
   | Reservado | Párpados caídos | Bufanda o capucha que tapa la boca, paleta oscura |

4. **Semilla (id y nombre):** peinado, colores dentro de la paleta, altura, complexión, estampado y extras de la cara.
5. **Ajustes a mano por héroe** (`aspecto.json → heroes`): lo que el nombre o el concepto piden. Ejemplos de partida, propuestos por Claude y pendientes de revisión:
   - HalfGoblin: piel verde, orejas puntiagudas y un colmillo.
   - Nevada: pelo blanco y azules fríos.
   - Don Hueso: cara de calavera pintada.
   - Vampire: piel pálida y capa.
   - Tiburón: capucha con aleta.
   - Su Alteza: corona.
   - Segador: guadaña.
   - Farolillo: un farol rojo.
   - Chibi: muy bajita (es la única con cabeza grande, por su nombre).
   - Ñam: complexión ancha.
   - Ventri: un muñeco en el brazo.

   En la fase 2 los 80 tendrán su línea, y se enseñan todos juntos en una hoja de contacto para revisarlos.
6. **Estado de la partida:** zombie, lesionado (vendas), la bestia activa de Pacto y GodInsect.

Los héroes genéricos (sin catálogo) se generan igual, sin el paso 5.

**Formas especiales:**

| Héroe | Forma |
| --- | --- |
| AllBlack | Tres figuras iguales vestidas de negro de pies a cabeza, con capucha y máscara lisa en la que solo se ven los ojos. Van en formación y se mueven casi a la vez, con alturas algo distintas (las «tres voces»). Un solo nombre para los tres. |
| InsectLover | Chico delgado con red, frasco al cinto, diadema con antenas y un par de escarabajos que le rondan el hombro. |
| GodInsect | No humano: insecto bípedo alto (1,9), con caparazón en bloques, cuatro brazos finos, mandíbulas, ojos compuestos pintados y alas translúcidas. Verde y violeta iridiscentes con oro. |
| Blup | Gota gelatinosa translúcida con la cara pintada, sin extremidades (dos seudópodos para saludar). Avanza a saltitos, estirándose y aplastándose. |
| Gabardina | Gabardina beige hasta el suelo con el cuello subido y sombrero de ala. La cara queda en sombra, con dos ojos brillantes, y no se le ven las piernas. Cada día cambia un poco de altura y anchura bajo la gabardina (lee el día), como su poder. |
| Pacto | Invocadora con marcas rúnicas y grimorio. La sigue su bestia activa (la que diga su estado): Lobo de ceniza, Gólem de musgo o Grifo pálido, tres cuerpos sencillos de unos 250 triángulos, algo fantasmales. |
| Mascota | Criatura pequeña no humana (0,55), entre gato y zorro, con orejas grandes, cola en bloque y el pañuelo del gremio. Anda a cuatro patas; para saludar se sienta y levanta una pata. Como no va a misiones, siempre está en la sede. |
| Zombies | Modificador sobre cualquier figura: piel gris verdosa, ropa desaturada con rotos pintados, ojos en blanco con ojeras y costuras. Anda encorvado, con los brazos por delante. |

**Animaciones** (por código, sobre los huesos; el carácter cambia la amplitud y el ritmo):

| Animación | Qué hace |
| --- | --- |
| Respirar | El torso sube y baja, la cabeza se mece un poco y parpadea cada 3–6 segundos |
| Andar | Piernas y brazos alternos, con un pequeño rebote |
| Saludar | Brazo derecho arriba, dos vaivenes y sonrisa |
| Celebrar | Saltito con los dos brazos arriba y los ojos cerrados de alegría |
| Lesionado | Tumbado en la cama, con vendas y respiración lenta; cara de dolor |

Los que entrenan reutilizan estas (andar en el sitio y gestos de brazos). Si en la fase 3 se ve que hace falta una sexta animación, se propone antes de añadirla.

**Sustituir un héroe por un modelo a mano:** el resto del juego solo conoce esta interfaz:

```ts
interface FiguraHeroe {
  raiz: THREE.Object3D;          // lo que se añade a la escena
  altura: number;                // para colocar el nombre y encuadrar el retrato
  animar(nombre: 'respirar' | 'andar' | 'saludar' | 'celebrar' | 'lesionado'): void;
  expresion(nombre: string): void;
  actualizar(dt: number): void;
  liberar(): void;
}
```

`crearFigura(heroe)` devuelve la figura generada por código, salvo que `aspecto.json → modelos` apunte a un archivo de `public/modelos/` para ese héroe (por ejemplo `"H05": "lumia.glb"`). En ese caso carga el modelo, que debe traer animaciones con esos cinco nombres, y lo envuelve en la misma interfaz. Sede, escenas y retratos no cambian.

### 9. La sede que crece

`planoDeSede(gremio)` es otra función pura con tests: del nivel de la sede, de los ojeadores y de la zona de entrenamiento saca qué salas hay, con cuántas camas y con qué decoración. Las tablas viven en datos. No cambia ninguna regla: solo dibuja lo que el motor ya dice.

Plano con huecos fijos (provisional; se afina en la fase 3). Las salas no se mueven al crecer:

```
┌───────────┬───────────┬───────────┬───────────┐
│ Ojeadores │ Enfermería│ Dormit. 2 │ Dormit. 3 │
├───────────┼───────────┴───────────┼───────────┤
│ Entrenam. │      Sala común       │ Dormit. 1 │
└───────────┴───────────────────────┴───────────┘
                    puerta
```

Un hueco sin construir se ve como **solar** (andamio, cajas y un cartel). Así la sede enseña en qué se puede gastar el oro, que es el dilema central del juego.

**Sede** (niveles 1–7; plazas 5, 7, 9, 11, 13, 15 y 18). Una cama por plaza, hasta 6 por dormitorio:

| Nivel | Dormitorios (camas) | Sala común | Enfermería |
| --: | --- | --- | --- |
| 1 | 1 (5 catres) | Destartalada: grietas, un cubo bajo una gotera y muebles viejos | Un biombo con 2 catres en la sala común |
| 2 | 2 (4 + 3) | Arreglada: sin goteras y con alfombra | Igual |
| 3 | 2 (5 + 4) | Estandarte del gremio | Sala propia con 4 camas |
| 4 | 2 (6 + 5) | Igual | Igual |
| 5 | 3 (5 + 4 + 4) | Próspera: lámparas y vitrina de trofeos | Igual |
| 6 | 3 (5 + 5 + 5) | Igual | Igual |
| 7 | 3 (6 + 6 + 6) | De leyenda: vidriera y estandarte con la categoría | Igual |

La manta de cada cama lleva el color de su héroe. La cama de quien está de misión se ve hecha y vacía.

**Zona de entrenamiento** (niveles 0–3; un puesto por nivel, como las plazas):

| Nivel | Qué se ve |
| --: | --- |
| 0 | Solar |
| 1 | Patio con un muñeco de paja y una diana |
| 2 | Dos puestos, pesas y barra |
| 3 | Tres puestos, tatami, armero y marcador |

**Ojeadores** (niveles 0–3):

| Nivel | Qué se ve |
| --: | --- |
| 0 | Solar |
| 1 | Una mesa con mapas, un catalejo y un ojeador (figurante sin nombre) |
| 2 | Tablero de corcho con fichas e hilos, y un archivador |
| 3 | Mapa mural del reino con chinchetas, telescopio grande y palomar |

**Puntos de interacción:** los seis de ahora, colocados en su sala (tablón, mostrador, recepción y pizarra en la sala común; dormitorios en la puerta del dormitorio 1; puerta de la sede). No se añade ninguno.

**Héroes en la sede** (solo lectura del estado):

| Estado | Dónde está y qué hace |
| --- | --- |
| Libre | Pasea entre salas y se para. El destino depende del carácter: el sociable busca gente en la sala común, el reservado un rincón y el competitivo el patio. Se acerca a sus amigos o a su pareja y evita a quien le cae mal. Saluda si el maestro pasa cerca. |
| Descansando | En su cama o junto a la chimenea |
| Lesionado | Tumbado en la enfermería; si no hay sitio, en su propia cama |
| Entrenando | En un puesto de la zona de entrenamiento |
| De misión o en Ascensión | No aparece |

- Quien volvió hoy de una misión cumplida celebra al empezar el día.
- El movimiento sigue un grafo sencillo de puntos de paso y puertas definido en datos, sin física.

### 10. Rendimiento

Objetivo: **60 fotogramas por segundo en un portátil normal con 20 héroes en pantalla**.

- Una llamada de dibujo por héroe (más otra en el mapa de sombras) y una o dos por sala: menos de 120 en total.
- Una sola luz con sombras; mapa de 2048.
- Atlas de 256 × 256: se crean solo para los héroes presentes y se liberan cuando se van.
- Los retratos se renderizan una vez por héroe y se guardan como imagen.
- Sin posprocesado; densidad de píxeles limitada a 2.
- En cada fase se mide con Playwright (tiempo por fotograma con 20 figuras) y se anota en la bitácora.

### 11. Organización del código

```
src/datos/aspecto.json    paleta, proporciones, reglas por clase y rasgo, ajustes por héroe,
                          salas por nivel, luz, cámara y modelos a mano
src/escena3d/
  aspecto.ts              catálogo → aspecto (puro, con tests)
  texturas/               pintores de canvas: cara, pelo, ropa, escenario
  figura/                 geometría, esqueleto, animaciones y formas especiales
  fabrica.ts              crearFigura(heroe) → FiguraHeroe; aquí se enchufan los modelos a mano
  sede/                   plano (puro, con tests), salas, vida de los héroes, cámara y luz
  escenas.ts              director de las escenas de diálogo
  retratos.ts             render de caras a imagen, con caché
  sede.ts                 punto de entrada (se mantiene iniciarSede)
src/ui/
  escena.ts               bocadillo, opciones y nombres flotantes
  retrato.ts              pasa a pedir el retrato 3D
```

`src/motor/` no se toca. Si `aspecto.json` crece demasiado, se parte en `aspecto.json` (personajes) y `sede-visual.json` (salas).

### 12. Plan por fases

| Fase | Qué se hace | Se entrega |
| --- | --- | --- |
| **0. Dirección de arte** | Este documento | Visto bueno del propietario |
| **1. Muestra** | Una página aparte (`muestra.html`), sin tocar el juego: una sala con la luz de persiana, HalfGoblin, Lumia y AllBlack con nombre flotante, y la escena «Media sangre» de HalfGoblin con bocadillo y opciones. Variantes: tres caras, con y sin contorno, píxel o suavizado. | Capturas, comparación sincera con las referencias, medida de rendimiento con 20 figuras. **Se espera el visto bueno.** |
| **2. Los 80 héroes** | `aspecto.json` completo, los 14 peinados, las cuatro clases, las formas especiales, las cinco animaciones y los tests de `aspectoDe` | Hoja de contacto con los 80 y capturas de las formas especiales |
| **3. La sede que crece** | Salas por nivel, solares, héroes viviendo en la sede, cámara que sigue al maestro y plano de maqueta | Capturas de la sede en tres momentos (inicio, media partida y al máximo) |
| **4. Interfaz y escenas** | Momentos de historia y asuntos sociales como escenas, nombres flotantes y ajuste de estilo de los paneles | Capturas de una escena de cada tipo y de la pantalla principal |
| **5. Retratos** | Render de caras en cartas, listas, formación, regreso de misiones y Ascensión. Se retira el SVG y se actualiza su test. | Capturas de los paneles con los retratos nuevos |

Al cerrar cada fase: `npm run typecheck`, `npm test`, `npm run build`, Playwright sin errores de consola, capturas y entrada en `docs/bitacora.md`. Si el contexto del chat se queda corto, una fase por conversación: este documento y la bitácora bastan para retomar.

### 13. Riesgos, dichos con claridad

- **La cara es el riesgo principal.** Unos ojos dibujados por código quedan limpios y coherentes, pero más fríos que los pintados a mano de las referencias 3 y 4. Por eso la muestra trae tres variantes. Si ninguna convence, la salida es dibujar a mano solo las texturas de las caras (unas pocas plantillas de ojos y bocas que el código recolorea).
- **80 héroes distintos, pero con aire de familia.** Lo esperable: unos 20 inconfundibles (las formas especiales y los que tienen ajustes fuertes) y el resto variados, aunque hechos con las mismas piezas. La hoja de contacto de la fase 2 sirve para decidir a quién darle más ajustes.
- **Las rayas de persiana** dependen de la resolución de las sombras. Si no quedan limpias con ninguna de las dos técnicas, se pintan como luz sobre el suelo y la pared, y entonces no caen sobre los personajes.
- **El recuadro central es pequeño para una escena.** Si el bocadillo y las opciones quedan apretados, se propondrá que el recuadro crezca mientras dura la escena.
- **No se parecerá a las referencias 1 y 2 en el dibujo de los personajes:** esas usan ilustraciones planas tipo recortable. Aquí los personajes son 3D como en las 3 y 4. Lo que sí se busca de las 1 y 2 es la luz, el encuadre y la interfaz.

### 14. Decisiones que necesito del propietario

Con mi recomendación; también en `docs/preguntas.md` (pregunta 24).

1. **Cámara de la sede:** cercana, siguiendo al maestro, con plano de maqueta al mejorar (recomendada; es la de las referencias). La alternativa es una maqueta fija con toda la sede a la vista y héroes más pequeños.
2. **Salas sin construir como solares** y **enfermería** como sala que llega con la sede en el nivel 3. Son solo visuales y no cambian reglas. ¿De acuerdo?
3. **Asuntos sociales:** el héroe espera con una «!» y la escena se abre desde él, desde el objetivo del momento o desde la pestaña Relaciones. ¿O prefieres que salten solos, como los momentos de historia?
4. **El maestro:** figura de espaldas con abrigo oliva y bufanda naranja, sin cara. ¿Te vale?
5. **Héroes cuyo aspecto no se deduce de los datos:** ¿Bolita es una persona o una criatura? ¿Algún otro héroe debe tener forma especial además de los siete de la lista (por ejemplo Don Hueso como esqueleto, o Chibi diminuta)?
6. **Fuentes:** el juego ya carga Rajdhani y Noto Sans desde Google Fonts, que es un recurso externo. ¿Se mantiene, o paso a fuentes del sistema?

Contorno, píxel o suavizado, y variante de cara se deciden viendo la muestra.
