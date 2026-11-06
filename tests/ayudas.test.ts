import { describe, expect, it } from 'vitest';
import { jugador } from '../src/motor/estado';
import { poderEquipo, probabilidadExito } from '../src/motor/misiones';
import { equipoRecomendado, nivelDificultad } from '../src/ui/ayudas';
import { fichar, heroe, partida } from './fabrica';

describe('ayudas de la interfaz', () => {
  it('recomienda un equipo del tamaño exacto, el más modesto que llega al 80%', () => {
    const estado = partida();
    jugador(estado).plantilla = [];
    for (const [i, poder] of [60, 45, 30, 25].entries()) fichar(estado, 'jugador', heroe({ id: `r${i}`, poder }));
    const medio = { ...estado.tablon[1]!, dificultad: 55 };
    const equipo = equipoRecomendado(estado, medio);
    expect(equipo).toHaveLength(2);
    expect(probabilidadExito(poderEquipo(equipo), medio.dificultad)).toBeGreaterThanOrEqual(80);
    expect(poderEquipo(equipo)).toBe(70);
  });

  it('sin héroes suficientes no recomienda nada', () => {
    const estado = partida();
    jugador(estado).plantilla = jugador(estado).plantilla.slice(0, 1);
    expect(equipoRecomendado(estado, estado.tablon[2]!)).toEqual([]);
  });

  it('clasifica la dificultad', () => {
    expect(nivelDificultad(null)).toBe('sin-equipo');
    expect(nivelDificultad(90)).toBe('facil');
    expect(nivelDificultad(40)).toBe('muy-dificil');
  });
});
