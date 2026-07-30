/**
 * Aplica las migraciones de `supabase/migrations/` en orden.
 *
 *   node scripts/migrate.mjs          — aplica las pendientes
 *   node scripts/migrate.mjs --dry    — solo lista qué haría
 *
 * Lee `SUPABASE_DB_URL` de `.env.local` (gitignoreado). Nunca imprime la
 * connection string ni la password.
 *
 * Cada migración corre dentro de una transacción: si algo falla, no queda la
 * base a medio migrar. Se registran en `_migraciones` para no reaplicarlas.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--dry");

function cargarEnv() {
  const env = {};
  for (const linea of readFileSync(join(raiz, ".env.local"), "utf8").split(/\r?\n/)) {
    const t = linea.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i !== -1) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const { SUPABASE_DB_URL } = cargarEnv();
if (!SUPABASE_DB_URL) {
  console.error(
    "Falta SUPABASE_DB_URL en .env.local.\n" +
      "Supabase -> Project Settings -> Database -> Connection string -> URI.\n" +
      "Usar la conexion DIRECTA o el session pooler; el transaction pooler (6543)\n" +
      "no maneja bien el DDL de esta migracion.",
  );
  process.exit(1);
}

const dir = join(raiz, "supabase", "migrations");
const archivos = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
if (archivos.length === 0) {
  console.log("No hay migraciones.");
  process.exit(0);
}

const cliente = new pg.Client({
  connectionString: SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

await cliente.connect();
console.log("Conectado.\n");

await cliente.query(`
  create table if not exists _migraciones (
    nombre text primary key,
    aplicada_el timestamptz not null default now()
  );
`);

const { rows } = await cliente.query("select nombre from _migraciones");
const aplicadas = new Set(rows.map((r) => r.nombre));

let corridas = 0;
for (const archivo of archivos) {
  if (aplicadas.has(archivo)) {
    console.log(`  ya aplicada   ${archivo}`);
    continue;
  }
  if (dry) {
    console.log(`  PENDIENTE     ${archivo}`);
    corridas++;
    continue;
  }

  process.stdout.write(`  aplicando     ${archivo} ... `);
  const sql = readFileSync(join(dir, archivo), "utf8");
  try {
    await cliente.query("begin");
    await cliente.query(sql);
    await cliente.query("insert into _migraciones (nombre) values ($1)", [archivo]);
    await cliente.query("commit");
    console.log("OK");
    corridas++;
  } catch (e) {
    await cliente.query("rollback");
    console.log("FALLO\n");
    console.error(`${e.message}`);
    if (e.position) {
      // Ubicar el error en el archivo: PG da el offset en caracteres.
      const hasta = sql.slice(0, Number(e.position));
      const linea = hasta.split("\n").length;
      console.error(`\nEn ${archivo}, linea ~${linea}:`);
      const lineas = sql.split("\n");
      for (let i = Math.max(0, linea - 4); i < Math.min(lineas.length, linea + 2); i++) {
        console.error(`${String(i + 1).padStart(4)} | ${lineas[i]}`);
      }
    }
    await cliente.end();
    process.exit(1);
  }
}

await cliente.end();
console.log(`\n${dry ? "Pendientes" : "Aplicadas"}: ${corridas}`);
