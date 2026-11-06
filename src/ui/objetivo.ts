// Objetivo del momento: una sola instrucción clara, como en los juegos de Nintendo.
// Solo lee el estado; no contiene reglas del juego.

import { heroesDe, jugador, type EstadoJuego } from '../motor/estado';
import type { Panel } from './paneles';

export interface Objetivo {
  /** Verbo en mayúsculas: lo que hay que hacer. */
  accion: string;
  /** El complemento, resaltado en rosa. */
  meta: string;
  /** Una frase que explica cómo hacerlo. */
  pista: string;
  /** Panel que resuelve el objetivo (el menú lo resalta). */
  panel: Panel | null;
}

export function objetivoActual(estado: EstadoJuego | null): Objetivo {
  if (!estado) return { accion: 'Funda', meta: 'tu gremio', pista: 'Escribe tu nombre y empieza la temporada.', panel: null };
  if (estado.fin === 'quiebra') return { accion: 'Empieza', meta: 'de nuevo', pista: 'El gremio ha quebrado. Prueba otra estrategia.', panel: null };
  if (estado.fin) return { accion: 'Temporada', meta: 'terminada', pista: 'Mira la clasificación final.', panel: null };

  const j = jugador(estado);
  const heroes = heroesDe(estado, j.id);
  const libres = heroes.filter((h) => h.estado === 'disponible' || h.estado === 'luto');
  const soborno = (estado.sobornos ?? [])[0];
  const enCurso = estado.enCurso.some((c) => c.gremioId === j.id);

  if (soborno) {
    const h = estado.heroes[soborno.heroeId];
    return { accion: 'Retén a', meta: h?.nombre.split(' ')[0] ?? 'tu héroe', pista: 'El Colmillo intenta llevárselo. Súbele el salario en la Plantilla.', panel: 'plantilla' };
  }
  if (heroes.length < 3) {
    const faltan = 3 - heroes.length;
    return {
      accion: 'Ficha',
      meta: `${faltan} ${faltan === 1 ? 'héroe' : 'héroes'}`,
      pista: 'Necesitas 3 para salir de misión. Los de rango D y C son baratos.',
      panel: 'mercado',
    };
  }
  if (libres.length >= 3 && estado.tablon.length > 0) {
    return { accion: 'Envía', meta: 'un equipo', pista: `Tienes ${libres.length} héroes libres. Elige una misión en el Tablón.`, panel: 'misiones' };
  }
  if (estado.ofertas.length > 0) {
    return { accion: 'Revisa', meta: 'las ofertas', pista: 'Otros gremios quieren comprar a uno de tus héroes.', panel: 'plantilla' };
  }
  return {
    accion: 'Termina',
    meta: 'la semana',
    pista: enCurso ? 'Tus equipos volverán al cierre de la semana.' : 'Pulsa el botón verde cuando estés listo.',
    panel: 'semana',
  };
}
