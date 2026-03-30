/**
 * Frame Store - Almacen en memoria de ultimos frames recibidos de agentes remotos.
 *
 * Cada agente envia frames JPEG por HTTPS POST. Aqui se guarda solo el
 * ultimo frame por combinacion site_id + cam_id, junto con timestamp y
 * metadatos basicos. El camera-proxy consulta este store antes de intentar
 * fetch directo al DVR.
 */

export interface StoredFrame {
  /** JPEG raw bytes */
  data: Buffer;
  /** Timestamp de recepcion (Date.now()) */
  receivedAt: number;
  /** site_id reportado por el agente */
  siteId: string;
  /** cam_id (1, 2, 3) */
  camId: number;
  /** Content-Type original (normalmente image/jpeg) */
  contentType: string;
  /** Hostname del agente que lo envio */
  agentHost?: string;
  /** FPS configurado en el agente */
  fps?: number;
}

/** Clave unica: "site:{siteId}:cam:{camId}" */
function frameKey(siteId: string, camId: number): string {
  return `site:${siteId}:cam:${camId}`;
}

// ---------------------------------------------------------------------------
// Store singleton
// ---------------------------------------------------------------------------
const frames = new Map<string, StoredFrame>();

/** Maximo tiempo (ms) que un frame se considera valido. Pasado este tiempo,
 *  getFrame() lo ignora y retorna null. Evita mostrar imagenes viejas. */
const MAX_FRAME_AGE_MS = 5_000; // 5 segundos (con alto FPS se renueva constantemente)

/** Limpieza periodica de frames viejos para no acumular memoria */
const CLEANUP_INTERVAL_MS = 30_000; // cada 30 seg

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, frame] of frames) {
      if (now - frame.receivedAt > MAX_FRAME_AGE_MS * 2) {
        frames.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // No bloquear el shutdown de Node
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

// ---------------------------------------------------------------------------
// API publica
// ---------------------------------------------------------------------------

/** Guardar un frame recibido del agente */
export function putFrame(siteId: string, camId: number, data: Buffer, opts?: {
  contentType?: string;
  agentHost?: string;
  fps?: number;
}): void {
  ensureCleanup();
  const key = frameKey(siteId, camId);
  frames.set(key, {
    data,
    receivedAt: Date.now(),
    siteId,
    camId,
    contentType: opts?.contentType || "image/jpeg",
    agentHost: opts?.agentHost,
    fps: opts?.fps,
  });
}

/** Obtener el ultimo frame si existe y no esta expirado */
export function getFrame(siteId: string, camId: number): StoredFrame | null {
  const key = frameKey(siteId, camId);
  const frame = frames.get(key);
  if (!frame) return null;
  if (Date.now() - frame.receivedAt > MAX_FRAME_AGE_MS) return null;
  return frame;
}

/** Obtener edad del frame en ms, o null si no existe */
export function getFrameAge(siteId: string, camId: number): number | null {
  const key = frameKey(siteId, camId);
  const frame = frames.get(key);
  if (!frame) return null;
  return Date.now() - frame.receivedAt;
}

/** Listar todos los frames activos (para diagnostico) */
export function listActiveFrames(): Array<{
  siteId: string;
  camId: number;
  ageMs: number;
  bytes: number;
  agentHost?: string;
}> {
  const now = Date.now();
  const result: Array<{
    siteId: string;
    camId: number;
    ageMs: number;
    bytes: number;
    agentHost?: string;
  }> = [];
  for (const frame of frames.values()) {
    const age = now - frame.receivedAt;
    if (age <= MAX_FRAME_AGE_MS * 2) {
      result.push({
        siteId: frame.siteId,
        camId: frame.camId,
        ageMs: age,
        bytes: frame.data.length,
        agentHost: frame.agentHost,
      });
    }
  }
  return result;
}

/** Eliminar frames de un sitio (ej: cuando el agente hace stop_stream) */
export function clearSiteFrames(siteId: string): void {
  for (const key of frames.keys()) {
    if (key.startsWith(`site:${siteId}:`)) {
      frames.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Viewer reference counting - evita detener el agente si otro operador
// aun tiene las camaras abiertas para el mismo sitio
// ---------------------------------------------------------------------------
const viewers = new Map<string, number>();

/** Registrar que un operador abrio las camaras de un sitio */
export function addViewer(siteId: string): number {
  const count = (viewers.get(siteId) || 0) + 1;
  viewers.set(siteId, count);
  return count;
}

/** Registrar que un operador cerro las camaras. Retorna viewers restantes. */
export function removeViewer(siteId: string): number {
  const count = Math.max((viewers.get(siteId) || 0) - 1, 0);
  if (count === 0) {
    viewers.delete(siteId);
  } else {
    viewers.set(siteId, count);
  }
  return count;
}

/** Viewers activos para un sitio */
export function getViewerCount(siteId: string): number {
  return viewers.get(siteId) || 0;
}

// ---------------------------------------------------------------------------
// Cola de comandos pendientes para agentes (polling HTTP)
// ---------------------------------------------------------------------------
interface PendingCommand {
  cmd: string;
  fps?: number;
  duration?: number;
  quality?: number;
  width?: number;
  cam_id?: number;
  ts: number;
}

const pendingCommands = new Map<string, PendingCommand[]>();

/** Encolar un comando para que el agente lo recoja via polling */
export function pushCommand(siteId: string, command: PendingCommand): void {
  if (!pendingCommands.has(siteId)) {
    pendingCommands.set(siteId, []);
  }
  pendingCommands.get(siteId)!.push(command);
}

/** El agente recoge y vacía sus comandos pendientes */
export function popCommands(siteId: string): PendingCommand[] {
  const cmds = pendingCommands.get(siteId) || [];
  pendingCommands.delete(siteId);
  return cmds;
}
