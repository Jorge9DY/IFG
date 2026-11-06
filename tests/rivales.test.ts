import { describe, expect, it } from 'vitest';
import { Azar } from '../src/motor/azar';
import { gremio, heroesDe, jugador, type EstadoJuego } from '../src/motor/estado';
import { generarHeroe, valorMercado } from '../src/motor/heroes';
import { crearPartida, enviarMision } from '../src/motor/partida';
import {
  accionesTemporada,
  ofertaAnualCorona,
  pujadoresRivales,
  reiniciarAccionesTemporada,
  sabotajesColmillo,
} from '../src/motor/rivales';
import balance from '../src/datos/balance.json';

/** Generador que siempre "acierta" las tiradas de probabilidad. */
class AzarSiempre extends Azar {
  override probabilidad(): boolean {
    return true;
  }
}
/** Generador que nunca acierta las tiradas de probabilidad. */
class AzarNunca extends Azar {
  override probabilidad(): boolean {
    return false;
  }
}

function partidaConEquipo(semilla = 21): EstadoJuego {
  const estado = crearPartida({ nombre: 'Test', semilla });
  const azar = new Azar(99);
  estado.partida.semana = balance.sabotajes.semanaInicioSabotajes;
  const j = jugador(estado);
  for (let i = 0; i < 3; i++) {
    const h = generarHeroe(azar, `extra_${i}`, 'C');
    h.contrato = { gremio: j.id, salario: 50, temporadasRestantes: 1, clausula: 1000 };
    estado.heroes[h.id] = h;
    j.plantilla.push(h.id);
  }
  return estado;
}

describe('Veto del Duque', () => {
  it('da +15 a la Corona una sola vez por temporada y solo por héroes de rango B o superior', () => {
    const estado = crearPartida({ nombre: 'Test', semilla: 4 });
    const azar = new Azar(1);
    const debil = generarHeroe(azar, 'debil', 'C');
    const fuerte = generarHeroe(azar, 'fuerte', 'A');

    expect(pujadoresRivales(estado, azar, debil, ['corona'], undefined)[0]!.contexto.bonusExtra).toBe(0);
    expect(accionesTemporada(estado).vetoUsado).toBe(false);

    expect(pujadoresRivales(estado, azar, fuerte, ['corona'], undefined)[0]!.contexto.bonusExtra).toBe(balance.sabotajes.vetoDuque);
    expect(pujadoresRivales(estado, azar, fuerte, ['corona'], undefined)[0]!.contexto.bonusExtra).toBe(0);

    reiniciarAccionesTemporada(estado);
    expect(pujadoresRivales(estado, azar, fuerte, ['corona'], undefined)[0]!.contexto.bonusExtra).toBe(balance.sabotajes.vetoDuque);
  });
});

describe('Espionaje de los Tejedores', () => {
  it('con un Explorador en plantilla, su primera oferta supera la del jugador', () => {
    const estado = crearPartida({ nombre: 'Test', semilla: 4 });
    const azar = new Azar(2);
    const espia = generarHeroe(azar, 'espia', 'B', { clase: 'Explorador' });
    estado.heroes[espia.id] = espia;
    gremio(estado, 'tejedores').plantilla.push(espia.id);
    const objetivo = generarHeroe(azar, 'objetivo', 'D');
    const ofertaJugador = { prima: 2000, salario: 30, duracion: 2 };
    const [tejedores] = pujadoresRivales(estado, azar, objetivo, ['tejedores'], ofertaJugador);
    expect(tejedores!.pujar(1, null)!.prima).toBeGreaterThanOrEqual(Math.round(2000 * balance.sabotajes.primaEspionaje));
  });

  it('sin Explorador puja con normalidad', () => {
    const estado = crearPartida({ nombre: 'Test', semilla: 4 });
    const t = gremio(estado, 'tejedores');
    t.plantilla = t.plantilla.filter((id) => estado.heroes[id]?.clase !== 'Explorador');
    const objetivo = generarHeroe(new Azar(3), 'objetivo', 'D');
    const [tejedores] = pujadoresRivales(estado, new Azar(3), objetivo, ['tejedores'], { prima: 50000, salario: 30, duracion: 2 });
    expect(tejedores!.pujar(1, null)!.prima).toBeLessThan(50000);
  });
});

describe('Sabotajes del Colmillo Carmesí', () => {
  it('el rumor resta 5 de reputación al jugador', () => {
    const estado = partidaConEquipo();
    sabotajesColmillo(estado, new AzarSiempre(1));
    expect(jugador(estado).reputacion).toBe(40 - balance.sabotajes.rumorReputacion);
    expect(estado.registro.some((e) => e.tipo === 'sabotaje')).toBe(true);
  });

  it('con reputación mayor que 70 el rumor se descubre y lo paga el Colmillo', () => {
    const estado = partidaConEquipo();
    jugador(estado).reputacion = 75;
    const antes = gremio(estado, 'colmillo').reputacion;
    sabotajesColmillo(estado, new AzarSiempre(1));
    expect(jugador(estado).reputacion).toBe(75);
    expect(gremio(estado, 'colmillo').reputacion).toBe(antes - balance.sabotajes.rumorReputacion);
  });

  it('el robo quita una misión enviada esta semana y libera al equipo', () => {
    const estado = partidaConEquipo();
    const equipo = heroesDe(estado, estado.jugadorId).slice(0, 3);
    enviarMision(estado, estado.tablon[0]!.id, equipo.map((h) => ({ heroeId: h.id, posicion: 'vanguardia' as const })));
    expect(estado.enCurso).toHaveLength(1);
    sabotajesColmillo(estado, new AzarSiempre(1));
    expect(estado.enCurso).toHaveLength(0);
    for (const h of equipo) expect(h.estado).toBe('disponible');
  });

  it('antes de la semana 5 el Colmillo no sabotea', () => {
    const estado = partidaConEquipo();
    estado.partida.semana = 2;
    sabotajesColmillo(estado, new AzarSiempre(1));
    expect(jugador(estado).reputacion).toBe(40);
  });

  it('sin suerte no pasa nada', () => {
    const estado = partidaConEquipo();
    const equipo = heroesDe(estado, estado.jugadorId).slice(0, 3);
    enviarMision(estado, estado.tablon[0]!.id, equipo.map((h) => ({ heroeId: h.id, posicion: 'vanguardia' as const })));
    sabotajesColmillo(estado, new AzarNunca(1));
    expect(estado.enCurso).toHaveLength(1);
    expect(jugador(estado).reputacion).toBe(40);
  });
});

describe('Oferta anual de la Corona', () => {
  it('llega en la semana 10, una vez, por el héroe más valioso (nunca Elara) al 130% de su valor', () => {
    const estado = partidaConEquipo();
    estado.partida.semana = 1;
    ofertaAnualCorona(estado);
    expect(estado.ofertas).toHaveLength(0);

    estado.partida.semana = balance.sabotajes.semanaOfertaCorona;
    ofertaAnualCorona(estado);
    expect(estado.ofertas).toHaveLength(1);
    const oferta = estado.ofertas[0]!;
    expect(oferta.compradorId).toBe('corona');
    expect(oferta.heroeId).not.toBe('h_000_elara');
    const mejor = Math.max(...heroesDe(estado, estado.jugadorId).filter((h) => h.id !== 'h_000_elara').map(valorMercado));
    expect(oferta.precio).toBe(Math.round(mejor * balance.sabotajes.ofertaCoronaFactor));

    ofertaAnualCorona(estado);
    expect(estado.ofertas).toHaveLength(1);
  });
});
