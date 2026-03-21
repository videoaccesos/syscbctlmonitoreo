"use client";

import { useState, useCallback } from "react";
import {
  Search,
  Loader2,
  Download,
  CreditCard,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ---------- tipos ---------- */
type TarjetaRow = Record<string, unknown>;

type ReporteData = {
  data: TarjetaRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  conteos: Record<string, number>;
};

/* ---------- constantes ---------- */
const ESTATUS_BADGE: Record<string, string> = {
  ACTIVA: "bg-green-100 text-green-700",
  ASIGNADA: "bg-blue-100 text-blue-700",
  DANADA: "bg-red-100 text-red-700",
  CONSIGNACION: "bg-yellow-100 text-yellow-700",
  BAJA: "bg-gray-200 text-gray-600",
};

/* ================================================================ */

export default function CatalogoTarjetasReportePage() {
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filterEstatus, setFilterEstatus] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReporteData | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [consulted, setConsulted] = useState(false);

  const fetchData = useCallback(async (searchVal: string, estatusVal: string, tipoVal: string, pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ format: "json", page: String(pageNum), limit: String(pageSize) });
      if (searchVal) params.set("search", searchVal);
      if (estatusVal) params.set("estatusId", estatusVal);
      if (tipoVal) params.set("tipoId", tipoVal);

      const res = await fetch(`/api/catalogos/tarjetas/reporte?${params}`);
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Error al consultar reporte");
        return;
      }
      const json: ReporteData = await res.json();
      setData(json);
      setConsulted(true);
    } catch {
      alert("Error de conexion al consultar reporte");
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const handleConsultar = () => {
    setAppliedSearch(searchInput);
    setPage(1);
    fetchData(searchInput, filterEstatus, filterTipo, 1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConsultar();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData(appliedSearch, filterEstatus, filterTipo, newPage);
  };

  const clearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setFilterEstatus("");
    setFilterTipo("");
    setPage(1);
    setData(null);
    setConsulted(false);
  };

  const handleDescargarExcel = async () => {
    setDescargando(true);
    try {
      const params = new URLSearchParams({ format: "excel" });
      if (appliedSearch) params.set("search", appliedSearch);
      if (filterEstatus) params.set("estatusId", filterEstatus);
      if (filterTipo) params.set("tipoId", filterTipo);

      const res = await fetch(`/api/catalogos/tarjetas/reporte?${params}`);
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Error al descargar Excel");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Catalogo_Tarjetas.xlsx";
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

  const hasFilters = searchInput || filterEstatus || filterTipo;
  const totalPages = data?.totalPages || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-blue-600" />
            Catalogo de Tarjetas
          </h1>
          <p className="text-sm text-gray-700 mt-1">
            Consulta y busqueda de tarjetas del catalogo con su estatus e informacion de asignacion
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar por lectura o No. Serie
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
              <input
                type="text"
                placeholder="Numero de lectura o serie..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={filterEstatus}
              onChange={(e) => setFilterEstatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="1">Activa</option>
              <option value="2">Asignada</option>
              <option value="3">Danada</option>
              <option value="4">Consignacion</option>
              <option value="5">Baja</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="1">Peatonal</option>
              <option value="2">Vehicular</option>
            </select>
          </div>
          <button
            onClick={handleConsultar}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Consultando..." : "Consultar"}
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <X className="h-4 w-4" />
              Limpiar
            </button>
          )}
          {data && data.total > 0 && (
            <button
              onClick={handleDescargarExcel}
              disabled={descargando}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {descargando ? "Descargando..." : "Excel"}
            </button>
          )}
        </div>
      </div>

      {/* Resumen de conteos */}
      {data && (
        <div className="flex flex-wrap gap-3">
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-2">
            <span className="text-sm text-gray-500">Total:</span>{" "}
            <span className="text-lg font-bold text-gray-900">{data.total}</span>
          </div>
          {Object.entries(data.conteos).map(([estatus, count]) => (
            <div key={estatus} className="bg-white rounded-lg border border-gray-200 px-4 py-2">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ESTATUS_BADGE[estatus] || "bg-gray-100 text-gray-700"}`}>
                {estatus}
              </span>{" "}
              <span className="text-lg font-bold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {data && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-700 text-white">
                  <th className="text-center px-3 py-2 font-medium w-8">No.</th>
                  <th className="text-left px-3 py-2 font-medium">Lectura</th>
                  <th className="text-left px-3 py-2 font-medium">No. Serie</th>
                  <th className="text-center px-3 py-2 font-medium">Tipo</th>
                  <th className="text-center px-3 py-2 font-medium">Estatus</th>
                  <th className="text-left px-3 py-2 font-medium">Folio</th>
                  <th className="text-left px-3 py-2 font-medium">Privada</th>
                  <th className="text-left px-3 py-2 font-medium">Calle</th>
                  <th className="text-left px-3 py-2 font-medium">Casa</th>
                  <th className="text-left px-3 py-2 font-medium">Residente</th>
                  <th className="text-left px-3 py-2 font-medium">Tel. Interfon</th>
                  <th className="text-center px-3 py-2 font-medium">Asignacion</th>
                  <th className="text-left px-3 py-2 font-medium">Vencimiento</th>
                  <th className="text-left px-3 py-2 font-medium">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {data.data.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-12 text-gray-400">
                      No se encontraron tarjetas con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  data.data.map((row, i) => {
                    const estatus = String(row.estatus || "");
                    const rowNum = (page - 1) * pageSize + i + 1;
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-200 ${
                          i % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-blue-50`}
                      >
                        <td className="text-center px-3 py-1.5 text-gray-500 text-xs font-mono">{rowNum}</td>
                        <td className="px-3 py-1.5 font-mono font-medium text-gray-900">{String(row.lectura || "-")}</td>
                        <td className="px-3 py-1.5 font-mono text-xs text-gray-600">{String(row.numero_serie || "-")}</td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={`text-xs font-medium ${
                            Number(row.tipo_id) === 2 ? "text-purple-700" : "text-teal-700"
                          }`}>
                            {Number(row.tipo_id) === 2 ? "VEH" : "PEA"}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            ESTATUS_BADGE[estatus] || "bg-gray-100 text-gray-700"
                          }`}>
                            {estatus}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-gray-700">{String(row.folio_contrato || "-")}</td>
                        <td className="px-3 py-1.5 text-gray-700">{String(row.privada || "-")}</td>
                        <td className="px-3 py-1.5 text-gray-700">{String(row.calle || "-")}</td>
                        <td className="px-3 py-1.5 text-gray-700">{String(row.nro_casa || "-")}</td>
                        <td className="px-3 py-1.5 text-gray-900 font-medium">{String(row.residente || "-")}</td>
                        <td className="px-3 py-1.5 text-gray-600">{String(row.telefono_interfon || "-")}</td>
                        <td className="px-3 py-1.5 text-center">
                          {row.asig_estatus ? (
                            <span className={`text-xs font-medium ${
                              row.asig_estatus === "ACTIVA" ? "text-green-700" : "text-red-600"
                            }`}>
                              {String(row.asig_estatus)}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{String(row.fecha_vencimiento || "-")}</td>
                        <td className="px-3 py-1.5 text-gray-600 text-xs">{String(row.observaciones || "-")}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {data.data.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-700 text-white">
                    <td colSpan={14} className="px-3 py-2 text-center font-bold">
                      Total: {data.total} tarjeta(s)
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Paginacion */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm">
              <span className="text-gray-600">
                Mostrando {data.data.length} de {data.total} registros (pagina {page} de {totalPages})
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={page <= 1}
                  className="px-2 py-1.5 rounded border border-gray-300 text-xs text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Primera
                </button>
                <button
                  disabled={page <= 1}
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {(() => {
                  const pages: (number | string)[] = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (page > 3) pages.push("...");
                    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                      pages.push(i);
                    }
                    if (page < totalPages - 2) pages.push("...");
                    pages.push(totalPages);
                  }
                  return pages.map((p, idx) =>
                    typeof p === "string" ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`px-2.5 py-1.5 rounded border text-sm font-medium transition ${
                          p === page
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-gray-300 text-gray-700 hover:bg-white"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  );
                })()}
                <button
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                  className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={page >= totalPages}
                  className="px-2 py-1.5 rounded border border-gray-300 text-xs text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Ultima
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!consulted && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Da click en Consultar para ver el catalogo de tarjetas. Puedes usar filtros o dejar todo en blanco para ver todas.</p>
        </div>
      )}
    </div>
  );
}
