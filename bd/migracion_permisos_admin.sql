-- ============================================================
-- Migración: Permisos para grupos Admin y Administrador
-- Permite a estos grupos gestionar permisos de otros grupos
-- ============================================================

-- --------------------------------------------------------
-- 1. Agregar subprocesos faltantes para GRUPOS DE USUARIO (proceso_id = 5)
--    Actualmente solo existe: subproceso 8 (Nuevo Grupo Usuario)
-- --------------------------------------------------------

INSERT INTO `subprocesos` (`proceso_id`, `nombre`, `funcion`, `usuario_id`)
VALUES (5, 'Guardar Grupo Usuario', 'Guardar', 1);

INSERT INTO `subprocesos` (`proceso_id`, `nombre`, `funcion`, `usuario_id`)
VALUES (5, 'Buscar Grupo Usuario', 'Buscar', 1);

INSERT INTO `subprocesos` (`proceso_id`, `nombre`, `funcion`, `usuario_id`)
VALUES (5, 'Modificar Grupo Usuario', 'Modificar', 1);

INSERT INTO `subprocesos` (`proceso_id`, `nombre`, `funcion`, `usuario_id`)
VALUES (5, 'Eliminar Grupo Usuario', 'Eliminar', 1);

INSERT INTO `subprocesos` (`proceso_id`, `nombre`, `funcion`, `usuario_id`)
VALUES (5, 'Agregar Miembro', 'AgregarMiembro', 1);

INSERT INTO `subprocesos` (`proceso_id`, `nombre`, `funcion`, `usuario_id`)
VALUES (5, 'Eliminar Miembro', 'EliminarMiembro', 1);

INSERT INTO `subprocesos` (`proceso_id`, `nombre`, `funcion`, `usuario_id`)
VALUES (5, 'Agregar Permiso', 'AgregarPermiso', 1);

INSERT INTO `subprocesos` (`proceso_id`, `nombre`, `funcion`, `usuario_id`)
VALUES (5, 'Eliminar Permiso', 'EliminarPermiso', 1);

-- --------------------------------------------------------
-- 2. Asignar los nuevos subprocesos al grupo Admin (grupo_usuario_id = 1)
--    Usa subconsulta para obtener los IDs recién creados
-- --------------------------------------------------------

INSERT INTO `permisos_acceso` (`grupo_usuario_id`, `subproceso_id`)
SELECT 1, SP.subproceso_id
FROM `subprocesos` SP
WHERE SP.proceso_id = 5
  AND SP.subproceso_id NOT IN (
    SELECT PA.subproceso_id FROM `permisos_acceso` PA WHERE PA.grupo_usuario_id = 1
  );

-- --------------------------------------------------------
-- 3. Asignar permisos al grupo Administrador (grupo_usuario_id = 2)
--    para el módulo de seguridad completo
-- --------------------------------------------------------

-- 3a. GRUPOS DE USUARIO (proceso_id = 5) - Todos los subprocesos
INSERT INTO `permisos_acceso` (`grupo_usuario_id`, `subproceso_id`)
SELECT 2, SP.subproceso_id
FROM `subprocesos` SP
WHERE SP.proceso_id = 5
  AND SP.subproceso_id NOT IN (
    SELECT PA.subproceso_id FROM `permisos_acceso` PA WHERE PA.grupo_usuario_id = 2
  );

-- 3b. USUARIOS (proceso_id = 6) - Todos los subprocesos
INSERT INTO `permisos_acceso` (`grupo_usuario_id`, `subproceso_id`)
SELECT 2, SP.subproceso_id
FROM `subprocesos` SP
WHERE SP.proceso_id = 6
  AND SP.subproceso_id NOT IN (
    SELECT PA.subproceso_id FROM `permisos_acceso` PA WHERE PA.grupo_usuario_id = 2
  );

-- 3c. PROCESOS (proceso_id = 9) - Todos los subprocesos
INSERT INTO `permisos_acceso` (`grupo_usuario_id`, `subproceso_id`)
SELECT 2, SP.subproceso_id
FROM `subprocesos` SP
WHERE SP.proceso_id = 9
  AND SP.subproceso_id NOT IN (
    SELECT PA.subproceso_id FROM `permisos_acceso` PA WHERE PA.grupo_usuario_id = 2
  );

-- --------------------------------------------------------
-- Verificación: Consulta para validar los permisos asignados
-- --------------------------------------------------------
-- SELECT GU.nombre AS grupo, P.nombre AS proceso, SP.nombre AS subproceso, SP.funcion
-- FROM permisos_acceso PA
-- INNER JOIN grupos_usuarios GU ON PA.grupo_usuario_id = GU.grupo_usuario_id
-- INNER JOIN subprocesos SP ON PA.subproceso_id = SP.subproceso_id
-- INNER JOIN procesos P ON SP.proceso_id = P.proceso_id
-- WHERE PA.grupo_usuario_id IN (1, 2)
--   AND SP.proceso_id IN (5, 6, 9)
-- ORDER BY GU.nombre, P.nombre, SP.nombre;
