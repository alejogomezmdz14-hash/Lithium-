import Link from "next/link";

import { Avatar, ChipSemaforo } from "@/components/semaforo";
import { formatARS } from "@/lib/money";
import { PALABRA_SEMAFORO, type Semaforo } from "@/lib/por-pagar";
import { traerClientes, type FilaCliente } from "@/lib/queries";

export const metadata = { title: "Clientes — Lithium" };

/**
 * Secciones por semáforo, peor primero. Agrupar en vez de una lista plana es lo
 * que hace que la pregunta "¿a quién le presto?" se conteste de un barrido:
 * el grupo ya dice la respuesta, la fila solo dice quién.
 */
const SECCIONES: { estado: Semaforo; bajada: string }[] = [
  { estado: "rojo", bajada: "Te deben plata vencida" },
  { estado: "naranja", bajada: "Te pagan, pero tarde o de a poco" },
  { estado: "nuevo", bajada: "Todavía no te pagaron nada" },
  { estado: "verde", bajada: "Te pagaron todo, siempre a tiempo" },
];

export default async function ClientesPage() {
  const { clientes, error } = await traerClientes();

  const porEstado = new Map<Semaforo, FilaCliente[]>();
  for (const cliente of clientes) {
    const lista = porEstado.get(cliente.semaforo) ?? [];
    lista.push(cliente);
    porEstado.set(cliente.semaforo, lista);
  }

  const totalDeuda = clientes.reduce((suma, c) => suma + c.debe, 0);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground">
            Clientes
          </h1>
          <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
            ¿A quién le puedo prestar de nuevo?
          </p>
        </div>
        <Link
          href="/nuevo-cliente"
          className="flex h-12 shrink-0 items-center rounded-full bg-primary px-4 text-[0.8125rem] font-semibold text-primary-foreground"
        >
          Nuevo
        </Link>
      </div>

      {clientes.length > 0 ? (
        <div className="mt-5 flex items-baseline justify-between gap-3 rounded-xl bg-card px-4 py-3.5">
          <span className="text-[0.8125rem] font-medium text-muted-foreground">
            {clientes.length === 1 ? "1 cliente" : `${clientes.length} clientes`}
          </span>
          <span className="font-mono text-[0.875rem] font-medium tabular-nums text-foreground">
            {formatARS(totalDeuda)} en la calle
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-xl bg-card p-5 text-[0.8125rem] font-medium text-danger">
          No se pudieron traer los clientes: {error}
        </p>
      ) : clientes.length === 0 ? (
        <div className="mt-6 rounded-xl bg-card p-5">
          <p className="text-[0.9375rem] font-semibold text-foreground">Todavía no cargaste a nadie.</p>
          <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
            Empezá por la persona a la que le vas a prestar.
          </p>
          <Link
            href="/nuevo-cliente"
            className="mt-4 inline-flex h-12 items-center rounded-full bg-primary px-5 text-[0.8125rem] font-semibold text-primary-foreground"
          >
            Cargar el primero
          </Link>
        </div>
      ) : (
        <div className="mt-7 flex flex-col gap-7">
          {SECCIONES.map(({ estado, bajada }) => {
            const grupo = porEstado.get(estado);
            // Las secciones vacías no se renderizan.
            if (!grupo || grupo.length === 0) return null;

            return (
              <section key={estado}>
                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {PALABRA_SEMAFORO[estado]} · {grupo.length}
                </h2>
                <p className="mt-0.5 text-[0.8125rem] font-medium text-muted-subtle">{bajada}</p>

                <ul className="mt-2 flex flex-col gap-2">
                  {grupo.map((cliente) => (
                    <li key={cliente.id} className="flex items-center gap-3 rounded-xl bg-card px-4 py-3.5">
                      <Avatar nombre={cliente.nombre} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.9375rem] font-semibold tracking-[-0.006em] text-foreground">
                          {cliente.nombre}
                        </p>
                        <p className="mt-0.5">
                          {/* Dentro de la sección la palabra ya la dice el header,
                              así que acá va solo el punto — salvo que el color lo
                              haya puesto ella a mano, que sí es información nueva. */}
                          <ChipSemaforo
                            estado={cliente.semaforo}
                            esManual={cliente.esManual}
                            soloPunto={!cliente.esManual}
                          />
                          {!cliente.esManual && cliente.telefono ? (
                            <span className="text-[0.8125rem] font-medium text-muted-foreground">
                              {cliente.telefono}
                            </span>
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
                          <p className="text-[0.8125rem] font-medium text-muted-foreground">
                            no te debe
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
