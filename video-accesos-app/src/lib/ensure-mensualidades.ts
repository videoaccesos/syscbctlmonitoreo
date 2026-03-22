import { prisma } from "@/lib/prisma";

let initialized = false;

/**
 * Asegura que la tabla folios_mensualidades exista y tenga las columnas requeridas.
 * Crea la tabla si no existe, o agrega columnas faltantes sin afectar datos existentes.
 * Se ejecuta una sola vez por instancia del servidor.
 */
export async function ensureMensualidadesSchema(): Promise<void> {
  if (initialized) return;

  // Paso 1: Crear tabla si no existe
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS folios_mensualidades (
        folio_mensualidad_id INT AUTO_INCREMENT PRIMARY KEY,
        privada_id INT NOT NULL DEFAULT 0,
        periodo VARCHAR(7) NOT NULL DEFAULT '',
        total FLOAT NOT NULL DEFAULT 0,
        tipo_pago TINYINT NOT NULL DEFAULT 1,
        fecha DATE NULL,
        observaciones TEXT,
        estatus_id TINYINT NOT NULL DEFAULT 1,
        fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        usuario_mod_id INT NOT NULL DEFAULT 0,
        INDEX idx_privada_periodo (privada_id, periodo),
        INDEX idx_periodo (periodo),
        INDEX idx_fecha (fecha)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);
  } catch (e: unknown) {
    console.warn("ensureMensualidadesSchema CREATE TABLE warning:", e instanceof Error ? e.message : String(e));
  }

  // Paso 2: Agregar columnas faltantes (si la tabla ya existía con estructura vieja)
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

  // Paso 3: Rellenar periodo para registros existentes que lo tengan vacío
  // Derivar periodo de la columna fecha existente (YYYY-MM)
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE folios_mensualidades
       SET periodo = DATE_FORMAT(fecha, '%Y-%m')
       WHERE (periodo IS NULL OR periodo = '') AND fecha IS NOT NULL`
    );
  } catch (e: unknown) {
    console.warn("ensureMensualidadesSchema backfill warning:", e instanceof Error ? e.message : String(e));
  }

  // Paso 4: Agregar índice si no existe
  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE folios_mensualidades ADD INDEX idx_privada_periodo (privada_id, periodo)"
    );
  } catch {
    // 1061 = Duplicate key name, ignorar
  }

  initialized = true;
  console.log("ensureMensualidadesSchema: tabla verificada/actualizada correctamente");
}
