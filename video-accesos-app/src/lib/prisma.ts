import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// One-time sanitization for legacy MySQL zero-dates ('0000-00-00') that Prisma
// cannot parse.  Runs at most once per server lifecycle.
const sanitized = new Set<string>();

export async function sanitizeLegacyDates() {
  if (sanitized.has("dates")) return;
  sanitized.add("dates");
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE privadas SET vence_contrato = NULL WHERE vence_contrato = '0000-00-00'`
    );
  } catch {
    // Table may not exist yet or already clean – safe to ignore
  }
}
