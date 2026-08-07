import type { Metadata } from "next";

import { Lockup } from "@/components/logo";
import { Piedra } from "@/components/superficie";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar — Lithium" };

/**
 * La única pantalla de la app con composición en vez de lista, y la única sin
 * escalón: acá no se registra plata, se abre la puerta.
 */
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col">
      {/* La página no tenía ningún encabezado. El título visible es el lockup,
          que es marca y no texto: el h1 real vive acá, para el lector de
          pantalla y para la barra de navegación del navegador. */}
      <h1 className="sr-only">Entrar a Lithium</h1>

      {/* La piedra a media pantalla, a sangre lateral, con las esquinas de
          arriba a 0 y las de abajo a 28px. La app abre con un bloque macizo, y
          es donde se prueba que los materiales se ven: si al sol esto no se
          distingue del canvas, hay que subir el ΔL* antes de seguir.
          El lockup completo vive SOLO acá (§9.0.2). */}
      <Piedra className="flex min-h-[46dvh] items-end rounded-t-none">
        <Lockup />
      </Piedra>

      <div className="px-6 pb-16 pt-8">
        <p className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
          Entrá para ver a quién tenés que cobrarle.
        </p>
        <div className="mt-2.5">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
