/**
 * Variables de entorno, validadas al importar.
 *
 * Sin esto, una key faltante no falla acá: falla más adelante como un error de
 * red raro o un 401 de Supabase, y se pierden veinte minutos buscándolo en el
 * lugar equivocado. Mejor que reviente temprano y diga qué falta.
 *
 * Las `NEXT_PUBLIC_*` tienen que leerse con `process.env.NOMBRE_LITERAL` para
 * que Next las inline en el bundle. Un acceso dinámico (`process.env[n]`) las
 * deja en `undefined` en el browser.
 */

function requerida(nombre: string, valor: string | undefined): string {
  if (!valor || valor.trim() === "") {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Completala en .env.local (ver .env.example).`,
    );
  }
  return valor;
}

export const SUPABASE_URL = requerida(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = requerida(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
