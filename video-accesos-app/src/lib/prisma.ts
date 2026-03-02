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

// All table/column pairs known to contain zero dates in this legacy DB
const ZERO_DATE_COLUMNS = [
  { table: "privadas", column: "vence_contrato" },
  { table: "empleados", column: "fecha_baja" },
  { table: "usuarios", column: "cambio_contrasena" },
] as const;

export async function fixZeroDates() {
  if (zeroDatesFixed) return;
  try {
    for (const { table, column } of ZERO_DATE_COLUMNS) {
      // Step 1: Try to align DB column with Prisma schema (DateTime? = nullable)
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE ${table} MODIFY COLUMN ${column} DATE NULL`
        );
      } catch {
        // ALTER may fail if user lacks ALTER privilege; continue to try UPDATE
      }

      // Step 2: Replace invalid zero dates with NULL
      try {
        const result: number = await prisma.$executeRawUnsafe(
          `UPDATE ${table} SET ${column} = NULL WHERE ${column} < '1000-01-01'`
        );
        if (result > 0) {
          console.log(
            `[DB] Fixed ${result} rows with invalid zero dates in ${table}.${column}`
          );
        }
      } catch {
        // Fallback: if NULL still not allowed, set to a valid sentinel date
        try {
          const result: number = await prisma.$executeRawUnsafe(
            `UPDATE ${table} SET ${column} = '1970-01-01' WHERE ${column} < '1000-01-01'`
          );
          if (result > 0) {
            console.log(
              `[DB] Fixed ${result} rows (fallback to 1970-01-01) in ${table}.${column}`
            );
          }
        } catch (e) {
          console.error(`[DB] Error fixing zero dates in ${table}.${column}:`, e);
        }
      }
    }
    zeroDatesFixed = true;
  } catch (e) {
    console.error("[DB] Error fixing zero dates:", e);
  }
}
