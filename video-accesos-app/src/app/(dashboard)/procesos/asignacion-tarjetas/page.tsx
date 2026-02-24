"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  XCircle,
} from "lucide-react";

/* ---------- tipos ---------- */
interface Privada {
  id: number;
  descripcion: string;
}

interface Residencia {
  id: number;
  nroCasa: string;
  calle: string;
  privada: Privada;
}

interface Residente {
  id: number;
  nombre: string;
  apePaterno: string;
  apeMaterno: string;
  residencia: Residencia;
}

interface Tarjeta {
  id: number;
  lectura: string;
  tipoId: number;
  estatusId: number;
}

interface Asignacion {
  id: number;
  tarjetaId: number;
  residenteId: number;
  tarjetaSecId: number | null;
  fecha: string;
  fechaVencimiento: string | null;
  tipoLectura: number | null;
  lecturaEpc: string | null;
  folioContrato: string | null;
  precio: number | null;
  estatusId: number;
  tarjeta: Tarjeta;
  residente: Residente;
}

interface ResidenteSearch {
  id: number;
  nombre: string;
  apePaterno: string;
  apeMaterno: string;
  celular: string | null;
  email: string | null;
  residencia: {
    id: number;
    nroCasa: string;
    calle: string;
    privada: Privada;
  };
}

interface AsignacionForm {
  tarjetaId: string;
  residenteId: string;
  tarjetaSecId: string;
  fechaVencimiento: string;
  tipoLectura: string;
  lecturaEpc: string;
  folioContrato: string;
  precio: string;
}

const emptyForm: AsignacionForm = {
  tarjetaId: "",
  residenteId: "",
  tarjetaSecId: "",
  fechaVencimiento: "",
  tipoLectura: "",
  lecturaEpc: "",
  folioContrato: "",
  precio: "",
};

/* ---------- constantes ---------- */
const ESTATUS_ASIGNACION: Record<number, string> = {
  1: "Activa",
  2: "Cancelada",
};

const ESTATUS_BADGE: Record<number, string> = {
  1: "bg-green-100 text-green-700",
  2: "bg-red-100 text-red-700",
};

const TIPO_TARJETA: Record<number, string> = {
  1: "Peatonal",
  2: "Vehicular",
};

/* ================================================================ */

export default function AsignacionTarjetasPage() {
  /* ---------- state ---------- */
  const [items, setItems] = useState<Asignacion[]>([]);
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
  const [privadas, setPrivadas] = useState<Privada[]>([]);

  // modal crear
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AsignacionForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // tarjetas disponibles (para el dropdown)
  const [tarjetasDisponibles, setTarjetasDisponibles] = useState<Tarjeta[]>([]);
  const [loadingTarjetas, setLoadingTarjetas] = useState(false);

  // busqueda de residentes
  const [residenteSearch, setResidenteSearch] = useState("");
  const [residenteResults, setResidenteResults] = useState<ResidenteSearch[]>([]);
  const [selectedResidente, setSelectedResidente] = useState<ResidenteSearch | null>(null);
  const [searchingResidentes, setSearchingResidentes] = useState(false);

  // cancelar asignacion
  const [cancelTarget, setCancelTarget] = useState<Asignacion | null>(null);
  const [cancelling, setCancelling] = useState(false);

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

      const res = await fetch(`/api/procesos/asignacion-tarjetas?${params}`);
      if (!res.ok) throw new Error("Error al obtener asignaciones");
      const json = await res.json();
      setItems(json.data);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch {
      console.error("Error al cargar asignaciones");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterPrivada, filterEstatus]);

  const fetchPrivadas = useCallback(async () => {
    try {
      const res = await fetch("/api/catalogos/privadas?limit=200");
      if (!res.ok) return;
      const json = await res.json();
      setPrivadas(json.data || json);
    } catch {
      console.error("Error al cargar privadas");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchPrivadas();
  }, [fetchPrivadas]);

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

  /* ---------- tarjetas disponibles ---------- */
  const fetchTarjetasDisponibles = async () => {
    setLoadingTarjetas(true);
    try {
      const res = await fetch("/api/catalogos/tarjetas?estatusId=1&limit=500");
      if (!res.ok) return;
      const json = await res.json();
      setTarjetasDisponibles(json.data || []);
    } catch {
      console.error("Error al cargar tarjetas disponibles");
    } finally {
      setLoadingTarjetas(false);
    }
  };

  /* ---------- busqueda de residentes ---------- */
  const searchResidentes = async (query: string) => {
    if (query.length < 2) {
      setResidenteResults([]);
      return;
    }
    setSearchingResidentes(true);
    try {
      const res = await fetch(
        `/api/catalogos/residencias?search=${encodeURIComponent(query)}&limit=20`
      );
      if (!res.ok) return;
      const json = await res.json();
      // Flatten residentes from residencias
      const residentes: ResidenteSearch[] = [];
      const residencias = json.data || json;
      for (const residencia of residencias) {
        if (residencia.residentes) {
          for (const residente of residencia.residentes) {
            residentes.push({
              ...residente,
              residencia: {
                id: residencia.id,
                nroCasa: residencia.nroCasa,
                calle: residencia.calle,
                privada: residencia.privada,
              },
            });
          }
        }
      }
      setResidenteResults(residentes);
    } catch {
      console.error("Error al buscar residentes");
    } finally {
      setSearchingResidentes(false);
    }
  };

  /* ---------- modal helpers ---------- */
  const openCreate = () => {
    setForm({ ...emptyForm });
    setSelectedResidente(null);
    setResidenteSearch("");
    setResidenteResults([]);
    setError("");
    fetchTarjetasDisponibles();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError("");
  };

  const setField = (field: keyof AsignacionForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const selectResidente = (residente: ResidenteSearch) => {
    setSelectedResidente(residente);
    setForm((prev) => ({ ...prev, residenteId: String(residente.id) }));
    setResidenteResults([]);
    setResidenteSearch(
      `${residente.apePaterno} ${residente.apeMaterno} ${residente.nombre}`
    );
  };

  /* ---------- guardar ---------- */
  const handleSave = async () => {
    if (!form.tarjetaId) {
      setError("Debe seleccionar una tarjeta");
      return;
    }
    if (!form.residenteId) {
      setError("Debe seleccionar un residente");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/procesos/asignacion-tarjetas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tarjetaId: form.tarjetaId,
          residenteId: form.residenteId,
          tarjetaSecId: form.tarjetaSecId || null,
          fechaVencimiento: form.fechaVencimiento || null,
          tipoLectura: form.tipoLectura || null,
          lecturaEpc: form.lecturaEpc || null,
          folioContrato: form.folioContrato || null,
          precio: form.precio || null,
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

  /* ---------- cancelar asignacion ---------- */
  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);

    try {
      const res = await fetch(
        `/api/procesos/asignacion-tarjetas/${cancelTarget.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Error al cancelar asignacion");
        return;
      }

      setCancelTarget(null);
      fetchData();
    } catch {
      alert("Error de conexion al cancelar");
    } finally {
      setCancelling(false);
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

  /* ================================================================ */
  /* RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-blue-600" />
            Asignacion de Tarjetas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona la asignacion de tarjetas de acceso a residentes
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nueva Asignacion
        </button>
      </div>

      {/* Barra de busqueda y filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre de residente..."
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

        <div className="flex gap-4">
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
              <option value="1">Activa</option>
              <option value="2">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Tarjeta</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Residente</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Privada</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">#Casa</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Fecha Asignacion</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Vencimiento</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Estado</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                    <p className="text-gray-400 text-sm mt-2">Cargando...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No se encontraron asignaciones
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-mono font-medium text-gray-900">
                        {item.tarjeta.lectura}
                      </div>
                      <div className="text-xs text-gray-500">
                        {TIPO_TARJETA[item.tarjeta.tipoId] || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.residente.apePaterno} {item.residente.apeMaterno}{" "}
                      {item.residente.nombre}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.residente.residencia?.privada?.descripcion || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {item.residente.residencia?.nroCasa || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {fmtDate(item.fecha)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {fmtDate(item.fechaVencimiento)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          ESTATUS_BADGE[item.estatusId] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ESTATUS_ASIGNACION[item.estatusId] || `Estatus ${item.estatusId}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {item.estatusId === 1 && (
                          <button
                            onClick={() => setCancelTarget(item)}
                            title="Cancelar asignacion"
                            className="p-1.5 rounded hover:bg-red-50 text-red-600 transition"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
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

      {/* ==================== MODAL CREAR ASIGNACION ==================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Nueva Asignacion de Tarjeta
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

              {/* Tarjeta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tarjeta <span className="text-red-500">*</span>
                </label>
                {loadingTarjetas ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando tarjetas...
                  </div>
                ) : (
                  <select
                    value={form.tarjetaId}
                    onChange={(e) => setField("tarjetaId", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar tarjeta disponible...</option>
                    {tarjetasDisponibles.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.lectura} ({TIPO_TARJETA[t.tipoId] || `Tipo ${t.tipoId}`})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Residente (busqueda) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Residente <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por nombre de residente..."
                    value={residenteSearch}
                    onChange={(e) => {
                      setResidenteSearch(e.target.value);
                      setSelectedResidente(null);
                      setForm((prev) => ({ ...prev, residenteId: "" }));
                      searchResidentes(e.target.value);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchingResidentes && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}

                  {/* Resultados de busqueda */}
                  {residenteResults.length > 0 && !selectedResidente && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {residenteResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => selectResidente(r)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            {r.apePaterno} {r.apeMaterno} {r.nombre}
                          </div>
                          <div className="text-xs text-gray-500">
                            {r.residencia?.privada?.descripcion || ""} - Casa #{r.residencia?.nroCasa || ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Residente seleccionado */}
                {selectedResidente && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <div className="font-medium text-blue-900">
                      {selectedResidente.apePaterno} {selectedResidente.apeMaterno}{" "}
                      {selectedResidente.nombre}
                    </div>
                    <div className="text-blue-700">
                      {selectedResidente.residencia?.privada?.descripcion || ""} - Casa #
                      {selectedResidente.residencia?.nroCasa || ""}
                    </div>
                  </div>
                )}
              </div>

              {/* Campos opcionales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={form.fechaVencimiento}
                    onChange={(e) => setField("fechaVencimiento", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Lectura
                  </label>
                  <select
                    value={form.tipoLectura}
                    onChange={(e) => setField("tipoLectura", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="1">TID</option>
                    <option value="2">EPC</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lectura EPC
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={form.lecturaEpc}
                    onChange={(e) => setField("lecturaEpc", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Lectura EPC de la tarjeta"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Folio de Contrato
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={form.folioContrato}
                    onChange={(e) => setField("folioContrato", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Folio del contrato"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.precio}
                  onChange={(e) => setField("precio", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
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
                {saving ? "Guardando..." : "Asignar Tarjeta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CONFIRMAR CANCELACION ==================== */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCancelTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmar Cancelacion
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Se cancelara la asignacion de la tarjeta{" "}
              <span className="font-semibold">
                &quot;{cancelTarget.tarjeta.lectura}&quot;
              </span>{" "}
              al residente{" "}
              <span className="font-semibold">
                {cancelTarget.residente.nombre} {cancelTarget.residente.apePaterno}
              </span>
              . La tarjeta quedara disponible nuevamente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                No, mantener
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                {cancelling ? "Cancelando..." : "Cancelar Asignacion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
