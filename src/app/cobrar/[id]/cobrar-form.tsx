"use client";

import { useActionState, useId, useState } from "react";

import { formatARS, parseARS } from "@/lib/money";

import { cobrar, type EstadoCobro } from "./actions";

const INICIAL: EstadoCobro = { error: null };

export function CobrarForm({
  cuotaId,
  montoCuota,
  hoy,
}: {
  cuotaId: string;
  montoCuota: number;
  hoy: string;
}) {
  const [estado, accion, enviando] = useActionState(cobrar, INICIAL);
  const [montoTexto, setMontoTexto] = useState(formatARS(montoCuota).replace("$", ""));
  const [cuando, setCuando] = useState<"hoy" | "ayer" | "otro">("hoy");
  const idMonto = useId();

  const ingresado = parseARS(montoTexto);
  const resto = ingresado !== null && ingresado > 0 ? montoCuota - ingresado : 0;
  const esParcial = resto > 0;
  const deMas = ingresado !== null && ingresado > montoCuota;

  return (
    <form action={accion} className="flex flex-col gap-6">
      <input type="hidden" name="cuota_id" value={cuotaId} />

      <div className="flex flex-col gap-2">
        <label htmlFor={idMonto} className="text-[0.9375rem] font-semibold text-foreground">
          ¿Cuánto te dio?
        </label>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4">
          <span className="font-mono text-[1.25rem] text-muted-foreground">$</span>
          <input
            id={idMonto}
            name="monto"
            // type="text" y no "number": el number trae spinners, cambia de valor
            // con la rueda del mouse y rompe el decimal según el locale (§9.1).
            type="text"
            inputMode="numeric"
            enterKeyHint="done"
            value={montoTexto}
            onChange={(e) => setMontoTexto(e.target.value)}
            disabled={enviando}
            className="h-14 w-full bg-transparent font-mono text-[1.25rem] tabular-nums text-foreground outline-none"
          />
        </div>

        {deMas ? (
          <p className="text-[0.8125rem] font-medium text-danger">
            Esa cuota es de {formatARS(montoCuota)}. Si te pagó dos cuotas, cobralas por separado.
          </p>
        ) : esParcial ? (
          <p className="text-[0.8125rem] font-medium text-warning">
            Te quedan {formatARS(resto)} de esta cuota.
          </p>
        ) : null}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[0.9375rem] font-semibold text-foreground">
          ¿Cuándo te pagó?
        </legend>
        <div className="flex gap-2">
          {(["hoy", "ayer", "otro"] as const).map((opcion) => (
            <label
              key={opcion}
              className={`flex h-12 cursor-pointer items-center rounded-full px-4 text-[0.8125rem] font-semibold ${
                cuando === opcion
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground"
              }`}
            >
              <input
                type="radio"
                name="cuando"
                value={opcion}
                checked={cuando === opcion}
                onChange={() => setCuando(opcion)}
                className="sr-only"
              />
              {opcion === "hoy" ? "Hoy" : opcion === "ayer" ? "Ayer" : "Otro día"}
            </label>
          ))}
        </div>

        {cuando === "otro" ? (
          <input
            type="date"
            name="otro_dia"
            max={hoy}
            required
            className="mt-2 h-12 rounded-lg border border-border bg-card px-4 text-base text-foreground"
          />
        ) : null}
      </fieldset>

      {/* El sheet CRECE con un paso más cuando se cobra de menos. Ese paso no es
          fricción: es lo que impide que se pierdan los $X que faltan (§2). */}
      {esParcial ? (
        <div className="flex flex-col gap-2 rounded-xl bg-surface-raised p-4">
          <label htmlFor="fecha-resto" className="text-[0.9375rem] font-semibold text-foreground">
            ¿Para cuándo el resto?
          </label>
          <p className="text-[0.8125rem] font-medium text-muted-foreground">
            Se crea una cuota nueva por {formatARS(resto)}.
          </p>
          <input
            id="fecha-resto"
            type="date"
            name="fecha_resto"
            min={hoy}
            required
            className="mt-1 h-12 rounded-lg border border-border bg-card px-4 text-base text-foreground"
          />
        </div>
      ) : null}

      <p
        role="alert"
        aria-live="polite"
        className={`text-[0.8125rem] font-medium text-danger ${estado.error ? "" : "sr-only"}`}
      >
        {estado.error ?? ""}
      </p>

      <button
        type="submit"
        disabled={enviando || deMas}
        className="h-14 rounded-full bg-primary text-[0.9375rem] font-semibold text-primary-foreground disabled:opacity-60"
      >
        {enviando ? "Guardando…" : "Listo, la cobré"}
      </button>
    </form>
  );
}
