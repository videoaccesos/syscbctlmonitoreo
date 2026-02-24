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

interface Puesto {
  id: number;
  descripcion: string;
}

interface Empleado {
  id: number;
  nombre: string;
  apePaterno: string;
  apeMaterno: string;
  nroSeguroSocial: string | null;
  puestoId: number;
  nroOperador: string | null;
  calle: string | null;
  nroCasa: string | null;
  sexo: string | null;
  colonia: string | null;
  telefono: string | null;
  celular: string | null;
  email: string | null;
  fechaIngreso: string | null;
  fechaBaja: string | null;
  motivoBaja: string | null;
  permisoAdministrador: number;
  permisoSupervisor: number;
  permisoEncargadoAdministracion: number;
  googleAuthCode: string | null;
  estatusId: number;
  puesto: Puesto;
}

interface EmpleadoForm {
  nombre: string;
  apePaterno: string;
  apeMaterno: string;
  nroSeguroSocial: string;
  puestoId: string;
  nroOperador: string;
  calle: string;
  nroCasa: string;
  sexo: string;
  colonia: string;
  telefono: string;
  celular: string;
  email: string;
  fechaIngreso: string;
  permisoAdministrador: number;
  permisoSupervisor: number;
  permisoEncargadoAdministracion: number;
}

const emptyForm: EmpleadoForm = {
  nombre: "",
  apePaterno: "",
  apeMaterno: "",
  nroSeguroSocial: "",
  puestoId: "",
  nroOperador: "",
  calle: "",
  nroCasa: "",
  sexo: "",
  colonia: "",
  telefono: "",
  celular: "",
  email: "",
  fechaIngreso: "",
  permisoAdministrador: 0,
  permisoSupervisor: 0,
  permisoEncargadoAdministracion: 0,
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function EmpleadosPage() {
  // Data state
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
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
  const [deletingEmpleado, setDeletingEmpleado] = useState<Empleado | null>(
    null
  );
  const [form, setForm] = useState<EmpleadoForm>(emptyForm);
  const [error, setError] = useState("");

  // -----------------------------------------------------------
  // Fetch empleados
  // -----------------------------------------------------------
  const fetchEmpleados = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/catalogos/empleados?${params}`);
      if (!res.ok) throw new Error("Error al obtener empleados");
      const json = await res.json();
      setEmpleados(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch {
      console.error("Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // -----------------------------------------------------------
  // Fetch puestos (for dropdown)
  // -----------------------------------------------------------
  const fetchPuestos = useCallback(async () => {
    try {
      const res = await fetch("/api/catalogos/puestos");
      if (!res.ok) return;
      const json = await res.json();
      setPuestos(json);
    } catch {
      console.error("Error al cargar puestos");
    }
  }, []);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  useEffect(() => {
    fetchPuestos();
  }, [fetchPuestos]);

  // -----------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    // fetchEmpleados will be triggered by page/search change via useEffect
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (emp: Empleado) => {
    setEditingId(emp.id);
    setForm({
      nombre: emp.nombre,
      apePaterno: emp.apePaterno,
      apeMaterno: emp.apeMaterno,
      nroSeguroSocial: emp.nroSeguroSocial || "",
      puestoId: String(emp.puestoId),
      nroOperador: emp.nroOperador || "",
      calle: emp.calle || "",
      nroCasa: emp.nroCasa || "",
      sexo: emp.sexo || "",
      colonia: emp.colonia || "",
      telefono: emp.telefono || "",
      celular: emp.celular || "",
      email: emp.email || "",
      fechaIngreso: emp.fechaIngreso
        ? emp.fechaIngreso.substring(0, 10)
        : "",
      permisoAdministrador: emp.permisoAdministrador ?? 0,
      permisoSupervisor: emp.permisoSupervisor ?? 0,
      permisoEncargadoAdministracion: emp.permisoEncargadoAdministracion ?? 0,
    });
    setError("");
    setModalOpen(true);
  };

  const openDeleteModal = (emp: Empleado) => {
    setDeletingEmpleado(emp);
    setDeleteModalOpen(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setForm((prev) => ({ ...prev, [target.name]: target.checked ? 1 : 0 }));
    } else {
      setForm((prev) => ({ ...prev, [target.name]: target.value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !form.nombre.trim() ||
      !form.apePaterno.trim() ||
      !form.apeMaterno.trim() ||
      !form.puestoId
    ) {
      setError(
        "Nombre, apellido paterno, apellido materno y puesto son requeridos."
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre,
        apePaterno: form.apePaterno,
        apeMaterno: form.apeMaterno,
        nroSeguroSocial: form.nroSeguroSocial || null,
        puestoId: form.puestoId,
        nroOperador: form.nroOperador || null,
        calle: form.calle || null,
        nroCasa: form.nroCasa || null,
        sexo: form.sexo || null,
        colonia: form.colonia || null,
        telefono: form.telefono || null,
        celular: form.celular || null,
        email: form.email || null,
        fechaIngreso: form.fechaIngreso || null,
        permisoAdministrador: form.permisoAdministrador,
        permisoSupervisor: form.permisoSupervisor,
        permisoEncargadoAdministracion: form.permisoEncargadoAdministracion,
      };

      const url = editingId
        ? `/api/catalogos/empleados/${editingId}`
        : "/api/catalogos/empleados";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar empleado");
        return;
      }

      setModalOpen(false);
      fetchEmpleados();
    } catch {
      setError("Error de conexion al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEmpleado) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/catalogos/empleados/${deletingEmpleado.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al dar de baja al empleado");
        return;
      }

      setDeleteModalOpen(false);
      setDeletingEmpleado(null);
      fetchEmpleados();
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
            Empleados
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Gestiona el catalogo de empleados del sistema
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
            placeholder="Buscar por nombre, apellidos o nro. operador..."
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
                  Nro Operador
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nombre Completo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Puesto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Telefono
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
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
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                    <p className="text-gray-400 text-sm mt-2">Cargando...</p>
                  </td>
                </tr>
              ) : empleados.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-gray-400 text-sm"
                  >
                    No se encontraron empleados
                  </td>
                </tr>
              ) : (
                empleados.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {emp.nroOperador || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {emp.apePaterno} {emp.apeMaterno} {emp.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {emp.puesto?.descripcion || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {emp.telefono || emp.celular || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {emp.email || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {emp.estatusId === 1 ? (
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
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {emp.estatusId === 1 && (
                          <button
                            onClick={() => openDeleteModal(emp)}
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
              de <span className="font-medium">{total}</span> empleados
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
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Editar Empleado" : "Agregar Empleado"}
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

              {/* Nombre completo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido Paterno <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="apePaterno"
                    value={form.apePaterno}
                    onChange={handleFormChange}
                    maxLength={50}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido Materno <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="apeMaterno"
                    value={form.apeMaterno}
                    onChange={handleFormChange}
                    maxLength={50}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Puesto, Nro Operador, Sexo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Puesto <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="puestoId"
                    value={form.puestoId}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Seleccionar puesto...</option>
                    {puestos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.descripcion}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nro. Operador
                  </label>
                  <input
                    type="text"
                    name="nroOperador"
                    value={form.nroOperador}
                    onChange={handleFormChange}
                    maxLength={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sexo
                  </label>
                  <select
                    name="sexo"
                    value={form.sexo}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
              </div>

              {/* NSS, Fecha ingreso */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nro. Seguro Social
                  </label>
                  <input
                    type="text"
                    name="nroSeguroSocial"
                    value={form.nroSeguroSocial}
                    onChange={handleFormChange}
                    maxLength={50}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Ingreso
                  </label>
                  <input
                    type="date"
                    name="fechaIngreso"
                    value={form.fechaIngreso}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Direccion */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calle
                  </label>
                  <input
                    type="text"
                    name="calle"
                    value={form.calle}
                    onChange={handleFormChange}
                    maxLength={60}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nro. Casa
                  </label>
                  <input
                    type="text"
                    name="nroCasa"
                    value={form.nroCasa}
                    onChange={handleFormChange}
                    maxLength={10}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colonia
                  </label>
                  <input
                    type="text"
                    name="colonia"
                    value={form.colonia}
                    onChange={handleFormChange}
                    maxLength={30}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Contacto */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefono
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleFormChange}
                    maxLength={14}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Celular
                  </label>
                  <input
                    type="text"
                    name="celular"
                    value={form.celular}
                    onChange={handleFormChange}
                    maxLength={14}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    maxLength={60}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Permisos */}
              <div className="flex items-center gap-6 flex-wrap">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="permisoAdministrador"
                    checked={form.permisoAdministrador === 1}
                    onChange={handleFormChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Permiso Administrador
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="permisoSupervisor"
                    checked={form.permisoSupervisor === 1}
                    onChange={handleFormChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Permiso Supervisor
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    name="permisoEncargadoAdministracion"
                    checked={form.permisoEncargadoAdministracion === 1}
                    onChange={handleFormChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Encargado Administracion
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
                  {editingId ? "Guardar Cambios" : "Crear Empleado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Delete confirmation Modal                                          */}
      {/* ================================================================= */}
      {deleteModalOpen && deletingEmpleado && (
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
              Esta a punto de dar de baja al empleado{" "}
              <span className="font-medium text-gray-900">
                {deletingEmpleado.nombre} {deletingEmpleado.apePaterno}{" "}
                {deletingEmpleado.apeMaterno}
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
