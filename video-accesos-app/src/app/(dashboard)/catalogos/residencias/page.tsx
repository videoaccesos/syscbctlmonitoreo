"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Home,
  Loader2,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface Privada {
  id: number;
  descripcion: string;
}

interface Residencia {
  id: number;
  privadaId: number;
  nroCasa: string;
  calle: string;
  telefono1: string | null;
  telefono2: string | null;
  interfon: string | null;
  telefonoInterfon: string | null;
  observaciones: string | null;
  estatusId: number;
  privada: { id: number; descripcion: string };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FormData {
  privadaId: string;
  nroCasa: string;
  calle: string;
  telefono1: string;
  telefono2: string;
  interfon: string;
  telefonoInterfon: string;
  observaciones: string;
  estatusId: string;
}

const emptyForm: FormData = {
  privadaId: "",
  nroCasa: "",
  calle: "",
  telefono1: "",
  telefono2: "",
  interfon: "",
  telefonoInterfon: "",
  observaciones: "",
  estatusId: "1",
};

const ESTATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: "Interfón Activo", color: "bg-green-100 text-green-800" },
  2: { label: "Sin Interfón", color: "bg-yellow-100 text-yellow-800" },
  3: { label: "Moroso", color: "bg-red-100 text-red-800" },
  4: { label: "Sin Derechos", color: "bg-gray-100 text-gray-800" },
};

// ── Componente principal ─────────────────────────────────────────────────────

export default function ResidenciasPage() {
  // Estado de datos
  const [residencias, setResidencias] = useState<Residencia[]>([]);
  const [privadas, setPrivadas] = useState<Privada[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Filtros
  const [search, setSearch] = useState("");
  const [filterPrivadaId, setFilterPrivadaId] = useState("");
  const [page, setPage] = useState(1);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Residencia | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  // UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // ── Cargar privadas (para dropdown) ──────────────────────────────────────

  const fetchPrivadas = useCallback(async () => {
    try {
      const res = await fetch("/api/catalogos/privadas?pageSize=200&estatusId=1");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setPrivadas(json.data || []);
    } catch {
      console.error("Error al cargar privadas");
    }
  }, []);

  // ── Cargar residencias ───────────────────────────────────────────────────

  const fetchResidencias = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });
      if (search) params.set("search", search);
      if (filterPrivadaId) params.set("privadaId", filterPrivadaId);

      const res = await fetch(`/api/catalogos/residencias?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setResidencias(json.data || []);
      setPagination(
        json.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 }
      );
    } catch {
      setError("Error al cargar residencias");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterPrivadaId]);

  useEffect(() => {
    fetchPrivadas();
  }, [fetchPrivadas]);

  useEffect(() => {
    fetchResidencias();
  }, [fetchResidencias]);

  // ── Búsqueda con debounce implícito ──────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterPrivadaChange = (value: string) => {
    setFilterPrivadaId(value);
    setPage(1);
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (r: Residencia) => {
    setEditing(r);
    setForm({
      privadaId: String(r.privadaId),
      nroCasa: r.nroCasa,
      calle: r.calle,
      telefono1: r.telefono1 || "",
      telefono2: r.telefono2 || "",
      interfon: r.interfon || "",
      telefonoInterfon: r.telefonoInterfon || "",
      observaciones: r.observaciones || "",
      estatusId: String(r.estatusId),
    });
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setError("");
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.privadaId || !form.nroCasa.trim() || !form.calle.trim()) {
      setError("Privada, número de casa y calle son requeridos");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editing
        ? `/api/catalogos/residencias/${editing.id}`
        : "/api/catalogos/residencias";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Error al guardar");
      }

      closeModal();
      fetchResidencias();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/catalogos/residencias/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setDeleteConfirm(null);
      fetchResidencias();
    } catch {
      setError("Error al eliminar residencia");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Residencias</h1>
          <p className="text-gray-500 mt-1">
            Administración de residencias por privada
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </div>

      {/* Error global */}
      {error && !modalOpen && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por # casa o calle..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Filtro por privada */}
          <div className="sm:w-64">
            <select
              value={filterPrivadaId}
              onChange={(e) => handleFilterPrivadaChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">Todas las privadas</option>
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  #Casa
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Calle
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Privada
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Interfon
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Teléfono
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  Estado
                </th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                    <p className="text-gray-400 mt-2 text-sm">Cargando...</p>
                  </td>
                </tr>
              ) : residencias.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Home className="h-8 w-8 text-gray-300 mx-auto" />
                    <p className="text-gray-400 mt-2">
                      No se encontraron residencias
                    </p>
                  </td>
                </tr>
              ) : (
                residencias.map((r) => {
                  const estatus = ESTATUS_MAP[r.estatusId] || {
                    label: "Desconocido",
                    color: "bg-gray-100 text-gray-800",
                  };
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {r.nroCasa}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.calle}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.privada?.descripcion || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.interfon || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.telefono1 || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estatus.color}`}
                        >
                          {estatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {deleteConfirm === r.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(r.id)}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition"
                              >
                                Sí
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(r.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Mostrando{" "}
              <span className="font-medium">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              a{" "}
              <span className="font-medium">
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total
                )}
              </span>{" "}
              de <span className="font-medium">{pagination.total}</span>{" "}
              resultados
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page >= pagination.totalPages}
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />

          {/* Contenido */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? "Editar Residencia" : "Nueva Residencia"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body del modal */}
            <div className="px-6 py-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Privada */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Privada <span className="text-red-500">*</span>
                </label>
                <select
                  name="privadaId"
                  value={form.privadaId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">Seleccionar privada...</option>
                  {privadas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nro Casa y Calle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    # Casa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nroCasa"
                    value={form.nroCasa}
                    onChange={handleChange}
                    maxLength={10}
                    placeholder="Ej: 101"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calle <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="calle"
                    value={form.calle}
                    onChange={handleChange}
                    maxLength={60}
                    placeholder="Nombre de la calle"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Teléfonos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono 1
                  </label>
                  <input
                    type="text"
                    name="telefono1"
                    value={form.telefono1}
                    onChange={handleChange}
                    maxLength={14}
                    placeholder="(000) 000-0000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono 2
                  </label>
                  <input
                    type="text"
                    name="telefono2"
                    value={form.telefono2}
                    onChange={handleChange}
                    maxLength={14}
                    placeholder="(000) 000-0000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Interfon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interfon
                  </label>
                  <input
                    type="text"
                    name="interfon"
                    value={form.interfon}
                    onChange={handleChange}
                    maxLength={20}
                    placeholder="Número de interfon"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono Interfon
                  </label>
                  <input
                    type="text"
                    name="telefonoInterfon"
                    value={form.telefonoInterfon}
                    onChange={handleChange}
                    maxLength={14}
                    placeholder="(000) 000-0000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  name="estatusId"
                  value={form.estatusId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="1">Interfón Activo</option>
                  <option value="2">Sin Interfón</option>
                  <option value="3">Moroso</option>
                  <option value="4">Sin Derechos</option>
                </select>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  name="observaciones"
                  value={form.observaciones}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Notas adicionales..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Footer del modal */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Guardar Cambios" : "Crear Residencia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
