/**
 * Plata. Ver CLAUDE.md §9.1.
 *
 * Estas tres funciones son el único lugar de la app donde se formatea, se
 * parsea o se reparte un monto. Nunca `toLocaleString` suelto en un componente
 * — mismo espíritu que "nunca hex sueltos".
 */

// Cero centavos en TODA la app, incluido el detalle. Candela presta efectivo:
// si la lista dice $45.000 y adentro $45.000,37, va a pensar que la app le
// redondea la plata.
const nf = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * `45000` -> `"$45.000"`
 *
 * El `$` se prepende a mano, pegado a los dígitos. Con `style:'currency'` el
 * ICU de es-AR devuelve el símbolo separado por un espacio (a veces NBSP) y ese
 * espacio varía entre la versión de ICU del build y la del celular: la columna
 * de montos alineada a la derecha queda desalineada de forma inconsistente.
 */
export function formatARS(monto: number): string {
  if (!Number.isFinite(monto)) return "$0";
  const entero = Math.round(monto);
  const abs = nf.format(Math.abs(entero));
  return entero < 0 ? `-$${abs}` : `$${abs}`;
}

/**
 * `"$45.000"` -> `45000`. Devuelve `null` si no es un monto válido.
 *
 * En Argentina el punto es SIEMPRE separador de miles y la coma SIEMPRE
 * decimal. **`86.666` son ochenta y seis mil, no 86 con 666** — es el bug más
 * fácil de meter y el más caro.
 */
export function parseARS(input: string): number | null {
  if (typeof input !== "string") return null;

  //   = NBSP y   = narrow NBSP: los mete el propio ICU al formatear,
  // así que aparecen apenas se copia y pega un monto desde la app.
  const limpio = input.replace(/[\s  $]/g, "");
  if (limpio === "" || limpio === "-") return null;

  const normalizado = limpio.replace(/\./g, "").replace(",", ".");

  // Rechaza comas múltiples, letras y cualquier cosa que no sea un número.
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return null;

  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/**
 * Reparte `total` en `cuotas`, redondeando a los mil. El resto va a la última.
 *
 * `repartirMonto(400000, 3)` -> `[133000, 133000, 134000]`
 *
 * Se redondea a los mil porque Candela cobra billetes y dice los montos en voz
 * alta por teléfono: un "133.334" la hace dudar de la cuenta entera.
 *
 * **Invariante: la suma es siempre exactamente `total`.** De eso depende que
 * `Σ cuotas === monto_total` en la base (§2).
 */
export function repartirMonto(total: number, cuotas: number): number[] {
  if (!Number.isInteger(cuotas) || cuotas < 1) {
    throw new Error("La cantidad de cuotas tiene que ser un entero de 1 para arriba");
  }

  const totalEntero = Math.round(total);
  if (!Number.isFinite(totalEntero) || totalEntero <= 0) {
    throw new Error("El total tiene que ser mayor a cero");
  }
  if (cuotas === 1) return [totalEntero];

  let base = Math.round(totalEntero / cuotas / 1000) * 1000;
  let ultima = totalEntero - base * (cuotas - 1);

  // Totales chicos con muchas cuotas: si redondear a los mil deja la última en
  // cero o negativa, se cae a redondeo al peso.
  if (base <= 0 || ultima <= 0) {
    base = Math.floor(totalEntero / cuotas);
    ultima = totalEntero - base * (cuotas - 1);
  }

  const resultado = new Array<number>(cuotas).fill(base);
  resultado[cuotas - 1] = ultima;
  return resultado;
}
