import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getGateConfig,
  setGateConfig,
  deleteGateConfig,
  listGateConfigs,
  startGateMonitor,
  type GateConfig,
} from "@/lib/gate-monitor";

/**
 * GET /api/gate-monitor/config?site_id=72&cam_id=3
 * Lista configuraciones de monitoreo. Sin params = todas.
 *
 * PUT /api/gate-monitor/config
 * Crear o actualizar configuracion de monitoreo.
 *
 * DELETE /api/gate-monitor/config?site_id=72&cam_id=3
 * Eliminar configuracion.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("site_id");
  const camId = searchParams.get("cam_id");

  if (siteId && camId) {
    const config = getGateConfig(siteId, parseInt(camId));
    if (!config) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, config });
  }

  return NextResponse.json({ ok: true, configs: listGateConfigs() });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { site_id, cam_id, roi, threshold, debounce_sec, interval_sec, enabled, alias } = body;

    if (!site_id || !cam_id) {
      return NextResponse.json({ error: "Se requieren site_id y cam_id" }, { status: 400 });
    }

    if (!roi || typeof roi.x !== "number" || typeof roi.y !== "number" ||
        typeof roi.width !== "number" || typeof roi.height !== "number") {
      return NextResponse.json({ error: "ROI invalido: se requieren x, y, width, height (0-1)" }, { status: 400 });
    }

    // Obtener config existente o crear nueva
    const existing = getGateConfig(String(site_id), parseInt(cam_id));

    const config: GateConfig = {
      siteId: String(site_id),
      camId: parseInt(cam_id),
      roi: {
        x: Math.max(0, Math.min(1, roi.x)),
        y: Math.max(0, Math.min(1, roi.y)),
        width: Math.max(0.01, Math.min(1, roi.width)),
        height: Math.max(0.01, Math.min(1, roi.height)),
      },
      referenceHistogram: existing?.referenceHistogram || null,
      referenceImageB64: existing?.referenceImageB64 || null,
      threshold: threshold ?? existing?.threshold ?? 0.3,
      consecutiveThreshold: body.consecutive_threshold ?? existing?.consecutiveThreshold ?? 4,
      intervalSec: interval_sec ?? existing?.intervalSec ?? 300,
      enabled: enabled ?? existing?.enabled ?? true,
      alias: alias || existing?.alias || `Porton cam ${cam_id}`,
    };

    setGateConfig(config);

    // Asegurar que el monitor este corriendo
    startGateMonitor();

    return NextResponse.json({ ok: true, config });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("site_id");
  const camId = searchParams.get("cam_id");

  if (!siteId || !camId) {
    return NextResponse.json({ error: "Se requieren site_id y cam_id" }, { status: 400 });
  }

  deleteGateConfig(siteId, parseInt(camId));
  return NextResponse.json({ ok: true });
}
