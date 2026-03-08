import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/registro-accesos/buscar-solicitante
// Busca solicitantes en las 3 tablas: residentes, visitantes y registros generales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!q || q.length < 1) {
      return NextResponse.json({ data: [] });
    }

    const results: Array<{
      id: string;
      nombre: string;
      tipo: "R" | "V" | "G";
      tipoLabel: string;
      celular: string;
      observaciones: string;
    }> = [];

    // Separar el texto de búsqueda en palabras para buscar cada una
    const palabras = q.trim().split(/\s+/).filter(Boolean);

    // Construir condición: cada palabra debe coincidir en al menos un campo
    const buildSearchCondition = (words: string[]) => {
      if (words.length <= 1) {
        return {
          OR: [
            { nombre: { contains: q } },
            { apePaterno: { contains: q } },
            { apeMaterno: { contains: q } },
          ],
        };
      }
      // Para múltiples palabras: cada palabra debe estar en algún campo (AND de ORs)
      return {
        AND: words.map((word) => ({
          OR: [
            { nombre: { contains: word } },
            { apePaterno: { contains: word } },
            { apeMaterno: { contains: word } },
          ],
        })),
      };
    };

    const searchCondition = buildSearchCondition(palabras);

    // 1. Buscar en residentes (sin filtro de residencia - es solo autocompletado)
    const residentes = await prisma.residente.findMany({
      where: {
        estatusId: 1,
        ...searchCondition,
      },
      select: {
        id: true,
        nombre: true,
        apePaterno: true,
        apeMaterno: true,
        celular: true,
      },
      take: limit,
      orderBy: { apePaterno: "asc" },
    });

    for (const r of residentes) {
      results.push({
        id: r.id,
        nombre: `${r.nombre} ${r.apePaterno} ${r.apeMaterno}`.trim(),
        tipo: "R",
        tipoLabel: "Residente",
        celular: r.celular || "",
        observaciones: "",
      });
    }

    // 2. Buscar en visitantes (sin filtro de residencia - es solo autocompletado)
    const visitantes = await prisma.visita.findMany({
      where: {
        estatusId: 1,
        ...searchCondition,
      },
      select: {
        id: true,
        nombre: true,
        apePaterno: true,
        apeMaterno: true,
        celular: true,
        observaciones: true,
      },
      take: limit,
      orderBy: { apePaterno: "asc" },
    });

    for (const v of visitantes) {
      results.push({
        id: v.id,
        nombre: `${v.nombre} ${v.apePaterno} ${v.apeMaterno}`.trim(),
        tipo: "V",
        tipoLabel: "Visitante",
        celular: v.celular || "",
        observaciones: v.observaciones || "",
      });
    }

    // 3. Buscar en registros generales (tabla puede no existir aun)
    try {
      const generales = await prisma.registroGeneral.findMany({
        where: {
          estatusId: 1,
          ...searchCondition,
        },
        select: {
          id: true,
          nombre: true,
          apePaterno: true,
          apeMaterno: true,
          celular: true,
          observaciones: true,
        },
        take: limit,
        orderBy: { apePaterno: "asc" },
      });

      for (const g of generales) {
        results.push({
          id: g.id,
          nombre: `${g.nombre} ${g.apePaterno} ${g.apeMaterno}`.trim(),
          tipo: "G",
          tipoLabel: "General",
          celular: g.celular || "",
          observaciones: g.observaciones || "",
        });
      }
    } catch {
      // La tabla registros_generales puede no existir; continuar sin error
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Error al buscar solicitantes:", error);
    return NextResponse.json(
      { error: "Error al buscar solicitantes" },
      { status: 500 }
    );
  }
}
