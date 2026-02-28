import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/asignacion-tarjetas - Listar asignaciones de AMBAS tablas (folio H y folio B)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const privadaId = searchParams.get("privadaId");
    const estatusId = searchParams.get("estatusId");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Construir condiciones WHERE dinamicamente
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (estatusId) {
      conditions.push("a.estatus_id = ?");
      params.push(parseInt(estatusId, 10));
    }

    if (privadaId) {
      conditions.push("p.privada_id = ?");
      params.push(parseInt(privadaId, 10));
    }

    if (search) {
      conditions.push(
        "(r.nombre LIKE ? OR r.ape_paterno LIKE ? OR r.ape_materno LIKE ?)"
      );
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // UNION ALL de ambas tablas de asignaciones
    // Usamos CAST(NULLIF(...)) para convertir fechas 0000-00-00 a NULL y evitar P2020
    const unionSql = `
      SELECT a.asignacion_id, a.tarjeta_id, a.tarjeta_id2, a.tarjeta_id3,
             a.tarjeta_id4, a.tarjeta_id5, a.residente_id,
             CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
             CAST(NULLIF(a.fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
             a.lectura_tipo_id, a.lectura_epc, a.folio_contrato,
             a.precio, a.estatus_id,
             a.observaciones, 'H' AS folio_tipo
      FROM residencias_residentes_tarjetas a
      UNION ALL
      SELECT a.asignacion_id, a.tarjeta_id, a.tarjeta_id2, a.tarjeta_id3,
             a.tarjeta_id4, a.tarjeta_id5, a.residente_id,
             CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
             NULL AS fecha_vencimiento,
             a.lectura_tipo_id, a.lectura_epc, a.folio_contrato,
             a.precio, a.estatus_id,
             a.observaciones, 'B' AS folio_tipo
      FROM residencias_residentes_tarjetas_no_renovacion a
    `;

    // Base FROM con JOINs a residente -> residencia -> privada
    const baseSql = `
      FROM (${unionSql}) a
      INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
      INNER JOIN residencias res ON r.residencia_id = res.residencia_id
      INNER JOIN privadas p ON res.privada_id = p.privada_id
      ${whereClause}
    `;

    // Count total (params duplicados para ambas condiciones)
    const countSql = `SELECT COUNT(*) AS total ${baseSql}`;

    // Data query con paginacion
    const dataSql = `
      SELECT a.asignacion_id, a.tarjeta_id, a.tarjeta_id2, a.tarjeta_id3,
             a.tarjeta_id4, a.tarjeta_id5, a.residente_id,
             a.fecha, a.fecha_vencimiento,
             a.lectura_tipo_id, a.lectura_epc, a.folio_contrato,
             a.precio, a.estatus_id,
             a.observaciones, a.folio_tipo,
             r.residente_id AS res_id, r.nombre AS res_nombre,
             r.ape_paterno AS res_ape_paterno, r.ape_materno AS res_ape_materno,
             res.residencia_id, res.nro_casa, res.calle,
             p.privada_id AS priv_id, p.descripcion AS priv_descripcion
      ${baseSql}
      ORDER BY a.folio_tipo ASC, a.asignacion_id DESC
      LIMIT ? OFFSET ?
    `;

    const [totalResult, rows] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ total: bigint }>>(countSql, ...params),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        dataSql,
        ...params,
        limit,
        skip
      ),
    ]);

    const total = Number(totalResult[0]?.total || 0);

    // Transformar filas planas a estructura anidada esperada por el frontend
    const data = rows.map((row) => ({
      id: row.asignacion_id,
      tarjetaId: row.tarjeta_id || null,
      tarjetaId2: row.tarjeta_id2 || null,
      tarjetaId3: row.tarjeta_id3 || null,
      tarjetaId4: row.tarjeta_id4 || null,
      tarjetaId5: row.tarjeta_id5 || null,
      residenteId: row.residente_id,
      fecha: row.fecha || null,
      fechaVencimiento: row.fecha_vencimiento || null,
      lecturaTipoId: row.lectura_tipo_id,
      lecturaEpc: row.lectura_epc,
      folioContrato: row.folio_contrato,
      precio: row.precio,
      estatusId: row.estatus_id,
      observaciones: row.observaciones,
      folioTipo: row.folio_tipo,
      tarjeta: null,
      residente: {
        id: row.res_id,
        nombre: row.res_nombre,
        apePaterno: row.res_ape_paterno,
        apeMaterno: row.res_ape_materno,
        residencia: {
          id: row.residencia_id,
          nroCasa: row.nro_casa,
          calle: row.calle,
          privada: {
            id: row.priv_id,
            descripcion: row.priv_descripcion,
          },
        },
      },
    }));

    return NextResponse.json({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error al listar asignaciones de tarjetas:", error);
    return NextResponse.json(
      { error: "Error al obtener asignaciones de tarjetas" },
      { status: 500 }
    );
  }
}

// POST /api/procesos/asignacion-tarjetas - Crear nueva asignacion de tarjeta
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const {
      tarjetaId,
      residenteId,
      tarjetaId2,
      tarjetaId3,
      tarjetaId4,
      tarjetaId5,
      fechaVencimiento,
      lecturaTipoId,
      lecturaEpc,
      folioContrato,
      precio,
      privada,
    } = body;

    // Validacion de campos requeridos
    if (!tarjetaId || !residenteId) {
      return NextResponse.json(
        { error: "Campos requeridos: tarjetaId, residenteId" },
        { status: 400 }
      );
    }

    // Validar que el residente existe y esta activo (residenteId is String char(8))
    const residente = await prisma.residente.findFirst({
      where: { id: String(residenteId), estatusId: 1 },
    });

    if (!residente) {
      return NextResponse.json(
        { error: "Residente no encontrado o no esta activo" },
        { status: 404 }
      );
    }

    // Crear asignacion
    const asignacion = await prisma.residenteTarjeta.create({
      data: {
        tarjetaId: String(tarjetaId) || "",
        tarjetaId2: tarjetaId2 ? String(tarjetaId2) : "",
        tarjetaId3: tarjetaId3 ? String(tarjetaId3) : "",
        tarjetaId4: tarjetaId4 ? String(tarjetaId4) : "",
        tarjetaId5: tarjetaId5 ? String(tarjetaId5) : "",
        residenteId: String(residenteId),
        privada: privada ? parseInt(privada, 10) : 0,
        fechaVencimiento: fechaVencimiento
          ? new Date(fechaVencimiento)
          : new Date(),
        lecturaTipoId: lecturaTipoId ? parseInt(lecturaTipoId, 10) : 0,
        lecturaEpc: lecturaEpc?.trim() || "",
        folioContrato: folioContrato?.trim() || "",
        precio: precio ? parseFloat(precio) : 0,
      },
      include: {
        residente: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
            residencia: {
              select: {
                id: true,
                nroCasa: true,
                calle: true,
                privada: {
                  select: {
                    id: true,
                    descripcion: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(asignacion, { status: 201 });
  } catch (error) {
    console.error("Error al crear asignacion de tarjeta:", error);
    return NextResponse.json(
      { error: "Error al crear asignacion de tarjeta" },
      { status: 500 }
    );
  }
}
