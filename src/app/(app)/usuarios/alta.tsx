"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { crearUsuaria, type EstadoAlta } from "@/app/acciones-usuarios";

const INICIAL: EstadoAlta = { error: null, ok: null };

const campo =
  "h-12 w-full rounded-lg border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-subtle disabled:opacity-60";

export function AltaDeUsuaria() {
  const router = useRouter();
  const [estado, accion, enviando] = useActionState(crearUsuaria, INICIAL);

  // Al crear una, refrescar para que aparezca en la lista de abajo.
  useEffect(() => {
    if (estado.ok) router.refresh();
  }, [estado.ok, router]);

  return (
    <form action={accion} className="mt-2 flex flex-col gap-4 rounded-xl bg-card p-5">
      <div>
        <label htmlFor="email" className="text-[0.9375rem] font-semibold text-foreground">
          Mail
        </label>
        <p className="mt-0.5 text-[0.8125rem] font-medium text-muted-foreground">
          Con esto entra a la app. No le llega ningún mail.
        </p>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={enviando}
          placeholder="nombre@lithium.com"
          className={`${campo} mt-2`}
        />
      </div>

      <div>
        <label htmlFor="password" className="text-[0.9375rem] font-semibold text-foreground">
          Contraseña
        </label>
        <p className="mt-0.5 text-[0.8125rem] font-medium text-muted-foreground">
          Mínimo 6 caracteres. Anotala: no se vuelve a mostrar.
        </p>
        <input
          id="password"
          name="password"
          type="text"
          required
          minLength={6}
          disabled={enviando}
          placeholder="una contraseña simple"
          className={`${campo} mt-2`}
        />
      </div>

      <label className="flex items-start gap-3 rounded-lg bg-surface-raised p-4">
        <input
          type="checkbox"
          name="super"
          disabled={enviando}
          className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]"
        />
        <span>
          <span className="block text-[0.9375rem] font-semibold text-foreground">
            Que pueda crear usuarias
          </span>
          <span className="mt-0.5 block text-[0.8125rem] font-medium text-muted-foreground">
            Dejalo sin marcar si solo tiene que ver y cargar préstamos.
          </span>
        </span>
      </label>

      {estado.error ? (
        <p role="alert" className="text-[0.8125rem] font-medium text-danger">
          {estado.error}
        </p>
      ) : null}
      {estado.ok ? (
        <p role="status" className="text-[0.8125rem] font-medium text-success">
          {estado.ok}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="h-14 rounded-full bg-primary text-[0.9375rem] font-semibold text-primary-foreground disabled:opacity-60"
      >
        {enviando ? "Creando…" : "Crear la usuaria"}
      </button>
    </form>
  );
}
