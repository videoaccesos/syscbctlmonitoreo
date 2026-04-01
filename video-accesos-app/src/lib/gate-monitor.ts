/**
 * Gate Monitor - Monitoreo de estado de portones via comparacion de imagenes.
 *
 * Compara una region de interes (ROI) de cada frame contra una imagen de
 * referencia ("porton cerrado"). Si la diferencia supera un umbral durante
 * un tiempo configurable, genera una alerta.
 *
 * Tecnica: histograma de luminancia en el ROI. Rapido (~2ms), sin GPU,
 * sin modelos de IA. Suficiente para detectar cambios grandes como
 * porton abierto vs cerrado.
 */

import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";
import { logger } from "@/lib/logger";
import { getFrame } from "@/lib/frame-store";
import { publishAlert, isMqttConnected } from "@/lib/mqtt-client";

const TAG = "gate-monitor";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface GateROI {
  x: number;      // 0-1 (porcentaje del ancho)
  y: number;      // 0-1 (porcentaje del alto)
  width: number;  // 0-1
  height: number; // 0-1
}

export interface GateConfig {
  siteId: string;
  camId: number;
  roi: GateROI;
  /** Histograma de referencia (porton cerrado) - 256 valores normalizados */
  referenceHistogram: number[] | null;
  /** Imagen de referencia en base64 (para mostrar en UI) */
  referenceImageB64: string | null;
  /** Umbral de diferencia (0-1). Default 0.3 = 30% de cambio */
  threshold: number;
  /** Segundos que el cambio debe persistir antes de alertar */
  debounceSec: number;
  /** Intervalo de captura en segundos */
  intervalSec: number;
  /** Activo o no */
  enabled: boolean;
  /** Alias para identificar el porton */
  alias: string;
}

export type GateState = "closed" | "open" | "unknown" | "no-signal";

export interface GateStatus {
  siteId: string;
  camId: number;
  alias: string;
  state: GateState;
  /** Diferencia actual vs referencia (0-1) */
  currentDiff: number;
  /** Desde cuando esta en el estado actual */
  stateChangedAt: number;
  /** Ultimo frame analizado */
  lastCheckAt: number;
  /** Alerta enviada para este evento */
  alertSent: boolean;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Persistencia (archivo JSON)
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "gate-monitors.json");

let configCache: Record<string, GateConfig> | null = null;

function gateKey(siteId: string, camId: number): string {
  return `${siteId}:${camId}`;
}

function loadConfigs(): Record<string, GateConfig> {
  if (configCache) return configCache;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      configCache = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      return configCache!;
    }
  } catch (err) {
    logger.error(TAG, `Error loading config: ${err}`);
  }
  configCache = {};
  return configCache;
}

function saveConfigs(data: Record<string, GateConfig>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
    configCache = data;
  } catch (err) {
    logger.error(TAG, `Error saving config: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// API publica de configuracion
// ---------------------------------------------------------------------------

export function getGateConfig(siteId: string, camId: number): GateConfig | null {
  const configs = loadConfigs();
  return configs[gateKey(siteId, camId)] || null;
}

export function setGateConfig(config: GateConfig): void {
  const configs = loadConfigs();
  configs[gateKey(config.siteId, config.camId)] = config;
  saveConfigs(configs);
}

export function deleteGateConfig(siteId: string, camId: number): void {
  const configs = loadConfigs();
  const key = gateKey(siteId, camId);
  delete configs[key];
  delete gateStates[key];
  saveConfigs(configs);
}

export function listGateConfigs(): GateConfig[] {
  const configs = loadConfigs();
  return Object.values(configs);
}

// ---------------------------------------------------------------------------
// Estado en memoria
// ---------------------------------------------------------------------------

const gateStates: Record<string, GateStatus> = {};

export function getGateStatus(siteId: string, camId: number): GateStatus | null {
  return gateStates[gateKey(siteId, camId)] || null;
}

export function listGateStatuses(): GateStatus[] {
  return Object.values(gateStates);
}

// ---------------------------------------------------------------------------
// Procesamiento de imagen con sharp
// ---------------------------------------------------------------------------

/**
 * Extrae el histograma de luminancia (256 bins) de una region ROI de un JPEG.
 * Retorna array normalizado (suma = 1).
 */
async function extractROIHistogram(
  jpegBuffer: Buffer,
  roi: GateROI
): Promise<number[]> {
  // Obtener dimensiones de la imagen
  const metadata = await sharp(jpegBuffer).metadata();
  const imgW = metadata.width || 640;
  const imgH = metadata.height || 480;

  // Calcular ROI en pixeles
  const left = Math.round(roi.x * imgW);
  const top = Math.round(roi.y * imgH);
  const width = Math.max(1, Math.round(roi.width * imgW));
  const height = Math.max(1, Math.round(roi.height * imgH));

  // Extraer ROI y convertir a escala de grises (1 canal, luminancia)
  const grayBuffer = await sharp(jpegBuffer)
    .extract({ left, top, width, height })
    .greyscale()
    .raw()
    .toBuffer();

  // Construir histograma (256 bins)
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < grayBuffer.length; i++) {
    histogram[grayBuffer[i]]++;
  }

  // Normalizar
  const total = grayBuffer.length;
  if (total > 0) {
    for (let i = 0; i < 256; i++) {
      histogram[i] /= total;
    }
  }

  return histogram;
}

/**
 * Calcula la diferencia entre dos histogramas normalizados.
 * Usa correlacion: 1 = identico, 0 = completamente diferente.
 * Retorna diferencia (0-1): 0 = igual, 1 = totalmente distinto.
 */
function histogramDifference(h1: number[], h2: number[]): number {
  // Correlacion de Bhattacharyya (robusto a cambios de iluminacion)
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += Math.sqrt(h1[i] * h2[i]);
  }
  // Bhattacharyya distance: -ln(sum). Normalizamos a 0-1.
  // sum=1 -> identicos (diff=0), sum=0 -> totalmente distintos (diff=1)
  return 1 - Math.min(sum, 1);
}

// ---------------------------------------------------------------------------
// Captura de referencia
// ---------------------------------------------------------------------------

/**
 * Captura el histograma de referencia ("porton cerrado") del frame actual.
 */
export async function captureReference(
  siteId: string,
  camId: number
): Promise<{ ok: boolean; error?: string }> {
  const config = getGateConfig(siteId, camId);
  if (!config) return { ok: false, error: "No hay configuracion para esta camara" };

  const frame = getFrame(siteId, camId);
  if (!frame) return { ok: false, error: "No hay frame disponible de esta camara" };

  try {
    const histogram = await extractROIHistogram(frame.data, config.roi);

    // Guardar thumbnail del ROI como referencia visual
    const metadata = await sharp(frame.data).metadata();
    const imgW = metadata.width || 640;
    const imgH = metadata.height || 480;
    const roiPx = {
      left: Math.round(config.roi.x * imgW),
      top: Math.round(config.roi.y * imgH),
      width: Math.max(1, Math.round(config.roi.width * imgW)),
      height: Math.max(1, Math.round(config.roi.height * imgH)),
    };

    const roiJpeg = await sharp(frame.data)
      .extract(roiPx)
      .resize(200) // thumbnail
      .jpeg({ quality: 70 })
      .toBuffer();

    config.referenceHistogram = histogram;
    config.referenceImageB64 = roiJpeg.toString("base64");
    setGateConfig(config);

    logger.info(TAG, `Referencia capturada: site=${siteId} cam=${camId}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(TAG, `Error capturando referencia: ${msg}`);
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Loop de monitoreo
// ---------------------------------------------------------------------------

let monitorInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Ejecuta un ciclo de verificacion para todos los monitores activos.
 */
async function runMonitorCycle(): Promise<void> {
  const configs = loadConfigs();
  const now = Date.now();

  for (const config of Object.values(configs)) {
    if (!config.enabled || !config.referenceHistogram) continue;

    const key = gateKey(config.siteId, config.camId);

    // Respetar intervalo por monitor
    const status = gateStates[key];
    if (status && (now - status.lastCheckAt) < (config.intervalSec * 1000)) continue;

    // Obtener frame actual
    const frame = getFrame(config.siteId, config.camId);
    if (!frame) {
      gateStates[key] = {
        siteId: config.siteId,
        camId: config.camId,
        alias: config.alias,
        state: "no-signal",
        currentDiff: 0,
        stateChangedAt: status?.stateChangedAt || now,
        lastCheckAt: now,
        alertSent: false,
        enabled: true,
      };
      continue;
    }

    try {
      const currentHistogram = await extractROIHistogram(frame.data, config.roi);
      const diff = histogramDifference(config.referenceHistogram, currentHistogram);
      const isOpen = diff > config.threshold;
      const prevState = status?.state || "unknown";
      const newState: GateState = isOpen ? "open" : "closed";

      // Detectar cambio de estado
      const stateChanged = prevState !== newState;
      const stateChangedAt = stateChanged ? now : (status?.stateChangedAt || now);
      const stateHeldSec = (now - stateChangedAt) / 1000;

      // Alerta si porton abierto por mas del debounce
      let alertSent = status?.alertSent || false;
      if (newState === "open" && stateHeldSec >= config.debounceSec && !alertSent) {
        alertSent = true;
        sendGateAlert(config, diff, stateHeldSec);
      }

      // Reset alerta cuando se cierra
      if (newState === "closed") {
        alertSent = false;
      }

      gateStates[key] = {
        siteId: config.siteId,
        camId: config.camId,
        alias: config.alias,
        state: newState,
        currentDiff: Math.round(diff * 1000) / 1000,
        stateChangedAt,
        lastCheckAt: now,
        alertSent,
        enabled: true,
      };

      if (stateChanged && prevState !== "unknown") {
        logger.info(TAG, `${config.alias} (site=${config.siteId} cam=${config.camId}): ${prevState} -> ${newState} (diff=${diff.toFixed(3)})`);
      }
    } catch (err) {
      logger.error(TAG, `Error en monitor ${key}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Alertas via MQTT al bot orquestador
// ---------------------------------------------------------------------------

function sendGateAlert(config: GateConfig, diff: number, heldSec: number): void {
  const minutes = Math.round(heldSec / 60);
  const timeLabel = minutes >= 1 ? `${minutes} min` : `${Math.round(heldSec)}s`;

  const alertPayload = {
    type: "gate_alert",
    site_id: config.siteId,
    cam_id: config.camId,
    alias: config.alias,
    state: "open",
    held_seconds: Math.round(heldSec),
    difference: Math.round(diff * 100),
    message: `Porton "${config.alias}" lleva ${timeLabel} abierto (diferencia: ${Math.round(diff * 100)}%)`,
    ts: new Date().toISOString(),
  };

  // Publicar via MQTT al topico de alertas
  if (isMqttConnected()) {
    publishAlert(config.siteId, alertPayload);
  }

  logger.warn(TAG, `ALERTA: ${alertPayload.message}`);
}

// ---------------------------------------------------------------------------
// Iniciar / detener monitor
// ---------------------------------------------------------------------------

export function startGateMonitor(): void {
  if (monitorInterval) return;
  monitorInterval = setInterval(runMonitorCycle, 2000); // check cada 2s
  if (monitorInterval && typeof monitorInterval === "object" && "unref" in monitorInterval) {
    monitorInterval.unref();
  }
  logger.info(TAG, "Gate monitor iniciado");
}

export function stopGateMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    logger.info(TAG, "Gate monitor detenido");
  }
}
