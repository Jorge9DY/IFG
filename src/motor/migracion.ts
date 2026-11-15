// Carga de partidas guardadas: valida el estado y rellena con valores por defecto los campos que falten
// (sección 16 del sistema social). Convierte las partidas de la versión 9 (ánimo y afinidad sueltos) a la 10.

import S from '../datos/social.json';
import type { EstadoJuego } from './estado';
import { ficha } from './heroes';
import type { Relacion } from './tipos';

type Viejo = Record<string, unknown>;

/** Devuelve la partida lista para jugar, o null si no se puede usar. */
export function migrar(datos: unknown): EstadoJuego | null {
  if (!datos || typeof datos !== 'object') return null;
  const e = datos as Viejo & { version?: number };
  if (e.version !== 9 && e.version !== 10) return null;
  const estado = e as unknown as EstadoJuego & { version: number };
  // Relaciones: en la 9 eran un número (afinidad) por pareja y el amor estaba en cada héroe.
  const relaciones: Record<string, Relacion> = {};
  for (const [k, v] of Object.entries((e.relaciones ?? {}) as Record<string, unknown>)) {
    if (typeof v === 'number') relaciones[k] = { afinidad: v, atraccion: [0, 0], pareja: 'ninguna', rivales: false, historial: [] };
    else if (v && typeof v === 'object') {
      const r = v as Partial<Relacion>;
      relaciones[k] = {
        afinidad: r.afinidad ?? 0,
        atraccion: [r.atraccion?.[0] ?? 0, r.atraccion?.[1] ?? 0],
        pareja: r.pareja ?? 'ninguna',
        rivales: r.rivales ?? false,
        historial: r.historial ?? [],
      };
    }
  }
  for (const h of Object.values(estado.heroes ?? {})) {
    const viejo = h as typeof h & { animo?: number; amor?: string | null };
    if (viejo.amor && estado.heroes[viejo.amor]) {
      const otro = estado.heroes[viejo.amor] as typeof h & { amor?: string | null };
      const k = h.id < otro.id ? `${h.id}|${otro.id}` : `${otro.id}|${h.id}`;
      relaciones[k] ??= { afinidad: 0, atraccion: [0, 0], pareja: 'ninguna', rivales: false, historial: [] };
      relaciones[k]!.atraccion[h.id < otro.id ? 0 : 1] = S.umbrales.enamorado;
      if (otro.amor === h.id) relaciones[k]!.pareja = 'pareja';
    }
    h.felicidad ??= viejo.animo ?? S.mentalInicial.felicidad;
    h.estres ??= S.mentalInicial.estres;
    h.rasgos ??= [...(ficha(h.catalogo)?.rasgos ?? [])];
    delete viejo.animo;
    delete viejo.amor;
  }
  estado.relaciones = relaciones;
  const s = (e.social ?? {}) as Partial<EstadoJuego['social']>;
  estado.social = {
    pendientes: s.pendientes ?? [],
    cooldowns: s.cooldowns ?? {},
    unicos: s.unicos ?? [],
    memorias: s.memorias ?? [],
    vetos: s.vetos ?? [],
    contador: s.contador ?? 0,
  };
  estado.caidos ??= [];
  // Las partidas empezadas antes del desbloqueo progresivo lo tienen todo abierto.
  estado.habilidadesConocidas ??= [];
  estado.desbloqueos ??= ['mercado', 'relaciones', 'ascension', 'retos'];
  estado.bolsaNovatos ??= [];
  estado.version = 10;
  return estado;
}
