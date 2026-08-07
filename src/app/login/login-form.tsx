"use client";

import { useActionState } from "react";

import { Atomo } from "@/components/atomo";
import { Boton } from "@/components/boton";
import { CAMPO_SOLDADO, ROTULO_CAMPO } from "@/components/campo";
import { Losa } from "@/components/superficie";

import { entrar, type EstadoLogin } from "./actions";

const INICIAL: EstadoLogin = { error: null };

/**
 * Cada campo es un BLOQUE de la losa, no un control suelto con un label gris
 * flotando arriba: el rótulo y el input comparten la misma piedra, y lo que los
 * separa del otro campo es la junta de 2px donde asoma el canvas.
 *
 * `CAMPO_SOLDADO` vive en `campo.tsx` —el único lugar que puede escribir el
 * material de un campo— y no derivado con `.replace()` acá: un `.replace()`
 * sobre `INPUT` deja de tener efecto **en silencio** el día que alguien cambie
 * su alto, y el bloque queda de 56px sin que nada falle.
 */
const ENTRADA = "w-full bg-transparent text-[1rem] text-texto outline-none";

export function LoginForm() {
  const [estado, accion, enviando] = useActionState(entrar, INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-5" noValidate>
      <Losa>
        <label htmlFor="email" className={CAMPO_SOLDADO}>
          <span className={ROTULO_CAMPO}>Mail</span>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            disabled={enviando}
            aria-invalid={estado.error ? true : undefined}
            className={ENTRADA}
          />
        </label>

        <label htmlFor="password" className={CAMPO_SOLDADO}>
          <span className={ROTULO_CAMPO}>Contraseña</span>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            enterKeyHint="go"
            disabled={enviando}
            aria-invalid={estado.error ? true : undefined}
            aria-describedby={estado.error ? "error-login" : undefined}
            className={ENTRADA}
          />
        </label>
      </Losa>

      {/* El error se anuncia sin mover el foco: si el lector de pantalla saltara
          al mensaje, el cursor se pierde y hay que volver a buscar el campo. */}
      <p
        id="error-login"
        role="alert"
        className={`min-h-5 text-[0.875rem] font-medium tracking-[-0.006em] text-peligro ${
          estado.error ? "" : "sr-only"
        }`}
      >
        {estado.error ?? ""}
      </p>

      {/* Se fue el fundido de opacidad al enviar: era la única animación de toda
          la app y encima la incorrecta — el azul al 60% deja
          el blanco en 1.62:1, ilegible justo cuando ella está esperando. El
          botón mantiene contraste pleno, dice qué está pasando, y el átomo
          girando es la marca haciendo un trabajo en vez de decorarlo. */}
      <Boton
        peso="lleno"
        type="submit"
        onClick={(e) => {
          if (enviando) e.preventDefault();
        }}
      >
        {enviando ? (
          <span className="inline-flex items-center gap-2">
            <Atomo size={18} girando />
            Entrando…
          </span>
        ) : (
          "Entrar"
        )}
      </Boton>
    </form>
  );
}
