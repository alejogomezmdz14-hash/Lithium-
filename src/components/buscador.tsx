"use client";

import Link from "next/link";
import { useId, useMemo, useState, type ReactNode } from "react";

import { buscar } from "@/lib/buscar";
import type { Semaforo as EstadoSemaforo } from "@/lib/por-pagar";

import { Boton, BotonLink } from "./boton";
import { ColumnaMonto, Monto } from "./monto";
import { Semaforo } from "./semaforo";
import { Fila, Losa } from "./superficie";

export type PersonaBuscable = {
  id: string;
  nombre: string;
  semaforo: EstadoSemaforo;
  debe: number;
  /** La cuota impaga que vence primero. Si es null, no tiene nada que cobrar. */
  cuotaImpagaId: string | null;
};

/**
 * El buscador de los tres tabs.
 *
 * **La escena que resuelve:** alguien golpea la puerta, le da plata, y **no está
 * en "Por pagar"** — porque paga adelantado, o porque su cuota es de septiembre.
 * Sin buscador eso se anota en el cuaderno; y si vuelve al cuaderno una vez, ya
 * volvió al cuaderno.
 *
 * Envuelve el contenido del tab en vez de vivir al lado: mientras hay algo
 * escrito, los resultados **reemplazan** la pantalla. Ver dos listas a la vez
 * obliga a decidir cuál mirar.
 *
 * No hay skeleton: la lista completa ya vino en el render del server y el
 * filtrado es sincrónico. Un skeleton acá sería una animación fingiendo una
 * espera que no existe.
 */
export function Buscador({
  personas,
  children,
}: {
  personas: readonly PersonaBuscable[];
  children: ReactNode;
}) {
  const [consulta, setConsulta] = useState("");
  const id = useId();

  const resultados = useMemo(
    () => (consulta.trim() === "" ? [] : buscar(personas, consulta)),
    [personas, consulta],
  );

  const buscando = consulta.trim() !== "";

  return (
    <>
      {/* El alto es fijo y sale de `--alto-buscador`: los headers de grupo se
          pegan justo abajo de esta barra, y para eso el número tiene que ser el
          mismo de los dos lados. Con altura natural, un salto de línea del label
          en una pantalla angosta desalinearía los dos stickys. */}
      <div className="sticky top-0 z-30 -mx-4 h-[var(--alto-buscador)] barra-vidrio px-4 pb-3 pt-1">
        {/* Con label, nunca una lupa sola: nada escondido detrás de un ícono. */}
        <label
          htmlFor={id}
          className="block truncate text-[0.75rem] font-semibold uppercase leading-4 tracking-[0.09em] text-texto-suave"
        >
          Buscá a alguien por nombre
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            id={id}
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Marta, Suárez…"
            autoComplete="off"
            className="h-12 w-full rounded-campo vidrio px-4 text-[1rem] text-texto outline-none placeholder:text-texto-tenue"
          />
          {buscando ? (
            <Boton peso="texto" type="button" onClick={() => setConsulta("")} className="shrink-0 px-2">
              Limpiar
            </Boton>
          ) : null}
        </div>
      </div>

      {buscando ? (
        <div className="mt-3">
          {resultados.length === 0 ? (
            <Losa>
              <Fila>
                <div className="min-w-0 flex-1">
                  <p className="text-[1rem] font-semibold tracking-[-0.011em] text-texto">
                    No hay nadie con “{consulta.trim()}”.
                  </p>
                  {/* Por `BotonLink peso="texto"` y no un `<Link>` con clases a
                      mano: así conserva los 48px de caja táctil que tiene toda
                      acción secundaria de la app. */}
                  <BotonLink peso="texto" href="/nuevo-cliente">
                    Cliente nuevo
                  </BotonLink>
                </div>
              </Fila>
            </Losa>
          ) : (
            <Losa>
              {resultados.map((p) => (
                <Fila key={p.id}>
                  <Link href={`/clientes/${p.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-[1rem] font-semibold tracking-[-0.011em] text-texto">
                      {p.nombre}
                    </span>
                    <span className="mt-1 block">
                      <Semaforo estado={p.semaforo} />
                    </span>
                  </Link>

                  <ColumnaMonto>
                    {p.debe > 0 ? (
                      <>
                        <Monto
                          valor={p.debe}
                          className="block font-mono text-[0.95rem] font-medium tracking-[-0.01em] text-texto"
                        />
                        {p.cuotaImpagaId ? (
                          <BotonLink
                            peso="fantasma"
                            href={`/cobrar/${p.cuotaImpagaId}`}
                            className="mt-2"
                          >
                            Ya me pagó
                          </BotonLink>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-[0.875rem] font-medium text-texto-suave">
                        no te debe
                      </span>
                    )}
                  </ColumnaMonto>
                </Fila>
              ))}
            </Losa>
          )}
        </div>
      ) : (
        children
      )}
    </>
  );
}
