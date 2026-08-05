"use server";

import { revalidatePath } from "next/cache";

import { sumarDias } from "@/lib/fecha";
import { repartirMonto } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

/**
 * Editar un préstamo ya cargado. Ver CLAUDE.md §2 y §9.12.
 *
 * **El invariante que no se puede romper: Σ cuotas === monto_total.** Por eso no
 * hay "editar el monto de una cuota suelta": cambiar una descuadra el total y la
 * plata deja de cerrar. Lo que sí hay es reprogramar el resto, que reparte el
 * saldo que queda y lo mantiene exacto.
 */

async function sesion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const DIAS: Record<string, number> = { mensual: 30, quincenal: 15, semanal: 7 };

/** Mover la fecha de UNA cuota. No toca montos, así que no descuadra nada. */
export async function cambiarFechaCuota(
  cuotaId: string,
  fecha: string,
): Promise<{ error: string | null }> {
  const { supabase, user } = await sesion();
  if (!user) return { error: "Se te venció la sesión. Entrá de nuevo." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Esa fecha no es válida." };

  const { data: cuota } = await supabase
    .from("cuotas")
    .select("id,credito_id,pagado_el")
    .eq("id", cuotaId)
    .maybeSingle();

  if (!cuota) return { error: "Esa cuota ya no está." };
  if (cuota.pagado_el) {
    return { error: "Esa cuota ya está cobrada. Para corregirla, deshacé el cobro primero." };
  }

  const { error } = await supabase.from("cuotas").update({ fecha_cobro: fecha }).eq("id", cuotaId);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath(`/prestamo/${cuota.credito_id}`);
  revalidatePath("/por-pagar");
  revalidatePath("/");
  return { error: null };
}

/**
 * Rehacer el plan de lo que falta cobrar.
 *
 * Las cuotas YA COBRADAS no se tocan — son hechos, no planes. Se borran solo las
 * impagas y se genera un plan nuevo por el saldo, así `Σ cuotas` sigue dando
 * `monto_total` exacto.
 */
export async function reprogramarPlan(
  creditoId: string,
  cantidad: number,
  primeraFecha: string,
  frecuencia: string,
): Promise<{ error: string | null }> {
  const { supabase, user } = await sesion();
  if (!user) return { error: "Se te venció la sesión. Entrá de nuevo." };
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 60) {
    return { error: "Elegí entre 1 y 60 cuotas." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(primeraFecha)) return { error: "Esa fecha no es válida." };

  const { data: cuotas, error: errorCuotas } = await supabase
    .from("cuotas")
    .select("id,numero,monto,pagado_el")
    .eq("credito_id", creditoId)
    .order("numero");

  if (errorCuotas || !cuotas) return { error: "No se pudo leer el préstamo." };

  const cobradas = cuotas.filter((c) => c.pagado_el !== null);
  const impagas = cuotas.filter((c) => c.pagado_el === null);

  if (impagas.length === 0) {
    return { error: "Este préstamo ya está todo cobrado, no queda nada por reprogramar." };
  }

  const saldo = impagas.reduce((s, c) => s + Number(c.monto), 0);
  if (saldo <= 0) return { error: "No queda saldo por cobrar." };

  const montos = repartirMonto(saldo, cantidad);
  const cada = DIAS[frecuencia] ?? 30;
  const desde = cobradas.length;

  // Primero se borran las impagas y después se insertan las nuevas: la
  // constraint unique(credito_id, numero) rechazaría los números repetidos.
  const { error: errorBorrado } = await supabase
    .from("cuotas")
    .delete()
    .in(
      "id",
      impagas.map((c) => c.id),
    );
  if (errorBorrado) return { error: `No se pudo rehacer el plan: ${errorBorrado.message}` };

  const nuevas = montos.map((monto, i) => ({
    credito_id: creditoId,
    numero: desde + i + 1,
    monto,
    fecha_cobro: sumarDias(primeraFecha, i * cada),
  }));

  const { error: errorInsert } = await supabase.from("cuotas").insert(nuevas);
  if (errorInsert) {
    return {
      error:
        `No se pudieron crear las cuotas nuevas: ${errorInsert.message}. ` +
        "Revisá el préstamo antes de seguir.",
    };
  }

  revalidatePath(`/prestamo/${creditoId}`);
  revalidatePath("/por-pagar");
  revalidatePath("/");
  return { error: null };
}

/** Deshacer un cobro. Vuelve la cuota a impaga. */
export async function deshacerCobro(cuotaId: string): Promise<{ error: string | null }> {
  const { supabase, user } = await sesion();
  if (!user) return { error: "Se te venció la sesión. Entrá de nuevo." };

  const { data: cuota } = await supabase
    .from("cuotas")
    .select("id,credito_id,pagado_el")
    .eq("id", cuotaId)
    .maybeSingle();
  if (!cuota) return { error: "Esa cuota ya no está." };
  if (!cuota.pagado_el) return { error: "Esa cuota no estaba cobrada." };

  const { error } = await supabase
    .from("cuotas")
    .update({ pagado_el: null, monto_pagado: null, estado: "pendiente", parcial: false })
    .eq("id", cuotaId);
  if (error) return { error: `No se pudo deshacer: ${error.message}` };

  revalidatePath(`/prestamo/${cuota.credito_id}`);
  revalidatePath("/por-pagar");
  revalidatePath("/");
  return { error: null };
}
