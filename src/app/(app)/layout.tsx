import { Suspense } from "react";

import { AvisoDeCobro } from "@/components/aviso-de-cobro";

import { Header } from "./header";
import { Nav } from "./nav";

/**
 * Shell de los tres módulos. El login, el sheet de cobro y los formularios de
 * alta quedan afuera a propósito: son pantallas de tarea única, y la navegación
 * ahí solo distrae mientras se registra plata.
 *
 * El aviso de cobro vive acá y no en la pantalla que lo dispara: `/cobrar/[id]`
 * navega de vuelta al tab, así que un toast montado allá se desmontaría en el
 * camino. Va en `<Suspense>` porque lee `useSearchParams()`, y sin el límite
 * Next tiene que renderizar toda la página del lado del cliente.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Suspense fallback={null}>
        <AvisoDeCobro />
      </Suspense>
      <Nav />
    </>
  );
}
