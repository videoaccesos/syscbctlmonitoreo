"use client";

import { useEffect, useState, useCallback } from "react";
import { Building2, Plus, Search, Edit2, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";

/* ---------- tipos ---------- */
interface Privada {
  id: number;
  descripcion: string;
  apePaterno: string | null;
  apeMaterno: string | null;
  nombre: string | null;
  tipoContactoId: number | null;
  telefono: string | null;
  celular: string | null;
  email: string | null;
  historial: string | null;
  precioVehicular: number | null;
  precioPeatonal: number | null;
  precioMensualidad: number | null;
  pagoMensualidad: number | null;
  venceContrato: string | null;
  observaciones: string | null;
  dns1: string | null;
  dns2: string | null;
  dns3: string | null;
  video1: string | null;
  video2: string | null;
  video3: string | null;
  relay1: string | null;
  relay2: string | null;
  relay3: string | null;
  monitoreo: number;
  renovacion: string | null;
  estatusId: number;
}

interface ApiResponse {
  data: Privada[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const emptyForm = {
  descripcion: "",
  apePaterno: "",
  apeMaterno: "",
  nombre: "",
  tipoContactoId: "",
  telefono: "",
  celular: "",
  email: "",
  historial: "",
  precioVehicular: "",
  precioPeatonal: "",
  precioMensualidad: "",
  pagoMensualidad: "",
  venceContrato: "",
  observaciones: "",
  dns1: "",
  dns2: "",
  dns3: "",
  video1: "",
  video2: "",
  video3: "",
  relay1: "",
  relay2: "",
  relay3: "",
  monitoreo: "0",
  renovacion: "",
};

type FormData = typeof emptyForm;

/* ================================================================ */

export default function PrivadasPage() {
  /* ---------- state ---------- */
  const [privadas, setPrivadas] = useState<Privada[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Privada | null>(null);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // confirmacion eliminar
  const [deleteTarget, setDeleteTarget] = useState<Privada | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---------- fetch ---------- */
  const fetchPrivadas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/catalogos/privadas?${params}`);
      if (!res.ok) throw new Error("Error al obtener privadas");
      const json: ApiResponse = await res.json();
      setPrivadas(json.data);
      setTotal(json.total);
      setTotalPages(json.totalPages);
    } catch {
      console.error("Error al cargar privadas");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

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

  /* ---------- modal helpers ---------- */
  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setError("");
    setShowModal(true);
  };

  const openEdit = (p: Privada) => {
    setEditing(p);
    setForm({
      descripcion: p.descripcion || "",
      apePaterno: p.apePaterno || "",
      apeMaterno: p.apeMaterno || "",
      nombre: p.nombre || "",
      tipoContactoId: p.tipoContactoId != null ? String(p.tipoContactoId) : "",
      telefono: p.telefono || "",
      celular: p.celular || "",
      email: p.email || "",
      historial: p.historial || "",
      precioVehicular: p.precioVehicular != null ? String(p.precioVehicular) : "",
      precioPeatonal: p.precioPeatonal != null ? String(p.precioPeatonal) : "",
      precioMensualidad: p.precioMensualidad != null ? String(p.precioMensualidad) : "",
      pagoMensualidad: p.pagoMensualidad != null ? String(p.pagoMensualidad) : "",
      venceContrato: p.venceContrato ? p.venceContrato.substring(0, 10) : "",
      observaciones: p.observaciones || "",
      dns1: p.dns1 || "",
      dns2: p.dns2 || "",
      dns3: p.dns3 || "",
      video1: p.video1 || "",
      video2: p.video2 || "",
      video3: p.video3 || "",
      relay1: p.relay1 || "",
      relay2: p.relay2 || "",
      relay3: p.relay3 || "",
      monitoreo: String(p.monitoreo ?? 0),
      renovacion: p.renovacion ? p.renovacion.substring(0, 10) : "",
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
    if (!form.descripcion.trim()) {
      setError("La descripcion es requerida");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editing
        ? `/api/catalogos/privadas/${editing.id}`
        : "/api/catalogos/privadas";

      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Error al guardar");
        return;
      }

      closeModal();
      fetchPrivadas();
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
      const res = await fetch(`/api/catalogos/privadas/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Error al eliminar");
        return;
      }

      setDeleteTarget(null);
      fetchPrivadas();
    } catch {
      alert("Error de conexion al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- helpers de formato ---------- */
  const fmtCurrency = (v: number | string | null) => {
    if (v == null || v === "") return "-";
    const n = typeof v === "string" ? parseFloat(v) : v;
    return isNaN(n) ? "-" : `$${n.toFixed(2)}`;
  };

  const contacto = (p: Privada) => {
    const parts = [p.nombre, p.apePaterno, p.apeMaterno].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "-";
  };

  /* ---------- form field helper ---------- */
  const setField = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  /* ================================================================ */
  /* RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Privadas</h1>
            <p className="text-sm text-gray-500">
              Administracion de privadas / fraccionamientos
            </p>
          </div>
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
              placeholder="Buscar por descripcion..."
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
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Descripcion</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Contacto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Telefono</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Mensualidad</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Estado</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    Cargando...
                  </td>
                </tr>
              ) : privadas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No se encontraron privadas
                  </td>
                </tr>
              ) : (
                privadas.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.descripcion}</td>
                    <td className="px-4 py-3 text-gray-600">{contacto(p)}</td>
                    <td className="px-4 py-3 text-gray-600">{p.telefono || p.celular || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.email || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{fmtCurrency(p.precioMensualidad)}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.estatusId === 1
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.estatusId === 1 ? "Activo" : "Baja"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          title="Editar"
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
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
              Mostrando {privadas.length} de {total} registros
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
          {/* overlay */}
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />

          {/* dialog */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? "Editar Privada" : "Nueva Privada"}
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

              {/* Descripcion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripcion <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={form.descripcion}
                  onChange={(e) => setField("descripcion", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre de la privada o fraccionamiento"
                />
              </div>

              {/* Contacto: nombre + apellidos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    maxLength={50}
                    value={form.nombre}
                    onChange={(e) => setField("nombre", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido Paterno</label>
                  <input
                    type="text"
                    maxLength={50}
                    value={form.apePaterno}
                    onChange={(e) => setField("apePaterno", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido Materno</label>
                  <input
                    type="text"
                    maxLength={50}
                    value={form.apeMaterno}
                    onChange={(e) => setField("apeMaterno", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Telefono, Celular, Email */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                  <input
                    type="text"
                    maxLength={14}
                    value={form.telefono}
                    onChange={(e) => setField("telefono", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                  <input
                    type="text"
                    maxLength={14}
                    value={form.celular}
                    onChange={(e) => setField("celular", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    maxLength={60}
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Tipo Contacto + Historial */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contacto (ID)</label>
                  <input
                    type="number"
                    value={form.tipoContactoId}
                    onChange={(e) => setField("tipoContactoId", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Historial</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={form.historial}
                    onChange={(e) => setField("historial", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Precios + Mensualidad */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Vehicular</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precioVehicular}
                    onChange={(e) => setField("precioVehicular", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Peatonal</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precioPeatonal}
                    onChange={(e) => setField("precioPeatonal", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mensualidad</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.mensualidad}
                    onChange={(e) => setField("mensualidad", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Vence Contrato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vence Contrato</label>
                  <input
                    type="date"
                    value={form.venceContrato}
                    onChange={(e) => setField("venceContrato", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  rows={3}
                  value={form.observaciones}
                  onChange={(e) => setField("observaciones", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
              Se dara de baja la privada{" "}
              <span className="font-semibold">&quot;{deleteTarget.descripcion}&quot;</span>.
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
