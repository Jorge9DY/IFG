// Fábrica de figuras: el único sitio que decide cómo se construye un héroe en 3D.
// Hoy todas se generan por código. Cuando haya modelos hechos a mano (aspecto.json → modelos), se cargarán
// aquí y se envolverán en la misma interfaz «FiguraHeroe», sin tocar la sede, las escenas ni los retratos.

import { aspectoDe, aspectoMaestro, type DatosHeroe } from './aspecto';
import { OPCIONES_POR_DEFECTO, figuraDesdeAspecto, type FiguraHeroe, type OpcionesFigura } from './figura/figura';

export function crearFigura(heroe: DatosHeroe, opciones: OpcionesFigura = OPCIONES_POR_DEFECTO): FiguraHeroe {
  return figuraDesdeAspecto(aspectoDe(heroe), opciones);
}

export function crearMaestro(opciones: OpcionesFigura = OPCIONES_POR_DEFECTO): FiguraHeroe {
  return figuraDesdeAspecto(aspectoMaestro(), opciones);
}
