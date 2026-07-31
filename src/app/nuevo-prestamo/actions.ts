"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sumarDias } from "@/lib/fecha";
import { parseARS, repartirMonto } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export type EstadoNuevoPrestamo = { error: string | null };

const DIAS_POR_FRECUENCIA: Record<string, number> = {
  mensual: 30,
  quincenal: 15,
  semanal: 7,
};

export async function crearPrestamo(
  _previo: EstadoNuevoPrestamo,
  datos: FormData,
): Promise<EstadoNuevoPrestamo> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Se te venció la sesión. Entrá de nuevo." };

  const clienteId = String(datos.get("cliente_id") ?? "");
  const capital = parseARS(String(datos.get("capital") ?? ""));
  const total = parseARS(String(datos.get("total") ?? ""));
  const cuotas = Number(datos.get("cuotas") ?? 1);
  const primeraFecha = String(datos.get("primera_fecha") ?? "");
  const frecuencia = String(datos.get("frecuencia") ?? "mensual");

  if (!clienteId) return { error: "Elegí a quién le prestás." };
  if (capital === null || capital <= 0) return { error: "Escribí cuánto le prestás." };
  if (total === null || total <= 0) return { error: "Escribí cuánto te tiene que devolver." };
  if (total < capital) {
    return { error: "Te tiene que devolver al menos lo que le prestás." };
  }
  if (!Number.isInteger(cuotas) || cuotas < 1) return { error: "Elegí en cuántas cuotas." };
  if (!primeraFecha) return { error: "Elegí cuándo te paga la primera." };

  const conInteres = total > capital;
  // `tasa` se guarda solo para poder mostrarla después; la fuente de verdad es
  // `monto_total` (§2).
  const tasa = conInteres ? Math.round((total / capital - 1) * 10000) / 100 : null;

  const { data: credito, error: errorCredito } = await supabase
    .from("creditos")
    .insert({
      cliente_id: clienteId,
      monto: capital,
      con_interes: conInteres,
      tasa,
      monto_total: total,
      cantidad_cuotas: cuotas,
      fecha_otorgado: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (errorCredito || !credito) {
    return { error: `No se pudo crear el préstamo: ${errorCredito?.message}` };
  }

  const montos = repartirMonto(total, cuotas);
  const cada = DIAS_POR_FRECUENCIA[frecuencia] ?? 30;

  const filas = montos.map((monto, i) => ({
    credito_id: credito.id,
    numero: i + 1,
    monto,
    fecha_cobro: sumarDias(primeraFecha, i * cada),
  }));

  const { error: errorCuotas } = await supabase.from("cuotas").insert(filas);

  if (errorCuotas) {
    // Sin las cuotas el crédito no existe para ninguna pantalla: se borra en vez
    // de dejar un registro fantasma que descuadre los totales.
    await supabase.from("creditos").delete().eq("id", credito.id);
    return { error: `No se pudieron crear las cuotas: ${errorCuotas.message}` };
  }

  revalidatePath("/");
  revalidatePath("/por-pagar");
  revalidatePath("/clientes");
  redirect("/por-pagar");
}
