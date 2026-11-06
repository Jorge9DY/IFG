// Generador aleatorio con semilla (mulberry32): misma semilla, misma partida.

export class Azar {
  private estado: number;

  constructor(semilla: number) {
    this.estado = semilla >>> 0;
  }

  /** Número en [0, 1). */
  siguiente(): number {
    this.estado = (this.estado + 0x6d2b79f5) >>> 0;
    let t = this.estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entero entre min y max, ambos incluidos. */
  entero(min: number, max: number): number {
    return min + Math.floor(this.siguiente() * (max - min + 1));
  }

  /** Tirada de porcentaje: entero de 1 a 100. */
  d100(): number {
    return this.entero(1, 100);
  }

  /** true con la probabilidad indicada en porcentaje (0–100). */
  probabilidad(porcentaje: number): boolean {
    return this.siguiente() * 100 < porcentaje;
  }

  elegir<T>(opciones: readonly T[]): T {
    if (opciones.length === 0) throw new Error('No hay opciones para elegir');
    return opciones[this.entero(0, opciones.length - 1)] as T;
  }

  /** Estado interno, para guardar la partida y continuar la misma secuencia. */
  obtenerEstado(): number {
    return this.estado;
  }
}
