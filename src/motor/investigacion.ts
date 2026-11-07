// Rama de investigación (biblia, sección 4.5): proyectos de exploración (descubren secretos del mundo) y mágicos
// (mejoran a los héroes y al gremio). Se pagan al empezar, se les asignan investigadores (que quedan ocupados)
// y avanzan cada día según su poder y su clase, con rendimiento decreciente: un especialista acelera, pero
// muchos investigadores no lo vuelven instantáneo.

import balance from '../datos/balance.json';
import datos from '../datos/desarrollo.json';
import secretos from '../narrativa/secretos.json';
import { bono, sumarPuntos } from './desarrollo';
import { heroe as obtenerHeroe, jugador, registrar, type EstadoJuego, type ProyectoEnCurso } from './estado';
import { indiceLetra, letraDe } from './heroes';
import { LETRAS, type Heroe } from './tipos';

const I = datos.investigacion;

export interface Proyecto {
  id: string;
  tipo: 'exploracion' | 'magia';
  nombre: string;
  texto: string;
  coste: number;
  puntos: number;
  requiere: string[];
  efecto?: Record<string, number>;
  repetible?: boolean;
}

export const PROYECTOS = I.proyectos as Proyecto[];

export function proyecto(id: string): Proyecto {
  const p = PROYECTOS.find((x) => x.id === id);
  if (!p) throw new Error(`No existe la investigación ${id}`);
  return p;
}

export function completada(estado: EstadoJuego, id: string): boolean {
  return estado.investigacion.completadas.includes(id);
}

/** Investigaciones que se pueden empezar ahora (con sus requisitos cumplidos y sin hacer, salvo las repetibles). */
export function disponibles(estado: EstadoJuego): Proyecto[] {
  return PROYECTOS.filter(
    (p) =>
      p.requiere.every((r) => completada(estado, r)) &&
      (p.repetible || !completada(estado, p.id)) &&
      !estado.investigacion.enCurso.some((c) => c.id === p.id),
  );
}

/** Investigaciones aún bloqueadas por sus requisitos (para enseñar qué hay por descubrir). */
export function bloqueadas(estado: EstadoJuego): Proyecto[] {
  return PROYECTOS.filter((p) => !p.requiere.every((r) => completada(estado, r)));
}

export function maxSimultaneos(estado: EstadoJuego): number {
  return I.proyectosSimultaneos + bono(estado, 'proyectosExtra');
}

export function costeProyecto(estado: EstadoJuego, id: string): number {
  return Math.round((proyecto(id).coste * (1 - bono(estado, 'costeProyectos'))) / 50) * 50;
}

/** Puntos de investigación por día con estos investigadores. */
export function progresoCon(estado: EstadoJuego, investigadores: readonly Heroe[]): number {
  const aportes = investigadores
    .map((h) => (h.poder / 10) * ((I.afinidad as Record<string, number>)[h.clase] ?? 1))
    .sort((a, b) => b - a);
  const bruto = aportes.reduce((t, a, i) => t + a * I.rendimientoExtra ** i, 0);
  return Math.round(bruto * (1 + bono(estado, 'progreso')) * 10) / 10;
}

/** Días que tardaría (redondeando hacia arriba) con estos investigadores. */
export function diasEstimados(estado: EstadoJuego, id: string, investigadores: readonly Heroe[], progreso = 0): number {
  const porDia = progresoCon(estado, investigadores);
  if (porDia <= 0) return Infinity;
  return Math.max(1, Math.ceil((proyecto(id).puntos - progreso) / porDia));
}

export function motivoNoIniciar(estado: EstadoJuego, id: string, investigadores: readonly string[]): string | null {
  if (estado.fase !== 'gestion') return 'Ahora no se puede investigar';
  if (!disponibles(estado).some((p) => p.id === id)) return 'Esa investigación no está disponible';
  if (estado.investigacion.enCurso.length >= maxSimultaneos(estado)) return 'Ya tienes una investigación en marcha';
  if (investigadores.length < 1) return 'Elige al menos un investigador';
  if (investigadores.length > I.maxInvestigadores) return `Como mucho ${I.maxInvestigadores} investigadores`;
  if (new Set(investigadores).size !== investigadores.length) return 'Investigador repetido';
  const j = jugador(estado);
  for (const hid of investigadores) {
    if (!j.plantilla.includes(hid)) return 'Ese héroe no es de tu gremio';
    if (obtenerHeroe(estado, hid).estado !== 'libre') return `${obtenerHeroe(estado, hid).nombre} no está libre`;
  }
  if (j.oro < costeProyecto(estado, id)) return 'No tienes oro suficiente';
  return null;
}

/** Paga y empieza una investigación con sus investigadores. Suma puntos de desarrollo de investigación. */
export function iniciarInvestigacion(estado: EstadoJuego, id: string, investigadores: readonly string[]): void {
  const motivo = motivoNoIniciar(estado, id, investigadores);
  if (motivo) throw new Error(motivo);
  const coste = costeProyecto(estado, id);
  jugador(estado).oro -= coste;
  for (const hid of investigadores) obtenerHeroe(estado, hid).estado = 'investigando';
  estado.investigacion.enCurso.push({ id, progreso: 0, investigadores: [...investigadores] });
  sumarPuntos(estado, 'investigacion', coste * datos.puntos.investigacionPorOro);
  registrar(estado, 'mision', `Empiezas a investigar «${proyecto(id).nombre}».`);
}

/** Abandona una investigación: los investigadores quedan libres y el oro no se recupera. */
export function abandonarInvestigacion(estado: EstadoJuego, id: string): void {
  const c = estado.investigacion.enCurso.find((x) => x.id === id);
  if (!c) return;
  liberar(estado, c);
  estado.investigacion.enCurso = estado.investigacion.enCurso.filter((x) => x !== c);
}

function liberar(estado: EstadoJuego, c: ProyectoEnCurso): void {
  for (const hid of c.investigadores) {
    const h = estado.heroes[hid];
    if (h && h.estado === 'investigando') h.estado = 'libre';
  }
}

/** Saca a un héroe de la investigación en la que esté (por ejemplo, si se va del gremio). */
export function retirarInvestigador(estado: EstadoJuego, heroeId: string): void {
  for (const c of estado.investigacion.enCurso) c.investigadores = c.investigadores.filter((id) => id !== heroeId);
}

export interface ResultadoInvestigacion {
  id: string;
  nombre: string;
  tipo: Proyecto['tipo'];
  /** Lo que se descubre (secreto) o lo que se consigue (efecto). */
  texto: string;
}

/** Al finalizar el día, cada investigación avanza; las que se completan dan su recompensa. */
export function avanzarInvestigaciones(estado: EstadoJuego): ResultadoInvestigacion[] {
  const hechas: ResultadoInvestigacion[] = [];
  for (const c of [...estado.investigacion.enCurso]) {
    c.investigadores = c.investigadores.filter((id) => estado.heroes[id]);
    c.progreso += progresoCon(estado, c.investigadores.map((id) => obtenerHeroe(estado, id)));
    const p = proyecto(c.id);
    if (c.progreso < p.puntos) continue;
    liberar(estado, c);
    estado.investigacion.enCurso = estado.investigacion.enCurso.filter((x) => x !== c);
    estado.investigacion.completadas.push(p.id);
    const j = jugador(estado);
    j.investigaciones = (j.investigaciones ?? 0) + 1;
    sumarPuntos(estado, 'investigacion', datos.puntos.investigacionPorProyecto);
    let texto = p.texto;
    if (p.tipo === 'exploracion') texto = (secretos as Record<string, string>)[p.id] ?? p.texto;
    if (p.efecto?.oro) {
      j.oro += p.efecto.oro;
      texto = `La transmutación funciona: +${p.efecto.oro} de oro.`;
    }
    if (p.efecto?.elixir) {
      estado.objetos.elixires += p.efecto.elixir;
      texto = 'Tienes un Elixir del techo: úsalo en un héroe desde el inventario para subir su techo una letra.';
    }
    registrar(estado, 'mision', `Investigación completada: «${p.nombre}».`);
    hechas.push({ id: p.id, nombre: p.nombre, tipo: p.tipo, texto });
  }
  return hechas;
}

/** Un Elixir del techo sube una letra el techo real de un héroe (sin pasar de S). */
export function motivoNoElixir(estado: EstadoJuego, heroeId: string): string | null {
  if (estado.objetos.elixires <= 0) return 'No tienes elixires';
  if (!jugador(estado).plantilla.includes(heroeId)) return 'No es de tu gremio';
  if (letraDe(obtenerHeroe(estado, heroeId).potencial) === 'S') return 'Su techo ya es S';
  return null;
}

export function usarElixir(estado: EstadoJuego, heroeId: string): void {
  const motivo = motivoNoElixir(estado, heroeId);
  if (motivo) throw new Error(motivo);
  const h = obtenerHeroe(estado, heroeId);
  const siguiente = indiceLetra(letraDe(h.potencial)) + 1;
  h.potencial = Math.max(h.potencial, (balance.letras.umbral[siguiente + 1] ?? 101) - 1);
  estado.objetos.elixires -= 1;
  registrar(estado, 'mision', `${h.nombre} bebe el Elixir del techo: ahora puede llegar a ${LETRAS[siguiente] ?? 'S'}.`);
}
