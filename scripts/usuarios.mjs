/**
 * Alta y permisos de usuarias.
 *
 *   node scripts/usuarios.mjs listar
 *   node scripts/usuarios.mjs crear <mail> <pass> [super]
 *   node scripts/usuarios.mjs super <mail>        — le da permiso de crear usuarias
 *   node scripts/usuarios.mjs quitar-super <mail>
 *
 * Hay DOS permisos distintos, a propósito:
 *
 *   rol = 'admin'   → ve y edita los datos. Lo exige RLS (`es_admin()`).
 *   super = true    → además puede crear otras usuarias.
 *
 * Están separados para que agregar un "super" no toque las policies de la base:
 * un error ahí deja a todo el mundo afuera de la app.
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
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };

const [comando, mail, pass, esSuper] = process.argv.slice(2);

const traerTodas = async () =>
  (await (await fetch(`${U}/auth/v1/admin/users`, { headers: admin })).json()).users;

async function sellar(id, cambios) {
  const u = await (await fetch(`${U}/auth/v1/admin/users/${id}`, { headers: admin })).json();
  const r = await fetch(`${U}/auth/v1/admin/users/${id}`, {
    method: "PUT",
    headers: admin,
    body: JSON.stringify({ app_metadata: { ...u.app_metadata, ...cambios } }),
  });
  return r.ok;
}

async function listar() {
  const users = await traerTodas();
  console.log(`${users.length} usuaria(s):\n`);
  for (const u of users) {
    const rol = u.app_metadata?.rol ?? "SIN SELLO";
    const sup = u.app_metadata?.super ? "  ★ puede crear usuarias" : "";
    console.log(`  ${u.email.padEnd(32)} rol=${rol}${sup}`);
  }
}

switch (comando) {
  case "listar":
    await listar();
    break;

  case "crear": {
    if (!mail || !pass) {
      console.error("Uso: node scripts/usuarios.mjs crear <mail> <pass> [super]");
      process.exit(1);
    }
    const users = await traerTodas();
    let usuaria = users.find((u) => u.email === mail);

    if (usuaria) {
      await fetch(`${U}/auth/v1/admin/users/${usuaria.id}`, {
        method: "PUT",
        headers: admin,
        body: JSON.stringify({ password: pass }),
      });
      console.log(`${mail}: ya existía, se le actualizó la contraseña.`);
    } else {
      const r = await fetch(`${U}/auth/v1/admin/users`, {
        method: "POST",
        headers: admin,
        body: JSON.stringify({ email: mail, password: pass, email_confirm: true }),
      });
      usuaria = await r.json();
      if (!r.ok) {
        console.error(`No se pudo crear: ${JSON.stringify(usuaria).slice(0, 200)}`);
        process.exit(1);
      }
      console.log(`${mail}: creada.`);
    }

    await sellar(usuaria.id, { rol: "admin", ...(esSuper === "super" ? { super: true } : {}) });

    // Comprobar que entra de verdad: sin el sello la app le aparece VACÍA, no
    // con un error, y eso es imposible de diagnosticar desde el celular.
    const login = await fetch(`${U}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email: mail, password: pass }),
    });
    const s = await login.json();
    const claims = login.ok
      ? JSON.parse(Buffer.from(s.access_token.split(".")[1], "base64").toString()).app_metadata
      : {};
    console.log(`  entra: ${login.ok ? "sí" : "NO"}   ve los datos: ${claims?.rol === "admin" ? "sí" : "NO"}   crea usuarias: ${claims?.super ? "sí" : "no"}`);
    break;
  }

  case "super":
  case "quitar-super": {
    const users = await traerTodas();
    const usuaria = users.find((u) => u.email === mail);
    if (!usuaria) {
      console.error(`No existe ${mail}`);
      process.exit(1);
    }
    await sellar(usuaria.id, { super: comando === "super" });
    console.log(`${mail}: ${comando === "super" ? "ahora puede" : "ya no puede"} crear usuarias.`);
    console.log("Si tenía sesión abierta, tiene que salir y volver a entrar.");
    break;
  }

  default:
    console.log("Comandos: listar | crear <mail> <pass> [super] | super <mail> | quitar-super <mail>");
}
