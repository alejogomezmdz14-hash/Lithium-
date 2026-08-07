"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Boton, BotonLink } from "@/components/boton";
import { Campo, INPUT, INPUT_PLATA, Segmentado } from "@/components/campo";
import { ColumnaMonto, Monto } from "@/components/monto";
import { Rotulo } from "@/components/rotulo";
import { BotonSubir } from "@/components/subir-documento";
import { Fila, Losa, Piedra } from "@/components/superficie";
import { REQUISITOS } from "@/lib/documentacion";
import { fechaConDia, sumarDias } from "@/lib/fecha";
import { formatARS, parseARS, repartirMonto } from "@/lib/money";

import { crearPrestamo, type EstadoNuevoPrestamo } from "./actions";
import { AltaRapida } from "./alta-rapida";
import { BuscadorDeCliente, ID_BUSCADOR, type ClienteElegible } from "./buscador-cliente";

const INICIAL: EstadoNuevoPrestamo = { error: null };

const PORCENTAJES = [0, 20, 30, 40, 50];

/** Los porcentajes que resuelven el 90% de los casos, más `Otro`, que no abre
 *  nada nuevo: le manda el foco al campo de interés que ya está ahí abajo. Son
 *  seis para que el bloque soldado cierre en dos filas de tres, sin celda hueca. */
const CHIPS_PORCENTAJE: { valor: string; label: string }[] = [
  ...PORCENTAJES.map((p) => ({ valor: String(p), label: p === 0 ? "Sin interés" : `${p}%` })),
  { valor: "otro", label: "Otro" },
];

/** Seis celdas otra vez, por el mismo motivo: el bloque soldado cierra en dos
 *  filas de tres y no queda un hueco donde debería haber una opción. */
const CHIPS_CUOTAS: { valor: number; label: string }[] = [
  { valor: 1, label: "Un solo pago" },
  { valor: 2, label: "2" },
  { valor: 3, label: "3" },
  { valor: 4, label: "4" },
  { valor: 6, label: "6" },
  { valor: 12, label: "12" },
];

const FRECUENCIAS = [
  { valor: "mensual", label: "Mensual" },
  { valor: "quincenal", label: "Quincenal" },
  { valor: "semanal", label: "Semanal" },
];

const DIAS: Record<string, number> = { mensual: 30, quincenal: 15, semanal: 7 };

const SEGUNDA_LINEA_BASE = "text-[0.875rem] font-medium tracking-[-0.006em]";
const SEGUNDA_LINEA = `${SEGUNDA_LINEA_BASE} text-texto-suave`;

/**
 * El fondo del destello del campo derivado.
 *
 * Va por `color-mix` sobre el material del campo y no por un token suelto porque
 * en claro `--vidrio` y `--vidrio-alto` son los dos blancos: un escalón de
 * material ahí no se ve, y el destello —que ES la explicación de cuál de los dos
 * campos es el calculado— quedaría mudo justo en el tema donde más blanco hay.
 * Mezclarle el azul de marca da un paso visible en los dos temas sin inventar un
 * color: es el mismo acento de siempre, prendido 180ms.
 *
 * (Antes esto era `var(--escalon)`, un token del sistema viejo que ya no existe.
 * Al ser inválido caía a `transparent`, y como el style inline le gana a
 * `.vidrio`, el campo se APAGABA en vez de encenderse: en claro se leía como
 * deshabilitado, o sea lo contrario de lo que el destello quiere decir.)
 */
const DESTELLO = "color-mix(in srgb, var(--marca) 12%, var(--vidrio-alto))";

export function PrestamoForm({ clientes, hoy }: { clientes: ClienteElegible[]; hoy: string }) {
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

  /**
   * El campo derivado **destella su fondo** 180ms y vuelve. El destello ES la
   * explicación de cuál de los dos campos es el calculado: no hace falta ni
   * candado, ni flechita, ni la etiqueta "calculado".
   *
   * Lo que NO se hace es tweenear el número. Eso obliga a contar sobre el
   * `value` de un input controlado, y durante 180ms el campo mostraría un monto
   * que **no es** `monto_total`: si toca el campo o manda el form a los 90ms, lo
   * que está en la caja no es el estado. Ese es exactamente el eco que este
   * formulario fue escrito para prevenir.
   */
  const [destello, setDestello] = useState<"monto" | "pct" | null>(null);
  const relojDestello = useRef<ReturnType<typeof setTimeout> | null>(null);

  function destellar(cual: "monto" | "pct") {
    if (relojDestello.current) clearTimeout(relojDestello.current);
    setDestello(cual);
    // Mientras tipea el reloj se reinicia: el campo derivado queda encendido y
    // se apaga 180ms después de que soltó la tecla.
    relojDestello.current = setTimeout(() => setDestello(null), 180);
  }

  useEffect(() => {
    return () => {
      if (relojDestello.current) clearTimeout(relojDestello.current);
    };
  }, []);

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

  /**
   * El caso que faltaba: escribió un total MENOR al capital.
   *
   * `interes` se clampea a 0 acá arriba, así que sin esta bandera la frase de
   * chequeo de sentido caía en la misma rama que `total === capital` y decía
   * "te devuelve lo mismo que le prestás" — falso, y falso sobre plata. El
   * submit ya estaba bloqueado por `falta`, así que nunca se guardó nada malo;
   * lo que mentían eran las dos líneas que explican el número.
   */
  const devuelveMenos = capital > 0 && total > 0 && total < capital;

  // Lo que se manda al servidor, siempre el total calculado.
  const totalTexto = total > 0 ? String(total) : "";

  // Lo que se ve en cada campo: el que NO está escribiendo muestra el derivado.
  const montoMostrado =
    fuente === "monto" ? montoTexto : total > 0 ? formatARS(total).replace("$", "") : "";
  const pctMostrado = fuente === "porcentaje" ? pctTexto : porcentaje > 0 ? String(porcentaje) : "";

  const preset = PORCENTAJES.find((p) => Math.abs(pctEscrito - p) < 0.05);
  const chipPorcentaje =
    fuente === "porcentaje" && pctValido ? (preset !== undefined ? String(preset) : "otro") : null;

  function aplicarPorcentaje(p: number) {
    setFuente("porcentaje");
    setPctTexto(String(p));
    destellar("monto");
  }

  const preview = capital > 0 && total >= capital ? repartirMonto(total, cuotas) : [];

  /**
   * Los pasos se numeran por lo que **se ve**, no por lo que existe en el código.
   *
   * El de papeles solo aparece una vez que hay alguien elegido —antes no se sabe
   * qué pedirle—, así que al abrir el formulario la pantalla mostraba `1 · … 3 ·
   * … 4 · … 5 · …`. Una lista numerada que salta del 1 al 3 la manda a buscar
   * hacia arriba un paso que no se le pasó por alto: no existe todavía.
   */
  const hayPasoDePapeles = Boolean(cliente && !altaAbierta);
  const paso = (n: number) => (hayPasoDePapeles ? n : n - 1);

  /**
   * No existe `disabled`: el botón conserva contraste pleno y **su etiqueta dice
   * qué falta**. Al tocarlo no hace nada y el campo que falta recibe el foco.
   * (El azul al 60% sobre el escalón claro deja el blanco en 1.62:1: el estado
   * deshabilitado de antes era literalmente ilegible.)
   */
  const falta =
    !clienteId
      ? { texto: "Falta elegir a quién", campo: ID_BUSCADOR }
      : capital <= 0
        ? { texto: "Escribí cuánto le prestás", campo: "capital" }
        : total < capital || total <= 0
          ? { texto: "Escribí cuánto te devuelve", campo: "total" }
          : null;

  return (
    <form action={accion} className="flex flex-col">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <input type="hidden" name="total" value={totalTexto} />
      <input type="hidden" name="cuotas" value={cuotas} />
      <input type="hidden" name="frecuencia" value={frecuencia} />

      {/* 1 ------------------------------------------------------------------ */}
      <Rotulo>1 · ¿A quién le prestás?</Rotulo>

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
            <Boton
              peso="texto"
              type="button"
              onClick={() => setAltaAbierta(true)}
              className="mt-2.5 self-start"
            >
              Es alguien nuevo
            </Boton>
          ) : null}
        </>
      )}

      {/* 2 — los papeles, DENTRO del alta de la deuda. Es donde se los pide en la
          vida real: la persona está enfrente con los papeles en la mano. ------ */}
      {cliente && !altaAbierta ? (
        <div className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <Rotulo>2 · Papeles</Rotulo>
            {cliente.papeles ? (
              <span
                className={`text-[0.875rem] font-medium tracking-[-0.006em] ${
                  cliente.papelesOk ? "text-texto-suave" : "text-atencion"
                }`}
              >
                {cliente.papeles}
              </span>
            ) : null}
          </div>

          {!cliente.tipo ? (
            <>
              <p className={`mt-2.5 ${SEGUNDA_LINEA}`}>
                Para saber qué papeles pedirle hay que definir de qué tipo es.
              </p>
              <BotonLink peso="texto" href={`/clientes/${cliente.id}`} className="self-start">
                Definirlo ahora
              </BotonLink>
            </>
          ) : (
            <>
              <Losa className="mt-2.5">
                {REQUISITOS[cliente.tipo].map((r) => (
                  <Fila key={r.tipo}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[1rem] font-semibold tracking-[-0.011em] text-texto">
                        {r.label}
                      </p>
                      <BotonSubir
                        clienteId={cliente.id}
                        tipo={r.tipo}
                        etiqueta={r.singular}
                        pidePeriodo={r.pidePeriodo}
                      />
                    </div>
                  </Fila>
                ))}
              </Losa>
              <p className={`mt-2.5 ${SEGUNDA_LINEA}`}>
                Podés crear el préstamo igual y subir los papeles después.
              </p>
            </>
          )}
        </div>
      ) : null}

      {/* 3 ------------------------------------------------------------------ */}
      <div className="mt-8">
        <Rotulo>{paso(3)} · ¿Cuánto le prestás?</Rotulo>
        <div className="relative mt-2.5">
          <span
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[1rem] font-medium text-texto-suave"
          >
            $
          </span>
          <input
            id="capital"
            name="capital"
            type="text"
            inputMode="numeric"
            // Sin autoFocus: en el celular abre el teclado y tapa el paso 1, que
            // es justamente elegir a quién.
            value={capitalTexto}
            onChange={(e) => {
              setCapitalTexto(e.target.value);
              // Cambiar el capital mueve el otro lado del par: el que se recalcula
              // es el que ella NO está sosteniendo.
              destellar(fuente === "porcentaje" ? "monto" : "pct");
            }}
            disabled={enviando}
            placeholder="400.000"
            className={INPUT_PLATA}
            // El `$` va montado adentro del campo, así que el texto arranca
            // corrido. Va por style y no por clase para ganarle sin ambigüedad al
            // padding que trae la constante compartida.
            style={{ paddingLeft: 38 }}
          />
        </div>
      </div>

      {/* 4 ------------------------------------------------------------------ */}
      <div className="mt-8">
        <Rotulo>{paso(4)} · ¿Cuánto te tiene que devolver?</Rotulo>

        <Segmentado
          className="mt-2.5"
          etiqueta="Interés"
          columnas={3}
          opciones={CHIPS_PORCENTAJE}
          valor={chipPorcentaje}
          onChange={(v) => {
            if (v === "otro") {
              setFuente("porcentaje");
              document.getElementById("porcentaje")?.focus();
              return;
            }
            aplicarPorcentaje(Number(v));
          }}
        />

        {/* El par no son dos campos pares, y por eso no se pueden confundir:
            `Tengo que cobrar` mide el doble y va en mono grande porque ES el
            número real (`monto_total`); `Interés` es angosto y chico porque es
            solo una forma de expresarlo. */}
        <div className="mt-2.5 flex items-end gap-2.5">
          <div className="flex-[2]">
            <Campo label="Tengo que cobrar" htmlFor="total">
              <div className="relative">
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[1rem] font-medium text-texto-suave"
                >
                  $
                </span>
                <input
                  id="total"
                  type="text"
                  inputMode="numeric"
                  value={montoMostrado}
                  onChange={(e) => {
                    setFuente("monto");
                    setMontoTexto(e.target.value);
                    destellar("pct");
                  }}
                  disabled={enviando}
                  placeholder="520.000"
                  className={`${INPUT_PLATA} transition-[background-color] duration-[180ms] ease-salida`}
                  style={{
                    paddingLeft: 38,
                    ...(destello === "monto" ? { backgroundColor: DESTELLO } : null),
                  }}
                />
              </div>
            </Campo>
          </div>

          <div className="flex-1">
            <Campo label="Interés" htmlFor="porcentaje">
              <div className="relative">
                <input
                  id="porcentaje"
                  type="text"
                  inputMode="decimal"
                  value={pctMostrado}
                  onChange={(e) => {
                    setFuente("porcentaje");
                    setPctTexto(e.target.value);
                    destellar("monto");
                  }}
                  disabled={enviando}
                  placeholder="30"
                  className={`${INPUT} transition-[background-color] duration-[180ms] ease-salida`}
                  style={{
                    paddingRight: 32,
                    ...(destello === "pct" ? { backgroundColor: DESTELLO } : null),
                  }}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[1rem] text-texto-suave"
                >
                  %
                </span>
              </div>
            </Campo>
          </div>
        </div>

        {/* El resultado dicho en castellano: el chequeo de sentido que no depende
            de entender cuál campo es cuál. */}
        <p
          className={`mt-2.5 ${SEGUNDA_LINEA_BASE} ${
            devuelveMenos ? "text-atencion" : "text-texto-suave"
          }`}
        >
          {interes > 0
            ? `Ganás ${formatARS(interes)} de interés.`
            : devuelveMenos
              ? `Te devuelve ${formatARS(capital - total)} menos de lo que le prestás.`
              : capital > 0 && total > 0
                ? "Sin interés: te devuelve lo mismo que le prestás."
                : capital <= 0
                  ? "Escribí arriba cuánto le prestás."
                  : "Tocá un porcentaje o escribí el monto."}
        </p>
      </div>

      {/* 5 ------------------------------------------------------------------ */}
      <div className="mt-8">
        <Rotulo>{paso(5)} · ¿En cuántas cuotas?</Rotulo>

        {/* `Un solo pago` vive en la misma escalera que 2 · 3 · 6 · 12: es
            `cantidad_cuotas = 1` dicho en el idioma de ella, no un switch aparte.
            Un camino de código, un camino mental. */}
        <Segmentado
          className="mt-2.5"
          etiqueta="Cantidad de cuotas"
          columnas={3}
          opciones={CHIPS_CUOTAS}
          valor={cuotas}
          onChange={setCuotas}
        />

        <div className="mt-2.5 flex gap-2.5">
          <div className="flex-1">
            <Campo label={cuotas === 1 ? "Fecha de pago" : "Primera fecha"} htmlFor="primera">
              <input
                id="primera"
                name="primera_fecha"
                type="date"
                value={primeraFecha}
                min={hoy}
                onChange={(e) => setPrimeraFecha(e.target.value)}
                disabled={enviando}
                className={INPUT}
              />
            </Campo>
          </div>

          {cuotas > 1 ? (
            <div className="flex-1">
              <Campo label="Cada cuánto" htmlFor="frecuencia">
                <select
                  id="frecuencia"
                  value={frecuencia}
                  onChange={(e) => setFrecuencia(e.target.value)}
                  disabled={enviando}
                  className={INPUT}
                >
                  {FRECUENCIAS.map((f) => (
                    <option key={f.valor} value={f.valor}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          ) : null}
        </div>
      </div>

      {/* La piedra del preview va STICKY al pie: mientras tipea, el plan y el
          total están siempre a la vista, y el botón que crea el préstamo también.
          Antes había que scrollear hasta el fondo para verlo — y un preview que
          hay que buscar no se busca.

          Mientras el alta rápida está abierta se esconde: ahí la tarea es cargar
          a la persona, y un botón de crear el préstamo pisando esa pantalla
          invita a mandar el formulario a medias. */}
      {altaAbierta ? null : (
        <div className="sticky bottom-4 z-20 mt-8">
          <Piedra>
            <Rotulo>Así te queda</Rotulo>

            {preview.length > 0 ? (
              <>
                <p className="mt-1 font-display text-[2.75rem] font-bold leading-[0.98] tracking-[-0.04em]">
                  <Monto valor={total} />
                </p>
                <p className={`mt-1 ${SEGUNDA_LINEA}`}>
                  {preview.length === 1
                    ? `Un solo pago el ${fechaConDia(primeraFecha)}`
                    : `${preview.length} cuotas · la primera el ${fechaConDia(primeraFecha)}`}
                </p>

                {preview.length > 1 ? (
                  <ul className="mt-3 max-h-[6.5rem] overflow-y-auto">
                    {preview.map((monto, i) => (
                      <li key={i} className="flex h-8 items-center justify-between gap-3">
                        <span className={SEGUNDA_LINEA}>
                          {i + 1} · {fechaConDia(sumarDias(primeraFecha, i * (DIAS[frecuencia] ?? 30)))}
                        </span>
                        <ColumnaMonto>
                          <Monto
                            valor={monto}
                            className="font-mono text-[0.95rem] font-normal tracking-[-0.01em]"
                          />
                        </ColumnaMonto>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className={`mt-1 ${SEGUNDA_LINEA}`}>
                {devuelveMenos
                  ? "El total tiene que ser al menos lo que le prestás."
                  : "Cargá cuánto le prestás y cuánto te devuelve, y acá te aparece el plan."}
              </p>
            )}

            <p
              role="alert"
              className={`mt-3 text-[0.875rem] font-medium tracking-[-0.006em] text-peligro ${
                estado.error ? "" : "sr-only"
              }`}
            >
              {estado.error ?? ""}
            </p>

            <Boton
              peso="lleno"
              type="submit"
              className="mt-4"
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
              {enviando ? "Creando…" : (falta?.texto ?? "Crear el préstamo")}
            </Boton>
          </Piedra>
        </div>
      )}
    </form>
  );
}
