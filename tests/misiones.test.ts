import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import { Azar } from '../src/motor/azar';
import { generarTablon, probabilidadExito, resolverMision } from '../src/motor/misiones';
import { heroe } from './fabrica';

describe('misiones', () => {
  it('el tablón tiene tres misiones: baja, media y alta, con la duración, recompensa y equipo de la biblia', () => {
    let n = 0;
    const tablon = generarTablon(new Azar(1), () => `m${++n}`);
    expect(tablon.map((m) => [m.rango, m.duracion, m.recompensa, m.equipo])).toEqual([
      ['bajo', 1, 500, 1],
      ['medio', 2, 1500, 2],
      ['alto', 3, 4000, 3],
    ]);
  });

  it('la probabilidad es 75% con el poder justo y se limita entre 5 y 95', () => {
    expect(probabilidadExito(100, 100)).toBe(75);
    expect(probabilidadExito(80, 100)).toBe(55);
    expect(probabilidadExito(1000, 100)).toBe(95);
    expect(probabilidadExito(1, 100)).toBe(5);
  });

  it('el éxito da la recompensa entera; el fracaso, solo una parte', () => {
    let exitos = 0;
    let fracasos = 0;
    for (let s = 1; s <= 200; s++) {
      let n = 0;
      const [mision] = generarTablon(new Azar(s), () => `m${++n}`);
      const informe = resolverMision(new Azar(s * 13), mision!, [heroe({ id: 'a', poder: 20 })], 'j');
      if (informe.exito) {
        exitos++;
        expect(informe.oro).toBe(500);
      } else {
        fracasos++;
        expect(informe.oro).toBe(Math.round(500 * balance.misiones.fraccionRecompensaFracaso));
      }
    }
    expect(exitos).toBeGreaterThan(0);
    expect(fracasos).toBeGreaterThan(0);
  });

  it('nadie muere: como mucho se lesiona y vuelve libre o lesionado', () => {
    for (let s = 1; s <= 100; s++) {
      let n = 0;
      const mision = generarTablon(new Azar(s), () => `m${++n}`)[2]!;
      const equipo = [heroe({ id: 'a', poder: 10 }), heroe({ id: 'b', poder: 10 }), heroe({ id: 'c', poder: 10 })];
      const informe = resolverMision(new Azar(s), mision, equipo, 'j');
      for (const h of equipo) {
        expect(['libre', 'lesionado']).toContain(h.estado);
        expect(h.estado === 'lesionado').toBe(h.diasLesion > 0);
      }
      expect(informe.partes).toHaveLength(3);
      for (const parte of informe.partes) expect(parte.progreso.experienciaGanada).toBe(informe.exito ? 35 : 18);
    }
  });
});
