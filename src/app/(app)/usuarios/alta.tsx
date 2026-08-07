"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { crearUsuaria, type EstadoAlta } from "@/app/acciones-usuarios";
import { Boton } from "@/components/boton";
import { INPUT, ROTULO_CAMPO } from "@/components/campo";
import { Escalon, Fila } from "@/components/superficie";

const INICIAL: EstadoAlta = { error: null, ok: null };

// Adentro del escalón NO vive `texto-tenue` (3.83 en claro, 3.72 en oscuro): en
// la fila donde se decide quién entra a la app no hay nada ornamental.
const AYUDA = "text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave";

/**
 * El alta de una usuaria: cerrada es una fila más de la losa; abierta es el
 * escalón — el único de la pantalla. El mismo mecanismo que en una lista dice
 * "actuá acá" acá dice "esto es lo que estás haciendo".
 */
export function AltaDeUsuaria() {
  const router = useRouter();
  const [estado, accion, enviando] = useActionState(crearUsuaria, INICIAL);
  const [abierto, setAbierto] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");

  // Al crear una, refrescar para que aparezca en la lista de arriba.
  useEffect(() => {
    if (estado.ok) router.refresh();
  }, [estado.ok, router]);

  // El cajón se abre en dos pasos a propósito: monta cerrado y recién en el
  // frame siguiente pasa a 1fr. Si se abriera en el mismo render no habría dos
  // valores entre los que interpolar y el form aparecería de golpe.
  useEffect(() => {
    if (!abierto) return;
    const id = requestAnimationFrame(() => setExpandido(true));
    return () => cancelAnimationFrame(id);
  }, [abierto]);

  // Cerrar apaga las dos banderas en el mismo gesto: si `expandido` quedara en
  // true, la próxima apertura no tendría de dónde interpolar y el form saldría
  // de golpe.
  const cerrar = () => {
    setAbierto(false);
    setExpandido(false);
  };

  if (!abierto) {
    return (
      <Fila>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="-my-[18px] w-full py-[18px] text-left text-[1rem] font-semibold tracking-[-0.011em] text-marca-texto"
        >
          Agregar una usuaria
        </button>
      </Fila>
    );
  }

  const faltaMail = !email.includes("@");
  const faltaClave = clave.length < 6;

  return (
    <Escalon>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[1rem] font-semibold tracking-[-0.011em]">Nueva usuaria</p>
        <Boton peso="texto" type="button" onClick={cerrar}>
          Cerrar
        </Boton>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-[240ms] ease-salida"
        style={{ gridTemplateRows: expandido ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <form action={accion} className="flex flex-col gap-6 pt-1">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={ROTULO_CAMPO}>
                Mail
              </label>
              <p className={AYUDA}>Con esto entra a la app. No le llega ningún mail.</p>
              <input
                id="email"
                name="email"
                type="email"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={enviando}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@lithium.com"
                className={INPUT}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className={ROTULO_CAMPO}>
                Contraseña
              </label>
              <p className={AYUDA}>Mínimo 6 caracteres. Anotala: no se vuelve a mostrar.</p>
              <input
                id="password"
                name="password"
                // Visible a propósito: la escribe ella y se la tiene que dictar
                // a la otra persona. Una contraseña en puntitos que hay que
                // pasar en voz alta se dicta mal una vez y ya nadie entra.
                type="text"
                disabled={enviando}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="una contraseña simple"
                className={INPUT}
              />
            </div>

            {/* Sin caja propia: una card adentro de una card adentro de una losa
                son tres bordes entre el ojo y el dato. */}
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="super"
                disabled={enviando}
                className="mt-0.5 size-5 shrink-0 accent-marca"
              />
              <span>
                <span className="block text-[0.875rem] font-semibold tracking-[-0.006em]">
                  Que pueda crear usuarias
                </span>
                <span className={`mt-0.5 block ${AYUDA}`}>
                  Dejalo sin marcar si solo tiene que ver y cargar préstamos.
                </span>
              </span>
            </label>

            {estado.error ? (
              <p role="alert" className="text-[0.875rem] font-medium tracking-[-0.006em] text-peligro">
                {estado.error}
              </p>
            ) : null}
            {estado.ok ? (
              <p role="status" className="text-[0.875rem] font-medium tracking-[-0.006em] text-exito">
                {estado.ok}
              </p>
            ) : null}

            {/* No existe `disabled`: contraste pleno y la etiqueta dice qué falta. */}
            <Boton
              peso="lleno"
              type="submit"
              onClick={(e) => {
                if (enviando) {
                  e.preventDefault();
                  return;
                }
                if (faltaMail || faltaClave) {
                  e.preventDefault();
                  document.getElementById(faltaMail ? "email" : "password")?.focus();
                }
              }}
            >
              {enviando
                ? "Creando…"
                : faltaMail
                  ? "Falta el mail"
                  : faltaClave
                    ? "Falta la contraseña"
                    : "Crear la usuaria"}
            </Boton>
          </form>
        </div>
      </div>
    </Escalon>
  );
}
