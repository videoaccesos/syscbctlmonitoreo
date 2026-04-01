import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCameraOrder, setCameraOrder } from "@/lib/frame-store";

// GET /api/camera-proxy/order?privada_id=72
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const privadaId = searchParams.get("privada_id");
  if (!privadaId) {
    return NextResponse.json({ error: "privada_id requerido" }, { status: 400 });
  }

  const order = getCameraOrder(privadaId);
  return NextResponse.json({ privada_id: privadaId, order: order || [] });
}

// PUT /api/camera-proxy/order
// Body: { privada_id: "72", order: [3, 1, 5, 2, 4, 6, 7, 8] }
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { privada_id, order } = body;

    if (!privada_id) {
      return NextResponse.json({ error: "privada_id requerido" }, { status: 400 });
    }
    if (!Array.isArray(order) || !order.every((n: unknown) => typeof n === "number")) {
      return NextResponse.json({ error: "order debe ser un array de numeros" }, { status: 400 });
    }

    setCameraOrder(String(privada_id), order);
    return NextResponse.json({ ok: true, privada_id, order });
  } catch {
    return NextResponse.json({ error: "Error al guardar orden" }, { status: 500 });
  }
}
