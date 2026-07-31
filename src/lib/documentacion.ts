/**
 * Qué papeles le pide la financiera a cada tipo de cliente. Ver CLAUDE.md §10.
 *
 * La matriz vive acá y no en una tabla: la cambia un programador cuando el
 * cliente lo pide, no Candela desde la app.
 *
 * Función pura y testeada aparte, porque de esto depende que la app diga
 * "está en regla" o "le faltan papeles" justo antes de prestar plata.
 */

export type TipoCliente = "monotributista" | "empleado" | "comercio" | "pami";

export type TipoDocumento =
  | "factura"
  | "recibo_sueldo"
  | "dni_titular"
  | "dni_garante"
  | "pagare";

export const NOMBRE_TIPO_CLIENTE: Record<TipoCliente, string> = {
  monotributista: "Monotributista",
  empleado: "Empleado",
  comercio: "Comercio",
  pami: "PAMI",
};

export type Requisito = {
  tipo: TipoDocumento;
  cantidad: number;
  /** Cómo se nombra en la UI. Siempre en las palabras de ella. */
  label: string;
  /** Para armar "2 de 3 facturas". */
  singular: string;
  plural: string;
  /**
   * Si el papel corresponde a un mes. Un recibo de sueldo sí; un DNI no —
   * el DNI no "vence" cada mes, solo hay que tenerlo.
   */
  pidePeriodo: boolean;
};

const FACTURAS: Requisito = {
  tipo: "factura",
  cantidad: 3,
  label: "Últimas 3 facturas",
  singular: "factura",
  plural: "facturas",
  pidePeriodo: true,
};

export const REQUISITOS: Record<TipoCliente, Requisito[]> = {
  monotributista: [FACTURAS],
  // Comercio pide lo mismo que monotributista. Comparten el objeto a propósito:
  // si algún día se despegan, se duplica acá y listo — y mientras tanto es
  // imposible que uno cambie sin el otro por olvido.
  comercio: [FACTURAS],
  empleado: [
    {
      tipo: "recibo_sueldo",
      cantidad: 3,
      label: "Últimos 3 recibos de sueldo",
      singular: "recibo",
      plural: "recibos",
      pidePeriodo: true,
    },
  ],
  pami: [
    {
      tipo: "dni_titular",
      cantidad: 1,
      label: "DNI",
      singular: "DNI",
      plural: "DNI",
      pidePeriodo: false,
    },
    {
      tipo: "dni_garante",
      cantidad: 1,
      label: "DNI del garante",
      singular: "DNI del garante",
      plural: "DNI del garante",
      pidePeriodo: false,
    },
    {
      tipo: "pagare",
      cantidad: 1,
      label: "Pagaré firmado",
      singular: "pagaré",
      plural: "pagarés",
      pidePeriodo: false,
    },
  ],
};

/**
 * Cuántos meses puede tener el papel más nuevo antes de que los papeles se
 * consideren viejos. El pedido fue "más o menos en fecha": con tres documentos
 * mensuales, si el último es de hace más de tres meses ya no describen la
 * situación actual de la persona.
 */
export const MESES_VIGENCIA = 3;

export type DocumentoCargado = {
  id: string;
  tipo: TipoDocumento;
  periodo: string | null;
  subido_el: string;
};

export type EstadoRequisito = {
  requisito: Requisito;
  cargados: number;
  faltan: number;
  cumplido: boolean;
  /** El período más nuevo entre los cargados. Null si el papel no lleva período. */
  periodoMasNuevo: string | null;
  /** Cumplido pero con papeles viejos: cuenta como alerta, no como falta. */
  desactualizado: boolean;
};

export type Evaluacion = {
  requisitos: EstadoRequisito[];
  completa: boolean;
  /** Cuántos papeles faltan en total. Es el número que se muestra. */
  faltan: number;
  hayDesactualizados: boolean;
  /** Documentos que quedaron de un tipo anterior y ya no aplican. No se borran. */
  sobrantes: DocumentoCargado[];
};

/** Meses enteros entre dos fechas `YYYY-MM-DD`. */
export function mesesEntre(desde: string, hasta: string): number {
  const [aA, mA] = desde.split("-").map(Number);
  const [aB, mB] = hasta.split("-").map(Number);
  return (aB - aA) * 12 + (mB - mA);
}

export function evaluarDocumentacion(
  tipo: TipoCliente | null,
  documentos: readonly DocumentoCargado[],
  hoy: string,
): Evaluacion {
  // Sin tipo no se puede saber qué pedirle. No es "está completo": es que
  // todavía no se sabe, y la UI tiene que decir eso y no un ✓ falso.
  const requisitosDelTipo = tipo ? REQUISITOS[tipo] : [];
  const tiposEsperados = new Set(requisitosDelTipo.map((r) => r.tipo));

  const requisitos = requisitosDelTipo.map<EstadoRequisito>((requisito) => {
    const propios = documentos.filter((d) => d.tipo === requisito.tipo);
    const cargados = Math.min(propios.length, requisito.cantidad);
    const cumplido = propios.length >= requisito.cantidad;

    const periodos = propios.map((d) => d.periodo).filter((p): p is string => p !== null);
    const periodoMasNuevo = periodos.length > 0 ? periodos.sort().at(-1)! : null;

    return {
      requisito,
      cargados,
      faltan: Math.max(0, requisito.cantidad - propios.length),
      cumplido,
      periodoMasNuevo,
      desactualizado:
        cumplido &&
        requisito.pidePeriodo &&
        periodoMasNuevo !== null &&
        mesesEntre(periodoMasNuevo, hoy) > MESES_VIGENCIA,
    };
  });

  return {
    requisitos,
    completa: requisitos.length > 0 && requisitos.every((r) => r.cumplido),
    faltan: requisitos.reduce((suma, r) => suma + r.faltan, 0),
    hayDesactualizados: requisitos.some((r) => r.desactualizado),
    sobrantes: documentos.filter((d) => !tiposEsperados.has(d.tipo)),
  };
}

/** El resumen de una línea que va en la ficha y en la lista. */
export function resumenDocumentacion(evaluacion: Evaluacion, tipo: TipoCliente | null): string {
  if (!tipo) return "Falta decir de qué tipo es";
  if (evaluacion.faltan > 0) {
    return evaluacion.faltan === 1 ? "Falta 1 papel" : `Faltan ${evaluacion.faltan} papeles`;
  }
  if (evaluacion.hayDesactualizados) return "Están todos, pero viejos";
  return "Papeles al día";
}
