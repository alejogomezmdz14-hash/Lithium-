"use client";

import Link from "next/link";
import { useActionState } from "react";

import { crearCliente, type EstadoNuevoCliente } from "./actions";

const INICIAL: EstadoNuevoCliente = { error: null };

const campo =
  "h-12 w-full rounded-lg border border-border bg-card px-4 text-base text-foreground placeholder:text-muted-subtle disabled:opacity-60";

export default function NuevoClientePage() {
  const [estado, accion, enviando] = useActionState(crearCliente, INICIAL);

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-16 pt-8">
      <Link
        href="/clientes"
        className="inline-flex h-12 items-center text-[0.8125rem] font-semibold text-primary-text"
      >
        ‹ Volver
      </Link>

      <h1 className="mt-2 text-[1.375rem] font-semibold tracking-[-0.01em] text-foreground">
        Cliente nuevo
      </h1>
      <p className="mb-8 mt-1 text-[0.8125rem] font-medium text-muted-foreground">
        Con el nombre alcanza. El resto lo podés completar después.
      </p>

      <form action={accion} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="nombre" className="text-[0.9375rem] font-semibold text-foreground">
            ¿Cómo se llama?
          </label>
          <input
            id="nombre"
            name="nombre"
            required
            autoFocus
            autoCapitalize="words"
            enterKeyHint="next"
            disabled={enviando}
            placeholder="Marta Suárez"
            className={campo}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="telefono" className="text-[0.9375rem] font-semibold text-foreground">
            Teléfono
          </label>
          <p className="text-[0.8125rem] font-medium text-muted-foreground">
            Para poder escribirle cuando se atrase.
          </p>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            inputMode="tel"
            enterKeyHint="next"
            disabled={enviando}
            placeholder="+54 9 261 111 1111"
            className={`${campo} mt-1`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="notas" className="text-[0.9375rem] font-semibold text-foreground">
            Lo que sepas de esta persona
          </label>
          <p className="text-[0.8125rem] font-medium text-muted-foreground">
            Aparece en la lista de cobros. Sirve para lo que cambia cómo cobrarle.
          </p>
          <textarea
            id="notas"
            name="notas"
            rows={3}
            disabled={enviando}
            placeholder="Paga los días 3 — no atiende, mandale mensaje"
            className="mt-1 w-full rounded-lg border border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-subtle disabled:opacity-60"
          />
        </div>

        <p
          role="alert"
          aria-live="polite"
          className={`text-[0.8125rem] font-medium text-danger ${estado.error ? "" : "sr-only"}`}
        >
          {estado.error ?? ""}
        </p>

        <button
          type="submit"
          disabled={enviando}
          className="h-14 rounded-full bg-primary text-[0.9375rem] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {enviando ? "Guardando…" : "Guardar el cliente"}
        </button>
      </form>
    </main>
  );
}
