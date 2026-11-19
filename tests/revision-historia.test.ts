// Revisión del guion (docs/guia-narrativa.md): que el contenido escrito en el panel de tramas no rompa el juego
// y que las ramas no se salgan de control (presupuesto de opciones y palabras, marcas que nadie pone).
import { describe, expect, it } from 'vitest';
import datos from '../src/datos/historia.json';
import { CATALOGO } from '../src/motor/heroes';
import { MOMENTOS, PERSONAJES, TRAMAS, type Condicion } from '../src/motor/historia';

const EPILOGOS = datos.epilogos as { heroe: string; si: Condicion; texto: string }[];
const heroes = new Set(CATALOGO.map((f) => f.id));
const personajes = new Set(PERSONAJES.map((p) => p.id));
const palabras = (t: string): number => t.trim().split(/\s+/).length;

/** Marcas que lee una condición. */
function leidas(si: Condicion): string[] {
  return [si.marca, si.sinMarca, ...(si.marcas ?? []), ...(si.algunaMarca ?? []), ...(si.sinMarcas ?? [])].filter((x): x is string => !!x);
}

describe('revisión del guion', () => {
  it('ids únicos y cada momento en una trama que existe', () => {
    expect(new Set(MOMENTOS.map((m) => m.id)).size).toBe(MOMENTOS.length);
    expect(new Set(TRAMAS.map((t) => t.id)).size).toBe(TRAMAS.length);
    const tramas = new Set(TRAMAS.map((t) => t.id));
    for (const m of MOMENTOS) expect(tramas.has(m.trama ?? ''), `${m.id}: trama «${m.trama}»`).toBe(true);
  });

  it('cada héroe y personaje citado existe', () => {
    for (const m of MOMENTOS) {
      for (const id of [m.heroe, m.cara]) if (id) expect(heroes.has(id), `${m.id}: ${id}`).toBe(true);
      if (m.personaje) expect(personajes.has(m.personaje), `${m.id}: ${m.personaje}`).toBe(true);
      for (const o of m.opciones) for (const e of o.efectos) if (e.heroe) expect(heroes.has(e.heroe), `${m.id}: ${e.heroe}`).toBe(true);
    }
    for (const t of TRAMAS) for (const id of t.reparto ?? []) expect(heroes.has(id) || personajes.has(id), `${t.id}: ${id}`).toBe(true);
    for (const e of EPILOGOS) expect(heroes.has(e.heroe), `epílogo de ${e.heroe}`).toBe(true);
  });

  it('presupuesto: de 1 a 3 opciones y textos cortos (escenas ≤ 90 palabras, opciones ≤ 12)', () => {
    for (const m of MOMENTOS) {
      expect(m.opciones.length, m.id).toBeGreaterThanOrEqual(1);
      expect(m.opciones.length, m.id).toBeLessThanOrEqual(3);
      expect(palabras(m.texto), m.id).toBeLessThanOrEqual(90);
      for (const o of m.opciones) expect(palabras(o.texto), `${m.id}: ${o.texto}`).toBeLessThanOrEqual(12);
    }
  });

  it('toda marca que se lee la pone alguna decisión (si no, ese momento nunca llegaría)', () => {
    const puestas = new Set(MOMENTOS.flatMap((m) => m.opciones.flatMap((o) => o.efectos.map((e) => e.marca).filter((x): x is string => !!x))));
    for (const m of MOMENTOS) for (const x of leidas(m.si)) expect(puestas.has(x), `${m.id} lee «${x}»`).toBe(true);
    for (const e of EPILOGOS) for (const x of leidas(e.si)) expect(puestas.has(x), `epílogo de ${e.heroe} lee «${x}»`).toBe(true);
  });
});
