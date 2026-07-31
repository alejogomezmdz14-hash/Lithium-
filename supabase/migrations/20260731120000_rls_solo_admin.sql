-- Lithium — cerrar el acceso a la sola usuaria autorizada.
--
-- QUÉ PROBLEMA ARREGLA
-- Las policies decían `for all to authenticated using (true)`: cualquier usuario
-- logueado leía y escribía TODO. Hoy no se nota porque el registro público está
-- desactivado, pero eso es una casilla del panel de Supabase que no vive en el
-- código y que nadie va a volver a mirar. Si alguien la prende, cualquiera que
-- se registre lee todos los DNI y recibos de sueldo de la cartera.
--
-- POR QUÉ `app_metadata` Y NO `user_metadata`
-- `user_metadata` lo puede editar el propio usuario con su sesión: anclar
-- permisos ahí es lo mismo que no anclarlos. `app_metadata` solo se escribe con
-- la service_role key, que nunca sale del servidor.
--
-- VERIFICADO ANTES DE ESCRIBIR ESTO: el claim llega dentro del access token.
-- Sin esa comprobación, esta migración dejaba la app inutilizable.
-- Se re-verifica con `node scripts/marcar-admin.mjs <mail>`.

create or replace function es_admin() returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'rol', '') = 'admin';
$$;

comment on function es_admin() is
  'True solo si el token trae rol=admin en app_metadata. Sellar con scripts/marcar-admin.mjs.';

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['clientes','creditos','cuotas','alertas','documentos'] loop
    execute format('drop policy if exists %I on %I', 'acceso total autenticado', t);
    execute format('drop policy if exists %I on %I', 'solo admin', t);
    execute format(
      'create policy %I on %I for all to authenticated using (es_admin()) with check (es_admin())',
      'solo admin', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
-- Se re-afirma que el bucket es privado en cada migración: si alguien lo pasa a
-- público desde el panel, la próxima corrida lo vuelve a cerrar.

update storage.buckets set public = false where id = 'documentos';

drop policy if exists "documentos: leer con sesion" on storage.objects;
drop policy if exists "documentos: subir con sesion" on storage.objects;
drop policy if exists "documentos: borrar con sesion" on storage.objects;

create policy "documentos: leer solo admin"
  on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and es_admin());

create policy "documentos: subir solo admin"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and es_admin());

create policy "documentos: borrar solo admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and es_admin());
