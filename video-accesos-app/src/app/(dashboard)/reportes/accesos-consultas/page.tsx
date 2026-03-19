"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, FileSpreadsheet, ChevronLeft, ChevronRight, X } from "lucide-react";

/* ---------- tipos ---------- */
interface Privada {
  id: number;
  descripcion: string;
}

interface ResidenciaOption {
  id: number;
  nroCasa: string;
  calle: string;
}

interface RegistroAcceso {
  id: number;
  tipoGestionId: number;
  estatusId: number;
  solicitanteId: string;
  solicitanteNombre: string;
  observaciones: string | null;
  duracion: string | null;
  fechaModificacion: string;
  privada: { id: number; descripcion: string };
  residencia: { id: number; nroCasa: string; calle: string };
  empleado: {
    id: number;
    nombre: string;
    apePaterno: string;
    apeMaterno: string;
    nroOperador: string | null;
  };
}

interface ApiResponse {
  data: RegistroAcceso[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ---------- constantes ---------- */
const TIPOS_GESTION: Record<number, string> = {
  1: "No concluida",
  2: "Moroso",
  3: "Proveedor",
  4: "Residente",
  5: "Tecnico",
  6: "Trab. Obra",
  7: "Trab. Servicio",
  8: "Visita",
  9: "Visita Morosos",
};

const RESULTADOS: Record<number, string> = {
  1: "Acceso",
  2: "Rechazado",
  3: "Informo",
};

const RESULTADO_COLOR: Record<number, string> = {
  1: "bg-green-100 text-green-700",
  2: "bg-red-100 text-red-700",
  3: "bg-blue-100 text-blue-700",
};

/* ---------- helpers ---------- */
function formatFecha(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function getDefaultFechaDesde(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getDefaultFechaHasta(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

function formatDuracion(iso: string | null): string {
  if (!iso) return "-";
  // duracion is a Time field returned as ISO datetime (1970-01-01T...)
  // Extract HH:MM:SS from the ISO string
  const match = iso.match(/T(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return "-";
  const [, hh, mm, ss] = match;
  if (hh === "00" && mm === "00" && ss === "00") return "-";
  if (hh === "00") return `${mm}:${ss}`;
  return `${hh}:${mm}:${ss}`;
}

function registroToCsvRow(r: RegistroAcceso): string {
  const operador = r.empleado
    ? `${r.empleado.nombre} ${r.empleado.apePaterno} ${r.empleado.apeMaterno}`.trim()
    : "";
  const cols = [
    formatFecha(r.fechaModificacion),
    r.privada.descripcion,
    r.residencia.nroCasa,
    r.residencia.calle,
    r.solicitanteNombre || r.solicitanteId,
    TIPOS_GESTION[r.tipoGestionId] || String(r.tipoGestionId),
    RESULTADOS[r.estatusId] || String(r.estatusId),
    operador,
    formatDuracion(r.duracion),
  ];
  return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
}

/* ================================================================ */

export default function AccesosConsultasPage() {
  /* ---------- state ---------- */
  const [privadas, setPrivadas] = useState<Privada[]>([]);
  const [residencias, setResidencias] = useState<ResidenciaOption[]>([]);
  const [registros, setRegistros] = useState<RegistroAcceso[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [limit] = useState(50);

  // filtros
  const [filtroPrivadaId, setFiltroPrivadaId] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(getDefaultFechaDesde);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(getDefaultFechaHasta);
  const [filtroTipoGestionId, setFiltroTipoGestionId] = useState("");
  const [filtroEstatusId, setFiltroEstatusId] = useState("");
  const [filtroNroCasa, setFiltroNroCasa] = useState("");

  // filtros aplicados (se aplican al hacer click en Buscar)
  const [appliedFilters, setAppliedFilters] = useState({
    privadaId: "",
    fechaDesde: getDefaultFechaDesde(),
    fechaHasta: getDefaultFechaHasta(),
    tipoGestionId: "",
    estatusId: "",
    nroCasa: "",
  });

  /* ---------- cargar privadas ---------- */
  useEffect(() => {
    async function loadPrivadas() {
      try {
        const res = await fetch("/api/catalogos/privadas?pageSize=500&estatusId=1");
        if (!res.ok) return;
        const json = await res.json();
        setPrivadas(json.data || []);
      } catch {
        console.error("Error al cargar privadas");
      }
    }
    loadPrivadas();
  }, []);

  /* ---------- busqueda inteligente de residencias ---------- */
  const [searchCasa, setSearchCasa] = useState("");
  const [showCasaDropdown, setShowCasaDropdown] = useState(false);
  const [selectedCasaLabel, setSelectedCasaLabel] = useState("");
  const casaRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpiar seleccion al cambiar privada
  useEffect(() => {
    setResidencias([]);
    setFiltroNroCasa("");
    setSearchCasa("");
    setSelectedCasaLabel("");
  }, [filtroPrivadaId]);

  // Buscar residencias con debounce
  useEffect(() => {
    if (!filtroPrivadaId || searchCasa.length < 1) {
      setResidencias([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/catalogos/residencias?privadaId=${filtroPrivadaId}&search=${encodeURIComponent(searchCasa)}&limit=20&includeTarjetas=false`
        );
        if (!res.ok) return;
        const json = await res.json();
        setResidencias(json.data || []);
        setShowCasaDropdown(true);
      } catch {
        console.error("Error al buscar residencias");
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filtroPrivadaId, searchCasa]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (casaRef.current && !casaRef.current.contains(e.target as Node)) {
        setShowCasaDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------- fetch registros ---------- */
  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (appliedFilters.privadaId) params.set("privadaId", appliedFilters.privadaId);
      if (appliedFilters.fechaDesde) params.set("fechaDesde", appliedFilters.fechaDesde);
      if (appliedFilters.fechaHasta) params.set("fechaHasta", appliedFilters.fechaHasta);
      if (appliedFilters.tipoGestionId) params.set("tipoGestionId", appliedFilters.tipoGestionId);
      if (appliedFilters.estatusId) params.set("estatusId", appliedFilters.estatusId);
      if (appliedFilters.nroCasa) params.set("nroCasa", appliedFilters.nroCasa);

      const res = await fetch(`/api/reportes/accesos-consultas?${params}`);
      if (!res.ok) throw new Error("Error al consultar");
      const json: ApiResponse = await res.json();
      setRegistros(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch {
      console.error("Error al cargar registros");
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters]);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  /* ---------- acciones ---------- */
  const handleBuscar = () => {
    setPage(1);
    setAppliedFilters({
      privadaId: filtroPrivadaId,
      fechaDesde: filtroFechaDesde,
      fechaHasta: filtroFechaHasta,
      tipoGestionId: filtroTipoGestionId,
      estatusId: filtroEstatusId,
      nroCasa: filtroNroCasa,
    });
  };

  const handleExportar = () => {
    const header = "Fecha/Hora,Privada,#Casa,Calle,Solicitante,Tipo,Resultado,Operador,Duracion";
    const rows = registros.map(registroToCsvRow);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `accesos_consulta_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ================================================================ */
  /* RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Search className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accesos - Consultas</h1>
          <p className="text-sm text-gray-700">Consulta detallada de registros de acceso</p>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Privada */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Privada</label>
            <select
              value={filtroPrivadaId}
              onChange={(e) => setFiltroPrivadaId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              {privadas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.descripcion}
                </option>
              ))}
            </select>
          </div>

          {/* Casa (busqueda inteligente por calle/#casa) */}
          <div ref={casaRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Casa</label>
            <div className="relative">
              <input
                type="text"
                value={selectedCasaLabel || searchCasa}
                onChange={(e) => {
                  setSelectedCasaLabel("");
                  setFiltroNroCasa("");
                  setSearchCasa(e.target.value);
                }}
                onFocus={() => { if (residencias.length > 0) setShowCasaDropdown(true); }}
                disabled={!filtroPrivadaId}
                placeholder={filtroPrivadaId ? "Buscar por calle o #casa..." : "Seleccione privada"}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed pr-8"
              />
              {(selectedCasaLabel || searchCasa) && filtroPrivadaId && (
                <button
                  type="button"
                  onClick={() => { setSearchCasa(""); setSelectedCasaLabel(""); setFiltroNroCasa(""); setResidencias([]); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {showCasaDropdown && residencias.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {residencias.map((r) => (
                  <li
                    key={r.id}
                    onClick={() => {
                      setFiltroNroCasa(r.nroCasa);
                      setSelectedCasaLabel(`${r.calle} #${r.nroCasa}`);
                      setSearchCasa("");
                      setShowCasaDropdown(false);
                    }}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700"
                  >
                    {r.calle} <span className="font-semibold">#{r.nroCasa}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Fecha Desde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tipo Gestion */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Gestion</label>
            <select
              value={filtroTipoGestionId}
              onChange={(e) => setFiltroTipoGestionId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              {Object.entries(TIPOS_GESTION).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Resultado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
            <select
              value={filtroEstatusId}
              onChange={(e) => setFiltroEstatusId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              {Object.entries(RESULTADOS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Boton Buscar */}
          <div className="flex items-end">
            <button
              onClick={handleBuscar}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Search className="h-4 w-4" />
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Total de registros: <span className="font-semibold">{total.toLocaleString()}</span>
        </p>
        <button
          onClick={handleExportar}
          disabled={registros.length === 0}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </button>
      </div>

      {/* Tabla de resultados */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Fecha/Hora</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Privada</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">#Casa</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Calle</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Solicitante</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Tipo</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Resultado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Operador</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Duracion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-600">
                    Cargando...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-600">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatFecha(r.fechaModificacion)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {r.privada.descripcion}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {r.residencia.nroCasa}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.residencia.calle}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.solicitanteNombre || r.solicitanteId}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {TIPOS_GESTION[r.tipoGestionId] || r.tipoGestionId}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          RESULTADO_COLOR[r.estatusId] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {RESULTADOS[r.estatusId] || r.estatusId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.empleado
                        ? `${r.empleado.nombre} ${r.empleado.apePaterno} ${r.empleado.apeMaterno}`.trim()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {formatDuracion(r.duracion)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacion */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm">
            <span className="text-gray-600">
              Mostrando {registros.length} de {total.toLocaleString()} registros
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-gray-700">
                Pagina {page} de {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
