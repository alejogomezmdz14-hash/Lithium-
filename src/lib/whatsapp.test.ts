import { describe, expect, it } from "vitest";

import { mensajePorVencer, mensajeVencido, type AvisoPorPersona } from "./whatsapp";

const aviso = (over: Partial<AvisoPorPersona> = {}): AvisoPorPersona => ({
  cliente_nombre: "Marta Suárez",
  cliente_semaforo: "naranja",
  cuotas: [{ numero: 3, cantidad_cuotas: 6, monto: 45000, fecha_cobro: "2026-08-12" }],
  ...over,
});

describe("mensajePorVencer", () => {
  it("dice quien, cuanto y cuando, todo en una linea", () => {
    const m = mensajePorVencer(aviso());
    expect(m).toContain("Marta Suárez");
    expect(m).toContain("$45.000");
    expect(m).toContain("12/8");
    expect(m).toContain("cuota 3/6");
  });

  it("trae el semaforo con palabra Y emoji", () => {
    expect(mensajePorVencer(aviso())).toContain("Ojo 🟠");
    expect(mensajePorVencer(aviso({ cliente_semaforo: "rojo" }))).toContain("Mal pagador 🔴");
    expect(mensajePorVencer(aviso({ cliente_semaforo: "verde" }))).toContain("Confiable 🟢");
    expect(mensajePorVencer(aviso({ cliente_semaforo: "nuevo" }))).toContain("Nuevo ⚪");
  });

  it("NO dice 'cuota 1 de 1' cuando es pago unico", () => {
    const m = mensajePorVencer(
      aviso({ cuotas: [{ numero: 1, cantidad_cuotas: 1, monto: 12000, fecha_cobro: "2026-08-12" }] }),
    );
    expect(m).not.toContain("cuota 1");
    expect(m).toContain("el cobro");
  });

  it("dos cuotas de la misma persona van en UN solo mensaje, con el total", () => {
    const m = mensajePorVencer(
      aviso({
        cuotas: [
          { numero: 3, cantidad_cuotas: 6, monto: 45000, fecha_cobro: "2026-08-12" },
          { numero: 4, cantidad_cuotas: 6, monto: 45000, fecha_cobro: "2026-08-12" },
        ],
      }),
    );
    expect(m).toContain("$90.000");
    expect(m).toContain("cuota 3/6");
    expect(m).toContain("cuota 4/6");
    // Un solo encabezado, no dos mensajes pegados.
    expect(m.match(/🔔/g)).toHaveLength(1);
  });
});

describe("mensajeVencido", () => {
  it("avisa que ya vencio, con el monto y la fecha", () => {
    const m = mensajeVencido(aviso());
    expect(m).toContain("VENCIÓ");
    expect(m).toContain("Marta Suárez");
    expect(m).toContain("$45.000");
    expect(m).toContain("12/8");
  });

  it("agrupa varias cuotas vencidas de la misma persona", () => {
    const m = mensajeVencido(
      aviso({
        cuotas: [
          { numero: 3, cantidad_cuotas: 6, monto: 45000, fecha_cobro: "2026-07-12" },
          { numero: 4, cantidad_cuotas: 6, monto: 55000, fecha_cobro: "2026-08-12" },
        ],
      }),
    );
    expect(m).toContain("$100.000");
    expect(m.match(/⚠️/g)).toHaveLength(1);
  });

  it("el aviso de vencido NO lleva semaforo: ya sabe que esta mal", () => {
    // En el vencido el dato que importa es la plata y la fecha; el color
    // sobra porque tener una cuota vencida ES la definicion de rojo (§3).
    expect(mensajeVencido(aviso())).not.toContain("🟠");
    expect(mensajeVencido(aviso())).not.toContain("Ojo");
  });
});

describe("formato de fecha", () => {
  it("va sin ceros a la izquierda y sin anio", () => {
    const m = mensajeVencido(
      aviso({ cuotas: [{ numero: 1, cantidad_cuotas: 1, monto: 1000, fecha_cobro: "2026-01-05" }] }),
    );
    expect(m).toContain("5/1");
    expect(m).not.toContain("2026");
  });
});
