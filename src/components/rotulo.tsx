import type { ReactNode } from "react";

/**
 * Los rótulos de grupo. Van **sobre el canvas**, afuera de la losa: la losa es
 * el objeto, el rótulo lo nombra desde afuera.
 */

export function Rotulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`text-[0.75rem] font-semibold uppercase tracking-[0.09em] text-texto-suave ${className}`}
    >
      {children}
    </h2>
  );
}

/** La explicación del grupo: `Te deben plata vencida`. */
export function Bajada({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[0.875rem] font-medium text-texto-tenue">{children}</p>;
}

/**
 * Header de grupo sticky. Cuenta **personas, no créditos** —ella cuenta gente—
 * y trae subtotal: así se gana el lugar que ocupa.
 *
 * Opaco sobre el canvas, sin `backdrop-blur`: al sol una barra semitransparente
 * con texto encima es lo primero que se pierde.
 *
 * Se pega en `--alto-buscador`, no en `top-0`: arriba de él está la barra del
 * buscador, que también es sticky. Con los dos en `top-0` el header del grupo
 * queda escondido atrás del buscador apenas se scrollea, y se pierde justamente
 * lo que dice de qué grupo es la fila que se está mirando.
 */
export function HeaderDeGrupo({ children }: { children: ReactNode }) {
  return (
    <h2 className="sticky top-[var(--alto-buscador)] z-20 -mx-4 barra-vidrio px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.09em] text-texto-suave">
      {children}
    </h2>
  );
}

/**
 * La nota del cliente, marcada como **cita**.
 *
 * Es lo único de la pantalla que escribió ella. Separarla de lo que calculó la
 * app cuesta 2px, y es el campo más valioso que va a tener la app: dejarla como
 * una tercera línea gris, indistinguible de la metadata, es tirar el dato más
 * caro que hay.
 */
export function Nota({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 border-l-2 border-texto-tenue pl-[10px] text-[0.875rem] font-medium text-texto-suave">
      {children}
    </p>
  );
}
