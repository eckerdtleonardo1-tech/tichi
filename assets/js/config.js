/* ============================================================================
   Configuración de la tienda
   ----------------------------------------------------------------------------
   Este es el ÚNICO archivo que tenés que editar para poner el sitio en marcha.
   Los datos de Supabase están en: Supabase -> Project Settings -> API
   ============================================================================ */

export const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
export const SUPABASE_ANON_KEY = 'TU_ANON_KEY';

/* La "anon key" es pública a propósito: es la que va en el navegador.
   Lo que protege tus datos son las políticas RLS de supabase/schema.sql.
   NUNCA pongas acá la "service_role key". */

export const TIENDA = {
  nombre: 'productosimportadossl',
  slogan: 'Importados con envío a todo el país',

  // Número de WhatsApp en formato internacional, sin + ni espacios.
  //
  // El número es 3329-534029. En wa.me hay que escribirlo internacional o el
  // link no abre el chat:
  //     54  país (Argentina)
  //     9   celular
  //     3329 característica, sin el 0
  //     534029
  //   =  5493329534029
  whatsapp: '5493329534029',

  // Datos que se muestran en el footer y en las preguntas frecuentes.
  zonaEnvio: 'San Antonio de Areco y alrededores · Envíos a todo el país por Correo Argentino y Andreani',
  horarios: 'Lunes a sábados de 9 a 20 h',
  retiro: 'Retiro sin cargo coordinando por WhatsApp',
  instagram: 'https://instagram.com/productosimportadossl',
  instagramUsuario: '@productosimportadossl',

  // Si está en true y Supabase todavía no está configurado, el sitio muestra
  // los productos de ejemplo para que puedas ver el diseño funcionando.
  demoSiNoHayBaseDeDatos: true,

  // El cartel amarillo que avisa "estás viendo productos de ejemplo".
  // Está en false porque el sitio se publica en modo demostración: se ve como
  // una tienda real, sin mencionar archivos de configuración.
  // Ponelo en true si estás desarrollando, para no confundirte y creer que ya
  // está conectada a la base cuando en realidad sigue en modo demo.
  mostrarAvisoDeDemo: false,
};

/** true cuando ya pusiste tus credenciales reales de Supabase. */
export const supabaseConfigurado =
  !SUPABASE_URL.includes('TU-PROYECTO') && !SUPABASE_ANON_KEY.includes('TU_ANON_KEY');
