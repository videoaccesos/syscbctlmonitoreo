"use client";

import { useEffect, useState, useCallback, useRef, MouseEvent as ReactMouseEvent } from "react";
import {
  Shield,
  Clock,
  AlertTriangle,
  Activity,
  RefreshCw,
  Settings,
  Plus,
  Trash2,
  Save,
  Camera,
  Phone,
  X,
  FileText,
  Wifi,
  WifiOff,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GateAlertRecord {
  id: string;
  siteId: string;
  camId: number;
  alias: string;
  state: string;
  heldSeconds: number;
  difference: number;
  message: string;
  imageFile: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface AlertStats {
  totalToday: number;
  avgHeldSeconds: number;
  mostFrequentGate: string | null;
  activeAlerts: number;
}

interface PrivadaOption {
  id: number;
  descripcion: string;
}

interface CameraInfo {
  index: number;
  alias: string;
  available: boolean;
}

interface ROIPoint { x: number; y: number }

interface GateZone {
  id: string;
  roi: { points: ROIPoint[] };
  alias: string;
  threshold: number;
  consecutive_threshold: number;
  enabled: boolean;
}

interface GateConfigAPI {
  siteId: string;
  camId: number;
  privadaName?: string;
  intervalSec: number;
  zones: {
    id: string;
    roi: { points?: ROIPoint[]; x?: number; y?: number; width?: number; height?: number };
    alias: string;
    threshold: number;
    consecutiveThreshold: number;
    referenceHistogram: number[] | null;
    referencePixelsB64: string | null;
    referenceImageB64: string | null;
    enabled: boolean;
  }[];
  notifyPhones: string[];
}

interface AgentInfo {
  siteId: string;
  online: boolean;
  lastSeen: number;
  host?: string;
  privadaName?: string | null;
}

type DateFilter = "hoy" | "7dias" | "30dias";
type TabKey = "alertas" | "log" | "config";

const ZONE_COLORS = ["#ef4444", "#3b82f6", "#22c55e"];
const ZONE_NAMES = ["Rojo", "Azul", "Verde"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function isWithinFilter(createdAt: string, filter: DateFilter): boolean {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  switch (filter) {
    case "hoy": return now.toISOString().slice(0, 10) === createdAt.slice(0, 10);
    case "7dias": return diffDays <= 7;
    case "30dias": return diffDays <= 30;
  }
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MonitoreoPortonesPage() {
  const [tab, setTab] = useState<TabKey>("alertas");
  const [mqttOk, setMqttOk] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);

  // Poll agent statuses
  useEffect(() => {
    const fetchAgents = () => {
      fetch("/api/gate-monitor/agents").then(r => r.json()).then(data => {
        if (data.ok) {
          setMqttOk(data.mqttConnected);
          setAgents(data.agents || []);
        }
      }).catch(() => {});
    };
    fetchAgents();
    const iv = setInterval(fetchAgents, 15000);
    return () => clearInterval(iv);
  }, []);

  const onlineAgents = agents.filter(a => a.online);
  const offlineAgents = agents.filter(a => !a.online);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-7 w-7 text-blue-600" />
            Monitoreo de Portones
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Alertas, historial y configuracion de monitoreo
          </p>
        </div>

        {/* Agent status - compact summary */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
            mqttOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {mqttOk ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            MQTT {mqttOk ? "OK" : "OFF"}
          </span>
          {agents.length > 0 && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
              onlineAgents.length > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`} title={agents.map(a => `${a.privadaName || a.siteId}: ${a.online ? "online" : "offline"}`).join("\n")}>
              <span className={`w-2 h-2 rounded-full ${onlineAgents.length > 0 ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              {onlineAgents.length}/{agents.length} agentes en linea
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab("alertas")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === "alertas"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <AlertTriangle className="h-4 w-4 inline mr-1.5" />
          Alertas
        </button>
        <button
          onClick={() => setTab("log")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === "log"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <FileText className="h-4 w-4 inline mr-1.5" />
          Log de Lecturas
        </button>
        <button
          onClick={() => setTab("config")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === "config"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Settings className="h-4 w-4 inline mr-1.5" />
          Configuracion
        </button>
      </div>

      {tab === "alertas" && <AlertasTab />}
      {tab === "log" && <LogTab />}
      {tab === "config" && <ConfigTab />}
    </div>
  );
}

// ===========================================================================
// ALERTAS TAB
// ===========================================================================

function AlertasTab() {
  const [alerts, setAlerts] = useState<GateAlertRecord[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("hoy");
  const [lastUpdate, setLastUpdate] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/gate-monitor/alerts?limit=500");
      if (!res.ok) throw new Error("Error");
      const json = await res.json();
      setAlerts(json.alerts || []);
      setStats(json.stats || null);
      setLastUpdate(new Date().toLocaleTimeString("es-MX"));
    } catch (err) {
      console.error("Error fetching alerts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const filtered = alerts.filter((a) => isWithinFilter(a.createdAt, dateFilter));
  const filterLabels: Record<DateFilter, string> = { hoy: "Hoy", "7dias": "7 dias", "30dias": "30 dias" };

  return (
    <div className="space-y-4">
      {/* Summary */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Total alertas hoy" value={String(stats.totalToday)}
            icon={<AlertTriangle className="h-5 w-5 text-orange-500" />} color="orange" />
          <SummaryCard label="Promedio tiempo abierto" value={fmtDuration(stats.avgHeldSeconds)}
            icon={<Clock className="h-5 w-5 text-blue-500" />} color="blue" />
          <SummaryCard label="Porton mas frecuente" value={stats.mostFrequentGate || "N/A"}
            icon={<Activity className="h-5 w-5 text-purple-500" />} color="purple" />
          <SummaryCard label="Alertas activas" value={String(stats.activeAlerts)}
            icon={<Shield className="h-5 w-5 text-red-500" />} color={stats.activeAlerts > 0 ? "red" : "green"} />
        </div>
      )}

      {/* Filters & refresh */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Periodo:</span>
        {(Object.keys(filterLabels) as DateFilter[]).map((k) => (
          <button key={k} onClick={() => setDateFilter(k)}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              dateFilter === k ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}>{filterLabels[k]}</button>
        ))}
        <span className="ml-auto text-sm text-gray-400">{filtered.length} alerta{filtered.length !== 1 ? "s" : ""}</span>
        {lastUpdate && <span className="text-xs text-gray-400">| {lastUpdate}</span>}
        <button onClick={() => { setLoading(true); fetchData(); }}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha/Hora</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Porton</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Tiempo abierto</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Diferencia %</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Evidencia</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Resuelto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Cargando alertas...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No hay alertas en este periodo</td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDateTime(a.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{a.alias}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                      {a.state === "open" ? "Abierto" : a.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtDuration(a.heldSeconds)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{a.difference}%</td>
                  <td className="px-4 py-3 text-center">
                    {a.imageFile ? (
                      <a href={`/static/gate-alerts/${a.imageFile}`} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/static/gate-alerts/${a.imageFile}`} alt="Evidencia"
                          className="h-10 w-14 object-cover rounded border border-gray-200 hover:border-blue-400 transition inline-block" />
                      </a>
                    ) : <span className="text-xs text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.resolvedAt === null ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">ACTIVA</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">RESUELTA</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// LOG TAB
// ===========================================================================

interface ComparisonRecord {
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

function LogTab() {
  const [records, setRecords] = useState<ComparisonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("hoy");
  const [zoneFilter, setZoneFilter] = useState("");

  const fetchLog = useCallback(async () => {
    try {
      const res = await fetch("/api/gate-monitor/comparisons?limit=2000");
      if (!res.ok) throw new Error("Error");
      const json = await res.json();
      setRecords(json.records || []);
      setLastUpdate(new Date().toLocaleTimeString("es-MX"));
    } catch (err) {
      console.error("Error fetching log:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLog();
    const iv = setInterval(fetchLog, 15000);
    return () => clearInterval(iv);
  }, [fetchLog]);

  const filtered = records
    .filter((r) => isWithinFilter(r.createdAt, dateFilter))
    .filter((r) => !zoneFilter || r.alias === zoneFilter);

  const uniqueZones = Array.from(new Set(records.map((r) => r.alias)));
  const filterLabels: Record<DateFilter, string> = { hoy: "Hoy", "7dias": "7 dias", "30dias": "30 dias" };

  // Stats
  const totalReadings = filtered.length;
  const openReadings = filtered.filter((r) => r.isOpen).length;
  const alertsTriggered = filtered.filter((r) => r.alertTriggered).length;
  const avgDiff = totalReadings > 0
    ? (filtered.reduce((s, r) => s + r.difference, 0) / totalReadings).toFixed(3)
    : "0";

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Total lecturas" value={String(totalReadings)}
          icon={<FileText className="h-5 w-5 text-blue-500" />} color="blue" />
        <SummaryCard label="Lecturas abiertas" value={String(openReadings)}
          icon={<AlertTriangle className="h-5 w-5 text-orange-500" />} color="orange" />
        <SummaryCard label="Alertas disparadas" value={String(alertsTriggered)}
          icon={<Shield className="h-5 w-5 text-red-500" />} color={alertsTriggered > 0 ? "red" : "green"} />
        <SummaryCard label="Variacion promedio" value={avgDiff}
          icon={<Activity className="h-5 w-5 text-purple-500" />} color="purple" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Periodo:</span>
        {(Object.keys(filterLabels) as DateFilter[]).map((k) => (
          <button key={k} onClick={() => setDateFilter(k)}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              dateFilter === k ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}>{filterLabels[k]}</button>
        ))}
        <span className="text-gray-300 mx-1">|</span>
        <span className="text-sm font-medium text-gray-700">Zona:</span>
        <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
          <option value="">Todas</option>
          {uniqueZones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <span className="ml-auto text-sm text-gray-400">{filtered.length} lectura{filtered.length !== 1 ? "s" : ""}</span>
        {lastUpdate && <span className="text-xs text-gray-400">| {lastUpdate}</span>}
        <button onClick={() => { setLoading(true); fetchLog(); }}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha/Hora</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Privada</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Zona</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Umbral</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Variacion</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Consecutivo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Alerta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Cargando log...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No hay lecturas en este periodo</td></tr>
              ) : filtered.map((r) => {
                const overThreshold = r.difference > r.threshold;
                return (
                  <tr key={r.id} className={`transition-colors ${r.alertTriggered ? "bg-red-50" : overThreshold ? "bg-orange-50/50" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap text-xs">{fmtDateTime(r.createdAt)}</td>
                    <td className="px-4 py-2.5 text-gray-700 text-xs">{r.privadaName}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{r.alias}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500 text-xs">{r.threshold}</td>
                    <td className={`px-4 py-2.5 text-right font-mono text-xs font-bold ${overThreshold ? "text-red-600" : "text-green-600"}`}>
                      {r.difference}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.isOpen ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Abierto</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Normal</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs">
                      <span className={`font-mono ${r.consecutiveOpen > 0 ? "text-orange-600 font-bold" : "text-gray-400"}`}>
                        {r.consecutiveOpen}/{r.consecutiveThreshold}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.alertTriggered ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">ENVIADA</span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// CONFIG TAB
// ===========================================================================

function ConfigTab() {
  const [privadas, setPrivadas] = useState<PrivadaOption[]>([]);
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [selectedPrivada, setSelectedPrivada] = useState("");
  const [selectedPrivadaName, setSelectedPrivadaName] = useState("");
  const [selectedCam, setSelectedCam] = useState<number | null>(null);
  const [zones, setZones] = useState<GateZone[]>([]);
  const [phones, setPhones] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState("");
  const [intervalSec, setIntervalSec] = useState(300);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [draggingPoint, setDraggingPoint] = useState<{ zoneIdx: number; pointIdx: number } | null>(null);
  const [configs, setConfigs] = useState<GateConfigAPI[]>([]);
  const [capturingRef, setCapturingRef] = useState<string | null>(null);
  const [resettingZone, setResettingZone] = useState<string | null>(null);
  const [testingZone, setTestingZone] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    zoneId: string;
    difference: number;
    threshold: number;
    isOpen: boolean;
    refMean: number;
    curMean: number;
    refImageB64: string;
    curImageB64: string;
    refPixelsSample: number[];
    curPixelsSample: number[];
  } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // Load privadas
  useEffect(() => {
    fetch("/api/privadas/list").then(r => r.json()).then(data => {
      setPrivadas(Array.isArray(data) ? data : data.privadas || []);
    }).catch(() => {});
  }, []);

  // Load existing configs
  useEffect(() => {
    fetch("/api/gate-monitor/config").then(r => r.json()).then(data => {
      if (data.ok && data.configs) setConfigs(data.configs);
    }).catch(() => {});
  }, []);

  // Start stream & load cameras when privada changes
  useEffect(() => {
    if (!selectedPrivada) { setCameras([]); return; }

    // 1. Request stream FIRST so agent reports its channels
    fetch("/api/camera-frames/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: selectedPrivada, cmd: "start_stream", fps: 2, duration: 0, mode: "all" }),
    }).catch(() => {});

    // 2. Load cameras immediately (DB-configured ones)
    const loadCams = () =>
      fetch(`/api/camera-proxy/lookup?privada_id=${selectedPrivada}`)
        .then(r => r.json())
        .then(data => {
          if (data.found && data.cameras) setCameras(data.cameras);
          else setCameras([]);
        }).catch(() => setCameras([]));

    loadCams();

    // 3. Reload after 3s to pick up agent-reported cameras
    const t = setTimeout(loadCams, 3000);

    // 4. Stop stream on cleanup
    return () => {
      clearTimeout(t);
      fetch("/api/camera-frames/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: selectedPrivada, cmd: "stop_stream" }),
      }).catch(() => {});
    };
  }, [selectedPrivada]);

  // Load existing config when camera changes
  useEffect(() => {
    if (!selectedPrivada || selectedCam === null) {
      setZones([]); setPhones([]); setIntervalSec(300); setPreviewUrl("");
      return;
    }
    const existing = configs.find(c => c.siteId === selectedPrivada && c.camId === selectedCam);
    if (existing) {
      setZones((existing.zones || []).map(z => {
        // Convertir ROI rect legacy a puntos si es necesario
        let points: ROIPoint[];
        if (z.roi.points && z.roi.points.length === 4) {
          points = z.roi.points;
        } else {
          const rx = z.roi.x || 0.25, ry = z.roi.y || 0.25;
          const rw = z.roi.width || 0.5, rh = z.roi.height || 0.5;
          points = [
            { x: rx, y: ry },
            { x: rx + rw, y: ry },
            { x: rx + rw, y: ry + rh },
            { x: rx, y: ry + rh },
          ];
        }
        return {
          id: z.id,
          roi: { points },
          alias: z.alias,
          threshold: z.threshold,
          consecutive_threshold: z.consecutiveThreshold,
          enabled: z.enabled,
        };
      }));
      setPhones(existing.notifyPhones || []);
      setIntervalSec(existing.intervalSec || 300);
    } else {
      setZones([]); setPhones([]); setIntervalSec(300);
    }
  }, [selectedPrivada, selectedCam, configs]);

  // Refresh preview image
  useEffect(() => {
    if (!selectedPrivada || selectedCam === null) return;
    const update = () => {
      setPreviewUrl(`/api/camera-proxy?privada_id=${selectedPrivada}&cam=${selectedCam}&t=${Date.now()}`);
    };
    update();
    const iv = setInterval(update, 3000);
    return () => clearInterval(iv);
  }, [selectedPrivada, selectedCam]);

  const addZone = () => {
    if (zones.length >= 3) return;
    setZones([...zones, {
      id: crypto.randomUUID(),
      roi: {
        points: [
          { x: 0.25, y: 0.25 },
          { x: 0.75, y: 0.25 },
          { x: 0.75, y: 0.75 },
          { x: 0.25, y: 0.75 },
        ],
      },
      alias: `Zona ${zones.length + 1}`,
      threshold: 0.3,
      consecutive_threshold: 4,
      enabled: true,
    }]);
  };

  const removeZone = (idx: number) => {
    setZones(zones.filter((_, i) => i !== idx));
  };

  const updateZone = (idx: number, patch: Partial<GateZone>) => {
    setZones(zones.map((z, i) => i === idx ? { ...z, ...patch } : z));
  };

  const addPhone = () => {
    const clean = newPhone.replace(/\D/g, "");
    if (clean.length >= 10 && clean.length <= 15 && !phones.includes(clean)) {
      setPhones([...phones, clean]);
      setNewPhone("");
    }
  };

  const removePhone = (idx: number) => {
    setPhones(phones.filter((_, i) => i !== idx));
  };

  // Drag corner points of polygon zones
  const handlePointMouseDown = (e: ReactMouseEvent, zoneIdx: number, pointIdx: number) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingPoint({ zoneIdx, pointIdx });
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!draggingPoint || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const zone = zones[draggingPoint.zoneIdx];
    if (!zone) return;
    const newPoints = [...zone.roi.points];
    newPoints[draggingPoint.pointIdx] = { x: px, y: py };
    updateZone(draggingPoint.zoneIdx, { roi: { points: newPoints } });
  };

  const handleMouseUp = () => {
    setDraggingPoint(null);
  };

  const handleSave = async () => {
    if (!selectedPrivada || selectedCam === null || zones.length === 0) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/gate-monitor/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: selectedPrivada,
          cam_id: selectedCam,
          privada_name: selectedPrivadaName,
          interval_sec: intervalSec,
          notify_phones: phones,
          zones: zones.map(z => ({
            id: z.id,
            roi: z.roi,
            alias: z.alias,
            threshold: z.threshold,
            consecutive_threshold: z.consecutive_threshold,
            enabled: z.enabled,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMsg({ text: "Configuracion guardada", ok: true });
        // Refresh configs
        const r2 = await fetch("/api/gate-monitor/config");
        const d2 = await r2.json();
        if (d2.ok && d2.configs) setConfigs(d2.configs);
      } else {
        setMsg({ text: data.error || "Error al guardar", ok: false });
      }
    } catch {
      setMsg({ text: "Error de conexion", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPrivada || selectedCam === null) return;
    if (!confirm("Eliminar configuracion de monitoreo para esta camara?")) return;
    try {
      await fetch(`/api/gate-monitor/config?site_id=${selectedPrivada}&cam_id=${selectedCam}`, { method: "DELETE" });
      setZones([]); setPhones([]);
      setMsg({ text: "Configuracion eliminada", ok: true });
      const r2 = await fetch("/api/gate-monitor/config");
      const d2 = await r2.json();
      if (d2.ok && d2.configs) setConfigs(d2.configs);
    } catch {
      setMsg({ text: "Error al eliminar", ok: false });
    }
  };

  const handleCaptureRef = async (zoneId: string) => {
    if (!selectedPrivada || selectedCam === null) return;
    setCapturingRef(zoneId);
    setMsg({ text: "Solicitando frame al agente... puede tardar hasta 15s", ok: true });
    try {
      const res = await fetch(
        `/api/gate-monitor/reference?site_id=${selectedPrivada}&cam_id=${selectedCam}&zone_id=${zoneId}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.ok) {
        setMsg({ text: "Referencia capturada correctamente. El monitoreo esta activo.", ok: true });
        // Refresh configs to update UI
        const r2 = await fetch("/api/gate-monitor/config");
        const d2 = await r2.json();
        if (d2.ok && d2.configs) setConfigs(d2.configs);
      } else {
        setMsg({ text: data.error || "Error al capturar referencia", ok: false });
      }
    } catch {
      setMsg({ text: "Error de conexion al capturar referencia", ok: false });
    } finally {
      setCapturingRef(null);
    }
  };

  const handleResetZone = async (zoneId: string) => {
    setResettingZone(zoneId);
    try {
      const res = await fetch(`/api/gate-monitor/reset?zone_id=${zoneId}`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMsg({ text: "Contador reseteado. La proxima lectura reinicia la deteccion.", ok: true });
      } else {
        setMsg({ text: data.error || "Error al resetear", ok: false });
      }
    } catch {
      setMsg({ text: "Error de conexion", ok: false });
    } finally {
      setResettingZone(null);
    }
  };

  const handleTestComparison = async (zoneId: string) => {
    if (!selectedPrivada || selectedCam === null) return;
    setTestingZone(zoneId);
    setTestResult(null);
    setMsg({ text: "Capturando frame y comparando con referencia...", ok: true });
    try {
      const res = await fetch(
        `/api/gate-monitor/test?site_id=${selectedPrivada}&cam_id=${selectedCam}&zone_id=${zoneId}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.ok) {
        setTestResult({
          zoneId,
          difference: data.difference,
          threshold: data.threshold,
          isOpen: data.isOpen,
          refMean: data.refMean,
          curMean: data.curMean,
          refImageB64: data.refImageB64,
          curImageB64: data.curImageB64,
          refPixelsSample: data.refPixelsSample,
          curPixelsSample: data.curPixelsSample,
        });
        setMsg({
          text: `Diferencia: ${(data.difference * 100).toFixed(1)}% | Umbral: ${(data.threshold * 100).toFixed(0)}% | Estado: ${data.isOpen ? "ABIERTO" : "CERRADO"}`,
          ok: !data.isOpen,
        });
      } else {
        setMsg({ text: data.error || "Error en prueba", ok: false });
      }
    } catch {
      setMsg({ text: "Error de conexion", ok: false });
    } finally {
      setTestingZone(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Privada</label>
            <select value={selectedPrivada} onChange={(e) => {
              setSelectedPrivada(e.target.value);
              const p = privadas.find(p => String(p.id) === e.target.value);
              setSelectedPrivadaName(p?.descripcion || "");
              setSelectedCam(null);
            }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Seleccionar privada...</option>
              {privadas.map(p => (
                <option key={p.id} value={String(p.id)}>{p.descripcion}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Camara</label>
            <select value={selectedCam ?? ""} onChange={(e) => setSelectedCam(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" disabled={!selectedPrivada}>
              <option value="">Seleccionar camara...</option>
              {cameras.map(c => (
                <option key={c.index} value={c.index}>
                  Cam {c.index}{c.alias ? ` - ${c.alias}` : ""}{!c.available ? " (offline)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo (seg)</label>
            <select value={intervalSec} onChange={(e) => setIntervalSec(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" disabled={selectedCam === null}>
              <option value={60}>1 min</option>
              <option value={120}>2 min</option>
              <option value={300}>5 min</option>
              <option value={600}>10 min</option>
              <option value={900}>15 min</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating message */}
      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${msg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.ok ? <Activity className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {selectedPrivada && selectedCam !== null && (
        <>
          {/* Camera preview with zones */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Camera className="h-4 w-4" /> Vista previa - Dibuja zonas de monitoreo
              </h3>
              <div className="flex gap-2">
                {zones.map((z, i) => (
                  <span key={z.id} className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: ZONE_COLORS[i] }}>
                    {z.alias}
                  </span>
                ))}
              </div>
            </div>
            <div ref={previewRef} className="relative bg-black rounded-lg overflow-hidden select-none"
              style={{ aspectRatio: "16/9" }}
              onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" draggable={false} />
              )}
              {/* SVG overlay for polygon zones */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none"
                style={{ pointerEvents: "none" }}>
                {zones.map((z, i) => {
                  const pts = z.roi.points;
                  if (!pts || pts.length !== 4) return null;
                  const polyStr = pts.map(p => `${p.x * 100},${p.y * 100}`).join(" ");
                  return (
                    <polygon key={z.id} points={polyStr}
                      fill={`${ZONE_COLORS[i]}20`} stroke={ZONE_COLORS[i]} strokeWidth="0.4"
                      vectorEffect="non-scaling-stroke" />
                  );
                })}
              </svg>
              {/* Draggable corner points + labels */}
              {zones.map((z, i) => {
                const pts = z.roi.points;
                if (!pts || pts.length !== 4) return null;
                // Label position: midpoint of top edge
                const labelX = ((pts[0].x + pts[1].x) / 2) * 100;
                const labelY = Math.min(pts[0].y, pts[1].y) * 100;
                return (
                  <div key={z.id}>
                    <span className="absolute text-xs font-bold px-1 rounded text-white whitespace-nowrap"
                      style={{
                        background: ZONE_COLORS[i],
                        left: `${labelX}%`, top: `${labelY}%`,
                        transform: "translate(-50%, -120%)",
                        pointerEvents: "none",
                      }}>
                      {z.alias}
                    </span>
                    {pts.map((p, pi) => (
                      <div key={pi}
                        className="absolute w-4 h-4 rounded-full border-2 border-white cursor-grab active:cursor-grabbing"
                        style={{
                          left: `${p.x * 100}%`, top: `${p.y * 100}%`,
                          transform: "translate(-50%, -50%)",
                          background: ZONE_COLORS[i],
                          boxShadow: "0 0 4px rgba(0,0,0,0.5)",
                          zIndex: 10,
                        }}
                        onMouseDown={(e) => handlePointMouseDown(e, i, pi)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Arrastra las esquinas (circulos) para ajustar la zona trapezoidal al porton.
            </p>
          </div>

          {/* Zone configs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Zonas de monitoreo ({zones.length}/3)</h3>
              {zones.length < 3 && (
                <button onClick={addZone}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  <Plus className="h-3.5 w-3.5" /> Agregar zona
                </button>
              )}
            </div>

            {zones.length === 0 && (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
                <p className="text-gray-500 text-sm mb-3">No hay zonas configuradas</p>
                <button onClick={addZone}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                  <Plus className="h-4 w-4 inline mr-1" /> Crear primera zona
                </button>
              </div>
            )}

            {zones.map((z, i) => (
              <div key={z.id} className="bg-white rounded-xl border-2 p-4" style={{ borderColor: ZONE_COLORS[i] }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: ZONE_COLORS[i] }} />
                    <span className="text-sm font-medium">Zona {ZONE_NAMES[i]}</span>
                    {(() => {
                      const cfg = configs.find(c => c.siteId === selectedPrivada && c.camId === selectedCam);
                      const zCfg = cfg?.zones.find(zz => zz.id === z.id);
                      const hasRef = !!(zCfg?.referencePixelsB64);
                      return hasRef
                        ? <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Ref. guardada</span>
                        : <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">Sin referencia</span>;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleCaptureRef(z.id)} disabled={capturingRef === z.id}
                      className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 disabled:opacity-50">
                      <Camera className="h-3 w-3 inline mr-1" />
                      {capturingRef === z.id ? "Capturando..." : "Capturar referencia"}
                    </button>
                    <button onClick={() => handleTestComparison(z.id)} disabled={testingZone === z.id}
                      className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 disabled:opacity-50">
                      <Activity className="h-3 w-3 inline mr-1" />
                      {testingZone === z.id ? "Probando..." : "Probar comparacion"}
                    </button>
                    <button onClick={() => handleResetZone(z.id)} disabled={resettingZone === z.id}
                      className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50">
                      <RefreshCw className="h-3 w-3 inline mr-1" />
                      Reiniciar
                    </button>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={z.enabled} onChange={(e) => updateZone(i, { enabled: e.target.checked })}
                        className="rounded text-blue-600" />
                      Activa
                    </label>
                    <button onClick={() => removeZone(i)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Alias</label>
                    <input type="text" value={z.alias} onChange={(e) => updateZone(i, { alias: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm" placeholder="Porton vehicular" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Umbral (0-1)</label>
                    <input type="number" min={0.05} max={1} step={0.05} value={z.threshold}
                      onChange={(e) => updateZone(i, { threshold: parseFloat(e.target.value) || 0.3 })}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Lecturas consecutivas</label>
                    <input type="number" min={1} max={20} value={z.consecutive_threshold}
                      onChange={(e) => updateZone(i, { consecutive_threshold: parseInt(e.target.value) || 4 })}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Alerta despues de {z.consecutive_threshold} lecturas x {intervalSec / 60} min = {(z.consecutive_threshold * intervalSec / 60).toFixed(0)} min
                </p>

                {/* Resultado de prueba de comparacion */}
                {testResult && testResult.zoneId === z.id && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" /> Resultado de prueba
                    </h4>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center p-2 bg-white rounded border">
                        <p className="text-2xl font-bold" style={{ color: testResult.isOpen ? "#ef4444" : "#22c55e" }}>
                          {(testResult.difference * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">Diferencia</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded border">
                        <p className="text-2xl font-bold text-blue-600">{(testResult.threshold * 100).toFixed(0)}%</p>
                        <p className="text-xs text-gray-500">Umbral</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded border">
                        <p className={`text-2xl font-bold ${testResult.isOpen ? "text-red-600" : "text-green-600"}`}>
                          {testResult.isOpen ? "ABIERTO" : "CERRADO"}
                        </p>
                        <p className="text-xs text-gray-500">Estado</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Referencia (brillo prom: {testResult.refMean})</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`data:image/jpeg;base64,${testResult.refImageB64}`} alt="Ref" className="w-full rounded border" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Actual (brillo prom: {testResult.curMean})</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`data:image/jpeg;base64,${testResult.curImageB64}`} alt="Actual" className="w-full rounded border" />
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      <p>Pixeles ref: [{testResult.refPixelsSample.join(", ")}...]</p>
                      <p>Pixeles cur: [{testResult.curPixelsSample.join(", ")}...]</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Phone numbers */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-3">
              <Phone className="h-4 w-4" /> Telefonos de notificacion (WhatsApp)
            </h3>
            <div className="flex gap-2 mb-3">
              <input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                placeholder="5216672639025" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === "Enter" && addPhone()} />
              <button onClick={addPhone}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={newPhone.replace(/\D/g, "").length < 10}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {phones.length === 0 ? (
              <p className="text-xs text-gray-400">Sin telefonos configurados. Se usaran supervisores de la BD como respaldo.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {phones.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm">
                    {p}
                    <button onClick={() => removePhone(i)} className="text-blue-400 hover:text-blue-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">Formato Twilio: codigo pais + numero (ej. 5216672639025)</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div>
              {msg && (
                <span className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleDelete}
                className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition">
                <Trash2 className="h-4 w-4 inline mr-1" /> Eliminar
              </button>
              <button onClick={handleSave} disabled={saving || zones.length === 0}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5">
                <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar configuracion"}
              </button>
            </div>
          </div>

          {/* Existing configs summary */}
          {configs.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Configuraciones existentes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {configs.map(c => (
                  <button key={`${c.siteId}:${c.camId}`}
                    onClick={() => {
                      setSelectedPrivada(c.siteId);
                      setSelectedPrivadaName(c.privadaName || "");
                      setSelectedCam(c.camId);
                    }}
                    className={`text-left p-3 rounded-lg border transition text-sm ${
                      selectedPrivada === c.siteId && selectedCam === c.camId
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    }`}>
                    <p className="font-medium text-gray-900">{c.privadaName || `Sitio ${c.siteId}`}</p>
                    <p className="text-xs text-gray-500">Cam {c.camId} - {(c.zones || []).length} zona{(c.zones || []).length !== 1 ? "s" : ""}</p>
                    <p className="text-xs text-gray-400">{(c.notifyPhones || []).length} tel. | cada {(c.intervalSec || 300) / 60} min</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===========================================================================
// Summary Card (shared)
// ===========================================================================

function SummaryCard({ label, value, icon, color }: {
  label: string; value: string; icon: React.ReactNode; color: string;
}) {
  const bgMap: Record<string, string> = {
    orange: "bg-orange-50 border-orange-200", blue: "bg-blue-50 border-blue-200",
    purple: "bg-purple-50 border-purple-200", red: "bg-red-50 border-red-200",
    green: "bg-green-50 border-green-200",
  };
  return (
    <div className={`rounded-xl border p-4 ${bgMap[color] || "bg-gray-50 border-gray-200"}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
