import { describe, expect, it } from 'vitest';
import { Azar } from '../src/motor/azar';
import {
  multiplicadorMoral,
  poderEquipo,
  probabilidadExito,
  resolverMision,
  resultadoTirada,
  riesgoBase,
  riesgoMuerte,
  type MiembroEquipo,
} from '../src/motor/misiones';
import { elara, heroe, mision } from './fabrica';

const brann = heroe({ id: 'brann', clase: 'Tanque' });
const lio = heroe({ id: 'lio', clase: 'Explorador' });
const equipoInicial: MiembroEquipo[] = [
  { heroe: elara(), posicion: 'retaguardia' },
  { heroe: brann, posicion: 'vanguardia' },
  { heroe: lio, posicion: 'centro' },
];

describe('Probabilidad de éxito (sección 9)', () => {
  it('75% con el poder recomendado, 55% con el 80% y 95% con el 120%', () => {
    expect(probabilidadExito(500, 500, false)).toBe(75);
    expect(probabilidadExito(400, 500, false)).toBeCloseTo(55);
    expect(probabilidadExito(600, 500, false)).toBeCloseTo(95);
  });

  it('nunca baja del 5% ni sube del 95%, ni siquiera con Soporte', () => {
    expect(probabilidadExito(10, 500, false)).toBe(5);
    expect(probabilidadExito(2000, 500, true)).toBe(95);
    expect(probabilidadExito(500, 500, true)).toBe(85);
  });

  it('la tirada da éxito, parcial (hasta 15 puntos por encima) o fracaso', () => {
    expect(resultadoTirada(75, 75)).toBe('exito');
    expect(resultadoTirada(90, 75)).toBe('parcial');
    expect(resultadoTirada(91, 75)).toBe('fracaso');
  });
});

describe('Poder de equipo', () => {
  it('el equipo inicial (Elara, Brann y Lio) ronda 536 y tiene un 82% de éxito en una misión C', () => {
    const pe = poderEquipo(equipoInicial);
    expect(pe).toBeCloseTo(536.4, 0);
    expect(probabilidadExito(pe, 500, false)).toBeCloseTo(82.3, 0);
  });

  it('la Moral multiplica entre 0,7 y 1,15', () => {
    expect(multiplicadorMoral(0)).toBe(0.7);
    expect(multiplicadorMoral(100)).toBeCloseTo(1.15);
  });

  it('la posición ya no cambia la aportación', () => {
    const delante = poderEquipo([{ heroe: brann, posicion: 'vanguardia' }]);
    const detras = poderEquipo([{ heroe: brann, posicion: 'retaguardia' }]);
    expect(detras).toBe(delante);
  });

  it('un vínculo familiar en el mismo equipo suma un 10% a ambos', () => {
    const a = heroe({ id: 'a', vinculos: [{ con: 'b', tipo: 'Familia', oculto: false }] });
    const b = heroe({ id: 'b', vinculos: [{ con: 'a', tipo: 'Familia', oculto: false }] });
    const sinVinculo = poderEquipo([{ heroe: heroe({ id: 'a' }), posicion: 'vanguardia' }, { heroe: heroe({ id: 'b' }), posicion: 'vanguardia' }]);
    const conVinculo = poderEquipo([{ heroe: a, posicion: 'vanguardia' }, { heroe: b, posicion: 'vanguardia' }]);
    expect(conVinculo / sinVinculo).toBeCloseTo(1.1);
  });
});

describe('Riesgo de muerte', () => {
  it('riesgo base según la diferencia de rango', () => {
    expect(riesgoBase('B', 1)).toBe(25); // misión B, héroe D
    expect(riesgoBase('C', 1)).toBe(12);
    expect(riesgoBase('D', 1)).toBe(6);
    expect(riesgoBase('F', 1)).toBe(1);
  });

  it('un Tanque en el equipo reduce un 30% el riesgo del resto', () => {
    const m = mision({ rango: 'B' });
    const lioMiembro = equipoInicial[2]!;
    const conTanque = riesgoMuerte(lioMiembro, equipoInicial, m, 'fracaso');
    const sinTanque = riesgoMuerte(lioMiembro, [lioMiembro], m, 'fracaso');
    expect(conTanque / sinTanque).toBeCloseTo(0.7);
  });

  it('un Cobarde nunca muere en misiones de su rango o inferiores', () => {
    const cobarde: MiembroEquipo = { heroe: heroe({ id: 'c', rasgos: ['Cobarde'] }), posicion: 'vanguardia' };
    expect(riesgoMuerte(cobarde, [cobarde], mision({ rango: 'D' }), 'fracaso')).toBe(0);
  });
});

describe('Resolución de misiones', () => {
  const equipoDebil: MiembroEquipo[] = [
    { heroe: heroe({ id: 'x1', stats: { poder: 20, defensa: 0, magia: 20, agilidad: 20, moral: 50 } }), posicion: 'vanguardia' },
    { heroe: heroe({ id: 'x2', stats: { poder: 20, defensa: 0, magia: 20, agilidad: 20, moral: 50 } }), posicion: 'vanguardia' },
    { heroe: heroe({ id: 'x3', stats: { poder: 20, defensa: 0, magia: 20, agilidad: 20, moral: 50 } }), posicion: 'vanguardia' },
  ];
  const misionImposible = mision({ rango: 'S', poderRecomendado: 1600 });

  it('es reproducible con la misma semilla', () => {
    const a = resolverMision(misionImposible, equipoDebil, new Azar(42));
    const b = resolverMision(misionImposible, equipoDebil, new Azar(42));
    expect(a).toEqual(b);
  });

  it('en modo normal un equipo débil en misiones S acaba sufriendo muertes', () => {
    const azar = new Azar(1);
    let muertes = 0;
    for (let i = 0; i < 200; i++) {
      muertes += resolverMision(misionImposible, equipoDebil, azar).partes.filter((p) => p.consecuencia === 'muerte').length;
    }
    expect(muertes).toBeGreaterThan(0);
  });

  it('el Modo Clemente nunca produce muertes', () => {
    const azar = new Azar(1);
    for (let i = 0; i < 500; i++) {
      const informe = resolverMision(misionImposible, equipoDebil, azar, { modoClemente: true });
      expect(informe.partes.some((p) => p.consecuencia === 'muerte')).toBe(false);
    }
  });

  it('un fracaso no da oro y resta 2 de prestigio', () => {
    const azar = new Azar(3);
    const informe = resolverMision(misionImposible, equipoDebil, azar);
    expect(informe.resultado).toBe('fracaso');
    expect(informe.oro).toBe(0);
    expect(informe.prestigio).toBe(-2);
  });

  it('exige equipos de 1 a 5 héroes', () => {
    expect(() => resolverMision(mision(), [], new Azar(1))).toThrow();
    expect(() => resolverMision(mision(), equipoInicial.slice(0, 1), new Azar(1))).not.toThrow();
  });
});

describe('Vista previa de la Formación', () => {
  it('coincide con el cálculo de la misión y da el riesgo en caso de fracaso', async () => {
    const { vistaPreviaMision } = await import('../src/motor/misiones');
    const m = mision();
    const vista = vistaPreviaMision(m, equipoInicial);
    expect(vista.poder).toBeCloseTo(poderEquipo(equipoInicial));
    expect(vista.probabilidad).toBeCloseTo(probabilidadExito(vista.poder, m.poderRecomendado, false));
    expect(vista.riesgos).toHaveLength(3);
    expect(vista.riesgos[2]!.riesgo).toBeCloseTo(riesgoMuerte(equipoInicial[2]!, equipoInicial, m, 'fracaso'));
  });

  it('con el equipo vacío la probabilidad es 0', async () => {
    const { vistaPreviaMision } = await import('../src/motor/misiones');
    expect(vistaPreviaMision(mision(), []).probabilidad).toBe(0);
  });
});
