import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * **Un solo relleno de marca por pantalla**, verificado por el build.
 *
 * El presupuesto de acento es la regla que sostiene todo el sistema: si el azul
 * aparece en ocho lugares, deja de significar "tocá acá" y la pantalla vuelve a
 * ser un tablero donde hay que buscar. Escrito en prosa en un documento, se
 * rompe en la próxima feature. Escrito acá, falla el build.
 *
 * Se eligió un test estático y no un `<AccionPrimaria>` con contexto de React:
 * ese contexto convertiría cada `Ya me pagó` de las tres tabs en client
 * component —hoy son `<Link>` en salida de server— para un chequeo que solo
 * corre en desarrollo y que además da falso positivo con el doble montaje de
 * StrictMode. Esto hace lo mismo, corre en CI, y no le cuesta un byte al bundle.
 */

const RAIZ = join(process.cwd(), "src");

function archivosTSX(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) return archivosTSX(ruta);
    return e.isFile() && e.name.endsWith(".tsx") ? [ruta] : [];
  });
}

describe("presupuesto de acento", () => {
  const archivos = archivosTSX(RAIZ).filter(
    // boton.tsx es donde vive la definición del peso: ahí el literal aparece
    // por motivos obvios y no cuenta.
    (f) => !f.endsWith(join("components", "boton.tsx")),
  );

  it("encuentra archivos que revisar", () => {
    expect(archivos.length).toBeGreaterThan(10);
  });

  for (const archivo of archivos) {
    const relativo = archivo.slice(process.cwd().length + 1).replace(/\\/g, "/");

    it(`${relativo} usa peso="lleno" a lo sumo una vez`, () => {
      const usos = readFileSync(archivo, "utf8").match(/peso="lleno"/g) ?? [];
      expect(
        usos.length,
        `${relativo} tiene ${usos.length} rellenos de marca. Si hay dos, ninguno es el importante: ` +
          `dejá uno y pasá el resto a peso="fantasma".`,
      ).toBeLessThanOrEqual(1);
    });
  }
});

describe("los materiales solo se escriben en superficie.tsx", () => {
  const MATERIALES = /(?:bg|text|border)-(?:adoquin|piedra|escalon|calle|vidrio|base-alta|base-baja)|panel-heroe/g;

  for (const archivo of archivosTSX(RAIZ)) {
    const relativo = archivo.slice(process.cwd().length + 1).replace(/\\/g, "/");
    // Los primitivos son los dueños del material; el resto los compone.
    const esPrimitivo =
      relativo.endsWith("components/superficie.tsx") ||
      relativo.endsWith("components/campo.tsx") ||
      relativo.endsWith("components/buscador.tsx") ||
      relativo.endsWith("components/rotulo.tsx") ||
      relativo.endsWith("(app)/nav.tsx");

    if (esPrimitivo) continue;

    it(`${relativo} no escribe un material a mano`, () => {
      const usos = readFileSync(archivo, "utf8").match(MATERIALES) ?? [];
      expect(
        [...new Set(usos)],
        `${relativo} escribe materiales directo. Usá <Piedra>, <Losa>, <Fila>, <Escalon> o ` +
          `<FilaLectura> de components/superficie.tsx.`,
      ).toEqual([]);
    });
  }
});

describe("no quedan tokens del sistema viejo", () => {
  const MUERTOS = [
    "bg-card",
    "bg-surface-raised",
    "bg-background",
    "text-foreground",
    "text-muted-foreground",
    "text-muted-subtle",
    "text-danger",
    "bg-primary",
    "text-primary-text",
    "text-primary-foreground",
    "border-border",
    "rounded-xl",
    "rounded-lg",
    "rounded-sm",
    "disabled:opacity",
    "bg-adoquin",
    "bg-piedra",
    "bg-escalon",
    "bg-calle",
    "ease-adoquin",
    "border-marca-linea",
  ];

  for (const archivo of archivosTSX(RAIZ)) {
    const relativo = archivo.slice(process.cwd().length + 1).replace(/\\/g, "/");

    it(`${relativo} no usa clases que ya no compilan`, () => {
      const fuente = readFileSync(archivo, "utf8");
      const encontrados = MUERTOS.filter((m) => fuente.includes(m));
      expect(
        encontrados,
        `${relativo} usa ${encontrados.join(", ")}. Esas clases ya no existen: no fallan el build, ` +
          `se renderizan como nada. Ver la tabla de equivalencias en globals.css.`,
      ).toEqual([]);
    });
  }
});
