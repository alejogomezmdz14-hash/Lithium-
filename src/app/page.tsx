import { salir } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

/**
 * Placeholder de la home. Según §9.0 la home ES "Por pagar" — esta pantalla se
 * reemplaza por esa lista apenas esté. Por ahora sirve para confirmar de punta a
 * punta que la sesión funciona y que RLS deja leer los datos una vez logueada.
 */
export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Con RLS activo esta query devuelve datos SOLO si hay sesión.
  const { count, error } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true });

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <h1 className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground">
        Sesión iniciada
      </h1>
      <p className="mt-2 text-[0.8125rem] font-medium text-muted-foreground">{user?.email}</p>

      <div className="mt-6 rounded-xl bg-card p-5">
        <p className="text-[0.8125rem] font-medium text-muted-foreground">Clientes en la base</p>
        <p className="mt-1 font-mono text-[2.125rem] font-semibold leading-none tabular-nums text-foreground">
          {error ? "—" : (count ?? 0)}
        </p>
        {error ? (
          <p className="mt-3 text-[0.8125rem] font-medium text-danger">
            No se pudo leer: {error.message}
          </p>
        ) : null}
      </div>

      <form action={salir} className="mt-8">
        <button
          type="submit"
          className="h-12 rounded-full px-5 text-[0.8125rem] font-semibold text-primary-text"
        >
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
