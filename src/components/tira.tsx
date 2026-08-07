/**
 * La tira del plan de cuotas. Vive **siempre adentro de la piedra**.
 *
 * Tiene exactamente `cantidad_cuotas` segmentos: es honesta y auto-explicativa,
 * y nunca necesita leyenda. **Nunca un porcentaje** — "50%" no significa nada,
 * "3 de 6" es instantáneo.
 *
 * **Cero color de estado en los segmentos.** Una muesca o un tercer color sería
 * un código a aprender, y Candela no aprende ningún código.
 */
export function TiraDeCuotas({ total, cobradas }: { total: number; cobradas: number }) {
  return (
    <div className="flex gap-[3px]" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-[5px] flex-1 rounded-tira transition-colors duration-[180ms] delay-[120ms] ease-salida ${
            i < cobradas ? "bg-texto" : "bg-[color-mix(in_srgb,var(--texto)_22%,transparent)]"
          }`}
        />
      ))}
    </div>
  );
}
