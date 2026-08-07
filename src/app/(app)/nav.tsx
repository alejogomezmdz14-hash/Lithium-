"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Resumen" },
  { href: "/por-pagar", label: "Por pagar" },
  { href: "/clientes", label: "Clientes" },
] as const;

/**
 * Barra inferior, tres módulos.
 *
 * **Flota, no está pegada al borde.** Es una píldora con márgenes laterales y
 * separada del piso: la lista sigue viéndose por debajo y por los costados, así
 * que se lee como un control que está sobre la app y no como el final de la
 * pantalla. Una barra a sangre de borde a borde es la firma del template.
 *
 * Es el **único** lugar de la app con blur, y acá califica porque hay contenido
 * real moviéndose atrás. Con fallback opaco: una barra translúcida sin blur deja
 * el texto ilegible sobre la lista que pasa por detrás.
 *
 * `pb-[env(safe-area-inset-bottom)]` en el envoltorio: sin eso, en un iPhone la
 * barra queda debajo de la raya de gestos y el tab del medio no se puede tocar.
 */
export function Nav() {
  const path = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
      <nav className="barra-vidrio barra-flotante pointer-events-auto mx-auto w-full max-w-[420px] overflow-hidden rounded-pill">
        <ul className="flex h-[60px]">
          {TABS.map((tab) => {
            const activo = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={activo ? "page" : undefined}
                  // Sin iconos sin label: nada escondido detrás de un glifo. El
                  // activo cambia de color y de peso, sin indicador deslizante —
                  // no hay librería de layout animation y un indicador que salta
                  // mal es peor que ninguno.
                  className={`presionable flex h-full items-center justify-center text-[0.875rem] tracking-[-0.006em] ${
                    activo ? "font-semibold text-marca-texto" : "font-medium text-texto-suave"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
