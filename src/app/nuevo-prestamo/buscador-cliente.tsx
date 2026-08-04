"use client";

import { useId, useMemo, useRef, useState } from "react";

import { Avatar, ChipSemaforo } from "@/components/semaforo";
import { buscar } from "@/lib/buscar";
import type { TipoCliente } from "@/lib/documentacion";
import type { Semaforo } from "@/lib/por-pagar";

export type ClienteElegible = {
  id: string;
  nombre: string;
  semaforo: Semaforo;
  tipo: TipoCliente | null;
  /** Qué le falta de documentación. Null si no tiene tipo definido. */
  papeles: string | null;
  papelesOk: boolean;
};

/**
 * Buscador por nombre en lugar de un desplegable. Ver CLAUDE.md §9.11.
 *
 * Con veinte clientes un `<select>` obliga a scrollear una lista alfabética
 * buscando a alguien que ya tenés en la cabeza. Escribir tres letras es más
 * rápido y no depende de recordar cómo lo cargaste.
 *
 * Filtra en memoria: la lista ya vino con la página, así que no hay ni una
 * llamada de red mientras escribe.
 */
export function BuscadorDeCliente({
  clientes,
  elegido,
  alElegir,
  deshabilitado,
}: {
  clientes: ClienteElegible[];
  elegido: ClienteElegible | null;
  alElegir: (c: ClienteElegible | null) => void;
  deshabilitado?: boolean;
}) {
  const [consulta, setConsulta] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [resaltado, setResaltado] = useState(0);
  const idInput = useId();
  const contenedor = useRef<HTMLDivElement>(null);

  const resultados = useMemo(() => buscar(clientes, consulta).slice(0, 8), [clientes, consulta]);

  function elegir(c: ClienteElegible) {
    alElegir(c);
    setConsulta("");
    setAbierto(false);
  }

  function alTeclado(e: React.KeyboardEvent) {
    if (!abierto) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltado((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Sin preventDefault, el Enter enviaría el formulario entero.
      e.preventDefault();
      if (resultados[resaltado]) elegir(resultados[resaltado]);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  if (elegido) {
    return (
      <div className="mt-2 flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
        <Avatar nombre={elegido.nombre} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold text-foreground">{elegido.nombre}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2">
            <ChipSemaforo estado={elegido.semaforo} />
            {elegido.papeles ? (
              <span
                className={`text-[0.8125rem] font-medium ${
                  elegido.papelesOk ? "text-muted-foreground" : "text-warning"
                }`}
              >
                {elegido.papeles}
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => alElegir(null)}
          disabled={deshabilitado}
          className="h-12 shrink-0 px-2 text-[0.8125rem] font-semibold text-primary-text"
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div ref={contenedor} className="relative mt-2">
      <input
        id={idInput}
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={`${idInput}-lista`}
        aria-autocomplete="list"
        autoComplete="off"
        autoCapitalize="words"
        enterKeyHint="search"
        value={consulta}
        disabled={deshabilitado}
        placeholder="Escribí el nombre"
        onChange={(e) => {
          setConsulta(e.target.value);
          setAbierto(true);
          setResaltado(0);
        }}
        onFocus={() => setAbierto(true)}
        // El blur se demora: sin esto, tocar un resultado cierra la lista antes
        // de que el click llegue a registrarse.
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={alTeclado}
        className="h-12 w-full rounded-lg border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-subtle"
      />

      {abierto ? (
        <ul
          id={`${idInput}-lista`}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface-raised py-1"
        >
          {resultados.length === 0 ? (
            <li className="px-4 py-3 text-[0.8125rem] font-medium text-muted-foreground">
              No hay nadie con “{consulta}”.
            </li>
          ) : (
            resultados.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === resaltado}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(c)}
                  onMouseEnter={() => setResaltado(i)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
                    i === resaltado ? "bg-card" : ""
                  }`}
                >
                  <Avatar nombre={c.nombre} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-semibold text-foreground">
                      {c.nombre}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2">
                      <ChipSemaforo estado={c.semaforo} />
                      {c.papeles && !c.papelesOk ? (
                        <span className="text-[0.8125rem] font-medium text-warning">
                          {c.papeles}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
