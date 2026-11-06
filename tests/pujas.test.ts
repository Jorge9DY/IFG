import { describe, expect, it } from 'vitest';
import {
  ofertaTotal,
  puntuacionOferta,
  resolverSubasta,
  type ContextoGremio,
  type Oferta,
  type Pujador,
} from '../src/motor/pujas';

const tejedores: ContextoGremio = {
  gremioId: 'tejedores',
  prestigio: 60,
  reputacion: 40,
  puesto: 4,
  vinculosEnPlantilla: [],
  bonusEspecialidad: false,
  muertesTemporadaPasada: 0,
  ratioDeuda: 0,
};

const llama: ContextoGremio = {
  gremioId: 'llama',
  prestigio: 10,
  reputacion: 40,
  puesto: 5,
  vinculosEnPlantilla: ['Familia'],
  bonusEspecialidad: true, // puesto titular: no tiene ningún sanador
  muertesTemporadaPasada: 0,
  ratioDeuda: 0,
};

// Ofertas expresadas como prima sin salario para que el total coincida con la tabla del diseño.
const soloPrima = (prima: number): Oferta => ({ prima, salario: 0, duracion: 2 });

describe('Puntuación de Oferta (sección 7, ejemplo de Mira Solenne)', () => {
  it('ronda 1: Tejedores 84,0 y Llama Menguante 87,0', () => {
    expect(puntuacionOferta(2200, 1500, tejedores, []).total).toBe(84);
    expect(puntuacionOferta(1800, 1500, llama, []).total).toBe(87);
  });

  it('ronda 2: Tejedores 85,5 y Llama Menguante 100,5 (D en el tope de 150)', () => {
    const t = puntuacionOferta(2400, 1500, tejedores, []);
    const l = puntuacionOferta(2400, 1500, llama, []);
    expect(t.D).toBe(150);
    expect(t.total).toBe(85.5);
    expect(l.total).toBe(100.5);
  });

  it('la subasta pasa a la ronda 2 y Mira firma por la Llama Menguante', () => {
    const pujador = (contexto: ContextoGremio, r1: number, r2: number): Pujador => ({
      contexto,
      pujar: (ronda) => soloPrima(ronda === 1 ? r1 : r2),
    });
    const resultado = resolverSubasta(1500, [], [pujador(tejedores, 2200, 2400), pujador(llama, 1800, 2400)]);
    expect(resultado.rondas).toHaveLength(2);
    expect(resultado.ganador).toBe('llama');
  });

  it('una diferencia de 10 puntos o más decide en la ronda 1', () => {
    const resultado = resolverSubasta(1500, [], [
      { contexto: tejedores, pujar: () => soloPrima(3000) },
      { contexto: { ...llama, vinculosEnPlantilla: [], bonusEspecialidad: false }, pujar: () => soloPrima(500) },
    ]);
    expect(resultado.rondas).toHaveLength(1);
    expect(resultado.ganador).toBe('tejedores');
  });
});

describe('Modificadores de la puja', () => {
  it('la oferta total es la prima más 10 semanas de salario', () => {
    expect(ofertaTotal({ prima: 400, salario: 30, duracion: 1 })).toBe(700);
  });

  it('Codicioso da más peso al dinero', () => {
    const normal = puntuacionOferta(1500, 1500, tejedores, []).total;
    const codicioso = puntuacionOferta(1500, 1500, tejedores, ['Codicioso']).total;
    expect(codicioso - normal).toBeCloseTo(9);
  });

  it('Leal duplica el bonus de vínculo y los vínculos tienen tope de +30', () => {
    const muchos: ContextoGremio = { ...llama, vinculosEnPlantilla: ['Romance', 'Familia', 'Amistad'] };
    expect(puntuacionOferta(0, 1000, muchos, []).V).toBe(30);
    expect(puntuacionOferta(0, 1000, llama, ['Leal']).V).toBe(30);
  });

  it('Ambicioso ignora gremios fuera del Top 3 con poco prestigio', () => {
    expect(puntuacionOferta(1000, 1000, llama, ['Ambicioso']).elegible).toBe(false);
    expect(puntuacionOferta(1000, 1000, { ...llama, puesto: 3 }, ['Ambicioso']).elegible).toBe(true);
  });

  it('el riesgo percibido resta por muertes y por deuda alta', () => {
    const arriesgado: ContextoGremio = { ...tejedores, muertesTemporadaPasada: 3, ratioDeuda: 0.9 };
    expect(puntuacionOferta(1000, 1000, arriesgado, []).X).toBe(20);
  });
});
