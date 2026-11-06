// Estado inicial del gremio del jugador (secciones 3 y 10).
import balance from '../datos/balance.json';
import type { Gremio } from './tipos';

export function estadoInicialJugador(): Gremio {
  return {
    id: 'llama',
    nombre: 'Llama Menguante',
    esJugador: true,
    oro: balance.economia.oroInicial,
    deuda: balance.economia.deudaInicial,
    prestigio: 10,
    reputacion: 40,
    especialidad: null,
    plantilla: ['h_000_elara'],
    plantillaMax: 6,
    mejoras: [],
    puntosMisionTemporada: 0,
    prestigioInicioTemporada: 10,
    cierresNegativos: 0,
    muertesTemporadaPasada: 0,
  };
}
