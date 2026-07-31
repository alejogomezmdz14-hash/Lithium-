import Link from "next/link";

/**
 * La fila de círculos de acción del referente (§9.4).
 *
 * **Solo acciones, nunca destinos**, y no pesan igual: `Nueva deuda` ocupa el
 * doble de ancho y va sola en su fila. Los tabs de abajo son para navegar; esto
 * es para hacer.
 */

function Circulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-12 items-center justify-center rounded-full bg-primary-tint text-primary-text">
      {children}
    </span>
  );
}

const trazo = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function FilaDeAcciones() {
  return (
    <div className="mt-5 flex flex-col gap-2">
      <Link
        href="/nuevo-prestamo"
        className="flex items-center gap-3 rounded-xl bg-card px-4 py-3.5"
      >
        <Circulo>
          <svg viewBox="0 0 24 24" className="size-[21px]" {...trazo}>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Circulo>
        <span className="flex-1 text-[0.9375rem] font-semibold text-foreground">Nueva deuda</span>
        <span className="text-[0.8125rem] font-medium text-muted-foreground">
          Prestarle a alguien
        </span>
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/por-pagar"
          className="flex flex-col items-start gap-2 rounded-xl bg-card px-4 py-3.5"
        >
          <Circulo>
            <svg viewBox="0 0 24 24" className="size-[21px]" {...trazo}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </Circulo>
          <span className="text-[0.8125rem] font-semibold text-foreground">Ya me pagó</span>
        </Link>

        <Link
          href="/nuevo-cliente"
          className="flex flex-col items-start gap-2 rounded-xl bg-card px-4 py-3.5"
        >
          <Circulo>
            <svg viewBox="0 0 24 24" className="size-[21px]" {...trazo}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6" />
            </svg>
          </Circulo>
          <span className="text-[0.8125rem] font-semibold text-foreground">Cliente nuevo</span>
        </Link>
      </div>
    </div>
  );
}
