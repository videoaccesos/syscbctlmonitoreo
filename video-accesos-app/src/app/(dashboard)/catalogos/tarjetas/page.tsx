"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";

/* ---------- tipos ---------- */
interface Privada {
  id: number;
  descripcion: string;
}

interface Tarjeta {
  id: number;
  lectura: string;
  numeroSerie: string | null;
  tipoId: number;
  estatusId: number;
  observaciones: string | null;
  fecha: string | null;
  privadaAsignada: { id: number; descripcion: string } | null;
  residenciaAsignada: { id: number; nroCasa: string; calle: string } | null;
  residenteAsignado: { id: string; nombre: string } | null;
}

interface ApiResponse {
  data: Tarjeta[];
  total: number;
  page: number;
  limit: number;
}

/* ---------- constantes ---------- */
const TIPOS: Record<number, string> = {
  1: "Peatonal",
  2: "Vehicular",
};

const ESTATUS: Record<number, string> = {
  1: "Disponible",
  2: "Asignada",
  3: "Danada",
  4: "Consignacion",
  5: "Baja",
};

const ESTATUS_BADGE: Record<number, string> = {
  1: "bg-green-100 text-green-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-red-100 text-red-700",
  4: "bg-yellow-100 text-yellow-700",
  5: "bg-gray-100 text-gray-700",
};

// Estados a los que se puede cambiar manualmente (nunca a "Asignada")
const ESTATUS_EDITABLES: Record<number, number[]> = {
  1: [3, 4, 5],       // Disponible -> Danada, Consignacion, Baja
  2: [3, 4, 5],       // Asignada -> Danada, Consignacion, Baja (cancela asignacion automaticamente)
  3: [1],             // Danada -> Disponible
  4: [1],             // Consignacion -> Disponible
  5: [1],             // Baja -> Disponible
};

const emptyForm = { lectura: "", numeroSerie: "", tipoId: "1", estatusId: "", observaciones: "" };
type FormData = typeof emptyForm;

/* ================================================================ */

export default function TarjetasPage() {
  /* ---------- state ---------- */
  const [items, setItems] = useState<Tarjeta[]>([]);
  const [privadas, setPrivadas] = useState<Privada[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);

  // filtros
  const [filterEstatus, setFilterEstatus] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterPrivadaId, setFilterPrivadaId] = useState("");

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tarjeta | null>(null);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // confirmacion eliminar
  const [deleteTarget, setDeleteTarget] = useState<Tarjeta | null>(null);
  const [deleteObservaciones, setDeleteObservaciones] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // sorting
  const [sortBy, setSortBy] = useState("fecha");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  /* ---------- sort handler ---------- */
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  /* ---------- fetch privadas ---------- */
  const fetchPrivadas = useCallback(async () => {
    try {
      const res = await fetch("/api/catalogos/privadas?pageSize=200&estatusId=1");
      if (!res.ok) return;
      const json = await res.json();
      setPrivadas(json.data || []);
    } catch {
      console.error("Error al cargar privadas");
    }
  }, []);

  useEffect(() => {
    fetchPrivadas();
  }, [fetchPrivadas]);

  /* ---------- fetch ---------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (search) params.set("search", search);
      if (filterEstatus) params.set("estatusId", filterEstatus);
      if (filterTipo) params.set("tipoId", filterTipo);
      if (filterPrivadaId) params.set("privadaId", filterPrivadaId);
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);

      const res = await fetch(`/api/catalogos/tarjetas?${params}`);
      if (!res.ok) throw new Error("Error al obtener tarjetas");
      const json: ApiResponse = await res.json();
      setItems(json.data);
      setTotal(json.total);
      setTotalPages(Math.ceil(json.total / pageSize) || 1);
    } catch {
      console.error("Error al cargar tarjetas");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterEstatus, filterTipo, filterPrivadaId, sortBy, sortDir]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    setFilterEstatus("");
    setFilterTipo("");
    setFilterPrivadaId("");
    setPage(1);
  };

  /* ---------- form field helper ---------- */
  const setField = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  /* ---------- modal helpers ---------- */
  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setError("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const openEdit = (item: Tarjeta) => {
    setEditing(item);
    setForm({
      lectura: item.lectura || "",
      numeroSerie: item.numeroSerie || "",
      tipoId: String(item.tipoId),
      estatusId: String(item.estatusId),
      observaciones: item.observaciones || "",
    });
    setError("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setError("");
    setSuccessMsg("");
  };

  /* ---------- guardar (crear / editar) ---------- */
  const handleSave = async () => {
    if (!form.lectura.trim()) {
      setError("La lectura es requerida");
      return;
    }
    if (!form.tipoId) {
      setError("El tipo es requerido");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const url = editing
        ? `/api/catalogos/tarjetas/${editing.id}`
        : "/api/catalogos/tarjetas";

      const payload: Record<string, unknown> = {
        lectura: form.lectura.trim(),
        numeroSerie: form.numeroSerie.trim() || null,
        tipoId: parseInt(form.tipoId, 10),
      };

      if (editing) {
        payload.estatusId = parseInt(form.estatusId, 10);
        payload.observaciones = form.observaciones.trim();
      }

      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Error al guardar");
        return;
      }

      // Mostrar mensaje si se cancelaron asignaciones
      if (json.asignacionesCanceladas > 0) {
        setSuccessMsg(
          `Tarjeta actualizada. Se cancelaron ${json.asignacionesCanceladas} asignacion(es) automaticamente.`
        );
        // No cerrar modal inmediatamente para que vea el mensaje
        fetchData();
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

  /* ---------- eliminar (dar de baja) ---------- */
  const handleDelete = async () => {
    if (!deleteTarget) return;

    if (!deleteObservaciones.trim()) {
      setDeleteError("Debe indicar el motivo para dar de baja la tarjeta");
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/catalogos/tarjetas/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observaciones: deleteObservaciones.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setDeleteError(json.error || "Error al eliminar");
        return;
      }

      setDeleteTarget(null);
      setDeleteObservaciones("");
      setDeleteError("");
      fetchData();
    } catch {
      setDeleteError("Error de conexion al eliminar");
    } finally {
      setDeleting(false);
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

  const hasFilters = search || filterEstatus || filterTipo || filterPrivadaId;

  // Opciones de estado disponibles al editar
  const estatusDisponibles = editing
    ? ESTATUS_EDITABLES[editing.estatusId] || []
    : [];

  // Si el estado cambio respecto al original
  const estadoCambio = editing
    ? parseInt(form.estatusId, 10) !== editing.estatusId
    : false;

  // Requiere observaciones si cambia a 3/4/5
  const requiereObservaciones = estadoCambio && [3, 4, 5].includes(parseInt(form.estatusId, 10));

  /* ================================================================ */
  /* RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarjetas</h1>
          <p className="text-sm text-gray-700">Administracion del catalogo de tarjetas de acceso</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </div>

      {/* Barra de busqueda y filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        {/* Busqueda */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
            <input
              type="text"
              placeholder="Buscar por lectura..."
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
          {hasFilters && (
            <button
              onClick={clearSearch}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-4 flex-wrap">
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
              <option value="">Todas</option>
              <option value="1">Disponible</option>
              <option value="2">Asignada</option>
              <option value="3">Danada</option>
              <option value="4">Consignacion</option>
              <option value="5">Baja</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Tipo:</label>
            <select
              value={filterTipo}
              onChange={(e) => {
                setFilterTipo(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="1">Peatonal</option>
              <option value="2">Vehicular</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Privada:</label>
            <select
              value={filterPrivadaId}
              onChange={(e) => {
                setFilterPrivadaId(e.target.value);
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
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-12">#</th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort("lectura")}
                >
                  <span className="inline-flex items-center gap-1">
                    Lectura
                    {sortBy === "lectura" ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕"}
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort("numeroSerie")}
                >
                  <span className="inline-flex items-center gap-1">
                    Nro. Serie
                    {sortBy === "numeroSerie" ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕"}
                  </span>
                </th>
                <th
                  className="text-center px-4 py-3 font-semibold text-gray-700 w-24 cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort("tipoId")}
                >
                  <span className="inline-flex items-center gap-1">
                    Tipo
                    {sortBy === "tipoId" ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕"}
                  </span>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Privada</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Residencia</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Residente</th>
                <th
                  className="text-center px-4 py-3 font-semibold text-gray-700 w-28 cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort("estatusId")}
                >
                  <span className="inline-flex items-center gap-1">
                    Estado
                    {sortBy === "estatusId" ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕"}
                  </span>
                </th>
                <th
                  className="text-center px-4 py-3 font-semibold text-gray-700 w-28 cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort("fecha")}
                >
                  <span className="inline-flex items-center gap-1">
                    Fecha
                    {sortBy === "fecha" ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕"}
                  </span>
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700 w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-600">
                    Cargando...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-600">
                    No se encontraron tarjetas
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-700">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">
                      {item.lectura}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.numeroSerie || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {TIPOS[item.tipoId] || `Tipo ${item.tipoId}`}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.privadaAsignada ? item.privadaAsignada.descripcion : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.residenciaAsignada
                        ? `#${item.residenciaAsignada.nroCasa} ${item.residenciaAsignada.calle}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.residenteAsignado ? item.residenteAsignado.nombre : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          ESTATUS_BADGE[item.estatusId] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {ESTATUS[item.estatusId] || `Estatus ${item.estatusId}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {fmtDate(item.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          title="Editar"
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(item);
                            setDeleteObservaciones("");
                            setDeleteError("");
                          }}
                          title="Dar de baja"
                          className="p-1.5 rounded hover:bg-red-50 text-red-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="px-2 py-1.5 rounded border border-gray-300 text-xs text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Primera
              </button>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {(() => {
                const tp = totalPages;
                const pages: (number | string)[] = [];
                if (tp <= 7) {
                  for (let i = 1; i <= tp; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (page > 3) pages.push("...");
                  for (let i = Math.max(2, page - 1); i <= Math.min(tp - 1, page + 1); i++) {
                    pages.push(i);
                  }
                  if (page < tp - 2) pages.push("...");
                  pages.push(tp);
                }
                return pages.map((p, idx) =>
                  typeof p === "string" ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="px-2 py-1.5 rounded border border-gray-300 text-xs text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Ultima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== MODAL CREAR / EDITAR ==================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? "Editar Tarjeta" : "Nueva Tarjeta"}
              </h2>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100 transition">
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            {/* body */}
            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
                  {successMsg}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lectura <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={form.lectura}
                  onChange={(e) => setField("lectura", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Numero de lectura de la tarjeta"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numero de Serie
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={form.numeroSerie}
                  onChange={(e) => setField("numeroSerie", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Numero de serie de la tarjeta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.tipoId}
                  onChange={(e) => setField("tipoId", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1">Peatonal</option>
                  <option value="2">Vehicular</option>
                </select>
              </div>

              {/* Estado - solo visible al editar */}
              {editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={form.estatusId}
                    onChange={(e) => setField("estatusId", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {/* Estado actual siempre visible */}
                    <option value={String(editing.estatusId)}>
                      {ESTATUS[editing.estatusId]} (actual)
                    </option>
                    {/* Estados disponibles para transicion */}
                    {estatusDisponibles.map((est) => (
                      <option key={est} value={String(est)}>
                        {ESTATUS[est]}
                      </option>
                    ))}
                  </select>
                  {editing.estatusId === 2 && estadoCambio && (
                    <p className="mt-1 text-xs text-amber-600">
                      Al cambiar el estado se cancelaran automaticamente las asignaciones activas de esta tarjeta.
                    </p>
                  )}
                </div>
              )}

              {/* Observaciones - visible al editar, requerido si cambia estado a 3/4/5 */}
              {editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones {requiereObservaciones && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    maxLength={200}
                    rows={3}
                    value={form.observaciones}
                    onChange={(e) => setField("observaciones", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder={
                      requiereObservaciones
                        ? "Indique el motivo del cambio de estado (requerido)"
                        : "Observaciones adicionales (opcional)"
                    }
                  />
                  <p className="mt-0.5 text-xs text-gray-400">{form.observaciones.length}/200</p>
                </div>
              )}
            </div>

            {/* footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                {successMsg ? "Cerrar" : "Cancelar"}
              </button>
              {!successMsg && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== CONFIRMAR ELIMINAR (BAJA) ==================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Dar de baja tarjeta</h3>
            <p className="text-sm text-gray-600 mb-4">
              Se dara de baja la tarjeta{" "}
              <span className="font-semibold">&quot;{deleteTarget.lectura}&quot;</span>.
              {deleteTarget.estatusId === 2 && (
                <span className="block mt-1 text-amber-600 font-medium">
                  Esta tarjeta esta asignada. Se cancelaran automaticamente las asignaciones activas.
                </span>
              )}
            </p>

            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                {deleteError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo <span className="text-red-500">*</span>
              </label>
              <textarea
                maxLength={200}
                rows={3}
                value={deleteObservaciones}
                onChange={(e) => setDeleteObservaciones(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                placeholder="Indique el motivo para dar de baja esta tarjeta"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteObservaciones("");
                  setDeleteError("");
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Procesando..." : "Dar de Baja"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
