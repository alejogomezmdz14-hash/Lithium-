import Link from "next/link";
import { notFound } from "next/navigation";

import { hoyEnBA } from "@/lib/fecha";
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

  if (cuota.pagado_el !== null) {
    return (
      <main className="mx-auto w-full max-w-md px-5 py-10">
        <h1 className="text-[1.0625rem] font-semibold text-foreground">Esa cuota ya está cobrada</h1>
        <p className="mt-2 text-[0.8125rem] font-medium text-muted-foreground">
          La cobraste el {cuota.pagado_el}.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-12 items-center text-[0.8125rem] font-semibold text-primary-text"
        >
          Volver a Por pagar
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-16 pt-8">
      <Link
        href="/"
        className="inline-flex h-12 items-center text-[0.8125rem] font-semibold text-primary-text"
      >
        ‹ Volver
      </Link>

      {/* El nombre va primero y grande: el sheet tiene que decir a QUIÉN le está
          cobrando antes que cualquier otra cosa (§9.13). */}
      <h1 className="mt-2 text-[1.375rem] font-semibold tracking-[-0.01em] text-foreground">
        Cobrarle a {nombre}
      </h1>
      <p className="mb-8 mt-1 text-[0.8125rem] font-medium text-muted-foreground">
        {total > 1 ? `Cuota ${cuota.numero} de ${total}` : "Un solo pago"}
      </p>

      <CobrarForm cuotaId={cuota.id} montoCuota={Number(cuota.monto)} hoy={hoyEnBA()} />
    </main>
  );
}
