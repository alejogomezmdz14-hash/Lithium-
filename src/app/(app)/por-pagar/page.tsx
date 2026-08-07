import Link from "next/link";

import { Atomo } from "@/components/atomo";
import { Aviso } from "@/components/aviso";
import { BotonLink } from "@/components/boton";
import { Buscador, type PersonaBuscable } from "@/components/buscador";
import { ColumnaMonto, Monto } from "@/components/monto";
import { HeaderDeGrupo, Nota, Rotulo } from "@/components/rotulo";
import { Escalon, Fila, FilaLectura, Losa, Piedra } from "@/components/superficie";
import { fechaConDia } from "@/lib/fecha";
import { formatARS } from "@/lib/money";
import { lineaMeta, type Bucket, type FilaPersona, type Grupo } from "@/lib/por-pagar";
import { traerClientes, traerPorPagar } from "@/lib/queries";

export const metadata = { title: "Por pagar — Lithium" };

/**
 * Nada saca una cuota de `Vencidos` por sí solo: a los tres meses hay 18 filas
 * de mora de marzo empujando `HOY` abajo del fold y la pantalla se invierte
 * sola con el tiempo. Cinco visibles, el resto detrás de un `<details>`.
 */
const VISIBLES_EN_VENCIDOS = 5;

/**
 * "¿A quién tengo que correr hoy?". Es el trabajo diario de Candela, así que la
 * pantalla no repite el aviso que ya le llegó por WhatsApp: la deja **actuar**.
 *
 * **Sin piedra acá.** Un bloque héroe de 148px son 244px antes del primer
 * nombre, en la pantalla donde el primer nombre ES la pantalla, y por un número
 * que no cambia ninguna decisión. Arriba va el buscador y el primer header de
 * grupo, nada más.
 */
export default async function PorPagar() {
  // En paralelo: los cobros son la pantalla, los clientes son el buscador. Uno
  // detrás del otro serían dos round-trips para una sola pintada.
  const [cobros, { clientes }] = await Promise.all([traerPorPagar(), traerClientes()]);
  const { hoy, grupos, proximo, despuesDeLaSemana, error } = cobros;

  const personas: PersonaBuscable[] = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    semaforo: c.semaforo,
    debe: c.debe,
    cuotaImpagaId: c.cuotaImpagaId,
  }));

  // El escalón vive en el primer grupo ABIERTO: la única barra azul de la
  // pantalla adentro de un `<details>` cerrado no existe.
  const bucketDelEscalon = (grupos.find((g) => !g.colapsadoPorDefecto) ?? grupos[0])?.bucket;

  return (
    <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
      {/* El título lo dice la barra de navegación. Acá gastaría la primera
          franja de pantalla en repetir dónde está parada. */}
      <h1 className="sr-only">Por pagar</h1>

      <Buscador personas={personas}>
        {error ? (
          <div className="mt-2.5">
            <Aviso tono="error" titulo="No se pudieron traer los cobros">
              {/* El mensaje crudo de Supabase llega en inglés y con nombre de
                  tabla (`permission denied for table cuotas`). Parada en la
                  calle eso no le dice nada y encima asusta: lo que necesita leer
                  primero es que la plata está guardada. El texto técnico sirve
                  para pasárselo a Alejo, así que no se tira — se esconde, igual
                  que el `digest` en `app/error.tsx`. */}
              <p>
                No hay señal, o la base no contestó. Lo que ya cobraste está guardado. Esto es solo
                la pantalla, no tus datos.
              </p>
              <details className="mt-4">
                <summary className="inline-flex min-h-11 list-none items-center font-semibold text-marca-texto [&::-webkit-details-marker]:hidden">
                  Detalle técnico
                </summary>
                {/* `break-words`: un error de Postgres es una línea larga sin
                    espacios y la piedra recorta lo que se le desborde. */}
                <p className="break-words text-texto-tenue">{error}</p>
              </details>
            </Aviso>
          </div>
        ) : grupos.length === 0 ? (
          <SinNadaQueCorrer proximo={proximo} />
        ) : (
          <>
            <div className="mt-2 flex flex-col gap-8">
              {grupos.map((grupo) => (
                <GrupoDeCobros
                  key={grupo.bucket}
                  grupo={grupo}
                  hoy={hoy}
                  conEscalon={grupo.bucket === bucketDelEscalon}
                />
              ))}
            </div>

            {despuesDeLaSemana ? (
              <p className="mt-8 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
                Después de esta semana, el próximo es el{" "}
                {fechaConDia(despuesDeLaSemana.fecha_cobro)} — {despuesDeLaSemana.nombre}.
              </p>
            ) : null}
          </>
        )}
      </Buscador>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Cada grupo es **una losa soldada**, no N tarjetas. En `Vencidos` y en
 * `Mora vieja` la losa lleva `peligro`, así la barra de 3px corre CONTINUA
 * sobre las filas y dice *"este bloque entero es el problema"* — que es
 * exactamente lo que una lista con gaps es incapaz de decir.
 */
function GrupoDeCobros({
  grupo,
  hoy,
  conEscalon,
}: {
  grupo: Grupo;
  hoy: string;
  conEscalon: boolean;
}) {
  const urgente = grupo.bucket === "vencidos" || grupo.bucket === "mora_vieja";
  const cuantas =
    grupo.cantidadPersonas === 1 ? "1 persona" : `${grupo.cantidadPersonas} personas`;
  // Cuenta PERSONAS y trae subtotal: así el header se gana el lugar que ocupa.
  const encabezado = `${grupo.titulo.toUpperCase()} · ${cuantas} · ${formatARS(grupo.total)}`;

  const conTope = grupo.bucket === "vencidos" && grupo.personas.length > VISIBLES_EN_VENCIDOS;
  const visibles = conTope ? grupo.personas.slice(0, VISIBLES_EN_VENCIDOS) : grupo.personas;
  const escondidas = conTope ? grupo.personas.slice(VISIBLES_EN_VENCIDOS) : [];

  const losa = (
    <Losa peligro={urgente}>
      {visibles.map((persona, i) =>
        conEscalon && i === 0 ? (
          <PersonaEnEscalon
            key={persona.cliente_id}
            persona={persona}
            hoy={hoy}
            bucket={grupo.bucket}
            urgente={urgente}
          />
        ) : (
          <PersonaEnFila
            key={persona.cliente_id}
            persona={persona}
            hoy={hoy}
            bucket={grupo.bucket}
            urgente={urgente}
          />
        ),
      )}

      {conTope ? (
        <details className="flex flex-col gap-[var(--junta)]">
          <summary className="list-none [&::-webkit-details-marker]:hidden">
            <FilaLectura>
              <span className="text-[0.875rem] font-semibold tracking-[-0.006em] text-marca-texto">
                Ver los {grupo.cantidadPersonas} vencidos
              </span>
            </FilaLectura>
          </summary>
          {escondidas.map((persona) => (
            <PersonaEnFila
              key={persona.cliente_id}
              persona={persona}
              hoy={hoy}
              bucket={grupo.bucket}
              urgente={urgente}
            />
          ))}
        </details>
      ) : null}
    </Losa>
  );

  // `Mora vieja` arranca cerrada: si no, tres meses de atraso viejo empujan
  // `HOY` abajo del fold y la pantalla deja de contestar su pregunta.
  if (grupo.colapsadoPorDefecto) {
    return (
      <details>
        <summary className="list-none py-2 [&::-webkit-details-marker]:hidden">
          <Rotulo>{encabezado}</Rotulo>
        </summary>
        <div className="mt-2.5">{losa}</div>
      </details>
    );
  }

  return (
    <section>
      <HeaderDeGrupo>{encabezado}</HeaderDeGrupo>
      <div className="mt-2.5">{losa}</div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

type PersonaProps = {
  persona: FilaPersona;
  hoy: string;
  bucket: Bucket;
  urgente: boolean;
};

/**
 * La línea de abajo del nombre. Máximo tres segmentos —lo verifica un test— y
 * en `peligro` solo cuando el grupo es de mora: ahí el atraso ES el motivo por
 * el que la fila existe. En `Hoy` y `Esta semana` va en `texto` pleno: la fecha
 * no es un caption, es el motivo por el que abrió la app, y se lee al sol.
 */
function Meta({ persona, hoy, bucket, urgente }: PersonaProps) {
  return (
    <span
      className={`mt-1 block text-[0.875rem] font-medium tracking-[-0.006em] ${
        urgente ? "text-peligro" : "text-texto"
      }`}
    >
      {lineaMeta(persona, hoy, bucket)}
    </span>
  );
}

function Nombre({ children }: { children: string }) {
  return (
    <span className="block truncate text-[1rem] font-semibold tracking-[-0.011em] text-texto">
      {children}
    </span>
  );
}

const MONTO_DE_FILA = "block font-mono text-[0.95rem] font-medium tracking-[-0.01em] text-texto";

/**
 * Una fila por **persona**, no por cuota: si Marta tiene dos venciendo, van
 * juntas. Si no, con ella parada adelante cobra una, cierra, y se olvida de la
 * otra.
 *
 * El botón es la **píldora fantasma**: mismo tamaño, misma forma y las mismas
 * palabras que el lleno del escalón. Cobrar sigue siendo un tap en cualquier
 * fila; lo que cambia entre una y otra es el peso, no la presencia.
 */
function PersonaEnFila(props: PersonaProps) {
  const { persona } = props;

  return (
    <Fila>
      <div className="min-w-0 flex-1">
        <Link href={`/prestamo/${persona.cuotas[0].credito_id}`} className="block">
          <Nombre>{persona.nombre}</Nombre>
          <Meta {...props} />
        </Link>
        {/* La nota aparece solo si existe, y va como CITA: es lo único de la
            pantalla que escribió ella, y es lo que cambia CÓMO cobrarle. */}
        {persona.notas ? <Nota>{persona.notas}</Nota> : null}
      </div>

      <ColumnaMonto>
        {/* El monto de la vencida NO va en rojo: el rojo lo deja 2.6× más
            apagado que uno que no le importa, y alternar contrastes en una
            columna alineada a la derecha la convierte en manchas. */}
        <Monto valor={persona.total} className={MONTO_DE_FILA} />
        <div className="mt-2">
          <BotonLink peso="fantasma" href={`/cobrar/${persona.cuotas[0].id}`}>
            Ya me pagó
          </BotonLink>
        </div>
      </ColumnaMonto>
    </Fila>
  );
}

/**
 * La primera persona del grupo más urgente. Rompe la soldadura, baja de
 * material, crece, y se lleva **la única barra azul llena de la pantalla**.
 * Cuatro cosas cambian a la vez: por eso se ve al sol sin inventar un color.
 */
function PersonaEnEscalon(props: PersonaProps) {
  const { persona } = props;

  return (
    <Escalon>
      <div className="flex items-start gap-3">
        <Link href={`/prestamo/${persona.cuotas[0].credito_id}`} className="min-w-0 flex-1">
          <Nombre>{persona.nombre}</Nombre>
          <Meta {...props} />
        </Link>
        <ColumnaMonto>
          <Monto valor={persona.total} className={MONTO_DE_FILA} />
        </ColumnaMonto>
      </div>

      {persona.notas ? <Nota>{persona.notas}</Nota> : null}

      <BotonLink peso="lleno" href={`/cobrar/${persona.cuotas[0].id}`}>
        Ya me pagó
      </BotonLink>
    </Escalon>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * El único momento en que la app se puede permitir mostrar la marca adentro del
 * producto: cuando no hay nada que correr. Y es el momento en que ella está más
 * contenta.
 *
 * Informa además la fecha en que se corta la calma — un empty state que solo
 * felicita no sirve para organizar la semana.
 */
function SinNadaQueCorrer({
  proximo,
}: {
  proximo: { nombre: string; monto: number; fecha_cobro: string } | null;
}) {
  return (
    <Piedra className="mt-2">
      <Atomo size={48} className="text-marca-texto" />
      <p className="mt-5 font-display text-[1.375rem] font-bold tracking-[-0.025em] text-texto">
        Estás al día.
      </p>
      <p className="mt-2 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
        {proximo
          ? `El próximo cobro es el ${fechaConDia(proximo.fecha_cobro)} — ${proximo.nombre}, ${formatARS(proximo.monto)}.`
          : "No tenés ningún cobro pendiente."}
      </p>
    </Piedra>
  );
}
