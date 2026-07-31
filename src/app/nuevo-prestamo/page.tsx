import Link from "next/link";

import { hoyEnBA } from "@/lib/fecha";
import { traerClientes } from "@/lib/queries";

import { PrestamoForm } from "./prestamo-form";

export const metadata = { title: "Nueva deuda — Lithium" };

export default async function NuevoPrestamoPage() {
  const { clientes, error } = await traerClientes();

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-16 pt-8">
      <Link
        href="/"
        className="inline-flex h-12 items-center text-[0.8125rem] font-semibold text-primary-text"
      >
        ‹ Volver
      </Link>

      <h1 className="mt-2 text-[1.375rem] font-semibold tracking-[-0.01em] text-foreground">
        Nueva deuda
      </h1>
      <p className="mb-6 mt-1 text-[0.8125rem] font-medium text-muted-foreground">
        Cargá cuánto le prestás y cómo te lo devuelve.
      </p>

      {error ? (
        <p className="rounded-xl bg-card p-5 text-[0.8125rem] font-medium text-danger">{error}</p>
      ) : clientes.length === 0 ? (
        <div className="rounded-xl bg-card p-5">
          <p className="text-[0.9375rem] font-semibold text-foreground">
            Primero cargá a la persona.
          </p>
          <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
            No se puede prestar a alguien que no está en la lista.
          </p>
          <Link
            href="/nuevo-cliente"
            className="mt-4 inline-flex h-12 items-center rounded-full bg-primary px-5 text-[0.8125rem] font-semibold text-primary-foreground"
          >
            Cargar un cliente
          </Link>
        </div>
      ) : (
        <PrestamoForm
          clientes={clientes.map((c) => ({ id: c.id, nombre: c.nombre }))}
          hoy={hoyEnBA()}
        />
      )}
    </main>
  );
}
