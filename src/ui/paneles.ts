// Interfaz principal: el oro en grande y tres botones. A la derecha se gana oro (misiones),
// a la izquierda se gasta (gremio) y en el centro está el mercado. Solo lee el estado y llama al motor.

import { Azar } from '../motor/azar';
import { esDiaDeNovatos, heroe as obtenerHeroe, heroesDe, jugador, puesto, tabla, type EstadoJuego } from '../motor/estado';
import { valorMercado } from '../motor/heroes';
import { POSICION_NATURAL, aportacion, vistaPreviaMision, type MiembroEquipo } from '../motor/misiones';
import { comprar, condicionesCompra, ofertaVenta, vender } from '../motor/mercado';
import { crearPartida, enviarMision, semanaActual, terminarDia, type ResumenDia } from '../motor/partida';
import { infoSede, mejorarSede } from '../motor/sede';
import {
  avanzar,
  cerrarSubasta,
  crearSubasta,
  puedePujar,
  pujar,
  siguientePujaJugador,
  type Subasta,
} from '../motor/subasta';
import type { Heroe } from '../motor/tipos';
import { AYUDA_RASGO, equipoRecomendado, heroesLibres, nivelDificultad, probabilidadConMejorEquipo } from './ayudas';
import { borrar, cargar, guardar } from './guardado';
import { esc, num, pct } from './html';

export type Panel = 'nueva' | 'mision' | 'mercado' | 'gremio' | 'novatos' | 'dia' | 'fin';

const TITULOS: Record<Panel, string> = {
  nueva: 'Gremio Rango D',
  mision: 'Lanzar misión',
  mercado: 'Mercado',
  gremio: 'Gestionar gremio',
  novatos: 'Prueba de Novatos',
  dia: 'Fin del día',
  fin: 'Fin de la temporada',
};

const DIFICULTAD: Record<string, { nombre: string; texto: string }> = {
  segura: { nombre: 'Fácil', texto: 'Poco oro, casi sin riesgo' },
  justa: { nombre: 'Media', texto: 'Buen oro, algo de riesgo' },
  arriesgada: { nombre: 'Difícil', texto: 'Mucho oro; tus héroes pueden caer' },
};

const ROL: Record<string, string> = {
  Tanque: 'Protege al resto del equipo',
  Guerrero: 'Ataque cuerpo a cuerpo',
  Mago: 'Ataque mágico',
  Sanador: 'Salva a un compañero de la muerte',
  Explorador: 'Rápido y ágil',
  Soporte: '+10% de éxito al equipo',
};

const ICONO_VINCULO = { Romance: '♥', Familia: '⌂', Amistad: '✋', Rivalidad: '⚔' } as const;

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
  private equipo = new Set<string>();
  private pestanaMercado: 'comprar' | 'vender' = 'comprar';
  private gremioRival = 'alba';
  private subasta: Subasta | null = null;
  private relojSubasta: number | null = null;
  private resumen: ResumenDia | null = null;

  constructor(private readonly el: ElementosInterfaz) {
    for (const zona of [el.panel, el.menu, el.accion, el.objetivo, el.equipo, el.cabecera]) {
      zona.addEventListener('click', (e) => this.alHacerClic(e));
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.abierto && !['nueva', 'fin', 'novatos'].includes(this.abierto)) this.cerrar();
    });
    if (!this.estado) this.abrir('nueva');
    else if (this.estado.fin) this.abrir('fin');
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
    if (!this.estado || this.estado.fin) return;
    if (punto === 'puerta') return this.terminarElDia();
    const destino: Record<string, Panel> = { tablon: 'mision', mostrador: 'mercado', elara: 'gremio', dormitorios: 'gremio', pizarra: 'gremio' };
    const panel = destino[punto];
    if (panel) this.abrir(panel);
  }

  // ---------------------------------------------------------------------------
  // Pantalla principal
  // ---------------------------------------------------------------------------

  private repintar(): void {
    const estado = this.estado;
    const enJuego = !!estado && !estado.fin;
    this.el.menu.hidden = !enJuego;
    this.el.accion.hidden = !enJuego;
    this.el.equipo.hidden = !enJuego;
    this.el.objetivo.hidden = !enJuego;

    if (estado) {
      const j = jugador(estado);
      this.el.cabecera.innerHTML = `
        <div class="oro ${j.oro < 0 ? 'negativo' : ''}"><span>Oro</span><b>${num(j.oro)}</b></div>
        <div class="calendario">Día ${estado.partida.dia} de 28 · Semana ${semanaActual(estado)} · Puesto ${puesto(estado, j.id)}.º</div>`;
    } else {
      this.el.cabecera.innerHTML = '<div class="oro"><span>Gremio</span><b>Rango D</b></div>';
    }

    if (enJuego && estado) {
      const novatos = esDiaDeNovatos(estado.partida.dia) && estado.novatos.length > 0;
      const misionHoy = estado.enCurso.some((c) => c.gremioId === estado.jugadorId);
      const faltan = 7 - (((estado.partida.dia - 1) % 7) + 1);
      this.el.objetivo.innerHTML = novatos
        ? `<button class="boton-dia novatos" data-abrir="novatos">Prueba de Novatos<small>${estado.novatos.length} novatos esperan</small></button>`
        : `<button class="boton-dia" data-accion="terminar">Terminar día<small>${esDiaDeNovatos(estado.partida.dia) ? 'Hoy se pagan los sueldos de la semana' : `Prueba de Novatos en ${faltan} ${faltan === 1 ? 'día' : 'días'}`}</small></button>`;
      // Izquierda: gastar. Derecha: ganar. Centro: mercado.
      this.el.menu.innerHTML = `<button class="boton-grande gastar" data-abrir="gremio"><span class="signo">−</span>Gestionar gremio<small>Gasta oro: mejora la sede</small></button>`;
      this.el.equipo.innerHTML = `<button class="boton-grande ganar" data-abrir="mision" ${misionHoy || estado.tablon.length === 0 ? 'disabled' : ''}><span class="signo">+</span>Lanzar misión<small>${misionHoy ? 'Tu equipo vuelve al terminar el día' : 'Gana oro: elige 1 de 3'}</small></button>`;
      this.el.accion.innerHTML = `<button class="boton-grande mercado" data-abrir="mercado">Mercado<small>Compra y vende héroes</small></button>`;
    }

    if (!this.abierto) {
      this.el.panel.hidden = true;
      this.el.panel.innerHTML = '';
      return;
    }
    this.el.panel.hidden = false;
    this.el.panel.dataset.panel = this.abierto;
    const cerrable = !['nueva', 'fin', 'novatos'].includes(this.abierto);
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
      case 'mision':
        return this.panelMision(estado);
      case 'mercado':
        return this.panelMercado(estado);
      case 'gremio':
        return this.panelGremio(estado);
      case 'novatos':
        return this.panelNovatos(estado);
      case 'dia':
        return this.panelDia(estado);
      case 'fin':
        return this.panelFin(estado);
      default:
        return '';
    }
  }

  // ---------------------------------------------------------------------------
  // Paneles
  // ---------------------------------------------------------------------------

  private panelNueva(): string {
    return `
      <p>El Cristal de Resonancia te ha marcado como rango D. Solo un gremio te ha querido: la Llama Menguante, con una única maga, Elara, y muchas deudas.</p>
      <p><strong>Tu reto:</strong> gana oro con misiones, gástalo en héroes y en mejorar la sede, y lleva al gremio a lo más alto en 28 días.</p>
      <label class="campo">Tu nombre <input id="nombre" maxlength="24" value="Aventurero" /></label>
      <label class="campo casilla"><input id="clemente" type="checkbox" /> Modo Clemente: los héroes no mueren</label>
      <button data-accion="empezar" class="principal">Empezar</button>`;
  }

  private carta(estado: EstadoJuego, h: Heroe, pie: string, extraClase = ''): string {
    const poder = Math.round(aportacion({ heroe: h, posicion: POSICION_NATURAL[h.clase] }, []));
    const vinculos = h.vinculos
      .map((v) => {
        const otro = estado.heroes[v.con];
        return otro ? `<span class="chip vinculo" title="${esc(`${v.tipo} con ${otro.nombre}`)}">${ICONO_VINCULO[v.tipo]} ${esc(otro.nombre.split(' ')[0] ?? '')}</span>` : '';
      })
      .join('');
    const rasgos = h.rasgos.map((r) => `<span class="chip" title="${esc(AYUDA_RASGO[r] ?? r)}">${esc(r)}</span>`).join('');
    const estadoTexto = h.estado === 'disponible' ? '' : `<span class="estado-chip e-${h.estado.replace(' ', '-')}">${esc(h.estado)}${h.diasFuera ? ` · ${h.diasFuera} d.` : ''}</span>`;
    const potencial = h.potencialVisible && h.potencial !== h.rango ? `<span class="tenue" title="Puede crecer hasta este rango">→ ${h.potencial}</span>` : '';
    return `<article class="carta ${extraClase}">
      <header>
        <span class="rango r${h.rango}">${h.rango}</span>${potencial}
        <div class="quien"><strong>${esc(h.nombre)}</strong><span class="tenue">${esc(h.clase)} · ${esc(h.edad)} años</span></div>
        ${estadoTexto}
      </header>
      <div class="poder"><b>${num(poder)}</b><span>Poder</span><p>${ROL[h.clase]}</p></div>
      ${rasgos || vinculos ? `<div class="chips">${rasgos}${vinculos}</div>` : ''}
      <footer>${pie}</footer>
    </article>`;
  }

  private panelMision(estado: EstadoJuego): string {
    const mision = estado.tablon.find((m) => m.id === this.misionId);
    if (!mision) {
      const tarjetas = estado.tablon
        .map((m) => {
          const prob = probabilidadConMejorEquipo(estado, m);
          const d = DIFICULTAD[m.tipo ?? 'justa']!;
          return `<button class="tarjeta-mision t-${m.tipo}" data-accion="elegir-mision" data-id="${m.id}">
            <span class="nivel">${d.nombre}</span>
            <span class="oro-mision">+${num(m.recompensa.oro)}<small>oro</small></span>
            <span class="tenue">${d.texto}</span>
            <span class="dificultad d-${nivelDificultad(prob)}">${prob === null ? 'Sin héroes libres' : `${pct(prob)} de éxito`}</span>
          </button>`;
        })
        .join('');
      return `<p>Elige <strong>una</strong> misión. Tu equipo vuelve al terminar el día.</p><div class="tres">${tarjetas}</div>`;
    }
    const libres = heroesLibres(estado);
    for (const id of [...this.equipo]) if (!libres.some((h) => h.id === id)) this.equipo.delete(id);
    const miembros: MiembroEquipo[] = [...this.equipo].map((id) => {
      const h = obtenerHeroe(estado, id);
      return { heroe: h, posicion: POSICION_NATURAL[h.clase] };
    });
    const vista = vistaPreviaMision(mision, miembros, { despertarII: estado.partida.despertares >= 2 });
    const riesgo = new Map(vista.riesgos.map((r) => [r.heroeId, r.riesgo]));
    const fichas = libres
      .map((h) => {
        const va = this.equipo.has(h.id);
        const r = riesgo.get(h.id);
        const poder = Math.round(aportacion({ heroe: h, posicion: POSICION_NATURAL[h.clase] }, []));
        return `<button class="ficha-heroe ${va ? 'va' : ''}" data-accion="alternar" data-id="${h.id}" aria-pressed="${va}">
          <span class="rango r${h.rango}">${h.rango}</span>
          <span class="quien"><strong>${esc(h.nombre.split(' ')[0] ?? '')}</strong><span class="tenue">${esc(h.clase)} · poder ${num(poder)}</span></span>
          <span class="marca">${va ? (estado.partida.modoClemente || r === undefined ? '✓' : `✓ ${r.toFixed(0)}% riesgo`) : '+'}</span>
        </button>`;
      })
      .join('');
    const d = DIFICULTAD[mision.tipo ?? 'justa']!;
    const valido = this.equipo.size >= 1;
    return `<div class="cabecera-mision">
        <div><span class="nivel t-${mision.tipo}">${d.nombre}</span> <strong>+${num(mision.recompensa.oro)} oro</strong><div class="tenue">Pulsa a los héroes que van (máximo 5). Ya te proponemos un equipo.</div></div>
        <div class="medidor d-${this.equipo.size ? nivelDificultad(vista.probabilidad) : 'sin-equipo'}"><b>${this.equipo.size ? pct(vista.probabilidad) : '—'}</b><span>de éxito</span></div>
      </div>
      <div class="fichas">${fichas || '<p class="tenue">No tienes héroes libres.</p>'}</div>
      <div class="botones"><button data-accion="otra-mision">Otra misión</button><button data-accion="enviar" class="principal" ${valido ? '' : 'disabled'}>Lanzar misión</button></div>`;
  }

  private panelMercado(estado: EstadoJuego): string {
    const pestañas = `<div class="pestanas">
      <button data-accion="pestana" data-id="comprar" class="${this.pestanaMercado === 'comprar' ? 'activo' : ''}">Comprar</button>
      <button data-accion="pestana" data-id="vender" class="${this.pestanaMercado === 'vender' ? 'activo' : ''}">Vender</button>
    </div>`;
    if (this.pestanaMercado === 'vender') {
      const cartas = heroesDe(estado, estado.jugadorId)
        .filter((h) => h.id !== 'h_000_elara')
        .map((h) => {
          const oferta = ofertaVenta(estado, h.id);
          const comprador = oferta ? estado.gremios[oferta.compradorId]?.nombre : null;
          const pie = oferta
            ? `<span class="precio">${esc(comprador ?? '')}</span><button class="principal" data-accion="vender" data-id="${h.id}">Vender por ${num(oferta.precio)}</button>`
            : '<span class="tenue">Ahora nadie lo compraría</span>';
          return this.carta(estado, h, pie);
        })
        .join('');
      return `${pestañas}<p class="tenue">Vende un héroe para conseguir oro al instante. Si tenía familia o pareja en el gremio, les dolerá.</p><div class="cartas">${cartas || '<p class="tenue">No tienes héroes que vender. Elara nunca se vende.</p>'}</div>`;
    }
    const gremios = Object.values(estado.gremios).filter((g) => !g.esJugador);
    const selector = gremios
      .map((g) => `<button data-accion="ver-gremio" data-id="${g.id}" class="${this.gremioRival === g.id ? 'activo' : ''}">${esc(g.nombre)}</button>`)
      .join('');
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
    return `${pestañas}<p class="tenue">Compra héroes de otros gremios. Los novatos llegan cada día 7 en la Prueba de Novatos.</p>
      <div class="pestanas pequenas">${selector}</div><div class="cartas">${cartas}</div>`;
  }

  private panelGremio(estado: EstadoJuego): string {
    const info = infoSede(estado);
    const sede = `<section class="sede-nivel">
      <div class="nivel-actual"><span class="tenue">Sede</span><b>Nivel ${info.nivel}</b><span class="tenue">${info.plazas} plazas para héroes</span></div>
      ${
        info.siguiente
          ? `<div class="mejora"><p>Nivel ${info.nivel + 1}: <strong>${info.siguiente.plazas} plazas</strong> y <strong>+${info.siguiente.prestigio} de prestigio</strong> para subir en la clasificación.</p>
             <button class="principal" data-accion="mejorar" ${info.bloqueo ? 'disabled' : ''}>Mejorar por ${num(info.siguiente.coste)}</button>${info.bloqueo ? ` <span class="tenue">${esc(info.bloqueo)}</span>` : ''}</div>`
          : '<p>La sede está al máximo.</p>'
      }
    </section>`;
    const j = jugador(estado);
    const cartas = heroesDe(estado, j.id)
      .map((h) => this.carta(estado, h, `<span class="precio">${h.id === 'h_000_elara' ? 'Maestra del gremio' : `Sueldo ${num(h.contrato?.salario ?? 0)}/semana`}</span>`))
      .join('');
    const filas = tabla(estado)
      .map((f) => {
        const g = estado.gremios[f.gremioId]!;
        return `<tr class="${g.esJugador ? 'propio' : ''}"><td>${f.puesto}.º</td><td>${esc(g.nombre)}</td><td class="num">${num(Math.round(f.puntos))}</td></tr>`;
      })
      .join('');
    return `${sede}
      <h3>Tus héroes · ${j.plantilla.length} de ${j.plantillaMax}</h3><div class="cartas">${cartas}</div>
      <h3>Clasificación</h3><table><thead><tr><th></th><th>Gremio</th><th class="num">Puntos</th></tr></thead><tbody>${filas}</tbody></table>
      <p class="tenue">Ganas puntos con cada misión cumplida y con el prestigio que consigues esta temporada.</p>`;
  }

  private panelNovatos(estado: EstadoJuego): string {
    const s = this.subasta;
    if (!s) {
      const cartas = estado.novatos
        .map((id) => this.carta(estado, obtenerHeroe(estado, id), `<span class="precio">Vale unos ${num(valorMercado(obtenerHeroe(estado, id)))}</span>`))
        .join('');
      return estado.novatos.length
        ? `<p>Hoy los novatos despiertan sus poderes. Puja por los que te parezcan prometedores: cuando el reloj llegue a cero, gana la puja más alta. <strong>Los que tienen un vínculo ♥ con tu gremio te prefieren.</strong></p>
           <div class="cartas">${cartas}</div><div class="botones"><button class="principal" data-accion="empezar-subasta">Empezar la subasta</button></div>`
        : `<p>La Prueba de Novatos ha terminado.</p><div class="botones"><button class="principal" data-accion="cerrar-novatos">Volver a la sede</button></div>`;
    }
    const h = obtenerHeroe(estado, s.heroeId);
    const lider = s.lider ? (s.lider === estado.jugadorId ? 'Tú' : estado.gremios[s.lider]?.nombre ?? '') : 'Nadie';
    const motivo = puedePujar(estado, s);
    const quedan = estado.novatos.filter((id) => id !== s.heroeId).length;
    const porcentaje = Math.max(0, Math.min(100, (s.tiempo / 10) * 100));
    const boton = s.terminada
      ? `<button class="principal" data-accion="siguiente-novato">${quedan > 0 ? 'Siguiente novato' : 'Terminar la prueba'}</button>`
      : `<button class="pasar" data-accion="pasar" title="No pujar por este novato">Pasar</button><button class="pujar" data-accion="pujar" ${motivo ? 'disabled' : ''}>${motivo === 'Vas ganando' ? 'Vas ganando' : `Pujar ${num(siguientePujaJugador(estado, s))}`}</button><span class="tenue aviso-puja">${motivo && motivo !== 'Vas ganando' ? esc(motivo) : ''}</span>`;
    return `<div class="subasta ${s.lider === estado.jugadorId ? 'ganando' : ''}">
        ${this.carta(estado, h, s.prefiereJugador ? '<span class="chip vinculo">♥ Te prefiere: tu puja vale más</span>' : `<span class="precio">Vale unos ${num(valorMercado(h))}</span>`)}
        <div class="marcador">
          <span class="tenue">Puja actual</span><b>${num(s.precio)}</b>
          <span class="lider">${s.terminada ? (s.lider ? `Se lo lleva: ${esc(lider)}` : 'Nadie lo quiere') : `Va ganando: ${esc(lider)}`}</span>
          <div class="reloj" role="progressbar" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${Math.max(0, Math.round(s.tiempo))}"><i style="width:${porcentaje}%"></i></div>
          ${boton}
        </div>
      </div>
      <p class="tenue">Quedan ${quedan} ${quedan === 1 ? 'novato' : 'novatos'} después de este.</p>`;
  }

  private panelDia(estado: EstadoJuego): string {
    const r = this.resumen;
    if (!r) return '';
    const misiones = r.informes
      .map((i) => {
        const caidos = i.partes.filter((p) => p.consecuencia === 'muerte').map((p) => obtenerHeroe(estado, p.heroeId).nombre);
        const heridos = i.partes.filter((p) => p.consecuencia.startsWith('herida')).length;
        const texto = { exito: '¡Misión cumplida!', parcial: 'Misión a medias', fracaso: 'La misión ha fracasado' }[i.resultado];
        return `<div class="resultado r-${i.resultado}"><b>${texto}</b><span>+${num(i.oro)} oro</span>
          ${caidos.length ? `<p class="caidos">Han caído: ${esc(caidos.join(', '))}</p>` : ''}${heridos ? `<p class="tenue">${heridos} herido(s)</p>` : ''}</div>`;
      })
      .join('');
    const semana = r.cierre
      ? `<div class="resultado"><b>Cierre de la semana</b><span>Patrocinio +${num(r.cierre.ingresoPatrocinio)} · Gastos −${num(r.cierre.gastos.total)}</span>${r.cierre.aviso ? '<p class="caidos">¡Cuidado! Estás en números rojos. Dos semanas seguidas así y el gremio quiebra.</p>' : ''}</div>`
      : '';
    return `${misiones || '<p>Hoy no salió ninguna misión.</p>'}${semana}
      <p class="tenue">Ahora es el día ${estado.partida.dia} · Puesto ${puesto(estado, estado.jugadorId)}.º</p>
      <div class="botones"><button class="principal" data-accion="cerrar">Seguir</button></div>`;
  }

  private panelFin(estado: EstadoJuego): string {
    const j = jugador(estado);
    const texto =
      estado.fin === 'quiebra'
        ? 'La Asociación ha retirado la licencia de la Llama Menguante. Elara cierra la puerta de la sede en silencio.'
        : `Fin de la temporada. La Llama Menguante termina en el puesto ${puesto(estado, j.id)}.º con ${num(j.oro)} de oro.`;
    return `<p>${esc(texto)}</p><button data-accion="nueva" class="principal">Nueva partida</button>`;
  }

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------

  private alHacerClic(evento: Event): void {
    const objetivo = (evento.target as HTMLElement).closest<HTMLElement>('[data-accion], [data-abrir]');
    if (!objetivo || (objetivo as HTMLButtonElement).disabled) return;
    const abrir = objetivo.dataset.abrir as Panel | undefined;
    if (abrir) {
      if (abrir === 'mision') {
        this.misionId = null;
        this.equipo.clear();
      }
      return this.abrir(abrir);
    }
    try {
      this.ejecutar(objetivo.dataset.accion ?? '', objetivo.dataset.id ?? '');
    } catch (error) {
      this.mensaje = error instanceof Error ? error.message : String(error);
      this.repintar();
    }
  }

  private ejecutar(accion: string, id: string): void {
    switch (accion) {
      case 'cerrar':
        return this.cerrar();
      case 'empezar': {
        const nombre = (document.querySelector<HTMLInputElement>('#nombre')?.value ?? '').trim() || 'Aventurero';
        const modoClemente = document.querySelector<HTMLInputElement>('#clemente')?.checked ?? false;
        this.estado = crearPartida({ nombre, modoClemente });
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
      case 'terminar':
        return this.terminarElDia();
      case 'elegir-mision': {
        this.misionId = id;
        this.equipo.clear();
        const mision = estado.tablon.find((m) => m.id === id);
        if (mision) for (const m of equipoRecomendado(estado, mision)) this.equipo.add(m.heroe.id);
        return this.repintar();
      }
      case 'otra-mision':
        this.misionId = null;
        return this.repintar();
      case 'alternar':
        if (this.equipo.has(id)) this.equipo.delete(id);
        else if (this.equipo.size < 5) this.equipo.add(id);
        return this.repintar();
      case 'enviar': {
        if (!this.misionId) return;
        enviarMision(
          estado,
          this.misionId,
          [...this.equipo].map((heroeId) => ({ heroeId, posicion: POSICION_NATURAL[obtenerHeroe(estado, heroeId).clase] })),
        );
        this.misionId = null;
        this.equipo.clear();
        this.guardar();
        return this.cerrar();
      }
      case 'pestana':
        this.pestanaMercado = id === 'vender' ? 'vender' : 'comprar';
        return this.repintar();
      case 'ver-gremio':
        this.gremioRival = id;
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
        this.conAzar((azar) => vender(estado, azar, id));
        this.mensaje = `Has vendido a ${h.nombre}.`;
        this.guardar();
        return this.repintar();
      }
      case 'mejorar':
        mejorarSede(estado);
        this.mensaje = `¡La sede sube al nivel ${jugador(estado).nivelSede}!`;
        this.guardar();
        return this.repintar();
      case 'empezar-subasta':
      case 'siguiente-novato':
        return this.siguienteSubasta();
      case 'pujar':
        if (this.subasta) pujar(estado, this.subasta);
        return this.actualizarSubasta();
      case 'pasar':
        // Deja que los rivales terminen la subasta sin ti.
        if (this.subasta) {
          const s = this.subasta;
          this.conAzar((azar) => avanzar(estado, azar, s, 120));
          s.terminada = true;
          this.pararReloj();
          cerrarSubasta(estado, s);
          this.guardar();
        }
        return this.repintar();
      case 'cerrar-novatos':
        this.subasta = null;
        return this.cerrar();
    }
  }

  private terminarElDia(): void {
    const estado = this.estado;
    if (!estado || estado.fin) return;
    this.pararReloj();
    this.subasta = null;
    this.resumen = terminarDia(estado);
    this.guardar();
    this.abrir(estado.fin ? 'fin' : 'dia');
  }

  /** Empieza la subasta del siguiente novato con su cuenta atrás. */
  private siguienteSubasta(): void {
    const estado = this.estado;
    if (!estado) return;
    this.pararReloj();
    const id = estado.novatos[0];
    if (!id) {
      this.subasta = null;
      this.guardar();
      return this.repintar();
    }
    this.subasta = this.conAzar((azar) => crearSubasta(estado, azar, id));
    this.repintar();
    let ultimo = performance.now();
    this.relojSubasta = window.setInterval(() => {
      const s = this.subasta;
      if (!s || !this.estado) return this.pararReloj();
      const ahora = performance.now();
      const dt = (ahora - ultimo) / 1000;
      ultimo = ahora;
      this.conAzar((azar) => avanzar(estado, azar, s, dt));
      if (s.terminada) {
        this.pararReloj();
        cerrarSubasta(estado, s);
        this.guardar();
        this.repintar();
      } else {
        this.actualizarSubasta();
      }
    }, 250);
  }

  /**
   * Actualiza solo las cifras de la subasta en curso, sin rehacer el panel: así el botón Pujar no se
   * destruye a mitad de un clic.
   */
  private actualizarSubasta(): void {
    const estado = this.estado;
    const s = this.subasta;
    const panel = this.el.panel;
    const marcador = panel.querySelector('.marcador');
    if (!estado || !s || !marcador || s.terminada) return this.repintar();
    const lider = s.lider ? (s.lider === estado.jugadorId ? 'Tú' : estado.gremios[s.lider]?.nombre ?? '') : 'Nadie';
    marcador.querySelector('b')!.textContent = num(s.precio);
    marcador.querySelector('.lider')!.textContent = `Va ganando: ${lider}`;
    const barra = marcador.querySelector<HTMLElement>('.reloj i');
    if (barra) barra.style.width = `${Math.max(0, Math.min(100, (s.tiempo / 10) * 100))}%`;
    panel.querySelector('.subasta')?.classList.toggle('ganando', s.lider === estado.jugadorId);
    const boton = marcador.querySelector<HTMLButtonElement>('[data-accion=pujar]');
    const motivo = puedePujar(estado, s);
    if (boton) {
      boton.disabled = motivo !== null;
      boton.textContent = motivo === 'Vas ganando' ? 'Vas ganando' : `Pujar ${num(siguientePujaJugador(estado, s))}`;
    }
    let aviso = marcador.querySelector<HTMLElement>('.aviso-puja');
    if (!aviso) {
      aviso = document.createElement('span');
      aviso.className = 'tenue aviso-puja';
      marcador.appendChild(aviso);
    }
    aviso.textContent = motivo && motivo !== 'Vas ganando' ? motivo : '';
  }

  private pararReloj(): void {
    if (this.relojSubasta !== null) window.clearInterval(this.relojSubasta);
    this.relojSubasta = null;
  }

  private conAzar<T>(f: (azar: Azar) => T): T {
    const estado = this.estado!;
    const azar = new Azar(estado.azar);
    const r = f(azar);
    estado.azar = azar.obtenerEstado();
    return r;
  }

  private guardar(): void {
    if (this.estado) guardar(this.estado);
  }
}
