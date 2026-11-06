import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import { condicionesCuracion, costeCuracion, curar, pagarSueldos, sueldosDe } from '../src/motor/economia';
import { heroesDe, jugador, misionDe } from '../src/motor/estado';
import { sueldo } from '../src/motor/heroes';
import { lanzarMision } from '../src/motor/partida';
import { heroe, partida } from './fabrica';

const I = balance.impagos;

describe('sueldos', () => {
  it('con oro suficiente se paga a todos', () => {
    const estado = partida();
    const total = sueldosDe(estado, 'jugador');
    jugador(estado).oro = total + 100;
    const pago = pagarSueldos(estado, 'jugador');
    expect(pago).toMatchObject({ total, pagado: total, completo: true, impagados: [], seVan: [] });
    expect(jugador(estado).oro).toBe(100);
  });

  it('sin oro suficiente cobran primero los más poderosos; el resto avisa y pierde lealtad', () => {
    const estado = partida();
    const [fuerte, ...resto] = heroesDe(estado, 'jugador').sort((a, b) => b.poder - a.poder);
    jugador(estado).oro = sueldo(fuerte!);
    const pago = pagarSueldos(estado, 'jugador');
    expect(pago.completo).toBe(false);
    expect(pago.pagado).toBe(sueldo(fuerte!));
    expect(jugador(estado).oro).toBe(0);
    expect(pago.impagados.sort()).toEqual(resto.map((h) => h.id).sort());
    for (const h of resto) {
      expect(h.semanasSinCobrar).toBe(1);
      expect(h.lealtad).toBe(balance.heroes.lealtadInicial - I.lealtadPorSemana);
    }
    expect(estado.registro.some((e) => e.texto.includes('se irá a otro gremio'))).toBe(true);
  });

  it(`quien pasa ${I.semanasParaIrse} semanas seguidas sin cobrar se va a otro gremio`, () => {
    const estado = partida();
    const h = heroesDe(estado, 'jugador')[0]!;
    for (let i = 0; i < I.semanasParaIrse; i++) {
      jugador(estado).oro = 0;
      pagarSueldos(estado, 'jugador');
    }
    expect(jugador(estado).plantilla).not.toContain(h.id);
    const destino = Object.values(estado.gremios).find((g) => g.plantilla.includes(h.id));
    expect(destino?.esJugador).toBe(false);
  });

  it('cobrar una semana pone el contador a cero', () => {
    const estado = partida();
    jugador(estado).oro = 0;
    pagarSueldos(estado, 'jugador');
    jugador(estado).oro = 1_000_000;
    pagarSueldos(estado, 'jugador');
    for (const h of heroesDe(estado, 'jugador')) expect(h.semanasSinCobrar).toBe(0);
    jugador(estado).oro = 0;
    expect(pagarSueldos(estado, 'jugador').seVan).toEqual([]);
  });

  it('si se va estando de misión, el resto del equipo sigue', () => {
    const estado = partida();
    const [a, b] = jugador(estado).plantilla;
    lanzarMision(estado, estado.tablon[1]!.id, [a!, b!]);
    estado.heroes[a!]!.semanasSinCobrar = I.semanasParaIrse - 1;
    estado.heroes[a!]!.poder = 1; // cobra el último
    jugador(estado).oro = sueldosDe(estado, 'jugador') - sueldo(estado.heroes[a!]!);
    pagarSueldos(estado, 'jugador');
    expect(misionDe(estado, b!)?.equipo).toEqual([b]);
    expect(misionDe(estado, a!)).toBeNull();
  });
});

describe('curación', () => {
  it('cuesta más cuantos más días de lesión quedan y cuanto más poder tiene', () => {
    expect(costeCuracion(heroe({ id: 'a', poder: 30, diasLesion: 3 }))).toBeGreaterThan(costeCuracion(heroe({ id: 'b', poder: 30, diasLesion: 1 })));
    expect(costeCuracion(heroe({ id: 'c', poder: 60, diasLesion: 1 }))).toBeGreaterThan(costeCuracion(heroe({ id: 'd', poder: 30, diasLesion: 1 })));
  });

  it('curar con oro deja al héroe libre al momento', () => {
    const estado = partida();
    const h = heroesDe(estado, 'jugador')[0]!;
    h.estado = 'lesionado';
    h.diasLesion = 3;
    jugador(estado).oro = 100_000;
    const precio = costeCuracion(h);
    expect(curar(estado, h.id)).toBe(precio);
    expect(h.estado).toBe('libre');
    expect(jugador(estado).oro).toBe(100_000 - precio);
  });

  it('no se cura sin oro ni a quien no está lesionado', () => {
    const estado = partida();
    const h = heroesDe(estado, 'jugador')[0]!;
    expect(condicionesCuracion(estado, h.id).bloqueo).toMatch(/lesionado/);
    h.estado = 'lesionado';
    h.diasLesion = 2;
    jugador(estado).oro = 0;
    expect(condicionesCuracion(estado, h.id).bloqueo).toMatch(/oro/);
  });
});
