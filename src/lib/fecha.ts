/**
 * Fechas. Ver CLAUDE.md §9.12.
 *
 * `fecha_cobro` y `pagado_el` son `date` en Postgres, SIN hora. Acá se tratan
 * siempre como strings `YYYY-MM-DD` y se comparan como strings: es exacto,
 * ordena bien y no arrastra husos horarios.
 *
 * NUNCA usar `new Date()` crudo para saber "qué día es hoy": en Vercel el
 * server corre en UTC y a las 21:00 de Argentina ya es mañana. Un off-by-one
 * acá pinta de rojo una cuota que vence mañana. Es el mismo bug que en SQL
 * resuelve `hoy_ba()`.
 */

export const TZ_AR = "America/Argentina/Buenos_Aires";

/** `YYYY-MM-DD` en hora de Argentina. en-CA es el locale que formatea ISO. */
const fmtISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ_AR,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function hoyEnBA(ahora: Date = new Date()): string {
  return fmtISO.format(ahora);
}

/** Días entre dos fechas `YYYY-MM-DD`. Positivo si `b` es posterior a `a`. */
export function diasEntre(a: string, b: string): number {
  const MS_POR_DIA = 86_400_000;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / MS_POR_DIA);
}

/** Primer día del mes de `iso`. `"2026-07-31"` → `"2026-07-01"`. */
export function inicioDeMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Nombre del mes en curso: `"julio"`. Para titular el bloque del resumen. */
export function nombreDeMes(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", month: "long" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** `iso` sumado en días, en calendario puro. */
export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const fmtDiaSemana = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", weekday: "long" });

/**
 * `"2026-08-12"` → `"miércoles 12/8"`.
 *
 * Siempre con día de la semana: Candela organiza por "el viernes", no por
 * "12/8" (§9.5).
 *
 * El día y el mes se arman a mano en vez de dejárselos a `Intl`: pidiéndole
 * `weekday + day + month` junto, el ICU elige su propio patrón y devuelve
 * `"lunes, 3-8"` con guion. El separador de fecha en Argentina es la barra y no
 * puede depender de la versión de ICU del celular.
 */
export function fechaConDia(iso: string): string {
  const diaSemana = fmtDiaSemana.format(new Date(`${iso}T00:00:00Z`));
  const [, mes, dia] = iso.split("-");
  return `${diaSemana} ${Number(dia)}/${Number(mes)}`;
}

export type EstadoCuotaUI =
  | "cobrada_a_tiempo"
  | "cobrada_tarde"
  | "con_atraso"
  | "pendiente";

type CuotaParaUI = {
  fecha_cobro: string;
  pagado_el: string | null;
};

/**
 * El estado que pinta la UI se DERIVA en render, no se lee de `cuotas.estado`.
 *
 * El cron escribe `estado = 'vencido'` a las 9:00 y las alertas dependen de esa
 * columna — eso se mantiene. Pero entre las 00:00 y las 9:00, o si el cron
 * falla, la columna miente y la pantalla mostraría al día algo que ya venció.
 */
export function estadoCuotaUI(cuota: CuotaParaUI, hoy: string): EstadoCuotaUI {
  if (cuota.pagado_el !== null) {
    return cuota.pagado_el > cuota.fecha_cobro ? "cobrada_tarde" : "cobrada_a_tiempo";
  }
  return cuota.fecha_cobro < hoy ? "con_atraso" : "pendiente";
}

/** La única cuota que se levanta en el detalle: la impaga de menor `numero`. */
export function laQueSigue<T extends { numero: number; pagado_el: string | null }>(
  cuotas: readonly T[],
): T | null {
  return (
    cuotas
      .filter((c) => c.pagado_el === null)
      .reduce<T | null>((menor, c) => (menor === null || c.numero < menor.numero ? c : menor), null)
  );
}
