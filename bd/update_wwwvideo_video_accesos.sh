#!/bin/bash
# =============================================================================
# Script de Actualización - wwwvideo_video_accesos
# =============================================================================
# Actualiza la base de datos MySQL wwwvideo_video_accesos usando un archivo
# SQL exportado que contiene la versión más reciente.
#
# Uso:
#   chmod +x update_wwwvideo_video_accesos.sh
#   ./update_wwwvideo_video_accesos.sh [opciones]
#
# Ejemplos:
#   ./update_wwwvideo_video_accesos.sh --password 'MiPassword'
#   ./update_wwwvideo_video_accesos.sh --password 'MiPassword' --dry-run
#   ./update_wwwvideo_video_accesos.sh --password 'MiPassword' --sql /otra/ruta/dump.sql
#
# Requisitos:
#   - mysql client instalado
#   - mysqldump instalado (para respaldo previo)
#   - Acceso al servidor MySQL con permisos sobre wwwvideo_video_accesos
# =============================================================================

set -euo pipefail

# ── Colores ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Configuración de la base de datos ──
DB_NAME="wwwvideo_video_accesos"
DB_USER="wwwvideo_root"
DB_HOST="localhost"
DB_PORT="3306"

# ── Ruta por defecto del SQL actualizado ──
DEFAULT_SQL_PATH="/home/wwwvideoaccesos/public_html/syscbctlmonitoreo/wwwvideo_video_accesos.sql"

# ── Directorio de respaldos ──
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"

# ── Funciones de utilidad ──
log_info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Parsear argumentos ──
DRY_RUN=false
NO_BACKUP=false
MYSQL_PASS=""
SQL_FILE="$DEFAULT_SQL_PATH"

show_help() {
    echo ""
    echo "Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  --password <pass>   Contraseña de MySQL (requerida si no usa MYSQL_PWD)"
    echo "  --sql <ruta>        Ruta al archivo SQL actualizado"
    echo "                      (por defecto: $DEFAULT_SQL_PATH)"
    echo "  --dry-run           Solo analizar diferencias, sin aplicar cambios"
    echo "  --no-backup         No crear respaldo previo (NO recomendado)"
    echo "  --help              Mostrar esta ayuda"
    echo ""
    exit 0
}

while [ $# -gt 0 ]; do
    case "$1" in
        --password)
            MYSQL_PASS="$2"
            shift 2
            ;;
        --sql)
            SQL_FILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-backup)
            NO_BACKUP=true
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            log_error "Opción desconocida: $1"
            show_help
            ;;
    esac
done

# ── Construir comandos MySQL ──
MYSQL_AUTH="-h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER}"
if [ -n "$MYSQL_PASS" ]; then
    MYSQL_AUTH="$MYSQL_AUTH -p${MYSQL_PASS}"
fi

mysql_exec() {
    mysql $MYSQL_AUTH "$@" 2>/dev/null
}

mysqldump_exec() {
    mysqldump $MYSQL_AUTH "$@" 2>/dev/null
}

# =============================================================================
# PASO 1: Validaciones
# =============================================================================
echo ""
echo -e "${BOLD}============================================================${NC}"
echo -e "${BOLD}  Actualización de BD: ${DB_NAME}${NC}"
echo -e "${BOLD}  Fecha: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BOLD}============================================================${NC}"
echo ""

# Validar que el archivo SQL existe
if [ ! -f "$SQL_FILE" ]; then
    log_error "Archivo SQL no encontrado: $SQL_FILE"
    echo ""
    echo "  Verifique que el archivo existe o use --sql para indicar otra ruta."
    echo "  Ejemplo: $0 --password 'pass' --sql /ruta/al/archivo.sql"
    echo ""
    exit 1
fi

SQL_SIZE=$(du -h "$SQL_FILE" | cut -f1)
SQL_LINES=$(wc -l < "$SQL_FILE")
log_ok "Archivo SQL encontrado: $SQL_FILE"
log_info "Tamaño: $SQL_SIZE ($SQL_LINES líneas)"

# Validar conexión a MySQL
log_info "Verificando conexión a MySQL..."
if ! mysql_exec -e "SELECT 1" "$DB_NAME" > /dev/null 2>&1; then
    log_error "No se pudo conectar a MySQL."
    echo ""
    echo "  Verifique:"
    echo "  - Usuario: $DB_USER"
    echo "  - Host: $DB_HOST:$DB_PORT"
    echo "  - Base de datos: $DB_NAME"
    echo "  - Que la contraseña sea correcta (--password)"
    echo ""
    exit 1
fi
log_ok "Conexión a MySQL exitosa"

# =============================================================================
# PASO 2: Análisis de la BD actual vs SQL nuevo
# =============================================================================
echo ""
log_info "═══════════════════════════════════════════════════"
log_info "  Análisis comparativo"
log_info "═══════════════════════════════════════════════════"

# Tablas actuales en MySQL
CURRENT_TABLES=$(mysql_exec -N -e "
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = '${DB_NAME}'
    ORDER BY TABLE_NAME;" 2>/dev/null || echo "")

CURRENT_TABLE_COUNT=0
if [ -n "$CURRENT_TABLES" ]; then CURRENT_TABLE_COUNT=$(echo "$CURRENT_TABLES" | wc -l); fi
log_info "Tablas en BD actual (MySQL): $CURRENT_TABLE_COUNT"

if [ -n "$CURRENT_TABLES" ]; then
    echo "$CURRENT_TABLES" | while read -r t; do
        echo "  - $t"
    done
fi

echo ""

# Tablas en el SQL nuevo
NEW_TABLES=$(grep -oP 'CREATE TABLE\s+`\K[^`]+' "$SQL_FILE" 2>/dev/null | sort -u || echo "")
NEW_TABLE_COUNT=0
if [ -n "$NEW_TABLES" ]; then
    NEW_TABLE_COUNT=$(echo "$NEW_TABLES" | wc -l)
fi
log_info "Tablas en SQL nuevo: $NEW_TABLE_COUNT"

if [ -n "$NEW_TABLES" ]; then
    echo "$NEW_TABLES" | while read -r t; do
        echo "  - $t"
    done
fi

echo ""

# Comparar tablas
if [ -n "$CURRENT_TABLES" ] && [ -n "$NEW_TABLES" ]; then
    # Tablas nuevas (en SQL pero no en MySQL)
    ADDED=$(comm -13 <(echo "$CURRENT_TABLES" | sort) <(echo "$NEW_TABLES" | sort) 2>/dev/null || echo "")
    # Tablas que se eliminarían (en MySQL pero no en SQL)
    REMOVED=$(comm -23 <(echo "$CURRENT_TABLES" | sort) <(echo "$NEW_TABLES" | sort) 2>/dev/null || echo "")
    # Tablas que se actualizarían (en ambos)
    COMMON=$(comm -12 <(echo "$CURRENT_TABLES" | sort) <(echo "$NEW_TABLES" | sort) 2>/dev/null || echo "")

    ADDED_COUNT=0
    REMOVED_COUNT=0
    COMMON_COUNT=0
    if [ -n "$ADDED" ]; then ADDED_COUNT=$(echo "$ADDED" | wc -l); fi
    if [ -n "$REMOVED" ]; then REMOVED_COUNT=$(echo "$REMOVED" | wc -l); fi
    if [ -n "$COMMON" ]; then COMMON_COUNT=$(echo "$COMMON" | wc -l); fi

    if [ "$ADDED_COUNT" -gt 0 ]; then
        echo -e "  ${GREEN}+ Tablas NUEVAS que se agregarán ($ADDED_COUNT):${NC}"
        echo "$ADDED" | while read -r t; do echo "    + $t"; done
        echo ""
    fi

    if [ "$REMOVED_COUNT" -gt 0 ]; then
        echo -e "  ${RED}! Tablas en MySQL que NO están en el SQL nuevo ($REMOVED_COUNT):${NC}"
        echo "$REMOVED" | while read -r t; do echo "    ! $t"; done
        echo -e "  ${YELLOW}  (Estas tablas NO se eliminarán, se conservarán intactas)${NC}"
        echo ""
    fi

    if [ "$COMMON_COUNT" -gt 0 ]; then
        echo -e "  ${CYAN}~ Tablas que se actualizarán ($COMMON_COUNT):${NC}"
        echo "$COMMON" | while read -r t; do echo "    ~ $t"; done
        echo ""
    fi
fi

# Registros en el SQL nuevo
INSERT_COUNT=$(grep -c "^INSERT INTO" "$SQL_FILE" 2>/dev/null || echo "0")
log_info "Sentencias INSERT en SQL nuevo: $INSERT_COUNT"

# Registros actuales por tabla
echo ""
log_info "Registros actuales en MySQL por tabla:"
echo "------------------------------------------------------------"
mysql_exec -e "
    SELECT TABLE_NAME AS 'Tabla',
           TABLE_ROWS AS 'Registros',
           ROUND(DATA_LENGTH/1024, 1) AS 'Datos_KB'
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = '${DB_NAME}'
    ORDER BY TABLE_NAME;" 2>/dev/null || log_warn "No se pudo consultar info de tablas"
echo "------------------------------------------------------------"

# =============================================================================
# PASO 3: Modo dry-run
# =============================================================================
if [ "$DRY_RUN" = true ]; then
    echo ""
    log_warn "═══════════════════════════════════════════════════"
    log_warn "  MODO DRY-RUN: No se realizaron cambios"
    log_warn "═══════════════════════════════════════════════════"
    echo ""
    log_info "Para aplicar la actualización, ejecute sin --dry-run:"
    echo "  $0 --password 'PASSWORD'"
    echo ""
    exit 0
fi

# =============================================================================
# PASO 4: Respaldo de la BD actual
# =============================================================================
if [ "$NO_BACKUP" != true ]; then
    echo ""
    log_info "═══════════════════════════════════════════════════"
    log_info "  Creando respaldo de la BD actual"
    log_info "═══════════════════════════════════════════════════"

    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"

    log_info "Respaldando a: $BACKUP_FILE"

    if mysqldump_exec --single-transaction --routines --triggers --events "$DB_NAME" | gzip > "$BACKUP_FILE"; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_ok "Respaldo creado exitosamente ($BACKUP_SIZE)"
        echo ""
        echo -e "  ${YELLOW}Para revertir en caso de problemas:${NC}"
        echo "  gunzip < $BACKUP_FILE | mysql $MYSQL_AUTH $DB_NAME"
        echo ""
    else
        log_error "No se pudo crear el respaldo."
        echo ""
        read -p "  ¿Continuar SIN respaldo? Esto es riesgoso (s/N): " CONFIRM
        if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
            log_info "Operación cancelada."
            exit 0
        fi
    fi
fi

# =============================================================================
# PASO 5: Confirmación del usuario
# =============================================================================
echo ""
echo -e "${BOLD}============================================================${NC}"
echo -e "${BOLD}  RESUMEN DE LA ACTUALIZACIÓN${NC}"
echo -e "${BOLD}============================================================${NC}"
echo ""
echo "  Base de datos:     ${DB_NAME}"
echo "  Servidor:          ${DB_HOST}:${DB_PORT}"
echo "  Usuario MySQL:     ${DB_USER}"
echo "  Archivo SQL:       $(basename "$SQL_FILE")"
echo "  Tamaño SQL:        ${SQL_SIZE}"
echo "  Tablas en SQL:     ${NEW_TABLE_COUNT}"
echo "  Tablas en MySQL:   ${CURRENT_TABLE_COUNT}"
echo ""
echo -e "  ${YELLOW}IMPORTANTE: Las tablas del SQL nuevo reemplazarán${NC}"
echo -e "  ${YELLOW}estructura y datos de las tablas existentes.${NC}"
echo -e "  ${YELLOW}Las tablas que NO estén en el SQL se conservarán.${NC}"
echo ""
echo -e "${BOLD}============================================================${NC}"
echo ""

read -p "  Escriba 'ACTUALIZAR' para confirmar: " CONFIRM
if [ "$CONFIRM" != "ACTUALIZAR" ]; then
    log_info "Operación cancelada. No se realizaron cambios."
    exit 0
fi

# =============================================================================
# PASO 6: Aplicar actualización
# =============================================================================
echo ""
log_info "═══════════════════════════════════════════════════"
log_info "  Aplicando actualización..."
log_info "═══════════════════════════════════════════════════"

START_TIME=$(date +%s)

# Crear SQL wrapper con protecciones
TEMP_SQL=$(mktemp /tmp/update_${DB_NAME}_XXXXXX.sql)
trap "rm -f $TEMP_SQL" EXIT

cat > "$TEMP_SQL" << SQLHEADER
-- Actualización automática de ${DB_NAME}
-- Generado por update_wwwvideo_video_accesos.sh
-- Fecha: $(date '+%Y-%m-%d %H:%M:%S')

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS;
SET @OLD_SQL_MODE=@@SQL_MODE;
SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS;

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
SET UNIQUE_CHECKS=0;
SET NAMES utf8;

USE \`${DB_NAME}\`;

SQLHEADER

# Agregar el SQL del archivo (filtrando CREATE DATABASE y USE de otras BD)
grep -v "^CREATE DATABASE" "$SQL_FILE" | \
grep -v "^DROP DATABASE" | \
grep -v "^USE \`" >> "$TEMP_SQL"

cat >> "$TEMP_SQL" << SQLFOOTER

-- Restaurar configuración
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET SQL_MODE=@OLD_SQL_MODE;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
SQLFOOTER

# Ejecutar
log_info "Importando SQL..."

if mysql_exec "$DB_NAME" < "$TEMP_SQL" 2>&1; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    echo ""
    log_ok "════════════════════════════════════════════════"
    log_ok "  Actualización completada exitosamente"
    log_ok "  Duración: ${DURATION} segundos"
    log_ok "════════════════════════════════════════════════"
else
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    echo ""
    log_error "════════════════════════════════════════════════"
    log_error "  Error durante la actualización (${DURATION}s)"
    log_error "════════════════════════════════════════════════"

    if [ "$NO_BACKUP" != true ] && [ -f "$BACKUP_FILE" ]; then
        echo ""
        log_warn "Para revertir al estado anterior:"
        echo "  gunzip < $BACKUP_FILE | mysql $MYSQL_AUTH $DB_NAME"
    fi
    exit 1
fi

# =============================================================================
# PASO 7: Verificación post-actualización
# =============================================================================
echo ""
log_info "Verificando actualización..."
echo ""
echo "------------------------------------------------------------"
echo "  Tablas en ${DB_NAME} después de la actualización:"
echo "------------------------------------------------------------"
mysql_exec -e "
    SELECT TABLE_NAME AS 'Tabla',
           TABLE_ROWS AS 'Registros',
           ROUND(DATA_LENGTH/1024, 1) AS 'Datos_KB',
           UPDATE_TIME AS 'Última_Modificación'
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = '${DB_NAME}'
    ORDER BY TABLE_NAME;" 2>/dev/null || log_warn "No se pudo verificar"
echo "------------------------------------------------------------"
echo ""

# Resumen final
FINAL_TABLES=$(mysql_exec -N -e "
    SELECT COUNT(*)
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = '${DB_NAME}';" 2>/dev/null || echo "?")

log_ok "Tablas totales: $FINAL_TABLES"
echo ""

if [ "$NO_BACKUP" != true ] && [ -f "$BACKUP_FILE" ]; then
    log_info "Respaldo disponible en: $BACKUP_FILE"
fi

log_ok "Proceso finalizado."
echo ""
