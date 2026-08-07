import { notFound } from "next/navigation";

import { Atomo } from "@/components/atomo";
import { BotonLink, Volver } from "@/components/boton";
import { ColumnaMonto, Monto } from "@/components/monto";
import { Rotulo } from "@/components/rotulo";
import { Escalon, Fila, Losa, Piedra, Riel } from "@/components/superficie";
import { TiraDeCuotas } from "@/components/tira";
import { diasEntre, estadoCuotaUI, fechaConDia, hoyEnBA, laQueSigue } from "@/lib/fecha";
import { formatARS } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

import { CambiarFecha, DeshacerCobro, Reprogramar } from "./editar";
import { EditarPrestamo } from "./editar-todo";

export const metadata = { title: "Préstamo — Lithium" };

type Props = { params: Promise<{ id: string }> };

type Cuota = {
  id: string;
  numero: number;
  monto: number | string;
  fecha_cobro: string;
  pagado_el: string | null;
  parcial: boolean;
};

/** Arriba de esto, las cobradas colapsan: la accionable no puede caer bajo el fold. */
const COBRADAS_A_LA_VISTA = 4;

const NOMBRE = "text-[1rem] font-semibold tracking-[-0.011em]";
const CUERPO = "text-[0.875rem] font-medium tracking-[-0.006em]";
const MONTO_FILA = "font-mono text-[0.95rem] font-medium tracking-[-0.01em]";

/**
 * Detalle del préstamo y plan de cuotas. Ver `.spec-adoquin.md` §4.4.
 *
 * **Estado derivado en render, nunca leído de `cuotas.estado`.** El cron escribe
 * esa columna a las 9:00 y las alertas dependen de ella; la UI no la lee para
 * pintar, porque entre las 00:00 y las 9:00, o si el cron falla, la pantalla
 * miente.
 */
export default async function DetallePrestamo({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("creditos")
    .select(
      "id,monto,monto_total,con_interes,tasa,cantidad_cuotas,fecha_otorgado,clientes!inner(id,nombre),cuotas(id,numero,monto,fecha_cobro,pagado_el,parcial)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const credito = data as unknown as {
    id: string;
    monto: number | string;
    monto_total: number | string;
    con_interes: boolean;
    tasa: number | null;
    cantidad_cuotas: number;
    fecha_otorgado: string;
    clientes: { id: string; nombre: string };
    cuotas: Cuota[];
  };

  const hoy = hoyEnBA();
  const cuotas = [...credito.cuotas].sort((a, b) => a.numero - b.numero);
  const cobradas = cuotas.filter((c) => c.pagado_el !== null);
  const impagas = cuotas.filter((c) => c.pagado_el === null);
  const saldo = impagas.reduce((s, c) => s + Number(c.monto), 0);
  const yaCobrado = cobradas.reduce((s, c) => s + Number(c.monto), 0);
  const siguiente = laQueSigue(cuotas);

  const tarde = cobradas.filter(
    (c) =>
      estadoCuotaUI({ fecha_cobro: c.fecha_cobro, pagado_el: c.pagado_el }, hoy) ===
      "cobrada_tarde",
  ).length;
  const conAtrasoAhora = impagas.filter((c) => c.fecha_cobro < hoy).length;

  const unSoloPago = cuotas.length === 1;
  const terminado = impagas.length === 0;
  // Las cobradas se colapsan como bloque y van arriba: en un plan normal son
  // justamente las primeras, y así la accionable queda a un scroll de nada.
  const colapsarCobradas = cobradas.length > COBRADAS_A_LA_VISTA;

  const caption = [
    `${cobradas.length} de ${cuotas.length} cobradas`,
    tarde > 0 ? `${tarde} ${tarde === 1 ? "llegó tarde" : "llegaron tarde"}` : null,
    conAtrasoAhora > 0 ? `${conAtrasoAhora} con atraso` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
      <Volver href={`/clientes/${credito.clientes.id}`}>{credito.clientes.nombre}</Volver>

      <Piedra className="mt-2.5">
        <p className={`${CUERPO} text-texto-suave`}>{terminado ? "Cobrado" : "Te deben"}</p>
        <p className="mt-1 font-display text-[2.75rem] font-bold leading-[0.98] tracking-[-0.04em]">
          <Monto valor={terminado ? yaCobrado : saldo} />
        </p>
        <p className={`mt-1.5 ${CUERPO} text-texto-suave`}>
          de {formatARS(Number(credito.monto_total))} · le prestaste{" "}
          {formatARS(Number(credito.monto))}
          {credito.con_interes && credito.tasa ? ` al ${credito.tasa}%` : " sin interés"}
        </p>

        {unSoloPago ? (
          // Sin tira y sin caption: "cuota 1 de 1" no lo dice nadie. Mismo
          // código, otra cara.
          <p className={`mt-4 ${CUERPO} text-texto-suave`}>Un solo pago</p>
        ) : (
          <>
            <div className="mt-5">
              <TiraDeCuotas total={cuotas.length} cobradas={cobradas.length} />
            </div>
            <p className={`mt-2.5 ${CUERPO} text-texto-suave`}>{caption}</p>
          </>
        )}

        {terminado ? (
          // El único momento en que la app se puede permitir mostrar la marca es
          // cuando no hay nada que correr, que es cuando ella está más contenta.
          <div className="mt-5 flex items-center gap-3 text-marca-texto">
            <Atomo size={40} />
            <p className="font-display text-[1.375rem] font-bold tracking-[-0.025em] text-texto">
              Terminado. Te pagó todo.
            </p>
          </div>
        ) : null}
      </Piedra>

      {unSoloPago ? null : <Rotulo className="mt-8">Las {cuotas.length} cuotas</Rotulo>}

      <Losa className={unSoloPago ? "mt-8" : "mt-2.5"}>
        {colapsarCobradas ? (
          <details className="group">
            <summary className="list-none [&::-webkit-details-marker]:hidden">
              <Fila>
                {/* Va en la misma canaleta de 20px que los glifos del riel: el
                    ⌄ de un cajón y el ✓ de una cuota comparten columna. */}
                <span
                  aria-hidden
                  className="-ml-1 flex w-5 shrink-0 justify-center pt-[3px] text-texto-suave"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-[17px] transition-transform duration-[180ms] ease-salida group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className={NOMBRE}>Ya cobraste {cobradas.length} cuotas</p>
                  {tarde > 0 ? (
                    <p className={`mt-0.5 ${CUERPO} text-atencion`}>
                      {tarde === 1 ? "1 llegó tarde" : `${tarde} llegaron tarde`}
                    </p>
                  ) : null}
                </div>
                <ColumnaMonto>
                  <Monto valor={yaCobrado} className={MONTO_FILA} />
                </ColumnaMonto>
              </Fila>
            </summary>
            <div className="flex flex-col gap-[var(--junta)] pt-[var(--junta)]">
              {cobradas.map((c) => (
                <FilaCobrada key={c.id} cuota={c} total={cuotas.length} unSoloPago={unSoloPago} />
              ))}
            </div>
          </details>
        ) : (
          cobradas.map((c) => (
            <FilaCobrada key={c.id} cuota={c} total={cuotas.length} unSoloPago={unSoloPago} />
          ))
        )}

        {impagas.map((cuota) => {
          const conAtraso = cuota.fecha_cobro < hoy;
          const titulo = unSoloPago ? "Un solo pago" : `Cuota ${cuota.numero} de ${cuotas.length}`;
          const monto = Number(cuota.monto);

          const meta = conAtraso ? (
            <p className={`mt-0.5 ${CUERPO} text-peligro`}>
              {diasEntre(cuota.fecha_cobro, hoy) === 1
                ? "1 día de atraso"
                : `${diasEntre(cuota.fecha_cobro, hoy)} días de atraso`}{" "}
              — vencía el {fechaConDia(cuota.fecha_cobro)}
            </p>
          ) : (
            <p className={`mt-0.5 ${CUERPO}`}>vence el {fechaConDia(cuota.fecha_cobro)}</p>
          );

          // La impaga de menor número es la levantada: una sola acción primaria
          // por pantalla. Si hay tres vencidas, la levantada es la más vieja.
          if (siguiente?.id === cuota.id) {
            return (
              <Escalon key={cuota.id} peligro={conAtraso}>
                <div className="flex items-start gap-3">
                  {conAtraso ? null : <Riel estado="futura" />}
                  <div className="min-w-0 flex-1">
                    <p className={NOMBRE}>{titulo}</p>
                    {meta}
                  </div>
                  <ColumnaMonto>
                    <Monto valor={monto} className={MONTO_FILA} />
                  </ColumnaMonto>
                </div>
                <BotonLink peso="lleno" href={`/cobrar/${cuota.id}`}>
                  Ya me pagó
                </BotonLink>
                <CambiarFecha cuotaId={cuota.id} fecha={cuota.fecha_cobro} />
              </Escalon>
            );
          }

          return (
            <Fila key={cuota.id} peligro={conAtraso}>
              {conAtraso ? null : <Riel estado="futura" />}
              <div className="min-w-0 flex-1">
                <p className={NOMBRE}>{titulo}</p>
                {meta}
              </div>
              {/* La fantasma no le saca la acción a ninguna cuota: pasa que te
                  pagan la 2 antes que la 1, y obligarla a ir en orden la manda
                  de vuelta al cuaderno. Lo que cambia es el peso, no la
                  presencia. */}
              <ColumnaMonto className="flex flex-col items-end gap-2">
                <Monto valor={monto} className={MONTO_FILA} />
                <BotonLink peso="fantasma" href={`/cobrar/${cuota.id}`}>
                  Ya me pagó
                </BotonLink>
              </ColumnaMonto>
            </Fila>
          );
        })}
      </Losa>

      {/* Editar y reprogramar bajan al final: arriba partían el plan de cuotas
          al medio, justo entre el número y las filas que lo explican. */}
      <Rotulo className="mt-8">El préstamo</Rotulo>
      <Losa className="mt-2.5">
        <EditarPrestamo
          creditoId={credito.id}
          capitalActual={Number(credito.monto)}
          totalActual={Number(credito.monto_total)}
          tasaActual={credito.tasa}
          yaCobrado={yaCobrado}
          cuotasImpagas={impagas.length}
          hoy={hoy}
        />
        <Reprogramar creditoId={credito.id} saldo={saldo} hoy={hoy} />
      </Losa>
    </main>
  );
}

/**
 * Una cuota ya cobrada: apagada, con el ✓ del riel.
 *
 * Ninguna línea de acá lleva color propio salvo el atraso: `apagada` baja el
 * texto a `texto-suave` por herencia (ver `Fila`), y encadenar un segundo gris
 * encima dejaría la fecha ilegible al sol. Antes esto se hacía con
 * `opacity-55` sobre el contenedor, que en tema claro tiraba el cuerpo a 4.05:1
 * y el `$` del monto a 2.47:1 — la plata ya cobrada terminaba siendo lo menos
 * legible de la pantalla.
 */
function FilaCobrada({
  cuota,
  total,
  unSoloPago,
}: {
  cuota: Cuota;
  total: number;
  unSoloPago: boolean;
}) {
  const pagadoEl = cuota.pagado_el!;
  const diasTarde = diasEntre(cuota.fecha_cobro, pagadoEl);

  return (
    <Fila apagada>
      <Riel estado="cobrada" />
      <div className="min-w-0 flex-1">
        <p className={NOMBRE}>{unSoloPago ? "Un solo pago" : `Cuota ${cuota.numero} de ${total}`}</p>
        <p className={`mt-0.5 ${CUERPO}`}>
          {diasTarde > 0 ? (
            <>
              {/* El naranja va SOLO en el atraso, y es el mismo de `Ojo`: no es
                  un color nuevo, es el color de la consecuencia. Texto, nunca
                  un badge. */}
              cobrada{" "}
              <span className="text-atencion">
                {diasTarde === 1 ? "1 día tarde" : `${diasTarde} días tarde`}
              </span>{" "}
              · {fechaConDia(pagadoEl)}
            </>
          ) : (
            <>cobrada el {fechaConDia(pagadoEl)}</>
          )}
        </p>
        {cuota.parcial ? (
          <p className={`mt-0.5 ${CUERPO} text-atencion`}>Se cobró de menos</p>
        ) : null}
        <DeshacerCobro cuotaId={cuota.id} />
      </div>
      <ColumnaMonto>
        <Monto valor={Number(cuota.monto)} className={MONTO_FILA} />
      </ColumnaMonto>
    </Fila>
  );
}
