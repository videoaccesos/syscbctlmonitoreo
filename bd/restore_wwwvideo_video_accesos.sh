#!/bin/bash
# =============================================================================
# Script de Restauración Segura - wwwvideo_video_accesos
# =============================================================================
# Extrae y restaura SOLO la base de datos wwwvideo_video_accesos desde el
# backup backup_complete_20250806_172024.tar.gz sin afectar otras bases de datos.
#
# Uso:
#   chmod +x restore_wwwvideo_video_accesos.sh
#   ./restore_wwwvideo_video_accesos.sh /ruta/al/backup_complete_20250806_172024.tar.gz
#
# Requisitos:
#   - Acceso al servidor MySQL con permisos sobre wwwvideo_video_accesos
#   - tar, gzip instalados
#   - mysql client instalado
# =============================================================================

set -euo pipefail

# ── Colores para output ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # Sin color

# ── Configuración de la base de datos ──
DB_NAME="wwwvideo_video_accesos"
DB_USER="wwwvideo_root"
DB_HOST="localhost"
DB_PORT="3306"

# ── Directorio temporal de trabajo ──
WORK_DIR="/tmp/restore_${DB_NAME}_$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${WORK_DIR}/backup_extraido"
EXTRACTED_SQL=""

# ── Funciones de utilidad ──
log_info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

cleanup() {
    if [ -d "$WORK_DIR" ]; then
        log_info "Limpiando directorio temporal: $WORK_DIR"
        rm -rf "$WORK_DIR"
    fi
}
trap cleanup EXIT

# ── Validar argumentos ──
if [ $# -lt 1 ]; then
    echo ""
    echo "Uso: $0 <ruta_backup_tar_gz> [--password <contraseña>] [--dry-run]"
    echo ""
    echo "Opciones:"
    echo "  --password <pass>   Contraseña de MySQL (o usar variable MYSQL_PWD)"
    echo "  --dry-run           Solo extraer y mostrar info, sin restaurar"
    echo "  --no-backup         No crear respaldo previo de la BD actual"
    echo "  --tables <lista>    Restaurar solo tablas específicas (separadas por coma)"
    echo ""
    echo "Ejemplo:"
    echo "  $0 /ruta/backup_complete_20250806_172024.tar.gz --password 'V1de0@cces0s'"
    echo "  $0 /ruta/backup_complete_20250806_172024.tar.gz --dry-run"
    echo ""
    exit 1
fi

BACKUP_FILE="$1"
shift

# ── Parsear opciones ──
DRY_RUN=false
NO_BACKUP=false
MYSQL_PASS=""
SPECIFIC_TABLES=""

while [ $# -gt 0 ]; do
    case "$1" in
        --password)
            MYSQL_PASS="$2"
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
        --tables)
            SPECIFIC_TABLES="$2"
            shift 2
            ;;
        *)
            log_error "Opción desconocida: $1"
            exit 1
            ;;
    esac
done

# ── Construir comando MySQL base ──
build_mysql_cmd() {
    local cmd="mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER}"
    if [ -n "$MYSQL_PASS" ]; then
        cmd="$cmd -p'${MYSQL_PASS}'"
    fi
    echo "$cmd"
}

build_mysqldump_cmd() {
    local cmd="mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER}"
    if [ -n "$MYSQL_PASS" ]; then
        cmd="$cmd -p'${MYSQL_PASS}'"
    fi
    echo "$cmd"
}

# =============================================================================
# PASO 1: Validar que el archivo de backup existe
# =============================================================================
echo ""
echo "============================================================"
echo "  Restauración Segura: ${DB_NAME}"
echo "  Backup: $(basename "$BACKUP_FILE")"
echo "  Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Archivo de backup no encontrado: $BACKUP_FILE"
    exit 1
fi
log_ok "Archivo de backup encontrado: $BACKUP_FILE"
log_info "Tamaño: $(du -h "$BACKUP_FILE" | cut -f1)"

# =============================================================================
# PASO 2: Crear directorio de trabajo y explorar contenido del tar.gz
# =============================================================================
log_info "Creando directorio temporal: $WORK_DIR"
mkdir -p "$BACKUP_DIR"

log_info "Explorando contenido del backup..."
echo ""

# Listar contenido del tar.gz buscando archivos SQL relacionados
log_info "Archivos SQL encontrados en el backup:"
echo "------------------------------------------------------------"
tar -tzf "$BACKUP_FILE" 2>/dev/null | grep -iE '\.sql(\.gz)?$' | head -50 || true
echo "------------------------------------------------------------"
echo ""

# Buscar específicamente archivos relacionados con wwwvideo_video_accesos
log_info "Buscando dumps de '${DB_NAME}'..."
MATCHING_FILES=$(tar -tzf "$BACKUP_FILE" 2>/dev/null | grep -iE "(wwwvideo|video_accesos)" | head -20 || true)

if [ -z "$MATCHING_FILES" ]; then
    log_warn "No se encontraron archivos con 'wwwvideo' o 'video_accesos' en el nombre."
    log_info "Mostrando TODOS los archivos del backup para identificar manualmente:"
    echo "------------------------------------------------------------"
    tar -tzf "$BACKUP_FILE" 2>/dev/null | head -100
    echo "------------------------------------------------------------"
    echo ""
    log_info "Si el dump está dentro de un archivo con otro nombre, revise la lista anterior."
    log_info "Los backups completos de MySQL suelen contener un solo archivo con todas las BDs."

    # Intentar extraer todo y buscar dentro de los SQL
    log_info "Extrayendo archivos SQL para inspeccionar su contenido..."
    tar -xzf "$BACKUP_FILE" -C "$BACKUP_DIR" 2>/dev/null || true

    # Buscar dentro de los archivos extraídos
    SQL_FILES=$(find "$BACKUP_DIR" -name "*.sql" -o -name "*.sql.gz" 2>/dev/null || true)

    if [ -z "$SQL_FILES" ]; then
        log_error "No se encontraron archivos SQL en el backup."
        log_info "Contenido completo del backup extraído:"
        find "$BACKUP_DIR" -type f 2>/dev/null | head -50
        exit 1
    fi

    for sql_file in $SQL_FILES; do
        log_info "Inspeccionando: $(basename "$sql_file")"
        # Si es .sql.gz, descomprimir primero
        if [[ "$sql_file" == *.sql.gz ]]; then
            gunzip -k "$sql_file" 2>/dev/null || true
            sql_file="${sql_file%.gz}"
        fi
        # Buscar referencia a la BD dentro del archivo
        if grep -l "wwwvideo_video_accesos\|USE \`wwwvideo_video_accesos\`\|CREATE DATABASE.*wwwvideo" "$sql_file" >/dev/null 2>&1; then
            log_ok "¡ENCONTRADO! El archivo contiene datos de ${DB_NAME}: $(basename "$sql_file")"
            EXTRACTED_SQL="$sql_file"
            break
        fi
    done
else
    echo "$MATCHING_FILES"
    echo ""

    # Extraer solo los archivos relevantes
    log_info "Extrayendo archivos relacionados con ${DB_NAME}..."
    while IFS= read -r file; do
        tar -xzf "$BACKUP_FILE" -C "$BACKUP_DIR" "$file" 2>/dev/null || true
        log_ok "Extraído: $file"
    done <<< "$MATCHING_FILES"

    # Buscar el archivo SQL principal
    EXTRACTED_SQL=$(find "$BACKUP_DIR" -name "*.sql" -o -name "*.sql.gz" 2>/dev/null | head -1)

    # Descomprimir si es .sql.gz
    if [[ "$EXTRACTED_SQL" == *.sql.gz ]]; then
        log_info "Descomprimiendo: $(basename "$EXTRACTED_SQL")"
        gunzip "$EXTRACTED_SQL"
        EXTRACTED_SQL="${EXTRACTED_SQL%.gz}"
    fi
fi

if [ -z "$EXTRACTED_SQL" ] || [ ! -f "$EXTRACTED_SQL" ]; then
    log_error "No se pudo encontrar/extraer el dump SQL de ${DB_NAME}."
    log_info "Puede que el backup contenga un dump completo de todas las BDs."
    log_info "En ese caso, necesitamos extraer solo la sección de ${DB_NAME}."

    # Último intento: buscar cualquier SQL y extraer la sección de la BD
    ALL_SQL=$(find "$BACKUP_DIR" -name "*.sql" -type f 2>/dev/null | head -1)
    if [ -n "$ALL_SQL" ]; then
        log_info "Intentando extraer sección de ${DB_NAME} del dump completo..."
        EXTRACTED_SQL="${WORK_DIR}/${DB_NAME}_extracted.sql"

        # Extraer solo la sección correspondiente a wwwvideo_video_accesos
        awk -v db="$DB_NAME" '
            /^-- Current Database:/ { in_db=0 }
            /^-- Current Database:.*wwwvideo_video_accesos/ { in_db=1 }
            /^USE `wwwvideo_video_accesos`/ { in_db=1 }
            /^CREATE DATABASE.*wwwvideo_video_accesos/ { in_db=1 }
            in_db { print }
            /^-- Current Database:/ && !/wwwvideo_video_accesos/ { in_db=0 }
        ' "$ALL_SQL" > "$EXTRACTED_SQL" 2>/dev/null || true

        if [ ! -s "$EXTRACTED_SQL" ]; then
            # Segundo intento: usar sed para extraer entre marcadores de BD
            sed -n "/USE \`${DB_NAME}\`/,/USE \`[^${DB_NAME}]/p" "$ALL_SQL" > "$EXTRACTED_SQL" 2>/dev/null || true
        fi

        if [ -s "$EXTRACTED_SQL" ]; then
            log_ok "Sección de ${DB_NAME} extraída exitosamente."
        else
            log_error "No se pudo extraer la sección de ${DB_NAME} del dump."
            exit 1
        fi
    else
        exit 1
    fi
fi

# =============================================================================
# PASO 3: Analizar el dump extraído
# =============================================================================
echo ""
log_info "═══════════════════════════════════════════════════"
log_info "  Análisis del dump SQL extraído"
log_info "═══════════════════════════════════════════════════"

SQL_SIZE=$(du -h "$EXTRACTED_SQL" | cut -f1)
log_info "Archivo: $(basename "$EXTRACTED_SQL")"
log_info "Tamaño: $SQL_SIZE"

# Contar tablas
TABLE_COUNT=$(grep -c "^CREATE TABLE" "$EXTRACTED_SQL" 2>/dev/null || echo "0")
log_info "Tablas encontradas: $TABLE_COUNT"

# Listar tablas
log_info "Tablas en el dump:"
echo "------------------------------------------------------------"
grep "^CREATE TABLE" "$EXTRACTED_SQL" 2>/dev/null | sed 's/CREATE TABLE `\([^`]*\)`.*/  - \1/' || true
echo "------------------------------------------------------------"

# Verificar que NO contenga otras bases de datos
OTHER_DBS=$(grep -oP "USE \`\K[^\`]+" "$EXTRACTED_SQL" 2>/dev/null | sort -u | grep -v "$DB_NAME" || true)
if [ -n "$OTHER_DBS" ]; then
    log_warn "¡ATENCIÓN! El dump contiene referencias a otras bases de datos:"
    echo "$OTHER_DBS" | while read -r db; do
        echo "  - $db"
    done
    log_info "Se filtrarán para restaurar SOLO ${DB_NAME}."
fi

# =============================================================================
# PASO 4: Modo dry-run (solo mostrar info, no restaurar)
# =============================================================================
if [ "$DRY_RUN" = true ]; then
    echo ""
    log_warn "MODO DRY-RUN: No se realizarán cambios en la base de datos."
    log_info "El dump extraído está disponible en: $EXTRACTED_SQL"
    log_info "Para ver las primeras líneas del dump:"
    echo "  head -100 $EXTRACTED_SQL"
    echo ""
    log_info "Para restaurar, ejecute el script sin --dry-run"

    # No limpiar el directorio temporal en dry-run
    trap - EXIT
    exit 0
fi

# =============================================================================
# PASO 5: Crear respaldo de la BD actual (antes de restaurar)
# =============================================================================
if [ "$NO_BACKUP" != true ]; then
    echo ""
    log_info "═══════════════════════════════════════════════════"
    log_info "  Creando respaldo previo de ${DB_NAME} actual"
    log_info "═══════════════════════════════════════════════════"

    PRE_BACKUP_FILE="$(pwd)/bd/${DB_NAME}_pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
    DUMP_CMD=$(build_mysqldump_cmd)

    log_info "Respaldando BD actual a: $PRE_BACKUP_FILE"
    if eval "$DUMP_CMD --single-transaction --routines --triggers ${DB_NAME}" 2>/dev/null | gzip > "$PRE_BACKUP_FILE"; then
        BACKUP_SIZE=$(du -h "$PRE_BACKUP_FILE" | cut -f1)
        log_ok "Respaldo previo creado exitosamente ($BACKUP_SIZE)"
        log_info "En caso de problemas, restaurar con:"
        echo "  gunzip < $PRE_BACKUP_FILE | mysql -u ${DB_USER} -p ${DB_NAME}"
    else
        log_warn "No se pudo crear respaldo previo (el servidor MySQL puede no estar accesible)."
        echo ""
        read -p "¿Desea continuar sin respaldo previo? (s/N): " CONFIRM
        if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
            log_info "Operación cancelada por el usuario."
            exit 0
        fi
    fi
fi

# =============================================================================
# PASO 6: Preparar el SQL para restauración segura
# =============================================================================
echo ""
log_info "═══════════════════════════════════════════════════"
log_info "  Preparando SQL para restauración segura"
log_info "═══════════════════════════════════════════════════"

SAFE_SQL="${WORK_DIR}/${DB_NAME}_safe_restore.sql"

cat > "$SAFE_SQL" << 'HEADER'
-- =============================================================================
-- Restauración segura de wwwvideo_video_accesos
-- Generado automáticamente por restore_wwwvideo_video_accesos.sh
-- =============================================================================
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT;
SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS;
SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION;
SET NAMES utf8;

HEADER

# Asegurar que solo se usa la BD correcta
echo "USE \`${DB_NAME}\`;" >> "$SAFE_SQL"
echo "" >> "$SAFE_SQL"

# Si se especificaron tablas específicas, filtrar
if [ -n "$SPECIFIC_TABLES" ]; then
    log_info "Filtrando solo tablas: $SPECIFIC_TABLES"
    IFS=',' read -ra TABLE_ARRAY <<< "$SPECIFIC_TABLES"

    for table in "${TABLE_ARRAY[@]}"; do
        table=$(echo "$table" | xargs) # trim espacios
        log_info "Extrayendo tabla: $table"
        # Extraer DROP, CREATE y datos de la tabla específica
        awk -v tbl="$table" '
            /^DROP TABLE IF EXISTS `'"$table"'`/ { printing=1 }
            /^CREATE TABLE.*`'"$table"'`/ { printing=1 }
            /^LOCK TABLES `'"$table"'`/ { printing=1 }
            printing { print }
            /^UNLOCK TABLES/ && printing { printing=0; print "" }
            /^-- Table structure for table `[^`]*`/ && printing { printing=0 }
        ' "$EXTRACTED_SQL" >> "$SAFE_SQL"
    done
else
    # Agregar todo el dump (filtrado para solo esta BD)
    # Eliminar líneas CREATE DATABASE y USE de otras BDs
    grep -v "^CREATE DATABASE" "$EXTRACTED_SQL" | \
    grep -v "^DROP DATABASE" | \
    sed "/^USE \`/d" >> "$SAFE_SQL"
fi

# Agregar footer de restauración
cat >> "$SAFE_SQL" << 'FOOTER'

-- Restaurar configuración original
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET SQL_MODE=@OLD_SQL_MODE;
SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT;
SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS;
SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION;
FOOTER

log_ok "SQL preparado: $SAFE_SQL"

# =============================================================================
# PASO 7: Confirmación del usuario
# =============================================================================
echo ""
echo "============================================================"
echo "  RESUMEN DE LA RESTAURACIÓN"
echo "============================================================"
echo ""
echo "  Base de datos:  ${DB_NAME}"
echo "  Servidor:       ${DB_HOST}:${DB_PORT}"
echo "  Usuario:        ${DB_USER}"
echo "  Tablas:         ${TABLE_COUNT}"
echo "  Tamaño dump:    ${SQL_SIZE}"
if [ -n "$SPECIFIC_TABLES" ]; then
    echo "  Tablas filtro:  ${SPECIFIC_TABLES}"
fi
echo ""
echo "  ⚠  ESTA OPERACIÓN REEMPLAZARÁ LOS DATOS EXISTENTES"
echo "  ⚠  EN LA BD ${DB_NAME}"
echo ""
echo "============================================================"
echo ""

read -p "¿Confirma la restauración? (escriba 'RESTAURAR' para confirmar): " CONFIRM
if [ "$CONFIRM" != "RESTAURAR" ]; then
    log_info "Operación cancelada. No se realizaron cambios."
    exit 0
fi

# =============================================================================
# PASO 8: Ejecutar restauración
# =============================================================================
echo ""
log_info "═══════════════════════════════════════════════════"
log_info "  Ejecutando restauración..."
log_info "═══════════════════════════════════════════════════"

MYSQL_CMD=$(build_mysql_cmd)
START_TIME=$(date +%s)

if eval "$MYSQL_CMD ${DB_NAME}" < "$SAFE_SQL" 2>&1; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo ""
    log_ok "════════════════════════════════════════════════"
    log_ok "  Restauración completada exitosamente"
    log_ok "  Duración: ${DURATION} segundos"
    log_ok "════════════════════════════════════════════════"
else
    echo ""
    log_error "════════════════════════════════════════════════"
    log_error "  Error durante la restauración"
    log_error "════════════════════════════════════════════════"
    if [ "$NO_BACKUP" != true ] && [ -f "$PRE_BACKUP_FILE" ]; then
        echo ""
        log_info "Para revertir al estado anterior, ejecute:"
        echo "  gunzip < $PRE_BACKUP_FILE | mysql -u ${DB_USER} -p ${DB_NAME}"
    fi
    exit 1
fi

# =============================================================================
# PASO 9: Verificación post-restauración
# =============================================================================
echo ""
log_info "Verificando restauración..."

VERIFY_SQL="SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = '${DB_NAME}'
ORDER BY TABLE_NAME;"

echo "------------------------------------------------------------"
echo "  Tablas en ${DB_NAME} después de la restauración:"
echo "------------------------------------------------------------"
eval "$MYSQL_CMD -e \"$VERIFY_SQL\"" 2>/dev/null || log_warn "No se pudo verificar (servidor no accesible)"
echo "------------------------------------------------------------"
echo ""
log_ok "Proceso finalizado."
