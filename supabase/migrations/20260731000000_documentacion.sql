-- Lithium — documentación por cliente. Ver CLAUDE.md §10.
--
-- Qué papeles pide cada tipo de cliente:
--   monotributista → últimas 3 facturas
--   empleado       → últimos 3 recibos de sueldo
--   comercio       → últimas 3 facturas
--   pami           → DNI del titular, DNI del garante, y un pagaré firmado
--
-- La matriz vive en el CÓDIGO (src/lib/documentacion.ts), no en una tabla: la
-- cambia un programador cuando el cliente lo pide, no Candela desde la app. Una
-- tabla de configuración que nadie edita es una tabla de más.

-- ---------------------------------------------------------------------------
-- Tipo de cliente y datos del garante
-- ---------------------------------------------------------------------------

alter table clientes
  add column tipo text
    check (tipo in ('monotributista','empleado','comercio','pami')),
  -- Opcionales SIEMPRE, también para PAMI. Un garante existe para poder
  -- reclamarle, y con la foto del DNI sola no lo podés llamar — pero exigirlos
  -- frenaría el alta de un cliente parada en la puerta de la casa.
  add column garante_nombre text,
  add column garante_telefono text;

comment on column clientes.tipo is
  'Determina qué documentación se le pide. Null = todavía sin clasificar.';

-- ---------------------------------------------------------------------------
-- Documentos
-- ---------------------------------------------------------------------------

create table documentos (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references clientes(id) on delete cascade,

  -- Qué papel es. No se valida contra el tipo del cliente a nivel base a
  -- propósito: si a alguien le cambia el tipo, los documentos viejos tienen que
  -- seguir existiendo en vez de reventar. La app avisa cuáles ya no aplican.
  tipo text not null check (tipo in (
    'factura',           -- monotributista y comercio
    'recibo_sueldo',     -- empleado
    'dni_titular',       -- pami
    'dni_garante',       -- pami
    'pagare'             -- pami
  )),

  -- A qué mes corresponde el papel, NO cuándo se subió. Sin esto no se puede
  -- distinguir "tiene las 3 facturas" de "tiene 3 facturas de hace un año".
  -- Se guarda como el día 1 del mes: el período es mensual, no una fecha exacta.
  periodo date,

  -- Ruta dentro del bucket privado. Nunca una URL: las URLs se firman al
  -- momento de mostrarlas y vencen.
  storage_path text not null unique,
  nombre_archivo text,
  tamano_bytes bigint,
  mime text,

  subido_el timestamptz not null default now(),
  notas text
);

create index idx_documentos_cliente on documentos(cliente_id);
create index idx_documentos_tipo on documentos(cliente_id, tipo);

alter table documentos enable row level security;

create policy "acceso total autenticado" on documentos
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Bucket PRIVADO
-- ---------------------------------------------------------------------------
-- Son DNI, recibos de sueldo y pagarés firmados de TERCEROS — gente que le pide
-- plata a Candela, no ella. `public = false` es lo único que separa eso de que
-- cualquiera con la URL pueda verlo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos',
  'documentos',
  false,
  10485760,  -- 10 MB: una foto de celular comprimida entra holgada
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do nothing;

-- Solo con sesión. Sin estas policies el bucket queda inaccesible incluso para
-- la app, porque storage.objects tiene RLS activo por default en Supabase.
create policy "documentos: leer con sesion"
  on storage.objects for select to authenticated
  using (bucket_id = 'documentos');

create policy "documentos: subir con sesion"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos');

create policy "documentos: borrar con sesion"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documentos');
