import { describe, expect, it } from "vitest";

import {
  agruparPorPagar,
  bucketDe,
  lineaMeta,
  type CuotaPorPagar,
  type Semaforo,
} from "./por-pagar";

const HOY = "2026-07-30";

let n = 0;
function cuota(over: Partial<CuotaPorPagar> = {}): CuotaPorPagar {
  n++;
  return {
    id: `cuota-${n}`,
    numero: 1,
    monto: 10000,
    fecha_cobro: HOY,
    credito_id: `credito-${n}`,
    cantidad_cuotas: 6,
    cliente_id: `cliente-${n}`,
    cliente_nombre: `Persona ${n}`,
    cliente_semaforo: "verde" as Semaforo,
    cliente_notas: null,
    ...over,
  };
}

describe("bucketDe", () => {
  it("separa los tres grupos de la pantalla", () => {
    expect(bucketDe("2026-07-30", HOY)).toBe("hoy");
    expect(bucketDe("2026-07-29", HOY)).toBe("vencidos");
    expect(bucketDe("2026-08-02", HOY)).toBe("esta_semana");
  });

  it("el limite de esta semana son 7 dias exactos", () => {
    expect(bucketDe("2026-08-06", HOY)).toBe("esta_semana"); // +7
    expect(bucketDe("2026-08-07", HOY)).toBeNull(); // +8 -> mas adelante
  });

  it("a los 14 dias todavia es vencido; a los 15 es mora vieja", () => {
    expect(bucketDe("2026-07-16", HOY)).toBe("vencidos"); // -14
    expect(bucketDe("2026-07-15", HOY)).toBe("mora_vieja"); // -15
  });

  it("lo de mas adelante no entra en esta pantalla", () => {
    expect(bucketDe("2026-12-01", HOY)).toBeNull();
  });
});

describe("agruparPorPagar", () => {
  it("no renderiza grupos vacios", () => {
    const grupos = agruparPorPagar([cuota({ fecha_cobro: HOY })], HOY);
    expect(grupos.map((g) => g.bucket)).toEqual(["hoy"]);
  });

  it("junta las cuotas de la MISMA persona en una sola fila", () => {
    const cuotas = [
      cuota({ cliente_id: "marta", cliente_nombre: "Marta", numero: 3, monto: 45000, fecha_cobro: "2026-07-25" }),
      cuota({ cliente_id: "marta", cliente_nombre: "Marta", numero: 4, monto: 45000, fecha_cobro: "2026-07-28" }),
    ];
    const [vencidos] = agruparPorPagar(cuotas, HOY);
    expect(vencidos.personas).toHaveLength(1);
    expect(vencidos.personas[0].total).toBe(90000);
    expect(vencidos.personas[0].cuotas).toHaveLength(2);
    expect(vencidos.cantidadPersonas).toBe(1);
  });

  it("la misma persona en grupos distintos son filas distintas", () => {
    const cuotas = [
      cuota({ cliente_id: "marta", cliente_nombre: "Marta", fecha_cobro: "2026-07-25" }),
      cuota({ cliente_id: "marta", cliente_nombre: "Marta", fecha_cobro: HOY }),
    ];
    const grupos = agruparPorPagar(cuotas, HOY);
    expect(grupos.map((g) => g.bucket)).toEqual(["vencidos", "hoy"]);
  });

  it("toma el atraso MAYOR de la persona, no el de la primera cuota", () => {
    const cuotas = [
      cuota({ cliente_id: "m", cliente_nombre: "M", fecha_cobro: "2026-07-28" }), // 2 dias
      cuota({ cliente_id: "m", cliente_nombre: "M", fecha_cobro: "2026-07-20" }), // 10 dias
    ];
    const [g] = agruparPorPagar(cuotas, HOY);
    expect(g.personas[0].diasDeAtraso).toBe(10);
  });

  it("en vencidos ordena por mas reciente primero: lo recuperable arriba", () => {
    const cuotas = [
      cuota({ cliente_id: "vieja", cliente_nombre: "Vieja", fecha_cobro: "2026-07-18" }), // 12 dias
      cuota({ cliente_id: "nueva", cliente_nombre: "Nueva", fecha_cobro: "2026-07-29" }), // 1 dia
    ];
    const [g] = agruparPorPagar(cuotas, HOY);
    expect(g.personas.map((p) => p.nombre)).toEqual(["Nueva", "Vieja"]);
  });

  it("a igual atraso, peor semaforo primero", () => {
    const cuotas = [
      cuota({ cliente_id: "a", cliente_nombre: "Confiable", fecha_cobro: "2026-07-28", cliente_semaforo: "verde" }),
      cuota({ cliente_id: "b", cliente_nombre: "Malo", fecha_cobro: "2026-07-28", cliente_semaforo: "rojo" }),
      cuota({ cliente_id: "c", cliente_nombre: "Ojito", fecha_cobro: "2026-07-28", cliente_semaforo: "naranja" }),
    ];
    const [g] = agruparPorPagar(cuotas, HOY);
    expect(g.personas.map((p) => p.nombre)).toEqual(["Malo", "Ojito", "Confiable"]);
  });

  it("mora vieja va aparte y arranca colapsada", () => {
    const cuotas = [
      cuota({ cliente_id: "a", fecha_cobro: "2026-07-01" }), // 29 dias
      cuota({ cliente_id: "b", fecha_cobro: "2026-07-29" }), // 1 dia
    ];
    const grupos = agruparPorPagar(cuotas, HOY);
    expect(grupos.map((g) => g.bucket)).toEqual(["vencidos", "mora_vieja"]);
    expect(grupos.find((g) => g.bucket === "mora_vieja")!.colapsadoPorDefecto).toBe(true);
    expect(grupos.find((g) => g.bucket === "vencidos")!.colapsadoPorDefecto).toBe(false);
  });

  it("mora vieja va DESPUES de hoy y esta semana, no arriba", () => {
    const cuotas = [
      cuota({ cliente_id: "a", fecha_cobro: "2026-07-01" }),
      cuota({ cliente_id: "b", fecha_cobro: HOY }),
      cuota({ cliente_id: "c", fecha_cobro: "2026-08-02" }),
    ];
    expect(agruparPorPagar(cuotas, HOY).map((g) => g.bucket)).toEqual([
      "hoy",
      "esta_semana",
      "mora_vieja",
    ]);
  });

  it("el subtotal del grupo suma todas las personas", () => {
    const cuotas = [
      cuota({ cliente_id: "a", monto: 45000, fecha_cobro: "2026-07-25" }),
      cuota({ cliente_id: "b", monto: 120000, fecha_cobro: "2026-07-27" }),
    ];
    const [g] = agruparPorPagar(cuotas, HOY);
    expect(g.total).toBe(165000);
    expect(g.cantidadPersonas).toBe(2);
  });

  it("sin nada por cobrar devuelve lista vacia", () => {
    expect(agruparPorPagar([], HOY)).toEqual([]);
    expect(agruparPorPagar([cuota({ fecha_cobro: "2026-12-01" })], HOY)).toEqual([]);
  });
});

describe("lineaMeta", () => {
  const meta = (over: Partial<CuotaPorPagar>) =>
    lineaMeta(agruparPorPagar([cuota(over)], HOY)[0].personas[0], HOY);

  it("no dice 'cuota' cuando el prestamo es de un solo pago", () => {
    expect(meta({ cantidad_cuotas: 1, fecha_cobro: HOY })).toBe("vence hoy");
  });

  it("dice cuantas cuotas cuando hay plan", () => {
    expect(meta({ cantidad_cuotas: 6, fecha_cobro: HOY })).toBe("1 cuota · vence hoy");
  });

  it("muestra los dias de atraso", () => {
    expect(meta({ cantidad_cuotas: 1, fecha_cobro: "2026-07-18" })).toBe("12 días de atraso");
    expect(meta({ cantidad_cuotas: 1, fecha_cobro: "2026-07-29" })).toBe("1 día de atraso");
  });

  it("usa fechas relativas para lo que viene", () => {
    expect(meta({ cantidad_cuotas: 1, fecha_cobro: "2026-07-31" })).toBe("vence mañana");
    expect(meta({ cantidad_cuotas: 1, fecha_cobro: "2026-08-02" })).toBe("vence en 3 días");
  });

  it("suma la palabra del semaforo solo cuando NO es Confiable", () => {
    expect(meta({ cantidad_cuotas: 1, fecha_cobro: HOY, cliente_semaforo: "verde" })).toBe("vence hoy");
    expect(meta({ cantidad_cuotas: 1, fecha_cobro: HOY, cliente_semaforo: "naranja" })).toBe("vence hoy · Ojo");
    expect(meta({ cantidad_cuotas: 1, fecha_cobro: HOY, cliente_semaforo: "rojo" })).toBe("vence hoy · Mal pagador");
    expect(meta({ cantidad_cuotas: 1, fecha_cobro: HOY, cliente_semaforo: "nuevo" })).toBe("vence hoy · Nuevo");
  });

  it("NO repite el semaforo en vencidos: ahi siempre seria 'Mal pagador'", () => {
    // Tener una cuota vencida e impaga ES la definicion de rojo (§3), asi que
    // en este grupo la palabra no informa nada.
    const fila = agruparPorPagar(
      [cuota({ cantidad_cuotas: 1, fecha_cobro: "2026-07-18", cliente_semaforo: "rojo" })],
      HOY,
    )[0].personas[0];
    expect(lineaMeta(fila, HOY, "vencidos")).toBe("12 días de atraso");
    expect(lineaMeta(fila, HOY, "mora_vieja")).toBe("12 días de atraso");
  });
});
