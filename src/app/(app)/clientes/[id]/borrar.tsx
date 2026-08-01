"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { borrarDocumento } from "./actions";

/**
 * Borrar un documento SÍ pide confirmación: §9.0 dice que solo lo irreversible
 * la lleva, y esto lo es — el archivo se va de Storage y no hay deshacer.
 */
export function BorrarDocumento({ id }: { id: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
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
    return <span className="text-[0.8125rem] font-medium text-danger">{error}</span>;
  }

  if (confirmando) {
    return (
      <span className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={confirmar}
          disabled={borrando}
          className="h-12 px-2 text-[0.8125rem] font-semibold text-destructive disabled:opacity-60"
        >
          {borrando ? "Borrando…" : "Sí, borrar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={borrando}
          className="h-12 px-2 text-[0.8125rem] font-medium text-muted-foreground"
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
      className="h-12 shrink-0 px-2 text-[0.8125rem] font-medium text-muted-foreground"
    >
      Borrar
    </button>
  );
}
