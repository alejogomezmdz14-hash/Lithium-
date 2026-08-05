/**
 * Corrige las fechas de los préstamos que vinieron del Excel: todos son de
 * julio de 2026, no de la fecha en que se cargaron.
 *
 * La fecha del préstamo (`fecha_otorgado`) es la que decide en qué mes cuenta
 * en el Resumen. Cargarlos con la fecha de hoy hacía que julio apareciera
 * vacío y agosto inflado.
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

// Tal como figuran en la planilla.
const FECHAS = {
  "Raquel Andrea Ceballo": "2026-07-06",
  "Nicolás Padilla": "2026-07-10",
  "Patricia Elizabeth Flores": "2026-07-17",
  "Silvina del Valle Peralta": "2026-07-16",
  Nancy: "2026-07-24",
  "Ivana Vanesa Colina Duarte": "2026-07-29",
  "Paola Elisabeth Jaime": "2026-07-16",
  "Laureano Rolando": "2026-07-29",
};

const clientes = await (await fetch(`${U}/rest/v1/clientes?select=id,nombre`, { headers: h })).json();

for (const [nombre, fecha] of Object.entries(FECHAS)) {
  const cliente = clientes.find((c) => c.nombre === nombre);
  if (!cliente) {
    console.log(`  ${nombre.padEnd(28)} no está cargado, se saltea`);
    continue;
  }

  const creditos = await (
    await fetch(`${U}/rest/v1/creditos?select=id&cliente_id=eq.${cliente.id}`, { headers: h })
  ).json();

  for (const cr of creditos) {
    await fetch(`${U}/rest/v1/creditos?id=eq.${cr.id}`, {
      method: "PATCH",
      headers: h,
      body: JSON.stringify({ fecha_otorgado: fecha }),
    });

    // El primer vencimiento pasa a ser 30 días después de la fecha real del
    // préstamo, no 30 días después de cuando se cargó en la app.
    const cuotas = await (
      await fetch(`${U}/rest/v1/cuotas?select=id,numero&credito_id=eq.${cr.id}&order=numero`, {
        headers: h,
      })
    ).json();

    for (const cuota of cuotas) {
      const d = new Date(`${fecha}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + cuota.numero * 30);
      await fetch(`${U}/rest/v1/cuotas?id=eq.${cuota.id}`, {
        method: "PATCH",
        headers: h,
        body: JSON.stringify({ fecha_cobro: d.toISOString().slice(0, 10) }),
      });
    }
  }
  console.log(`  ${nombre.padEnd(28)} ${fecha}  (${creditos.length} préstamo/s)`);
}

console.log("\nListo. Ahora los préstamos cuentan en julio.");
