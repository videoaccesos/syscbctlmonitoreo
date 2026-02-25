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

// POST /api/procesos/registro-accesos/registrar-general
// Registra una persona en el registro general (no residente, no visitante)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { nombre, apePaterno, apeMaterno, telefono, celular, email, observaciones } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: "Se requiere al menos el nombre" },
        { status: 400 }
      );
    }

    const user = session.user as Record<string, unknown>;
    const usuarioId = (user?.usuarioId as number) || 0;

    // Generar ID unico de 8 digitos
    let registroId = generarId();
    let existe = true;
    let intentos = 0;
    while (existe && intentos < 10) {
      const found = await prisma.registroGeneral.findUnique({ where: { id: registroId } });
      if (!found) {
        existe = false;
      } else {
        registroId = generarId();
        intentos++;
      }
    }

    const registro = await prisma.registroGeneral.create({
      data: {
        id: registroId,
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
      id: registro.id,
      nombre: `${registro.nombre} ${registro.apePaterno} ${registro.apeMaterno}`.trim(),
      tipo: "G",
    }, { status: 201 });
  } catch (error) {
    console.error("Error al registrar en registro general:", error);
    return NextResponse.json(
      { error: "Error al registrar persona" },
      { status: 500 }
    );
  }
}
