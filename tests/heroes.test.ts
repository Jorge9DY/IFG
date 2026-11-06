import { describe, expect, it } from 'vitest';
import { esDestacado, ganarExperiencia, letraDe, rangoPotencial, sueldo, textoPotencial, valor } from '../src/motor/heroes';
import { heroe } from './fabrica';

describe('héroes', () => {
  it('convierte poder y potencial en letras', () => {
    expect(letraDe(0)).toBe('F');
    expect(letraDe(20)).toBe('D');
    expect(letraDe(49)).toBe('C');
    expect(letraDe(65)).toBe('A');
    expect(letraDe(100)).toBe('S');
  });

  it('muestra el potencial como un rango que contiene la letra real y se estrecha con los ojeadores', () => {
    for (const sesgoOjeo of [0, 0.3, 0.7, 0.99]) {
      const h = heroe({ id: 'a', poder: 22, potencial: 70, sesgoOjeo }); // potencial real A
      const anchos = [0, 1, 2, 3].map((nivel) => {
        const [min, max] = rangoPotencial(h, nivel);
        expect(['F', 'D', 'C', 'B', 'A', 'S'].indexOf(min)).toBeLessThanOrEqual(4);
        expect(['F', 'D', 'C', 'B', 'A', 'S'].indexOf(max)).toBeGreaterThanOrEqual(4);
        return ['F', 'D', 'C', 'B', 'A', 'S'].indexOf(max) - ['F', 'D', 'C', 'B', 'A', 'S'].indexOf(min);
      });
      expect(anchos[3]).toBe(0);
      for (let i = 1; i < anchos.length; i++) expect(anchos[i]!).toBeLessThanOrEqual(anchos[i - 1]!);
    }
    expect(textoPotencial(heroe({ id: 'b', poder: 22, potencial: 70 }), 3)).toBe('A');
  });

  it('el rango nunca baja de la letra del poder actual', () => {
    const h = heroe({ id: 'a', poder: 60, potencial: 62, sesgoOjeo: 0.99 });
    expect(rangoPotencial(h, 0)[0]).toBe('B');
  });

  it('el sueldo crece con el poder y la reputación', () => {
    const base = sueldo(heroe({ id: 'a', poder: 30, reputacion: 0 }));
    expect(sueldo(heroe({ id: 'b', poder: 50, reputacion: 0 }))).toBeGreaterThan(base);
    expect(sueldo(heroe({ id: 'c', poder: 30, reputacion: 40 }))).toBeGreaterThan(base);
  });

  it('vale más quien rinde más hoy o tiene más margen de crecimiento', () => {
    const v = valor(heroe({ id: 'a', poder: 30, potencial: 40 }));
    expect(valor(heroe({ id: 'b', poder: 40, potencial: 40 }))).toBeGreaterThan(valor(heroe({ id: 'c', poder: 30, potencial: 30 })));
    expect(valor(heroe({ id: 'd', poder: 30, potencial: 90 }))).toBeGreaterThan(v);
  });

  it('la experiencia sube el poder sin pasar del potencial', () => {
    const h = heroe({ id: 'a', poder: 30, potencial: 32 });
    expect(ganarExperiencia(h, 10)).toBe(1);
    expect(h.poder).toBe(31);
    ganarExperiencia(h, 100);
    expect(h.poder).toBe(32);
    expect(h.experiencia).toBe(0);
  });

  it('un novato destacado tiene potencial A o S', () => {
    expect(esDestacado(heroe({ id: 'a', potencial: 70 }))).toBe(true);
    expect(esDestacado(heroe({ id: 'b', potencial: 60 }))).toBe(false);
  });
});
