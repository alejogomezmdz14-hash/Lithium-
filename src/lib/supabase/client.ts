import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Cliente de Supabase para componentes con `"use client"`.
 *
 * Usa la key `anon`, que es pública por diseño: lo que protege los datos es
 * RLS, no esconder la clave. Nunca importar la `service_role` desde acá.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
