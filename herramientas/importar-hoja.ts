// Importa la hoja «Héroes» del propietario (exportada como CSV) al catálogo src/datos/heroes.json.
// La hoja es la fuente de verdad de los héroes: nombre, techo, poder, género, clase, gremio y textos.
// Lo que solo existe en el juego (id de habilidad, rasgos, índices de romance) se conserva.
//
// Uso: Archivo → Descargar → CSV de la pestaña «Héroes», y luego:
//   npx tsx herramientas/importar-hoja.ts ruta/Heroes.csv           (muestra los cambios sin escribir)
//   npx tsx herramientas/importar-hoja.ts ruta/Heroes.csv --escribir (los guarda)

import { readFileSync, writeFileSync } from 'node:fs';

const RUTA_CATALOGO = 'src/datos/heroes.json';

/** CSV con comillas (los textos de habilidad llevan comas). */
export function leerCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') entreComillas = false;
      else campo += c;
    } else if (c === '"') entreComillas = true;
    else if (c === ',') {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo);
      if (fila.some((x) => x.trim())) filas.push(fila);
      fila = [];
      campo = '';
    } else campo += c;
  }
  fila.push(campo);
  if (fila.some((x) => x.trim())) filas.push(fila);
  return filas;
}

const GREMIO: [RegExp, string][] = [
  [/prota/i, 'jugador'],
  [/gran rival/i, 'dragon'],
  [/rival 2/i, 'sombras'],
  [/rival 3/i, 'corona'],
  [/rival 4/i, 'esperanza'],
  [/libre/i, 'libre'],
];
const RANGOS = ['F', 'E', 'D', 'C', 'C+', 'B', 'B+', 'A', 'A+', 'S'];

function rango(texto: string, porDefecto: string): string {
  const r = texto.trim().split(/\s/)[0] ?? '';
  return RANGOS.includes(r) ? r : porDefecto;
}

interface Ficha {
  id: string;
  [clave: string]: unknown;
}

function principal(): void {
  const [ruta, opcion] = process.argv.slice(2);
  if (!ruta) {
    console.log('Uso: npx tsx herramientas/importar-hoja.ts Heroes.csv [--escribir]');
    process.exit(1);
  }
  const filas = leerCsv(readFileSync(ruta, 'utf8'));
  const cabecera = (filas.shift() ?? []).map((c) => c.trim().toLowerCase());
  const col = (nombre: string): number => cabecera.findIndex((c) => c.startsWith(nombre));
  const catalogo = JSON.parse(readFileSync(RUTA_CATALOGO, 'utf8')) as { heroes: Ficha[] };
  const cambios: string[] = [];
  for (const f of filas) {
    const v = (nombre: string): string => (f[col(nombre)] ?? '').trim();
    const id = v('id');
    if (!/^H\d+$/.test(id)) continue;
    let h = catalogo.heroes.find((x) => x.id === id);
    if (!h) {
      h = { id, habilidad: `pendiente${id}`, rasgos: [], enamoradizo: 3, atractivo: 3 };
      catalogo.heroes.push(h);
      cambios.push(`${id}: héroe nuevo (su habilidad hay que programarla: queda sin efecto)`);
    }
    const [nombreHab, ...resto] = v('habilidad').split(':');
    const nuevo: Record<string, unknown> = {
      nombre: v('nombre'),
      techo: rango(v('techo base'), String(h.techo ?? 'C')),
      techoFinal: rango(v('techo final'), String(h.techoFinal ?? h.techo ?? 'C')),
      rangoInicial: rango(v('rango inicial'), String(h.rangoInicial ?? 'F')),
      poder: Number(v('poder')) || h.poder,
      genero: v('género') || v('genero') || h.genero,
      clase: v('clase') || h.clase,
      gremio: GREMIO.find(([re]) => re.test(v('gremio')))?.[1] ?? h.gremio,
      ...(resto.length ? { nombreHabilidad: nombreHab!.trim(), texto: resto.join(':').trim() } : {}),
      ...(v('ascensión') && v('ascensión') !== '—' ? { ascension: v('ascensión') } : {}),
    };
    for (const [k, valor] of Object.entries(nuevo)) {
      if (valor === undefined || valor === '' || JSON.stringify(h[k]) === JSON.stringify(valor)) continue;
      cambios.push(`${id} ${String(nuevo.nombre)}: ${k} ${JSON.stringify(h[k])} → ${JSON.stringify(valor)}`);
      h[k] = valor;
    }
  }
  console.log(cambios.length ? cambios.join('\n') : 'Sin cambios: el catálogo ya coincide con la hoja.');
  if (opcion === '--escribir' && cambios.length) {
    writeFileSync(RUTA_CATALOGO, `${JSON.stringify(catalogo, null, 1)}\n`);
    console.log(`\nGuardado en ${RUTA_CATALOGO}. Ejecuta los tests y el simulador.`);
  }
}

if (process.argv[1]?.includes('importar-hoja')) principal();
