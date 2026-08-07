import type { ReactNode } from "react";

import { Piedra } from "./superficie";

/**
 * Todo lo que sale mal, dicho con la misma cara.
 *
 * Antes había cinco lugares distintos donde la app decía "algo falló" —los tres
 * bloques inline de las tabs, el 404 y el error de render— y cada uno con su
 * propia caja. **Es una `<Piedra>`: si la pantalla es un error, el error ES el
 * héroe.** El título va en el tamaño de un título de bloque, no en 13px de
 * caption arriba de una pared de gris.
 *
 * Sirve también para los "no": `Esta parte no es tuya`. Si la pantalla es un no,
 * el no es el héroe.
 */
export function Aviso({
  tono = "error",
  titulo,
  children,
  acciones,
}: {
  tono?: "error" | "atencion" | "calma";
  titulo: string;
  children?: ReactNode;
  acciones?: ReactNode;
}) {
  const color =
    tono === "error" ? "text-peligro" : tono === "atencion" ? "text-atencion" : "text-texto";

  return (
    <Piedra>
      <h2 className={`font-display text-[1.375rem] font-bold tracking-[-0.025em] ${color}`}>{titulo}</h2>
      {children ? (
        <div className="mt-2 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
          {children}
        </div>
      ) : null}
      {acciones ? <div className="mt-5 flex flex-col gap-2">{acciones}</div> : null}
    </Piedra>
  );
}
