"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  Printer,
  Download,
  FileSpreadsheet,
} from "lucide-react";

/* ---------- tipos ---------- */
type ReporteData = {
  fechaIni: string;
  fechaFin: string;
  vendidas: Array<Record<string, unknown>>;
  seguro: Array<Record<string, unknown>>;
  canceladas: Array<Record<string, unknown>>;
  concentrado: Array<Record<string, unknown>>;
};

type TabKey = "vendidas" | "seguro" | "canceladas" | "concentrado";

const TAB_LABELS: Record<TabKey, string> = {
  vendidas: "Tarjetas Vendidas",
  seguro: "Por Seguro",
  canceladas: "Canceladas",
  concentrado: "Concentrado por Privada",
};

const fmtMoney = (v: unknown) => {
  const n = Number(v) || 0;
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/* ================================================================ */

export default function ReporteVentasPage() {
  const [fechaIni, setFechaIni] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReporteData | null>(null);
  const [tab, setTab] = useState<TabKey>("vendidas");
  const [descargando, setDescargando] = useState(false);

  const handleConsultar = async () => {
    if (!fechaIni || !fechaFin) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ fechaIni, fechaFin, format: "json" });
      const res = await fetch(`/api/procesos/asignacion-tarjetas/reporte?${params}`);
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Error al consultar reporte");
        return;
      }
      const json = await res.json();
      setData(json);
      setTab("vendidas");
    } catch {
      alert("Error de conexion al consultar reporte");
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
      const res = await fetch(`/api/procesos/asignacion-tarjetas/reporte?${params}`);
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Error al descargar Excel");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Ventas_${data.fechaIni}_${data.fechaFin}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Error de conexion al descargar Excel");
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
            <FileSpreadsheet className="h-7 w-7 text-green-600" />
            Reporte de Ventas
          </h1>
          <p className="text-sm text-gray-700 mt-1">
            Tarjetas vendidas, por seguro, canceladas y concentrado por privada
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 print:hidden">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaIni}
              onChange={(e) => setFechaIni(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={handleConsultar}
            disabled={loading || !fechaIni || !fechaFin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50"
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

      {/* Reporte */}
      {data && (
        <>
          {/* Titulo para impresion */}
          <div className="hidden print:block text-center mb-4">
            <h2 className="text-xl font-bold">REPORTE DE VENTAS DE TARJETAS</h2>
            <p className="text-sm">Del {data.fechaIni} al {data.fechaFin}</p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg border border-gray-200 print:border-0 print:rounded-none">
            <div className="border-b border-gray-200 px-2 print:hidden">
              <div className="flex gap-0">
                {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => {
                  const count = key === "concentrado" ? data.concentrado.length : data[key].length;
                  return (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                        tab === key
                          ? "border-blue-600 text-blue-600"
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

            {/* Subtitulo de seccion (visible al imprimir) */}
            <div className="hidden print:block px-4 pt-3 pb-1">
              <h3 className="text-lg font-bold">{TAB_LABELS[tab]}</h3>
            </div>

            <div className="p-2">
              {tab !== "concentrado" ? (
                <TablaTarjetas rows={data[tab]} titulo={TAB_LABELS[tab]} />
              ) : (
                <TablaConcentrado rows={data.concentrado} />
              )}
            </div>
          </div>
        </>
      )}

      {/* Vacio */}
      {!data && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Selecciona un rango de fechas y da click en Consultar</p>
        </div>
      )}
    </div>
  );
}

/* ==================== Tabla de tarjetas (vendidas/seguro/canceladas) ==================== */

function TablaTarjetas({
  rows,
  titulo,
}: {
  rows: Array<Record<string, unknown>>;
  titulo: string;
}) {
  // Calcular totales
  let totalVehicular = 0;
  let totalPeatonal = 0;
  let numVehicular = 0;
  let numPeatonal = 0;

  for (const row of rows) {
    const precio = Number(row.precio) || 0;
    if (Number(row.tipo_id) === 1) {
      numPeatonal++;
      totalPeatonal += precio;
    } else {
      numVehicular++;
      totalVehicular += precio;
    }
  }

  const totalGeneral = totalPeatonal + totalVehicular;
  const totalTarjetas = numPeatonal + numVehicular;

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No hay {titulo.toLowerCase()} en este periodo
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-700 text-white print:bg-gray-800">
              <th className="text-center px-3 py-2 font-medium w-8">#</th>
              <th className="text-left px-3 py-2 font-medium">Fecha</th>
              <th className="text-left px-3 py-2 font-medium">Folio</th>
              <th className="text-left px-3 py-2 font-medium">Privada</th>
              <th className="text-left px-3 py-2 font-medium">Casa</th>
              <th className="text-left px-3 py-2 font-medium">Residente</th>
              <th className="text-center px-3 py-2 font-medium">Tipo</th>
              <th className="text-left px-3 py-2 font-medium">Lectura</th>
              <th className="text-right px-3 py-2 font-medium">Precio</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-gray-200 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 print:hover:bg-transparent`}
              >
                <td className="text-center px-3 py-1.5 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{String(row.fecha || "-")}</td>
                <td className="px-3 py-1.5 text-gray-700">{String(row.folio_contrato || "-")}</td>
                <td className="px-3 py-1.5 text-gray-700">{String(row.privada || "-")}</td>
                <td className="px-3 py-1.5 text-gray-700">{String(row.nro_casa || "")}</td>
                <td className="px-3 py-1.5 text-gray-900 font-medium">{String(row.residente || "-")}</td>
                <td className="px-3 py-1.5 text-center">
                  <span className={`text-xs font-medium ${
                    Number(row.tipo_id) === 2 ? "text-purple-700" : "text-teal-700"
                  }`}>
                    {Number(row.tipo_id) === 2 ? "VEH" : "PEA"}
                  </span>
                </td>
                <td className="px-3 py-1.5 font-mono text-xs text-gray-600">{String(row.lectura || "-")}</td>
                <td className="px-3 py-1.5 text-right font-medium text-gray-900">{fmtMoney(row.precio)}</td>
              </tr>
            ))}
          </tbody>
          {/* Totales al final de la tabla */}
          <tfoot>
            <tr className="border-t-2 border-gray-400 bg-gray-100 print:bg-gray-200">
              <td colSpan={6} className="px-3 py-2"></td>
              <td className="px-3 py-2 text-center text-xs font-medium text-gray-500">PEA</td>
              <td className="px-3 py-2 text-right text-sm font-medium text-gray-600">{numPeatonal} tarjeta(s)</td>
              <td className="px-3 py-2 text-right font-bold text-gray-800">{fmtMoney(totalPeatonal)}</td>
            </tr>
            <tr className="bg-gray-100 print:bg-gray-200">
              <td colSpan={6} className="px-3 py-2"></td>
              <td className="px-3 py-2 text-center text-xs font-medium text-gray-500">VEH</td>
              <td className="px-3 py-2 text-right text-sm font-medium text-gray-600">{numVehicular} tarjeta(s)</td>
              <td className="px-3 py-2 text-right font-bold text-gray-800">{fmtMoney(totalVehicular)}</td>
            </tr>
            <tr className="bg-slate-700 text-white print:bg-gray-800">
              <td colSpan={6} className="px-3 py-2"></td>
              <td className="px-3 py-2 text-center text-sm font-bold">TOTAL</td>
              <td className="px-3 py-2 text-right text-sm font-bold">{totalTarjetas} tarjeta(s)</td>
              <td className="px-3 py-2 text-right text-lg font-bold">{fmtMoney(totalGeneral)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ==================== Tabla concentrado por privada ==================== */

function TablaConcentrado({
  rows,
}: {
  rows: Array<Record<string, unknown>>;
}) {
  const porPrivada: Record<
    string,
    { peatonales: number; totalPeatonal: number; vehiculares: number; totalVehicular: number }
  > = {};

  for (const row of rows) {
    const priv = String(row.privada);
    if (!porPrivada[priv])
      porPrivada[priv] = { peatonales: 0, totalPeatonal: 0, vehiculares: 0, totalVehicular: 0 };
    if (Number(row.tipo_id) === 1) {
      porPrivada[priv].peatonales = Number(row.numTarjetas) || 0;
      porPrivada[priv].totalPeatonal = Number(row.dblTotal) || 0;
    } else {
      porPrivada[priv].vehiculares = Number(row.numTarjetas) || 0;
      porPrivada[priv].totalVehicular = Number(row.dblTotal) || 0;
    }
  }

  const entries = Object.entries(porPrivada);
  let grandTotal = 0;
  let grandPeatCnt = 0;
  let grandVehCnt = 0;
  let grandPeatonal = 0;
  let grandVehicular = 0;
  for (const [, d] of entries) {
    grandPeatCnt += d.peatonales;
    grandVehCnt += d.vehiculares;
    grandPeatonal += d.totalPeatonal;
    grandVehicular += d.totalVehicular;
    grandTotal += d.totalPeatonal + d.totalVehicular;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No hay datos de concentrado en este periodo
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-700 text-white print:bg-gray-800">
            <th className="text-left px-3 py-2 font-medium">Privada</th>
            <th className="text-right px-3 py-2 font-medium">Peatonales</th>
            <th className="text-right px-3 py-2 font-medium">Subtotal Peatonal</th>
            <th className="text-right px-3 py-2 font-medium">Vehiculares</th>
            <th className="text-right px-3 py-2 font-medium">Subtotal Vehicular</th>
            <th className="text-right px-3 py-2 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([priv, d], i) => (
            <tr
              key={priv}
              className={`border-b border-gray-200 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
            >
              <td className="px-3 py-2 font-medium text-gray-900">{priv}</td>
              <td className="px-3 py-2 text-right text-gray-600">{d.peatonales}</td>
              <td className="px-3 py-2 text-right text-gray-800">{fmtMoney(d.totalPeatonal)}</td>
              <td className="px-3 py-2 text-right text-gray-600">{d.vehiculares}</td>
              <td className="px-3 py-2 text-right text-gray-800">{fmtMoney(d.totalVehicular)}</td>
              <td className="px-3 py-2 text-right font-bold text-blue-700">
                {fmtMoney(d.totalPeatonal + d.totalVehicular)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-700 text-white print:bg-gray-800">
            <td className="px-3 py-2 font-bold">TOTAL GENERAL</td>
            <td className="px-3 py-2 text-right font-bold">{grandPeatCnt}</td>
            <td className="px-3 py-2 text-right font-bold">{fmtMoney(grandPeatonal)}</td>
            <td className="px-3 py-2 text-right font-bold">{grandVehCnt}</td>
            <td className="px-3 py-2 text-right font-bold">{fmtMoney(grandVehicular)}</td>
            <td className="px-3 py-2 text-right text-lg font-bold">{fmtMoney(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
