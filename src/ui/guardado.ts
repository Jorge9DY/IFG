// Guardado de la partida en el navegador. Si localStorage no está disponible, el juego sigue sin guardar.
import type { EstadoJuego } from '../motor/estado';

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
    const estado = JSON.parse(texto) as EstadoJuego;
    return estado.version === 5 ? estado : null;
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
