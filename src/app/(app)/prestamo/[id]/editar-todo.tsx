"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { editarPrestamo } from "@/app/acciones-prestamo";
import { fechaConDia, sumarDias } from "@/lib/fecha";
import { calcularTotal, NIVELES, porcentajeTotal } from "@/lib/interes";
import { formatARS, parseARS, repartirMonto } from "@/lib/money";

const CUOTAS = [1, 2, 3, 6, 12];
const DIAS: Record<string, number> = { mensual: 30, quincenal: 15, semanal: 7 };

/** Las tasas del plan de niveles, sin repetir el 21 y el 18 del nivel 5. */
const TASAS = [...new Set(NIVELES.map((n) => n.tasaMensual))].sort((a, b) => b - a);

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
  const [frecuencia, setFrecuencia] = useState("mensual");

  const capital = parseARS(capitalTexto) ?? 0;
  const pct = Number(pctTexto.replace(",", "."));
  const pctValido = pctTexto.trim() !== "" && Number.isFinite(pct) && pct >= 0;
  const total = pctValido ? calcularTotal(capital, pct) : 0;
  const interes = total > capital ? total - capital : 0;
  const saldo = total - yaCobrado;
  const preview = saldo > 0 ? repartirMonto(saldo, cantidad) : [];

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-2 h-14 w-full rounded-full bg-primary text-[0.9375rem] font-semibold text-primary-foreground"
      >
        Poner el interés y las fechas
      </button>
    );
  }

  return (
    <section className="mt-2 rounded-xl bg-card p-5">
      <p className="text-[1.0625rem] font-semibold text-foreground">Editar el préstamo</p>
      <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
        Se puede cambiar todo. Lo que ya cobraste no se toca.
      </p>

      {/* --- capital ------------------------------------------------------ */}
      <label htmlFor="cap" className="mt-5 block text-[0.9375rem] font-semibold text-foreground">
        ¿Cuánto le prestaste?
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-4">
        <span className="font-mono text-[1.25rem] text-muted-foreground">$</span>
        <input
          id="cap"
          type="text"
          inputMode="numeric"
          value={capitalTexto}
          onChange={(e) => setCapitalTexto(e.target.value)}
          disabled={guardando}
          className="h-14 w-full bg-transparent font-mono text-[1.25rem] tabular-nums text-foreground outline-none"
        />
      </div>

      {/* --- interés ------------------------------------------------------ */}
      <p className="mt-5 text-[0.9375rem] font-semibold text-foreground">¿Qué interés le cobrás?</p>
      <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => setPctTexto("0")}
          disabled={guardando}
          className={`h-12 shrink-0 select-none rounded-full px-4 text-[0.8125rem] font-semibold ${
            pctValido && pct === 0
              ? "bg-primary text-primary-foreground"
              : "bg-surface-raised text-muted-foreground"
          }`}
        >
          Sin interés
        </button>
        {TASAS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setPctTexto(String(t))}
            disabled={guardando}
            className={`h-12 shrink-0 select-none rounded-full px-4 text-[0.8125rem] font-semibold ${
              pctValido && Math.abs(pct - t) < 0.05
                ? "bg-primary text-primary-foreground"
                : "bg-surface-raised text-muted-foreground"
            }`}
          >
            {t}%
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="pct" className="text-[0.8125rem] font-medium text-muted-foreground">
            O escribí otro
          </label>
          <div className="mt-1 flex items-center rounded-lg border border-border bg-background px-3">
            <input
              id="pct"
              type="text"
              inputMode="decimal"
              value={pctTexto}
              onChange={(e) => setPctTexto(e.target.value)}
              disabled={guardando}
              placeholder="30"
              className="h-12 w-full bg-transparent text-[1.0625rem] tabular-nums text-foreground outline-none"
            />
            <span className="text-[1.0625rem] text-muted-foreground">%</span>
          </div>
        </div>
        <div className="flex-[2]">
          <p className="text-[0.8125rem] font-medium text-muted-foreground">Te tiene que devolver</p>
          <p className="mt-1 flex h-12 items-center font-mono text-[1.25rem] font-semibold tabular-nums text-foreground">
            {formatARS(total)}
          </p>
        </div>
      </div>
      {interes > 0 ? (
        <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
          Ganás {formatARS(interes)} de interés.
        </p>
      ) : null}

      {/* --- cuotas y primera fecha --------------------------------------- */}
      <p className="mt-5 text-[0.9375rem] font-semibold text-foreground">¿En cuántas cuotas?</p>
      <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {CUOTAS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCantidad(n)}
            disabled={guardando}
            className={`h-12 shrink-0 select-none rounded-full px-4 text-[0.8125rem] font-semibold ${
              cantidad === n
                ? "bg-primary text-primary-foreground"
                : "bg-surface-raised text-muted-foreground"
            }`}
          >
            {n === 1 ? "Un solo pago" : n}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-3">
        <div className="flex-1">
          <label htmlFor="pri" className="text-[0.8125rem] font-medium text-muted-foreground">
            {cantidad === 1 ? "¿Cuándo te paga?" : "¿Cuándo te paga la primera?"}
          </label>
          <input
            id="pri"
            type="date"
            value={primera}
            onChange={(e) => setPrimera(e.target.value)}
            disabled={guardando}
            className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground"
          />
        </div>
        {cantidad > 1 ? (
          <div className="flex-1">
            <label htmlFor="fre" className="text-[0.8125rem] font-medium text-muted-foreground">
              Cada cuánto
            </label>
            <select
              id="fre"
              value={frecuencia}
              onChange={(e) => setFrecuencia(e.target.value)}
              disabled={guardando}
              className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground"
            >
              <option value="mensual">Mensual</option>
              <option value="quincenal">Quincenal</option>
              <option value="semanal">Semanal</option>
            </select>
          </div>
        ) : null}
      </div>

      {/* --- preview ------------------------------------------------------ */}
      {preview.length > 0 ? (
        <div className="mt-4 rounded-lg bg-surface-raised p-4">
          <p className="text-[0.8125rem] font-semibold text-foreground">Así te queda</p>
          {yaCobrado > 0 ? (
            <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
              Ya le cobraste {formatARS(yaCobrado)}. Falta {formatARS(saldo)}.
            </p>
          ) : null}
          <ul className="mt-2 flex flex-col gap-1">
            {preview.map((monto, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span className="text-[0.8125rem] font-medium text-foreground">
                  {fechaConDia(sumarDias(primera, i * (DIAS[frecuencia] ?? 30)))}
                </span>
                <span className="font-mono text-[0.8125rem] tabular-nums text-foreground">
                  {formatARS(monto)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-[0.8125rem] font-medium text-danger">{error}</p> : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={guardando || preview.length === 0}
          onClick={() =>
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
            })
          }
          className="h-14 flex-1 rounded-full bg-primary text-[0.9375rem] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar los cambios"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          disabled={guardando}
          className="h-14 px-4 text-[0.8125rem] font-medium text-muted-foreground"
        >
          Cancelar
        </button>
      </div>
    </section>
  );
}
