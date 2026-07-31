import { Nav } from "./nav";

/**
 * Shell de los tres módulos. El login y el sheet de cobro quedan afuera a
 * propósito: son pantallas de tarea única, y la navegación ahí solo distrae
 * mientras se registra plata.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Nav />
    </>
  );
}
