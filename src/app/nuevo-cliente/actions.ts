"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type EstadoNuevoCliente = { error: string | null };

export async function crearCliente(
  _previo: EstadoNuevoCliente,
  datos: FormData,
): Promise<EstadoNuevoCliente> {
  const supabase = await createClient();

  // Se revalida acá y no solo en el proxy: las Server Actions son un POST a la
  // ruta donde viven, y un cambio de matcher las puede dejar sin cobertura.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Se te venció la sesión. Entrá de nuevo." };

  const nombre = String(datos.get("nombre") ?? "").trim();
  const telefono = String(datos.get("telefono") ?? "").trim();
  const notas = String(datos.get("notas") ?? "").trim();

  if (nombre.length < 2) return { error: "Escribí el nombre de la persona." };

  const { error } = await supabase.from("clientes").insert({
    nombre,
    telefono: telefono || null,
    notas: notas || null,
  });

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/clientes");
  revalidatePath("/");
  redirect("/clientes");
}
