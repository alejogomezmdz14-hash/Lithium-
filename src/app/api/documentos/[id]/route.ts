import { createClient } from "@/lib/supabase/server";

/**
 * Sirve los bytes de un documento. Ver CLAUDE.md §10.2.
 *
 * **Por qué esto y no una URL firmada de Supabase:** una URL firmada ES la
 * credencial. Si se filtra —y las URLs se filtran solas: quedan en el historial,
 * en el `Referer`, en los logs de cualquier proxy— cualquiera abre el DNI de un
 * tercero hasta que venza, y no hay forma de revocarla de a una. Acá cada
 * pedido revalida la sesión, y cortar el acceso es cerrar la sesión.
 *
 * Nunca `next/image` sobre esta ruta: el optimizador guarda su propia copia
 * cacheada que no se invalida a mano, así que un documento borrado seguiría
 * sirviéndose. Va `<img>` plano.
 */
export async function GET(_pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  // RLS ya filtra por es_admin(): si no corresponde, no hay fila.
  const { data: doc } = await supabase
    .from("documentos")
    .select("storage_path,mime,nombre_archivo")
    .eq("id", id)
    .maybeSingle();

  if (!doc) return new Response("No existe", { status: 404 });

  const { data: archivo, error } = await supabase.storage
    .from("documentos")
    .download(doc.storage_path);

  if (error || !archivo) return new Response("No se pudo leer el archivo", { status: 404 });

  return new Response(archivo, {
    headers: {
      "Content-Type": doc.mime ?? "application/octet-stream",
      // Ni el navegador ni ningún CDN en el medio guardan copia: si mañana se
      // borra el documento, no queda sirviéndose de un cache.
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.nombre_archivo ?? "documento")}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
