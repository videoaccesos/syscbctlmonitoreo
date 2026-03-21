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
    const folioTipo = searchParams.get("folioTipo");
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
        "(r.nombre LIKE ? OR r.ape_paterno LIKE ? OR r.ape_materno LIKE ? OR res.nro_casa LIKE ? OR res.calle LIKE ?)"
      );
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // UNION ALL de ambas tablas de asignaciones (o solo una si hay filtro de folioTipo)
    // Usamos CAST(NULLIF(...)) para convertir fechas 0000-00-00 a NULL y evitar P2020
    const sqlH = `
      SELECT a.asignacion_id, a.tarjeta_id, a.tarjeta_id2, a.tarjeta_id3,
             a.tarjeta_id4, a.tarjeta_id5, a.residente_id,
             CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
             CAST(NULLIF(a.fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
             a.lectura_tipo_id, a.lectura_epc, a.folio_contrato,
             a.precio, a.estatus_id,
             a.observaciones, 'H' AS folio_tipo
      FROM residencias_residentes_tarjetas a`;

    const sqlB = `
      SELECT a.asignacion_id, a.tarjeta_id, a.tarjeta_id2, a.tarjeta_id3,
             a.tarjeta_id4, a.tarjeta_id5, a.residente_id,
             CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
             NULL AS fecha_vencimiento,
             a.lectura_tipo_id, a.lectura_epc, a.folio_contrato,
             a.precio, a.estatus_id,
             a.observaciones, 'B' AS folio_tipo
      FROM residencias_residentes_tarjetas_no_renovacion a`;

    let unionSql: string;
    if (folioTipo === "H") {
      unionSql = sqlH;
    } else if (folioTipo === "B") {
      unionSql = sqlB;
    } else {
      unionSql = `${sqlH} UNION ALL ${sqlB}`;
    }

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

    // Helper para convertir BigInt a Number (MySQL puede devolver BigInt en raw queries)
    const toNum = (v: unknown): number | null => {
      if (v === null || v === undefined) return null;
      return Number(v);
    };
    const toStr = (v: unknown): string | null => {
      if (v === null || v === undefined) return null;
      return String(v);
    };

    // Transformar filas planas a estructura anidada esperada por el frontend
    const data = rows.map((row) => ({
      id: toNum(row.asignacion_id),
      tarjetaId: toStr(row.tarjeta_id),
      tarjetaId2: toStr(row.tarjeta_id2),
      tarjetaId3: toStr(row.tarjeta_id3),
      tarjetaId4: toStr(row.tarjeta_id4),
      tarjetaId5: toStr(row.tarjeta_id5),
      residenteId: toStr(row.residente_id),
      fecha: toStr(row.fecha),
      fechaVencimiento: toStr(row.fecha_vencimiento),
      lecturaTipoId: toNum(row.lectura_tipo_id),
      lecturaEpc: toStr(row.lectura_epc),
      folioContrato: toStr(row.folio_contrato),
      precio: toNum(row.precio),
      estatusId: toNum(row.estatus_id),
      observaciones: toStr(row.observaciones),
      folioTipo: toStr(row.folio_tipo),
      tarjeta: null,
      residente: {
        id: toStr(row.res_id),
        nombre: toStr(row.res_nombre),
        apePaterno: toStr(row.res_ape_paterno),
        apeMaterno: toStr(row.res_ape_materno),
        residencia: {
          id: toNum(row.residencia_id),
          nroCasa: toStr(row.nro_casa),
          calle: toStr(row.calle),
          privada: {
            id: toNum(row.priv_id),
            descripcion: toStr(row.priv_descripcion),
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
      descuento,
      IVA,
      tipoPago,
      compradorId,
      mostrarNombreComprador,
      concepto,
      observaciones,
      motivoDescuento,
      utilizoSeguro,
      utilizoSeguro2,
      utilizoSeguro3,
      utilizoSeguro4,
      utilizoSeguro5,
      privada,
      folioTipo,
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

    // Validar que la tarjeta principal esta disponible (estatusId=1)
    const tarjetaPrincipal = await prisma.tarjeta.findUnique({
      where: { id: parseInt(String(tarjetaId), 10) },
    });

    if (!tarjetaPrincipal) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada" },
        { status: 404 }
      );
    }

    if (tarjetaPrincipal.estatusId !== 1) {
      return NextResponse.json(
        { error: "La tarjeta no esta disponible (ya esta asignada o inactiva)" },
        { status: 400 }
      );
    }

    // Validar tarjetas adicionales si se proporcionan
    const tarjetaIdsAdicionales = [tarjetaId2, tarjetaId3, tarjetaId4, tarjetaId5].filter(Boolean);
    for (const tid of tarjetaIdsAdicionales) {
      const t = await prisma.tarjeta.findUnique({
        where: { id: parseInt(String(tid), 10) },
      });
      if (t && t.estatusId !== 1) {
        return NextResponse.json(
          { error: `La tarjeta ${tid} no esta disponible` },
          { status: 400 }
        );
      }
    }

    // Datos comunes para ambos tipos de folio
    const dataComun = {
      tarjetaId: String(tarjetaId) || "",
      tarjetaId2: tarjetaId2 ? String(tarjetaId2) : "",
      tarjetaId3: tarjetaId3 ? String(tarjetaId3) : "",
      tarjetaId4: tarjetaId4 ? String(tarjetaId4) : "",
      tarjetaId5: tarjetaId5 ? String(tarjetaId5) : "",
      residenteId: String(residenteId),
      privada: privada ? parseInt(String(privada), 10) : 0,
      lecturaTipoId: lecturaTipoId ? parseInt(String(lecturaTipoId), 10) : 0,
      lecturaEpc: lecturaEpc?.trim() || "",
      folioContrato: folioContrato?.trim() || "",
      precio: precio ? parseFloat(String(precio)) : 0,
      descuento: descuento ? parseFloat(String(descuento)) : 0,
      IVA: IVA ? parseFloat(String(IVA)) : 0,
      tipoPago: tipoPago ? parseInt(String(tipoPago), 10) : 0,
      compradorId: compradorId ? String(compradorId).trim() : "",
      mostrarNombreComprador: mostrarNombreComprador ? 1 : 0,
      concepto: concepto?.trim() || "",
      motivoDescuento: motivoDescuento?.trim() || "",
      observaciones: observaciones?.trim() || "",
      utilizoSeguro: utilizoSeguro ? 1 : 0,
      utilizoSeguro2: utilizoSeguro2 ? 1 : 0,
      utilizoSeguro3: utilizoSeguro3 ? 1 : 0,
      utilizoSeguro4: utilizoSeguro4 ? 1 : 0,
      utilizoSeguro5: utilizoSeguro5 ? 1 : 0,
    };

    // Helper: generar string YYYY-MM-DD para columnas DATE de MySQL
    // Prisma ORM no puede leer de vuelta columnas @db.Date, así que usamos raw SQL
    const toDateStr = (d?: string, defaultYears = 1): string => {
      if (d) return d.split("T")[0];
      const hoy = new Date();
      hoy.setFullYear(hoy.getFullYear() + defaultYears);
      return hoy.toISOString().split("T")[0];
    };

    const fechaStr = new Date().toISOString().split("T")[0];
    const defaultYears = folioTipo === "B" ? 10 : 1;
    const fechaVencStr = toDateStr(fechaVencimiento, defaultYears);
    const tableName = folioTipo === "B"
      ? "residencias_residentes_tarjetas_no_renovacion"
      : "residencias_residentes_tarjetas";

    // INSERT con raw SQL para evitar el bug P2023 de Prisma con columnas @db.Date
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${tableName}\` (
        tarjeta_id, tarjeta_id2, tarjeta_id3, tarjeta_id4, tarjeta_id5,
        numero_serie, numero_serie2, numero_serie3, numero_serie4, numero_serie5,
        residente_id, privada, fecha, fecha_vencimiento, fecha_modificacion,
        lectura_tipo_id, lectura_epc, folio_contrato,
        precio, descuento, IVA, tipo_pago,
        comprador_id, mostrar_nombre_comprador,
        concepto, motivo_descuento, observaciones,
        utilizo_seguro, utilizo_seguro2, utilizo_seguro3, utilizo_seguro4, utilizo_seguro5,
        interfon_extra,
        estatus_id, usuario_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      dataComun.tarjetaId,
      dataComun.tarjetaId2,
      dataComun.tarjetaId3,
      dataComun.tarjetaId4,
      dataComun.tarjetaId5,
      "",  // numero_serie
      "",  // numero_serie2
      "",  // numero_serie3
      "",  // numero_serie4
      "",  // numero_serie5
      dataComun.residenteId,
      dataComun.privada,
      fechaStr,
      fechaVencStr,
      fechaStr,
      dataComun.lecturaTipoId,
      dataComun.lecturaEpc,
      dataComun.folioContrato,
      dataComun.precio,
      dataComun.descuento,
      dataComun.IVA,
      dataComun.tipoPago,
      dataComun.compradorId,
      dataComun.mostrarNombreComprador,
      dataComun.concepto,
      dataComun.motivoDescuento,
      dataComun.observaciones,
      dataComun.utilizoSeguro,
      dataComun.utilizoSeguro2,
      dataComun.utilizoSeguro3,
      dataComun.utilizoSeguro4,
      dataComun.utilizoSeguro5,
      0,   // interfon_extra
      1,   // estatus_id
      0,   // usuario_id
    );

    // Obtener el ID del registro recién creado
    const [idResult] = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
      "SELECT LAST_INSERT_ID() as id"
    );
    const newId = Number(idResult.id);

    // Obtener el registro completo con raw SQL (evita P2023)
    const [row] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT a.asignacion_id,
              a.tarjeta_id, a.tarjeta_id2, a.tarjeta_id3, a.tarjeta_id4, a.tarjeta_id5,
              a.residente_id,
              CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
              CAST(NULLIF(a.fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
              a.lectura_tipo_id, a.lectura_epc, a.folio_contrato,
              a.precio, a.estatus_id, a.observaciones,
              r.nombre AS res_nombre, r.ape_paterno AS res_ape_paterno, r.ape_materno AS res_ape_materno,
              res.residencia_id, res.nro_casa, res.calle,
              p.privada_id AS priv_id, p.descripcion AS priv_descripcion
       FROM \`${tableName}\` a
       INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
       INNER JOIN residencias res ON r.residencia_id = res.residencia_id
       INNER JOIN privadas p ON res.privada_id = p.privada_id
       WHERE a.asignacion_id = ?`,
      newId
    );

    // Marcar tarjeta(s) como Asignada (estatusId=2)
    const allTarjetaIds = [tarjetaId, ...tarjetaIdsAdicionales].map((tid) =>
      parseInt(String(tid), 10)
    );
    await prisma.tarjeta.updateMany({
      where: { id: { in: allTarjetaIds } },
      data: { estatusId: 2 },
    });

    // Helper para construir respuesta
    const toNum = (v: unknown): number | null => v === null || v === undefined ? null : Number(v);
    const toStr = (v: unknown): string | null => v === null || v === undefined ? null : String(v);

    const asignacion = {
      id: toNum(row.asignacion_id),
      tarjetaId: toStr(row.tarjeta_id),
      tarjetaId2: toStr(row.tarjeta_id2),
      tarjetaId3: toStr(row.tarjeta_id3),
      tarjetaId4: toStr(row.tarjeta_id4),
      tarjetaId5: toStr(row.tarjeta_id5),
      residenteId: toStr(row.residente_id),
      fecha: toStr(row.fecha),
      fechaVencimiento: toStr(row.fecha_vencimiento),
      lecturaTipoId: toNum(row.lectura_tipo_id),
      lecturaEpc: toStr(row.lectura_epc),
      folioContrato: toStr(row.folio_contrato),
      precio: toNum(row.precio),
      estatusId: toNum(row.estatus_id),
      observaciones: toStr(row.observaciones),
      folioTipo: folioTipo === "B" ? "B" : "H",
      residente: {
        id: toStr(row.residente_id),
        nombre: toStr(row.res_nombre),
        apePaterno: toStr(row.res_ape_paterno),
        apeMaterno: toStr(row.res_ape_materno),
        residencia: {
          id: toNum(row.residencia_id),
          nroCasa: toStr(row.nro_casa),
          calle: toStr(row.calle),
          privada: {
            id: toNum(row.priv_id),
            descripcion: toStr(row.priv_descripcion),
          },
        },
      },
    };

    return NextResponse.json(asignacion, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al crear asignacion de tarjeta:", msg, error);
    return NextResponse.json(
      { error: `Error al crear asignacion de tarjeta: ${msg}` },
      { status: 500 }
    );
  }
}
