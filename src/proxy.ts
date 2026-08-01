import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

const RUTAS_PUBLICAS = ["/login"];

/**
 * En Next 16 esto se llama `proxy`, no `middleware` — el archivo `middleware.ts`
 * quedó deprecado y renombrado. Ver `node_modules/next/dist/docs/01-app/
 * 03-api-reference/03-file-conventions/proxy.md`. Corre en runtime Node.js por
 * defecto y setear `runtime` acá adentro tira error.
 *
 * Hace dos cosas: refresca el token de sesión en cada request, y manda al login
 * a quien no tenga sesión.
 *
 * NOTA (§8 del plan de auth): la doc de auth-js sugiere `getClaims()` en lugar
 * de `getUser()` para evitar un round-trip de red por navegación. NO aplica acá:
 * `getClaims()` valida la firma localmente solo con **claves asimétricas**, y
 * este proyecto usa la key legacy HS256. Sin la clave simétrica, `getClaims()`
 * termina yendo a la red igual. Revisar si algún día se migra a signing keys
 * asimétricas.
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  // Los headers anti-caché que manda la librería junto con las cookies. Se
  // guardan aparte porque hay que volver a aplicarlos si terminamos redirigiendo.
  const headersDeAuth: Record<string, string> = {};

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies, headers) {
        // Las cookies van al request Y a una respuesta nueva. Si se devolviera
        // un objeto distinto del que las recibió, el token refrescado se pierde
        // y la sesión se cae de a ratos: el bug clásico de este patrón.
        for (const { name, value } of cookies) request.cookies.set(name, value);
        respuesta = NextResponse.next({ request });
        for (const { name, value, options } of cookies) {
          respuesta.cookies.set(name, value, options);
        }

        // `Cache-Control: private, no-store` y `Expires: 0`. Sin esto, un CDN
        // (Vercel, justamente) puede cachear una respuesta que lleva un
        // Set-Cookie de sesión y servirle a otra persona la sesión ajena. Lo
        // dice el propio tipo de @supabase/ssr, no es cosmético.
        Object.assign(headersDeAuth, headers);
        for (const [clave, valor] of Object.entries(headers)) {
          respuesta.headers.set(clave, valor);
        }
      },
    },
  });

  // getUser() y NO getSession(): getSession() lee la cookie y confía en lo que
  // dice, sin validar contra el servidor de auth. Para decidir si alguien entra,
  // eso no alcanza.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user ?? null;

  // Un fallo de auth acá NO es "no hay sesión": puede ser una env var rota o
  // Supabase caído, y el síntoma es idéntico — redirección al login sin más.
  // Ya nos costó un rato: una key cargada en Vercel con un BOM invisible
  // adelante hacía fallar todos los pedidos con "Cannot convert argument to a
  // ByteString". Sin este log, en producción no se ve nada.
  if (authError && !request.nextUrl.pathname.startsWith("/login")) {
    console.error("[proxy] getUser() falló:", authError.message);
  }

  const esPublica = RUTAS_PUBLICAS.some((r) => request.nextUrl.pathname.startsWith(r));

  if ((!user && !esPublica) || (user && esPublica)) {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/" : "/login";
    const redireccion = NextResponse.redirect(url);

    // Arrastrar las cookies refrescadas y los headers anti-caché. Una respuesta
    // de redirect nueva sale "pelada": si el token se acababa de refrescar, se
    // perdía acá y la sesión moría en la próxima navegación.
    for (const cookie of respuesta.cookies.getAll()) redireccion.cookies.set(cookie);
    for (const [clave, valor] of Object.entries(headersDeAuth)) {
      redireccion.headers.set(clave, valor);
    }
    return redireccion;
  }

  return respuesta;
}

export const config = {
  // Sin matcher esto correría también sobre estáticos e imágenes, y una
  // redirección al login terminaría bloqueando el CSS y las fuentes.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
