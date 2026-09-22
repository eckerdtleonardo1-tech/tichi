/* ============================================================================
   Datos de demostración
   ----------------------------------------------------------------------------
   Los mismos productos que carga supabase/schema.sql. Se usan en el sitio
   público y en el panel cuando Supabase todavía no está configurado, para poder
   mostrar la tienda funcionando sin base de datos.

   Todos tienen foto real. Las rutas arrancan con "/" a propósito: este archivo
   lo leen tanto la tienda (en /) como el panel (en /admin/), así que una ruta
   relativa se rompería en uno de los dos.
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
    descripcion: 'Funda de silicona con interior de microfibra. Tacto suave, no resbala y protege los bordes de la pantalla. Colores disponibles: azul, azul oscuro y rosa. Decinos el modelo y el color por WhatsApp.',
    imagenes: [
      '/assets/img/productos/real-funda-azul.png',
      '/assets/img/productos/real-funda-azul-oscuro.png',
      '/assets/img/productos/real-funda-rosa.png',
    ],
    variantes: ['iPhone 12 / 12 Pro', 'iPhone 13 Pro', 'iPhone 15', 'iPhone 15 Pro Max', 'iPhone 16'],
    stock: true, etiqueta: 'Más vendido', destacado: true, activo: true, fecha_creacion: '2026-09-01T10:00:00Z',
  },
  {
    id: 'p2', nombre: 'Auriculares inalámbricos', categoria: 'Auriculares',
    precio: 26900, precio_anterior: null,
    descripcion: 'Estuche con carga y hasta 20 horas de uso. Se conectan solos al abrir el estuche, tienen micrófono para llamadas y controles táctiles.',
    imagenes: ['/assets/img/productos/real-auriculares-tws.png'],
    variantes: ['Blanco'],
    stock: true, etiqueta: 'Más vendido', destacado: true, activo: true, fecha_creacion: '2026-09-04T10:00:00Z',
  },
  {
    id: 'p3', nombre: 'Lattafa Yara', categoria: 'Perfumes',
    precio: 39900, precio_anterior: null,
    descripcion: 'Eau de parfum femenino, dulce y floral, de mucha duración. Presentación blanca y dorada, con su caja original. De los más pedidos.',
    imagenes: ['/assets/img/productos/real-perfume-yara.png'],
    variantes: ['100 ml'],
    stock: true, etiqueta: 'Importado', destacado: true, activo: true, fecha_creacion: '2026-09-06T10:00:00Z',
  },
  {
    id: 'p4', nombre: 'Odyssey Mandarin Sky Elixir', categoria: 'Perfumes',
    precio: 34900, precio_anterior: null,
    descripcion: 'Eau de parfum en edición limitada. Arranca cítrico y se asienta en notas dulces y amaderadas, con mucha duración. Viene con su caja original.',
    imagenes: ['/assets/img/productos/real-perfume-odyssey.png'],
    variantes: ['100 ml'],
    stock: true, etiqueta: 'Importado', destacado: false, activo: true, fecha_creacion: '2026-09-08T10:00:00Z',
  },
  {
    id: 'p5', nombre: 'Eclaire', categoria: 'Perfumes',
    precio: 28900, precio_anterior: 35900,
    descripcion: 'Perfume femenino dulce, con vainilla, caramelo y un fondo floral suave. Fijación de 6 a 8 horas. De los más elegidos para regalo.',
    imagenes: ['/assets/img/productos/real-perfume-eclaire.png'],
    variantes: ['100 ml'],
    stock: true, etiqueta: 'Oferta', destacado: false, activo: true, fecha_creacion: '2026-09-10T10:00:00Z',
  },
];
