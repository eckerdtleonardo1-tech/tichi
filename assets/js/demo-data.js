/* ============================================================================
   Datos de demostración
   ----------------------------------------------------------------------------
   Son exactamente los mismos 12 productos que carga supabase/schema.sql.
   Sólo se usan en el sitio público cuando Supabase todavía no está configurado,
   para que puedas ver el diseño funcionando antes de conectar la base.
   ============================================================================ */

export const CATEGORIAS_DEMO = [
  { id: 'c1', nombre: 'Fundas de celular', orden: 1 },
  { id: 'c2', nombre: 'Perfumes', orden: 2 },
  { id: 'c3', nombre: 'Auriculares', orden: 3 },
  { id: 'c4', nombre: 'Importados', orden: 4 },
];

export const PRODUCTOS_DEMO = [
  {
    id: 'p1', nombre: 'Funda silicona premium', categoria: 'Fundas de celular',
    precio: 12500, precio_anterior: null,
    descripcion: 'Funda de silicona con interior de microfibra. Tacto suave, no resbala y protege los bordes de la pantalla. Disponible para los modelos más pedidos.',
    imagenes: ['assets/img/productos/funda-silicona-1.png', 'assets/img/productos/funda-silicona-2.png', 'assets/img/productos/funda-silicona-3.png'], variantes: ['iPhone 15', 'iPhone 14', 'iPhone 13', 'Samsung A54', 'Samsung S23', 'Motorola G84'],
    stock: true, etiqueta: 'Más vendido', destacado: true, activo: true, fecha_creacion: '2026-09-01T10:00:00Z',
  },
  {
    id: 'p2', nombre: 'Funda transparente antigolpes', categoria: 'Fundas de celular',
    precio: 9800, precio_anterior: 13900,
    descripcion: 'Funda rígida transparente con marco reforzado y esquinas con aire. No se pone amarilla y deja ver el color original del celular.',
    imagenes: ['assets/img/productos/funda-transparente-1.png', 'assets/img/productos/funda-transparente-2.png'], variantes: ['iPhone 15', 'iPhone 14', 'Samsung A34', 'Samsung A54', 'Xiaomi Redmi Note 13'],
    stock: true, etiqueta: 'Oferta', destacado: true, activo: true, fecha_creacion: '2026-09-02T10:00:00Z',
  },
  {
    id: 'p3', nombre: 'Funda libro con tarjetero', categoria: 'Fundas de celular',
    precio: 15900, precio_anterior: null,
    descripcion: 'Funda tipo libro en eco cuero, con dos espacios para tarjetas y soporte para ver videos. Cierre magnético.',
    imagenes: ['assets/img/productos/funda-libro-1.png'], variantes: ['iPhone 14', 'iPhone 13', 'Samsung A54', 'Motorola G54'],
    stock: true, etiqueta: null, destacado: false, activo: true, fecha_creacion: '2026-09-03T10:00:00Z',
  },
  {
    id: 'p4', nombre: 'Perfume importado árabe', categoria: 'Perfumes',
    precio: 34900, precio_anterior: null,
    descripcion: 'Fragancia intensa de larga duración, familia oriental amaderada. Ideal para la noche. Producto importado, presentación original con caja.',
    imagenes: ['assets/img/productos/perfume-arabe-1.png', 'assets/img/productos/perfume-arabe-2.png'], variantes: ['50 ml', '100 ml'],
    stock: true, etiqueta: 'Importado', destacado: true, activo: true, fecha_creacion: '2026-09-04T10:00:00Z',
  },
  {
    id: 'p5', nombre: 'Eau de parfum floral', categoria: 'Perfumes',
    precio: 28900, precio_anterior: 35900,
    descripcion: 'Perfume femenino con notas de jazmín, vainilla y pera. Fijación de 6 a 8 horas. Muy elegido para regalo.',
    imagenes: ['assets/img/productos/perfume-floral-1.png'], variantes: ['30 ml', '50 ml', '100 ml'],
    stock: true, etiqueta: 'Oferta', destacado: false, activo: true, fecha_creacion: '2026-09-05T10:00:00Z',
  },
  {
    id: 'p6', nombre: 'Set de body splash x3', categoria: 'Perfumes',
    precio: 18500, precio_anterior: null,
    descripcion: 'Combo de tres body splash de 250 ml con aromas frutales. Rinde muchísimo y se puede usar todos los días.',
    imagenes: ['assets/img/productos/body-splash-1.png'], variantes: ['Frutal', 'Cítrico', 'Dulce', 'Combo surtido'],
    stock: true, etiqueta: 'Nuevo', destacado: false, activo: true, fecha_creacion: '2026-09-06T10:00:00Z',
  },
  {
    id: 'p7', nombre: 'Auriculares inalámbricos TWS', categoria: 'Auriculares',
    precio: 26900, precio_anterior: null,
    descripcion: 'Bluetooth 5.3, estuche con carga y hasta 20 horas de uso. Controles táctiles, micrófono para llamadas y conexión automática al abrir el estuche.',
    imagenes: ['assets/img/productos/tws-1.png', 'assets/img/productos/tws-2.png'], variantes: ['Negro', 'Blanco'],
    stock: true, etiqueta: 'Más vendido', destacado: true, activo: true, fecha_creacion: '2026-09-07T10:00:00Z',
  },
  {
    id: 'p8', nombre: 'Auriculares gamer con micrófono', categoria: 'Auriculares',
    precio: 32500, precio_anterior: 41900,
    descripcion: 'Vincha acolchada, sonido envolvente y micrófono flexible con cancelación de ruido. Conexión por cable, compatible con PC, PS y celular.',
    imagenes: ['assets/img/productos/gamer-1.png', 'assets/img/productos/gamer-2.png'], variantes: ['Negro/Rojo', 'Negro/Azul'],
    stock: true, etiqueta: 'Oferta', destacado: false, activo: true, fecha_creacion: '2026-09-08T10:00:00Z',
  },
  {
    id: 'p9', nombre: 'Auriculares in-ear con cable', categoria: 'Auriculares',
    precio: 7900, precio_anterior: null,
    descripcion: 'Clásicos in-ear con manos libres y control de volumen. Conector 3.5 mm. La opción práctica y económica.',
    imagenes: ['assets/img/productos/inear-1.png'], variantes: ['Negro', 'Blanco'],
    stock: false, etiqueta: null, destacado: false, activo: true, fecha_creacion: '2026-09-09T10:00:00Z',
  },
  {
    id: 'p10', nombre: 'Parlante bluetooth portátil', categoria: 'Importados',
    precio: 39900, precio_anterior: null,
    descripcion: 'Parlante compacto resistente a salpicaduras, 10 W reales, luces LED y hasta 8 horas de batería. Entra en la mochila.',
    imagenes: ['assets/img/productos/parlante-1.png', 'assets/img/productos/parlante-2.png'], variantes: ['Negro', 'Azul', 'Rojo'],
    stock: true, etiqueta: 'Importado', destacado: true, activo: true, fecha_creacion: '2026-09-10T10:00:00Z',
  },
  {
    id: 'p11', nombre: 'Smartwatch deportivo', categoria: 'Importados',
    precio: 45900, precio_anterior: 58900,
    descripcion: 'Pantalla a color, notificaciones del celular, medición de pasos, ritmo cardíaco y sueño. Incluye dos mallas de regalo.',
    imagenes: ['assets/img/productos/smartwatch-1.png', 'assets/img/productos/smartwatch-2.png'], variantes: ['Negro', 'Rosa', 'Plata'],
    stock: true, etiqueta: 'Oferta', destacado: true, activo: true, fecha_creacion: '2026-09-11T10:00:00Z',
  },
  {
    id: 'p12', nombre: 'Cargador rápido 20W + cable', categoria: 'Importados',
    precio: 14500, precio_anterior: null,
    descripcion: 'Cargador con carga rápida y protección contra sobrecarga, más cable reforzado de 1 metro. Elegí el tipo de cable que necesitás.',
    imagenes: ['assets/img/productos/cargador-1.png'], variantes: ['Cable Tipo C', 'Cable Lightning', 'Cable Micro USB'],
    stock: true, etiqueta: 'Nuevo', destacado: false, activo: true, fecha_creacion: '2026-09-12T10:00:00Z',
  },
];
