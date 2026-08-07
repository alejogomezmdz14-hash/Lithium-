"use client";

import { useEffect } from "react";

import { Aviso } from "@/components/aviso";
import { Boton, BotonLink } from "@/components/boton";

/**
 * Pantalla de error. Sin esto Next muestra "Application error: a server-side
 * exception has occurred" sobre fondo blanco y con un digest — en inglés, y en
 * el medio de la calle.
 *
 * Lo primero que dice es que la plata está guardada, porque es lo único que
 * Candela va a querer saber: los cobros se registran con `registrar_pago()` en
 * una transacción, así que si la pantalla falló, o quedó guardado entero o no
 * quedó nada. Nunca a medias.
 *
 * Va como `<Aviso>`, o sea como una piedra: si la pantalla es un error, el error
 * ES el héroe. Es el momento en que ella más necesita creerle a la pantalla, y
 * un párrafo gris arriba de dos botones no se lee como una respuesta.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Al log del server, que es donde se puede leer después.
    console.error("Falló una pantalla:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col justify-center px-4">
      <Aviso
        tono="error"
        titulo="Se cortó algo."
        acciones={
          <>
            <Boton peso="lleno" type="button" onClick={reset}>
              Probá de nuevo
            </Boton>
            <BotonLink peso="texto" href="/" className="justify-center">
              Volver al resumen
            </BotonLink>
          </>
        }
      >
        <p>Lo que ya cobraste está guardado. Esto es solo la pantalla, no tus datos.</p>
        {error.digest ? (
          <p className="mt-4">Si sigue pasando, pasale este código a Alejo: {error.digest}</p>
        ) : null}
      </Aviso>
    </main>
  );
}
