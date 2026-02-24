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
      prisma.residenteTarjeta.findMany({
        where,
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
        orderBy: { fechaModificacion: "desc" },
        skip,
        take: limit,
      }),
      prisma.residenteTarjeta.count({ where }),
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
