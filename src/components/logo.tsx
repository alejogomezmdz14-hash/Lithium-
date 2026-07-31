import Image from "next/image";

/**
 * Isotipo y lockup. Ver CLAUDE.md §9.0.2.
 *
 * **No son intercambiables:** el lockup completo va SOLO en el login. En
 * cualquier lugar chico —header, favicon— va el átomo solo, porque
 * "CREDIT COMPANY" a 32px es una mancha gris ilegible.
 *
 * El wordmark se compone en HTML en vez de bakearlo dentro del SVG: así usa la
 * Instrument Sans que ya carga `next/font` y no depende de que la fuente esté
 * instalada en el dispositivo.
 */

export function Isotipo({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/logo-isotipo.svg"
      alt=""
      width={size}
      height={size}
      priority
      className="shrink-0"
    />
  );
}

export function Lockup() {
  return (
    <div className="flex flex-col items-start">
      <Isotipo size={72} />
      <p className="mt-5 text-[2rem] font-semibold leading-none tracking-[-0.02em] text-foreground">
        Lithium
      </p>
      <p className="mt-2 text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Credit Company
      </p>
    </div>
  );
}
