/**
 * Cálculos del Resumen. Ver CLAUDE.md §9.6.
 *
 * Funciones puras, separadas de la query, para poder testearlas sin base.
 * Pocos números y grandes: si un número no cambia una decisión de Candela, no va.
 */
import { inicioDeMes, sumarDias } from "./fecha";
import type { Semaforo } from "./por-pagar";

export type CreditoResumen = {
  id: string;
  monto: number; // capital
  monto_total: number; // a cobrar
  con_interes: boolean;
  fecha_otorgado: string;
};

export type CuotaResumen = {
  monto: number;
  fecha_cobro: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_semaforo: Semaforo;
};

export type Deudor = {
  cliente_id: string;
  nombre: string;
  monto: number;
  semaforo: Semaforo;
  /** Cuántas de sus cuotas ya vencieron. 0 = está al día aunque deba. */
  cuotasVencidas: number;
};

export type Resumen = {
  /** Capital que salió a la calle este mes, partido por tipo. */
  prestadoEsteMes: { conInteres: number; sinInteres: number; total: number };
  /** Lo que va a entrar de más por los préstamos con interés de este mes. */
  interesEsteMes: number;
  /** Deuda viva: todo lo impago, venza cuando venza. */
  meDeben: number;
  vencido: { monto: number; cuotas: number; personas: number };
  cobroEstaSemana: number;
  /** Ranking completo, no top 5: con muchos deudores el que buscás es el noveno. */
  quienMeDebe: Deudor[];
};

export function calcularResumen(
  creditos: readonly CreditoResumen[],
  impagas: readonly CuotaResumen[],
  hoy: string,
): Resumen {
  const desde = inicioDeMes(hoy);
  const delMes = creditos.filter((c) => c.fecha_otorgado >= desde && c.fecha_otorgado <= hoy);

  const conInteres = delMes.filter((c) => c.con_interes);
  const sinInteres = delMes.filter((c) => !c.con_interes);

  const suma = (xs: readonly CreditoResumen[], campo: "monto" | "monto_total") =>
    xs.reduce((a, c) => a + c[campo], 0);

  const capitalCon = suma(conInteres, "monto");
  const capitalSin = suma(sinInteres, "monto");

  const finDeSemana = sumarDias(hoy, 7);

  const vencidas = impagas.filter((c) => c.fecha_cobro < hoy);
  const personasVencidas = new Set(vencidas.map((c) => c.cliente_id));

  const porPersona = new Map<string, Deudor>();
  for (const c of impagas) {
    const fila = porPersona.get(c.cliente_id) ?? {
      cliente_id: c.cliente_id,
      nombre: c.cliente_nombre,
      monto: 0,
      semaforo: c.cliente_semaforo,
      cuotasVencidas: 0,
    };
    fila.monto += c.monto;
    if (c.fecha_cobro < hoy) fila.cuotasVencidas++;
    porPersona.set(c.cliente_id, fila);
  }

  return {
    prestadoEsteMes: {
      conInteres: capitalCon,
      sinInteres: capitalSin,
      total: capitalCon + capitalSin,
    },
    interesEsteMes: suma(conInteres, "monto_total") - capitalCon,
    meDeben: impagas.reduce((a, c) => a + c.monto, 0),
    vencido: {
      monto: vencidas.reduce((a, c) => a + c.monto, 0),
      cuotas: vencidas.length,
      // Se cuentan PERSONAS, no créditos: ella cuenta gente (§9.6).
      personas: personasVencidas.size,
    },
    cobroEstaSemana: impagas
      .filter((c) => c.fecha_cobro >= hoy && c.fecha_cobro <= finDeSemana)
      .reduce((a, c) => a + c.monto, 0),
    quienMeDebe: [...porPersona.values()].sort(
      (a, b) => b.monto - a.monto || a.nombre.localeCompare(b.nombre, "es"),
    ),
  };
}
