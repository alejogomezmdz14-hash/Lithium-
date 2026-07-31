import { PALABRA_SEMAFORO, type Semaforo } from "@/lib/por-pagar";

/**
 * Regla dura de §9.3: **el hue NUNCA va solo**. Siempre punto + palabra.
 * `nuevo` va sin hue a propósito — mostrarle un color a alguien de quien no hay
 * historial es mentir, y es la mentira más cara de la app.
 */
const COLOR: Record<Semaforo, string> = {
  rojo: "bg-destructive",
  naranja: "bg-warning",
  verde: "bg-success",
  nuevo: "bg-muted-foreground",
};

const TEXTO: Record<Semaforo, string> = {
  rojo: "text-destructive",
  naranja: "text-warning",
  verde: "text-success",
  nuevo: "text-muted-foreground",
};

export function ChipSemaforo({
  estado,
  esManual = false,
  soloPunto = false,
}: {
  estado: Semaforo;
  esManual?: boolean;
  soloPunto?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium">
      <span
        aria-hidden
        // translate-y: los glifos están centrados en su viewBox, el texto no en
        // su line-box. Sin esto el punto flota arriba de la altura-x.
        className={`inline-block size-2 shrink-0 translate-y-[0.5px] rounded-full ${COLOR[estado]}`}
      />
      <span className={soloPunto ? "sr-only" : TEXTO[estado]}>{PALABRA_SEMAFORO[estado]}</span>
      {esManual && !soloPunto ? (
        <span className="text-muted-foreground">— lo pusiste a mano</span>
      ) : null}
    </span>
  );
}

/** Iniciales sobre círculo tintado. Le da cara a la lista sin meter otro color. */
export function Avatar({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[0.8125rem] font-semibold text-primary-text"
    >
      {iniciales}
    </span>
  );
}
