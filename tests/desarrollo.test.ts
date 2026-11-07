import { describe, expect, it } from 'vitest';
import datos from '../src/datos/desarrollo.json';
import { Azar } from '../src/motor/azar';
import { bono, bonificaciones, decaerPuntos, modificadoresMision, nivelEspecializacion, sumarPuntos } from '../src/motor/desarrollo';
import { jugador } from '../src/motor/estado';
import {
  asignarTrabajador, construirOMejorar, costeSiguienteNivel, mantenimientoSemanal, motivoNoAsignar, produccionCon, produccionDiaria, retirarTrabajador,
} from '../src/motor/establecimientos';
import {
  avanzarInvestigaciones, costeProyecto, diasEstimados, disponibles, iniciarInvestigacion, motivoNoElixir, motivoNoIniciar, progresoCon, usarElixir,
} from '../src/motor/investigacion';
import { letraDe } from '../src/motor/heroes';
import { finalizarDia } from '../src/motor/partida';
import { prestigio } from '../src/motor/ranking';
import { celebrarTorneo } from '../src/motor/torneo';
import { fichar, heroe, partida } from './fabrica';

const U = datos.niveles.umbral;

function rico() {
  const estado = partida();
  jugador(estado).oro = 1_000_000;
  return estado;
}

describe('ramas de desarrollo y especialización emergente', () => {
  it('sin desarrollo no hay especialización; al llegar al primer umbral, la rama con más puntos domina', () => {
    const estado = partida();
    expect(estado.desarrollo.dominante).toBeNull();
    sumarPuntos(estado, 'economico', U[0]! - 1);
    expect(estado.desarrollo.dominante).toBeNull();
    sumarPuntos(estado, 'economico', 1);
    expect(estado.desarrollo.dominante).toBe('economico');
    expect(nivelEspecializacion(estado)).toBe(1);
  });

  it('una inversión aislada no cambia la rama dominante: hace falta superarla con margen', () => {
    const estado = partida();
    sumarPuntos(estado, 'militar', 40);
    sumarPuntos(estado, 'economico', 41);
    expect(estado.desarrollo.dominante).toBe('militar');
    sumarPuntos(estado, 'economico', 10);
    expect(estado.desarrollo.dominante).toBe('economico');
  });

  it('los puntos pierden peso cada semana', () => {
    const estado = partida();
    sumarPuntos(estado, 'militar', 100);
    decaerPuntos(estado);
    expect(estado.desarrollo.puntos.militar).toBe(100 * datos.puntos.decaimientoSemanal);
  });

  it('solo la rama dominante da bonificaciones, y más cuanto más nivel', () => {
    const estado = partida();
    sumarPuntos(estado, 'militar', U[2]!);
    expect(bonificaciones(estado)).toHaveLength(3);
    const m = modificadoresMision(estado, 'jugador');
    expect(m.oro).toBeGreaterThan(1);
    expect(m.lesion).toBeLessThan(1);
    expect(m.exito).toBeGreaterThan(0);
    expect(bono(estado, 'produccion')).toBe(0);
    expect(modificadoresMision(estado, 'corona')).toEqual({ oro: 1, lesion: 1, exito: 0, experiencia: 1 });
  });

  it('el oro de las misiones con éxito suma desarrollo militar', () => {
    const estado = partida();
    const [a] = jugador(estado).plantilla;
    estado.heroes[a!]!.poder = 90;
    const bajo = estado.tablon.find((m) => m.rango === 'bajo')!;
    estado.enCurso.push({ mision: bajo, gremioId: 'jugador', equipo: [a!], diaVuelta: estado.dia });
    estado.heroes[a!]!.estado = 'en mision';
    const r = finalizarDia(estado);
    if (r.informes[0]?.exito) expect(estado.desarrollo.puntos.militar).toBeGreaterThan(0);
  });
});

describe('establecimientos (rama económica)', () => {
  it('se construyen y mejoran con oro, dan prestigio y desarrollo económico', () => {
    const estado = rico();
    const antes = prestigio(jugador(estado));
    construirOMejorar(estado, 'taller');
    expect(estado.establecimientos).toEqual([{ tipo: 'taller', nivel: 1, trabajadores: [] }]);
    expect(estado.desarrollo.puntos.economico).toBeGreaterThan(0);
    expect(prestigio(jugador(estado))).toBeGreaterThan(antes);
    construirOMejorar(estado, 'taller');
    expect(estado.establecimientos[0]!.nivel).toBe(2);
  });

  it('los héroes asignados quedan ocupados y producen oro cada día; la clase afín rinde más', () => {
    const estado = rico();
    construirOMejorar(estado, 'taller');
    const e = estado.establecimientos[0]!;
    const guerrero = heroe({ id: 'g', clase: 'Guerrero', poder: 40 });
    const mago = heroe({ id: 'm', clase: 'Mago', poder: 40 });
    expect(produccionCon(estado, e, [guerrero])).toBeGreaterThan(produccionCon(estado, e, [mago]));
    const h = fichar(estado, 'jugador', guerrero);
    asignarTrabajador(estado, 'taller', h.id);
    expect(h.estado).toBe('trabajando');
    const oro = jugador(estado).oro;
    const r = finalizarDia(estado);
    expect(r.produccion[0]!.oro).toBe(produccionDiaria(estado, e));
    retirarTrabajador(estado, h.id);
    expect(h.estado).toBe('libre');
  });

  it('cada trabajador extra rinde menos, y los puestos están limitados por nivel', () => {
    const estado = rico();
    construirOMejorar(estado, 'taller');
    construirOMejorar(estado, 'taller');
    const e = estado.establecimientos[0]!;
    const a = heroe({ id: 'a', clase: 'Guerrero', poder: 40 });
    const b = heroe({ id: 'b', clase: 'Guerrero', poder: 40 });
    expect(produccionCon(estado, e, [a, b])).toBeLessThan(2 * produccionCon(estado, e, [a]));
    fichar(estado, 'jugador', a); fichar(estado, 'jugador', b);
    const c = fichar(estado, 'jugador', heroe({ id: 'c', clase: 'Guerrero', poder: 40 }));
    asignarTrabajador(estado, 'taller', a.id);
    asignarTrabajador(estado, 'taller', b.id);
    expect(motivoNoAsignar(estado, 'taller', c.id)).toMatch(/puestos/);
  });

  it('pagan mantenimiento y la especialización económica lo abarata, igual que las mejoras', () => {
    const estado = rico();
    construirOMejorar(estado, 'invernadero');
    const base = mantenimientoSemanal(estado);
    const mejora = costeSiguienteNivel(estado, 'invernadero')!;
    sumarPuntos(estado, 'economico', U[1]!);
    expect(mantenimientoSemanal(estado)).toBeLessThan(base);
    expect(costeSiguienteNivel(estado, 'invernadero')!).toBeLessThan(mejora);
  });
});

describe('investigación', () => {
  it('al principio solo hay proyectos sin requisitos; completar uno desbloquea otros', () => {
    const estado = rico();
    const ids = disponibles(estado).map((p) => p.id);
    expect(ids).toContain('ruinas-sede');
    expect(ids).not.toContain('torre-umbral');
    estado.investigacion.completadas.push('ruinas-sede');
    expect(disponibles(estado).map((p) => p.id)).toContain('torre-umbral');
  });

  it('los investigadores quedan ocupados, avanzan cada día y al terminar se descubre un secreto', () => {
    const estado = rico();
    const h = fichar(estado, 'jugador', heroe({ id: 'sabio', clase: 'Mago', poder: 60 }));
    iniciarInvestigacion(estado, 'ruinas-sede', [h.id]);
    expect(h.estado).toBe('investigando');
    expect(estado.desarrollo.puntos.investigacion).toBeGreaterThan(0);
    const dias = diasEstimados(estado, 'ruinas-sede', [h]);
    let hechas: ReturnType<typeof avanzarInvestigaciones> = [];
    for (let i = 0; i < dias; i++) hechas = avanzarInvestigaciones(estado);
    expect(hechas).toHaveLength(1);
    expect(hechas[0]!.texto).toMatch(/tronos/);
    expect(h.estado).toBe('libre');
    expect(estado.investigacion.completadas).toContain('ruinas-sede');
  });

  it('más investigadores aceleran con rendimiento decreciente, y los magos son los más afines', () => {
    const estado = rico();
    const m = heroe({ id: 'm', clase: 'Mago', poder: 50 });
    const g = heroe({ id: 'g', clase: 'Guerrero', poder: 50 });
    expect(progresoCon(estado, [m])).toBeGreaterThan(progresoCon(estado, [g]));
    const tres = progresoCon(estado, [m, { ...m, id: 'm2' }, { ...m, id: 'm3' }]);
    expect(tres).toBeLessThan(3 * progresoCon(estado, [m]));
    expect(tres).toBeGreaterThan(progresoCon(estado, [m]));
  });

  it('una sola investigación a la vez, con oro e investigadores libres', () => {
    const estado = rico();
    const a = fichar(estado, 'jugador', heroe({ id: 'a', clase: 'Mago' }));
    const b = fichar(estado, 'jugador', heroe({ id: 'b', clase: 'Mago' }));
    iniciarInvestigacion(estado, 'ruinas-sede', [a.id]);
    expect(motivoNoIniciar(estado, 'balsamo', [b.id])).toMatch(/en marcha/);
    jugador(estado).oro = 0;
    expect(costeProyecto(estado, 'balsamo')).toBeGreaterThan(0);
  });

  it('las investigaciones mágicas mejoran al gremio (bálsamo: menos lesiones) y el elixir sube el techo', () => {
    const estado = rico();
    estado.investigacion.completadas.push('balsamo');
    expect(modificadoresMision(estado, 'jugador').lesion).toBeLessThan(1);
    const h = fichar(estado, 'jugador', heroe({ id: 'h', poder: 30, potencial: 40 }));
    expect(motivoNoElixir(estado, h.id)).toMatch(/elixires/);
    estado.objetos.elixires = 1;
    usarElixir(estado, h.id);
    expect(letraDe(h.potencial)).toBe('B');
    expect(estado.objetos.elixires).toBe(0);
  });
});

describe('torneo de fin de temporada', () => {
  it('cada categoría la gana el campeón de más poder y da oro y prestigio', () => {
    const estado = partida();
    const estrella = fichar(estado, 'jugador', heroe({ id: 'estrella', clase: 'Sanador', poder: 100, potencial: 100 }));
    const oro = jugador(estado).oro;
    const antes = prestigio(jugador(estado));
    const combates = celebrarTorneo(estado, new Azar(1));
    const sanador = combates.find((c) => c.categoria === 'Sanador')!;
    expect(sanador.ganador).toBe('jugador');
    expect(sanador.campeones.find((c) => c.gremioId === 'jugador')!.heroeId).toBe(estrella.id);
    expect(combates.find((c) => c.categoria === 'Absoluta')!.ganador).toBe('jugador');
    expect(jugador(estado).oro).toBeGreaterThanOrEqual(oro + 2 * datos.torneo.oroPorCategoria);
    expect(prestigio(jugador(estado))).toBeGreaterThan(antes);
  });
});
