/**
 * El isotipo, dibujado inline para que herede `currentColor`.
 *
 * El `/logo-isotipo.svg` del `public/` sigue siendo el de la marca y el que va
 * en el header; este es el mismo átomo pero como glifo, para los dos únicos
 * momentos en que la marca entra ADENTRO del producto:
 *
 * 1. **Cuando no hay nada que cobrar** — el empty state de "Por pagar" y el de
 *    un préstamo terminado. El momento en que no hay nada que correr es el único
 *    que la app se puede permitir para mostrar la marca, y es el momento en que
 *    ella está más contenta.
 * 2. **Mientras se está guardando un cobro** — `girando`, 1.6s. Es el instante
 *    exacto en que se está registrando plata, es el único spinner de la app, y
 *    es la marca haciendo un trabajo, no decorándolo.
 *
 * No viola §9.7: no es gradiente, ni sombra, ni emoji, ni acento decorativo.
 * Bajo `prefers-reduced-motion` la regla global de `globals.css` lo deja quieto.
 */
export function Atomo({
  size = 24,
  girando = false,
  className = "",
}: {
  size?: number;
  girando?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden
      className={`shrink-0 ${girando ? "motion-safe:animate-[spin_1.6s_linear_infinite]" : ""} ${className}`}
      fill="none"
      stroke="currentColor"
    >
      {/* Las tres órbitas: la misma elipse rotada en tercios. */}
      <ellipse cx="24" cy="24" rx="21" ry="8.5" strokeWidth={2.25} />
      <ellipse cx="24" cy="24" rx="21" ry="8.5" strokeWidth={2.25} transform="rotate(60 24 24)" />
      <ellipse cx="24" cy="24" rx="21" ry="8.5" strokeWidth={2.25} transform="rotate(120 24 24)" />
      {/* El núcleo. */}
      <circle cx="24" cy="24" r="4.75" fill="currentColor" stroke="none" />
    </svg>
  );
}
