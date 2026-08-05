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
  cliente_semaforo: "verde",
  credito_id: "c1",
  ...o,
});

describe("capital vs interes de lo que falta cobrar", () => {
  it("separa cuanto es TU plata volviendo y cuanto es ganancia", () => {
    // Presta 400.000, le devuelven 520.000 en 2 cuotas de 260.000.
    // De cada cuota, 400/520 = 76,9% es capital.
    const r = calcularResumen(
      [credito({ id: "c1", monto: 400000, monto_total: 520000, con_interes: true })],
      [
        cuota({ credito_id: "c1", monto: 260000 }),
        cuota({ credito_id: "c1", monto: 260000 }),
      ],
      HOY,
    );
    expect(r.meDeben).toBe(520000);
    expect(r.capitalEnLaCalle).toBe(400000);
    expect(r.interesPorCobrar).toBe(120000);
  });

  it("si ya cobro una cuota, baja proporcionalmente de los dos", () => {
    const r = calcularResumen(
      [credito({ id: "c1", monto: 400000, monto_total: 520000, con_interes: true })],
      [cuota({ credito_id: "c1", monto: 260000 })],
      HOY,
    );
    expect(r.capitalEnLaCalle).toBe(200000);
    expect(r.interesPorCobrar).toBe(60000);
  });

  it("sin interes, todo lo que falta es capital", () => {
    const r = calcularResumen(
      [credito({ id: "c1", monto: 120000, monto_total: 120000, con_interes: false })],
      [cuota({ credito_id: "c1", monto: 120000 })],
      HOY,
    );
    expect(r.capitalEnLaCalle).toBe(120000);
    expect(r.interesPorCobrar).toBe(0);
  });

  it("capital + interes siempre da lo que le deben", () => {
    const r = calcularResumen(
      [
        credito({ id: "c1", monto: 400000, monto_total: 520000, con_interes: true }),
        credito({ id: "c2", monto: 300000, monto_total: 300000, con_interes: false }),
      ],
      [
        cuota({ credito_id: "c1", monto: 520000, cliente_id: "a" }),
        cuota({ credito_id: "c2", monto: 300000, cliente_id: "b" }),
      ],
      HOY,
    );
    expect(r.capitalEnLaCalle + r.interesPorCobrar).toBe(r.meDeben);
  });
});

describe("cuenta de personas", () => {
  it("cuenta personas distintas que deben, no cuotas", () => {
    const r = calcularResumen(
      [],
      [
        cuota({ cliente_id: "a" }),
        cuota({ cliente_id: "a" }),
        cuota({ cliente_id: "b" }),
      ],
      HOY,
    );
    expect(r.personasQueDeben).toBe(2);
  });

  it("cuenta a cuanta gente le presto este mes", () => {
    const r = calcularResumen(
      [
        credito({ id: "c1", fecha_otorgado: HOY }),
        credito({ id: "c2", fecha_otorgado: HOY }),
        credito({ id: "c3", fecha_otorgado: "2026-06-01" }), // otro mes
      ],
      [],
      HOY,
      new Map([
        ["c1", "ana"],
        ["c2", "ana"], // dos prestamos a la misma persona = 1 persona
        ["c3", "beto"],
      ]),
    );
    expect(r.prestadoEsteMes.personas).toBe(1);
  });
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
    expect(r.quienMeDebe.map((d) => [d.nombre, d.monto])).toEqual([
      ["Beto", 90000],
      ["Ana", 60000],
    ]);
  });

  it("trae el semaforo y cuenta cuantas cuotas vencidas tiene cada uno", () => {
    const r = calcularResumen(
      [],
      [
        cuota({ cliente_id: "m", cliente_nombre: "Marta", cliente_semaforo: "rojo", fecha_cobro: "2026-07-20" }),
        cuota({ cliente_id: "m", cliente_nombre: "Marta", cliente_semaforo: "rojo", fecha_cobro: "2026-07-25" }),
        cuota({ cliente_id: "m", cliente_nombre: "Marta", cliente_semaforo: "rojo", fecha_cobro: "2026-09-01" }),
      ],
      HOY,
    );
    expect(r.quienMeDebe[0].semaforo).toBe("rojo");
    expect(r.quienMeDebe[0].cuotasVencidas).toBe(2);
  });

  it("quien debe pero esta al dia tiene cero vencidas", () => {
    const r = calcularResumen([], [cuota({ fecha_cobro: "2026-09-01" })], HOY);
    expect(r.quienMeDebe[0].cuotasVencidas).toBe(0);
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
