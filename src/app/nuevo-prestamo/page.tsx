import { Aviso } from "@/components/aviso";
import { BotonLink, Volver } from "@/components/boton";
import { hoyEnBA } from "@/lib/fecha";
import { traerClientes } from "@/lib/queries";

import { PrestamoForm } from "./prestamo-form";

export const metadata = { title: "Nueva deuda — Lithium" };

export default async function NuevoPrestamoPage() {
  const { clientes, error } = await traerClientes();

  return (
    <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
      <Volver href="/">Volver al resumen</Volver>

      <h1 className="mt-2.5 font-display text-[1.375rem] font-bold tracking-[-0.025em] text-texto">
        Nueva deuda
      </h1>
      <p className="mt-1 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
        Cargá cuánto le prestás y cómo te lo devuelve.
      </p>

      <div className="mt-8">
        {error ? (
          <Aviso tono="error" titulo="No se pudo traer la lista de clientes">
            {error}
          </Aviso>
        ) : clientes.length === 0 ? (
          <Aviso
            tono="calma"
            titulo="Primero cargá a la persona"
            // `texto` y no relleno: salir de un aviso hacia otra pantalla es
            // navegación, y el relleno de marca está reservado al botón que
            // completa la tarea de la pantalla donde vive.
            acciones={
              <BotonLink peso="texto" href="/nuevo-cliente">
                Cliente nuevo
              </BotonLink>
            }
          >
            No se puede prestar a alguien que no está en la lista.
          </Aviso>
        ) : (
          <PrestamoForm
            clientes={clientes.map((c) => ({
              id: c.id,
              nombre: c.nombre,
              semaforo: c.semaforo,
              tipo: c.tipo,
              papeles: c.tipo ? c.papeles : null,
              papelesOk: c.papelesOk,
            }))}
            hoy={hoyEnBA()}
          />
        )}
      </div>
    </main>
  );
}
