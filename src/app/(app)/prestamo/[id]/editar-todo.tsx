"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { editarPrestamo } from "@/app/acciones-prestamo";
import { Boton } from "@/components/boton";
import { Campo, INPUT, INPUT_PLATA, ROTULO_CAMPO, Segmentado } from "@/components/campo";
import { ColumnaMonto, Monto } from "@/components/monto";
import { Rotulo } from "@/components/rotulo";
import { FilaLectura } from "@/components/superficie";
import { fechaConDia, sumarDias } from "@/lib/fecha";
import { calcularTotal, NIVELES, porcentajeTotal } from "@/lib/interes";
import { formatARS, parseARS, repartirMonto } from "@/lib/money";

const CUOTAS: { valor: number; label: string }[] = [
  { valor: 1, label: "Un solo pago" },
  { valor: 2, label: "2" },
  { valor: 3, label: "3" },
  { valor: 6, label: "6" },
  { valor: 12, label: "12" },
];

const FRECUENCIAS: { valor: string; label: string }[] = [
  { valor: "mensual", label: "Mensual" },
  { valor: "quincenal", label: "Quincenal" },
  { valor: "semanal", label: "Semanal" },
];

const DIAS: Record<string, number> = { mensual: 30, quincenal: 15, semanal: 7 };

/** Las tasas del plan de niveles, sin repetir el 21 y el 18 del nivel 5. */
const TASAS = [...new Set(NIVELES.map((n) => n.tasaMensual))].sort((a, b) => b - a);

const OPCIONES_TASA: { valor: number; label: string }[] = [
  { valor: 0, label: "Sin interés" },
  ...TASAS.map((t) => ({ valor: t, label: `${t}%` })),
];

const CUERPO = "text-[0.875rem] font-medium tracking-[-0.006em]";
const MONTO_LECTURA = "font-mono text-[0.95rem] font-normal tracking-[-0.01em]";

/**
 * Editar TODO de un préstamo ya cargado: capital, interés, cuotas y fechas.
 *
 * Existe porque los préstamos que vinieron del Excel entraron sin interés y con
 * vencimientos inventados a 30 días. Sin esta pantalla no había forma de
 * corregirlos, que es lo primero que hay que hacer con datos migrados.
 */
export function EditarPrestamo({
  creditoId,
  capitalActual,
  totalActual,
  tasaActual,
  yaCobrado,
  cuotasImpagas,
  hoy,
}: {
  creditoId: string;
  capitalActual: number;
  totalActual: number;
  tasaActual: number | null;
  yaCobrado: number;
  cuotasImpagas: number;
  hoy: string;
}) {
  const router = useRouter();
  // Arranca ABIERTO si el préstamo todavía no tiene interés cargado: es
  // exactamente el caso de la cartera migrada del Excel, y esconder detrás de
  // un botón lo único que hay que hacer con esos préstamos es esconderlo.
  const [abierto, setAbierto] = useState(tasaActual == null || totalActual <= capitalActual);
  const [guardando, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [capitalTexto, setCapitalTexto] = useState(String(capitalActual));
  const [pctTexto, setPctTexto] = useState(
    tasaActual != null ? String(tasaActual) : String(porcentajeTotal(capitalActual, totalActual)),
  );
  const [cantidad, setCantidad] = useState(Math.max(1, cuotasImpagas));
  const [primera, setPrimera] = useState(sumarDias(hoy, 30));
  const [frecuencia, setFrecuencia] = useState<string>("mensual");

  const idCapital = `cap-${creditoId}`;
  const idPct = `pct-${creditoId}`;

  const capital = parseARS(capitalTexto) ?? 0;
  const pct = Number(pctTexto.replace(",", "."));
  const pctValido = pctTexto.trim() !== "" && Number.isFinite(pct) && pct >= 0;
  const total = pctValido ? calcularTotal(capital, pct) : 0;
  const interes = total > capital ? total - capital : 0;
  const saldo = total - yaCobrado;
  const preview = saldo > 0 ? repartirMonto(saldo, cantidad) : [];

  // El chip elegido, con tolerancia: escribir 30 a mano prende el mismo chip.
  const tasaElegida = pctValido
    ? (OPCIONES_TASA.find((o) => Math.abs(pct - o.valor) < 0.05)?.valor ?? null)
    : null;

  if (!abierto) {
    return (
      <FilaLectura>
        <Boton
          peso="texto"
          type="button"
          onClick={() => setAbierto(true)}
          className="w-full justify-start"
        >
          {tasaActual == null ? "Poner el interés y las fechas" : "Editar el préstamo"}
        </Boton>
      </FilaLectura>
    );
  }

  // Sin `disabled`: el botón conserva contraste pleno y su etiqueta dice qué
  // falta. Al tocarlo, el campo que falta recibe el foco.
  const falta: { etiqueta: string; campo: string } | null =
    capital <= 0
      ? { etiqueta: "Escribí cuánto le prestaste", campo: idCapital }
      : !pctValido
        ? { etiqueta: "Escribí el interés", campo: idPct }
        : preview.length === 0
          ? { etiqueta: "El total no puede ser menor a lo que ya cobraste", campo: idPct }
          : null;

  const guardar = () => {
    if (guardando) return;
    if (falta) {
      document.getElementById(falta.campo)?.focus();
      return;
    }
    empezar(async () => {
      setError(null);
      const r = await editarPrestamo({
        creditoId,
        capital,
        total,
        tasaMensual: pctValido && pct > 0 ? pct : null,
        cuotas: cantidad,
        primeraFecha: primera,
        frecuencia,
      });
      if (r.error) return setError(r.error);
      setAbierto(false);
      router.refresh();
    });
  };

  return (
    <FilaLectura className="flex-col items-stretch justify-start gap-5 py-5">
      <div>
        <p className="font-display text-[1.375rem] font-bold tracking-[-0.025em]">Editar el préstamo</p>
        <p className={`mt-1 ${CUERPO} text-texto-suave`}>
          Se puede cambiar todo. Lo que ya cobraste no se toca.
        </p>
      </div>

      {/* --- capital -------------------------------------------------------- */}
      <Campo label="Cuánto le prestaste" htmlFor={idCapital}>
        <div className="relative">
          {/* 0.62em de los dígitos, como lo compone `<Monto>` (§7.1) y como el
              mismo campo en el sheet de cobro y en nuevo préstamo. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[1rem] font-medium text-texto-suave"
          >
            $
          </span>
          <input
            id={idCapital}
            type="text"
            inputMode="numeric"
            value={capitalTexto}
            onChange={(e) => setCapitalTexto(e.target.value)}
            disabled={guardando}
            className={INPUT_PLATA}
            style={{ paddingLeft: 38 }}
          />
        </div>
      </Campo>

      {/* --- interés -------------------------------------------------------- */}
      <Campo label="Interés">
        <Segmentado
          etiqueta="Interés"
          opciones={OPCIONES_TASA}
          valor={tasaElegida}
          onChange={(v) => setPctTexto(String(v))}
          columnas={4}
        />
      </Campo>

      {/* El par asimétrico: el que se escribe es angosto, el que resulta es el
          doble de ancho y en mono. La jerarquía dice cuál es el número real. */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor={idPct} className={ROTULO_CAMPO}>
            Otro %
          </label>
          <div className="relative mt-1.5">
            <input
              id={idPct}
              type="text"
              inputMode="decimal"
              value={pctTexto}
              onChange={(e) => setPctTexto(e.target.value)}
              disabled={guardando}
              placeholder="30"
              className={INPUT}
              style={{ paddingRight: 32 }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[1rem] text-texto-suave"
            >
              %
            </span>
          </div>
        </div>
        <div className="flex-[2]">
          <p className={ROTULO_CAMPO}>Te tiene que devolver</p>
          {/* Mismo tamaño y misma caja que el campo del par en nuevo préstamo:
              es el mismo dato (`monto_total`) y tiene que pesar igual en las dos
              pantallas. Y va por `<Monto>`, que compone el `$` aparte. */}
          <p className="mt-1.5 flex h-16 items-center font-mono text-[1.625rem] font-normal tracking-[-0.02em]">
            <Monto valor={total} />
          </p>
        </div>
      </div>
      {interes > 0 ? (
        <p className={`-mt-3 ${CUERPO} text-texto-suave`}>Ganás {formatARS(interes)} de interés.</p>
      ) : null}

      {/* --- cuotas y fechas ------------------------------------------------ */}
      <Campo label="En cuántas cuotas">
        <Segmentado
          etiqueta="En cuántas cuotas"
          opciones={CUOTAS}
          valor={cantidad}
          onChange={setCantidad}
          columnas={3}
        />
      </Campo>

      <Campo
        label={cantidad === 1 ? "Fecha del cobro" : "Fecha de la primera cuota"}
        htmlFor={`pri-${creditoId}`}
      >
        <input
          id={`pri-${creditoId}`}
          type="date"
          value={primera}
          onChange={(e) => setPrimera(e.target.value)}
          disabled={guardando}
          className={INPUT}
        />
      </Campo>

      {cantidad > 1 ? (
        <Campo label="Cada cuánto">
          <Segmentado
            etiqueta="Cada cuánto"
            opciones={FRECUENCIAS}
            valor={frecuencia}
            onChange={setFrecuencia}
          />
        </Campo>
      ) : null}

      {/* --- preview -------------------------------------------------------- */}
      {preview.length > 0 ? (
        <div>
          <Rotulo>Así te queda</Rotulo>
          {yaCobrado > 0 ? (
            <p className={`mt-1 ${CUERPO} text-texto-suave`}>
              Ya le cobraste {formatARS(yaCobrado)}. Falta {formatARS(saldo)}.
            </p>
          ) : null}
          <ul className="mt-2 flex flex-col gap-1.5">
            {preview.map((monto, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span className={CUERPO}>
                  {fechaConDia(sumarDias(primera, i * (DIAS[frecuencia] ?? 30)))}
                </span>
                {/* El mismo riel de 108px que en el preview de nuevo préstamo y
                    que en las cuatro listas: el borde derecho de todo monto de
                    la app cae en la misma x. */}
                <ColumnaMonto>
                  <Monto valor={monto} className={MONTO_LECTURA} />
                </ColumnaMonto>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className={`${CUERPO} text-peligro`}>
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Boton peso="lleno" type="button" onClick={guardar} className="flex-1">
          {guardando ? "Guardando…" : (falta?.etiqueta ?? "Guardar los cambios")}
        </Boton>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className={`h-12 shrink-0 px-3 ${CUERPO} text-texto-suave`}
        >
          Cancelar
        </button>
      </div>
    </FilaLectura>
  );
}
