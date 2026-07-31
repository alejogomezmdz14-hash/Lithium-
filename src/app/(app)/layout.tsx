import { Header } from "./header";
import { Nav } from "./nav";

/**
 * Shell de los tres módulos. El login, el sheet de cobro y los formularios de
 * alta quedan afuera a propósito: son pantallas de tarea única, y la navegación
 * ahí solo distrae mientras se registra plata.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Nav />
    </>
  );
}
