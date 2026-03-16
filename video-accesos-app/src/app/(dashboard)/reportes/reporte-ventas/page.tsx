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
      const params = new URLSearchParams({
        fechaIni,
        fechaFin,
        format: "json",
      });
      const res = await fetch(
        `/api/procesos/asignacion-tarjetas/reporte?${params}`
      );
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
      const res = await fetch(
        `/api/procesos/asignacion-tarjetas/reporte?${params}`
      );
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

  const fmtMoney = (v: unknown) => {
    const n = Number(v) || 0;
    return `$${n.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="h-7 w-7 text-green-600" />
          Reporte de Ventas
        </h1>
        <p className="text-sm text-gray-700 mt-1">
          Consulta el reporte de tarjetas vendidas, por seguro, canceladas y
          concentrado por privada en un periodo determinado.
        </p>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fechaIni}
              onChange={(e) => setFechaIni(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleConsultar}
            disabled={loading || !fechaIni || !fechaFin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Consultando..." : "Consultar"}
          </button>
          {data && (
            <>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition print:hidden"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
              <button
                onClick={handleDescargarExcel}
                disabled={descargando}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50 print:hidden"
              >
                {descargando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {descargando ? "Descargando..." : "Descargar Excel"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Resultado del reporte */}
      {data && (
        <>
          <div className="text-sm text-gray-500">
            Periodo: {data.fechaIni} al {data.fechaFin}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden print:border-0">
            <div className="border-b border-gray-200 px-4 print:hidden">
              <div className="flex gap-1">
                {([
                  { key: "vendidas" as const, label: "Vendidas", count: data.vendidas.length },
                  { key: "seguro" as const, label: "Por Seguro", count: data.seguro.length },
                  { key: "canceladas" as const, label: "Canceladas", count: data.canceladas.length },
                  { key: "concentrado" as const, label: "Concentrado", count: data.concentrado.length },
                ]).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                      tab === t.key
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {t.label}
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {(tab === "vendidas" || tab === "seguro" || tab === "canceladas") && (
                <ReporteTabla rows={data[tab]} showDescuento={tab === "vendidas"} fmtMoney={fmtMoney} />
              )}
              {tab === "concentrado" && (
                <ReporteConcentrado rows={data.concentrado} fmtMoney={fmtMoney} />
              )}
            </div>
          </div>
        </>
      )}

      {/* Estado vacio */}
      {!data && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Selecciona un rango de fechas y da click en Consultar</p>
        </div>
      )}
    </div>
  );
}

/* ==================== Componentes de tablas ==================== */

function ReporteTabla({
  rows,
  showDescuento,
  fmtMoney,
}: {
  rows: Array<Record<string, unknown>>;
  showDescuento: boolean;
  fmtMoney: (v: unknown) => string;
}) {
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

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-700">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Folio</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Lectura</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Tipo</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Precio</th>
              {showDescuento && (
                <th className="text-right px-4 py-3 font-medium text-gray-700">Descuento</th>
              )}
              <th className="text-left px-4 py-3 font-medium text-gray-700">Residente</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Privada</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Direccion</th>
              <th className="text-center px-4 py-3 font-medium text-gray-700">Folio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showDescuento ? 10 : 9} className="text-center py-8 text-gray-400">
                  Sin registros en este periodo
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-600">{String(row.fecha || "-")}</td>
                  <td className="px-4 py-2 text-gray-600">{String(row.folio_contrato || "-")}</td>
                  <td className="px-4 py-2 font-mono text-gray-800">{String(row.lectura || "-")}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      Number(row.tipo_id) === 2 ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700"
                    }`}>
                      {String(row.tipo || "-")}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{fmtMoney(row.precio)}</td>
                  {showDescuento && (
                    <td className="px-4 py-2 text-right text-gray-600">{fmtMoney(row.descuento)}</td>
                  )}
                  <td className="px-4 py-2 text-gray-800">{String(row.residente || "-")}</td>
                  <td className="px-4 py-2 text-gray-600">{String(row.privada || "-")}</td>
                  <td className="px-4 py-2 text-gray-600">{String(row.nro_casa || "")}, {String(row.calle || "")}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      row.folio_tipo === "H" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {String(row.folio_tipo || "-")}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 mt-0">
          <div className="flex flex-wrap gap-6 justify-end text-sm">
            <div>
              <span className="text-gray-500">Peatonal:</span>{" "}
              <span className="font-medium">{numPeatonal}</span>{" "}
              <span className="text-gray-400">|</span>{" "}
              <span className="font-medium text-green-700">{fmtMoney(totalPeatonal)}</span>
            </div>
            <div>
              <span className="text-gray-500">Vehicular:</span>{" "}
              <span className="font-medium">{numVehicular}</span>{" "}
              <span className="text-gray-400">|</span>{" "}
              <span className="font-medium text-green-700">{fmtMoney(totalVehicular)}</span>
            </div>
            <div className="font-bold text-blue-700">
              Total: {numPeatonal + numVehicular} tarjetas | {fmtMoney(totalPeatonal + totalVehicular)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ReporteConcentrado({
  rows,
  fmtMoney,
}: {
  rows: Array<Record<string, unknown>>;
  fmtMoney: (v: unknown) => string;
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
  let grandPeatonal = 0;
  let grandVehicular = 0;
  for (const [, d] of entries) {
    grandPeatonal += d.totalPeatonal;
    grandVehicular += d.totalVehicular;
    grandTotal += d.totalPeatonal + d.totalVehicular;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-700">Privada</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Peatonales</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Total Peatonal</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Vehiculares</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Total Vehicular</th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">Total General</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Sin registros en este periodo
                </td>
              </tr>
            ) : (
              entries.map(([priv, d]) => (
                <tr key={priv} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-800">{priv}</td>
                  <td className="px-4 py-2 text-right">{d.peatonales}</td>
                  <td className="px-4 py-2 text-right">{fmtMoney(d.totalPeatonal)}</td>
                  <td className="px-4 py-2 text-right">{d.vehiculares}</td>
                  <td className="px-4 py-2 text-right">{fmtMoney(d.totalVehicular)}</td>
                  <td className="px-4 py-2 text-right font-medium text-blue-700">
                    {fmtMoney(d.totalPeatonal + d.totalVehicular)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {entries.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex flex-wrap gap-6 justify-end text-sm">
            <div>
              <span className="text-gray-500">Total Peatonal:</span>{" "}
              <span className="font-medium text-green-700">{fmtMoney(grandPeatonal)}</span>
            </div>
            <div>
              <span className="text-gray-500">Total Vehicular:</span>{" "}
              <span className="font-medium text-green-700">{fmtMoney(grandVehicular)}</span>
            </div>
            <div className="font-bold text-blue-700">
              Gran Total: {fmtMoney(grandTotal)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
