import "server-only";

import {
  evaluarDocumentacion,
  resumenDocumentacion,
  type DocumentoCargado,
  type TipoCliente,
} from "@/lib/documentacion";
import { hoyEnBA, sumarDias } from "@/lib/fecha";
import { agruparPorPagar, type CuotaPorPagar, type Grupo, type Semaforo } from "@/lib/por-pagar";
import { calcularResumen, type Resumen } from "@/lib/resumen";
import { createClient } from "@/lib/supabase/server";

/** Peor primero: es el orden en que conviene mirarlos (§9.3). */
const ORDEN_SEMAFORO: Record<Semaforo, number> = { rojo: 0, naranja: 1, nuevo: 2, verde: 3 };

type CuotaImpagaCruda = {
  id: string;
  monto: number | string;
  fecha_cobro: string;
  credito_id: string;
  creditos: { clientes: { id: string; nombre: string; semaforo_efectivo: Semaforo } };
};

/** Todas las cuotas impagas, aplanadas. La usan el Resumen y Clientes. */
async function traerImpagas(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase
    .from("cuotas")
    .select(
      "id,monto,fecha_cobro,credito_id,creditos!inner(clientes!inner(id,nombre,semaforo_efectivo))",
    )
    .is("pagado_el", null)
    .limit(2000);

  if (error) return { filas: [], error: error.message };

  const filas = ((data ?? []) as unknown as CuotaImpagaCruda[]).map((f) => ({
    id: f.id,
    monto: Number(f.monto),
    fecha_cobro: f.fecha_cobro,
    credito_id: f.credito_id,
    cliente_id: f.creditos.clientes.id,
    cliente_nombre: f.creditos.clientes.nombre,
    cliente_semaforo: f.creditos.clientes.semaforo_efectivo,
  }));
  return { filas, error: null as string | null };
}

export type DatosResumen = { hoy: string; resumen: Resumen | null; error: string | null };

export async function traerResumen(): Promise<DatosResumen> {
  const supabase = await createClient();
  const hoy = hoyEnBA();

  const [creditosRes, impagasRes] = await Promise.all([
    supabase
      .from("creditos")
      .select("id,cliente_id,monto,monto_total,con_interes,fecha_otorgado")
      .limit(2000),
    traerImpagas(supabase),
  ]);

  const error = creditosRes.error?.message ?? impagasRes.error;
  if (error) return { hoy, resumen: null, error };

  const creditos = (creditosRes.data ?? []).map((c) => ({
    id: c.id as string,
    // numeric de Postgres llega como string: sin Number() se concatenarían.
    monto: Number(c.monto),
    monto_total: Number(c.monto_total),
    con_interes: Boolean(c.con_interes),
    fecha_otorgado: c.fecha_otorgado as string,
  }));

  const clientePorCredito = new Map(
    (creditosRes.data ?? []).map((c) => [c.id as string, c.cliente_id as string]),
  );

  return {
    hoy,
    resumen: calcularResumen(creditos, impagasRes.filas, hoy, clientePorCredito),
    error: null,
  };
}

export type FilaCliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  semaforo: Semaforo;
  esManual: boolean;
  debe: number;
  tipo: TipoCliente | null;
  /** Resumen de la documentación, listo para mostrar. */
  papeles: string;
  papelesOk: boolean;
  /** Su préstamo más reciente, para poder ir directo a editarlo. */
  creditoId: string | null;
  tieneInteres: boolean;
  /** La cuota impaga que vence primero. Es la que cobra el buscador de un tap. */
  cuotaImpagaId: string | null;
};

export type DatosClientes = { clientes: FilaCliente[]; error: string | null };

export async function traerClientes(): Promise<DatosClientes> {
  const supabase = await createClient();

  const [clientesRes, impagasRes, docsRes, creditosRes] = await Promise.all([
    supabase
      .from("clientes")
      .select("id,nombre,telefono,tipo,semaforo_efectivo,semaforo_manual")
      .limit(2000),
    traerImpagas(supabase),
    supabase.from("documentos").select("id,cliente_id,tipo,periodo,subido_el").limit(5000),
    supabase
      .from("creditos")
      .select("id,cliente_id,con_interes,fecha_otorgado")
      .order("fecha_otorgado", { ascending: false })
      .limit(3000),
  ]);

  const error = clientesRes.error?.message ?? impagasRes.error ?? docsRes.error?.message;
  if (error) return { clientes: [], error };

  // El más reciente de cada persona: la lista viene ordenada por fecha desc,
  // así que el primero que aparece gana.
  const creditoPorCliente = new Map<string, { id: string; conInteres: boolean }>();
  for (const c of creditosRes.data ?? []) {
    const clienteId = c.cliente_id as string;
    if (!creditoPorCliente.has(clienteId)) {
      creditoPorCliente.set(clienteId, {
        id: c.id as string,
        conInteres: Boolean(c.con_interes),
      });
    }
  }

  const deuda = new Map<string, number>();
  // La cuota impaga que vence primero de cada persona: es la que abre el
  // buscador cuando alguien golpea la puerta y paga adelantado. Sin esto, la
  // única forma de cobrarle a quien no está en "Por pagar" es scrollear.
  const proximaImpaga = new Map<string, { id: string; fecha_cobro: string }>();
  for (const c of impagasRes.filas) {
    deuda.set(c.cliente_id, (deuda.get(c.cliente_id) ?? 0) + c.monto);
    const actual = proximaImpaga.get(c.cliente_id);
    if (!actual || c.fecha_cobro < actual.fecha_cobro) {
      proximaImpaga.set(c.cliente_id, { id: c.id, fecha_cobro: c.fecha_cobro });
    }
  }

  const docsPorCliente = new Map<string, DocumentoCargado[]>();
  for (const d of docsRes.data ?? []) {
    const clienteId = d.cliente_id as string;
    const lista = docsPorCliente.get(clienteId) ?? [];
    lista.push({
      id: d.id as string,
      tipo: d.tipo as DocumentoCargado["tipo"],
      periodo: (d.periodo as string | null) ?? null,
      subido_el: d.subido_el as string,
    });
    docsPorCliente.set(clienteId, lista);
  }

  const hoy = hoyEnBA();

  const clientes: FilaCliente[] = (clientesRes.data ?? []).map((c) => {
    const id = c.id as string;
    const tipo = (c.tipo as TipoCliente | null) ?? null;
    const evaluacion = evaluarDocumentacion(tipo, docsPorCliente.get(id) ?? [], hoy);

    return {
      id,
      nombre: c.nombre as string,
      telefono: (c.telefono as string | null) ?? null,
      semaforo: c.semaforo_efectivo as Semaforo,
      esManual: c.semaforo_manual !== null,
      debe: deuda.get(id) ?? 0,
      tipo,
      papeles: resumenDocumentacion(evaluacion, tipo),
      papelesOk: tipo !== null && evaluacion.completa && !evaluacion.hayDesactualizados,
      creditoId: creditoPorCliente.get(id)?.id ?? null,
      tieneInteres: creditoPorCliente.get(id)?.conInteres ?? false,
      cuotaImpagaId: proximaImpaga.get(id)?.id ?? null,
    };
  });

  // Por orden, no por forma: los que hay que mirar primero, arriba (§9.3).
  clientes.sort(
    (a, b) =>
      ORDEN_SEMAFORO[a.semaforo] - ORDEN_SEMAFORO[b.semaforo] ||
      b.debe - a.debe ||
      a.nombre.localeCompare(b.nombre, "es"),
  );

  return { clientes, error: null };
}

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

type ProximoCobro = { nombre: string; monto: number; fecha_cobro: string };

export type DatosPorPagar = {
  hoy: string;
  grupos: Grupo[];
  /** Para el empty state: el próximo cobro, sea cuando sea. */
  proximo: ProximoCobro | null;
  /** Para el pie: el primero que NO entra en los grupos de arriba. */
  despuesDeLaSemana: ProximoCobro | null;
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

  if (error) {
    return { hoy, grupos: [], proximo: null, despuesDeLaSemana: null, error: error.message };
  }

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

  // Dos cosas distintas: el que sigue después de HOY (para el empty state) y el
  // primero que cae FUERA de la semana (para el pie). Antes usaba el mismo para
  // los dos, y el pie terminaba anunciando una cuota que ya estaba listada arriba.
  const construir = (c: CuotaPorPagar | undefined) =>
    c ? { nombre: c.cliente_nombre, monto: c.monto, fecha_cobro: c.fecha_cobro } : null;

  return {
    hoy,
    grupos,
    proximo: construir(cuotas.find((c) => c.fecha_cobro > hoy)),
    despuesDeLaSemana: construir(cuotas.find((c) => c.fecha_cobro > sumarDias(hoy, 7))),
    error: null,
  };
}
