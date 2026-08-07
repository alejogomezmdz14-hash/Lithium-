import Link from "next/link";

import { Buscador } from "@/components/buscador";
import { Aviso } from "@/components/aviso";
import { BotonLink } from "@/components/boton";
import { ColumnaMonto, Monto } from "@/components/monto";
import { Rotulo } from "@/components/rotulo";
import { Semaforo } from "@/components/semaforo";
import { Fila, FilaLectura, Losa, Piedra } from "@/components/superficie";
import { nombreDeMes } from "@/lib/fecha";
import { traerClientes, traerResumen } from "@/lib/queries";

export const metadata = { title: "Resumen — Lithium" };

export default async function ResumenPage() {
  // Las dos queries en paralelo: el resumen es la pantalla, la lista de clientes
  // es lo que alimenta el buscador sticky. Encadenarlas sería sumar dos
  // round-trips por una dependencia que no existe.
  const [{ hoy, resumen, error }, { clientes }] = await Promise.all([
    traerResumen(),
    traerClientes(),
  ]);

  if (error || !resumen) {
    // El mensaje crudo de PostgREST NO se muestra: `JWT expired` o
    // `relation "public.cuotas" does not exist` en el medio de una frase en
    // castellano no le dicen nada a Candela y la dejan pensando que perdió
    // plata. El detalle va al log del server, que es el único lugar donde
    // sirve para arreglarlo.
    console.error("[resumen] no se pudo traer:", error ?? "la base no contestó");

    return (
      <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
        <h1 className="sr-only">Resumen</h1>
        {/* Un aviso sin acción es un callejón sin salida: el único gesto que
            queda es cerrar la app. `Reintentar` vuelve a pedir la misma
            pantalla, y ahora esa espera tiene su propio `loading.tsx`. */}
        <Aviso
          tono="error"
          titulo="No se pudo conectar con la base"
          acciones={
            <BotonLink peso="texto" href="/">
              Reintentar
            </BotonLink>
          }
        >
          Lo que ya cobraste está guardado — esto es solo la pantalla, no tus datos.
        </Aviso>
      </main>
    );
  }

  const { prestadoEsteMes, interesEsteMes, meDeben, vencido, cobroEstaSemana, quienMeDebe } =
    resumen;

  // Los que tienen algo vencido, arriba. Es lo que hace que la barra de peligro
  // salga de un tirón en vez de entrecortada: tres rieles seguidos dicen "este
  // bloque es el problema"; tres rieles salteados no dicen nada.
  // `sort` es estable, así que adentro de cada mitad sobrevive el orden por
  // deuda descendente que ya trae la query.
  const deudores = [...quienMeDebe].sort(
    (a, b) => Number(b.cuotasVencidas > 0) - Number(a.cuotasVencidas > 0),
  );

  return (
    <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
      {/* El título no se dibuja: la piedra ya dice de qué se trata la pantalla
          con un número de 44px. Pero tiene que existir para quien navega por
          encabezados. */}
      <h1 className="sr-only">Resumen</h1>

      {/* El buscador envuelve el tab entero: mientras hay algo escrito, los
          resultados REEMPLAZAN la pantalla (§3.5). Si `traerClientes` falla, la
          búsqueda queda vacía en vez de romper el resumen, que es lo que ella
          vino a ver. */}
      <Buscador personas={clientes}>
        {/* El héroe es el CAPITAL, no la deuda — decisión del cliente, 2026-08-07.
            Y muestra `capitalEnLaCalle`, no `meDeben`: hoy los dos dan lo mismo
            porque ningún préstamo tiene interés cargado, pero en cuanto se le
            ponga interés a uno se separan, y un rótulo que dice "capital" sobre
            un número que incluye interés es exactamente la clase de mentira que
            hace que deje de creerle a la pantalla. `Me deben` no se pierde: baja
            a la tabla de números del negocio. */}
        <Piedra>
          <p className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
            Capital prestado
          </p>
          <p className="mt-2 font-display text-[2.75rem] font-bold leading-[0.98] tracking-[-0.04em]">
            <Monto valor={resumen.capitalEnLaCalle} />
          </p>
          <p className="mt-2 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
            {resumen.capitalEnLaCalle === 0 ? (
              "Todavía no prestaste nada."
            ) : (
              <>
                {resumen.personasQueDeben === 1
                  ? "en 1 persona"
                  : `en ${resumen.personasQueDeben} personas`}
                {vencido.monto > 0 ? (
                  <>
                    {" · "}
                    {/* La plata nunca lleva color: lo que se pinta es la
                        PALABRA, no el número (§9.2). */}
                    <Monto valor={vencido.monto} className="text-texto" />{" "}
                    <span className="text-peligro">vencido</span>
                  </>
                ) : null}
              </>
            )}
          </p>
        </Piedra>

        {/* Tres acciones, una losa. No pesan igual: `Nueva deuda` se lleva la
            fila entera y las otras dos comparten la de abajo. Se fueron los
            cuatro círculos con ícono —el label ya hacía todo el trabajo y el
            ícono se comía 56px de alto— y se fue `Papeles`, que era un destino
            disfrazado de acción: lleva a /clientes, que ya es un tab. */}
        <div className="mt-2.5">
          <Losa>
            <Fila>
              {/* El link cubre la celda entera, padding incluido: el target es
                  el bloque, no las dos palabras del medio. */}
              <Link
                href="/nuevo-prestamo"
                className="absolute inset-0 flex items-center justify-center text-[1rem] font-semibold tracking-[-0.011em] text-marca-texto"
              >
                Nueva deuda
              </Link>
            </Fila>

            <div className="flex gap-[var(--junta)]">
              {/* NO dice `Ya me pagó`: esa etiqueta es la del botón que abre el
                  sheet y registra el cobro de una cuota concreta (el buscador,
                  `Por pagar` y el detalle del préstamo). Acá la celda lleva a la
                  lista para elegir a quién, y eso es otra cosa. Un término, un
                  comportamiento — el que registra plata se queda con el nombre. */}
              <Fila className="flex-1">
                <Link
                  href="/por-pagar"
                  className="absolute inset-0 flex items-center justify-center text-[0.875rem] font-semibold tracking-[-0.006em] text-marca-texto"
                >
                  Cobrar a alguien
                </Link>
              </Fila>
              <Fila className="flex-1">
                <Link
                  href="/nuevo-cliente"
                  className="absolute inset-0 flex items-center justify-center text-[0.875rem] font-semibold tracking-[-0.006em] text-marca-texto"
                >
                  Cliente nuevo
                </Link>
              </Fila>
            </div>
          </Losa>
        </div>

        {/* Quién me debe sube: es lo segundo que se lee, no lo último. Lista
            COMPLETA — cortar en cinco es cortar justo donde empieza a servir,
            porque con muchos deudores el que buscás es el noveno (§9.6). */}
        <section className="mt-8">
          <div className="flex items-baseline justify-between gap-3">
            <Rotulo>Quién me debe</Rotulo>
            {deudores.length > 0 ? (
              <span className="text-[0.875rem] font-medium text-texto-suave">
                {deudores.length === 1 ? "1 persona" : `${deudores.length} personas`}
              </span>
            ) : null}
          </div>

          <div className="mt-2.5">
            {deudores.length === 0 ? (
              <Losa>
                <FilaLectura>
                  <span className="text-[0.875rem] font-medium text-texto-suave">
                    No te debe nadie.
                  </span>
                </FilaLectura>
              </Losa>
            ) : (
              <Losa>
                {deudores.map((persona) => (
                  <Fila key={persona.cliente_id} peligro={persona.cuotasVencidas > 0}>
                    <Link href={`/clientes/${persona.cliente_id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-[1rem] font-semibold tracking-[-0.011em] text-texto">
                        {persona.nombre}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2">
                        <Semaforo estado={persona.semaforo} />
                        {persona.cuotasVencidas > 0 ? (
                          <span className="text-[0.875rem] font-medium text-peligro">
                            {persona.cuotasVencidas === 1
                              ? "1 cuota vencida"
                              : `${persona.cuotasVencidas} cuotas vencidas`}
                          </span>
                        ) : null}
                      </span>
                    </Link>

                    <ColumnaMonto>
                      <Monto
                        valor={persona.monto}
                        className="font-mono text-[0.95rem] font-medium tracking-[-0.01em] text-texto"
                      />
                    </ColumnaMonto>
                  </Fila>
                ))}
              </Losa>
            )}
          </div>
        </section>

        {/* Los números del negocio: una tabla, no cuatro tiles. Si un número no
            cambia una decisión, no está acá. */}
        <section className="mt-8">
          <Losa>
            {/* `Me deben` bajó acá desde el héroe cuando el capital pasó a ser
                el número grande. Es capital + interés, o sea SIEMPRE mayor o
                igual al héroe, y por eso va justo arriba de `Interés por
                cobrar`: los tres números se leen como una sola cuenta. */}
            <FilaLectura>
              <span className="text-[0.875rem] font-medium text-texto-suave">Me deben</span>
              <ColumnaMonto>
                <Monto
                  valor={meDeben}
                  className="font-mono text-[0.95rem] font-normal tracking-[-0.01em] text-texto"
                />
              </ColumnaMonto>
            </FilaLectura>

            <FilaLectura>
              <span className="text-[0.875rem] font-medium text-texto-suave">
                Interés por cobrar
              </span>
              <ColumnaMonto>
                <Monto
                  valor={resumen.interesPorCobrar}
                  className="font-mono text-[0.95rem] font-normal tracking-[-0.01em] text-texto"
                />
              </ColumnaMonto>
            </FilaLectura>

            <FilaLectura>
              <span className="min-w-0 text-[0.875rem] font-medium text-texto-suave">
                Prestaste en {nombreDeMes(hoy)}
                {prestadoEsteMes.personas > 0 ? (
                  <span className="text-texto-tenue">
                    {" · "}
                    {prestadoEsteMes.personas}{" "}
                    {prestadoEsteMes.personas === 1 ? "persona" : "personas"}
                  </span>
                ) : null}
              </span>
              <ColumnaMonto>
                <Monto
                  valor={prestadoEsteMes.total}
                  className="font-mono text-[0.95rem] font-normal tracking-[-0.01em] text-texto"
                />
              </ColumnaMonto>
            </FilaLectura>

            {interesEsteMes > 0 ? (
              <FilaLectura>
                <span className="text-[0.875rem] font-medium text-texto-suave">
                  Vas a ganar de interés
                </span>
                <ColumnaMonto>
                  <Monto
                    valor={interesEsteMes}
                    className="font-mono text-[0.95rem] font-normal tracking-[-0.01em] text-texto"
                  />
                </ColumnaMonto>
              </FilaLectura>
            ) : null}

            {/* La última es la única que lleva a algún lado, y lleva justo a la
                pantalla donde se cobra. */}
            <FilaLectura className="relative">
              <Link
                href="/por-pagar"
                className="absolute inset-0 flex items-center justify-between gap-3 px-4"
              >
                <span className="text-[0.875rem] font-semibold tracking-[-0.006em] text-marca-texto">
                  Cobrás esta semana
                </span>
                <ColumnaMonto>
                  <Monto
                    valor={cobroEstaSemana}
                    className="font-mono text-[0.95rem] font-normal tracking-[-0.01em] text-texto"
                  />
                </ColumnaMonto>
              </Link>
            </FilaLectura>
          </Losa>
        </section>
      </Buscador>
    </main>
  );
}
