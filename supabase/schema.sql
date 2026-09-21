-- ============================================================================
--  productosimportadossl — Esquema completo de Supabase
-- ----------------------------------------------------------------------------
--  Cómo usarlo:
--    1. Entrá a tu proyecto de Supabase -> SQL Editor -> New query
--    2. Pegá TODO este archivo y ejecutalo (Run)
--    3. Andá a Authentication -> Users -> Add user y creá tu usuario admin
--       (email + contraseña, con "Auto Confirm User" activado)
--
--  El script se puede volver a ejecutar sin romper nada (es idempotente).
-- ============================================================================

-- ----------------------------------------------------------------------------
--  1. Tablas
-- ----------------------------------------------------------------------------

create table if not exists public.categorias (
    id             uuid primary key default gen_random_uuid(),
    nombre         text        not null unique,
    orden          integer     not null default 0,
    fecha_creacion timestamptz not null default now()
);

comment on table public.categorias is 'Categorías del catálogo, ordenables desde el panel de administración.';

create table if not exists public.productos (
    id              uuid primary key default gen_random_uuid(),
    nombre          text          not null,
    categoria       text          not null,
    precio          numeric(12,2) not null default 0 check (precio >= 0),
    precio_anterior numeric(12,2) check (precio_anterior is null or precio_anterior >= 0),
    descripcion     text          not null default '',
    imagenes        text[]        not null default '{}',
    variantes       text[]        not null default '{}',
    stock           boolean       not null default true,
    etiqueta        text          check (etiqueta is null or etiqueta in ('Importado', 'Nuevo', 'Oferta', 'Más vendido')),
    destacado       boolean       not null default false,
    activo          boolean       not null default true,
    fecha_creacion  timestamptz   not null default now()
);

comment on table public.productos is 'Catálogo de productos. Sólo las filas con activo = true son visibles al público.';
comment on column public.productos.imagenes  is 'URLs públicas de las fotos guardadas en el bucket "productos".';
comment on column public.productos.variantes is 'Opciones que elige el cliente (modelos de celular, ml, colores...).';
comment on column public.productos.stock     is 'true = hay stock. false = se muestra "Sin stock" y se consulta por WhatsApp.';

-- La categoría de un producto referencia el nombre de la categoría.
-- ON UPDATE CASCADE => si renombrás una categoría en el panel, los productos se
-- actualizan solos. ON DELETE RESTRICT => no se puede borrar una categoría con
-- productos dentro (el panel avisa antes).
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'productos_categoria_fkey'
    ) then
        alter table public.productos
            add constraint productos_categoria_fkey
            foreign key (categoria) references public.categorias (nombre)
            on update cascade on delete restrict;
    end if;
end $$;

-- ----------------------------------------------------------------------------
--  2. Índices
-- ----------------------------------------------------------------------------

create index if not exists productos_activo_idx    on public.productos (activo);
create index if not exists productos_categoria_idx on public.productos (categoria);
create index if not exists productos_fecha_idx     on public.productos (fecha_creacion desc);
create index if not exists categorias_orden_idx    on public.categorias (orden, nombre);

-- ----------------------------------------------------------------------------
--  3. Quién es administrador
--     IMPORTANTE: no alcanza con "estar logueado". Supabase trae el registro
--     por email activado de fábrica, así que cualquiera podría crearse una
--     cuenta con la clave pública y, si las políticas sólo pidieran sesión,
--     editar el catálogo. Por eso hay una lista explícita: sólo los usuarios
--     que estén en esta tabla pueden escribir.
-- ----------------------------------------------------------------------------

create table if not exists public.admins (
    user_id        uuid primary key references auth.users (id) on delete cascade,
    email          text,
    fecha_creacion timestamptz not null default now()
);

comment on table public.admins is 'Usuarios habilitados para administrar el catálogo.';

alter table public.admins enable row level security;
-- Nadie lee esta tabla desde el navegador: se consulta sólo a través de
-- es_admin(), que corre con los permisos del dueño (security definer).
-- Sin políticas de SELECT, ni el admin logueado puede listar a los demás.

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (select 1 from public.admins where user_id = auth.uid());
$$;

comment on function public.es_admin() is 'true si el usuario de la sesión actual está habilitado como admin.';

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;

-- ----------------------------------------------------------------------------
--  4. Permisos de tabla
--     Las políticas RLS deciden QUÉ FILAS puede tocar cada rol, pero primero el
--     rol necesita permiso sobre la tabla. Supabase suele darlos solo, pero los
--     dejamos explícitos para que el script funcione siempre.
-- ----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

-- El público sólo lee (y RLS le deja ver únicamente los productos activos).
grant select on public.productos  to anon;
grant select on public.categorias to anon;

-- El admin logueado lee y escribe.
grant select, insert, update, delete on public.productos  to authenticated;
grant select, insert, update, delete on public.categorias to authenticated;

-- ----------------------------------------------------------------------------
--  5. Row Level Security
--     · Público (anon): sólo LEE productos activos y todas las categorías.
--     · Admin logueado (authenticated): lee todo y puede crear/editar/borrar.
-- ----------------------------------------------------------------------------

alter table public.productos  enable row level security;
alter table public.categorias enable row level security;

-- productos --------------------------------------------------------------
-- Vale para el público y también para una sesión abierta: si el dueño deja el
-- panel logueado y entra a su propia tienda, la ve igual que un cliente.
drop policy if exists productos_select_publico on public.productos;
create policy productos_select_publico on public.productos
    for select to anon, authenticated
    using (activo = true);

drop policy if exists productos_select_admin on public.productos;
create policy productos_select_admin on public.productos
    for select to authenticated
    using (public.es_admin());

drop policy if exists productos_insert_admin on public.productos;
create policy productos_insert_admin on public.productos
    for insert to authenticated
    with check (public.es_admin());

drop policy if exists productos_update_admin on public.productos;
create policy productos_update_admin on public.productos
    for update to authenticated
    using (public.es_admin()) with check (public.es_admin());

drop policy if exists productos_delete_admin on public.productos;
create policy productos_delete_admin on public.productos
    for delete to authenticated
    using (public.es_admin());

-- categorias -------------------------------------------------------------
drop policy if exists categorias_select_publico on public.categorias;
create policy categorias_select_publico on public.categorias
    for select to anon, authenticated
    using (true);

drop policy if exists categorias_insert_admin on public.categorias;
create policy categorias_insert_admin on public.categorias
    for insert to authenticated
    with check (public.es_admin());

drop policy if exists categorias_update_admin on public.categorias;
create policy categorias_update_admin on public.categorias
    for update to authenticated
    using (public.es_admin());

drop policy if exists categorias_delete_admin on public.categorias;
create policy categorias_delete_admin on public.categorias
    for delete to authenticated
    using (public.es_admin());

-- ----------------------------------------------------------------------------
--  6. Storage: bucket público "productos" para las fotos
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'productos',
    'productos',
    true,
    10485760, -- 10 MB por foto
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
set public             = true,
    file_size_limit    = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

-- Cualquiera puede ver las fotos; sólo el admin logueado las sube/borra.
drop policy if exists productos_storage_select on storage.objects;
create policy productos_storage_select on storage.objects
    for select to anon, authenticated
    using (bucket_id = 'productos');

drop policy if exists productos_storage_insert on storage.objects;
create policy productos_storage_insert on storage.objects
    for insert to authenticated
    with check (bucket_id = 'productos' and public.es_admin());

drop policy if exists productos_storage_update on storage.objects;
create policy productos_storage_update on storage.objects
    for update to authenticated
    using (bucket_id = 'productos' and public.es_admin())
    with check (bucket_id = 'productos' and public.es_admin());

drop policy if exists productos_storage_delete on storage.objects;
create policy productos_storage_delete on storage.objects
    for delete to authenticated
    using (bucket_id = 'productos' and public.es_admin());

-- ----------------------------------------------------------------------------
--  7. Datos de ejemplo: 4 categorías y 12 productos (3 por categoría)
--     Las fotos se cargan después desde el panel; por eso imagenes = '{}'
--     y el sitio muestra un placeholder prolijo mientras tanto.
--     Los productos se cargan sólo si la tabla está vacía.
-- ----------------------------------------------------------------------------

insert into public.categorias (nombre, orden) values
    ('Fundas de celular', 1),
    ('Perfumes',          2),
    ('Auriculares',       3),
    ('Importados',        4)
on conflict (nombre) do update set orden = excluded.orden;

-- Los 12 productos de ejemplo se cargan SÓLO si la tabla está vacía, así podés
-- volver a ejecutar este script sobre una tienda ya cargada sin duplicar nada.
do $seed$
begin
if exists (select 1 from public.productos) then
    raise notice 'La tabla productos ya tiene datos: no se cargan los ejemplos.';
else

    insert into public.productos
        (nombre, categoria, precio, precio_anterior, descripcion, variantes, stock, etiqueta, destacado)
    values
        -- Fundas de celular -------------------------------------------------
        ('Funda silicona premium', 'Fundas de celular', 12500, null,
         'Funda de silicona con interior de microfibra. Tacto suave, no resbala y protege los bordes de la pantalla. Disponible para los modelos más pedidos.',
         array['iPhone 15', 'iPhone 14', 'iPhone 13', 'Samsung A54', 'Samsung S23', 'Motorola G84'],
         true, 'Más vendido', true),

        ('Funda transparente antigolpes', 'Fundas de celular', 9800, 13900,
         'Funda rígida transparente con marco reforzado y esquinas con aire. No se pone amarilla y deja ver el color original del celular.',
         array['iPhone 15', 'iPhone 14', 'Samsung A34', 'Samsung A54', 'Xiaomi Redmi Note 13'],
         true, 'Oferta', true),

        ('Funda libro con tarjetero', 'Fundas de celular', 15900, null,
         'Funda tipo libro en eco cuero, con dos espacios para tarjetas y soporte para ver videos. Cierre magnético.',
         array['iPhone 14', 'iPhone 13', 'Samsung A54', 'Motorola G54'],
         true, null, false),

        -- Perfumes ----------------------------------------------------------
        ('Perfume importado árabe', 'Perfumes', 34900, null,
         'Fragancia intensa de larga duración, familia oriental amaderada. Ideal para la noche. Producto importado, presentación original con caja.',
         array['50 ml', '100 ml'],
         true, 'Importado', true),

        ('Eau de parfum floral', 'Perfumes', 28900, 35900,
         'Perfume femenino con notas de jazmín, vainilla y pera. Fijación de 6 a 8 horas. Muy elegido para regalo.',
         array['30 ml', '50 ml', '100 ml'],
         true, 'Oferta', false),

        ('Set de body splash x3', 'Perfumes', 18500, null,
         'Combo de tres body splash de 250 ml con aromas frutales. Rinde muchísimo y se puede usar todos los días.',
         array['Frutal', 'Cítrico', 'Dulce', 'Combo surtido'],
         true, 'Nuevo', false),

        -- Auriculares -------------------------------------------------------
        ('Auriculares inalámbricos TWS', 'Auriculares', 26900, null,
         'Bluetooth 5.3, estuche con carga y hasta 20 horas de uso.Controles táctiles, micrófono para llamadas y conexión automática al abrir el estuche.',
         array['Negro', 'Blanco'],
         true, 'Más vendido', true),

        ('Auriculares gamer con micrófono', 'Auriculares', 32500, 41900,
         'Vincha acolchada, sonido envolvente y micrófono flexible con cancelación de ruido. Conexión por cable, compatible con PC, PS y celular.',
         array['Negro/Rojo', 'Negro/Azul'],
         true, 'Oferta', false),

        ('Auriculares in-ear con cable', 'Auriculares', 7900, null,
         'Clásicos in-ear con manos libres y control de volumen. Conector 3.5 mm. La opción práctica y económica.',
         array['Negro', 'Blanco'],
         false, null, false),

        -- Importados --------------------------------------------------------
        ('Parlante bluetooth portátil', 'Importados', 39900, null,
         'Parlante compacto resistente a salpicaduras, 10 W reales, luces LED y hasta 8 horas de batería. Entra en la mochila.',
         array['Negro', 'Azul', 'Rojo'],
         true, 'Importado', true),

        ('Smartwatch deportivo', 'Importados', 45900, 58900,
         'Pantalla a color, notificaciones del celular, medición de pasos, ritmo cardíaco y sueño. Incluye dos mallas de regalo.',
         array['Negro', 'Rosa', 'Plata'],
         true, 'Oferta', true),

        ('Cargador rápido 20W + cable', 'Importados', 14500, null,
         'Cargador con carga rápida y protección contra sobrecarga, más cable reforzado de 1 metro. Elegí el tipo de cable que necesitás.',
         array['Cable Tipo C', 'Cable Lightning', 'Cable Micro USB'],
         true, 'Nuevo', false);

end if;
end $seed$;

-- ============================================================================
--  8. HABILITAR AL ADMINISTRADOR  ← EL PASO QUE NO TE PODÉS SALTEAR
-- ----------------------------------------------------------------------------
--  Sin esto nadie puede cargar productos: el panel deja entrar pero no guarda.
--
--  1. Primero creá el usuario en Supabase:
--       Authentication -> Users -> Add user -> Create new user
--       (poné el email y la contraseña, y tildá "Auto Confirm User")
--
--  2. Después cambiá el email de acá abajo por el de ese usuario y ejecutá
--     estas líneas (podés correrlas solas, sin volver a pasar todo el script):
-- ============================================================================

insert into public.admins (user_id, email)
select id, email from auth.users
where email = 'CAMBIAR@POR-EL-EMAIL-DEL-ADMIN.com'
on conflict (user_id) do nothing;

-- Verificá que quedó habilitado (tiene que devolver una fila):
--   select email from public.admins;
--
-- Para quitarle el acceso a alguien más adelante:
--   delete from public.admins where email = 'el-email@ejemplo.com';

-- ============================================================================
--  Y cerrá el registro público: Supabase lo trae ABIERTO de fábrica.
--    Authentication -> Sign In / Providers -> Email -> "Allow new users to
--    sign up": desactivalo.
--  La lista de admins ya te protege igual, pero con las dos cosas nadie puede
--  ni crearse una cuenta en tu proyecto.
-- ============================================================================

-- ============================================================================
--  Listo. Verificá con:
--    select nombre, categoria, precio, activo from public.productos order by categoria;
--    select email from public.admins;
-- ============================================================================
