import { createClient } from "@supabase/supabase-js";

import { hoyEnBA, sumarDias } from "@/lib/fecha";
import type { Semaforo } from "@/lib/por-pagar";
import {
  enviarWhatsApp,
  mensajePorVencer,
  mensajeVencido,
  type AvisoPorPersona,
} from "@/lib/whatsapp";

/**
 * Cron diario de alertas. Ver CLAUDE.md §4.
 *
 * Lo dispara Vercel Cron con `"schedule": "0 12 * * *"` en `vercel.json`.
 * **Los crons de Vercel corren en UTC**, así que las 12:00 UTC son las 9:00 de
 * Argentina. Ese archivo no admite comentarios ni un campo `comment` —el build
 * falla con "should NOT have additional property"— así que la explicación del
 * horario vive acá.
 *
 * Hace tres cosas, en este orden:
 *
 *   1. `marcar_vencidas()` — pone en 'vencido' lo que se pasó de fecha.
 *   2. Avisa lo que vence **en 2 días**.
 *   3. Avisa lo que **ya venció**.
 *
 * **Idempotente por la base, no por el código.** Antes de mandar, inserta la
 * fila en `alertas`, que tiene `unique(cuota_id, tipo, fecha_envio)`. Si el
 * cron corre dos veces el mismo día, el segundo insert rebota y no se manda
 * nada. Se inserta ANTES de enviar a propósito: mejor perder un aviso que
 * mandarlo dos veces.
 *
 * Usa la service_role key porque no hay usuario logueado: es un proceso.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type FilaCuota = {
  id: string;
  numero: number;
  monto: number | string;
  fecha_cobro: string;
  creditos: {
    cantidad_cuotas: number;
    clientes: { id: string; nombre: string; semaforo_efectivo: Semaforo };
  };
};

function agrupar(filas: FilaCuota[]): Map<string, AvisoPorPersona> {
  // Una persona = un mensaje, aunque le venzan tres cuotas (§4.4).
  const porPersona = new Map<string, AvisoPorPersona>();
  for (const f of filas) {
    const cliente = f.creditos.clientes;
    const aviso = porPersona.get(cliente.id) ?? {
      cliente_nombre: cliente.nombre,
      cliente_semaforo: cliente.semaforo_efectivo,
      cuotas: [],
    };
    aviso.cuotas.push({
      numero: f.numero,
      cantidad_cuotas: f.creditos.cantidad_cuotas,
      monto: Number(f.monto),
      fecha_cobro: f.fecha_cobro,
    });
    porPersona.set(cliente.id, aviso);
  }
  return porPersona;
}

export async function GET(pedido: Request) {
  // Vercel manda este header en sus crons. Sin el chequeo, cualquiera con la
  // URL dispara los WhatsApp de Candela.
  const secreto = process.env.CRON_SECRET;
  const autorizacion = pedido.headers.get("authorization");
  if (secreto && autorizacion !== `Bearer ${secreto}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const destino = process.env.CANDELA_WHATSAPP;
  const evolution = {
    url: process.env.EVOLUTION_URL ?? "",
    instancia: process.env.EVOLUTION_INSTANCE ?? "",
    key: process.env.EVOLUTION_KEY ?? "",
  };

  const faltan = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !servicio && "SUPABASE_SERVICE_ROLE_KEY",
    !destino && "CANDELA_WHATSAPP",
    !evolution.url && "EVOLUTION_URL",
    !evolution.instancia && "EVOLUTION_INSTANCE",
    !evolution.key && "EVOLUTION_KEY",
  ].filter(Boolean);

  if (faltan.length > 0) {
    console.error("[cron] faltan variables de entorno:", faltan.join(", "));
    return Response.json({ error: "Faltan variables de entorno", faltan }, { status: 500 });
  }

  const supabase = createClient(url!, servicio!, { auth: { persistSession: false } });
  const hoy = hoyEnBA();
  const seco = new URL(pedido.url).searchParams.get("seco") === "1";

  const registro = { hoy, seco, marcadasVencidas: 0, porVencer: 0, vencidos: 0, errores: [] as string[] };

  // 1. Marcar vencidas ANTES de mirar nada.
  const { data: marcadas, error: errorMarcar } = await supabase.rpc("marcar_vencidas");
  if (errorMarcar) registro.errores.push(`marcar_vencidas: ${errorMarcar.message}`);
  else registro.marcadasVencidas = Number(marcadas ?? 0);

  const SELECT =
    "id,numero,monto,fecha_cobro,creditos!inner(cantidad_cuotas,clientes!inner(id,nombre,semaforo_efectivo))";

  async function procesar(tipo: "por_vencer" | "vencido", filas: FilaCuota[]) {
    let enviados = 0;
    for (const [, aviso] of agrupar(filas)) {
      const ids = filas
        .filter((f) => f.creditos.clientes.nombre === aviso.cliente_nombre)
        .map((f) => f.id);

      // La fila va PRIMERO: si el insert rebota por el unique, ya se avisó hoy.
      const { error } = await supabase
        .from("alertas")
        .insert(ids.map((cuota_id) => ({ cuota_id, tipo, fecha_envio: hoy })));

      if (error) continue; // duplicado: ya se mandó hoy

      const texto = tipo === "por_vencer" ? mensajePorVencer(aviso) : mensajeVencido(aviso);
      if (seco) {
        console.log(`[cron] (seco) ${texto}`);
        enviados++;
        continue;
      }

      const r = await enviarWhatsApp(evolution, destino!, texto);
      if (r.ok) enviados++;
      else registro.errores.push(`${aviso.cliente_nombre}: ${r.error}`);
    }
    return enviados;
  }

  // 2. Vence en 2 días.
  const { data: proximas, error: errorProximas } = await supabase
    .from("cuotas")
    .select(SELECT)
    .is("pagado_el", null)
    .eq("fecha_cobro", sumarDias(hoy, 2));
  if (errorProximas) registro.errores.push(`por_vencer: ${errorProximas.message}`);
  else registro.porVencer = await procesar("por_vencer", (proximas ?? []) as unknown as FilaCuota[]);

  // 3. Ya vencidas.
  const { data: vencidas, error: errorVencidas } = await supabase
    .from("cuotas")
    .select(SELECT)
    .is("pagado_el", null)
    .lt("fecha_cobro", hoy);
  if (errorVencidas) registro.errores.push(`vencido: ${errorVencidas.message}`);
  else registro.vencidos = await procesar("vencido", (vencidas ?? []) as unknown as FilaCuota[]);

  console.log("[cron] alertas:", JSON.stringify(registro));
  return Response.json(registro);
}
