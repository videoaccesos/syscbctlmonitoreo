import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/asignacion-tarjetas - Listar asignaciones de tarjetas con filtros y paginacion
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

    // Construir filtros dinamicamente
    const where: Record<string, unknown> = {};

    if (estatusId) {
      where.estatusId = parseInt(estatusId, 10);
    }

    // Filtro por privada (a traves de residente -> residencia -> privada)
    if (privadaId) {
      where.residente = {
        residencia: {
          privadaId: parseInt(privadaId, 10),
        },
      };
    }

    // Busqueda por nombre de residente
    if (search) {
      where.residente = {
        ...(typeof where.residente === "object" && where.residente !== null
          ? where.residente
          : {}),
        OR: [
          { nombre: { contains: search } },
          { apePaterno: { contains: search } },
          { apeMaterno: { contains: search } },
        ],
      };
    }

    const [asignaciones, total] = await Promise.all([
      prisma.asignacionTarjeta.findMany({
        where,
        include: {
          tarjeta: {
            select: {
              id: true,
              lectura: true,
              tipoId: true,
              estatusId: true,
            },
          },
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
        orderBy: { creadoEn: "desc" },
        skip,
        take: limit,
      }),
      prisma.asignacionTarjeta.count({ where }),
    ]);

    return NextResponse.json({
      data: asignaciones,
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
      tarjetaSecId,
      fechaVencimiento,
      tipoLectura,
      lecturaEpc,
      folioContrato,
      precio,
    } = body;

    // Validacion de campos requeridos
    if (!tarjetaId || !residenteId) {
      return NextResponse.json(
        { error: "Campos requeridos: tarjetaId, residenteId" },
        { status: 400 }
      );
    }

    // Validar que la tarjeta existe y esta disponible (estatusId = 1 Activa)
    const tarjeta = await prisma.tarjeta.findUnique({
      where: { id: parseInt(tarjetaId, 10) },
    });

    if (!tarjeta) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada" },
        { status: 404 }
      );
    }

    if (tarjeta.estatusId !== 1) {
      return NextResponse.json(
        { error: "La tarjeta no esta disponible para asignacion (debe estar Activa)" },
        { status: 400 }
      );
    }

    // Validar que el residente existe y esta activo
    const residente = await prisma.residente.findFirst({
      where: { id: parseInt(residenteId, 10), estatusId: 1 },
    });

    if (!residente) {
      return NextResponse.json(
        { error: "Residente no encontrado o no esta activo" },
        { status: 404 }
      );
    }

    // Crear asignacion y actualizar estatus de tarjeta en una transaccion
    const asignacion = await prisma.$transaction(async (tx) => {
      // Crear la asignacion
      const nueva = await tx.asignacionTarjeta.create({
        data: {
          tarjetaId: parseInt(tarjetaId, 10),
          residenteId: parseInt(residenteId, 10),
          tarjetaSecId: tarjetaSecId ? parseInt(tarjetaSecId, 10) : null,
          fechaVencimiento: fechaVencimiento
            ? new Date(fechaVencimiento)
            : null,
          tipoLectura: tipoLectura ? parseInt(tipoLectura, 10) : null,
          lecturaEpc: lecturaEpc?.trim() || null,
          folioContrato: folioContrato?.trim() || null,
          precio: precio ? parseFloat(precio) : null,
        },
        include: {
          tarjeta: {
            select: {
              id: true,
              lectura: true,
              tipoId: true,
              estatusId: true,
            },
          },
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

      // Actualizar tarjeta a estatusId 2 (Asignada)
      await tx.tarjeta.update({
        where: { id: parseInt(tarjetaId, 10) },
        data: { estatusId: 2 },
      });

      return nueva;
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
