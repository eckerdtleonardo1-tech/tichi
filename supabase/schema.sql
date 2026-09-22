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
--  3. Permisos de tabla
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
--  4. Row Level Security
--     · Público (anon): sólo LEE productos activos y todas las categorías.
--     · Admin logueado (authenticated): lee todo y puede crear/editar/borrar.
-- ----------------------------------------------------------------------------

alter table public.productos  enable row level security;
alter table public.categorias enable row level security;

-- productos --------------------------------------------------------------
-- Vale para el público y también para una sesión abierta: si el vendedor deja
-- el panel logueado y entra a su tienda, la ve igual que un comprador.
drop policy if exists productos_select_publico on public.productos;
create policy productos_select_publico on public.productos
    for select to anon, authenticated
    using (activo = true);

drop policy if exists productos_select_admin on public.productos;
create policy productos_select_admin on public.productos
    for select to authenticated
    using (true);

drop policy if exists productos_insert_admin on public.productos;
create policy productos_insert_admin on public.productos
    for insert to authenticated
    with check (true);

drop policy if exists productos_update_admin on public.productos;
create policy productos_update_admin on public.productos
    for update to authenticated
    using (true) with check (true);

drop policy if exists productos_delete_admin on public.productos;
create policy productos_delete_admin on public.productos
    for delete to authenticated
    using (true);

-- categorias -------------------------------------------------------------
drop policy if exists categorias_select_publico on public.categorias;
create policy categorias_select_publico on public.categorias
    for select to anon, authenticated
    using (true);

drop policy if exists categorias_insert_admin on public.categorias;
create policy categorias_insert_admin on public.categorias
    for insert to authenticated
    with check (true);

drop policy if exists categorias_update_admin on public.categorias;
create policy categorias_update_admin on public.categorias
    for update to authenticated
    using (true) with check (true);

drop policy if exists categorias_delete_admin on public.categorias;
create policy categorias_delete_admin on public.categorias
    for delete to authenticated
    using (true);

-- ----------------------------------------------------------------------------
--  5. Storage: bucket público "productos" para las fotos
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
    with check (bucket_id = 'productos');

drop policy if exists productos_storage_update on storage.objects;
create policy productos_storage_update on storage.objects
    for update to authenticated
    using (bucket_id = 'productos') with check (bucket_id = 'productos');

drop policy if exists productos_storage_delete on storage.objects;
create policy productos_storage_delete on storage.objects
    for delete to authenticated
    using (bucket_id = 'productos');

-- ----------------------------------------------------------------------------
--  6. Datos de ejemplo: 4 categorías y 5 productos
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

-- Los productos de ejemplo se cargan SÓLO si la tabla está vacía, así podés
-- volver a ejecutar este script sobre una tienda ya cargada sin duplicar nada.
do $seed$
begin
if exists (select 1 from public.productos) then
    raise notice 'La tabla productos ya tiene datos: no se cargan los ejemplos.';
else

    insert into public.productos
        (nombre, categoria, precio, precio_anterior, descripcion, variantes, stock, etiqueta, destacado)
    values
        ('Funda silicona premium', 'Fundas de celular', 12500, null,
         'Funda de silicona con interior de microfibra. Tacto suave, no resbala y protege los bordes de la pantalla. Colores disponibles: azul, azul oscuro y rosa.',
         array['iPhone 12 / 12 Pro', 'iPhone 13 Pro', 'iPhone 15', 'iPhone 15 Pro Max', 'iPhone 16'],
         true, 'Más vendido', true),

        ('Auriculares inalámbricos', 'Auriculares', 26900, null,
         'Estuche con carga y hasta 20 horas de uso. Se conectan solos al abrir el estuche, tienen micrófono para llamadas y controles táctiles.',
         array['Blanco'],
         true, 'Más vendido', true),

        ('Lattafa Yara', 'Perfumes', 39900, null,
         'Eau de parfum femenino, dulce y floral, de mucha duración. Presentación blanca y dorada, con su caja original.',
         array['100 ml'],
         true, 'Importado', true),

        ('Odyssey Mandarin Sky Elixir', 'Perfumes', 34900, null,
         'Eau de parfum en edición limitada. Arranca cítrico y se asienta en notas dulces y amaderadas, con mucha duración.',
         array['100 ml'],
         true, 'Importado', false),

        ('Eclaire', 'Perfumes', 28900, 35900,
         'Perfume femenino dulce, con vainilla, caramelo y un fondo floral suave. Fijación de 6 a 8 horas.',
         array['100 ml'],
         true, 'Oferta', false);

end if;
end $seed$;

-- ============================================================================
--  7. DESPUÉS DE CORRER ESTO: CERRAR EL REGISTRO PÚBLICO
-- ----------------------------------------------------------------------------
--  Esto no se hace con SQL, son dos clics en el panel de Supabase, y es el
--  único paso que protege el catálogo. No te lo saltees.
--
--    Authentication -> Sign In / Providers -> Email
--    -> "Allow new users to sign up": DESACTIVAR
--
--  Por qué: la clave anon viaja en el navegador, es pública a propósito. Con el
--  registro abierto, cualquiera podría crearse una cuenta con esa clave y
--  quedar habilitado para editar el catálogo. Con el registro cerrado, los
--  únicos usuarios que existen son los que creás vos desde Authentication.
--
--  El panel te avisa con un cartel rojo si detecta que quedó abierto.
--
--  Y creá el usuario del vendedor en:
--    Authentication -> Users -> Add user -> Create new user
--    (email + contraseña, con "Auto Confirm User" activado)
-- ============================================================================

-- ============================================================================
--  Listo. Verificá con:
--    select nombre, categoria, precio, activo from public.productos order by categoria;
-- ============================================================================
