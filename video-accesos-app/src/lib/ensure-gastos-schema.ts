import { prisma } from "@/lib/prisma";

let initialized = false;

/**
 * Asegura que la tabla gastos tenga las columnas nuevas (tipo_destino, cuenta_gasto_id)
 * y que la tabla cuentas_gasto exista.
 * Se ejecuta una sola vez por instancia del servidor.
 */
export async function ensureGastosSchema(): Promise<void> {
  if (initialized) return;

  // 1. Crear tabla cuentas_gasto si no existe
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS cuentas_gasto (
        cuenta_gasto_id INT AUTO_INCREMENT PRIMARY KEY,
        clave VARCHAR(20) NOT NULL DEFAULT '',
        descripcion VARCHAR(100) NOT NULL DEFAULT '',
        estatus_id TINYINT NOT NULL DEFAULT 1
      )
    `);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("ensureGastosSchema: cuentas_gasto table:", msg);
  }

  // 2. Agregar columnas faltantes a gastos
  const alterStatements = [
    "ALTER TABLE gastos ADD COLUMN tipo_destino TINYINT NOT NULL DEFAULT 0",
    "ALTER TABLE gastos ADD COLUMN cuenta_gasto_id INT NOT NULL DEFAULT 0",
  ];

  for (const sql of alterStatements) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // 1060 = Duplicate column name (ya existe, ignorar)
      if (!msg.includes("1060")) {
        console.warn("ensureGastosSchema ALTER warning:", msg);
      }
    }
  }

  // 3. Crear tabla prenomina si no existe
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS prenomina (
        prenomina_id INT AUTO_INCREMENT PRIMARY KEY,
        empleado_id INT NOT NULL,
        periodo VARCHAR(7) NOT NULL DEFAULT '',
        quincena TINYINT NOT NULL DEFAULT 1,
        dias_trabajados INT NOT NULL DEFAULT 15,
        sueldo_quincenal DOUBLE NOT NULL DEFAULT 0,
        deducciones DOUBLE NOT NULL DEFAULT 0,
        percepciones DOUBLE NOT NULL DEFAULT 0,
        total_pagar DOUBLE NOT NULL DEFAULT 0,
        estatus_id TINYINT NOT NULL DEFAULT 1,
        fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("ensureGastosSchema: prenomina table:", msg);
  }

  // 4. Agregar columnas faltantes a empleados
  const empleadosAlters = [
    "ALTER TABLE empleados ADD COLUMN sueldo DOUBLE NOT NULL DEFAULT 0",
    "ALTER TABLE empleados ADD COLUMN banco VARCHAR(50) NOT NULL DEFAULT ''",
    "ALTER TABLE empleados ADD COLUMN nro_tarjeta VARCHAR(20) NOT NULL DEFAULT ''",
    "ALTER TABLE empleados ADD COLUMN clabe VARCHAR(20) NOT NULL DEFAULT ''",
    "ALTER TABLE empleados ADD COLUMN nro_cuenta VARCHAR(20) NOT NULL DEFAULT ''",
  ];

  for (const sql of empleadosAlters) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("1060")) {
        console.warn("ensureGastosSchema empleados ALTER warning:", msg);
      }
    }
  }

  initialized = true;
  console.log("ensureGastosSchema: todas las tablas y columnas verificadas");
}
