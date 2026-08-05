"use client";

import { useActionState, useState } from "react";

import { fechaConDia, sumarDias } from "@/lib/fecha";
import { formatARS, parseARS, repartirMonto } from "@/lib/money";

import Link from "next/link";

import { BotonSubir } from "@/components/subir-documento";
import { REQUISITOS } from "@/lib/documentacion";

import { crearPrestamo, type EstadoNuevoPrestamo } from "./actions";
import { AltaRapida } from "./alta-rapida";
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
      // select-none: sin esto, tocar varias veces seguidas selecciona el texto
      // y el chip queda pintado de azul como si estuviera roto.
      className={`h-12 shrink-0 select-none rounded-full px-4 text-[0.8125rem] font-semibold ${
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
  const [altaAbierta, setAltaAbierta] = useState(false);
  const clienteId = cliente?.id ?? "";
  const [capitalTexto, setCapitalTexto] = useState("");
  const [cuotas, setCuotas] = useState(1);
  const [primeraFecha, setPrimeraFecha] = useState(sumarDias(hoy, 30));
  const [frecuencia, setFrecuencia] = useState("mensual");

  /**
   * Se puede escribir el MONTO o el PORCENTAJE, cualquiera de los dos.
   *
   * `fuente` dice cuál escribió ella última; el otro se calcula. Así nunca se
   * reescribe el campo que está tocando, que es lo que hacía saltar el número
   * abajo del cursor.
   *
   * Y el porcentaje se guarda aunque todavía no haya puesto el capital: antes
   * tocar "30%" con el monto vacío no hacía absolutamente nada, en silencio.
   * Ahora queda elegido y el total aparece solo apenas escribe cuánto presta.
   */
  const [fuente, setFuente] = useState<"monto" | "porcentaje">("porcentaje");
  const [montoTexto, setMontoTexto] = useState("");
  const [pctTexto, setPctTexto] = useState("");

  const capital = parseARS(capitalTexto) ?? 0;
  const pctEscrito = Number(pctTexto.replace(",", "."));
  const pctValido = pctTexto.trim() !== "" && Number.isFinite(pctEscrito) && pctEscrito >= 0;

  // El total es la fuente de verdad que se guarda (monto_total, §2).
  const total =
    fuente === "porcentaje" && capital > 0 && pctValido
      ? Math.round(capital * (1 + pctEscrito / 100))
      : (parseARS(montoTexto) ?? 0);

  const porcentaje =
    fuente === "porcentaje" && pctValido
      ? pctEscrito
      : capital > 0 && total > 0
        ? Math.round((total / capital - 1) * 1000) / 10
        : 0;

  const interes = total > capital ? total - capital : 0;

  // Lo que se manda al servidor, siempre el total calculado.
  const totalTexto = total > 0 ? String(total) : "";

  // Lo que se ve en cada campo: el que NO está escribiendo muestra el derivado.
  const montoMostrado =
    fuente === "monto" ? montoTexto : total > 0 ? formatARS(total).replace("$", "") : "";
  const pctMostrado = fuente === "porcentaje" ? pctTexto : porcentaje > 0 ? String(porcentaje) : "";

  const aplicarPorcentaje = (p: number) => {
    setFuente("porcentaje");
    setPctTexto(String(p));
  };

  const preview = capital > 0 && total >= capital ? repartirMonto(total, cuotas) : [];

  return (
    <form action={accion} className="flex flex-col gap-2">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <input type="hidden" name="total" value={totalTexto} />
      <input type="hidden" name="cuotas" value={cuotas} />
      <input type="hidden" name="frecuencia" value={frecuencia} />

      <section className="rounded-xl bg-card p-5">
        <p className="text-[0.9375rem] font-semibold text-foreground">1. ¿A quién le prestás?</p>

        {altaAbierta ? (
          <AltaRapida
            alCrear={(c) => {
              setCliente(c);
              setAltaAbierta(false);
            }}
            alCancelar={() => setAltaAbierta(false)}
          />
        ) : (
          <>
            <BuscadorDeCliente
              clientes={clientes}
              elegido={cliente}
              alElegir={setCliente}
              deshabilitado={enviando}
            />
            {!cliente ? (
              <button
                type="button"
                onClick={() => setAltaAbierta(true)}
                disabled={enviando}
                className="mt-2 h-12 w-full rounded-full bg-surface-raised text-[0.8125rem] font-semibold text-primary-text"
              >
                + Es alguien nuevo
              </button>
            ) : null}
          </>
        )}
      </section>

      {/* 2. Los papeles, DENTRO del alta de la deuda. Es donde se los pide en la
          vida real: la persona está enfrente con los papeles en la mano. */}
      {cliente ? (
        <section className="rounded-xl bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[0.9375rem] font-semibold text-foreground">2. Documentación</p>
            {cliente.papeles ? (
              <span
                className={`text-[0.8125rem] font-medium ${
                  cliente.papelesOk ? "text-muted-foreground" : "text-warning"
                }`}
              >
                {cliente.papeles}
              </span>
            ) : null}
          </div>

          {!cliente.tipo ? (
            <p className="mt-2 text-[0.8125rem] font-medium text-muted-foreground">
              Para saber qué papeles pedirle hay que definir de qué tipo es.{" "}
              <Link href={`/clientes/${cliente.id}`} className="text-primary-text">
                Definirlo ahora ›
              </Link>
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {REQUISITOS[cliente.tipo].map((r) => (
                <div key={r.tipo} className="rounded-lg bg-surface-raised p-4">
                  <p className="text-[0.8125rem] font-semibold text-foreground">{r.label}</p>
                  <BotonSubir
                    clienteId={cliente.id}
                    tipo={r.tipo}
                    etiqueta={r.singular}
                    pidePeriodo={r.pidePeriodo}
                  />
                </div>
              ))}
              <p className="text-[0.8125rem] font-medium text-muted-foreground">
                Podés crear el préstamo igual y subir los papeles después.
              </p>
            </div>
          )}
        </section>
      ) : null}

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

        {/* Los chips resuelven el 90% de los casos sin tipear nada. Funcionan
            aunque el capital esté vacío: queda elegido el %, y el total aparece
            solo apenas se escribe cuánto presta. */}
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {PORCENTAJES.map((p) => (
            <Pill
              key={p}
              activo={fuente === "porcentaje" && pctValido && Math.abs(pctEscrito - p) < 0.05}
              onClick={() => aplicarPorcentaje(p)}
            >
              {p === 0 ? "Sin interés" : `${p}%`}
            </Pill>
          ))}
        </div>

        {/* Se puede escribir cualquiera de los dos. El que no estás tocando se
            calcula solo. */}
        <div className="mt-4 flex items-end gap-3">
          <div className="flex-[2]">
            <label htmlFor="total" className="text-[0.8125rem] font-medium text-muted-foreground">
              Te devuelve
            </label>
            <div className="mt-1 flex items-center gap-1 rounded-lg border border-border bg-background px-3">
              <span className="font-mono text-[1.0625rem] text-muted-foreground">$</span>
              <input
                id="total"
                type="text"
                inputMode="numeric"
                value={montoMostrado}
                onChange={(e) => {
                  setFuente("monto");
                  setMontoTexto(e.target.value);
                }}
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
              o el interés
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-border bg-background px-3">
              <input
                id="porcentaje"
                type="text"
                inputMode="decimal"
                value={pctMostrado}
                onChange={(e) => {
                  setFuente("porcentaje");
                  setPctTexto(e.target.value);
                }}
                disabled={enviando}
                placeholder="30"
                className="h-12 w-full bg-transparent text-[1.0625rem] tabular-nums text-foreground outline-none placeholder:text-muted-subtle"
              />
              <span className="text-[1.0625rem] text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        <input type="hidden" name="total" value={totalTexto} />

        {/* El resultado dicho en castellano: el chequeo de sentido. */}
        <p className="mt-3 text-[0.8125rem] font-medium text-muted-foreground">
          {interes > 0
            ? `Ganás ${formatARS(interes)} de interés.`
            : capital > 0 && total > 0
              ? "Sin interés: te devuelve lo mismo que le prestás."
              : capital <= 0
                ? "Escribí arriba cuánto le prestás."
                : "Tocá un porcentaje o escribí el monto."}
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
