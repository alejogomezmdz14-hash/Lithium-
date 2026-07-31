import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 *
 * En Next 15+ `cookies()` es async — de ahí que esta función también lo sea.
 *
 * Las pantallas principales (`Por pagar`, `Clientes`, `Resumen`) son RSC
 * server-rendered a propósito (§9.7): sin primer loading, sin skeletons.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // `setAll` recibe un 2º argumento `headers` con los anti-caché
      // (`Cache-Control: private, no-store`, `Expires: 0`). Acá se ignora a
      // propósito: la API `cookies()` de Next no permite setear headers de
      // respuesta. Quien los aplica es `src/proxy.ts`, que es donde ocurre el
      // refresh de token en la práctica. No "arreglar" esto agregando headers
      // acá — no hay dónde ponerlos.
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Desde un Server Component no se pueden escribir cookies. Es
          // esperable: el refresh de sesión lo hace el proxy.
        }
      },
    },
  });
}
