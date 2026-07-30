-- Lithium — schema inicial
-- Cartera de créditos de Candela. Ver CLAUDE.md secciones 2, 3 y 4.
--
-- Decisiones clave que este archivo implementa:
--   * La CUOTA es la unidad de cobro. Un préstamo de pago único = 1 cuota.
--     Todo (Por pagar, alertas, semáforo) opera sobre `cuotas`, nunca sobre `creditos`.
--   * `creditos.estado` y `clientes.semaforo_auto` son DERIVADOS y los mantiene un trigger.
--     La app nunca los escribe a mano — marca la cuota como pagada y el resto se acomoda solo.
--   * La lógica del semáforo vive en SQL, no en TypeScript, porque la usan dos consumidores:
--     la app y el cron de n8n. Una sola implementación.

-- ---------------------------------------------------------------------------
-- "Hoy" en hora de Argentina — NO usar current_date en ningún lado
-- ---------------------------------------------------------------------------
-- Postgres en Supabase corre en UTC. A las 21:00 de Argentina, `current_date`
-- ya devuelve MAÑANA. Con eso, una cuota que vence mañana se marca vencida esta
-- noche, se le manda el WhatsApp a Candela y se le pone el semáforo en rojo a
-- alguien que está al día. Todo el schema compara contra esta función.

create or replace function hoy_ba() returns date
language sql stable
as $$
  select (now() at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table clientes (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  telefono           text,
  -- 'nuevo' NO es un color: es la ausencia de historial. Mostrarle un color a
  -- alguien de quien no sabés nada es mentir, y es la mentira más cara de la app.
  semaforo_auto      text not null default 'nuevo'
                       check (semaforo_auto in ('verde','naranja','rojo','nuevo')),
  -- el override manual no puede ser 'nuevo': Candela nunca declara a alguien sin historial
  semaforo_manual    text check (semaforo_manual in ('verde','naranja','rojo')),
  -- color que ve Candela: el manual pisa al automático
  semaforo_efectivo  text generated always as (coalesce(semaforo_manual, semaforo_auto)) stored,
  notas              text,
  created_at         timestamptz not null default now()
);

create table creditos (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references clientes(id) on delete cascade,
  monto            numeric(14,2) not null check (monto > 0),        -- capital prestado
  con_interes      boolean not null default false,
  tasa             numeric(6,2),                                   -- % resultante, solo para mostrar
  monto_total      numeric(14,2) not null check (monto_total > 0),  -- total a cobrar = suma de cuotas
  -- Sin tope superior a propósito: cada cobro parcial agrega una cuota, y un
  -- `between 1 and 60` haría fallar el registro de un pago legítimo.
  cantidad_cuotas  int not null default 1 check (cantidad_cuotas >= 1),
  fecha_otorgado   date not null default hoy_ba(),
  -- DERIVADO por trigger desde cuotas. No escribir a mano.
  estado           text not null default 'pendiente'
                     check (estado in ('pendiente','pagado','vencido')),
  created_at       timestamptz not null default now(),

  constraint total_cubre_capital check (monto_total >= monto),
  constraint tasa_solo_si_con_interes check (con_interes or tasa is null)
);

create table cuotas (
  id            uuid primary key default gen_random_uuid(),
  credito_id    uuid not null references creditos(id) on delete cascade,
  numero        int not null check (numero > 0),
  monto         numeric(14,2) not null check (monto > 0),
  fecha_cobro   date not null,                                     -- vencimiento de ESTA cuota
  estado        text not null default 'pendiente'
                  check (estado in ('pendiente','pagado','vencido')),
  pagado_el     date,                                              -- null = impaga
  monto_pagado  numeric(14,2),
  parcial       boolean not null default false,                    -- se cerró cobrando de menos
  created_at    timestamptz not null default now(),

  unique (credito_id, numero),
  -- si hay fecha de pago hay monto pagado, y viceversa
  constraint pago_completo check ((pagado_el is null) = (monto_pagado is null)),
  -- Una cuota NUNCA queda cobrada por menos de su monto. Si Candela cobra de menos,
  -- registrar_pago() achica esta cuota y abre una nueva por el resto. Sin esta
  -- constraint, cobrar $30.000 de una cuota de $45.000 marca la cuota pagada,
  -- pone el semáforo en verde y hace desaparecer $15.000 sin que nada los reclame.
  constraint nunca_cobrada_de_menos check (monto_pagado is null or monto_pagado = monto)
);

create table alertas (
  id           uuid primary key default gen_random_uuid(),
  cuota_id     uuid not null references cuotas(id) on delete cascade,
  tipo         text not null check (tipo in ('por_vencer','vencido')),
  fecha_envio  date not null default hoy_ba(),
  created_at   timestamptz not null default now(),

  -- idempotencia: un mismo aviso, para una misma cuota, una vez por día
  unique (cuota_id, tipo, fecha_envio)
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

create index idx_creditos_cliente on creditos(cliente_id);
create index idx_cuotas_credito   on cuotas(credito_id);
create index idx_alertas_cuota    on alertas(cuota_id);

-- El camino caliente: lo consultan tanto "Por pagar" como el cron diario.
create index idx_cuotas_impagas on cuotas(fecha_cobro) where pagado_el is null;

-- ---------------------------------------------------------------------------
-- Semáforo crediticio (CLAUDE.md §3)
-- ---------------------------------------------------------------------------
-- Se evalúa sobre CUOTAS. Usa `pagado_el is null and fecha_cobro < today` en vez de
-- `estado = 'vencido'` a propósito: así el semáforo es correcto incluso si el cron
-- todavía no corrió hoy.

create or replace function recalcular_semaforo(p_cliente_id uuid)
returns text
language plpgsql
as $$
declare
  v_tiene_vencida  boolean;
  v_pago_tarde     boolean;
  v_pago_parcial   boolean;
  v_cuotas_pagadas int;
  v_nuevo          text;
begin
  -- ¿tiene HOY alguna cuota vencida e impaga?
  select exists (
    select 1 from cuotas c
      join creditos cr on cr.id = c.credito_id
     where cr.cliente_id = p_cliente_id
       and c.pagado_el is null
       and c.fecha_cobro < hoy_ba()
  ) into v_tiene_vencida;

  -- ¿alguna vez pagó una cuota tarde?
  select exists (
    select 1 from cuotas c
      join creditos cr on cr.id = c.credito_id
     where cr.cliente_id = p_cliente_id
       and c.pagado_el is not null
       and c.pagado_el > c.fecha_cobro
  ) into v_pago_tarde;

  -- ¿alguna vez te pagó de menos y hubo que refinanciar el resto?
  select exists (
    select 1 from cuotas c
      join creditos cr on cr.id = c.credito_id
     where cr.cliente_id = p_cliente_id
       and c.parcial
  ) into v_pago_parcial;

  -- ¿cuántas cuotas te pagó alguna vez? (0 = todavía no sabés nada de esta persona)
  select count(*) into v_cuotas_pagadas
    from cuotas c
    join creditos cr on cr.id = c.credito_id
   where cr.cliente_id = p_cliente_id
     and c.pagado_el is not null;

  -- Cada estado es UN hecho distinto. 'nuevo' y 'naranja' eran lo mismo antes y
  -- son decisiones opuestas: al nuevo no lo conocés, al de naranja lo conocés
  -- y sabés que paga tarde.
  if v_tiene_vencida then
    v_nuevo := 'rojo';      -- Mal pagador: tiene plata tuya vencida hoy
  elsif v_pago_tarde or v_pago_parcial then
    v_nuevo := 'naranja';   -- Ojo: te paga, pero tarde o de a poco
  elsif v_cuotas_pagadas = 0 then
    v_nuevo := 'nuevo';     -- Nuevo: todavía no te pagó nada. Sin color.
  else
    v_nuevo := 'verde';     -- Confiable: te pagó, y siempre a tiempo
  end if;

  update clientes set semaforo_auto = v_nuevo where id = p_cliente_id;
  return v_nuevo;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: mantener creditos.estado y el semáforo en sync desde cuotas
-- ---------------------------------------------------------------------------
-- La app solo marca la cuota como pagada (pagado_el, monto_pagado). Este trigger
-- recalcula el estado del crédito padre y el semáforo del cliente. Sin drift posible.

create or replace function sync_desde_cuotas()
returns trigger
language plpgsql
as $$
declare
  v_credito_id uuid;
  v_cliente_id uuid;
  v_estado     text;
  v_cantidad   int;
begin
  v_credito_id := coalesce(new.credito_id, old.credito_id);

  select cliente_id into v_cliente_id from creditos where id = v_credito_id;
  if v_cliente_id is null then
    return null;   -- el crédito se está borrando en cascada
  end if;

  select case
           when count(*) = 0                                                              then 'pendiente'
           when count(*) filter (where pagado_el is null) = 0                             then 'pagado'
           when count(*) filter (where pagado_el is null
                                   and fecha_cobro < hoy_ba()) > 0                    then 'vencido'
           else 'pendiente'
         end
    into v_estado
    from cuotas
   where credito_id = v_credito_id;

  -- cantidad_cuotas es "cuántos cobros hay", no "cuántos planeaste": un cobro
  -- parcial agrega una cuota y la UI tiene que decir 5 de 7, no 5 de 6.
  select count(*) into v_cantidad from cuotas where credito_id = v_credito_id;

  update creditos
     set estado          = v_estado,
         cantidad_cuotas = greatest(v_cantidad, 1)
   where id = v_credito_id;

  perform recalcular_semaforo(v_cliente_id);
  return null;
end;
$$;

create trigger trg_sync_desde_cuotas
after insert or update or delete on cuotas
for each row execute function sync_desde_cuotas();

-- ---------------------------------------------------------------------------
-- Registrar un pago — ÚNICA forma de cobrar. La app nunca hace UPDATE a mano.
-- ---------------------------------------------------------------------------
-- Cobrar de menos NO deja una cuota a medio pagar: cierra ésta por lo que entró
-- y abre una nueva por el resto, con fecha obligatoria. `monto_total` no cambia,
-- así que Σ cuotas === monto_total sigue valiendo y no desaparece un peso.
-- Devuelve el id de la cuota nueva, o null si se cobró completa.

create or replace function registrar_pago(
  p_cuota_id    uuid,
  p_monto       numeric,
  p_pagado_el   date default null,   -- default hoy; editable porque de esto depende el semáforo
  p_fecha_resto date default null    -- obligatoria si se cobra de menos
) returns uuid
language plpgsql
as $$
declare
  v_cuota   cuotas%rowtype;
  v_resto   numeric;
  v_max_num int;
  v_nueva   uuid;
begin
  select * into v_cuota from cuotas where id = p_cuota_id for update;

  if not found then
    raise exception 'Esa cuota no existe';
  end if;
  if v_cuota.pagado_el is not null then
    raise exception 'Esa cuota ya está cobrada';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto tiene que ser mayor a cero';
  end if;
  -- Cobrar de MÁS no se resuelve acá: si te pagó dos cuotas juntas, se cobran
  -- las dos por separado (el sheet las lista con checkbox — §9.13).
  if p_monto > v_cuota.monto then
    raise exception 'No se puede cobrar más que la cuota. Si te pagó dos cuotas, cobralas por separado.';
  end if;

  v_resto := v_cuota.monto - p_monto;

  if v_resto > 0 and p_fecha_resto is null then
    raise exception 'Te quedan % pesos sin fecha. Decí para cuándo los cobrás.', v_resto;
  end if;

  update cuotas
     set monto        = p_monto,
         monto_pagado = p_monto,
         pagado_el    = coalesce(p_pagado_el, hoy_ba()),
         estado       = 'pagado',
         parcial      = (v_resto > 0)
   where id = p_cuota_id;

  if v_resto > 0 then
    select coalesce(max(numero), 0) into v_max_num
      from cuotas where credito_id = v_cuota.credito_id;

    insert into cuotas (credito_id, numero, monto, fecha_cobro)
    values (v_cuota.credito_id, v_max_num + 1, v_resto, p_fecha_resto)
    returning id into v_nueva;
  end if;

  return v_nueva;   -- el trigger ya recalculó estado, cantidad_cuotas y semáforo
end;
$$;

-- ---------------------------------------------------------------------------
-- Marcar vencidas — lo corre el cron diario antes de mandar los WhatsApp (§4)
-- ---------------------------------------------------------------------------

create or replace function marcar_vencidas()
returns int
language plpgsql
as $$
declare v_afectadas int;
begin
  update cuotas
     set estado = 'vencido'
   where pagado_el is null
     and fecha_cobro < hoy_ba()
     and estado <> 'vencido';

  get diagnostics v_afectadas = row_count;
  return v_afectadas;   -- el trigger ya recalculó créditos y semáforos
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS — una sola usuaria (Candela). Nada accesible sin login.
-- ---------------------------------------------------------------------------

alter table clientes enable row level security;
alter table creditos enable row level security;
alter table cuotas   enable row level security;
alter table alertas  enable row level security;

create policy "acceso total autenticado" on clientes
  for all to authenticated using (true) with check (true);
create policy "acceso total autenticado" on creditos
  for all to authenticated using (true) with check (true);
create policy "acceso total autenticado" on cuotas
  for all to authenticated using (true) with check (true);
create policy "acceso total autenticado" on alertas
  for all to authenticated using (true) with check (true);
