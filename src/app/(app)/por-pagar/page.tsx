import Link from "next/link";

import { fechaConDia } from "@/lib/fecha";
import { formatARS } from "@/lib/money";
import { lineaMeta, type FilaPersona, type Grupo } from "@/lib/por-pagar";
import { traerPorPagar } from "@/lib/queries";

export const metadata = { title: "Por pagar — Lithium" };

/** El home ES "Por pagar" (§9.0): lo primero que ve al desbloquear el teléfono. */
export default async function PorPagar() {
  const { hoy, grupos, proximo, despuesDeLaSemana, error } = await traerPorPagar();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-5">
      <h1 className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground">
        Por pagar
      </h1>

      {error ? (
        <p className="mt-6 rounded-xl bg-card p-5 text-[0.8125rem] font-medium text-danger">
          No se pudieron traer los cobros: {error}
        </p>
      ) : grupos.length === 0 ? (
        <EstadoVacio proximo={proximo} />
      ) : (
        <div className="mt-6 flex flex-col gap-7">
          {grupos.map((grupo) => (
            <GrupoDeCobros key={grupo.bucket} grupo={grupo} hoy={hoy} />
          ))}
        </div>
      )}

      {grupos.length > 0 && despuesDeLaSemana ? (
        <p className="mt-8 text-[0.8125rem] font-medium text-muted-foreground">
          Después de esta semana, el próximo es el {fechaConDia(despuesDeLaSemana.fecha_cobro)} —{" "}
          {despuesDeLaSemana.nombre}.
        </p>
      ) : null}
    </main>
  );
}

function GrupoDeCobros({ grupo, hoy }: { grupo: Grupo; hoy: string }) {
  const urgente = grupo.bucket === "vencidos" || grupo.bucket === "mora_vieja";
  const personas = grupo.cantidadPersonas === 1 ? "1 persona" : `${grupo.cantidadPersonas} personas`;

  const cuerpo = (
    <div className="mt-2 flex flex-col gap-2">
      {grupo.personas.map((persona) => (
        <Fila
          key={`${grupo.bucket}-${persona.cliente_id}`}
          persona={persona}
          hoy={hoy}
          urgente={urgente}
          bucket={grupo.bucket}
        />
      ))}
    </div>
  );

  // El header cuenta PERSONAS y trae subtotal: se gana el lugar que ocupa (§9.5).
  const encabezado = (
    <>
      {grupo.titulo.toUpperCase()} · {personas} ·{" "}
      <span className="tabular-nums">{formatARS(grupo.total)}</span>
    </>
  );

  if (grupo.colapsadoPorDefecto) {
    return (
      <details className="group">
        <summary className="cursor-pointer list-none text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {encabezado} <span className="ml-1 normal-case tracking-normal">▸</span>
        </summary>
        {cuerpo}
      </details>
    );
  }

  return (
    <section>
      <h2 className="sticky top-0 z-10 bg-background py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {encabezado}
      </h2>
      {cuerpo}
    </section>
  );
}

function Fila({
  persona,
  hoy,
  urgente,
  bucket,
}: {
  persona: FilaPersona;
  hoy: string;
  urgente: boolean;
  bucket: Grupo["bucket"];
}) {
  // La urgencia la lleva una barra de 3px, NO el color del monto: en rojo el
  // monto queda 2.6x más apagado que en blanco y rompe la columna (§9.2).
  return (
    <article
      className={`relative overflow-hidden rounded-xl bg-card ${urgente ? "pl-4" : ""}`}
    >
      {urgente ? (
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-danger" />
      ) : null}

      <div className="flex items-start justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <Link
            href={`/prestamo/${persona.cuotas[0].credito_id}`}
            className="block truncate text-[0.9375rem] font-semibold tracking-[-0.006em] text-foreground"
          >
            {persona.nombre} ›
          </Link>

          <p
            className={`mt-0.5 text-[0.8125rem] font-medium tabular-nums ${
              urgente ? "text-danger" : "text-foreground"
            }`}
          >
            {lineaMeta(persona, hoy, bucket)}
          </p>

          {/* La nota solo aparece si existe: es lo que cambia CÓMO cobrarle. */}
          {persona.notas ? (
            <p className="mt-2 text-[0.8125rem] font-medium text-muted-foreground">
              {persona.notas}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="font-mono text-[0.875rem] font-medium tracking-[-0.01em] tabular-nums text-foreground">
            {formatARS(persona.total)}
          </span>
          <Link
            href={`/cobrar/${persona.cuotas[0].id}`}
            className="flex h-12 items-center rounded-full bg-primary px-4 text-[0.8125rem] font-semibold text-primary-foreground"
          >
            {persona.cuotas.length > 1 ? `Cobrar las ${persona.cuotas.length}` : "Ya me pagó"}
          </Link>
        </div>
      </div>
    </article>
  );
}

function EstadoVacio({ proximo }: { proximo: { nombre: string; monto: number; fecha_cobro: string } | null }) {
  return (
    <div className="mt-6 rounded-xl bg-card p-5">
      <p className="text-[0.9375rem] font-semibold text-foreground">Estás al día.</p>
      <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
        {proximo ? (
          <>
            El próximo cobro es el {fechaConDia(proximo.fecha_cobro)} — {proximo.nombre},{" "}
            <span className="tabular-nums">{formatARS(proximo.monto)}</span>.
          </>
        ) : (
          "No tenés ningún cobro pendiente."
        )}
      </p>
    </div>
  );
}
