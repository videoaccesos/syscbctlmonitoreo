import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Helpers para convertir valores de raw queries
const toNum = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);
const toStr = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v);

// Buscar asignacion por ID en ambas tablas usando raw SQL (evita P2023 con @db.Date)
async function findAsignacionRaw(asignacionId: number) {
  // Intentar Folio H primero
  const rowsH = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT a.asignacion_id,
            a.tarjeta_id, a.tarjeta_id2, a.tarjeta_id3, a.tarjeta_id4, a.tarjeta_id5,
            a.residente_id, a.estatus_id,
            CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
            CAST(NULLIF(a.fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
            a.lectura_tipo_id, a.lectura_epc, a.folio_contrato,
            a.precio, a.observaciones,
            r.nombre AS res_nombre, r.ape_paterno AS res_ape_paterno,
            r.ape_materno AS res_ape_materno, r.celular AS res_celular, r.email AS res_email,
            res.residencia_id, res.nro_casa, res.calle,
            p.privada_id AS priv_id, p.descripcion AS priv_descripcion,
            'H' AS folio_tipo
     FROM residencias_residentes_tarjetas a
     INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
     INNER JOIN residencias res ON r.residencia_id = res.residencia_id
     INNER JOIN privadas p ON res.privada_id = p.privada_id
     WHERE a.asignacion_id = ?`,
    asignacionId
  );

  if (rowsH.length > 0) return rowsH[0];

  // Intentar Folio B
  const rowsB = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT a.asignacion_id,
            a.tarjeta_id, a.tarjeta_id2, a.tarjeta_id3, a.tarjeta_id4, a.tarjeta_id5,
            a.residente_id, a.estatus_id,
            CAST(NULLIF(a.fecha, '0000-00-00') AS CHAR) AS fecha,
            CAST(NULLIF(a.fecha_vencimiento, '0000-00-00') AS CHAR) AS fecha_vencimiento,
            a.lectura_tipo_id, a.lectura_epc, a.folio_contrato,
            a.precio, a.observaciones,
            r.nombre AS res_nombre, r.ape_paterno AS res_ape_paterno,
            r.ape_materno AS res_ape_materno, r.celular AS res_celular, r.email AS res_email,
            res.residencia_id, res.nro_casa, res.calle,
            p.privada_id AS priv_id, p.descripcion AS priv_descripcion,
            'B' AS folio_tipo
     FROM residencias_residentes_tarjetas_no_renovacion a
     INNER JOIN residencias_residentes r ON a.residente_id = r.residente_id
     INNER JOIN residencias res ON r.residencia_id = res.residencia_id
     INNER JOIN privadas p ON res.privada_id = p.privada_id
     WHERE a.asignacion_id = ?`,
    asignacionId
  );

  if (rowsB.length > 0) return rowsB[0];
  return null;
}

// Convertir row raw a JSON de respuesta
function rowToJson(row: Record<string, unknown>) {
  return {
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
    residente: {
      id: toStr(row.residente_id),
      nombre: toStr(row.res_nombre),
      apePaterno: toStr(row.res_ape_paterno),
      apeMaterno: toStr(row.res_ape_materno),
      celular: toStr(row.res_celular),
      email: toStr(row.res_email),
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
}

// GET /api/procesos/asignacion-tarjetas/[id] - Obtener una asignacion por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const asignacionId = parseInt(id, 10);

    if (isNaN(asignacionId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const row = await findAsignacionRaw(asignacionId);

    if (!row) {
      return NextResponse.json(
        { error: "Asignacion no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(rowToJson(row));
  } catch (error) {
    console.error("Error al obtener asignacion:", error);
    return NextResponse.json(
      { error: "Error al obtener asignacion" },
      { status: 500 }
    );
  }
}

// PUT /api/procesos/asignacion-tarjetas/[id] - Actualizar asignacion
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const asignacionId = parseInt(id, 10);

    if (isNaN(asignacionId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Buscar en qué tabla está la asignación
    const existente = await findAsignacionRaw(asignacionId);

    if (!existente) {
      return NextResponse.json(
        { error: "Asignacion no encontrada" },
        { status: 404 }
      );
    }

    const folioTipo = toStr(existente.folio_tipo);
    const tableName = folioTipo === "B"
      ? "residencias_residentes_tarjetas_no_renovacion"
      : "residencias_residentes_tarjetas";

    const body = await request.json();

    // Construir SET dinámico con raw SQL
    const setClauses: string[] = [];
    const setValues: unknown[] = [];

    if (body.tarjetaId !== undefined) {
      setClauses.push("tarjeta_id = ?");
      setValues.push(String(body.tarjetaId) || "");
    }
    if (body.tarjetaId2 !== undefined) {
      setClauses.push("tarjeta_id2 = ?");
      setValues.push(String(body.tarjetaId2) || "");
    }
    if (body.tarjetaId3 !== undefined) {
      setClauses.push("tarjeta_id3 = ?");
      setValues.push(String(body.tarjetaId3) || "");
    }
    if (body.tarjetaId4 !== undefined) {
      setClauses.push("tarjeta_id4 = ?");
      setValues.push(String(body.tarjetaId4) || "");
    }
    if (body.tarjetaId5 !== undefined) {
      setClauses.push("tarjeta_id5 = ?");
      setValues.push(String(body.tarjetaId5) || "");
    }
    if (body.fechaVencimiento !== undefined) {
      setClauses.push("fecha_vencimiento = ?");
      const dateStr = body.fechaVencimiento
        ? String(body.fechaVencimiento).split("T")[0]
        : new Date().toISOString().split("T")[0];
      setValues.push(dateStr);
    }
    if (body.lecturaTipoId !== undefined) {
      setClauses.push("lectura_tipo_id = ?");
      setValues.push(body.lecturaTipoId ? parseInt(body.lecturaTipoId, 10) : 0);
    }
    if (body.lecturaEpc !== undefined) {
      setClauses.push("lectura_epc = ?");
      setValues.push(body.lecturaEpc?.trim() || "");
    }
    if (body.folioContrato !== undefined) {
      setClauses.push("folio_contrato = ?");
      setValues.push(body.folioContrato?.trim() || "");
    }
    if (body.precio !== undefined) {
      setClauses.push("precio = ?");
      setValues.push(body.precio ? parseFloat(body.precio) : 0);
    }
    if (body.utilizoSeguro !== undefined) {
      setClauses.push("utilizo_seguro = ?");
      setValues.push(body.utilizoSeguro ? 1 : 0);
    }
    if (body.utilizoSeguro2 !== undefined) {
      setClauses.push("utilizo_seguro2 = ?");
      setValues.push(body.utilizoSeguro2 ? 1 : 0);
    }
    if (body.utilizoSeguro3 !== undefined) {
      setClauses.push("utilizo_seguro3 = ?");
      setValues.push(body.utilizoSeguro3 ? 1 : 0);
    }
    if (body.utilizoSeguro4 !== undefined) {
      setClauses.push("utilizo_seguro4 = ?");
      setValues.push(body.utilizoSeguro4 ? 1 : 0);
    }
    if (body.utilizoSeguro5 !== undefined) {
      setClauses.push("utilizo_seguro5 = ?");
      setValues.push(body.utilizoSeguro5 ? 1 : 0);
    }
    if (body.estatusId !== undefined) {
      setClauses.push("estatus_id = ?");
      setValues.push(parseInt(body.estatusId, 10));
    }

    if (setClauses.length > 0) {
      // Siempre actualizar fecha_modificacion
      setClauses.push("fecha_modificacion = ?");
      setValues.push(new Date().toISOString().split("T")[0]);

      await prisma.$executeRawUnsafe(
        `UPDATE \`${tableName}\` SET ${setClauses.join(", ")} WHERE asignacion_id = ?`,
        ...setValues,
        asignacionId
      );
    }

    // Leer de vuelta con raw SQL
    const updated = await findAsignacionRaw(asignacionId);

    return NextResponse.json(rowToJson(updated!));
  } catch (error) {
    console.error("Error al actualizar asignacion:", error);
    return NextResponse.json(
      { error: "Error al actualizar asignacion" },
      { status: 500 }
    );
  }
}

// DELETE /api/procesos/asignacion-tarjetas/[id] - Cancelar asignacion (no elimina, cambia estatus)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const asignacionId = parseInt(id, 10);

    if (isNaN(asignacionId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Buscar en ambas tablas con raw SQL
    const existente = await findAsignacionRaw(asignacionId);

    if (!existente) {
      return NextResponse.json(
        { error: "Asignacion no encontrada" },
        { status: 404 }
      );
    }

    if (toNum(existente.estatus_id) === 2) {
      return NextResponse.json(
        { error: "La asignacion ya esta cancelada" },
        { status: 400 }
      );
    }

    const folioTipo = toStr(existente.folio_tipo);
    const tableName = folioTipo === "B"
      ? "residencias_residentes_tarjetas_no_renovacion"
      : "residencias_residentes_tarjetas";

    // Cancelar con raw SQL
    await prisma.$executeRawUnsafe(
      `UPDATE \`${tableName}\` SET estatus_id = 2 WHERE asignacion_id = ?`,
      asignacionId
    );

    // Liberar tarjeta(s): cambiar estatus a 1 (Activa)
    const tarjetaIds = [
      toStr(existente.tarjeta_id),
      toStr(existente.tarjeta_id2),
      toStr(existente.tarjeta_id3),
      toStr(existente.tarjeta_id4),
      toStr(existente.tarjeta_id5),
    ]
      .filter((tid) => tid && tid.trim() !== "")
      .map((tid) => parseInt(String(tid), 10))
      .filter((tid) => !isNaN(tid));

    if (tarjetaIds.length > 0) {
      await prisma.tarjeta.updateMany({
        where: { id: { in: tarjetaIds } },
        data: { estatusId: 1 },
      });
    }

    return NextResponse.json({
      message: "Asignacion cancelada correctamente",
    });
  } catch (error) {
    console.error("Error al cancelar asignacion:", error);
    return NextResponse.json(
      { error: "Error al cancelar asignacion" },
      { status: 500 }
    );
  }
}
