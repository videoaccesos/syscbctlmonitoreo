-- Fix: usuario_id column in registros_generales and residencias_visitantes
-- is TINYINT(4) (max 127) but should be INT to match usuarios.usuario_id
-- This causes Prisma P2020 "Value out of range" when usuario_id > 127
--
-- Run this on the production database to permanently fix the issue.
-- After running, update prisma/schema.prisma to remove @db.TinyInt from
-- both RegistroGeneral.usuarioModId and Visita.usuarioModId, and remove
-- the Math.min() clamp from the route handlers.

ALTER TABLE registros_generales
  MODIFY COLUMN usuario_id INT NOT NULL DEFAULT 0;

ALTER TABLE residencias_visitantes
  MODIFY COLUMN usuario_id INT NOT NULL DEFAULT 0;
