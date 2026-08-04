import { describe, expect, it } from "vitest";

import { buscar, coincide, normalizar } from "./buscar";

describe("normalizar", () => {
  it("saca las tildes", () => {
    expect(normalizar("Suárez")).toBe("suarez");
    expect(normalizar("Lucía Fernández")).toBe("lucia fernandez");
    expect(normalizar("PÉREZ")).toBe("perez");
  });

  it("la enie tambien se pliega a n, y eso es DESEADO en un buscador", () => {
    // Tipeando "munoz" o "muñoz" se encuentra igual a la persona. En una lista
    // de clientes chica no genera confusion, y evita el caso de no encontrar a
    // alguien por no haber puesto la enie con el teclado del celular.
    expect(normalizar("Muñoz")).toBe("munoz");
    expect(coincide("Ramón Muñoz", "munoz")).toBe(true);
    expect(coincide("Ramón Muñoz", "muñoz")).toBe(true);
    expect(coincide("Ramón Muñoz", "ramon")).toBe(true);
  });
});

describe("coincide", () => {
  it("EL CASO: se busca sin tildes", () => {
    expect(coincide("Marta Suárez", "suarez")).toBe(true);
    expect(coincide("Lucía Fernández", "lucia")).toBe(true);
    expect(coincide("Juan Pérez", "perez")).toBe(true);
  });

  it("encuentra por prefijo del apellido, no solo del nombre", () => {
    expect(coincide("Ana Marín", "mar")).toBe(true);
    expect(coincide("Marta Suárez", "mar")).toBe(true);
  });

  it("NO busca en el medio de una palabra: traeria ruido", () => {
    expect(coincide("Marta Suárez", "arta")).toBe(false);
    expect(coincide("Marta Suárez", "uare")).toBe(false);
  });

  it("varias palabras: todas tienen que encontrar algo", () => {
    expect(coincide("Marta Suárez", "marta sua")).toBe(true);
    expect(coincide("Marta Suárez", "sua marta")).toBe(true); // el orden no importa
    expect(coincide("Marta Suárez", "marta lopez")).toBe(false);
  });

  it("la consulta vacia trae todo", () => {
    expect(coincide("Cualquiera", "")).toBe(true);
    expect(coincide("Cualquiera", "   ")).toBe(true);
  });

  it("ignora mayusculas y espacios de mas", () => {
    expect(coincide("Marta Suárez", "  MARTA  ")).toBe(true);
  });
});

describe("buscar", () => {
  const gente = [
    { nombre: "Ana Marín" },
    { nombre: "Marta Suárez" },
    { nombre: "Juan Pérez" },
    { nombre: "Roberto Díaz" },
  ];

  it("filtra", () => {
    expect(buscar(gente, "mar").map((p) => p.nombre)).toEqual(["Marta Suárez", "Ana Marín"]);
  });

  it("prioriza a los que EMPIEZAN con lo escrito", () => {
    // "Marta" arranca con "mar"; "Ana Marín" solo lo tiene en el apellido.
    expect(buscar(gente, "mar")[0].nombre).toBe("Marta Suárez");
  });

  it("sin consulta devuelve todos, sin reordenar", () => {
    expect(buscar(gente, "").map((p) => p.nombre)).toEqual(gente.map((p) => p.nombre));
  });

  it("sin resultados devuelve lista vacia", () => {
    expect(buscar(gente, "zzz")).toEqual([]);
  });

  it("no muta el array original", () => {
    const copia = [...gente];
    buscar(gente, "mar");
    expect(gente).toEqual(copia);
  });
});
