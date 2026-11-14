import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import { Azar } from '../src/motor/azar';
import { jugador } from '../src/motor/estado';
import { vender } from '../src/motor/mercado';
import { resolverMision } from '../src/motor/misiones';
import {
  afinidad,
  cambiarAfinidad,
  compatibilidad,
  factorAnimo,
  nivelDe,
  perderCompanero,
  quimica,
  relacionesTrasMision,
  semanaRelaciones,
  vinculo,
} from '../src/motor/relaciones';
import type { Mision } from '../src/motor/tipos';
import { fichar, heroe, partida } from './fabrica';

const U = balance.relaciones.umbrales;

function mision(datos: Partial<Mision> = {}): Mision {
  return { id: 'm', rango: 'medio', tipo: 'Escolta', clases: [], titulo: 'Prueba', dificultad: 40, duracion: 2, recompensa: 1500, equipo: 2, ...datos };
}

describe('relaciones entre héroes', () => {
  it('la afinidad da el nivel de la relación', () => {
    expect(nivelDe(U.enemigos)).toBe('enemigos');
    expect(nivelDe(U.mala)).toBe('mala relación');
    expect(nivelDe(0)).toBe('neutral');
    expect(nivelDe(U.amigos)).toBe('amigos');
    expect(nivelDe(U.mejores)).toBe('mejores amigos');
  });

  it('la compatibilidad es fija para cada pareja, simétrica y entre −2 y 2', () => {
    const estado = partida();
    for (const [a, b] of [['x', 'y'], ['H01', 'H07'], ['p', 'q']] as const) {
      const c = compatibilidad(estado, a, b);
      expect(c).toBe(compatibilidad(estado, b, a));
      expect(Math.abs(c)).toBeLessThanOrEqual(2);
    }
  });

  it('cambiar la afinidad avisa cuando cambia el nivel, y la pareja exige amor de los dos', () => {
    const estado = partida();
    const a = fichar(estado, 'jugador', heroe({ id: 'a' }));
    const b = fichar(estado, 'jugador', heroe({ id: 'b' }));
    expect(cambiarAfinidad(estado, 'a', 'b', 10)).toBeNull();
    expect(cambiarAfinidad(estado, 'a', 'b', 20)).toMatch(/amigos/);
    expect(afinidad(estado, 'b', 'a')).toBe(30);
    a.amor = 'b';
    expect(vinculo(estado, 'a', 'b')).toBe('amigos');
    b.amor = 'a';
    expect(vinculo(estado, 'a', 'b')).toBe('pareja');
  });

  it('la química del equipo suma por cada pareja: los amigos rinden más y los enemigos menos', () => {
    const estado = partida();
    const a = fichar(estado, 'jugador', heroe({ id: 'a' }));
    const b = fichar(estado, 'jugador', heroe({ id: 'b' }));
    expect(quimica(estado, [a, b])).toBe(0);
    cambiarAfinidad(estado, 'a', 'b', U.mejores);
    expect(quimica(estado, [a, b])).toBe(balance.relaciones.quimica.mejores);
    cambiarAfinidad(estado, 'a', 'b', -200);
    expect(quimica(estado, [a, b])).toBe(balance.relaciones.quimica.enemigos);
    // A Sable no le afectan las relaciones.
    a.habilidad = 'sinTestigos';
    expect(quimica(estado, [a, b])).toBe(0);
  });

  it('las misiones juntos mueven la afinidad; Rima la acelera y Teo frena lo malo', () => {
    const estado = partida();
    const a = fichar(estado, 'jugador', heroe({ id: 'a' }));
    const b = fichar(estado, 'jugador', heroe({ id: 'b' }));
    const activa = (h: { habilidad?: string }) => h.habilidad ?? null;
    relacionesTrasMision(estado, [a, b], true, activa);
    const normal = afinidad(estado, 'a', 'b');
    estado.relaciones = {};
    a.habilidad = 'balada';
    relacionesTrasMision(estado, [a, b], true, activa);
    expect(afinidad(estado, 'a', 'b')).toBe(normal * 2);
    estado.relaciones = {};
    a.habilidad = 'mediador';
    for (let i = 0; i < 5; i++) relacionesTrasMision(estado, [a, b], false, activa);
    expect(afinidad(estado, 'a', 'b')).toBeGreaterThanOrEqual(0);
  });

  it('el ánimo multiplica el poder: hundido rinde menos y eufórico más', () => {
    expect(factorAnimo(heroe({ id: 'a', animo: 0 }))).toBeLessThan(1);
    expect(factorAnimo(heroe({ id: 'a', animo: 50 }))).toBe(1);
    expect(factorAnimo(heroe({ id: 'a', animo: 100 }))).toBeGreaterThan(1);
  });

  it('cada semana surgen amores entre quienes se llevan muy bien', () => {
    let amores = 0;
    for (let s = 1; s <= 40; s++) {
      const estado = partida(s);
      const a = fichar(estado, 'jugador', heroe({ id: 'a' }));
      fichar(estado, 'jugador', heroe({ id: 'b' }));
      cambiarAfinidad(estado, 'a', 'b', 90);
      semanaRelaciones(estado, 'jugador', new Azar(s));
      if (a.amor === 'b') amores++;
    }
    expect(amores).toBeGreaterThan(3);
    expect(amores).toBeLessThan(30);
  });

  it('con la lealtad a cero, el héroe se va; con el ánimo bajo, la lealtad cae', () => {
    const estado = partida();
    const a = fichar(estado, 'jugador', heroe({ id: 'a', animo: 0, lealtad: 3 }));
    const r = semanaRelaciones(estado, 'jugador', new Azar(1));
    expect(a.lealtad).toBe(0);
    expect(r.seVan).toContain('a');
  });

  it('perder a un compañero duele según lo que los unía', () => {
    const estado = partida();
    const a = fichar(estado, 'jugador', heroe({ id: 'a', animo: 60 }));
    const b = fichar(estado, 'jugador', heroe({ id: 'b', animo: 60 }));
    const c = fichar(estado, 'jugador', heroe({ id: 'c', animo: 60 }));
    cambiarAfinidad(estado, 'a', 'b', U.mejores);
    c.amor = 'b';
    perderCompanero(estado, 'jugador', b, 'muerte');
    expect(a.animo).toBe(60 - balance.relaciones.muerte.todos - balance.relaciones.muerte.mejores);
    expect(c.animo).toBe(60 - balance.relaciones.muerte.todos - balance.relaciones.muerte.pareja);
    expect(c.amor).toBeNull();
  });

  it('vender a un héroe baja el ánimo de quien lo quería', () => {
    const estado = partida();
    const a = fichar(estado, 'jugador', heroe({ id: 'a', animo: 60, poder: 20 }));
    fichar(estado, 'jugador', heroe({ id: 'b', animo: 60, poder: 20 }));
    a.amor = 'b';
    vender(estado, 'b');
    expect(a.animo).toBeLessThan(60);
    expect(a.amor).toBeNull();
  });

  it('volver de una misión cambia el ánimo y la afinidad del equipo', () => {
    const estado = partida();
    const a = fichar(estado, 'jugador', heroe({ id: 'a', animo: 60, poder: 80 }));
    const b = fichar(estado, 'jugador', heroe({ id: 'b', animo: 60, poder: 80 }));
    const informe = resolverMision(new Azar(3), mision(), [a, b], 'jugador', { estado, gremioId: 'jugador' });
    expect(informe.exito).toBe(true);
    expect(a.animo).toBeGreaterThan(60);
    const R = balance.relaciones;
    expect(afinidad(estado, 'a', 'b')).toBe(R.misionExito + compatibilidad(estado, 'a', 'b') * R.porCompatibilidad);
    expect(jugador(estado).plantilla).toContain('a');
  });
});
