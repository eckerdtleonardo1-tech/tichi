# productosimportadossl · Catálogo + panel de administración

Tienda online con catálogo de productos, carrito y cierre de pedidos **por WhatsApp**
(sin pasarela de pago), más un panel de administración para cargar, editar y borrar
productos desde el celular.

HTML, CSS y JavaScript puro — sin frameworks ni build. Base de datos, autenticación
y fotos en **Supabase**. Se publica en **Vercel** tal como está.

---

## Estructura

```
index.html                 Sitio público (catálogo)
admin/index.html           Panel de administración
assets/
  css/base.css             Colores, tipografía, botones y formularios
  css/tienda.css           Estilos del sitio público
  css/admin.css            Estilos del panel
  js/config.js             ← EL ÚNICO ARCHIVO QUE TENÉS QUE EDITAR
  js/db.js                 Cliente de Supabase y acceso a datos
  js/carrito.js            Carrito (localStorage) y mensaje de WhatsApp
  js/utils.js              Formato de precios, búsqueda, avisos
  js/tienda.js             Lógica del sitio público
  js/admin.js              Lógica del panel
  js/demo-data.js          12 productos de ejemplo (sólo si falta Supabase)
  img/og.png               Imagen para compartir en WhatsApp / Instagram
  img/favicon.svg          Icono del sitio
supabase/schema.sql        SQL completo: tablas, RLS, bucket y 12 productos
vercel.json                Configuración del deploy
cumple.html                Página anterior del repo (se conservó)
```

---

## Puesta en marcha (4 pasos)

### 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto gratis.
2. Elegí la región **South America (São Paulo)** para que ande más rápido desde Argentina.
3. Guardá la contraseña de la base que te pide (no se usa en el sitio, pero te va a servir).

### 2. Crear las tablas

1. En el panel de Supabase andá a **SQL Editor → New query**.
2. Abrí `supabase/schema.sql`, copiá **todo** el contenido y pegalo ahí.
3. Tocá **Run**.

Eso crea:

- Tabla `categorias` (id, nombre, orden, fecha_creacion)
- Tabla `productos` (id, nombre, categoria, precio, precio_anterior, descripcion,
  imagenes, variantes, stock, etiqueta, destacado, activo, fecha_creacion)
- Las políticas de **Row Level Security**: el público sólo **lee** los productos con
  `activo = true`; crear, editar y borrar requiere estar logueado como admin.
- El bucket de Storage **`productos`** para las fotos, público para lectura y
  escribible sólo por el admin logueado.
- 4 categorías y **12 productos de ejemplo** (3 por categoría).

El script se puede volver a ejecutar cuando quieras: las tablas y las políticas se
recrean sin romper nada, y **los 12 productos de ejemplo se cargan sólo si la tabla
está vacía**, así que no te va a duplicar tu catálogo real.

### 3. Crear tu usuario admin

No hay registro público a propósito: el usuario lo creás vos.

1. Supabase → **Authentication → Users → Add user → Create new user**.
2. Poné tu email y una contraseña.
3. Activá **Auto Confirm User** (si no, el usuario queda sin confirmar y no puede entrar).

> Cualquier usuario que exista en Authentication puede administrar el catálogo.
> No crees usuarios que no sean tuyos.

### 4. Conectar el sitio

Abrí `assets/js/config.js` y completá las dos primeras líneas con los datos de
**Supabase → Project Settings → API**:

```js
export const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

En el mismo archivo podés cambiar el número de WhatsApp, los horarios, la zona de
envío y el Instagram:

```js
export const TIENDA = {
  nombre: 'productosimportadossl',
  whatsapp: '5493329534029',   // sin + ni espacios
  zonaEnvio: '...',
  horarios: '...',
  instagram: '...',
};
```

**Sobre la `anon key`:** es pública a propósito, es la que va en el navegador. Lo que
protege tus datos son las políticas RLS del paso 2. **Nunca** pongas ahí la
`service_role key`.

---

## Publicar en Vercel

**Opción A — desde GitHub (recomendada):**

1. Entrá a [vercel.com](https://vercel.com) → **Add New… → Project**.
2. Importá este repositorio.
3. Framework Preset: **Other**. Build Command: vacío. Output Directory: vacío.
4. **Deploy**.

**Opción B — desde la terminal:**

```bash
npm i -g vercel
vercel
```

Cada `git push` a la rama conectada publica una versión nueva sola.

### Después del primer deploy: la imagen para compartir

WhatsApp e Instagram necesitan que `og:image` sea una URL **absoluta**. En
`index.html` está con un dominio de ejemplo — cambialo por el tuyo (3 líneas):

```html
<meta property="og:url"   content="https://TU-DOMINIO.vercel.app/">
<meta property="og:image" content="https://TU-DOMINIO.vercel.app/assets/img/og.png">
<meta name="twitter:image" content="https://TU-DOMINIO.vercel.app/assets/img/og.png">
```

Y el `<link rel="canonical">` unas líneas más abajo.

> WhatsApp guarda en caché la vista previa de cada link. Si lo compartiste antes de
> corregir esto, agregale `?v=2` al final del link para forzar la actualización.

---

## Cómo se usa

### El cliente

1. Entra, busca o filtra por categoría, ordena por precio o novedades.
2. Toca un producto para ver las fotos, la descripción y elegir variante y cantidad.
3. Agrega al carrito (se guarda en el celular: si recarga, no lo pierde).
4. En el carrito pone su nombre y elige **retiro** o **envío + dirección**.
5. Toca **Enviar pedido por WhatsApp** y se abre el chat con el pedido ya escrito:

```
Hola! Quiero hacer este pedido:
• 2x Funda silicona premium (iPhone 15) – $25.000
• 1x Perfume importado árabe (100 ml) – $34.900
Total: $59.900
Nombre: Leonardo
Entrega: Envío a Belgrano 123, San Antonio de Areco
```

Si un producto está **sin stock**, en lugar de "Agregar" muestra
**"Consultar por WhatsApp"** con un mensaje específico de ese producto.

### Vos, en `/admin`

- **Entrar** con tu email y contraseña. La sesión queda guardada en el celular.
- **Listado** con buscador, filtro por categoría, miniatura y métricas arriba.
- **Botones rápidos** en cada producto, sin entrar a editar:
  - `Visible / Oculto` — lo saca o lo pone en la tienda
  - `Con stock / Sin stock`
  - `Destacado` — lo sube en el orden "Novedades"
- **Nuevo / Editar**: todos los campos, subida de **varias fotos** desde el celular
  con vista previa y botón para borrar cada una. Las variantes se escriben
  **separadas por comas** (`iPhone 15, iPhone 14, Samsung A54`).
- **Borrar** pide confirmación y limpia también las fotos del Storage.
- **Categorías**: agregar, renombrar, borrar y **ordenar** con las flechas. El orden
  es el que se ve en los chips de la tienda.
- **Salir** cierra la sesión.

Detalles que ya están resueltos:

- Renombrar una categoría actualiza sola la categoría de todos sus productos
  (`ON UPDATE CASCADE` en la base).
- No se puede borrar una categoría que tenga productos: el panel te dice cuántos
  hay para que los muevas primero.
- El precio anterior tiene que ser mayor al precio actual (es el precio tachado).
- Si un producto del carrito se desactiva o se queda sin stock, se saca solo del
  carrito del cliente la próxima vez que entra, y se le avisa.

---

## Modo demo

Si `assets/js/config.js` todavía no tiene credenciales reales, el sitio público
muestra **12 productos de ejemplo** y un cartel amarillo avisándolo. Sirve para ver
el diseño antes de conectar la base. El panel, en cambio, no deja entrar: te dice
que falta configurar Supabase.

Para apagar el modo demo, poné `demoSiNoHayBaseDeDatos: false` en `config.js`.

---

## Probar en tu computadora

Los módulos de JavaScript no funcionan abriendo el archivo con doble clic
(`file://`). Levantá un servidor local:

```bash
python3 -m http.server 4173
# o
npx serve .
```

Y abrí <http://localhost:4173> y <http://localhost:4173/admin/>.

---

## Diseño

| Uso | Color |
| --- | --- |
| Fondo | `#F3F4F6` |
| Tarjetas | `#FFFFFF` |
| Texto | `#1F2937` |
| Texto secundario | `#6B7280` |
| Botones principales | `#111827` |
| WhatsApp (sólo botones de WhatsApp) | `#25D366` |
| Ofertas | `#DC2626` |

Tipografía **Inter**. Precios en formato argentino (`$12.500`). Mobile-first, con
lazy loading en las imágenes y animaciones suaves que se desactivan si el sistema
tiene activado "reducir movimiento".

---

## Preguntas que te van a surgir

**¿Puedo cambiar el número de WhatsApp?**
Sí, `TIENDA.whatsapp` en `assets/js/config.js`. Formato internacional sin `+` ni
espacios: `5493329534029`.

**¿Puedo agregar otra etiqueta además de Importado / Nuevo / Oferta / Más vendido?**
Sí, pero son dos lugares: el `<select id="p-etiqueta">` en `admin/index.html` y el
`check` de la columna `etiqueta` en `supabase/schema.sql` (en Supabase tenés que
correr un `ALTER TABLE` para reemplazar esa restricción).

**¿Cuánto pesan las fotos?**
El bucket acepta hasta 10 MB por foto (JPG, PNG, WebP, AVIF, GIF). Conviene subirlas
cuadradas, de unos 1000×1000 px, para que se vean bien en la grilla.

**¿Los pedidos quedan guardados en algún lado?**
No. El pedido viaja sólo por WhatsApp, así que tu registro es el chat. El carrito
vive únicamente en el celular del cliente.
