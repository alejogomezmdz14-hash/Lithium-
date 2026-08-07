"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Boton } from "@/components/boton";
import { Campo, INPUT, Segmentado } from "@/components/campo";
import { NOMBRE_TIPO_CLIENTE, REQUISITOS, type TipoCliente } from "@/lib/documentacion";

import { cambiarTipo } from "@/app/acciones-documentos";

const TIPOS = (Object.keys(NOMBRE_TIPO_CLIENTE) as TipoCliente[]).map((t) => ({
  valor: t,
  label: NOMBRE_TIPO_CLIENTE[t],
}));

/**
 * De qué tipo es la persona: es lo que determina qué papeles hay que pedirle.
 *
 * El tipo se guarda al tocarlo — no hay un "Guardar" aparte para una elección de
 * una sola opción. La celda elegida es el ESCALÓN: el mismo material que en una
 * lista dice "actuá acá" acá dice "esto es lo elegido". Un concepto, seis usos.
 */
export function SelectorDeTipo({
  clienteId,
  actual,
  garanteNombre,
  garanteTelefono,
}: {
  clienteId: string;
  actual: TipoCliente | null;
  garanteNombre: string | null;
  garanteTelefono: string | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(actual === null);
  const [elegido, setElegido] = useState<TipoCliente | null>(actual);
  const [nombre, setNombre] = useState(garanteNombre ?? "");
  const [telefono, setTelefono] = useState(garanteTelefono ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();

  function guardar(tipo: TipoCliente | null) {
    // El botón nunca se deshabilita —el azul apagado es ilegible al sol—, así
    // que el segundo toque se ignora acá.
    if (guardando) return;
    setElegido(tipo);
    setError(null);
    empezar(async () => {
      const r = await cambiarTipo(clienteId, tipo, { nombre, telefono });
      if (r.error) {
        setError(r.error);
        return;
      }
      setAbierto(false);
      router.refresh();
    });
  }

  if (!abierto) {
    return (
      <Boton peso="texto" onClick={() => setAbierto(true)} className="mt-1">
        Cambiar el tipo de cliente
      </Boton>
    );
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2.5">
      <Campo label="Tipo de cliente" ayuda="Determina qué documentación hay que pedirle.">
        <Segmentado
          etiqueta="Tipo de cliente"
          columnas={2}
          opciones={TIPOS}
          valor={elegido}
          onChange={guardar}
        />
      </Campo>

      {elegido ? (
        <p className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
          Hay que pedirle: {REQUISITOS[elegido].map((r) => r.label.toLowerCase()).join(" · ")}.
        </p>
      ) : null}

      {/* El garante se pide en PAMI, y nunca es obligatorio: exigirlo frenaría el
          alta de alguien parada en la puerta de la casa. */}
      {elegido === "pami" ? (
        <div className="mt-2.5 flex flex-col gap-2.5">
          <Campo
            label="Garante"
            ayuda="Opcional. Si alguna vez hay que reclamarle, vas a necesitar el teléfono."
          >
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoCapitalize="words"
              disabled={guardando}
              placeholder="Nombre y apellido"
              className={INPUT}
            />
          </Campo>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            type="tel"
            inputMode="tel"
            disabled={guardando}
            placeholder="Su teléfono"
            aria-label="Teléfono del garante"
            className={INPUT}
          />
          <Boton peso="texto" onClick={() => guardar("pami")}>
            {guardando ? "Guardando…" : "Guardar el garante"}
          </Boton>
        </div>
      ) : null}

      <p
        role="alert"
        className={`text-[0.875rem] font-medium tracking-[-0.006em] text-peligro ${
          error ? "" : "sr-only"
        }`}
      >
        {error ?? ""}
      </p>

      {actual !== null ? (
        <Boton peso="texto" onClick={() => (guardando ? undefined : setAbierto(false))}>
          Dejarlo como estaba
        </Boton>
      ) : null}
    </div>
  );
}
