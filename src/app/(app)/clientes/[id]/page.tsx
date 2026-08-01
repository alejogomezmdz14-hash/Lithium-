import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar, ChipSemaforo } from "@/components/semaforo";
import {
  evaluarDocumentacion,
  NOMBRE_TIPO_CLIENTE,
  resumenDocumentacion,
  type DocumentoCargado,
  type TipoCliente,
} from "@/lib/documentacion";
import { fechaConDia, hoyEnBA } from "@/lib/fecha";
import { formatARS } from "@/lib/money";
import type { Semaforo } from "@/lib/por-pagar";
import { createClient } from "@/lib/supabase/server";

import { BorrarDocumento } from "./borrar";
import { BotonSubir } from "./subir";

type Props = { params: Promise<{ id: string }> };

const mesLargo = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

export default async function FichaCliente({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [clienteRes, docsRes, cuotasRes] = await Promise.all([
    supabase
      .from("clientes")
      .select("id,nombre,telefono,notas,tipo,semaforo_efectivo,semaforo_manual,garante_nombre,garante_telefono")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("documentos")
      .select("id,tipo,periodo,subido_el,nombre_archivo,mime")
      .eq("cliente_id", id)
      .order("periodo", { ascending: false, nullsFirst: false }),
    supabase
      .from("cuotas")
      .select("monto,fecha_cobro,creditos!inner(cliente_id)")
      .eq("creditos.cliente_id", id)
      .is("pagado_el", null),
  ]);

  if (clienteRes.error || !clienteRes.data) notFound();

  const cliente = clienteRes.data as {
    id: string;
    nombre: string;
    telefono: string | null;
    notas: string | null;
    tipo: TipoCliente | null;
    semaforo_efectivo: Semaforo;
    semaforo_manual: Semaforo | null;
    garante_nombre: string | null;
    garante_telefono: string | null;
  };

  const documentos = (docsRes.data ?? []) as (DocumentoCargado & {
    nombre_archivo: string | null;
    mime: string | null;
  })[];

  const hoy = hoyEnBA();
  const evaluacion = evaluarDocumentacion(cliente.tipo, documentos, hoy);
  const debe = (cuotasRes.data ?? []).reduce((s, c) => s + Number(c.monto), 0);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-5">
      <Link
        href="/clientes"
        className="inline-flex h-12 items-center text-[0.8125rem] font-semibold text-primary-text"
      >
        ‹ Clientes
      </Link>

      <header className="mt-2 flex items-start gap-3">
        <Avatar nombre={cliente.nombre} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.375rem] font-semibold tracking-[-0.01em] text-foreground">
            {cliente.nombre}
          </h1>
          <p className="mt-1">
            <ChipSemaforo estado={cliente.semaforo_efectivo} esManual={cliente.semaforo_manual !== null} />
          </p>
          {cliente.telefono ? (
            <a
              href={`tel:${cliente.telefono}`}
              className="mt-1 inline-flex h-12 items-center text-[0.8125rem] font-medium text-primary-text"
            >
              {cliente.telefono}
            </a>
          ) : null}
        </div>
      </header>

      <div className="mt-4 grid grid-cols-5 gap-2">
        <section className="col-span-3 rounded-xl bg-card p-5">
          <h2 className="text-[0.8125rem] font-medium text-muted-foreground">Te debe</h2>
          <p className="mt-1 text-[1.375rem] font-semibold leading-[1.1] tracking-[-0.01em] tabular-nums text-foreground">
            {formatARS(debe)}
          </p>
        </section>
        <section className="col-span-2 rounded-xl bg-card p-5">
          <h2 className="text-[0.8125rem] font-medium text-muted-foreground">Tipo</h2>
          <p className="mt-1 text-[0.9375rem] font-semibold text-foreground">
            {cliente.tipo ? NOMBRE_TIPO_CLIENTE[cliente.tipo] : "Sin definir"}
          </p>
        </section>
      </div>

      {cliente.notas ? (
        <section className="mt-2 rounded-xl bg-card p-5">
          <h2 className="text-[0.8125rem] font-medium text-muted-foreground">Observaciones</h2>
          <p className="mt-1 text-[0.9375rem] font-medium text-foreground">{cliente.notas}</p>
        </section>
      ) : null}

      {cliente.garante_nombre || cliente.garante_telefono ? (
        <section className="mt-2 rounded-xl bg-card p-5">
          <h2 className="text-[0.8125rem] font-medium text-muted-foreground">Garante</h2>
          <p className="mt-1 text-[0.9375rem] font-semibold text-foreground">
            {cliente.garante_nombre ?? "Sin nombre"}
          </p>
          {cliente.garante_telefono ? (
            <a
              href={`tel:${cliente.garante_telefono}`}
              className="inline-flex h-12 items-center text-[0.8125rem] font-medium text-primary-text"
            >
              {cliente.garante_telefono}
            </a>
          ) : null}
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      <section className="mt-7">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Documentación
          </h2>
          <span
            className={`text-[0.8125rem] font-medium ${
              evaluacion.faltan > 0
                ? "text-danger"
                : evaluacion.hayDesactualizados
                  ? "text-warning"
                  : "text-muted-foreground"
            }`}
          >
            {resumenDocumentacion(evaluacion, cliente.tipo)}
          </span>
        </div>

        {!cliente.tipo ? (
          <p className="mt-2 rounded-xl bg-card p-5 text-[0.8125rem] font-medium text-muted-foreground">
            Para saber qué papeles pedirle, primero hay que definir de qué tipo es.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {evaluacion.requisitos.map((estado) => {
              const propios = documentos.filter((d) => d.tipo === estado.requisito.tipo);
              return (
                <article key={estado.requisito.tipo} className="rounded-xl bg-card p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[0.9375rem] font-semibold text-foreground">
                      {estado.requisito.label}
                    </h3>
                    <span
                      className={`shrink-0 text-[0.8125rem] font-medium tabular-nums ${
                        estado.cumplido
                          ? estado.desactualizado
                            ? "text-warning"
                            : "text-success"
                          : "text-danger"
                      }`}
                    >
                      {estado.cargados} de {estado.requisito.cantidad}
                    </span>
                  </div>

                  {estado.desactualizado ? (
                    <p className="mt-1 text-[0.8125rem] font-medium text-warning">
                      El más nuevo es de {mesLargo.format(new Date(`${estado.periodoMasNuevo}T00:00:00Z`))}.
                      Conviene pedirle los actuales.
                    </p>
                  ) : null}

                  {propios.length > 0 ? (
                    <ul className="mt-3 flex flex-col gap-2">
                      {propios.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-center justify-between gap-3 rounded-lg bg-surface-raised px-3 py-2.5"
                        >
                          {/* Sin miniaturas: una lista con fotos de DNI se lee
                              de costado en el colectivo (§10.2). Se abre a propósito. */}
                          <a
                            href={`/api/documentos/${doc.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="min-w-0 flex-1 text-[0.8125rem] font-medium text-primary-text"
                          >
                            {doc.periodo
                              ? mesLargo.format(new Date(`${doc.periodo}T00:00:00Z`))
                              : `Subido el ${fechaConDia(doc.subido_el.slice(0, 10))}`}
                          </a>
                          <BorrarDocumento id={doc.id} />
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {!estado.cumplido || estado.desactualizado ? (
                    <BotonSubir
                      clienteId={cliente.id}
                      tipo={estado.requisito.tipo}
                      etiqueta={estado.requisito.singular}
                      pidePeriodo={estado.requisito.pidePeriodo}
                    />
                  ) : null}
                </article>
              );
            })}

            {/* Los papeles del tipo anterior no se borran: se avisan (§10). */}
            {evaluacion.sobrantes.length > 0 ? (
              <article className="rounded-xl bg-card p-5">
                <h3 className="text-[0.9375rem] font-semibold text-foreground">
                  Papeles de antes
                </h3>
                <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
                  Quedaron de cuando era de otro tipo. Ya no se le piden, pero siguen guardados.
                </p>
                <ul className="mt-3 flex flex-col gap-2">
                  {evaluacion.sobrantes.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-surface-raised px-3 py-2.5"
                    >
                      <a
                        href={`/api/documentos/${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 text-[0.8125rem] font-medium text-primary-text"
                      >
                        {doc.periodo
                          ? mesLargo.format(new Date(`${doc.periodo}T00:00:00Z`))
                          : `Subido el ${fechaConDia(doc.subido_el.slice(0, 10))}`}
                      </a>
                      <BorrarDocumento id={doc.id} />
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
