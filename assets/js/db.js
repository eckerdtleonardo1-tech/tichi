/* ============================================================================
   Cliente de Supabase + acceso a datos
   ============================================================================ */

import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigurado } from './config.js';

export const BUCKET = 'productos';
const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

/* La librería se carga bajo demanda (import dinámico) en lugar de con un import
   normal arriba del archivo. Así, si Supabase todavía no está configurado o el
   CDN no responde, el sitio sigue funcionando en vez de quedarse en blanco. */
let clientePrometido = null;

export function cargarCliente() {
  if (!supabaseConfigurado) {
    return Promise.reject(new Error('Supabase no está configurado en assets/js/config.js.'));
  }
  clientePrometido ??= import(/* @vite-ignore */ CDN)
    .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY))
    .catch((error) => {
      clientePrometido = null; // permite reintentar más adelante
      throw new Error(`No se pudo cargar la librería de Supabase (${error.message}).`);
    });
  return clientePrometido;
}

/* --- Lectura pública ------------------------------------------------------ */

/** Productos activos, ordenados por destacados y luego por fecha. */
export async function traerProductosPublicos() {
  const supabase = await cargarCliente();
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('destacado', { ascending: false })
    .order('fecha_creacion', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Todas las categorías, en el orden que definiste en el panel. */
export async function traerCategorias() {
  const supabase = await cargarCliente();
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/* --- Panel de administración --------------------------------------------- */

/** Todos los productos, activos e inactivos. */
export async function traerTodosLosProductos() {
  const supabase = await cargarCliente();
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('fecha_creacion', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function crearProducto(producto) {
  const supabase = await cargarCliente();
  const { data, error } = await supabase.from('productos').insert(producto).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarProducto(id, cambios) {
  const supabase = await cargarCliente();
  const { data, error } = await supabase
    .from('productos')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function borrarProducto(id) {
  const supabase = await cargarCliente();
  const { error } = await supabase.from('productos').delete().eq('id', id);
  if (error) throw error;
}

export async function crearCategoria(nombre, orden) {
  const supabase = await cargarCliente();
  const { data, error } = await supabase
    .from('categorias')
    .insert({ nombre, orden })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function actualizarCategoria(id, cambios) {
  const supabase = await cargarCliente();
  const { data, error } = await supabase
    .from('categorias')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function borrarCategoria(id) {
  const supabase = await cargarCliente();
  const { error } = await supabase.from('categorias').delete().eq('id', id);
  if (error) throw error;
}

/* --- Storage: fotos de productos ----------------------------------------- */

/**
 * Sube una foto al bucket "productos" y devuelve su URL pública.
 * El nombre se genera solo para que no haya colisiones.
 */
export async function subirFoto(file) {
  const supabase = await cargarCliente();
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(nombre, file, { cacheControl: '31536000', upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nombre);
  return data.publicUrl;
}

/** Borra del bucket una foto a partir de su URL pública. */
export async function borrarFoto(url) {
  const supabase = await cargarCliente();
  const marca = `/${BUCKET}/`;
  const posicion = url.indexOf(marca);
  if (posicion === -1) return;
  const ruta = decodeURIComponent(url.slice(posicion + marca.length).split('?')[0]);
  await supabase.storage.from(BUCKET).remove([ruta]);
}
