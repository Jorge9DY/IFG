// Interfaz principal (biblia, sección 3): solo cinco elementos en pantalla. Oro arriba a la izquierda,
// Finalizar día arriba a la derecha, Gestionar gremio a la izquierda, Lanzar misiones a la derecha y
// Mercado de héroes abajo en el centro. Todo lo demás vive dentro de sus menús. Solo lee el estado y llama al motor.

import { condicionesCuracion, curar, sueldosDe } from '../motor/economia';
import { diasParaPrueba, esDia7, heroe as obtenerHeroe, heroesDe, jugador, misionDe, puesto, rivales, type EstadoJuego } from '../motor/estado';
import { esDestacado, letraDe, rangoPotencial, sueldo, textoPotencial } from '../motor/heroes';
import { NOMBRE_INSTALACION, infoInstalacion, mejorar, plazas, type Instalacion } from '../motor/instalaciones';
import { comprar, condicionesCompra, condicionesRecluta, ofertaVenta, reclutar, vender } from '../motor/mercado';
import { poderEquipo, probabilidadExito } from '../motor/misiones';
import {
  crearPartida,
  finalizarDia,
  lanzarMision,
  motivoNoLanzar,
  pujarNovato,
  siguienteCandidato,
  terminarPrueba,
  textoCalendario,
  type ResumenDia,
  type ResumenSemana,
} from '../motor/partida';
import { calcularRanking } from '../motor/ranking';
import { interesados, motivoNoPujar, siguientePrecio } from '../motor/subasta';
import type { Heroe, Mision, RangoMision } from '../motor/tipos';
import balance from '../datos/balance.json';
import { equipoRecomendado, heroesLibres, nivelDificultad, probabilidadRecomendada } from './ayudas';
import { borrar, cargar, guardar } from './guardado';
import { esc, num, pct } from './html';

export type Panel = 'nueva' | 'misiones' | 'mercado' | 'gremio' | 'prueba' | 'dia' | 'semana' | 'victoria';
type PestanaGremio = 'heroes' | 'reclutar' | 'instalaciones' | 'ranking';

const TITULOS: Record<Panel, string> = {
  nueva: 'Gremio de héroes',
  misiones: 'Lanzar misiones',
  mercado: 'Mercado de héroes',
  gremio: 'Gestionar gremio',
  prueba: 'Prueba de los Novatos',
  dia: 'Resumen del día',
  semana: 'Ranking de la semana',
  victoria: '¡Número uno!',
};

const RANGO: Record<RangoMision, { nombre: string; riesgo: string }> = {
  bajo: { nombre: 'Rango bajo', riesgo: 'Riesgo bajo' },
  medio: { nombre: 'Rango medio', riesgo: 'Riesgo medio' },
  alto: { nombre: 'Rango alto', riesgo: 'Riesgo alto' },
};

const TEXTO_INSTALACION: Record<Instalacion, string> = {
  sede: 'Más plazas para héroes y más prestigio en el ranking.',
  ojeadores: 'Estrecha el rango de potencial que ves de los héroes y novatos. También da prestigio.',
};

/** Paneles que no se cierran con ✕ ni con Escape. */
const FIJOS: readonly Panel[] = ['nueva', 'prueba', 'semana', 'victoria'];

export interface ElementosInterfaz {
  cabecera: HTMLElement;
  objetivo: HTMLElement;
  menu: HTMLElement;
  accion: HTMLElement;
  equipo: HTMLElement;
  panel: HTMLElement;
}

export class Interfaz {
  estado: EstadoJuego | null = cargar();
  private abierto: Panel | null = null;
  private mensaje = '';
  private misionId: string | null = null;
  private equipo: string[] = [];
  private pestanaMercado: 'comprar' | 'vender' = 'comprar';
  private gremioRival = 'dragon';
  private pestanaGremio: PestanaGremio = 'heroes';
  private resumenDia: ResumenDia | null = null;
  private resumenSemana: ResumenSemana | null = null;

  constructor(private readonly el: ElementosInterfaz) {
    for (const zona of [el.panel, el.menu, el.accion, el.objetivo, el.equipo, el.cabecera]) {
      zona.addEventListener('click', (e) => this.alHacerClic(e));
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.abierto && !FIJOS.includes(this.abierto)) this.cerrar();
    });
    if (!this.estado) this.abrir('nueva');
    else if (this.estado.fase === 'victoria') this.abrir('victoria');
    else if (this.estado.fase === 'prueba') this.abrir('prueba');
    this.repintar();
  }

  get bloqueada(): boolean {
    return this.abierto !== null;
  }

  abrir(panel: Panel): void {
    this.abierto = panel;
    this.mensaje = '';
    this.repintar();
  }

  cerrar(): void {
    this.abierto = null;
    this.mensaje = '';
    this.repintar();
  }

  /** Lugar de la sede 3D → acción. */
  abrirDesdeSede(punto: string): void {
    const estado = this.estado;
    if (!estado || estado.fase === 'victoria') return;
    if (estado.fase === 'prueba') return this.abrir('prueba');
    if (punto === 'puerta') return this.finalizarElDia();
    if (punto === 'tablon') return this.abrirMisiones();
    if (punto === 'mostrador') return this.abrir('mercado');
    const pestana: Record<string, PestanaGremio> = { recepcion: 'reclutar', dormitorios: 'heroes', pizarra: 'ranking' };
    if (pestana[punto]) {
      this.pestanaGremio = pestana[punto]!;
      this.abrir('gremio');
    }
  }

  // ---------------------------------------------------------------------------
  // Pantalla principal: los cinco elementos
  // ---------------------------------------------------------------------------

  private repintar(): void {
    const estado = this.estado;
    const enJuego = !!estado && estado.fase !== 'victoria';
    this.el.menu.hidden = !enJuego;
    this.el.accion.hidden = !enJuego;
    this.el.equipo.hidden = !enJuego;
    this.el.objetivo.hidden = !enJuego;

    if (estado) {
      const j = jugador(estado);
      this.el.cabecera.innerHTML = `
        <div class="oro ${j.oro < 0 ? 'negativo' : ''}"><span>Oro</span><b>${num(j.oro)}</b></div>
        <div class="calendario">${esc(textoCalendario(estado))} · ${esc(j.nombre)} · ${puesto(estado, j.id)}.º del ranking</div>`;
    } else {
      this.el.cabecera.innerHTML = '<div class="oro"><span>Gremio</span><b>de héroes</b></div>';
    }

    if (enJuego && estado) {
      if (estado.fase === 'prueba') {
        this.el.objetivo.innerHTML = `<button class="boton-dia novatos" data-abrir="prueba">Prueba de los Novatos<small>Los gremios pujan por los novatos</small></button>`;
      } else {
        const faltan = diasParaPrueba(estado.dia);
        const pista = esDia7(estado.dia)
          ? `Hoy se pagan los sueldos (${num(sueldosDe(estado, estado.jugadorId))}) y después llega la Prueba de los Novatos`
          : `Prueba de los Novatos en ${faltan} ${faltan === 1 ? 'día' : 'días'}`;
        this.el.objetivo.innerHTML = `<button class="boton-dia" data-accion="finalizar">Finalizar día<small>${pista}</small></button>`;
      }
      const libres = heroesLibres(estado).length;
      const bloqueo = estado.fase !== 'gestion' ? 'disabled' : '';
      const todos = heroesDe(estado, estado.jugadorId);
      const cuenta = (e: Heroe['estado']): number => todos.filter((h) => h.estado === e).length;
      const resumen = [`${libres} ${libres === 1 ? 'libre' : 'libres'}`, cuenta('en mision') ? `${cuenta('en mision')} de misión` : '', cuenta('lesionado') ? `${cuenta('lesionado')} ${cuenta('lesionado') === 1 ? 'lesionado' : 'lesionados'}` : '']
        .filter(Boolean)
        .join(' · ');
      const sinCobrar = todos.some((h) => h.semanasSinCobrar > 0) ? '<em class="alerta-texto">Hay héroes sin cobrar</em>' : '';
      this.el.menu.innerHTML = `<button class="boton-grande gastar" data-abrir="gremio" data-pestana="heroes" ${bloqueo}><span class="signo">−</span>Gestionar gremio<small>Héroes: ${resumen}</small><small>Reclutar y mejorar instalaciones</small>${sinCobrar}</button>`;
      this.el.equipo.innerHTML = `<button class="boton-grande ganar" data-abrir="misiones" ${bloqueo}><span class="signo">+</span>Lanzar misiones<small>${estado.tablon.length} en el tablón · ${libres} ${libres === 1 ? 'héroe libre' : 'héroes libres'}</small></button>`;
      this.el.accion.innerHTML = `<button class="boton-grande mercado" data-abrir="mercado" ${bloqueo}>Mercado de héroes<small>Compra a otros gremios o vende a los tuyos</small></button>`;
    }

    if (!this.abierto) {
      this.el.panel.hidden = true;
      this.el.panel.innerHTML = '';
      return;
    }
    this.el.panel.hidden = false;
    this.el.panel.dataset.panel = this.abierto;
    const cerrable = !FIJOS.includes(this.abierto);
    this.el.panel.innerHTML = `
      <div class="panel-cabecera">
        <h2>${TITULOS[this.abierto]}</h2>
        ${cerrable ? '<button data-accion="cerrar" aria-label="Cerrar">✕</button>' : ''}
      </div>
      ${this.mensaje ? `<p class="mensaje">${esc(this.mensaje)}</p>` : ''}
      <div class="panel-cuerpo">${this.contenido()}</div>`;
  }

  private contenido(): string {
    const estado = this.estado;
    if (this.abierto === 'nueva' || !estado) return this.panelNueva();
    switch (this.abierto) {
      case 'misiones':
        return this.panelMisiones(estado);
      case 'mercado':
        return this.panelMercado(estado);
      case 'gremio':
        return this.panelGremio(estado);
      case 'prueba':
        return this.panelPrueba(estado);
      case 'dia':
        return this.panelDia(estado);
      case 'semana':
        return this.panelSemana(estado);
      case 'victoria':
        return this.panelVictoria(estado);
      default:
        return '';
    }
  }

  // ---------------------------------------------------------------------------
  // Piezas
  // ---------------------------------------------------------------------------

  private potencial(estado: EstadoJuego, h: Heroe): string {
    const [, max] = rangoPotencial(h, jugador(estado).nivelOjeadores);
    return `<span class="rango potencial r${max}" title="Potencial: hasta dónde puede crecer. La instalación de ojeadores estrecha el rango.">${esc(textoPotencial(h, jugador(estado).nivelOjeadores))}</span>`;
  }

  private carta(estado: EstadoJuego, h: Heroe, pie: string, extraClase = ''): string {
    const estadoTexto =
      h.estado === 'libre'
        ? ''
        : `<span class="estado-chip e-${h.estado.replace(' ', '-')}">${esc(h.estado === 'lesionado' ? `lesionado · ${h.diasLesion} d.` : h.estado)}</span>`;
    return `<article class="carta ${extraClase}">
      <header>
        ${this.potencial(estado, h)}
        <div class="quien"><strong>${esc(h.nombre)}</strong><span class="tenue">Reputación ${h.reputacion} · Lealtad ${h.lealtad}</span></div>
        ${estadoTexto}
      </header>
      <div class="poder"><b>${num(h.poder)}</b><span>Poder</span><p>Sueldo ${num(sueldo(h))} de oro por semana</p></div>
      <footer>${pie}</footer>
    </article>`;
  }

  // ---------------------------------------------------------------------------
  // Paneles
  // ---------------------------------------------------------------------------

  private panelNueva(): string {
    return `
      <p>Diriges el <strong>peor gremio de héroes</strong> del reino: último del ranking, con poco oro y tres aventureros sin fama.</p>
      <p><strong>Tu reto:</strong> gana oro con misiones, invierte en héroes y en tu sede, y lleva al gremio al número uno. Cada día pulsa <em>Finalizar día</em>; cada 7 días se pagan los sueldos y se celebra la Prueba de los Novatos.</p>
      <label class="campo">Nombre del gremio <input id="nombre" maxlength="28" value="Llama Menguante" /></label>
      <button data-accion="empezar" class="principal">Empezar</button>`;
  }

  private panelMisiones(estado: EstadoJuego): string {
    const mision = estado.tablon.find((m) => m.id === this.misionId);
    if (!mision) return this.tablon(estado);
    return this.formacion(estado, mision);
  }

  private tablon(estado: EstadoJuego): string {
    const tarjetas = estado.tablon
      .map((m) => {
        const prob = probabilidadRecomendada(estado, m);
        const r = RANGO[m.rango];
        return `<button class="tarjeta-mision t-${m.rango}" data-accion="elegir-mision" data-id="${m.id}">
          <span class="nivel">${r.nombre}</span>
          <span class="titulo-mision">${esc(m.titulo)}</span>
          <span class="oro-mision">+${num(m.recompensa)}<small>oro</small></span>
          <span class="tenue">${m.duracion} ${m.duracion === 1 ? 'día' : 'días'} · ${m.equipo} ${m.equipo === 1 ? 'héroe' : 'héroes'} · ${r.riesgo}</span>
          <span class="dificultad d-${nivelDificultad(prob)}">${prob === null ? 'Sin héroes libres' : `${pct(prob)} de éxito`}</span>
        </button>`;
      })
      .join('');
    const fuera = estado.enCurso
      .filter((c) => c.gremioId === estado.jugadorId)
      .map((c) => {
        const vuelve = c.diaVuelta - estado.dia;
        const nombres = c.equipo.map((id) => obtenerHeroe(estado, id).nombre.split(' ')[0]).join(', ');
        return `<li>«${esc(c.mision.titulo)}» · ${esc(nombres)} · ${vuelve === 0 ? 'vuelve hoy al finalizar el día' : `vuelve en ${vuelve + 1} días`}</li>`;
      })
      .join('');
    return `${tarjetas ? `<p>Puedes lanzar las tres misiones si tienes héroes libres. Los enviados no vuelven hasta que termina la misión.</p><div class="tres">${tarjetas}</div>` : '<p>Ya has lanzado todas las misiones de hoy. Mañana habrá un tablón nuevo.</p>'}
      ${fuera ? `<h3>De misión</h3><ul class="lista">${fuera}</ul>` : ''}`;
  }

  private formacion(estado: EstadoJuego, mision: Mision): string {
    const libres = heroesLibres(estado).sort((a, b) => b.poder - a.poder);
    this.equipo = this.equipo.filter((id) => libres.some((h) => h.id === id));
    const equipo = this.equipo.map((id) => obtenerHeroe(estado, id));
    const prob = equipo.length ? probabilidadExito(poderEquipo(equipo), mision.dificultad) : null;
    const fichas = libres
      .map((h) => {
        const va = this.equipo.includes(h.id);
        return `<button class="ficha-heroe ${va ? 'va' : ''}" data-accion="alternar" data-id="${h.id}" aria-pressed="${va}">
          ${this.potencial(estado, h)}
          <span class="quien"><strong>${esc(h.nombre.split(' ')[0] ?? '')}</strong><span class="tenue">poder ${num(h.poder)}</span></span>
          <span class="marca">${va ? '✓' : '+'}</span>
        </button>`;
      })
      .join('');
    const ocupados = heroesDe(estado, estado.jugadorId)
      .filter((h) => h.estado !== 'libre')
      .map((h) => `${esc(h.nombre.split(' ')[0] ?? '')} (${h.estado === 'lesionado' ? `lesionado, ${h.diasLesion} d.` : 'de misión'})`)
      .join(', ');
    const r = RANGO[mision.rango];
    const motivo = motivoNoLanzar(estado, mision.id, this.equipo);
    return `<div class="cabecera-mision">
        <div><span class="nivel t-${mision.rango}">${r.nombre}</span> <strong>${esc(mision.titulo)}</strong>
          <div class="tenue">+${num(mision.recompensa)} oro · ${mision.duracion} ${mision.duracion === 1 ? 'día' : 'días'} · elige <strong>${mision.equipo}</strong> ${mision.equipo === 1 ? 'héroe' : 'héroes'}. Ya te proponemos un equipo.</div></div>
        <div class="medidor d-${nivelDificultad(prob)}"><b>${prob === null ? '—' : pct(prob)}</b><span>de éxito</span></div>
      </div>
      <div class="fichas">${fichas || '<p class="tenue">No tienes héroes libres.</p>'}</div>
      ${ocupados ? `<p class="tenue">No disponibles: ${ocupados}. <button data-accion="ir-heroes">Ver héroes</button></p>` : ''}
      <p class="tenue">Si fracasa, cobras menos y alguien puede lesionarse.</p>
      <div class="botones"><button data-accion="otra-mision">Volver al tablón</button><button data-accion="lanzar" class="principal" ${motivo ? `disabled title="${esc(motivo)}"` : ''}>Lanzar misión</button></div>`;
  }

  private panelMercado(estado: EstadoJuego): string {
    const pestañas = `<div class="pestanas">
      <button data-accion="pestana-mercado" data-id="comprar" class="${this.pestanaMercado === 'comprar' ? 'activo' : ''}">Comprar</button>
      <button data-accion="pestana-mercado" data-id="vender" class="${this.pestanaMercado === 'vender' ? 'activo' : ''}">Vender</button>
    </div>`;
    if (this.pestanaMercado === 'vender') {
      const cartas = heroesDe(estado, estado.jugadorId)
        .map((h) => {
          const oferta = ofertaVenta(estado, h.id);
          const comprador = oferta ? estado.gremios[oferta.compradorId]?.nombre : null;
          const pie = oferta
            ? `<span class="precio">${esc(comprador ?? '')}</span><button class="principal" data-accion="vender" data-id="${h.id}">Vender por ${num(oferta.precio)}</button>`
            : `<span class="tenue">${h.estado === 'en mision' ? 'Está de misión' : 'Ahora nadie lo compraría'}</span>`;
          return this.carta(estado, h, pie);
        })
        .join('');
      return `${pestañas}<p class="tenue">Vende un héroe para conseguir oro al instante. Piénsalo: quien se va no vuelve.</p><div class="cartas">${cartas || '<p class="tenue">No tienes héroes.</p>'}</div>`;
    }
    const selector = rivales(estado)
      .map((g) => `<button data-accion="ver-gremio" data-id="${g.id}" class="${this.gremioRival === g.id ? 'activo' : ''}">${esc(g.nombre)}</button>`)
      .join('');
    const rival = estado.gremios[this.gremioRival];
    const cartas = heroesDe(estado, this.gremioRival)
      .map((h) => ({ h, c: condicionesCompra(estado, h.id) }))
      .sort((a, b) => a.c.precio - b.c.precio)
      .map(({ h, c }) =>
        this.carta(
          estado,
          h,
          `<button class="principal" data-accion="comprar" data-id="${h.id}" ${c.bloqueo ? `disabled title="${esc(c.bloqueo)}"` : ''}>Comprar por ${num(c.precio)}</button>${c.bloqueo ? `<span class="tenue">${esc(c.bloqueo)}</span>` : ''}`,
          c.bloqueo ? 'caro' : '',
        ),
      )
      .join('');
    return `${pestañas}<div class="pestanas pequenas">${selector}</div>
      ${rival ? `<p class="tenue">${esc(rival.nombre)} · ${esc(rival.personalidad ?? '')}: ${esc(rival.estrategia ?? '')}</p>` : ''}
      <div class="cartas">${cartas}</div>`;
  }

  private panelGremio(estado: EstadoJuego): string {
    const nombres: Record<PestanaGremio, string> = { heroes: 'Héroes', reclutar: 'Reclutar', instalaciones: 'Instalaciones', ranking: 'Ranking' };
    const pestañas = `<div class="pestanas">${(Object.keys(nombres) as PestanaGremio[])
      .map((p) => `<button data-accion="pestana-gremio" data-id="${p}" class="${this.pestanaGremio === p ? 'activo' : ''}">${nombres[p]}</button>`)
      .join('')}</div>`;
    const j = jugador(estado);
    switch (this.pestanaGremio) {
      case 'reclutar': {
        const cartas = estado.reclutas
          .map((id) => {
            const c = condicionesRecluta(estado, id);
            return this.carta(
              estado,
              obtenerHeroe(estado, id),
              `<button class="principal" data-accion="reclutar" data-id="${id}" ${c.bloqueo ? 'disabled' : ''}>Reclutar por ${num(c.precio)}</button>${c.bloqueo ? `<span class="tenue">${esc(c.bloqueo)}</span>` : ''}`,
            );
          })
          .join('');
        return `${pestañas}<p class="tenue">Aventureros modestos que buscan gremio. Llegan nuevos cada semana. Los grandes talentos se disputan en la Prueba de los Novatos.</p>
          <div class="cartas">${cartas || '<p class="tenue">Esta semana no queda nadie. Vuelve la semana que viene.</p>'}</div>`;
      }
      case 'instalaciones': {
        const filas = (['sede', 'ojeadores'] as Instalacion[])
          .map((tipo) => {
            const info = infoInstalacion(estado, j.id, tipo);
            const extra = tipo === 'sede' ? `${plazas(j)} plazas` : `Potencial visto con ${balance.instalaciones.ojeadores.anchura[info.nivel] ?? 1} letra(s) de margen`;
            return `<section class="sede-nivel">
              <div class="nivel-actual"><span class="tenue">${NOMBRE_INSTALACION[tipo]}</span><b>Nivel ${info.nivel}</b><span class="tenue">${esc(extra)}</span></div>
              <div class="mejora"><p>${TEXTO_INSTALACION[tipo]}</p>
                ${info.coste !== null ? `<button class="principal" data-accion="mejorar" data-id="${tipo}" ${info.bloqueo ? 'disabled' : ''}>Mejorar por ${num(info.coste)}</button>${info.bloqueo ? ` <span class="tenue">${esc(info.bloqueo)}</span>` : ''}` : '<span class="tenue">Al máximo.</span>'}
              </div>
            </section>`;
          })
          .join('');
        return `${pestañas}${filas}`;
      }
      case 'ranking':
        return `${pestañas}${this.tablaRanking(estado)}
          <p class="tenue">Puntos = Fuerza (poder de tus 5 mejores héroes) + Prestigio (instalaciones, misiones de rango alto y novatos destacados fichados). El ranking oficial se actualiza el día 7; al final de cada temporada (28 días) se reparte un premio según la posición.</p>`;
      default:
        return `${pestañas}${this.inventario(estado)}`;
    }
  }

  /** Inventario de héroes: quién está libre, de misión o lesionado, con la curación a mano. */
  private inventario(estado: EstadoJuego): string {
    const j = jugador(estado);
    const heroes = heroesDe(estado, j.id).sort((a, b) => b.poder - a.poder);
    const fila = (h: Heroe): string => {
      let detalle = '';
      let accion = '';
      if (h.estado === 'en mision') {
        const m = misionDe(estado, h.id);
        const vuelve = m ? m.diaVuelta - estado.dia : 0;
        detalle = m ? `«${esc(m.mision.titulo)}» · ${vuelve === 0 ? 'vuelve hoy al finalizar el día' : `vuelve en ${vuelve + 1} días`}` : '';
      } else if (h.estado === 'lesionado') {
        const c = condicionesCuracion(estado, h.id);
        detalle = `${h.diasLesion} ${h.diasLesion === 1 ? 'día' : 'días'} de reposo`;
        accion = `<button class="principal" data-accion="curar" data-id="${h.id}" ${c.bloqueo ? `disabled title="${esc(c.bloqueo)}"` : ''}>Curar por ${num(c.precio)}</button>`;
      } else {
        detalle = 'Listo para una misión';
      }
      const aviso = h.semanasSinCobrar > 0
        ? `<span class="alerta-texto">Sin cobrar ${h.semanasSinCobrar} ${h.semanasSinCobrar === 1 ? 'semana' : 'semanas'}: se irá si no cobra el próximo día 7</span>`
        : '';
      return `<div class="fila-heroe e-${h.estado.replace(' ', '-')}">
        ${this.potencial(estado, h)}
        <div class="quien"><strong>${esc(h.nombre)}</strong><span class="tenue">Poder ${h.poder} · sueldo ${num(sueldo(h))} · lealtad ${h.lealtad}</span>${aviso}</div>
        <div class="situacion"><span class="estado-chip e-${h.estado.replace(' ', '-')}">${h.estado === 'en mision' ? 'de misión' : h.estado}</span><span class="tenue">${detalle}</span></div>
        <div class="accion-fila">${accion}</div>
      </div>`;
    };
    const grupos: [Heroe['estado'], string][] = [['lesionado', 'Lesionados'], ['en mision', 'De misión'], ['libre', 'Libres']];
    const bloques = grupos
      .map(([e, titulo]) => {
        const lista = heroes.filter((h) => h.estado === e);
        return lista.length ? `<h3>${titulo} · ${lista.length}</h3><div class="inventario">${lista.map(fila).join('')}</div>` : '';
      })
      .join('');
    return `<p class="tenue">${j.plantilla.length} de ${plazas(j)} plazas · sueldos de la semana: <strong>${num(sueldosDe(estado, j.id))}</strong> de oro el día 7. Si no llega el oro, cobran primero los más poderosos.</p>
      ${bloques || '<p class="tenue">No tienes héroes.</p>'}`;
  }

  private tablaRanking(estado: EstadoJuego, filas = estado.ranking): string {
    const ahora = new Map(calcularRanking(estado).map((f) => [f.gremioId, f]));
    return `<table><thead><tr><th></th><th>Gremio</th><th class="num">Fuerza</th><th class="num">Prestigio</th><th class="num">Puntos</th><th class="num">Ahora</th></tr></thead><tbody>${filas
      .map((f) => {
        const g = estado.gremios[f.gremioId]!;
        return `<tr class="${g.esJugador ? 'propio' : ''}"><td>${f.puesto}.º</td><td>${esc(g.nombre)}</td><td class="num">${num(f.fuerza)}</td><td class="num">${num(f.prestigio)}</td><td class="num"><b>${num(f.puntos)}</b></td><td class="num tenue">${num(ahora.get(f.gremioId)?.puntos ?? f.puntos)}</td></tr>`;
      })
      .join('')}</tbody></table>`;
  }

  private panelPrueba(estado: EstadoJuego): string {
    const prueba = estado.prueba;
    if (!prueba) return '<div class="botones"><button class="principal" data-accion="cerrar">Volver</button></div>';
    const s = prueba.subasta;
    // 1. Presentación de los novatos.
    if (!s && prueba.resultados.length === 0) {
      const cartas = prueba.pendientes
        .map((id) => {
          const h = obtenerHeroe(estado, id);
          return this.carta(estado, h, `<span class="precio">Despierta con poder <b>${h.poder}</b></span>`);
        })
        .join('');
      return `<p>Ya has pagado los sueldos de la semana: te quedan <strong>${num(jugador(estado).oro)}</strong> de oro. Hoy ${prueba.pendientes.length} jóvenes despiertan sus poderes y los gremios pujan por ellos.</p>
        <p class="tenue">No sabes cuánto valen de verdad: el potencial es un rango. La subasta es por turnos: en cada ronda subes la puja o te retiras.</p>
        <div class="cartas">${cartas}</div>
        <div class="botones"><button data-accion="terminar-prueba">No pujar esta semana</button><button class="principal" data-accion="siguiente-candidato">Empezar la subasta</button></div>`;
    }
    // 2. Subasta en curso o recién terminada.
    if (s) {
      const h = obtenerHeroe(estado, s.heroeId);
      const nombre = (id: string | null): string => (id === null ? 'Nadie' : id === estado.jugadorId ? 'Tú' : estado.gremios[id]?.nombre ?? '');
      const motivo = motivoNoPujar(estado, s);
      const siguen = interesados(estado, s).map(nombre);
      const quedan = prueba.pendientes.length;
      const reaccion = s.ronda === 1 && !s.terminada
        ? siguen.length
          ? `Los maestros de ${siguen.join(', ')} se inclinan hacia delante.`
          : 'Ningún otro maestro parece interesado.'
        : `Siguen en la puja: ${[s.activos.includes(estado.jugadorId) ? 'tú' : '', ...siguen].filter(Boolean).join(', ') || 'nadie'}.`;
      const botones = s.terminada
        ? `<button class="principal" data-accion="siguiente-candidato">${quedan > 0 ? 'Siguiente novato' : 'Ver resultados'}</button>`
        : `<button class="pasar" data-accion="retirarse">Retirarse</button><button class="pujar" data-accion="pujar" ${motivo ? 'disabled' : ''}>Subir a ${num(siguientePrecio(s))}</button>${motivo ? `<span class="tenue aviso-puja">${esc(motivo)}</span>` : ''}`;
      const final = s.terminada
        ? s.lider === estado.jugadorId
          ? `¡${esc(h.nombre)} se une a tu gremio!${esDestacado(h) ? ' Es un novato destacado.' : ''}`
          : s.lider
            ? `Se lo lleva ${esc(nombre(s.lider))}.`
            : 'Nadie lo quiere: vuelve a su aldea.'
        : `Ronda ${s.ronda} · va ganando: ${esc(nombre(s.lider))}`;
      return `<div class="subasta ${s.lider === estado.jugadorId ? 'ganando' : ''}">
          ${this.carta(estado, h, `<span class="precio">Despierta con poder <b>${h.poder}</b></span>`)}
          <div class="marcador">
            <span class="tenue">${s.lider ? 'Puja actual' : 'Precio de salida'}</span><b>${num(s.precio)}</b>
            <span class="lider">${final}</span>
            <span class="tenue">${esc(reaccion)}</span>
            ${botones}
          </div>
        </div>
        <p class="tenue">Tu oro: ${num(jugador(estado).oro)} · Quedan ${quedan} ${quedan === 1 ? 'novato' : 'novatos'} después de este.</p>
        ${s.terminada ? '' : '<div class="botones"><button data-accion="terminar-prueba">Terminar la Prueba sin pujar más</button></div>'}`;
    }
    // 3. Resultados.
    const filas = prueba.resultados
      .map((r) => {
        const h = estado.heroes[r.heroeId];
        const g = r.ganador ? estado.gremios[r.ganador]?.nombre : 'Nadie';
        return `<tr class="${r.ganador === estado.jugadorId ? 'propio' : ''}"><td>${esc(h?.nombre ?? '')}</td><td class="num">${h ? h.poder : ''}</td><td>${esc(g ?? '')}</td><td class="num">${r.ganador ? num(r.precio) : '—'}</td></tr>`;
      })
      .join('');
    return `<table><thead><tr><th>Novato</th><th class="num">Poder</th><th>Gremio</th><th class="num">Precio</th></tr></thead><tbody>${filas}</tbody></table>
      <div class="botones"><button class="principal" data-accion="terminar-prueba">Ver el ranking de la semana</button></div>`;
  }

  private panelDia(estado: EstadoJuego): string {
    const r = this.resumenDia;
    if (!r) return '';
    const misiones = r.informes
      .map((i) => {
        const lesionados = i.partes.filter((p) => p.diasLesion > 0).map((p) => (estado.heroes[p.heroeId]?.nombre ?? '').split(' ')[0]);
        const mejoran = i.partes.filter((p) => p.poderGanado > 0).map((p) => `${(estado.heroes[p.heroeId]?.nombre ?? '').split(' ')[0]} +${p.poderGanado}`);
        return `<div class="resultado r-${i.exito ? 'exito' : 'fracaso'}"><b>${i.exito ? '¡Misión cumplida!' : 'La misión ha fracasado'}</b><span>«${esc(i.mision.titulo)}» · +${num(i.oro)} oro</span>
          ${mejoran.length ? `<p class="tenue">Mejoran: ${esc(mejoran.join(', '))} de poder</p>` : ''}
          ${lesionados.length ? `<p class="caidos">Lesionados: ${esc(lesionados.join(', '))}</p>` : ''}</div>`;
      })
      .join('');
    const nombre = (id: string): string => estado.heroes[id]?.nombre ?? '';
    const p = r.sueldos;
    const sueldos = p
      ? `<div class="resultado ${p.completo ? '' : 'r-fracaso'}"><b>Día de sueldos</b><span>−${num(p.pagado)} oro${p.completo ? '' : ` de ${num(p.total)}`}</span>
          ${p.impagados.length ? `<p class="caidos">Sin cobrar: ${esc(p.impagados.map(nombre).join(', '))}. Pierden lealtad y, si la semana que viene tampoco cobran, se irán.</p>` : ''}
          ${p.seVan.length ? `<p class="caidos">Se van por no cobrar: ${esc(p.seVan.map((x) => `${x.nombre}${x.destino ? ` (a ${estado.gremios[x.destino]?.nombre ?? ''})` : ''}`).join(', '))}.</p>` : ''}</div>`
      : '';
    const noticias = r.noticias.length ? `<h3>Noticias</h3><ul class="lista">${r.noticias.slice(0, 4).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
    const boton = r.prueba
      ? '<button class="principal" data-accion="ir-prueba">Ir a la Prueba de los Novatos</button>'
      : '<button class="principal" data-accion="cerrar">Seguir</button>';
    return `${misiones || '<p>Hoy no ha vuelto ninguna misión.</p>'}${sueldos}${noticias}
      ${r.prueba ? '' : `<p class="tenue">Empieza el ${esc(textoCalendario(estado).split(' · ')[1] ?? '')}.</p>`}
      <div class="botones">${boton}</div>`;
  }

  private panelSemana(estado: EstadoJuego): string {
    const r = this.resumenSemana;
    if (!r) return '';
    const actual = puesto(estado, estado.jugadorId);
    const cambio = r.puestoAnterior - actual;
    const titular = cambio > 0 ? `¡Subes ${cambio} ${cambio === 1 ? 'puesto' : 'puestos'}!` : cambio < 0 ? `Bajas ${-cambio} ${cambio === -1 ? 'puesto' : 'puestos'}.` : 'Te mantienes en el mismo puesto.';
    const temporada = r.temporada
      ? `<div class="resultado"><b>Fin de la temporada ${r.temporada.numero}</b><span>Terminas ${r.temporada.puesto}.º · premio +${num(r.temporada.premio)} oro</span></div>`
      : '';
    return `<p><strong>${titular}</strong> Eres ${actual}.º.</p>${temporada}${this.tablaRanking(estado, r.ranking)}
      <div class="botones"><button class="principal" data-accion="${r.victoria ? 'ver-victoria' : 'cerrar'}">Seguir</button></div>`;
  }

  private panelVictoria(estado: EstadoJuego): string {
    const j = jugador(estado);
    const mejor = heroesDe(estado, j.id).sort((a, b) => b.poder - a.poder)[0];
    return `<p>${esc(j.nombre)} ha cerrado la temporada como <strong>el mejor gremio del reino</strong>. Empezasteis los últimos; ahora todos os miran.</p>
      ${mejor ? `<p class="tenue">Vuestra leyenda: ${esc(mejor.nombre)}, con poder ${mejor.poder} (${letraDe(mejor.poder)}).</p>` : ''}
      <button data-accion="nueva" class="principal">Nueva partida</button>`;
  }

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------

  private alHacerClic(evento: Event): void {
    const objetivo = (evento.target as HTMLElement).closest<HTMLElement>('[data-accion], [data-abrir]');
    if (!objetivo || (objetivo as HTMLButtonElement).disabled) return;
    const abrir = objetivo.dataset.abrir as Panel | undefined;
    if (abrir) {
      if (objetivo.dataset.pestana) this.pestanaGremio = objetivo.dataset.pestana as PestanaGremio;
      return abrir === 'misiones' ? this.abrirMisiones() : this.abrir(abrir);
    }
    try {
      this.ejecutar(objetivo.dataset.accion ?? '', objetivo.dataset.id ?? '');
    } catch (error) {
      this.mensaje = error instanceof Error ? error.message : String(error);
      this.repintar();
    }
  }

  private abrirMisiones(): void {
    this.misionId = null;
    this.equipo = [];
    this.abrir('misiones');
  }

  private ejecutar(accion: string, id: string): void {
    switch (accion) {
      case 'cerrar':
        return this.cerrar();
      case 'empezar': {
        const nombreGremio = document.querySelector<HTMLInputElement>('#nombre')?.value ?? '';
        this.estado = crearPartida({ nombreGremio });
        this.guardar();
        return this.cerrar();
      }
      case 'nueva':
        borrar();
        this.estado = null;
        return this.abrir('nueva');
    }
    const estado = this.estado;
    if (!estado) return;
    switch (accion) {
      case 'finalizar':
        return this.finalizarElDia();
      case 'elegir-mision': {
        this.misionId = id;
        const mision = estado.tablon.find((m) => m.id === id);
        this.equipo = mision ? equipoRecomendado(estado, mision).map((h) => h.id) : [];
        return this.repintar();
      }
      case 'otra-mision':
        this.misionId = null;
        return this.repintar();
      case 'alternar': {
        const mision = estado.tablon.find((m) => m.id === this.misionId);
        if (this.equipo.includes(id)) this.equipo = this.equipo.filter((x) => x !== id);
        else if (mision && this.equipo.length < mision.equipo) this.equipo.push(id);
        else if (mision) this.equipo = [...this.equipo.slice(1), id];
        return this.repintar();
      }
      case 'lanzar': {
        if (!this.misionId) return;
        const mision = estado.tablon.find((m) => m.id === this.misionId);
        lanzarMision(estado, this.misionId, this.equipo);
        this.misionId = null;
        this.equipo = [];
        this.guardar();
        this.mensaje = `Misión lanzada: «${mision?.titulo ?? ''}».`;
        return this.repintar();
      }
      case 'pestana-mercado':
        this.pestanaMercado = id === 'vender' ? 'vender' : 'comprar';
        return this.repintar();
      case 'ver-gremio':
        this.gremioRival = id;
        return this.repintar();
      case 'pestana-gremio':
        this.pestanaGremio = id as PestanaGremio;
        this.mensaje = '';
        return this.repintar();
      case 'comprar': {
        const h = obtenerHeroe(estado, id);
        comprar(estado, id);
        this.mensaje = `${h.nombre} se une a tu gremio.`;
        this.guardar();
        return this.repintar();
      }
      case 'vender': {
        const h = obtenerHeroe(estado, id);
        const oferta = vender(estado, id);
        this.mensaje = `${h.nombre} se va a ${estado.gremios[oferta.compradorId]?.nombre ?? ''} por ${num(oferta.precio)} de oro.`;
        this.guardar();
        return this.repintar();
      }
      case 'reclutar': {
        const h = obtenerHeroe(estado, id);
        reclutar(estado, id);
        this.mensaje = `${h.nombre} se une a tu gremio.`;
        this.guardar();
        return this.repintar();
      }
      case 'mejorar':
        mejorar(estado, estado.jugadorId, id as Instalacion);
        this.mensaje = `¡${NOMBRE_INSTALACION[id as Instalacion]} mejorada!`;
        this.guardar();
        return this.repintar();
      case 'curar': {
        const h = obtenerHeroe(estado, id);
        const precio = curar(estado, id);
        this.mensaje = `${h.nombre} está curado (−${num(precio)} oro).`;
        this.guardar();
        return this.repintar();
      }
      case 'ir-heroes':
        this.pestanaGremio = 'heroes';
        return this.abrir('gremio');
      case 'ir-prueba':
        return this.abrir('prueba');
      case 'siguiente-candidato':
        siguienteCandidato(estado);
        this.guardar();
        return this.repintar();
      case 'pujar':
      case 'retirarse':
        pujarNovato(estado, accion === 'pujar' ? 'pujar' : 'retirarse');
        this.guardar();
        return this.repintar();
      case 'terminar-prueba':
        this.resumenSemana = terminarPrueba(estado);
        this.guardar();
        return this.abrir('semana');
      case 'ver-victoria':
        return this.abrir('victoria');
    }
  }

  private finalizarElDia(): void {
    const estado = this.estado;
    if (!estado || estado.fase !== 'gestion') return;
    this.resumenDia = finalizarDia(estado);
    this.guardar();
    this.abrir('dia');
  }

  private guardar(): void {
    if (this.estado) guardar(this.estado);
  }
}
