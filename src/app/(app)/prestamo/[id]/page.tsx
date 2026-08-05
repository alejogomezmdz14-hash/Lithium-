import Link from "next/link";
import { notFound } from "next/navigation";

import { estadoCuotaUI, fechaConDia, hoyEnBA, laQueSigue } from "@/lib/fecha";
import { formatARS } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

import { CambiarFecha, DeshacerCobro, Reprogramar } from "./editar";
import { EditarPrestamo } from "./editar-todo";

export const metadata = { title: "Préstamo — Lithium" };

type Props = { params: Promise<{ id: string }> };

type Cuota = {
  id: string;
  numero: number;
  monto: number | string;
  fecha_cobro: string;
  pagado_el: string | null;
  parcial: boolean;
};

/** Detalle del préstamo y plan de cuotas. Ver CLAUDE.md §9.12. */
export default async function DetallePrestamo({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("creditos")
    .select(
      "id,monto,monto_total,con_interes,tasa,cantidad_cuotas,fecha_otorgado,clientes!inner(id,nombre),cuotas(id,numero,monto,fecha_cobro,pagado_el,parcial)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const credito = data as unknown as {
    id: string;
    monto: number | string;
    monto_total: number | string;
    con_interes: boolean;
    tasa: number | null;
    cantidad_cuotas: number;
    fecha_otorgado: string;
    clientes: { id: string; nombre: string };
    cuotas: Cuota[];
  };

  const hoy = hoyEnBA();
  const cuotas = [...credito.cuotas].sort((a, b) => a.numero - b.numero);
  const cobradas = cuotas.filter((c) => c.pagado_el !== null);
  const saldo = cuotas
    .filter((c) => c.pagado_el === null)
    .reduce((s, c) => s + Number(c.monto), 0);
  const yaCobrado = cobradas.reduce((s, c) => s + Number(c.monto), 0);
  const siguiente = laQueSigue(cuotas);
  const tarde = cobradas.filter(
    (c) => estadoCuotaUI({ fecha_cobro: c.fecha_cobro, pagado_el: c.pagado_el }, hoy) === "cobrada_tarde",
  ).length;

  const unSoloPago = cuotas.length === 1;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-5">
      <Link
        href={`/clientes/${credito.clientes.id}`}
        className="inline-flex h-12 items-center text-[0.8125rem] font-semibold text-primary-text"
      >
        ‹ {credito.clientes.nombre}
      </Link>

      <section className="mt-2 rounded-xl bg-card p-5">
        <h1 className="text-[0.8125rem] font-medium text-muted-foreground">Te deben</h1>
        <p className="mt-1 text-[2.125rem] font-semibold leading-[1.05] tracking-[-0.02em] tabular-nums text-foreground">
          {formatARS(saldo)}
        </p>
        <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
          de {formatARS(Number(credito.monto_total))} · le prestaste{" "}
          {formatARS(Number(credito.monto))}
          {credito.con_interes && credito.tasa ? ` al ${credito.tasa}%` : " sin interés"}
        </p>

        {/* La tira tiene exactamente una marca por cuota: es honesta y no
            necesita leyenda. Nunca un porcentaje (§9.12). */}
        {!unSoloPago ? (
          <>
            <div className="mt-4 flex gap-[3px]" aria-hidden>
              {cuotas.map((c) => (
                <span
                  key={c.id}
                  className={`h-1 flex-1 rounded-sm ${
                    c.pagado_el ? "bg-foreground" : "bg-border"
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-[0.8125rem] font-medium text-muted-foreground">
              {cobradas.length} de {cuotas.length} cobradas
              {tarde > 0 ? ` · ${tarde} ${tarde === 1 ? "llegó tarde" : "llegaron tarde"}` : ""}
            </p>
            {saldo === 0 ? (
              <p className="mt-2 text-[0.9375rem] font-semibold text-success">
                ✓ Terminado. Te pagó todo.
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      {/* Primero lo que más falta con los datos migrados del Excel: ponerles el
          interés y las fechas reales. Reprogramar queda abajo, para cuando el
          préstamo ya está bien cargado y solo hay que correr las cuotas. */}
      <EditarPrestamo
        creditoId={credito.id}
        capitalActual={Number(credito.monto)}
        totalActual={Number(credito.monto_total)}
        tasaActual={credito.tasa}
        yaCobrado={yaCobrado}
        cuotasImpagas={cuotas.length - cobradas.length}
        hoy={hoy}
      />

      <Reprogramar creditoId={credito.id} saldo={saldo} hoy={hoy} />

      <h2 className="mt-7 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {unSoloPago ? "Un solo pago" : `Las ${cuotas.length} cuotas`}
      </h2>

      <ul className="mt-2 flex flex-col gap-2">
        {cuotas.map((cuota) => {
          const estado = estadoCuotaUI(
            { fecha_cobro: cuota.fecha_cobro, pagado_el: cuota.pagado_el },
            hoy,
          );
          const esLaQueSigue = siguiente?.id === cuota.id;
          const cobrada = cuota.pagado_el !== null;
          const conAtraso = estado === "con_atraso";

          return (
            <li
              key={cuota.id}
              className={`relative overflow-hidden rounded-xl ${
                esLaQueSigue ? "bg-surface-raised" : "bg-card"
              } ${cobrada ? "opacity-60" : ""} ${conAtraso ? "pl-4" : ""}`}
            >
              {conAtraso ? (
                <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-danger" />
              ) : null}

              <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] font-semibold text-foreground">
                    {cobrada ? "✓ " : "○ "}
                    {unSoloPago ? "Pago único" : `Cuota ${cuota.numero} de ${cuotas.length}`}
                  </p>
                  <p
                    className={`mt-0.5 text-[0.8125rem] font-medium tabular-nums ${
                      conAtraso ? "text-danger" : "text-foreground"
                    }`}
                  >
                    {cobrada
                      ? `cobrada el ${fechaConDia(cuota.pagado_el!)}`
                      : `vence el ${fechaConDia(cuota.fecha_cobro)}`}
                  </p>
                  {estado === "cobrada_tarde" ? (
                    <p className="mt-0.5 text-[0.8125rem] font-medium text-warning">Llegó tarde</p>
                  ) : null}
                  {cuota.parcial ? (
                    <p className="mt-0.5 text-[0.8125rem] font-medium text-warning">
                      Se cobró de menos
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <span className="font-mono text-[0.875rem] font-medium tabular-nums text-foreground">
                    {formatARS(Number(cuota.monto))}
                  </span>
                  {cobrada ? <DeshacerCobro cuotaId={cuota.id} /> : null}
                </div>

                {/* Botón en TODAS las impagas, no solo en la siguiente: pasa que
                    te pagan la 2 antes que la 1, y obligarla a ir en orden la
                    manda de vuelta al cuaderno. */}
                {!cobrada ? (
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <CambiarFecha cuotaId={cuota.id} fecha={cuota.fecha_cobro} />
                    <Link
                      href={`/cobrar/${cuota.id}`}
                      className={`ml-auto flex h-12 items-center rounded-full px-5 text-[0.8125rem] font-semibold ${
                        esLaQueSigue
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-raised text-primary-text"
                      }`}
                    >
                      Ya me pagó
                    </Link>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
