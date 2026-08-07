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
      {/* Los tokens son los de Adoquín: adentro de la piedra del login,
          `--texto` y `--texto-suave` ya vienen redeclarados, así que la bajada
          sale gris sin condicionar nada por tema. */}
      <p className="mt-5 text-[2rem] font-semibold leading-none tracking-[-0.02em] text-texto">
        Lithium
      </p>
      <p className="mt-2 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-texto-suave">
        Credit Company
      </p>
    </div>
  );
}
