import { formatARS } from "@/lib/money";

/**
 * La plata, compuesta como en imprenta financiera y no como `toLocaleString`.
 *
 * El `$` va aparte, a 0.62em y en `texto-suave`, con un pelo de aire: el ojo cae
 * en los dígitos y la columna alinea sobre el riel derecho tenga el monto cinco
 * o siete cifras.
 *
 * `formatARS()` no se toca: hay 63 llamadas, siete de ellas en `whatsapp.ts`
 * donde esto no sirve. El componente envuelve, no reemplaza.
 *
 * **La plata nunca lleva color** (§9.2). En Lithium todo es plata: si la plata
 * tiene color, el color no significa nada. La urgencia la lleva la barra del
 * riel, no el número.
 */
export function Monto({ valor, className = "" }: { valor: number; className?: string }) {
  const texto = formatARS(valor);
  const corte = texto.indexOf("$") + 1;

  return (
    <span className={`whitespace-nowrap ${className}`}>
      <span className="mr-[0.08em] text-[0.62em] font-medium text-texto-suave">
        {texto.slice(0, corte)}
      </span>
      {texto.slice(corte)}
    </span>
  );
}

/**
 * La columna de la plata. Su ancho (`--ancho-monto`, 108px) es lo que clava el
 * borde derecho de todo monto en la MISMA x en Resumen, Por pagar, Clientes y
 * Detalle de préstamo. Parada, con una mano, el pulgar aprende una sola
 * coordenada y no falla nunca.
 */
export function ColumnaMonto({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-[var(--ancho-monto)] shrink-0 text-right ${className}`}>{children}</div>
  );
}
