import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * El presupuesto de acento, hecho componente.
 *
 * **`lleno` va UNA sola vez por pantalla** — lo verifica `src/lib/acento.test.ts`,
 * que falla el build si el literal aparece dos veces en el mismo archivo. Un
 * presupuesto escrito en prosa se rompe en la próxima feature; uno verificado no.
 *
 * **La píldora (`rounded-pill`) queda reservada a los cuatro botones que
 * registran plata:** `Ya me pagó`, `Listo, la cobré`, `Crear el préstamo` y
 * `Entrar`, más su variante fantasma. Nada más en la app es una píldora. Antes
 * había 34 `rounded-full`: el chip de "30%", la celda "Ayer" y el botón que
 * registra un cobro tenían todos la misma cara. **Lo que se LEE nunca puede
 * tener la forma de lo que REGISTRA PLATA.**
 *
 * **No existe `disabled`.** Se midió: `#1D63D2` al 60% sobre el escalón claro
 * deja el texto blanco en 1.62:1 — el estado deshabilitado que había era
 * literalmente ilegible. El botón conserva contraste completo y su etiqueta dice
 * qué falta (`Falta elegir a quién`, `Escribí cuánto le prestás`). Al tocarlo
 * cuando falta algo no hace nada, y el campo que falta recibe el foco.
 */

type Peso = "lleno" | "fantasma" | "texto";

/**
 * El halo detrás del relleno (`con-glow`) no es decoración: es lo que hace que
 * la única acción que registra plata se encuentre sin buscarla, incluso con sol
 * y de reojo. Va SOLO en `lleno`, que aparece una vez por pantalla.
 */
const ESTILO: Record<Peso, string> = {
  // Barra de ancho completo, no píldora lateral de 120px. Se midió: #1D63D2
  // contra el escalón oscuro da 2.27:1 y falla el 3:1 de borde no-textual — no
  // existe un azul que dé blanco ≥4.5:1 Y borde ≥3:1 contra ese escalón al mismo
  // tiempo. Con un campo azul y texto blanco a 5.57:1 el borde deja de ser el
  // identificador, y de paso el target pasa a ~300×52.
  lleno:
    "con-glow h-[52px] w-full justify-center rounded-pill bg-marca px-5 text-sobre-marca font-semibold",
  // La fantasma conserva la FORMA de botón: cobrar sigue siendo un tap en toda
  // fila. Un link de texto perdería la caja táctil y no se leería como botón.
  // Usa el mismo vidrio que todo lo demás en vez de un borde de acento: un
  // contorno de color alrededor de algo que no es la acción primaria enseña
  // justo lo contrario de lo que el acento significa.
  fantasma: "vidrio h-12 w-full justify-center rounded-pill px-4 text-marca-texto font-semibold",
  texto: "h-12 text-marca-texto font-semibold",
};

const BASE =
  "presionable inline-flex items-center text-[0.875rem] tracking-[-0.006em]";

function clases(peso: Peso, className: string) {
  return `${BASE} ${ESTILO[peso]} ${className}`;
}

export function Boton({
  peso = "fantasma",
  className = "",
  children,
  ...resto
}: { peso?: Peso; children: ReactNode } & ComponentProps<"button">) {
  return (
    <button className={clases(peso, className)} {...resto}>
      {children}
    </button>
  );
}

export function BotonLink({
  peso = "fantasma",
  className = "",
  children,
  ...resto
}: { peso?: Peso; children: ReactNode } & ComponentProps<typeof Link>) {
  return (
    <Link className={clases(peso, className)} {...resto}>
      {children}
    </Link>
  );
}

/**
 * El paso atrás. Vive acá y no suelto en cada pantalla porque había **cinco
 * caras distintas** para el mismo gesto: dos con chevron y tres sin, con dos
 * gaps y tres márgenes debajo. Es el elemento que más se repite entre rutas y el
 * que más barato delata que las escribió más de una mano.
 *
 * La flecha es un glifo SVG y nunca un `‹` tipeado adentro del string: metida en
 * el texto se cuela en el nombre accesible y rompe cualquier `truncate`.
 */
export function Volver({ href, children }: { href: string; children: ReactNode }) {
  return (
    <BotonLink peso="texto" href={href} className="gap-1.5">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="size-[17px] shrink-0 translate-y-[0.5px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      <span className="min-w-0 truncate">{children}</span>
    </BotonLink>
  );
}
