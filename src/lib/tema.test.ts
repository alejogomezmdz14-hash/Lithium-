import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Las guardas del sistema visual.
 *
 * Un sistema de diseño no se muere en el lanzamiento: se muere cuando alguien
 * agrega una pantalla seis meses después. Estos tests son la versión ejecutable
 * de las reglas de `globals.css`, y existen porque los bugs que tuvimos eran
 * exactamente esto y nada en el repo los gritaba:
 *
 * - `:root .bg-card { border }` se aplicaba en LOS DOS temas, porque `:root`
 *   siempre matchea `<html>`, y el comentario de al lado decía lo contrario.
 * - Dos superficies quedaron con el mismo color en claro, y el único mecanismo
 *   para decir "actuá acá" se volvió invisible.
 */

const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

type RGB = { r: number; g: number; b: number };

function parseColor(valor: string): { color: RGB; alfa: number } | null {
  const hex = valor.match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { color: { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }, alfa: 1 };
  }
  // `rgb(255 255 255 / 0.045)` — la sintaxis moderna, que es la que usa el archivo.
  const rgb = valor.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)\s*)?\)$/);
  if (rgb) {
    return {
      color: { r: +rgb[1], g: +rgb[2], b: +rgb[3] },
      alfa: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  return null;
}

/** Una capa translúcida sobre un fondo opaco: el color que el ojo ve de verdad. */
function componer(encima: { color: RGB; alfa: number }, fondo: RGB): RGB {
  return {
    r: encima.color.r * encima.alfa + fondo.r * (1 - encima.alfa),
    g: encima.color.g * encima.alfa + fondo.g * (1 - encima.alfa),
    b: encima.color.b * encima.alfa + fondo.b * (1 - encima.alfa),
  };
}

function luminancia({ r, g, b }: RGB): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contraste(a: RGB, b: RGB): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** El cuerpo del bloque `selector { ... }` de primer nivel que trae los colores. */
function bloque(selector: string): string {
  const i = CSS.indexOf(`${selector} {`);
  expect(i, `no se encontró el bloque \`${selector}\` en globals.css`).toBeGreaterThan(-1);
  const abre = CSS.indexOf("{", i);
  return CSS.slice(abre + 1, CSS.indexOf("\n}", abre));
}

function variables(cuerpo: string): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const m of cuerpo.matchAll(/^\s*(--[a-z-]+):\s*([^;]+);/gm)) {
    salida[m[1]] = m[2].trim().replace(/\s*\/\*.*$/, "");
  }
  return salida;
}

const CLARO = variables(bloque(":root"));
const OSCURO = variables(bloque(".dark"));

describe("los dos temas están completos", () => {
  it("declaran exactamente el mismo juego de variables", () => {
    // Un token que existe en un tema y falta en el otro no rompe el build: se
    // renderiza como nada, y solo se descubre mirando la pantalla equivocada.
    const soloClaro = Object.keys(CLARO).filter((k) => !(k in OSCURO));
    const soloOscuro = Object.keys(OSCURO).filter((k) => !(k in CLARO));
    expect({ soloClaro, soloOscuro }).toEqual({ soloClaro: [], soloOscuro: [] });
  });

  it("ningún color es igual en los dos temas por accidente", () => {
    // `--marca` y los `--sobre-*` sí pueden repetirse: son la marca y sus pares.
    const puedenRepetirse = new Set(["--marca", "--sobre-marca", "--sobre-destructivo"]);
    const iguales = Object.keys(CLARO).filter(
      (k) => !puedenRepetirse.has(k) && CLARO[k] === OSCURO[k] && /^(#|rgb)/.test(CLARO[k]),
    );
    expect(iguales, `estos colores no cambian entre temas: ${iguales.join(", ")}`).toEqual([]);
  });
});

describe("contraste de texto sobre el fondo real", () => {
  const PARES: [string, string][] = [
    ["--texto", "--base-alta"],
    ["--texto", "--base-baja"],
    ["--texto-suave", "--base-alta"],
    ["--texto-suave", "--base-baja"],
    ["--marca-texto", "--base-alta"],
    ["--peligro", "--base-alta"],
    ["--atencion", "--base-alta"],
    ["--exito", "--base-alta"],
    ["--destructivo", "--base-alta"],
  ];

  for (const [tema, vars] of [
    ["claro", CLARO],
    ["oscuro", OSCURO],
  ] as const) {
    for (const [frente, fondo] of PARES) {
      it(`${tema}: ${frente} sobre ${fondo} llega a 4.5:1`, () => {
        const f = parseColor(vars[frente]);
        const b = parseColor(vars[fondo]);
        expect(f, `${frente} no es un color parseable: ${vars[frente]}`).not.toBeNull();
        expect(b, `${fondo} no es un color parseable: ${vars[fondo]}`).not.toBeNull();
        const r = contraste(f!.color, b!.color);
        expect(r, `da ${r.toFixed(2)}:1 — abajo de AA, ilegible con sol`).toBeGreaterThanOrEqual(4.5);
      });
    }

    it(`${tema}: el texto sigue legible sobre el vidrio (que es translúcido)`, () => {
      // El vidrio se compone sobre el fondo: hay que medir el color RESULTANTE,
      // no el de la capa. Es donde vive todo el texto de la app.
      const base = parseColor(vars["--base-baja"])!.color;
      const vidrio = componer(parseColor(vars["--vidrio"])!, base);
      for (const token of ["--texto", "--texto-suave"]) {
        const r = contraste(parseColor(vars[token])!.color, vidrio);
        expect(r, `${token} sobre el vidrio da ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

describe("la escalera de superficies existe de verdad", () => {
  /**
   * **Este test existe porque el bug ya pasó dos veces.**
   *
   * Primero fueron `--fondo` y `--elevado`, los dos `#f4f4f6`. Después fueron
   * `--vidrio` y `--vidrio-alto`, los dos `#ffffff`. Las dos veces el mecanismo
   * central del sistema —"esta es la fila sobre la que hay que actuar"— quedó
   * invisible en tema claro, las dos veces el código seguía documentando que
   * funcionaba, y las dos veces nada en el repo lo gritó.
   *
   * Se mide sobre el color COMPUESTO, porque en oscuro las superficies son
   * capas translúcidas: comparar los tokens crudos daría un falso OK.
   */
  const NIVELES = ["--base-baja", "--vidrio", "--vidrio-alto"] as const;
  const MINIMO = 2.2; // en L* de CIELAB

  function lStar(c: RGB): number {
    const y = luminancia(c);
    const d = 6 / 29;
    return 116 * (y > d ** 3 ? Math.cbrt(y) : y / (3 * d * d) + 4 / 29) - 16;
  }

  for (const [tema, vars] of [
    ["claro", CLARO],
    ["oscuro", OSCURO],
  ] as const) {
    it(`${tema}: cada nivel se despega del anterior`, () => {
      const base = parseColor(vars["--base-baja"])!.color;
      const escala = NIVELES.map((n) => {
        const c = parseColor(vars[n])!;
        // Las capas translúcidas se componen sobre el canvas: es el color que
        // el ojo ve, y el único que importa.
        return { nombre: n, L: lStar(c.alfa === 1 ? c.color : componer(c, base)) };
      });

      for (let i = 1; i < escala.length; i++) {
        const delta = Math.abs(escala[i].L - escala[i - 1].L);
        expect(
          delta,
          `${escala[i - 1].nombre} y ${escala[i].nombre} están a ΔL* ${delta.toFixed(2)}: ` +
            `no se distinguen, y con eso el escalón deja de existir en tema ${tema}.`,
        ).toBeGreaterThanOrEqual(MINIMO);
      }
    });
  }
});

describe("`:root` solo declara custom properties", () => {
  it("no hay ningún selector de estilo colgando de `:root`", () => {
    // `:root .bg-card { ... }` o `:root body { ... }`: el bug que se aplicaba en
    // los dos temas. Toda diferencia entre temas es un VALOR, jamás un selector.
    const descendientes = CSS.match(/^\s*:root\s+[^{,]+\{/gm) ?? [];
    expect(descendientes, `sobran selectores: ${descendientes.join(" · ")}`).toHaveLength(0);
  });

  it("los bloques `:root` y `.dark` solo contienen declaraciones de variables", () => {
    for (const cuerpo of [bloque(":root"), bloque(".dark")]) {
      const lineas = cuerpo
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split(";")
        .map((l) => l.trim())
        .filter(Boolean);

      for (const linea of lineas) {
        const esVariable = linea.startsWith("--");
        // `color-scheme` es la única propiedad nativa admitida: le dice al
        // navegador de qué color pintar scrollbars y controles del sistema.
        const esEsquema = linea.startsWith("color-scheme:");
        expect(esVariable || esEsquema, `\`${linea}\` no es una custom property`).toBe(true);
      }
    }
  });
});
