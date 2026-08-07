"use client";

/**
 * Cambio de tema claro / oscuro.
 *
 * La elección se guarda en `localStorage` y la aplica un script que corre ANTES
 * de pintar (ver `layout.tsx`). Sin eso la pantalla arranca en un tema y salta
 * al otro: el flash blanco al abrir la app de noche.
 *
 * **No hay estado de React acá, a propósito.** Los dos íconos se renderizan
 * siempre y se muestran u ocultan con CSS según la clase `dark` del `<html>`.
 * Guardar el tema en un `useState` obligaba a leer el DOM en un efecto —lo que
 * además rompe la regla de no llamar `setState` dentro de un efecto— y producía
 * un desajuste de hidratación, porque en el server no se sabe qué tema eligió.
 */
export function BotonDeTema() {
  return (
    <button
      type="button"
      onClick={() => {
        const oscuro = document.documentElement.classList.toggle("dark");
        try {
          localStorage.setItem("lithium-tema", oscuro ? "oscuro" : "claro");
        } catch {
          // Storage bloqueado (incógnito): el tema se aplica igual en esta
          // sesión, solo no se recuerda para la próxima.
        }
      }}
      aria-label="Cambiar entre modo claro y oscuro"
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground"
    >
      {/* Luna: visible en claro, tocarla lleva a oscuro. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="size-[19px] dark:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>

      {/* Sol: visible en oscuro, tocarlo lleva a claro. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="hidden size-[19px] dark:block"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  );
}
