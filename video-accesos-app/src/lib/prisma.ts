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
  { table: "usuarios", column: "fecha_modificacion", fallback: "NOW()" },
  { table: "usuarios", column: "ultima_sesion", fallback: "NOW()" },
  { table: "grupos_usuarios", column: "fecha_modificacion", fallback: "NOW()" },
] as const;

export async function fixZeroDates() {
  if (zeroDatesFixed) return;
  try {
    for (const entry of ZERO_DATE_COLUMNS) {
      const { table, column } = entry;
      const fallbackValue = "fallback" in entry && entry.fallback ? entry.fallback : null;

      // Step 1: Try to align DB column with Prisma schema (DateTime? = nullable)
      if (!fallbackValue) {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE ${table} MODIFY COLUMN ${column} DATE NULL`
          );
        } catch {
          // ALTER may fail if user lacks ALTER privilege; continue to try UPDATE
        }
      }

      // Step 2: Replace invalid zero dates
      try {
        const replacement = fallbackValue || "NULL";
        const result: number = await prisma.$executeRawUnsafe(
          `UPDATE ${table} SET ${column} = ${replacement} WHERE ${column} < '1000-01-01'`
        );
        if (result > 0) {
          console.log(
            `[DB] Fixed ${result} rows with invalid zero dates in ${table}.${column} -> ${replacement}`
          );
        }
      } catch {
        // Fallback: set to a valid sentinel date
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

    // Clean up orphaned grupo-usuario detail records (usuarios that no longer exist)
    try {
      const result: number = await prisma.$executeRawUnsafe(
        `DELETE gd FROM grupos_usuarios_detalles gd
         LEFT JOIN usuarios u ON gd.usuario_id = u.usuario_id
         WHERE u.usuario_id IS NULL`
      );
      if (result > 0) {
        console.log(
          `[DB] Cleaned up ${result} orphaned grupo-usuario detail records`
        );
      }
    } catch (e) {
      console.error("[DB] Error cleaning orphaned grupo-usuario details:", e);
    }

    zeroDatesFixed = true;
  } catch (e) {
    console.error("[DB] Error fixing zero dates:", e);
  }
}
