// Partida: creación, acciones del jugador y bucle diario (una misión al día; el día 7 de cada semana,
// Prueba de Novatos y cierre económico de la semana).

import balance from '../datos/balance.json';
import datosGremios from '../datos/gremios.json';
import { Azar } from './azar';
import { cierreSemanal, premioFinTemporada, type ResultadoCierre } from './economia';
import {
  esDiaDeNovatos,
  gremio,
  heroe as obtenerHeroe,
  heroesDe,
  jugador,
  manutencionDe,
  nuevoId,
  puesto,
  registrar,
  rivales,
  salariosDe,
  semanaDeDia,
  tabla,
  type EstadoJuego,
} from './estado';
import { estadoInicialJugador } from './estadoInicial';
import { envejecer, ganarXp, generarHeroe, generarVinculos, salarioPedido, valorMercado } from './heroes';
import { cierreIA, turnoMisionesIA } from './ia';
import { aportacion, poderEquipo, resolverMision, type InformeMision, type MiembroEquipo } from './misiones';
import { puntosMision } from './ranking';
import { mantenimientoSede } from './sede';
import { resolverNovatosPendientes } from './subasta';
import { aplicarPerdida, cambiarMoral, derivaMoral, sumarAfinidadEquipo } from './vinculos';
import { RANGOS, indiceRango, type Clase, type EtiquetaMision, type Gremio, type Heroe, type Mision, type Posicion, type Rango, type TipoMision } from './tipos';

export interface OpcionesPartida {
  nombre: string;
  aspecto?: number;
  modoClemente?: boolean;
  semilla?: number;
}

const ID_ELARA = 'h_000_elara';

function crearElara(): Heroe {
  return {
    id: ID_ELARA,
    nombre: 'Elara Nocturne',
    edad: 27,
    raza: 'Humano',
    rango: 'S',
    potencial: 'S',
    potencialVisible: true,
    clase: 'Mago',
    stats: { poder: 75, defensa: 72, magia: 99, agilidad: 88, moral: 40 },
    rasgos: ['Leal'],
    vinculos: [],
    contrato: { gremio: 'llama', salario: 0, temporadasRestantes: 99, clausula: 0 },
    estado: 'disponible',
    diasFuera: 0,
    xp: 0,
    misionesExito: 0,
  };
}

/** Ejecuta una función con el generador de la partida y guarda su nuevo estado. */
function conAzar<T>(estado: EstadoJuego, f: (azar: Azar) => T): T {
  const azar = new Azar(estado.azar);
  const resultado = f(azar);
  estado.azar = azar.obtenerEstado();
  return resultado;
}

export function crearPartida(opciones: OpcionesPartida): EstadoJuego {
  const semilla = opciones.semilla ?? Math.floor(Math.random() * 2 ** 31);
  const estado: EstadoJuego = {
    version: 2,
    partida: {
      protagonista: { nombre: opciones.nombre, aspecto: opciones.aspecto ?? 0 },
      modoClemente: opciones.modoClemente ?? false,
      temporada: 1,
      dia: 1,
      despertares: 0,
      sospecha: 0,
      afinidadElara: 20,
      semilla,
    },
    azar: semilla,
    heroes: { [ID_ELARA]: crearElara() },
    gremios: {},
    jugadorId: 'llama',
    tablon: [],
    enCurso: [],
    novatos: [],
    afinidades: {},
    exitosTemporada: 0,
    exitosSemana: 0,
    muertesTemporada: {},
    informes: [],
    registro: [],
    fin: null,
    contadorIds: 0,
  };
  estado.gremios.llama = estadoInicialJugador();

  conAzar(estado, (azar) => {
    for (const datos of datosGremios.rivales) {
      const g: Gremio = {
        id: datos.id,
        nombre: datos.nombre,
        esJugador: false,
        oro: datos.oro,
        deuda: 0,
        prestigio: datos.prestigio,
        reputacion: datos.reputacion,
        especialidad: datos.especialidad as Clase,
        plantilla: [],
        plantillaMax: 13,
        mejoras: [],
        puntosMisionTemporada: 0,
        prestigioInicioTemporada: datos.prestigio,
        cierresNegativos: 0,
        muertesTemporadaPasada: 0,
      };
      estado.gremios[g.id] = g;
      for (const [rango, cantidad] of Object.entries(datos.plantilla)) {
        for (let i = 0; i < cantidad; i++) {
          const h = generarHeroe(azar, nuevoId(estado, 'h'), rango as Rango, {
            clase: azar.probabilidad(40) ? (datos.especialidad as Clase) : undefined,
          });
          h.contrato = { gremio: g.id, salario: salarioPedido(h.rango), temporadasRestantes: azar.entero(1, 3), clausula: Math.round(valorMercado(h) * 1.5) };
          estado.heroes[h.id] = h;
          g.plantilla.push(h.id);
        }
      }
    }

    generarVinculos(azar, Object.values(estado.heroes).filter((h) => h.id !== ID_ELARA));
    generarNovatos(estado, azar);
    estado.tablon = generarTablon(estado, azar);
  });
  registrar(estado, 'temporada', 'Empieza la temporada 1. El día 7 se celebra la Prueba de Novatos.');
  return estado;
}

/**
 * Novatos de la próxima Prueba de Novatos. Casi la mitad tiene un vínculo (familia, amistad o
 * romance) con alguien de tu gremio: esos prefieren tu oferta en la subasta.
 */
export function generarNovatos(estado: EstadoJuego, azar: Azar): void {
  const N = balance.novatos;
  const [edadMin, edadMax] = N.edad as [number, number];
  const plantilla = heroesDe(estado, estado.jugadorId).filter((h) => h.id !== ID_ELARA);
  estado.novatos = [];
  for (let i = 0; i < N.porSemana; i++) {
    const h = generarHeroe(azar, nuevoId(estado, 'h'), azar.elegir(N.rangos as Rango[]), { edad: azar.entero(edadMin, edadMax) });
    h.potencialVisible = estado.partida.despertares >= 1;
    const amigo = plantilla.length > 0 && azar.probabilidad(N.probVinculoJugador) ? azar.elegir(plantilla) : null;
    if (amigo && amigo.vinculos.length < 3) {
      const tipo = azar.elegir(amigo.raza === h.raza ? (['Familia', 'Amistad', 'Romance'] as const) : (['Amistad', 'Romance'] as const));
      h.vinculos.push({ con: amigo.id, tipo, oculto: false });
      amigo.vinculos.push({ con: h.id, tipo, oculto: false });
    }
    estado.heroes[h.id] = h;
    estado.novatos.push(h.id);
  }
}

const ETIQUETAS: readonly EtiquetaMision[] = ['Caza', 'Escolta', 'Exploracion', 'Rescate', 'Mazmorra'];

/**
 * Poder del mejor equipo de 4 del jugador (estén libres o no).
 * El tablón se calcula a partir de él para que siempre haya misiones a su medida.
 */
export function poderReferencia(estado: EstadoJuego): number {
  const miembros = heroesDe(estado, estado.jugadorId)
    .filter((h) => h.estado !== 'muerto')
    .map((h) => ({ heroe: h, posicion: 'centro' as Posicion }));
  const mejores = miembros.sort((x, y) => aportacion(y, miembros) - aportacion(x, miembros)).slice(0, 4);
  return Math.max(balance.tablon.poderMinimo, poderEquipo(mejores));
}

/** Rango de una misión según su poder recomendado (el más cercano de la tabla). */
function rangoPorPoder(poder: number): Rango {
  let mejor: Rango = 'F';
  for (const r of RANGOS) if (balance.misiones[r].poderRecomendado <= poder * 1.1) mejor = r;
  return mejor;
}

const TIPOS_DIA: TipoMision[] = ['segura', 'justa', 'arriesgada'];

/** Las tres misiones del día, a la medida del gremio: fácil, media y difícil. Solo se puede hacer una. */
export function generarTablon(estado: EstadoJuego, azar: Azar): Mision[] {
  const t = balance.tablon;
  const referencia = poderReferencia(estado);
  return TIPOS_DIA.map((tipo) => {
    const variacion = 1 + (azar.siguiente() * 2 - 1) * t.variacion;
    const poderRecomendado = Math.round(referencia * t.multiplicadorPoder[tipo] * variacion);
    const rango = rangoPorPoder(poderRecomendado);
    const m = balance.misiones[rango];
    return {
      id: nuevoId(estado, 'm'),
      rango,
      etiqueta: azar.elegir(ETIQUETAS),
      tipo,
      poderRecomendado,
      // Todas las misiones vuelven al terminar el día.
      duracion: 1,
      recompensa: { oro: Math.round(poderRecomendado * t.oroPorPoder[tipo]), prestigio: m.prestigio, xp: m.xp },
      heroeRescatable: null,
    };
  });
}

// ---------------------------------------------------------------------------
// Acciones del jugador
// ---------------------------------------------------------------------------

export interface PlazaEquipo {
  heroeId: string;
  posicion: Posicion;
}

export function enviarMision(estado: EstadoJuego, misionId: string, equipo: PlazaEquipo[]): void {
  const mision = estado.tablon.find((m) => m.id === misionId);
  if (!mision) throw new Error('La misión no está en el tablón');
  if (equipo.length < 1 || equipo.length > 5) throw new Error('Un equipo tiene entre 1 y 5 héroes');
  const j = jugador(estado);
  if (estado.enCurso.some((c) => c.gremioId === j.id && c.diaInicio === estado.partida.dia)) {
    throw new Error('Hoy ya has lanzado una misión');
  }
  for (const plaza of equipo) {
    if (!j.plantilla.includes(plaza.heroeId)) throw new Error('Ese héroe no es de tu gremio');
    const h = obtenerHeroe(estado, plaza.heroeId);
    if (h.estado !== 'disponible' && h.estado !== 'luto') throw new Error(`${h.nombre} no está disponible`);
  }
  if (new Set(equipo.map((p) => p.heroeId)).size !== equipo.length) throw new Error('Héroe repetido en el equipo');
  for (const plaza of equipo) obtenerHeroe(estado, plaza.heroeId).estado = 'en mision';
  // Solo se puede elegir una de las tres misiones del día.
  estado.tablon = [];
  estado.enCurso.push({ mision, gremioId: j.id, equipo, diaInicio: estado.partida.dia, diaFin: estado.partida.dia });
}

// ---------------------------------------------------------------------------
// Cierre del día
// ---------------------------------------------------------------------------

export interface ResumenDia {
  dia: number;
  informes: InformeMision[];
  /** Cierre económico de la semana (solo el día de la Prueba de Novatos). */
  cierre: ResultadoCierre | null;
  puesto: number;
}

export function terminarDia(estado: EstadoJuego): ResumenDia {
  if (estado.fin) throw new Error('La partida ha terminado');
  const dia = estado.partida.dia;
  // Se conservan los sucesos de hoy (fichajes, ventas, pujas) para el informe.
  estado.registro = estado.registro.filter((e) => e.dia === dia);
  return conAzar(estado, (azar) => {
    const j = jugador(estado);

    // 1. Vuelve la misión del día.
    const informes = resolverMisionesDelJugador(estado, azar);
    estado.informes = informes;
    estado.exitosSemana += informes.filter((i) => i.resultado === 'exito').length;

    // 2. Los rivales también trabajan cada día.
    const exitosRivales: Record<string, number> = {};
    for (const rival of rivales(estado)) exitosRivales[rival.id] = turnoMisionesIA(estado, azar, rival.id).exitos;

    // 3. Recuperación de heridos, luto y equipos rivales que vuelven.
    for (const g of Object.values(estado.gremios)) {
      for (const h of heroesDe(estado, g.id)) {
        const vuelve = h.estado !== 'disponible' && (g.esJugador ? h.estado !== 'en mision' : true);
        if (vuelve && --h.diasFuera <= 0) {
          h.estado = 'disponible';
          h.diasFuera = 0;
        }
      }
    }

    // 4. Último día de la semana: Prueba de Novatos (las subastas que queden) y cierre de la semana.
    let cierre: ResultadoCierre | null = null;
    if (esDiaDeNovatos(dia)) {
      resolverNovatosPendientes(estado, azar);
      for (const rival of rivales(estado)) cierreIA(estado, rival.id, (exitosRivales[rival.id] ?? 0) > 0 || azar.probabilidad(70));
      j.oro -= mantenimientoSede(j);
      cierre = cierreSemanal(j, salariosDe(estado, j.id), estado.exitosSemana > 0, manutencionDe(estado, j.id));
      if (cierre.aviso) registrar(estado, 'economia', `Aviso de la Asociación: el gremio está en números rojos (${cierre.oroFinal} de oro).`);
      for (const h of heroesDe(estado, j.id)) derivaMoral(h, false);
      estado.exitosSemana = 0;
      generarNovatos(estado, azar);
    }

    // 5. Despertar I: 5 misiones con éxito en la temporada.
    if (estado.partida.despertares === 0 && estado.exitosTemporada >= balance.temporada.misionesParaDespertarI) {
      estado.partida.despertares = 1;
      for (const h of Object.values(estado.heroes)) h.potencialVisible = true;
      registrar(estado, 'despertar', 'Despertar I: Ojo del Origen. Ahora ves el potencial oculto de todos los héroes.');
    }

    // 6. Calendario.
    if (cierre?.quiebra) {
      estado.fin = 'quiebra';
      registrar(estado, 'economia', 'La Asociación retira la licencia del gremio: quiebra.');
    } else if (dia >= balance.temporada.dias) {
      cerrarTemporada(estado);
    } else {
      estado.partida.dia += 1;
      estado.tablon = generarTablon(estado, azar);
    }
    return { dia, informes, cierre, puesto: puesto(estado, j.id) };
  });
}

/** Semana actual (1–4). */
export function semanaActual(estado: EstadoJuego): number {
  return semanaDeDia(estado.partida.dia);
}

/** El héroe deja el gremio del jugador (por ejemplo, al perder a un ser querido). */
function abandonar(estado: EstadoJuego, heroeId: string): void {
  const j = jugador(estado);
  j.plantilla = j.plantilla.filter((id) => id !== heroeId);
  const h = obtenerHeroe(estado, heroeId);
  h.contrato = null;
  if (h.estado !== 'muerto') h.estado = 'disponible';
}

function resolverMisionesDelJugador(estado: EstadoJuego, azar: Azar): InformeMision[] {
  const j = jugador(estado);
  const dia = estado.partida.dia;
  const terminan = estado.enCurso.filter((c) => c.diaFin <= dia && c.gremioId === j.id);
  estado.enCurso = estado.enCurso.filter((c) => !terminan.includes(c));
  const informes: InformeMision[] = [];

  for (const enCurso of terminan) {
    const equipo: MiembroEquipo[] = enCurso.equipo
      .filter((p) => estado.heroes[p.heroeId]?.estado !== 'muerto')
      .map((p) => ({ heroe: obtenerHeroe(estado, p.heroeId), posicion: p.posicion }));
    // Para el cálculo, el luto cuenta aunque el héroe esté en misión.
    const informe = resolverMision(enCurso.mision, equipo, azar, {
      modoClemente: estado.partida.modoClemente,
      despertarII: estado.partida.despertares >= 2,
    });
    informes.push(informe);

    j.oro += informe.oro;
    j.prestigio = Math.max(0, Math.min(100, j.prestigio + informe.prestigio));
    if (informe.resultado === 'exito') {
      j.puntosMisionTemporada += puntosMision(enCurso.mision.rango);
      estado.exitosTemporada += 1;
    }

    const supervivientes: Heroe[] = [];
    for (const parte of informe.partes) {
      const h = obtenerHeroe(estado, parte.heroeId);
      if (parte.consecuencia === 'muerte') {
        h.estado = 'muerto';
        j.plantilla = j.plantilla.filter((id) => id !== h.id);
        estado.muertesTemporada[j.id] = (estado.muertesTemporada[j.id] ?? 0) + 1;
        if (indiceRango(enCurso.mision.rango) - indiceRango(h.rango) >= 2) j.reputacion = Math.max(0, j.reputacion - 3);
        registrar(estado, 'muerte', `${h.nombre} ha muerto en la misión ${enCurso.mision.id} (${enCurso.mision.rango}).`);
        for (const id of aplicarPerdida(estado, azar, h, j.id, 'muerte')) abandonar(estado, id);
        continue;
      }
      supervivientes.push(h);
      ganarXp(azar, h, informe.xp);
      if (informe.resultado === 'exito') h.misionesExito += 1;
      cambiarMoral(h, informe.resultado === 'fracaso' ? balance.moral.fracasoMision : balance.moral.exitoMision);
      if (parte.salvado && estado.partida.modoClemente) cambiarMoral(h, balance.heridas.moralClemente);
      if (parte.consecuencia === 'heridaLeve' || parte.consecuencia === 'heridaGrave') {
        h.estado = 'herido';
        h.diasFuera = parte.diasFuera;
      } else {
        h.estado = 'disponible';
      }
    }
    if (informe.resultado === 'exito') sumarAfinidadEquipo(estado, supervivientes);
    registrar(
      estado,
      'mision',
      `Misión ${enCurso.mision.rango} (${enCurso.mision.etiqueta}): ${informe.resultado}. +${informe.oro} de oro.`,
    );
  }
  return informes;
}

function cerrarTemporada(estado: EstadoJuego): void {
  for (const fila of tabla(estado)) {
    const g = gremio(estado, fila.gremioId);
    g.oro += premioFinTemporada(fila.puesto);
    g.muertesTemporadaPasada = estado.muertesTemporada[g.id] ?? 0;
    registrar(estado, 'temporada', `${fila.puesto}.º ${g.nombre} con ${Math.round(fila.puntos)} puntos.`);
  }
  for (const h of Object.values(estado.heroes)) if (h.estado !== 'muerto') envejecer(h);
  // El prototipo cubre la temporada 1: aquí termina la partida.
  estado.fin = 'fin-temporada';
}

/** Datos principales de un gremio (útil para la interfaz y el simulador). */
export function resumenGremio(estado: EstadoJuego, gremioId = estado.jugadorId) {
  const g = gremio(estado, gremioId);
  return {
    oro: g.oro,
    deuda: g.deuda,
    prestigio: g.prestigio,
    reputacion: g.reputacion,
    plantilla: g.plantilla.length,
    puesto: puesto(estado, gremioId),
  };
}
