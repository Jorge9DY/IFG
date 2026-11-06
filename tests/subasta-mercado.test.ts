import { describe, expect, it } from 'vitest';
import { Azar } from '../src/motor/azar';
import { gremio, heroesDe, jugador, type EstadoJuego } from '../src/motor/estado';
import { generarHeroe, valorMercado } from '../src/motor/heroes';
import { comprar, condicionesCompra, ofertaVenta, vender } from '../src/motor/mercado';
import { crearPartida } from '../src/motor/partida';
import { infoSede, mejorarSede } from '../src/motor/sede';
import { avanzar, cerrarSubasta, crearSubasta, puedePujar, pujar, siguientePujaJugador } from '../src/motor/subasta';
import balance from '../src/datos/balance.json';

/** Generador que nunca acierta las tiradas: los rivales no pujan. */
class AzarNunca extends Azar {
  override probabilidad(): boolean {
    return false;
  }
}
/** Generador que siempre acierta: los rivales pujan en cuanto pueden. */
class AzarSiempre extends Azar {
  override probabilidad(): boolean {
    return true;
  }
}

function conHeroe(estado: EstadoJuego, rango: 'D' | 'C' | 'B' = 'C') {
  const h = generarHeroe(new Azar(8), `mio_${rango}`, rango);
  h.contrato = { gremio: 'llama', salario: 50, temporadasRestantes: 1, clausula: 1000 };
  estado.heroes[h.id] = h;
  jugador(estado).plantilla.push(h.id);
  return h;
}

describe('Prueba de Novatos: subasta con cuenta atrás', () => {
  it('si nadie supera tu puja cuando el reloj llega a cero, el novato es tuyo', () => {
    const estado = crearPartida({ nombre: 'S', semilla: 2 });
    const id = estado.novatos[0]!;
    const s = crearSubasta(estado, new AzarNunca(1), id);
    const precio = siguientePujaJugador(estado, s);
    pujar(estado, s);
    expect(s.lider).toBe('llama');
    avanzar(estado, new AzarNunca(1), s, 30);
    expect(s.terminada).toBe(true);
    const oroAntes = jugador(estado).oro;
    expect(cerrarSubasta(estado, s)).toBe('llama');
    expect(jugador(estado).plantilla).toContain(id);
    expect(jugador(estado).oro).toBe(oroAntes - precio);
    expect(estado.novatos).not.toContain(id);
  });

  it('los rivales suben la puja mientras no pasen de su máximo y cada puja alarga el reloj', () => {
    const estado = crearPartida({ nombre: 'S', semilla: 2 });
    const s = crearSubasta(estado, new Azar(5), estado.novatos[0]!);
    s.maximos = { corona: 100000 };
    s.tiempo = 1;
    avanzar(estado, new AzarSiempre(1), s, 1);
    expect(s.lider).toBe('corona');
    expect(s.tiempo).toBeGreaterThan(0);
    const precio = s.precio;
    avanzar(estado, new AzarSiempre(1), s, 1);
    expect(s.precio).toBe(precio); // ya va ganando: no se puja a sí mismo
  });

  it('no puedes pujar más oro del que tienes', () => {
    const estado = crearPartida({ nombre: 'S', semilla: 2 });
    jugador(estado).oro = 10;
    const s = crearSubasta(estado, new Azar(5), estado.novatos[0]!);
    expect(puedePujar(estado, s)).toBe('No tienes oro suficiente');
  });

  it('un novato con vínculo te prefiere: los rivales necesitan superar tu puja un 20%', () => {
    const estado = crearPartida({ nombre: 'S', semilla: 2 });
    const s = crearSubasta(estado, new Azar(5), estado.novatos[0]!);
    s.prefiereJugador = true;
    pujar(estado, s);
    s.maximos = { corona: Math.round(s.precio * 1.15) };
    avanzar(estado, new AzarSiempre(1), s, 1);
    expect(s.lider).toBe('llama');
  });
});

describe('Mercado', () => {
  it('vender da el 90% del valor al instante', () => {
    const estado = crearPartida({ nombre: 'M', semilla: 6 });
    const h = conHeroe(estado, 'C');
    const oferta = ofertaVenta(estado, h.id)!;
    expect(oferta.precio).toBe(Math.round(valorMercado(h) * balance.venta.factorPrecio));
    const oro = jugador(estado).oro;
    vender(estado, new Azar(1), h.id);
    expect(jugador(estado).oro).toBe(oro + oferta.precio);
    expect(gremio(estado, oferta.compradorId).plantilla).toContain(h.id);
  });

  it('Elara nunca se vende', () => {
    const estado = crearPartida({ nombre: 'M', semilla: 6 });
    expect(ofertaVenta(estado, 'h_000_elara')).toBeNull();
  });

  it('comprar un héroe de otro gremio cuesta su precio y explica por qué no se puede', () => {
    const estado = crearPartida({ nombre: 'M', semilla: 6 });
    jugador(estado).oro = 100000;
    const candidato = heroesDe(estado, 'tejedores').find((h) => condicionesCompra(estado, h.id).bloqueo === null);
    if (candidato) {
      const { precio } = condicionesCompra(estado, candidato.id);
      comprar(estado, candidato.id);
      expect(jugador(estado).plantilla).toContain(candidato.id);
      expect(jugador(estado).oro).toBe(100000 - precio);
    }
    jugador(estado).oro = 0;
    const otro = heroesDe(estado, 'corona')[0]!;
    expect(condicionesCompra(estado, otro.id).bloqueo).toBe('No tienes oro suficiente');
  });
});

describe('Mejorar la sede', () => {
  it('cada nivel da más plazas y prestigio', () => {
    const estado = crearPartida({ nombre: 'G', semilla: 6 });
    jugador(estado).oro = 50000;
    const antes = jugador(estado).prestigio;
    expect(infoSede(estado).nivel).toBe(1);
    mejorarSede(estado);
    expect(jugador(estado).nivelSede).toBe(2);
    expect(jugador(estado).plantillaMax).toBe(balance.sede.plantillaPorNivel[1]);
    expect(jugador(estado).prestigio).toBe(antes + balance.sede.prestigioPorNivel[0]!);
    expect(jugador(estado).oro).toBe(50000 - balance.sede.costeSubir[0]!);
  });

  it('sin oro no se puede mejorar y al máximo tampoco', () => {
    const estado = crearPartida({ nombre: 'G', semilla: 6 });
    jugador(estado).oro = 0;
    expect(infoSede(estado).bloqueo).toBe('No tienes oro suficiente');
    jugador(estado).oro = 1e6;
    while (infoSede(estado).siguiente) mejorarSede(estado);
    expect(infoSede(estado).bloqueo).toBe('La sede ya está al máximo');
  });
});
