/* ============================================================================
   Respaldo de demostración del panel
   ----------------------------------------------------------------------------
   Expone exactamente las mismas funciones que db.js, pero contra el catálogo
   guardado en el navegador en lugar de Supabase. Así el panel funciona completo
   —cargar, editar, borrar, fotos y categorías— para mostrárselo a alguien, sin
   base de datos y sin tocar nada real.

   El panel elige cuál de los dos módulos usar según si Supabase está
   configurado; no sabe en cuál está.
   ============================================================================ */

import { leer, guardar, comprimirImagen } from './demo-estado.js';

export const BUCKET = 'productos';

/** Los datos con los que entra quien mira la demo. */
export const CREDENCIALES_DEMO = {
  email: 'demo@tienda.com',
  password: 'demo1234',
};

const CLAVE_SESION = 'pisl_demo_sesion_v1';
const esperar = (ms = 180) => new Promise((r) => setTimeout(r, ms));
const nuevoId = () => `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function guardarOFallar(datos) {
  const r = guardar(datos);
  if (!r.ok) throw new Error(r.error);
}

/* --- Sesión simulada ------------------------------------------------------ */

let avisarCambio = null;

function sesionGuardada() {
  try {
    const crudo = localStorage.getItem(CLAVE_SESION);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

/**
 * Devuelve un objeto con la misma forma que el cliente de Supabase en las
 * partes que usa el panel, para no tener que cambiar su lógica de login.
 */
export function cargarCliente() {
  const cliente = {
    auth: {
      async getSession() {
        return { data: { session: sesionGuardada() }, error: null };
      },
      onAuthStateChange(callback) {
        avisarCambio = callback;
        return { data: { subscription: { unsubscribe() { avisarCambio = null; } } } };
      },
      async signInWithPassword({ email, password }) {
        await esperar(320); // un instante, para que se sienta como un login real
        const bien =
          email.trim().toLowerCase() === CREDENCIALES_DEMO.email &&
          password === CREDENCIALES_DEMO.password;
        if (!bien) return { data: null, error: { message: 'Invalid login credentials' } };

        const sesion = { user: { email: CREDENCIALES_DEMO.email } };
        try { localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion)); } catch { /* da igual */ }
        avisarCambio?.('SIGNED_IN', sesion);
        return { data: { session: sesion }, error: null };
      },
      async signOut() {
        try { localStorage.removeItem(CLAVE_SESION); } catch { /* da igual */ }
        avisarCambio?.('SIGNED_OUT', null);
        return { error: null };
      },
    },
  };
  return Promise.resolve(cliente);
}

/* --- Lectura -------------------------------------------------------------- */

export async function traerProductosPublicos() {
  const { productos } = leer();
  return productos
    .filter((p) => p.activo)
    .sort((a, b) =>
      a.destacado !== b.destacado
        ? Number(b.destacado) - Number(a.destacado)
        : new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
}

export async function traerCategorias() {
  const { categorias } = leer();
  return categorias.slice().sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
}

export async function traerTodosLosProductos() {
  const { productos } = leer();
  return productos.slice().sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
}

/* --- Escritura de productos ---------------------------------------------- */

export async function crearProducto(producto) {
  await esperar();
  const datos = leer();
  const nuevo = { id: nuevoId(), fecha_creacion: new Date().toISOString(), ...producto };
  datos.productos.unshift(nuevo);
  guardarOFallar(datos);
  return nuevo;
}

export async function actualizarProducto(id, cambios) {
  await esperar();
  const datos = leer();
  const producto = datos.productos.find((p) => String(p.id) === String(id));
  if (!producto) throw new Error('No encontramos el producto.');
  Object.assign(producto, cambios);
  guardarOFallar(datos);
  return producto;
}

export async function borrarProducto(id) {
  await esperar();
  const datos = leer();
  datos.productos = datos.productos.filter((p) => String(p.id) !== String(id));
  guardarOFallar(datos);
}

/* --- Escritura de categorías --------------------------------------------- */

export async function crearCategoria(nombre, orden) {
  await esperar();
  const datos = leer();
  if (datos.categorias.some((c) => c.nombre === nombre)) {
    throw new Error('Ya existe una categoría con ese nombre.');
  }
  const nueva = { id: nuevoId(), nombre, orden, fecha_creacion: new Date().toISOString() };
  datos.categorias.push(nueva);
  guardarOFallar(datos);
  return nueva;
}

export async function actualizarCategoria(id, cambios) {
  await esperar(90);
  const datos = leer();
  const categoria = datos.categorias.find((c) => String(c.id) === String(id));
  if (!categoria) throw new Error('No encontramos la categoría.');

  const anterior = categoria.nombre;
  Object.assign(categoria, cambios);

  // Igual que el ON UPDATE CASCADE de la base: al renombrar una categoría,
  // sus productos la siguen.
  if (cambios.nombre && cambios.nombre !== anterior) {
    datos.productos.forEach((p) => {
      if (p.categoria === anterior) p.categoria = cambios.nombre;
    });
  }

  guardarOFallar(datos);
  return categoria;
}

export async function borrarCategoria(id) {
  await esperar();
  const datos = leer();
  const categoria = datos.categorias.find((c) => String(c.id) === String(id));
  if (!categoria) return;

  // Igual que el ON DELETE RESTRICT de la base.
  if (datos.productos.some((p) => p.categoria === categoria.nombre)) {
    throw new Error('La categoría todavía tiene productos.');
  }

  datos.categorias = datos.categorias.filter((c) => String(c.id) !== String(id));
  guardarOFallar(datos);
}

/* --- Fotos ---------------------------------------------------------------- */

/** No sube nada: achica la imagen y la guarda dentro del navegador. */
export async function subirFoto(file) {
  return comprimirImagen(file);
}

/** En la demo no hay nada que borrar de un servidor. */
export async function borrarFoto() {}
