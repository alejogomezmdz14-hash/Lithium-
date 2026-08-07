import Link from "next/link";

import { FilaDeAcciones } from "@/components/acciones";
import { Avatar, ChipSemaforo } from "@/components/semaforo";
import { nombreDeMes } from "@/lib/fecha";
import { formatARS } from "@/lib/money";
import { traerResumen } from "@/lib/queries";

export const metadata = { title: "Resumen — Lithium" };

export default async function ResumenPage() {
  const { hoy, resumen, error } = await traerResumen();

  if (error || !resumen) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-5">
        <h1 className="text-[1.0625rem] font-semibold text-foreground">Resumen</h1>
        <p className="mt-6 rounded-xl bg-card p-5 text-[0.8125rem] font-medium text-danger">
          No se pudo traer el resumen: {error}
        </p>
      </main>
    );
  }

  const { prestadoEsteMes, interesEsteMes, meDeben, vencido, cobroEstaSemana, quienMeDebe } =
    resumen;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-5">
      {/* El número héroe va suelto sobre el canvas, sin tarjeta: es lo primero
          que se lee y una caja alrededor solo le resta aire. */}
      <section className="mt-2">
        <p className="text-[0.8125rem] font-medium text-muted-foreground">Me deben</p>
        <p className="mt-1 text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.03em] tabular-nums text-foreground">
          {formatARS(meDeben)}
        </p>
        <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
          {resumen.personasQueDeben === 1
            ? "1 persona"
            : `${resumen.personasQueDeben} personas`}
          {vencido.monto > 0 ? (
            <>
              {" · "}
              <span className="text-danger">{formatARS(vencido.monto)} vencido</span>
            </>
          ) : null}
        </p>
      </section>

      <FilaDeAcciones />

      {/* Los números del negocio en UNA sola tarjeta, como filas de una lista.
          Antes eran tres tarjetas apiladas con títulos repetidos: más cajas que
          datos. */}
      <section className="mt-7 rounded-xl bg-card p-5">
        <dl className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[0.8125rem] font-medium text-muted-foreground">
              Tu capital en la calle
            </dt>
            <dd className="font-mono text-[0.9375rem] font-medium tabular-nums text-foreground">
              {formatARS(resumen.capitalEnLaCalle)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[0.8125rem] font-medium text-muted-foreground">
              Interés por cobrar
            </dt>
            <dd className="font-mono text-[0.9375rem] font-medium tabular-nums text-foreground">
              {formatARS(resumen.interesPorCobrar)}
            </dd>
          </div>

          <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-3">
            <dt className="text-[0.8125rem] font-medium text-muted-foreground">
              Prestaste en {nombreDeMes(hoy)}
              {prestadoEsteMes.personas > 0 ? (
                <span className="text-muted-subtle">
                  {" "}
                  · {prestadoEsteMes.personas}{" "}
                  {prestadoEsteMes.personas === 1 ? "persona" : "personas"}
                </span>
              ) : null}
            </dt>
            <dd className="font-mono text-[0.9375rem] font-medium tabular-nums text-foreground">
              {formatARS(prestadoEsteMes.total)}
            </dd>
          </div>
          {interesEsteMes > 0 ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[0.8125rem] font-medium text-muted-foreground">
                Vas a ganar de interés
              </dt>
              <dd className="font-mono text-[0.9375rem] font-medium tabular-nums text-foreground">
                {formatARS(interesEsteMes)}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <Link
        href="/por-pagar"
        className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-card px-5 py-4"
      >
        <span className="text-[0.8125rem] font-medium text-muted-foreground">
          Cobrás esta semana
        </span>
        <span className="font-mono text-[0.9375rem] font-medium tabular-nums text-foreground">
          {formatARS(cobroEstaSemana)} ›
        </span>
      </Link>

      {/* Las deudas pendientes, abajo. Lista COMPLETA con scroll: cortar en
          cinco es cortar justo donde empieza a servir (§9.6). */}
      <section className="mt-7">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Quién me debe
          </h2>
          {quienMeDebe.length > 0 ? (
            <span className="text-[0.8125rem] font-medium tabular-nums text-muted-foreground">
              {quienMeDebe.length === 1 ? "1 persona" : `${quienMeDebe.length} personas`}
            </span>
          ) : null}
        </div>

        {quienMeDebe.length === 0 ? (
          <p className="mt-2 rounded-xl bg-card p-5 text-[0.8125rem] font-medium text-muted-foreground">
            No te debe nadie.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {quienMeDebe.map((persona) => (
              <li key={persona.cliente_id}>
                <Link
                  href="/clientes"
                  className="flex items-center gap-3 rounded-xl bg-card px-4 py-3.5"
                >
                  <Avatar nombre={persona.nombre} />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-semibold tracking-[-0.006em] text-foreground">
                      {persona.nombre}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2">
                      <ChipSemaforo estado={persona.semaforo} />
                      {persona.cuotasVencidas > 0 ? (
                        <span className="text-[0.8125rem] font-medium text-danger">
                          {persona.cuotasVencidas === 1
                            ? "1 cuota vencida"
                            : `${persona.cuotasVencidas} cuotas vencidas`}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <span className="shrink-0 font-mono text-[0.875rem] font-medium tabular-nums text-foreground">
                    {formatARS(persona.monto)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
