import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/seguridad/grupos-usuarios/[id] - Obtener un grupo por ID con detalles
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const grupoId = parseInt(id, 10);

    if (isNaN(grupoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const grupo = await prisma.grupoUsuario.findUnique({
      where: { id: grupoId },
      include: {
        detalles: {
          include: {
            usuario: {
              select: {
                id: true,
                usuario: true,
                estatusId: true,
                empleado: {
                  select: {
                    nombre: true,
                    apePaterno: true,
                    apeMaterno: true,
                  },
                },
              },
            },
          },
        },
        permisos: {
          include: {
            subproceso: {
              include: {
                proceso: true,
              },
            },
          },
        },
      },
    });

    if (!grupo) {
      return NextResponse.json(
        { error: "Grupo no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(grupo);
  } catch (error) {
    console.error("Error al obtener grupo:", error);
    return NextResponse.json(
      { error: "Error al obtener grupo" },
      { status: 500 }
    );
  }
}

// PUT /api/seguridad/grupos-usuarios/[id] - Actualizar grupo y sus detalles (usuarios asignados)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const grupoId = parseInt(id, 10);

    if (isNaN(grupoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    const body = await request.json();

    // Verificar que existe
    const existente = await prisma.grupoUsuario.findUnique({
      where: { id: grupoId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Grupo no encontrado" },
        { status: 404 }
      );
    }

    const { nombre, usuarioIds } = body;

    if (!nombre?.trim()) {
      return NextResponse.json(
        { error: "El nombre del grupo es requerido" },
        { status: 400 }
      );
    }

    // Verificar duplicado (excluyendo el actual)
    const duplicado = await prisma.grupoUsuario.findFirst({
      where: {
        nombre: nombre.trim(),
        id: { not: grupoId },
      },
    });

    if (duplicado) {
      return NextResponse.json(
        { error: "Ya existe un grupo con ese nombre" },
        { status: 409 }
      );
    }

    // Actualizar grupo y detalles en una transaccion
    const grupo = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Actualizar nombre del grupo
      await tx.grupoUsuario.update({
        where: { id: grupoId },
        data: {
          nombre: nombre.trim().substring(0, 30),
          usuarioModId: body.usuarioModId || 0,
        },
      });

      // Si se proporcionan usuarioIds, reemplazar detalles
      if (Array.isArray(usuarioIds)) {
        // Eliminar todos los detalles existentes
        await tx.grupoUsuarioDetalle.deleteMany({
          where: { grupoUsuarioId: grupoId },
        });

        // Crear nuevos detalles
        if (usuarioIds.length > 0) {
          await tx.grupoUsuarioDetalle.createMany({
            data: usuarioIds.map((usuarioId: number) => ({
              grupoUsuarioId: grupoId,
              usuarioId: parseInt(String(usuarioId), 10),
            })),
          });
        }
      }

      // Retornar grupo actualizado con detalles
      return tx.grupoUsuario.findUnique({
        where: { id: grupoId },
        include: {
          detalles: {
            include: {
              usuario: {
                select: {
                  id: true,
                  usuario: true,
                  estatusId: true,
                  empleado: {
                    select: {
                      nombre: true,
                      apePaterno: true,
                      apeMaterno: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: { detalles: true },
          },
        },
      });
    });

    return NextResponse.json(grupo);
  } catch (error) {
    console.error("Error al actualizar grupo:", error);
    return NextResponse.json(
      { error: "Error al actualizar grupo" },
      { status: 500 }
    );
  }
}

// DELETE /api/seguridad/grupos-usuarios/[id] - Baja logica (estatusId=2)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const grupoId = parseInt(id, 10);

    if (isNaN(grupoId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Verificar que existe y esta activo
    const existente = await prisma.grupoUsuario.findFirst({
      where: { id: grupoId, estatusId: 1 },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Grupo no encontrado o ya dado de baja" },
        { status: 404 }
      );
    }

    // Soft delete: cambiar estatus a 2 (Baja)
    await prisma.grupoUsuario.update({
      where: { id: grupoId },
      data: { estatusId: 2 },
    });

    return NextResponse.json({ message: "Grupo dado de baja correctamente" });
  } catch (error) {
    console.error("Error al dar de baja grupo:", error);
    return NextResponse.json(
      { error: "Error al dar de baja grupo" },
      { status: 500 }
    );
  }
}
