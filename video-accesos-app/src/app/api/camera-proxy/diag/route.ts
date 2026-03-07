import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET /api/camera-proxy/diag
// Endpoint de diagnostico que devuelve info util para depurar problemas de conexion
// Se puede consultar desde el browser o curl para ver el estado del proxy

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const diagInfo = {
    timestamp: new Date().toISOString(),
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: `${Math.round(process.uptime())}s`,
      memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    network: {
      note: "Para probar conectividad a un DVR especifico, usa /api/camera-proxy/diag?test_url=http://host:port/path",
    },
    instructions: {
      browserConsole: [
        "window.__sipDiag()       - Ver log completo de conexion SIP/WebSocket",
        "window.__sipDiagSummary() - Ver resumen de eventos SIP",
        "window.__camDiag()       - Ver log completo de fetch de imagenes",
        "window.__camDiagStats()  - Ver estadisticas por camara (loads/errors)",
      ],
      serverLogs: [
        "Los logs del server muestran el pipeline completo de cada request:",
        "[r123] +0ms AUTH_CHECK -> +5ms AUTH_OK -> +6ms PARAMS -> +50ms FETCH_START -> ...",
        "Busca 'FALLO' en logs del server para ver requests fallidos con detalle",
        "Busca 'SEMAPHORE_WAIT' para ver si hay cuellos de botella por host",
      ],
      troubleshooting: [
        "1. Abre la consola del browser (F12 > Console)",
        "2. Busca mensajes [DIAG-SIP] para problemas de telefono/WebSocket",
        "3. Busca mensajes [DIAG-CAM] para problemas de camaras/imagenes",
        "4. Si ves 'IMG_STUCK' -> la camara no responde o hay bloqueo de red",
        "5. Si ves 'WS_DISCONNECTED' -> el WebSocket se desconecto (ver reason/code)",
        "6. Si ves 'ICE_CANDIDATE_ERROR' -> problema de NAT/firewall para audio",
        "7. Si ves 'NONCE_STALE' frecuente -> el DVR invalida nonces rapido",
      ],
    },
  };

  return NextResponse.json(diagInfo, {
    headers: { "Cache-Control": "no-cache" },
  });
}
