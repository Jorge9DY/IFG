import { describe, expect, it } from 'vitest';
import { alLimite, esDestacado, ganarExperiencia, letraDe, rango, rangoPotencial, sueldo, textoPotencial, valor } from '../src/motor/heroes';
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

  it('la experiencia llena una barra y, al completarla, el poder sube de golpe +3', () => {
    const h = heroe({ id: 'a', poder: 30, potencial: 60 });
    const p1 = ganarExperiencia(h, 20);
    expect(p1).toMatchObject({ barras: 0, poderAntes: 30, poderDespues: 30, experienciaAntes: 0, experienciaDespues: 20 });
    const p2 = ganarExperiencia(h, 10);
    expect(p2).toMatchObject({ barras: 1, poderDespues: 33, experienciaDespues: 9 });
    const p3 = ganarExperiencia(h, 45);
    expect(p3.barras).toBe(2);
    expect(h.poder).toBe(39);
  });

  it('cruzar un umbral de letra es un ascenso de rango y sube el sueldo', () => {
    const h = heroe({ id: 'a', poder: 33, potencial: 60 });
    expect(rango(h)).toBe('D');
    const p = ganarExperiencia(h, 21);
    expect(p.rangoAntes).toBe('D');
    expect(p.rangoDespues).toBe('C');
    expect(p.sueldoDespues).toBeGreaterThan(p.sueldoAntes);
  });

  it('al llegar al potencial se detiene, avisa una vez y revela su potencial real', () => {
    const h = heroe({ id: 'a', poder: 30, potencial: 32, sesgoOjeo: 0 });
    const p = ganarExperiencia(h, 100);
    expect(p).toMatchObject({ poderDespues: 32, llegaAlLimite: true, experienciaDespues: 0 });
    expect(alLimite(h)).toBe(true);
    expect(rangoPotencial(h, 0)).toEqual(['D', 'D']);
    const otra = ganarExperiencia(h, 50);
    expect(otra).toMatchObject({ experienciaGanada: 0, barras: 0, llegaAlLimite: false });
  });

  it('un novato destacado tiene potencial A o S', () => {
    expect(esDestacado(heroe({ id: 'a', potencial: 70 }))).toBe(true);
    expect(esDestacado(heroe({ id: 'b', potencial: 60 }))).toBe(false);
  });
});
