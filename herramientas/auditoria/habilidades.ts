// Auditoría de las 80 habilidades: mide su efecto real en el motor y dónde actúan.
// Uso: npx tsx herramientas/auditoria/habilidades.ts > herramientas/auditoria/habilidades.md
//
// Para cada héroe del catálogo:
// - Poder en misión con y sin su habilidad, en tres situaciones tipo (solo en una baja, en pareja en una
//   media y en trío en una alta), con compañeros neutros de poder 40 y el propio héroe a poder 40.
// - Lesiones forzadas, días de misión y oro de una misión cumplida.
// - Momentos del juego en los que engancha (funciones de habilidades.ts y del resto del motor que la nombran).

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Azar } from '../../src/motor/azar';
import { activa, ajustarOro, diasMenos, lesionForzada, poderEquipoEnMision, type Contexto } from '../../src/motor/habilidades';
import { CATALOGO, heroeDeCatalogo } from '../../src/motor/heroes';
import { crearPartida } from '../../src/motor/partida';
import type { Heroe, Mision, RangoMision } from '../../src/motor/tipos';

const motor = 'src/motor';
const fuentes = readdirSync(motor).map((f) => [f, readFileSync(join(motor, f), 'utf8')] as const);
const habilidadesTs = readFileSync(join(motor, 'habilidades.ts'), 'utf8');
const bloques = habilidadesTs.split(/\n(?=export function |function )/).map((b) => [/function (\w+)/.exec(b)?.[1] ?? '', b] as const);

const MOMENTO: Record<string, string> = {
  activa: 'misión',
  huecos: 'misión (huecos)',
  motivoNoIr: 'misión (quién va)',
  poderBase: 'misión (poder)',
  factorPropio: 'misión (poder)',
  factorCompaneros: 'misión (compañeros)',
  bonusExito: 'misión (éxito)',
  lesionForzada: 'lesiones',
  factorLesion: 'lesiones',
  diasMenos: 'duración',
  ajustarOro: 'oro',
  factorExperiencia: 'experiencia',
  alSalir: 'al salir',
  alVolver: 'al volver',
  cadaDia: 'cada día',
  cadaSemana: 'cada semana',
  bloqueoCompra: 'mercado',
  factorCompra: 'mercado',
  valorVenta: 'mercado',
  alComprar: 'mercado',
  alVender: 'mercado',
  ajustarSueldo: 'sueldos',
  alGastar: 'gasto de oro',
  alFicharNovato: 'Prueba',
  martillazo: 'Prueba',
  bonusAscension: 'Ascensión',
  trasAscension: 'Ascensión',
  factorEntrenamiento: 'entrenamiento',
  veTechoReal: 'ojeo',
};

function mision(rango: RangoMision, equipo: number, duracion: number): Mision {
  return { id: 'm', rango, tipo: 'Caza', clases: [], titulo: 'Auditoría', dificultad: 60, duracion, recompensa: 1000, equipo };
}

function neutro(id: string): Heroe {
  return { id, nombre: id, clase: 'Guerrero', poder: 40, potencial: 60, sesgoOjeo: 0.5, experiencia: 0, reputacion: 0, lealtad: 60, estado: 'libre', diasLesion: 0, semanasSinCobrar: 0, felicidad: 70, estres: 20 };
}

const filas: string[] = [];
for (const f of CATALOGO) {
  const estado = crearPartida({ semilla: 1 });
  const azar = new Azar(1);
  const h = heroeDeCatalogo(azar, f, 'novato', 'X');
  h.poder = 40;
  h.potencial = 60;
  const sin = { ...h, habilidad: undefined };
  const comp = [neutro('n1'), neutro('n2')];
  for (const x of [h, ...comp]) {
    estado.heroes[x.id] = x;
    estado.gremios.jugador!.plantilla.push(x.id);
  }
  const medir = (con: Heroe, m: Mision, otros: Heroe[]): number => {
    const ctx: Contexto = { estado, gremioId: 'jugador', mision: m, equipo: [con, ...otros], dia: estado.dia };
    return poderEquipoEnMision(ctx);
  };
  const ratio = (m: Mision, otros: Heroe[]): string => {
    const a = medir(h, m, otros);
    const b = medir(sin, m, otros);
    return b ? `×${(a / b).toFixed(2)}` : '—';
  };
  const situaciones = [ratio(mision('bajo', 1, 1), []), ratio(mision('medio', 2, 2), [comp[0]!]), ratio(mision('alto', 3, 3), comp)];
  const equipoAlto = [h, ...comp];
  const lesion = equipoAlto.map((x) => lesionForzada(equipoAlto, x)).filter(Boolean).join('/') || '—';
  const dias = diasMenos(equipoAlto) ? `−${diasMenos(equipoAlto)} día` : '—';
  const ctxOro: Contexto = { estado, gremioId: 'jugador', mision: mision('alto', 3, 3), equipo: equipoAlto, dia: 1 };
  const oro = ajustarOro(ctxOro, new Azar(7), 1000, true).oro;
  const usos = bloques.filter(([, b]) => b.includes(`'${f.habilidad}'`)).map(([n]) => MOMENTO[n] ?? n);
  const fuera = fuentes.filter(([n, t]) => n !== 'habilidades.ts' && t.includes(`'${f.habilidad}'`)).map(([n]) => n.replace('.ts', ''));
  const momentos = [...new Set([...usos, ...fuera])].join(', ') || '**ninguno**';
  const activaEnMision = activa(h, equipoAlto) === f.habilidad ? '' : ' (anulada)';
  filas.push(`| ${f.id} | ${f.nombre} | ${f.nombreHabilidad}${activaEnMision} | ${situaciones.join(' · ')} | ${lesion} | ${dias} | ${oro === 1000 ? '—' : oro} | ${momentos} |`);
}

console.log('# Auditoría medida de las habilidades\n');
console.log('Generado con `npx tsx herramientas/auditoria/habilidades.ts`. Poder del equipo con la habilidad frente a sin ella (héroe a poder 40, compañeros neutros de poder 40, sin relaciones): solo en misión baja · en pareja en media · en trío en alta. Lesión forzada, días y oro de una misión alta cumplida de 1.000 de oro.\n');
console.log('| ID | Héroe | Habilidad | Poder (baja · media · alta) | Lesión forzada | Días | Oro | Dónde actúa |');
console.log('| --- | --- | --- | --- | --- | --- | --: | --- |');
for (const f of filas) console.log(f);
