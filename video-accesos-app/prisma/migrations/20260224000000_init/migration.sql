-- CreateTable
CREATE TABLE `usuarios` (
    `usuario_id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario` VARCHAR(50) NOT NULL,
    `contrasena` VARCHAR(255) NOT NULL,
    `modificar_fechas` BOOLEAN NOT NULL DEFAULT false,
    `ultima_sesion` DATETIME(3) NULL,
    `direccion_ip` VARCHAR(45) NOT NULL DEFAULT '',
    `cambio_contrasena` DATETIME(3) NULL,
    `empleado_id` INTEGER NULL,
    `privada_id` INTEGER NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `clave_google` VARCHAR(100) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_usuario_key`(`usuario`),
    PRIMARY KEY (`usuario_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grupos_usuarios` (
    `grupo_usuario_id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NOT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `grupos_usuarios_nombre_key`(`nombre`),
    PRIMARY KEY (`grupo_usuario_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grupos_usuarios_detalles` (
    `grupo_usuario_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,

    PRIMARY KEY (`grupo_usuario_id`, `usuario_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procesos` (
    `proceso_id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NOT NULL,
    `ruta_acceso` TEXT NULL,
    `proceso_padre_id` INTEGER NULL,

    PRIMARY KEY (`proceso_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subprocesos` (
    `subproceso_id` INTEGER NOT NULL AUTO_INCREMENT,
    `proceso_id` INTEGER NOT NULL,
    `nombre` VARCHAR(50) NOT NULL,
    `funcion` VARCHAR(50) NULL,

    PRIMARY KEY (`subproceso_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permisos_acceso` (
    `grupo_usuario_id` INTEGER NOT NULL,
    `subproceso_id` INTEGER NOT NULL,

    PRIMARY KEY (`grupo_usuario_id`, `subproceso_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bitacora_inicio` (
    `bitacora_inicio_id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `fecha_inicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_fin` DATETIME(3) NULL,
    `direccion_ip` VARCHAR(45) NOT NULL,
    `hostname` VARCHAR(100) NULL,

    PRIMARY KEY (`bitacora_inicio_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `puestos` (
    `puesto_id` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(50) NOT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `puestos_descripcion_key`(`descripcion`),
    PRIMARY KEY (`puesto_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `empleados` (
    `empleado_id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NOT NULL,
    `ape_paterno` VARCHAR(50) NOT NULL,
    `ape_materno` VARCHAR(50) NOT NULL,
    `nro_seguro_social` VARCHAR(50) NULL,
    `puesto_id` INTEGER NOT NULL,
    `nro_operador` VARCHAR(4) NULL,
    `calle` VARCHAR(60) NULL,
    `nro_casa` VARCHAR(10) NULL,
    `sexo` CHAR(1) NULL,
    `colonia` VARCHAR(30) NULL,
    `telefono` VARCHAR(14) NULL,
    `celular` VARCHAR(14) NULL,
    `email` VARCHAR(60) NULL,
    `fecha_ingreso` DATE NULL,
    `fecha_baja` DATE NULL,
    `motivo_baja` TEXT NULL,
    `clave_google` VARCHAR(100) NULL,
    `permiso_admin` BOOLEAN NOT NULL DEFAULT false,
    `permiso_supervisor` BOOLEAN NOT NULL DEFAULT false,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    PRIMARY KEY (`empleado_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `turnos` (
    `turno_id` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(50) NOT NULL,
    `puesto_id` INTEGER NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `turnos_descripcion_key`(`descripcion`),
    PRIMARY KEY (`turno_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fallas` (
    `falla_id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(5) NOT NULL,
    `descripcion` VARCHAR(50) NOT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `fallas_codigo_key`(`codigo`),
    PRIMARY KEY (`falla_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materiales` (
    `material_id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(5) NOT NULL,
    `descripcion` VARCHAR(50) NOT NULL,
    `costo` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `materiales_codigo_key`(`codigo`),
    PRIMARY KEY (`material_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `codigos_servicio` (
    `codigo_servicio_id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(5) NOT NULL,
    `descripcion` VARCHAR(50) NOT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `codigos_servicio_codigo_key`(`codigo`),
    PRIMARY KEY (`codigo_servicio_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `diagnosticos` (
    `diagnostico_id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(5) NOT NULL,
    `descripcion` VARCHAR(50) NOT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `diagnosticos_codigo_key`(`codigo`),
    PRIMARY KEY (`diagnostico_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tipos_gastos` (
    `tipo_gasto_id` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(50) NOT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tipos_gastos_descripcion_key`(`descripcion`),
    PRIMARY KEY (`tipo_gasto_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `privadas` (
    `privada_id` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(80) NOT NULL,
    `ape_paterno` VARCHAR(50) NULL,
    `ape_materno` VARCHAR(50) NULL,
    `nombre` VARCHAR(50) NULL,
    `tipo_contacto_id` INTEGER NULL,
    `telefono` VARCHAR(14) NULL,
    `celular` VARCHAR(14) NULL,
    `email` VARCHAR(60) NULL,
    `historial` VARCHAR(60) NULL,
    `precio_vehicular` DECIMAL(10, 2) NULL,
    `precio_peatonal` DECIMAL(10, 2) NULL,
    `mensualidad` DECIMAL(10, 2) NULL,
    `vence_contrato` DATE NULL,
    `observaciones` TEXT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `privadas_descripcion_key`(`descripcion`),
    PRIMARY KEY (`privada_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `privadas_dns` (
    `dns_id` INTEGER NOT NULL AUTO_INCREMENT,
    `privada_id` INTEGER NOT NULL,
    `dns` VARCHAR(200) NOT NULL,
    `puerto` VARCHAR(10) NULL,
    `alias` VARCHAR(50) NULL,
    `tipo_tarjeta` INTEGER NULL,
    `contrasena` VARCHAR(50) NULL,

    PRIMARY KEY (`dns_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `privadas_videos` (
    `video_id` INTEGER NOT NULL AUTO_INCREMENT,
    `privada_id` INTEGER NOT NULL,
    `url` VARCHAR(200) NOT NULL,
    `alias` VARCHAR(50) NULL,

    PRIMARY KEY (`video_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `privadas_relays` (
    `relay_id` INTEGER NOT NULL AUTO_INCREMENT,
    `privada_id` INTEGER NOT NULL,
    `dns_id` INTEGER NOT NULL,
    `renglon` INTEGER NOT NULL,
    `concepto` VARCHAR(80) NOT NULL,
    `relay_numero` VARCHAR(10) NOT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `tiempo_activacion` INTEGER NULL,

    PRIMARY KEY (`relay_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `residencias` (
    `residencia_id` INTEGER NOT NULL AUTO_INCREMENT,
    `privada_id` INTEGER NOT NULL,
    `nro_casa` VARCHAR(10) NOT NULL,
    `calle` VARCHAR(60) NOT NULL,
    `telefono1` VARCHAR(14) NULL,
    `telefono2` VARCHAR(14) NULL,
    `interfon` VARCHAR(20) NULL,
    `telefono_interfon` VARCHAR(14) NULL,
    `observaciones` TEXT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    PRIMARY KEY (`residencia_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `residencias_residentes` (
    `residente_id` INTEGER NOT NULL AUTO_INCREMENT,
    `residencia_id` INTEGER NOT NULL,
    `ape_paterno` VARCHAR(50) NOT NULL,
    `ape_materno` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(50) NOT NULL,
    `celular` VARCHAR(14) NULL,
    `email` VARCHAR(100) NULL,
    `reportar_acceso` BOOLEAN NOT NULL DEFAULT false,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    PRIMARY KEY (`residente_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `residencias_visitantes` (
    `visitante_id` INTEGER NOT NULL AUTO_INCREMENT,
    `residencia_id` INTEGER NOT NULL,
    `ape_paterno` VARCHAR(50) NOT NULL,
    `ape_materno` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(50) NOT NULL,
    `telefono` VARCHAR(14) NULL,
    `celular` VARCHAR(14) NULL,
    `email` VARCHAR(60) NULL,
    `observaciones` TEXT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    PRIMARY KEY (`visitante_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registros_generales` (
    `registro_general_id` VARCHAR(10) NOT NULL,
    `ape_paterno` VARCHAR(50) NOT NULL,
    `ape_materno` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(50) NOT NULL,
    `telefono` VARCHAR(14) NULL,
    `celular` VARCHAR(14) NULL,
    `email` VARCHAR(60) NULL,
    `observaciones` TEXT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    PRIMARY KEY (`registro_general_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tarjetas` (
    `tarjeta_id` INTEGER NOT NULL AUTO_INCREMENT,
    `lectura` VARCHAR(20) NOT NULL,
    `tipo_id` INTEGER NOT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`tarjeta_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asignacion_tarjetas` (
    `asignacion_id` INTEGER NOT NULL AUTO_INCREMENT,
    `tarjeta_id` INTEGER NOT NULL,
    `residente_id` INTEGER NOT NULL,
    `tarjeta_sec_id` INTEGER NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_vencimiento` DATE NULL,
    `tipo_lectura` INTEGER NULL,
    `lectura_epc` VARCHAR(50) NULL,
    `folio_contrato` VARCHAR(10) NULL,
    `precio` DECIMAL(10, 2) NULL,
    `utilizo_seguro` BOOLEAN NOT NULL DEFAULT false,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    PRIMARY KEY (`asignacion_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registros_accesos` (
    `registro_acceso_id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleado_id` INTEGER NOT NULL,
    `privada_id` INTEGER NOT NULL,
    `residencia_id` INTEGER NOT NULL,
    `tipo_gestion_id` INTEGER NOT NULL,
    `solicitante_id` VARCHAR(10) NOT NULL,
    `solicitante_tipo` VARCHAR(1) NULL,
    `observaciones` TEXT NULL,
    `quejas` TEXT NULL,
    `duracion` VARCHAR(8) NULL,
    `imagen` VARCHAR(100) NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `usuario_id` INTEGER NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    INDEX `registros_accesos_creado_en_idx`(`creado_en`),
    INDEX `registros_accesos_privada_id_idx`(`privada_id`),
    INDEX `registros_accesos_empleado_id_idx`(`empleado_id`),
    PRIMARY KEY (`registro_acceso_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervision_llamadas` (
    `supervision_id` INTEGER NOT NULL AUTO_INCREMENT,
    `registro_acceso_id` INTEGER NOT NULL,
    `supervisor_id` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `saludo` BOOLEAN NOT NULL DEFAULT false,
    `identifico_empresa` BOOLEAN NOT NULL DEFAULT false,
    `identifico_operador` BOOLEAN NOT NULL DEFAULT false,
    `amable` BOOLEAN NOT NULL DEFAULT false,
    `gracias` BOOLEAN NOT NULL DEFAULT false,
    `demanda` BOOLEAN NOT NULL DEFAULT false,
    `asunto` BOOLEAN NOT NULL DEFAULT false,
    `tiempo_gestion` VARCHAR(8) NULL,
    `observaciones` TEXT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supervision_llamadas_registro_acceso_id_key`(`registro_acceso_id`),
    PRIMARY KEY (`supervision_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ordenes_servicio` (
    `orden_servicio_id` INTEGER NOT NULL AUTO_INCREMENT,
    `folio` VARCHAR(10) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `empleado_id` INTEGER NOT NULL,
    `privada_id` INTEGER NOT NULL,
    `tecnico_id` INTEGER NOT NULL,
    `cierre_tecnico_id` INTEGER NULL,
    `cierre_fecha` DATETIME(3) NULL,
    `cierre_comentario` TEXT NULL,
    `fecha_asistio` DATETIME(3) NULL,
    `tiempo` INTEGER NULL,
    `codigo_servicio_id` INTEGER NOT NULL,
    `detalle_servicio` TEXT NOT NULL,
    `diagnostico_id` INTEGER NULL,
    `detalle_diagnostico` TEXT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ordenes_servicio_folio_key`(`folio`),
    INDEX `ordenes_servicio_folio_idx`(`folio`),
    INDEX `ordenes_servicio_fecha_idx`(`fecha`),
    PRIMARY KEY (`orden_servicio_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ordenes_servicio_seguimiento` (
    `orden_servicio_id` INTEGER NOT NULL,
    `seguimiento_id` INTEGER NOT NULL,
    `comentario` TEXT NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuario_id` INTEGER NOT NULL,

    PRIMARY KEY (`orden_servicio_id`, `seguimiento_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ordenes_servicio_material` (
    `orden_servicio_id` INTEGER NOT NULL,
    `material_id` INTEGER NOT NULL,
    `cantidad` DECIMAL(10, 2) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`orden_servicio_id`, `material_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gastos` (
    `gasto_id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo_gasto_id` INTEGER NOT NULL,
    `privada_id` INTEGER NOT NULL,
    `descripcion` VARCHAR(100) NOT NULL,
    `fecha_pago` DATE NOT NULL,
    `comprobante` VARCHAR(50) NULL,
    `total` DECIMAL(12, 2) NOT NULL,
    `tipo_pago_id` INTEGER NOT NULL,
    `autorizado` BOOLEAN NOT NULL DEFAULT false,
    `autorizado_por` INTEGER NULL,
    `pagado` BOOLEAN NOT NULL DEFAULT false,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    PRIMARY KEY (`gasto_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recuperacion_patrimonial` (
    `recuperacion_patrimonial_id` INTEGER NOT NULL AUTO_INCREMENT,
    `folio` VARCHAR(10) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `empleado_id` INTEGER NOT NULL,
    `privada_id` INTEGER NOT NULL,
    `orden_servicio_id` INTEGER NULL,
    `relato_hechos` TEXT NULL,
    `responsable_nombre` VARCHAR(80) NULL,
    `responsable_domicilio` TEXT NULL,
    `responsable_telefono` VARCHAR(14) NULL,
    `responsable_celular` VARCHAR(14) NULL,
    `responsable_relacion` VARCHAR(40) NULL,
    `vehiculo_placas` VARCHAR(20) NULL,
    `vehiculo_modelo` VARCHAR(20) NULL,
    `vehiculo_color` VARCHAR(20) NULL,
    `vehiculo_marca` VARCHAR(20) NULL,
    `seguro` BOOLEAN NOT NULL DEFAULT false,
    `seguro_nombres` TEXT NULL,
    `testigos` BOOLEAN NOT NULL DEFAULT false,
    `testigos_nombres` TEXT NULL,
    `videos` BOOLEAN NOT NULL DEFAULT false,
    `videos_direccion` TEXT NULL,
    `aviso_administrador` BOOLEAN NOT NULL DEFAULT false,
    `aviso_administrador_fecha` DATETIME(3) NULL,
    `observaciones` TEXT NULL,
    `estatus_id` INTEGER NOT NULL DEFAULT 1,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,

    UNIQUE INDEX `recuperacion_patrimonial_folio_key`(`folio`),
    PRIMARY KEY (`recuperacion_patrimonial_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recuperacion_patrimonial_seguimiento` (
    `recuperacion_patrimonial_id` INTEGER NOT NULL,
    `seguimiento_id` INTEGER NOT NULL,
    `comentario` TEXT NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuario_id` INTEGER NOT NULL,

    PRIMARY KEY (`recuperacion_patrimonial_id`, `seguimiento_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `folios` (
    `folio_id` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(30) NOT NULL,
    `prefijo` CHAR(2) NOT NULL,
    `consecutivo` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`folio_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accesos_bot` (
    `acceso_id` INTEGER NOT NULL AUTO_INCREMENT,
    `placa` VARCHAR(20) NULL,
    `color` VARCHAR(30) NULL,
    `marca` VARCHAR(30) NULL,
    `nombre` VARCHAR(100) NULL,
    `img_placa` VARCHAR(200) NULL,
    `img_id` VARCHAR(200) NULL,
    `img_rostro` VARCHAR(200) NULL,
    `calle` VARCHAR(60) NULL,
    `nro_casa` VARCHAR(10) NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `accesos_bot_fecha_idx`(`fecha`),
    PRIMARY KEY (`acceso_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_empleado_id_fkey` FOREIGN KEY (`empleado_id`) REFERENCES `empleados`(`empleado_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_privada_id_fkey` FOREIGN KEY (`privada_id`) REFERENCES `privadas`(`privada_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grupos_usuarios_detalles` ADD CONSTRAINT `grupos_usuarios_detalles_grupo_usuario_id_fkey` FOREIGN KEY (`grupo_usuario_id`) REFERENCES `grupos_usuarios`(`grupo_usuario_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grupos_usuarios_detalles` ADD CONSTRAINT `grupos_usuarios_detalles_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`usuario_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procesos` ADD CONSTRAINT `procesos_proceso_padre_id_fkey` FOREIGN KEY (`proceso_padre_id`) REFERENCES `procesos`(`proceso_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subprocesos` ADD CONSTRAINT `subprocesos_proceso_id_fkey` FOREIGN KEY (`proceso_id`) REFERENCES `procesos`(`proceso_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permisos_acceso` ADD CONSTRAINT `permisos_acceso_grupo_usuario_id_fkey` FOREIGN KEY (`grupo_usuario_id`) REFERENCES `grupos_usuarios`(`grupo_usuario_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permisos_acceso` ADD CONSTRAINT `permisos_acceso_subproceso_id_fkey` FOREIGN KEY (`subproceso_id`) REFERENCES `subprocesos`(`subproceso_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bitacora_inicio` ADD CONSTRAINT `bitacora_inicio_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`usuario_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `empleados` ADD CONSTRAINT `empleados_puesto_id_fkey` FOREIGN KEY (`puesto_id`) REFERENCES `puestos`(`puesto_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `privadas_dns` ADD CONSTRAINT `privadas_dns_privada_id_fkey` FOREIGN KEY (`privada_id`) REFERENCES `privadas`(`privada_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `privadas_videos` ADD CONSTRAINT `privadas_videos_privada_id_fkey` FOREIGN KEY (`privada_id`) REFERENCES `privadas`(`privada_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `privadas_relays` ADD CONSTRAINT `privadas_relays_privada_id_fkey` FOREIGN KEY (`privada_id`) REFERENCES `privadas`(`privada_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `privadas_relays` ADD CONSTRAINT `privadas_relays_dns_id_fkey` FOREIGN KEY (`dns_id`) REFERENCES `privadas_dns`(`dns_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `residencias` ADD CONSTRAINT `residencias_privada_id_fkey` FOREIGN KEY (`privada_id`) REFERENCES `privadas`(`privada_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `residencias_residentes` ADD CONSTRAINT `residencias_residentes_residencia_id_fkey` FOREIGN KEY (`residencia_id`) REFERENCES `residencias`(`residencia_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `residencias_visitantes` ADD CONSTRAINT `residencias_visitantes_residencia_id_fkey` FOREIGN KEY (`residencia_id`) REFERENCES `residencias`(`residencia_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignacion_tarjetas` ADD CONSTRAINT `asignacion_tarjetas_tarjeta_id_fkey` FOREIGN KEY (`tarjeta_id`) REFERENCES `tarjetas`(`tarjeta_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignacion_tarjetas` ADD CONSTRAINT `asignacion_tarjetas_residente_id_fkey` FOREIGN KEY (`residente_id`) REFERENCES `residencias_residentes`(`residente_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_accesos` ADD CONSTRAINT `registros_accesos_empleado_id_fkey` FOREIGN KEY (`empleado_id`) REFERENCES `empleados`(`empleado_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_accesos` ADD CONSTRAINT `registros_accesos_privada_id_fkey` FOREIGN KEY (`privada_id`) REFERENCES `privadas`(`privada_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_accesos` ADD CONSTRAINT `registros_accesos_residencia_id_fkey` FOREIGN KEY (`residencia_id`) REFERENCES `residencias`(`residencia_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_accesos` ADD CONSTRAINT `registros_accesos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`usuario_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_llamadas` ADD CONSTRAINT `supervision_llamadas_registro_acceso_id_fkey` FOREIGN KEY (`registro_acceso_id`) REFERENCES `registros_accesos`(`registro_acceso_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_servicio` ADD CONSTRAINT `ordenes_servicio_empleado_id_fkey` FOREIGN KEY (`empleado_id`) REFERENCES `empleados`(`empleado_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_servicio` ADD CONSTRAINT `ordenes_servicio_privada_id_fkey` FOREIGN KEY (`privada_id`) REFERENCES `privadas`(`privada_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_servicio` ADD CONSTRAINT `ordenes_servicio_tecnico_id_fkey` FOREIGN KEY (`tecnico_id`) REFERENCES `empleados`(`empleado_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_servicio` ADD CONSTRAINT `ordenes_servicio_cierre_tecnico_id_fkey` FOREIGN KEY (`cierre_tecnico_id`) REFERENCES `empleados`(`empleado_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_servicio` ADD CONSTRAINT `ordenes_servicio_codigo_servicio_id_fkey` FOREIGN KEY (`codigo_servicio_id`) REFERENCES `codigos_servicio`(`codigo_servicio_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_servicio` ADD CONSTRAINT `ordenes_servicio_diagnostico_id_fkey` FOREIGN KEY (`diagnostico_id`) REFERENCES `diagnosticos`(`diagnostico_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_servicio_seguimiento` ADD CONSTRAINT `ordenes_servicio_seguimiento_orden_servicio_id_fkey` FOREIGN KEY (`orden_servicio_id`) REFERENCES `ordenes_servicio`(`orden_servicio_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_servicio_material` ADD CONSTRAINT `ordenes_servicio_material_orden_servicio_id_fkey` FOREIGN KEY (`orden_servicio_id`) REFERENCES `ordenes_servicio`(`orden_servicio_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_servicio_material` ADD CONSTRAINT `ordenes_servicio_material_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `materiales`(`material_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gastos` ADD CONSTRAINT `gastos_tipo_gasto_id_fkey` FOREIGN KEY (`tipo_gasto_id`) REFERENCES `tipos_gastos`(`tipo_gasto_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gastos` ADD CONSTRAINT `gastos_privada_id_fkey` FOREIGN KEY (`privada_id`) REFERENCES `privadas`(`privada_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recuperacion_patrimonial_seguimiento` ADD CONSTRAINT `recuperacion_patrimonial_seguimiento_recuperacion_patrimoni_fkey` FOREIGN KEY (`recuperacion_patrimonial_id`) REFERENCES `recuperacion_patrimonial`(`recuperacion_patrimonial_id`) ON DELETE CASCADE ON UPDATE CASCADE;

