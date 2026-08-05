"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cambiarFechaCuota, deshacerCobro, reprogramarPlan } from "@/app/acciones-prestamo";
import { fechaConDia, sumarDias } from "@/lib/fecha";
import { formatARS, repartirMonto } from "@/lib/money";

const CUOTAS = [1, 2, 3, 6, 12];
const DIAS: Record<string, number> = { mensual: 30, quincenal: 15, semanal: 7 };

/** Mover la fecha de una cuota suelta. Es lo más frecuente: se corre un cobro. */
export function CambiarFecha({ cuotaId, fecha }: { cuotaId: string; fecha: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState(fecha);
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="h-12 shrink-0 px-2 text-[0.8125rem] font-semibold text-primary-text"
      >
        Cambiar fecha
      </button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-lg bg-surface-raised p-3">
      <label className="text-[0.8125rem] font-medium text-muted-foreground">
        ¿Cuándo lo cobrás?
      </label>
      <input
        type="date"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        disabled={guardando}
        className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground"
      />
      {error ? <p className="mt-2 text-[0.8125rem] font-medium text-danger">{error}</p> : null}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={guardando}
          onClick={() =>
            empezar(async () => {
              const r = await cambiarFechaCuota(cuotaId, valor);
              if (r.error) return setError(r.error);
              setAbierto(false);
              router.refresh();
            })
          }
          className="h-12 flex-1 rounded-full bg-primary text-[0.8125rem] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          disabled={guardando}
          className="h-12 px-4 text-[0.8125rem] font-medium text-muted-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/**
 * Rehacer el plan de lo que falta. Reparte el saldo en N cuotas nuevas.
 * Lo ya cobrado no se toca: son hechos, no planes.
 */
export function Reprogramar({
  creditoId,
  saldo,
  hoy,
}: {
  creditoId: string;
  saldo: number;
  hoy: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [primera, setPrimera] = useState(sumarDias(hoy, 30));
  const [frecuencia, setFrecuencia] = useState("mensual");
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();

  const preview = saldo > 0 ? repartirMonto(saldo, cantidad) : [];

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-2 h-12 w-full rounded-full bg-card text-[0.8125rem] font-semibold text-primary-text"
      >
        Cambiar las cuotas y las fechas
      </button>
    );
  }

  return (
    <section className="mt-2 rounded-xl bg-card p-5">
      <p className="text-[0.9375rem] font-semibold text-foreground">
        Reprogramar lo que falta cobrar
      </p>
      <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
        Queda un saldo de <span className="tabular-nums">{formatARS(saldo)}</span>. Lo que ya
        cobraste no se toca.
      </p>

      <p className="mt-4 text-[0.8125rem] font-medium text-muted-foreground">¿En cuántas cuotas?</p>
      <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {CUOTAS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCantidad(n)}
            disabled={guardando}
            className={`h-12 shrink-0 rounded-full px-4 text-[0.8125rem] font-semibold ${
              cantidad === n
                ? "bg-primary text-primary-foreground"
                : "bg-surface-raised text-muted-foreground"
            }`}
          >
            {n === 1 ? "Un solo pago" : n}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <div className="flex-1">
          <label className="text-[0.8125rem] font-medium text-muted-foreground">
            {cantidad === 1 ? "¿Cuándo lo cobrás?" : "¿Cuándo cobrás la primera?"}
          </label>
          <input
            type="date"
            value={primera}
            onChange={(e) => setPrimera(e.target.value)}
            disabled={guardando}
            className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground"
          />
        </div>
        {cantidad > 1 ? (
          <div className="flex-1">
            <label className="text-[0.8125rem] font-medium text-muted-foreground">Cada cuánto</label>
            <select
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

      {preview.length > 0 ? (
        <div className="mt-4 rounded-lg bg-surface-raised p-4">
          <p className="text-[0.8125rem] font-semibold text-foreground">Así te queda</p>
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
          disabled={guardando}
          onClick={() =>
            empezar(async () => {
              const r = await reprogramarPlan(creditoId, cantidad, primera, frecuencia);
              if (r.error) return setError(r.error);
              setAbierto(false);
              router.refresh();
            })
          }
          className="h-12 flex-1 rounded-full bg-primary text-[0.8125rem] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar el plan"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          disabled={guardando}
          className="h-12 px-4 text-[0.8125rem] font-medium text-muted-foreground"
        >
          Cancelar
        </button>
      </div>
    </section>
  );
}

export function DeshacerCobro({ cuotaId }: { cuotaId: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();

  if (error) return <span className="text-[0.8125rem] font-medium text-danger">{error}</span>;

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="h-12 shrink-0 px-2 text-[0.8125rem] font-medium text-muted-foreground"
      >
        Deshacer
      </button>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        disabled={guardando}
        onClick={() =>
          empezar(async () => {
            const r = await deshacerCobro(cuotaId);
            if (r.error) return setError(r.error);
            setConfirmando(false);
            router.refresh();
          })
        }
        className="h-12 px-2 text-[0.8125rem] font-semibold text-destructive disabled:opacity-60"
      >
        {guardando ? "…" : "Sí, deshacer"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="h-12 px-2 text-[0.8125rem] font-medium text-muted-foreground"
      >
        No
      </button>
    </span>
  );
}
