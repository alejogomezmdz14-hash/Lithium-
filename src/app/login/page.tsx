import type { Metadata } from "next";

import { Lockup } from "@/components/logo";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar — Lithium" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 pb-16">
      {/* El lockup completo vive SOLO acá y en el splash (§9.0.2). */}
      <div className="mb-10">
        <Lockup />
      </div>

      <p className="mb-6 text-[0.9375rem] font-medium text-muted-foreground">
        Entrá para ver a quién tenés que cobrarle.
      </p>

      <LoginForm />
    </main>
  );
}
