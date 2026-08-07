"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cambiarFechaCuota, deshacerCobro, reprogramarPlan } from "@/app/acciones-prestamo";
import { Boton } from "@/components/boton";
import { Campo, INPUT, Segmentado } from "@/components/campo";
import { ColumnaMonto, Monto } from "@/components/monto";
import { Rotulo } from "@/components/rotulo";
import { FilaLectura } from "@/components/superficie";
import { fechaConDia, sumarDias } from "@/lib/fecha";
import { formatARS, repartirMonto } from "@/lib/money";

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

const CUERPO = "text-[0.875rem] font-medium tracking-[-0.006em]";
const MONTO_LECTURA = "font-mono text-[0.95rem] font-normal tracking-[-0.01em]";

/** Nada de `disabled`: el botón conserva contraste y su etiqueta dice qué pasa. */
function Cancelar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 shrink-0 px-3 ${CUERPO} text-texto-suave`}
    >
      Cancelar
    </button>
  );
}

function MensajeError({ children }: { children: string }) {
  return (
    <p role="alert" className={`${CUERPO} text-peligro`}>
      {children}
    </p>
  );
}

/**
 * Mover la fecha de una cuota suelta. Es lo más frecuente: se corre un cobro.
 * Vive adentro del escalón, pegada a la cuota que modifica.
 */
export function CambiarFecha({ cuotaId, fecha }: { cuotaId: string; fecha: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState(fecha);
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();

  if (!abierto) {
    return (
      <Boton peso="texto" type="button" onClick={() => setAbierto(true)}>
        Cambiar la fecha
      </Boton>
    );
  }

  const guardar = () => {
    if (guardando) return;
    empezar(async () => {
      setError(null);
      const r = await cambiarFechaCuota(cuotaId, valor);
      if (r.error) return setError(r.error);
      setAbierto(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Campo label="Nueva fecha de cobro" htmlFor={`fecha-${cuotaId}`}>
        <input
          id={`fecha-${cuotaId}`}
          type="date"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          disabled={guardando}
          className={INPUT}
        />
      </Campo>
      {error ? <MensajeError>{error}</MensajeError> : null}
      <div className="flex items-center gap-2">
        {/* Fantasma y no llena: el relleno de este bloque ya se lo lleva
            `Ya me pagó`, que es lo que registra plata. */}
        <Boton peso="fantasma" type="button" onClick={guardar} className="flex-1">
          {guardando ? "Guardando…" : "Guardar la fecha"}
        </Boton>
        <Cancelar onClick={() => setAbierto(false)} />
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
  const [frecuencia, setFrecuencia] = useState<string>("mensual");
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();

  const preview = saldo > 0 ? repartirMonto(saldo, cantidad) : [];

  if (!abierto) {
    return (
      <FilaLectura>
        <Boton
          peso="texto"
          type="button"
          onClick={() => setAbierto(true)}
          className="w-full justify-start"
        >
          Cambiar las cuotas y las fechas
        </Boton>
      </FilaLectura>
    );
  }

  const guardar = () => {
    if (guardando) return;
    if (preview.length === 0) return;
    empezar(async () => {
      setError(null);
      const r = await reprogramarPlan(creditoId, cantidad, primera, frecuencia);
      if (r.error) return setError(r.error);
      setAbierto(false);
      router.refresh();
    });
  };

  const etiqueta = guardando
    ? "Guardando…"
    : preview.length === 0
      ? "No queda saldo para reprogramar"
      : "Guardar el plan";

  return (
    <FilaLectura className="flex-col items-stretch justify-start gap-5 py-5">
      <div>
        <p className="font-display text-[1.375rem] font-bold tracking-[-0.025em]">
          Reprogramar lo que falta
        </p>
        <p className={`mt-1 ${CUERPO} text-texto-suave`}>
          Queda un saldo de {formatARS(saldo)}. Lo que ya cobraste no se toca.
        </p>
      </div>

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
        htmlFor={`repro-primera-${creditoId}`}
      >
        <input
          id={`repro-primera-${creditoId}`}
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

      {preview.length > 0 ? (
        <div>
          <Rotulo>Así te queda</Rotulo>
          <ul className="mt-2 flex flex-col gap-1.5">
            {preview.map((monto, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span className={CUERPO}>
                  {fechaConDia(sumarDias(primera, i * (DIAS[frecuencia] ?? 30)))}
                </span>
                {/* Por `<Monto>` y sobre el riel de 108px, como todo monto de la
                    app: el `$` se compone aparte y la columna alinea sola. */}
                <ColumnaMonto>
                  <Monto valor={monto} className={MONTO_LECTURA} />
                </ColumnaMonto>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <MensajeError>{error}</MensajeError> : null}

      <div className="flex items-center gap-2">
        <Boton peso="lleno" type="button" onClick={guardar} className="flex-1">
          {etiqueta}
        </Boton>
        <Cancelar onClick={() => setAbierto(false)} />
      </div>
    </FilaLectura>
  );
}

/**
 * Deshacer un cobro. Es lo único irreversible de esta pantalla, así que es lo
 * único que confirma — y nunca vive al lado de `Ya me pagó`.
 */
export function DeshacerCobro({ cuotaId }: { cuotaId: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();

  if (error) return <MensajeError>{error}</MensajeError>;

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className={`-ml-1 h-12 px-1 ${CUERPO} text-texto-suave`}
      >
        Deshacer el cobro
      </button>
    );
  }

  return (
    <span className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => {
          if (guardando) return;
          empezar(async () => {
            const r = await deshacerCobro(cuotaId);
            if (r.error) return setError(r.error);
            setConfirmando(false);
            router.refresh();
          });
        }}
        className={`-ml-1 h-12 px-1 ${CUERPO} font-semibold text-destructivo`}
      >
        {guardando ? "Deshaciendo…" : "Sí, deshacer"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className={`h-12 px-1 ${CUERPO} text-texto-suave`}
      >
        No
      </button>
    </span>
  );
}
