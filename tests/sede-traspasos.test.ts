import { describe, expect, it } from 'vitest';
import { Azar } from '../src/motor/azar';
import { gremio, jugador, type EstadoJuego } from '../src/motor/estado';
import { generarHeroe, valorMercado } from '../src/motor/heroes';
import { crearPartida } from '../src/motor/partida';
import { construirMejora, infoMejoras, multiplicadorXp, semanasDeBaja } from '../src/motor/sede';
import { pagarClausula } from '../src/motor/traspasos';
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
    const h = heroeRival(estado, 'tejedores', 'D');
    expect(pagarClausula(estado, h.id)).toBe('fichado');
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
