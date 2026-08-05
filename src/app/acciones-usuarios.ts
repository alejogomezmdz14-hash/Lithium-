"use server";

import { createClient as crearAdmin } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Alta de usuarias desde la app. Ver CLAUDE.md §10.1.
 *
 * Hay DOS permisos separados a propósito:
 *   `rol = 'admin'` → ve y edita los datos. Lo exige RLS.
 *   `super = true`  → además puede crear otras usuarias.
 *
 * Están separados para que sumar un "super" no obligue a tocar las policies de
 * la base — un error ahí deja a todo el mundo afuera.
 *
 * Crear usuarias necesita la `service_role` key, que **solo existe del lado del
 * servidor**. Nunca puede llegar al navegador: saltea RLS por completo.
 */

export type Usuaria = { id: string; email: string; esSuper: boolean; ultimoIngreso: string | null };

async function quienSoy() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // El claim viene firmado dentro del token: el usuario no lo puede falsear.
  return { user, esSuper: user?.app_metadata?.super === true };
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return crearAdmin(url, key, { auth: { persistSession: false } });
}

export async function listarUsuarias(): Promise<{ usuarias: Usuaria[]; error: string | null }> {
  const { user, esSuper } = await quienSoy();
  if (!user) return { usuarias: [], error: "Se te venció la sesión. Entrá de nuevo." };
  if (!esSuper) return { usuarias: [], error: "No tenés permiso para ver las usuarias." };

  const cliente = admin();
  if (!cliente) return { usuarias: [], error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY." };

  const { data, error } = await cliente.auth.admin.listUsers();
  if (error) return { usuarias: [], error: error.message };

  return {
    usuarias: data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "(sin mail)",
      esSuper: u.app_metadata?.super === true,
      ultimoIngreso: u.last_sign_in_at ?? null,
    })),
    error: null,
  };
}

export type EstadoAlta = { error: string | null; ok: string | null };

export async function crearUsuaria(_previo: EstadoAlta, datos: FormData): Promise<EstadoAlta> {
  const { user, esSuper } = await quienSoy();
  if (!user) return { error: "Se te venció la sesión. Entrá de nuevo.", ok: null };
  if (!esSuper) return { error: "No tenés permiso para crear usuarias.", ok: null };

  const email = String(datos.get("email") ?? "").trim().toLowerCase();
  const password = String(datos.get("password") ?? "");
  const darSuper = datos.get("super") === "on";

  if (!email.includes("@")) return { error: "Escribí un mail válido.", ok: null };
  if (password.length < 6) return { error: "La contraseña necesita al menos 6 caracteres.", ok: null };

  const cliente = admin();
  if (!cliente) return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY.", ok: null };

  const { error } = await cliente.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // Sin el sello `rol`, RLS le niega todo y la app le aparece VACÍA en vez de
    // dar un error. Por eso se pone en el mismo acto de crearla.
    app_metadata: darSuper ? { rol: "admin", super: true } : { rol: "admin" },
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      return { error: "Ya existe una usuaria con ese mail.", ok: null };
    }
    return { error: `No se pudo crear: ${error.message}`, ok: null };
  }

  return { error: null, ok: `Listo. ${email} ya puede entrar.` };
}

export async function cambiarContrasena(
  _previo: EstadoAlta,
  datos: FormData,
): Promise<EstadoAlta> {
  const { user, esSuper } = await quienSoy();
  if (!user) return { error: "Se te venció la sesión. Entrá de nuevo.", ok: null };
  if (!esSuper) return { error: "No tenés permiso.", ok: null };

  const id = String(datos.get("id") ?? "");
  const password = String(datos.get("password") ?? "");
  if (password.length < 6) return { error: "La contraseña necesita al menos 6 caracteres.", ok: null };

  const cliente = admin();
  if (!cliente) return { error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY.", ok: null };

  const { error } = await cliente.auth.admin.updateUserById(id, { password });
  if (error) return { error: `No se pudo cambiar: ${error.message}`, ok: null };

  return { error: null, ok: "Contraseña cambiada." };
}
