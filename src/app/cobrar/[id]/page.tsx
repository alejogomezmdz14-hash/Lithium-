import { notFound } from "next/navigation";

import { Aviso } from "@/components/aviso";
import { BotonLink, Volver } from "@/components/boton";
import { Monto } from "@/components/monto";
import { Piedra } from "@/components/superficie";
import { fechaConDia, hoyEnBA } from "@/lib/fecha";
import { createClient } from "@/lib/supabase/server";

import { CobrarForm } from "./cobrar-form";

export const metadata = { title: "Cobrar — Lithium" };

type Props = { params: Promise<{ id: string }> };

/** En Next 15+ `params` es una promesa: hay que esperarla. */
export default async function CobrarPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cuotas")
    .select(
      "id,numero,monto,fecha_cobro,pagado_el,creditos!inner(cantidad_cuotas,clientes!inner(nombre))",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const cuota = data as unknown as {
    id: string;
    numero: number;
    monto: number | string;
    fecha_cobro: string;
    pagado_el: string | null;
    creditos: { cantidad_cuotas: number; clientes: { nombre: string } };
  };

  const nombre = cuota.creditos.clientes.nombre;
  const total = cuota.creditos.cantidad_cuotas;
  const hoy = hoyEnBA();

  if (cuota.pagado_el !== null) {
    return (
      <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
        <Aviso
          tono="calma"
          titulo="Esa cuota ya está cobrada"
          acciones={
            <BotonLink peso="texto" href="/por-pagar" className="justify-center">
              Volver a Por pagar
            </BotonLink>
          }
        >
          La cobraste el {fechaConDia(cuota.pagado_el)}.
        </Aviso>
      </main>
    );
  }

  // El estado se DERIVA en render, nunca se lee de `cuotas.estado`: el cron
  // escribe esa columna a las 9:00, y entre las 00:00 y las 9:00 —o si el cron
  // falla— la pantalla mentiría.
  const vencida = cuota.fecha_cobro < hoy;

  return (
    <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
      <Volver href="/por-pagar">Volver a Por pagar</Volver>

      {/* Lo primero que se lee es A QUIÉN le está cobrando y CUÁNTO. Si tocó la
          fila equivocada tiene que darse cuenta en el primer renglón, no
          después de haber escrito un monto. */}
      <Piedra className="mt-2.5">
        <p className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
          Cobrarle a
        </p>
        <h1 className="mt-1 font-display text-[1.375rem] font-bold tracking-[-0.025em] text-texto">
          {nombre}
        </h1>
        <p className="mt-4 font-display text-[2.75rem] font-bold leading-[0.98] tracking-[-0.04em] text-texto">
          <Monto valor={Number(cuota.monto)} />
        </p>
        <p className="mt-3 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
          {total > 1 ? `Cuota ${cuota.numero} de ${total}` : "Un solo pago"} ·{" "}
          <span className={vencida ? "text-peligro" : "text-texto-suave"}>
            {vencida ? "vencía" : "vence"} el {fechaConDia(cuota.fecha_cobro)}
          </span>
        </p>
      </Piedra>

      <CobrarForm
        cuotaId={cuota.id}
        nombre={nombre}
        numeroCuota={cuota.numero}
        montoCuota={Number(cuota.monto)}
        hoy={hoy}
      />
    </main>
  );
}
