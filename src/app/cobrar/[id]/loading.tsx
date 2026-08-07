import { Piedra } from "@/components/superficie";

/**
 * Lo que se ve entre el tap y la pantalla de cobro.
 *
 * A `/cobrar/[id]` **siempre** se llega tocando un link desde una lista (`Por
 * pagar`, el plan de cuotas, el buscador). Sin este archivo, Next bloquea la
 * navegación en el servidor mientras espera a Supabase: el tap deja la pantalla
 * vieja intacta y no pasa nada. El `presionable:active` da 90ms de hundido y
 * después silencio. Parada en la calle, con datos móviles, frente a la persona
 * que le acaba de dar la plata, lo natural es volver a tocar.
 *
 * §9.7 permite no tener loading porque las tabs son RSC server-rendered — eso
 * vale para la primera pintada, no para la navegación por link, que acá es el
 * 100% de los ingresos.
 *
 * **Isomorfo, no un spinner centrado.** Cada hueso vive dentro del MISMO
 * elemento con las MISMAS clases de tipografía y de espaciado que el render
 * real, así el alto lo calcula el line-box del navegador en vez de un número
 * adivinado: cuando llegan los datos, el texto aparece donde ya estaba la barra
 * y nada salta. Por eso los huesos son `inline-block` más bajos que la
 * ascendente de su renglón — un bloque suelto colapsaría el line-box y el alto
 * dejaría de coincidir.
 *
 * El material no se finge: la `<Piedra>` es la de verdad y las cajas de los
 * campos van en `hairline`, el mismo filo del sistema, que es visible en los dos
 * temas (en claro es tinta al 9%, en oscuro luz al 9%).
 */

/** El hueso. Un solo pulso, arrancan todos en el mismo frame y laten juntos. */
const HUESO = "inline-block rounded-tira animate-pulse [animation-duration:1.4s]";

export default function CobrarCargando() {
  return (
    // `aria-hidden` + `aria-busy` en el `<main>`: el lector de pantalla no
    // enumera cuatro barras sin nombre, anuncia que está cargando.
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-3"
    >
      <p className="sr-only">Abriendo el cobro…</p>

      <div aria-hidden>
        {/* `Volver` — mismo alto de 48px y mismo gap que el botón de texto. */}
        <div className="inline-flex h-12 items-center gap-1.5">
          <span className={`${HUESO} size-[17px] shrink-0`} />
          <span className={`${HUESO} h-[10px] w-[116px]`} />
        </div>

        <Piedra className="mt-2.5">
          <p className="text-[0.875rem] font-medium tracking-[-0.006em]">
            <span className={`${HUESO} h-[9px] w-[66px] bg-hairline-luz`} />
          </p>
          <h1 className="mt-1 font-display text-[1.375rem] font-bold tracking-[-0.025em]">
            <span className={`${HUESO} h-[14px] w-[152px] bg-hairline-luz`} />
          </h1>
          <p className="mt-4 font-display text-[2.75rem] font-bold leading-[0.98] tracking-[-0.04em]">
            <span className={`${HUESO} h-[26px] w-[176px] bg-hairline-luz`} />
          </p>
          <p className="mt-3 text-[0.875rem] font-medium tracking-[-0.006em]">
            <span className={`${HUESO} h-[9px] w-[206px] bg-hairline-luz`} />
          </p>
        </Piedra>

        {/* El formulario: `mt-8`, `gap-8`, y adentro rótulo + control con el
            `gap-1.5` de `<Campo>`. Mismos altos que los controles reales:
            input de plata 64, segmentado 48, botón 52 en píldora. */}
        <div className="mt-8 flex flex-col gap-8">
          <div className="flex flex-col gap-1.5">
            <p className="text-[0.75rem] uppercase tracking-[0.09em]">
              <span className={`${HUESO} h-[8px] w-[124px] bg-hairline`} />
            </p>
            <div className="h-16 rounded-campo bg-hairline animate-pulse [animation-duration:1.4s]" />
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-[0.75rem] uppercase tracking-[0.09em]">
              <span className={`${HUESO} h-[8px] w-[112px] bg-hairline`} />
            </p>
            <div className="h-12 rounded-campo bg-hairline animate-pulse [animation-duration:1.4s]" />
          </div>

          {/* Píldora, porque el hueco que guarda es el de `Listo, la cobré`: si
              el placeholder fuera rectangular, la forma saltaría al llegar. */}
          <div className="h-[52px] rounded-pill bg-hairline animate-pulse [animation-duration:1.4s]" />
        </div>
      </div>
    </main>
  );
}
