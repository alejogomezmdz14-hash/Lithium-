import { salir } from "@/app/login/actions";

export function BotonSalir() {
  return (
    <form action={salir}>
      <button
        type="submit"
        className="flex h-12 items-center px-1 text-[0.875rem] font-medium tracking-[-0.006em] text-texto-suave"
      >
        Salir
      </button>
    </form>
  );
}
