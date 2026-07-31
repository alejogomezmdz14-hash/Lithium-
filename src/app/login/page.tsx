import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar — Lithium" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 pb-16">
      {/* TODO: reemplazar por el lockup en SVG cuando llegue el asset de marca
          (§9.0.2). Hasta entonces va el wordmark en tipografía, que es honesto
          y no un PNG recortado con el glow horneado. */}
      <div className="mb-10">
        <h1 className="text-[2rem] font-semibold leading-none tracking-[-0.02em] text-foreground">
          Lithium
        </h1>
        <p className="mt-2 text-[0.8125rem] font-medium tracking-[0.08em] text-muted-foreground">
          CREDIT COMPANY
        </p>
      </div>

      <p className="mb-6 text-[0.9375rem] font-medium text-muted-foreground">
        Entrá para ver a quién tenés que cobrarle.
      </p>

      <LoginForm />
    </main>
  );
}
