-- phpMyAdmin SQL Dump
-- version 2.10.3
-- http://www.phpmyadmin.net
-- 
-- Servidor: localhost
-- Tiempo de generación: 18-06-2013 a las 09:22:45
-- Versión del servidor: 5.0.51
-- Versión de PHP: 5.2.6

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";

-- 
-- Base de datos: `video_accesos`
-- 

-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `consecutivos_ids`
-- 

CREATE TABLE `consecutivos_ids` (
  `consecutivo_id` int(10) unsigned NOT NULL auto_increment,
  `descripcion` varchar(30) character set latin1 NOT NULL default '',
  `prefijo` char(2) character set latin1 NOT NULL default '',
  `consecutivo` int(10) unsigned NOT NULL default '0',
  PRIMARY KEY  (`consecutivo_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=10 ;

-- 
-- Volcar la base de datos para la tabla `consecutivos_ids`
-- 

INSERT INTO `consecutivos_ids` VALUES (1, 'PROVEEDORES', 'PR', 8);
INSERT INTO `consecutivos_ids` VALUES (2, 'CLIENTES', 'CL', 8);
INSERT INTO `consecutivos_ids` VALUES (3, 'PRODUCTOS', 'PD', 23);
INSERT INTO `consecutivos_ids` VALUES (4, 'MOVIMIENTOS ALMACEN', 'MA', 67);
INSERT INTO `consecutivos_ids` VALUES (5, 'TICKETS', 'TK', 1);
INSERT INTO `consecutivos_ids` VALUES (6, 'FACTURACION', 'FA', 8);
INSERT INTO `consecutivos_ids` VALUES (7, 'TRV', '00', 1);
INSERT INTO `consecutivos_ids` VALUES (8, 'APARTADOS', 'AP', 30);
INSERT INTO `consecutivos_ids` VALUES (9, 'SUCURSALES', 'SU', 4);

-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `empleados`
-- 

CREATE TABLE `empleados` (
  `empleado_id` int(11) NOT NULL auto_increment,
  `nombre` varchar(50) NOT NULL,
  `ape_paterno` varchar(50) NOT NULL,
  `ape_materno` varchar(50) NOT NULL,
  `nro_seguro_social` varchar(50) NOT NULL,
  `puesto_id` int(11) NOT NULL,
  `calle` varchar(60) NOT NULL,
  `nro_casa` varchar(10) NOT NULL,
  `sexo` char(1) NOT NULL,
  `colonia` varchar(30) NOT NULL,
  `telefono` varchar(14) NOT NULL,
  `celular` varchar(14) NOT NULL,
  `email` varchar(60) NOT NULL,
  `fecha_ingreso` date NOT NULL,
  `fecha_baja` date NOT NULL,
  `motivo_baja` text NOT NULL,
  `estatus_id` tinyint(4) NOT NULL,
  `fecha_modificacion` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  `usuario_id` tinyint(4) NOT NULL,
  PRIMARY KEY  (`empleado_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=5 ;

-- 
-- Volcar la base de datos para la tabla `empleados`
-- 

INSERT INTO `empleados` VALUES (1, 'Alejandro', '', '', '', 2, '', '', 'F', '', '', '', '', '0000-00-00', '0000-00-00', '0', 1, '2013-05-31 12:56:25', 1);
INSERT INTO `empleados` VALUES (2, 'Alejandro', 'Quiroz', 'Melendrez', '34k32343242', 1, 'Av. Gilberto Owen', '1069', 'M', 'Guadalupe Victoria', '7131494', '6671540229', 'aquiroz@zonahs.com.mx', '0000-00-00', '0000-00-00', '0', 1, '2013-05-31 13:02:12', 1);
INSERT INTO `empleados` VALUES (3, 'Eduardo', 'Galvan', 'Garcia', 'sd8fsd0fs09df8', 1, 'Candido Aguilar', '1805', 'M', 'Diaz Ordaz', '712937299', '99399033', 'eddgalvan@gmail.com', '0000-00-00', '0000-00-00', '0', 1, '2013-05-31 18:04:56', 1);
INSERT INTO `empleados` VALUES (4, 'adfadf', '', '', '', 2, '', '', 'F', '', '', '', '', '2013-06-01', '2013-06-01', '0', 1, '2013-06-01 11:23:54', 1);

-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `fallas`
-- 

CREATE TABLE `fallas` (
  `falla_id` int(11) NOT NULL auto_increment,
  `codigo` varchar(5) NOT NULL,
  `descripcion` varchar(50) NOT NULL,
  `estatus_id` tinyint(4) NOT NULL,
  `fecha_modificacion` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  `usuario_id` tinyint(4) NOT NULL,
  PRIMARY KEY  (`falla_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=3 ;

-- 
-- Volcar la base de datos para la tabla `fallas`
-- 

INSERT INTO `fallas` VALUES (1, '001', 'Test baja cambios', 1, '2013-05-24 18:55:49', 1);
INSERT INTO `fallas` VALUES (2, '0022', 'Test II mod', 3, '2013-05-25 09:20:01', 1);

-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `folios`
-- 

CREATE TABLE `folios` (
  `folio_id` tinyint(4) NOT NULL auto_increment,
  `descripcion` varchar(30) character set latin1 NOT NULL default '',
  `prefijo` char(2) character set latin1 NOT NULL default '',
  `consecutivo` int(11) NOT NULL default '0',
  `fecha_modificacion` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  `usuario_id` tinyint(4) NOT NULL default '0',
  PRIMARY KEY  (`folio_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=23 ;

-- 
-- Volcar la base de datos para la tabla `folios`
-- 

INSERT INTO `folios` VALUES (13, 'PROVEEDORES', '00', 8, '2012-09-27 10:18:29', 1);
INSERT INTO `folios` VALUES (14, 'CLIENTES', '00', 8, '2012-11-07 16:28:21', 1);
INSERT INTO `folios` VALUES (15, 'PRODUCTOS', '00', 20, '2012-11-08 09:24:25', 1);
INSERT INTO `folios` VALUES (16, 'ENTRADAS POR DEVOLUCIÓN', '00', 62, '2013-02-01 16:21:52', 1);
INSERT INTO `folios` VALUES (17, 'LINEAS DE PRENDAS', '00', 2, '2013-01-18 18:11:43', 1);
INSERT INTO `folios` VALUES (18, 'TICKETS', '00', 194, '2012-11-10 12:38:56', 1);
INSERT INTO `folios` VALUES (19, 'SALIDAS POR AJUSTE', '00', 6, '2013-01-19 12:32:03', 1);
INSERT INTO `folios` VALUES (20, 'FACTURAS', '00', 8, '2012-09-27 15:46:51', 1);
INSERT INTO `folios` VALUES (21, 'APARTADOS', '00', 30, '2013-01-19 14:02:44', 1);
INSERT INTO `folios` VALUES (22, 'VENDEDORES', '00', 12, '2013-01-19 10:14:46', 1);

-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `folios_procesos`
-- 

CREATE TABLE `folios_procesos` (
  `folio_id` tinyint(4) NOT NULL default '0',
  `proceso_id` tinyint(4) NOT NULL default '0',
  `fecha_modificacion` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  `usuario_id` tinyint(4) NOT NULL default '0',
  PRIMARY KEY  (`folio_id`,`proceso_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 
-- Volcar la base de datos para la tabla `folios_procesos`
-- 

INSERT INTO `folios_procesos` VALUES (13, 13, '2011-03-16 10:19:21', 0);
INSERT INTO `folios_procesos` VALUES (14, 14, '2011-03-17 09:59:35', 0);
INSERT INTO `folios_procesos` VALUES (15, 25, '2011-03-23 12:25:36', 0);
INSERT INTO `folios_procesos` VALUES (16, 21, '2011-04-18 18:21:55', 0);
INSERT INTO `folios_procesos` VALUES (16, 23, '2011-03-29 10:42:52', 0);
INSERT INTO `folios_procesos` VALUES (16, 24, '2011-04-19 16:43:15', 0);
INSERT INTO `folios_procesos` VALUES (17, 18, '2011-04-01 10:10:35', 0);
INSERT INTO `folios_procesos` VALUES (18, 19, '2011-04-11 10:56:59', 0);
INSERT INTO `folios_procesos` VALUES (19, 22, '2011-04-19 11:01:22', 0);
INSERT INTO `folios_procesos` VALUES (19, 50, '2011-06-03 10:52:47', 0);
INSERT INTO `folios_procesos` VALUES (20, 47, '2011-05-04 10:56:57', 0);
INSERT INTO `folios_procesos` VALUES (21, 52, '2012-09-03 17:23:58', 0);
INSERT INTO `folios_procesos` VALUES (22, 59, '2012-10-16 09:18:41', 0);

-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `grupos_usuarios`
-- 

CREATE TABLE `grupos_usuarios` (
  `grupo_usuario_id` tinyint(4) unsigned NOT NULL auto_increment,
  `nombre` varchar(30) character set latin1 NOT NULL default '',
  `estatus_id` tinyint(4) unsigned NOT NULL default '0',
  `fecha_modificacion` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  `usuario_id` tinyint(4) NOT NULL default '0',
  PRIMARY KEY  (`grupo_usuario_id`),
  KEY `IN01` (`estatus_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=6 ;

-- 
-- Volcar la base de datos para la tabla `grupos_usuarios`
-- 

INSERT INTO `grupos_usuarios` VALUES (1, 'Admin', 1, '2013-05-24 18:34:33', 1);
INSERT INTO `grupos_usuarios` VALUES (2, 'Administrador', 1, '2011-04-11 12:53:14', 1);
INSERT INTO `grupos_usuarios` VALUES (5, 'Empleados', 1, '2012-09-27 15:23:23', 1);

-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `grupos_usuarios_detalles`
-- 

CREATE TABLE `grupos_usuarios_detalles` (
  `grupo_usuario_id` tinyint(4) unsigned NOT NULL default '0',
  `usuario_id` tinyint(4) unsigned NOT NULL default '0',
  PRIMARY KEY  (`grupo_usuario_id`,`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 
-- Volcar la base de datos para la tabla `grupos_usuarios_detalles`
-- 

INSERT INTO `grupos_usuarios_detalles` VALUES (1, 1);
INSERT INTO `grupos_usuarios_detalles` VALUES (1, 27);
INSERT INTO `grupos_usuarios_detalles` VALUES (2, 10);
INSERT INTO `grupos_usuarios_detalles` VALUES (2, 27);
INSERT INTO `grupos_usuarios_detalles` VALUES (2, 30);
INSERT INTO `grupos_usuarios_detalles` VALUES (5, 5);
INSERT INTO `grupos_usuarios_detalles` VALUES (5, 7);

-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `permisos_acceso`
-- 

CREATE TABLE `permisos_acceso` (
  `grupo_usuario_id` tinyint(4) unsigned NOT NULL default '0',
  `subproceso_id` tinyint(4) unsigned NOT NULL default '0',
  PRIMARY KEY  (`grupo_usuario_id`,`subproceso_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 
-- Volcar la base de datos para la tabla `permisos_acceso`
-- 

INSERT INTO `permisos_acceso` VALUES (1, 3);
INSERT INTO `permisos_acceso` VALUES (1, 4);
INSERT INTO `permisos_acceso` VALUES (1, 5);
INSERT INTO `permisos_acceso` VALUES (1, 6);
INSERT INTO `permisos_acceso` VALUES (1, 8);
INSERT INTO `permisos_acceso` VALUES (1, 10);
INSERT INTO `permisos_acceso` VALUES (1, 14);
INSERT INTO `permisos_acceso` VALUES (1, 15);
INSERT INTO `permisos_acceso` VALUES (1, 16);
INSERT INTO `permisos_acceso` VALUES (1, 17);
INSERT INTO `permisos_acceso` VALUES (1, 19);
INSERT INTO `permisos_acceso` VALUES (1, 27);
INSERT INTO `permisos_acceso` VALUES (1, 31);
INSERT INTO `permisos_acceso` VALUES (1, 32);
INSERT INTO `permisos_acceso` VALUES (1, 33);
INSERT INTO `permisos_acceso` VALUES (1, 34);
INSERT INTO `permisos_acceso` VALUES (1, 35);
INSERT INTO `permisos_acceso` VALUES (1, 36);
INSERT INTO `permisos_acceso` VALUES (1, 37);
INSERT INTO `permisos_acceso` VALUES (1, 38);
INSERT INTO `permisos_acceso` VALUES (1, 39);
INSERT INTO `permisos_acceso` VALUES (1, 40);
INSERT INTO `permisos_acceso` VALUES (1, 41);
INSERT INTO `permisos_acceso` VALUES (1, 42);
INSERT INTO `permisos_acceso` VALUES (1, 44);
INSERT INTO `permisos_acceso` VALUES (1, 45);
INSERT INTO `permisos_acceso` VALUES (1, 46);
INSERT INTO `permisos_acceso` VALUES (1, 47);
INSERT INTO `permisos_acceso` VALUES (1, 48);
INSERT INTO `permisos_acceso` VALUES (1, 49);
INSERT INTO `permisos_acceso` VALUES (1, 50);
INSERT INTO `permisos_acceso` VALUES (1, 51);
INSERT INTO `permisos_acceso` VALUES (1, 52);
INSERT INTO `permisos_acceso` VALUES (1, 53);
INSERT INTO `permisos_acceso` VALUES (1, 54);
INSERT INTO `permisos_acceso` VALUES (1, 55);
INSERT INTO `permisos_acceso` VALUES (1, 56);
INSERT INTO `permisos_acceso` VALUES (1, 57);
INSERT INTO `permisos_acceso` VALUES (1, 58);
INSERT INTO `permisos_acceso` VALUES (1, 59);
INSERT INTO `permisos_acceso` VALUES (1, 60);
INSERT INTO `permisos_acceso` VALUES (1, 61);
INSERT INTO `permisos_acceso` VALUES (1, 62);
INSERT INTO `permisos_acceso` VALUES (1, 63);
INSERT INTO `permisos_acceso` VALUES (1, 64);
INSERT INTO `permisos_acceso` VALUES (1, 65);
INSERT INTO `permisos_acceso` VALUES (1, 66);
INSERT INTO `permisos_acceso` VALUES (1, 67);
INSERT INTO `permisos_acceso` VALUES (1, 68);
INSERT INTO `permisos_acceso` VALUES (1, 69);
INSERT INTO `permisos_acceso` VALUES (1, 70);
INSERT INTO `permisos_acceso` VALUES (1, 71);
INSERT INTO `permisos_acceso` VALUES (1, 72);
INSERT INTO `permisos_acceso` VALUES (1, 73);
INSERT INTO `permisos_acceso` VALUES (1, 74);
INSERT INTO `permisos_acceso` VALUES (1, 75);
INSERT INTO `permisos_acceso` VALUES (1, 76);
INSERT INTO `permisos_acceso` VALUES (1, 77);
INSERT INTO `permisos_acceso` VALUES (1, 79);
INSERT INTO `permisos_acceso` VALUES (1, 80);
INSERT INTO `permisos_acceso` VALUES (1, 81);
INSERT INTO `permisos_acceso` VALUES (1, 82);
INSERT INTO `permisos_acceso` VALUES (1, 83);
INSERT INTO `permisos_acceso` VALUES (1, 84);
INSERT INTO `permisos_acceso` VALUES (1, 85);
INSERT INTO `permisos_acceso` VALUES (1, 86);
INSERT INTO `permisos_acceso` VALUES (1, 87);
INSERT INTO `permisos_acceso` VALUES (1, 88);
INSERT INTO `permisos_acceso` VALUES (1, 89);
INSERT INTO `permisos_acceso` VALUES (1, 90);
INSERT INTO `permisos_acceso` VALUES (1, 91);
INSERT INTO `permisos_acceso` VALUES (1, 92);
INSERT INTO `permisos_acceso` VALUES (1, 94);
INSERT INTO `permisos_acceso` VALUES (1, 101);
INSERT INTO `permisos_acceso` VALUES (1, 102);
INSERT INTO `permisos_acceso` VALUES (1, 103);
INSERT INTO `permisos_acceso` VALUES (1, 104);
INSERT INTO `permisos_acceso` VALUES (1, 106);
INSERT INTO `permisos_acceso` VALUES (1, 107);
INSERT INTO `permisos_acceso` VALUES (1, 108);
INSERT INTO `permisos_acceso` VALUES (1, 109);
INSERT INTO `permisos_acceso` VALUES (1, 110);
INSERT INTO `permisos_acceso` VALUES (1, 112);
INSERT INTO `permisos_acceso` VALUES (1, 115);
INSERT INTO `permisos_acceso` VALUES (1, 116);
INSERT INTO `permisos_acceso` VALUES (1, 117);
INSERT INTO `permisos_acceso` VALUES (1, 118);
INSERT INTO `permisos_acceso` VALUES (1, 119);
INSERT INTO `permisos_acceso` VALUES (1, 120);
INSERT INTO `permisos_acceso` VALUES (1, 121);
INSERT INTO `permisos_acceso` VALUES (1, 122);
INSERT INTO `permisos_acceso` VALUES (1, 123);
INSERT INTO `permisos_acceso` VALUES (1, 124);
INSERT INTO `permisos_acceso` VALUES (1, 125);
INSERT INTO `permisos_acceso` VALUES (1, 128);
INSERT INTO `permisos_acceso` VALUES (1, 129);
INSERT INTO `permisos_acceso` VALUES (1, 130);
INSERT INTO `permisos_acceso` VALUES (1, 132);
INSERT INTO `permisos_acceso` VALUES (1, 134);
INSERT INTO `permisos_acceso` VALUES (1, 136);
INSERT INTO `permisos_acceso` VALUES (1, 138);
INSERT INTO `permisos_acceso` VALUES (1, 139);

-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `privadas`
-- 

CREATE TABLE `privadas` (
  `privada_id` int(11) NOT NULL auto_increment,
  `descripcion` varchar(80) NOT NULL,
  `ape_paterno` varchar(50) NOT NULL,
  `ape_materno` varchar(50) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `tipo_contacto_id` tinyint(4) NOT NULL,
  `telefono` varchar(14) NOT NULL,
  `celular` varchar(14) NOT NULL,
  `email` varchar(60) NOT NULL,
  `observaciones` text NOT NULL,
  `estatus_id` tinyint(4) NOT NULL,
  `fecha_modificacion` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  `usuario_id` tinyint(4) NOT NULL,
  PRIMARY KEY  (`privada_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=3 ;

-- 
-- Volcar la base de datos para la tabla `privadas`
-- 

INSERT INTO `privadas` VALUES (1, 'Viñedos', 'Quiroz', 'Melendrez', 'Alejandro Guadalupe', 1, '7-13-14-94', '6671-54-02-29', 'alejandro_alex06@hotmail.com', 'INSERT Y UPDATE funcionan correctamente.', 1, '2013-05-25 13:31:49', 1);
INSERT INTO `privadas` VALUES (2, 'Vista Hermosa', '', 'Perez', 'Juan', 1, '7-12-15-65', '6671-23-45-12', 'jperez@hotmail.com', '', 1, '2013-05-25 13:40:20', 1);

-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `procesos`
-- 

CREATE TABLE `procesos` (
  `proceso_id` tinyint(4) unsigned NOT NULL auto_increment,
  `nombre` varchar(30) NOT NULL default '',
  `ruta_acceso` text,
  `proceso_padre_id` tinyint(4) unsigned default NULL,
  `fecha_modificacion` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  `usuario_id` tinyint(4) NOT NULL default '0',
  PRIMARY KEY  (`proceso_id`),
  KEY `IN01` (`proceso_id`,`proceso_padre_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=62 ;

-- 
-- Volcar la base de datos para la tabla `procesos`
-- 

INSERT INTO `procesos` VALUES (1, 'SEGURIDAD', '', 0, '2011-03-11 18:21:26', 1);
INSERT INTO `procesos` VALUES (2, 'CATÁLOGOS', '', 0, '2011-06-06 09:02:29', 1);
INSERT INTO `procesos` VALUES (3, 'CONSULTAS', '', 0, '2011-04-12 17:08:49', 1);
INSERT INTO `procesos` VALUES (5, 'GRUPOS DE USUARIO', 'seguridad/gruposusuarios', 1, '2013-05-11 11:03:23', 1);
INSERT INTO `procesos` VALUES (6, 'USUARIOS', 'seguridad/usuarios/', 1, '2013-02-06 12:12:58', 1);
INSERT INTO `procesos` VALUES (9, 'PROCESOS', 'seguridad/procesos', 1, '2013-02-18 11:51:55', 1);
INSERT INTO `procesos` VALUES (11, 'FOLIOS', '#', 2, '2013-04-29 16:03:31', 1);
INSERT INTO `procesos` VALUES (12, 'FOLIOS POR PROCESO', '#', 2, '2013-04-29 16:03:31', 1);
INSERT INTO `procesos` VALUES (13, 'EMPLEADOS', 'catalogos/empleados', 2, '2013-05-24 09:17:51', 1);
INSERT INTO `procesos` VALUES (14, 'FALLAS', 'catalogos/fallas', 2, '2013-05-17 16:07:30', 1);
INSERT INTO `procesos` VALUES (15, 'PUESTOS', 'catalogos/puestos', 2, '2013-05-23 15:24:19', 1);
INSERT INTO `procesos` VALUES (17, 'PRIVADAS', 'catalogos/privadas', 2, '2013-05-23 15:23:56', 1);
INSERT INTO `procesos` VALUES (18, 'RESIDENCIAS', 'catalogos/residencias', 2, '2013-05-24 09:21:19', 1);
INSERT INTO `procesos` VALUES (20, 'PROCESOS', '', 0, '2011-03-22 11:04:49', 1);
INSERT INTO `procesos` VALUES (21, 'ASIGNACIÓN DE TARJETAS', 'procesos/asignaciontarjetas', 20, '2013-06-17 09:32:39', 1);
INSERT INTO `procesos` VALUES (23, 'ORDENES DE SERVICIO', '#', 20, '2013-04-29 16:10:18', 1);
INSERT INTO `procesos` VALUES (24, 'REGISTRO DE ACCESOS', 'procesos/registroaccesos', 20, '2013-06-17 09:47:02', 1);
INSERT INTO `procesos` VALUES (29, 'REPORTES', '', 0, '2011-04-27 16:21:42', 1);
INSERT INTO `procesos` VALUES (39, 'ACCESOS ATENDIDOS', '#', 29, '2013-04-29 16:17:51', 1);
INSERT INTO `procesos` VALUES (43, 'ORDENES DE SERVICIO', '#', 29, '2013-04-29 16:17:51', 1);
INSERT INTO `procesos` VALUES (49, 'RECUPERACIÓN PATRIMONIAL ', 'procesos/recuperacionpatrimonial', 20, '2013-06-17 09:55:54', 1);
INSERT INTO `procesos` VALUES (50, 'SUPERVISIÓN DE GUARDIAS', 'procesos/supervisionguardias', 20, '2013-06-17 10:13:09', 1);
INSERT INTO `procesos` VALUES (52, 'SUPERVISIÓN DE LLAMADAS', 'procesos/supervisionllamadas', 20, '2013-06-17 09:48:24', 1);
INSERT INTO `procesos` VALUES (54, 'SUPERVISIÓN PORTONES ABIERTOS', 'procesos/supervisionportonesabiertos', 20, '2013-06-17 09:49:14', 1);
INSERT INTO `procesos` VALUES (55, 'SUPERVISIÓN DE LLAMADAS', '#', 29, '2013-04-29 16:17:51', 1);
INSERT INTO `procesos` VALUES (56, 'SUPERVISIÓN PORTONES ABIERTOS', '#', 29, '2013-04-29 16:17:51', 1);
INSERT INTO `procesos` VALUES (57, 'SUPERVISIÓN GUARDIAS', '#', 29, '2013-04-29 16:17:51', 1);
INSERT INTO `procesos` VALUES (61, 'PADRE-HIJO', 'seguridad/', 0, '2013-05-09 15:59:18', 1);

-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `puestos`
-- 

CREATE TABLE `puestos` (
  `puesto_id` int(11) NOT NULL auto_increment,
  `descripcion` varchar(50) NOT NULL,
  `estatus_id` tinyint(4) NOT NULL,
  `fecha_modificacion` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  `usuario_id` tinyint(4) NOT NULL,
  PRIMARY KEY  (`puesto_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=8 ;

-- 
-- Volcar la base de datos para la tabla `puestos`
-- 

INSERT INTO `puestos` VALUES (1, 'Desarrollador', 1, '2013-05-25 11:44:57', 1);
INSERT INTO `puestos` VALUES (2, 'Administrador', 1, '2013-05-25 11:44:54', 1);
INSERT INTO `puestos` VALUES (3, 'Vendedor', 1, '2013-05-25 12:02:34', 1);
INSERT INTO `puestos` VALUES (4, 'Tecnico', 1, '2013-05-25 12:03:14', 1);
INSERT INTO `puestos` VALUES (5, 'Operador Telefoníco', 1, '2013-05-25 12:03:45', 1);
INSERT INTO `puestos` VALUES (6, 'Supervisor', 1, '2013-05-25 12:03:10', 1);
INSERT INTO `puestos` VALUES (7, 'Director', 1, '2013-05-25 12:04:06', 1);

-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `residencias`
-- 

CREATE TABLE `residencias` (
  `residencia_id` int(11) NOT NULL auto_increment,
  `privada_id` int(11) NOT NULL,
  `nro_casa` varchar(10) NOT NULL,
  `calle` varchar(60) NOT NULL,
  `telefono1` varchar(14) NOT NULL,
  `telefono2` varchar(14) NOT NULL,
  `estatus_id` tinyint(4) NOT NULL,
  `fecha_modificacion` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  `usuario_id` tinyint(4) NOT NULL,
  PRIMARY KEY  (`residencia_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- 
-- Volcar la base de datos para la tabla `residencias`
-- 


-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `residencias_residentes`
-- 

CREATE TABLE `residencias_residentes` (
  `residente_id` int(11) NOT NULL auto_increment,
  `residencia_id` int(11) NOT NULL,
  `ape_paterno` varchar(50) NOT NULL,
  `ape_materno` varchar(50) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `telefono` varchar(14) NOT NULL,
  `celular` varchar(14) NOT NULL,
  `email` varchar(100) NOT NULL,
  `estatus_id` tinyint(4) NOT NULL,
  `fecha_modificacion` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  `usuario_id` tinyint(4) NOT NULL,
  PRIMARY KEY  (`residente_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- 
-- Volcar la base de datos para la tabla `residencias_residentes`
-- 


-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `subprocesos`
-- 

CREATE TABLE `subprocesos` (
  `subproceso_id` tinyint(4) unsigned NOT NULL auto_increment,
  `proceso_id` tinyint(4) unsigned NOT NULL default '0',
  `nombre` varchar(30) NOT NULL default '',
  `funcion` varchar(30) default NULL,
  `fecha_modificacion` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  `usuario_id` tinyint(4) NOT NULL default '0',
  PRIMARY KEY  (`subproceso_id`),
  KEY `IN01` (`proceso_id`,`nombre`),
  KEY `IN02` (`proceso_id`,`subproceso_id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=140 ;

-- 
-- Volcar la base de datos para la tabla `subprocesos`
-- 

INSERT INTO `subprocesos` VALUES (3, 9, 'Nuevo Proceso', 'Nuevo', '2011-03-12 09:29:19', 1);
INSERT INTO `subprocesos` VALUES (4, 6, 'Nuevo Usuario', 'Nuevo', '2011-03-12 09:30:03', 1);
INSERT INTO `subprocesos` VALUES (5, 11, 'Nuevo Folio', 'Nuevo', '2011-03-12 09:30:33', 1);
INSERT INTO `subprocesos` VALUES (6, 12, 'Nuevo Folio por Proceso', 'Nuevo', '2011-03-12 09:30:42', 1);
INSERT INTO `subprocesos` VALUES (8, 5, 'Nuevo Gurpo Usuario', 'Nuevo', '2011-03-12 09:32:06', 1);
INSERT INTO `subprocesos` VALUES (10, 13, 'Nuevo Proveedor', 'Nuevo', '2011-03-12 11:34:55', 1);
INSERT INTO `subprocesos` VALUES (15, 14, 'Nuevo Cliente', 'Nuevo', '2011-03-16 09:05:34', 1);
INSERT INTO `subprocesos` VALUES (16, 14, 'Guardar Cliente', 'Guardar', '2011-03-16 09:06:31', 1);
INSERT INTO `subprocesos` VALUES (17, 14, 'Buscar Cliente', 'Buscar', '2011-03-16 09:06:39', 1);
INSERT INTO `subprocesos` VALUES (18, 14, 'Modificar Cliente', 'Modificar', '2011-03-16 09:06:47', 1);
INSERT INTO `subprocesos` VALUES (19, 15, 'Nueva Puesto', 'Nuevo', '2013-04-29 15:58:41', 1);
INSERT INTO `subprocesos` VALUES (20, 15, 'Guardar Lista de Precios', 'Guardar', '2011-03-16 09:24:27', 1);
INSERT INTO `subprocesos` VALUES (21, 15, 'Buscar Lista de Precios', 'Buscar', '2011-03-16 09:24:38', 1);
INSERT INTO `subprocesos` VALUES (22, 15, 'Modificar Lista de Precios', 'Modificar', '2011-03-16 09:26:09', 1);
INSERT INTO `subprocesos` VALUES (23, 16, 'Nueva Talla', 'Nuevo', '2011-03-16 09:30:21', 1);
INSERT INTO `subprocesos` VALUES (24, 16, 'Guardar Talla', 'Guardar', '2011-03-16 09:30:28', 1);
INSERT INTO `subprocesos` VALUES (25, 16, 'Buscar Talla', 'Buscar', '2011-03-16 09:30:35', 1);
INSERT INTO `subprocesos` VALUES (26, 16, 'Modificar Talla', 'Modificar', '2011-03-16 09:30:43', 1);
INSERT INTO `subprocesos` VALUES (27, 17, 'Nueva Privada', 'Nuevo', '2013-04-29 16:00:00', 1);
INSERT INTO `subprocesos` VALUES (28, 17, 'Guardar Unidad de Medida', 'Guardar', '2011-03-16 09:33:38', 1);
INSERT INTO `subprocesos` VALUES (29, 17, 'Buscar Unidad de Medida', 'Buscar', '2011-03-16 09:33:45', 1);
INSERT INTO `subprocesos` VALUES (30, 17, 'Modificar Unidad de Medida', 'Modificar', '2011-03-16 09:33:53', 1);
INSERT INTO `subprocesos` VALUES (31, 18, 'Nueva Linea de Prenda', 'Nuevo', '2011-03-16 09:34:25', 1);
INSERT INTO `subprocesos` VALUES (32, 18, 'Guardar Linea de Prenda', 'Guardar', '2011-03-16 09:34:36', 1);
INSERT INTO `subprocesos` VALUES (33, 18, 'Buscar Linea de Prenda', 'Buscar', '2011-03-16 09:34:43', 1);
INSERT INTO `subprocesos` VALUES (34, 18, 'Modificar Linea de Prenda', 'Modificar', '2011-03-16 09:34:56', 1);
INSERT INTO `subprocesos` VALUES (35, 19, 'Buscar Punto de Venta', 'Buscar', '2011-03-22 09:43:50', 1);
INSERT INTO `subprocesos` VALUES (36, 20, 'Buscar Entradas por Ajuste', 'Buscar', '2011-03-22 11:05:58', 1);
INSERT INTO `subprocesos` VALUES (37, 21, 'Buscar Entradas por Ajuste', 'Buscar', '2011-03-22 11:07:47', 1);
INSERT INTO `subprocesos` VALUES (39, 23, 'Buscar Entradas por Compra', 'Buscar', '2011-03-22 12:05:32', 1);
INSERT INTO `subprocesos` VALUES (40, 24, 'Buscar Entradas por Devolucion', 'Buscar', '2011-03-22 12:20:04', 1);
INSERT INTO `subprocesos` VALUES (41, 25, 'Buscar Productos', 'Buscar', '2011-03-22 18:17:13', 1);
INSERT INTO `subprocesos` VALUES (42, 26, 'Buscar Marcas', 'Buscar', '2011-03-22 18:38:21', 1);
INSERT INTO `subprocesos` VALUES (43, 2, 'NUEVOPRODUCTO', 'Nuevo', '2011-03-23 12:21:07', 1);
INSERT INTO `subprocesos` VALUES (44, 28, 'Buscar Tipos de Cambio', 'Buscar', '2011-03-24 13:02:50', 1);
INSERT INTO `subprocesos` VALUES (45, 25, 'Nuevo Producto', 'Nuevo', '2011-04-18 09:26:05', 1);
INSERT INTO `subprocesos` VALUES (46, 25, 'Guardar Producto', 'Guardar', '2011-04-18 09:26:24', 1);
INSERT INTO `subprocesos` VALUES (47, 11, 'Guardar Folios', 'Guardar', '2011-04-18 12:46:38', 1);
INSERT INTO `subprocesos` VALUES (48, 12, 'Guardar Folios por Proceso', 'Guardar', '2011-04-18 12:52:02', 1);
INSERT INTO `subprocesos` VALUES (49, 12, 'Eliminar por Proceso', 'Eliminar', '2011-04-18 12:52:14', 1);
INSERT INTO `subprocesos` VALUES (50, 13, 'Guardar Proveedores', 'Guardar', '2011-04-18 12:56:31', 1);
INSERT INTO `subprocesos` VALUES (51, 26, 'Nuevo Marcas', 'Nuevo', '2011-04-18 15:18:19', 1);
INSERT INTO `subprocesos` VALUES (52, 26, 'Guardar Marcas', 'Guardar', '2011-04-18 15:18:59', 1);
INSERT INTO `subprocesos` VALUES (53, 28, 'Guardar Tipo de Cambio', 'Guardar', '2011-04-18 15:24:53', 1);
INSERT INTO `subprocesos` VALUES (54, 28, 'Nuevo Tipo de Cambio', 'Nuevo', '2011-04-18 15:25:06', 1);
INSERT INTO `subprocesos` VALUES (55, 23, 'Nuevo Entradas por Compra', 'Nuevo', '2011-04-18 15:42:22', 1);
INSERT INTO `subprocesos` VALUES (56, 23, 'Guardar Entradas por Compra', 'Guardar', '2011-04-18 15:42:38', 1);
INSERT INTO `subprocesos` VALUES (57, 11, 'Buscar Folios', 'Buscar', '2011-04-18 18:19:49', 1);
INSERT INTO `subprocesos` VALUES (58, 21, 'Nuevo Entrada por Ajuste', 'Nuevo', '2011-04-19 09:24:37', 1);
INSERT INTO `subprocesos` VALUES (59, 21, 'Guardar Entradas por Ajuste', 'Guardar', '2011-04-19 09:37:01', 1);
INSERT INTO `subprocesos` VALUES (60, 21, 'Modificar Entradas por Ajuste', 'Modificar', '2011-04-19 09:37:13', 1);
INSERT INTO `subprocesos` VALUES (61, 21, 'Cancelar Entradas por Ajuste', 'Cancelar', '2011-04-19 09:37:24', 1);
INSERT INTO `subprocesos` VALUES (62, 21, 'Eliminar Entradas por Ajuste', 'Eliminar', '2011-04-19 09:37:35', 1);
INSERT INTO `subprocesos` VALUES (68, 24, 'Nuevo Entrada por Devolucion', 'Nuevo', '2011-04-19 13:33:50', 1);
INSERT INTO `subprocesos` VALUES (69, 24, 'Guardar Entrada por Devolucion', 'Guardar', '2011-04-19 13:33:58', 1);
INSERT INTO `subprocesos` VALUES (70, 24, 'Modificar Entrada por Devoluci', 'Modificar', '2011-04-19 13:34:08', 1);
INSERT INTO `subprocesos` VALUES (71, 24, 'Cancelar Entrada por Devolucio', 'Cancelar', '2011-04-19 13:34:16', 1);
INSERT INTO `subprocesos` VALUES (72, 24, 'Eliminar Entrada por Devolucio', 'Eliminar', '2011-04-19 13:34:25', 1);
INSERT INTO `subprocesos` VALUES (73, 19, 'Nuevo Punto de Venta', 'Nuevo', '2011-04-26 10:05:17', 1);
INSERT INTO `subprocesos` VALUES (74, 19, 'Guardar Punto de Venta', 'Guardar', '2011-04-26 10:05:24', 1);
INSERT INTO `subprocesos` VALUES (75, 19, 'Cancelar Punto de Venta', 'Cancelar', '2011-04-26 10:05:35', 1);
INSERT INTO `subprocesos` VALUES (76, 19, 'Eliminar Punto de Venta', 'Eliminar', '2011-04-26 10:05:44', 1);
INSERT INTO `subprocesos` VALUES (86, 39, 'Buscar Consultar Inventario', 'Buscar', '2011-04-27 18:22:44', 1);
INSERT INTO `subprocesos` VALUES (90, 43, 'Buscar Reporte de Ventas', 'Buscar', '2011-04-27 18:33:55', 1);
INSERT INTO `subprocesos` VALUES (93, 47, 'Buscar Facturas', 'Buscar', '2011-05-03 17:20:14', 1);
INSERT INTO `subprocesos` VALUES (94, 19, 'Modificar Punto de Venta', 'Modificar', '2011-05-04 10:07:24', 1);
INSERT INTO `subprocesos` VALUES (95, 47, 'Nuevo Facturar', 'Nuevo', '2011-05-04 10:16:44', 1);
INSERT INTO `subprocesos` VALUES (96, 47, 'Guardar Facturar', 'Guardar', '2011-05-04 10:16:56', 1);
INSERT INTO `subprocesos` VALUES (97, 47, 'Modificar Facturar', 'Modificar', '2011-05-04 10:17:06', 1);
INSERT INTO `subprocesos` VALUES (98, 47, 'Cancelar Facturar', 'Cancelar', '2011-05-04 10:17:14', 1);
INSERT INTO `subprocesos` VALUES (99, 47, 'Eliminar Facturar', 'Eliminar', '2011-05-04 10:17:23', 1);
INSERT INTO `subprocesos` VALUES (100, 48, 'Buscar Exportar', 'Buscar', '2011-05-16 10:08:47', 1);
INSERT INTO `subprocesos` VALUES (101, 23, 'Cancelar Entradas por Compra', 'Cancelar', '2011-05-17 09:47:01', 1);
INSERT INTO `subprocesos` VALUES (102, 23, 'Eliminar Entradas por Compra', 'Eliminar', '2011-05-17 09:47:11', 1);
INSERT INTO `subprocesos` VALUES (103, 49, 'Buscar Traspaso de Inventarios', 'Buscar', '2011-05-17 20:44:15', 1);
INSERT INTO `subprocesos` VALUES (104, 25, 'Eliminar Producto', 'Eliminar', '2011-05-25 17:30:13', 1);
INSERT INTO `subprocesos` VALUES (105, 50, 'Buscar Salidas por Ajuste', 'Buscar', '2011-06-02 18:46:54', 1);
INSERT INTO `subprocesos` VALUES (106, 50, 'Nuevo Salidas por Ajuste', 'Nuevo', '2011-06-02 18:51:49', 1);
INSERT INTO `subprocesos` VALUES (107, 50, 'Guardar Salidas por Ajuste', 'Guardar', '2011-06-02 18:51:57', 1);
INSERT INTO `subprocesos` VALUES (108, 50, 'Imprimir Salidas por Ajuste', 'Imprimir', '2011-06-02 18:52:06', 1);
INSERT INTO `subprocesos` VALUES (109, 50, 'Cancelar Salidas por Ajuste', 'Cancelar', '2011-06-02 18:52:13', 1);
INSERT INTO `subprocesos` VALUES (110, 50, 'Eliminar Salidas por Ajuste', 'Eliminar', '2011-06-02 18:52:21', 1);
INSERT INTO `subprocesos` VALUES (112, 52, 'NUEVO APARTADOS', 'Nuevo', '2012-08-23 10:49:26', 1);
INSERT INTO `subprocesos` VALUES (113, 53, 'NUEVO DEVOLUCIONES', 'Nuevo', '2012-08-23 11:24:46', 1);
INSERT INTO `subprocesos` VALUES (114, 53, 'NUEVO DEVOLUCIONES', 'Nuevo', '2012-08-23 11:25:17', 1);
INSERT INTO `subprocesos` VALUES (115, 54, 'NUEVO DINERO', 'Nuevo', '2012-08-27 10:32:53', 1);
INSERT INTO `subprocesos` VALUES (116, 54, 'GUARDAR DINERO', 'Guardar', '2012-08-29 16:32:06', 1);
INSERT INTO `subprocesos` VALUES (117, 54, 'BUSCAR DINERO', 'Buscar', '2012-08-30 09:44:06', 1);
INSERT INTO `subprocesos` VALUES (118, 54, 'MODIFICAR DINERO', 'Modificar', '2012-08-31 09:00:11', 1);
INSERT INTO `subprocesos` VALUES (119, 54, 'ELIMINAR DINERO', 'Eliminar', '2012-08-31 11:24:31', 1);
INSERT INTO `subprocesos` VALUES (120, 52, 'GUARDAR APARTADOS', 'Guardar', '2012-09-03 12:59:52', 1);
INSERT INTO `subprocesos` VALUES (121, 52, 'BUSCAR APARTADOS', 'Buscar', '2012-09-03 13:00:01', 1);
INSERT INTO `subprocesos` VALUES (122, 52, 'IMPRIMIR APARTADOS', 'Imprimir', '2012-09-03 13:00:14', 1);
INSERT INTO `subprocesos` VALUES (123, 52, 'MODIFICAR APARTADOS', 'Modificar', '2012-09-03 13:00:22', 1);
INSERT INTO `subprocesos` VALUES (124, 52, 'CANCELAR APARTADOS', 'Cancelar', '2012-09-03 13:00:29', 1);
INSERT INTO `subprocesos` VALUES (125, 52, 'ELIMINAR APARTADOS', 'Eliminar', '2012-09-03 13:00:37', 1);
INSERT INTO `subprocesos` VALUES (127, 53, 'NUEVO DEVOLUCIONES', 'Nuevo', '2012-09-10 09:06:10', 1);
INSERT INTO `subprocesos` VALUES (128, 55, 'BUSCAR REPORTE DE DEVOLUCIONES', 'Buscar', '2012-09-11 17:43:43', 1);
INSERT INTO `subprocesos` VALUES (129, 56, 'BUSCAR REPORTE DE APARTADOS', 'Buscar', '2012-09-12 16:16:40', 1);
INSERT INTO `subprocesos` VALUES (130, 57, 'BUSCAR REPORTE DE DINERO', 'Buscar', '2012-09-13 09:05:23', 1);
INSERT INTO `subprocesos` VALUES (136, 50, 'Modificar Salida por Ajuste', 'Modificar', '2013-01-19 12:55:26', 1);
INSERT INTO `subprocesos` VALUES (137, 6, 'Guardar Usuario', 'Guardar', '2011-03-12 09:30:03', 1);
INSERT INTO `subprocesos` VALUES (139, 6, 'Buscar Usuario', 'Buscar', '2013-03-19 17:49:38', 1);

-- --------------------------------------------------------

-- 
-- Estructura de tabla para la tabla `usuarios`
-- 

CREATE TABLE `usuarios` (
  `usuario_id` tinyint(4) unsigned NOT NULL auto_increment,
  `usuario` varchar(10) NOT NULL default '',
  `contrasena` varchar(10) NOT NULL default '',
  `modificar_fechas` char(1) NOT NULL default '',
  `ultima_sesion` timestamp NOT NULL default CURRENT_TIMESTAMP on update CURRENT_TIMESTAMP,
  `direccion_ip` varchar(15) NOT NULL default '',
  `cambio_contrasena` date NOT NULL default '0000-00-00',
  `estatus_id` tinyint(4) unsigned NOT NULL default '0',
  `fecha_modificacion` timestamp NOT NULL default '0000-00-00 00:00:00',
  `usuario_mov_id` tinyint(4) NOT NULL default '0',
  PRIMARY KEY  (`usuario_id`),
  KEY `IN01` (`usuario`,`estatus_id`),
  KEY `IN02` (`usuario_id`,`estatus_id`),
  KEY `IN03` (`usuario_id`,`usuario`),
  KEY `IN04` (`estatus_id`,`usuario`),
  KEY `IN05` (`usuario_id`,`contrasena`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=31 ;

-- 
-- Volcar la base de datos para la tabla `usuarios`
-- 

INSERT INTO `usuarios` VALUES (1, 'zonahs', '0$aDAmYZce', '1', '2013-05-17 16:05:52', '', '0000-00-00', 1, '2011-03-11 18:56:13', 1);
INSERT INTO `usuarios` VALUES (4, 'ejemplo12', '123456', '1', '2013-05-04 10:39:56', '', '0000-00-00', 1, '2011-07-07 10:35:20', 1);
INSERT INTO `usuarios` VALUES (5, 'empleado', '123456', '1', '2013-03-19 18:33:37', '', '0000-00-00', 1, '2011-07-08 17:27:11', 1);
INSERT INTO `usuarios` VALUES (6, 'managerr', '0$aDAmYZce', '1', '2012-09-27 09:43:48', '', '0000-00-00', 1, '2012-09-27 09:43:48', 1);
INSERT INTO `usuarios` VALUES (7, 'emp_guard', '0$BUlpPukq', '1', '2013-02-15 05:36:57', '', '0000-00-00', 1, '2012-09-27 15:22:42', 1);
INSERT INTO `usuarios` VALUES (10, 'alexalexy', '111111', '2', '2013-05-09 11:13:11', '', '0000-00-00', 2, '0000-00-00 00:00:00', 1);
INSERT INTO `usuarios` VALUES (11, 'guadalupe', '0$BUlpPukq', '1', '2013-02-15 22:59:42', '', '0000-00-00', 1, '0000-00-00 00:00:00', 1);
INSERT INTO `usuarios` VALUES (23, 'f', '0$BUlpPukq', '1', '2013-04-30 11:02:48', '', '0000-00-00', 3, '0000-00-00 00:00:00', 1);
INSERT INTO `usuarios` VALUES (24, 'h', '0$BUlpPukq', '1', '2013-04-30 11:02:56', '', '0000-00-00', 3, '0000-00-00 00:00:00', 1);
INSERT INTO `usuarios` VALUES (25, 'g', '0$BUlpPukq', '1', '2013-04-30 11:02:52', '', '0000-00-00', 3, '0000-00-00 00:00:00', 1);
INSERT INTO `usuarios` VALUES (27, 'aléx', '0$fq5F9CYR', '1', '2013-05-02 18:52:10', '', '0000-00-00', 3, '0000-00-00 00:00:00', 1);
INSERT INTO `usuarios` VALUES (28, 'qerqwreq', '123456', '1', '2013-04-30 11:04:03', '', '0000-00-00', 3, '0000-00-00 00:00:00', 1);
INSERT INTO `usuarios` VALUES (29, 'alfredo', '123456', '1', '0000-00-00 00:00:00', '', '0000-00-00', 1, '0000-00-00 00:00:00', 1);
INSERT INTO `usuarios` VALUES (30, '123456', '123456', '1', '2013-04-30 10:58:22', '', '0000-00-00', 3, '0000-00-00 00:00:00', 1);
