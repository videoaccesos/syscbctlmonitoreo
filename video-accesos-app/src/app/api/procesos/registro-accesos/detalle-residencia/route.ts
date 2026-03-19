import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/registro-accesos/detalle-residencia?id=123
// Carga los detalles completos de una residencia (residentes, visitantes, teléfonos)
// Se llama solo al seleccionar una residencia específica
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "El parametro id es requerido" },
        { status: 400 }
      );
    }

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json(
        { error: "id debe ser un numero valido" },
        { status: 400 }
      );
    }

    const residencia = await prisma.residencia.findUnique({
      where: { id: idNum },
      select: {
        id: true,
        nroCasa: true,
        calle: true,
        telefono1: true,
        telefono2: true,
        interfon: true,
        telefonoInterfon: true,
        observaciones: true,
        estatusId: true,
        residentes: {
          where: { estatusId: 1 },
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
            celular: true,
            email: true,
            reportarAcceso: true,
          },
          orderBy: { apePaterno: "asc" },
        },
        visitas: {
          where: { estatusId: 1 },
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
            telefono: true,
            celular: true,
            observaciones: true,
          },
          orderBy: { apePaterno: "asc" },
        },
      },
    });

    if (!residencia) {
      return NextResponse.json(
        { error: "Residencia no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: residencia });
  } catch (error) {
    console.error("Error al obtener detalle de residencia:", error);
    return NextResponse.json(
      { error: "Error al obtener detalle de residencia" },
      { status: 500 }
    );
  }
}
