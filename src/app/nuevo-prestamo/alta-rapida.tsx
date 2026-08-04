"use client";

import { useState } from "react";

import { crearClienteRapido } from "@/app/acciones-documentos";
import { NOMBRE_TIPO_CLIENTE, REQUISITOS, type TipoCliente } from "@/lib/documentacion";

import type { ClienteElegible } from "./buscador-cliente";

const TIPOS = Object.keys(NOMBRE_TIPO_CLIENTE) as TipoCliente[];

const campo =
  "h-12 w-full rounded-lg border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-subtle disabled:opacity-60";

/**
 * Alta de una persona sin salir de la pantalla de la deuda.
 *
 * Se guarda apenas se confirma, y no al final junto con el préstamo, porque los
 * documentos necesitan que la persona exista: el archivo va a una carpeta con
 * su id. Guardar acá es lo que habilita subirle los papeles en el paso siguiente.
 *
 * Los campos son los del Excel que Candela ya lleva: nombre, DNI, localidad y
 * lugar de trabajo.
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
    <div className="mt-3 rounded-lg bg-surface-raised p-4">
      <p className="text-[0.9375rem] font-semibold text-foreground">Persona nueva</p>

      <div className="mt-3 flex flex-col gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoFocus
          autoCapitalize="words"
          disabled={guardando}
          placeholder="Nombre y apellido"
          className={campo}
        />
        <div className="flex gap-2">
          <input
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            inputMode="numeric"
            disabled={guardando}
            placeholder="DNI"
            className={campo}
          />
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            type="tel"
            inputMode="tel"
            disabled={guardando}
            placeholder="Teléfono"
            className={campo}
          />
        </div>
        <div className="flex gap-2">
          <input
            value={localidad}
            onChange={(e) => setLocalidad(e.target.value)}
            autoCapitalize="words"
            disabled={guardando}
            placeholder="Localidad"
            className={campo}
          />
          <input
            value={lugarTrabajo}
            onChange={(e) => setLugarTrabajo(e.target.value)}
            autoCapitalize="words"
            disabled={guardando}
            placeholder="Lugar de trabajo"
            className={campo}
          />
        </div>
      </div>

      <p className="mt-4 text-[0.8125rem] font-medium text-muted-foreground">
        Tipo de cliente — determina qué documentación pedirle
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {TIPOS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(tipo === t ? "" : t)}
            disabled={guardando}
            className={`h-12 rounded-full px-4 text-[0.8125rem] font-semibold ${
              tipo === t ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            }`}
          >
            {NOMBRE_TIPO_CLIENTE[t]}
          </button>
        ))}
      </div>

      {tipo ? (
        <div className="mt-3 rounded-lg bg-card p-3">
          <p className="text-[0.8125rem] font-medium text-muted-foreground">
            Documentación a presentar:
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {REQUISITOS[tipo].map((r) => (
              <li key={r.tipo} className="text-[0.8125rem] font-medium text-foreground">
                · {r.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tipo === "pami" ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[0.8125rem] font-medium text-muted-foreground">Garante — opcional</p>
          <input
            value={garanteNombre}
            onChange={(e) => setGaranteNombre(e.target.value)}
            autoCapitalize="words"
            disabled={guardando}
            placeholder="Nombre del garante"
            className={campo}
          />
          <input
            value={garanteTelefono}
            onChange={(e) => setGaranteTelefono(e.target.value)}
            type="tel"
            inputMode="tel"
            disabled={guardando}
            placeholder="Su teléfono"
            className={campo}
          />
        </div>
      ) : null}

      <p
        role="alert"
        aria-live="polite"
        className={`mt-2 text-[0.8125rem] font-medium text-danger ${error ? "" : "sr-only"}`}
      >
        {error ?? ""}
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || nombre.trim().length < 2}
          className="h-12 flex-1 rounded-full bg-primary text-[0.8125rem] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar y seguir"}
        </button>
        <button
          type="button"
          onClick={alCancelar}
          disabled={guardando}
          className="h-12 px-4 text-[0.8125rem] font-medium text-muted-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
