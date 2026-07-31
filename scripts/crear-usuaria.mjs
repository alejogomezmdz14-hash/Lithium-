/**
 * Crea la usuaria de la app (Candela) usando la Admin API de Supabase.
 *
 *   node scripts/crear-usuaria.mjs candela@ejemplo.com
 *
 * Genera una contraseña fuerte, la crea con el mail ya confirmado (no hay
 * casilla que revisar) y la imprime UNA sola vez. Anotala en ese momento.
 *
 * Usa SUPABASE_SERVICE_ROLE_KEY de .env.local. Esa key saltea RLS: este script
 * corre solo local, nunca en el server de la app.
 */
import { randomBytes } from "node:crypto";
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
const email = process.argv[2];

if (!KEY) {
  console.error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error("Uso: node scripts/crear-usuaria.mjs candela@ejemplo.com");
  process.exit(1);
}

// Sin caracteres ambiguos (0/O, 1/l/I): esta contraseña se dicta y se copia a mano.
const ALFABETO = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const password = Array.from(randomBytes(20))
  .map((b) => ALFABETO[b % ALFABETO.length])
  .join("");

const r = await fetch(`${URL}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, password, email_confirm: true }),
});

const cuerpo = await r.json();

if (!r.ok) {
  console.error(`\nNo se pudo crear (${r.status}):`);
  console.error(JSON.stringify(cuerpo, null, 2));
  if (JSON.stringify(cuerpo).includes("already been registered")) {
    console.error("\nEse mail ya tiene usuaria. Si olvidaste la contraseña, reseteala\ndesde el panel: Authentication -> Users -> ... -> Reset password.");
  }
  process.exit(1);
}

console.log("\n=== USUARIA CREADA ===");
console.log(`  mail       : ${email}`);
console.log(`  contrasena : ${password}`);
console.log(`  id         : ${cuerpo.id}`);
console.log("\nGuardala AHORA: no se vuelve a mostrar.");
console.log("\nDespues, desactiva el registro publico para que nadie mas pueda entrar:");
console.log("  Authentication -> Sign In / Providers -> Email -> 'Allow new users to sign up' = OFF");
