import Link from "next/link";

import { nombreDeMes } from "@/lib/fecha";
import { formatARS } from "@/lib/money";
import { traerResumen } from "@/lib/queries";

export const metadata = { title: "Resumen — Lithium" };

export default async function ResumenPage() {
  const { hoy, resumen, error } = await traerResumen();

  if (error || !resumen) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-8">
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
    <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-8">
      <h1 className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground">Resumen</h1>

      {/* 2-up asimétrico: el único de toda la app (§9.4). 3/2 en 5 columnas. */}
      <div className="mt-5 grid grid-cols-5 gap-2">
        <section className="col-span-3 rounded-xl bg-card p-5">
          <h2 className="text-[0.8125rem] font-medium text-muted-foreground">Me deben</h2>
          <p className="mt-1 text-[2.125rem] font-semibold leading-[1.05] tracking-[-0.02em] tabular-nums text-foreground">
            {formatARS(meDeben)}
          </p>
        </section>

        <section className="col-span-2 rounded-xl bg-card p-5">
          <h2 className="text-[0.8125rem] font-medium text-muted-foreground">Vencido</h2>
          <p className="mt-1 text-[1.375rem] font-semibold leading-[1.1] tracking-[-0.01em] tabular-nums text-foreground">
            {formatARS(vencido.monto)}
          </p>
          {vencido.personas > 0 ? (
            // Se cuenta en personas: ella cuenta gente, no créditos (§9.6).
            <p className="mt-1 text-[0.8125rem] font-medium text-danger">
              {vencido.personas === 1 ? "1 persona" : `${vencido.personas} personas`}
            </p>
          ) : (
            <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">Nadie</p>
          )}
        </section>
      </div>

      {/* Prestado este mes, partido por tipo. Los dos números a la vez, sin
          toggle: un pill que hay que acordarse de tocar es un código a aprender. */}
      <section className="mt-2 rounded-xl bg-card p-5">
        <h2 className="text-[0.8125rem] font-medium text-muted-foreground">
          Prestaste en {nombreDeMes(hoy)}
        </h2>
        <p className="mt-1 text-[1.375rem] font-semibold leading-[1.1] tracking-[-0.01em] tabular-nums text-foreground">
          {formatARS(prestadoEsteMes.total)}
        </p>

        <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[0.8125rem] font-medium text-muted-foreground">Con interés</dt>
            <dd className="font-mono text-[0.875rem] tabular-nums text-foreground">
              {formatARS(prestadoEsteMes.conInteres)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[0.8125rem] font-medium text-muted-foreground">Sin interés</dt>
            <dd className="font-mono text-[0.875rem] tabular-nums text-foreground">
              {formatARS(prestadoEsteMes.sinInteres)}
            </dd>
          </div>
          {interesEsteMes > 0 ? (
            <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
              <dt className="text-[0.8125rem] font-medium text-muted-foreground">
                Vas a ganar de interés
              </dt>
              <dd className="font-mono text-[0.875rem] tabular-nums text-foreground">
                {formatARS(interesEsteMes)}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <Link
        href="/por-pagar"
        className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-card p-5"
      >
        <span className="text-[0.8125rem] font-medium text-muted-foreground">
          Cobrás esta semana
        </span>
        <span className="font-mono text-[1.0625rem] font-medium tabular-nums text-foreground">
          {formatARS(cobroEstaSemana)}
        </span>
      </Link>

      {/* Las deudas pendientes, abajo. Lista COMPLETA con scroll: cortar en
          cinco es cortar justo donde empieza a servir (§9.6). */}
      <section className="mt-7">
        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Quién me debe
        </h2>

        {quienMeDebe.length === 0 ? (
          <p className="mt-2 rounded-xl bg-card p-5 text-[0.8125rem] font-medium text-muted-foreground">
            No te debe nadie.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {quienMeDebe.map((persona) => (
              <li
                key={persona.cliente_id}
                className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3.5"
              >
                <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold tracking-[-0.006em] text-foreground">
                  {persona.nombre}
                </span>
                <span className="shrink-0 font-mono text-[0.875rem] font-medium tabular-nums text-foreground">
                  {formatARS(persona.monto)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
