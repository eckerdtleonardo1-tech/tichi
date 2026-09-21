/* ============================================================================
   Carrito
   ----------------------------------------------------------------------------
   Vive en localStorage, así que no se pierde si el cliente recarga la página o
   vuelve más tarde. Cada línea del carrito es un producto + una variante: el
   mismo producto en dos variantes distintas son dos líneas separadas.
   ============================================================================ */

import { numeroARS, precioARS } from './utils.js';
import { TIENDA } from './config.js';

const CLAVE = 'pisl_carrito_v1';
const CLAVE_DATOS = 'pisl_datos_cliente_v1';

let lineas = leerDeLocalStorage();
const suscriptores = new Set();

function leerDeLocalStorage() {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    if (!Array.isArray(crudo)) return [];
    // Filtramos basura por si cambió el formato entre versiones.
    return crudo.filter((l) => l && l.id && Number(l.cantidad) > 0);
  } catch {
    return [];
  }
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lineas));
  } catch {
    /* Modo privado o almacenamiento lleno: el carrito sigue vivo en memoria. */
  }
  suscriptores.forEach((fn) => fn(lineas));
}

/** Se llama cada vez que cambia el carrito. */
export function alCambiar(fn) {
  suscriptores.add(fn);
  fn(lineas);
  return () => suscriptores.delete(fn);
}

function claveDeLinea(id, variante) {
  return `${id}::${variante || ''}`;
}

export function obtenerLineas() {
  return lineas.map((l) => ({ ...l }));
}

export function cantidadTotal() {
  return lineas.reduce((suma, l) => suma + l.cantidad, 0);
}

export function total() {
  return lineas.reduce((suma, l) => suma + l.precio * l.cantidad, 0);
}

export function estaVacio() {
  return lineas.length === 0;
}

export function agregar(producto, { variante = '', cantidad = 1 } = {}) {
  const clave = claveDeLinea(producto.id, variante);
  const existente = lineas.find((l) => l.clave === clave);

  if (existente) {
    existente.cantidad += cantidad;
    // El precio puede haber cambiado en la base desde la última visita.
    existente.precio = Number(producto.precio) || 0;
  } else {
    lineas.push({
      clave,
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio) || 0,
      imagen: producto.imagenes?.[0] || '',
      variante,
      cantidad,
    });
  }
  guardar();
}

export function cambiarCantidad(clave, cantidad) {
  const linea = lineas.find((l) => l.clave === clave);
  if (!linea) return;
  if (cantidad <= 0) return eliminar(clave);
  linea.cantidad = Math.min(cantidad, 99);
  guardar();
}

export function eliminar(clave) {
  lineas = lineas.filter((l) => l.clave !== clave);
  guardar();
}

export function vaciar() {
  lineas = [];
  guardar();
}

/**
 * Elimina del carrito lo que ya no existe o quedó sin stock, y refresca
 * precios y nombres con lo que dice la base de datos.
 */
export function sincronizarCon(productos) {
  const porId = new Map(productos.map((p) => [String(p.id), p]));
  const antes = lineas.length;

  lineas = lineas.filter((l) => {
    const producto = porId.get(String(l.id));
    if (!producto || !producto.activo || !producto.stock) return false;
    l.nombre = producto.nombre;
    l.precio = Number(producto.precio) || 0;
    l.imagen = producto.imagenes?.[0] || '';
    return true;
  });

  if (lineas.length !== antes) guardar();
  return antes - lineas.length;
}

/* --- Datos del cliente ---------------------------------------------------- */

export function leerDatosCliente() {
  try {
    return { nombre: '', entrega: 'retiro', direccion: '', ...JSON.parse(localStorage.getItem(CLAVE_DATOS) || '{}') };
  } catch {
    return { nombre: '', entrega: 'retiro', direccion: '' };
  }
}

export function guardarDatosCliente(datos) {
  try {
    localStorage.setItem(CLAVE_DATOS, JSON.stringify(datos));
  } catch { /* nada: son datos de conveniencia */ }
}

/* --- Mensaje de WhatsApp -------------------------------------------------- */

/**
 * Arma el mensaje del pedido:
 *
 *   Hola! Quiero hacer este pedido:
 *   • 2x Funda silicona (iPhone 15) – $25.000
 *   • 1x Perfume importado árabe (100 ml) – $34.900
 *   Total: $59.900
 *   Nombre: Leonardo
 *   Entrega: Envío a Belgrano 123
 */
export function mensajePedido({ nombre = '', entrega = 'retiro', direccion = '' } = {}) {
  const renglones = ['Hola! Quiero hacer este pedido:'];

  for (const linea of lineas) {
    const variante = linea.variante ? ` (${linea.variante})` : '';
    const subtotal = `$${numeroARS(linea.precio * linea.cantidad)}`;
    renglones.push(`• ${linea.cantidad}x ${linea.nombre}${variante} – ${subtotal}`);
  }

  renglones.push(`Total: $${numeroARS(total())}`);
  renglones.push(`Nombre: ${nombre.trim() || '-'}`);
  renglones.push(
    entrega === 'envio'
      ? `Entrega: Envío a ${direccion.trim() || '(dirección a confirmar)'}`
      : 'Entrega: Retiro en el local'
  );

  return renglones.join('\n');
}

/** URL de wa.me con el pedido ya escrito. */
export function urlPedido(datos) {
  return `https://wa.me/${TIENDA.whatsapp}?text=${encodeURIComponent(mensajePedido(datos))}`;
}

/** URL de wa.me para consultar por un producto puntual (por ejemplo, sin stock). */
export function urlConsulta(producto) {
  const texto = producto
    ? `Hola! Quería consultar por: ${producto.nombre} (${precioARS(producto.precio)}). ¿Tenés stock?`
    : 'Hola! Quería hacer una consulta sobre los productos.';
  return `https://wa.me/${TIENDA.whatsapp}?text=${encodeURIComponent(texto)}`;
}
