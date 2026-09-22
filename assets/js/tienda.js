/* ============================================================================
   Sitio público: catálogo, buscador, modal, carrito y pedido por WhatsApp
   ============================================================================ */

import { TIENDA, supabaseConfigurado } from './config.js';
import { traerProductosPublicos, traerCategorias } from './db.js';
import * as carrito from './carrito.js';
import {
  precioARS, porcentajeDescuento, esc, normalizar, debounce,
  imagenPlaceholder, avisar, mensajeDeError,
} from './utils.js';

const $ = (sel) => document.querySelector(sel);

/* --- Estado -------------------------------------------------------------- */

const estado = {
  productos: [],
  categorias: [],
  categoria: 'todas',
  busqueda: '',
  orden: 'novedades',
  productoAbierto: null,
  fotoActiva: 0,
  varianteElegida: '',
  cantidadElegida: 1,
  ultimoFoco: null,
};

/* --- Arranque ------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
  aplicarDatosDeLaTienda();
  pintarPreguntasFrecuentes();
  conectarEventos();
  carrito.alCambiar(pintarCarrito);
  cargarCatalogo();
});

function aplicarDatosDeLaTienda() {
  const consulta = carrito.urlConsulta(null);
  ['#hero-whatsapp', '#fab-whatsapp', '#footer-whatsapp'].forEach((sel) => {
    const el = $(sel);
    if (el) el.href = consulta;
  });

  const ig = $('#footer-instagram');
  if (ig) ig.href = TIENDA.instagram;

  $('#footer-slogan').textContent = `${TIENDA.slogan}.`;
  $('#footer-zona').textContent = TIENDA.zonaEnvio;
  $('#footer-retiro').textContent = TIENDA.retiro;
  $('#footer-horarios').textContent = TIENDA.horarios;
  $('#dato-horarios').textContent = TIENDA.horarios;
  $('#dato-retiro').textContent = TIENDA.retiro;
  $('#anio').textContent = String(new Date().getFullYear());
}

/* --- Carga de datos ------------------------------------------------------ */

async function cargarCatalogo() {
  pintarEsqueletos();

  if (!supabaseConfigurado) {
    if (!TIENDA.demoSiNoHayBaseDeDatos) {
      $('#grilla').innerHTML = bloqueVacio(
        'Falta configurar la base de datos',
        'Completá assets/js/config.js con los datos de tu proyecto de Supabase.'
      );
      return;
    }
    await usarDemo();
    return;
  }

  try {
    const [productos, categorias] = await Promise.all([
      traerProductosPublicos(),
      traerCategorias(),
    ]);
    estado.productos = productos;
    estado.categorias = categorias;
  } catch (error) {
    console.error('[catálogo] no se pudo leer Supabase:', error);
    if (TIENDA.demoSiNoHayBaseDeDatos) {
      avisar('No pudimos conectar con la base. Mostrando productos de ejemplo.', 'error');
      await usarDemo();
      return;
    }
    $('#grilla').innerHTML = bloqueVacio('No pudimos cargar el catálogo', mensajeDeError(error));
    return;
  }

  terminarCarga();
}

/**
 * Modo demostración: lee el catálogo guardado en el navegador, el mismo que
 * edita el panel. Así, lo que se carga en /admin aparece acá al instante, sin
 * base de datos.
 */
async function usarDemo() {
  const demo = await import('./demo-db.js');
  estado.productos = await demo.traerProductosPublicos();
  estado.categorias = await demo.traerCategorias();

  // Con mostrarAvisoDeDemo en false la tienda se ve como una tienda real,
  // sin el cartel que habla de archivos de configuración.
  if (TIENDA.mostrarAvisoDeDemo) {
    $('#aviso-config').hidden = false;
    document.body.classList.add('config-pendiente');
  }

  escucharCambiosDeLaDemo();
  terminarCarga();
}

/**
 * Si el panel está abierto en otra pestaña, el navegador avisa cuando cambia el
 * catálogo. Lo aprovechamos para refrescar la tienda sola: en una demostración
 * se carga un producto en /admin y aparece acá sin recargar nada.
 */
let escuchandoDemo = false;

function escucharCambiosDeLaDemo() {
  if (escuchandoDemo) return;
  escuchandoDemo = true;

  window.addEventListener('storage', async (evento) => {
    if (evento.key !== 'pisl_demo_catalogo_v1') return;
    const demo = await import('./demo-db.js');
    estado.productos = await demo.traerProductosPublicos();
    estado.categorias = await demo.traerCategorias();
    carrito.sincronizarCon(estado.productos);
    pintarChips();
    pintarGrilla();
    observarApariciones();
  });
}

function terminarCarga() {
  const quitados = carrito.sincronizarCon(estado.productos);
  if (quitados > 0) {
    avisar(
      quitados === 1
        ? 'Sacamos 1 producto del carrito porque ya no está disponible.'
        : `Sacamos ${quitados} productos del carrito porque ya no están disponibles.`,
      'error'
    );
  }
  pintarChips();
  pintarGrilla();
  observarApariciones();
}

/* --- Filtrado y orden ---------------------------------------------------- */

function productosVisibles() {
  const busqueda = normalizar(estado.busqueda);

  let lista = estado.productos.filter((p) => {
    if (estado.categoria !== 'todas' && p.categoria !== estado.categoria) return false;
    if (!busqueda) return true;
    const texto = normalizar(
      `${p.nombre} ${p.categoria} ${p.descripcion ?? ''} ${p.etiqueta ?? ''} ${(p.variantes ?? []).join(' ')}`
    );
    // Todas las palabras que escribió el cliente tienen que aparecer.
    return busqueda.split(/\s+/).every((palabra) => texto.includes(palabra));
  });

  if (estado.orden === 'precio-asc') {
    lista = lista.slice().sort((a, b) => a.precio - b.precio);
  } else if (estado.orden === 'precio-desc') {
    lista = lista.slice().sort((a, b) => b.precio - a.precio);
  } else {
    lista = lista.slice().sort((a, b) => {
      if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
      return new Date(b.fecha_creacion) - new Date(a.fecha_creacion);
    });
  }

  // Lo que no tiene stock siempre va al final.
  return lista.sort((a, b) => Number(b.stock) - Number(a.stock));
}

/* --- Render: chips ------------------------------------------------------- */

function pintarChips() {
  const nombres = estado.categorias.length
    ? estado.categorias.map((c) => c.nombre)
    : [...new Set(estado.productos.map((p) => p.categoria))];

  const conProductos = nombres.filter((n) => estado.productos.some((p) => p.categoria === n));

  if (estado.categoria !== 'todas' && !conProductos.includes(estado.categoria)) {
    estado.categoria = 'todas';
  }

  $('#chips').innerHTML = ['todas', ...conProductos]
    .map((nombre) => {
      const cuantos = nombre === 'todas'
        ? estado.productos.length
        : estado.productos.filter((p) => p.categoria === nombre).length;
      return `<button class="chip" type="button" data-categoria="${esc(nombre)}"
                aria-pressed="${nombre === estado.categoria}">
                ${nombre === 'todas' ? 'Todos' : esc(nombre)} <span style="opacity:.6">${cuantos}</span>
              </button>`;
    })
    .join('');
}

/* --- Render: grilla ------------------------------------------------------ */

function pintarEsqueletos() {
  $('#grilla').innerHTML = Array.from({ length: 8 }, () => `
    <div class="tarjeta">
      <div class="esqueleto" style="aspect-ratio:1;border-radius:0"></div>
      <div class="tarjeta__cuerpo">
        <div class="esqueleto" style="height:10px;width:45%"></div>
        <div class="esqueleto" style="height:14px;width:85%"></div>
        <div class="esqueleto" style="height:18px;width:55%"></div>
        <div class="esqueleto" style="height:38px;border-radius:999px"></div>
      </div>
    </div>`).join('');
  $('#resumen').textContent = 'Cargando productos…';
}

function bloqueVacio(titulo, detalle) {
  return `<div class="vacio" style="grid-column:1/-1">
            <strong>${esc(titulo)}</strong>
            <span>${esc(detalle)}</span>
          </div>`;
}

function pintarGrilla() {
  const lista = productosVisibles();
  const grilla = $('#grilla');

  $('#resumen').innerHTML = lista.length
    ? `<b>${lista.length}</b> ${lista.length === 1 ? 'producto' : 'productos'}`
    : '';

  if (!lista.length) {
    grilla.innerHTML = bloqueVacio(
      'No encontramos nada con esa búsqueda',
      'Probá con otra palabra o mirá todas las categorías.'
    );
    return;
  }

  grilla.innerHTML = lista.map(tarjetaProducto).join('');
}

function tarjetaProducto(p) {
  const foto = p.imagenes?.[0] || imagenPlaceholder(p.nombre);
  const descuento = porcentajeDescuento(p.precio, p.precio_anterior);
  const esOferta = p.etiqueta === 'Oferta' || descuento > 0;

  const etiquetas = [];
  if (p.etiqueta) {
    etiquetas.push(`<span class="etiqueta ${esOferta && p.etiqueta === 'Oferta' ? 'etiqueta--oferta' : ''}">${esc(p.etiqueta)}</span>`);
  }
  if (descuento > 0) {
    etiquetas.push(`<span class="etiqueta etiqueta--oferta">-${descuento}%</span>`);
  }

  const variantes = (p.variantes ?? []).length
    ? `<p class="tarjeta__variantes">${p.variantes.length} ${p.variantes.length === 1 ? 'opción' : 'opciones'} disponibles</p>`
    : '';

  const accion = p.stock
    ? `<button class="btn btn--principal btn--bloque btn--chico" data-agregar="${esc(p.id)}">Agregar</button>`
    : `<a class="btn btn--whatsapp btn--bloque btn--chico" href="${esc(carrito.urlConsulta(p))}" target="_blank" rel="noopener">Consultar por WhatsApp</a>`;

  return `
  <article class="tarjeta aparece">
    <div class="tarjeta__foto" data-abrir="${esc(p.id)}" role="button" tabindex="0"
         aria-label="Ver ${esc(p.nombre)}">
      <img src="${esc(foto)}" alt="${esc(p.nombre)}" loading="lazy" decoding="async" width="400" height="400">
      ${etiquetas.length ? `<div class="tarjeta__etiquetas">${etiquetas.join('')}</div>` : ''}
      ${p.stock ? '' : '<div class="tarjeta__sinstock"><span>Sin stock</span></div>'}
    </div>
    <div class="tarjeta__cuerpo">
      <p class="tarjeta__categoria">${esc(p.categoria)}</p>
      <h3 class="tarjeta__nombre" data-abrir="${esc(p.id)}">${esc(p.nombre)}</h3>
      ${variantes}
      <div class="tarjeta__precios">
        <span class="tarjeta__precio">${precioARS(p.precio)}</span>
        ${p.precio_anterior ? `<span class="tarjeta__anterior">${precioARS(p.precio_anterior)}</span>` : ''}
      </div>
      ${accion}
    </div>
  </article>`;
}

/* --- Render: preguntas frecuentes --------------------------------------- */

function pintarPreguntasFrecuentes() {
  const preguntas = [
    {
      p: '¿Hacen envíos? ¿A dónde?',
      r: `${TIENDA.zonaEnvio}. El costo depende de la zona y del peso del pedido: te lo decimos por WhatsApp antes de cerrar la compra. También podés retirar sin cargo coordinando el horario.`,
    },
    {
      p: '¿Qué medios de pago aceptan?',
      r: 'Efectivo, transferencia bancaria y billeteras virtuales. No hay pago online en la web: el pedido se cierra por WhatsApp y ahí te pasamos los datos para pagar.',
    },
    {
      p: '¿Cuánto tardan en entregar?',
      r: 'Si retirás, normalmente lo tenés listo el mismo día. Los envíos a la zona se entregan en 24 a 48 horas hábiles, y al interior del país entre 3 y 6 días hábiles según el correo.',
    },
    {
      p: '¿Puedo cambiar un producto?',
      r: 'Sí. Tenés 7 días desde que lo recibiste para cambiarlo, siempre que esté sin uso y con su empaque original. Los perfumes abiertos no se cambian por razones de higiene. Si llega con una falla, lo cambiamos sin costo.',
    },
    {
      p: '¿Los productos tienen garantía?',
      r: 'Los electrónicos (auriculares, parlantes, smartwatch y cargadores) tienen 30 días de garantía por falla de fábrica. Guardá el comprobante del pedido y escribinos por WhatsApp.',
    },
    {
      p: '¿Cómo sé si hay stock?',
      r: 'El catálogo se actualiza todos los días. Si un producto dice "Sin stock", podés tocar "Consultar por WhatsApp" y te avisamos cuando vuelve a entrar.',
    },
  ];

  $('#faq-lista').innerHTML = preguntas.map((item, i) => `
    <div class="faq__item">
      <button class="faq__pregunta" type="button" aria-expanded="false" aria-controls="faq-r-${i}">
        ${esc(item.p)}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
      </button>
      <div class="faq__respuesta" id="faq-r-${i}"><div><p>${esc(item.r)}</p></div></div>
    </div>`).join('');
}

/* --- Modal de producto -------------------------------------------------- */

function abrirProducto(id) {
  const producto = estado.productos.find((p) => String(p.id) === String(id));
  if (!producto) return;

  estado.productoAbierto = producto;
  estado.fotoActiva = 0;
  estado.varianteElegida = producto.variantes?.[0] ?? '';
  estado.cantidadElegida = 1;
  estado.ultimoFoco = document.activeElement;

  pintarModal();
  $('#modal-producto').classList.add('abierto');
  $('#modal-producto').setAttribute('aria-hidden', 'false');
  $('#fondo-modal').classList.add('abierto');
  document.body.classList.add('sin-scroll');
  $('#cerrar-modal').focus();
}

function cerrarProducto() {
  $('#modal-producto').classList.remove('abierto');
  $('#modal-producto').setAttribute('aria-hidden', 'true');
  if (!$('#carrito').classList.contains('abierto')) {
    $('#fondo-modal').classList.remove('abierto');
    document.body.classList.remove('sin-scroll');
  }
  estado.productoAbierto = null;
  estado.ultimoFoco?.focus?.();
}

function pintarModal() {
  const p = estado.productoAbierto;
  if (!p) return;

  const fotos = (p.imagenes ?? []).length ? p.imagenes : [imagenPlaceholder(p.nombre)];
  const descuento = porcentajeDescuento(p.precio, p.precio_anterior);
  const variantes = p.variantes ?? [];
  const hayVarias = fotos.length > 1;

  $('#modal-scroll').innerHTML = `
    <div class="modal__galeria">
      <div class="modal__galeria-principal">
        <img src="${esc(fotos[estado.fotoActiva])}" alt="${esc(p.nombre)}" decoding="async">
        ${hayVarias ? `
          <button class="modal__flecha modal__flecha--izq" data-foto="prev" aria-label="Foto anterior">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 18-6-6 6-6"></path></svg>
          </button>
          <button class="modal__flecha modal__flecha--der" data-foto="next" aria-label="Foto siguiente">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 6 6 6-6 6"></path></svg>
          </button>` : ''}
        ${p.stock ? '' : '<div class="tarjeta__sinstock"><span>Sin stock</span></div>'}
      </div>
      ${hayVarias ? `
        <div class="modal__miniaturas">
          ${fotos.map((f, i) => `
            <button class="modal__miniatura" data-miniatura="${i}"
                    aria-pressed="${i === estado.fotoActiva}" aria-label="Ver foto ${i + 1}">
              <img src="${esc(f)}" alt="" loading="lazy" decoding="async">
            </button>`).join('')}
        </div>` : ''}
    </div>

    <div class="modal__cuerpo">
      <div>
        <p class="tarjeta__categoria">${esc(p.categoria)}</p>
        <h2 class="modal__titulo" id="modal-titulo">${esc(p.nombre)}</h2>
      </div>

      <div class="modal__precios">
        <span class="modal__precio">${precioARS(p.precio)}</span>
        ${p.precio_anterior ? `<span class="tarjeta__anterior">${precioARS(p.precio_anterior)}</span>` : ''}
        ${descuento > 0 ? `<span class="etiqueta etiqueta--oferta">-${descuento}%</span>` : ''}
      </div>

      ${p.etiqueta ? `<div><span class="etiqueta ${p.etiqueta === 'Oferta' ? 'etiqueta--oferta' : ''}">${esc(p.etiqueta)}</span></div>` : ''}

      ${p.descripcion ? `<p class="modal__descripcion">${esc(p.descripcion)}</p>` : ''}

      ${variantes.length ? `
        <div class="campo">
          <label class="campo__etiqueta" for="modal-variante">Elegí una opción</label>
          <select class="entrada" id="modal-variante">
            ${variantes.map((v) => `<option value="${esc(v)}" ${v === estado.varianteElegida ? 'selected' : ''}>${esc(v)}</option>`).join('')}
          </select>
        </div>` : ''}

      ${p.stock ? `
        <div class="campo">
          <span class="campo__etiqueta">Cantidad</span>
          <div class="cantidad">
            <button type="button" data-cantidad="-1" aria-label="Quitar uno"
                    ${estado.cantidadElegida <= 1 ? 'disabled' : ''}>−</button>
            <output aria-live="polite">${estado.cantidadElegida}</output>
            <button type="button" data-cantidad="1" aria-label="Agregar uno">+</button>
          </div>
        </div>` : ''}

      <p class="campo__ayuda">
        Sin pago online: al enviar el pedido se abre WhatsApp con todo el detalle escrito.
      </p>
    </div>`;

  const subtotal = p.precio * estado.cantidadElegida;
  $('#modal-pie').innerHTML = p.stock
    ? `<button class="btn btn--principal btn--grande" id="modal-agregar">
         Agregar · ${precioARS(subtotal)}
       </button>`
    : `<a class="btn btn--whatsapp btn--grande" href="${esc(carrito.urlConsulta(p))}" target="_blank" rel="noopener">
         Consultar por WhatsApp
       </a>`;
}

/* --- Carrito ------------------------------------------------------------- */

function abrirCarrito() {
  estado.ultimoFoco = document.activeElement;
  $('#carrito').classList.add('abierto');
  $('#carrito').setAttribute('aria-hidden', 'false');
  $('#fondo-modal').classList.add('abierto');
  document.body.classList.add('sin-scroll');
  $('#cerrar-carrito').focus();
}

function cerrarCarrito() {
  $('#carrito').classList.remove('abierto');
  $('#carrito').setAttribute('aria-hidden', 'true');
  if (!$('#modal-producto').classList.contains('abierto')) {
    $('#fondo-modal').classList.remove('abierto');
    document.body.classList.remove('sin-scroll');
  }
  estado.ultimoFoco?.focus?.();
}

function pintarCarrito(lineas) {
  const cantidad = carrito.cantidadTotal();
  const totalPedido = carrito.total();

  // Contador del header
  const contador = $('#contador-carrito');
  contador.textContent = String(cantidad);
  contador.classList.toggle('visible', cantidad > 0);

  // Barra fija del total (celular)
  const barra = $('#barra-total');
  barra.classList.toggle('visible', cantidad > 0);
  document.body.classList.toggle('con-barra-total', cantidad > 0);
  $('#barra-total-items').textContent = `${cantidad} ${cantidad === 1 ? 'producto' : 'productos'}`;
  $('#barra-total-monto').textContent = precioARS(totalPedido);

  $('#carrito-cuenta').textContent = cantidad
    ? `${cantidad} ${cantidad === 1 ? 'producto' : 'productos'}`
    : 'Sin productos';
  $('#carrito-total').textContent = precioARS(totalPedido);
  $('#carrito-pie').hidden = cantidad === 0;

  if (!lineas.length) {
    $('#carrito-cuerpo').innerHTML = `
      <div class="vacio">
        <strong>Tu carrito está vacío</strong>
        <span>Agregá productos del catálogo y los cerramos por WhatsApp.</span>
        <div style="margin-top:14px">
          <button class="btn btn--principal btn--chico" id="carrito-ir-catalogo">Ver catálogo</button>
        </div>
      </div>`;
    return;
  }

  const datos = carrito.leerDatosCliente();

  $('#carrito-cuerpo').innerHTML = `
    ${lineas.map(lineaCarrito).join('')}

    <div class="carrito__datos">
      <h3>Tus datos</h3>

      <div class="campo">
        <label class="campo__etiqueta" for="cliente-nombre">Tu nombre</label>
        <input class="entrada" id="cliente-nombre" type="text" placeholder="Ej: Leonardo"
               autocomplete="name" value="${esc(datos.nombre)}">
      </div>

      <div class="campo">
        <span class="campo__etiqueta">Forma de entrega</span>
        <div class="entrega-opciones">
          <label class="entrega-opcion">
            <input type="radio" name="entrega" value="retiro" ${datos.entrega !== 'envio' ? 'checked' : ''}>
            Retiro
          </label>
          <label class="entrega-opcion">
            <input type="radio" name="entrega" value="envio" ${datos.entrega === 'envio' ? 'checked' : ''}>
            Envío
          </label>
        </div>
      </div>

      <div class="campo" id="campo-direccion" ${datos.entrega === 'envio' ? '' : 'hidden'}>
        <label class="campo__etiqueta" for="cliente-direccion">Dirección de envío</label>
        <input class="entrada" id="cliente-direccion" type="text"
               placeholder="Calle, número, localidad" autocomplete="street-address"
               value="${esc(datos.direccion)}">
        <span class="campo__ayuda">El costo del envío lo confirmamos por WhatsApp.</span>
      </div>

      <button class="btn btn--fantasma btn--chico" id="vaciar-carrito" style="align-self:flex-start">
        Vaciar el carrito
      </button>
    </div>`;
}

function lineaCarrito(l) {
  const foto = l.imagen || imagenPlaceholder(l.nombre);
  return `
  <div class="linea">
    <div class="linea__foto"><img src="${esc(foto)}" alt="" loading="lazy" decoding="async"></div>
    <div class="linea__datos">
      <p class="linea__nombre">${esc(l.nombre)}</p>
      ${l.variante ? `<p class="linea__variante">${esc(l.variante)}</p>` : ''}
      <p class="linea__precio">${precioARS(l.precio * l.cantidad)}</p>
    </div>
    <div class="linea__acciones">
      <button class="linea__borrar" data-borrar="${esc(l.clave)}" aria-label="Quitar ${esc(l.nombre)}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"></path></svg>
      </button>
      <div class="cantidad">
        <button type="button" data-linea-menos="${esc(l.clave)}" aria-label="Quitar uno">−</button>
        <output>${l.cantidad}</output>
        <button type="button" data-linea-mas="${esc(l.clave)}" aria-label="Agregar uno">+</button>
      </div>
    </div>
  </div>`;
}

function leerDatosDelFormulario() {
  return {
    nombre: $('#cliente-nombre')?.value ?? '',
    entrega: document.querySelector('input[name="entrega"]:checked')?.value ?? 'retiro',
    direccion: $('#cliente-direccion')?.value ?? '',
  };
}

function enviarPedido() {
  if (carrito.estaVacio()) return;

  const datos = leerDatosDelFormulario();

  if (!datos.nombre.trim()) {
    avisar('Escribí tu nombre para poder enviar el pedido.', 'error');
    $('#cliente-nombre')?.focus();
    return;
  }
  if (datos.entrega === 'envio' && !datos.direccion.trim()) {
    avisar('Necesitamos la dirección para el envío.', 'error');
    $('#cliente-direccion')?.focus();
    return;
  }

  carrito.guardarDatosCliente(datos);
  // Se abre en la misma pestaña: en el celular pasa directo a la app de WhatsApp.
  window.open(carrito.urlPedido(datos), '_blank', 'noopener');
}

/* --- Eventos ------------------------------------------------------------- */

function conectarEventos() {
  // Buscador en tiempo real
  $('#buscador').addEventListener('input', debounce((e) => {
    estado.busqueda = e.target.value;
    pintarGrilla();
    observarApariciones();
  }, 160));

  // Orden
  $('#orden').addEventListener('change', (e) => {
    estado.orden = e.target.value;
    pintarGrilla();
    observarApariciones();
  });

  // Chips de categoría
  $('#chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-categoria]');
    if (!chip) return;
    estado.categoria = chip.dataset.categoria;
    pintarChips();
    pintarGrilla();
    observarApariciones();
  });

  // Grilla: abrir modal / agregar al carrito
  $('#grilla').addEventListener('click', (e) => {
    const agregar = e.target.closest('[data-agregar]');
    if (agregar) {
      const producto = estado.productos.find((p) => String(p.id) === agregar.dataset.agregar);
      if (!producto) return;
      // Si tiene variantes, conviene que el cliente elija: abrimos el modal.
      if ((producto.variantes ?? []).length > 1) return abrirProducto(producto.id);
      carrito.agregar(producto, { variante: producto.variantes?.[0] ?? '' });
      festejarAgregado(producto.nombre);
      return;
    }
    const abrir = e.target.closest('[data-abrir]');
    if (abrir) abrirProducto(abrir.dataset.abrir);
  });

  $('#grilla').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const abrir = e.target.closest('[data-abrir]');
    if (!abrir) return;
    e.preventDefault();
    abrirProducto(abrir.dataset.abrir);
  });

  // Preguntas frecuentes (acordeón)
  $('#faq-lista').addEventListener('click', (e) => {
    const boton = e.target.closest('.faq__pregunta');
    if (!boton) return;
    const item = boton.closest('.faq__item');
    const abierto = item.classList.toggle('abierto');
    boton.setAttribute('aria-expanded', String(abierto));
  });

  // Modal de producto
  $('#modal-producto').addEventListener('click', (e) => {
    const p = estado.productoAbierto;
    if (!p) return;

    const flecha = e.target.closest('[data-foto]');
    if (flecha) {
      const fotos = p.imagenes?.length ? p.imagenes : [1];
      const salto = flecha.dataset.foto === 'next' ? 1 : -1;
      estado.fotoActiva = (estado.fotoActiva + salto + fotos.length) % fotos.length;
      return pintarModal();
    }

    const miniatura = e.target.closest('[data-miniatura]');
    if (miniatura) {
      estado.fotoActiva = Number(miniatura.dataset.miniatura);
      return pintarModal();
    }

    const paso = e.target.closest('[data-cantidad]');
    if (paso) {
      estado.cantidadElegida = Math.min(99, Math.max(1, estado.cantidadElegida + Number(paso.dataset.cantidad)));
      return pintarModal();
    }
  });

  $('#modal-producto').addEventListener('change', (e) => {
    if (e.target.id === 'modal-variante') estado.varianteElegida = e.target.value;
  });

  $('#modal-pie').addEventListener('click', (e) => {
    if (!e.target.closest('#modal-agregar')) return;
    const p = estado.productoAbierto;
    if (!p) return;
    carrito.agregar(p, { variante: estado.varianteElegida, cantidad: estado.cantidadElegida });
    festejarAgregado(p.nombre);
    cerrarProducto();
  });

  $('#cerrar-modal').addEventListener('click', cerrarProducto);

  // Carrito
  $('#abrir-carrito').addEventListener('click', abrirCarrito);
  $('#cerrar-carrito').addEventListener('click', cerrarCarrito);
  $('#barra-total-btn').addEventListener('click', abrirCarrito);
  $('#enviar-pedido').addEventListener('click', enviarPedido);

  $('#carrito-cuerpo').addEventListener('click', (e) => {
    const mas = e.target.closest('[data-linea-mas]');
    if (mas) {
      const linea = carrito.obtenerLineas().find((l) => l.clave === mas.dataset.lineaMas);
      return carrito.cambiarCantidad(mas.dataset.lineaMas, (linea?.cantidad ?? 0) + 1);
    }
    const menos = e.target.closest('[data-linea-menos]');
    if (menos) {
      const linea = carrito.obtenerLineas().find((l) => l.clave === menos.dataset.lineaMenos);
      return carrito.cambiarCantidad(menos.dataset.lineaMenos, (linea?.cantidad ?? 0) - 1);
    }
    const borrar = e.target.closest('[data-borrar]');
    if (borrar) return carrito.eliminar(borrar.dataset.borrar);

    if (e.target.closest('#vaciar-carrito')) {
      if (confirm('¿Vaciar el carrito?')) carrito.vaciar();
      return;
    }
    if (e.target.closest('#carrito-ir-catalogo')) {
      cerrarCarrito();
      document.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Mostrar u ocultar la dirección, y recordar los datos mientras escribe
  $('#carrito-cuerpo').addEventListener('change', (e) => {
    if (e.target.name === 'entrega') {
      $('#campo-direccion').hidden = e.target.value !== 'envio';
    }
    carrito.guardarDatosCliente(leerDatosDelFormulario());
  });
  $('#carrito-cuerpo').addEventListener('input', debounce(() => {
    carrito.guardarDatosCliente(leerDatosDelFormulario());
  }, 400));

  // Cerrar con el fondo oscuro o con Escape
  $('#fondo-modal').addEventListener('click', () => {
    if ($('#modal-producto').classList.contains('abierto')) cerrarProducto();
    if ($('#carrito').classList.contains('abierto')) cerrarCarrito();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('#modal-producto').classList.contains('abierto')) return cerrarProducto();
    if ($('#carrito').classList.contains('abierto')) cerrarCarrito();
  });
}

function festejarAgregado(nombre) {
  avisar(`${nombre} agregado al carrito`);
  const boton = $('#abrir-carrito');
  boton.classList.remove('pulso');
  // Reiniciamos la animación forzando un reflow.
  void boton.offsetWidth;
  boton.classList.add('pulso');
}

/* --- Aparición suave de las tarjetas ------------------------------------ */

let observador;

function observarApariciones() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.aparece').forEach((el) => el.classList.add('visible'));
    return;
  }

  observador ??= new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add('visible');
      observador.unobserve(entrada.target);
    });
  }, { rootMargin: '60px' });

  document.querySelectorAll('.aparece:not(.visible)').forEach((el) => observador.observe(el));
}
