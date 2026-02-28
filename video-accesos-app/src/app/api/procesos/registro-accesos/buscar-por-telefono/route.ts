import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/registro-accesos/buscar-por-telefono?telefono=123456
// Busca residencia por telefono_interfon para identificar llamadas entrantes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const telefono = searchParams.get("telefono");

    if (!telefono || telefono.trim() === "") {
      return NextResponse.json(
        { error: "El parametro telefono es requerido" },
        { status: 400 }
      );
    }

    // Buscar residencia cuyo telefonoInterfon coincida con el numero entrante
    // Probamos coincidencia exacta y tambien sin prefijos comunes
    const cleanNumber = telefono.replace(/\D/g, "");

    const residencia = await prisma.residencia.findFirst({
      where: {
        telefonoInterfon: {
          not: "",
        },
        estatusId: { in: [1, 2, 3] },
        OR: [
          { telefonoInterfon: cleanNumber },
          { telefonoInterfon: telefono },
          // Buscar ultimos 10 digitos por si viene con codigo de pais
          ...(cleanNumber.length > 10
            ? [{ telefonoInterfon: cleanNumber.slice(-10) }]
            : []),
        ],
      },
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
        privada: {
          select: {
            id: true,
            descripcion: true,
          },
        },
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
        { found: false, message: "No se encontro residencia con ese telefono" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      found: true,
      data: residencia,
    });
  } catch (error) {
    console.error("Error al buscar residencia por telefono:", error);
    return NextResponse.json(
      { error: "Error al buscar residencia por telefono" },
      { status: 500 }
    );
  }
}
