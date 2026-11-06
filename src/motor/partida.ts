// Partida: creación, acciones del jugador y bucle semanal (secciones 6, 7, 9, 10 y 14).

import balance from '../datos/balance.json';
import datosGremios from '../datos/gremios.json';
import { Azar } from './azar';
import { cierreSemanal, premioFinTemporada, type ResultadoCierre } from './economia';
import {
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
  tabla,
  type EstadoJuego,
} from './estado';
import { estadoInicialJugador } from './estadoInicial';
import { envejecer, ganarXp, generarHeroe, generarVinculos, salarioPedido, valorMercado } from './heroes';
import { cierreIA, contextoGremio, pujadorIA, rivalesInteresados, turnoMisionesIA } from './ia';
import { aportacion, poderEquipo, resolverMision, type InformeMision, type MiembroEquipo } from './misiones';
import { ofertaTotal, resolverSubasta, type Oferta, type Pujador, type ResultadoSubasta } from './pujas';
import { puntosMision } from './ranking';
import { ofertaAnualCorona, pujadoresRivales, reiniciarAccionesTemporada, resolverSobornos, sabotajesColmillo } from './rivales';
import { aplicarEfectosPermanentes, multiplicadorXp, semanasDeBaja } from './sede';
import { generarOfertas, liberarHeroe } from './ventas';
import { aplicarPerdida, cambiarMoral, derivaMoral, sumarAfinidadEquipo } from './vinculos';
import {
  RANGOS,
  indiceRango,
  type Clase,
  type EtiquetaMision,
  type Gremio,
  type Heroe,
  type Mision,
  type Posicion,
  type Rango,
  type TipoMision,
} from './tipos';

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
    semanasFuera: 0,
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
    version: 1,
    partida: {
      protagonista: { nombre: opciones.nombre, aspecto: opciones.aspecto ?? 0 },
      modoClemente: opciones.modoClemente ?? false,
      temporada: 1,
      semana: 1,
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
    mercado: [],
    enVenta: [],
    ofertas: [],
    afinidades: {},
    exitosTemporada: 0,
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

    // Draft de la semana 1 y primeros agentes libres.
    for (const [rango, cantidad] of Object.entries(balance.generacion.draft)) {
      for (let i = 0; i < cantidad; i++) agregarAlMercado(estado, azar, rango as Rango, true);
    }
    for (let i = 0; i < 4; i++) agregarAlMercado(estado, azar, azar.elegir(['F', 'D', 'D', 'C'] as Rango[]), false);

    generarVinculos(azar, Object.values(estado.heroes).filter((h) => h.id !== ID_ELARA));
    estado.tablon = generarTablon(estado, azar);
  });
  registrar(estado, 'temporada', 'Empieza la temporada 1. El Draft está abierto esta semana.');
  return estado;
}

function agregarAlMercado(estado: EstadoJuego, azar: Azar, rango: Rango, draft: boolean): Heroe {
  const h = generarHeroe(azar, nuevoId(estado, 'h'), rango, draft ? { edad: azar.entero(16, 30) } : {});
  estado.heroes[h.id] = h;
  estado.mercado.push({ heroeId: h.id, draft, semanaLlegada: estado.partida.semana });
  return h;
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

const TIPOS_SEMANA: TipoMision[] = ['segura', 'justa', 'arriesgada'];

/**
 * Tablón semanal: tres misiones a la medida del gremio (Segura, Justa y Arriesgada) y una Justa
 * más si la plantilla es grande. Cuanto más riesgo, más oro, prestigio y puntos.
 */
export function generarTablon(estado: EstadoJuego, azar: Azar): Mision[] {
  const t = balance.tablon;
  const referencia = poderReferencia(estado);
  const tipos = [...TIPOS_SEMANA];
  if (jugador(estado).plantilla.length >= t.plantillaParaCuartaMision) tipos.splice(2, 0, 'justa');
  return tipos.map((tipo) => {
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
      // Todas las misiones duran una semana: cada semana es una decisión nueva.
      duracion: 1,
      recompensa: { oro: Math.round(poderRecomendado * t.oroPorPoder[tipo]), prestigio: m.prestigio, xp: m.xp },
      heroeRescatable: null,
    };
  });
}

// ---------------------------------------------------------------------------
// Acciones del jugador
// ---------------------------------------------------------------------------

/** Oro que el jugador puede gastar en una puja: el disponible menos 4 semanas de salarios. */
export function oroDisponibleParaPujar(estado: EstadoJuego): number {
  return Math.max(0, jugador(estado).oro - 4 * salariosDe(estado, estado.jugadorId));
}

export interface ResultadoFichaje {
  fichado: boolean;
  subasta: ResultadoSubasta;
  motivo?: string;
}

/**
 * El jugador puja por un héroe del mercado. `ofertas` es su oferta en cada ronda
 * (si hay menos de 3, repite la última). Pujan también los rivales interesados.
 */
export function pujarPorHeroe(estado: EstadoJuego, heroeId: string, ofertas: Oferta[]): ResultadoFichaje {
  const entrada = estado.mercado.find((e) => e.heroeId === heroeId);
  if (!entrada) throw new Error('El héroe no está en el mercado');
  const j = jugador(estado);
  if (j.plantilla.length >= j.plantillaMax) throw new Error('La plantilla está llena');
  const disponible = oroDisponibleParaPujar(estado);
  if (ofertas.length === 0 || ofertas.some((o) => o.prima > disponible)) {
    throw new Error(`No puedes ofrecer más de ${disponible} de oro de prima`);
  }
  return conAzar(estado, (azar) => {
    const h = obtenerHeroe(estado, heroeId);
    const pujadores: Pujador[] = [
      {
        contexto: contextoGremio(estado, estado.jugadorId, h),
        pujar: (ronda) => ofertas[Math.min(ronda, ofertas.length) - 1] ?? null,
      },
      ...pujadoresRivales(estado, azar, h, rivalesInteresados(estado, azar, h, entrada.draft), ofertas[0]),
    ];
    const subasta = resolverSubasta(valorMercado(h), h.rasgos, pujadores);
    if (subasta.ganador && subasta.oferta) firmar(estado, h, subasta.ganador, subasta.oferta);
    const fichado = subasta.ganador === estado.jugadorId;
    if (fichado) {
      const rivalesTop3 = subasta.rondas[0]?.some(
        (p) => p.gremioId !== estado.jugadorId && puesto(estado, p.gremioId) <= 3,
      );
      if (rivalesTop3) j.prestigio = Math.min(100, j.prestigio + 1);
    }
    return { fichado, subasta, motivo: subasta.ganador ? undefined : 'El héroe no aceptó ninguna oferta' };
  });
}

function firmar(estado: EstadoJuego, h: Heroe, gremioId: string, oferta: Oferta): void {
  const g = gremio(estado, gremioId);
  g.oro -= oferta.prima;
  g.plantilla.push(h.id);
  h.contrato = {
    gremio: gremioId,
    salario: oferta.salario,
    temporadasRestantes: oferta.duracion,
    clausula: Math.round(valorMercado(h) * 1.5),
  };
  estado.mercado = estado.mercado.filter((e) => e.heroeId !== h.id);
  registrar(estado, 'fichaje', `${h.nombre} (${h.rango}, ${h.clase}) ficha por ${g.nombre} por ${ofertaTotal(oferta)} de oro.`);
}

export interface PlazaEquipo {
  heroeId: string;
  posicion: Posicion;
}

export function enviarMision(estado: EstadoJuego, misionId: string, equipo: PlazaEquipo[]): void {
  const mision = estado.tablon.find((m) => m.id === misionId);
  if (!mision) throw new Error('La misión no está en el tablón');
  if (equipo.length < 3 || equipo.length > 5) throw new Error('Un equipo debe tener entre 3 y 5 héroes');
  const j = jugador(estado);
  for (const plaza of equipo) {
    if (!j.plantilla.includes(plaza.heroeId)) throw new Error('Ese héroe no es de tu gremio');
    const h = obtenerHeroe(estado, plaza.heroeId);
    if (h.estado !== 'disponible' && h.estado !== 'luto') throw new Error(`${h.nombre} no está disponible`);
  }
  if (new Set(equipo.map((p) => p.heroeId)).size !== equipo.length) throw new Error('Héroe repetido en el equipo');
  for (const plaza of equipo) obtenerHeroe(estado, plaza.heroeId).estado = 'en mision';
  estado.tablon = estado.tablon.filter((m) => m.id !== misionId);
  estado.enCurso.push({
    mision,
    gremioId: j.id,
    equipo,
    semanaInicio: estado.partida.semana,
    semanaFin: estado.partida.semana + mision.duracion - 1,
  });
}

// ---------------------------------------------------------------------------
// Cierre de semana
// ---------------------------------------------------------------------------

export interface ResumenSemana {
  semana: number;
  informes: InformeMision[];
  cierre: ResultadoCierre;
  puesto: number;
}

export function terminarSemana(estado: EstadoJuego): ResumenSemana {
  if (estado.fin) throw new Error('La partida ha terminado');
  const semana = estado.partida.semana;
  // Se conservan los sucesos de esta semana (fichajes, pujas) para el informe del cierre.
  estado.registro = estado.registro.filter((e) => e.semana === semana);
  return conAzar(estado, (azar) => {
    const j = jugador(estado);

    // 0. Sobornos que vencen y sabotajes del Colmillo Carmesí (rumores, robos, nuevos sobornos).
    for (const id of resolverSobornos(estado, azar)) liberarHeroe(estado, id);
    sabotajesColmillo(estado, azar);

    // 1. Misiones del jugador que terminan esta semana.
    const informes = resolverMisionesDelJugador(estado, azar);
    const huboExito = informes.some((i) => i.resultado === 'exito');
    estado.informes = informes;

    // 2. Turno de los rivales: misiones, fichajes en el mercado y cierre.
    for (const rival of rivales(estado)) {
      const { exitos } = turnoMisionesIA(estado, azar, rival.id);
      cierreIA(estado, rival.id, exitos > 0);
    }
    fichajesIA(estado, azar, semana === 1);

    // 3. Cierre económico del jugador.
    const cierre = cierreSemanal(j, salariosDe(estado, j.id), huboExito, manutencionDe(estado, j.id));
    if (cierre.aviso) registrar(estado, 'economia', `Aviso de la Asociación: el gremio está en números rojos (${cierre.oroFinal} de oro).`);

    // 4. Recuperación, luto y moral.
    for (const h of heroesDe(estado, j.id)) {
      if ((h.estado === 'herido' || h.estado === 'luto') && --h.semanasFuera <= 0) {
        h.estado = 'disponible';
        h.semanasFuera = 0;
      }
      derivaMoral(h, j.mejoras.includes('Salon de banquetes'));
    }
    for (const rival of rivales(estado)) {
      for (const h of heroesDe(estado, rival.id)) {
        if (h.estado !== 'disponible' && --h.semanasFuera <= 0) {
          h.estado = 'disponible';
          h.semanasFuera = 0;
        }
      }
    }

    // Efectos de las mejoras de la sede.
    aplicarEfectosPermanentes(estado);

    // 5. Despertar I: 5 misiones con éxito en la temporada 1.
    if (estado.partida.despertares === 0 && estado.exitosTemporada >= balance.temporada.misionesParaDespertarI) {
      estado.partida.despertares = 1;
      for (const h of Object.values(estado.heroes)) h.potencialVisible = true;
      registrar(estado, 'despertar', 'Despertar I: Ojo del Origen. Ahora ves el potencial oculto de todos los héroes.');
    }

    // 6. Mercado: ofertas por tus héroes en venta y nuevos agentes libres.
    generarOfertas(estado, azar);
    ofertaAnualCorona(estado);
    renovarMercado(estado, azar);

    // 7. Avance del calendario.
    if (cierre.quiebra) {
      estado.fin = 'quiebra';
      registrar(estado, 'economia', 'La Asociación retira la licencia del gremio: quiebra.');
    } else if (semana >= balance.temporada.semanas) {
      cerrarTemporada(estado);
    } else {
      estado.partida.semana += 1;
      estado.tablon = generarTablon(estado, azar);
    }
    return { semana, informes, cierre, puesto: puesto(estado, j.id) };
  });
}

function resolverMisionesDelJugador(estado: EstadoJuego, azar: Azar): InformeMision[] {
  const j = jugador(estado);
  const semana = estado.partida.semana;
  const terminan = estado.enCurso.filter((c) => c.semanaFin <= semana && c.gremioId === j.id);
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
      enfermeria: j.mejoras.includes('Enfermeria'),
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
        quitarDeListas(estado, h.id);
        estado.muertesTemporada[j.id] = (estado.muertesTemporada[j.id] ?? 0) + 1;
        if (indiceRango(enCurso.mision.rango) - indiceRango(h.rango) >= 2) j.reputacion = Math.max(0, j.reputacion - 3);
        registrar(estado, 'muerte', `${h.nombre} ha muerto en la misión ${enCurso.mision.id} (${enCurso.mision.rango}).`);
        for (const id of aplicarPerdida(estado, azar, h, j.id, 'muerte')) liberarHeroe(estado, id);
        continue;
      }
      supervivientes.push(h);
      ganarXp(azar, h, Math.round(informe.xp * multiplicadorXp(estado)));
      if (informe.resultado === 'exito') h.misionesExito += 1;
      cambiarMoral(h, informe.resultado === 'fracaso' ? balance.moral.fracasoMision : balance.moral.exitoMision);
      if (parte.salvado && estado.partida.modoClemente) cambiarMoral(h, balance.heridas.moralClemente);
      if (parte.consecuencia === 'heridaLeve' || parte.consecuencia === 'heridaGrave') {
        h.estado = 'herido';
        h.semanasFuera = semanasDeBaja(estado, parte.semanasFuera);
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

function quitarDeListas(estado: EstadoJuego, heroeId: string): void {
  estado.enVenta = estado.enVenta.filter((t) => t.heroeId !== heroeId);
  estado.ofertas = estado.ofertas.filter((o) => o.heroeId !== heroeId);
}

/** Los rivales fichan en el mercado. En la semana 1 se subasta todo el Draft que quede. */
function fichajesIA(estado: EstadoJuego, azar: Azar, cierreDraft: boolean): void {
  for (const entrada of [...estado.mercado]) {
    const h = obtenerHeroe(estado, entrada.heroeId);
    const interesados = rivalesInteresados(estado, azar, h, entrada.draft);
    if (interesados.length === 0) continue;
    const subasta = resolverSubasta(
      valorMercado(h),
      h.rasgos,
      interesados.map((id) => pujadorIA(estado, azar, id, h)),
    );
    if (subasta.ganador && subasta.oferta) firmar(estado, h, subasta.ganador, subasta.oferta);
  }
  if (cierreDraft) {
    for (const e of estado.mercado) e.draft = false;
  }
}

function renovarMercado(estado: EstadoJuego, azar: Azar): void {
  const g = balance.generacion;
  // Los agentes libres que llevan más de 3 semanas se van a otra ciudad.
  estado.mercado = estado.mercado.filter((e) => e.draft || estado.partida.semana - e.semanaLlegada < 3);
  const [min, max] = g.agentesLibresPorSemana as [number, number];
  const nuevos = azar.entero(min, max);
  for (let i = 0; i < nuevos; i++) {
    const h = agregarAlMercado(estado, azar, azar.elegir(g.rangosAgentesLibres as Rango[]), false);
    h.potencialVisible = estado.partida.despertares >= 1;
    h.estado = 'disponible';
  }
}

function cerrarTemporada(estado: EstadoJuego): void {
  reiniciarAccionesTemporada(estado);
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
