import { describe, expect, it } from "vitest";

import {
  lineaMeta,
  type Bucket,
  type CuotaPorPagar,
  type FilaPersona,
  type Semaforo,
} from "./por-pagar";

/**
 * La línea de meta de una fila nunca pasa de **tres segmentos**.
 *
 * Es la línea que Candela lee marcando un teléfono: `2 cuotas · 12 días de
 * atraso · Ojo`. Ya arrastra cuántas cuotas, el estado temporal y el semáforo, y
 * la tentación de agregarle un cuarto dato —el tipo de cliente, el préstamo, los
 * papeles— aparece cada vez que se toca la pantalla. Tres es lo que se lee de un
 * vistazo; cuatro es una oración.
 *
 * Este test falla en el cuarto. No hay forma de agregarlo sin borrar otro.
 */

const SEMAFOROS: Semaforo[] = ["verde", "naranja", "rojo", "nuevo"];
const BUCKETS: (Bucket | undefined)[] = [undefined, "vencidos", "hoy", "esta_semana", "mora_vieja"];

function cuota(fecha: string, cantidad_cuotas: number, i = 1): CuotaPorPagar {
  return {
    id: `c${i}`,
    numero: i,
    monto: 45000,
    fecha_cobro: fecha,
    credito_id: "cr1",
    cantidad_cuotas,
    cliente_id: "p1",
    cliente_nombre: "Marta Suárez",
    cliente_semaforo: "naranja",
    cliente_notas: null,
  };
}

function fila(cuotas: CuotaPorPagar[], semaforo: Semaforo, diasDeAtraso: number): FilaPersona {
  return {
    cliente_id: "p1",
    nombre: "Marta Suárez",
    semaforo,
    notas: null,
    cuotas,
    total: cuotas.reduce((s, c) => s + c.monto, 0),
    diasDeAtraso,
  };
}

describe("lineaMeta", () => {
  const HOY = "2026-08-07";

  const casos: { que: string; fila: FilaPersona }[] = [];
  for (const semaforo of SEMAFOROS) {
    for (const atraso of [0, 1, 12, 40]) {
      for (const cuotas of [
        [cuota("2026-08-07", 1)],
        [cuota("2026-08-09", 6)],
        [cuota("2026-07-26", 6, 1), cuota("2026-08-09", 6, 2)],
      ]) {
        casos.push({
          que: `${semaforo} · atraso ${atraso} · ${cuotas.length} cuota(s) de ${cuotas[0].cantidad_cuotas}`,
          fila: fila(cuotas, semaforo, atraso),
        });
      }
    }
  }

  it("cubre todas las combinaciones que se pueden dar en pantalla", () => {
    expect(casos.length).toBe(SEMAFOROS.length * 4 * 3);
  });

  for (const bucket of BUCKETS) {
    it(`nunca devuelve más de 3 segmentos (bucket: ${bucket ?? "sin bucket"})`, () => {
      for (const caso of casos) {
        const linea = lineaMeta(caso.fila, HOY, bucket);
        const segmentos = linea.split(" · ");
        expect(
          segmentos.length,
          `${caso.que} → "${linea}" tiene ${segmentos.length} segmentos. Tres se leen de un vistazo; ` +
            `cuatro es una oración. Si hace falta un dato nuevo, hay que sacar otro.`,
        ).toBeLessThanOrEqual(3);
      }
    });

    it(`nunca devuelve una línea vacía (bucket: ${bucket ?? "sin bucket"})`, () => {
      for (const caso of casos) {
        expect(lineaMeta(caso.fila, HOY, bucket).trim()).not.toBe("");
      }
    });
  }

  it("un solo pago no dice 'cuota 1 de 1'", () => {
    // Nadie dice "cuota 1 de 1". Es la app contando cómo guarda los datos.
    const linea = lineaMeta(fila([cuota("2026-08-07", 1)], "verde", 0), HOY, "hoy");
    expect(linea).not.toMatch(/cuota/i);
  });

  it("dentro de vencidos no repite el semáforo", () => {
    // En VENCIDOS todas las filas están vencidas por definición: el semáforo ahí
    // no cambia ninguna decisión y se come uno de los tres segmentos.
    const linea = lineaMeta(fila([cuota("2026-07-26", 6)], "rojo", 12), HOY, "vencidos");
    expect(linea).not.toContain("Mal pagador");
  });
});
