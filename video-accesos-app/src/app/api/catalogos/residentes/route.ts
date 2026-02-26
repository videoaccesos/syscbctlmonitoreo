import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Generar un ID unico de 8 caracteres para residente
async function generateResidenteId(): Promise<string> {
  const result = await prisma.$queryRawUnsafe<Array<{ maxId: string | null }>>(
    `SELECT MAX(CAST(residente_id AS UNSIGNED)) AS maxId FROM residencias_residentes`
  );
  const maxNum = parseInt(result[0]?.maxId || "0", 10) || 0;
  const nextNum = maxNum + 1;
  return String(nextNum).padStart(8, "0");
}

// POST /api/catalogos/residentes - Crear residente
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { residenciaId, nombre, apePaterno, apeMaterno, celular, email } =
      body;

    if (!residenciaId || !nombre?.trim()) {
      return NextResponse.json(
        { error: "Residencia y nombre son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que la residencia existe
    const residencia = await prisma.residencia.findUnique({
      where: { id: parseInt(residenciaId, 10) },
    });
    if (!residencia) {
      return NextResponse.json(
        { error: "Residencia no encontrada" },
        { status: 404 }
      );
    }

    const newId = await generateResidenteId();

    const residente = await prisma.residente.create({
      data: {
        id: newId,
        residenciaId: parseInt(residenciaId, 10),
        nombre: nombre.trim(),
        apePaterno: apePaterno?.trim() || "",
        apeMaterno: apeMaterno?.trim() || "",
        celular: celular?.trim() || "",
        email: email?.trim() || "",
        estatusId: 1,
        usuarioModId: 0,
      },
    });

    return NextResponse.json(residente, { status: 201 });
  } catch (error) {
    console.error("Error al crear residente:", error);
    return NextResponse.json(
      { error: "Error al crear residente" },
      { status: 500 }
    );
  }
}
