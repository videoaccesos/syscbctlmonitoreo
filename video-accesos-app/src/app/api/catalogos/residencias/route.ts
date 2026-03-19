import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/catalogos/residencias - Listar residencias con busqueda, paginacion y filtro por privada
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const privadaId = searchParams.get("privadaId");
    const residenciaId = searchParams.get("residenciaId");
    const nroCasa = searchParams.get("nroCasa");
    const includeTarjetas = searchParams.get("includeTarjetas") !== "false";
    const skip = (page - 1) * limit;

    const allowedSortFields = ["nroCasa", "calle", "estatusId"];
    const sortByParam = searchParams.get("sortBy") || "nroCasa";
    const sortBy = allowedSortFields.includes(sortByParam) ? sortByParam : "nroCasa";
    const sortDir = (searchParams.get("sortDir") || "asc") as "asc" | "desc";

    // Excluir eliminados (estatus 5) replicando el comportamiento legacy
    // Solo mostrar residencias que tengan una privada asignada
    const where: Record<string, unknown> = {
      estatusId: { not: 5 },
      privadaId: { gt: 0 },
    };

    if (residenciaId) {
      where.id = parseInt(residenciaId);
    }

    if (privadaId) {
      where.privadaId = parseInt(privadaId);
    }

    // Filtro exacto por numero de casa
    if (nroCasa) {
      where.nroCasa = nroCasa;
    }

    if (search) {
      where.OR = [
        { nroCasa: { contains: search } },
        { calle: { contains: search } },
      ];
    }

    // Configurar select de residentes con o sin tarjetas
    const residentesSelect: Record<string, unknown> = {
      id: true,
      nombre: true,
      apePaterno: true,
      apeMaterno: true,
      celular: true,
      email: true,
      estatusId: true,
    };

    if (includeTarjetas) {
      residentesSelect.tarjetasAsignadas = {
        select: {
          tarjetaId: true,
          tarjetaId2: true,
          tarjetaId3: true,
          tarjetaId4: true,
          tarjetaId5: true,
          estatusId: true,
        },
      };
      residentesSelect.tarjetasSinRenovacion = {
        select: {
          tarjetaId: true,
          tarjetaId2: true,
          tarjetaId3: true,
          tarjetaId4: true,
          tarjetaId5: true,
          estatusId: true,
        },
      };
    }

    // Usar select en vez de include para evitar traer fecha_modificacion
    // que puede tener valores invalidos (0000-00-00) en la BD
    const [residencias, total] = await Promise.all([
      prisma.residencia.findMany({
        where,
        select: {
          id: true,
          nroCasa: true,
          calle: true,
          telefono1: true,
          telefono2: true,
          interfon: true,
          telefonoInterfon: true,
          observaciones: true,
          estatusId: true,
          privadaId: true,
          usuarioModId: true,
          privada: {
            select: { id: true, descripcion: true, precioVehicular: true, precioPeatonal: true },
          },
          residentes: {
            select: residentesSelect,
            orderBy: { apePaterno: "asc" },
          },
        },
        orderBy: { [sortBy]: sortDir },
        skip,
        take: limit,
      }),
      prisma.residencia.count({ where }),
    ]);

    return NextResponse.json({
      data: residencias,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error al listar residencias:", msg, error);
    return NextResponse.json(
      { error: "Error al listar residencias", detail: msg },
      { status: 500 }
    );
  }
}

// POST /api/catalogos/residencias - Crear residencia
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      privadaId,
      nroCasa,
      calle,
      telefono1,
      telefono2,
      interfon,
      telefonoInterfon,
      observaciones,
      estatusId,
    } = body;

    if (!privadaId || !nroCasa || !calle) {
      return NextResponse.json(
        { error: "Privada, numero de casa y calle son requeridos" },
        { status: 400 }
      );
    }

    const residencia = await prisma.residencia.create({
      data: {
        privadaId: parseInt(privadaId),
        nroCasa,
        calle,
        telefono1: telefono1 || "",
        telefono2: telefono2 || "",
        interfon: interfon || "",
        telefonoInterfon: telefonoInterfon || "",
        observaciones: observaciones || "",
        estatusId: estatusId ? parseInt(estatusId) : 1,
        usuarioModId: 0,
      },
      select: {
        id: true,
        nroCasa: true,
        calle: true,
        telefono1: true,
        telefono2: true,
        interfon: true,
        telefonoInterfon: true,
        observaciones: true,
        estatusId: true,
        privadaId: true,
        privada: {
          select: { id: true, descripcion: true },
        },
      },
    });

    return NextResponse.json(residencia, { status: 201 });
  } catch (error) {
    console.error("Error al crear residencia:", error);
    return NextResponse.json(
      { error: "Error al crear residencia" },
      { status: 500 }
    );
  }
}
