"use client";

import { useActionState, useState } from "react";

import { fechaConDia, sumarDias } from "@/lib/fecha";
import { formatARS, parseARS, repartirMonto } from "@/lib/money";

import { crearPrestamo, type EstadoNuevoPrestamo } from "./actions";
import { BuscadorDeCliente, type ClienteElegible } from "./buscador-cliente";

const INICIAL: EstadoNuevoPrestamo = { error: null };

const PORCENTAJES = [0, 20, 30, 40, 50];
const CUOTAS = [1, 2, 3, 6, 12];
const DIAS: Record<string, number> = { mensual: 30, quincenal: 15, semanal: 7 };

function Pill({
  activo,
  children,
  onClick,
}: {
  activo: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 shrink-0 rounded-full px-4 text-[0.8125rem] font-semibold ${
        activo ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function PrestamoForm({
  clientes,
  hoy,
}: {
  clientes: ClienteElegible[];
  hoy: string;
}) {
  const [estado, accion, enviando] = useActionState(crearPrestamo, INICIAL);

  const [cliente, setCliente] = useState<ClienteElegible | null>(null);
  const clienteId = cliente?.id ?? "";
  const [capitalTexto, setCapitalTexto] = useState("");
  const [totalTexto, setTotalTexto] = useState("");
  const [cuotas, setCuotas] = useState(1);
  const [primeraFecha, setPrimeraFecha] = useState(sumarDias(hoy, 30));
  const [frecuencia, setFrecuencia] = useState("mensual");
  // Cuál de los dos campos vinculados tiene el foco. El que se está editando
  // NUNCA se reescribe: eso es lo que evita el "eco", donde A escribe en B, B
  // escribe en A, y el número muta abajo del cursor (§9.14).
  const [editando, setEditando] = useState<"total" | "porcentaje" | null>(null);
  const [pctTexto, setPctTexto] = useState("");

  const capital = parseARS(capitalTexto) ?? 0;
  const total = parseARS(totalTexto) ?? 0;
  const interes = total > capital ? total - capital : 0;
  const porcentaje = capital > 0 && total > 0 ? Math.round((total / capital - 1) * 1000) / 10 : 0;
  const pctMostrado =
    editando === "porcentaje" ? pctTexto : porcentaje > 0 ? String(porcentaje) : "";

  const aplicarPorcentaje = (p: number) => {
    if (capital <= 0) return;
    setTotalTexto(formatARS(Math.round(capital * (1 + p / 100))).replace("$", ""));
  };

  const preview = capital > 0 && total >= capital ? repartirMonto(total, cuotas) : [];

  return (
    <form action={accion} className="flex flex-col gap-2">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <input type="hidden" name="total" value={totalTexto} />
      <input type="hidden" name="cuotas" value={cuotas} />
      <input type="hidden" name="frecuencia" value={frecuencia} />

      <section className="rounded-xl bg-card p-5">
        <p className="text-[0.9375rem] font-semibold text-foreground">¿A quién le prestás?</p>

        <BuscadorDeCliente
          clientes={clientes}
          elegido={cliente}
          alElegir={setCliente}
          deshabilitado={enviando}
        />

        {/* El aviso de papeles va acá y no en la ficha: este es el momento en
            que importa, justo antes de poner la plata. Informa, NUNCA bloquea —
            la decisión de prestar la toma ella con datos que la app no tiene. */}
        {cliente && cliente.papeles && !cliente.papelesOk ? (
          <p className="mt-3 rounded-lg bg-surface-raised px-4 py-3 text-[0.8125rem] font-medium text-warning">
            {cliente.papeles}. Podés prestarle igual.
          </p>
        ) : null}
      </section>

      <section className="rounded-xl bg-card p-5">
        <label htmlFor="capital" className="text-[0.9375rem] font-semibold text-foreground">
          ¿Cuánto le prestás?
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-4">
          <span className="font-mono text-[1.375rem] text-muted-foreground">$</span>
          <input
            id="capital"
            name="capital"
            type="text"
            inputMode="numeric"
            autoFocus
            value={capitalTexto}
            onChange={(e) => setCapitalTexto(e.target.value)}
            disabled={enviando}
            placeholder="400.000"
            className="h-14 w-full bg-transparent font-mono text-[1.375rem] tabular-nums text-foreground outline-none placeholder:text-muted-subtle"
          />
        </div>
      </section>

      <section className="rounded-xl bg-card p-5">
        <p className="text-[0.9375rem] font-semibold text-foreground">
          ¿Cuánto te tiene que devolver?
        </p>

        {/* Los chips resuelven el 90% de los casos sin tipear nada (§9.14). */}
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {PORCENTAJES.map((p) => (
            <Pill
              key={p}
              activo={capital > 0 && Math.abs(porcentaje - p) < 0.05}
              onClick={() => aplicarPorcentaje(p)}
            >
              {p === 0 ? "Sin interés" : `${p}%`}
            </Pill>
          ))}
        </div>

        <div className="mt-4 flex items-end gap-3">
          {/* No son dos campos pares: el total mide el doble y va en mono grande.
              La jerarquía visual dice cuál es el número real. */}
          <div className="flex-[2]">
            <label
              htmlFor="total"
              className="text-[0.8125rem] font-medium text-muted-foreground"
            >
              Tengo que cobrar
            </label>
            <div className="mt-1 flex items-center gap-1 rounded-lg border border-border bg-background px-3">
              <span className="font-mono text-[1.0625rem] text-muted-foreground">$</span>
              <input
                id="total"
                type="text"
                inputMode="numeric"
                value={totalTexto}
                onFocus={() => setEditando("total")}
                onBlur={() => setEditando(null)}
                onChange={(e) => setTotalTexto(e.target.value)}
                disabled={enviando}
                placeholder="520.000"
                className="h-12 w-full bg-transparent font-mono text-[1.0625rem] tabular-nums text-foreground outline-none placeholder:text-muted-subtle"
              />
            </div>
          </div>

          <div className="flex-1">
            <label
              htmlFor="porcentaje"
              className="text-[0.8125rem] font-medium text-muted-foreground"
            >
              Interés
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-border bg-background px-3">
              <input
                id="porcentaje"
                type="text"
                inputMode="decimal"
                // Siempre controlado. Mientras tiene el foco muestra lo que ella
                // tipea; cuando lo suelta, vuelve a mostrar el % derivado del
                // total. Nunca se reescribe abajo del cursor.
                value={pctMostrado}
                onFocus={() => {
                  setPctTexto(porcentaje > 0 ? String(porcentaje) : "");
                  setEditando("porcentaje");
                }}
                onChange={(e) => setPctTexto(e.target.value)}
                onBlur={() => {
                  setEditando(null);
                  const p = Number(pctTexto.replace(",", "."));
                  if (pctTexto.trim() !== "" && Number.isFinite(p) && p >= 0) aplicarPorcentaje(p);
                }}
                disabled={enviando}
                placeholder="30"
                className="h-12 w-full bg-transparent text-[0.9375rem] tabular-nums text-foreground outline-none placeholder:text-muted-subtle"
              />
              <span className="text-[0.9375rem] text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        {/* El resultado dicho en castellano: el chequeo de sentido que no depende
            de entender qué campo es cuál. */}
        <p className="mt-3 text-[0.8125rem] font-medium text-muted-foreground">
          {interes > 0
            ? `Ganás ${formatARS(interes)} de interés.`
            : capital > 0 && total > 0
              ? "Sin interés: te devuelve lo mismo que le prestás."
              : "Escribí los dos montos y te muestro el interés."}
        </p>
      </section>

      <section className="rounded-xl bg-card p-5">
        <p className="text-[0.9375rem] font-semibold text-foreground">¿En cuántas cuotas?</p>
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {CUOTAS.map((n) => (
            <Pill key={n} activo={cuotas === n} onClick={() => setCuotas(n)}>
              {n === 1 ? "Un solo pago" : n}
            </Pill>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <div className="flex-1">
            <label
              htmlFor="primera"
              className="text-[0.8125rem] font-medium text-muted-foreground"
            >
              {cuotas === 1 ? "¿Cuándo te paga?" : "¿Cuándo te paga la primera?"}
            </label>
            <input
              id="primera"
              name="primera_fecha"
              type="date"
              value={primeraFecha}
              min={hoy}
              onChange={(e) => setPrimeraFecha(e.target.value)}
              disabled={enviando}
              className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground"
            />
          </div>

          {cuotas > 1 ? (
            <div className="flex-1">
              <label
                htmlFor="frecuencia"
                className="text-[0.8125rem] font-medium text-muted-foreground"
              >
                Cada cuánto
              </label>
              <select
                id="frecuencia"
                value={frecuencia}
                onChange={(e) => setFrecuencia(e.target.value)}
                disabled={enviando}
                className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground"
              >
                <option value="mensual">Mensual</option>
                <option value="quincenal">Quincenal</option>
                <option value="semanal">Semanal</option>
              </select>
            </div>
          ) : null}
        </div>
      </section>

      {/* El preview está SIEMPRE visible, nunca detrás de un botón: un preview
          que hay que pedir no se pide (§9.14). */}
      {preview.length > 0 ? (
        <section className="rounded-xl bg-card p-5">
          <p className="text-[0.9375rem] font-semibold text-foreground">Así te queda</p>
          <ul className="mt-3 flex flex-col gap-2">
            {preview.map((monto, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span className="text-[0.8125rem] font-medium text-foreground">
                  {preview.length > 1 ? `${i + 1}. ` : ""}
                  {fechaConDia(sumarDias(primeraFecha, i * (DIAS[frecuencia] ?? 30)))}
                </span>
                <span className="font-mono text-[0.875rem] tabular-nums text-foreground">
                  {formatARS(monto)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-border pt-3 text-[0.8125rem] font-medium text-muted-foreground">
            {preview.length === 1 ? "Un solo pago" : `${preview.length} cuotas`} ·{" "}
            <span className="tabular-nums">{formatARS(total)}</span> en total
          </p>
        </section>
      ) : null}

      <p
        role="alert"
        aria-live="polite"
        className={`mt-2 text-[0.8125rem] font-medium text-danger ${estado.error ? "" : "sr-only"}`}
      >
        {estado.error ?? ""}
      </p>

      <button
        type="submit"
        disabled={enviando || preview.length === 0 || !clienteId}
        className="mt-4 h-14 rounded-full bg-primary text-[0.9375rem] font-semibold text-primary-foreground disabled:opacity-60"
      >
        {enviando ? "Creando…" : "Crear el préstamo"}
      </button>
    </form>
  );
}
