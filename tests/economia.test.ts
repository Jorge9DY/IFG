import { describe, expect, it } from 'vitest';
import { cierreSemanal, gastosSemanales, patrocinio } from '../src/motor/economia';
import { clasificacion, puntosGremio } from '../src/motor/ranking';
import { rangoPorSuma, valorMercado } from '../src/motor/heroes';
import type { Gremio } from '../src/motor/tipos';
import { elara, heroe } from './fabrica';

function llamaInicial(): Gremio {
  return {
    id: 'llama',
    nombre: 'Llama Menguante',
    esJugador: true,
    oro: 3000,
    deuda: 40000,
    prestigio: 10,
    reputacion: 40,
    especialidad: null,
    plantilla: ['h_000_elara'],
    plantillaMax: 6,
    mejoras: [],
    puntosMisionTemporada: 0,
    cierresNegativos: 0,
    muertesTemporadaPasada: 0,
  };
}

describe('Economía (sección 10)', () => {
  it('patrocinio inicial de 300 y gastos fijos de 1.000 por semana', () => {
    const g = llamaInicial();
    expect(patrocinio(g.prestigio, g.reputacion)).toBe(300);
    expect(gastosSemanales(g, 0).total).toBe(1000);
  });

  it('simulación de las 4 primeras semanas: 1.495 → 2.355 → 1.615 → 850', () => {
    const g = llamaInicial();
    const salarios = 30 + 25; // Brann y Lio

    // Semana 1: fichajes de Brann (400) y Lio (350); misión C en curso.
    g.oro -= 750;
    expect(cierreSemanal(g, salarios, false).oroFinal).toBe(1495);

    // Semana 2: vuelve la misión C con éxito.
    g.oro += 1600;
    g.prestigio += 2;
    expect(cierreSemanal(g, salarios, true).oroFinal).toBe(2355);

    // Semana 3: nueva misión C en curso.
    expect(cierreSemanal(g, salarios, false).oroFinal).toBe(1615);

    // Semana 4: la misión fracasa (−2 de prestigio).
    g.prestigio -= 2;
    expect(cierreSemanal(g, salarios, false).oroFinal).toBe(850);
    expect(g.deuda).toBe(38000);
  });

  it('tres cierres seguidos con oro negativo significan la quiebra', () => {
    const g = { ...llamaInicial(), oro: -5000 };
    expect(cierreSemanal(g, 0, false).quiebra).toBe(false);
    expect(cierreSemanal(g, 0, false).quiebra).toBe(false);
    const tercero = cierreSemanal(g, 0, false);
    expect(tercero.aviso).toBe(true);
    expect(tercero.quiebra).toBe(true);
  });
});

describe('Ranking (sección 11)', () => {
  it('Puntos de Gremio = 3 × prestigio + reputación + puntos de misión', () => {
    expect(puntosGremio({ ...llamaInicial(), puntosMisionTemporada: 4 })).toBe(74);
  });

  it('ordena de más a menos puntos', () => {
    const corona = { ...llamaInicial(), id: 'corona', nombre: 'Corona de Acero', prestigio: 90, reputacion: 50 };
    const filas = clasificacion([llamaInicial(), corona]);
    expect(filas.map((f) => f.gremioId)).toEqual(['corona', 'llama']);
    expect(filas[0]?.puesto).toBe(1);
  });
});

describe('Héroes (secciones 5 y 8)', () => {
  it('el rango sale de la suma de combate', () => {
    expect(rangoPorSuma(334)).toBe('S');
    expect(rangoPorSuma(185)).toBe('C');
    expect(rangoPorSuma(125)).toBe('D');
    expect(rangoPorSuma(40)).toBe('F');
  });

  it('valor de mercado: base del rango × éxitos × edad', () => {
    const joven = heroe({ id: 'j', rango: 'C', edad: 19, misionesExito: 5 });
    expect(valorMercado(joven)).toBe(Math.round(1500 * 1.1 * 1.2));
    expect(valorMercado(elara())).toBe(22500);
  });
});
