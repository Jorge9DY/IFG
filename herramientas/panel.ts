// Puente entre el panel de tramas (un artefacto con base de datos, ver docs/guia-narrativa.md) y el juego.
//
// El panel guarda cuatro colecciones: heroes, personajes, tramas y nodos (momentos, dilemas, eventos y
// epílogos). Este script convierte en los dos sentidos:
//
//   npx tsx herramientas/panel.ts exportar salida.json             repo → panel (para sembrar el panel)
//   npx tsx herramientas/panel.ts importar entrada.json            panel → repo (muestra el resumen)
//   npx tsx herramientas/panel.ts importar entrada.json --escribir (escribe heroes.json e historia.json)
//
// Después de importar: npm run typecheck, npm test, npm run build (tests/revision-historia.test.ts revisa el guion).

import { readFileSync, writeFileSync } from 'node:fs';

const RUTA_HEROES = 'src/datos/heroes.json';
const RUTA_HISTORIA = 'src/datos/historia.json';

type Obj = Record<string, unknown>;

/** Lo que guarda el panel. Cada documento lleva su id. */
export interface DatosPanel {
  heroes: Obj[];
  personajes: Obj[];
  tramas: Obj[];
  nodos: Obj[];
}

/** Campos de un héroe que viajan entre el panel y heroes.json, en el orden del archivo. */
const CAMPOS_HEROE = ['id', 'nombre', 'clase', 'genero', 'gremio', 'techo', 'techoFinal', 'rangoInicial', 'poder', 'habilidad', 'nombreHabilidad', 'texto', 'ascension', 'rasgos', 'enamoradizo', 'atractivo', 'provisional'];
const NUMEROS_HEROE = ['poder', 'enamoradizo', 'atractivo'];
const CLASES = ['Guerrero', 'Mago', 'Explorador', 'Sanador'];
const LETRAS = /^(F|E|D|C|C\+|B|B\+|A|A\+|S)$/;

/** Quita campos vacíos ('' , null, undefined, [] y {}) para que el JSON quede limpio. */
function limpio<T extends Obj>(o: T): T {
  const r: Obj = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as Obj).length === 0) continue;
    r[k] = v;
  }
  return r as T;
}

const porOrden = (a: Obj, b: Obj): number => Number(a.orden ?? 0) - Number(b.orden ?? 0) || String(a.id).localeCompare(String(b.id));

/** Repo → panel. */
export function aPanel(heroesJson: { heroes: Obj[] }, historia: Obj): DatosPanel {
  const momentos = (historia.momentos ?? []) as Obj[];
  const epilogos = (historia.epilogos ?? []) as Obj[];
  const nodos: Obj[] = momentos.map((m, i) => {
    const opciones = ((m.opciones ?? []) as Obj[]).map((o) => {
      const efectos = (o.efectos ?? []) as Obj[];
      const marca = efectos.find((e) => e.marca)?.marca;
      return limpio({ texto: o.texto, marca, efectos: efectos.filter((e) => !e.marca) });
    });
    return limpio({ ...m, tipo: m.tipo ?? 'momento', estado: 'borrador', orden: (i + 1) * 10, opciones });
  });
  const vistos = new Map<string, number>();
  epilogos.forEach((e, i) => {
    const n = (vistos.get(String(e.heroe)) ?? 0) + 1;
    vistos.set(String(e.heroe), n);
    const trama = (historia.tramas as Obj[] | undefined)?.find((t) => (t.reparto as string[] | undefined)?.includes(String(e.heroe)))?.id;
    nodos.push(limpio({ id: `ep-${String(e.heroe)}-${n}`, trama, tipo: 'epilogo', estado: 'borrador', orden: 10_000 + i * 10, heroe: e.heroe, si: e.si, texto: e.texto }));
  });
  return {
    heroes: heroesJson.heroes.map((h) => ({ ...h })),
    personajes: ((historia.personajes ?? []) as Obj[]).map((p) => ({ ...p })),
    tramas: ((historia.tramas ?? []) as Obj[]).map((t, i) => ({ ...t, orden: (i + 1) * 10 })),
    nodos,
  };
}

/** Panel → repo. Devuelve los dos archivos nuevos y los problemas encontrados (si hay, no se escribe nada). */
export function desdePanel(panel: DatosPanel, heroesJson: Obj, historiaAnterior: Obj): { heroes: Obj; historia: Obj; problemas: string[] } {
  const problemas: string[] = [];
  const ids = new Set<string>();
  const heroes = [...panel.heroes].sort((a, b) => String(a.id).localeCompare(String(b.id), 'es', { numeric: true })).map((original) => {
    // Un héroe nuevo creado en el panel llega sin habilidad: queda «por diseñar» hasta que se programe.
    const h: Obj = { habilidad: '', nombreHabilidad: 'Por diseñar', texto: 'Habilidad por diseñar.', ...original };
    const r: Obj = {};
    for (const k of CAMPOS_HEROE) {
      const v = h[k];
      if (v === undefined || v === null || v === false || (v === '' && k !== 'habilidad')) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      r[k] = NUMEROS_HEROE.includes(k) ? Number(v) : v;
    }
    const id = String(r.id ?? '');
    if (!/^[A-Za-z0-9_-]+$/.test(id) || ids.has(id)) problemas.push(`Héroe con id vacío o repetido: «${id}»`);
    ids.add(id);
    if (!String(r.nombre ?? '').trim()) problemas.push(`${id}: sin nombre`);
    if (!CLASES.includes(String(r.clase))) problemas.push(`${id}: clase «${String(r.clase)}» no existe`);
    if (!['Hombre', 'Mujer'].includes(String(r.genero))) problemas.push(`${id}: género «${String(r.genero)}»`);
    for (const k of ['techo', 'techoFinal', 'rangoInicial']) if (!LETRAS.test(String(r[k]))) problemas.push(`${id}: ${k} «${String(r[k])}» no es un rango`);
    const poder = Number(r.poder);
    if (!Number.isInteger(poder) || poder < 1 || poder > 100) problemas.push(`${id}: poder ${String(r.poder)} fuera de 1–100`);
    return r;
  });

  const personajes = panel.personajes.map((p) => limpio({ id: p.id, nombre: p.nombre, papel: p.papel, descripcion: p.descripcion }));
  const tramas = [...panel.tramas].sort(porOrden).map((t) => limpio({ id: t.id, nombre: t.nombre, premisa: t.premisa, reparto: t.reparto }));
  const enJuego = [...panel.nodos].filter((n) => n.estado !== 'idea').sort(porOrden);
  const momentos = enJuego
    .filter((n) => n.tipo !== 'epilogo')
    .map((n) => {
      const opciones = ((n.opciones ?? []) as Obj[]).map((o) => ({
        texto: String(o.texto ?? '').trim(),
        efectos: [...((o.efectos ?? []) as Obj[]).map((e) => limpio(e)).filter((e) => Object.keys(e).length > (e.objetivo || e.heroe ? 1 : 0)), ...(o.marca ? [{ marca: o.marca }] : [])],
      }));
      if (!opciones.length) problemas.push(`${String(n.id)}: no tiene opciones (déjalo como «idea» hasta que las tenga)`);
      for (const o of opciones) if (!o.texto) problemas.push(`${String(n.id)}: hay una opción sin texto`);
      if (!String(n.texto ?? '').trim()) problemas.push(`${String(n.id)}: sin texto`);
      const quien = limpio({ id: n.id, trama: n.trama, tipo: n.tipo, heroe: n.heroe, personaje: n.personaje, cara: n.cara });
      return { ...quien, si: limpio((n.si ?? {}) as Obj), titulo: n.titulo, texto: n.texto, opciones };
    });
  const epilogos = enJuego.filter((n) => n.tipo === 'epilogo').map((n) => ({ heroe: n.heroe, si: limpio((n.si ?? {}) as Obj), texto: n.texto }));
  for (const e of epilogos) if (!e.heroe) problemas.push(`Hay un epílogo sin héroe: «${String(e.texto).slice(0, 40)}…»`);

  const historia = { _nota: historiaAnterior._nota, personajes, tramas, momentos, epilogos };
  return { heroes: { ...heroesJson, heroes }, historia, problemas };
}

function principal(): void {
  const [orden, ruta, opcion] = process.argv.slice(2);
  const heroesJson = JSON.parse(readFileSync(RUTA_HEROES, 'utf8')) as { heroes: Obj[] };
  const historia = JSON.parse(readFileSync(RUTA_HISTORIA, 'utf8')) as Obj;
  if (orden === 'exportar' && ruta) {
    writeFileSync(ruta, `${JSON.stringify(aPanel(heroesJson, historia), null, 1)}\n`);
    console.log(`Exportado a ${ruta}.`);
    return;
  }
  if (orden !== 'importar' || !ruta) {
    console.log('Uso: npx tsx herramientas/panel.ts exportar salida.json | importar entrada.json [--escribir]');
    process.exit(1);
  }
  const panel = JSON.parse(readFileSync(ruta, 'utf8')) as DatosPanel;
  const r = desdePanel(panel, heroesJson, historia);
  const nh = r.heroes.heroes as Obj[];
  const nm = r.historia.momentos as Obj[];
  console.log(`${nh.length} héroes, ${(r.historia.tramas as Obj[]).length} tramas, ${nm.length} momentos, ${(r.historia.epilogos as Obj[]).length} epílogos.`);
  for (const h of nh) {
    const antes = heroesJson.heroes.find((x) => x.id === h.id);
    if (!antes) console.log(`+ héroe nuevo ${String(h.id)} ${String(h.nombre)}`);
    else for (const k of CAMPOS_HEROE) if (JSON.stringify(antes[k] ?? '') !== JSON.stringify(h[k] ?? '')) console.log(`~ ${String(h.id)} ${k}: ${JSON.stringify(antes[k])} → ${JSON.stringify(h[k])}`);
  }
  if (r.problemas.length) {
    console.log(`\nNo se escribe nada. Problemas:\n- ${r.problemas.join('\n- ')}`);
    process.exit(1);
  }
  if (opcion === '--escribir') {
    writeFileSync(RUTA_HEROES, `${JSON.stringify(r.heroes, null, 1)}\n`);
    writeFileSync(RUTA_HISTORIA, `${JSON.stringify(r.historia, null, 1)}\n`);
    console.log(`\nGuardado en ${RUTA_HEROES} y ${RUTA_HISTORIA}. Ejecuta typecheck, tests y build.`);
  }
}

if (process.argv[1]?.includes('panel')) principal();
