/* ============================================================================
   Panel de administración
   ----------------------------------------------------------------------------
   Login con Supabase Auth, alta/baja/edición de productos con subida de fotos,
   y gestión de categorías. Todo pensado para el celular.
   ============================================================================ */

import { supabaseConfigurado, SUPABASE_URL, SUPABASE_ANON_KEY, TIENDA } from './config.js';
import { precioARS, esc, normalizar, debounce, imagenPlaceholder, avisar, mensajeDeError } from './utils.js';

const $ = (sel) => document.querySelector(sel);

/* El panel funciona igual contra Supabase o contra el catálogo de demostración
   guardado en el navegador: los dos módulos exponen las mismas funciones, y se
   elige uno al arrancar. De acá para abajo el panel no sabe en cuál está. */
let api = null;

/** Cliente de sesión (el de Supabase, o el simulado de la demo). */
let sb = null;

/** true cuando el panel corre sin base de datos, para mostrárselo a alguien. */
let enDemo = false;

/* --- Estado -------------------------------------------------------------- */

const estado = {
  productos: [],
  categorias: [],
  busqueda: '',
  categoriaFiltro: 'todas',
  editando: null,      // producto que se está editando (null = nuevo)
  fotos: [],           // URLs de las fotos del formulario abierto
  fotosSubiendo: 0,
  fotosBorradas: [],   // se borran del storage recién al guardar
  alConfirmar: null,   // qué hacer si el usuario confirma el borrado
};

/* --- Arranque ------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!supabaseConfigurado) {
    // Sin Supabase hay dos caminos: si el modo demo está activo, el panel
    // funciona igual contra el navegador para poder mostrárselo a alguien; si
    // está apagado, avisamos qué falta configurar.
    if (!TIENDA.demoSiNoHayBaseDeDatos) {
      mostrarErrorLogin(
        'Todavía no configuraste Supabase. Completá assets/js/config.js con la URL y la anon key de tu proyecto.'
      );
      $('#login-btn').disabled = true;
      return;
    }
    enDemo = true;
  }

  api = enDemo ? await import('./demo-db.js') : await import('./db.js');

  conectarEventos();
  if (enDemo) await prepararDemo();

  try {
    sb = await api.cargarCliente();
  } catch (error) {
    mostrarErrorLogin(mensajeDeError(error));
    $('#login-btn').disabled = true;
    return;
  }

  // ¿Ya había una sesión abierta en este celular?
  const { data } = await sb.auth.getSession();
  if (data.session) entrarAlPanel(data.session.user);

  sb.auth.onAuthStateChange((evento, sesion) => {
    if (evento === 'SIGNED_OUT' || !sesion) return mostrarLogin();
    if (evento === 'SIGNED_IN') entrarAlPanel(sesion.user);
  });
});

/* --- Modo demostración --------------------------------------------------- */

/**
 * Deja el panel listo para mostrárselo a alguien: pone a la vista las
 * credenciales de la demo (y las precarga, para entrar con un toque), marca la
 * cabecera y habilita el botón que devuelve el catálogo a los 12 productos.
 */
async function prepararDemo() {
  const { CREDENCIALES_DEMO } = api;

  $('#demo-email').textContent = CREDENCIALES_DEMO.email;
  $('#demo-clave').textContent = CREDENCIALES_DEMO.password;
  $('#caja-demo').classList.remove('oculto');
  $('#login-pie-texto').textContent =
    'Así entra el vendedor a cargar sus productos, desde la computadora o el celular.';
  $('#chip-demo').classList.remove('oculto');
  $('#barra-demo').classList.remove('oculto');

  // Precargadas para que quien mira no tenga que tipear nada.
  $('#login-email').value = CREDENCIALES_DEMO.email;
  $('#login-clave').value = CREDENCIALES_DEMO.password;

  $('#btn-reiniciar-demo').addEventListener('click', reiniciarDemo);
}

async function reiniciarDemo() {
  pedirConfirmacion({
    titulo: '¿Reiniciar la demostración?',
    texto: 'El catálogo vuelve a los 12 productos de ejemplo y se descarta todo lo que hayas cargado o cambiado.',
    textoBoton: 'Reiniciar',
    accion: async () => {
      const { reiniciar } = await import('./demo-estado.js');
      reiniciar();
      await recargarTodo();
      avisar('Demostración reiniciada');
    },
  });
}

/* --- Login --------------------------------------------------------------- */

function mostrarErrorLogin(mensaje) {
  const caja = $('#login-error');
  caja.textContent = mensaje;
  caja.classList.remove('oculto');
}

function mostrarLogin() {
  $('#pantalla-login').classList.remove('oculto');
  $('#pantalla-panel').classList.add('oculto');
  $('#login-clave').value = '';
}

async function iniciarSesion(evento) {
  evento.preventDefault();
  const email = $('#login-email').value.trim();
  const password = $('#login-clave').value;
  const boton = $('#login-btn');

  $('#login-error').classList.add('oculto');

  if (!email || !password) {
    return mostrarErrorLogin('Completá el email y la contraseña.');
  }

  boton.disabled = true;
  boton.textContent = 'Entrando…';

  const { error } = await sb.auth.signInWithPassword({ email, password });

  boton.disabled = false;
  boton.textContent = 'Entrar';

  if (error) {
    mostrarErrorLogin(
      error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos.'
        : mensajeDeError(error)
    );
    return;
  }
  $('#login-clave').value = '';
}

async function cerrarSesion() {
  await sb.auth.signOut();
  mostrarLogin();
  // En la demo dejamos los datos puestos otra vez, para poder volver a entrar
  // con un toque durante la presentación.
  if (enDemo) {
    $('#login-email').value = api.CREDENCIALES_DEMO.email;
    $('#login-clave').value = api.CREDENCIALES_DEMO.password;
  }
  avisar('Sesión cerrada');
}

/**
 * Con el registro público abierto, cualquiera puede crearse una cuenta con la
 * clave anon y quedar habilitado para editar el catálogo. Supabase publica su
 * configuración de auth, así que la leemos y avisamos si quedó abierto.
 * Si la consulta falla, no mostramos nada: mejor callarse que dar un falso aviso.
 */
async function avisarSiElRegistroEstaAbierto() {
  if (enDemo) return; // en la demo no hay proyecto de Supabase que consultar
  try {
    const respuesta = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    if (!respuesta.ok) return;
    const ajustes = await respuesta.json();
    if (ajustes.disable_signup === false) {
      $('#alerta-registro').classList.remove('oculto');
    }
  } catch {
    /* sin conexión o el endpoint cambió: no decimos nada */
  }
}

async function entrarAlPanel(usuario) {
  $('#pantalla-login').classList.add('oculto');
  $('#pantalla-panel').classList.remove('oculto');
  $('#usuario-actual').textContent = usuario?.email ?? '';
  avisarSiElRegistroEstaAbierto();
  await recargarTodo();
}

/* --- Datos --------------------------------------------------------------- */

async function recargarTodo() {
  try {
    const [productos, categorias] = await Promise.all([
      api.traerTodosLosProductos(),
      api.traerCategorias(),
    ]);
    estado.productos = productos;
    estado.categorias = categorias;
  } catch (error) {
    avisar(mensajeDeError(error), 'error');
    return;
  }
  pintarMetricas();
  pintarSelectoresDeCategoria();
  pintarProductos();
  pintarCategorias();
}

/* --- Métricas ------------------------------------------------------------ */

function pintarMetricas() {
  const total = estado.productos.length;
  const visibles = estado.productos.filter((p) => p.activo).length;
  const sinStock = estado.productos.filter((p) => !p.stock).length;
  const destacados = estado.productos.filter((p) => p.destacado).length;

  $('#metricas').innerHTML = [
    ['Productos', total],
    ['Visibles', visibles],
    ['Sin stock', sinStock],
    ['Destacados', destacados],
  ].map(([nombre, valor]) => `
    <div class="metrica">
      <p class="metrica__valor">${valor}</p>
      <p class="metrica__nombre">${nombre}</p>
    </div>`).join('');
}

/* --- Lista de productos -------------------------------------------------- */

function productosFiltrados() {
  const busqueda = normalizar(estado.busqueda);
  return estado.productos.filter((p) => {
    if (estado.categoriaFiltro !== 'todas' && p.categoria !== estado.categoriaFiltro) return false;
    if (!busqueda) return true;
    const texto = normalizar(`${p.nombre} ${p.categoria} ${p.etiqueta ?? ''}`);
    return busqueda.split(/\s+/).every((palabra) => texto.includes(palabra));
  });
}

function pintarProductos() {
  const lista = productosFiltrados();
  $('#conteo-productos').textContent = `${lista.length} de ${estado.productos.length} productos`;

  if (!estado.productos.length) {
    $('#lista-productos').innerHTML = `
      <div class="vacio">
        <strong>Todavía no cargaste productos</strong>
        <span>Tocá "Nuevo producto" para cargar el primero.</span>
      </div>`;
    return;
  }

  if (!lista.length) {
    $('#lista-productos').innerHTML = `
      <div class="vacio">
        <strong>Sin resultados</strong>
        <span>Probá con otra búsqueda o cambiá el filtro de categoría.</span>
      </div>`;
    return;
  }

  $('#lista-productos').innerHTML = lista.map(filaProducto).join('');
}

function filaProducto(p) {
  const fotos = p.imagenes ?? [];
  const foto = fotos[0] || imagenPlaceholder(p.nombre);

  const marcas = [];
  if (!p.activo) marcas.push('<span class="etiqueta etiqueta--neutra">Oculto</span>');
  if (!p.stock) marcas.push('<span class="etiqueta etiqueta--oferta">Sin stock</span>');
  if (p.destacado) marcas.push('<span class="etiqueta etiqueta--ok">Destacado</span>');
  if (p.etiqueta) marcas.push(`<span class="etiqueta etiqueta--neutra">${esc(p.etiqueta)}</span>`);

  return `
  <article class="fila ${p.activo ? '' : 'inactiva'}" data-id="${esc(p.id)}">
    <div class="fila__foto">
      <img src="${esc(foto)}" alt="" loading="lazy" decoding="async">
      ${fotos.length > 1 ? `<span class="cuantas">${fotos.length}</span>` : ''}
    </div>
    <div class="fila__datos">
      <div class="fila__titulo">
        <span class="fila__nombre">${esc(p.nombre)}</span>
        <span class="fila__categoria">${esc(p.categoria)}</span>
      </div>
      <p class="fila__precio">
        ${precioARS(p.precio)}
        ${p.precio_anterior ? `<s>${precioARS(p.precio_anterior)}</s>` : ''}
      </p>
      ${marcas.length ? `<div class="fila__marcas">${marcas.join('')}</div>` : ''}
      <div class="fila__acciones">
        <button class="mini mini--editar" data-editar="${esc(p.id)}">Editar</button>
        <button class="mini" data-alternar="activo" data-id="${esc(p.id)}" aria-pressed="${p.activo}">
          ${p.activo ? 'Visible' : 'Oculto'}
        </button>
        <button class="mini" data-alternar="stock" data-id="${esc(p.id)}" aria-pressed="${p.stock}">
          ${p.stock ? 'Con stock' : 'Sin stock'}
        </button>
        <button class="mini" data-alternar="destacado" data-id="${esc(p.id)}" aria-pressed="${p.destacado}">
          Destacado
        </button>
        <button class="mini mini--borrar" data-borrar="${esc(p.id)}">Borrar</button>
      </div>
    </div>
  </article>`;
}

/** Botones rápidos: activar/desactivar, stock y destacado sin entrar a editar. */
async function alternarCampo(id, campo, boton) {
  const producto = estado.productos.find((p) => String(p.id) === String(id));
  if (!producto) return;

  boton.disabled = true;
  try {
    const actualizado = await api.actualizarProducto(id, { [campo]: !producto[campo] });
    Object.assign(producto, actualizado);
    pintarMetricas();
    pintarProductos();
    const avisos = {
      activo: 'Visibilidad actualizada',
      stock: 'Stock actualizado',
      destacado: 'Destacado actualizado',
    };
    avisar(avisos[campo]);
  } catch (error) {
    boton.disabled = false;
    avisar(mensajeDeError(error), 'error');
  }
}

/* --- Formulario de producto --------------------------------------------- */

function abrirHoja(producto = null) {
  estado.editando = producto;
  estado.fotos = [...(producto?.imagenes ?? [])];
  estado.fotosBorradas = [];
  estado.fotosSubiendo = 0;

  $('#hoja-titulo').textContent = producto ? 'Editar producto' : 'Nuevo producto';
  $('#p-nombre').value = producto?.nombre ?? '';
  $('#p-precio').value = producto ? Number(producto.precio) : '';
  $('#p-precio-anterior').value = producto?.precio_anterior ? Number(producto.precio_anterior) : '';
  $('#p-descripcion').value = producto?.descripcion ?? '';
  $('#p-variantes').value = (producto?.variantes ?? []).join(', ');
  $('#p-etiqueta').value = producto?.etiqueta ?? '';
  $('#p-stock').checked = producto ? producto.stock : true;
  $('#p-activo').checked = producto ? producto.activo : true;
  $('#p-destacado').checked = producto ? producto.destacado : false;

  pintarSelectoresDeCategoria();
  $('#p-categoria').value = producto?.categoria ?? estado.categorias[0]?.nombre ?? '';

  pintarFotos();

  $('#hoja-producto').classList.add('abierta');
  $('#hoja-producto').setAttribute('aria-hidden', 'false');
  $('#fondo-panel').classList.add('abierto');
  document.body.classList.add('sin-scroll');
}

function cerrarHoja() {
  $('#hoja-producto').classList.remove('abierta');
  $('#hoja-producto').setAttribute('aria-hidden', 'true');
  $('#fondo-panel').classList.remove('abierto');
  document.body.classList.remove('sin-scroll');
  estado.editando = null;
  estado.fotos = [];
  estado.fotosBorradas = [];
}

function pintarFotos() {
  const subiendo = Array.from({ length: estado.fotosSubiendo }, () => `
    <div class="foto foto--subiendo">
      <svg class="girando" width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-6.2-8.6"></path>
      </svg>
    </div>`).join('');

  $('#p-fotos').innerHTML = estado.fotos.map((url, i) => `
    <div class="foto">
      <img src="${esc(url)}" alt="Foto ${i + 1}" loading="lazy" decoding="async">
      ${i === 0 ? '<span class="foto__principal">PRINCIPAL</span>' : ''}
      <button class="foto__borrar" type="button" data-quitar-foto="${i}" aria-label="Quitar foto ${i + 1}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>
      </button>
    </div>`).join('')
    + subiendo
    + `<button class="agregar-foto" type="button" id="btn-agregar-foto">
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
         Subir fotos
       </button>`;
}

async function subirFotosElegidas(archivos) {
  const imagenes = Array.from(archivos).filter((f) => f.type.startsWith('image/'));
  if (!imagenes.length) return;

  estado.fotosSubiendo += imagenes.length;
  pintarFotos();

  for (const archivo of imagenes) {
    try {
      const url = await api.subirFoto(archivo);
      estado.fotos.push(url);
    } catch (error) {
      avisar(`No pudimos subir ${archivo.name}: ${mensajeDeError(error)}`, 'error');
    } finally {
      estado.fotosSubiendo -= 1;
      pintarFotos();
    }
  }
}

function quitarFoto(indice) {
  const [url] = estado.fotos.splice(indice, 1);
  // La borramos del storage recién cuando se guarda el producto, para que
  // "Cancelar" no deje al producto apuntando a una foto que ya no existe.
  if (url) estado.fotosBorradas.push(url);
  pintarFotos();
}

function leerFormulario() {
  const nombre = $('#p-nombre').value.trim();
  const categoria = $('#p-categoria').value;
  const precio = Number($('#p-precio').value);
  const anteriorCrudo = $('#p-precio-anterior').value.trim();
  const precioAnterior = anteriorCrudo === '' ? null : Number(anteriorCrudo);

  if (!nombre) return { error: 'Poné el nombre del producto.', foco: '#p-nombre' };
  if (!categoria) return { error: 'Elegí una categoría. Si no hay ninguna, creala en la pestaña "Categorías".', foco: '#p-categoria' };
  if (!Number.isFinite(precio) || precio < 0) return { error: 'El precio tiene que ser un número mayor o igual a 0.', foco: '#p-precio' };
  if (precioAnterior !== null && (!Number.isFinite(precioAnterior) || precioAnterior < 0)) {
    return { error: 'El precio anterior tiene que ser un número.', foco: '#p-precio-anterior' };
  }
  if (precioAnterior !== null && precioAnterior <= precio) {
    return { error: 'El precio anterior tiene que ser mayor al precio actual (es el precio "tachado").', foco: '#p-precio-anterior' };
  }

  const variantes = $('#p-variantes').value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  return {
    datos: {
      nombre,
      categoria,
      precio,
      precio_anterior: precioAnterior,
      descripcion: $('#p-descripcion').value.trim(),
      imagenes: estado.fotos,
      variantes,
      etiqueta: $('#p-etiqueta').value || null,
      stock: $('#p-stock').checked,
      activo: $('#p-activo').checked,
      destacado: $('#p-destacado').checked,
    },
  };
}

async function guardarProducto() {
  if (estado.fotosSubiendo > 0) {
    return avisar('Esperá a que terminen de subir las fotos.', 'error');
  }

  const { error, foco, datos } = leerFormulario();
  if (error) {
    avisar(error, 'error');
    $(foco)?.focus();
    return;
  }

  const boton = $('#hoja-guardar');
  boton.disabled = true;
  boton.textContent = 'Guardando…';

  try {
    if (estado.editando) {
      const actualizado = await api.actualizarProducto(estado.editando.id, datos);
      const i = estado.productos.findIndex((p) => String(p.id) === String(estado.editando.id));
      if (i !== -1) estado.productos[i] = actualizado;
      avisar('Producto actualizado');
    } else {
      const creado = await api.crearProducto(datos);
      estado.productos.unshift(creado);
      avisar('Producto creado');
    }

    // Recién ahora limpiamos del storage las fotos que se quitaron.
    for (const url of estado.fotosBorradas) {
      api.borrarFoto(url).catch(() => { /* si falla, queda un archivo huérfano y nada más */ });
    }
    estado.fotosBorradas = [];

    cerrarHoja();
    pintarMetricas();
    pintarProductos();
  } catch (e) {
    avisar(mensajeDeError(e), 'error');
  } finally {
    boton.disabled = false;
    boton.textContent = 'Guardar';
  }
}

/* --- Borrado con confirmación ------------------------------------------- */

function pedirConfirmacion({ titulo, texto, textoBoton = 'Borrar', accion }) {
  $('#confirmar-titulo').textContent = titulo;
  $('#confirmar-texto').textContent = texto;
  $('#confirmar-si').textContent = textoBoton;
  estado.alConfirmar = accion;
  $('#confirmar').classList.add('abierta');
  $('#confirmar').setAttribute('aria-hidden', 'false');
  $('#fondo-panel').classList.add('abierto');
  $('#confirmar-no').focus();
}

function cerrarConfirmacion() {
  $('#confirmar').classList.remove('abierta');
  $('#confirmar').setAttribute('aria-hidden', 'true');
  if (!$('#hoja-producto').classList.contains('abierta')) {
    $('#fondo-panel').classList.remove('abierto');
  }
  estado.alConfirmar = null;
}

function confirmarBorradoProducto(id) {
  const producto = estado.productos.find((p) => String(p.id) === String(id));
  if (!producto) return;

  pedirConfirmacion({
    titulo: '¿Borrar producto?',
    texto: `Se va a borrar "${producto.nombre}" y sus fotos. Esta acción no se puede deshacer.`,
    accion: async () => {
      try {
        await api.borrarProducto(id);
        for (const url of producto.imagenes ?? []) {
          api.borrarFoto(url).catch(() => {});
        }
        estado.productos = estado.productos.filter((p) => String(p.id) !== String(id));
        pintarMetricas();
        pintarProductos();
        avisar('Producto borrado');
      } catch (error) {
        avisar(mensajeDeError(error), 'error');
      }
    },
  });
}

/* --- Categorías ---------------------------------------------------------- */

function pintarSelectoresDeCategoria() {
  const opciones = estado.categorias
    .map((c) => `<option value="${esc(c.nombre)}">${esc(c.nombre)}</option>`)
    .join('');

  const filtro = $('#admin-categoria');
  const elegida = filtro.value;
  filtro.innerHTML = `<option value="todas">Todas las categorías</option>${opciones}`;
  filtro.value = estado.categorias.some((c) => c.nombre === elegida) ? elegida : 'todas';
  estado.categoriaFiltro = filtro.value;

  const selectorForm = $('#p-categoria');
  const actual = selectorForm.value;
  selectorForm.innerHTML = opciones || '<option value="">Creá una categoría primero</option>';
  if (estado.categorias.some((c) => c.nombre === actual)) selectorForm.value = actual;
}

function pintarCategorias() {
  if (!estado.categorias.length) {
    $('#lista-categorias').innerHTML = `
      <div class="vacio">
        <strong>No hay categorías</strong>
        <span>Agregá la primera con el formulario de arriba.</span>
      </div>`;
    return;
  }

  $('#lista-categorias').innerHTML = estado.categorias.map((c, i) => {
    const cuantos = estado.productos.filter((p) => p.categoria === c.nombre).length;
    return `
    <div class="categoria-fila" data-id="${esc(c.id)}">
      <div class="categoria-fila__orden">
        <button type="button" data-mover="arriba" data-id="${esc(c.id)}"
                ${i === 0 ? 'disabled' : ''} aria-label="Subir ${esc(c.nombre)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="m6 15 6-6 6 6"></path></svg>
        </button>
        <button type="button" data-mover="abajo" data-id="${esc(c.id)}"
                ${i === estado.categorias.length - 1 ? 'disabled' : ''} aria-label="Bajar ${esc(c.nombre)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
        </button>
      </div>
      <div class="categoria-fila__nombre">
        <strong>${esc(c.nombre)}</strong>
        <span>${cuantos} ${cuantos === 1 ? 'producto' : 'productos'}</span>
      </div>
      <div class="categoria-fila__acciones">
        <button class="mini" data-renombrar="${esc(c.id)}">Renombrar</button>
        <button class="mini mini--borrar" data-borrar-categoria="${esc(c.id)}">Borrar</button>
      </div>
    </div>`;
  }).join('');
}

async function agregarCategoria(evento) {
  evento.preventDefault();
  const entrada = $('#categoria-nueva');
  const nombre = entrada.value.trim();
  if (!nombre) return;

  if (estado.categorias.some((c) => normalizar(c.nombre) === normalizar(nombre))) {
    return avisar('Ya existe una categoría con ese nombre.', 'error');
  }

  const orden = estado.categorias.length
    ? Math.max(...estado.categorias.map((c) => c.orden)) + 1
    : 1;

  try {
    const creada = await api.crearCategoria(nombre, orden);
    estado.categorias.push(creada);
    entrada.value = '';
    pintarSelectoresDeCategoria();
    pintarCategorias();
    avisar('Categoría agregada');
  } catch (error) {
    avisar(mensajeDeError(error), 'error');
  }
}

async function renombrarCategoria(id) {
  const categoria = estado.categorias.find((c) => String(c.id) === String(id));
  if (!categoria) return;

  const nombre = prompt('Nuevo nombre de la categoría:', categoria.nombre)?.trim();
  if (!nombre || nombre === categoria.nombre) return;

  if (estado.categorias.some((c) => String(c.id) !== String(id) && normalizar(c.nombre) === normalizar(nombre))) {
    return avisar('Ya existe otra categoría con ese nombre.', 'error');
  }

  try {
    const anterior = categoria.nombre;
    const actualizada = await api.actualizarCategoria(id, { nombre });
    Object.assign(categoria, actualizada);
    // En la base los productos se actualizan solos (ON UPDATE CASCADE);
    // acá replicamos el cambio para no tener que recargar todo.
    estado.productos.forEach((p) => {
      if (p.categoria === anterior) p.categoria = nombre;
    });
    pintarSelectoresDeCategoria();
    pintarCategorias();
    pintarProductos();
    avisar('Categoría renombrada');
  } catch (error) {
    avisar(mensajeDeError(error), 'error');
  }
}

function confirmarBorradoCategoria(id) {
  const categoria = estado.categorias.find((c) => String(c.id) === String(id));
  if (!categoria) return;

  const cuantos = estado.productos.filter((p) => p.categoria === categoria.nombre).length;
  if (cuantos > 0) {
    return avisar(
      `"${categoria.nombre}" tiene ${cuantos} ${cuantos === 1 ? 'producto' : 'productos'}. Movelos a otra categoría antes de borrarla.`,
      'error'
    );
  }

  pedirConfirmacion({
    titulo: '¿Borrar categoría?',
    texto: `Se va a borrar "${categoria.nombre}".`,
    accion: async () => {
      try {
        await api.borrarCategoria(id);
        estado.categorias = estado.categorias.filter((c) => String(c.id) !== String(id));
        pintarSelectoresDeCategoria();
        pintarCategorias();
        avisar('Categoría borrada');
      } catch (error) {
        avisar(mensajeDeError(error), 'error');
      }
    },
  });
}

/** Sube o baja una categoría intercambiando el campo "orden" con su vecina. */
async function moverCategoria(id, direccion) {
  const i = estado.categorias.findIndex((c) => String(c.id) === String(id));
  const j = direccion === 'arriba' ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= estado.categorias.length) return;

  const a = estado.categorias[i];
  const b = estado.categorias[j];

  // Si dos categorías comparten el mismo "orden", intercambiarlo no cambia nada:
  // en ese caso reasignamos 1..n para que el orden quede siempre bien definido.
  const hayEmpates = new Set(estado.categorias.map((c) => c.orden)).size !== estado.categorias.length;

  // Intercambio optimista en pantalla.
  estado.categorias[i] = b;
  estado.categorias[j] = a;
  pintarCategorias();

  try {
    if (hayEmpates) {
      await Promise.all(
        estado.categorias.map((c, indice) => api.actualizarCategoria(c.id, { orden: indice + 1 }))
      );
      estado.categorias.forEach((c, indice) => { c.orden = indice + 1; });
    } else {
      const ordenA = a.orden;
      const ordenB = b.orden;
      await Promise.all([
        api.actualizarCategoria(a.id, { orden: ordenB }),
        api.actualizarCategoria(b.id, { orden: ordenA }),
      ]);
      a.orden = ordenB;
      b.orden = ordenA;
    }
  } catch (error) {
    // Volvemos atrás si la base rechazó el cambio.
    estado.categorias[i] = a;
    estado.categorias[j] = b;
    pintarCategorias();
    avisar(mensajeDeError(error), 'error');
  }
}

/* --- Pestañas ------------------------------------------------------------ */

function cambiarVista(vista) {
  document.querySelectorAll('.pestania').forEach((p) => {
    p.setAttribute('aria-selected', String(p.dataset.vista === vista));
  });
  $('#vista-productos').classList.toggle('oculto', vista !== 'productos');
  $('#vista-categorias').classList.toggle('oculto', vista !== 'categorias');
}

/* --- Eventos ------------------------------------------------------------- */

function conectarEventos() {
  $('#form-login').addEventListener('submit', iniciarSesion);
  $('#btn-salir').addEventListener('click', cerrarSesion);

  document.querySelector('.pestanias').addEventListener('click', (e) => {
    const pestania = e.target.closest('[data-vista]');
    if (pestania) cambiarVista(pestania.dataset.vista);
  });

  // Filtros
  $('#admin-buscador').addEventListener('input', debounce((e) => {
    estado.busqueda = e.target.value;
    pintarProductos();
  }, 160));

  $('#admin-categoria').addEventListener('change', (e) => {
    estado.categoriaFiltro = e.target.value;
    pintarProductos();
  });

  // Lista de productos
  $('#btn-nuevo').addEventListener('click', () => {
    if (!estado.categorias.length) {
      cambiarVista('categorias');
      return avisar('Creá al menos una categoría antes de cargar productos.', 'error');
    }
    abrirHoja(null);
  });

  $('#lista-productos').addEventListener('click', (e) => {
    const editar = e.target.closest('[data-editar]');
    if (editar) {
      const producto = estado.productos.find((p) => String(p.id) === editar.dataset.editar);
      return abrirHoja(producto);
    }
    const alternar = e.target.closest('[data-alternar]');
    if (alternar) return alternarCampo(alternar.dataset.id, alternar.dataset.alternar, alternar);

    const borrar = e.target.closest('[data-borrar]');
    if (borrar) return confirmarBorradoProducto(borrar.dataset.borrar);
  });

  // Formulario de producto
  $('#cerrar-hoja').addEventListener('click', cerrarHoja);
  $('#hoja-cancelar').addEventListener('click', cerrarHoja);
  $('#hoja-guardar').addEventListener('click', guardarProducto);
  $('#form-producto').addEventListener('submit', (e) => {
    e.preventDefault();
    guardarProducto();
  });

  $('#p-fotos').addEventListener('click', (e) => {
    if (e.target.closest('#btn-agregar-foto')) return $('#p-archivo').click();
    const quitar = e.target.closest('[data-quitar-foto]');
    if (quitar) quitarFoto(Number(quitar.dataset.quitarFoto));
  });

  $('#p-archivo').addEventListener('change', (e) => {
    subirFotosElegidas(e.target.files);
    e.target.value = ''; // permite volver a elegir el mismo archivo
  });

  // Categorías
  $('#form-categoria').addEventListener('submit', agregarCategoria);

  $('#lista-categorias').addEventListener('click', (e) => {
    const renombrar = e.target.closest('[data-renombrar]');
    if (renombrar) return renombrarCategoria(renombrar.dataset.renombrar);

    const borrar = e.target.closest('[data-borrar-categoria]');
    if (borrar) return confirmarBorradoCategoria(borrar.dataset.borrarCategoria);

    const mover = e.target.closest('[data-mover]');
    if (mover) return moverCategoria(mover.dataset.id, mover.dataset.mover);
  });

  // Confirmación
  $('#confirmar-no').addEventListener('click', cerrarConfirmacion);
  $('#confirmar-si').addEventListener('click', async () => {
    const accion = estado.alConfirmar;
    cerrarConfirmacion();
    await accion?.();
  });

  $('#fondo-panel').addEventListener('click', () => {
    if ($('#confirmar').classList.contains('abierta')) return cerrarConfirmacion();
    if ($('#hoja-producto').classList.contains('abierta')) cerrarHoja();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('#confirmar').classList.contains('abierta')) return cerrarConfirmacion();
    if ($('#hoja-producto').classList.contains('abierta')) cerrarHoja();
  });
}
