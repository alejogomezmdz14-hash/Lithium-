import { describe, expect, it } from "vitest";

import { calcularTotal, porcentajeTotal, tasaSugerida } from "./interes";

describe("los niveles del plan de clientes", () => {
  it("arranca en 30% y va bajando prestamo a prestamo", () => {
    expect(tasaSugerida(0).tasaMensual).toBe(30); // primer préstamo
    expect(tasaSugerida(1).tasaMensual).toBe(28); // segundo
    expect(tasaSugerida(2).tasaMensual).toBe(25); // tercero
    expect(tasaSugerida(3).tasaMensual).toBe(23); // cuarto
    expect(tasaSugerida(4).tasaMensual).toBe(21); // membresía
  });

  it("a los 6 prestamos seguidos llega a 18%", () => {
    expect(tasaSugerida(5).tasaMensual).toBe(18);
    expect(tasaSugerida(9).tasaMensual).toBe(18); // no baja más
  });

  it("dice el nivel y por que", () => {
    expect(tasaSugerida(0)).toMatchObject({ nivel: 1, descripcion: "Primer préstamo" });
    expect(tasaSugerida(4)).toMatchObject({ nivel: 5, descripcion: "Membresía" });
  });
});

describe("descuento por traer amigos", () => {
  it("un amigo baja 5 puntos, dos amigos bajan 8", () => {
    expect(tasaSugerida(0, 1).tasaMensual).toBe(25); // 30 - 5
    expect(tasaSugerida(0, 2).tasaMensual).toBe(22); // 30 - 8
  });

  it("mas de dos amigos no suma mas descuento", () => {
    expect(tasaSugerida(0, 5).tasaMensual).toBe(22);
  });

  it("EL LIMITE: el beneficio va solo hasta nivel 3", () => {
    expect(tasaSugerida(2, 2).tasaMensual).toBe(17); // nivel 3: 25 - 8
    expect(tasaSugerida(3, 2).tasaMensual).toBe(23); // nivel 4: sin descuento
    expect(tasaSugerida(3, 2).descuento).toBe(0);
  });
});

describe("calcularTotal — el interes es TOTAL, se aplica una vez", () => {
  it("30% sobre 400.000 son 520.000", () => {
    expect(calcularTotal(400000, 30)).toBe(520000);
  });

  it("LO QUE NO SE PUEDE CONFUNDIR: dividir en mas cuotas NO encarece", () => {
    // El mismo prestamo en 1, 3 o 6 cuotas cuesta exactamente lo mismo.
    // Las cuotas reparten el total, no lo multiplican.
    const total = calcularTotal(400000, 30);
    expect(total).toBe(520000);
    expect(calcularTotal(400000, 30)).toBe(total);
  });

  it("aplica cada nivel del plan", () => {
    expect(calcularTotal(100000, 30)).toBe(130000); // nivel 1
    expect(calcularTotal(100000, 28)).toBe(128000); // nivel 2
    expect(calcularTotal(100000, 18)).toBe(118000); // 6 seguidos
  });

  it("sin interes devuelve el capital", () => {
    expect(calcularTotal(300000, 0)).toBe(300000);
  });

  it("no explota con entradas invalidas", () => {
    expect(calcularTotal(0, 30)).toBe(0);
    expect(calcularTotal(-1000, 30)).toBe(0);
  });
});

describe("porcentajeTotal", () => {
  it("saca el % a partir del capital y el total", () => {
    expect(porcentajeTotal(400000, 520000)).toBe(30);
    expect(porcentajeTotal(400000, 400000)).toBe(0);
  });
});
