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
  type GateZone,
} from "@/lib/gate-monitor";
import crypto from "crypto";

/**
 * GET /api/gate-monitor/config?site_id=72&cam_id=3
 * Lista configuraciones de monitoreo. Sin params = todas.
 *
 * PUT /api/gate-monitor/config
 * Crear o actualizar configuracion (con zonas).
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
    const { site_id, cam_id, interval_sec, zones } = body;

    if (!site_id || !cam_id) {
      return NextResponse.json({ error: "Se requieren site_id y cam_id" }, { status: 400 });
    }

    if (!zones || !Array.isArray(zones) || zones.length === 0) {
      return NextResponse.json({ error: "Se requiere al menos una zona" }, { status: 400 });
    }

    if (zones.length > 3) {
      return NextResponse.json({ error: "Maximo 3 zonas por camara" }, { status: 400 });
    }

    // Validar cada zona
    const existing = getGateConfig(String(site_id), parseInt(cam_id));
    const existingZonesMap = new Map<string, GateZone>();
    if (existing) {
      for (const z of existing.zones) existingZonesMap.set(z.id, z);
    }

    const parsedZones: GateZone[] = zones.map((z: Record<string, unknown>) => {
      const roi = z.roi as Record<string, number> | undefined;
      if (!roi || typeof roi.x !== "number" || typeof roi.y !== "number" ||
          typeof roi.width !== "number" || typeof roi.height !== "number") {
        throw new Error("Cada zona requiere un ROI valido con x, y, width, height");
      }

      const zoneId = (z.id as string) || crypto.randomUUID();
      const prev = existingZonesMap.get(zoneId);

      return {
        id: zoneId,
        roi: {
          x: Math.max(0, Math.min(1, roi.x)),
          y: Math.max(0, Math.min(1, roi.y)),
          width: Math.max(0.01, Math.min(1, roi.width)),
          height: Math.max(0.01, Math.min(1, roi.height)),
        },
        alias: (z.alias as string) || prev?.alias || `Zona ${zones.indexOf(z) + 1}`,
        threshold: (z.threshold as number) ?? prev?.threshold ?? 0.3,
        consecutiveThreshold: (z.consecutive_threshold as number) ?? prev?.consecutiveThreshold ?? 4,
        referenceHistogram: null,
        referencePixelsB64: prev?.referencePixelsB64 || null,
        referenceImageB64: prev?.referenceImageB64 || null,
        enabled: (z.enabled as boolean) ?? prev?.enabled ?? true,
      };
    });

    // Validar telefonos (formato Twilio: solo digitos, 10-15 chars)
    const rawPhones = Array.isArray(body.notify_phones) ? body.notify_phones : existing?.notifyPhones || [];
    const notifyPhones: string[] = rawPhones
      .map((p: string) => String(p).replace(/\D/g, ""))
      .filter((p: string) => p.length >= 10 && p.length <= 15);

    const config: GateConfig = {
      siteId: String(site_id),
      camId: parseInt(cam_id),
      privadaName: body.privada_name || existing?.privadaName || undefined,
      intervalSec: interval_sec ?? existing?.intervalSec ?? 300,
      zones: parsedZones,
      notifyPhones,
    };

    setGateConfig(config);
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
