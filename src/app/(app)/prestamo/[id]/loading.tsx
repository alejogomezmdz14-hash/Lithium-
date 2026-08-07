import { ColumnaMonto } from "@/components/monto";
import { Fila, Losa, Piedra } from "@/components/superficie";
import { TiraDeCuotas } from "@/components/tira";

/**
 * Lo que se ve mientras carga el detalle del préstamo.
 *
 * **Por qué existe.** `page.tsx` hace un `select` anidado con `cuotas(...)` y es
 * el destino de cada `<Link href={/prestamo/…}>` de "Por pagar" — la navegación
 * más frecuente de la pantalla más importante. Sin este archivo no hay frontera
 * de Suspense, así que tocar un nombre en la lista **no produce ningún cambio
 * visible** hasta que responde la base: Candela está parada en la calle y no
 * sabe si el tap entró. Un tap que no acusa recibo se repite, y el segundo tap
 * cae sobre una pantalla que ya cambió.
 *
 * **Piedras, no cajas nuevas.** Se compone con los mismos primitivos que la
 * pantalla real (`Piedra`, `Losa`, `Fila`, `ColumnaMonto`, `TiraDeCuotas`) y con
 * las mismas medidas y márgenes. Es lo único que hace que el layout no salte
 * cuando llegan los datos: la piedra mide lo mismo, las filas miden sus 80px y
 * el riel de la plata cae en la misma x. Un esqueleto que no calza es peor que
 * ninguno — mueve la pantalla justo cuando ella va a apoyar el pulgar.
 *
 * **Tres filas, no cuarenta.** No se sabe cuántas cuotas tiene el préstamo, y
 * fingir un plan largo sería inventar un dato. Tres es lo que entra sin scroll y
 * lo que ya dice "acá viene una lista".
 */

/** La tira arranca sin nada cobrado: el total todavía no se sabe. */
const SEGMENTOS_DESCONOCIDOS = 3;

const FILAS = 3;

/**
 * Tailwind da `animate-pulse` a 2s. Acá va a 1.4s porque la espera real de esta
 * ruta es corta: a 2s el esqueleto alcanza a latir una vez y media y se lee como
 * una pantalla trabada, no como una que está cargando. La duración va inline
 * porque es un longhand pisando el shorthand de la animación, y ahí el orden de
 * las capas de utilidades no es algo con lo que valga la pena pelearse.
 *
 * `prefers-reduced-motion` ya lo aplana desde `globals.css`, que corta toda
 * animación a 0.01ms: el esqueleto queda quieto y sigue leyéndose igual.
 */
const PULSO = { animationDuration: "1.4s" };

/**
 * Un hueco. Se rellena con el mismo `color-mix` sobre `--texto` que usan los
 * segmentos vacíos de `TiraDeCuotas`, así el esqueleto y la tira son literalmente
 * el mismo gris cuando quedan uno al lado del otro. Y como es `--texto` y no un
 * valor fijo, se da vuelta solo adentro de la piedra —que redeclara sus tokens—
 * y entre tema claro y oscuro.
 */
function Hueco({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      style={PULSO}
      className={`block animate-pulse rounded-tira bg-[color-mix(in_srgb,var(--texto)_22%,transparent)] ${className}`}
    />
  );
}

export default function CargandoPrestamo() {
  return (
    <main aria-busy className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3">
      <span className="sr-only" role="status">
        Cargando el préstamo
      </span>

      {/* La caja de <Volver>: 48px de alto, misma altura que el botón real. */}
      <div className="flex h-12 items-center">
        <Hueco className="h-[13px] w-36" />
      </div>

      <Piedra className="mt-2.5">
        {/* "Te deben" */}
        <Hueco className="h-[13px] w-24" />
        {/* El monto héroe: 44px, el alto de la línea real. */}
        <Hueco className="mt-2 h-11 w-56 max-w-full" />
        {/* "de $X · le prestaste $Y al Z%" */}
        <Hueco className="mt-3 h-[13px] w-72 max-w-full" />

        <div className="mt-5">
          <TiraDeCuotas total={SEGMENTOS_DESCONOCIDOS} cobradas={0} />
        </div>
        {/* El caption: "N de M cobradas · …" */}
        <Hueco className="mt-3 h-[13px] w-48 max-w-full" />
      </Piedra>

      {/* El rótulo del grupo va como hueco y no como texto: acá no se sabe
          todavía si el préstamo tiene cuotas o es un solo pago, y adivinarlo
          sería escribir un dato que puede salir mal. */}
      <div className="mt-8 flex h-4 items-center">
        <Hueco className="h-[11px] w-28" />
      </div>

      <Losa className="mt-2.5">
        {Array.from({ length: FILAS }, (_, i) => (
          <Fila key={i}>
            {/* La canaleta del riel, vacía: el glifo depende del estado. */}
            <span aria-hidden className="-ml-1 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <Hueco className="h-[15px] w-32" />
              <Hueco className="mt-2 h-[13px] w-44 max-w-full" />
            </div>
            <ColumnaMonto>
              <Hueco className="ml-auto h-[15px] w-20" />
            </ColumnaMonto>
          </Fila>
        ))}
      </Losa>
    </main>
  );
}
