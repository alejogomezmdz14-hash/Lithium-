/**
 * "Por pagar" — la pantalla más importante. Ver CLAUDE.md §9.5.
 *
 * Candela la abre para responder "¿a quién tengo que correr hoy?".
 *
 * Toda la lógica de agrupación vive acá como función PURA, separada de la query,
 * para poder testearla sin base. Es donde se esconden los bugs de fechas.
 */
import { diasEntre } from "./fecha";

export type Semaforo = "verde" | "naranja" | "rojo" | "nuevo";

/** Cómo se llama cada estado en la UI. Nunca mostrar el valor del enum. */
export const PALABRA_SEMAFORO: Record<Semaforo, string> = {
  verde: "Confiable",
  naranja: "Ojo",
  rojo: "Mal pagador",
  nuevo: "Nuevo",
};

/** Peor primero: es el orden en que conviene salir a correrlos. */
const PRIORIDAD_SEMAFORO: Record<Semaforo, number> = {
  rojo: 0,
  naranja: 1,
  nuevo: 2,
  verde: 3,
};

export type CuotaPorPagar = {
  id: string;
  numero: number;
  monto: number;
  fecha_cobro: string;
  credito_id: string;
  cantidad_cuotas: number;
  cliente_id: string;
  cliente_nombre: string;
  cliente_semaforo: Semaforo;
  cliente_notas: string | null;
};

export type Bucket = "vencidos" | "hoy" | "esta_semana" | "mora_vieja";

export type FilaPersona = {
  cliente_id: string;
  nombre: string;
  semaforo: Semaforo;
  notas: string | null;
  cuotas: CuotaPorPagar[];
  total: number;
  /** El atraso MAYOR entre sus cuotas. 0 si ninguna venció. */
  diasDeAtraso: number;
};

export type Grupo = {
  bucket: Bucket;
  titulo: string;
  personas: FilaPersona[];
  total: number;
  /** Se cuentan PERSONAS, no créditos: ella cuenta gente. */
  cantidadPersonas: number;
  /** `Mora vieja` arranca cerrado para que no empuje `HOY` abajo del fold. */
  colapsadoPorDefecto: boolean;
};

const TITULOS: Record<Bucket, string> = {
  vencidos: "Vencidos",
  mora_vieja: "Mora vieja",
  hoy: "Hoy",
  esta_semana: "Esta semana",
};

/** Más de esto deja de ser "se le escapó" y pasa a ser mora instalada. */
export const DIAS_MORA_VIEJA = 14;

/**
 * A qué grupo cae una cuota. Devuelve `null` para lo que no entra en esta
 * pantalla — "más adelante" vive en un link al pie, no acá: la pregunta de esta
 * pantalla es a quién corro HOY.
 */
export function bucketDe(fechaCobro: string, hoy: string): Bucket | null {
  const dias = diasEntre(hoy, fechaCobro); // negativo = ya venció
  if (dias === 0) return "hoy";
  if (dias > 0) return dias <= 7 ? "esta_semana" : null;
  return -dias > DIAS_MORA_VIEJA ? "mora_vieja" : "vencidos";
}

const ORDEN_BUCKETS: Bucket[] = ["vencidos", "hoy", "esta_semana", "mora_vieja"];

export function agruparPorPagar(cuotas: readonly CuotaPorPagar[], hoy: string): Grupo[] {
  const porBucket = new Map<Bucket, Map<string, FilaPersona>>();

  for (const cuota of cuotas) {
    const bucket = bucketDe(cuota.fecha_cobro, hoy);
    if (bucket === null) continue;

    if (!porBucket.has(bucket)) porBucket.set(bucket, new Map());
    const personas = porBucket.get(bucket)!;

    // Una fila por PERSONA, no por cuota: si tiene dos venciendo, van juntas.
    // Si no, cobra una, cierra, y se olvida de la otra (§9.5).
    let fila = personas.get(cuota.cliente_id);
    if (!fila) {
      fila = {
        cliente_id: cuota.cliente_id,
        nombre: cuota.cliente_nombre,
        semaforo: cuota.cliente_semaforo,
        notas: cuota.cliente_notas,
        cuotas: [],
        total: 0,
        diasDeAtraso: 0,
      };
      personas.set(cuota.cliente_id, fila);
    }

    fila.cuotas.push(cuota);
    fila.total += cuota.monto;
    const atraso = Math.max(0, -diasEntre(hoy, cuota.fecha_cobro));
    if (atraso > fila.diasDeAtraso) fila.diasDeAtraso = atraso;
  }

  const grupos: Grupo[] = [];

  for (const bucket of ORDEN_BUCKETS) {
    const personas = porBucket.get(bucket);
    // Los grupos vacíos no se renderizan (§9.5).
    if (!personas || personas.size === 0) continue;

    const lista = [...personas.values()];

    if (bucket === "vencidos" || bucket === "mora_vieja") {
      // Más reciente primero: lo que se acaba de escapar es lo recuperable.
      // A igual atraso, peor semáforo primero.
      lista.sort(
        (a, b) =>
          a.diasDeAtraso - b.diasDeAtraso ||
          PRIORIDAD_SEMAFORO[a.semaforo] - PRIORIDAD_SEMAFORO[b.semaforo] ||
          a.nombre.localeCompare(b.nombre, "es"),
      );
    } else {
      // Lo que vence antes, primero.
      lista.sort(
        (a, b) =>
          a.cuotas[0].fecha_cobro.localeCompare(b.cuotas[0].fecha_cobro) ||
          a.nombre.localeCompare(b.nombre, "es"),
      );
    }

    for (const fila of lista) fila.cuotas.sort((a, b) => a.numero - b.numero);

    grupos.push({
      bucket,
      titulo: TITULOS[bucket],
      personas: lista,
      total: lista.reduce((suma, p) => suma + p.total, 0),
      cantidadPersonas: lista.length,
      colapsadoPorDefecto: bucket === "mora_vieja",
    });
  }

  return grupos;
}

/**
 * La línea de abajo del nombre: "2 cuotas · 12 días de atraso".
 *
 * El semáforo entra solo como PALABRA, nunca con hue (§9.2), y **solo en los
 * grupos que NO son de vencidos**: por §3, tener una cuota vencida e impaga es
 * literalmente la definición de `rojo`, así que en `Vencidos` y `Mora vieja` el
 * semáforo automático siempre dice "Mal pagador". Repetirlo en cada fila es
 * ruido garantizado. Donde sí informa es en `Hoy` y `Esta semana`, porque ahí
 * alguien puede estar al día y aun así ser `Ojo` o `Nuevo`.
 */
export function lineaMeta(fila: FilaPersona, hoy: string, bucket?: Bucket): string {
  const partes: string[] = [];

  const unSoloPago = fila.cuotas.length === 1 && fila.cuotas[0].cantidad_cuotas === 1;
  if (!unSoloPago) {
    partes.push(fila.cuotas.length === 1 ? "1 cuota" : `${fila.cuotas.length} cuotas`);
  }

  if (fila.diasDeAtraso > 0) {
    partes.push(
      fila.diasDeAtraso === 1 ? "1 día de atraso" : `${fila.diasDeAtraso} días de atraso`,
    );
  } else {
    const dias = diasEntre(hoy, fila.cuotas[0].fecha_cobro);
    partes.push(dias === 0 ? "vence hoy" : dias === 1 ? "vence mañana" : `vence en ${dias} días`);
  }

  const enVencidos = bucket === "vencidos" || bucket === "mora_vieja";
  if (!enVencidos && fila.semaforo !== "verde") partes.push(PALABRA_SEMAFORO[fila.semaforo]);

  return partes.join(" · ");
}
