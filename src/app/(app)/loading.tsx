import { ColumnaMonto } from "@/components/monto";
import { Fila, Losa, Piedra } from "@/components/superficie";

/**
 * La espera entre tabs.
 *
 * Las tres pantallas del shell hacen dos round-trips a Supabase en el server
 * antes de poder pintar nada. En el primer paint eso no se nota, pero al tocar
 * otro tab el App Router suspende y **la pantalla anterior se queda quieta**:
 * parada en la calle, con sol, el único dato que tiene Candela es que tocó y no
 * pasó nada — así que toca de nuevo.
 *
 * No es el skeleton de 40 filas que la guía prohíbe: son cuatro bloques que
 * **reservan el layout exacto** (la barra del buscador, el bloque héroe, cuatro
 * renglones de 80px) para que nada salte cuando llegan los datos. El pulso va a
 * 1.4s y `prefers-reduced-motion` ya lo apaga desde `globals.css`.
 *
 * **Sin palabras adentro, a propósito.** Este archivo es el límite de suspenso
 * de las TRES rutas del shell —`/`, `/por-pagar` y `/clientes` heredan este
 * fallback—, así que un rótulo `Me deben` acá aparecería también al entrar a
 * `Por pagar`, que no tiene bloque héroe ni ese número. La forma se puede
 * anticipar; una palabra que después no está, no.
 */
export default function Cargando() {
  return (
    <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
      {/* Lo único que se lee en voz alta. Los bloques son forma pura y no
          tienen nada que decirle a un lector de pantalla. */}
      <p role="status" className="sr-only">
        Cargando
      </p>

      <div
        aria-hidden
        className="animate-pulse [animation-duration:1.4s]"
        data-motion="fade"
      >
        {/* El buscador es sticky y mide siempre lo mismo: si no se reserva, la
            pantalla entera sube 86px en el momento en que llegan los datos. */}
        <div className="h-[var(--alto-buscador)]" />

        <Piedra>
          <div className="h-4 w-24 rounded-tira bg-texto/15" />
          <div className="mt-3 h-9 w-52 rounded-tira bg-texto/20" />
          <div className="mt-3.5 h-4 w-40 rounded-tira bg-texto/12" />
        </Piedra>

        <div className="mt-2.5">
          <Losa>
            {[0, 1, 2, 3].map((i) => (
              <Fila key={i}>
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-40 rounded-tira bg-texto/12" />
                  <div className="mt-2.5 h-3.5 w-24 rounded-tira bg-texto/8" />
                </div>
                {/* Por `ColumnaMonto` y no por un ancho a mano: el borde
                    derecho de la plata cae en la misma x mientras carga y
                    después, así el bloque no se corre al llegar el número. */}
                <ColumnaMonto className="flex justify-end">
                  <div className="h-4 w-20 rounded-tira bg-texto/12" />
                </ColumnaMonto>
              </Fila>
            ))}
          </Losa>
        </div>
      </div>
    </main>
  );
}
