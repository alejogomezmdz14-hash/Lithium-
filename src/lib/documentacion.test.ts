import { describe, expect, it } from "vitest";

import {
  evaluarDocumentacion,
  mesesEntre,
  resumenDocumentacion,
  REQUISITOS,
  type DocumentoCargado,
  type TipoDocumento,
} from "./documentacion";

const HOY = "2026-07-31";

let n = 0;
const doc = (tipo: TipoDocumento, periodo: string | null = null): DocumentoCargado => ({
  id: `d${++n}`,
  tipo,
  periodo,
  subido_el: HOY,
});

describe("la matriz de requisitos", () => {
  it("monotributista y comercio piden lo mismo", () => {
    expect(REQUISITOS.comercio).toEqual(REQUISITOS.monotributista);
  });

  it("empleado pide 3 recibos; monotributista 3 facturas", () => {
    expect(REQUISITOS.empleado[0]).toMatchObject({ tipo: "recibo_sueldo", cantidad: 3 });
    expect(REQUISITOS.monotributista[0]).toMatchObject({ tipo: "factura", cantidad: 3 });
  });

  it("pami pide tres papeles distintos, uno de cada uno", () => {
    expect(REQUISITOS.pami.map((r) => r.tipo)).toEqual(["dni_titular", "dni_garante", "pagare"]);
    expect(REQUISITOS.pami.every((r) => r.cantidad === 1)).toBe(true);
  });

  it("los papeles de pami NO llevan periodo: un DNI no vence cada mes", () => {
    expect(REQUISITOS.pami.every((r) => r.pidePeriodo === false)).toBe(true);
    expect(REQUISITOS.empleado[0].pidePeriodo).toBe(true);
  });
});

describe("mesesEntre", () => {
  it("cuenta meses enteros y cruza el año", () => {
    expect(mesesEntre("2026-07-01", "2026-07-31")).toBe(0);
    expect(mesesEntre("2026-05-01", "2026-07-31")).toBe(2);
    expect(mesesEntre("2025-12-01", "2026-07-31")).toBe(7);
  });
});

describe("cliente sin tipo", () => {
  it("no dice que esta completo: dice que falta clasificarlo", () => {
    const e = evaluarDocumentacion(null, [], HOY);
    expect(e.completa).toBe(false);
    expect(e.requisitos).toEqual([]);
    expect(resumenDocumentacion(e, null)).toBe("Falta decir de qué tipo es");
  });
});

describe("empleado", () => {
  it("con los 3 recibos recientes esta al dia", () => {
    const e = evaluarDocumentacion(
      "empleado",
      [
        doc("recibo_sueldo", "2026-05-01"),
        doc("recibo_sueldo", "2026-06-01"),
        doc("recibo_sueldo", "2026-07-01"),
      ],
      HOY,
    );
    expect(e.completa).toBe(true);
    expect(e.faltan).toBe(0);
    expect(e.hayDesactualizados).toBe(false);
    expect(resumenDocumentacion(e, "empleado")).toBe("Papeles al día");
  });

  it("cuenta cuantos faltan", () => {
    const e = evaluarDocumentacion("empleado", [doc("recibo_sueldo", "2026-07-01")], HOY);
    expect(e.faltan).toBe(2);
    expect(e.requisitos[0].cargados).toBe(1);
    expect(resumenDocumentacion(e, "empleado")).toBe("Faltan 2 papeles");
  });

  it("un solo papel faltante se dice en singular", () => {
    const e = evaluarDocumentacion(
      "empleado",
      [doc("recibo_sueldo", "2026-06-01"), doc("recibo_sueldo", "2026-07-01")],
      HOY,
    );
    expect(resumenDocumentacion(e, "empleado")).toBe("Falta 1 papel");
  });

  it("EL CASO CLAVE: tiene los 3 pero son viejos — completo NO es lo mismo que al dia", () => {
    const e = evaluarDocumentacion(
      "empleado",
      [
        doc("recibo_sueldo", "2025-10-01"),
        doc("recibo_sueldo", "2025-11-01"),
        doc("recibo_sueldo", "2025-12-01"),
      ],
      HOY,
    );
    expect(e.completa).toBe(true);
    expect(e.faltan).toBe(0);
    expect(e.hayDesactualizados).toBe(true);
    expect(resumenDocumentacion(e, "empleado")).toBe("Están todos, pero viejos");
  });

  it("justo en el limite de vigencia todavia sirve", () => {
    const enLimite = evaluarDocumentacion(
      "empleado",
      [doc("recibo_sueldo", "2026-04-01"), doc("recibo_sueldo", "2026-03-01"), doc("recibo_sueldo", "2026-02-01")],
      HOY,
    );
    expect(enLimite.hayDesactualizados).toBe(false); // 3 meses exactos

    const pasado = evaluarDocumentacion(
      "empleado",
      [doc("recibo_sueldo", "2026-03-01"), doc("recibo_sueldo", "2026-02-01"), doc("recibo_sueldo", "2026-01-01")],
      HOY,
    );
    expect(pasado.hayDesactualizados).toBe(true); // 4 meses
  });

  it("mira el papel MAS NUEVO, no el mas viejo", () => {
    const e = evaluarDocumentacion(
      "empleado",
      [
        doc("recibo_sueldo", "2024-01-01"),
        doc("recibo_sueldo", "2026-06-01"),
        doc("recibo_sueldo", "2026-07-01"),
      ],
      HOY,
    );
    expect(e.requisitos[0].periodoMasNuevo).toBe("2026-07-01");
    expect(e.hayDesactualizados).toBe(false);
  });

  it("subir de mas no rompe la cuenta", () => {
    const e = evaluarDocumentacion(
      "empleado",
      Array.from({ length: 5 }, (_, i) => doc("recibo_sueldo", `2026-0${i + 3}-01`)),
      HOY,
    );
    expect(e.completa).toBe(true);
    expect(e.faltan).toBe(0);
    expect(e.requisitos[0].cargados).toBe(3);
  });
});

describe("pami", () => {
  it("necesita los tres papeles", () => {
    const e = evaluarDocumentacion("pami", [doc("dni_titular")], HOY);
    expect(e.faltan).toBe(2);
    expect(e.requisitos.filter((r) => r.cumplido).map((r) => r.requisito.tipo)).toEqual([
      "dni_titular",
    ]);
  });

  it("completo con los tres, y nunca queda desactualizado porque no llevan periodo", () => {
    const e = evaluarDocumentacion(
      "pami",
      [doc("dni_titular"), doc("dni_garante"), doc("pagare")],
      HOY,
    );
    expect(e.completa).toBe(true);
    expect(e.hayDesactualizados).toBe(false);
  });
});

describe("cambio de tipo de cliente", () => {
  it("los papeles del tipo anterior NO se pierden: quedan como sobrantes", () => {
    // Era empleado, ahora es PAMI. Los recibos ya no aplican pero siguen ahí.
    const e = evaluarDocumentacion(
      "pami",
      [doc("recibo_sueldo", "2026-06-01"), doc("recibo_sueldo", "2026-07-01"), doc("dni_titular")],
      HOY,
    );
    expect(e.sobrantes).toHaveLength(2);
    expect(e.sobrantes.every((d) => d.tipo === "recibo_sueldo")).toBe(true);
    expect(e.faltan).toBe(2); // le faltan dni_garante y pagare
  });

  it("un monotributista que pasa a comercio conserva todo, porque piden lo mismo", () => {
    const facturas = [doc("factura", "2026-05-01"), doc("factura", "2026-06-01"), doc("factura", "2026-07-01")];
    const comoMono = evaluarDocumentacion("monotributista", facturas, HOY);
    const comoComercio = evaluarDocumentacion("comercio", facturas, HOY);
    expect(comoComercio.completa).toBe(comoMono.completa);
    expect(comoComercio.sobrantes).toHaveLength(0);
  });
});
