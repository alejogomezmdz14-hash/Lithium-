"use client";

import { useId, useMemo, useRef, useState } from "react";

import { Boton } from "@/components/boton";
import { INPUT } from "@/components/campo";
import { Semaforo } from "@/components/semaforo";
import { Escalon, Fila } from "@/components/superficie";
import { buscar } from "@/lib/buscar";
import type { TipoCliente } from "@/lib/documentacion";
import type { Semaforo as EstadoSemaforo } from "@/lib/por-pagar";

export type ClienteElegible = {
  id: string;
  nombre: string;
  semaforo: EstadoSemaforo;
  tipo: TipoCliente | null;
  /** Qué le falta de documentación. Null si no tiene tipo definido. */
  papeles: string | null;
  papelesOk: boolean;
};

/** El id es fijo y no `useId()`: el botón de crear el préstamo le manda el foco
 *  cuando falta elegir a quién, y para eso tiene que poder nombrarlo. */
export const ID_BUSCADOR = "cliente-buscador";

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
  const idLista = useId();
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
      // Una sola fila, un solo dato: quién. El resto de la pantalla es el
      // préstamo, no la persona.
      <div className="mt-2.5 overflow-hidden rounded-losa">
        <Fila>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[1rem] font-semibold tracking-[-0.011em] text-texto">
              {elegido.nombre}
            </p>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2">
              <Semaforo estado={elegido.semaforo} />
              {elegido.papeles ? (
                <span
                  className={`text-[0.875rem] font-medium tracking-[-0.006em] ${
                    elegido.papelesOk ? "text-texto-suave" : "text-atencion"
                  }`}
                >
                  {elegido.papeles}
                </span>
              ) : null}
            </span>
          </div>
          <Boton peso="texto" type="button" onClick={() => alElegir(null)} className="shrink-0">
            Cambiar
          </Boton>
        </Fila>
      </div>
    );
  }

  return (
    <div ref={contenedor} className="relative mt-2.5">
      <input
        id={ID_BUSCADOR}
        type="text"
        role="combobox"
        aria-label="Nombre del cliente"
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-activedescendant={
          abierto && resultados[resaltado] ? `${idLista}-${resaltado}` : undefined
        }
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
        className={INPUT}
      />

      {abierto ? (
        // Losa flotante: el radio va en las esquinas exteriores y adentro las
        // filas se separan por la junta de 2px, donde asoma el canvas de la
        // página que está atrás. No es una lista de tarjetas.
        <div
          id={idLista}
          role="listbox"
          aria-label="Resultados"
          className="absolute inset-x-0 top-full z-30 mt-2 flex max-h-80 flex-col gap-[var(--junta)] overflow-y-auto rounded-losa"
        >
          {resultados.length === 0 ? (
            <Fila>
              <p className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
                No hay nadie con “{consulta}”.
              </p>
            </Fila>
          ) : (
            resultados.map((c, i) => {
              const contenido = (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[1rem] font-semibold tracking-[-0.011em] text-texto">
                    {c.nombre}
                  </p>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2">
                    <Semaforo estado={c.semaforo} />
                    {c.papeles && !c.papelesOk ? (
                      <span className="text-[0.875rem] font-medium tracking-[-0.006em] text-atencion">
                        {c.papeles}
                      </span>
                    ) : null}
                  </span>
                </div>
              );

              return (
                <div
                  key={c.id}
                  id={`${idLista}-${i}`}
                  role="option"
                  aria-selected={i === resaltado}
                  // `mousedown` sin default: el blur del input llegaría antes que
                  // el click y cerraría la lista debajo del dedo.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(c)}
                  onMouseEnter={() => setResaltado(i)}
                >
                  {/* La resaltada —la que se elige con Enter— es el ESCALÓN: el
                      mismo material que en toda la app dice "actuá acá". No hace
                      falta un color nuevo ni un borde para señalar cuál es. */}
                  {i === resaltado ? (
                    <Escalon>{contenido}</Escalon>
                  ) : (
                    <Fila>{contenido}</Fila>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
