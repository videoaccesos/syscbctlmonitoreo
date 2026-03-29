import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/relay/ejecutar
 * Proxy hacia el servidor relay (puerto 5501) para enviar comandos
 * de apertura desde el softphone AccessPhone.
 * Evita problemas de CORS al pasar por el mismo dominio.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { trigger_value, residencial_id, source } = body;

    if (!trigger_value || !residencial_id) {
      return NextResponse.json(
        { error: "trigger_value y residencial_id son requeridos" },
        { status: 400 }
      );
    }

    // URL del servidor relay - mismo servidor, puerto 5501
    const relayUrl = process.env.RELAY_API_URL || "http://127.0.0.1:5501/api/relay/ejecutar";
    const relayApiKey = process.env.RELAY_API_KEY || "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (relayApiKey) {
      headers["X-API-Key"] = relayApiKey;
    }

    const relayRes = await fetch(relayUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        trigger_value,
        residencial_id,
        source: source || "softphone",
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const data = await relayRes.json();
    return NextResponse.json(data, { status: relayRes.status });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[RELAY] Error al ejecutar:", msg);
    return NextResponse.json(
      { ok: false, error: `Error de comunicación con relay: ${msg}` },
      { status: 502 }
    );
  }
}
