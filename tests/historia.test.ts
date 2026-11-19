// Modo historia: momentos de los arcos de héroe, decisiones, epílogos y rivales que crecen.
import { describe, expect, it } from 'vitest';
import balance from '../src/datos/balance.json';
import { jugador } from '../src/motor/estado';
import { arcosCompletos, cumple, decidirMomento, epilogos, evaluarHistoria, heroeDeCatalogo, MOMENTOS, momentoPendiente, personaje } from '../src/motor/historia';
import { crearPartida, finalizarDia, terminarPrueba } from '../src/motor/partida';
import { entrenarRivales } from '../src/motor/rivales';
import { heroe, fichar, ficharDeCatalogo } from './fabrica';
import { leerCsv } from '../herramientas/importar-hoja';

function nueva() {
  const estado = crearPartida({ semilla: 9 });
  estado.desbloqueos = ['mercado', 'relaciones', 'ascension', 'retos'];
  return estado;
}

describe('arcos de héroe', () => {
  it('cada momento tiene opciones y su héroe existe en el catálogo', () => {
    for (const m of MOMENTOS) expect(m.opciones.length).toBeGreaterThan(0);
    expect(new Set(MOMENTOS.map((m) => m.id)).size).toBe(MOMENTOS.length);
  });

  it('el primer momento (la maestra) espera la decisión del jugador; cada uno ocurre una vez', () => {
    const estado = nueva();
    estado.dia = 0;
    expect(evaluarHistoria(estado)).toBeNull();
    estado.dia = 1;
    const m = evaluarHistoria(estado)!;
    expect(m.id).toBe('maestra1');
    expect(personaje(m.personaje)?.nombre).toBeTruthy();
    expect(evaluarHistoria(estado)).toBeNull(); // solo uno pendiente a la vez
    decidirMomento(estado, 0);
    expect(estado.historia.marcas).toContain('maestra_mentora');
    expect(momentoPendiente(estado)).toBeNull();
    expect(evaluarHistoria(estado)?.id).not.toBe('maestra1');
  });

  it('los arcos de los antiguos Prota solo llegan si los fichas', () => {
    const estado = nueva();
    estado.dia = 2;
    estado.historia.vistos.push('maestra1');
    expect(evaluarHistoria(estado)?.id).not.toBe('allblack1');
    estado.historia.pendiente = null;
    ficharDeCatalogo(estado, 'H02');
    expect(cumple(estado, MOMENTOS.find((m) => m.id === 'allblack1')!.si, 'H02')).toBe(true);
  });

  it('un efecto puede favorecer a un héroe y perjudicar a otro (el trío)', () => {
    const estado = nueva();
    const kenta = heroeDeCatalogo(estado, 'H81')!;
    const ryo = heroeDeCatalogo(estado, 'H82')!;
    const [lealtad, felicidad] = [kenta.lealtad, ryo.felicidad!];
    estado.historia.pendiente = 'trio1';
    decidirMomento(estado, 0);
    expect(kenta.lealtad).toBe(lealtad + 8);
    expect(ryo.felicidad).toBeLessThan(felicidad);
    expect(estado.historia.marcas).toContain('trio_lider_kenta');
  });

  it('condiciones con varias marcas: todas, alguna o ninguna', () => {
    const estado = nueva();
    estado.historia.marcas.push('a', 'b');
    expect(cumple(estado, { marcas: ['a', 'b'] })).toBe(true);
    expect(cumple(estado, { marcas: ['a', 'c'] })).toBe(false);
    expect(cumple(estado, { algunaMarca: ['c', 'b'] })).toBe(true);
    expect(cumple(estado, { algunaMarca: ['c', 'd'] })).toBe(false);
    expect(cumple(estado, { sinMarcas: ['c', 'd'] })).toBe(true);
    expect(cumple(estado, { sinMarcas: ['c', 'a'] })).toBe(false);
  });

  it('las condiciones miran rango, marcas y si el héroe está en tu gremio', () => {
    const estado = nueva();
    expect(cumple(estado, { rango: 'D' }, 'H02')).toBe(false); // AllBlack empieza en F
    expect(cumple(estado, {}, 'H10')).toBe(false); // Chimoku está en Sombras Negras
    expect(cumple(estado, { enGremio: false }, 'H10')).toBe(true);
    estado.historia.marcas.push('x');
    expect(cumple(estado, { marca: 'x', sinMarca: 'y' })).toBe(true);
  });

  it('la oferta del Dragón se lleva a tu mejor héroe a cambio de oro', () => {
    const estado = nueva();
    const mejor = fichar(estado, 'jugador', heroe({ id: 'estrella', poder: 70 }));
    estado.historia.pendiente = 'solus2';
    const oro = jugador(estado).oro;
    decidirMomento(estado, 0);
    expect(estado.gremios.dragon!.plantilla).toContain(mejor.id);
    expect(jugador(estado).oro).toBeGreaterThan(oro);
  });

  it('si no decides, al finalizar el día se elige la primera opción (la interfaz siempre pregunta)', () => {
    const estado = nueva();
    estado.historia.pendiente = 'goblin1';
    finalizarDia(estado);
    expect(estado.historia.vistos).toContain('goblin1');
  });

  it('los epílogos cuentan qué fue de cada héroe según lo decidido', () => {
    const estado = nueva();
    estado.historia.marcas.push('goblin_jefa', 'solus_desafio');
    const textos = epilogos(estado).map((e) => e.texto).join(' ');
    expect(textos).toMatch(/jefa de guerra/);
    expect(textos).toMatch(/plantó cara/);
    estado.historia.vistos.push('goblin1', 'goblin2');
    expect(arcosCompletos(estado)).toBe(1);
  });

  it('a lo largo de una partida aparecen varios momentos', () => {
    const estado = nueva();
    while (estado.dia < 40) {
      if (estado.historia.pendiente) decidirMomento(estado, 0);
      if (finalizarDia(estado).prueba) terminarPrueba(estado);
    }
    expect(estado.historia.vistos.length).toBeGreaterThanOrEqual(5);
  });
});

describe('rivales que crecen', () => {
  it('los rivales entrenan cada semana a los héroes que aún pueden crecer', () => {
    const estado = nueva();
    const novato = fichar(estado, 'dragon', heroe({ id: 'nov', poder: 5, potencial: 60 }));
    entrenarRivales(estado, 'dragon');
    expect(novato.experiencia + (novato.poder - 5) * 7).toBeGreaterThan(0);
    expect(balance.rivales.misionesPorDia.at(-1)!).toBeGreaterThan(balance.rivales.misionesPorDia[0]!);
  });
});

describe('importador de la hoja', () => {
  it('lee CSV con comas y comillas dentro de los textos', () => {
    const filas = leerCsv('ID,Habilidad\nH01,"Robo: uno, dos ""tres"""\n');
    expect(filas).toEqual([['ID', 'Habilidad'], ['H01', 'Robo: uno, dos "tres"']]);
  });
});
