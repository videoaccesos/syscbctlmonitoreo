"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  Printer,
  Download,
  Clock,
  AlertTriangle,
} from "lucide-react";

/* ---------- tipos ---------- */
type ReporteData = {
  fechaIni: string;
  fechaFin: string;
  vencidas: Array<Record<string, unknown>>;
  porVencer: Array<Record<string, unknown>>;
  concentrado: Array<Record<string, unknown>>;
  totalRegistros: number;
};

type TabKey = "porVencer" | "vencidas" | "concentrado";

const TAB_LABELS: Record<TabKey, string> = {
  porVencer: "Por Vencer",
  vencidas: "Vencidas",
  concentrado: "Concentrado por Privada",
};

/* ================================================================ */

export default function TarjetasVencimientosPage() {
  const [fechaIni, setFechaIni] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReporteData | null>(null);
  const [tab, setTab] = useState<TabKey>("porVencer");
  const [descargando, setDescargando] = useState(false);

  const handleConsultar = async () => {
    if (!fechaIni || !fechaFin) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ fechaIni, fechaFin, format: "json" });
      const res = await fetch(`/api/procesos/asignacion-tarjetas/reporte-vencimientos?${params}`);
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Error al consultar reporte");
        return;
      }
      const json = await res.json();
      setData(json);
      setTab("porVencer");
    } catch {
      alert("Error de conexión al consultar reporte");
    } finally {
      setLoading(false);
    }
  };

  const handleDescargarExcel = async () => {
    if (!data) return;
    setDescargando(true);
    try {
      const params = new URLSearchParams({
        fechaIni: data.fechaIni,
        fechaFin: data.fechaFin,
        format: "excel",
      });
      const res = await fetch(`/api/procesos/asignacion-tarjetas/reporte-vencimientos?${params}`);
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Error al descargar Excel");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Vencimientos_${data.fechaIni}_${data.fechaFin}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Error de conexión al descargar Excel");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-7 w-7 text-orange-600" />
            Tarjetas por Vencer / Vencidas
          </h1>
          <p className="text-sm text-gray-700 mt-1">
            Consulta tarjetas que vencen o ya vencieron en un periodo para gestionar renovaciones
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 print:hidden">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vencimiento Desde
            </label>
            <input
              type="date"
              value={fechaIni}
              onChange={(e) => setFechaIni(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vencimiento Hasta
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={handleConsultar}
            disabled={loading || !fechaIni || !fechaFin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Consultando..." : "Consultar"}
          </button>
          {data && (
            <>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
              <button
                onClick={handleDescargarExcel}
                disabled={descargando}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
              >
                {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {descargando ? "Descargando..." : "Descargar Excel"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Resumen */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total en periodo</p>
            <p className="text-2xl font-bold text-gray-900">{data.totalRegistros}</p>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <p className="text-sm text-red-600">Ya vencidas</p>
            <p className="text-2xl font-bold text-red-700">{data.vencidas.length}</p>
          </div>
          <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
            <p className="text-sm text-amber-600">Por vencer</p>
            <p className="text-2xl font-bold text-amber-700">{data.porVencer.length}</p>
          </div>
        </div>
      )}

      {/* Reporte */}
      {data && (
        <>
          <div className="hidden print:block text-center mb-4">
            <h2 className="text-xl font-bold">REPORTE DE TARJETAS POR VENCER / VENCIDAS</h2>
            <p className="text-sm">Del {data.fechaIni} al {data.fechaFin}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 print:border-0 print:rounded-none">
            <div className="border-b border-gray-200 px-2 print:hidden">
              <div className="flex gap-0">
                {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => {
                  const count = key === "concentrado"
                    ? data.concentrado.length
                    : data[key].length;
                  return (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                        tab === key
                          ? "border-orange-600 text-orange-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {TAB_LABELS[key]}
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden print:block px-4 pt-3 pb-1">
              <h3 className="text-lg font-bold">{TAB_LABELS[tab]}</h3>
            </div>

            <div className="p-2">
              {tab !== "concentrado" ? (
                <TablaVencimientos rows={data[tab]} titulo={TAB_LABELS[tab]} esVencidas={tab === "vencidas"} />
              ) : (
                <TablaConcentrado rows={data.concentrado} />
              )}
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Selecciona un rango de fechas de vencimiento y da click en Consultar</p>
        </div>
      )}
    </div>
  );
}

/* ==================== Tabla de vencimientos ==================== */

function TablaVencimientos({
  rows,
  titulo,
  esVencidas,
}: {
  rows: Array<Record<string, unknown>>;
  titulo: string;
  esVencidas: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No hay tarjetas {titulo.toLowerCase()} en este periodo
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-700 text-white print:bg-gray-800">
            <th className="text-center px-3 py-2 font-medium w-8">No.</th>
            <th className="text-left px-3 py-2 font-medium">Folio Contrato</th>
            <th className="text-left px-3 py-2 font-medium">F. Asignación</th>
            <th className="text-left px-3 py-2 font-medium">Vencimiento</th>
            <th className="text-center px-3 py-2 font-medium">Días</th>
            <th className="text-left px-3 py-2 font-medium">Privada</th>
            <th className="text-left px-3 py-2 font-medium">Casa</th>
            <th className="text-left px-3 py-2 font-medium">Residente</th>
            <th className="text-left px-3 py-2 font-medium">Teléfono</th>
            <th className="text-center px-3 py-2 font-medium">Tipo</th>
            <th className="text-left px-3 py-2 font-medium">Lectura</th>
            <th className="text-left px-3 py-2 font-medium">No. Serie</th>
            <th className="text-left px-3 py-2 font-medium">Lectura EPC</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const dias = Number(row.dias_restantes);
            let diasColor = "text-green-700";
            if (dias < 0) diasColor = "text-red-700 font-bold";
            else if (dias <= 30) diasColor = "text-amber-600 font-bold";
            else if (dias <= 60) diasColor = "text-yellow-600";

            return (
              <tr
                key={i}
                className={`border-b border-gray-200 ${
                  esVencidas
                    ? "bg-red-50 hover:bg-red-100"
                    : i % 2 === 0
                    ? "bg-white hover:bg-blue-50"
                    : "bg-gray-50 hover:bg-blue-50"
                } print:hover:bg-transparent`}
              >
                <td className="text-center px-3 py-1.5 text-gray-500 text-xs font-mono">
                  {String(row.asignacion_id || i + 1)}
                </td>
                <td className="px-3 py-1.5 text-gray-700">{String(row.folio_contrato || "-")}</td>
                <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{String(row.fecha_asignacion || "-")}</td>
                <td className="px-3 py-1.5 text-gray-900 font-medium whitespace-nowrap">{String(row.fecha_vencimiento || "-")}</td>
                <td className={`px-3 py-1.5 text-center ${diasColor}`}>
                  {dias < 0 ? `${Math.abs(dias)}d atrás` : `${dias}d`}
                </td>
                <td className="px-3 py-1.5 text-gray-700">{String(row.privada || "-")}</td>
                <td className="px-3 py-1.5 text-gray-700">{String(row.nro_casa || "")}</td>
                <td className="px-3 py-1.5 text-gray-900 font-medium">{String(row.residente || "-")}</td>
                <td className="px-3 py-1.5 text-gray-600">{String(row.telefono || "-")}</td>
                <td className="px-3 py-1.5 text-center">
                  <span className={`text-xs font-medium ${
                    Number(row.tipo_id) === 2 ? "text-purple-700" : "text-teal-700"
                  }`}>
                    {Number(row.tipo_id) === 2 ? "VEH" : "PEA"}
                  </span>
                </td>
                <td className="px-3 py-1.5 font-mono text-xs text-gray-600">{String(row.lectura || "-")}</td>
                <td className="px-3 py-1.5 font-mono text-xs text-gray-600">{String(row.numero_serie || "-")}</td>
                <td className="px-3 py-1.5 font-mono text-xs text-gray-600">{String(row.lectura_epc || "-")}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-700 text-white print:bg-gray-800">
            <td colSpan={13} className="px-3 py-2 text-center font-bold">
              Total: {rows.length} tarjeta(s)
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ==================== Tabla concentrado ==================== */

function TablaConcentrado({
  rows,
}: {
  rows: Array<Record<string, unknown>>;
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No hay datos de concentrado en este periodo
      </div>
    );
  }

  let totalVencidas = 0;
  let totalPorVencer = 0;
  let totalGeneral = 0;
  for (const row of rows) {
    totalVencidas += Number(row.vencidas) || 0;
    totalPorVencer += Number(row.porVencer) || 0;
    totalGeneral += Number(row.total) || 0;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-700 text-white print:bg-gray-800">
            <th className="text-left px-3 py-2 font-medium">Privada</th>
            <th className="text-right px-3 py-2 font-medium">Vencidas</th>
            <th className="text-right px-3 py-2 font-medium">Por Vencer</th>
            <th className="text-right px-3 py-2 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-gray-200 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
            >
              <td className="px-3 py-2 font-medium text-gray-900">{String(row.privada)}</td>
              <td className="px-3 py-2 text-right text-red-600 font-medium">{Number(row.vencidas) || 0}</td>
              <td className="px-3 py-2 text-right text-amber-600 font-medium">{Number(row.porVencer) || 0}</td>
              <td className="px-3 py-2 text-right font-bold text-blue-700">{Number(row.total) || 0}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-700 text-white print:bg-gray-800">
            <td className="px-3 py-2 font-bold">TOTAL GENERAL</td>
            <td className="px-3 py-2 text-right font-bold">{totalVencidas}</td>
            <td className="px-3 py-2 text-right font-bold">{totalPorVencer}</td>
            <td className="px-3 py-2 text-right text-lg font-bold">{totalGeneral}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
