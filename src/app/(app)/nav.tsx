"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Resumen" },
  { href: "/por-pagar", label: "Por pagar" },
  { href: "/clientes", label: "Clientes" },
] as const;

/**
 * Barra inferior sticky, tres módulos (§9.0). Es el único lugar de la app con
 * `backdrop-blur`, porque acá sí hay contenido real scrolleando detrás (§9.7),
 * y con fondo opaco de respaldo por si el navegador no lo soporta.
 */
export function Nav() {
  const path = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
      <ul className="mx-auto flex w-full max-w-2xl">
        {TABS.map((tab) => {
          const activo = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={activo ? "page" : undefined}
                // Sin iconos sin label: nada escondido detrás de un glifo (§9.0).
                className={`flex h-16 items-center justify-center text-[0.8125rem] font-semibold ${
                  activo ? "text-primary-text" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
