import { prisma } from "@/lib/prisma";

let initialized = false;

/**
 * Verifica que la tabla folios_mensualidades tenga las columnas requeridas.
 * La tabla ya existe en producción con PK asignacion_id.
 * Solo agrega columnas faltantes sin afectar datos existentes.
 * Se ejecuta una sola vez por instancia del servidor.
 */
export async function ensureMensualidadesSchema(): Promise<void> {
  if (initialized) return;

  // Agregar columnas faltantes (si la tabla ya existía con estructura vieja)
  const alterStatements = [
    "ALTER TABLE folios_mensualidades ADD COLUMN periodo VARCHAR(7) NOT NULL DEFAULT ''",
    "ALTER TABLE folios_mensualidades ADD COLUMN estatus_id TINYINT NOT NULL DEFAULT 1",
    "ALTER TABLE folios_mensualidades ADD COLUMN usuario_mod_id INT NOT NULL DEFAULT 0",
    "ALTER TABLE folios_mensualidades ADD COLUMN observaciones TEXT",
    "ALTER TABLE folios_mensualidades ADD COLUMN fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
  ];

  for (const sql of alterStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Code 1060 = Duplicate column name (ya existe, ignorar)
      if (!msg.includes("1060")) {
        console.warn("ensureMensualidadesSchema ALTER warning:", msg);
      }
    }
  }

  initialized = true;
  console.log("ensureMensualidadesSchema: tabla verificada correctamente");
}
