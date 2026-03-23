import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureGastosSchema } from "@/lib/ensure-gastos-schema";

// GET /api/catalogos/cuentas-gasto
export async function GET(request: NextRequest) {
  await ensureGastosSchema();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const estatus = searchParams.get("estatus") || "activos";
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = {};
    if (estatus === "activos") where.estatusId = 1;
    else if (estatus === "bajas") where.estatusId = { not: 1 };

    if (search) {
      where.OR = [
        { clave: { contains: search } },
        { descripcion: { contains: search } },
      ];
    }

    const cuentas = await prisma.cuentaGasto.findMany({
      where,
      orderBy: { clave: "asc" },
    });

    return NextResponse.json({ data: cuentas });
  } catch (error) {
    console.error("Error al listar cuentas de gasto:", error);
    return NextResponse.json({ error: "Error al obtener cuentas de gasto" }, { status: 500 });
  }
}

// POST /api/catalogos/cuentas-gasto
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clave, descripcion } = body;

    if (!clave?.trim() || !descripcion?.trim()) {
      return NextResponse.json(
        { error: "Clave y descripción son requeridos" },
        { status: 400 }
      );
    }

    // Verificar duplicado de clave
    const existente = await prisma.cuentaGasto.findFirst({
      where: { clave: clave.trim(), estatusId: 1 },
    });
    if (existente) {
      return NextResponse.json(
        { error: `Ya existe una cuenta con clave "${clave}"` },
        { status: 409 }
      );
    }

    const cuenta = await prisma.cuentaGasto.create({
      data: {
        clave: clave.trim(),
        descripcion: descripcion.trim(),
        estatusId: 1,
      },
    });

    return NextResponse.json(cuenta, { status: 201 });
  } catch (error) {
    console.error("Error al crear cuenta de gasto:", error);
    return NextResponse.json({ error: "Error al crear cuenta de gasto" }, { status: 500 });
  }
}
