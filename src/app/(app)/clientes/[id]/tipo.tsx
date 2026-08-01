"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { NOMBRE_TIPO_CLIENTE, REQUISITOS, type TipoCliente } from "@/lib/documentacion";

import { cambiarTipo } from "./actions";

const TIPOS = Object.keys(NOMBRE_TIPO_CLIENTE) as TipoCliente[];

const campo =
  "h-12 w-full rounded-lg border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-subtle";

export function SelectorDeTipo({
  clienteId,
  actual,
  garanteNombre,
  garanteTelefono,
}: {
  clienteId: string;
  actual: TipoCliente | null;
  garanteNombre: string | null;
  garanteTelefono: string | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(actual === null);
  const [elegido, setElegido] = useState<TipoCliente | null>(actual);
  const [nombre, setNombre] = useState(garanteNombre ?? "");
  const [telefono, setTelefono] = useState(garanteTelefono ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();

  function guardar(tipo: TipoCliente | null) {
    setElegido(tipo);
    setError(null);
    empezar(async () => {
      const r = await cambiarTipo(clienteId, tipo, { nombre, telefono });
      if (r.error) {
        setError(r.error);
        return;
      }
      setAbierto(false);
      router.refresh();
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-2 h-12 text-[0.8125rem] font-semibold text-primary-text"
      >
        Cambiar el tipo de cliente
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl bg-card p-5">
      <p className="text-[0.9375rem] font-semibold text-foreground">Tipo de cliente</p>
      <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
        Determina qué documentación hay que pedirle.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {TIPOS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => guardar(t)}
            disabled={guardando}
            className={`h-12 rounded-full px-4 text-[0.8125rem] font-semibold disabled:opacity-60 ${
              elegido === t
                ? "bg-primary text-primary-foreground"
                : "bg-surface-raised text-muted-foreground"
            }`}
          >
            {NOMBRE_TIPO_CLIENTE[t]}
          </button>
        ))}
      </div>

      {elegido ? (
        <div className="mt-3 rounded-lg bg-surface-raised p-4">
          <p className="text-[0.8125rem] font-medium text-muted-foreground">
            Documentación a presentar:
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {REQUISITOS[elegido].map((r) => (
              <li key={r.tipo} className="text-[0.8125rem] font-medium text-foreground">
                · {r.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* El garante se pide en PAMI, y nunca es obligatorio. */}
      {elegido === "pami" ? (
        <div className="mt-3">
          <p className="text-[0.9375rem] font-semibold text-foreground">Garante</p>
          <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
            Opcional. Si alguna vez hay que reclamarle, vas a necesitar el teléfono.
          </p>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoCapitalize="words"
            disabled={guardando}
            placeholder="Nombre del garante"
            className={`${campo} mt-2`}
          />
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            type="tel"
            inputMode="tel"
            disabled={guardando}
            placeholder="Su teléfono"
            className={`${campo} mt-2`}
          />
          <button
            type="button"
            onClick={() => guardar("pami")}
            disabled={guardando}
            className="mt-3 h-12 w-full rounded-full bg-primary text-[0.8125rem] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar el garante"}
          </button>
        </div>
      ) : null}

      <p
        role="alert"
        aria-live="polite"
        className={`mt-2 text-[0.8125rem] font-medium text-danger ${error ? "" : "sr-only"}`}
      >
        {error ?? ""}
      </p>

      {actual !== null ? (
        <button
          type="button"
          onClick={() => setAbierto(false)}
          disabled={guardando}
          className="mt-1 h-12 text-[0.8125rem] font-medium text-muted-foreground"
        >
          Cancelar
        </button>
      ) : null}
    </div>
  );
}
