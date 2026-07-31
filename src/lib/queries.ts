import "server-only";

import { hoyEnBA } from "@/lib/fecha";
import { agruparPorPagar, type CuotaPorPagar, type Grupo, type Semaforo } from "@/lib/por-pagar";
import { createClient } from "@/lib/supabase/server";

/** Forma que devuelve PostgREST con el embed anidado. Verificada contra la base. */
type FilaCruda = {
  id: string;
  numero: number;
  monto: number | string;
  fecha_cobro: string;
  credito_id: string;
  creditos: {
    cantidad_cuotas: number;
    clientes: {
      id: string;
      nombre: string;
      semaforo_efectivo: Semaforo;
      notas: string | null;
    };
  };
};

export type DatosPorPagar = {
  hoy: string;
  grupos: Grupo[];
  /** Para el empty state: el próximo cobro, aunque caiga fuera de la semana. */
  proximo: { nombre: string; monto: number; fecha_cobro: string } | null;
  error: string | null;
};

export async function traerPorPagar(): Promise<DatosPorPagar> {
  const supabase = await createClient();
  const hoy = hoyEnBA();

  // Una sola query: trae TODAS las impagas ordenadas por vencimiento. Las que
  // caen fuera de los tres grupos igual sirven para el empty state, así no hace
  // falta un segundo round-trip.
  const { data, error } = await supabase
    .from("cuotas")
    .select(
      "id,numero,monto,fecha_cobro,credito_id,creditos!inner(cantidad_cuotas,clientes!inner(id,nombre,semaforo_efectivo,notas))",
    )
    .is("pagado_el", null)
    .order("fecha_cobro", { ascending: true })
    .limit(500);

  if (error) return { hoy, grupos: [], proximo: null, error: error.message };

  const filas = (data ?? []) as unknown as FilaCruda[];

  const cuotas: CuotaPorPagar[] = filas.map((f) => ({
    id: f.id,
    numero: f.numero,
    // numeric de Postgres llega como string: sin Number() los totales se
    // concatenarían en vez de sumarse.
    monto: Number(f.monto),
    fecha_cobro: f.fecha_cobro,
    credito_id: f.credito_id,
    cantidad_cuotas: f.creditos.cantidad_cuotas,
    cliente_id: f.creditos.clientes.id,
    cliente_nombre: f.creditos.clientes.nombre,
    cliente_semaforo: f.creditos.clientes.semaforo_efectivo,
    cliente_notas: f.creditos.clientes.notas,
  }));

  const grupos = agruparPorPagar(cuotas, hoy);

  const siguiente = cuotas.find((c) => c.fecha_cobro > hoy);
  const proximo = siguiente
    ? {
        nombre: siguiente.cliente_nombre,
        monto: siguiente.monto,
        fecha_cobro: siguiente.fecha_cobro,
      }
    : null;

  return { hoy, grupos, proximo, error: null };
}
