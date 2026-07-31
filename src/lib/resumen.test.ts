import { describe, expect, it } from "vitest";

import { calcularResumen, type CreditoResumen, type CuotaResumen } from "./resumen";

const HOY = "2026-07-31";

const credito = (o: Partial<CreditoResumen> = {}): CreditoResumen => ({
  id: "c1",
  monto: 100000,
  monto_total: 100000,
  con_interes: false,
  fecha_otorgado: HOY,
  ...o,
});

const cuota = (o: Partial<CuotaResumen> = {}): CuotaResumen => ({
  monto: 10000,
  fecha_cobro: HOY,
  cliente_id: "a",
  cliente_nombre: "A",
  ...o,
});

describe("prestado este mes", () => {
  it("separa con interes de sin interes", () => {
    const r = calcularResumen(
      [
        credito({ monto: 300000, monto_total: 390000, con_interes: true }),
        credito({ monto: 120000, monto_total: 120000, con_interes: false }),
      ],
      [],
      HOY,
    );
    expect(r.prestadoEsteMes.conInteres).toBe(300000);
    expect(r.prestadoEsteMes.sinInteres).toBe(120000);
    expect(r.prestadoEsteMes.total).toBe(420000);
  });

  it("el interes es la diferencia entre lo que sale y lo que vuelve", () => {
    const r = calcularResumen(
      [credito({ monto: 300000, monto_total: 390000, con_interes: true })],
      [],
      HOY,
    );
    expect(r.interesEsteMes).toBe(90000);
  });

  it("deja afuera los prestamos de meses anteriores", () => {
    const r = calcularResumen(
      [
        credito({ monto: 500000, fecha_otorgado: "2026-06-30" }),
        credito({ monto: 100000, fecha_otorgado: "2026-07-01" }),
      ],
      [],
      HOY,
    );
    expect(r.prestadoEsteMes.total).toBe(100000);
  });

  it("cuenta el primer dia del mes y el dia de hoy", () => {
    const r = calcularResumen(
      [
        credito({ monto: 1000, fecha_otorgado: "2026-07-01" }),
        credito({ monto: 2000, fecha_otorgado: HOY }),
      ],
      [],
      HOY,
    );
    expect(r.prestadoEsteMes.total).toBe(3000);
  });

  it("ignora prestamos con fecha futura", () => {
    const r = calcularResumen([credito({ monto: 9999, fecha_otorgado: "2026-08-05" })], [], HOY);
    expect(r.prestadoEsteMes.total).toBe(0);
  });
});

describe("deuda", () => {
  it("me deben suma TODO lo impago, venza cuando venza", () => {
    const r = calcularResumen(
      [],
      [
        cuota({ monto: 50000, fecha_cobro: "2026-07-01" }),
        cuota({ monto: 30000, fecha_cobro: "2026-12-01" }),
      ],
      HOY,
    );
    expect(r.meDeben).toBe(80000);
  });

  it("vencido cuenta PERSONAS, no cuotas", () => {
    const r = calcularResumen(
      [],
      [
        cuota({ monto: 10000, fecha_cobro: "2026-07-20", cliente_id: "marta" }),
        cuota({ monto: 20000, fecha_cobro: "2026-07-25", cliente_id: "marta" }),
        cuota({ monto: 30000, fecha_cobro: "2026-07-28", cliente_id: "jorge" }),
      ],
      HOY,
    );
    expect(r.vencido.monto).toBe(60000);
    expect(r.vencido.cuotas).toBe(3);
    expect(r.vencido.personas).toBe(2);
  });

  it("la que vence hoy NO esta vencida todavia", () => {
    const r = calcularResumen([], [cuota({ fecha_cobro: HOY })], HOY);
    expect(r.vencido.monto).toBe(0);
    expect(r.cobroEstaSemana).toBe(10000);
  });

  it("cobro esta semana toma hoy y los 7 dias siguientes", () => {
    const r = calcularResumen(
      [],
      [
        cuota({ monto: 1, fecha_cobro: HOY }),
        cuota({ monto: 10, fecha_cobro: "2026-08-07" }), // +7
        cuota({ monto: 100, fecha_cobro: "2026-08-08" }), // +8, afuera
        cuota({ monto: 1000, fecha_cobro: "2026-07-30" }), // vencida, afuera
      ],
      HOY,
    );
    expect(r.cobroEstaSemana).toBe(11);
  });
});

describe("quien me debe", () => {
  it("agrupa por persona y ordena por deuda descendente", () => {
    const r = calcularResumen(
      [],
      [
        cuota({ monto: 10000, cliente_id: "a", cliente_nombre: "Ana" }),
        cuota({ monto: 90000, cliente_id: "b", cliente_nombre: "Beto" }),
        cuota({ monto: 50000, cliente_id: "a", cliente_nombre: "Ana" }),
      ],
      HOY,
    );
    expect(r.quienMeDebe).toEqual([
      { cliente_id: "a", nombre: "Ana", monto: 60000 },
      { cliente_id: "b", nombre: "Beto", monto: 90000 },
    ].sort((x, y) => y.monto - x.monto));
    expect(r.quienMeDebe[0].nombre).toBe("Beto");
  });

  it("devuelve la lista COMPLETA, no un top 5", () => {
    const cuotas = Array.from({ length: 9 }, (_, i) =>
      cuota({ monto: (i + 1) * 1000, cliente_id: `c${i}`, cliente_nombre: `C${i}` }),
    );
    expect(calcularResumen([], cuotas, HOY).quienMeDebe).toHaveLength(9);
  });
});

describe("sin datos", () => {
  it("no explota con la cartera vacia", () => {
    const r = calcularResumen([], [], HOY);
    expect(r.meDeben).toBe(0);
    expect(r.prestadoEsteMes.total).toBe(0);
    expect(r.vencido.personas).toBe(0);
    expect(r.quienMeDebe).toEqual([]);
  });
});
