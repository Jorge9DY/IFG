import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import { Azar } from '../src/motor/azar';
import { jugador } from '../src/motor/estado';
import { bonusClases, clasesCubiertas, duracionMision, generarTablon, probabilidadExito, probabilidadMision, probLesion } from '../src/motor/misiones';
import { lanzarMision } from '../src/motor/partida';
import { prestigio } from '../src/motor/ranking';
import { aceptarReto, caducarReto, generarReto, heroesParaReto, motivoNoAceptar, rechazarReto } from '../src/motor/retos';
import { prioridad } from '../src/motor/rivales';
import type { Mision } from '../src/motor/tipos';
import { fichar, heroe, partida } from './fabrica';

const K = balance.clases;

function mision(datos: Partial<Mision> = {}): Mision {
  return { id: 'm', rango: 'medio', tipo: 'Escolta', clases: ['Guerrero', 'Sanador'], titulo: 'Prueba', dificultad: 60, duracion: 2, recompensa: 1500, equipo: 2, ...datos };
}

describe('tipos de misión y clases favorecidas', () => {
  it('cada misión del tablón tiene un tipo que favorece a una clase (o a una combinación en grupo)', () => {
    let n = 0;
    const [bajo, medio, alto] = generarTablon(new Azar(4), () => `m${++n}`);
    expect(bajo!.clases).toHaveLength(1);
    expect(medio!.clases).toHaveLength(2);
    expect(alto!.clases).toHaveLength(3);
    for (const m of [bajo!, medio!, alto!]) expect(m.tipo).not.toBe('');
  });

  it('llevar las clases favorecidas suma éxito, y más con la combinación completa', () => {
    const m = mision();
    const g = heroe({ id: 'g', clase: 'Guerrero', poder: 30 });
    const s = heroe({ id: 's', clase: 'Sanador', poder: 30 });
    const x = heroe({ id: 'x', clase: 'Mago', poder: 30 });
    expect(bonusClases(m, [x, heroe({ id: 'y', clase: 'Mago', poder: 30 })])).toBe(0);
    expect(bonusClases(m, [g, x])).toBe(K.bonusPorClase);
    expect(bonusClases(m, [g, s])).toBe(2 * K.bonusPorClase + K.bonusCombinacion);
    expect(probabilidadMision(m, [g, s])).toBe(probabilidadExito(60, 60) + 2 * K.bonusPorClase + K.bonusCombinacion);
  });

  it('cada héroe cubre un solo hueco: dos Guerreros cubren «Guerrero, Guerrero»', () => {
    const asedio = mision({ rango: 'alto', clases: ['Guerrero', 'Guerrero', 'Mago'], equipo: 3 });
    const g1 = heroe({ id: 'a', clase: 'Guerrero' });
    expect(clasesCubiertas(asedio, [g1, heroe({ id: 'b', clase: 'Mago' }), heroe({ id: 'c', clase: 'Sanador' })]).faltan).toEqual(['Guerrero']);
    expect(clasesCubiertas(asedio, [g1, heroe({ id: 'd', clase: 'Guerrero' }), heroe({ id: 'e', clase: 'Mago' })]).faltan).toEqual([]);
  });
});

describe('efectos pasivos de las clases', () => {
  it('Guerrero se lesiona menos, Mago más, y un Sanador protege a sus compañeros', () => {
    const g = heroe({ id: 'g', clase: 'Guerrero' });
    const m = heroe({ id: 'm', clase: 'Mago' });
    const e = heroe({ id: 'e', clase: 'Explorador' });
    const s = heroe({ id: 's', clase: 'Sanador' });
    expect(probLesion(g, [g], 40)).toBe(40 * K.lesionGuerrero);
    expect(probLesion(m, [m], 40)).toBe(40 * K.lesionMago);
    expect(probLesion(e, [e, s], 40)).toBe(40 * K.lesionCompanerosSanador);
    expect(probLesion(s, [s], 40)).toBe(40);
  });

  it('el Mago pega más fuerte en las misiones de rango alto', () => {
    const mago = heroe({ id: 'm', clase: 'Mago', poder: 40 });
    const sin = mision({ rango: 'alto', clases: [], dificultad: 120 });
    expect(probabilidadMision(sin, [mago])).toBeGreaterThan(probabilidadMision(sin, [heroe({ id: 'g', clase: 'Guerrero', poder: 40 })]));
    expect(probabilidadMision({ ...sin, rango: 'medio' }, [mago])).toBe(probabilidadMision({ ...sin, rango: 'medio' }, [heroe({ id: 'g', clase: 'Guerrero', poder: 40 })]));
  });

  it('un Explorador acorta un día las misiones más largas (rango alto)', () => {
    const e = heroe({ id: 'e', clase: 'Explorador' });
    const g = heroe({ id: 'g', clase: 'Guerrero' });
    expect(duracionMision(mision({ duracion: 3 }), [e, g])).toBe(2);
    expect(duracionMision(mision({ duracion: 3 }), [g])).toBe(3);
    expect(duracionMision(mision({ duracion: 2 }), [e])).toBe(2);
  });

  it('al lanzar la misión alta, el Explorador adelanta la vuelta', () => {
    const estado = partida();
    const [a, b, c] = jugador(estado).plantilla;
    estado.heroes[a!]!.clase = 'Explorador';
    const alto = estado.tablon.find((m) => m.rango === 'alto')!;
    lanzarMision(estado, alto.id, [a!, b!, c!]);
    expect(estado.enCurso[estado.enCurso.length - 1]!.diaVuelta).toBe(estado.dia + alto.duracion - 2);
  });

  it('un rival especializado da más prioridad a los héroes de su clase', () => {
    const estado = partida();
    const dragon = estado.gremios.dragon!;
    expect(dragon.clase).toBe('Guerrero');
    expect(prioridad(dragon, heroe({ id: 'a', clase: 'Guerrero' }))).toBeGreaterThan(prioridad(dragon, heroe({ id: 'b', clase: 'Mago' })));
  });
});

describe('retos de los maestros', () => {
  /** Partida con un reto preparado: Mago de rango C del Dragón contra un Mago C del jugador. */
  function conReto(poderMio: number, poderSuyo: number) {
    const estado = partida();
    const suyo = fichar(estado, 'dragon', heroe({ id: 'rival', clase: 'Mago', poder: poderSuyo }));
    const mio = fichar(estado, 'jugador', heroe({ id: 'mio', clase: 'Mago', poder: poderMio }));
    // Solo ese Mago C en el Dragón, para saber a quién saca.
    for (const id of estado.gremios.dragon!.plantilla) {
      const h = estado.heroes[id]!;
      if (h !== suyo && h.clase === 'Mago') h.clase = 'Guerrero';
    }
    estado.reto = { gremioId: 'dragon', clase: 'Mago', rango: 'C', apuesta: 800, diaLimite: 7, resultado: null };
    jugador(estado).oro = 5000;
    return { estado, mio, suyo };
  }

  it('se lanza un reto con un rango que el jugador tiene y una clase del rival, con apuesta', () => {
    for (let s = 1; s <= 10; s++) {
      const estado = partida(s);
      const r = generarReto(estado, new Azar(s));
      if (!r) continue;
      expect(estado.reto).toBe(r);
      expect(r.apuesta).toBeGreaterThan(0);
      expect(r.diaLimite % balance.calendario.diasPorSemana).toBe(0);
    }
  });

  it('solo responden héroes de la clase y el rango pedidos, y hay que cubrir la apuesta', () => {
    const { estado, mio } = conReto(40, 38);
    expect(heroesParaReto(estado).map((h) => h.id)).toEqual(['mio']);
    const otro = jugador(estado).plantilla.find((id) => id !== 'mio')!;
    expect(motivoNoAceptar(estado, otro)).toMatch(/mago de rango C/);
    jugador(estado).oro = 100;
    expect(motivoNoAceptar(estado, mio.id)).toMatch(/apuesta/);
  });

  it('gana el más fuerte: si ganas, oro y prestigio', () => {
    const { estado, mio } = conReto(45, 38);
    const antes = prestigio(jugador(estado));
    const r = aceptarReto(estado, new Azar(1), mio.id);
    expect(r.desenlace).toBe('victoria');
    expect(r.poderRival).toBe(38);
    expect(jugador(estado).oro).toBe(5800);
    expect(prestigio(jugador(estado))).toBe(antes + balance.ranking.prestigioPorReto);
  });

  it('si pierdes, pagas la apuesta; con empate nadie paga', () => {
    const derrota = conReto(36, 44);
    expect(aceptarReto(derrota.estado, new Azar(1), derrota.mio.id).desenlace).toBe('derrota');
    expect(jugador(derrota.estado).oro).toBe(4200);
    const empate = conReto(40, 40);
    expect(aceptarReto(empate.estado, new Azar(1), empate.mio.id).desenlace).toBe('empate');
    expect(jugador(empate.estado).oro).toBe(5000);
  });

  it('rechazar no cuesta nada y el reto caduca al terminar el día límite', () => {
    const a = conReto(40, 40);
    rechazarReto(a.estado);
    expect(a.estado.reto).toBeNull();
    expect(jugador(a.estado).oro).toBe(5000);
    const b = conReto(40, 40);
    b.estado.dia = 7;
    caducarReto(b.estado);
    expect(b.estado.reto).toBeNull();
  });
});
