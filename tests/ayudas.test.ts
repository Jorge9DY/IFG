import { describe, expect, it } from 'vitest';
import { Azar } from '../src/motor/azar';
import { jugador, type EstadoJuego } from '../src/motor/estado';
import { generarHeroe } from '../src/motor/heroes';
import { POSICION_NATURAL, vistaPreviaMision } from '../src/motor/misiones';
import { crearPartida } from '../src/motor/partida';
import { equipoRecomendado, nivelDificultad, probabilidadConMejorEquipo } from '../src/ui/ayudas';

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
  it('usa entre 1 y 5 héroes', () => {
    const estado = conPlantilla(5);
    const equipo = equipoRecomendado(estado, estado.tablon[1]!);
    expect(equipo.length).toBeGreaterThanOrEqual(1);
    expect(equipo.length).toBeLessThanOrEqual(5);
    for (const m of equipo) expect(m.posicion).toBe(POSICION_NATURAL[m.heroe.clase]);
  });

  it('para una misión muy fácil le basta un héroe', () => {
    const estado = conPlantilla(5);
    const facil = { ...estado.tablon[0]!, poderRecomendado: 50 };
    expect(equipoRecomendado(estado, facil)).toHaveLength(1);
  });

  it('sin héroes libres no recomienda nada', () => {
    const estado = conPlantilla(0);
    jugador(estado).plantilla = [];
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
  });
});

describe('El equipo recomendado no desperdicia héroes', () => {
  it('recomienda el equipo de menor poder que llega al 80%', () => {
    const estado = conPlantilla(4, 'C');
    const m = { ...estado.tablon[0]!, poderRecomendado: 300 };
    const equipo = equipoRecomendado(estado, m);
    expect(vistaPreviaMision(m, equipo).probabilidad).toBeGreaterThanOrEqual(80);
    expect(equipo.length).toBeLessThan(5);
  });

  it('en una misión dura recurre a los más fuertes', () => {
    const estado = conPlantilla(4, 'C');
    const dura = { ...estado.tablon[0]!, rango: 'B' as const, poderRecomendado: 2000 };
    const equipo = equipoRecomendado(estado, dura);
    expect(equipo.some((m) => m.heroe.id === 'h_000_elara')).toBe(true);
  });
});
