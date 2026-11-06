import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import { sueldosDe } from '../src/motor/economia';
import { heroesDe, jugador, puesto } from '../src/motor/estado';
import { motivoNoPujar } from '../src/motor/subasta';
import { crearPartida, finalizarDia, lanzarMision, motivoNoLanzar, pujarNovato, siguienteCandidato, terminarPrueba } from '../src/motor/partida';
import { partida } from './fabrica';

/** Finaliza días (y Pruebas, retirándose de todo) hasta llegar al día indicado. */
function avanzarHasta(estado: ReturnType<typeof partida>, dia: number): void {
  while (estado.dia < dia) {
    const r = finalizarDia(estado);
    if (r.prueba) terminarPrueba(estado);
  }
}

describe('partida', () => {
  it('empieza con un gremio miserable: último, poco oro y pocos héroes', () => {
    const estado = partida();
    const j = jugador(estado);
    expect(j.oro).toBe(balance.jugador.oro);
    expect(j.plantilla).toHaveLength(balance.jugador.heroes);
    expect(puesto(estado, j.id)).toBe(5);
    expect(estado.tablon).toHaveLength(3);
    expect(estado.reclutas).toHaveLength(balance.reclutas.porSemana);
  });

  it('es determinista y serializable', () => {
    const a = crearPartida({ semilla: 42 });
    const b = crearPartida({ semilla: 42 });
    avanzarHasta(a, 10);
    avanzarHasta(b, 10);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });

  it('se pueden lanzar varias misiones el mismo día si hay héroes libres', () => {
    const estado = partida();
    const [h1, h2, h3] = jugador(estado).plantilla;
    const [bajo, medio] = estado.tablon;
    lanzarMision(estado, bajo!.id, [h1!]);
    lanzarMision(estado, medio!.id, [h2!, h3!]);
    expect(estado.tablon).toHaveLength(1);
    expect(heroesDe(estado, 'jugador').every((h) => h.estado === 'en mision')).toBe(true);
  });

  it('exige el tamaño de equipo de cada misión y héroes libres', () => {
    const estado = partida();
    const [h1, h2] = jugador(estado).plantilla;
    const [bajo, medio] = estado.tablon;
    expect(motivoNoLanzar(estado, medio!.id, [h1!])).toMatch(/2 héroes/);
    lanzarMision(estado, bajo!.id, [h1!]);
    expect(motivoNoLanzar(estado, medio!.id, [h1!, h2!])).toMatch(/no está disponible/);
  });

  it('los enviados vuelven al terminar la duración de la misión', () => {
    const estado = partida();
    const [h1, h2] = jugador(estado).plantilla;
    const medio = estado.tablon[1]!;
    lanzarMision(estado, medio.id, [h1!, h2!]);
    const oro = jugador(estado).oro;
    const dia1 = finalizarDia(estado);
    expect(dia1.informes).toHaveLength(0);
    expect(estado.heroes[h1!]!.estado).toBe('en mision');
    const dia2 = finalizarDia(estado);
    expect(dia2.informes).toHaveLength(1);
    expect(jugador(estado).oro).toBe(oro + dia2.informes[0]!.oro);
    expect(estado.heroes[h1!]!.estado).not.toBe('en mision');
  });

  it('el tablón se renueva cada día', () => {
    const estado = partida();
    const antes = estado.tablon.map((m) => m.id);
    finalizarDia(estado);
    expect(estado.tablon.map((m) => m.id)).not.toEqual(antes);
    expect(estado.tablon).toHaveLength(3);
  });

  it('el día 7 se pagan los sueldos y después empieza la Prueba de los Novatos', () => {
    const estado = partida();
    avanzarHasta(estado, 7);
    const oro = jugador(estado).oro;
    const sueldos = sueldosDe(estado, 'jugador');
    const r = finalizarDia(estado);
    expect(r.sueldos?.total).toBe(sueldos);
    expect(jugador(estado).oro).toBe(oro - sueldos);
    expect(r.prueba).toBe(true);
    expect(estado.fase).toBe('prueba');
    expect(estado.prueba?.pendientes).toHaveLength(balance.novatos.porPrueba);
    expect(() => finalizarDia(estado)).toThrow();
  });

  it('al terminar la Prueba se actualiza el ranking y empieza el día 8 con reclutas nuevos', () => {
    const estado = partida();
    avanzarHasta(estado, 7);
    finalizarDia(estado);
    const reclutas = [...estado.reclutas];
    const semana = terminarPrueba(estado);
    expect(estado.dia).toBe(8);
    expect(estado.fase).toBe('gestion');
    expect(semana.ranking).toHaveLength(5);
    expect(semana.temporada).toBeNull();
    expect(estado.reclutas).not.toEqual(reclutas);
    // Los novatos que nadie fichó desaparecen.
    const fichados = Object.values(estado.gremios).flatMap((g) => g.plantilla);
    for (const id of Object.keys(estado.heroes)) expect(fichados.includes(id) || estado.reclutas.includes(id)).toBe(true);
  });

  it('el jugador puede fichar un novato pujando por turnos', () => {
    const estado = partida(3);
    avanzarHasta(estado, 7);
    finalizarDia(estado);
    jugador(estado).oro = 1_000_000;
    let fichados = 0;
    while (siguienteCandidato(estado)) {
      const s = estado.prueba!.subasta!;
      while (!s.terminada) pujarNovato(estado, motivoNoPujar(estado, s) === null ? 'pujar' : 'retirarse');
      if (s.lider === 'jugador') fichados++;
    }
    expect(fichados).toBeGreaterThan(0);
    expect(estado.prueba!.resultados).toHaveLength(balance.novatos.porPrueba);
    terminarPrueba(estado);
  });

  it('cada 28 días se cierra la temporada y se reparte el premio según la posición', () => {
    const estado = partida();
    avanzarHasta(estado, 28);
    finalizarDia(estado);
    // Primero se resuelven las subastas (los rivales pagan) y luego se reparte el premio.
    while (siguienteCandidato(estado)) pujarNovato(estado, 'retirarse');
    const oros = Object.fromEntries(Object.values(estado.gremios).map((g) => [g.id, g.oro]));
    const semana = terminarPrueba(estado);
    expect(semana.temporada?.numero).toBe(1);
    for (const fila of semana.ranking) {
      expect(estado.gremios[fila.gremioId]!.oro).toBe((oros[fila.gremioId] ?? 0) + (balance.temporada.premios[fila.puesto - 1] ?? 0));
    }
    expect(estado.dia).toBe(29);
  });
});
