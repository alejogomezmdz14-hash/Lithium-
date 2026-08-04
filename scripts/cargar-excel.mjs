/**
 * Carga la cartera real de Candela, la que hoy lleva en el Excel.
 *
 *   node scripts/cargar-excel.mjs           — carga
 *   node scripts/cargar-excel.mjs --limpiar — borra solo estas personas
 *
 * Todas trabajan en clínicas, así que van como `empleado`: la app les va a
 * pedir los últimos 3 recibos de sueldo.
 *
 * Los préstamos se cargan SIN interés y de un solo pago, porque el Excel no
 * dice ni la tasa ni en cuántas cuotas. Eso se corrige desde la app, préstamo
 * por préstamo, cuando Candela lo revise.
 */
import { readFileSync } from "node:fs";

const env = {};
for (const l of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const t = l.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i !== -1) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const U = env.NEXT_PUBLIC_SUPABASE_URL;
const K = env.SUPABASE_SERVICE_ROLE_KEY;
const h = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };

async function api(metodo, path, body) {
  const r = await fetch(`${U}/rest/v1/${path}`, {
    method: metodo,
    headers: { ...h, Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`${metodo} ${path} -> ${r.status}: ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}

// Tal cual la planilla. La fecha del Excel es dd.mm.aaaa.
const CARTERA = [
  { fecha: "2026-07-06", nombre: "Raquel Andrea Ceballo",     localidad: "Orán",  trabajo: "Clínica Sagrado Corazón", monto: 300000 },
  { fecha: "2026-07-10", nombre: "Nicolás Padilla",            localidad: "Salta", trabajo: "Clínica del Centro",      monto: 500000 },
  { fecha: "2026-07-17", nombre: "Patricia Elizabeth Flores",  localidad: "Orán",  trabajo: "Clínica Sagrado Corazón", monto: 300000 },
  { fecha: "2026-07-16", nombre: "Silvina del Valle Peralta",  localidad: "Orán",  trabajo: "Clínica Sagrado Corazón", monto: 400000 },
  { fecha: "2026-07-24", nombre: "Nancy",                      localidad: "Salta", trabajo: "Clínica del Centro",      monto: 400000 },
  { fecha: "2026-07-29", nombre: "Ivana Vanesa Colina Duarte", localidad: "Metán", trabajo: "Clínica 9 de Julio",      monto: 300000 },
  { fecha: "2026-07-16", nombre: "Paola Elisabeth Jaime",      localidad: "Metán", trabajo: "Clínica 9 de Julio",      monto: 300000 },
  { fecha: "2026-07-29", nombre: "Laureano Rolando",           localidad: "Salta", trabajo: "Clínica del Centro",      monto: 300000 },
];

const nombres = CARTERA.map((c) => `"${c.nombre}"`).join(",");

if (process.argv.includes("--limpiar")) {
  await api("DELETE", `clientes?nombre=in.(${nombres})`);
  console.log("Cartera borrada.");
  process.exit(0);
}

await api("DELETE", `clientes?nombre=in.(${nombres})`);
console.log("Cargando la cartera del Excel…\n");

let total = 0;
for (const p of CARTERA) {
  const [cliente] = await api("POST", "clientes", {
    nombre: p.nombre,
    localidad: p.localidad,
    lugar_trabajo: p.trabajo,
    // Trabajan todas en clínicas: la app les va a pedir 3 recibos de sueldo.
    tipo: "empleado",
  });

  const [credito] = await api("POST", "creditos", {
    cliente_id: cliente.id,
    monto: p.monto,
    con_interes: false,
    monto_total: p.monto,
    cantidad_cuotas: 1,
    fecha_otorgado: p.fecha,
  });

  // Un solo pago, a 30 días de otorgado. Es una suposición: el Excel no dice
  // cuándo cobra. Se corrige desde la app.
  const vence = new Date(`${p.fecha}T12:00:00Z`);
  vence.setUTCDate(vence.getUTCDate() + 30);
  await api("POST", "cuotas", [
    {
      credito_id: credito.id,
      numero: 1,
      monto: p.monto,
      fecha_cobro: vence.toISOString().slice(0, 10),
    },
  ]);

  total += p.monto;
  console.log(`  ${p.nombre.padEnd(30)} ${String(p.monto).padStart(8)}  ${p.localidad}`);
}

console.log(`\n  ${"TOTAL".padEnd(30)} ${String(total).padStart(8)}`);
console.log("\nTodos como 'empleado': se les van a pedir 3 recibos de sueldo.");
console.log("Faltan del Excel: DNI (estaba vacío) y la fecha real de cobro.");
