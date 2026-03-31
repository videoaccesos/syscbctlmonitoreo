import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const privadas = await prisma.privada.findMany({
    where: { estatusId: { in: [1, 2] } },
    select: { id: true, descripcion: true },
    orderBy: { descripcion: "asc" },
  });

  return NextResponse.json(privadas);
}
