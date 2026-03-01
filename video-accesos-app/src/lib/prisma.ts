import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Fix MySQL zero dates ('0000-00-00') that Prisma cannot parse (P2020).
// Runs once per application lifecycle; subsequent calls are no-ops.
let zeroDatesFixed = false;
export async function fixZeroDates() {
  if (zeroDatesFixed) return;
  try {
    const result: number = await prisma.$executeRawUnsafe(
      `UPDATE privadas SET vence_contrato = NULL WHERE vence_contrato IS NOT NULL AND vence_contrato < '1000-01-01'`
    );
    zeroDatesFixed = true;
    if (result > 0) {
      console.log(
        `[DB] Fixed ${result} rows with invalid zero dates in privadas.vence_contrato`
      );
    }
  } catch (e) {
    console.error("[DB] Error fixing zero dates:", e);
  }
}
