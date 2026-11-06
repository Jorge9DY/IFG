import { describe, expect, it } from 'vitest';
import { Azar } from '../src/motor/azar';
import { gremio, heroesDe, jugador, type EstadoJuego } from '../src/motor/estado';
import { generarHeroe, valorMercado } from '../src/motor/heroes';
import { crearPartida, enviarMision, terminarSemana } from '../src/motor/partida';
import { construirMejora, infoMejoras, multiplicadorXp, semanasDeBaja } from '../src/motor/sede';
import {
  condicionesCesion,
  devolverCesiones,
  esCedido,
  pagarClausula,
  pedirCesion,
  repartirOroCesiones,
} from '../src/motor/traspasos';
import { ponerEnVenta } from '../src/motor/ventas';
import balance from '../src/datos/balance.json';

function partidaRica(semilla = 8): EstadoJuego {
  const estado = crearPartida({ nombre: 'Test', semilla });
  jugador(estado).oro = 50000;
  return estado;
}

/** Mete en un rival un héroe controlado y lo devuelve. */
function heroeRival(estado: EstadoJuego, rivalId: string, rango: 'D' | 'C' | 'B' | 'A' = 'C') {
  const h = generarHeroe(new Azar(31), `rival_${rivalId}_${rango}`, rango);
  h.rasgos = [];
  h.contrato = { gremio: rivalId, salario: 60, temporadasRestantes: 2, clausula: Math.round(valorMercado(h) * 1.5) };
  estado.heroes[h.id] = h;
  gremio(estado, rivalId).plantilla.push(h.id);
  return h;
}

describe('Mejoras de la sede', () => {
  it('cuestan lo que dice el diseño y se construyen una vez', () => {
    const estado = partidaRica();
    construirMejora(estado, 'Enfermeria');
    expect(jugador(estado).oro).toBe(50000 - balance.mejoras.Enfermeria.coste);
    expect(() => construirMejora(estado, 'Enfermeria')).toThrow('Ya construida');
  });

  it('Dormitorios II exige Dormitorios I; amplían la plantilla a 10 y a 15', () => {
    const estado = partidaRica();
    expect(() => construirMejora(estado, 'Dormitorios II')).toThrow('Necesita');
    construirMejora(estado, 'Dormitorios I');
    expect(jugador(estado).plantillaMax).toBe(10);
    construirMejora(estado, 'Dormitorios II');
    expect(jugador(estado).plantillaMax).toBe(15);
  });

  it('sin oro no se puede construir', () => {
    const estado = crearPartida({ nombre: 'Test', semilla: 8 });
    const info = infoMejoras(estado).find((m) => m.mejora === 'Salon de banquetes')!;
    expect(info.bloqueo).toBe('No hay oro suficiente');
  });

  it('Sala de entrenamiento +20% de XP; Enfermería acorta las bajas; Banquetes +5 de prestigio', () => {
    const estado = partidaRica();
    expect(multiplicadorXp(estado)).toBe(1);
    expect(semanasDeBaja(estado, 3)).toBe(3);
    construirMejora(estado, 'Sala de entrenamiento');
    construirMejora(estado, 'Enfermeria');
    expect(multiplicadorXp(estado)).toBe(1.2);
    expect(semanasDeBaja(estado, 3)).toBe(2);
    expect(semanasDeBaja(estado, 1)).toBe(1);
    const antes = jugador(estado).prestigio;
    construirMejora(estado, 'Salon de banquetes');
    expect(jugador(estado).prestigio).toBe(antes + 5);
  });

  it('la Biblioteca arcana revela el potencial de la plantilla', () => {
    const estado = partidaRica();
    const h = heroeRival(estado, 'alba', 'C');
    pedirCesion(estado, h.id, 4);
    h.potencialVisible = false;
    construirMejora(estado, 'Biblioteca arcana');
    expect(h.potencialVisible).toBe(true);
  });
});

describe('Cláusula de rescisión', () => {
  it('ficha al héroe si su puntuación con el jugador es al menos 60 y paga al rival', () => {
    const estado = partidaRica();
    const h = heroeRival(estado, 'tejedores', 'D');
    const oroRival = gremio(estado, 'tejedores').oro;
    const clausula = h.contrato!.clausula;
    expect(pagarClausula(estado, h.id)).toBe('fichado');
    expect(jugador(estado).plantilla).toContain(h.id);
    expect(gremio(estado, 'tejedores').plantilla).not.toContain(h.id);
    expect(gremio(estado, 'tejedores').oro).toBe(oroRival + clausula);
    expect(jugador(estado).oro).toBe(50000 - clausula);
    expect(h.contrato!.gremio).toBe('llama');
  });

  it('si la puntuación no llega a 60, el héroe se niega y no se cobra nada', () => {
    const estado = partidaRica();
    const h = heroeRival(estado, 'corona', 'C');
    h.vinculos = [];
    h.rasgos = ['Ambicioso'];
    expect(pagarClausula(estado, h.id)).toBe('se niega');
    expect(jugador(estado).oro).toBe(50000);
    expect(gremio(estado, 'corona').plantilla).toContain(h.id);
  });

  it('no se puede pagar sin oro suficiente', () => {
    const estado = crearPartida({ nombre: 'Test', semilla: 8 });
    const h = heroeRival(estado, 'corona', 'A');
    expect(() => pagarClausula(estado, h.id)).toThrow('La cláusula cuesta');
  });
});

describe('Cesiones', () => {
  it('cuesta el 30% del valor, el héroe juega con el jugador y no se puede vender', () => {
    const estado = partidaRica();
    const h = heroeRival(estado, 'colmillo', 'C');
    const { coste } = condicionesCesion(estado, h.id);
    expect(coste).toBe(Math.round(valorMercado(h) * 0.3));
    pedirCesion(estado, h.id, 4);
    expect(jugador(estado).oro).toBe(50000 - coste);
    expect(esCedido(estado, h.id)).toBe(true);
    expect(() => ponerEnVenta(estado, h.id, 100)).toThrow('cedido');
  });

  it('nadie cede héroes de rango A o S (salvo el Alba con reputación 70 o más)', () => {
    const estado = partidaRica();
    const a = heroeRival(estado, 'corona', 'A');
    expect(condicionesCesion(estado, a.id).bloqueo).not.toBeNull();
    const b = heroeRival(estado, 'alba', 'A');
    expect(condicionesCesion(estado, b.id).bloqueo).not.toBeNull();
    jugador(estado).reputacion = 70;
    expect(condicionesCesion(estado, b.id).bloqueo).toBeNull();
  });

  it('el gremio dueño cobra el 20% del oro de las misiones del cedido', () => {
    const estado = partidaRica();
    const h = heroeRival(estado, 'colmillo', 'C');
    pedirCesion(estado, h.id, 4);
    const oroJugador = jugador(estado).oro;
    const oroRival = gremio(estado, 'colmillo').oro;
    expect(repartirOroCesiones(estado, [h.id, 'otro'], 1000)).toBe(200);
    expect(jugador(estado).oro).toBe(oroJugador - 200);
    expect(gremio(estado, 'colmillo').oro).toBe(oroRival + 200);
    expect(repartirOroCesiones(estado, ['otro'], 1000)).toBe(0);
  });

  it('vuelve a su gremio al terminar el plazo, pero no a mitad de una misión', () => {
    const estado = partidaRica();
    const h = heroeRival(estado, 'colmillo', 'C');
    pedirCesion(estado, h.id, 4);
    estado.partida.semana += 3;
    h.estado = 'en mision';
    devolverCesiones(estado);
    expect(jugador(estado).plantilla).toContain(h.id);
    h.estado = 'disponible';
    devolverCesiones(estado);
    expect(jugador(estado).plantilla).not.toContain(h.id);
    expect(gremio(estado, 'colmillo').plantilla).toContain(h.id);
  });

  it('una temporada con cesión se juega entera sin errores', () => {
    const estado = partidaRica(12);
    const h = heroeRival(estado, 'alba', 'C');
    pedirCesion(estado, h.id, 6);
    const equipo = heroesDe(estado, estado.jugadorId).slice(0, 3);
    if (equipo.length === 3 && estado.tablon[0]) {
      enviarMision(estado, estado.tablon[0].id, equipo.map((x) => ({ heroeId: x.id, posicion: 'vanguardia' as const })));
    }
    while (!estado.fin) terminarSemana(estado);
    expect(esCedido(estado, h.id)).toBe(false);
  });
});
