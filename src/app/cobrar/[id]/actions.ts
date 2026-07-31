"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { hoyEnBA } from "@/lib/fecha";
import { parseARS } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export type EstadoCobro = { error: string | null };

/**
 * Registra el cobro de una cuota. SIEMPRE por `registrar_pago()` — la app nunca
 * hace UPDATE a `cuotas` a mano (§2). Esa función es la que cierra la cuota por
 * lo cobrado y abre una nueva por el resto si se cobró de menos.
 *
 * Se revalida la auth acá adentro y no solo en el proxy: las Server Actions son
 * un POST a la ruta donde viven, y un cambio de matcher puede sacarlas de la
 * cobertura del proxy sin que nadie se entere. Lo advierte la propia doc de Next.
 */
export async function cobrar(_previo: EstadoCobro, datos: FormData): Promise<EstadoCobro> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Se te venció la sesión. Entrá de nuevo." };

  const cuotaId = String(datos.get("cuota_id") ?? "");
  const monto = parseARS(String(datos.get("monto") ?? ""));
  const cuando = String(datos.get("cuando") ?? "hoy");
  const otroDia = String(datos.get("otro_dia") ?? "");
  const fechaResto = String(datos.get("fecha_resto") ?? "");

  if (!cuotaId) return { error: "Faltó la cuota. Volvé y probá de nuevo." };
  if (monto === null || monto <= 0) return { error: "Escribí cuánto te dio." };

  const hoy = hoyEnBA();
  let pagadoEl = hoy;
  if (cuando === "ayer") {
    const d = new Date(`${hoy}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    pagadoEl = d.toISOString().slice(0, 10);
  } else if (cuando === "otro") {
    if (!otroDia) return { error: "Elegí qué día te pagó." };
    if (otroDia > hoy) return { error: "Esa fecha es del futuro. Revisala." };
    pagadoEl = otroDia;
  }

  const { error } = await supabase.rpc("registrar_pago", {
    p_cuota_id: cuotaId,
    p_monto: monto,
    p_pagado_el: pagadoEl,
    p_fecha_resto: fechaResto || null,
  });

  if (error) {
    // Los mensajes de registrar_pago ya vienen en castellano y son accionables.
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}
