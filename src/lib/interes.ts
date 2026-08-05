/**
 * El modelo de tasas de Lithium. Ver CLAUDE.md §12.
 *
 * **El interés es TOTAL, se aplica UNA vez.** 30% sobre 400.000 son 520.000,
 * se divida en 1 cuota o en 6. La cantidad de cuotas cambia cómo se reparte,
 * nunca cuánto se cobra.
 *
 * (El plan de niveles los llama "30% mensual" porque el préstamo típico es a
 * un mes. Confirmado con el cliente: no se multiplica por la cantidad de meses.)
 *
 * La tasa baja a medida que la persona sigue tomando préstamos: es el premio
 * por buen cliente. La app la SUGIERE, nunca la impone — Candela puede escribir
 * la que quiera para un caso especial.
 */

export type Nivel = {
  nivel: number;
  tasaMensual: number;
  /** Cuántos préstamos previos hacen falta para llegar acá. */
  desdePrestamoNumero: number;
  descripcion: string;
};

export const NIVELES: Nivel[] = [
  { nivel: 1, tasaMensual: 30, desdePrestamoNumero: 1, descripcion: "Primer préstamo" },
  { nivel: 2, tasaMensual: 28, desdePrestamoNumero: 2, descripcion: "Segundo préstamo" },
  { nivel: 3, tasaMensual: 25, desdePrestamoNumero: 3, descripcion: "Tercer préstamo" },
  { nivel: 4, tasaMensual: 23, desdePrestamoNumero: 4, descripcion: "Cuarto préstamo" },
  { nivel: 5, tasaMensual: 21, desdePrestamoNumero: 5, descripcion: "Membresía" },
  {
    nivel: 5,
    tasaMensual: 18,
    desdePrestamoNumero: 6,
    descripcion: "Membresía · 6 préstamos seguidos",
  },
];

/**
 * Descuento por traer gente, en PUNTOS de la tasa: con 30% y un amigo, queda
 * 25%. **Solo hasta nivel 3** — de ahí en adelante la tasa ya está baja por
 * historial y el beneficio no se acumula.
 */
export const DESCUENTO_POR_REFERIDOS: Record<number, number> = { 1: 5, 2: 8 };
export const NIVEL_MAXIMO_CON_REFERIDOS = 3;

export type TasaSugerida = {
  tasaMensual: number;
  nivel: number;
  descripcion: string;
  /** Puntos descontados por referidos. 0 si no aplica. */
  descuento: number;
};

/**
 * Qué tasa le toca a alguien según cuántos préstamos ya tomó.
 *
 * `prestamosPrevios` son los préstamos ANTERIORES: 0 para alguien nuevo.
 */
export function tasaSugerida(prestamosPrevios: number, amigosReferidos = 0): TasaSugerida {
  const numero = Math.max(1, prestamosPrevios + 1);

  // El último nivel cuyo umbral ya alcanzó.
  const nivel =
    [...NIVELES].reverse().find((n) => numero >= n.desdePrestamoNumero) ?? NIVELES[0];

  const descuentoPosible = DESCUENTO_POR_REFERIDOS[Math.min(amigosReferidos, 2)] ?? 0;
  const descuento = nivel.nivel <= NIVEL_MAXIMO_CON_REFERIDOS ? descuentoPosible : 0;

  return {
    // La tasa nunca baja de cero por más referidos que traiga.
    tasaMensual: Math.max(0, nivel.tasaMensual - descuento),
    nivel: nivel.nivel,
    descripcion: nivel.descripcion,
    descuento,
  };
}

/**
 * Cuánto tiene que devolver: `capital × (1 + tasa/100)`.
 *
 * **La cantidad de cuotas NO entra en esta cuenta.** El interés se aplica una
 * sola vez sobre el capital, y después el total se reparte. Dividirlo en 6
 * cuotas no lo encarece.
 */
export function calcularTotal(capital: number, tasa: number): number {
  if (capital <= 0) return 0;
  return Math.round(capital * (1 + tasa / 100));
}

/** El % total que termina pagando, para poder mostrarlo al lado del mensual. */
export function porcentajeTotal(capital: number, total: number): number {
  if (capital <= 0) return 0;
  return Math.round((total / capital - 1) * 1000) / 10;
}
