import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const privadaSelect = {
  id: true,
  descripcion: true,
  telefono: true,
  video1: true,
  aliasVideo1: true,
  video2: true,
  aliasVideo2: true,
  video3: true,
  aliasVideo3: true,
  dns1: true,
  puerto1: true,
  contrasena1: true,
  dns2: true,
  puerto2: true,
  contrasena2: true,
  dns3: true,
  puerto3: true,
  contrasena3: true,
};

// GET /api/camera-proxy/lookup?telefono=XXX
// Busca la privada por telefono y devuelve las camaras configuradas (video_1, video_2, video_3)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const telefono = searchParams.get("telefono");
    const privadaId = searchParams.get("privada_id");

    if (!telefono && !privadaId) {
      return NextResponse.json(
        { error: "Se requiere telefono o privada_id" },
        { status: 400 }
      );
    }

    let privada;

    if (privadaId) {
      // Busqueda directa por ID
      privada = await prisma.privada.findFirst({
        where: { id: parseInt(privadaId), estatusId: { in: [1, 2] } },
        select: privadaSelect,
      });
    } else if (telefono) {
      const cleanNumber = telefono.replace(/\D/g, "");
      const last10 = cleanNumber.length > 10 ? cleanNumber.slice(-10) : null;
      const numberVariants = [cleanNumber, telefono];
      if (last10) numberVariants.push(last10);

      // 1. Buscar directamente en privada por telefono/celular
      privada = await prisma.privada.findFirst({
        where: {
          estatusId: { in: [1, 2] },
          OR: numberVariants.flatMap((num) => [
            { telefono: num },
            { celular: num },
          ]),
        },
        select: privadaSelect,
      });

      // 2. Si no se encuentra, buscar via residencia (telefonoInterfon, interfon, telefono1, telefono2)
      if (!privada) {
        const residencia = await prisma.residencia.findFirst({
          where: {
            estatusId: { in: [1, 2, 3] },
            OR: numberVariants.flatMap((num) => [
              { telefonoInterfon: num },
              { interfon: num },
              { telefono1: num },
              { telefono2: num },
            ]),
          },
          select: { privadaId: true },
        });

        if (residencia) {
          privada = await prisma.privada.findFirst({
            where: { id: residencia.privadaId, estatusId: { in: [1, 2] } },
            select: privadaSelect,
          });
        }
      }
    }

    if (!privada) {
      return NextResponse.json(
        { found: false, message: "No se encontro privada con ese telefono" },
        { status: 200 }
      );
    }

    // Construir lista de camaras disponibles (sin exponer URLs ni credenciales)
    const cameras = [];
    if (privada.video1 && privada.video1.trim() !== "") {
      cameras.push({
        index: 1,
        alias: privada.aliasVideo1 || "Camara 1",
        available: true,
      });
    }
    if (privada.video2 && privada.video2.trim() !== "") {
      cameras.push({
        index: 2,
        alias: privada.aliasVideo2 || "Camara 2",
        available: true,
      });
    }
    if (privada.video3 && privada.video3.trim() !== "") {
      cameras.push({
        index: 3,
        alias: privada.aliasVideo3 || "Camara 3",
        available: true,
      });
    }

    return NextResponse.json({
      found: true,
      privada_id: privada.id,
      privada: privada.descripcion,
      cameras,
    });
  } catch (error) {
    console.error("Error al buscar camaras por telefono:", error);
    return NextResponse.json(
      { error: "Error al buscar camaras" },
      { status: 500 }
    );
  }
}
