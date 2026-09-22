/* ============================================================================
   Estado del catálogo en modo demostración
   ----------------------------------------------------------------------------
   Guarda el catálogo en el localStorage del navegador, arrancando de los 12
   productos de demo-data.js. Lo comparten la tienda y el panel, así que lo que
   cargás en el panel aparece en la tienda al instante: es la demostración
   completa, sin base de datos.

   Vive sólo en el navegador de quien mira: no viaja a ningún servidor y no
   afecta a nadie más.
   ============================================================================ */

import { PRODUCTOS_DEMO, CATEGORIAS_DEMO } from './demo-data.js';

const CLAVE = 'pisl_demo_catalogo_v1';

/** Copia profunda, para no tocar nunca los datos originales del archivo. */
const copiar = (valor) => JSON.parse(JSON.stringify(valor));

function semilla() {
  return { productos: copiar(PRODUCTOS_DEMO), categorias: copiar(CATEGORIAS_DEMO) };
}

/** Lee el catálogo de demostración; si no hay nada guardado, usa la semilla. */
export function leer() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return semilla();
    const datos = JSON.parse(crudo);
    if (!Array.isArray(datos?.productos) || !Array.isArray(datos?.categorias)) return semilla();
    return datos;
  } catch {
    // Modo privado, almacenamiento bloqueado o datos corruptos: arrancamos limpio.
    return semilla();
  }
}

export function guardar(datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
    return { ok: true };
  } catch (error) {
    const lleno = error?.name === 'QuotaExceededError' || /quota/i.test(error?.message ?? '');
    return {
      ok: false,
      error: lleno
        ? 'Se llenó el espacio del navegador. Usá "Reiniciar la demo" para liberarlo.'
        : 'El navegador no permitió guardar los cambios de la demo.',
    };
  }
}

/** Vuelve al catálogo de ejemplo original. */
export function reiniciar() {
  try {
    localStorage.removeItem(CLAVE);
  } catch { /* nada que hacer */ }
  return semilla();
}

/** true si el visitante ya modificó algo respecto de la semilla. */
export function fueModificado() {
  try {
    return localStorage.getItem(CLAVE) !== null;
  } catch {
    return false;
  }
}

/**
 * Achica una foto elegida desde el celular y la devuelve como data URL.
 * Sin esto, dos fotos de cámara llenan el localStorage y la demo se corta.
 */
export function comprimirImagen(file, ladoMaximo = 700, calidad = 0.7) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error('No pudimos leer el archivo.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => rechazar(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
        const ancho = Math.round(img.width * escala);
        const alto = Math.round(img.height * escala);

        const lienzo = document.createElement('canvas');
        lienzo.width = ancho;
        lienzo.height = alto;
        const ctx = lienzo.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, ancho, alto);
        ctx.drawImage(img, 0, 0, ancho, alto);

        resolver(lienzo.toDataURL('image/jpeg', calidad));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  });
}
