/**
 * Avisos por WhatsApp a Candela. Ver CLAUDE.md §4 y §5.
 *
 * Regla del copy: siempre **quién / cuánto / cuándo** de un vistazo. Nada de
 * "tenés un cobro pendiente" genérico — si el mensaje no le dice a quién
 * llamar y por cuánto, la obliga a abrir la app y no sirvió de nada.
 *
 * Y **un aviso por PERSONA, no por cuota**: si a alguien le vencen dos cuotas
 * el mismo día, va un solo mensaje. Nadie quiere tres WhatsApps seguidos por
 * la misma persona.
 */
import { formatARS } from "./money";
import { PALABRA_SEMAFORO, type Semaforo } from "./por-pagar";

/** El emoji del semáforo. En WhatsApp SÍ va: es vocabulario nativo del canal. */
const EMOJI: Record<Semaforo, string> = {
  verde: "🟢",
  naranja: "🟠",
  rojo: "🔴",
  nuevo: "⚪",
};

export type CuotaDeAviso = {
  numero: number;
  cantidad_cuotas: number;
  monto: number;
  fecha_cobro: string;
};

export type AvisoPorPersona = {
  cliente_nombre: string;
  cliente_semaforo: Semaforo;
  cuotas: CuotaDeAviso[];
};

/** `"2026-08-12"` → `"12/8"`. Corto: en un WhatsApp el año sobra. */
function fechaCorta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${Number(dia)}/${Number(mes)}`;
}

/**
 * Cómo nombrar la cuota. Con `cantidad_cuotas = 1` se omite el "cuota n/total":
 * nadie dice "cuota 1 de 1" (§5).
 */
function nombrarCuota(c: CuotaDeAviso): string {
  return c.cantidad_cuotas > 1 ? `la cuota ${c.numero}/${c.cantidad_cuotas}` : "el cobro";
}

export function mensajePorVencer(aviso: AvisoPorPersona): string {
  const { cliente_nombre, cliente_semaforo, cuotas } = aviso;
  const semaforo = `(Cliente: ${PALABRA_SEMAFORO[cliente_semaforo]} ${EMOJI[cliente_semaforo]})`;

  if (cuotas.length === 1) {
    const c = cuotas[0];
    return (
      `🔔 Lithium — En 2 días vence ${nombrarCuota(c)} de *${cliente_nombre}*: ` +
      `${formatARS(c.monto)} el ${fechaCorta(c.fecha_cobro)}. ${semaforo}`
    );
  }

  const total = cuotas.reduce((s, c) => s + c.monto, 0);
  const detalle = cuotas
    .map((c) => `  · ${nombrarCuota(c)}: ${formatARS(c.monto)} el ${fechaCorta(c.fecha_cobro)}`)
    .join("\n");
  return (
    `🔔 Lithium — En 2 días *${cliente_nombre}* te tiene que pagar ${formatARS(total)}:\n` +
    `${detalle}\n${semaforo}`
  );
}

export function mensajeVencido(aviso: AvisoPorPersona): string {
  const { cliente_nombre, cuotas } = aviso;

  if (cuotas.length === 1) {
    const c = cuotas[0];
    return (
      `⚠️ Lithium — VENCIÓ ${nombrarCuota(c)} de *${cliente_nombre}*: ` +
      `${formatARS(c.monto)}, vencía el ${fechaCorta(c.fecha_cobro)}. ` +
      `Conviene seguirlo de cerca.`
    );
  }

  const total = cuotas.reduce((s, c) => s + c.monto, 0);
  const detalle = cuotas
    .map((c) => `  · ${nombrarCuota(c)}: ${formatARS(c.monto)}, vencía el ${fechaCorta(c.fecha_cobro)}`)
    .join("\n");
  return (
    `⚠️ Lithium — *${cliente_nombre}* te debe ${formatARS(total)} vencidos:\n` +
    `${detalle}\nConviene seguirlo de cerca.`
  );
}

/**
 * Manda un texto por Evolution API.
 *
 * El número va sin `+`, sin espacios y sin guiones — Evolution lo quiere así.
 * Se normaliza acá y no en quien llama, para que no haya dos formatos dando
 * vueltas.
 */
export async function enviarWhatsApp(
  config: { url: string; instancia: string; key: string },
  numero: string,
  texto: string,
): Promise<{ ok: boolean; error: string | null }> {
  const limpio = numero.replace(/[^\d]/g, "");
  if (limpio.length < 8) return { ok: false, error: `Número inválido: "${numero}"` };

  try {
    const r = await fetch(`${config.url}/message/sendText/${config.instancia}`, {
      method: "POST",
      headers: { apikey: config.key, "Content-Type": "application/json" },
      body: JSON.stringify({ number: limpio, text: texto }),
      signal: AbortSignal.timeout(20000),
    });

    if (!r.ok) return { ok: false, error: `Evolution ${r.status}: ${(await r.text()).slice(0, 200)}` };
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falló el envío" };
  }
}
