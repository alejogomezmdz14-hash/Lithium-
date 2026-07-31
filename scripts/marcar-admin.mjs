/**
 * Sella `rol=admin` en el app_metadata de una usuaria y COMPRUEBA que el claim
 * llegue dentro del access token.
 *
 *   node scripts/marcar-admin.mjs candela@ejemplo.com [password]
 *
 * Hay que correrlo para CADA usuaria nueva: sin el sello, las policies de RLS
 * (`es_admin()`) le niegan todo y la app le va a aparecer vacía.
 *
 * `app_metadata` solo se puede escribir con la service_role key — el propio
 * usuario no lo puede tocar con su sesión. Por eso sirve para anclar permisos,
 * y `user_metadata` no.
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
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const [email, password] = process.argv.slice(2);

if (!KEY) { console.error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local"); process.exit(1); }
if (!email) { console.error("Uso: node scripts/marcar-admin.mjs mail@ejemplo.com [password]"); process.exit(1); }

const admin = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const { users } = await (await fetch(`${URL}/auth/v1/admin/users`, { headers: admin })).json();
const usuaria = users.find((u) => u.email === email);
if (!usuaria) {
  console.error(`No existe la usuaria ${email}. Registradas: ${users.map((u) => u.email).join(", ") || "(ninguna)"}`);
  process.exit(1);
}

const r = await fetch(`${URL}/auth/v1/admin/users/${usuaria.id}`, {
  method: "PUT",
  headers: admin,
  body: JSON.stringify({ app_metadata: { ...usuaria.app_metadata, rol: "admin" } }),
});
if (!r.ok) { console.error("No se pudo sellar:", await r.text()); process.exit(1); }
console.log(`Sellada ${email} con rol=admin.`);

if (!password) {
  console.log("\nPasá también la contraseña para comprobar que el claim viaja en el token.");
  console.log("IMPORTANTE: si ya estaba con sesión abierta, tiene que SALIR y volver a ENTRAR.");
  process.exit(0);
}

const login = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const sesion = await login.json();
if (!login.ok) { console.error("No pude loguearme para verificar:", sesion); process.exit(1); }

const payload = JSON.parse(Buffer.from(sesion.access_token.split(".")[1], "base64").toString());
const claim = payload.app_metadata?.rol;

if (claim === "admin") {
  console.log("Verificado: el claim rol=admin viaja en el access token. Las policies la van a dejar pasar.");
} else {
  console.error(`PROBLEMA: el token NO trae el claim (app_metadata=${JSON.stringify(payload.app_metadata)}).`);
  console.error("NO apliques la migración de RLS hasta resolver esto: bloquearía la app entera.");
  process.exit(1);
}

console.log("\nRecordá: si ya tenía sesión abierta en el celular, salir y volver a entrar.");
