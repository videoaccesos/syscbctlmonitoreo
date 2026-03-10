-- =============================================================================
-- Fix: Cambiar columna usuario_id de TINYINT/SMALLINT a INT(11) en 8 tablas
-- Motivo: El ID del usuario logueado puede exceder 127 (limite de TINYINT),
--         causando error Prisma P2020 "Value out of range" al crear/editar registros.
-- Fecha: 2026-03-10
-- =============================================================================

ALTER TABLE empleados MODIFY COLUMN usuario_id INT(11) NOT NULL DEFAULT 0;
ALTER TABLE puestos MODIFY COLUMN usuario_id INT(11) NOT NULL DEFAULT 0;
ALTER TABLE turnos MODIFY COLUMN usuario_id INT(11) NOT NULL DEFAULT 0;
ALTER TABLE fallas MODIFY COLUMN usuario_id INT(11) NOT NULL DEFAULT 0;
ALTER TABLE codigos_servicio MODIFY COLUMN usuario_id INT(11) NOT NULL DEFAULT 0;
ALTER TABLE diagnosticos MODIFY COLUMN usuario_id INT(11) NOT NULL DEFAULT 0;
ALTER TABLE supervicion_llamadas MODIFY COLUMN usuario_id INT(11) NOT NULL DEFAULT 0;
ALTER TABLE ordenes_servicio MODIFY COLUMN usuario_id INT(11) NOT NULL DEFAULT 0;
