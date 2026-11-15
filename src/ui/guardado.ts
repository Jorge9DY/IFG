// Guardado de la partida en el navegador. Si localStorage no está disponible, el juego sigue sin guardar.
import type { EstadoJuego } from '../motor/estado';
import { migrar } from '../motor/migracion';

const CLAVE = 'gremio-de-heroes:partida';

export function guardar(estado: EstadoJuego): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // Navegación privada o almacenamiento bloqueado: no se guarda.
  }
}

export function cargar(): EstadoJuego | null {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (!texto) return null;
    return migrar(JSON.parse(texto));
  } catch {
    return null;
  }
}

export function borrar(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar.
  }
}
