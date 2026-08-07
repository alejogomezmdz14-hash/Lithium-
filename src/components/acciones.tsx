import Link from "next/link";

/**
 * Grilla de accesos, al estilo de "Tus atajos" del referente.
 *
 * Tiles cuadradas con un ícono de línea sobre fondo tintado y una palabra
 * abajo. Reemplaza a las filas de texto que había antes: **cuatro palabras y
 * cuatro íconos se leen de un vistazo; cuatro renglones hay que leerlos.**
 *
 * Siguen siendo solo ACCIONES, nunca destinos — para navegar están los tabs.
 */

const trazo = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ATAJOS = [
  {
    href: "/nuevo-prestamo",
    label: "Nueva deuda",
    icono: <path d="M12 5v14M5 12h14" />,
  },
  {
    href: "/por-pagar",
    label: "Ya me pagó",
    icono: <path d="M20 6 9 17l-5-5" />,
  },
  {
    href: "/nuevo-cliente",
    label: "Cliente nuevo",
    icono: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6M22 11h-6" />
      </>
    ),
  },
  {
    href: "/clientes",
    label: "Papeles",
    icono: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" />
      </>
    ),
  },
] as const;

export function FilaDeAcciones() {
  return (
    <section className="mt-7">
      <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Atajos
      </h2>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {ATAJOS.map((a) => (
          <Link key={a.href} href={a.href} className="flex flex-col items-center gap-2">
            <span className="flex aspect-square w-full items-center justify-center rounded-xl bg-primary-tint text-primary-text">
              <svg viewBox="0 0 24 24" className="size-[22px]" {...trazo}>
                {a.icono}
              </svg>
            </span>
            <span className="text-center text-[0.75rem] font-medium leading-tight text-muted-foreground">
              {a.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
