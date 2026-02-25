import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generarId(): string {
  const chars = "0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// POST /api/procesos/registro-accesos/registrar-visitante
// Registra un nuevo visitante para una residencia durante el proceso de registro de acceso
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { residenciaId, nombre, apePaterno, apeMaterno, telefono, celular, email, observaciones } = body;

    if (!residenciaId || !nombre) {
      return NextResponse.json(
        { error: "Se requiere residenciaId y nombre" },
        { status: 400 }
      );
    }

    const user = session.user as Record<string, unknown>;
    const usuarioId = (user?.usuarioId as number) || 0;

    // Generar ID unico de 8 digitos
    let visitanteId = generarId();
    let existe = true;
    let intentos = 0;
    while (existe && intentos < 10) {
      const found = await prisma.visita.findUnique({ where: { id: visitanteId } });
      if (!found) {
        existe = false;
      } else {
        visitanteId = generarId();
        intentos++;
      }
    }

    const visitante = await prisma.visita.create({
      data: {
        id: visitanteId,
        residenciaId: parseInt(residenciaId, 10),
        nombre: nombre?.trim() || "",
        apePaterno: apePaterno?.trim() || "",
        apeMaterno: apeMaterno?.trim() || "",
        telefono: telefono?.trim() || "",
        celular: celular?.trim() || "",
        email: email?.trim() || "",
        observaciones: observaciones?.trim() || "",
        estatusId: 1,
        usuarioModId: usuarioId,
      },
    });

    return NextResponse.json({
      id: visitante.id,
      nombre: `${visitante.nombre} ${visitante.apePaterno} ${visitante.apeMaterno}`.trim(),
      tipo: "V",
    }, { status: 201 });
  } catch (error) {
    console.error("Error al registrar visitante:", error);
    return NextResponse.json(
      { error: "Error al registrar visitante" },
      { status: 500 }
    );
  }
}
