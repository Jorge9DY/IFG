// Auditoría de habilidades (2026-11-15): conocer habilidades, efectos visibles y arreglos de impacto.
import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import S from '../src/datos/social.json';
import { Azar } from '../src/motor/azar';
import { jugador } from '../src/motor/estado';
import { apuntarConocidas, cadaSemana, conoceHabilidad, efectosEnMision, type Contexto } from '../src/motor/habilidades';
import { OJEO_MAXIMO } from '../src/motor/heroes';
import { comprar } from '../src/motor/mercado';
import { afinidad, cambiar, choque, trasMision } from '../src/motor/relaciones';
import type { Heroe, Mision } from '../src/motor/tipos';
import { fichar, heroe, partida } from './fabrica';

const siempre = { probabilidad: (): boolean => true, elegir: <T,>(l: readonly T[]): T => l[0]! };

function ctx(estado: ReturnType<typeof partida>, equipo: Heroe[], datos: Partial<Mision> = {}): Contexto {
  const mision: Mision = { id: 'm', rango: 'bajo', tipo: 'Caza', clases: [], titulo: 'x', dificultad: 40, duracion: 1, recompensa: 1000, equipo: equipo.length, ...datos };
  return { estado, gremioId: 'jugador', mision, equipo, dia: estado.dia };
}

describe('conocer la habilidad de un héroe', () => {
  it('solo se conoce la de los héroes fichados alguna vez, o todas con los ojeadores al máximo', () => {
    const estado = partida();
    expect(conoceHabilidad(estado, 'H02')).toBe(true); // AllBlack, del jugador
    expect(conoceHabilidad(estado, 'H08')).toBe(false); // Solus, del Dragón
    jugador(estado).oro = 1_000_000;
    comprar(estado, 'H22'); // Pirita
    expect(conoceHabilidad(estado, 'H22')).toBe(true);
    expect(estado.habilidadesConocidas).toContain('H22');
    jugador(estado).nivelOjeadores = OJEO_MAXIMO;
    expect(conoceHabilidad(estado, 'H08')).toBe(true);
  });

  it('una vez fichado, se sigue conociendo aunque se vaya', () => {
    const estado = partida();
    apuntarConocidas(estado);
    const j = jugador(estado);
    j.plantilla = j.plantilla.filter((id) => id !== 'H07');
    estado.gremios.dragon!.plantilla.push('H07');
    expect(conoceHabilidad(estado, 'H07')).toBe(true);
  });
});

describe('efectos visibles de las habilidades en misión', () => {
  it('dice cuánto multiplica una habilidad de poder y avisa de las que perjudican', () => {
    const estado = partida();
    const goblin = estado.heroes.H07!;
    const efectos = efectosEnMision(ctx(estado, [goblin]));
    expect(efectos.some((e) => e.texto.includes('×2,5') && e.tono === 'bueno')).toBe(true);
    const alaim = fichar(estado, 'jugador', heroe({ id: 'al', catalogo: 'H62', habilidad: 'godsHateMe' }));
    const otro = fichar(estado, 'jugador', heroe({ id: 'o' }));
    const malos = efectosEnMision(ctx(estado, [alaim, otro], { rango: 'medio', equipo: 2 }));
    expect(malos.some((e) => e.tono === 'malo' && e.texto.includes('lesionados'))).toBe(true);
  });

  it('Tokopi anula y lo dice', () => {
    const estado = partida();
    const t = fichar(estado, 'jugador', heroe({ id: 't', catalogo: 'H52', habilidad: 'silencio' }));
    const g = estado.heroes.H07!;
    const efectos = efectosEnMision(ctx(estado, [t, g], { equipo: 2 }));
    expect(efectos.find((e) => e.heroeId === 'H07')?.texto).toMatch(/anulada/);
  });
});

describe('arreglos de impacto', () => {
  it('dos caracteres incompatibles pueden chocar en misión: así nacen las malas relaciones', () => {
    const estado = partida();
    const a = fichar(estado, 'jugador', heroe({ id: 'a', rasgos: ['orgulloso'] }));
    const b = fichar(estado, 'jugador', heroe({ id: 'b', rasgos: ['orgulloso'] }));
    expect(choque(a, b)).toBeTruthy();
    trasMision(estado, siempre, [a, b], true, [], () => null);
    expect(afinidad(estado, 'a', 'b')).toBe(S.acontecimientos.misionJuntos.afinidad + S.choques.afinidad);
    const c = fichar(estado, 'jugador', heroe({ id: 'c', rasgos: ['amable'] }));
    expect(choque(a, c)).toBeNull();
  });

  it('el Segador vuelve a ser una amenaza cuando alguien le cae mal', () => {
    const estado = partida();
    fichar(estado, 'jugador', heroe({ id: 's', habilidad: 'sacrificio' }));
    fichar(estado, 'jugador', heroe({ id: 'v' }));
    cambiar(estado, 's', 'v', { afinidad: -30 });
    cadaSemana(estado, new Azar(1));
    expect(estado.heroes.v).toBeUndefined();
  });

  it('Zancadilla quita puntos de temporada al gremio de delante', () => {
    const estado = partida();
    fichar(estado, 'jugador', heroe({ id: 'z', habilidad: 'malaJugada' }));
    const delante = estado.ranking.find((f) => f.puesto === 4)!.gremioId;
    estado.gremios[delante]!.puntosTemporada = 20;
    estado.gremios[delante]!.plantilla = estado.gremios[delante]!.plantilla.filter((id) => estado.heroes[id]!.habilidad !== 'guardia');
    cadaSemana(estado, new Azar(2));
    expect(estado.gremios[delante]!.puntosTemporada).toBe(20 - balance.habilidades.malaJugada.puntos);
  });
});
