import { describe, expect, it } from "vitest";
import { formatARS, parseARS, repartirMonto } from "./money";

describe("formatARS", () => {
  it("usa punto de miles y no mete espacio despues del $", () => {
    expect(formatARS(45000)).toBe("$45.000");
    expect(formatARS(1511)).toBe("$1.511");
    expect(formatARS(2400000)).toBe("$2.400.000");
  });

  it("no muestra centavos en ningun lado", () => {
    expect(formatARS(45000.37)).toBe("$45.000");
    expect(formatARS(45000.99)).toBe("$45.001");
  });

  it("pone el signo antes del $", () => {
    expect(formatARS(-45000)).toBe("-$45.000");
  });

  it("no explota con basura", () => {
    expect(formatARS(0)).toBe("$0");
    expect(formatARS(NaN)).toBe("$0");
    expect(formatARS(Infinity)).toBe("$0");
  });
});

describe("parseARS", () => {
  it("EL bug caro: el punto es separador de miles, no decimal", () => {
    expect(parseARS("86.666")).toBe(86666);
    expect(parseARS("1.234.567")).toBe(1234567);
    expect(parseARS("133.000")).toBe(133000);
  });

  it("acepta lo que la propia app formatea, incluido NBSP", () => {
    expect(parseARS("$45.000")).toBe(45000);
    expect(parseARS("$ 45.000")).toBe(45000);
    expect(parseARS("$ 45.000")).toBe(45000); // NBSP
    expect(parseARS("$ 45.000")).toBe(45000); // narrow NBSP
    expect(parseARS("  45000  ")).toBe(45000);
  });

  it("la coma es decimal", () => {
    expect(parseARS("45.000,50")).toBe(45000.5);
    expect(parseARS("0,5")).toBe(0.5);
  });

  it("es ida y vuelta con formatARS", () => {
    for (const n of [0, 1511, 45000, 133000, 2400000]) {
      expect(parseARS(formatARS(n))).toBe(n);
    }
  });

  it("devuelve null en vez de adivinar", () => {
    expect(parseARS("")).toBeNull();
    expect(parseARS("   ")).toBeNull();
    expect(parseARS("abc")).toBeNull();
    expect(parseARS("45.000,50,20")).toBeNull();
    expect(parseARS("-")).toBeNull();
    expect(parseARS("12abc")).toBeNull();
  });

  it("maneja negativos", () => {
    expect(parseARS("-45.000")).toBe(-45000);
  });
});

describe("repartirMonto", () => {
  it("da los numeros del ejemplo de CLAUDE.md", () => {
    expect(repartirMonto(400000, 3)).toEqual([133000, 133000, 134000]);
    expect(repartirMonto(520000, 6)).toEqual([87000, 87000, 87000, 87000, 87000, 85000]);
  });

  it("un solo pago devuelve el total entero", () => {
    expect(repartirMonto(45000, 1)).toEqual([45000]);
  });

  it("INVARIANTE: la suma es siempre exactamente el total", () => {
    for (let total = 1000; total <= 3_000_000; total += 7919) {
      for (const n of [1, 2, 3, 4, 6, 12, 18, 24]) {
        const cuotas = repartirMonto(total, n);
        const suma = cuotas.reduce((a, b) => a + b, 0);
        expect(suma, `total=${total} n=${n}`).toBe(total);
        expect(cuotas, `total=${total} n=${n}`).toHaveLength(n);
        expect(cuotas.every((c) => c > 0), `total=${total} n=${n}`).toBe(true);
      }
    }
  });

  it("cae a redondeo al peso cuando redondear a los mil no entra", () => {
    // 5000 en 9: base a los mil daria 1000 y la ultima quedaria negativa.
    const cuotas = repartirMonto(5000, 9);
    expect(cuotas.reduce((a, b) => a + b, 0)).toBe(5000);
    expect(cuotas.every((c) => c > 0)).toBe(true);
  });

  it("rechaza entradas invalidas en vez de devolver algo raro", () => {
    expect(() => repartirMonto(400000, 0)).toThrow();
    expect(() => repartirMonto(400000, -3)).toThrow();
    expect(() => repartirMonto(400000, 2.5)).toThrow();
    expect(() => repartirMonto(0, 3)).toThrow();
    expect(() => repartirMonto(-1000, 3)).toThrow();
  });
});
