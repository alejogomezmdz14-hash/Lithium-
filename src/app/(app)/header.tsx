import Link from "next/link";

import { Isotipo } from "@/components/logo";
import { BotonDeTema } from "@/components/tema";
import { createClient } from "@/lib/supabase/server";

import { BotonSalir } from "./boton-salir";

/**
 * Header de los tres módulos. Va el **isotipo solo**, no el lockup: a este
 * tamaño "CREDIT COMPANY" sería una mancha gris (§9.0.2).
 */
export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El acceso a usuarias solo aparece si lo tiene: un link que lleva a "no
  // tenés permiso" es ruido para quien nunca va a poder entrar.
  const esSuper = user?.app_metadata?.super === true;

  return (
    <header className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-5 pt-6">
      <Link href="/" className="flex items-center gap-2.5">
        <Isotipo size={26} />
        <span className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-foreground">
          Lithium
        </span>
      </Link>
      <div className="flex items-center gap-1">
        {esSuper ? (
          <Link
            href="/usuarios"
            className="flex h-11 items-center px-2 text-[0.8125rem] font-medium text-muted-foreground"
          >
            Usuarias
          </Link>
        ) : null}
        <BotonDeTema />
        <BotonSalir />
      </div>
    </header>
  );
}
