/* ============================================================================
   Utilidades compartidas
   ============================================================================ */

const formateadorARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 12500 -> "$12.500" */
export function precioARS(valor) {
  const numero = Number(valor) || 0;
  // Intl mete un espacio fino después del signo; lo sacamos para que quede "$12.500".
  return formateadorARS.format(numero).replace(/\s/g, '');
}

/** Igual que precioARS pero sin el signo, para el mensaje de WhatsApp. */
export function numeroARS(valor) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Number(valor) || 0);
}

/** Porcentaje de descuento entre el precio anterior y el actual. */
export function porcentajeDescuento(precio, precioAnterior) {
  if (!precioAnterior || precioAnterior <= precio) return 0;
  return Math.round((1 - precio / precioAnterior) * 100);
}

/** Escapa texto que se inserta con innerHTML. */
export function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** Saca tildes y pasa a minúscula, para que el buscador sea tolerante. */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Retrasa la ejecución: se usa en el buscador en tiempo real. */
export function debounce(fn, ms = 180) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}

/** Placeholder en SVG para los productos que todavía no tienen foto. */
export function imagenPlaceholder(nombre = '') {
  const inicial = esc((nombre.trim()[0] || '?').toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="#E5E7EB"/>
    <text x="200" y="200" fill="#9CA3AF" font-family="Inter,sans-serif" font-size="140"
          font-weight="600" text-anchor="middle" dominant-baseline="central">${inicial}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Notificación breve arriba a la derecha. */
export function avisar(mensaje, tipo = 'ok') {
  let zona = document.querySelector('.avisos');
  if (!zona) {
    zona = document.createElement('div');
    zona.className = 'avisos';
    document.body.appendChild(zona);
  }
  const aviso = document.createElement('div');
  aviso.className = `aviso aviso--${tipo}`;
  aviso.textContent = mensaje;
  zona.appendChild(aviso);
  setTimeout(() => {
    aviso.classList.add('aviso--saliendo');
    aviso.addEventListener('transitionend', () => aviso.remove(), { once: true });
  }, 2600);
}

/** Texto de un error de Supabase, listo para mostrar. */
export function mensajeDeError(error) {
  if (!error) return 'Ocurrió un error inesperado.';
  if (typeof error === 'string') return error;
  return error.message || error.error_description || 'Ocurrió un error inesperado.';
}
