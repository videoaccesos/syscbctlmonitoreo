import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const residenciaSelect = {
  id: true,
  nroCasa: true,
  calle: true,
  telefono1: true,
  telefono2: true,
  interfon: true,
  telefonoInterfon: true,
  observaciones: true,
  estatusId: true,
  privada: {
    select: {
      id: true,
      descripcion: true,
    },
  },
  residentes: {
    where: { estatusId: 1 },
    select: {
      id: true,
      nombre: true,
      apePaterno: true,
      apeMaterno: true,
      celular: true,
      email: true,
      reportarAcceso: true,
    },
    orderBy: { apePaterno: "asc" as const },
  },
  visitas: {
    where: { estatusId: 1 },
    select: {
      id: true,
      nombre: true,
      apePaterno: true,
      apeMaterno: true,
      telefono: true,
      celular: true,
      observaciones: true,
    },
    orderBy: { apePaterno: "asc" as const },
  },
};

// GET /api/procesos/registro-accesos/buscar-por-telefono?telefono=123456&nombre=NombrePrivada
// Busca residencia por multiples campos de telefono para identificar llamadas entrantes
// El parametro nombre (opcional) es el display_name del SIP que puede contener el nombre de la privada
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const telefono = searchParams.get("telefono");
    const nombre = searchParams.get("nombre"); // SIP display_name (puede ser nombre de privada)

    if (!telefono || telefono.trim() === "") {
      return NextResponse.json(
        { error: "El parametro telefono es requerido" },
        { status: 400 }
      );
    }

    const cleanNumber = telefono.replace(/\D/g, "");
    const last10 = cleanNumber.length > 10 ? cleanNumber.slice(-10) : null;

    // Construir todas las variantes del numero a buscar
    const numberVariants = [cleanNumber, telefono];
    if (last10) numberVariants.push(last10);

    // matchLevel indica si la coincidencia fue a nivel residencia (exacta) o privada (general)
    let matchLevel: "residencia" | "privada" = "residencia";

    // 1. Buscar en residencia por telefonoInterfon (busqueda principal)
    let residencia = await prisma.residencia.findFirst({
      where: {
        estatusId: { in: [1, 2, 3] },
        OR: numberVariants.flatMap((num) => [
          { telefonoInterfon: num },
        ]),
      },
      select: residenciaSelect,
    });

    // 2. Si no se encuentra, buscar por interfon, telefono1 y telefono2
    if (!residencia) {
      residencia = await prisma.residencia.findFirst({
        where: {
          estatusId: { in: [1, 2, 3] },
          OR: numberVariants.flatMap((num) => [
            { interfon: num },
            { telefono1: num },
            { telefono2: num },
          ]),
        },
        select: residenciaSelect,
      });
    }

    // 3. Si aun no se encuentra, buscar via privada (telefono/celular de la privada)
    //    Solo se identifica la privada, no se asigna una residencia por defecto
    if (!residencia) {
      const privada = await prisma.privada.findFirst({
        where: {
          estatusId: { in: [1, 2] },
          OR: numberVariants.flatMap((num) => [
            { telefono: num },
            { celular: num },
          ]),
        },
        select: { id: true, descripcion: true },
      });

      if (privada) {
        matchLevel = "privada";
        return NextResponse.json({
          found: true,
          matchLevel,
          privada: { id: privada.id, descripcion: privada.descripcion },
          data: null,
        });
      }
    }

    // 4. Ultimo recurso: buscar por nombre de privada (SIP display_name)
    if (!residencia && nombre && nombre.trim() !== "") {
      const privada = await prisma.privada.findFirst({
        where: {
          estatusId: { in: [1, 2] },
          descripcion: {
            contains: nombre.trim(),
          },
        },
        select: { id: true, descripcion: true },
      });

      if (privada) {
        matchLevel = "privada";
        return NextResponse.json({
          found: true,
          matchLevel,
          privada: { id: privada.id, descripcion: privada.descripcion },
          data: null,
        });
      }
    }

    if (!residencia) {
      return NextResponse.json(
        { found: false, message: "No se encontro residencia con ese telefono" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      found: true,
      matchLevel,
      data: residencia,
    });
  } catch (error) {
    console.error("Error al buscar residencia por telefono:", error);
    return NextResponse.json(
      { error: "Error al buscar residencia por telefono" },
      { status: 500 }
    );
  }
}
