import { PALABRA_SEMAFORO, type Semaforo as EstadoSemaforo } from "@/lib/por-pagar";

/**
 * El semáforo crediticio. Contesta la pregunta central: ¿le presto de nuevo?
 *
 * **Regla dura: el hue NUNCA va solo. Siempre punto + palabra.** Verde/naranja/
 * rojo es el clásico fallo de accesibilidad — bajo deuteranopia los tres colapsan
 * hacia amarillos parecidos, y ~8% de los varones tiene daltonismo rojo-verde.
 *
 * `nuevo` va **sin hue** a propósito: mostrarle un color a alguien de quien no
 * hay historial es mentirle, y esa es la mentira más cara de la app. La primera
 * vez que el semáforo no coincida con lo que ella sabe, deja de creerle para
 * siempre.
 *
 * **Sin píldora, sin fondo, sin borde**: el botón de cobrar también sería una
 * píldora con una palabra, y lo que se *lee* no puede tener la misma forma que
 * lo que *registra plata*.
 *
 * El `<Avatar>` de iniciales que vivía acá **se borró del repo**: costaba 40px +
 * 12 de gap en un viewport de 360 —el 16% del ancho— para mostrar dos letras que
 * ya estaban escritas al lado, y era ese ancho el que hacía que los nombres
 * largos se cortaran. Para encontrar a alguien está el buscador.
 */

const PUNTO: Record<EstadoSemaforo, string> = {
  rojo: "bg-destructivo",
  naranja: "bg-atencion",
  verde: "bg-exito",
  nuevo: "bg-texto-suave",
};

const PALABRA: Record<EstadoSemaforo, string> = {
  rojo: "text-destructivo",
  naranja: "text-atencion",
  verde: "text-exito",
  nuevo: "text-texto-suave",
};

export function Semaforo({
  estado,
  esManual = false,
  soloPunto = false,
}: {
  estado: EstadoSemaforo;
  esManual?: boolean;
  soloPunto?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.875rem] font-medium tracking-[-0.006em]">
      <span
        aria-hidden
        // translate-y: los glifos están centrados en su viewBox, el texto no en
        // su line-box. Sin esto el punto flota arriba de la altura-x del nombre.
        className={`inline-block size-2 shrink-0 translate-y-[0.5px] rounded-pill ${PUNTO[estado]}`}
      />
      {/* Aunque el punto vaya solo, la palabra sigue estando para el lector de
          pantalla: un color no se puede leer en voz alta. */}
      <span className={soloPunto ? "sr-only" : PALABRA[estado]}>{PALABRA_SEMAFORO[estado]}</span>
      {esManual && !soloPunto ? (
        <span className="text-texto-suave">— lo pusiste a mano</span>
      ) : null}
    </span>
  );
}

/**
 * El motivo, en palabras, debajo del semáforo. De uno a tres hechos:
 * `Ojo — pagó tarde 3 de 5 cuotas` · `Mal pagador — 2 cuotas vencidas`.
 *
 * Un chip de color sin motivo es decoración, y decoración acá se lee como magia
 * hecha con IA.
 */
export function Motivo({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[0.875rem] font-medium text-texto-suave">{children}</p>;
}
