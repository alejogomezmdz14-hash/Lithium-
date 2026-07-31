/**
 * Carga datos de prueba realistas para ver "Por pagar" con contenido.
 *
 *   node scripts/seed.mjs           — carga
 *   node scripts/seed.mjs --limpiar — borra solo los de prueba y sale
 *
 * Los semáforos NO se setean a mano: se generan pagando cuotas a tiempo, tarde
 * o dejándolas vencer, que es como se generan de verdad. Así el seed también
 * verifica que el trigger hace lo suyo.
 *
 * Borra únicamente los clientes de esta lista, nunca la tabla entera.
 */
import { readFileSync } from "node:fs";

const env = {};
for (const l of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const t = l.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i !== -1) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) { console.error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local"); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function api(metodo, path, body) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method: metodo,
    headers: { ...H, Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const txt = await r.text();
  const json = txt ? JSON.parse(txt) : null;
  if (!r.ok) throw new Error(`${metodo} ${path} -> ${r.status}: ${txt.slice(0, 300)}`);
  return json;
}
const rpc = (fn, args) => api("POST", `rpc/${fn}`, args);

// "Hoy" en hora de Argentina, igual que hoy_ba() en la base.
const hoyBA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

function dia(offset) {
  const d = new Date(`${hoyBA}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

const NOMBRES = [
  "Marta Suárez", "Jorge Peralta", "Juan Pérez",
  "Sofía Ramírez", "Roberto Díaz", "Lucía Fernández",
];

async function limpiar() {
  const lista = NOMBRES.map((n) => `"${n}"`).join(",");
  await api("DELETE", `clientes?nombre=in.(${lista})`);
  console.log("Datos de prueba borrados.");
}

if (process.argv.includes("--limpiar")) {
  await limpiar();
  process.exit(0);
}

await limpiar();
console.log(`Cargando datos de prueba (hoy en Argentina: ${hoyBA})\n`);

async function crearCliente(nombre, telefono, notas = null) {
  const [c] = await api("POST", "clientes", { nombre, telefono, notas });
  return c;
}

async function crearPrestamo(clienteId, { capital, total, cuotas, primeraFecha, cadaDias = 30 }) {
  const [cr] = await api("POST", "creditos", {
    cliente_id: clienteId,
    monto: capital,
    con_interes: total > capital,
    tasa: total > capital ? Math.round(((total / capital - 1) * 100)) : null,
    monto_total: total,
    cantidad_cuotas: cuotas,
    fecha_otorgado: primeraFecha,
  });

  // Mismo reparto que repartirMonto() del front: a los mil, el resto a la última.
  let base = Math.round(total / cuotas / 1000) * 1000;
  let ultima = total - base * (cuotas - 1);
  if (base <= 0 || ultima <= 0) { base = Math.floor(total / cuotas); ultima = total - base * (cuotas - 1); }

  const filas = [];
  const desde = new Date(`${primeraFecha}T12:00:00Z`);
  for (let i = 0; i < cuotas; i++) {
    const f = new Date(desde);
    f.setUTCDate(f.getUTCDate() + i * cadaDias);
    filas.push({
      credito_id: cr.id,
      numero: i + 1,
      monto: i === cuotas - 1 ? ultima : base,
      fecha_cobro: f.toISOString().slice(0, 10),
    });
  }
  return { credito: cr, cuotas: await api("POST", "cuotas", filas) };
}

// --- 1. Marta: dos cuotas vencidas y una nota que cambia como cobrarle -------
const marta = await crearCliente(
  "Marta Suárez", "+5492611111111",
  "Paga los días 3 — no atiende, mandale mensaje",
);
// Cuotas SEMANALES: cubre el caso clave de dos cuotas de la misma persona en el
// mismo grupo (tienen que ir en UNA fila) y además la misma persona apareciendo
// en dos grupos distintos.
const pMarta = await crearPrestamo(marta.id, {
  capital: 300000, total: 390000, cuotas: 6, primeraFecha: dia(-35), cadaDias: 7,
});
await rpc("registrar_pago", { p_cuota_id: pMarta.cuotas[0].id, p_monto: Number(pMarta.cuotas[0].monto), p_pagado_el: pMarta.cuotas[0].fecha_cobro });
await rpc("registrar_pago", { p_cuota_id: pMarta.cuotas[1].id, p_monto: Number(pMarta.cuotas[1].monto), p_pagado_el: dia(-24) }); // tarde
await rpc("registrar_pago", { p_cuota_id: pMarta.cuotas[2].id, p_monto: Number(pMarta.cuotas[2].monto), p_pagado_el: pMarta.cuotas[2].fecha_cobro });
console.log("  Marta Suárez     — 2 cuotas vencidas (14 y 7 dias) + 1 que vence hoy");

// --- 2. Jorge: una cuota recien vencida -------------------------------------
const jorge = await crearCliente("Jorge Peralta", "+5492622222222");
await crearPrestamo(jorge.id, { capital: 120000, total: 120000, cuotas: 1, primeraFecha: dia(-3) });
console.log("  Jorge Peralta    — 1 cuota vencida hace 3 dias, sin interes");

// --- 3. Juan: vence HOY, y ya termino de pagar otro prestamo a tiempo -------
const juan = await crearCliente("Juan Pérez", "+5492633333333");
const viejo = await crearPrestamo(juan.id, { capital: 50000, total: 60000, cuotas: 2, primeraFecha: dia(-120) });
for (const c of viejo.cuotas) {
  await rpc("registrar_pago", { p_cuota_id: c.id, p_monto: Number(c.monto), p_pagado_el: c.fecha_cobro });
}
await crearPrestamo(juan.id, { capital: 12000, total: 12000, cuotas: 1, primeraFecha: dia(0) });
console.log("  Juan Pérez       — vence HOY, pago unico. Historial limpio -> Confiable");

// --- 4. Sofia: vence esta semana, con un antecedente de pago tarde ----------
const sofia = await crearCliente("Sofía Ramírez", "+5492644444444");
// primeraFecha calculada para que la cuota 5 caiga dentro de los próximos 7 días.
const pSofia = await crearPrestamo(sofia.id, { capital: 400000, total: 520000, cuotas: 6, primeraFecha: dia(-117) });
await rpc("registrar_pago", { p_cuota_id: pSofia.cuotas[0].id, p_monto: Number(pSofia.cuotas[0].monto), p_pagado_el: pSofia.cuotas[0].fecha_cobro });
await rpc("registrar_pago", { p_cuota_id: pSofia.cuotas[1].id, p_monto: Number(pSofia.cuotas[1].monto), p_pagado_el: dia(-81) }); // tarde
await rpc("registrar_pago", { p_cuota_id: pSofia.cuotas[2].id, p_monto: Number(pSofia.cuotas[2].monto), p_pagado_el: pSofia.cuotas[2].fecha_cobro });
await rpc("registrar_pago", { p_cuota_id: pSofia.cuotas[3].id, p_monto: Number(pSofia.cuotas[3].monto), p_pagado_el: pSofia.cuotas[3].fecha_cobro });
console.log("  Sofía Ramírez    — cuota 5/6 en 3 dias. Pago una tarde -> Ojo");

// --- 5. Roberto: mora instalada --------------------------------------------
const roberto = await crearCliente("Roberto Díaz", "+5492655555555", "Se mudó, no contesta");
await crearPrestamo(roberto.id, { capital: 80000, total: 104000, cuotas: 1, primeraFecha: dia(-47) });
console.log("  Roberto Díaz     — 47 dias de atraso -> Mora vieja");

// --- 6. Lucia: clienta nueva, todavia no pago nada --------------------------
const lucia = await crearCliente("Lucía Fernández", "+5492666666666");
await crearPrestamo(lucia.id, { capital: 200000, total: 240000, cuotas: 4, primeraFecha: dia(5) });
console.log("  Lucía Fernández  — primera cuota en 5 dias -> Nuevo");

// --- Resumen ----------------------------------------------------------------
const clientes = await api(
  "GET",
  `clientes?select=nombre,semaforo_auto,semaforo_efectivo&order=nombre`,
);
console.log("\nSemáforos resultantes (los calculó el trigger, no el seed):");
for (const c of clientes) console.log(`  ${c.nombre.padEnd(18)} ${c.semaforo_efectivo}`);

const impagas = await api("GET", "cuotas?select=id&pagado_el=is.null");
console.log(`\nCuotas impagas en total: ${impagas.length}`);
