"use client";

/**
 * El último colchón: se usa solo si falla el `layout.tsx` raíz, y por eso tiene
 * que traer su propio `<html>` y `<body>` — no hay layout encima que se los dé.
 *
 * Por lo mismo **no puede usar ni los tokens de `globals.css` ni los primitivos
 * de `src/components/`**: si el layout no llegó a montar, no cargó la hoja de
 * estilos, no cargaron las fuentes de `next/font` y ninguna clase de material
 * existe. Va con estilos crudos a propósito.
 *
 * **Es el único archivo de toda la app donde hay hexes sueltos**, y el lint lo
 * exceptúa por nombre. Los valores son los de la rama oscura de Adoquín, copiados
 * a mano: si la paleta cambia, esta pantalla hay que actualizarla acá, porque no
 * tiene de dónde heredarla.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es-AR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 16px",
          background: "#06070B", // --calle (oscuro)
          color: "#F2F4F8", // --texto
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          La app no pudo arrancar.
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "14px",
            letterSpacing: "-0.006em",
            color: "#A2ABBD", // --texto-suave
          }}
        >
          Tus datos están guardados. Cerrá la app y volvé a abrirla.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "24px",
            height: "56px",
            border: 0,
            borderRadius: "9999px", // --radius-pill: esto registra el reintento
            background: "#2F74E8", // --marca
            color: "#05070C", // --sobre-marca
            fontSize: "14px",
            fontWeight: 600,
            letterSpacing: "-0.006em",
            fontFamily: "inherit",
          }}
        >
          Probá de nuevo
        </button>
        {error.digest ? (
          <p
            style={{
              margin: "24px 0 0",
              fontSize: "12px",
              color: "#7D8698", // --texto-tenue
              textAlign: "center",
            }}
          >
            Código para Alejo: {error.digest}
          </p>
        ) : null}
      </body>
    </html>
  );
}
