/**
 * Búsqueda de personas por nombre. Ver CLAUDE.md §9.11.
 *
 * Dos reglas, y las dos importan cuando alguien está parado enfrente:
 *
 * 1. **Acento-insensible.** Escribir "suarez" tiene que encontrar a "Suárez".
 *    Nadie pone tildes tipeando apurado en un celular.
 * 2. **Prefijo de CUALQUIER palabra**, no solo de la primera. "mar" encuentra a
 *    "Marta Suárez" y también a "Ana Marín"; a la gente se la busca tanto por
 *    el nombre como por el apellido.
 *
 * Lo que NO hace: coincidencia en el medio de una palabra. "arta" no encuentra
 * a "Marta" — eso trae ruido y hace que la lista salte de forma impredecible.
 */

/**
 * Saca tildes y pasa a minúscula. `"Suárez"` → `"suarez"`.
 *
 * La `ñ` también se pliega a `n` (`"Muñoz"` → `"munoz"`). Es a propósito: en un
 * buscador conviene, porque encuentra la persona se haya escrito con eñe o sin
 * ella. Para MOSTRAR el nombre nunca se usa esto — solo para comparar.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    // Bloque de diacríticos combinantes: es lo que NFD separa de la letra base.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function coincide(nombre: string, consulta: string): boolean {
  const q = normalizar(consulta);
  if (q === "") return true;

  // Cada palabra escrita tiene que encontrar alguna palabra del nombre. Así
  // "marta sua" encuentra a "Marta Suárez" aunque el orden no sea exacto.
  const palabrasNombre = normalizar(nombre).split(/\s+/).filter(Boolean);
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((termino) => palabrasNombre.some((palabra) => palabra.startsWith(termino)));
}

export function buscar<T extends { nombre: string }>(items: readonly T[], consulta: string): T[] {
  const encontrados = items.filter((i) => coincide(i.nombre, consulta));
  if (normalizar(consulta) === "") return [...encontrados];

  // Los que empiezan con lo escrito van primero: si tipeó "mar", "Marta" pesa
  // más que "Ana Marín".
  const q = normalizar(consulta);
  return encontrados.sort((a, b) => {
    const aEmpieza = normalizar(a.nombre).startsWith(q) ? 0 : 1;
    const bEmpieza = normalizar(b.nombre).startsWith(q) ? 0 : 1;
    return aEmpieza - bEmpieza || a.nombre.localeCompare(b.nombre, "es");
  });
}
