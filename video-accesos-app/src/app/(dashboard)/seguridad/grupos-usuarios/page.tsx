"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UsuarioBasico {
  id: number;
  usuario: string;
  estatusId: number;
  empleado: {
    nombre: string;
    apePaterno: string;
    apeMaterno: string;
  } | null;
}

interface GrupoUsuario {
  id: number;
  nombre: string;
  estatusId: number;
  _count: {
    detalles: number;
  };
}

interface GrupoDetalle {
  grupoUsuarioId: number;
  usuarioId: number;
  usuario: UsuarioBasico;
}

interface GrupoConDetalles extends GrupoUsuario {
  detalles: GrupoDetalle[];
}

interface GrupoForm {
  nombre: string;
  usuarioIds: number[];
}

const emptyForm: GrupoForm = {
  nombre: "",
  usuarioIds: [],
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function GruposUsuariosPage() {
  // Data state
  const [grupos, setGrupos] = useState<GrupoUsuario[]>([]);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<UsuarioBasico[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // UI state
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingGrupo, setDeletingGrupo] = useState<GrupoUsuario | null>(null);
  const [form, setForm] = useState<GrupoForm>(emptyForm);
  const [error, setError] = useState("");

  // -----------------------------------------------------------
  // Fetch grupos
  // -----------------------------------------------------------
  const fetchGrupos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/seguridad/grupos-usuarios?${params}`);
      if (!res.ok) throw new Error("Error al obtener grupos");
      const json = await res.json();
      setGrupos(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch {
      console.error("Error al cargar grupos");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // -----------------------------------------------------------
  // Fetch usuarios disponibles (for checkbox list)
  // -----------------------------------------------------------
  const fetchUsuarios = useCallback(async () => {
    try {
      const res = await fetch("/api/seguridad/usuarios?pageSize=1000");
      if (!res.ok) return;
      const json = await res.json();
      // Filtrar solo activos
      const activos = (json.data || []).filter(
        (u: UsuarioBasico) => u.estatusId === 1
      );
      setUsuariosDisponibles(activos);
    } catch {
      console.error("Error al cargar usuarios");
    }
  }, []);

  useEffect(() => {
    fetchGrupos();
  }, [fetchGrupos]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // -----------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = async (grupo: GrupoUsuario) => {
    setEditingId(grupo.id);
    setError("");

    // Fetch full grupo details to get assigned users
    try {
      const res = await fetch(`/api/seguridad/grupos-usuarios/${grupo.id}`);
      if (!res.ok) throw new Error("Error");
      const data: GrupoConDetalles = await res.json();
      setForm({
        nombre: data.nombre,
        usuarioIds: data.detalles.map((d) => d.usuario.id),
      });
    } catch {
      setForm({
        nombre: grupo.nombre,
        usuarioIds: [],
      });
    }

    setModalOpen(true);
  };

  const openDeleteModal = (grupo: GrupoUsuario) => {
    setDeletingGrupo(grupo);
    setDeleteModalOpen(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const target = e.target;
    setForm((prev) => ({ ...prev, [target.name]: target.value }));
  };

  const handleUsuarioToggle = (usuarioId: number) => {
    setForm((prev) => {
      const exists = prev.usuarioIds.includes(usuarioId);
      return {
        ...prev,
        usuarioIds: exists
          ? prev.usuarioIds.filter((id) => id !== usuarioId)
          : [...prev.usuarioIds, usuarioId],
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.nombre.trim()) {
      setError("El nombre del grupo es requerido.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        usuarioIds: form.usuarioIds,
      };

      const url = editingId
        ? `/api/seguridad/grupos-usuarios/${editingId}`
        : "/api/seguridad/grupos-usuarios";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar grupo");
        return;
      }

      // If creating, and we have usuarioIds, update them via PUT
      if (!editingId && form.usuarioIds.length > 0) {
        const created = await res.json();
        await fetch(`/api/seguridad/grupos-usuarios/${created.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre,
            usuarioIds: form.usuarioIds,
          }),
        });
      }

      setModalOpen(false);
      fetchGrupos();
    } catch {
      setError("Error de conexion al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGrupo) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/seguridad/grupos-usuarios/${deletingGrupo.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al dar de baja al grupo");
        return;
      }

      setDeleteModalOpen(false);
      setDeletingGrupo(null);
      fetchGrupos();
    } catch {
      setError("Error de conexion al eliminar");
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" />
            Grupos de Usuarios
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Gestiona los grupos de usuarios y sus asignaciones
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre de grupo..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nombre del Grupo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Usuarios
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                    <p className="text-gray-400 text-sm mt-2">Cargando...</p>
                  </td>
                </tr>
              ) : grupos.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-12 text-gray-400 text-sm"
                  >
                    No se encontraron grupos
                  </td>
                </tr>
              ) : (
                grupos.map((grupo) => (
                  <tr key={grupo.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {grupo.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20 ring-inset">
                        {grupo._count.detalles} usuario{grupo._count.detalles !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {grupo.estatusId === 1 ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/20 ring-inset">
                          Baja
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(grupo)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {grupo.estatusId === 1 && (
                          <button
                            onClick={() => openDeleteModal(grupo)}
                            className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
                            title="Dar de baja"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-600">
              Mostrando{" "}
              <span className="font-medium">
                {(page - 1) * pageSize + 1}
              </span>{" "}
              -{" "}
              <span className="font-medium">
                {Math.min(page * pageSize, total)}
              </span>{" "}
              de <span className="font-medium">{total}</span> grupos
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-sm text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Create / Edit Modal                                                */}
      {/* ================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setModalOpen(false)}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Editar Grupo" : "Agregar Grupo"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Grupo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleFormChange}
                  maxLength={50}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Usuarios checkbox list */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuarios Asignados
                </label>
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto p-2 space-y-1">
                  {usuariosDisponibles.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      No hay usuarios disponibles
                    </p>
                  ) : (
                    usuariosDisponibles.map((usr) => (
                      <label
                        key={usr.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.usuarioIds.includes(usr.id)}
                          onChange={() => handleUsuarioToggle(usr.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-900 font-medium">
                          {usr.usuario}
                        </span>
                        {usr.empleado && (
                          <span className="text-gray-500">
                            - {usr.empleado.nombre} {usr.empleado.apePaterno}
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {form.usuarioIds.length} usuario{form.usuarioIds.length !== 1 ? "s" : ""} seleccionado{form.usuarioIds.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? "Guardar Cambios" : "Crear Grupo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Delete confirmation Modal                                          */}
      {/* ================================================================= */}
      {deleteModalOpen && deletingGrupo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteModalOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmar Baja
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Esta a punto de dar de baja al grupo{" "}
              <span className="font-medium text-gray-900">
                {deletingGrupo.nombre}
              </span>
              . Esta accion cambiara su estado a &quot;Baja&quot;.
            </p>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setError("");
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Dar de Baja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
