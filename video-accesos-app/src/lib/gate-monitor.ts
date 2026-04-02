/**
 * Gate Monitor - Monitoreo de estado de portones via comparacion de imagenes.
 *
 * Funciona en BACKGROUND sin necesidad de tener Video Web abierto.
 * Cada intervalSec (ej. 5 min) solicita un snapshot al agente via MQTT,
 * espera el frame, y compara contra la referencia.
 *
 * Soporta hasta 3 ZONAS (ROI) por camara, cada una con su propio umbral,
 * alias y consecutivo. Esto permite monitorear multiples portones o areas
 * dentro de una misma camara.
 *
 * Si N lecturas CONSECUTIVAS superan el umbral, genera alerta.
 *
 * Tecnica: histograma de luminancia en el ROI. Rapido (~2ms), sin GPU,
 * sin modelos de IA.
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

/** Zona individual de monitoreo dentro de una camara */
export interface GateZone {
  id: string;           // UUID unico
  roi: GateROI;
  alias: string;        // "Porton vehicular", "Puerta peatonal", etc.
  threshold: number;    // 0-1, default 0.3
  consecutiveThreshold: number; // lecturas consecutivas para alertar, default 4
  referenceHistogram: number[] | null;
  referenceImageB64: string | null;
  enabled: boolean;
}

/** Config por camara: agrupa hasta 3 zonas */
export interface GateConfig {
  siteId: string;
  camId: number;
  /** Nombre de la privada (para incluir en alertas) */
  privadaName?: string;
  /** Intervalo entre snapshots en segundos. Default 300 (5 min) */
  intervalSec: number;
  /** Hasta 3 zonas de monitoreo */
  zones: GateZone[];
  /** Numeros de telefono para notificacion WhatsApp (formato Twilio: 5216672639025) */
  notifyPhones: string[];
}

export type GateState = "closed" | "open" | "unknown" | "no-signal";

/** Estado en tiempo real de una zona */
export interface GateZoneStatus {
  zoneId: string;
  siteId: string;
  camId: number;
  alias: string;
  state: GateState;
  currentDiff: number;
  consecutiveOpen: number;
  consecutiveThreshold: number;
  lastCheckAt: number;
  alertSent: boolean;
  enabled: boolean;
}

/** Registro de cada comparacion (log de lecturas) */
export interface GateComparisonLog {
  id: string;
  siteId: string;
  camId: number;
  zoneId: string;
  alias: string;
  privadaName: string;
  threshold: number;
  difference: number;
  isOpen: boolean;
  consecutiveOpen: number;
  consecutiveThreshold: number;
  alertTriggered: boolean;
  createdAt: string;
}

export interface GateAlertRecord {
  id: string;
  siteId: string;
  camId: number;
  zoneId: string;
  alias: string;
  state: string;
  heldSeconds: number;
  difference: number;
  message: string;
  imageFile: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Persistencia (archivo JSON)
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "gate-monitors.json");
const ALERTS_FILE = path.join(DATA_DIR, "gate-alerts.json");
const COMPARISONS_FILE = path.join(DATA_DIR, "gate-comparisons.json");
const EVIDENCE_DIR = path.join(process.cwd(), "public", "static", "gate-alerts");
const MAX_ALERT_RECORDS = 500;
const MAX_COMPARISON_RECORDS = 2000;
const MAX_ZONES_PER_CAM = 3;

let configCache: Record<string, GateConfig> | null = null;

function camKey(siteId: string, camId: number): string {
  return `${siteId}:${camId}`;
}

function loadConfigs(): Record<string, GateConfig> {
  if (configCache) return configCache;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      // Migrar configs viejas (sin zones) al nuevo formato
      for (const key of Object.keys(raw)) {
        const c = raw[key];
        if (!c.zones && c.roi) {
          c.zones = [{
            id: crypto.randomUUID(),
            roi: c.roi,
            alias: c.alias || `Zona 1`,
            threshold: c.threshold || 0.3,
            consecutiveThreshold: c.consecutiveThreshold || c.debounceSec ? Math.max(2, Math.round((c.debounceSec || 60) / (c.intervalSec || 300))) : 4,
            referenceHistogram: c.referenceHistogram || null,
            referenceImageB64: c.referenceImageB64 || null,
            enabled: c.enabled ?? true,
          }];
          delete c.roi;
          delete c.alias;
          delete c.threshold;
          delete c.consecutiveThreshold;
          delete c.debounceSec;
          delete c.referenceHistogram;
          delete c.referenceImageB64;
          delete c.enabled;
        }
      }
      configCache = raw;
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

// ---------------------------------------------------------------------------
// Persistencia: Log de comparaciones
// ---------------------------------------------------------------------------

let comparisonCache: GateComparisonLog[] | null = null;

function loadComparisons(): GateComparisonLog[] {
  if (comparisonCache) return comparisonCache;
  try {
    if (fs.existsSync(COMPARISONS_FILE)) {
      comparisonCache = JSON.parse(fs.readFileSync(COMPARISONS_FILE, "utf-8"));
      return comparisonCache!;
    }
  } catch {}
  comparisonCache = [];
  return comparisonCache;
}

function saveComparisons(records: GateComparisonLog[]): void {
  if (records.length > MAX_COMPARISON_RECORDS) {
    records = records.slice(records.length - MAX_COMPARISON_RECORDS);
  }
  comparisonCache = records;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(COMPARISONS_FILE, JSON.stringify(records, null, 2));
  } catch (err) {
    logger.error(TAG, `Error al guardar comparisons: ${err}`);
  }
}

function pushComparison(entry: GateComparisonLog): void {
  const records = loadComparisons();
  records.push(entry);
  saveComparisons(records);
}

export function getComparisonLog(limit?: number, siteId?: string, zoneId?: string): GateComparisonLog[] {
  let records = loadComparisons();
  if (siteId) records = records.filter((r) => r.siteId === siteId);
  if (zoneId) records = records.filter((r) => r.zoneId === zoneId);
  const sorted = [...records].reverse();
  if (limit && limit > 0) return sorted.slice(0, limit);
  return sorted;
}

function resolveAlertsForZone(zoneId: string): void {
  const alerts = loadAlerts();
  let changed = false;
  for (let i = alerts.length - 1; i >= 0; i--) {
    if (alerts[i].zoneId === zoneId && alerts[i].resolvedAt === null) {
      alerts[i].resolvedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) saveAlerts(alerts);
}

export function getAlertHistory(limit?: number, siteId?: string): GateAlertRecord[] {
  let alerts = loadAlerts();
  if (siteId) alerts = alerts.filter((a) => a.siteId === siteId);
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

  const freq: Record<string, number> = {};
  for (const a of alerts) {
    freq[a.alias] = (freq[a.alias] || 0) + 1;
  }
  let mostFrequentGate: string | null = null;
  let maxCount = 0;
  for (const [alias, count] of Object.entries(freq)) {
    if (count > maxCount) { maxCount = count; mostFrequentGate = alias; }
  }

  const activeAlerts = alerts.filter((a) => a.resolvedAt === null).length;
  return { totalToday, avgHeldSeconds, mostFrequentGate, activeAlerts };
}

// ---------------------------------------------------------------------------
// API publica de configuracion
// ---------------------------------------------------------------------------

export function getGateConfig(siteId: string, camId: number): GateConfig | null {
  const configs = loadConfigs();
  return configs[camKey(siteId, camId)] || null;
}

export function setGateConfig(config: GateConfig): void {
  if (config.zones.length > MAX_ZONES_PER_CAM) {
    config.zones = config.zones.slice(0, MAX_ZONES_PER_CAM);
  }
  const configs = loadConfigs();
  configs[camKey(config.siteId, config.camId)] = config;
  saveConfigs(configs);
}

export function deleteGateConfig(siteId: string, camId: number): void {
  const configs = loadConfigs();
  const key = camKey(siteId, camId);
  // Limpiar estados de todas las zonas
  const cfg = configs[key];
  if (cfg) {
    for (const z of cfg.zones) {
      delete zoneStates[z.id];
    }
  }
  delete configs[key];
  saveConfigs(configs);
}

export function listGateConfigs(): GateConfig[] {
  const configs = loadConfigs();
  return Object.values(configs);
}

// ---------------------------------------------------------------------------
// Estado en memoria (por zona)
// ---------------------------------------------------------------------------

const zoneStates: Record<string, GateZoneStatus> = {};

export function getZoneStatus(zoneId: string): GateZoneStatus | null {
  return zoneStates[zoneId] || null;
}

export function listZoneStatuses(): GateZoneStatus[] {
  return Object.values(zoneStates);
}

// Backward-compat alias
export function listGateStatuses(): GateZoneStatus[] {
  return listZoneStatuses();
}

// ---------------------------------------------------------------------------
// Procesamiento de imagen con sharp
// ---------------------------------------------------------------------------

async function extractROIHistogram(jpegBuffer: Buffer, roi: GateROI): Promise<number[]> {
  const metadata = await sharp(jpegBuffer).metadata();
  const imgW = metadata.width || 640;
  const imgH = metadata.height || 480;

  const left = Math.round(roi.x * imgW);
  const top = Math.round(roi.y * imgH);
  const width = Math.max(1, Math.round(roi.width * imgW));
  const height = Math.max(1, Math.round(roi.height * imgH));

  const grayBuffer = await sharp(jpegBuffer)
    .extract({ left, top, width, height })
    .greyscale()
    .raw()
    .toBuffer();

  const histogram = new Array(256).fill(0);
  for (let i = 0; i < grayBuffer.length; i++) {
    histogram[grayBuffer[i]]++;
  }

  const total = grayBuffer.length;
  if (total > 0) {
    for (let i = 0; i < 256; i++) histogram[i] /= total;
  }
  return histogram;
}

function histogramDifference(h1: number[], h2: number[]): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += Math.sqrt(h1[i] * h2[i]);
  return 1 - Math.min(sum, 1);
}

// ---------------------------------------------------------------------------
// Captura de referencia (por zona)
// ---------------------------------------------------------------------------

export async function captureReference(
  siteId: string,
  camId: number,
  zoneId: string
): Promise<{ ok: boolean; error?: string }> {
  const config = getGateConfig(siteId, camId);
  if (!config) return { ok: false, error: "No hay configuracion para esta camara" };

  const zone = config.zones.find((z) => z.id === zoneId);
  if (!zone) return { ok: false, error: "Zona no encontrada" };

  const frame = getFrame(siteId, camId);
  if (!frame) return { ok: false, error: "No hay frame disponible de esta camara" };

  try {
    const histogram = await extractROIHistogram(frame.data, zone.roi);

    const metadata = await sharp(frame.data).metadata();
    const imgW = metadata.width || 640;
    const imgH = metadata.height || 480;
    const roiPx = {
      left: Math.round(zone.roi.x * imgW),
      top: Math.round(zone.roi.y * imgH),
      width: Math.max(1, Math.round(zone.roi.width * imgW)),
      height: Math.max(1, Math.round(zone.roi.height * imgH)),
    };

    const roiJpeg = await sharp(frame.data)
      .extract(roiPx)
      .resize(200)
      .jpeg({ quality: 70 })
      .toBuffer();

    zone.referenceHistogram = histogram;
    zone.referenceImageB64 = roiJpeg.toString("base64");
    setGateConfig(config);

    logger.info(TAG, `Referencia capturada: site=${siteId} cam=${camId} zone=${zone.alias}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(TAG, `Error capturando referencia: ${msg}`);
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Loop de monitoreo (background)
// ---------------------------------------------------------------------------

let monitorInterval: ReturnType<typeof setInterval> | null = null;

const SNAPSHOT_WAIT_MS = 15_000;
const SNAPSHOT_POLL_MS = 500;

async function requestSnapshot(siteId: string, camId: number): Promise<Buffer | null> {
  const existing = getFrame(siteId, camId);
  if (existing) return existing.data;

  const mqttOk = publishCommand(siteId, {
    cmd: "start_stream",
    cam_id: camId,
    fps: 1,
    duration: 3,
    quality: 55,
    width: 640,
    mode: "snapshot",
  });
  if (!mqttOk) {
    logger.warn(TAG, `No se pudo enviar snapshot request a site=${siteId}`);
    return null;
  }

  const deadline = Date.now() + SNAPSHOT_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, SNAPSHOT_POLL_MS));
    const frame = getFrame(siteId, camId);
    if (frame) return frame.data;
  }

  logger.warn(TAG, `Timeout esperando snapshot de site=${siteId} cam=${camId}`);
  return null;
}

/** Camaras ya solicitadas en este ciclo (evitar duplicar snapshots) */
const snapshotCache = new Map<string, Buffer | null>();

async function runMonitorCycle(): Promise<void> {
  const configs = loadConfigs();
  const now = Date.now();
  snapshotCache.clear();

  for (const config of Object.values(configs)) {
    if (!config.zones || config.zones.length === 0) continue;

    const ck = camKey(config.siteId, config.camId);

    // Respetar intervalo por camara (todas las zonas comparten el mismo snapshot)
    const anyZoneStatus = config.zones.map((z) => zoneStates[z.id]).find(Boolean);
    if (anyZoneStatus && (now - anyZoneStatus.lastCheckAt) < (config.intervalSec * 1000)) continue;

    // Un solo snapshot por camara
    let jpegData: Buffer | null = null;
    if (snapshotCache.has(ck)) {
      jpegData = snapshotCache.get(ck) || null;
    } else {
      jpegData = await requestSnapshot(config.siteId, config.camId);
      snapshotCache.set(ck, jpegData);
    }

    // Procesar cada zona
    for (const zone of config.zones) {
      if (!zone.enabled || !zone.referenceHistogram) continue;

      const status = zoneStates[zone.id];
      const threshold = zone.consecutiveThreshold || 4;

      if (!jpegData) {
        zoneStates[zone.id] = {
          zoneId: zone.id,
          siteId: config.siteId,
          camId: config.camId,
          alias: zone.alias,
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
        const currentHist = await extractROIHistogram(jpegData, zone.roi);
        const diff = histogramDifference(zone.referenceHistogram, currentHist);
        const isOpen = diff > zone.threshold;
        const prevConsecutive = status?.consecutiveOpen || 0;
        const prevState = status?.state || "unknown";
        const consecutiveOpen = isOpen ? prevConsecutive + 1 : 0;
        const newState: GateState = isOpen ? "open" : "closed";

        let alertSent = status?.alertSent || false;
        let alertTriggeredNow = false;
        if (consecutiveOpen >= threshold && !alertSent) {
          alertSent = true;
          alertTriggeredNow = true;
          const totalMin = Math.round((threshold * config.intervalSec) / 60);
          sendZoneAlert(config, zone, diff, totalMin * 60, jpegData);
        }

        if (newState === "closed" && prevState === "open") {
          if (alertSent) resolveAlertsForZone(zone.id);
          alertSent = false;
        }

        zoneStates[zone.id] = {
          zoneId: zone.id,
          siteId: config.siteId,
          camId: config.camId,
          alias: zone.alias,
          state: newState,
          currentDiff: Math.round(diff * 1000) / 1000,
          consecutiveOpen,
          consecutiveThreshold: threshold,
          lastCheckAt: Date.now(),
          alertSent,
          enabled: true,
        };

        // Registrar en log de comparaciones
        pushComparison({
          id: crypto.randomUUID(),
          siteId: config.siteId,
          camId: config.camId,
          zoneId: zone.id,
          alias: zone.alias,
          privadaName: config.privadaName || `Sitio ${config.siteId}`,
          threshold: zone.threshold,
          difference: Math.round(diff * 1000) / 1000,
          isOpen,
          consecutiveOpen,
          consecutiveThreshold: threshold,
          alertTriggered: alertTriggeredNow,
          createdAt: new Date().toISOString(),
        });

        logger.info(TAG, `${zone.alias}: ${newState} (diff=${diff.toFixed(3)}, ${consecutiveOpen}/${threshold})`);
      } catch (err) {
        logger.error(TAG, `Error en zona ${zone.alias}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Alertas: MQTT + HTTP directo al bot orquestador
// ---------------------------------------------------------------------------

/** URL del bot orquestador para enviar alertas */
const BOT_ALERT_URL = process.env.BOT_ALERT_URL || "http://localhost:5501/api/vision/alert";

function sendZoneAlert(config: GateConfig, zone: GateZone, diff: number, heldSec: number, jpegData?: Buffer): void {
  const minutes = Math.round(heldSec / 60);
  const timeLabel = minutes >= 1 ? `${minutes} min` : `${Math.round(heldSec)}s`;
  const privadaLabel = config.privadaName || `Sitio ${config.siteId}`;
  const message = `Porton "${zone.alias}" lleva ${timeLabel} abierto (diferencia: ${Math.round(diff * 100)}%) - ${privadaLabel}`;

  // Guardar evidencia fotografica
  let imageFile: string | null = null;
  let imageUrl: string | null = null;
  try {
    const frameData = jpegData || getFrame(config.siteId, config.camId)?.data;
    if (frameData) {
      if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      imageFile = `alert-${config.siteId}-${config.camId}-${zone.id.slice(0, 8)}-${ts}.jpg`;
      fs.writeFileSync(path.join(EVIDENCE_DIR, imageFile), frameData);
      imageUrl = `/static/gate-alerts/${imageFile}`;
    }
  } catch (err) {
    logger.error(TAG, `Error guardando evidencia: ${err instanceof Error ? err.message : err}`);
  }

  const alertPayload = {
    type: "gate_alert",
    site_id: config.siteId,
    cam_id: config.camId,
    zone_id: zone.id,
    alias: zone.alias,
    privada: privadaLabel,
    state: "open",
    held_seconds: Math.round(heldSec),
    difference: Math.round(diff * 100),
    message,
    image_url: imageUrl,
    notify_phones: config.notifyPhones || [],
    ts: new Date().toISOString(),
  };

  // Via 1: MQTT (para cualquier suscriptor)
  if (isMqttConnected()) publishAlert(config.siteId, alertPayload);

  // Via 2: HTTP POST directo al bot orquestador (WhatsApp con foto)
  if (config.notifyPhones && config.notifyPhones.length > 0) {
    notifyBotOrquestador(alertPayload).catch((err) => {
      logger.error(TAG, `Error notificando al bot: ${err instanceof Error ? err.message : err}`);
    });
  }

  // Persistir en historial
  pushAlertRecord({
    id: crypto.randomUUID(),
    siteId: config.siteId,
    camId: config.camId,
    zoneId: zone.id,
    alias: zone.alias,
    state: "open",
    heldSeconds: Math.round(heldSec),
    difference: Math.round(diff * 100),
    message,
    imageFile,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
  });

  logger.warn(TAG, `ALERTA: ${message} -> notificar a ${(config.notifyPhones || []).length} telefonos`);
}

/**
 * Enviar alerta al bot orquestador via HTTP POST.
 * El bot se encarga de enviar WhatsApp con foto a los telefonos indicados.
 */
async function notifyBotOrquestador(payload: Record<string, unknown>): Promise<void> {
  try {
    const res = await fetch(BOT_ALERT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      logger.info(TAG, `Bot notificado OK (${res.status})`);
    } else {
      logger.warn(TAG, `Bot respondio ${res.status}: ${await res.text().catch(() => "")}`);
    }
  } catch (err) {
    logger.error(TAG, `Error llamando bot: ${err instanceof Error ? err.message : err}`);
  }
}

// ---------------------------------------------------------------------------
// Iniciar / detener monitor
// ---------------------------------------------------------------------------

export function startGateMonitor(): void {
  if (monitorInterval) return;
  monitorInterval = setInterval(runMonitorCycle, 30_000);
  if (monitorInterval && typeof monitorInterval === "object" && "unref" in monitorInterval) {
    monitorInterval.unref();
  }
  logger.info(TAG, "Gate monitor iniciado (multi-zona)");
}

export function stopGateMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    logger.info(TAG, "Gate monitor detenido");
  }
}
