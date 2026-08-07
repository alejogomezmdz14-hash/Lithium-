import Link from "next/link";

import { Isotipo } from "@/components/logo";
import { BotonDeTema } from "@/components/tema";
import { createClient } from "@/lib/supabase/server";

import { BotonSalir } from "./boton-salir";

/**
 * Header de los tres módulos. Va el **isotipo solo**, no el lockup: a este
 * tamaño "CREDIT COMPANY" sería una mancha gris (§9.0.2).
 *
 * Sin borde abajo y sin fondo propio: flota sobre el canvas y se va con el
 * scroll. Lo que queda fijo arriba es el buscador de cada tab, que es lo que
 * ella necesita a mano; el logo no.
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
    <header className="mx-auto flex w-full max-w-[520px] items-center justify-between gap-3 px-4 pt-4">
      <Link href="/" className="flex items-center gap-2.5">
        <Isotipo size={26} />
        <span className="text-[1rem] font-semibold tracking-[-0.011em] text-texto">Lithium</span>
      </Link>
      <div className="flex items-center gap-1">
        {esSuper ? (
          <Link
            href="/usuarios"
            // 48px, como los otros dos controles de esta fila y como todo
            // target táctil de la app (§9.9). Tres alturas distintas en la misma
            // línea es lo que delata que la escribieron dos manos.
            className="flex h-12 items-center px-2 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave"
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
