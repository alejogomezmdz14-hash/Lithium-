"use client";

import { useActionState, useId, useState } from "react";

import { Atomo } from "@/components/atomo";
import { Boton } from "@/components/boton";
import { Campo, INPUT, INPUT_PLATA, Segmentado } from "@/components/campo";
import { formatARS, parseARS } from "@/lib/money";

import { cobrar, type EstadoCobro } from "./actions";

const INICIAL: EstadoCobro = { error: null };

type Cuando = "hoy" | "ayer" | "otro";

const CUANDO: readonly { valor: Cuando; label: string }[] = [
  { valor: "hoy", label: "Hoy" },
  { valor: "ayer", label: "Ayer" },
  { valor: "otro", label: "Otro día" },
];

/**
 * El sheet de cobro. **Cero diálogo de confirmación: el sheet ya es el paso de
 * confirmación.**
 *
 * No existe `disabled`. Se midió: el azul al 60% sobre el escalón claro deja el
 * blanco en 1.62:1, o sea el botón apagado era literalmente ilegible. Acá el
 * botón conserva contraste pleno y **su etiqueta dice qué falta**; al tocarlo
 * cuando falta algo no hace nada y el campo que falta recibe el foco. Eso es
 * estrictamente más útil que un botón gris que no explica por qué no anda.
 */
export function CobrarForm({
  cuotaId,
  nombre,
  numeroCuota,
  montoCuota,
  hoy,
}: {
  cuotaId: string;
  nombre: string;
  numeroCuota: number;
  montoCuota: number;
  hoy: string;
}) {
  const [estado, accion, enviando] = useActionState(cobrar, INICIAL);
  const [montoTexto, setMontoTexto] = useState(formatARS(montoCuota).replace("$", ""));
  const [cuando, setCuando] = useState<Cuando>("hoy");
  const [otroDia, setOtroDia] = useState("");
  const [fechaResto, setFechaResto] = useState("");

  const base = useId();
  const idMonto = `${base}-monto`;
  const idOtroDia = `${base}-otro-dia`;
  const idResto = `${base}-resto`;

  const ingresado = parseARS(montoTexto);
  const resto = ingresado !== null && ingresado > 0 ? montoCuota - ingresado : 0;
  const esParcial = resto > 0;
  const deMas = ingresado !== null && ingresado > montoCuota;

  // El botón dice qué falta, en el orden en que ella lo va a resolver.
  const falta =
    ingresado === null || ingresado <= 0
      ? { etiqueta: "Escribí cuánto te dio", campo: idMonto }
      : deMas
        ? { etiqueta: "Revisá el monto", campo: idMonto }
        : cuando === "otro" && otroDia === ""
          ? { etiqueta: "Falta el día que te pagó", campo: idOtroDia }
          : esParcial && fechaResto === ""
            ? { etiqueta: "Falta la fecha del resto", campo: idResto }
            : null;

  return (
    <form action={accion} className="mt-8 flex flex-col gap-8">
      <input type="hidden" name="cuota_id" value={cuotaId} />
      {/* El toast de "Deshacer" se arma con estos dos: la server action redirige
          con ?cobre=&cuota=&deshacer= y el aviso vive en el layout del shell. */}
      <input type="hidden" name="nombre" value={nombre} />
      <input type="hidden" name="numero" value={numeroCuota} />
      {/* El `<Segmentado>` no es un control nativo, así que el valor viaja acá. */}
      <input type="hidden" name="cuando" value={cuando} />

      <Campo label="¿Cuánto te dio?" htmlFor={idMonto}>
        <div className="relative">
          {/* El `$` va a 0.62em de los dígitos, en `texto-suave` y con aire —
              exactamente como lo compone `<Monto>` (§7.1). A tamaño pleno pesa
              lo mismo que la cifra y el ojo no cae en los dígitos; y a igual
              tamaño el input del sheet no leería como el de nuevo préstamo. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[1rem] font-medium text-texto-suave"
          >
            $
          </span>
          <input
            id={idMonto}
            name="monto"
            // type="text" y no "number": el number trae spinners, cambia de
            // valor con la rueda del mouse y rompe el decimal según el locale.
            type="text"
            inputMode="numeric"
            enterKeyHint="done"
            autoComplete="off"
            value={montoTexto}
            onChange={(e) => setMontoTexto(e.target.value)}
            disabled={enviando}
            className={INPUT_PLATA}
            // Por `style` y no por clase: `INPUT_PLATA` ya trae `px-4` y dos
            // utilidades de padding sobre el mismo elemento se resuelven por
            // orden en la hoja compilada, no por orden en el string.
            style={{ paddingLeft: 38 }}
          />
        </div>

        {deMas ? (
          <p className="text-[0.875rem] font-medium tracking-[-0.006em] text-peligro">
            Esa cuota es de {formatARS(montoCuota)}. Si te pagó dos, cobralas por separado.
          </p>
        ) : esParcial ? (
          <p className="text-[0.875rem] font-medium tracking-[-0.006em] text-atencion">
            Te quedan {formatARS(resto)} de esta cuota.
          </p>
        ) : null}
      </Campo>

      {/* De este campo depende la diferencia entre "a tiempo" y "3 días tarde",
          y de esa diferencia depende el semáforo. Un tap si fue hoy, dos si fue
          ayer. Era un grupo de radios con `sr-only`, que dejaba el foco de
          teclado invisible. */}
      <Campo label="¿Cuándo te pagó?">
        <Segmentado
          etiqueta="¿Cuándo te pagó?"
          opciones={CUANDO}
          valor={cuando}
          onChange={setCuando}
        />

        {cuando === "otro" ? (
          <input
            id={idOtroDia}
            type="date"
            name="otro_dia"
            max={hoy}
            value={otroDia}
            onChange={(e) => setOtroDia(e.target.value)}
            disabled={enviando}
            className={INPUT}
          />
        ) : null}
      </Campo>

      {/* Cobrar de menos está permitido —"te doy 20 ahora y el resto el
          viernes" pasa todo el tiempo— pero no puede hacer desaparecer plata.
          El sheet CRECE con un paso más: el resto se convierte en una cuota
          nueva con fecha obligatoria. El paso extra no es fricción, es lo único
          que impide que se pierdan los $X que faltan. */}
      <div
        className={`grid transition-[grid-template-rows] duration-[240ms] ease-salida ${
          esParcial ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div
            data-motion="fade"
            // Misma curva que el alto de la línea 158: es UN gesto, no dos.
            // Sin `ease-salida` el fade caía en el `ease` default del navegador
            // y el bloque se movía con dos curvas al mismo tiempo.
            className={`transition-opacity delay-[80ms] duration-[160ms] ease-salida ${
              esParcial ? "opacity-100" : "opacity-0"
            }`}
          >
            <Campo
              label="¿Para cuándo el resto?"
              htmlFor={idResto}
              ayuda={`Se crea una cuota nueva por ${formatARS(Math.max(resto, 0))}.`}
            >
              <input
                id={idResto}
                type="date"
                name="fecha_resto"
                min={hoy}
                value={fechaResto}
                onChange={(e) => setFechaResto(e.target.value)}
                disabled={enviando || !esParcial}
                tabIndex={esParcial ? undefined : -1}
                className={INPUT}
              />
            </Campo>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p
          role="alert"
          className={`text-[0.875rem] font-medium tracking-[-0.006em] text-peligro ${
            estado.error ? "" : "sr-only"
          }`}
        >
          {estado.error ?? ""}
        </p>

        <Boton
          peso="lleno"
          type="submit"
          onClick={(e) => {
            if (enviando) {
              e.preventDefault();
              return;
            }
            if (falta) {
              e.preventDefault();
              document.getElementById(falta.campo)?.focus();
            }
          }}
        >
          {enviando ? (
            <>
              {/* El único spinner de la app, en el único instante que lo
                  justifica: se está registrando plata. */}
              <Atomo size={18} girando className="mr-2" />
              Guardando…
            </>
          ) : (
            (falta?.etiqueta ?? "Listo, la cobré")
          )}
        </Boton>
      </div>
    </form>
  );
}
