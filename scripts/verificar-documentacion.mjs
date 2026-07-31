/**
 * Verifica la migración de documentación contra la base real.
 * Lo importante que chequea: que el bucket sea PRIVADO de verdad.
 * Crea datos de prueba y los borra al final. No imprime keys.
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

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
async function api(metodo, path, body) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method: metodo,
    headers: { ...H, Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const txt = await r.text();
  return { ok: r.ok, status: r.status, body: txt ? JSON.parse(txt) : null, raw: txt };
}

let pasaron = 0, fallaron = 0;
const check = (nombre, cond, detalle = "") => {
  if (cond) { console.log(`  OK    ${nombre}`); pasaron++; }
  else { console.log(`  FALLA ${nombre}${detalle ? `\n          ${detalle}` : ""}`); fallaron++; }
};

console.log("=== 1. Columnas nuevas en clientes ===");
const cli = await api("POST", "clientes", {
  nombre: "ZZ TEST Documentacion",
  tipo: "empleado",
  garante_nombre: "Alguien Garante",
  garante_telefono: "+5490000000",
});
check("crea cliente con tipo y garante", cli.ok, cli.raw.slice(0, 200));
if (!cli.ok) process.exit(1);
const cliente = cli.body[0];
check("guarda tipo", cliente.tipo === "empleado", `es ${cliente.tipo}`);
check("guarda garante", cliente.garante_nombre === "Alguien Garante");

const malo = await api("POST", "clientes", { nombre: "ZZ TEST Malo", tipo: "inventado" });
check("rechaza un tipo que no existe", !malo.ok, `status ${malo.status} — DEBERIA FALLAR`);

const sinTipo = await api("POST", "clientes", { nombre: "ZZ TEST SinTipo" });
check("tipo puede quedar vacio (cliente sin clasificar)", sinTipo.ok, sinTipo.raw.slice(0, 150));

const limpiar = async () => {
  await api("DELETE", `clientes?nombre=like.ZZ TEST*`);
};

try {
  console.log("\n=== 2. Tabla documentos ===");
  const d1 = await api("POST", "documentos", {
    cliente_id: cliente.id,
    tipo: "recibo_sueldo",
    periodo: "2026-07-01",
    storage_path: `${cliente.id}/recibo_sueldo/test-1.jpg`,
    nombre_archivo: "recibo.jpg",
    mime: "image/jpeg",
    tamano_bytes: 12345,
  });
  check("inserta un documento", d1.ok, d1.raw.slice(0, 200));

  const dupe = await api("POST", "documentos", {
    cliente_id: cliente.id,
    tipo: "factura",
    storage_path: `${cliente.id}/recibo_sueldo/test-1.jpg`,
  });
  check("rechaza dos filas con el mismo storage_path", !dupe.ok, `status ${dupe.status}`);

  const tipoMalo = await api("POST", "documentos", {
    cliente_id: cliente.id,
    tipo: "no_existe",
    storage_path: `${cliente.id}/x.jpg`,
  });
  check("rechaza un tipo de documento invalido", !tipoMalo.ok, `status ${tipoMalo.status}`);

  console.log("\n=== 3. El bucket existe y es PRIVADO ===");
  const buckets = await fetch(`${URL}/storage/v1/bucket/documentos`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const bucket = await buckets.json();
  check("existe el bucket 'documentos'", buckets.ok, JSON.stringify(bucket).slice(0, 200));
  check("*** el bucket es PRIVADO ***", bucket.public === false, `public=${bucket.public}`);
  check("limita el tamano de archivo", Number(bucket.file_size_limit) > 0, `limit=${bucket.file_size_limit}`);

  console.log("\n=== 4. Subir y leer CON sesion ===");
  const login = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const sesion = await login.json();
  check("login OK", login.ok, JSON.stringify(sesion).slice(0, 150));

  const ruta = `${cliente.id}/recibo_sueldo/prueba.txt`;
  const subida = await fetch(`${URL}/storage/v1/object/documentos/${ruta}`, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${sesion.access_token}`,
      "Content-Type": "text/plain",
    },
    body: "contenido de prueba",
  });
  const subidaTxt = await subida.text();
  // El bucket restringe MIME: un .txt deberia rebotar, y eso tambien es un OK.
  const mimeRechazado = subidaTxt.includes("mime") || subida.status === 415;
  check(
    "sube con sesion (o rechaza por MIME, que tambien es correcto)",
    subida.ok || mimeRechazado,
    `status ${subida.status}: ${subidaTxt.slice(0, 200)}`,
  );

  const jpg = `${cliente.id}/recibo_sueldo/prueba.jpg`;
  // JPEG minimo valido
  const bytes = Buffer.from("/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
  const subidaJpg = await fetch(`${URL}/storage/v1/object/documentos/${jpg}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${sesion.access_token}`, "Content-Type": "image/jpeg" },
    body: bytes,
  });
  const jpgTxt = await subidaJpg.text();
  check("sube un JPEG con sesion", subidaJpg.ok, `status ${subidaJpg.status}: ${jpgTxt.slice(0, 200)}`);

  console.log("\n=== 5. SIN sesion NO se puede llegar al archivo ===");
  const publico = await fetch(`${URL}/storage/v1/object/public/documentos/${jpg}`);
  check("*** la URL publica NO sirve ***", !publico.ok, `status ${publico.status} — DEBERIA FALLAR`);

  const conAnon = await fetch(`${URL}/storage/v1/object/documentos/${jpg}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  check("*** con anon key sin sesion NO se puede leer ***", !conAnon.ok, `status ${conAnon.status} — DEBERIA FALLAR`);

  console.log("\n=== 6. URL firmada ===");
  const firma = await fetch(`${URL}/storage/v1/object/sign/documentos/${jpg}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${sesion.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 60 }),
  });
  const firmaBody = await firma.json();
  check("genera URL firmada con sesion", firma.ok, JSON.stringify(firmaBody).slice(0, 200));
  if (firma.ok) {
    const bajada = await fetch(`${URL}/storage/v1${firmaBody.signedURL}`);
    check("la URL firmada SI abre el archivo", bajada.ok, `status ${bajada.status}`);
  }

  console.log("\n=== 7. Borrar el cliente borra sus documentos (cascada) ===");
  const antes = await api("GET", `documentos?cliente_id=eq.${cliente.id}&select=id`);
  check("hay documentos antes de borrar", antes.body.length > 0, `${antes.body.length}`);
  await api("DELETE", `clientes?id=eq.${cliente.id}`);
  const despues = await api("GET", `documentos?cliente_id=eq.${cliente.id}&select=id`);
  check("no quedan documentos huerfanos", despues.body.length === 0, `quedaron ${despues.body.length}`);

  // El archivo en Storage NO se borra solo: la app tiene que hacerlo.
  const sigue = await fetch(`${URL}/storage/v1/object/documentos/${jpg}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  console.log(`\n  NOTA: el archivo en Storage ${sigue.ok ? "SIGUE EXISTIENDO" : "ya no está"} despues de borrar la fila.`);
  console.log("        Si sigue, la app tiene que borrarlo explicitamente o quedan huerfanos pagando storage.");
  await fetch(`${URL}/storage/v1/object/documentos/${jpg}`, {
    method: "DELETE", headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
} finally {
  await limpiar();
}

console.log(`\n${"=".repeat(50)}\nPASARON: ${pasaron}   FALLARON: ${fallaron}`);
process.exit(fallaron > 0 ? 1 : 0);
