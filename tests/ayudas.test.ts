import { describe, expect, it } from 'vitest';
import { Azar } from '../src/motor/azar';
import { jugador, type EstadoJuego } from '../src/motor/estado';
import { generarHeroe } from '../src/motor/heroes';
import { POSICION_NATURAL, vistaPreviaMision } from '../src/motor/misiones';
import { crearPartida } from '../src/motor/partida';
import {
  confianzaPuja,
  equipoRecomendado,
  nivelDificultad,
  ofertasSugeridas,
  oroParaPujar,
  probabilidadConMejorEquipo,
} from '../src/ui/ayudas';

function conPlantilla(n: number, rango: 'D' | 'C' | 'B' = 'C'): EstadoJuego {
  const estado = crearPartida({ nombre: 'A', semilla: 3 });
  const azar = new Azar(17);
  const j = jugador(estado);
  for (let i = 0; i < n; i++) {
    const h = generarHeroe(azar, `p${i}`, rango);
    h.contrato = { gremio: j.id, salario: 50, temporadasRestantes: 1, clausula: 1000 };
    estado.heroes[h.id] = h;
    j.plantilla.push(h.id);
  }
  return estado;
}

describe('Equipo recomendado', () => {
  it('pone a cada héroe en su posición natural y usa entre 3 y 5', () => {
    const estado = conPlantilla(5);
    const equipo = equipoRecomendado(estado, estado.tablon[0]!);
    expect(equipo.length).toBeGreaterThanOrEqual(3);
    expect(equipo.length).toBeLessThanOrEqual(5);
    for (const m of equipo) expect(m.posicion).toBe(POSICION_NATURAL[m.heroe.clase]);
  });

  it('para una misión fácil se queda con 3 héroes', () => {
    const estado = conPlantilla(5);
    const facil = { ...estado.tablon[0]!, poderRecomendado: 100 };
    expect(equipoRecomendado(estado, facil)).toHaveLength(3);
  });

  it('sin 3 héroes libres no recomienda nada', () => {
    const estado = conPlantilla(1);
    expect(equipoRecomendado(estado, estado.tablon[0]!)).toHaveLength(0);
    expect(probabilidadConMejorEquipo(estado, estado.tablon[0]!)).toBeNull();
  });

  it('la probabilidad mostrada coincide con la del motor', () => {
    const estado = conPlantilla(4);
    const m = estado.tablon[0]!;
    const equipo = equipoRecomendado(estado, m);
    expect(probabilidadConMejorEquipo(estado, m)).toBe(vistaPreviaMision(m, equipo).probabilidad);
  });
});

describe('Etiquetas de dificultad y confianza', () => {
  it('traduce probabilidades a palabras', () => {
    expect(nivelDificultad(90)).toBe('facil');
    expect(nivelDificultad(75)).toBe('asequible');
    expect(nivelDificultad(55)).toBe('arriesgada');
    expect(nivelDificultad(20)).toBe('muy-dificil');
    expect(nivelDificultad(null)).toBe('sin-equipo');
    expect(confianzaPuja(100, true)).toBe('muy-probable');
    expect(confianzaPuja(50, true)).toBe('dificil');
    expect(confianzaPuja(200, false)).toBe('imposible');
  });
});

describe('Ofertas sugeridas', () => {
  it('nunca superan el oro que se puede gastar y puntúan más cuanto más se ofrece', () => {
    const estado = crearPartida({ nombre: 'O', semilla: 5 });
    const h = generarHeroe(new Azar(2), 'x', 'D');
    const ofertas = ofertasSugeridas(estado, h);
    expect(ofertas.length).toBeGreaterThan(0);
    for (const o of ofertas) expect(o.oferta.prima).toBeLessThanOrEqual(oroParaPujar(estado));
    for (let i = 1; i < ofertas.length; i++) expect(ofertas[i]!.puntuacion).toBeGreaterThanOrEqual(ofertas[i - 1]!.puntuacion);
  });

  it('sin oro no sugiere ofertas', () => {
    const estado = crearPartida({ nombre: 'O', semilla: 5 });
    jugador(estado).oro = 0;
    expect(ofertasSugeridas(estado, generarHeroe(new Azar(2), 'x', 'B'))).toHaveLength(0);
  });
});

describe('El equipo recomendado no desperdicia héroes', () => {
  it('en una misión fácil deja fuera a Elara si los demás bastan', () => {
    const estado = conPlantilla(4, 'C');
    const facil = { ...estado.tablon[0]!, rango: 'F' as const, poderRecomendado: 180 };
    const equipo = equipoRecomendado(estado, facil);
    expect(equipo.some((m) => m.heroe.id === 'h_000_elara')).toBe(false);
  });

  it('en una misión dura recurre a los más fuertes', () => {
    const estado = conPlantilla(4, 'C');
    const dura = { ...estado.tablon[0]!, rango: 'B' as const, poderRecomendado: 2000 };
    const equipo = equipoRecomendado(estado, dura);
    expect(equipo.some((m) => m.heroe.id === 'h_000_elara')).toBe(true);
  });
});
