"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { NOMBRE_TIPO_CLIENTE, REQUISITOS, type TipoCliente } from "@/lib/documentacion";

import { crearCliente, type EstadoNuevoCliente } from "./actions";

const INICIAL: EstadoNuevoCliente = { error: null };

const campo =
  "h-12 w-full rounded-lg border border-border bg-card px-4 text-base text-foreground placeholder:text-muted-subtle disabled:opacity-60";

const TIPOS = Object.keys(NOMBRE_TIPO_CLIENTE) as TipoCliente[];

export default function NuevoClientePage() {
  const [estado, accion, enviando] = useActionState(crearCliente, INICIAL);
  const [tipo, setTipo] = useState<TipoCliente | "">("");

  const requisitos = tipo ? REQUISITOS[tipo] : [];

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
        Con el nombre alcanza para guardarlo. El resto se puede completar después.
      </p>

      <form action={accion} className="flex flex-col gap-5">
        <input type="hidden" name="tipo" value={tipo} />

        <div className="flex flex-col gap-1">
          <label htmlFor="nombre" className="text-[0.9375rem] font-semibold text-foreground">
            Nombre y apellido
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

        {/* El tipo define qué papeles pedirle. Se puede dejar sin elegir: frenar
            un alta por una clasificación sería fricción de más (§9.0). */}
        <fieldset className="flex flex-col gap-1">
          <legend className="text-[0.9375rem] font-semibold text-foreground">Tipo de cliente</legend>
          <p className="text-[0.8125rem] font-medium text-muted-foreground">
            Determina qué documentación hay que pedirle. Se puede completar después.
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(tipo === t ? "" : t)}
                disabled={enviando}
                className={`h-12 rounded-full px-4 text-[0.8125rem] font-semibold ${
                  tipo === t ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                }`}
              >
                {NOMBRE_TIPO_CLIENTE[t]}
              </button>
            ))}
          </div>

          {/* Decir qué papeles va a pedir ANTES de guardar: así sabe qué tiene
              que juntar mientras la persona está enfrente. */}
          {requisitos.length > 0 ? (
            <div className="mt-3 rounded-xl bg-card p-4">
              <p className="text-[0.8125rem] font-medium text-muted-foreground">
                Documentación a presentar:
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {requisitos.map((r) => (
                  <li key={r.tipo} className="text-[0.8125rem] font-medium text-foreground">
                    · {r.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </fieldset>

        {/* El garante aparece solo en PAMI, que es donde se pide — pero los
            campos NUNCA son obligatorios. */}
        {tipo === "pami" ? (
          <fieldset className="flex flex-col gap-1 rounded-xl bg-card p-4">
            <legend className="px-1 text-[0.9375rem] font-semibold text-foreground">Garante</legend>
            <p className="text-[0.8125rem] font-medium text-muted-foreground">
              Opcional. Si alguna vez hay que reclamarle, vas a necesitar el teléfono.
            </p>
            <input
              name="garante_nombre"
              autoCapitalize="words"
              disabled={enviando}
              placeholder="Nombre del garante"
              className={`${campo} mt-2 bg-background`}
            />
            <input
              name="garante_telefono"
              type="tel"
              inputMode="tel"
              disabled={enviando}
              placeholder="Su teléfono"
              className={`${campo} mt-2 bg-background`}
            />
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-1">
          <label htmlFor="notas" className="text-[0.9375rem] font-semibold text-foreground">
            Observaciones
          </label>
          <p className="text-[0.8125rem] font-medium text-muted-foreground">
            Aparecen en la lista de cobros. Para lo que cambia cómo cobrarle.
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
