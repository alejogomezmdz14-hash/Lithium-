"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { esPDF, ErrorDeImagen, prepararImagen } from "@/lib/imagen";
import { createClient } from "@/lib/supabase/client";

import { pedirPermisoDeSubida, registrarDocumento } from "@/app/acciones-documentos";

type Props = {
  clienteId: string;
  tipo: string;
  etiqueta: string;
  pidePeriodo: boolean;
};

/** Los últimos 6 meses, para elegir el período con un toque. */
function ultimosMeses(cantidad = 6) {
  const hoy = new Date();
  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
    const valor = d.toISOString().slice(0, 10);
    const nombre = new Intl.DateTimeFormat("es-AR", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    }).format(d);
    return { valor, nombre };
  });
}

export function BotonSubir({ clienteId, tipo, etiqueta, pidePeriodo }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const idInput = useId();

  const [estado, setEstado] = useState<"listo" | "procesando" | "subiendo">("listo");
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState(() => ultimosMeses(1)[0].valor);

  const meses = ultimosMeses();
  const trabajando = estado !== "listo";

  async function alElegir(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    // Se limpia enseguida para que elegir la MISMA foto otra vez vuelva a disparar.
    evento.target.value = "";
    if (!archivo) return;

    setError(null);

    try {
      // 1. Preparar. Los PDF van tal cual; las fotos se achican, se enderezan y
      //    se les saca el EXIF con la ubicación.
      setEstado("procesando");
      let cuerpo: Blob;
      let extension: string;
      let mime: string;

      if (esPDF(archivo)) {
        if (archivo.size > 10 * 1024 * 1024) {
          throw new ErrorDeImagen("Ese PDF pesa más de 10 MB. Mandá uno más liviano.");
        }
        cuerpo = archivo;
        extension = "pdf";
        mime = "application/pdf";
      } else {
        const lista = await prepararImagen(archivo);
        cuerpo = lista.blob;
        extension = lista.extension;
        mime = "image/jpeg";
      }

      // 2. Pedirle al servidor permiso y ruta. La ruta la elige él, no nosotros.
      setEstado("subiendo");
      const permiso = await pedirPermisoDeSubida(clienteId, tipo, extension);
      if (!permiso.ok) throw new Error(permiso.error);

      // 3. Los bytes van del navegador DIRECTO a Storage: por una Server Action
      //    no entrarían, el body está topeado en 1 MB.
      const supabase = createClient();
      const { error: errorSubida } = await supabase.storage
        .from("documentos")
        .uploadToSignedUrl(permiso.path, permiso.token, cuerpo, { contentType: mime });

      if (errorSubida) {
        throw new Error(
          navigator.onLine
            ? `No se pudo subir: ${errorSubida.message}`
            : "Te quedaste sin internet. Probá de nuevo cuando tengas señal.",
        );
      }

      // 4. Recién ahora se deja la fila en la base.
      const { error: errorRegistro } = await registrarDocumento({
        clienteId,
        tipo,
        path: permiso.path,
        periodo: pidePeriodo ? periodo : null,
        nombreArchivo: archivo.name,
        bytes: cuerpo.size,
        mime,
      });
      if (errorRegistro) throw new Error(errorRegistro);

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el documento.");
    } finally {
      setEstado("listo");
    }
  }

  return (
    <div className="mt-3">
      {pidePeriodo ? (
        <div className="mb-2">
          <label
            htmlFor={`${idInput}-periodo`}
            className="text-[0.8125rem] font-medium text-muted-foreground"
          >
            ¿De qué mes es?
          </label>
          <select
            id={`${idInput}-periodo`}
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            disabled={trabajando}
            className="mt-1 h-12 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground"
          >
            {meses.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <input
        ref={inputRef}
        id={idInput}
        type="file"
        // SIN `capture`: con ese atributo el celular abre la cámara directo y no
        // deja elegir un PDF ni una foto ya sacada. Sin él, el sistema ofrece
        // las dos cosas — cámara y archivos — que es lo que hace falta.
        accept="image/*,application/pdf"
        onChange={alElegir}
        disabled={trabajando}
        className="sr-only"
      />

      {/* Grande, con ícono de clip y diciendo que acepta foto o PDF: el botón
          chico no leía como "adjuntar un archivo" y no se encontraba. */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={trabajando}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-[0.9375rem] font-semibold text-primary-foreground disabled:opacity-60"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="size-[19px] shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
        {estado === "procesando"
          ? "Preparando el archivo…"
          : estado === "subiendo"
            ? "Subiendo…"
            : `Adjuntar ${etiqueta.toLowerCase()}`}
      </button>
      <p className="mt-1.5 text-center text-[0.8125rem] font-medium text-muted-foreground">
        Sacá una foto o elegí un PDF del teléfono
      </p>

      <p
        role="alert"
        aria-live="polite"
        className={`mt-2 text-[0.8125rem] font-medium text-danger ${error ? "" : "sr-only"}`}
      >
        {error ?? ""}
      </p>
    </div>
  );
}
