// Rama económica (biblia, sección 4.4): establecimientos productivos. Se construyen y mejoran con oro, se les
// asignan héroes (que quedan ocupados) y producen oro cada día según el poder y la clase de sus trabajadores.
// Pagan mantenimiento cada semana. Cada héroe extra rinde un poco menos, para que la producción pasiva no se
// dispare.

import datos from '../datos/desarrollo.json';
import { bono, sumarPuntos } from './desarrollo';
import { heroe as obtenerHeroe, jugador, registrar, type EstablecimientoConstruido, type EstadoJuego } from './estado';
import type { Heroe } from './tipos';

const E = datos.establecimientos;

export interface TipoEstablecimiento {
  id: string;
  nombre: string;
  texto: string;
  clases: Record<string, number>;
  coste: number[];
  plazas: number[];
  base: number[];
  porPoder: number;
  mantenimiento: number[];
}

export const CATALOGO = E.lista as TipoEstablecimiento[];

export function tipoEstablecimiento(id: string): TipoEstablecimiento {
  const t = CATALOGO.find((x) => x.id === id);
  if (!t) throw new Error(`No existe el establecimiento ${id}`);
  return t;
}

export function construido(estado: EstadoJuego, tipo: string): EstablecimientoConstruido | null {
  return estado.establecimientos.find((e) => e.tipo === tipo) ?? null;
}

/** Coste de construirlo (nivel 1) o de mejorarlo al siguiente nivel, o null si está al máximo. */
export function costeSiguienteNivel(estado: EstadoJuego, tipo: string): number | null {
  const t = tipoEstablecimiento(tipo);
  const e = construido(estado, tipo);
  const nivel = e?.nivel ?? 0;
  const coste = t.coste[nivel];
  if (coste === undefined) return null;
  // La especialización económica abarata las mejoras (no la construcción).
  return nivel === 0 ? coste : Math.round((coste * (1 - bono(estado, 'mejoras'))) / 50) * 50;
}

export function motivoNoMejorar(estado: EstadoJuego, tipo: string): string | null {
  const coste = costeSiguienteNivel(estado, tipo);
  if (coste === null) return 'Ya está al máximo';
  if (jugador(estado).oro < coste) return 'No tienes oro suficiente';
  return null;
}

/** Construye el establecimiento o lo mejora un nivel. Suma puntos de desarrollo económico. */
export function construirOMejorar(estado: EstadoJuego, tipo: string): void {
  const motivo = motivoNoMejorar(estado, tipo);
  if (motivo) throw new Error(motivo);
  const coste = costeSiguienteNivel(estado, tipo)!;
  const t = tipoEstablecimiento(tipo);
  const j = jugador(estado);
  j.oro -= coste;
  let e = construido(estado, tipo);
  if (e) e.nivel += 1;
  else {
    e = { tipo, nivel: 1, trabajadores: [] };
    estado.establecimientos.push(e);
  }
  j.nivelesEstablecimientos = (j.nivelesEstablecimientos ?? 0) + 1;
  sumarPuntos(estado, 'economico', coste * datos.puntos.economicoPorOro);
  registrar(estado, 'instalacion', e.nivel === 1 ? `Construyes ${t.nombre.toLowerCase()}.` : `${t.nombre} sube al nivel ${e.nivel}.`);
}

export function plazasEstablecimiento(e: EstablecimientoConstruido): number {
  return tipoEstablecimiento(e.tipo).plazas[e.nivel - 1] ?? 1;
}

/** Lo que aporta un héroe en un establecimiento (sin el rendimiento decreciente ni las bonificaciones). */
export function aporte(e: EstablecimientoConstruido, h: Heroe): number {
  const t = tipoEstablecimiento(e.tipo);
  return ((t.base[e.nivel - 1] ?? 0) + h.poder * t.porPoder) * (t.clases[h.clase] ?? 1);
}

/** Oro que produce al día con estos trabajadores (rendimiento decreciente y especialización económica). */
export function produccionCon(estado: EstadoJuego, e: EstablecimientoConstruido, trabajadores: readonly Heroe[]): number {
  const aportes = trabajadores.map((h) => aporte(e, h)).sort((a, b) => b - a);
  const bruto = aportes.reduce((t, a, i) => t + a * E.rendimientoExtra ** i, 0);
  return Math.round(bruto * (1 + bono(estado, 'produccion')));
}

export function produccionDiaria(estado: EstadoJuego, e: EstablecimientoConstruido): number {
  return produccionCon(estado, e, e.trabajadores.map((id) => obtenerHeroe(estado, id)));
}

export function motivoNoAsignar(estado: EstadoJuego, tipo: string, heroeId: string): string | null {
  const e = construido(estado, tipo);
  if (!e) return 'Aún no lo has construido';
  if (!jugador(estado).plantilla.includes(heroeId)) return 'No es de tu gremio';
  if (obtenerHeroe(estado, heroeId).estado !== 'libre') return 'No está libre';
  if (e.trabajadores.length >= plazasEstablecimiento(e)) return 'No quedan puestos: mejóralo';
  return null;
}

/** Pone a un héroe a trabajar: queda ocupado hasta que lo retires. */
export function asignarTrabajador(estado: EstadoJuego, tipo: string, heroeId: string): void {
  const motivo = motivoNoAsignar(estado, tipo, heroeId);
  if (motivo) throw new Error(motivo);
  construido(estado, tipo)!.trabajadores.push(heroeId);
  obtenerHeroe(estado, heroeId).estado = 'trabajando';
}

/** Retira a un héroe de su establecimiento: vuelve a estar libre. */
export function retirarTrabajador(estado: EstadoJuego, heroeId: string): void {
  for (const e of estado.establecimientos) {
    if (!e.trabajadores.includes(heroeId)) continue;
    e.trabajadores = e.trabajadores.filter((id) => id !== heroeId);
    const h = estado.heroes[heroeId];
    if (h && h.estado === 'trabajando') h.estado = 'libre';
  }
}

export interface Produccion {
  tipo: string;
  nombre: string;
  oro: number;
}

/** Al finalizar el día, cada establecimiento con trabajadores produce su oro. */
export function producir(estado: EstadoJuego): Produccion[] {
  const j = jugador(estado);
  const hoy: Produccion[] = [];
  for (const e of estado.establecimientos) {
    const oro = produccionDiaria(estado, e);
    if (oro <= 0) continue;
    j.oro += oro;
    sumarPuntos(estado, 'economico', oro * datos.puntos.economicoPorOroProducido);
    hoy.push({ tipo: e.tipo, nombre: tipoEstablecimiento(e.tipo).nombre, oro });
  }
  return hoy;
}

/** Mantenimiento semanal de todos los establecimientos (la especialización económica lo reduce). */
export function mantenimientoSemanal(estado: EstadoJuego): number {
  const total = estado.establecimientos.reduce((t, e) => t + (tipoEstablecimiento(e.tipo).mantenimiento[e.nivel - 1] ?? 0), 0);
  return Math.round((total * (1 - bono(estado, 'mantenimiento'))) / 10) * 10;
}

export function pagarMantenimiento(estado: EstadoJuego): number {
  const total = mantenimientoSemanal(estado);
  jugador(estado).oro -= total;
  return total;
}
