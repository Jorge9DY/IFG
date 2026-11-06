import { describe, expect, it } from 'vitest';
import { Azar } from '../src/motor/azar';
import { ganarXp, generarHeroe, generarVinculos } from '../src/motor/heroes';
import { sumaCombate } from '../src/motor/misiones';
import { RANGOS, indiceRango } from '../src/motor/tipos';
import balance from '../src/datos/balance.json';

describe('Generación de héroes', () => {
  it('la suma de combate cae dentro del rango pedido', () => {
    const azar = new Azar(9);
    for (const rango of RANGOS) {
      for (let i = 0; i < 50; i++) {
        const h = generarHeroe(azar, `h${i}`, rango);
        const suma = sumaCombate(h);
        expect(suma).toBeGreaterThanOrEqual(balance.rangos[rango].sumaMin);
        expect(suma).toBeLessThanOrEqual(balance.rangos[rango].sumaMax);
        expect(indiceRango(h.potencial)).toBeGreaterThanOrEqual(indiceRango(rango));
        expect(h.rasgos.includes('Temerario') && h.rasgos.includes('Cobarde')).toBe(false);
      }
    }
  });

  it('el stat principal de la clase suele ser el más alto', () => {
    const azar = new Azar(2);
    let aciertos = 0;
    for (let i = 0; i < 100; i++) {
      const h = generarHeroe(azar, `t${i}`, 'B', { clase: 'Tanque' });
      if (h.stats.defensa >= Math.max(h.stats.poder, h.stats.magia, h.stats.agilidad)) aciertos++;
    }
    expect(aciertos).toBeGreaterThan(80);
  });

  it('los vínculos son simétricos y Familia solo entre la misma raza', () => {
    const azar = new Azar(4);
    const heroes = Array.from({ length: 60 }, (_, i) => generarHeroe(azar, `v${i}`, 'C'));
    generarVinculos(azar, heroes);
    const porId = new Map(heroes.map((h) => [h.id, h]));
    for (const h of heroes) {
      for (const v of h.vinculos) {
        const otro = porId.get(v.con)!;
        expect(otro.vinculos.some((w) => w.con === h.id && w.tipo === v.tipo)).toBe(true);
        if (v.tipo === 'Familia') expect(otro.raza).toBe(h.raza);
      }
    }
  });
});

describe('Progresión', () => {
  it('la XP sube stats y puede subir de rango sin superar el potencial', () => {
    const azar = new Azar(5);
    const h = generarHeroe(azar, 'x', 'D', { edad: 18 });
    h.potencial = 'C';
    for (let i = 0; i < 60; i++) ganarXp(azar, h, 50);
    expect(h.rango).toBe('C');
    expect(sumaCombate(h)).toBeLessThanOrEqual(balance.rangos.C.sumaMax);
  });

  it('los mayores de 28 años no mejoran con la XP', () => {
    const azar = new Azar(5);
    const h = generarHeroe(azar, 'y', 'D', { edad: 30 });
    const antes = sumaCombate(h);
    ganarXp(azar, h, 500);
    expect(sumaCombate(h)).toBe(antes);
  });
});
