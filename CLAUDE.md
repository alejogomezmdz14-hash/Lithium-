# Contexto del Proyecto — Lithium Credit Company (Gestión de Créditos)

> Cliente: financiera chica de **Candela**. Objetivo: gestionar la cartera de créditos, con **semáforo crediticio** por cliente y **alertas de cobro por WhatsApp**.

## 0. Resumen
App para que Candela: (1) sepa **a quién le puede volver a prestar** (semáforo crediticio por cliente), (2) **no se le pase ningún cobro** (vista "por pagar" + alertas WhatsApp 2 días antes), (3) vea su cartera clara (con/sin interés, deuda por persona).

## 1. Alcance
- **Registro de clientes** con **semáforo crediticio** de cuatro estados — Confiable · Ojo · Mal pagador · Nuevo (¿le presto de nuevo?). **Híbrido:** auto por historial + ajuste manual de Candela.
- **Cartera de créditos:** con y sin interés, monto, fecha, fecha de cobro, estado.
- **Vista "por pagar"** (IMPORTANTE): próximos cobros (quién / cuánto / cuándo).
- **Alertas por WhatsApp a Candela** (Evolution API, número ya conectado): 2 días antes del vencimiento y cuando vence.
- **Dashboard:** prestado (con/sin interés), deuda total y por persona, próximos cobros.
- **Multi-usuario:** admin (Candela). Cobradores = fase posterior si hace falta.

**NO incluye ahora:** scoring complejo, contabilidad/AFIP, app móvil nativa.

## 2. Modelo de datos (Supabase / Postgres)
```sql
clientes (
  id uuid pk, nombre text, telefono text null,
  semaforo_auto text check (semaforo_auto in ('verde','naranja','rojo','nuevo')) default 'nuevo',
  semaforo_manual text null check (semaforo_manual in ('verde','naranja','rojo')),  -- 'nuevo' no se pone a mano
  -- color efectivo = coalesce(semaforo_manual, semaforo_auto)  (columna generada)
  notas text null, created_at timestamptz )

creditos (
  id uuid pk, cliente_id uuid fk clientes,
  monto numeric,               -- capital prestado
  con_interes boolean,
  tasa numeric null,           -- % resultante, solo para mostrar
  monto_total numeric,         -- total a cobrar (capital + interés) = suma de sus cuotas
  cantidad_cuotas int not null default 1,   -- lo mantiene el trigger = count(cuotas)
  fecha_otorgado date,
  estado text check (estado in ('pendiente','pagado','vencido')) default 'pendiente',
    -- DERIVADO de sus cuotas: 'pagado' si todas pagadas; 'vencido' si alguna vencida; si no 'pendiente'
  created_at )

cuotas (  -- la unidad de cobro real. Un crédito de pago único = 1 cuota.
  id uuid pk, credito_id uuid fk creditos on delete cascade,
  numero int not null,
  monto numeric not null,
  fecha_cobro date not null,        -- vencimiento de ESTA cuota
  estado text check (estado in ('pendiente','pagado','vencido')) default 'pendiente',
  pagado_el date null,              -- cuándo se cobró (null = impaga)
  monto_pagado numeric null,
  parcial boolean default false,    -- se cerró cobrando de menos → señal naranja
  created_at,
  unique (credito_id, numero),
  check (monto_pagado is null or monto_pagado = monto) )   -- nunca cobrada de menos

alertas (  -- log para idempotencia (no repetir el mismo aviso el mismo día)
  id uuid pk, cuota_id uuid fk cuotas on delete cascade,   -- por CUOTA, no por crédito
  tipo text check (tipo in ('por_vencer','vencido')),
  fecha_envio date, created_at,
  unique (cuota_id, tipo, fecha_envio) )
```

**DECIDIDO — todo se cobra por cuotas, incluso el pago único.** Un préstamo que se paga de una sola vez se guarda como un crédito con `cantidad_cuotas = 1`. Así hay **un solo camino de código** para "Por pagar", para el cron de alertas y para el semáforo: siempre operan sobre `cuotas`, nunca sobre `creditos`.

**DECIDIDO — el interés se carga de las dos maneras, y `monto_total` es la fuente de verdad.** Un solo par de inputs vinculados, no dos modos separados:

- Candela escribe el **total a cobrar** → la app muestra el **% implícito**.
- Candela escribe un **%** sobre el capital → la app calcula el **total**.

Editar cualquiera de los dos actualiza el otro **en vivo**. Ambos caminos persisten `monto_total` (canónico) y `tasa` (el % resultante, guardado solo para mostrarlo después). Las cuotas se generan con `repartirMonto()` (§9.1).

**DECIDIDO — cobrar de menos está permitido, y genera una cuota nueva.** *"Te doy 20 ahora y el resto el viernes"* pasa todo el tiempo; si la app no lo acepta, Candela lo anota en el cuaderno — y si vuelve al cuaderno una vez, ya volvió al cuaderno. Pero un campo de monto editable sin más hace **desaparecer plata**: cobra $30.000 de una cuota de $45.000, la cuota queda pagada, el semáforo se pone verde y nada reclama los $15.000.

Se resuelve con **una sola función, `registrar_pago(cuota_id, monto, pagado_el, fecha_resto)`** — la app nunca hace `UPDATE` a la cuota a mano. Si el monto es menor al de la cuota:

1. La cuota se cierra **por lo que entró** (`monto = monto_pagado = lo cobrado`) y queda marcada `parcial = true`.
2. Se inserta **una cuota nueva** por el resto, con `numero` siguiendo la secuencia y **fecha obligatoria**, que el sheet pide en el momento: *"Quedan $15.000 de esta cuota. ¿Para cuándo?"*.
3. **`monto_total` no cambia.** `Σ cuotas === monto_total` sigue valiendo, exacto.
4. El cobro parcial **es señal naranja** por sí solo (§3).

La constraint `check (monto_pagado is null or monto_pagado = monto)` hace el error **imposible a nivel base**, no solo improbable a nivel app. Y `cantidad_cuotas` lo mantiene el trigger como `count(cuotas)`: pasa a significar *"cuántos cobros hay"*, no *"cuántos planeaste"*, así la UI dice `5 de 7` y no `5 de 6`.

**Descartado:** tabla `pagos` separada. El pago vive como columnas en la propia cuota — no hay dos pagos para una misma cuota, porque el segundo pago *es* otra cuota.

**`hoy_ba()` — nunca `current_date`.** Postgres en Supabase corre en UTC: a las 21:00 de Argentina `current_date` ya devuelve mañana, y con eso una cuota que vence mañana se marca vencida esta noche, se manda el WhatsApp y se pone en rojo a alguien que está al día. Todo el schema compara contra `hoy_ba()`. En el cliente, el equivalente es `hoyEnBA()` (§9.12).

## 3. Lógica del semáforo crediticio (híbrido)
**Color efectivo = `semaforo_manual` si Candela lo puso; si no, `semaforo_auto`.**

**Son CUATRO estados, no tres.** Se evalúan sobre **cuotas**, y cada uno enuncia **un hecho distinto** (recalcular al registrar un pago y en el cron diario). En orden de precedencia:

| Estado | Significa | Condición |
|---|---|---|
| `rojo` — **Mal pagador** | Tiene plata tuya vencida HOY | alguna cuota con `pagado_el is null and fecha_cobro < hoy_ba()` |
| `naranja` — **Ojo** | Te paga, pero tarde o de a poco | alguna cuota con `pagado_el > fecha_cobro`, **o** alguna con `parcial = true` |
| `nuevo` — **Nuevo** | Todavía no te pagó nada | `count(cuotas pagadas) = 0` |
| `verde` — **Confiable** | Te pagó, y siempre a tiempo | el resto |

**Por qué `nuevo` es un estado y no un color:** antes naranja mezclaba *"pagó tarde"* con *"cliente nuevo"*. Para Candela son **decisiones opuestas** — al nuevo no lo conoce, al de naranja lo conoce y sabe que se atrasa. Mostrarle un color a alguien de quien no hay historial es mentirle, y una mentira acá es el bug más caro de la app: la primera vez que el semáforo no coincida con lo que ella sabe, deja de creerle para siempre. `semaforo_manual` **no** acepta `nuevo`.

Ojo con el caso que las cuotas hacen aparecer: un cliente puede estar **al día y en mora a la vez** en el mismo crédito (pagó las cuotas 1 y 2, la 3 está vencida). Manda la cuota vencida → rojo.

Candela puede **subir o bajar** el color a mano (`semaforo_manual`) — ella conoce a la gente.

**Esta lógica vive en SQL, no en TypeScript.** Está implementada como `recalcular_semaforo(cliente_id)` en la migración, porque la usan dos consumidores: la app y el cron de n8n. **No reimplementarla en el código de la app** — si hay que cambiarla, se cambia la función.

Del mismo modo, `creditos.estado`, `creditos.cantidad_cuotas` y `clientes.semaforo_auto` son **derivados y los mantiene el trigger `trg_sync_desde_cuotas`**. La app solo llama `registrar_pago()`; el resto se acomoda solo. Nunca escribirlos a mano.

## 4. Flujo de alertas (cron diario, ej. 9:00 — n8n)
El cron opera sobre **cuotas**, no sobre créditos. Llama primero a `marcar_vencidas()`.

1. **Por vencer:** cuotas `pendiente` con `fecha_cobro = hoy + 2 días` → si no hay `alerta('por_vencer', hoy)` → **WhatsApp a Candela** + insertar alerta.
2. **Vencidas:** cuotas `pendiente` con `fecha_cobro < hoy` → marcar `cuotas.estado = 'vencido'`, **recalcular `creditos.estado`** del crédito padre, **recalcular semáforo** del cliente → si no hay `alerta('vencido', hoy)` → **WhatsApp a Candela** + insertar alerta.
3. Idempotencia garantizada por la constraint `unique(cuota_id, tipo, fecha_envio)`.
4. **Un aviso por cuota, no por crédito.** Si dos cuotas de créditos distintos del mismo cliente caen el mismo día, se agrupan en **un solo mensaje** — Candela no quiere tres WhatsApps seguidos por la misma persona.

## 5. Copy de los mensajes (WhatsApp → Candela, vía Evolution API)
- **Por vencer (2 días):**
  `🔔 Lithium — En 2 días vence la cuota {n}/{total} de *{cliente}*: ${monto} el {fecha_cobro}. (Cliente: Ojo 🟠)`
- **Vencido:**
  `⚠️ Lithium — VENCIÓ la cuota {n}/{total} de *{cliente}*: ${monto}, vencía el {fecha_cobro}. Conviene seguirlo de cerca.`
- **Si `cantidad_cuotas = 1`, omitir el "cuota {n}/{total}"** — decir simplemente "vence el cobro de". Nadie dice "cuota 1 de 1".
- Regla: siempre **quién / cuánto / cuándo** de un vistazo. Nada de "tenés un cobro pendiente" genérico.
- El semáforo va con **color + palabra** también acá (`Confiable 🟢`, `Ojo 🟠`, `Mal pagador 🔴`, `Nuevo ⚪`), con **las mismas palabras que la UI** (§9.0.1) — que el canal cambie no puede cambiar el vocabulario. En WhatsApp el emoji sí es vocabulario nativo; la prohibición de emoji de §9.7 aplica solo a la interfaz.

## 6. Stack e infraestructura

| Capa | Qué | Estado |
|---|---|---|
| Código | **GitHub** — `alejogomezmdz14-hash/Lithium-` | conectado, `main` pusheado |
| Deploy | **Vercel** | CLI 54.4.1 instalado y **logueado** (`alejogomezmdz14-hash`) |
| Base de datos | **Supabase** — `tfmywihnocwsszaawpbb` | proyecto creado · migración escrita, **sin aplicar** |
| Auth | **Supabase Auth** — una sola usuaria (Candela, admin) | pendiente |
| Framework | **Next.js 16.2** App Router + React 19.2 + Tailwind 4.3 + shadcn | scaffold hecho |
| Cron de alertas | **n8n** | MCP conectado |
| WhatsApp | **Evolution API** (número de Candela, ya conectado) | — |

**Herramientas en la máquina:** node 22.20 · npm 10.9 · pnpm 10.33 · git 2.54 · vercel 54.4.1. **Faltan:** `gh` (GitHub CLI) y el CLI de `supabase`.

**Regla de entornos:** las claves van por `vercel env` y se bajan con `vercel env pull`. Nunca un `.env` commiteado, nunca la `service_role` key en el bundle del cliente — solo `NEXT_PUBLIC_SUPABASE_URL` y la `anon` key llegan al browser; el resto vive server-side.

- `.env.local` — valores reales, **gitignoreado** (`.env*`). `.env.example` — la plantilla sin valores, sí commiteada (excepción `!.env.example`).
- `src/lib/env.ts` valida al importar y **tira error si falta una key**, en vez de dejar que reviente después como un 401 confuso. Consecuencia: **Vercel necesita las env vars cargadas antes del primer deploy**, o el build falla. Es a propósito.
- Los clientes de Supabase viven en `src/lib/supabase/`: `client.ts` (browser) y `server.ts` (RSC / actions / route handlers, con `cookies()` async de Next 15+).

### 6.1 Comandos

Gestor de paquetes: **pnpm** (hay `pnpm-workspace.yaml`, no usar npm).

| Comando | Qué hace |
|---|---|
| `pnpm dev` | servidor de desarrollo |
| `pnpm build` | build de producción |
| `pnpm start` | servir el build |
| `pnpm lint` | eslint |
| `pnpm test` | corre todos los tests una vez (Vitest) |
| `pnpm test:watch` | Vitest en watch |
| `pnpm vitest run src/lib/money.test.ts` | **un solo archivo** |
| `pnpm vitest run -t "el punto es separador de miles"` | **un solo test**, por nombre |
| `pnpm db:migrate` | aplica las migraciones pendientes de `supabase/migrations/` |
| `pnpm db:migrate:dry` | lista qué se aplicaría, sin tocar la base |
| `pnpm db:verify` | 40 chequeos funcionales contra la base real (crea y borra datos de prueba) |

**Migraciones:** las corre `scripts/migrate.mjs` contra `SUPABASE_DB_URL` (de `.env.local`). Cada archivo va **dentro de una transacción** — si falla, no queda la base a medio migrar — y se registra en la tabla `_migraciones` para no reaplicarlo. Usar la conexión **directa o el session pooler**; el transaction pooler (puerto 6543) no maneja bien este DDL.

**Qué está testeado y por qué:** `src/lib/money.ts` y `src/lib/fecha.ts` son las dos únicas piezas donde un bug cuesta plata de verdad. Los dos casos que no se pueden romper nunca:

- `parseARS("86.666") === 86666` — ochenta y seis mil, no 86 con 666.
- `hoyEnBA()` devuelve `2026-07-30` cuando en UTC ya es `2026-07-31` (23:00 de Argentina).
- Y el invariante de `repartirMonto()`: la suma de las cuotas es **exactamente** el total, barrido sobre cientos de combinaciones.

> **Next.js 16 no es el Next.js que conocés.** Hay breaking changes respecto de los datos de entrenamiento. **La doc completa está en `node_modules/next/dist/docs/`** — leerla ahí antes de escribir código, es la fuente de verdad de la versión exacta instalada y le gana a cualquier recuerdo.

**Cambio de Next 16 que ya nos tocó:** el archivo `middleware.ts` **está deprecado y se renombró a `proxy.ts`** (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).

- Va en `src/proxy.ts`, al mismo nivel que `app/`.
- La función se exporta como `proxy` (nombrada) o como default. `export const config = { matcher }` sigue igual.
- **Corre en runtime Node.js por defecto**, y setear `runtime` adentro **tira error**.
- Codemod si aparece código viejo: `npx @next/codemod@canary middleware-to-proxy .`

**Dos trampas del proxy + Supabase, ya resueltas en `src/proxy.ts`. No revertirlas:**

1. **`setAll(cookies, headers)` recibe un SEGUNDO argumento.** Son los anti-caché (`Cache-Control: private, no-store`, `Expires: 0`). Ignorarlos deja que un CDN —Vercel, justamente— cachee una respuesta con un `Set-Cookie` de sesión **y se la sirva a otra persona**. Lo dice el tipo de `@supabase/ssr`, no es cosmético. En `src/lib/supabase/server.ts` se ignoran a propósito porque la API `cookies()` de Next no permite setear headers; ahí no hay nada que arreglar.
2. **Al redirigir hay que arrastrar las cookies y esos headers.** `NextResponse.redirect()` devuelve una respuesta nueva y pelada: si el token se acababa de refrescar, se pierde ahí y la sesión muere en la navegación siguiente.

**`getUser()`, no `getClaims()`.** La doc de auth-js recomienda `getClaims()` para ahorrarse un round-trip por navegación, pero eso **solo funciona con signing keys asimétricas**. Este proyecto usa la key legacy HS256 (`eyJ...`), así que `getClaims()` iría a la red igual, sin beneficio. Reevaluar solo si se migra a claves asimétricas.

## 7. Reglas del proyecto
- UI en español rioplatense (voseo).
- El **semáforo es CREDITICIO** (¿le presto de nuevo?), NO el estado de cobro. El estado de cobro vive en la vista "por pagar".
- Alertas **idempotentes** (no repetir el mismo aviso el mismo día).
- Mensajes a Candela **claros y accionables**.
- La lógica derivada (semáforo, estado, cantidad de cuotas) vive en **SQL**, no en TypeScript.

## 8. Primeros pasos
1. ~~Schema~~ **APLICADO y verificado** contra la base real (`tfmywihnocwsszaawpbb`). `pnpm db:verify` corre 40 chequeos funcionales — semáforo, trigger, cobro parcial, constraints, idempotencia de alertas y RLS — creando datos de prueba y borrándolos al final. **Correrlo después de tocar la migración.** Falta el Auth (Candela admin).
2. ~~Scaffold Next.js~~ **hecho** (Next 16.2 + React 19.2 + Tailwind 4.3, `src/`, App Router, alias `@/*`).
3. ABM de clientes y préstamos + registro de pagos. **Los pagos van siempre por `registrar_pago()`** — nunca un `UPDATE` a `cuotas` desde la app.
4. ~~Cálculo del semáforo (auto)~~ **hecho en SQL** (`recalcular_semaforo` + `trg_sync_desde_cuotas`). Falta el override manual en la UI.
5. Vista "por pagar" + dashboard.
6. Cron de alertas (n8n) → Evolution API. El cron llama `marcar_vencidas()` primero. Probar con un crédito de prueba.

## 9. Diseño y branding

**Referencia visual:** app de Brubank (dark mode, un solo acento saturado sobre canvas casi negro). Es **referencia de estructura y de gusto** — el aire, la jerarquía, las cards con gaps — no una ley, y **no la paleta**: el acento de Lithium sale del logo (§9.0.2). Se imita el lenguaje visual abstracto, nunca sus logos, wordmark ni assets de marca.

**El acento de Lithium es el azul de la marca.** Se descartó el violeta `#7C3AED` del referente: con un logo azul, un violeta de interacción daba dos acentos peleando, prohibido por §9.2 y §9.7. Además el violeta tenía 3.5:1 sobre el canvas — inservible para texto, obligaba a un segundo token aclarado solo para links. El cian de marca tiene **9.4:1** y sirve para todo.

### 9.0 Regla que manda sobre todas las demás: INTUITIVA

> **Lo intuitivo le gana a lo lindo, siempre.** Ante cualquier duda entre coherencia estética y que Candela entienda al toque, gana que entienda. Si una regla de esta sección pelea con eso, la regla se rompe.

Tests concretos, no aspiraciones:

- **Candela nunca aprende un código.** Si un color, un icono o un badge necesita leyenda o explicación, está mal diseñado.
- Toda acción frecuente vive a **≤2 taps del home**. Registrar un pago es la más frecuente de todas.
- Las palabras de la UI son **las que usa ella**, no las del schema. Nunca `con_interes`, `estado: pendiente`, `semaforo_auto`.
- **Nada escondido detrás de un icono sin label.**
- Los defaults vienen bien cargados: el sheet de cobro precarga el monto y la fecha de hoy.
- Confirmación **solo** en lo irreversible (borrar). Todo lo demás con **deshacer**.
- Si una pantalla necesita que se la expliquen, se rediseña la pantalla.

**Navegación — decidido, no reabrir.** Tres tabs en barra inferior sticky, en este orden: **`Resumen` · `Por pagar` · `Clientes`**. La app se vive **por módulos**: cada tab responde una pregunta distinta y ninguna pantalla mezcla las tres.

| Ruta | Módulo | La pregunta que responde |
|---|---|---|
| `/` | **Resumen** | ¿Cómo viene el mes? Cuánto puse en la calle, cuánto me deben, cuánto está vencido |
| `/por-pagar` | **Por pagar** | ¿A quién tengo que correr hoy? |
| `/clientes` | **Clientes** | ¿A quién le puedo prestar de nuevo? |

**Pantallas de tarea única** (fuera del shell, sin barra de navegación): `/login` · `/cobrar/[id]` · `/nuevo-cliente` · `/nuevo-prestamo`.

**La fila de círculos de acción va en el Resumen** (§9.4), y no pesan igual: `Nueva deuda` ocupa el ancho completo y va sola arriba; abajo, en 2 columnas, `Ya me pagó` y `Cliente nuevo`. Son **acciones, nunca destinos** — para navegar están los tabs.

**Clientes va en SECCIONES por semáforo**, peor primero, cada una con su cuenta y una bajada que explica el grupo (`Mal pagador · 3 — Te deben plata vencida`). Agrupar en vez de listar plano es lo que hace que la pregunta se conteste de un barrido: el header ya da la respuesta y la fila solo dice quién. **Dentro de la sección el chip va solo como punto**, sin repetir la palabra que ya está en el header — salvo que el color lo haya puesto ella a mano, que sí es información nueva.

**El home es `Resumen`, no `Por pagar`** — corregido el 2026-07-31 a pedido del cliente. La versión anterior de esta sección ponía la lista de cobros como home; en la práctica se leía como una lista tirada sin contexto. El Resumen abre con los números del mes y **abajo la deuda pendiente por persona**, con link a la lista completa.

`/login` y `/cobrar/[id]` viven **afuera** del shell: son pantallas de tarea única y la navegación ahí solo distrae mientras se registra plata.

Los círculos de acción **solo contienen acciones, nunca destinos**, y no pesan igual: `Ya me pagó` ocupa el doble de ancho y va solo en su fila; abajo, más chicos, `Nuevo préstamo` y `Nuevo cliente`. "Por pagar" no es una acción — es la pantalla donde ya estás. `Ya me pagó` desde el home no abre una cadena de dropdowns: abre la lista buscable de cuotas impagas, con la misma fila y la misma acción que "Por pagar". Un componente, un camino de código. Nunca hay una tercera capa de navegación.

### 9.0.1 Vocabulario cerrado (se decide ANTES que los colores)

Las palabras son lo único que Candela lee de verdad. Esta lista es **normativa**: si una palabra no está acá, no va a la UI.

| Concepto | La palabra de la app | Prohibido |
|---|---|---|
| `creditos` (la fila) | **préstamo** | crédito, operación, cartera |
| crear un `credito` | **Nueva deuda** (botón) · **Crear el préstamo** (confirmar) | Nuevo crédito, Alta de operación |
| `cuotas` con `cantidad_cuotas > 1` | **cuota** | vencimiento, plan de pagos |
| `cuotas` con `cantidad_cuotas = 1` | **el pago** / **un solo pago** | "cuota 1 de 1" |
| registrar un pago | **Ya me pagó** (botón) · **Listo, la cobré** (confirmar) | Cobrar, Registrar pago, Guardar |
| deuda viva | **Me deben** | saldo, deuda viva, outstanding |
| capital | **Puse en la calle** | capital, principal |
| `monto_total` | **Tengo que cobrar** | total con interés |
| `estado = vencido` | **12 días de atraso** | vencido el, overdue |
| `estado = pagado` | **cobrada el 12/7** | pagada, saldada |
| `estado = pendiente` | **vence el viernes 12/8** | pendiente, open |
| semáforo | **Confiable · Ojo · Mal pagador · Nuevo** | No prestar, score, riesgo |
| `notas` | **Observaciones** | — |
| `clientes.tipo` | **Tipo de cliente** | "¿De qué vive?" y cualquier otra pregunta coloquial |

**El registro depende del contexto — corregido el 2026-07-31 a pedido del cliente:**

| Dónde | Registro | Ejemplo |
|---|---|---|
| **Acciones y avisos** | voseo directo | `Cobrá`, `Ya me pagó`, `Estás al día` |
| **Etiquetas de formulario y datos** | **neutro y profesional** | `Nombre y apellido`, `Tipo de cliente`, `Observaciones`, `Garante` |

La primera versión preguntaba `¿De qué vive?` y `¿Cómo se llama?`. Sonaba a interrogatorio y quedaba **demasiado informal para un formulario donde se cargan datos de un tercero**. Los botones y los avisos siguen en voseo; **los campos de un formulario se nombran, no se preguntan.**

- **Sentence case** en botones y títulos: `Nuevo préstamo`, nunca `Nuevo Préstamo`.
- **Voseo imperativo** consistente en las acciones: `Cobrá`, `Registrá`, `Elegí`. Nunca mezclar `Cobra`/`Cobrar` en la misma pantalla.
- La plata siempre va con dirección y en segunda persona: **`Te tiene que pagar $X`**, nunca `Debe $X`. En Lithium la plata siempre viaja hacia Candela; "debe" y "le debe" son ambiguos, y esa ambigüedad se paga con una llamada mal hecha.

### 9.0.2 Marca

El logo es **isotipo (un átomo) + wordmark "LITHIUM" + bajada "CREDIT COMPANY"**. Colores de marca, leídos del logo:

| Rol | Valor aprox. | Dónde aparece en el logo |
|---|---|---|
| Azul profundo | `#0F3D91` – `#1B4DA0` | órbitas exteriores, wordmark LITHIUM |
| Azul medio | `#1D63D2` | trazo intermedio de las órbitas |
| Cian de marca | `#35C4D4` | núcleo, órbita clara, el glow |
| Gris de bajada | `#B8B8B8` | "CREDIT COMPANY" |

**Isotipo vs lockup — no son intercambiables.** El lockup completo va **solo** en el login y en el splash. En cualquier lugar chico —favicon, ícono de app instalada, header— va **el átomo solo**: "CREDIT COMPANY" a 32px es una mancha gris ilegible.

**El glow del logo NO se reproduce en la UI.** El archivo de marca lo tiene horneado porque es una presentación; §9.7 prohíbe glows y gradientes en la interfaz.

**El asset que hay hoy no sirve para producción:** render de presentación en raster, con glow horneado y fondo gris texturizado, sin transparencia. Hace falta, en `public/`: `logo-isotipo.svg` (el átomo solo, transparente, sin glow) · `logo-lockup.svg` · `icon.png` 512×512 · `favicon.ico`. Si no aparece el SVG original, se rehace el isotipo a mano: son tres elipses y cuatro círculos.

### 9.1 Tokens

Tailwind v4 + shadcn (`new-york`, `--base radix`, dark permanente: `<html className="dark">`). Todo en `@theme inline` de `globals.css`. Nunca hex sueltos en componentes — siempre tokens.

| Token | Valor | Uso |
|---|---|---|
| `background` | `#0A0A0C` | canvas. **Tintado, no gris neutro** — el ramp perfectamente neutro es firma de theme generado |
| `card` | `#1C1C20` | nivel 1: filas, tiles |
| `surface-raised` | `#26262B` | nivel 2: hover, la fila levantada, el sheet |
| `border` | `#2E2E35` | 1px. **Solo contenedores que agrupan y sheets** — nunca alrededor de una fila |
| `foreground` | `#FAFAFA` | texto principal, **todos los montos** y **todas las fechas** (19:1) |
| `muted-foreground` | `#A3A3A3` | metadata legible: labels, estados (7.8:1) |
| `muted-subtle` | `#6E6E6E` | adorno real: separadores `·`, placeholders |
| `primary` | `#1D63D2` | azul de marca: **rellenos** de botón, texto blanco encima (5.3:1) |
| `primary-text` | `#35C4D4` | cian de marca: links, texto chico, tab activo, glyphs (**9.4:1**) |
| `primary-tint` | `#0F2440` | fondo de círculos de acción (cian encima da 7.4:1) |
| `ring` | `#35C4D4` | focus visible, 2px con `outline-offset: 2px` |
| `danger` | `#FCA5A5` | **el único rojo de urgencia** (10.4:1). Barra de 3px, línea de atraso |
| `destructive` | `#F87171` | borrar. Distinto de `danger` a propósito |
| `warning` | `#F59E0B` | `Ojo` y "pagó tarde". Un solo naranja |
| `success` | `#34D399` | `Confiable` y el ✓ de cuota cobrada. **Nunca en un monto** |
| `disabled-foreground` | `#5A5A5A` | controles apagados |
| `scrim` | `rgba(0,0,0,.6)` | detrás del sheet |

`card` es `#1C1C20` y no `#171717` a propósito: Candela cobra **en la calle, con sol**. Con cards separadas solo por gaps, cero sombra y sin divisores, un delta de 4% de luminancia no distingue dónde termina una fila y empieza la otra — y está por tocar un botón que registra plata. Probar afuera con el brillo al máximo, no en un monitor.

**Radius = clase de objeto, nunca uniforme** (el radius único es el tell #1 de UI generada): card/sheet `rounded-xl` (21px — pisar `--radius-xl` a mano, la cadena de `calc` de shadcn da 18px) · input `rounded-lg` (14px) · botón/chip/pill/punto `rounded-full` · skeleton `rounded-sm`. **Radio interior = radio exterior − padding.**

**Tipografía.** UI: **Instrument Sans** (`next/font`) — set latino completo, ascendentes con aire para las tildes, y no lee a plantilla. Mono: **IBM Plex Mono** — tabulares reales, diacríticos bien dibujados y **cero sin barrar** (el cero barrado en una columna de plata lee "terminal", no "dinero"). Descartado Geist Mono: se rechazó Geist Sans *porque lee a plantilla Vercel* y su mono es la misma firma.

- **El cuerpo va en 500, nunca 400** — en dark el 400 adelgaza ópticamente y se ve barato. El único 400 es el mono.
- **El mono NO va en todos los montos.** Va donde hay columnas comparables (filas de "Por pagar", plan de cuotas). El número héroe del Resumen en mono lee como un log de build: ese va en sans con `tabular-nums` y tracking cerrado. **El mono se especifica a 0.95em del sans vecino** — a igual `font-size` pesa más ancho y desbalancea la fila.
- `font-variant-numeric: tabular-nums` en **toda** cifra, incluidas fechas (`12/8`) y contadores (`3/6`). Sin esto los números bailan entre renders y la lista se ve temblorosa: es el tell más barato de arreglar y el más visible.

**Plata.** Una sola función `formatARS()` en `lib/`, nunca `toLocaleString` suelto en un componente (mismo espíritu que "nunca hex sueltos"):

- `Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })` y el `$` **se prepende a mano**, pegado a los dígitos → `$45.000`. Con `style:'currency'` el ICU devuelve el símbolo **con espacio (a veces NBSP)** y ese espacio varía entre la versión de ICU del build y la del celular: la columna alineada a la derecha queda desalineada de forma inconsistente.
- **Cero centavos en toda la app, incluido el detalle.** El mismo número en todos lados. Candela presta efectivo: si la lista dice `$45.000` y adentro `$45.000,37`, va a pensar que la app le redondea la plata.
- Parser inverso propio y testeado (`parseARS()`): strippea `$`, espacios, NBSP y puntos de mil; la coma es decimal. **`86.666` son ochenta y seis mil, no 86 con 666** — el bug más fácil de meter y el más caro.
- Inputs de plata: `type="text"` + `inputMode="numeric"`, **nunca `type="number"`** (spinners, la rueda del mouse cambia el valor, el decimal por locale rompe).

**Reparto de cuotas — se redondea a los mil.** `base = floor(total / n / 1000) * 1000`; el resto entero va a la última. $400.000 en 3 → `133.000 · 133.000 · 134.000`, números que se pueden decir en voz alta por teléfono. Si `base` cae en 0, se cae a redondeo al peso. `Σ cuotas === monto_total`, exacto, siempre. Una sola función `repartirMonto(total, n): number[]`, testeada sola.

### 9.2 La regla de color (lo más importante de esta sección)

| Concepto | Tratamiento | Por qué |
|---|---|---|
| **Plata** | `foreground`, mono, tabular. **Nunca verde, nunca roja.** | En Lithium *todo* es plata. Si la plata tiene color, el color no significa nada. |
| **Vencido** | **Barra izquierda de 3px en `danger`** + la línea de estado (`12 días de atraso`) en `danger`. El monto queda en `foreground`, sin excepción. | Ver abajo. |
| **Cobrado** | Fila al **60% de opacidad** + `✓` en `success` en el riel izquierdo + `cobrada el 12/7`. | El verde va en un checkmark, no en un monto: "la plata nunca verde" sobrevive intacta. |
| **Semáforo** | Punto de 8px + **palabra**, pegado al nombre. | Es la pregunta central: ¿le presto de nuevo? |
| **Azul / cian de marca** | Solo interacción: `primary` en rellenos de botón, `primary-text` en tab activo, links, focus ring y glyphs. **Nunca decorativo.** | Un solo acento manda, y es el de la marca. |

**Por qué el monto vencido NO va en rojo:** `#F87171` sobre el canvas da **7.2:1**; `#FAFAFA` da **19:1**. El número que ella tiene que ver primero se renderizaría **2.6× más apagado** que uno que no le importa. Y rompe la columna: los montos mono alineados a la derecha funcionan porque se comparan de un barrido, y alternar 19:1 con 7:1 los convierte en manchas. **La barra de 3px es forma, no hue** — se ve al sol y se ve con daltonismo.

**La separación de señales es por ELEMENTO, no por pantalla.** Es la única versión enforceable y no choca nunca:

| Señal | Se cuelga de | Aparece |
|---|---|---|
| **Urgencia** (`danger`) | la **fila de una cuota** | donde haya una cuota, incluido el detalle del cliente |
| **Semáforo** (confianza) | el **bloque identidad** del cliente (inicial + nombre) | donde el nombre sea identidad, incluido "Por pagar" |

No compiten porque no se cuelgan del mismo elemento. Para que tampoco compitan cromáticamente: **en "Por pagar" el semáforo va solo como palabra, sin hue, en `muted-foreground`, y solo cuando NO es Confiable** (`2 cuotas · 12 días de atraso · Ojo`). Información puesta, cero color nuevo. En la ficha del cliente el semáforo va **una sola vez, en la cabecera**; la lista de cuotas de abajo usa solo la barra de vencido.

### 9.3 Semáforo — spec

Verde/naranja/rojo es el clásico fallo de accesibilidad: ~8% de los varones tiene daltonismo rojo-verde, y bajo deuteranopia los tres colores colapsan hacia amarillos parecidos. Por eso:

> **Regla dura: el hue NUNCA va solo. Siempre color + palabra.**

| Estado (DB) | Label en UI | Color | Contraste s/ canvas |
|---|---|---|---|
| `verde` | **Confiable** | `success` `#34D399` | 10.3:1 |
| `naranja` | **Ojo** | `warning` `#F59E0B` | 9.2:1 |
| `rojo` | **Mal pagador** | `destructive` `#F87171` | 7.2:1 |
| `nuevo` | **Nuevo** | `muted-foreground`, **sin hue** | 7.8:1 |

`Mal pagador` enuncia un hecho; `No prestar` daba una **orden** sobre una decisión que Candela toma con información que la app no tiene (garante, otras condiciones). Un cartel que le dice qué hacer la hace desconfiar de la app.

**El semáforo siempre lleva su motivo abajo, en una línea, en palabras.** De 1 a 3 hechos, no más: `Ojo — pagó tarde 3 de 5 cuotas, 8 días promedio` · `Mal pagador — 2 cuotas vencidas, $120.000` · `Nuevo — todavía no te pagó nada`. Un chip de color sin motivo es decoración, y decoración acá se lee como magia hecha con IA: la primera vez que no coincida con lo que ella sabe, deja de creerle para siempre.

**Forma:** punto de 8px + palabra. **Sin píldora, sin fondo, sin borde** — el botón de cobrar también es una píldora con una palabra, y lo que se *lee* no puede tener la misma forma que lo que *registra plata*.

**Override manual:** debajo del nombre va la línea `Ojo — lo pusiste a mano`. Al tocarla: *"El cálculo dice: Mal pagador."* + **"Volver al automático"** (`semaforo_manual = null`). Descartado el borde 1px dashed: es un código que nadie le va a explicar, en 1px, en un chip chico, en un teléfono.

**Escaneabilidad de la lista de clientes: por orden, no por forma.** Se ordena `Mal pagador → Ojo → Nuevo → Confiable`. Posición, no vocabulario nuevo.

### 9.4 Vocabulario de componentes

| Patrón del referente | Dónde va en Lithium |
|---|---|
| Fila de círculos de acción (círculo `primary-tint` + icono de línea en cian + label chico) | Home: `Ya me pagó` (doble ancho, solo en su fila) · abajo `Nuevo préstamo` · `Nuevo cliente`. **Solo acciones, nunca destinos.** |
| Cards redondeadas **separadas por gaps**, cada una con su radius | Listas de clientes, cuotas y préstamos. **Nunca líneas divisorias.** |
| Card levantada a `surface-raised`, **sin borde y sin ring** | La cuota accionable dentro de un plan, y la fila más urgente. El destaque es **superficie + posición + tamaño del botón**, nunca color. |
| Grid 2-up asimétrico (tile ancha + angosta) | Resumen, **una sola vez**: `Me deben` + `Vencido` |

**Descartados del referente, con motivo** (no reproponerlos): el **wash de gradiente** del header — §9.2 dice que el acento nunca es decorativo y un wash es la definición de decorativo; además se come dos filas de gente que debe plata y "apenas perceptible" es firma de lo hecho con IA. El **ring de acento 1px como destaque** — el acento significa "tocá acá", y un borde de acento alrededor de algo que no es un botón enseña lo contrario. El **contenido que sangra** fuera de la card — se lee como que la app cargó mal.

Profundidad = **escalón de superficie**. Cero `box-shadow`, cero `backdrop-blur` salvo la barra inferior sticky (con fallback opaco obligatorio). El borde de 1px se reserva para **contenedores que agrupan y para el sheet**; una fila de lista nunca lleva borde. **Máximo un borde entre el ojo y el dato.**

### 9.5 Pantalla "Por pagar" (la más importante)

Candela la abre para responder *"¿a quién tengo que correr hoy?"*. Ya recibe el WhatsApp — la pantalla no repite el aviso, la deja **actuar**.

**Tres grupos**, con header sticky que se gana el lugar (**cuenta personas, no créditos, y trae subtotal**): **`VENCIDOS` · `HOY` · `ESTA SEMANA`**. `Más adelante` no vive acá — es un link al pie (`Ver todo lo que viene`). **Los grupos vacíos no se renderizan.**

Se descartaron los cinco grupos anteriores: `Mañana y pasado` y `Esta semana` se pisaban (si hoy es jueves, ¿el viernes en cuál cae?), y si no sabe de qué grupo sale una fila deja de confiar en la pantalla. Cinco headers sticky en un teléfono son cinco filas regaladas.

**Una fila por PERSONA, no por cuota.** Si alguien tiene dos cuotas en el mismo grupo, es una fila con las dos adentro — consistente con §4.4, que ya decidió que el WhatsApp agrupa por persona. Si no, con Marta parada adelante cobra una cuota, cierra, y se olvida de la otra.

```
VENCIDOS · 3 personas · $180.000 ─────────────────── sticky
▌                                                      ← barra 3px danger
▌  Marta Suárez                             $90.000
▌  2 cuotas · 12 días de atraso · Ojo   [ Ya me pagó ]
▌
   Paga los días 3 — no atiende, mandale mensaje       ← nota, solo si existe

   Jorge Peralta                          $120.000
   1 cuota · 3 días de atraso             [ Ya me pagó ]

   Ver los 18 vencidos ›

HOY · 2 personas · $95.000 ───────────────────────── sticky

   Juan Pérez                              $12.000
   vence hoy                              [ Ya me pagó ]
```

- **Se fue `cuota 3/6` de esta pantalla.** Marcando el teléfono de Marta, "3/6" no cambia ni lo que le dice ni cuánto le pide: es la app contando cómo guarda los datos. Lo que sirve en ese segundo es **cuánto debe en total** y **cuántas veces se atrasó**. El `3 de 6` vive en el detalle del préstamo, donde sí importa.
- **Dentro de `VENCIDOS`, orden por más reciente primero** (lo que se acaba de escapar es lo recuperable) y a igual atraso por semáforo. **Tope de 5 filas visibles** + `Ver los 18 vencidos`. Nada saca una cuota de vencido por sí solo: a los tres meses hay 18 filas de mora de marzo empujando `HOY` abajo del fold, y la pantalla se invierte sola con el tiempo. **`Mora vieja` (>14 días) es grupo aparte, colapsado por default.**
- **Fechas:** relativas dentro de ±7 días, absolutas más allá, y **siempre con día de la semana** (`el viernes 12/8`) — ella organiza por "el viernes", no por "12/8". Nunca relativa y absoluta en la misma fila.
- **La nota del cliente aparece en la fila** cuando dice algo que cambia cómo se cobra. Es el campo más valioso que va a tener.
- **Acción primaria = `Ya me pagó`** — pasado, sin ambigüedad: está anotando lo que ya pasó. "Cobrar" está en el tiempo equivocado y suena a que la app va a hacer algo (mandar un mensaje, reclamar).
- **La fila tiene un solo destino** (el detalle del préstamo) y el botón va separado, con `48px` de alto mínimo. Nunca dos acciones según dónde cae el pulgar. **Lo destructivo nunca vive al lado de `Ya me pagó`.**
- **Empty state:** *"Estás al día. El próximo cobro es el viernes 12/8 — Juan Pérez, $12.000."* Informa y da la fecha en que se corta la calma; el link a la cartera completa no sirve acá.

### 9.6 Resumen — qué mostrar y qué NO

Candela es una persona sola, no un equipo de finanzas: **pocos números, grandes, con aire**. Un solo número héroe. Nada de grilla de 4 KPIs. Un tile 2-up asimétrico arriba y abajo una lista:

1. **`Me deben`** — héroe, 34px, `foreground`, `tabular-nums`, tracking `-0.02em`. Va en el 2-up asimétrico con `Vencido`.
2. **`Vencido`** — 22px. **Se cuenta en personas** (`3 personas`), no en créditos: ella cuenta gente.
3. **`Prestaste en {mes}`** — el capital que salió a la calle **este mes**, y debajo el desglose **`Con interés` / `Sin interés`** más `Vas a ganar de interés`. **Los tres números a la vez, sin toggle**: un pill que hay que acordarse de haber tocado es un código a aprender.
4. **`Cobrás esta semana`** — es un link a `/por-pagar`.
5. **`Quién me debe`** — lista **completa** con scroll, ordenada por deuda desc. Esto es "las deudas pendientes abajo del dashboard".

**Descartado el segmented control `Con interés` / `Sin interés`:** hacía que el número más grande de la pantalla cambiara de significado según un pill que ella tiene que acordarse de haber tocado. Eso es literalmente "aprender un código", prohibido en el primer bullet de §9.0. Y `con_interes` es la columna del schema, no su palabra.

**Descartado el top 5** de "quién me debe": cortar en cinco es cortar justo donde empieza a servir — con más de cinco deudores, la persona que necesita es la novena.

**NO mostrar:** cantidad de clientes, "crecimiento", `+12% vs mes pasado`, gráficos de torta, series temporales. Si un número no cambia una decisión, afuera.

### 9.7 NO hacer — señales de "hecho con IA"

- ❌ **Gradientes de cualquier tipo. Cero.** La jerarquía del header la hacen la tipografía y el aire.
- ❌ **Emoji como iconos de UI.** Los 🟢🟠🔴 de este documento son taquigrafía nuestra — en la interfaz se renderizan como punto + palabra. (En WhatsApp sí van: §5.)
- ❌ `shadow-lg` / `drop-shadow` en cualquier lugar.
- ❌ Cards anidadas en cards anidadas en cards.
- ❌ `backdrop-blur` sin contenido real scrolleando detrás (solo la barra inferior sticky califica, con fallback opaco).
- ❌ `max-w-7xl mx-auto` con el contenido flotando en el medio. Esto es una herramienta enfocada.
- ❌ **Grids de tiles iguales.** El 2-up asimétrico existe **una** vez, arriba del Resumen; el resto de los números viven en una lista, no en tiles.
- ❌ `rounded-lg` en absolutamente todo — respetar la jerarquía de radius de 9.1.
- ❌ Inter en su tracking default. Varios acentos peleando. Copy placeholder tipo *"Gestioná tus créditos con facilidad"*.
- ❌ Estados de empty sin diseñar.
- ❌ **Que el número principal cambie de lugar o de tamaño entre pantallas.** Mismo lugar, mismo tamaño, siempre.
- ❌ **Skeletons de 40 filas.** `Por pagar`, `Clientes` y `Resumen` son RSC server-rendered: no hay primer loading. Skeleton solo en el buscador (único fetch cliente real), y ahí **isomorfo**: misma altura (76px), mismo radius, mismos anchos que la fila real, `animate-pulse` a `1.4s`.

**Señales de trabajo humano:** montos en mono alineados a la derecha · `focus-visible` cian de 2px que se ve de verdad · el punto del semáforo alineado ópticamente a la altura-x del nombre · motion solo al cambiar estado (150–200ms), nunca al cargar la página · castellano que suena a como habla Candela.

Descartada la regla anterior "una asimetría deliberada por pantalla": en manos de un agente produce rarezas arbitrarias y hace que el número grande esté en un lugar distinto en cada pantalla.

### 9.8 Referencias para robar patrones

| Producto | El mecanismo transferible |
|---|---|
| **Mercury** | La fila de lista: mono a la derecha, fila callada, estado como texto discreto y no badge |
| **Stripe** (AR aging) | Buckets temporales como **estructura** de la lista, nunca como filtro; header con cuenta + subtotal |
| **Mercado Libre** (reputación) | La **palabra** es el control y el color el refuerzo; y no se muestra reputación sin historial suficiente — de ahí el estado `Nuevo` |

### 9.9 Medidas y form factor

**Primario: 360–430px de ancho, una mano, parada, a veces con la otra ocupada con la plata.** Desktop = **el mismo layout** centrado en `max-w-2xl` con rail de navegación fijo a la izquierda, para que la columna se apoye en un borde en vez de flotar. **Cero layout alternativo.** Forms y sheets: `max-w-md`.

| Medida | Valor |
|---|---|
| Target táctil mínimo | **48px** de alto. `Ya me pagó` va más grande |
| Alto mínimo de fila | `76px` (dos líneas + padding) |
| Padding de fila | `px-4 py-3.5` · tile héroe `p-5` |
| Padding lateral de página | `px-5` · `pb-28` (reserva la barra sticky) |
| Gap entre cards del mismo grupo | `8px` · entre grupos `28px` |
| Label ↔ valor | `4px` · línea ↔ línea dentro de una fila `2px` |

Ratio ≥3× entre "junto" y "separado". Si todos los gaps caen entre 12 y 24px no hay agrupamiento visible y 12 filas parecen 12 cosas sueltas.

Iconos lucide dimensionados contra la altura de mayúscula del texto vecino, con el stroke bajando al crecer: texto 13px → `size-[14px]` `strokeWidth={1.75}` · fila/botón 15px → `size-[17px]` `1.75` · círculo de acción → `size-[21px]` `1.5`. Siempre `shrink-0` y `translate-y-[0.5px]` (los glyphs están centrados en su viewBox, el texto no en su line-box).

### 9.10 Escala tipográfica

| Rol | Clases |
|---|---|
| Monto héroe | `text-[2.125rem] font-semibold tracking-[-0.02em] leading-[1.05] tabular-nums` (sans) |
| Header de sección | `text-[1.0625rem] font-semibold tracking-[-0.01em]` |
| Nombre en fila | `text-[0.9375rem] font-semibold tracking-[-0.006em]` |
| Monto de fila | `font-mono text-[0.875rem] tracking-[-0.01em] tabular-nums` |
| Secundario de fila / fecha | `text-[0.8125rem] font-medium text-foreground` |
| Label / caption | `text-[0.8125rem] font-medium text-muted-foreground` |
| Header de grupo sticky | `text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground` |
| Botón | `text-[0.8125rem] font-semibold` |

**La fecha va en `foreground`, no en `muted-foreground`.** Acá la fecha no es un caption: es el motivo por el que abrió la app, y se lee en la calle con sol y con una mano. El gris apagado se guarda para lo que se puede no leer.

### 9.11 Buscador

La escena real: alguien golpea la puerta, le da plata, y **no está en "Por pagar"** porque paga adelantado o porque su cuota es de septiembre. Sin buscador eso se anota en el cuaderno — y si vuelve al cuaderno una vez, ya volvió al cuaderno.

- **Sticky arriba, en los tres tabs, siempre visible.** Con label, nunca una lupa sola (§9.0).
- Busca por nombre, **acento-insensible**, match por prefijo de cualquier palabra (`mar` → Marta Suárez, Ana Marín).
- Cada resultado en una línea: nombre + palabra del semáforo + **cuánto debe en total**, y el botón `Ya me pagó` si tiene alguna cuota impaga. **Tres letras y cobra.**
- Sin resultados: `No hay nadie con "mar".` + `Nuevo cliente ›`.

### 9.12 Detalle del préstamo y plan de cuotas

**Tres bloques: cabecera · las cuotas · acciones.** Una sola lista vertical en orden numérico.

```
┌──────────────────────────────────────────────────────┐
│  Sofía Ramírez  ›                                    │
│  Te deben                                            │
│  $260.000                                            │  ← 34px sans
│  de $520.000 · le prestaste $400.000 al 30%          │  ← 13px muted
│                                                      │
│  ▬▬▬▬▬  ▬▬▬▬▬  ▬▬▬▬▬  ▭▭▭▭▭  ▭▭▭▭▭  ▭▭▭▭▭           │  ← 4px alto, gap 3px
│  3 de 6 cobradas · 2 llegaron tarde · 1 con atraso   │
└──────────────────────────────────────────────────────┘

   Las 6 cuotas

    ✓  1   cobrada el 10/4                    $133.000    ← fila 60% opacidad
    ✓  2   cobrada 6 días tarde · 16/5        $133.000    ← "6 días tarde" en warning
    ✓  3   cobrada el 10/6                    $133.000

 ┌──────────────────────────────────────────────────────┐  ← surface-raised
 ▌│  Cuota 4 de 6                              $87.000  │  ← monto en foreground
 ▌│  12 días de atraso — vencía el 10/7                 │  ← línea en danger
 ▌│                              [   Ya me pagó   ]     │  ← azul lleno, 48px
 └──────────────────────────────────────────────────────┘

    ○  5   vence el lunes 10/8                 $87.000
    ○  6   vence el jueves 10/9                $87.000
```

- **La tira tiene exactamente `cantidad_cuotas` segmentos** — honesta y auto-explicativa, nunca necesita leyenda. `foreground` llena, `border` vacía. **Cero color de estado en los segmentos**: una muesca o un tercer color sería un código a aprender. **Nunca un porcentaje**: "50%" no significa nada, "3 de 6" es instantáneo.
- **Riel izquierdo de glyphs, no de colores:** `✓` cobrada · `○` futura · `▌` (barra `danger`) la vencida.
- **Una sola cuota levantada por pantalla: la impaga de menor `numero`.** Si hay tres vencidas, la levantada es la más vieja; las otras quedan calladas con su barra y **sin botón**. Una sola acción primaria.
- **Pagada tarde es texto, nunca un badge.** El color va **solo** en "6 días tarde", en `warning` — el mismo naranja de `Ojo`, porque es literalmente la causa de que esté en Ojo. No es un color nuevo: es el color de la consecuencia.
- **La cabecera nunca lleva botón.** Se cobra *una cuota*, no *un préstamo*. Que la acción viva pegada a la fila que modifica es lo que hace que no se pueda equivocar.
- **Si las cobradas son >4, colapsan** para que la cuota accionable nunca caiga bajo el fold: `⌄ Ya cobraste 7 cuotas · $606.000 · 2 llegaron tarde`.
- **Con `cantidad_cuotas = 1`:** sin tira, sin caption, sin "Las N cuotas". La card dice `Un solo pago`. Mismo código, otra cara.
- Al tocar una cuota cobrada tarde se cierra el círculo causa→efecto: `Vencía el 10/5` · `Te pagó el 16/5` · `Llegó 6 días tarde` · `Por esto Sofía está en Ojo ›` · `Deshacer el cobro`.

**Estado derivado en render, no leído de la columna.** El cron de §4 escribe `cuotas.estado = 'vencido'` a las 9:00 y las alertas dependen de eso — eso se mantiene. Pero **la UI no lee ese campo para pintar**: entre las 00:00 y las 9:00, o si el cron falla, la pantalla miente.

```ts
type EstadoCuotaUI = 'cobrada_a_tiempo' | 'cobrada_tarde' | 'con_atraso' | 'pendiente'
estadoCuotaUI(c, hoy)   // pagado_el != null ? (pagado_el > fecha_cobro ? tarde : a_tiempo)
                        //                    : (fecha_cobro < hoy ? con_atraso : pendiente)
laQueSigue(cuotas)      // min(numero) entre las impagas → la única levantada
```

**Fechas: `fecha_cobro` y `pagado_el` son `date`, sin hora.** Comparar siempre contra `hoyEnBA()` (`America/Argentina/Buenos_Aires`), **nunca `new Date()` en el server**: en Vercel el server corre en UTC y a las 21:00 de Argentina ya es mañana. Es el mismo bug que en SQL resuelve `hoy_ba()`. Un off-by-one acá pinta de rojo una cuota que vence mañana.

### 9.13 Sheet de cobro

```
┌──────────────────────────────────────────────────────┐
│  Cobrarle a Sofía Ramírez                            │  ← nombre GRANDE primero
│  Cuota 4 de 6                                        │
│                                                      │
│  ¿Cuánto te dio?                                     │
│  ┌────────────────────┐                              │
│  │ $ 87.000           │                              │  ← precargado
│  └────────────────────┘                              │
│                                                      │
│  ¿Cuándo te pagó?                                    │
│   ( Hoy )   Ayer   Otro día                          │
│                                                      │
│         [        Listo, la cobré        ]            │
└──────────────────────────────────────────────────────┘
```

- **`pagado_el` es editable, default `Hoy`.** Si registra el lunes un pago que entró el viernes, la diferencia entre "a tiempo" y "3 días tarde" depende de este campo — y de eso depende el semáforo. Un tap si fue hoy, dos si fue ayer.
- **El monto es editable y se puede cobrar de menos.** Si el número que ingresa es menor al de la cuota, el sheet **crece con un paso más antes de confirmar**: `Quedan $15.000 de esta cuota. ¿Para cuándo?` + selector de fecha **obligatorio**. Al confirmar se aplica la regla de §2 vía `registrar_pago()`. El paso extra no es fricción: es lo que impide que se pierda plata.
- Si la persona tiene **2+ cuotas impagas**, el sheet las lista con checkbox, todas marcadas por default, y el botón dice `Cobrar las 2`. Cobrar dos cuotas juntas pasa todo el tiempo y no puede requerir dos viajes. **Cobrar de más sobre una sola cuota se rechaza** — si te pagó dos, se cobran las dos.
- **Cero diálogo de confirmación.** El sheet ya es el paso de confirmación.
- Al confirmar: la fila se apaga en su lugar, la card salta a la cuota siguiente con 180ms, y toast **abajo, sobre la barra**: `Cobraste la cuota 4 de Sofía. Deshacer` durante **8 segundos** — no 4: está en la calle, mirando a alguien a los ojos.

### 9.14 Formulario de préstamo nuevo (input dual de interés)

**Una página, `max-w-md`, cinco bloques que son cinco preguntas.** Sin wizard: capital, interés y cuotas tienen que verse al mismo tiempo porque los tres números conversan. **El preview está siempre visible, nunca detrás de un botón "Previsualizar"** — un preview que hay que pedir no se pide.

```
┌──────────────────────────────────────────────────────┐
│  ¿Cuánto le prestás?                                 │
│  [ $ 400.000 ]                                       │  ← 26px mono
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│  ¿Cuánto te tiene que devolver?                      │
│   Sin interés   20%   ( 30% )   40%   50%   Otro     │  ← chips: el 90% de los casos
│                                                      │
│   Tengo que cobrar              Interés              │
│  [ $ 520.000        ]          [  30   % ]           │
│    ancho doble, mono 20px        angosto, 14px       │
│                                                      │
│  Ganás $120.000 de interés                           │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│  ¿En cuántas cuotas?                                 │
│   Un solo pago   2   3   ( 6 )   12   Otra           │
│  ¿Cuándo te paga la primera?    Cada cuánto          │
│  [ lun 10/08/2026 ]            [ Mensual ⌄ ]         │
└──────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│  Así te queda                                        │
│    1  lun 10/8                            $87.000    │
│    …                                                 │
│    6  sáb 10/1                            $85.000    │
│  6 cuotas · $520.000 en total                        │
└──────────────────────────────────────────────────────┘
```

Por qué no se puede confundir de campo:

1. **No son dos campos pares.** `Tengo que cobrar` mide el doble de ancho y va en mono de 20px; `Interés` es angosto, 14px, con el `%` fijo adentro. La jerarquía visual dice cuál es el número real (`monto_total` es la fuente de verdad) y cuál es la forma de expresarlo.
2. **El campo derivado se mueve; el que está editando nunca.** Tween de 180ms en el otro campo. **El movimiento ES la explicación** — no hace falta etiqueta "calculado", ni candado, ni flechita.
3. **La frase de abajo dice el resultado en castellano** (`Ganás $120.000 de interés`). Es el chequeo de sentido que no depende de entender qué campo es cuál.
4. **Los chips resuelven el 90% de los casos sin tipear nada.**
5. **`Un solo pago` vive en la misma escalera que 2 · 3 · 6 · 12.** Es `cantidad_cuotas = 1` dicho en el idioma de ella, no un switch aparte: un camino de código, un camino mental.

**El modo de falla se llama el eco:** A escribe en B, B escribe en A, y con redondeo en cada salto el valor muta debajo del cursor. Se previene con una sola regla: **el campo que tiene el foco nunca se reescribe**. Solo se recalcula el otro. `monto_total` es el estado; el `%` es una proyección que se recalcula al blur.

**Descartado:** editar el monto de cuotas individuales inline en el form. N inputs de plata editables en una lista, en un teléfono, con reconciliación viva, es la pantalla más fácil de romper de toda la app. `repartirMonto()` redondeado a los mil ya produce números cobrables; si una cuota puntual necesita otro monto o fecha, se arregla después desde el detalle de esa cuota, con un solo campo en foco.

## 10. Documentación por cliente

Qué papeles pide la financiera según el tipo de cliente. La matriz vive en **`src/lib/documentacion.ts`**, no en una tabla: la cambia un programador cuando el cliente lo pide, no Candela desde la app.

| Tipo | Documentación | Lleva período |
|---|---|---|
| `monotributista` | últimas **3 facturas** | sí |
| `comercio` | últimas **3 facturas** (comparte el objeto `FACTURAS` con monotributista) | sí |
| `empleado` | últimos **3 recibos de sueldo** | sí |
| `pami` | **DNI del titular** · **DNI del garante** · **pagaré firmado** | no |

**Completo ≠ al día.** Cada documento guarda su **`periodo`** (el mes al que corresponde, no cuándo se subió). Si están los 3 pero el más nuevo tiene más de `MESES_VIGENCIA` (3), la app dice *"Están todos, pero viejos"*. Un ✓ que no distingue "trajo los papeles" de "trajo los del año pasado" no sirve para decidir si prestar.

**Garante:** `clientes.garante_nombre` y `garante_telefono`, **siempre opcionales**, también para PAMI. Existen porque a un garante se le reclama, y con la foto del DNI sola no lo podés llamar — pero exigirlos frenaría el alta de alguien parada en la puerta de la casa.

**Al cambiar el tipo de un cliente, los documentos viejos NO se borran.** Quedan como `sobrantes` y la app avisa cuáles ya no aplican. Perder papeles que costó juntar por un cambio de clasificación sería un error caro.

**La documentación NO mueve el semáforo.** Son dos preguntas distintas: el semáforo dice *"¿me paga?"* y sale del historial de pagos; la documentación dice *"¿tengo los papeles?"*. Mezclarlas haría que alguien que siempre pagó puntual aparezca en rojo por una factura faltante, y eso rompe la confianza en el semáforo entero. Se muestran como señales separadas, y la de documentación aparece **justo antes de prestar**, que es cuando importa.

### 10.1 Acceso — `es_admin()`, nunca `using (true)`

Las policies de RLS de **las cinco tablas y de `storage.objects`** exigen `es_admin()`, que lee `rol=admin` de **`app_metadata`**. No se vuelve a `using (true)`: eso significaba *"cualquier usuario logueado lee todo"*, y estaba a un toggle del panel de Supabase —una casilla que no vive en el código— de que cualquiera que se registrara viera todos los DNI de la cartera.

- **`app_metadata`, jamás `user_metadata`.** El segundo lo edita el propio usuario con su sesión; anclar permisos ahí es no anclarlos.
- **Cada usuaria nueva hay que sellarla:** `node scripts/marcar-admin.mjs <mail> <pass>`. Sin el sello, la app le aparece **vacía**, no con un error — es el síntoma a reconocer.
- Si ya tenía sesión abierta, **salir y volver a entrar**: el claim entra al token al emitirlo.
- El bucket se **re-afirma privado en cada migración** (`update storage.buckets set public = false`), por si alguien lo abre desde el panel.

### 10.2 Storage — reglas que no se tocan

El bucket **`documentos` es PRIVADO**. Adentro van DNI, recibos de sueldo y pagarés firmados **de terceros** — gente que le pide plata a Candela, no ella. Verificado contra la base (`pnpm db:verify:docs`): la URL pública falla y la anon key sin sesión falla.

- **La subida NO puede pasar por una Server Action.** Verificado en la doc de Next 16: el body de una Server Action está topeado en **1 MB** por default, y una foto de celular pesa entre 3 y 12 MB. Va **comprimida en el navegador** (2000px lado mayor, JPEG q0.80) y directo a Storage con **signed upload URL**, con el path elegido por el servidor — si lo eligiera el navegador, podría escribir en la carpeta de cualquier cliente.
- **Sacarle el EXIF a la foto antes de subirla** (re-encode por canvas). Una foto de un DNI sacada en la puerta de la casa lleva las coordenadas de esa casa adentro. Es dato de un tercero que nadie pidió guardar.
- **Nada de miniaturas de documentos en listas.** Una lista con fotos de DNI es la filtración servida a cualquiera que mire la pantalla de costado. Las filas son texto; la imagen se abre a propósito.
- **Prohibido `next/image` para documentos.** El optimizador cachea las imágenes por su cuenta y ese cache no se invalida a mano, así que un documento seguiría sirviéndose después de borrarlo. Va `<img>` plano.
- **Nunca `getPublicUrl`.** Siempre `createSignedUrl` con vencimiento corto.
- En `documentos` se guarda el **`storage_path`**, jamás una URL.
- Convención de path: `{cliente_id}/{tipo}/{uuid}.{ext}`.
- Límite de 10 MB y MIME restringido a JPEG/PNG/WebP/PDF, en el propio bucket.

**Borrar un cliente NO borra sus archivos de Storage.** La base cascadea las filas de `documentos`, pero Supabase deja los objetos. **Hay que borrarlos explícitamente desde la app** — si no, quedan DNI de gente borrada ocupando lugar para siempre, que además de costar es justo lo que no debe pasar con documentos ajenos.

## 11. Este archivo es VIVO — mantenerlo actualizado

**Regla:** cuando algo de acá cambia en el código, se actualiza este archivo **en el mismo turno**, no "después". Si Claude termina una tarea que invalida o extiende algo escrito arriba, editar la sección correspondiente antes de dar la tarea por cerrada.

| Cuando pase esto | Actualizar |
|---|---|
| Cambian los scripts de `package.json` o se agrega el runner de tests | Sección **6.1** — incluido cómo correr **un solo test** |
| El schema real se desvía del SQL de arriba | Sección **2** — que refleje lo que está en Supabase, no lo que se planeó |
| Se afina la lógica del semáforo (casos borde, recálculo) | Sección **3** |
| Cambia el cron, los umbrales o los pasos de alertas | Secciones **4** y **5** |
| Surge una convención nueva (naming, dónde vive la lógica, patrón de queries) | Sección **7** |
| Se define un token, un componente o un patrón visual nuevo | Sección **9** |
| Se completa un paso del roadmap | Sección **8** — marcarlo hecho, no borrarlo |
| Se **descarta** una idea o enfoque | Anotar qué se descartó **y por qué**, para no reproponerlo en la próxima sesión |

**Cuidado al correr generadores** (`create-next-app`, `shadcn init`, `impeccable install`): generan su propio `CLAUDE.md` / `AGENTS.md` y **pisan este archivo**. Ya pasó una vez. Antes de un generador que escriba en la raíz, copiar `CLAUDE.md` a un lado y comparar el hash después.

### Skills de diseño instaladas

El proyecto tiene skills de terceros para trabajar la interfaz. **No están en git** (~6 MB de herramientas, no código de la app); `skills-lock.json` sí, y fija las versiones exactas. Para reinstalarlas en una máquina nueva:

```bash
npx skills@latest add emilkowalski/skills   # 9 skills de animación y craft
npx impeccable install                       # 1 skill con 23 comandos de diseño
```

| Skill | Para qué |
|---|---|
| `emil-design-eng` | Criterio de pulido y detalles invisibles |
| `apple-design` | Movimiento físico, gestos, materiales |
| `animate` · `review-animations` · `improve-animations` | Construir, revisar y auditar animaciones |
| `find-animation-opportunities` | Dónde falta movimiento y dónde sobra |
| `animation-vocabulary` | Cómo se llama un efecto |
| `pick-ui-library` | Qué librería usar para cada cosa |
| `prototype` | Varias versiones de una pantalla para comparar |
| `impeccable` | `/impeccable audit`, `critique`, `polish`, `distill`… |

Mantener el tono: conciso, decisiones y reglas — no tutorial ni listado de archivos que se descubre leyendo el repo.

## 🔗 Relacionado (bóveda)
- `proyectos/financiera-lithium.md` · `proyectos/financiera-lithium-propuesta.md` · `personas/candela.md`
