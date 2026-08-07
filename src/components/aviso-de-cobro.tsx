"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { deshacerCobro } from "@/app/acciones-prestamo";

import { Boton } from "./boton";
import { Escalon } from "./superficie";

/**
 * El aviso de "recién cobraste", con su Deshacer.
 *
 * **El problema que resuelve: el toast no tenía casa.** El cobro sale de
 * `/cobrar/[id]`, corre la server action y navega de vuelta al tab — así que
 * cualquier toast montado en la pantalla de cobro se desmonta en la navegación y
 * no llega nunca, o dura 200ms.
 *
 * La solución: la server action redirige con `?cobre=&cuota=&deshacer=`, y esto
 * vive montado en el layout de los tres tabs, que NO se desmonta. Los layouts no
 * reciben `searchParams`, pero un client component adentro sí puede leerlos.
 * Apenas los lee se los saca de la URL, para que un refresh no repita el aviso
 * ni vuelva a ofrecer deshacer un cobro de hace dos horas.
 *
 * **8 segundos, no 4.** Está parada en la calle mirando a alguien a los ojos.
 */

const VIDA_MS = 8000;
const SALIDA_MS = 200;

type Aviso = {
  /** Identifica ESTE cobro. Si vuelve a aparecer el mismo, es un cobro nuevo. */
  clave: string;
  nombre: string;
  cuota: string | null;
  cuotaId: string | null;
};

export function AvisoDeCobro() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const cobre = params.get("cobre");
  const cuota = params.get("cuota");
  const deshacer = params.get("deshacer");
  const clave = cobre ? `${cobre}|${cuota ?? ""}|${deshacer ?? ""}` : null;

  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deshaciendo, iniciarDeshacer] = useTransition();

  // Ajuste de estado **en render**, no en un efecto: el aviso se deriva de la
  // URL, y hacerlo en un efecto obliga a un segundo render en el que el toast ya
  // debería estar (además de encadenar renders en cascada). Comparar contra la
  // clave es lo que corta el bucle — y lo que deja que el mismo cobro, si se
  // deshace y se vuelve a registrar, avise de nuevo.
  if (cobre && clave && aviso?.clave !== clave) {
    setAviso({ clave, nombre: cobre, cuota, cuotaId: deshacer });
    setError(null);
  }

  useEffect(() => {
    if (!cobre) return;

    // Se sacan SOLO los tres parámetros del aviso: cualquier otro que traiga la
    // URL es de la pantalla, no nuestro, y borrarlo sería romperle algo a otro.
    const resto = new URLSearchParams(params.toString());
    resto.delete("cobre");
    resto.delete("cuota");
    resto.delete("deshacer");
    const query = resto.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [cobre, params, pathname, router]);

  useEffect(() => {
    if (!aviso) return;

    // Dos frames antes de encender: si se monta ya visible no hay transición de
    // entrada, y el toast aparece de golpe encima de la barra.
    let segundo = 0;
    const primero = requestAnimationFrame(() => {
      segundo = requestAnimationFrame(() => setVisible(true));
    });

    const apagar = setTimeout(() => setVisible(false), VIDA_MS);
    const desmontar = setTimeout(() => setAviso(null), VIDA_MS + SALIDA_MS);

    return () => {
      cancelAnimationFrame(primero);
      cancelAnimationFrame(segundo);
      clearTimeout(apagar);
      clearTimeout(desmontar);
    };
    // `error` está en las dependencias a propósito: si deshacer falla, el reloj
    // vuelve a arrancar para que el mensaje se alcance a leer.
  }, [aviso, error]);

  if (!aviso) return null;

  const cerrar = () => {
    setVisible(false);
    setTimeout(() => setAviso(null), SALIDA_MS);
  };

  const alDeshacer = () => {
    if (!aviso.cuotaId || deshaciendo) return;
    const cuotaId = aviso.cuotaId;
    iniciarDeshacer(async () => {
      const { error: falla } = await deshacerCobro(cuotaId);
      if (falla) {
        setError(falla);
        return;
      }
      cerrar();
    });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      // `pointer-events-none` en el envoltorio: mientras se desvanece no puede
      // quedar tapando la fila que hay abajo.
      className={`pointer-events-none fixed inset-x-4 bottom-[72px] z-40 mx-auto max-w-[520px] transition-[opacity,transform] ${
        visible
          ? "translate-y-0 opacity-100 duration-[220ms] ease-salida"
          : "translate-y-6 opacity-0 duration-[160ms] ease-salida"
      }`}
    >
      {/* Es un escalón: el material que en toda la app dice "esto es lo que hay
          que tocar ahora" es el mismo que sostiene el único deshacer que existe. */}
      <Escalon className="pointer-events-auto">
        <div className="flex items-center justify-between gap-3">
          {error ? (
            <p className="min-w-0 text-[0.875rem] font-medium tracking-[-0.006em] text-peligro">
              {error}
            </p>
          ) : (
            <p className="min-w-0 text-[0.875rem] font-medium tracking-[-0.006em] text-texto">
              Cobraste {aviso.cuota ? `la cuota ${aviso.cuota}` : "el pago"} de {aviso.nombre}
            </p>
          )}

          {aviso.cuotaId && !error ? (
            <Boton peso="texto" onClick={alDeshacer} className="shrink-0">
              {deshaciendo ? "Deshaciendo…" : "Deshacer"}
            </Boton>
          ) : (
            <Boton peso="texto" onClick={cerrar} className="shrink-0">
              Listo
            </Boton>
          )}
        </div>
      </Escalon>
    </div>
  );
}
