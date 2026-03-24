-- ============================================================
-- Script para corregir lecturas de tarjetas con año al inicio
-- Ejemplo: "20255361294" -> "5361294"
-- ============================================================

-- PASO 1: DIAGNOSTICO - Ver cuántas tarjetas tienen año al inicio
-- Ejecutar primero para revisar antes de modificar

SELECT
  LEFT(lectura, 4) AS anio_prefijo,
  COUNT(*) AS cantidad,
  GROUP_CONCAT(tarjeta_id ORDER BY tarjeta_id LIMIT 10) AS ejemplo_ids
FROM tarjetas
WHERE lectura REGEXP '^(2020|2021|2022|2023|2024|2025|2026)'
  AND estatus_id != 0
  AND tipo_id != 0
GROUP BY LEFT(lectura, 4)
ORDER BY anio_prefijo;

-- PASO 2: Ver detalle de tarjetas afectadas con su estado
SELECT
  t.tarjeta_id,
  t.lectura AS lectura_actual,
  SUBSTRING(t.lectura, 5) AS lectura_corregida,
  t.estatus_id,
  CASE t.estatus_id
    WHEN 1 THEN 'Disponible'
    WHEN 2 THEN 'Asignada'
    WHEN 3 THEN 'Danada'
    WHEN 4 THEN 'Consignacion'
    WHEN 5 THEN 'Baja'
  END AS estado,
  t.tipo_id,
  t.observaciones
FROM tarjetas t
WHERE t.lectura REGEXP '^(2020|2021|2022|2023|2024|2025|2026)'
  AND t.estatus_id != 0
  AND t.tipo_id != 0
ORDER BY t.lectura;

-- PASO 3: Verificar si habra DUPLICADOS despues de la correccion
-- (lecturas que ya existen sin el prefijo del año)
-- Si esta consulta devuelve filas, esas tarjetas necesitan atencion manual
SELECT
  t.tarjeta_id AS id_con_anio,
  t.lectura AS lectura_con_anio,
  t.estatus_id AS estado_con_anio,
  d.tarjeta_id AS id_duplicado,
  d.lectura AS lectura_duplicado,
  d.estatus_id AS estado_duplicado
FROM tarjetas t
INNER JOIN tarjetas d ON d.lectura = SUBSTRING(t.lectura, 5) AND d.tarjeta_id != t.tarjeta_id
WHERE t.lectura REGEXP '^(2020|2021|2022|2023|2024|2025|2026)'
  AND t.estatus_id != 0
  AND t.tipo_id != 0
ORDER BY SUBSTRING(t.lectura, 5), t.lectura;

-- ============================================================
-- PASO 4: CORRECCION
-- Solo ejecutar si el PASO 3 no muestra conflictos,
-- o despues de resolver los duplicados manualmente
-- ============================================================

-- 4a. Corregir lecturas en tabla de tarjetas (catalogo)
UPDATE tarjetas
SET lectura = SUBSTRING(lectura, 5),
    observaciones = CONCAT('Lectura corregida (tenia prefijo año): ', lectura)
WHERE lectura REGEXP '^(2020|2021|2022|2023|2024|2025|2026)'
  AND estatus_id != 0
  AND tipo_id != 0;

-- Verificar resultado
SELECT ROW_COUNT() AS tarjetas_corregidas;

-- PASO 5: Ver resultado final
SELECT
  tarjeta_id,
  lectura,
  estatus_id,
  observaciones
FROM tarjetas
WHERE observaciones LIKE 'Lectura corregida (tenia prefijo%'
ORDER BY tarjeta_id DESC
LIMIT 50;
