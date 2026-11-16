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

*Pendiente: la escribe el chat del apartado gráfico.*
