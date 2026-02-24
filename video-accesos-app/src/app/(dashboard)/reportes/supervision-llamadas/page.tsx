"use client";

import { useEffect, useState, useCallback } from "react";
import { Phone, ChevronLeft, ChevronRight } from "lucide-react";

/* ---------- tipos ---------- */
interface Empleado {
  id: number;
  nombre: string;
  apePaterno: string;
  apeMaterno: string;
}

interface SupervisionLlamada {
  id: number;
  registroAccesoId: number;
  supervisorId: number;
  supervisorNombre: string;
  fecha: string;
  saludo: boolean;
  identificoEmpresa: boolean;
  identificoOperador: boolean;
  amable: boolean;
  gracias: boolean;
  demanda: boolean;
  asunto: boolean;
  tiempoGestion: string | null;
  observaciones: string | null;
  registroAcceso: {
    id: number;
    privada: { id: number; descripcion: string };
    residencia: { id: number; nroCasa: string; calle: string };
  };
}

interface ApiResponse {
  data: SupervisionLlamada[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ---------- constantes ---------- */
const CRITERIOS_BOOL: { key: keyof SupervisionLlamada; label: string }[] = [
  { key: "saludo", label: "Saludo" },
  { key: "identificoEmpresa", label: "Id. Empresa" },
  { key: "identificoOperador", label: "Id. Operador" },
  { key: "amable", label: "Amable" },
  { key: "gracias", label: "Gracias" },
  { key: "demanda", label: "Demanda" },
  { key: "asunto", label: "Asunto" },
];

/* ---------- helpers ---------- */
function getDefaultFechaDesde(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getDefaultFechaHasta(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

/* ================================================================ */

export default function SupervisionLlamadasPage() {
  /* ---------- state ---------- */
  const [supervisores, setSupervisores] = useState<Empleado[]>([]);
  const [supervisiones, setSupervisiones] = useState<SupervisionLlamada[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [limit] = useState(50);

  // filtros
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(getDefaultFechaDesde);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(getDefaultFechaHasta);
  const [filtroSupervisorId, setFiltroSupervisorId] = useState("");

  // filtros aplicados
  const [appliedFilters, setAppliedFilters] = useState({
    fechaDesde: getDefaultFechaDesde(),
    fechaHasta: getDefaultFechaHasta(),
    supervisorId: "",
  });

  /* ---------- cargar supervisores (empleados con permiso supervisor) ---------- */
  useEffect(() => {
    async function loadSupervisores() {
      try {
        const res = await fetch("/api/catalogos/empleados?pageSize=500");
        if (!res.ok) return;
        const json = await res.json();
        setSupervisores(json.data || []);
      } catch {
        console.error("Error al cargar supervisores");
      }
    }
    loadSupervisores();
  }, []);

  /* ---------- fetch supervisiones ---------- */
  const fetchSupervisiones = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (appliedFilters.fechaDesde) params.set("fechaDesde", appliedFilters.fechaDesde);
      if (appliedFilters.fechaHasta) params.set("fechaHasta", appliedFilters.fechaHasta);
      if (appliedFilters.supervisorId) params.set("supervisorId", appliedFilters.supervisorId);

      const res = await fetch(`/api/reportes/supervision-llamadas?${params}`);
      if (!res.ok) throw new Error("Error al consultar");
      const json: ApiResponse = await res.json();
      setSupervisiones(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch {
      console.error("Error al cargar supervisiones");
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters]);

  useEffect(() => {
    fetchSupervisiones();
  }, [fetchSupervisiones]);

  /* ---------- acciones ---------- */
  const handleBuscar = () => {
    setPage(1);
    setAppliedFilters({
      fechaDesde: filtroFechaDesde,
      fechaHasta: filtroFechaHasta,
      supervisorId: filtroSupervisorId,
    });
  };

  /* ---------- calcular resumen de porcentajes ---------- */
  const calcularResumen = () => {
    if (supervisiones.length === 0) return null;
    const totalReg = supervisiones.length;
    const resumen: Record<string, number> = {};

    for (const criterio of CRITERIOS_BOOL) {
      const count = supervisiones.filter(
        (s) => s[criterio.key] === true
      ).length;
      resumen[criterio.key] = Math.round((count / totalReg) * 100);
    }

    return resumen;
  };

  const resumen = calcularResumen();

  /* ================================================================ */
  /* RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="bg-orange-100 p-2 rounded-lg">
          <Phone className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supervision de Llamadas</h1>
          <p className="text-sm text-gray-500">Reporte de evaluacion de calidad en llamadas</p>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          {/* Supervisor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
            <select
              value={filtroSupervisorId}
              onChange={(e) => setFiltroSupervisorId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              {supervisores.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre} {e.apePaterno} {e.apeMaterno}
                </option>
              ))}
            </select>
          </div>

          {/* Boton Buscar */}
          <div className="flex items-end">
            <button
              onClick={handleBuscar}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <Phone className="h-4 w-4" />
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Total */}
      <p className="text-sm text-gray-600">
        Total de registros: <span className="font-semibold">{total.toLocaleString()}</span>
      </p>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">Fecha</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">Privada</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700">#Casa</th>
                <th className="text-center px-2 py-3 font-semibold text-gray-700 whitespace-nowrap">Saludo</th>
                <th className="text-center px-2 py-3 font-semibold text-gray-700 whitespace-nowrap">Id. Empresa</th>
                <th className="text-center px-2 py-3 font-semibold text-gray-700 whitespace-nowrap">Id. Operador</th>
                <th className="text-center px-2 py-3 font-semibold text-gray-700">Amable</th>
                <th className="text-center px-2 py-3 font-semibold text-gray-700">Gracias</th>
                <th className="text-center px-2 py-3 font-semibold text-gray-700">Demanda</th>
                <th className="text-center px-2 py-3 font-semibold text-gray-700">Asunto</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-700">Tiempo</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-700">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-gray-400">
                    Cargando...
                  </td>
                </tr>
              ) : supervisiones.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-gray-400">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                <>
                  {supervisiones.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {formatFecha(s.fecha)}
                      </td>
                      <td className="px-3 py-2 text-gray-900 font-medium">
                        {s.registroAcceso.privada.descripcion}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">
                        {s.registroAcceso.residencia.nroCasa}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <BoolIndicator value={s.saludo} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <BoolIndicator value={s.identificoEmpresa} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <BoolIndicator value={s.identificoOperador} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <BoolIndicator value={s.amable} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <BoolIndicator value={s.gracias} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <BoolIndicator value={s.demanda} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <BoolIndicator value={s.asunto} />
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">
                        {s.tiempoGestion || "-"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate" title={s.observaciones || ""}>
                        {s.observaciones || "-"}
                      </td>
                    </tr>
                  ))}

                  {/* Fila de resumen con porcentajes */}
                  {resumen && (
                    <tr className="bg-blue-50 border-t-2 border-blue-200 font-semibold">
                      <td colSpan={3} className="px-3 py-3 text-blue-800 text-right">
                        Porcentaje de cumplimiento:
                      </td>
                      <td className="px-2 py-3 text-center text-blue-700">{resumen.saludo}%</td>
                      <td className="px-2 py-3 text-center text-blue-700">{resumen.identificoEmpresa}%</td>
                      <td className="px-2 py-3 text-center text-blue-700">{resumen.identificoOperador}%</td>
                      <td className="px-2 py-3 text-center text-blue-700">{resumen.amable}%</td>
                      <td className="px-2 py-3 text-center text-blue-700">{resumen.gracias}%</td>
                      <td className="px-2 py-3 text-center text-blue-700">{resumen.demanda}%</td>
                      <td className="px-2 py-3 text-center text-blue-700">{resumen.asunto}%</td>
                      <td colSpan={2} />
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacion */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm">
            <span className="text-gray-600">
              Mostrando {supervisiones.length} de {total.toLocaleString()} registros
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

/* ---------- Componente indicador booleano ---------- */
function BoolIndicator({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold">
      &#10003;
    </span>
  ) : (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">
      X
    </span>
  );
}
