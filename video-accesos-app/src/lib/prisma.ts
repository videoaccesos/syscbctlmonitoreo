import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Fix MySQL zero dates ('0000-00-00') that Prisma cannot parse (P2020).
// The DB column may have a NOT NULL constraint that conflicts with the Prisma
// schema (DateTime?), so we first try to make it nullable, then clean up.
// Runs once per application lifecycle; subsequent calls are no-ops.
let zeroDatesFixed = false;
export async function fixZeroDates() {
  if (zeroDatesFixed) return;
  try {
    // Step 1: Align DB column with Prisma schema (DateTime? = nullable)
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE privadas MODIFY COLUMN vence_contrato DATE NULL`
      );
    } catch {
      // ALTER may fail if user lacks ALTER privilege; continue to try UPDATE
    }

    // Step 2: Replace invalid zero dates with NULL
    const result: number = await prisma.$executeRawUnsafe(
      `UPDATE privadas SET vence_contrato = NULL WHERE vence_contrato < '1000-01-01'`
    );
    zeroDatesFixed = true;
    if (result > 0) {
      console.log(
        `[DB] Fixed ${result} rows with invalid zero dates in privadas.vence_contrato`
      );
    }
  } catch {
    // Fallback: if NULL still not allowed, set to a valid sentinel date
    try {
      const result: number = await prisma.$executeRawUnsafe(
        `UPDATE privadas SET vence_contrato = '1970-01-01' WHERE vence_contrato < '1000-01-01'`
      );
      zeroDatesFixed = true;
      if (result > 0) {
        console.log(
          `[DB] Fixed ${result} rows (fallback to 1970-01-01) in privadas.vence_contrato`
        );
      }
    } catch (e) {
      console.error("[DB] Error fixing zero dates:", e);
    }
  }
}
