"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type EstadoLogin = { error: string | null };

/**
 * Supabase devuelve los errores en inglés y a veces poco claros. Se traducen a
 * algo que sirva, SIN revelar si el mail existe o no — eso le diría a cualquiera
 * qué cuentas hay.
 */
function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Ese mail o esa contraseña no son. Fijate y probá de nuevo.";
  }
  if (m.includes("email not confirmed")) {
    return "Falta confirmar esa cuenta desde el mail.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Probaste muchas veces seguidas. Esperá un minuto y volvé a intentar.";
  }
  if (m.includes("fetch") || m.includes("network")) {
    return "No hay conexión. Fijate el internet y probá de nuevo.";
  }
  return "No pudimos entrar. Probá de nuevo en un momento.";
}

export async function entrar(_previo: EstadoLogin, datos: FormData): Promise<EstadoLogin> {
  const email = String(datos.get("email") ?? "").trim();
  const password = String(datos.get("password") ?? "");

  if (!email || !password) {
    return { error: "Completá el mail y la contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: traducir(error.message) };

  // redirect() tira una excepción especial que Next intercepta: va afuera de
  // cualquier try/catch, si no se la traga y el login se queda colgado.
  redirect("/");
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
