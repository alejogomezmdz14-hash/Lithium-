/**
 * Preparar una foto antes de subirla. Corre en el NAVEGADOR. Ver CLAUDE.md §10.2.
 *
 * Hace tres cosas, y las tres son necesarias:
 *
 * 1. **Achica.** Una foto de celular pesa entre 3 y 12 MB. Por 4G parada en la
 *    calle eso no sube. Pero el límite es la LEGIBILIDAD: un CUIL en letra chica
 *    dentro de un recibo A4 tiene que seguir leyéndose, así que 2000px de lado
 *    mayor y calidad 0.80, no menos.
 *
 * 2. **Endereza.** El celular guarda la foto siempre igual y anota aparte "esto
 *    va rotado" en el EXIF. Un canvas que ignora ese dato dibuja el documento
 *    acostado. `imageOrientation: "from-image"` aplica la rotación al decodificar.
 *
 * 3. **Borra el EXIF.** Ese metadato incluye las COORDENADAS de donde se sacó la
 *    foto. Una foto de un DNI sacada en la puerta de la casa lleva adentro la
 *    dirección de esa persona — dato de un tercero que nadie pidió guardar.
 *    Redibujar en un canvas lo elimina: al canvas solo llegan los píxeles.
 */

export const LADO_MAXIMO = 2000;
export const CALIDAD = 0.8;
/** Debajo de esto un documento empieza a no leerse. Piso duro. */
const CALIDAD_MINIMA = 0.6;
const OBJETIVO_BYTES = 900 * 1024;

export type ImagenLista = {
  blob: Blob;
  extension: "jpg";
  ancho: number;
  alto: number;
  bytesOriginales: number;
};

export class ErrorDeImagen extends Error {}

export async function prepararImagen(archivo: File): Promise<ImagenLista> {
  let bitmap: ImageBitmap;
  try {
    // "from-image" es lo que endereza la foto según el EXIF.
    bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    // El iPhone puede entregar HEIC, que la mayoría de los navegadores no
    // decodifica. El mensaje tiene que decir qué hacer, no "error 0x2".
    throw new ErrorDeImagen(
      "No se pudo leer esa foto. Si la sacaste con un iPhone, entrá a " +
        "Ajustes › Cámara › Formatos y elegí «Más compatible». O mandala como PDF.",
    );
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ErrorDeImagen("No se pudo procesar la foto en este navegador.");

  // Fondo blanco: un PNG con transparencia pasado a JPEG queda con fondo negro
  // y un documento escaneado se vuelve ilegible.
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  let calidad = CALIDAD;
  let blob = await aBlob(canvas, calidad);

  // Si igual quedó pesada, baja calidad — pero nunca por debajo del piso.
  while (blob.size > OBJETIVO_BYTES && calidad > CALIDAD_MINIMA) {
    calidad = Math.max(CALIDAD_MINIMA, calidad - 0.1);
    blob = await aBlob(canvas, calidad);
  }

  return { blob, extension: "jpg", ancho, alto, bytesOriginales: archivo.size };
}

function aBlob(canvas: HTMLCanvasElement, calidad: number): Promise<Blob> {
  return new Promise((resolver, rechazar) => {
    canvas.toBlob(
      (b) => (b ? resolver(b) : rechazar(new ErrorDeImagen("No se pudo comprimir la foto."))),
      "image/jpeg",
      calidad,
    );
  });
}

/** Los PDF se suben tal cual: no son imágenes y no hay nada que redibujar. */
export function esPDF(archivo: File): boolean {
  return archivo.type === "application/pdf" || archivo.name.toLowerCase().endsWith(".pdf");
}
