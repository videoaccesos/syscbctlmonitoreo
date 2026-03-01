import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/procesos/ordenes-servicio - Listar ordenes de servicio con filtros y paginacion
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const privadaId = searchParams.get("privadaId");
    const estatusId = searchParams.get("estatusId");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Construir filtros dinamicamente
    const where: Record<string, unknown> = {};

    if (privadaId) {
      where.privadaId = parseInt(privadaId, 10);
    }

    if (estatusId) {
      where.estatusId = parseInt(estatusId, 10);
    }

    // Filtro de fechas
    if (fechaDesde || fechaHasta) {
      const fechaFilter: Record<string, Date> = {};
      if (fechaDesde) {
        fechaFilter.gte = new Date(`${fechaDesde}T00:00:00`);
      }
      if (fechaHasta) {
        fechaFilter.lte = new Date(`${fechaHasta}T23:59:59`);
      }
      where.fecha = fechaFilter;
    }

    // Busqueda por folio o detalle
    if (search) {
      where.OR = [
        { folio: { contains: search } },
        { detalleServicio: { contains: search } },
      ];
    }

    const [ordenes, total] = await Promise.all([
      prisma.ordenServicio.findMany({
        where,
        include: {
          privada: {
            select: { id: true, descripcion: true },
          },
          tecnico: {
            select: {
              id: true,
              nombre: true,
              apePaterno: true,
              apeMaterno: true,
            },
          },
          empleado: {
            select: {
              id: true,
              nombre: true,
              apePaterno: true,
              apeMaterno: true,
            },
          },
          codigoServicio: {
            select: { id: true, codigo: true, descripcion: true },
          },
          diagnostico: {
            select: { id: true, codigo: true, descripcion: true },
          },
        },
        orderBy: { fecha: "desc" },
        skip,
        take: limit,
      }),
      prisma.ordenServicio.count({ where }),
    ]);

    return NextResponse.json({
      data: ordenes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error al listar ordenes de servicio:", error);
    return NextResponse.json(
      { error: "Error al obtener ordenes de servicio" },
      { status: 500 }
    );
  }
}

// POST /api/procesos/ordenes-servicio - Crear nueva orden de servicio
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const {
      empleadoId,
      privadaId,
      tecnicoId,
      codigoServicioId,
      detalleServicio,
      diagnosticoId,
      detalleDiagnostico,
    } = body;

    // Validacion de campos requeridos
    if (
      !empleadoId ||
      !privadaId ||
      !tecnicoId ||
      !codigoServicioId ||
      !detalleServicio
    ) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: empleadoId, privadaId, tecnicoId, codigoServicioId, detalleServicio",
        },
        { status: 400 }
      );
    }

    // Validar que la privada existe
    const privada = await prisma.privada.findFirst({
      where: { id: parseInt(privadaId, 10), estatusId: 1 },
      select: { id: true },
    });

    if (!privada) {
      return NextResponse.json(
        { error: "Privada no encontrada" },
        { status: 404 }
      );
    }

    // Generar folio automaticamente
    const folio = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Buscar el registro de folio con prefijo "OS"
      let folioReg = await tx.folio.findFirst({
        where: { prefijo: "OS" },
      });

      if (!folioReg) {
        // Crear registro de folio si no existe
        folioReg = await tx.folio.create({
          data: {
            descripcion: "Ordenes de Servicio",
            prefijo: "OS",
            consecutivo: 0,
          },
        });
      }

      // Incrementar consecutivo
      const nuevoConsecutivo = folioReg.consecutivo + 1;
      await tx.folio.update({
        where: { id: folioReg.id },
        data: { consecutivo: nuevoConsecutivo },
      });

      // Formato: OS000001 (Char(8))
      return `OS${String(nuevoConsecutivo).padStart(6, "0")}`;
    });

    // Crear la orden de servicio
    const orden = await prisma.ordenServicio.create({
      data: {
        folio,
        empleadoId: parseInt(empleadoId, 10),
        privadaId: parseInt(privadaId, 10),
        tecnicoId: parseInt(tecnicoId, 10),
        codigoServicioId: parseInt(codigoServicioId, 10),
        detalleServicio: detalleServicio.trim(),
        diagnosticoId: diagnosticoId ? parseInt(diagnosticoId, 10) : 0,
        detalleDiagnostico: detalleDiagnostico?.trim() || "",
        cierreTecnicoId: 0,
      },
      include: {
        privada: {
          select: { id: true, descripcion: true },
        },
        tecnico: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
          },
        },
        empleado: {
          select: {
            id: true,
            nombre: true,
            apePaterno: true,
            apeMaterno: true,
          },
        },
        codigoServicio: {
          select: { id: true, codigo: true, descripcion: true },
        },
        diagnostico: {
          select: { id: true, codigo: true, descripcion: true },
        },
      },
    });

    return NextResponse.json(orden, { status: 201 });
  } catch (error) {
    console.error("Error al crear orden de servicio:", error);
    return NextResponse.json(
      { error: "Error al crear orden de servicio" },
      { status: 500 }
    );
  }
}
