import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tables = ["privadas", "residencias", "residencias_residentes"];
  for (const table of tables) {
    console.log(`\n=== ${table} ===`);
    const cols: { Field: string; Type: string }[] = await prisma.$queryRawUnsafe(
      `DESCRIBE ${table}`
    );
    for (const c of cols) {
      console.log(`  ${c.Field}  (${c.Type})`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
