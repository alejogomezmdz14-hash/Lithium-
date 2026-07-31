/**
 * Comprueba que RLS deje pasar SOLO a la usuaria sellada como admin.
 *
 *   node scripts/verificar-acceso.mjs <mail-admin> <password>
 *
 * Crea un usuario de prueba SIN el sello, verifica que no vea absolutamente
 * nada, y lo borra. Es la única forma de saber que el candado cierra: que la
 * admin entre no prueba nada por sí solo.
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const env = {};
for (const l of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const t = l.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i !== -1) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const [email, password] = process.argv.slice(2);

const admin = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const TABLAS = ["clientes", "creditos", "cuotas", "alertas", "documentos"];

let pasaron = 0, fallaron = 0;
const check = (nombre, cond, detalle = "") => {
  if (cond) { console.log(`  OK    ${nombre}`); pasaron++; }
  else { console.log(`  FALLA ${nombre}${detalle ? `\n          ${detalle}` : ""}`); fallaron++; }
};

const entrar = async (mail, pass) => {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: mail, password: pass }),
  });
  return { ok: r.ok, ...(await r.json()) };
};

const leer = async (tabla, token) => {
  const r = await fetch(`${URL}/rest/v1/${tabla}?select=id&limit=5`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  });
  const cuerpo = await r.json();
  return { status: r.status, filas: Array.isArray(cuerpo) ? cuerpo.length : null, cuerpo };
};

console.log("=== 1. La admin sellada SIGUE entrando y viendo todo ===");
const jefa = await entrar(email, password);
check("login de la admin", jefa.ok, JSON.stringify(jefa).slice(0, 150));
if (!jefa.ok) { console.error("\nNO PUEDO SEGUIR: la admin no entra."); process.exit(1); }

const payload = JSON.parse(Buffer.from(jefa.access_token.split(".")[1], "base64").toString());
check("su token trae rol=admin", payload.app_metadata?.rol === "admin", JSON.stringify(payload.app_metadata));

for (const t of TABLAS) {
  const r = await leer(t, jefa.access_token);
  check(`lee ${t}`, r.status === 200, `status ${r.status}: ${JSON.stringify(r.cuerpo).slice(0, 120)}`);
}
const conClientes = await leer("clientes", jefa.access_token);
check("y ve datos de verdad, no una lista vacia", (conClientes.filas ?? 0) > 0, `${conClientes.filas} filas`);

console.log("\n=== 2. Un usuario SIN el sello no ve NADA ===");
const mailTemp = `zz-test-${randomBytes(4).toString("hex")}@ejemplo-borrar.com`;
const passTemp = randomBytes(16).toString("hex");

const alta = await fetch(`${URL}/auth/v1/admin/users`, {
  method: "POST",
  headers: admin,
  body: JSON.stringify({ email: mailTemp, password: passTemp, email_confirm: true }),
});
const intruso = await alta.json();
check("se pudo crear el usuario de prueba", alta.ok, JSON.stringify(intruso).slice(0, 150));
if (!alta.ok) process.exit(1);

const borrarIntruso = () =>
  fetch(`${URL}/auth/v1/admin/users/${intruso.id}`, { method: "DELETE", headers: admin });

try {
  const suSesion = await entrar(mailTemp, passTemp);
  check("el intruso SI puede loguearse (eso es normal)", suSesion.ok);

  for (const t of TABLAS) {
    const r = await leer(t, suSesion.access_token);
    // RLS devuelve 200 con lista vacia, no 403: no hay filas que le correspondan.
    check(`*** NO ve ${t} ***`, r.filas === 0 || r.status === 403, `status ${r.status}, ${r.filas} filas`);
  }

  const escribir = await fetch(`${URL}/rest/v1/clientes`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${suSesion.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: "ZZ INTRUSO" }),
  });
  check("*** NO puede escribir ***", !escribir.ok, `status ${escribir.status} — DEBERIA FALLAR`);

  const subir = await fetch(`${URL}/storage/v1/object/documentos/intruso/prueba.jpg`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${suSesion.access_token}`, "Content-Type": "image/jpeg" },
    body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
  check("*** NO puede subir documentos ***", !subir.ok, `status ${subir.status} — DEBERIA FALLAR`);

  const listar = await fetch(`${URL}/storage/v1/object/list/documentos`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${suSesion.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "", limit: 10 }),
  });
  const listado = await listar.json();
  check(
    "*** NO puede listar los archivos ***",
    !listar.ok || (Array.isArray(listado) && listado.length === 0),
    `status ${listar.status}: ${JSON.stringify(listado).slice(0, 120)}`,
  );
} finally {
  await borrarIntruso();
  console.log("\n  (usuario de prueba borrado)");
}

console.log(`\n${"=".repeat(50)}\nPASARON: ${pasaron}   FALLARON: ${fallaron}`);
process.exit(fallaron > 0 ? 1 : 0);
