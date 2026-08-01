"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { REQUISITOS, type TipoDocumento } from "@/lib/documentacion";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "documentos";

const TIPOS_DOC = new Set<string>(
  Object.values(REQUISITOS).flatMap((rs) => rs.map((r) => r.tipo)),
);

async function sesion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export type Permiso =
  | { ok: true; path: string; token: string; error: null }
  | { ok: false; path: null; token: null; error: string };

/**
 * Devuelve una URL firmada para subir UN archivo.
 *
 * La subida NO pasa por acá: el body de una Server Action está topeado en 1 MB
 * y una foto no entra (§10.2). Lo que pasa por acá es el permiso; los bytes van
 * del navegador directo a Storage.
 *
 * **El path lo elige el servidor, no el navegador.** Si lo eligiera el cliente,
 * podría escribir en la carpeta de cualquier otra persona: la policy solo
 * verifica el bucket, no la subcarpeta.
 */
export async function pedirPermisoDeSubida(
  clienteId: string,
  tipo: string,
  extension: string,
): Promise<Permiso> {
  const { supabase, user } = await sesion();
  const fallo = (error: string): Permiso => ({ ok: false, path: null, token: null, error });

  if (!user) return fallo("Se te venció la sesión. Entrá de nuevo.");
  if (!TIPOS_DOC.has(tipo)) return fallo("Ese tipo de documento no existe.");
  if (!/^(jpg|png|webp|pdf)$/.test(extension)) return fallo("Ese tipo de archivo no se acepta.");

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .maybeSingle();
  if (!cliente) return fallo("No existe esa persona.");

  const path = `${clienteId}/${tipo}/${randomUUID()}.${extension}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return fallo(`No se pudo preparar la subida: ${error?.message}`);

  return { ok: true, path: data.path, token: data.token, error: null };
}

/** Se llama DESPUÉS de que el archivo ya subió, para dejar la fila en la base. */
export async function registrarDocumento(datos: {
  clienteId: string;
  tipo: string;
  path: string;
  periodo: string | null;
  nombreArchivo: string;
  bytes: number;
  mime: string;
}): Promise<{ error: string | null }> {
  const { supabase, user } = await sesion();
  if (!user) return { error: "Se te venció la sesión. Entrá de nuevo." };
  if (!TIPOS_DOC.has(datos.tipo)) return { error: "Ese tipo de documento no existe." };

  const { error } = await supabase.from("documentos").insert({
    cliente_id: datos.clienteId,
    tipo: datos.tipo as TipoDocumento,
    storage_path: datos.path,
    periodo: datos.periodo,
    nombre_archivo: datos.nombreArchivo,
    tamano_bytes: datos.bytes,
    mime: datos.mime,
  });

  if (error) {
    // La fila no quedó, así que el archivo ya no lo reclama nadie: se borra en
    // el momento en vez de dejar un DNI huérfano en el bucket (§10.2).
    await supabase.storage.from(BUCKET).remove([datos.path]);
    return { error: `No se pudo guardar el documento: ${error.message}` };
  }

  revalidatePath(`/clientes/${datos.clienteId}`);
  revalidatePath("/clientes");
  return { error: null };
}

/** Borra el archivo ANTES que la fila: si falla, la fila queda y se reintenta. */
export async function borrarDocumento(id: string): Promise<{ error: string | null }> {
  const { supabase, user } = await sesion();
  if (!user) return { error: "Se te venció la sesión. Entrá de nuevo." };

  const { data: doc } = await supabase
    .from("documentos")
    .select("id,cliente_id,storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return { error: "Ese documento ya no está." };

  const { error: errorStorage } = await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  if (errorStorage) {
    return { error: `No se pudo borrar el archivo: ${errorStorage.message}` };
  }

  const { error } = await supabase.from("documentos").delete().eq("id", id);
  if (error) return { error: `No se pudo borrar el registro: ${error.message}` };

  revalidatePath(`/clientes/${doc.cliente_id}`);
  revalidatePath("/clientes");
  return { error: null };
}
