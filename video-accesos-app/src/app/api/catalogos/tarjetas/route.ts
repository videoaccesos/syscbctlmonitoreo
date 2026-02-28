import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helper: construir placeholders para IN clause
function placeholders(count: number): string {
  return Array(count).fill("?").join(",");
}

// SQL helper: genera las 5 ramas UNION ALL para buscar en los 5 slots de tarjeta
// de AMBAS tablas de asignacion (folio H y folio B)
function unionTarjetaSlots(
  tableAlias: string,
  table: string,
  condition: string,
  selectExtra: string = ""
): string {
  const slots = ["tarjeta_id", "tarjeta_id2", "tarjeta_id3", "tarjeta_id4", "tarjeta_id5"];
  return slots
    .map(
      (slot) =>
        `SELECT ${tableAlias}.${slot} AS tid${selectExtra ? ", " + selectExtra : ""} FROM ${table} ${tableAlias}
         INNER JOIN residencias_residentes res ON ${tableAlias}.residente_id = res.residente_id
         INNER JOIN residencias r ON res.residencia_id = r.residencia_id
         WHERE ${condition} AND ${tableAlias}.${slot} != ''`
    )
    .join("\nUNION ALL\n");
}

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
    // Busca en AMBAS tablas: folio H (con renovacion) y folio B (sin renovacion)
    let tarjetaIdsForPrivada: number[] | null = null;
    if (privadaId) {
      const pid = parseInt(privadaId, 10);
      if (!isNaN(pid)) {
        const sqlH = unionTarjetaSlots("rrt", "residencias_residentes_tarjetas", "r.privada_id = ?");
        const sqlB = unionTarjetaSlots("rrt", "residencias_residentes_tarjetas_no_renovacion", "r.privada_id = ?");

        const rows = await prisma.$queryRawUnsafe<Array<{ tid: string }>>(
          `SELECT DISTINCT tid FROM (${sqlH} UNION ALL ${sqlB}) AS t`,
          // 5 params para tabla H + 5 params para tabla B
          pid, pid, pid, pid, pid, pid, pid, pid, pid, pid
        );
        tarjetaIdsForPrivada = rows
          .map((r) => parseInt(r.tid, 10))
          .filter((n) => !isNaN(n));
      }
    }

    const where: Record<string, unknown> = {};

    if (tipoId) {
      const tipo = parseInt(tipoId, 10);
      if (!isNaN(tipo)) where.tipoId = tipo;
    }

    if (estatusId) {
      const estatus = parseInt(estatusId, 10);
      if (!isNaN(estatus)) where.estatusId = estatus;
    }

    if (search) {
      where.lectura = { contains: search };
    }

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
    // Busca en AMBAS tablas de asignacion via residente -> residencia -> privada
    const tarjetaIds = tarjetas.map((t) => String(t.id));
    const privadaMap: Record<string, { id: number; descripcion: string }> = {};

    if (tarjetaIds.length > 0) {
      const ph = placeholders(tarjetaIds.length);

      // Tabla H: residencias_residentes_tarjetas
      const slotsH = ["tarjeta_id", "tarjeta_id2", "tarjeta_id3", "tarjeta_id4", "tarjeta_id5"];
      const unionsH = slotsH.map(
        (s) => `SELECT rrt.${s} AS tid, rrt.residente_id FROM residencias_residentes_tarjetas rrt WHERE rrt.${s} IN (${ph}) AND rrt.${s} != ''`
      ).join("\nUNION ALL\n");

      // Tabla B: residencias_residentes_tarjetas_no_renovacion
      const unionsB = slotsH.map(
        (s) => `SELECT rrt.${s} AS tid, rrt.residente_id FROM residencias_residentes_tarjetas_no_renovacion rrt WHERE rrt.${s} IN (${ph}) AND rrt.${s} != ''`
      ).join("\nUNION ALL\n");

      // 10 juegos de parametros: 5 para H + 5 para B
      const params = Array(10).fill(tarjetaIds).flat();

      const assignments = await prisma.$queryRawUnsafe<
        Array<{ tid: string; privada_id: number; descripcion: string }>
      >(
        `SELECT DISTINCT sub.tid, p.privada_id, p.descripcion
         FROM (${unionsH} UNION ALL ${unionsB}) sub
         INNER JOIN residencias_residentes res ON sub.residente_id = res.residente_id
         INNER JOIN residencias r ON res.residencia_id = r.residencia_id
         INNER JOIN privadas p ON r.privada_id = p.privada_id`,
        ...params
      );

      for (const row of assignments) {
        if (!privadaMap[row.tid]) {
          privadaMap[row.tid] = {
            id: row.privada_id,
            descripcion: row.descripcion,
          };
        }
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

    const existente = await prisma.tarjeta.findFirst({
      where: { lectura: body.lectura.trim() },
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
