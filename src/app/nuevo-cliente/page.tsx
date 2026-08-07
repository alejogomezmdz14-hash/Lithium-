"use client";

import { useActionState, useState } from "react";

import { Boton, Volver } from "@/components/boton";
import { Campo, INPUT, Segmentado, TEXTAREA } from "@/components/campo";
import { Bajada, Rotulo } from "@/components/rotulo";
import { FilaLectura, Losa } from "@/components/superficie";
import { NOMBRE_TIPO_CLIENTE, REQUISITOS, type TipoCliente } from "@/lib/documentacion";

import { crearCliente, type EstadoNuevoCliente } from "./actions";

const INICIAL: EstadoNuevoCliente = { error: null };

const TIPOS = (Object.keys(NOMBRE_TIPO_CLIENTE) as TipoCliente[]).map((t) => ({
  valor: t,
  label: NOMBRE_TIPO_CLIENTE[t],
}));

export default function NuevoClientePage() {
  const [estado, accion, enviando] = useActionState(crearCliente, INICIAL);
  const [tipo, setTipo] = useState<TipoCliente | "">("");
  const [nombre, setNombre] = useState("");

  const requisitos = tipo ? REQUISITOS[tipo] : [];
  // Es lo único que la base exige. Todo lo demás se completa después, porque
  // esto se carga parada en la puerta de la casa de alguien.
  const listo = nombre.trim().length >= 2;

  return (
    <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
      <Volver href="/clientes">Volver a clientes</Volver>

      <h1 className="mt-2.5 font-display text-[1.375rem] font-bold tracking-[-0.025em]">Cliente nuevo</h1>
      <p className="mt-1 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
        Con el nombre alcanza para guardarlo. El resto se puede completar después.
      </p>

      <form action={accion} className="mt-8 flex flex-col gap-8">
        <input type="hidden" name="tipo" value={tipo} />

        <Campo label="Nombre y apellido" htmlFor="nombre">
          <input
            id="nombre"
            name="nombre"
            autoFocus
            autoCapitalize="words"
            enterKeyHint="next"
            disabled={enviando}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Marta Suárez"
            className={INPUT}
          />
        </Campo>

        <Campo
          label="Teléfono"
          htmlFor="telefono"
          ayuda="Para poder escribirle cuando se atrase."
        >
          <input
            id="telefono"
            name="telefono"
            type="tel"
            inputMode="tel"
            enterKeyHint="next"
            disabled={enviando}
            placeholder="+54 9 261 111 1111"
            className={INPUT}
          />
        </Campo>

        {/* El tipo define qué papeles pedirle. Se puede dejar sin elegir: frenar
            un alta por una clasificación sería fricción de más. */}
        <div>
          <Rotulo>Tipo de cliente</Rotulo>
          <Bajada>Determina qué documentación hay que pedirle. Se puede completar después.</Bajada>
          <Segmentado
            etiqueta="Tipo de cliente"
            className="mt-2.5"
            columnas={2}
            opciones={TIPOS}
            valor={tipo === "" ? null : tipo}
            // Volver a tocar el elegido lo suelta: si se equivocó de tipo y
            // todavía no sabe cuál es, tiene que poder dejarlo sin decidir.
            onChange={(v) => setTipo(v === tipo ? "" : v)}
          />

          {/* Decir qué papeles va a pedir ANTES de guardar: así sabe qué tiene
              que juntar mientras la persona está enfrente. Es el único
              movimiento de la pantalla, y es el que explica qué cambió al
              elegir el tipo. */}
          <div
            className="grid transition-[grid-template-rows] duration-200 ease-salida"
            style={{ gridTemplateRows: requisitos.length > 0 ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <Rotulo className="block pt-6">Papeles que le vas a pedir</Rotulo>
              <Losa className="mt-2.5">
                {requisitos.map((r) => (
                  <FilaLectura key={r.tipo}>
                    <p className="text-[0.875rem] font-medium tracking-[-0.006em]">{r.label}</p>
                  </FilaLectura>
                ))}
              </Losa>
            </div>
          </div>
        </div>

        {/* El garante se pide en PAMI, pero los campos NUNCA son obligatorios:
            exigirlos frenaría el alta de alguien parada en la puerta. */}
        {tipo === "pami" ? (
          <Campo
            label="Garante"
            ayuda="Opcional. Si alguna vez hay que reclamarle, vas a necesitar el teléfono."
          >
            <input
              name="garante_nombre"
              aria-label="Nombre del garante"
              autoCapitalize="words"
              disabled={enviando}
              placeholder="Nombre del garante"
              className={INPUT}
            />
            <input
              name="garante_telefono"
              aria-label="Teléfono del garante"
              type="tel"
              inputMode="tel"
              disabled={enviando}
              placeholder="Su teléfono"
              className={`${INPUT} mt-2`}
            />
          </Campo>
        ) : null}

        <Campo
          label="Observaciones"
          htmlFor="notas"
          ayuda="Aparecen en la lista de cobros. Para lo que cambia cómo cobrarle."
        >
          <textarea
            id="notas"
            name="notas"
            rows={3}
            disabled={enviando}
            placeholder="Paga los días 3 — no atiende, mandale mensaje"
            className={TEXTAREA}
          />
        </Campo>

        <div>
          <p
            role="alert"
            className={`mb-2.5 text-[0.875rem] font-medium tracking-[-0.006em] text-peligro ${
              estado.error ? "" : "sr-only"
            }`}
          >
            {estado.error ?? ""}
          </p>

          {/* No existe `disabled`: el botón mantiene contraste pleno y su
              etiqueta dice qué falta. Al tocarlo cuando falta el nombre no hace
              nada y el campo que falta recibe el foco. */}
          <Boton
            peso="lleno"
            type="submit"
            onClick={(e) => {
              if (enviando) {
                e.preventDefault();
                return;
              }
              if (!listo) {
                e.preventDefault();
                document.getElementById("nombre")?.focus();
              }
            }}
          >
            {enviando ? "Guardando…" : listo ? "Guardar el cliente" : "Falta el nombre"}
          </Boton>
        </div>
      </form>
    </main>
  );
}
