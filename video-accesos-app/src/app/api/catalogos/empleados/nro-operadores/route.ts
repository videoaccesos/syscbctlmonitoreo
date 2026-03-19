import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/empleados/nro-operadores - Listar numeros de operador en uso
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const empleados = await prisma.empleado.findMany({
      where: {
        estatusId: 1,
        nroOperador: { not: "" },
      },
      select: {
        id: true,
        nroOperador: true,
        nombre: true,
        apePaterno: true,
      },
      orderBy: { nroOperador: "asc" },
    });

    return NextResponse.json(empleados);
  } catch (error) {
    console.error("Error al obtener nros operador:", error);
    return NextResponse.json(
      { error: "Error al obtener numeros de operador" },
      { status: 500 }
    );
  }
}
