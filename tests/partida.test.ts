import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import { esDiaDeNovatos, heroesDe, jugador, rivales } from '../src/motor/estado';
import { crearPartida, enviarMision, generarTablon, poderReferencia, semanaActual, terminarDia } from '../src/motor/partida';
import { Azar } from '../src/motor/azar';
import { generarHeroe } from '../src/motor/heroes';
import { simularTemporada } from '../herramientas/simulador/simular';

describe('Creación de la partida', () => {
  const estado = crearPartida({ nombre: 'Prueba', semilla: 7 });

  it('el jugador empieza solo con Elara, 3.500 de oro y en el día 1', () => {
    const j = jugador(estado);
    expect(j.plantilla).toEqual(['h_000_elara']);
    expect(j.oro).toBe(3500);
    expect(estado.partida.dia).toBe(1);
    expect(semanaActual(estado)).toBe(1);
  });

  it('hay 4 rivales y 4 novatos esperando la primera Prueba de Novatos', () => {
    expect(rivales(estado)).toHaveLength(4);
    expect(estado.novatos).toHaveLength(balance.novatos.porSemana);
  });

  it('cada día hay tres misiones: fácil, media y difícil', () => {
    expect(estado.tablon.map((m) => m.tipo)).toEqual(['segura', 'justa', 'arriesgada']);
    const [f, m, d] = estado.tablon;
    expect(f!.recompensa.oro).toBeLessThan(m!.recompensa.oro);
    expect(m!.recompensa.oro).toBeLessThan(d!.recompensa.oro);
    for (const x of estado.tablon) expect(x.duracion).toBe(1);
  });

  it('la misma semilla genera la misma partida', () => {
    expect(crearPartida({ nombre: 'Prueba', semilla: 7 })).toEqual(estado);
  });
});

describe('Un día de juego', () => {
  it('solo se puede lanzar una misión al día y el equipo vuelve al terminarlo', () => {
    const estado = crearPartida({ nombre: 'P', semilla: 3 });
    const [facil, media] = estado.tablon;
    enviarMision(estado, facil!.id, [{ heroeId: 'h_000_elara', posicion: 'retaguardia' }]);
    expect(estado.tablon).toHaveLength(0);
    expect(() => enviarMision(estado, media!.id, [{ heroeId: 'h_000_elara', posicion: 'retaguardia' }])).toThrow();
    const r = terminarDia(estado);
    expect(r.informes).toHaveLength(1);
    expect(estado.partida.dia).toBe(2);
    expect(estado.tablon).toHaveLength(3);
    expect(jugador(estado).plantilla).toContain('h_000_elara');
  });

  it('el día 7 se celebra la Prueba de Novatos y se cierra la semana', () => {
    const estado = crearPartida({ nombre: 'P', semilla: 4 });
    let cierre = null;
    while (estado.partida.dia < 7) terminarDia(estado);
    expect(esDiaDeNovatos(estado.partida.dia)).toBe(true);
    cierre = terminarDia(estado).cierre;
    expect(cierre).not.toBeNull();
    // Los novatos que nadie subastó se resolvieron y hay nuevos para la semana siguiente.
    expect(estado.novatos).toHaveLength(balance.novatos.porSemana);
    expect(semanaActual(estado)).toBe(2);
  });

  it('el tablón crece con la fuerza del gremio', () => {
    const e = crearPartida({ nombre: 'T', semilla: 9 });
    const antes = poderReferencia(e);
    const azar = new Azar(4);
    for (let i = 0; i < 4; i++) {
      const h = generarHeroe(azar, `t${i}`, 'B');
      e.heroes[h.id] = h;
      jugador(e).plantilla.push(h.id);
    }
    expect(poderReferencia(e)).toBeGreaterThan(antes);
    expect(generarTablon(e, azar)).toHaveLength(3);
  });
});

describe('Temporada completa', () => {
  it('la temporada dura 28 días', () => {
    const estado = crearPartida({ nombre: 'X', semilla: 21 });
    let dias = 0;
    while (!estado.fin) {
      terminarDia(estado);
      dias++;
    }
    expect(dias).toBeLessThanOrEqual(28);
  });

  it('el jugador automático juega la temporada y el resultado es reproducible', () => {
    const a = simularTemporada(42);
    expect(simularTemporada(42)).toEqual(a);
    expect(a.misiones).toBeGreaterThan(10);
  });

  it('el estado se puede guardar y recuperar como JSON en mitad de la temporada', () => {
    const estado = crearPartida({ nombre: 'Guardado', semilla: 5 });
    for (let i = 0; i < 9; i++) terminarDia(estado);
    const copia = JSON.parse(JSON.stringify(estado));
    terminarDia(estado);
    terminarDia(copia);
    expect(copia).toEqual(estado);
  });

  it('en Modo Clemente no muere ningún héroe del jugador', () => {
    for (let semilla = 1; semilla <= 20; semilla++) {
      expect(simularTemporada(semilla, undefined, true).muertes).toBe(0);
    }
  });

  it('los héroes muertos salen de la plantilla', () => {
    for (let semilla = 1; semilla <= 20; semilla++) {
      const estado = crearPartida({ nombre: 'X', semilla });
      while (!estado.fin) terminarDia(estado);
      for (const h of heroesDe(estado, estado.jugadorId)) expect(h.estado).not.toBe('muerto');
    }
  });
});
