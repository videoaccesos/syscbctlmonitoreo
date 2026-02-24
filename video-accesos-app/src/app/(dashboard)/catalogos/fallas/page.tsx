"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";

/* ---------- tipos ---------- */
interface Falla {
  id: number;
  codigo: string;
  descripcion: string;
  estatusId: number;
}

interface ApiResponse {
  data: Falla[];
  total: number;
  page: number;
  limit: number;
}

const emptyForm = { codigo: "", descripcion: "" };
type FormData = typeof emptyForm;

/* ================================================================ */

export default function FallasPage() {
  /* ---------- state ---------- */
  const [items, setItems] = useState<Falla[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Falla | null>(null);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // confirmacion eliminar
  const [deleteTarget, setDeleteTarget] = useState<Falla | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---------- fetch ---------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/catalogos/fallas?${params}`);
      if (!res.ok) throw new Error("Error al obtener fallas");
      const json: ApiResponse = await res.json();
      setItems(json.data);
      setTotal(json.total);
      setTotalPages(Math.ceil(json.total / pageSize) || 1);
    } catch {
      console.error("Error al cargar fallas");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

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
    setShowModal(true);
  };

  const openEdit = (item: Falla) => {
    setEditing(item);
    setForm({
      codigo: item.codigo || "",
      descripcion: item.descripcion || "",
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setError("");
  };

  /* ---------- guardar (crear / editar) ---------- */
  const handleSave = async () => {
    if (!form.codigo.trim()) {
      setError("El codigo es requerido");
      return;
    }
    if (!form.descripcion.trim()) {
      setError("La descripcion es requerida");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editing
        ? `/api/catalogos/fallas/${editing.id}`
        : "/api/catalogos/fallas";

      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: form.codigo.trim(),
          descripcion: form.descripcion.trim(),
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

  /* ---------- eliminar ---------- */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/catalogos/fallas/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Error al eliminar");
        return;
      }

      setDeleteTarget(null);
      fetchData();
    } catch {
      alert("Error de conexion al eliminar");
    } finally {
      setDeleting(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Fallas</h1>
          <p className="text-sm text-gray-500">Administracion del catalogo de fallas</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </div>

      {/* Barra de busqueda */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por codigo o descripcion..."
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
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-16">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-32">Codigo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Descripcion</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700 w-28">Estado</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700 w-28">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    Cargando...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    No se encontraron fallas
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-500">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">
                      {item.codigo}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {item.descripcion}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.estatusId === 1
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.estatusId === 1 ? "Activo" : "Baja"}
                      </span>
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
                          onClick={() => setDeleteTarget(item)}
                          title="Eliminar"
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

      {/* ==================== MODAL CREAR / EDITAR ==================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? "Editar Falla" : "Nueva Falla"}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Codigo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={form.codigo}
                  onChange={(e) => setField("codigo", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Codigo de la falla"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripcion <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={form.descripcion}
                  onChange={(e) => setField("descripcion", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descripcion de la falla"
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
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando..." : editing ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CONFIRMAR ELIMINAR ==================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar eliminacion</h3>
            <p className="text-sm text-gray-600 mb-6">
              Se dara de baja la falla{" "}
              <span className="font-semibold">&quot;{deleteTarget.codigo} - {deleteTarget.descripcion}&quot;</span>.
              Esta accion se puede revertir desde la base de datos.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
