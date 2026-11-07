// Categoría del gremio (decisión del propietario, biblia sección 5): el tablón crece con el gremio.
// La categoría sube con el prestigio y nunca baja. Cada categoría ofrece misiones más difíciles y mejor pagadas.

import balance from '../datos/balance.json';
import { registrar, type EstadoJuego } from './estado';
import { prestigio } from './ranking';
import type { Gremio, Letra } from './tipos';

const C = balance.categorias;

function indice(letra: Letra): number {
  return Math.max(0, C.letras.indexOf(letra));
}

/** Categoría que corresponde a un prestigio. */
export function categoriaPorPrestigio(p: number): Letra {
  let letra = C.letras[0] as Letra;
  C.prestigio.forEach((umbral, i) => {
    if (p >= umbral) letra = C.letras[i] as Letra;
  });
  return letra;
}

export function categoria(g: Gremio): Letra {
  return g.categoria ?? 'D';
}

/** Multiplicadores de dificultad y recompensa de las misiones de una categoría. */
export function multiplicadores(letra: Letra): { dificultad: number; recompensa: number } {
  const i = indice(letra);
  return { dificultad: C.dificultad[i] ?? 1, recompensa: C.recompensa[i] ?? 1 };
}

/** Siguiente categoría y el prestigio que hace falta, o null si ya es la máxima. */
export function siguienteCategoria(g: Gremio): { letra: Letra; prestigio: number } | null {
  const i = indice(categoria(g)) + 1;
  const letra = C.letras[i] as Letra | undefined;
  const umbral = C.prestigio[i];
  return letra && umbral !== undefined ? { letra, prestigio: umbral } : null;
}

/** Sube la categoría si el prestigio lo permite (nunca baja). Devuelve la categoría nueva o null. */
export function actualizarCategoria(estado: EstadoJuego, g: Gremio): Letra | null {
  const nueva = categoriaPorPrestigio(prestigio(g));
  if (indice(nueva) <= indice(categoria(g))) return null;
  g.categoria = nueva;
  registrar(
    estado,
    g.esJugador ? 'temporada' : 'rival',
    g.esJugador
      ? `La Asociación asciende a ${g.nombre} a categoría ${nueva}: el tablón ofrece misiones más difíciles y mejor pagadas.`
      : `${g.nombre} asciende a categoría ${nueva}.`,
  );
  return nueva;
}
