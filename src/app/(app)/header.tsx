import Link from "next/link";

import { Isotipo } from "@/components/logo";

import { BotonSalir } from "./boton-salir";

/**
 * Header de los tres módulos. Va el **isotipo solo**, no el lockup: a este
 * tamaño "CREDIT COMPANY" sería una mancha gris (§9.0.2).
 */
export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-5 pt-6">
      <Link href="/" className="flex items-center gap-2.5">
        <Isotipo size={26} />
        <span className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground">
          Lithium
        </span>
      </Link>
      <BotonSalir />
    </header>
  );
}
