import { Aviso } from "@/components/aviso";
import { BotonLink } from "@/components/boton";

/**
 * 404. Sin esto Next sirve su página por default: fondo blanco, en inglés,
 * "This page could not be found". A Candela eso se le lee como que la app se
 * rompió, no como que el link estaba viejo.
 *
 * La llaman `notFound()` de la ficha de cliente, el detalle de préstamo y el
 * sheet de cobro cuando el id no existe.
 *
 * Tono `calma`, no `error`: acá no falló nada. Pintar el título de rojo diría
 * lo contrario de lo que dice el texto, y el color le ganaría a las palabras.
 */
export default function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col justify-center px-4">
      <Aviso
        tono="calma"
        titulo="Eso ya no está."
        // `texto`, igual que en `/usuarios` sin permiso y en el aviso de "esa
        // cuota ya está cobrada": salir de un aviso es navegación, y el relleno
        // de marca es del botón que completa la tarea de la pantalla. Acá no hay
        // ninguna tarea que completar.
        acciones={
          <BotonLink peso="texto" href="/" className="justify-center">
            Volver al resumen
          </BotonLink>
        }
      >
        Puede que lo hayas borrado, o que el link sea viejo. No se perdió nada de lo que tenés
        cargado.
      </Aviso>
    </main>
  );
}
