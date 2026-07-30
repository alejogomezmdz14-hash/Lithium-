/**
 * Verificación funcional del schema de Lithium contra la base real.
 * Usa service_role (saltea RLS). Crea datos de prueba y los borra al final.
 * NO imprime keys.
 */
import { readFileSync } from "node:fs";

const env = {};
for (const l of readFileSync("c:/Users/alejo/OneDrive/Desktop/Lithium/.env.local", "utf8").split(/\r?\n/)) {
  const t = l.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i !== -1) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error("Falta SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function req(metodo, path, body, prefer = "return=representation") {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method: metodo,
    headers: { ...H, Prefer: prefer },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const txt = await r.text();
  let json = null;
  try { json = txt ? JSON.parse(txt) : null; } catch { json = txt; }
  return { ok: r.ok, status: r.status, body: json };
}
const get = (p) => req("GET", p);
const post = (p, b) => req("POST", p, b);
const patch = (p, b) => req("PATCH", p, b);
const rpc = (fn, args) => req("POST", `rpc/${fn}`, args ?? {});

let pasaron = 0, fallaron = 0;
function check(nombre, cond, detalle = "") {
  if (cond) { console.log(`  OK    ${nombre}`); pasaron++; }
  else { console.log(`  FALLA ${nombre}${detalle ? `\n          ${detalle}` : ""}`); fallaron++; }
}

const dias = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

console.log("=== 1. Existen las tablas y las funciones ===");
for (const t of ["clientes", "creditos", "cuotas", "alertas"]) {
  const r = await get(`${t}?select=*&limit=1`);
  check(`tabla ${t}`, r.ok, `status ${r.status}: ${JSON.stringify(r.body)}`);
}
const rHoy = await rpc("hoy_ba");
check("funcion hoy_ba()", rHoy.ok, JSON.stringify(rHoy.body));
if (rHoy.ok) {
  const esperado = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  check(`hoy_ba() = ${esperado} (hora Argentina)`, rHoy.body === esperado, `devolvio ${JSON.stringify(rHoy.body)}`);
}

// --------------------------------------------------------------------------
console.log("\n=== 2. Cliente nuevo arranca en 'nuevo', no en 'naranja' ===");
const rc = await post("clientes", { nombre: "ZZ TEST Marta Suarez", telefono: "+5491100000000" });
if (!rc.ok) { console.error("No se pudo crear el cliente:", rc.status, JSON.stringify(rc.body)); process.exit(1); }
const cliente = rc.body[0];
check("semaforo_auto = 'nuevo'", cliente.semaforo_auto === "nuevo", `es '${cliente.semaforo_auto}'`);
check("semaforo_efectivo = 'nuevo'", cliente.semaforo_efectivo === "nuevo", `es '${cliente.semaforo_efectivo}'`);

const limpiar = async () => { await req("DELETE", `clientes?id=eq.${cliente.id}`); };

try {
  // ------------------------------------------------------------------------
  console.log("\n=== 3. Credito con 3 cuotas: el trigger mantiene los derivados ===");
  const rcr = await post("creditos", {
    cliente_id: cliente.id, monto: 400000, con_interes: true, tasa: 30,
    monto_total: 520000, cantidad_cuotas: 3, fecha_otorgado: dias(-60),
  });
  check("crea el credito", rcr.ok, JSON.stringify(rcr.body));
  const credito = rcr.body[0];

  const rcu = await post("cuotas", [
    { credito_id: credito.id, numero: 1, monto: 173000, fecha_cobro: dias(-40) },
    { credito_id: credito.id, numero: 2, monto: 173000, fecha_cobro: dias(-10) },
    { credito_id: credito.id, numero: 3, monto: 174000, fecha_cobro: dias(20) },
  ]);
  check("crea las 3 cuotas", rcu.ok, JSON.stringify(rcu.body));
  const cuotas = (await get(`cuotas?credito_id=eq.${credito.id}&order=numero`)).body;

  let cr = (await get(`creditos?id=eq.${credito.id}`)).body[0];
  check("cantidad_cuotas se sincronizo a 3", cr.cantidad_cuotas === 3, `es ${cr.cantidad_cuotas}`);
  check("credito.estado = 'vencido' (hay cuotas vencidas impagas)", cr.estado === "vencido", `es '${cr.estado}'`);

  let cl = (await get(`clientes?id=eq.${cliente.id}`)).body[0];
  check("semaforo -> 'rojo' con cuota vencida impaga", cl.semaforo_auto === "rojo", `es '${cl.semaforo_auto}'`);

  // ------------------------------------------------------------------------
  console.log("\n=== 4. registrar_pago(): cobro completo a tiempo ===");
  const p1 = await rpc("registrar_pago", {
    p_cuota_id: cuotas[0].id, p_monto: 173000, p_pagado_el: dias(-41),
  });
  check("cobra la cuota 1", p1.ok, JSON.stringify(p1.body));
  check("no genera cuota nueva (devuelve null)", p1.body === null, `devolvio ${JSON.stringify(p1.body)}`);

  // ------------------------------------------------------------------------
  console.log("\n=== 5. La constraint impide cobrar de menos por UPDATE directo ===");
  const mal = await patch(`cuotas?id=eq.${cuotas[2].id}`, { monto_pagado: 1000, pagado_el: dias(0) });
  check("rechaza monto_pagado < monto", !mal.ok, `status ${mal.status} — DEBERIA FALLAR`);
  if (!mal.ok) console.log(`          (${JSON.stringify(mal.body).slice(0, 120)})`);

  // ------------------------------------------------------------------------
  console.log("\n=== 6. Cobro parcial: cierra por lo cobrado y abre una cuota nueva ===");
  const antes = (await get(`creditos?id=eq.${credito.id}`)).body[0].monto_total;
  const p2 = await rpc("registrar_pago", {
    p_cuota_id: cuotas[1].id, p_monto: 100000, p_pagado_el: dias(-9), p_fecha_resto: dias(15),
  });
  check("acepta el cobro parcial", p2.ok, JSON.stringify(p2.body));
  check("devuelve el id de la cuota nueva", typeof p2.body === "string" && p2.body.length > 0, JSON.stringify(p2.body));

  const todas = (await get(`cuotas?credito_id=eq.${credito.id}&order=numero`)).body;
  const suma = todas.reduce((a, c) => a + Number(c.monto), 0);
  check("ahora hay 4 cuotas", todas.length === 4, `hay ${todas.length}`);
  check("la cuota 2 quedo en 100000", Number(todas[1].monto) === 100000, `es ${todas[1].monto}`);
  check("la cuota 2 quedo marcada parcial", todas[1].parcial === true, `parcial=${todas[1].parcial}`);
  check("la cuota nueva es por el resto (73000)", Number(todas[3].monto) === 73000, `es ${todas[3].monto}`);
  const despues = (await get(`creditos?id=eq.${credito.id}`)).body[0].monto_total;
  check("monto_total NO cambio", Number(antes) === Number(despues), `${antes} -> ${despues}`);
  check("INVARIANTE suma(cuotas) === monto_total", suma === Number(despues), `suma=${suma} total=${despues}`);

  cr = (await get(`creditos?id=eq.${credito.id}`)).body[0];
  check("cantidad_cuotas se actualizo a 4", cr.cantidad_cuotas === 4, `es ${cr.cantidad_cuotas}`);

  // ------------------------------------------------------------------------
  console.log("\n=== 7. registrar_pago() rechaza lo que tiene que rechazar ===");
  const deMas = await rpc("registrar_pago", { p_cuota_id: todas[2].id, p_monto: 999999 });
  check("rechaza cobrar de mas", !deMas.ok, `status ${deMas.status}`);
  const sinFecha = await rpc("registrar_pago", { p_cuota_id: todas[2].id, p_monto: 1000 });
  check("rechaza parcial sin fecha del resto", !sinFecha.ok, `status ${sinFecha.status}`);
  const yaCobrada = await rpc("registrar_pago", { p_cuota_id: cuotas[0].id, p_monto: 100 });
  check("rechaza cobrar una cuota ya cobrada", !yaCobrada.ok, `status ${yaCobrada.status}`);

  // ------------------------------------------------------------------------
  console.log("\n=== 8. Semaforo: transiciones ===");
  cl = (await get(`clientes?id=eq.${cliente.id}`)).body[0];
  check("sigue 'rojo' (la cuota 3 futura no, pero hay parcial y quedan impagas vencidas?)",
    ["rojo", "naranja"].includes(cl.semaforo_auto), `es '${cl.semaforo_auto}'`);
  console.log(`        (semaforo actual: ${cl.semaforo_auto})`);

  // Cobrar TODO lo que queda, a tiempo, para ver si llega a naranja por el parcial
  const impagas = (await get(`cuotas?credito_id=eq.${credito.id}&pagado_el=is.null&order=numero`)).body;
  for (const c of impagas) {
    await rpc("registrar_pago", { p_cuota_id: c.id, p_monto: Number(c.monto), p_pagado_el: c.fecha_cobro });
  }
  cl = (await get(`clientes?id=eq.${cliente.id}`)).body[0];
  check("con todo cobrado y un parcial en el historial -> 'naranja'", cl.semaforo_auto === "naranja", `es '${cl.semaforo_auto}'`);
  cr = (await get(`creditos?id=eq.${credito.id}`)).body[0];
  check("credito.estado -> 'pagado'", cr.estado === "pagado", `es '${cr.estado}'`);

  // ------------------------------------------------------------------------
  console.log("\n=== 9. Override manual pisa al automatico ===");
  const ov = await patch(`clientes?id=eq.${cliente.id}`, { semaforo_manual: "verde" });
  check("acepta el override", ov.ok, JSON.stringify(ov.body));
  cl = (await get(`clientes?id=eq.${cliente.id}`)).body[0];
  check("semaforo_efectivo = 'verde' (manual)", cl.semaforo_efectivo === "verde", `es '${cl.semaforo_efectivo}'`);
  check("semaforo_auto sigue siendo 'naranja'", cl.semaforo_auto === "naranja", `es '${cl.semaforo_auto}'`);
  const ovMal = await patch(`clientes?id=eq.${cliente.id}`, { semaforo_manual: "nuevo" });
  check("rechaza semaforo_manual = 'nuevo'", !ovMal.ok, `status ${ovMal.status} — DEBERIA FALLAR`);

  // ------------------------------------------------------------------------
  console.log("\n=== 10. Alertas: idempotencia por cuota/tipo/dia ===");
  const cid = todas[0].id;
  const a1 = await post("alertas", { cuota_id: cid, tipo: "por_vencer" });
  check("inserta la alerta", a1.ok, JSON.stringify(a1.body));
  const a2 = await post("alertas", { cuota_id: cid, tipo: "por_vencer" });
  check("rechaza la alerta duplicada del mismo dia", !a2.ok, `status ${a2.status} — DEBERIA FALLAR`);
  const a3 = await post("alertas", { cuota_id: cid, tipo: "vencido" });
  check("acepta otro tipo el mismo dia", a3.ok, JSON.stringify(a3.body));

  // ------------------------------------------------------------------------
  console.log("\n=== 11. marcar_vencidas() corre ===");
  const mv = await rpc("marcar_vencidas");
  check("marcar_vencidas() ejecuta", mv.ok, JSON.stringify(mv.body));
  console.log(`        (marco ${JSON.stringify(mv.body)} cuotas)`);

  // ------------------------------------------------------------------------
  console.log("\n=== 12. RLS activo: anon NO puede leer ===");
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const ra = await fetch(`${URL}/rest/v1/clientes?select=id&limit=1`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  const cuerpo = await ra.json();
  check("anon no ve datos (RLS)", Array.isArray(cuerpo) && cuerpo.length === 0, `status ${ra.status}: ${JSON.stringify(cuerpo).slice(0, 150)}`);
} finally {
  console.log("\n=== limpieza ===");
  await limpiar();
  const q = await get(`clientes?nombre=like.ZZ TEST*&select=id`);
  console.log(`  clientes de prueba restantes: ${Array.isArray(q.body) ? q.body.length : "?"}`);
}

console.log(`\n${"=".repeat(50)}\nPASARON: ${pasaron}   FALLARON: ${fallaron}`);
process.exit(fallaron > 0 ? 1 : 0);
