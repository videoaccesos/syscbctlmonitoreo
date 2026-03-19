import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/procesos/registro-accesos/buscar-por-telefono?telefono=123456
// Busca primero en residencia.telefonoInterfon, luego en privada.telefono/celular
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const telefono = searchParams.get("telefono");

    if (!telefono || telefono.trim() === "") {
      return NextResponse.json(
        { error: "El parametro telefono es requerido" },
        { status: 400 }
      );
    }

    const cleanNumber = telefono.replace(/\D/g, "");
    const last10 = cleanNumber.length > 10 ? cleanNumber.slice(-10) : null;

    console.log("[buscar-por-telefono] ========================================");
    console.log("[buscar-por-telefono] Caller ID recibido:", telefono);
    console.log("[buscar-por-telefono] Numero limpio:", cleanNumber);
    if (last10) console.log("[buscar-por-telefono] Ultimos 10 digitos:", last10);

    // ---------------------------------------------------------------
    // PASO 1: Buscar por residencia.telefonoInterfon (match exacto)
    // ---------------------------------------------------------------
    const residenciaConditions = [
      { telefonoInterfon: cleanNumber },
      { telefonoInterfon: telefono },
      ...(last10 ? [{ telefonoInterfon: last10 }] : []),
    ];

    console.log("[buscar-por-telefono] Paso 1: Buscando en residencia.telefonoInterfon...");

    const residencia = await prisma.residencia.findFirst({
      where: {
        telefonoInterfon: { not: "" },
        estatusId: { in: [1, 2, 3] },
        OR: residenciaConditions,
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
          orderBy: { apePaterno: "asc" },
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
          orderBy: { apePaterno: "asc" },
        },
      },
    });

    if (residencia) {
      console.log("[buscar-por-telefono] MATCH RESIDENCIA encontrado!");
      console.log("[buscar-por-telefono]   Privada:", residencia.privada?.descripcion, "(ID:", residencia.privada?.id, ")");
      console.log("[buscar-por-telefono]   Casa:", residencia.nroCasa, residencia.calle);
      console.log("[buscar-por-telefono]   telefonoInterfon:", residencia.telefonoInterfon);
      console.log("[buscar-por-telefono]   Residentes:", residencia.residentes.length);
      console.log("[buscar-por-telefono] ========================================");

      return NextResponse.json({
        found: true,
        matchLevel: "residencia",
        data: residencia,
      });
    }

    // ---------------------------------------------------------------
    // PASO 2: Buscar por privada.telefono o privada.celular
    // ---------------------------------------------------------------
    const privadaConditions = [
      { telefono: cleanNumber },
      { telefono: telefono },
      { celular: cleanNumber },
      { celular: telefono },
      ...(last10
        ? [{ telefono: last10 }, { celular: last10 }]
        : []),
    ];

    console.log("[buscar-por-telefono] Paso 2: Buscando en privada.telefono / privada.celular...");

    const privada = await prisma.privada.findFirst({
      where: {
        estatusId: { in: [1, 2, 3] },
        OR: privadaConditions,
      },
      select: {
        id: true,
        descripcion: true,
        telefono: true,
        celular: true,
      },
    });

    if (privada) {
      const matchedField = privadaConditions.some(
        (c) => ("telefono" in c && (c.telefono === cleanNumber || c.telefono === telefono || c.telefono === last10))
      ) && privada.telefono ? "telefono" : "celular";

      console.log("[buscar-por-telefono] MATCH PRIVADA encontrado!");
      console.log("[buscar-por-telefono]   Privada:", privada.descripcion, "(ID:", privada.id, ")");
      console.log("[buscar-por-telefono]   Campo que hizo match:", matchedField);
      console.log("[buscar-por-telefono]   privada.telefono:", privada.telefono || "(vacio)");
      console.log("[buscar-por-telefono]   privada.celular:", privada.celular || "(vacio)");
      console.log("[buscar-por-telefono] ========================================");

      return NextResponse.json({
        found: true,
        matchLevel: "privada",
        privada,
      });
    }

    // ---------------------------------------------------------------
    // SIN MATCH - Log para depuración
    // ---------------------------------------------------------------
    console.log("[buscar-por-telefono] SIN MATCH para:", telefono);
    console.log("[buscar-por-telefono] Numero no encontrado en residencia.telefonoInterfon, privada.telefono ni privada.celular");
    console.log("[buscar-por-telefono] ========================================");

    return NextResponse.json(
      { found: false, message: "No se encontro residencia ni privada con ese telefono" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[buscar-por-telefono] ERROR:", error);
    return NextResponse.json(
      { error: "Error al buscar por telefono" },
      { status: 500 }
    );
  }
}
