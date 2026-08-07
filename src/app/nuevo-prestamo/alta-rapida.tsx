"use client";

import { useState } from "react";

import { Boton } from "@/components/boton";
import { Campo, INPUT, Segmentado } from "@/components/campo";
import { Rotulo } from "@/components/rotulo";
import { FilaLectura, Losa } from "@/components/superficie";
import { crearClienteRapido } from "@/app/acciones-documentos";
import { NOMBRE_TIPO_CLIENTE, REQUISITOS, type TipoCliente } from "@/lib/documentacion";

import type { ClienteElegible } from "./buscador-cliente";

const TIPOS: { valor: TipoCliente; label: string }[] = (
  Object.keys(NOMBRE_TIPO_CLIENTE) as TipoCliente[]
).map((t) => ({ valor: t, label: NOMBRE_TIPO_CLIENTE[t] }));

/**
 * Alta de una persona sin salir de la pantalla de la deuda.
 *
 * Se guarda apenas se confirma, y no al final junto con el préstamo, porque los
 * documentos necesitan que la persona exista: el archivo va a una carpeta con
 * su id. Guardar acá es lo que habilita subirle los papeles en el paso siguiente.
 *
 * Los campos son los del Excel que Candela ya lleva: nombre, DNI, localidad y
 * lugar de trabajo. Las etiquetas van en registro **neutro y profesional** — los
 * campos de un formulario se nombran, no se preguntan.
 */
export function AltaRapida({
  alCrear,
  alCancelar,
}: {
  alCrear: (c: ClienteElegible) => void;
  alCancelar: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [lugarTrabajo, setLugarTrabajo] = useState("");
  const [tipo, setTipo] = useState<TipoCliente | "">("");
  const [garanteNombre, setGaranteNombre] = useState("");
  const [garanteTelefono, setGaranteTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    const { cliente, error } = await crearClienteRapido({
      nombre,
      dni,
      telefono,
      localidad,
      lugarTrabajo,
      tipo,
      garanteNombre,
      garanteTelefono,
    });
    setGuardando(false);
    if (error || !cliente) {
      setError(error ?? "No se pudo guardar.");
      return;
    }
    alCrear({
      id: cliente.id,
      nombre: cliente.nombre,
      semaforo: "nuevo",
      tipo: cliente.tipo,
      papeles: cliente.tipo ? "Faltan los papeles" : null,
      papelesOk: false,
    });
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2.5">
      <Campo label="Nombre y apellido" htmlFor="alta-nombre">
        <input
          id="alta-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoFocus
          autoCapitalize="words"
          disabled={guardando}
          className={INPUT}
        />
      </Campo>

      <div className="flex gap-2.5">
        <div className="flex-1">
          <Campo label="DNI" htmlFor="alta-dni">
            <input
              id="alta-dni"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              inputMode="numeric"
              disabled={guardando}
              className={INPUT}
            />
          </Campo>
        </div>
        <div className="flex-1">
          <Campo label="Teléfono" htmlFor="alta-telefono">
            <input
              id="alta-telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              type="tel"
              inputMode="tel"
              disabled={guardando}
              className={INPUT}
            />
          </Campo>
        </div>
      </div>

      <div className="flex gap-2.5">
        <div className="flex-1">
          <Campo label="Localidad" htmlFor="alta-localidad">
            <input
              id="alta-localidad"
              value={localidad}
              onChange={(e) => setLocalidad(e.target.value)}
              autoCapitalize="words"
              disabled={guardando}
              className={INPUT}
            />
          </Campo>
        </div>
        <div className="flex-1">
          <Campo label="Lugar de trabajo" htmlFor="alta-trabajo">
            <input
              id="alta-trabajo"
              value={lugarTrabajo}
              onChange={(e) => setLugarTrabajo(e.target.value)}
              autoCapitalize="words"
              disabled={guardando}
              className={INPUT}
            />
          </Campo>
        </div>
      </div>

      {/* El tipo no es un dato administrativo: es lo que decide qué papeles hay
          que pedirle. Por eso la lista aparece acá abajo apenas se elige. */}
      <div className="mt-5">
        <Rotulo>Tipo de cliente</Rotulo>
        <Segmentado
          className="mt-2.5"
          etiqueta="Tipo de cliente"
          columnas={2}
          opciones={TIPOS}
          valor={tipo === "" ? null : tipo}
          onChange={(t) => setTipo(tipo === t ? "" : t)}
        />
      </div>

      {tipo ? (
        <div className="mt-5">
          {/* Las mismas palabras que en `/nuevo-cliente`, que es el otro lugar
              donde se elige el tipo: "documentación a presentar" es el registro
              del schema, no el de ella. */}
          <Rotulo>Papeles que le vas a pedir</Rotulo>
          <Losa className="mt-2.5">
            {REQUISITOS[tipo].map((r) => (
              <FilaLectura key={r.tipo}>
                <span className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto">
                  {r.label}
                </span>
              </FilaLectura>
            ))}
          </Losa>
        </div>
      ) : null}

      {tipo === "pami" ? (
        <div className="mt-5 flex flex-col gap-2.5">
          <Rotulo>Garante</Rotulo>
          <Campo label="Nombre" ayuda="Es opcional, también para PAMI." htmlFor="alta-garante">
            <input
              id="alta-garante"
              value={garanteNombre}
              onChange={(e) => setGaranteNombre(e.target.value)}
              autoCapitalize="words"
              disabled={guardando}
              className={INPUT}
            />
          </Campo>
          <Campo label="Teléfono del garante" htmlFor="alta-garante-tel">
            <input
              id="alta-garante-tel"
              value={garanteTelefono}
              onChange={(e) => setGaranteTelefono(e.target.value)}
              type="tel"
              inputMode="tel"
              disabled={guardando}
              className={INPUT}
            />
          </Campo>
        </div>
      ) : null}

      <p
        role="alert"
        className={`mt-3 text-[0.875rem] font-medium tracking-[-0.006em] text-peligro ${
          error ? "" : "sr-only"
        }`}
      >
        {error ?? ""}
      </p>

      {/* Sin `disabled`: la etiqueta dice qué falta y al tocarlo el foco se va al
          campo que falta. */}
      <Boton
        peso="lleno"
        type="button"
        className="mt-3"
        onClick={() => {
          if (guardando) return;
          if (nombre.trim().length < 2) {
            document.getElementById("alta-nombre")?.focus();
            return;
          }
          void guardar();
        }}
      >
        {guardando
          ? "Guardando…"
          : nombre.trim().length < 2
            ? "Falta el nombre"
            : "Guardar y seguir"}
      </Boton>

      <Boton peso="texto" type="button" onClick={alCancelar} className="self-center">
        Cancelar
      </Boton>
    </div>
  );
}
