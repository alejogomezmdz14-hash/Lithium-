import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * En Next 16 esto se llama `proxy`, no `middleware` — el archivo `middleware.ts`
 * quedó deprecado y renombrado. Ver `node_modules/next/dist/docs/01-app/
 * 03-api-reference/03-file-conventions/proxy.md`. Corre en runtime Node.js por
 * defecto, y setear `runtime` acá adentro tira error.
 *
 * Hace dos cosas:
 *  1. Refresca el token de sesión de Supabase en cada request. Sin esto la
 *     sesión se vence sola y Candela se encuentra deslogueada a mitad de un
 *     cobro.
 *  2. Manda al login a quien no tenga sesión.
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        // Las cookies van al request Y a una respuesta NUEVA. Si se devolviera
        // un objeto distinto del que recibió las cookies, el token refrescado se
        // pierde y la sesión se cae de a ratos, que es el bug clásico de este
        // patrón y el más difícil de diagnosticar.
        for (const { name, value } of cookies) request.cookies.set(name, value);
        respuesta = NextResponse.next({ request });
        for (const { name, value, options } of cookies) {
          respuesta.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() y NO getSession(): getSession() lee la cookie y confía en lo que
  // dice, sin validar la firma contra el servidor de auth. En el server eso no
  // alcanza para decidir si alguien entra o no.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const enLogin = request.nextUrl.pathname.startsWith("/login");

  if (!user && !enLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && enLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return respuesta;
}

export const config = {
  // Sin matcher esto correría también sobre los estáticos y las imágenes, y una
  // redirección al login terminaría bloqueando el CSS y las fuentes.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
