import Link from "next/link";

import { Aviso } from "@/components/aviso";
import { BotonLink } from "@/components/boton";
import { Buscador, type PersonaBuscable } from "@/components/buscador";
import { ColumnaMonto, Monto } from "@/components/monto";
import { Bajada, Rotulo } from "@/components/rotulo";
import { Semaforo } from "@/components/semaforo";
import { Fila, FilaLectura, Losa } from "@/components/superficie";
import { PALABRA_SEMAFORO, type Semaforo as EstadoSemaforo } from "@/lib/por-pagar";
import { traerClientes, type FilaCliente } from "@/lib/queries";

export const metadata = { title: "Clientes — Lithium" };

/**
 * Secciones por semáforo, peor primero. Agrupar en vez de una lista plana es lo
 * que hace que la pregunta "¿a quién le presto?" se conteste de un barrido: el
 * rótulo ya dice la respuesta y la fila solo dice quién.
 */
const SECCIONES: { estado: EstadoSemaforo; bajada: string }[] = [
  { estado: "rojo", bajada: "Te deben plata vencida" },
  { estado: "naranja", bajada: "Te pagan, pero tarde o de a poco" },
  { estado: "nuevo", bajada: "Todavía no te pagaron nada" },
  { estado: "verde", bajada: "Te pagaron todo, siempre a tiempo" },
];

export default async function ClientesPage() {
  const { clientes, error } = await traerClientes();

  const porEstado = new Map<EstadoSemaforo, FilaCliente[]>();
  for (const cliente of clientes) {
    const lista = porEstado.get(cliente.semaforo) ?? [];
    lista.push(cliente);
    porEstado.set(cliente.semaforo, lista);
  }

  // Las secciones vacías no se renderizan, así que "la última losa" —donde va
  // `Cliente nuevo`— hay que saber cuál es antes de empezar a dibujar.
  const secciones = SECCIONES.filter(({ estado }) => (porEstado.get(estado)?.length ?? 0) > 0);
  const totalDeuda = clientes.reduce((suma, c) => suma + c.debe, 0);

  const personas: PersonaBuscable[] = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    semaforo: c.semaforo,
    debe: c.debe,
    cuotaImpagaId: c.cuotaImpagaId,
  }));

  return (
    <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
      <Buscador personas={personas}>
        {/* Las tres pantallas de datos dicen el error con la misma cara y las
            mismas palabras: lo primero que necesita saber es que la plata está
            guardada. */}
        {error ? (
          <div className="mt-2.5">
            <Aviso tono="error" titulo="No se pudieron traer los clientes">
              {error} Lo que ya cobraste está guardado. Esto es solo la pantalla, no tus datos.
            </Aviso>
          </div>
        ) : clientes.length === 0 ? (
          <div className="mt-2.5">
            <Aviso
              tono="calma"
              titulo="Todavía no cargaste a nadie."
              acciones={
                <BotonLink peso="texto" href="/nuevo-cliente">
                  Cargar el primero
                </BotonLink>
              }
            >
              Empezá por la persona a la que le vas a prestar.
            </Aviso>
          </div>
        ) : (
          <>
            <Losa className="mt-2.5">
              <FilaLectura>
                <span className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
                  {clientes.length === 1 ? "1 cliente" : `${clientes.length} clientes`}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
                    en la calle
                  </span>
                  <ColumnaMonto>
                    <Monto
                      valor={totalDeuda}
                      className="font-mono text-[0.95rem] font-normal tracking-[-0.01em] text-texto"
                    />
                  </ColumnaMonto>
                </span>
              </FilaLectura>
            </Losa>

            {secciones.map(({ estado, bajada }, i) => {
              const grupo = porEstado.get(estado)!;
              const esLaUltima = i === secciones.length - 1;

              return (
                <section key={estado} className="mt-8">
                  <Rotulo>
                    {PALABRA_SEMAFORO[estado]} · {grupo.length}
                  </Rotulo>
                  <Bajada>{bajada}</Bajada>

                  <Losa className="mt-2.5">
                    {grupo.map((cliente) => (
                      <Fila key={cliente.id}>
                        {/* Un solo destino por persona: la ficha. El `before`
                            estira el área tocable del nombre sobre toda la fila,
                            así el monto también lleva ahí y no hay una segunda
                            zona con otro comportamiento según dónde cae el pulgar. */}
                        <Link
                          href={`/clientes/${cliente.id}`}
                          className="min-w-0 flex-1 before:absolute before:inset-0"
                        >
                          <span className="block truncate text-[1rem] font-semibold tracking-[-0.011em] text-texto">
                            {cliente.nombre}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            {/* Dentro de la sección la palabra ya la dice el
                                rótulo: acá va solo el punto. Salvo que el color
                                lo haya puesto ella a mano, que sí es información
                                nueva y entonces se escribe. */}
                            <Semaforo
                              estado={cliente.semaforo}
                              esManual={cliente.esManual}
                              soloPunto={!cliente.esManual}
                            />
                            {/* Los papeles aparecen SOLO cuando falta algo: lo
                                que está en regla no necesita decirse. */}
                            {!cliente.papelesOk ? (
                              <span className="text-[0.875rem] font-medium tracking-[-0.006em] text-atencion">
                                {cliente.papeles}
                              </span>
                            ) : null}
                          </span>
                        </Link>

                        <ColumnaMonto>
                          {cliente.debe > 0 ? (
                            <Monto
                              valor={cliente.debe}
                              className="font-mono text-[0.95rem] font-medium tracking-[-0.01em] text-texto"
                            />
                          ) : (
                            <span className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
                              no te debe
                            </span>
                          )}
                        </ColumnaMonto>
                      </Fila>
                    ))}

                    {/* Última celda de la última losa, no un botón flotando
                        arriba: cargar a alguien es lo que se hace DESPUÉS de
                        mirar la lista y no encontrarlo. Sin relleno de marca —
                        acá no se registra plata, se decide a quién prestarle. */}
                    {esLaUltima ? (
                      <FilaLectura className="h-16">
                        <BotonLink peso="texto" href="/nuevo-cliente">
                          Cliente nuevo
                        </BotonLink>
                      </FilaLectura>
                    ) : null}
                  </Losa>
                </section>
              );
            })}
          </>
        )}
      </Buscador>
    </main>
  );
}
