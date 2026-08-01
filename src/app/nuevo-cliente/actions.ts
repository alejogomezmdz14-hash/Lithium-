"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { REQUISITOS } from "@/lib/documentacion";
import { createClient } from "@/lib/supabase/server";

const TIPOS_VALIDOS = new Set(Object.keys(REQUISITOS));

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
  const tipo = String(datos.get("tipo") ?? "").trim();
  const garanteNombre = String(datos.get("garante_nombre") ?? "").trim();
  const garanteTelefono = String(datos.get("garante_telefono") ?? "").trim();

  if (nombre.length < 2) return { error: "Escribí el nombre de la persona." };
  if (tipo && !TIPOS_VALIDOS.has(tipo)) return { error: "Ese tipo de cliente no existe." };

  const { data: creado, error } = await supabase
    .from("clientes")
    .insert({
      nombre,
      telefono: telefono || null,
      notas: notas || null,
      // El tipo puede quedar vacío: define qué papeles pedirle, no si se puede
      // cargar. Frenar un alta parada en la puerta de la casa por una
      // clasificación sería exactamente el tipo de fricción que §9.0 prohíbe.
      tipo: tipo || null,
      // Siempre opcionales, también para PAMI (§10).
      garante_nombre: garanteNombre || null,
      garante_telefono: garanteTelefono || null,
    })
    .select("id")
    .single();

  if (error || !creado) return { error: `No se pudo guardar: ${error?.message}` };

  revalidatePath("/clientes");
  revalidatePath("/");

  // Se cae en la ficha de la persona recién creada, no en la lista: es donde
  // están los botones para subirle los papeles, y subirlos es la continuación
  // natural de cargarla. Antes había que volver a buscarla en la lista.
  redirect(`/clientes/${creado.id}`);
}
