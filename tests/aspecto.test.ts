import { describe, expect, it } from 'vitest';
import catalogo from '../src/datos/heroes.json';
import { aspectoDe, aspectoMaestro, type DatosHeroe } from '../src/escena3d/aspecto';

const deCatalogo = (id: string): DatosHeroe => {
  const h = catalogo.heroes.find((x) => x.id === id)!;
  return { id: h.id, catalogo: h.id, nombre: h.nombre, clase: h.clase, genero: h.genero, rasgos: h.rasgos, gremio: h.gremio };
};

describe('aspecto de los héroes', () => {
  it('el mismo héroe da siempre el mismo aspecto', () => {
    expect(aspectoDe(deCatalogo('H13'))).toEqual(aspectoDe(deCatalogo('H13')));
  });

  it('los ajustes a mano mandan: HalfGoblin es verde y con orejas puntiagudas; AllBlack son tres', () => {
    const goblin = aspectoDe(deCatalogo('H07'));
    expect(goblin.piel).toBe('#9fb37a');
    expect(goblin.orejas).toBe('puntiagudas');
    expect(goblin.cara.extras).toContain('colmillo');
    expect(aspectoDe(deCatalogo('H02')).forma).toBe('trio');
  });

  it('la clase decide la prenda y el acento; el carácter, la cara', () => {
    const lumia = aspectoDe(deCatalogo('H05'));
    expect(lumia.prenda.tipo).toBe('tunica');
    expect(lumia.acento).toBe('#7d62c4');
    expect(lumia.cara.ojo).toBe('rasgado'); // orgullosa
    expect(lumia.cara.cejas).toBe('inclinadas');
  });

  it('un zombie cambia de piel sin perder el resto', () => {
    const vivo = aspectoDe(deCatalogo('H13'));
    const zombie = aspectoDe({ ...deCatalogo('H13'), zombie: true });
    expect(zombie.piel).not.toBe(vivo.piel);
    expect(zombie.pelo).toBe(vivo.pelo);
  });

  it('los 80 del catálogo tienen aspecto y la mayoría difiere ya solo con las reglas (fase 1)', () => {
    const vistos = new Set(catalogo.heroes.map((h) => JSON.stringify(aspectoDe(deCatalogo(h.id)))));
    expect(vistos.size).toBeGreaterThan(75);
  });

  it('el maestro no tiene cara', () => {
    expect(aspectoMaestro().cara.tipo).toBe('lisa');
  });
});
