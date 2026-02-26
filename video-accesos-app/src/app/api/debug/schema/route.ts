import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// TEMPORAL: Endpoint para ver las columnas reales de las tablas.
// Eliminar después de corregir el schema.
export async function GET() {
  try {
    const tables = [
      "privadas",
      "residencias",
      "residencias_residentes",
    ];

    const result: Record<string, unknown[]> = {};
    for (const table of tables) {
      result[table] = await prisma.$queryRawUnsafe(`DESCRIBE ${table}`);
    }

    return NextResponse.json(result, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
