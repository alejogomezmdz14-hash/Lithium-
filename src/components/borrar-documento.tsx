"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { borrarDocumento } from "@/app/acciones-documentos";

/**
 * Borrar un documento SÍ pide confirmación: solo lo irreversible la lleva, y
 * esto lo es — el archivo se va de Storage y no hay deshacer.
 *
 * Va en `destructivo`, que es un rojo distinto del de la urgencia a propósito:
 * `peligro` dice "esto te vence", `destructivo` dice "esto no vuelve".
 */
export function BorrarDocumento({ id }: { id: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    // Nada se deshabilita: el segundo toque se ignora acá y la etiqueta dice
    // que está trabajando.
    if (borrando) return;
    setBorrando(true);
    setError(null);
    const { error } = await borrarDocumento(id);
    if (error) {
      setError(error);
      setBorrando(false);
      setConfirmando(false);
      return;
    }
    router.refresh();
  }

  if (error) {
    return (
      <span role="alert" className="text-[0.875rem] font-medium tracking-[-0.006em] text-peligro">
        {error}
      </span>
    );
  }

  if (confirmando) {
    return (
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={confirmar}
          className="h-12 px-2 text-[0.875rem] font-semibold tracking-[-0.006em] text-destructivo"
        >
          {borrando ? "Borrando…" : "Sí, borrar"}
        </button>
        <button
          type="button"
          onClick={() => (borrando ? undefined : setConfirmando(false))}
          className="h-12 px-2 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      className="h-12 shrink-0 px-2 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave"
    >
      Borrar
    </button>
  );
}
