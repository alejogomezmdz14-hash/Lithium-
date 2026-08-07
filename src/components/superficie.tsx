import type { ReactNode } from "react";

/**
 * Los materiales. **Este es el único archivo de la app que puede escribir
 * `vidrio`, `vidrio-alto` o `panel-heroe`** — lo verifica `acento.test.ts`.
 * Todo lo demás compone estos primitivos.
 *
 * Hay **un solo material que flota** (`.vidrio` en `globals.css`): mismo fondo,
 * mismo filo de luz arriba, mismo hairline. Que sea uno solo es lo que hace que
 * la app se lea como un producto y no como diez pantallas — mezclar lenguajes de
 * superficie es la penalización más cara del rubro de coherencia.
 *
 * Y un grupo de filas **no son N tarjetas flotando**: es una tarjeta con
 * renglones adentro, separados por una junta de 2px por donde asoma el fondo.
 */

/* -------------------------------------------------------------------------- */

/**
 * El bloque héroe. **Uno solo por pantalla** — si hay dos, ninguno es el
 * importante.
 *
 * Es la única superficie con degradé de toda la app, y por eso pesa sin
 * necesidad de ser más grande ni de otro color. Lleva la clase `.piedra`, que
 * redeclara los tokens de texto adentro: el contenido se ve igual en los dos
 * temas y no puede desaparecer cuando se cambia de claro a oscuro.
 */
export function Piedra({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`piedra panel-heroe relative overflow-hidden rounded-panel px-6 py-7 text-texto ${className}`}
    >
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Un GRUPO de filas. Los hijos van sin fondo propio: lo pone `Fila`.
 *
 * `peligro` dibuja la barra de 3px a lo largo de TODA la tarjeta, no fila por
 * fila. Es lo que una lista con gaps es incapaz de decir: dos vencidos seguidos
 * comparten una sola barra que abarca los dos y significa *"este bloque entero
 * es el problema"*. Y es forma, no hue: se ve al sol y se ve con daltonismo.
 */
export function Losa({
  children,
  peligro = false,
  className = "",
}: {
  children: ReactNode;
  peligro?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`vidrio relative flex flex-col gap-[var(--junta)] overflow-hidden rounded-tarjeta ${className}`}
    >
      {peligro ? (
        <span aria-hidden className="absolute inset-y-0 left-0 z-10 w-[3px] bg-peligro" />
      ) : null}
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

type FilaProps = {
  children: ReactNode;
  /** Barra de peligro solo en ESTA fila. Para listas mixtas, como el plan de cuotas. */
  peligro?: boolean;
  /** Filas cobradas: se apagan en su lugar, no desaparecen. */
  apagada?: boolean;
  className?: string;
};

/**
 * La unidad. 80px de alto mínimo, con la canaleta de 20px a la izquierda libre
 * para el glifo del riel o para la barra de peligro.
 *
 * No lleva fondo propio: el material lo pone la tarjeta que la contiene, y la
 * junta de 2px la separa de la de al lado. Presionarla la hunde — es lo único
 * que hace que una superficie se sienta física, y con juntas de 2px es también
 * lo que dice *cuál* fila se tocó antes de soltar.
 *
 * **`apagada` baja el COLOR del texto, nunca la opacidad del contenedor.** Era
 * `opacity-55`, y en tema claro eso componía el `--texto` #101319 sobre el
 * vidrio blanco en rgb(124,125,129): **4.05:1**, debajo del 4.5 de AA. Y no
 * zafaba por texto grande — `Cuota 3 de 6` es 16px semibold y WCAG pide 18.66px
 * en bold. Peor todavía: el `$` de `<Monto>` ya viene en `texto-suave`, así que
 * el 55% encima lo dejaba en **2.47:1** — la plata ya cobrada era lo menos
 * legible de la pantalla. En oscuro componía 5.67:1 y pasaba, o sea que el bug
 * se veía **solo al sol**, que es exactamente donde se usa la app.
 *
 * Con `texto-suave` el cuerpo y el `$` quedan los dos en 6.84:1 en claro y
 * 7.75:1 en oscuro, sigue habiendo un escalón real contra el 18.1:1 de una fila
 * viva, y el ✓ del riel conserva su `exito` pleno: el glifo pasa a ser el que
 * dice "cobrada", que es su trabajo.
 */
export function Fila({ children, peligro = false, apagada = false, className = "" }: FilaProps) {
  return (
    <div
      className={`presionable relative flex min-h-20 items-start gap-3 py-[18px] pl-[var(--riel)] pr-4 ${
        apagada ? "text-texto-suave" : ""
      } ${className}`}
    >
      {peligro ? (
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-peligro" />
      ) : null}
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * La fila accionable. **Una por pantalla.**
 *
 * No se destaca con un 4% de luminancia: cambian cuatro cosas a la vez —
 * material (sube al vidrio alto, con sombra proyectada propia), altura, despegue
 * (rompe la junta con margen propio) y la barra de acción de ancho completo
 * adentro. Por eso se ve al sol, y por eso no hace falta ningún color nuevo.
 */
export function Escalon({
  children,
  peligro = false,
  className = "",
}: {
  children: ReactNode;
  peligro?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`vidrio-alto presionable relative my-2 flex min-h-22 flex-col gap-3 overflow-hidden rounded-tarjeta py-[22px] pl-[var(--riel)] pr-4 ${className}`}
    >
      {peligro ? (
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-peligro" />
      ) : null}
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Label a la izquierda, valor sobre el riel de la plata. Es una **tabla**, no
 * una lista de cosas para tocar: por eso no se hunde al presionarla.
 */
export function FilaLectura({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-h-14 items-center justify-between gap-3 px-4 ${className}`}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * El riel de glifos: la columna de 20px a la izquierda de toda fila.
 *
 * Glifos SVG, no los caracteres `✓` y `○` tipeados dentro de un `<p>` — esos se
 * leen en voz alta como "marca de verificación" y no escalan con el texto.
 *
 * `futura` va en `texto-suave` y no en `tenue`: a 1px de trazo, 5:1 ya está al
 * límite de lo que se ve con sol.
 */
export function Riel({ estado }: { estado: "cobrada" | "futura" }) {
  if (estado === "cobrada") {
    return (
      <span aria-hidden className="-ml-1 flex w-5 shrink-0 justify-center pt-[3px] text-exito">
        <svg
          viewBox="0 0 24 24"
          className="size-[15px]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    );
  }

  return (
    <span aria-hidden className="-ml-1 flex w-5 shrink-0 justify-center pt-[4px] text-texto-suave">
      <svg viewBox="0 0 24 24" className="size-[13px]" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    </span>
  );
}
