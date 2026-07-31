import { describe, expect, it } from "vitest";
import {
  diasEntre,
  estadoCuotaUI,
  fechaConDia,
  hoyEnBA,
  inicioDeMes,
  laQueSigue,
  sumarDias,
} from "./fecha";

describe("hoyEnBA", () => {
  it("EL bug del huso: a las 23:00 de Argentina en UTC ya es manana", () => {
    // 2026-07-31T02:00:00Z son las 23:00 del 30/7 en Argentina (UTC-3).
    const instante = new Date("2026-07-31T02:00:00Z");
    expect(instante.toISOString().slice(0, 10)).toBe("2026-07-31"); // lo que diria UTC
    expect(hoyEnBA(instante)).toBe("2026-07-30"); // lo que dice Argentina
  });

  it("devuelve YYYY-MM-DD", () => {
    expect(hoyEnBA(new Date("2026-07-30T15:00:00Z"))).toBe("2026-07-30");
    expect(hoyEnBA(new Date("2026-01-05T15:00:00Z"))).toBe("2026-01-05");
  });

  it("al mediodia de Argentina coincide con UTC", () => {
    const mediodia = new Date("2026-07-30T15:00:00Z"); // 12:00 ART
    expect(hoyEnBA(mediodia)).toBe(mediodia.toISOString().slice(0, 10));
  });
});

describe("fechaConDia", () => {
  it("usa BARRA, no guion: el ICU con weekday+day+month devuelve '3-8'", () => {
    expect(fechaConDia("2026-08-03")).toBe("lunes 3/8");
    expect(fechaConDia("2026-08-12")).toBe("miércoles 12/8");
  });

  it("no rellena con ceros: '3/8', no '03/08'", () => {
    expect(fechaConDia("2026-01-05")).toBe("lunes 5/1");
  });

  it("no corre un dia por huso horario", () => {
    expect(fechaConDia("2026-12-31")).toContain("31/12");
  });
});

describe("inicioDeMes / sumarDias", () => {
  it("inicioDeMes recorta al primero", () => {
    expect(inicioDeMes("2026-07-31")).toBe("2026-07-01");
    expect(inicioDeMes("2026-01-01")).toBe("2026-01-01");
  });

  it("sumarDias cruza meses y anios", () => {
    expect(sumarDias("2026-07-31", 7)).toBe("2026-08-07");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("diasEntre", () => {
  it("cuenta dias calendario", () => {
    expect(diasEntre("2026-07-30", "2026-08-02")).toBe(3);
    expect(diasEntre("2026-08-02", "2026-07-30")).toBe(-3);
    expect(diasEntre("2026-07-30", "2026-07-30")).toBe(0);
  });

  it("cruza fin de mes y fin de anio", () => {
    expect(diasEntre("2026-01-31", "2026-02-01")).toBe(1);
    expect(diasEntre("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("estadoCuotaUI", () => {
  const hoy = "2026-07-30";

  it("impaga y vencida es con_atraso", () => {
    expect(estadoCuotaUI({ fecha_cobro: "2026-07-18", pagado_el: null }, hoy)).toBe("con_atraso");
  });

  it("la que vence HOY todavia no esta atrasada", () => {
    expect(estadoCuotaUI({ fecha_cobro: hoy, pagado_el: null }, hoy)).toBe("pendiente");
  });

  it("impaga futura es pendiente", () => {
    expect(estadoCuotaUI({ fecha_cobro: "2026-08-10", pagado_el: null }, hoy)).toBe("pendiente");
  });

  it("pagada el mismo dia del vencimiento es a tiempo, no tarde", () => {
    expect(
      estadoCuotaUI({ fecha_cobro: "2026-07-10", pagado_el: "2026-07-10" }, hoy),
    ).toBe("cobrada_a_tiempo");
  });

  it("pagada despues del vencimiento es tarde, y eso mueve el semaforo", () => {
    expect(
      estadoCuotaUI({ fecha_cobro: "2026-07-10", pagado_el: "2026-07-16" }, hoy),
    ).toBe("cobrada_tarde");
  });

  it("una cuota pagada nunca se muestra atrasada aunque vencio hace meses", () => {
    expect(
      estadoCuotaUI({ fecha_cobro: "2026-01-10", pagado_el: "2026-01-09" }, hoy),
    ).toBe("cobrada_a_tiempo");
  });
});

describe("laQueSigue", () => {
  it("levanta la impaga de menor numero, no la primera del array", () => {
    const cuotas = [
      { numero: 1, pagado_el: "2026-04-10" },
      { numero: 3, pagado_el: null },
      { numero: 2, pagado_el: null },
      { numero: 4, pagado_el: null },
    ];
    expect(laQueSigue(cuotas)?.numero).toBe(2);
  });

  it("con todas cobradas devuelve null", () => {
    expect(laQueSigue([{ numero: 1, pagado_el: "2026-04-10" }])).toBeNull();
    expect(laQueSigue([])).toBeNull();
  });

  it("si hay tres vencidas levanta la mas vieja", () => {
    const cuotas = [
      { numero: 5, pagado_el: null },
      { numero: 3, pagado_el: null },
      { numero: 4, pagado_el: null },
    ];
    expect(laQueSigue(cuotas)?.numero).toBe(3);
  });
});
