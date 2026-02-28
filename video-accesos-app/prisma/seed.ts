import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Este seed NO inserta datos - la BD de producción ya contiene toda la información.
// Solo verifica la conexión y muestra conteos de tablas principales.
async function main() {
  console.log("Verificando conexión a BD producción wwwvideo_video_accesos...\n");

  const counts = await Promise.all([
    prisma.usuario.count().then((c: number) => ({ tabla: "usuarios", total: c })),
    prisma.empleado.count().then((c: number) => ({ tabla: "empleados", total: c })),
    prisma.privada.count().then((c: number) => ({ tabla: "privadas", total: c })),
    prisma.residencia.count().then((c: number) => ({ tabla: "residencias", total: c })),
    prisma.residente.count().then((c: number) => ({
      tabla: "residencias_residentes",
      total: c,
    })),
    prisma.registroAcceso.count().then((c: number) => ({
      tabla: "registros_accesos",
      total: c,
    })),
    prisma.turno.count().then((c: number) => ({ tabla: "turnos", total: c })),
    prisma.tarjeta.count().then((c: number) => ({ tabla: "tarjetas", total: c })),
    prisma.ordenServicio.count().then((c: number) => ({
      tabla: "ordenes_servicio",
      total: c,
    })),
    prisma.grupoUsuario.count().then((c: number) => ({
      tabla: "grupos_usuarios",
      total: c,
    })),
  ]);

  console.log("Conteo de registros por tabla:");
  console.log("─".repeat(45));
  for (const { tabla, total } of counts) {
    console.log(`  ${tabla.padEnd(30)} ${total.toLocaleString()}`);
  }
  console.log("─".repeat(45));
  console.log("\nConexión exitosa. BD lista para usar.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error de conexión:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
