import Link from "next/link";
import { notFound } from "next/navigation";

import { BotonLink, Volver } from "@/components/boton";
import { BorrarDocumento } from "@/components/borrar-documento";
import { ColumnaMonto, Monto } from "@/components/monto";
import { Bajada, Nota, Rotulo } from "@/components/rotulo";
import { Motivo, Semaforo } from "@/components/semaforo";
import { BotonSubir } from "@/components/subir-documento";
import { Escalon, Fila, FilaLectura, Losa, Piedra } from "@/components/superficie";
import {
  evaluarDocumentacion,
  NOMBRE_TIPO_CLIENTE,
  resumenDocumentacion,
  type DocumentoCargado,
  type TipoCliente,
} from "@/lib/documentacion";
import { fechaConDia, hoyEnBA } from "@/lib/fecha";
import { formatARS } from "@/lib/money";
import { PALABRA_SEMAFORO, type Semaforo as EstadoSemaforo } from "@/lib/por-pagar";
import { createClient } from "@/lib/supabase/server";

import { SelectorDeTipo } from "./tipo";

type Props = { params: Promise<{ id: string }> };

const mesLargo = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/** `2` → `"2 cuotas"`, `1` → `"1 cuota"`. Contar bien es la mitad de la confianza. */
function plural(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

type Hechos = {
  pagadas: number;
  tardias: number;
  parciales: number;
  vencidas: number;
  montoVencido: number;
};

/**
 * El semáforo nunca va solo: siempre lleva su motivo abajo, en palabras.
 *
 * Un chip de color sin motivo es decoración, y decoración acá se lee como magia
 * hecha con IA — la primera vez que no coincida con lo que ella sabe, deja de
 * creerle para siempre. Los hechos salen de las mismas cuotas que usa
 * `recalcular_semaforo()` en SQL, así que dicen exactamente por qué está en ese
 * color.
 */
function motivoDelSemaforo(estado: EstadoSemaforo, h: Hechos): string {
  const palabra = PALABRA_SEMAFORO[estado];

  if (estado === "rojo") {
    return h.vencidas > 0
      ? `${palabra} — ${plural(h.vencidas, "cuota vencida", "cuotas vencidas")}, ${formatARS(h.montoVencido)}`
      : `${palabra} — te tiene plata vencida`;
  }

  if (estado === "naranja") {
    const hechos: string[] = [];
    if (h.tardias > 0) hechos.push(`pagó tarde ${h.tardias} de ${h.pagadas} cuotas`);
    if (h.parciales > 0) {
      hechos.push(`${plural(h.parciales, "cuota", "cuotas")} te la cerró pagando de menos`);
    }
    return hechos.length > 0
      ? `${palabra} — ${hechos.join(" · ")}`
      : `${palabra} — te paga, pero tarde o de a poco`;
  }

  if (estado === "nuevo") return `${palabra} — todavía no te pagó nada`;

  return h.pagadas > 0
    ? `${palabra} — te pagó ${plural(h.pagadas, "cuota", "cuotas")}, siempre a tiempo`
    : `${palabra} — no tiene nada atrasado`;
}

export default async function FichaCliente({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [clienteRes, docsRes, cuotasRes, prestamosRes] = await Promise.all([
    supabase
      .from("clientes")
      .select(
        "id,nombre,telefono,notas,tipo,semaforo_efectivo,semaforo_auto,semaforo_manual,garante_nombre,garante_telefono",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("documentos")
      .select("id,tipo,periodo,subido_el,nombre_archivo,mime")
      .eq("cliente_id", id)
      .order("periodo", { ascending: false, nullsFirst: false }),
    // TODAS las cuotas, no solo las impagas: de las pagadas salen los hechos que
    // explican el semáforo ("pagó tarde 3 de 5") y el "3 de 6 cobradas" de cada
    // préstamo. Es una query más grande, no una query más.
    supabase
      .from("cuotas")
      .select("monto,fecha_cobro,pagado_el,parcial,credito_id,creditos!inner(cliente_id)")
      .eq("creditos.cliente_id", id)
      .limit(2000),
    supabase
      .from("creditos")
      .select("id,monto,monto_total,tasa,con_interes,fecha_otorgado")
      .eq("cliente_id", id)
      .order("fecha_otorgado", { ascending: false }),
  ]);

  if (clienteRes.error || !clienteRes.data) notFound();

  const cliente = clienteRes.data as {
    id: string;
    nombre: string;
    telefono: string | null;
    notas: string | null;
    tipo: TipoCliente | null;
    semaforo_efectivo: EstadoSemaforo;
    semaforo_auto: EstadoSemaforo;
    semaforo_manual: EstadoSemaforo | null;
    garante_nombre: string | null;
    garante_telefono: string | null;
  };

  const documentos = (docsRes.data ?? []) as (DocumentoCargado & {
    nombre_archivo: string | null;
    mime: string | null;
  })[];

  const hoy = hoyEnBA();
  const evaluacion = evaluarDocumentacion(cliente.tipo, documentos, hoy);

  const cuotas = (cuotasRes.data ?? []).map((c) => ({
    monto: Number(c.monto),
    fecha_cobro: c.fecha_cobro as string,
    pagado_el: (c.pagado_el as string | null) ?? null,
    parcial: Boolean(c.parcial),
    credito_id: c.credito_id as string,
  }));

  // El estado se DERIVA en render y nunca se lee de `cuotas.estado`: el cron lo
  // escribe a las 9:00, y entre las 00:00 y esa hora —o si falla— la columna
  // miente y la pantalla pintaría al día algo que ya venció.
  const vencida = (c: (typeof cuotas)[number]) => c.pagado_el === null && c.fecha_cobro < hoy;

  const hechos: Hechos = {
    pagadas: cuotas.filter((c) => c.pagado_el !== null).length,
    tardias: cuotas.filter((c) => c.pagado_el !== null && c.pagado_el > c.fecha_cobro).length,
    parciales: cuotas.filter((c) => c.parcial).length,
    vencidas: cuotas.filter(vencida).length,
    montoVencido: cuotas.filter(vencida).reduce((s, c) => s + c.monto, 0),
  };

  const debe = cuotas.filter((c) => c.pagado_el === null).reduce((s, c) => s + c.monto, 0);

  const prestamos = ((prestamosRes.data ?? []) as {
    id: string;
    monto: number | string;
    monto_total: number | string;
    tasa: number | string | null;
    con_interes: boolean;
    fecha_otorgado: string;
  }[]).map((p) => {
    const propias = cuotas.filter((c) => c.credito_id === p.id);
    const cobradas = propias.filter((c) => c.pagado_el !== null).length;
    return {
      ...p,
      cuotas: propias.length,
      cobradas,
      impago: propias.filter((c) => c.pagado_el === null).reduce((s, c) => s + c.monto, 0),
      vencidas: propias.filter(vencida).length,
      abierto: propias.some((c) => c.pagado_el === null),
    };
  });

  const abiertos = prestamos.filter((p) => p.abierto).length;
  const primerIncompleto = evaluacion.requisitos.find((r) => !r.cumplido)?.requisito.tipo ?? null;

  const filasDeDocumentos = (tipo: string) =>
    documentos
      .filter((d) => d.tipo === tipo)
      .map((doc) => (
        <FilaLectura key={doc.id}>
          {/* Sangría de 16px: los papeles cuelgan del requisito, no son otro
              requisito. Sin miniaturas — una lista con fotos de DNI es la
              filtración servida a cualquiera que mire la pantalla de costado. */}
          <span className="min-w-0 flex-1 pl-4">
            <a
              href={`/api/documentos/${doc.id}`}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-[0.875rem] font-medium tracking-[-0.006em] text-marca-texto"
            >
              {doc.periodo
                ? mesLargo.format(new Date(`${doc.periodo}T00:00:00Z`))
                : `Subido el ${fechaConDia(doc.subido_el.slice(0, 10))}`}
            </a>
          </span>
          <BorrarDocumento id={doc.id} />
        </FilaLectura>
      ));

  return (
    <main className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
      <Volver href="/clientes">Volver a clientes</Volver>

      {/* La piedra de identidad: quién es, si le prestás de nuevo, y cuánto te
          debe. El número principal mide 44px acá, en el Resumen y en el detalle
          del préstamo: mismo lugar, mismo tamaño, siempre. */}
      <Piedra className="mt-2.5">
        <h1 className="font-display text-[1.375rem] font-bold tracking-[-0.025em]">{cliente.nombre}</h1>

        <p className="mt-2">
          <Semaforo
            estado={cliente.semaforo_efectivo}
            esManual={cliente.semaforo_manual !== null}
          />
        </p>
        <Motivo>{motivoDelSemaforo(cliente.semaforo_efectivo, hechos)}</Motivo>
        {cliente.semaforo_manual !== null && cliente.semaforo_auto !== cliente.semaforo_manual ? (
          <p className="mt-1 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
            El cálculo dice: {PALABRA_SEMAFORO[cliente.semaforo_auto]}.
          </p>
        ) : null}

        {cliente.telefono ? (
          <a
            href={`tel:${cliente.telefono}`}
            className="mt-1 inline-flex h-12 items-center text-[0.875rem] font-medium tracking-[-0.006em] text-marca-texto"
          >
            {cliente.telefono}
          </a>
        ) : null}

        <p className="mt-4 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
          Te debe
        </p>
        <p className="mt-1">
          <Monto
            valor={debe}
            className="font-display text-[2.75rem] font-bold leading-[0.98] tracking-[-0.04em]"
          />
        </p>
        <p className="mt-2 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
          {cliente.tipo ? NOMBRE_TIPO_CLIENTE[cliente.tipo] : "Falta decir de qué tipo es"} ·{" "}
          {abiertos === 0
            ? "sin préstamos abiertos"
            : plural(abiertos, "préstamo abierto", "préstamos abiertos")}
        </p>
      </Piedra>

      {/* La sección NO se esconde cuando no hay préstamos: es justo el momento en
          que ella acaba de cargar a alguien para prestarle. Esconderla dejaba la
          ficha sin una sola salida hacia `/nuevo-prestamo`. La <Piedra> dice
          "sin préstamos abiertos", pero eso describe; esto deja actuar. */}
      <section className="mt-8">
        <Rotulo>Sus préstamos</Rotulo>

        <Losa className="mt-2.5">
          {prestamos.length === 0 ? (
            <FilaLectura>
              <span className="min-w-0 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
                Todavía no le prestaste nada.
              </span>
              {/* `texto` y no relleno: salir hacia otra pantalla es navegación, y
                  el relleno de marca queda para el botón que completa la tarea de
                  la pantalla donde vive. */}
              <BotonLink peso="texto" href={`/nuevo-prestamo?cliente=${cliente.id}`}>
                Prestarle
              </BotonLink>
            </FilaLectura>
          ) : (
            prestamos.map((p) => (
              <Fila key={p.id} peligro={p.vencidas > 0}>
                <Link href={`/prestamo/${p.id}`} className="min-w-0 flex-1 before:absolute before:inset-0">
                  <span className="block truncate text-[1rem] font-semibold tracking-[-0.011em] text-texto">
                    Le prestaste {formatARS(Number(p.monto))}
                  </span>
                  <span className="mt-1 block text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
                    {fechaConDia(p.fecha_otorgado)}
                    {p.con_interes && p.tasa ? ` · al ${Number(p.tasa)}%` : " · sin interés"}
                  </span>
                  <span className="mt-1 block text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
                    {p.cuotas === 1
                      ? p.cobradas === 1
                        ? "Un solo pago, cobrado"
                        : "Un solo pago"
                      : `${p.cobradas} de ${p.cuotas} cobradas`}
                    {p.vencidas > 0 ? (
                      <span className="text-peligro">
                        {" "}
                        · {plural(p.vencidas, "vencida", "vencidas")}
                      </span>
                    ) : null}
                  </span>
                </Link>

                <ColumnaMonto>
                  {p.impago > 0 ? (
                    <Monto
                      valor={p.impago}
                      className="font-mono text-[0.95rem] font-medium tracking-[-0.01em] text-texto"
                    />
                  ) : (
                    <span className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
                      te pagó todo
                    </span>
                  )}
                </ColumnaMonto>
              </Fila>
            ))
          )}
        </Losa>
      </section>

      {/* La documentación dice "¿tengo los papeles?" y el semáforo dice "¿me
          paga?". Son dos preguntas distintas y por eso son dos bloques: mezclarlas
          pondría en rojo a alguien que siempre pagó puntual. */}
      <section className="mt-8">
        <Rotulo>Documentación</Rotulo>
        {evaluacion.faltan > 0 || evaluacion.hayDesactualizados || !cliente.tipo ? (
          <p className="mt-1 text-[0.875rem] font-medium tracking-[-0.006em] text-atencion">
            {resumenDocumentacion(evaluacion, cliente.tipo)}
          </p>
        ) : (
          <Bajada>{resumenDocumentacion(evaluacion, cliente.tipo)}</Bajada>
        )}

        <SelectorDeTipo
          clienteId={cliente.id}
          actual={cliente.tipo}
          garanteNombre={cliente.garante_nombre}
          garanteTelefono={cliente.garante_telefono}
        />

        {cliente.tipo ? (
          <Losa className="mt-2.5">
            {evaluacion.requisitos.map((estado) => {
              const contador = (
                <ColumnaMonto>
                  <span className="font-mono text-[0.95rem] font-medium tracking-[-0.01em] text-texto">
                    {estado.cargados} de {estado.requisito.cantidad}
                  </span>
                </ColumnaMonto>
              );

              const viejo = estado.desactualizado ? (
                <span className="mt-1 block text-[0.875rem] font-medium tracking-[-0.006em] text-atencion">
                  El más nuevo es de{" "}
                  {mesLargo.format(new Date(`${estado.periodoMasNuevo}T00:00:00Z`))}. Conviene
                  pedirle los actuales.
                </span>
              ) : null;

              // El escalón es el PRIMER requisito incompleto y nada más: una sola
              // acción primaria por pantalla. A los demás no se les saca la
              // posibilidad de subir, se les saca el relleno.
              if (estado.requisito.tipo === primerIncompleto) {
                return [
                  <Escalon key={estado.requisito.tipo}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="block text-[1rem] font-semibold tracking-[-0.011em] text-texto">
                          {estado.requisito.label}
                        </span>
                        <span className="mt-1 block text-[0.875rem] font-medium tracking-[-0.006em] text-texto">
                          {estado.faltan === 1
                            ? "Falta 1"
                            : `Faltan ${estado.faltan} ${estado.requisito.plural}`}
                        </span>
                      </div>
                      {contador}
                    </div>

                    <BotonSubir
                      destacado
                      clienteId={cliente.id}
                      tipo={estado.requisito.tipo}
                      etiqueta={estado.requisito.singular}
                      pidePeriodo={estado.requisito.pidePeriodo}
                    />
                  </Escalon>,
                  ...filasDeDocumentos(estado.requisito.tipo),
                ];
              }

              return [
                <Fila key={estado.requisito.tipo}>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[1rem] font-semibold tracking-[-0.011em] text-texto">
                      {estado.requisito.label}
                    </span>
                    {!estado.cumplido ? (
                      <span className="mt-1 block text-[0.875rem] font-medium tracking-[-0.006em] text-atencion">
                        {estado.faltan === 1
                          ? "Falta 1"
                          : `Faltan ${estado.faltan} ${estado.requisito.plural}`}
                      </span>
                    ) : null}
                    {viejo}
                    {!estado.cumplido || estado.desactualizado ? (
                      <BotonSubir
                        clienteId={cliente.id}
                        tipo={estado.requisito.tipo}
                        etiqueta={estado.requisito.singular}
                        pidePeriodo={estado.requisito.pidePeriodo}
                      />
                    ) : null}
                  </div>
                  {contador}
                </Fila>,
                ...filasDeDocumentos(estado.requisito.tipo),
              ];
            })}
          </Losa>
        ) : null}

        {/* Al cambiar el tipo, los papeles viejos NO se borran: perder papeles que
            costó juntar por un cambio de clasificación sería un error caro. */}
        {evaluacion.sobrantes.length > 0 ? (
          <div className="mt-8">
            <Rotulo>Papeles de antes</Rotulo>
            <Bajada>Quedaron de cuando era de otro tipo. Ya no se le piden, pero ahí están.</Bajada>
            <Losa className="mt-2.5">
              {evaluacion.sobrantes.map((doc) => (
                <FilaLectura key={doc.id}>
                  <span className="min-w-0 flex-1">
                    <a
                      href={`/api/documentos/${doc.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-[0.875rem] font-medium tracking-[-0.006em] text-marca-texto"
                    >
                      {doc.periodo
                        ? mesLargo.format(new Date(`${doc.periodo}T00:00:00Z`))
                        : `Subido el ${fechaConDia(doc.subido_el.slice(0, 10))}`}
                    </a>
                  </span>
                  <BorrarDocumento id={doc.id} />
                </FilaLectura>
              ))}
            </Losa>
          </div>
        ) : null}
      </section>

      {cliente.notas ? (
        <section className="mt-8">
          <Rotulo>Observaciones</Rotulo>
          {/* Marcada como cita: es lo único de la pantalla que escribió ella. */}
          <Nota>{cliente.notas}</Nota>
        </section>
      ) : null}

      {cliente.garante_nombre || cliente.garante_telefono ? (
        <section className="mt-8">
          <Rotulo>Garante</Rotulo>
          <Losa className="mt-2.5">
            <FilaLectura>
              <span className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
                Nombre
              </span>
              <span className="min-w-0 truncate text-[0.875rem] font-medium tracking-[-0.006em] text-texto">
                {cliente.garante_nombre ?? "Sin nombre"}
              </span>
            </FilaLectura>
            <FilaLectura>
              <span className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
                Teléfono
              </span>
              {cliente.garante_telefono ? (
                <a
                  href={`tel:${cliente.garante_telefono}`}
                  className="text-[0.875rem] font-medium tracking-[-0.006em] text-marca-texto"
                >
                  {cliente.garante_telefono}
                </a>
              ) : (
                <span className="text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave">
                  Sin teléfono
                </span>
              )}
            </FilaLectura>
          </Losa>
        </section>
      ) : null}
    </main>
  );
}
