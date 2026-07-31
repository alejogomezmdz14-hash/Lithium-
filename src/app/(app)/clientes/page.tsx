import { formatARS } from "@/lib/money";
import { PALABRA_SEMAFORO, type Semaforo } from "@/lib/por-pagar";
import { traerClientes } from "@/lib/queries";

export const metadata = { title: "Clientes — Lithium" };

/**
 * El color del punto. Regla dura de §9.3: **el hue nunca va solo**, siempre va
 * con la palabra al lado. `nuevo` va sin hue a propósito: mostrarle un color a
 * alguien sin historial es mentir.
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

export default async function ClientesPage() {
  const { clientes, error } = await traerClientes();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-8">
      <h1 className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground">
        Clientes
      </h1>
      <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
        ¿A quién le puedo prestar de nuevo?
      </p>

      {error ? (
        <p className="mt-6 rounded-xl bg-card p-5 text-[0.8125rem] font-medium text-danger">
          No se pudieron traer los clientes: {error}
        </p>
      ) : clientes.length === 0 ? (
        <p className="mt-6 rounded-xl bg-card p-5 text-[0.8125rem] font-medium text-muted-foreground">
          Todavía no cargaste a nadie.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2">
          {clientes.map((cliente) => (
            <li key={cliente.id} className="rounded-xl bg-card px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-semibold tracking-[-0.006em] text-foreground">
                    {cliente.nombre}
                  </p>

                  <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] font-medium">
                    {/* Punto de 8px alineado ópticamente a la altura-x del texto */}
                    <span
                      aria-hidden
                      className={`inline-block size-2 shrink-0 rounded-full ${COLOR[cliente.semaforo]}`}
                    />
                    <span className={TEXTO[cliente.semaforo]}>
                      {PALABRA_SEMAFORO[cliente.semaforo]}
                    </span>
                    {cliente.esManual ? (
                      <span className="text-muted-foreground">— lo pusiste a mano</span>
                    ) : null}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  {cliente.debe > 0 ? (
                    <>
                      <p className="font-mono text-[0.875rem] font-medium tabular-nums text-foreground">
                        {formatARS(cliente.debe)}
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] font-medium text-muted-foreground">
                        te debe
                      </p>
                    </>
                  ) : (
                    <p className="text-[0.8125rem] font-medium text-muted-foreground">al día</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
