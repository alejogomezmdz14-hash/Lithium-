import { salir } from "@/app/login/actions";

export function BotonSalir() {
  return (
    <form action={salir}>
      <button
        type="submit"
        className="flex h-12 items-center px-1 text-[0.8125rem] font-medium text-muted-foreground"
      >
        Salir
      </button>
    </form>
  );
}
