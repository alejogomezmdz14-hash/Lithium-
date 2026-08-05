import Link from "next/link";

import { listarUsuarias } from "@/app/acciones-usuarios";
import { Avatar } from "@/components/semaforo";
import { createClient } from "@/lib/supabase/server";

import { AltaDeUsuaria } from "./alta";

export const metadata = { title: "Usuarias — Lithium" };

export default async function UsuariasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esSuper = user?.app_metadata?.super === true;

  if (!esSuper) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-5">
        <h1 className="text-[1.0625rem] font-semibold text-foreground">Usuarias</h1>
        <p className="mt-4 rounded-xl bg-card p-5 text-[0.8125rem] font-medium text-muted-foreground">
          No tenés permiso para administrar usuarias. Pedíselo a quien te dio el acceso.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-12 items-center text-[0.8125rem] font-semibold text-primary-text"
        >
          ‹ Volver
        </Link>
      </main>
    );
  }

  const { usuarias, error } = await listarUsuarias();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-28 pt-5">
      <h1 className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground">
        Usuarias
      </h1>
      <p className="mt-1 text-[0.8125rem] font-medium text-muted-foreground">
        Quién puede entrar a Lithium.
      </p>

      <h2 className="mt-7 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Nueva usuaria
      </h2>
      <AltaDeUsuaria />

      <h2 className="mt-7 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Las que ya entran · {usuarias.length}
      </h2>

      {error ? (
        <p className="mt-2 rounded-xl bg-card p-5 text-[0.8125rem] font-medium text-danger">
          {error}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {usuarias.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-xl bg-card px-4 py-3.5">
              <Avatar nombre={u.email} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] font-semibold text-foreground">{u.email}</p>
                <p className="mt-0.5 text-[0.8125rem] font-medium text-muted-foreground">
                  {u.esSuper ? "Puede crear usuarias" : "Ve y carga préstamos"}
                  {u.email === user?.email ? " · sos vos" : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
