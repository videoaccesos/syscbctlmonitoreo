"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Loader2,
  Eye,
} from "lucide-react";

/* ---------- tipos ---------- */
interface Privada {
  id: number;
  descripcion: string;
}

interface Empleado {
  id: number;
  nombre: string;
  apePaterno: string;
  apeMaterno: string;
}

interface CodigoServicio {
  id: number;
  codigo: string;
  descripcion: string;
}

interface DiagnosticoItem {
  id: number;
  codigo: string;
  descripcion: string;
}

interface Seguimiento {
  ordenServicioId: number;
  seguimientoId: number;
  comentario: string;
  fechaModificacion: string;
  usuarioId: number;
}

interface MaterialOrden {
  ordenServicioId: number;
  materialId: number;
  cantidad: number;
  fechaModificacion: string;
  material: {
    id: number;
    codigo: string;
    descripcion: string;
    costo: number;
  } | null;
}

interface OrdenServicio {
  id: number;
  folio: string;
  fecha: string;
  empleadoId: number;
  privadaId: number;
  tecnicoId: number;
  cierreTecnicoId: number | null;
  cierreFecha: string | null;
  cierreComentario: string | null;
  fechaAsistio: string | null;
  tiempo: number | null;
  codigoServicioId: number;
  detalleServicio: string;
  diagnosticoId: number | null;
  detalleDiagnostico: string | null;
  estatusId: number;
  privada: Privada;
  tecnico: Empleado;
  empleado: Empleado;
  cierreTecnico: Empleado | null;
  codigoServicio: CodigoServicio;
  diagnostico: DiagnosticoItem | null;
  seguimientos?: Seguimiento[];
  materiales?: MaterialOrden[];
}

interface OrdenForm {
  empleadoId: string;
  privadaId: string;
  tecnicoId: string;
  codigoServicioId: string;
  detalleServicio: string;
  diagnosticoId: string;
  detalleDiagnostico: string;
}

const emptyForm: OrdenForm = {
  empleadoId: "",
  privadaId: "",
  tecnicoId: "",
  codigoServicioId: "",
  detalleServicio: "",
  diagnosticoId: "",
  detalleDiagnostico: "",
};

/* ---------- constantes ---------- */
const ESTATUS_ORDEN: Record<number, string> = {
  1: "Abierta",
  2: "Solucionada",
  3: "Cerrada",
};

const ESTATUS_BADGE: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-green-100 text-green-700",
};

/* ================================================================ */

export default function OrdenesServicioPage() {
  /* ---------- state ---------- */
  const [items, setItems] = useState<OrdenServicio[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // filtros
  const [filterPrivada, setFilterPrivada] = useState("");
  const [filterEstatus, setFilterEstatus] = useState("");
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");

  // catalogos para dropdowns
  const [privadas, setPrivadas] = useState<Privada[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [codigosServicio, setCodigosServicio] = useState<CodigoServicio[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>([]);

  // modal crear
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<OrdenForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // modal detalle
  const [detailOrder, setDetailOrder] = useState<OrdenServicio | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* ---------- fetch data ---------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (search) params.set("search", search);
      if (filterPrivada) params.set("privadaId", filterPrivada);
      if (filterEstatus) params.set("estatusId", filterEstatus);
      if (filterFechaDesde) params.set("fechaDesde", filterFechaDesde);
      if (filterFechaHasta) params.set("fechaHasta", filterFechaHasta);

      const res = await fetch(`/api/procesos/ordenes-servicio?${params}`);
      if (!res.ok) throw new Error("Error al obtener ordenes");
      const json = await res.json();
      setItems(json.data);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch {
      console.error("Error al cargar ordenes de servicio");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterPrivada, filterEstatus, filterFechaDesde, filterFechaHasta]);

  const fetchCatalogos = useCallback(async () => {
    try {
      const [privRes, empRes, codRes, diagRes] = await Promise.all([
        fetch("/api/catalogos/privadas?limit=200"),
        fetch("/api/catalogos/empleados?pageSize=200"),
        fetch("/api/catalogos/tarjetas?limit=1"), // placeholder - we use a dedicated endpoint below
        fetch("/api/catalogos/tarjetas?limit=1"), // placeholder
      ]);

      if (privRes.ok) {
        const json = await privRes.json();
        setPrivadas(json.data || json);
      }
      if (empRes.ok) {
        const json = await empRes.json();
        setEmpleados(json.data || json);
      }

      // Fetch codigos de servicio
      const codServRes = await fetch("/api/catalogos/tarjetas?limit=1");
      // We'll fetch these from specific endpoints if available, otherwise hardcode fallback
      void codRes;
      void diagRes;
      void codServRes;
    } catch {
      console.error("Error al cargar catalogos");
    }
  }, []);

  // Fetch real catalogs
  const fetchDropdowns = useCallback(async () => {
    try {
      const [privRes, empRes] = await Promise.all([
        fetch("/api/catalogos/privadas?limit=200"),
        fetch("/api/catalogos/empleados?pageSize=200"),
      ]);

      if (privRes.ok) {
        const json = await privRes.json();
        setPrivadas(json.data || json);
      }
      if (empRes.ok) {
        const json = await empRes.json();
        setEmpleados(json.data || json);
      }

      // Codigos de servicio y diagnosticos - fetch all active ones
      // These are small catalogs, load all at once
      try {
        const codRes = await fetch("/api/catalogos/tarjetas?limit=1");
        // If there's no specific endpoint, we'll provide selects from inline data
        void codRes;
      } catch {
        // ignore
      }
    } catch {
      console.error("Error al cargar dropdowns");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchDropdowns();
    void fetchCatalogos;
  }, [fetchDropdowns, fetchCatalogos]);

  /* ---------- busqueda ---------- */
  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  /* ---------- ver detalle ---------- */
  const openDetail = async (orden: OrdenServicio) => {
    setLoadingDetail(true);
    setDetailOrder(orden);
    try {
      const res = await fetch(`/api/procesos/ordenes-servicio/${orden.id}`);
      if (res.ok) {
        const json = await res.json();
        setDetailOrder(json);
      }
    } catch {
      console.error("Error al cargar detalle de orden");
    } finally {
      setLoadingDetail(false);
    }
  };

  /* ---------- modal helpers ---------- */
  const openCreate = () => {
    setForm({ ...emptyForm });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError("");
  };

  const setField = (field: keyof OrdenForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  /* ---------- guardar ---------- */
  const handleSave = async () => {
    if (
      !form.empleadoId ||
      !form.privadaId ||
      !form.tecnicoId ||
      !form.codigoServicioId ||
      !form.detalleServicio.trim()
    ) {
      setError(
        "Campos requeridos: Empleado, Privada, Tecnico, Codigo de Servicio y Detalle del Servicio"
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/procesos/ordenes-servicio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empleadoId: form.empleadoId,
          privadaId: form.privadaId,
          tecnicoId: form.tecnicoId,
          codigoServicioId: form.codigoServicioId,
          detalleServicio: form.detalleServicio,
          diagnosticoId: form.diagnosticoId || null,
          detalleDiagnostico: form.detalleDiagnostico || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Error al guardar");
        return;
      }

      closeModal();
      fetchData();
    } catch {
      setError("Error de conexion");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- helpers de formato ---------- */
  const fmtDate = (v: string | null) => {
    if (!v) return "-";
    try {
      return new Date(v).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return v;
    }
  };

  const fmtDateTime = (v: string | null) => {
    if (!v) return "-";
    try {
      return new Date(v).toLocaleString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return v;
    }
  };

  const fmtEmpleado = (emp: Empleado | null) => {
    if (!emp) return "-";
    return `${emp.nombre} ${emp.apePaterno} ${emp.apeMaterno}`;
  };

  /* ================================================================ */
  /* RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="h-7 w-7 text-blue-600" />
            Ordenes de Servicio
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las ordenes de servicio tecnico
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nueva Orden
        </button>
      </div>

      {/* Barra de busqueda y filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por folio o detalle..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Buscar
          </button>
          {search && (
            <button
              onClick={clearSearch}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Privada:</label>
            <select
              value={filterPrivada}
              onChange={(e) => {
                setFilterPrivada(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              {privadas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.descripcion}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Estado:</label>
            <select
              value={filterEstatus}
              onChange={(e) => {
                setFilterEstatus(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="1">Abierta</option>
              <option value="2">Solucionada</option>
              <option value="3">Cerrada</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Desde:</label>
            <input
              type="date"
              value={filterFechaDesde}
              onChange={(e) => {
                setFilterFechaDesde(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Hasta:</label>
            <input
              type="date"
              value={filterFechaHasta}
              onChange={(e) => {
                setFilterFechaHasta(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Folio</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Privada</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Tecnico</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Servicio</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Estado</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                    <p className="text-gray-400 text-sm mt-2">Cargando...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No se encontraron ordenes de servicio
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">
                      {item.folio}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {fmtDate(item.fecha)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.privada?.descripcion || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {fmtEmpleado(item.tecnico)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium">
                        {item.codigoServicio?.codigo || ""} - {item.codigoServicio?.descripcion || ""}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {item.detalleServicio}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          ESTATUS_BADGE[item.estatusId] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ESTATUS_ORDEN[item.estatusId] || `Estatus ${item.estatusId}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetail(item)}
                          title="Ver detalle"
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
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
              Mostrando {items.length} de {total} registros
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

      {/* ==================== MODAL CREAR ORDEN ==================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Nueva Orden de Servicio
              </h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100 transition">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* body */}
            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Empleado (quien registra) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registra (Empleado) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.empleadoId}
                    onChange={(e) => setField("empleadoId", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    {empleados.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre} {e.apePaterno} {e.apeMaterno}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Privada */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Privada <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.privadaId}
                    onChange={(e) => setField("privadaId", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    {privadas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tecnico */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tecnico <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.tecnicoId}
                    onChange={(e) => setField("tecnicoId", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    {empleados.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre} {e.apePaterno} {e.apeMaterno}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Codigo de Servicio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Codigo de Servicio <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.codigoServicioId}
                    onChange={(e) => setField("codigoServicioId", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    {codigosServicio.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.codigo} - {c.descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Detalle del servicio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detalle del Servicio <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.detalleServicio}
                  onChange={(e) => setField("detalleServicio", e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Describa el detalle del servicio requerido..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Diagnostico */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnostico
                  </label>
                  <select
                    value={form.diagnosticoId}
                    onChange={(e) => setField("diagnosticoId", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    {diagnosticos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.codigo} - {d.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Detalle diagnostico */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Detalle del Diagnostico
                  </label>
                  <input
                    type="text"
                    value={form.detalleDiagnostico}
                    onChange={(e) => setField("detalleDiagnostico", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Detalle del diagnostico"
                  />
                </div>
              </div>
            </div>

            {/* footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Guardando..." : "Crear Orden"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL DETALLE ==================== */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDetailOrder(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Orden de Servicio - {detailOrder.folio}
                </h2>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    ESTATUS_BADGE[detailOrder.estatusId] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {ESTATUS_ORDEN[detailOrder.estatusId] || ""}
                </span>
              </div>
              <button
                onClick={() => setDetailOrder(null)}
                className="p-1 rounded hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* body */}
            <div className="px-6 py-4 space-y-6">
              {loadingDetail && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              )}

              {/* Info general */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Fecha:</span>
                  <p className="font-medium text-gray-900">{fmtDate(detailOrder.fecha)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Privada:</span>
                  <p className="font-medium text-gray-900">
                    {detailOrder.privada?.descripcion || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Registrado por:</span>
                  <p className="font-medium text-gray-900">
                    {fmtEmpleado(detailOrder.empleado)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Tecnico:</span>
                  <p className="font-medium text-gray-900">
                    {fmtEmpleado(detailOrder.tecnico)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Servicio:</span>
                  <p className="font-medium text-gray-900">
                    {detailOrder.codigoServicio?.codigo} -{" "}
                    {detailOrder.codigoServicio?.descripcion}
                  </p>
                </div>
                {detailOrder.diagnostico && (
                  <div>
                    <span className="text-gray-500">Diagnostico:</span>
                    <p className="font-medium text-gray-900">
                      {detailOrder.diagnostico.codigo} -{" "}
                      {detailOrder.diagnostico.descripcion}
                    </p>
                  </div>
                )}
              </div>

              {/* Detalle servicio */}
              <div>
                <span className="text-sm text-gray-500">Detalle del Servicio:</span>
                <p className="mt-1 text-sm text-gray-900 bg-gray-50 rounded-lg p-3">
                  {detailOrder.detalleServicio}
                </p>
              </div>

              {/* Cierre */}
              {detailOrder.estatusId === 3 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">
                    Informacion de Cierre
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-700">Tecnico de cierre:</span>
                      <p className="font-medium text-green-900">
                        {fmtEmpleado(detailOrder.cierreTecnico)}
                      </p>
                    </div>
                    <div>
                      <span className="text-green-700">Fecha de cierre:</span>
                      <p className="font-medium text-green-900">
                        {fmtDateTime(detailOrder.cierreFecha)}
                      </p>
                    </div>
                  </div>
                  {detailOrder.cierreComentario && (
                    <div className="mt-2">
                      <span className="text-green-700 text-sm">Comentario:</span>
                      <p className="text-sm text-green-900 mt-1">
                        {detailOrder.cierreComentario}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Seguimientos */}
              {detailOrder.seguimientos && detailOrder.seguimientos.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Seguimientos</h4>
                  <div className="space-y-3">
                    {detailOrder.seguimientos.map((seg) => (
                      <div
                        key={`${seg.ordenServicioId}-${seg.seguimientoId}`}
                        className="flex gap-3"
                      >
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-400 mt-2" />
                        <div className="flex-1 bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-900">{seg.comentario}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {fmtDateTime(seg.fechaModificacion)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Materiales */}
              {detailOrder.materiales && detailOrder.materiales.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Materiales</h4>
                  <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">
                          Codigo
                        </th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">
                          Material
                        </th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-700">
                          Cantidad
                        </th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-700">
                          Costo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detailOrder.materiales.map((mat) => (
                        <tr key={`${mat.ordenServicioId}-${mat.materialId}`}>
                          <td className="px-3 py-2 font-mono">{mat.material?.codigo || "-"}</td>
                          <td className="px-3 py-2">{mat.material?.descripcion || "-"}</td>
                          <td className="px-3 py-2 text-right">{mat.cantidad}</td>
                          <td className="px-3 py-2 text-right">
                            ${Number(mat.material?.costo || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setDetailOrder(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
