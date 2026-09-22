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
  js/demo-data.js          Los productos de ejemplo, todos con foto real
  js/demo-estado.js        El catálogo de la demo, guardado en el navegador
  js/demo-db.js            Respaldo del panel en modo demo (misma interfaz que db.js)
  img/og.png               Imagen para compartir en WhatsApp / Instagram
  img/favicon.svg          Icono del sitio
  img/productos/           Fotos de los productos de ejemplo (real-*.png son reales)
supabase/schema.sql        SQL completo: tablas, RLS, bucket y productos de ejemplo
vercel.json                Configuración del deploy
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
  `activo = true`; crear, editar y borrar requiere una sesión iniciada.
- El bucket de Storage **`productos`** para las fotos, público para lectura y
  escribible sólo por el admin logueado.
- 4 categorías y **5 productos de ejemplo**, los mismos del modo demostración.

El script se puede volver a ejecutar cuando quieras: las tablas y las políticas se
recrean sin romper nada, y **los productos de ejemplo se cargan sólo si la tabla
está vacía**, así que no te va a duplicar tu catálogo real.

### 3. Crear el usuario del vendedor y cerrar el registro

**3.a — Crear el usuario**

1. Supabase → **Authentication → Users → Add user → Create new user**.
2. Poné el email y la contraseña con los que va a entrar el vendedor.
3. Activá **Auto Confirm User** (si no, el usuario queda sin confirmar y no puede entrar).

No hay registro público ni "crear cuenta": el único usuario es el que creás acá.

**3.b — Cerrar el registro público ← no te lo saltees**

Supabase lo trae **abierto de fábrica**. Desactivalo en:

**Authentication → Sign In / Providers → Email → «Allow new users to sign up»**

> **Por qué es el paso más importante:** la clave `anon` viaja en el navegador, es
> pública a propósito. Con el registro abierto, cualquiera podría crearse una
> cuenta con esa clave, confirmar su propio mail y quedar habilitado para editar el
> catálogo. Con el registro cerrado, los únicos usuarios que existen son los que
> creás vos a mano.
>
> Si te lo olvidás, el panel te lo avisa con un cartel rojo la próxima vez que
> entres: lo comprueba solo contra la configuración de tu proyecto.

Si algún día querés sumar a otra persona, la creás igual que en 3.a. Para quitarle
el acceso, la borrás desde **Authentication → Users**.

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

### La imagen para compartir

WhatsApp e Instagram necesitan que `og:image` sea una URL **absoluta**, así que en
`index.html` está apuntando al dominio del sitio:

```
https://catalogo-imports.vercel.app
```

Si algún día cambiás de dominio —por ejemplo a uno propio— hay que actualizar
**cuatro líneas** de `index.html`: `og:url`, `og:image`, `twitter:image` y el
`<link rel="canonical">`.

> WhatsApp guarda en caché la vista previa de cada link. Si compartiste el link
> antes de que la imagen estuviera bien, agregale `?v=2` al final para forzar la
> actualización.

---

## Si se lo vendés a alguien

La tienda está pensada para que el dueño la maneje sin tocar código: carga los
productos desde el panel y los cambios se ven en el momento. Igual hay tres
decisiones que conviene resolver **antes** de entregarla.

**El plan gratuito de Supabase permite 2 proyectos activos**, contados en todas las
organizaciones donde seas dueño o administrador. Los **pausados no cuentan**, así que
si te quedás sin cupo podés pausar uno que no uses y se libera el lugar. De todos
modos, lo que corresponde es que el proyecto de la tienda esté en la cuenta del
cliente, no en la tuya, y así tu cupo no entra en juego.

**Las cuentas tienen que ser del cliente.** Si el proyecto de Supabase y el de
Vercel quedan a tu nombre, cada cambio de contraseña, cada factura y cada
problema pasa por vos para siempre. Lo más limpio es crear los dos proyectos con
el mail del cliente desde el principio, o transferirlos: Supabase permite mover un
proyecto a otra organización, y Vercel transferir el proyecto.

**El plan gratuito de Supabase pausa los proyectos sin tráfico.** Si la tienda
pasa alrededor de una semana sin visitas, el proyecto se pausa y hay que
reactivarlo a mano desde el panel de Supabase — mientras está pausado, la tienda
no carga productos. Con visitas seguidas no pasa, pero si arranca despacio te lo
vas a cruzar, y es incómodo que le pase a alguien que pagó. Verificá las
condiciones y los precios actuales en la página de Supabase antes de prometer
nada, porque estas políticas cambian.

**Si el vendedor se olvida la contraseña**, se la cambiás vos desde Supabase en
**Authentication → Users → (el usuario) → Reset password**. El panel no tiene
"olvidé mi contraseña" a propósito, para no sumar pantallas: son 10 segundos
desde el panel de Supabase.

## Cómo se usa

### El comprador

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

### El dueño de la tienda, en `/admin`

- **Entrar** con el email y la contraseña. La sesión queda guardada en el celular.
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
muestra **los productos de ejemplo** y un cartel amarillo avisándolo. Sirve para ver
el diseño antes de conectar la base. El panel, en cambio, no deja entrar: te dice
que falta configurar Supabase.

### El repo viene listo para publicar como demostración

`mostrarAvisoDeDemo` ya está en **`false`**, así que si subís esto a Vercel tal
como está tenés una tienda que se ve y funciona como una tienda real:

- Los 5 productos, todos con foto real
- Buscador, filtros por categoría y orden por precio
- Galería de 3 fotos en la funda de silicona
- Carrito completo y pedido por WhatsApp al número configurado

Todo eso **sin base de datos ni cuenta de Supabase**. Es la forma más rápida de
mostrarle el catálogo a alguien.

**El panel también funciona en la demostración.** En `/admin` entrás con las
credenciales que la propia pantalla te muestra:

```
demo@tienda.com  /  demo1234
```

Y ahí podés cargar productos, subir fotos desde la galería del celular, editar,
borrar, usar los botones rápidos y administrar categorías. Todo real, pero contra
el navegador en lugar de una base de datos: lo que hacés queda en ese dispositivo,
no viaja a ningún servidor y no afecta a nadie más.

El botón **«Reiniciar la demo»** devuelve el catálogo a los productos
originales, para poder repetir la presentación de cero.

Si te ponés a desarrollar, pasá `mostrarAvisoDeDemo` a `true`: vuelve el cartel
amarillo y el mensaje técnico, para no creer que ya está conectada a la base
cuando en realidad sigue en modo demo.

### Cómo mostrarle la tienda a alguien

Un recorrido que muestra todo en dos minutos:

1. Abrí la tienda y navegá el catálogo: buscador, chips de categoría, orden por
   precio. Entrá a un producto con varias fotos para mostrar la galería.
2. Agregá dos cosas al carrito, poné un nombre, elegí envío y tocá
   **Enviar pedido por WhatsApp**. Se abre el chat con el pedido escrito: ese es
   el momento que cierra la venta.
3. Abrí `/admin` **en otra pestaña** y entrá con las credenciales de la demo.
4. Cargá un producto con una foto del celular y guardá.
5. Volvé a la pestaña de la tienda: **el producto ya está ahí, sin recargar.**
   Las dos pestañas comparten el catálogo, así que el cambio se ve solo.
6. Tocá «Reiniciar la demo» para dejar todo como estaba.

El paso 5 es el que mejor explica el producto: el vendedor carga y se publica.

### Las fotos de los productos de ejemplo

Las siete imágenes de `assets/img/productos/` son **fotos reales**, recortadas a
cuadrado para que entren en la grilla sin que se corte el producto.

El catálogo de ejemplo tiene sólo cinco productos a propósito: entran únicamente
los que tienen foto real. Una ilustración al lado de una foto se nota enseguida y
desluce la demo.

Para sumar productos, poné la foto en esa carpeta y agregá la entrada en
`assets/js/demo-data.js` (o cargalos desde el panel, si ya conectaste la base).

Cuando tengas las fotos de verdad, hay dos caminos:

- **Con la base conectada:** las subís desde el panel y estas dejan de usarse solas.
- **Sin base, sólo para la demo:** reemplazás los archivos de esa carpeta
  respetando los nombres, o editás el campo `imagenes` de cada producto en
  `assets/js/demo-data.js`.

### «Publiqué cambios y sigo viendo lo viejo»

El catálogo de la demostración se guarda en el navegador de quien mira, así que
hay dos cachés en juego. Las dos están resueltas:

- **El catálogo guardado.** `demo-estado.js` guarda una firma del catálogo de
  ejemplo. Si cambiás `demo-data.js`, la firma cambia y lo guardado se descarta
  solo en la próxima visita. Lo que el vendedor haya cargado él se conserva
  mientras el catálogo de ejemplo no cambie.
- **Los archivos del sitio.** `vercel.json` manda `max-age=0, must-revalidate`
  para todo lo que está en `/assets`, así que el navegador siempre pregunta si
  hay algo nuevo. Cuando la tienda esté estable podés subir ese número para las
  imágenes y ahorrar datos.

Si igual quedó algo pegado en un teléfono, entrá a `/admin` y tocá
**«Reiniciar la demo»**: limpia lo guardado y vuelve al catálogo de ejemplo.

### Para apagar el modo demo del todo

`demoSiNoHayBaseDeDatos: false` en `config.js`. El sitio deja de mostrar ejemplos
y avisa que falta configurar la base.

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
Sí, `TIENDA.whatsapp` en `assets/js/config.js`. Tiene que ir en formato
internacional, sin `+` ni espacios ni guiones, o el link no abre el chat. Para el
número 3329-534029 queda así:

```
54      país (Argentina)
9       celular
3329    característica, sin el 0
534029  número
= 5493329534029
```

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
