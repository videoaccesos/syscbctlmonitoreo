/**
 * Gate Monitor - Monitoreo de estado de portones via comparacion de imagenes.
 *
 * Funciona en BACKGROUND sin necesidad de tener Video Web abierto.
 * Cada intervalSec (ej. 5 min) solicita un snapshot al agente via MQTT,
 * espera el frame, y compara contra la referencia.
 *
 * Si N lecturas CONSECUTIVAS superan el umbral de diferencia, genera alerta.
 * Esto evita falsos positivos por frames aislados (sombra, reflejo, etc).
 *
 * Tecnica: histograma de luminancia en el ROI. Rapido (~2ms), sin GPU,
 * sin modelos de IA. Suficiente para detectar cambios grandes como
 * porton abierto vs cerrado.
 */

import sharp from "sharp";
import crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { logger } from "@/lib/logger";
import { getFrame } from "@/lib/frame-store";
import { publishCommand, publishAlert, isMqttConnected } from "@/lib/mqtt-client";

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
  /** Lecturas consecutivas "open" necesarias para alertar. Default 4 */
  consecutiveThreshold: number;
  /** Intervalo entre snapshots en segundos. Default 300 (5 min) */
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
  /** Lecturas consecutivas con estado "open" */
  consecutiveOpen: number;
  /** Lecturas consecutivas necesarias para alertar */
  consecutiveThreshold: number;
  /** Ultimo frame analizado */
  lastCheckAt: number;
  /** Alerta enviada para este evento */
  alertSent: boolean;
  enabled: boolean;
}

export interface GateAlertRecord {
  id: string;
  siteId: string;
  camId: number;
  alias: string;
  state: string;
  heldSeconds: number;
  difference: number; // percentage 0-100
  message: string;
  imageFile: string | null; // filename in public/static/gate-alerts/
  resolvedAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Persistencia (archivo JSON)
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "gate-monitors.json");
const ALERTS_FILE = path.join(DATA_DIR, "gate-alerts.json");
const EVIDENCE_DIR = path.join(process.cwd(), "public", "static", "gate-alerts");
const MAX_ALERT_RECORDS = 500;

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
// Persistencia de alertas (archivo JSON)
// ---------------------------------------------------------------------------

let alertCache: GateAlertRecord[] | null = null;

function loadAlerts(): GateAlertRecord[] {
  if (alertCache) return alertCache;
  try {
    if (fs.existsSync(ALERTS_FILE)) {
      alertCache = JSON.parse(fs.readFileSync(ALERTS_FILE, "utf-8"));
      return alertCache!;
    }
  } catch (err) {
    logger.error(TAG, `Error loading alerts: ${err}`);
  }
  alertCache = [];
  return alertCache;
}

function saveAlerts(data: GateAlertRecord[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    // Prune to max records keeping newest
    if (data.length > MAX_ALERT_RECORDS) {
      data = data.slice(data.length - MAX_ALERT_RECORDS);
    }
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(data, null, 2));
    alertCache = data;
  } catch (err) {
    logger.error(TAG, `Error saving alerts: ${err}`);
  }
}

function pushAlertRecord(record: GateAlertRecord): void {
  const alerts = loadAlerts();
  alerts.push(record);
  saveAlerts(alerts);
}

function resolveAlertForGate(siteId: string, camId: number): void {
  const alerts = loadAlerts();
  let changed = false;
  for (let i = alerts.length - 1; i >= 0; i--) {
    if (alerts[i].siteId === siteId && alerts[i].camId === camId && alerts[i].resolvedAt === null) {
      alerts[i].resolvedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) saveAlerts(alerts);
}

export function getAlertHistory(limit?: number): GateAlertRecord[] {
  const alerts = loadAlerts();
  // Return newest first
  const sorted = [...alerts].reverse();
  if (limit && limit > 0) return sorted.slice(0, limit);
  return sorted;
}

export function getAlertStats(): {
  totalToday: number;
  avgHeldSeconds: number;
  mostFrequentGate: string | null;
  activeAlerts: number;
} {
  const alerts = loadAlerts();
  const todayStr = new Date().toISOString().slice(0, 10);

  const todayAlerts = alerts.filter((a) => a.createdAt.startsWith(todayStr));
  const totalToday = todayAlerts.length;

  const avgHeldSeconds =
    todayAlerts.length > 0
      ? Math.round(todayAlerts.reduce((sum, a) => sum + a.heldSeconds, 0) / todayAlerts.length)
      : 0;

  // Most frequent gate (all time from loaded records)
  const freq: Record<string, number> = {};
  for (const a of alerts) {
    freq[a.alias] = (freq[a.alias] || 0) + 1;
  }
  let mostFrequentGate: string | null = null;
  let maxCount = 0;
  for (const [alias, count] of Object.entries(freq)) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentGate = alias;
    }
  }

  const activeAlerts = alerts.filter((a) => a.resolvedAt === null).length;

  return { totalToday, avgHeldSeconds, mostFrequentGate, activeAlerts };
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
// Loop de monitoreo (background, sin necesidad de Video Web abierto)
// ---------------------------------------------------------------------------

let monitorInterval: ReturnType<typeof setInterval> | null = null;

/** Timeout maximo (ms) para esperar un frame despues de pedir snapshot */
const SNAPSHOT_WAIT_MS = 15_000;
/** Intervalo de polling mientras espera el frame */
const SNAPSHOT_POLL_MS = 500;

/**
 * Solicita un snapshot al agente via MQTT y espera a que llegue al frame-store.
 * Retorna el buffer JPEG o null si no llega a tiempo.
 */
async function requestSnapshot(siteId: string, camId: number): Promise<Buffer | null> {
  // Primero verificar si ya hay un frame reciente (< 30s) por si Video Web esta abierto
  const existing = getFrame(siteId, camId);
  if (existing) return existing.data;

  // Solicitar snapshot al agente via MQTT
  const snapshotCmd = {
    cmd: "start_stream",
    cam_id: camId,
    fps: 1,
    duration: 3, // solo 3 segundos, un par de frames
    quality: 55,
    width: 640,
    mode: "snapshot",
  };

  const mqttOk = publishCommand(siteId, snapshotCmd);
  if (!mqttOk) {
    logger.warn(TAG, `No se pudo enviar snapshot request a site=${siteId}`);
    return null;
  }

  // Esperar a que el frame llegue al store
  const deadline = Date.now() + SNAPSHOT_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, SNAPSHOT_POLL_MS));
    const frame = getFrame(siteId, camId);
    if (frame) return frame.data;
  }

  logger.warn(TAG, `Timeout esperando snapshot de site=${siteId} cam=${camId}`);
  return null;
}

/**
 * Ejecuta un ciclo de verificacion para todos los monitores activos.
 * Pide snapshot al agente, analiza, y cuenta lecturas consecutivas.
 */
async function runMonitorCycle(): Promise<void> {
  const configs = loadConfigs();
  const now = Date.now();

  for (const config of Object.values(configs)) {
    if (!config.enabled || !config.referenceHistogram) continue;

    const key = gateKey(config.siteId, config.camId);
    const threshold = config.consecutiveThreshold || 4;

    // Respetar intervalo por monitor
    const status = gateStates[key];
    if (status && (now - status.lastCheckAt) < (config.intervalSec * 1000)) continue;

    // Solicitar snapshot al agente (background, no requiere Video Web)
    const jpegData = await requestSnapshot(config.siteId, config.camId);
    if (!jpegData) {
      gateStates[key] = {
        siteId: config.siteId,
        camId: config.camId,
        alias: config.alias,
        state: "no-signal",
        currentDiff: 0,
        consecutiveOpen: 0,
        consecutiveThreshold: threshold,
        lastCheckAt: Date.now(),
        alertSent: status?.alertSent || false,
        enabled: true,
      };
      continue;
    }

    try {
      const currentHistogram = await extractROIHistogram(jpegData, config.roi);
      const diff = histogramDifference(config.referenceHistogram, currentHistogram);
      const isOpen = diff > config.threshold;
      const prevConsecutive = status?.consecutiveOpen || 0;
      const prevState = status?.state || "unknown";

      // Contar lecturas consecutivas
      const consecutiveOpen = isOpen ? prevConsecutive + 1 : 0;
      const newState: GateState = isOpen ? "open" : "closed";

      // Alerta si N lecturas consecutivas superan umbral
      let alertSent = status?.alertSent || false;
      if (consecutiveOpen >= threshold && !alertSent) {
        alertSent = true;
        const totalMinutes = Math.round((threshold * config.intervalSec) / 60);
        sendGateAlert(config, diff, totalMinutes * 60, jpegData);
      }

      // Reset cuando se cierra
      if (newState === "closed" && prevState === "open") {
        if (alertSent) {
          resolveAlertForGate(config.siteId, config.camId);
        }
        alertSent = false;
      }

      gateStates[key] = {
        siteId: config.siteId,
        camId: config.camId,
        alias: config.alias,
        state: newState,
        currentDiff: Math.round(diff * 1000) / 1000,
        consecutiveOpen,
        consecutiveThreshold: threshold,
        lastCheckAt: Date.now(),
        alertSent,
        enabled: true,
      };

      logger.info(TAG, `${config.alias}: ${newState} (diff=${diff.toFixed(3)}, consecutivo=${consecutiveOpen}/${threshold})`);
    } catch (err) {
      logger.error(TAG, `Error en monitor ${key}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Alertas via MQTT al bot orquestador
// ---------------------------------------------------------------------------

function sendGateAlert(config: GateConfig, diff: number, heldSec: number, jpegData?: Buffer): void {
  const minutes = Math.round(heldSec / 60);
  const timeLabel = minutes >= 1 ? `${minutes} min` : `${Math.round(heldSec)}s`;

  const message = `Porton "${config.alias}" lleva ${timeLabel} abierto (diferencia: ${Math.round(diff * 100)}%)`;

  // Guardar evidencia fotografica
  let imageFile: string | null = null;
  let imageUrl: string | null = null;
  try {
    const frameData = jpegData || getFrame(config.siteId, config.camId)?.data;
    if (frameData) {
      if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      imageFile = `alert-${config.siteId}-${config.camId}-${ts}.jpg`;
      fs.writeFileSync(path.join(EVIDENCE_DIR, imageFile), frameData);
      imageUrl = `/static/gate-alerts/${imageFile}`;
      logger.info(TAG, `Evidencia guardada: ${imageFile}`);
    }
  } catch (err) {
    logger.error(TAG, `Error guardando evidencia: ${err instanceof Error ? err.message : err}`);
  }

  const alertPayload = {
    type: "gate_alert",
    site_id: config.siteId,
    cam_id: config.camId,
    alias: config.alias,
    state: "open",
    held_seconds: Math.round(heldSec),
    difference: Math.round(diff * 100),
    message,
    image_url: imageUrl,
    ts: new Date().toISOString(),
  };

  // Publicar via MQTT al topico de alertas
  if (isMqttConnected()) {
    publishAlert(config.siteId, alertPayload);
  }

  // Persist alert to history
  const record: GateAlertRecord = {
    id: crypto.randomUUID(),
    siteId: config.siteId,
    camId: config.camId,
    alias: config.alias,
    state: "open",
    heldSeconds: Math.round(heldSec),
    difference: Math.round(diff * 100),
    message,
    imageFile,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
  };
  pushAlertRecord(record);

  logger.warn(TAG, `ALERTA: ${message}`);
}

// ---------------------------------------------------------------------------
// Iniciar / detener monitor
// ---------------------------------------------------------------------------

export function startGateMonitor(): void {
  if (monitorInterval) return;
  monitorInterval = setInterval(runMonitorCycle, 30_000); // check cada 30s, cada monitor respeta su propio intervalSec
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
