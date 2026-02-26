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
  UserCog,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Empleado {
  id: number;
  nombre: string;
  apePaterno: string;
  apeMaterno: string;
}

interface Privada {
  id: number;
  descripcion: string;
}

interface GrupoDetalle {
  grupoUsuarioId: number;
  grupo: { id: number; nombre: string };
}

interface Usuario {
  id: number;
  usuario: string;
  modificarFechas: string;
  ultimaSesion: string | null;
  empleadoId: number | null;
  privadaId: number | null;
  estatusId: number;
  empleado: Empleado | null;
  gruposDetalles: GrupoDetalle[];
}

interface UsuarioForm {
  usuario: string;
  contrasena: string;
  confirmarContrasena: string;
  empleadoId: string;
  privadaId: string;
  modificarFechas: string;
}

const emptyForm: UsuarioForm = {
  usuario: "",
  contrasena: "",
  confirmarContrasena: "",
  empleadoId: "",
  privadaId: "",
  modificarFechas: "N",
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function UsuariosPage() {
  // Data state
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [privadas, setPrivadas] = useState<Privada[]>([]);
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
  const [deletingUsuario, setDeletingUsuario] = useState<Usuario | null>(null);
  const [form, setForm] = useState<UsuarioForm>(emptyForm);
  const [error, setError] = useState("");

  // -----------------------------------------------------------
  // Fetch usuarios
  // -----------------------------------------------------------
  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/seguridad/usuarios?${params}`);
      if (!res.ok) throw new Error("Error al obtener usuarios");
      const json = await res.json();
      setUsuarios(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch {
      console.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // -----------------------------------------------------------
  // Fetch empleados (for dropdown)
  // -----------------------------------------------------------
  const fetchEmpleados = useCallback(async () => {
    try {
      const res = await fetch("/api/catalogos/empleados?pageSize=1000");
      if (!res.ok) return;
      const json = await res.json();
      setEmpleados(json.data || []);
    } catch {
      console.error("Error al cargar empleados");
    }
  }, []);

  // -----------------------------------------------------------
  // Fetch privadas (for dropdown)
  // -----------------------------------------------------------
  const fetchPrivadas = useCallback(async () => {
    try {
      const res = await fetch("/api/catalogos/privadas?pageSize=1000&estatusId=1");
      if (!res.ok) return;
      const json = await res.json();
      setPrivadas(json.data || []);
    } catch {
      console.error("Error al cargar privadas");
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  useEffect(() => {
    fetchEmpleados();
    fetchPrivadas();
  }, [fetchEmpleados, fetchPrivadas]);

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

  const openEditModal = (usr: Usuario) => {
    setEditingId(usr.id);
    setForm({
      usuario: usr.usuario,
      contrasena: "",
      confirmarContrasena: "",
      empleadoId: usr.empleadoId ? String(usr.empleadoId) : "",
      privadaId: usr.privadaId ? String(usr.privadaId) : "",
      modificarFechas: usr.modificarFechas === "S" ? "S" : "N",
    });
    setError("");
    setModalOpen(true);
  };

  const openDeleteModal = (usr: Usuario) => {
    setDeletingUsuario(usr);
    setDeleteModalOpen(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      if (target.name === "modificarFechas") {
        setForm((prev) => ({ ...prev, [target.name]: target.checked ? "S" : "N" }));
      } else {
        setForm((prev) => ({ ...prev, [target.name]: target.checked ? "S" : "N" }));
      }
    } else {
      setForm((prev) => ({ ...prev, [target.name]: target.value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.usuario.trim()) {
      setError("El nombre de usuario es requerido.");
      return;
    }

    // Password validation
    if (!editingId) {
      // Creating - password required
      if (!form.contrasena || form.contrasena.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (form.contrasena !== form.confirmarContrasena) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    } else {
      // Editing - password optional, but if provided must be valid
      if (form.contrasena) {
        if (form.contrasena.length < 6) {
          setError("La contraseña debe tener al menos 6 caracteres.");
          return;
        }
        if (form.contrasena !== form.confirmarContrasena) {
          setError("Las contraseñas no coinciden.");
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        usuario: form.usuario,
        empleadoId: form.empleadoId || null,
        privadaId: form.privadaId || null,
        modificarFechas: form.modificarFechas === "S" ? "S" : "N",
      };

      if (form.contrasena) {
        payload.contrasena = form.contrasena;
      }

      const url = editingId
        ? `/api/seguridad/usuarios/${editingId}`
        : "/api/seguridad/usuarios";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar usuario");
        return;
      }

      setModalOpen(false);
      fetchUsuarios();
    } catch {
      setError("Error de conexion al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUsuario) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/seguridad/usuarios/${deletingUsuario.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al dar de baja al usuario");
        return;
      }

      setDeleteModalOpen(false);
      setDeletingUsuario(null);
      fetchUsuarios();
    } catch {
      setError("Error de conexion al eliminar");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            <UserCog className="h-7 w-7 text-blue-600" />
            Usuarios
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Gestiona los usuarios del sistema
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
            placeholder="Buscar por nombre de usuario..."
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
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Empleado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Ultima Sesion
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
                  <td colSpan={5} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                    <p className="text-gray-400 text-sm mt-2">Cargando...</p>
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-gray-400 text-sm"
                  >
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                usuarios.map((usr) => (
                  <tr key={usr.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {usr.usuario}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {usr.empleado
                        ? `${usr.empleado.nombre} ${usr.empleado.apePaterno} ${usr.empleado.apeMaterno}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(usr.ultimaSesion)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {usr.estatusId === 1 ? (
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
                          onClick={() => openEditModal(usr)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {usr.estatusId === 1 && (
                          <button
                            onClick={() => openDeleteModal(usr)}
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
              de <span className="font-medium">{total}</span> usuarios
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
                {editingId ? "Editar Usuario" : "Agregar Usuario"}
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

              {/* Usuario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="usuario"
                  value={form.usuario}
                  onChange={handleFormChange}
                  maxLength={50}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Contrasena */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña{" "}
                    {!editingId && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    name="contrasena"
                    value={form.contrasena}
                    onChange={handleFormChange}
                    placeholder={editingId ? "Dejar vacio para no cambiar" : ""}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Minimo 6 caracteres</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Contraseña{" "}
                    {!editingId && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    name="confirmarContrasena"
                    value={form.confirmarContrasena}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Empleado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empleado
                </label>
                <select
                  name="empleadoId"
                  value={form.empleadoId}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">Sin empleado asignado</option>
                  {empleados.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre} {emp.apePaterno} {emp.apeMaterno}
                    </option>
                  ))}
                </select>
              </div>

              {/* Privada */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Privada
                </label>
                <select
                  name="privadaId"
                  value={form.privadaId}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">Sin privada asignada</option>
                  {privadas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modificar Fechas */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="modificarFechas"
                    checked={form.modificarFechas === "S"}
                    onChange={handleFormChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Permitir modificar fechas
                </label>
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
                  {editingId ? "Guardar Cambios" : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Delete confirmation Modal                                          */}
      {/* ================================================================= */}
      {deleteModalOpen && deletingUsuario && (
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
              Esta a punto de dar de baja al usuario{" "}
              <span className="font-medium text-gray-900">
                {deletingUsuario.usuario}
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
