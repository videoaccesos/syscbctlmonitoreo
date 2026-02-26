import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/catalogos/tarjetas - Listar tarjetas con busqueda, filtros y paginacion
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const tipoId = searchParams.get("tipoId");
    const estatusId = searchParams.get("estatusId");
    const privadaId = searchParams.get("privadaId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Si hay filtro por privada, obtener los IDs de tarjetas asignadas a esa privada
    let tarjetaIdsForPrivada: number[] | null = null;
    if (privadaId) {
      const pid = parseInt(privadaId, 10);
      if (!isNaN(pid)) {
        const rows = await prisma.$queryRaw<Array<{ tid: string }>>`
          SELECT DISTINCT tid FROM (
            SELECT tarjeta_id AS tid FROM residencias_residentes_tarjetas WHERE privada = ${pid} AND tarjeta_id != ''
            UNION ALL
            SELECT tarjeta_id2 FROM residencias_residentes_tarjetas WHERE privada = ${pid} AND tarjeta_id2 != ''
            UNION ALL
            SELECT tarjeta_id3 FROM residencias_residentes_tarjetas WHERE privada = ${pid} AND tarjeta_id3 != ''
            UNION ALL
            SELECT tarjeta_id4 FROM residencias_residentes_tarjetas WHERE privada = ${pid} AND tarjeta_id4 != ''
            UNION ALL
            SELECT tarjeta_id5 FROM residencias_residentes_tarjetas WHERE privada = ${pid} AND tarjeta_id5 != ''
          ) AS t
        `;
        tarjetaIdsForPrivada = rows
          .map((r) => parseInt(r.tid, 10))
          .filter((n) => !isNaN(n));
      }
    }

    const where: Record<string, unknown> = {};

    // Filtro por tipoId (1=Peatonal, 2=Vehicular)
    if (tipoId) {
      const tipo = parseInt(tipoId, 10);
      if (!isNaN(tipo)) {
        where.tipoId = tipo;
      }
    }

    // Filtro por estatusId (1=Activa, 2=Asignada, 3=Danada, 4=Consignacion, 5=Baja)
    if (estatusId) {
      const estatus = parseInt(estatusId, 10);
      if (!isNaN(estatus)) {
        where.estatusId = estatus;
      }
    }

    // Busqueda por lectura
    if (search) {
      where.lectura = { contains: search };
    }

    // Filtrar por IDs de tarjetas de la privada
    if (tarjetaIdsForPrivada !== null) {
      if (tarjetaIdsForPrivada.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, limit });
      }
      where.id = { in: tarjetaIdsForPrivada };
    }

    const [tarjetas, total] = await Promise.all([
      prisma.tarjeta.findMany({
        where,
        orderBy: { fecha: "desc" },
        skip,
        take: limit,
      }),
      prisma.tarjeta.count({ where }),
    ]);

    // Buscar asignaciones de privada para las tarjetas devueltas
    const tarjetaIds = tarjetas.map((t) => String(t.id));
    let privadaMap: Record<string, { id: number; descripcion: string }> = {};

    if (tarjetaIds.length > 0) {
      // Buscar en la tabla de asignaciones cual privada tiene cada tarjeta
      const assignments = await prisma.$queryRaw<
        Array<{ tid: string; privada_id: number; descripcion: string }>
      >(Prisma.sql`
        SELECT DISTINCT t.tid, p.privada_id, p.descripcion
        FROM (
          SELECT tarjeta_id AS tid, privada FROM residencias_residentes_tarjetas WHERE tarjeta_id IN (${Prisma.join(tarjetaIds)})
          UNION ALL
          SELECT tarjeta_id2, privada FROM residencias_residentes_tarjetas WHERE tarjeta_id2 IN (${Prisma.join(tarjetaIds)})
          UNION ALL
          SELECT tarjeta_id3, privada FROM residencias_residentes_tarjetas WHERE tarjeta_id3 IN (${Prisma.join(tarjetaIds)})
          UNION ALL
          SELECT tarjeta_id4, privada FROM residencias_residentes_tarjetas WHERE tarjeta_id4 IN (${Prisma.join(tarjetaIds)})
          UNION ALL
          SELECT tarjeta_id5, privada FROM residencias_residentes_tarjetas WHERE tarjeta_id5 IN (${Prisma.join(tarjetaIds)})
        ) AS t
        INNER JOIN privadas p ON t.privada = p.privada_id
        WHERE t.tid != ''
      `);

      for (const row of assignments) {
        privadaMap[row.tid] = {
          id: row.privada_id,
          descripcion: row.descripcion,
        };
      }
    }

    const data = tarjetas.map((t) => ({
      ...t,
      privadaAsignada: privadaMap[String(t.id)] || null,
    }));

    return NextResponse.json({
      data,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error al listar tarjetas:", error);
    return NextResponse.json(
      { error: "Error al obtener tarjetas" },
      { status: 500 }
    );
  }
}

// POST /api/catalogos/tarjetas - Crear nueva tarjeta
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Validacion basica
    if (!body.lectura || body.lectura.trim() === "") {
      return NextResponse.json(
        { error: "La lectura es requerida" },
        { status: 400 }
      );
    }

    if (!body.tipoId) {
      return NextResponse.json(
        { error: "El tipo es requerido (1=Peatonal, 2=Vehicular)" },
        { status: 400 }
      );
    }

    const tipoId = parseInt(body.tipoId, 10);
    if (![1, 2].includes(tipoId)) {
      return NextResponse.json(
        { error: "El tipo debe ser 1 (Peatonal) o 2 (Vehicular)" },
        { status: 400 }
      );
    }

    // Verificar duplicado por lectura
    const existente = await prisma.tarjeta.findFirst({
      where: {
        lectura: body.lectura.trim(),
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe una tarjeta con esa lectura" },
        { status: 409 }
      );
    }

    const tarjeta = await prisma.tarjeta.create({
      data: {
        lectura: body.lectura.trim(),
        numeroSerie: body.numeroSerie?.trim() || "",
        tipoId,
        estatusId: body.estatusId ? parseInt(body.estatusId, 10) : 1,
        fecha: body.fecha ? new Date(body.fecha) : new Date(),
        usuarioModId: 0,
      },
    });

    return NextResponse.json(tarjeta, { status: 201 });
  } catch (error) {
    console.error("Error al crear tarjeta:", error);
    return NextResponse.json(
      { error: "Error al crear tarjeta" },
      { status: 500 }
    );
  }
}
