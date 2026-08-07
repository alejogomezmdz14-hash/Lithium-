"use client";

import type { ReactNode } from "react";

/**
 * Los controles de formulario.
 *
 * **Sin bordes.** Lo que define un campo es el escalón de material: en claro el
 * input es blanco sobre canvas `#EBEBEF` (ΔL* 6.85); en oscuro es `#16161B`
 * sobre `#08080A` (ΔL* 5.21). Un borde de 1px sería un segundo mecanismo
 * diciendo lo mismo.
 *
 * El piso de `text-[1rem]` en todo input no es estético: abajo de 16px, Safari
 * hace zoom al enfocar y la pantalla salta.
 */

/** El className de todo input de una línea. Se exporta para que no se re-tipee. */
export const INPUT =
  "h-14 w-full rounded-campo vidrio px-4 text-[1rem] text-texto outline-none placeholder:text-texto-tenue";

/** Igual, para inputs de plata: mono y más grande, porque es el dato de la pantalla. */
export const INPUT_PLATA =
  "h-16 w-full rounded-campo vidrio px-4 font-mono text-[1.625rem] font-normal tracking-[-0.02em] text-texto outline-none placeholder:text-texto-tenue";

/**
 * El único campo con caja alta de la app: un textarea tiene que mostrar su alto,
 * si no parece un input de una línea que se porta raro.
 *
 * Vive acá y no derivado con `.replace()` en la pantalla que lo usa: un
 * `INPUT.replace("h-14", …)` deja de tener efecto **en silencio** el día que
 * alguien cambie el alto de `INPUT`, y el campo queda de 56px sin que nada falle.
 */
export const TEXTAREA =
  "min-h-28 w-full rounded-campo vidrio px-4 py-3 text-[1rem] text-texto outline-none placeholder:text-texto-tenue";

/**
 * Un campo que vive DENTRO de una losa soldada: radio 0 —las esquinas las pone
 * la losa, y solo en las cuatro exteriores— y caja alta para el rótulo arriba
 * del valor. El input de adentro va `bg-transparent`: el material lo pone esto.
 */
export const CAMPO_SOLDADO =
  "flex min-h-[76px] w-full flex-col justify-center gap-1 vidrio px-4 text-[1rem] text-texto";

/**
 * El rótulo de un campo. Es el mismo de `<Campo>`, exportado para las tres
 * pantallas que arman su propia caja (login, alta de usuaria, editar préstamo) y
 * que si no lo re-tipean carácter por carácter.
 */
export const ROTULO_CAMPO =
  "text-[0.75rem] font-semibold uppercase tracking-[0.09em] text-texto-suave";

export function Campo({
  label,
  ayuda,
  htmlFor,
  children,
}: {
  label: string;
  ayuda?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={ROTULO_CAMPO}>
        {label}
      </label>
      {/* `ayuda` va en `texto-suave`, NO en `tenue`. `--texto-tenue` está medido
          contra el vidrio (5.0:1) y los formularios lo ponen sobre el canvas
          pelado: #6d7484 sobre #eef0f4 da 4.11:1 y sobre #e2e5ec —el pie del
          degradé— 3.72:1. Los dos fallan AA, y es una línea que explica qué
          pasa con la plata. `texto-suave` da 5.99:1 y 5.42:1. */}
      {ayuda ? <p className="text-[0.875rem] font-medium text-texto-suave">{ayuda}</p> : null}
      {children}
    </div>
  );
}

/**
 * Un BLOQUE SOLDADO de celdas, no N píldoras sueltas.
 *
 * Reemplaza a los chips de %, a los de cuotas, a `Hoy / Ayer / Otro día` y a los
 * de tipo de cliente. **La celda activa es el ESCALÓN**: el mismo mecanismo que
 * dice "actuá acá" en una lista dice "esto es lo elegido" en un control. Un
 * concepto, seis usos.
 *
 * Y no es una píldora: la píldora está reservada a los cuatro botones que
 * registran plata. Antes el chip de "30%" tenía la misma cara que el botón de
 * cobrar.
 */
export function Segmentado<T extends string | number>({
  opciones,
  valor,
  onChange,
  columnas,
  etiqueta,
  className = "",
}: {
  opciones: readonly { valor: T; label: string }[];
  valor: T | null;
  onChange: (v: T) => void;
  /** Por default una columna por opción. `2` fuerza una grilla 2×N. */
  columnas?: number;
  /** Nombre del grupo para el lector de pantalla. */
  etiqueta: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className={`vidrio grid gap-[var(--junta)] overflow-hidden rounded-campo ${className}`}
      style={{ gridTemplateColumns: `repeat(${columnas ?? opciones.length}, minmax(0, 1fr))` }}
    >
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <button
            key={String(o.valor)}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => onChange(o.valor)}
            // La celda elegida sube al vidrio alto: el mismo mecanismo que dice
            // "actuá acá" en una lista dice "esto es lo elegido" en un control.
            className={`presionable flex h-12 items-center justify-center px-2 text-[0.875rem] tracking-[-0.006em] ${
              activa
                ? "vidrio-alto font-semibold text-marca-texto"
                : "font-medium text-texto-suave"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
