import { listarUsuarias } from "@/app/acciones-usuarios";
import { Aviso } from "@/components/aviso";
import { BotonLink } from "@/components/boton";
import { Fila, Losa, Piedra } from "@/components/superficie";
import { createClient } from "@/lib/supabase/server";

import { AltaDeUsuaria } from "./alta";

export const metadata = { title: "Usuarias — Lithium" };

/**
 * La pantalla más callada de la app, a propósito: se entra una vez cada seis
 * meses. Nada acá se toca seguido, así que nada acá pide atención.
 */
export default async function UsuariasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const esSuper = user?.app_metadata?.super === true;

  // Si la pantalla es un no, el no es el héroe. Antes el no llegaba como un
  // párrafo gris abajo de un título, que se lee como que algo falló.
  if (!esSuper) {
    return (
      <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
        <h1 className="sr-only">Usuarias</h1>
        <Aviso
          tono="calma"
          titulo="Esta parte no es tuya"
          acciones={
            <BotonLink peso="texto" href="/" className="justify-center">
              Volver al resumen
            </BotonLink>
          }
        >
          Pedísela a quien te dio el acceso.
        </Aviso>
      </main>
    );
  }

  const { usuarias, error } = await listarUsuarias();

  if (error) {
    return (
      <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
        <h1 className="sr-only">Usuarias</h1>
        <Aviso
          tono="error"
          titulo="No se pudo traer quién entra."
          acciones={
            <BotonLink peso="texto" href="/" className="justify-center">
              Volver al resumen
            </BotonLink>
          }
        >
          {error}
        </Aviso>
      </main>
    );
  }

  const supers = usuarias.filter((u) => u.esSuper).length;

  return (
    <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
      <Piedra>
        <h1 className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
          Pueden entrar a Lithium
        </h1>
        <p className="mt-2 font-display text-[2.75rem] font-bold leading-[0.98] tracking-[-0.04em]">
          {usuarias.length}
        </p>
        <p className="mt-2 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
          {usuarias.length === 1 ? "una usuaria" : `${usuarias.length} usuarias`} ·{" "}
          {supers === 1 ? "1 puede crear otras" : `${supers} pueden crear otras`}
        </p>
      </Piedra>

      {/* El alta es la ÚLTIMA fila de esta misma losa, no un formulario suelto
          arriba: antes lo primero que veía al entrar era un form vacío, que es
          la app pidiéndole trabajo apenas abre. */}
      <Losa className="mt-8">
        {usuarias.map((u) => (
          <Fila key={u.id}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[1rem] font-semibold tracking-[-0.011em]">{u.email}</p>
              <p className="mt-0.5 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
                {u.esSuper ? "Puede crear usuarias" : "Ve y carga préstamos"}
                {u.email === user?.email ? (
                  <span className="text-marca-texto"> · sos vos</span>
                ) : null}
              </p>
            </div>
          </Fila>
        ))}

        <AltaDeUsuaria />
      </Losa>
    </main>
  );
}
