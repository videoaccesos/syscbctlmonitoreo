import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/registro-accesos/buscar-solicitante
// Busca solicitantes en visitantes y registros generales
// Los residentes NO se incluyen aquí: el monitorista los coteja
// desde la sección de residentes de la residencia seleccionada
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
      nombrePila: string;
      apePaterno: string;
      apeMaterno: string;
      tipo: "V" | "G";
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

    // Helper: when apePaterno/apeMaterno are empty but nombre contains
    // multiple words (legacy data), split nombre into parts so the modal
    // can pre-fill the fields correctly.
    function splitNameParts(row: { nombre: string; apePaterno: string; apeMaterno: string }) {
      const nom = (row.nombre || "").trim();
      const pat = (row.apePaterno || "").trim();
      const mat = (row.apeMaterno || "").trim();

      // If apellidos are already populated, use them as-is
      if (pat) {
        return { nombrePila: nom, apePaterno: pat, apeMaterno: mat };
      }

      // Legacy data: full name stored in nombre, apellidos empty
      // Try to split: last two words → apePaterno + apeMaterno, rest → nombre
      const parts = nom.split(/\s+/);
      if (parts.length >= 3) {
        return {
          nombrePila: parts.slice(0, -2).join(" "),
          apePaterno: parts[parts.length - 2],
          apeMaterno: parts[parts.length - 1],
        };
      }
      if (parts.length === 2) {
        return { nombrePila: parts[0], apePaterno: parts[1], apeMaterno: "" };
      }
      return { nombrePila: nom, apePaterno: "", apeMaterno: "" };
    }

    // 1. Buscar en visitantes (sin filtro de residencia - es solo autocompletado)
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
      const parsed = splitNameParts(v);
      results.push({
        id: v.id,
        nombre: `${v.nombre} ${v.apePaterno} ${v.apeMaterno}`.trim(),
        nombrePila: parsed.nombrePila,
        apePaterno: parsed.apePaterno,
        apeMaterno: parsed.apeMaterno,
        tipo: "V",
        tipoLabel: "Visitante",
        celular: v.celular || "",
        observaciones: v.observaciones || "",
      });
    }

    // 2. Buscar en registros generales (tabla puede no existir aun)
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
        const parsed = splitNameParts(g);
        results.push({
          id: g.id,
          nombre: `${g.nombre} ${g.apePaterno} ${g.apeMaterno}`.trim(),
          nombrePila: parsed.nombrePila,
          apePaterno: parsed.apePaterno,
          apeMaterno: parsed.apeMaterno,
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
