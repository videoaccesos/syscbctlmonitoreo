import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/registro-accesos/resolver-nombre?ids=id1,id2,id3
// Resuelve los nombres de solicitantes a partir de sus IDs (busca en las 3 tablas)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids") || "";

    if (!idsParam) {
      return NextResponse.json({ data: {} });
    }

    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ data: {} });
    }

    const nombres: Record<string, { nombre: string; tipo: string }> = {};

    // Buscar en residentes
    const residentes = await prisma.residente.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true, apePaterno: true, apeMaterno: true },
    });
    for (const r of residentes) {
      nombres[r.id] = {
        nombre: `${r.nombre} ${r.apePaterno} ${r.apeMaterno}`.trim(),
        tipo: "R",
      };
    }

    // IDs restantes
    const remaining1 = ids.filter((id) => !nombres[id]);
    if (remaining1.length > 0) {
      const visitantes = await prisma.visita.findMany({
        where: { id: { in: remaining1 } },
        select: { id: true, nombre: true, apePaterno: true, apeMaterno: true },
      });
      for (const v of visitantes) {
        nombres[v.id] = {
          nombre: `${v.nombre} ${v.apePaterno} ${v.apeMaterno}`.trim(),
          tipo: "V",
        };
      }
    }

    // IDs restantes - buscar en registros generales (tabla puede no existir aun)
    const remaining2 = ids.filter((id) => !nombres[id]);
    if (remaining2.length > 0) {
      try {
        const generales = await prisma.registroGeneral.findMany({
          where: { id: { in: remaining2 } },
          select: { id: true, nombre: true, apePaterno: true, apeMaterno: true },
        });
        for (const g of generales) {
          nombres[g.id] = {
            nombre: `${g.nombre} ${g.apePaterno} ${g.apeMaterno}`.trim(),
            tipo: "G",
          };
        }
      } catch {
        // La tabla registros_generales puede no existir; continuar sin error
      }
    }

    return NextResponse.json({ data: nombres });
  } catch (error) {
    console.error("Error al resolver nombres:", error);
    return NextResponse.json(
      { error: "Error al resolver nombres" },
      { status: 500 }
    );
  }
}
