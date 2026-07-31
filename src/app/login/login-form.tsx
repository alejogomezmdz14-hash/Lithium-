"use client";

import { useActionState } from "react";

import { entrar, type EstadoLogin } from "./actions";

const INICIAL: EstadoLogin = { error: null };

export function LoginForm() {
  const [estado, accion, enviando] = useActionState(entrar, INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-[0.8125rem] font-medium text-muted-foreground">
          Tu mail
        </label>
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
          // text-base = 16px: abajo de eso iOS hace zoom solo al enfocar.
          className="h-12 rounded-lg border border-border bg-card px-4 text-base text-foreground placeholder:text-muted-subtle disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-[0.8125rem] font-medium text-muted-foreground">
          Tu contraseña
        </label>
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
          className="h-12 rounded-lg border border-border bg-card px-4 text-base text-foreground disabled:opacity-60"
        />
      </div>

      {/* aria-live para que un lector de pantalla anuncie el error sin mover el foco */}
      <p
        id="error-login"
        role="alert"
        aria-live="polite"
        className={`min-h-[1.25rem] text-[0.8125rem] font-medium text-danger ${
          estado.error ? "" : "sr-only"
        }`}
      >
        {estado.error ?? ""}
      </p>

      <button
        type="submit"
        disabled={enviando}
        className="mt-2 h-12 rounded-full bg-primary text-[0.9375rem] font-semibold text-primary-foreground transition-opacity duration-150 disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
