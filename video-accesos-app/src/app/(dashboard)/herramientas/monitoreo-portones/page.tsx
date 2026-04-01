"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  Clock,
  AlertTriangle,
  Activity,
  RefreshCw,
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

type DateFilter = "hoy" | "7dias" | "30dias";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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
    case "hoy":
      return now.toISOString().slice(0, 10) === createdAt.slice(0, 10);
    case "7dias":
      return diffDays <= 7;
    case "30dias":
      return diffDays <= 30;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MonitoreoPortonesPage() {
  const [alerts, setAlerts] = useState<GateAlertRecord[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("hoy");
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/gate-monitor/alerts?limit=500");
      if (!res.ok) throw new Error("Error al cargar alertas");
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
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredAlerts = alerts.filter((a) => isWithinFilter(a.createdAt, dateFilter));

  const filterLabels: Record<DateFilter, string> = {
    hoy: "Hoy",
    "7dias": "7 dias",
    "30dias": "30 dias",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-7 w-7 text-blue-600" />
            Monitoreo de Portones
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Historial de alertas y estado de portones monitoreados
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              Actualizado: {lastUpdate}
            </span>
          )}
          <button
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Total alertas hoy"
            value={String(stats.totalToday)}
            icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
            color="orange"
          />
          <SummaryCard
            label="Promedio tiempo abierto"
            value={fmtDuration(stats.avgHeldSeconds)}
            icon={<Clock className="h-5 w-5 text-blue-500" />}
            color="blue"
          />
          <SummaryCard
            label="Porton mas frecuente"
            value={stats.mostFrequentGate || "N/A"}
            icon={<Activity className="h-5 w-5 text-purple-500" />}
            color="purple"
          />
          <SummaryCard
            label="Alertas activas"
            value={String(stats.activeAlerts)}
            icon={<Shield className="h-5 w-5 text-red-500" />}
            color={stats.activeAlerts > 0 ? "red" : "green"}
          />
        </div>
      )}

      {/* Date Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Periodo:</span>
        {(Object.keys(filterLabels) as DateFilter[]).map((key) => (
          <button
            key={key}
            onClick={() => setDateFilter(key)}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              dateFilter === key
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {filterLabels[key]}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-400">
          {filteredAlerts.length} alerta{filteredAlerts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Alert Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Fecha/Hora
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Porton
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Estado
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  Tiempo abierto
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  Diferencia %
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  Evidencia
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  Resuelto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    Cargando alertas...
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No hay alertas en este periodo
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {fmtDateTime(alert.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {alert.alias}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        {alert.state === "open" ? "Abierto" : alert.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {fmtDuration(alert.heldSeconds)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {alert.difference}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      {alert.imageFile ? (
                        <a
                          href={`/static/gate-alerts/${alert.imageFile}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/static/gate-alerts/${alert.imageFile}`}
                            alt="Evidencia"
                            className="h-10 w-14 object-cover rounded border border-gray-200 hover:border-blue-400 transition"
                          />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {alert.resolvedAt === null ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          ACTIVA
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          RESUELTA
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  const bgMap: Record<string, string> = {
    orange: "bg-orange-50 border-orange-200",
    blue: "bg-blue-50 border-blue-200",
    purple: "bg-purple-50 border-purple-200",
    red: "bg-red-50 border-red-200",
    green: "bg-green-50 border-green-200",
  };

  return (
    <div
      className={`rounded-xl border p-4 ${bgMap[color] || "bg-gray-50 border-gray-200"}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
