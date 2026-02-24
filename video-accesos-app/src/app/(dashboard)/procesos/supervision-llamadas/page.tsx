"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  Loader2,
  Check,
  Minus,
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
  nroOperador: string | null;
}

interface RegistroAcceso {
  id: number;
  tipoGestionId: number;
  observaciones: string | null;
  duracion: string | null;
  fechaModificacion: string;
  privada: Privada;
  residencia: {
    id: number;
    nroCasa: string;
    calle: string;
  };
  empleado: Empleado;
}

interface SupervisionLlamada {
  id: number;
  registroAccesoId: number;
  supervisorId: number;
  fecha: string;
  saludo: number;
  identificoEmpresa: number;
  identificoOperador: number;
  amable: number;
  gracias: number;
  demanda: number;
  asunto: number;
  tiempoGestion: string | null;
  observaciones: string | null;
  registroAcceso: RegistroAcceso;
}

interface SupervisionForm {
  registroAccesoId: string;
  supervisorId: string;
  saludo: number;
  identificoEmpresa: number;
  identificoOperador: number;
  amable: number;
  gracias: number;
  demanda: number;
  asunto: number;
  tiempoGestion: string;
  observaciones: string;
}

const emptyForm: SupervisionForm = {
  registroAccesoId: "",
  supervisorId: "",
  saludo: 0,
  identificoEmpresa: 0,
  identificoOperador: 0,
  amable: 0,
  gracias: 0,
  demanda: 0,
  asunto: 0,
  tiempoGestion: "",
  observaciones: "",
};

/* ---------- constantes ---------- */
const CRITERIOS = [
  { key: "saludo" as const, label: "Saludo" },
  { key: "identificoEmpresa" as const, label: "Identifico Empresa" },
  { key: "identificoOperador" as const, label: "Identifico Operador" },
  { key: "amable" as const, label: "Amable" },
  { key: "gracias" as const, label: "Agradecimiento" },
  { key: "demanda" as const, label: "Demanda" },
  { key: "asunto" as const, label: "Asunto" },
];

/* ================================================================ */

export default function SupervisionLlamadasPage() {
  /* ---------- state ---------- */
  const [items, setItems] = useState<SupervisionLlamada[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // filtros
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");

  // modal crear
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<SupervisionForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // empleados (supervisores)
  const [empleados, setEmpleados] = useState<Empleado[]>([]);

  // busqueda de registros de acceso
  const [accesoSearch, setAccesoSearch] = useState("");
  const [accesoResults, setAccesoResults] = useState<RegistroAcceso[]>([]);
  const [selectedAcceso, setSelectedAcceso] = useState<RegistroAcceso | null>(null);
  const [searchingAccesos, setSearchingAccesos] = useState(false);

  /* ---------- fetch data ---------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (filterFechaDesde) params.set("fechaDesde", filterFechaDesde);
      if (filterFechaHasta) params.set("fechaHasta", filterFechaHasta);

      const res = await fetch(`/api/procesos/supervision-llamadas?${params}`);
      if (!res.ok) throw new Error("Error al obtener supervisiones");
      const json = await res.json();
      setItems(json.data);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch {
      console.error("Error al cargar supervisiones");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterFechaDesde, filterFechaHasta]);

  const fetchEmpleados = useCallback(async () => {
    try {
      const res = await fetch("/api/catalogos/empleados?pageSize=200");
      if (!res.ok) return;
      const json = await res.json();
      setEmpleados(json.data || json);
    } catch {
      console.error("Error al cargar empleados");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  /* ---------- busqueda de registros de acceso ---------- */
  const searchAccesos = async (query: string) => {
    if (query.length < 2) {
      setAccesoResults([]);
      return;
    }
    setSearchingAccesos(true);
    try {
      const res = await fetch(
        `/api/procesos/registro-accesos?search=${encodeURIComponent(query)}&limit=10`
      );
      if (!res.ok) return;
      const json = await res.json();
      setAccesoResults(json.data || []);
    } catch {
      console.error("Error al buscar registros de acceso");
    } finally {
      setSearchingAccesos(false);
    }
  };

  /* ---------- modal helpers ---------- */
  const openCreate = () => {
    setForm({ ...emptyForm });
    setSelectedAcceso(null);
    setAccesoSearch("");
    setAccesoResults([]);
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError("");
  };

  const selectAcceso = (acceso: RegistroAcceso) => {
    setSelectedAcceso(acceso);
    setForm((prev) => ({ ...prev, registroAccesoId: String(acceso.id) }));
    setAccesoResults([]);
    setAccesoSearch(
      `#${acceso.id} - ${acceso.privada?.descripcion || ""} - ${acceso.residencia?.nroCasa || ""}`
    );
  };

  const toggleCriterio = (key: keyof SupervisionForm) => {
    setForm((prev) => ({ ...prev, [key]: prev[key] === 1 ? 0 : 1 }));
  };

  /* ---------- guardar ---------- */
  const handleSave = async () => {
    if (!form.registroAccesoId) {
      setError("Debe seleccionar un registro de acceso");
      return;
    }
    if (!form.supervisorId) {
      setError("Debe seleccionar un supervisor");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/procesos/supervision-llamadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  const CheckIcon = ({ value }: { value: number | boolean }) => {
    const isTrue = value === 1 || value === true;
    return (
      <span
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
          isTrue ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
        }`}
      >
        {isTrue ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      </span>
    );
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
            <Phone className="h-7 w-7 text-blue-600" />
            Supervision de Llamadas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Evaluacion de calidad en la atencion de llamadas
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nueva Supervision
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
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
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Operador</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Privada</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">#Casa</th>
                {CRITERIOS.map((c) => (
                  <th
                    key={c.key}
                    className="text-center px-2 py-3 font-semibold text-gray-700 text-xs"
                  >
                    {c.label}
                  </th>
                ))}
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Tiempo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                    <p className="text-gray-400 text-sm mt-2">Cargando...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-gray-400">
                    No se encontraron supervisiones
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {fmtDateTime(item.fecha)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium">
                        {item.registroAcceso?.empleado?.nombre || ""}{" "}
                        {item.registroAcceso?.empleado?.apePaterno || ""}
                      </div>
                      <div className="text-xs text-gray-500">
                        Op. {item.registroAcceso?.empleado?.nroOperador || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.registroAcceso?.privada?.descripcion || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {item.registroAcceso?.residencia?.nroCasa || "-"}
                    </td>
                    {CRITERIOS.map((c) => (
                      <td key={c.key} className="px-2 py-3 text-center">
                        <CheckIcon
                          value={item[c.key as keyof SupervisionLlamada] as number}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center text-gray-600">
                      {item.tiempoGestion || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="truncate max-w-xs">
                        {item.observaciones || "-"}
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

      {/* ==================== MODAL CREAR SUPERVISION ==================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Nueva Supervision de Llamada
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

              {/* Buscar registro de acceso */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registro de Acceso <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por ID, observaciones..."
                    value={accesoSearch}
                    onChange={(e) => {
                      setAccesoSearch(e.target.value);
                      setSelectedAcceso(null);
                      setForm((prev) => ({ ...prev, registroAccesoId: "" }));
                      searchAccesos(e.target.value);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchingAccesos && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}

                  {/* Resultados */}
                  {accesoResults.length > 0 && !selectedAcceso && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {accesoResults.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => selectAcceso(a)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            #{a.id} - {a.privada?.descripcion || ""} - Casa{" "}
                            {a.residencia?.nroCasa || ""}
                          </div>
                          <div className="text-xs text-gray-500">
                            Op. {a.empleado?.nroOperador || "-"} |{" "}
                            {fmtDateTime(a.fechaModificacion)} | {a.observaciones || "Sin obs."}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Acceso seleccionado */}
                {selectedAcceso && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <div className="font-medium text-blue-900">
                      Registro #{selectedAcceso.id}
                    </div>
                    <div className="text-blue-700">
                      {selectedAcceso.privada?.descripcion || ""} - Casa{" "}
                      {selectedAcceso.residencia?.nroCasa || ""} | Op.{" "}
                      {selectedAcceso.empleado?.nroOperador || "-"} (
                      {selectedAcceso.empleado?.nombre}{" "}
                      {selectedAcceso.empleado?.apePaterno})
                    </div>
                  </div>
                )}
              </div>

              {/* Supervisor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supervisor <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.supervisorId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, supervisorId: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar supervisor...</option>
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre} {e.apePaterno} {e.apeMaterno}
                    </option>
                  ))}
                </select>
              </div>

              {/* Criterios de calidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Criterios de Calidad
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {CRITERIOS.map((c) => (
                    <label
                      key={c.key}
                      className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition"
                    >
                      <input
                        type="checkbox"
                        checked={(form[c.key as keyof SupervisionForm] as number) === 1}
                        onChange={() => toggleCriterio(c.key as keyof SupervisionForm)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tiempo gestion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiempo de Gestion
                </label>
                <input
                  type="text"
                  value={form.tiempoGestion}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, tiempoGestion: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="HH:MM:SS"
                  maxLength={8}
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, observaciones: e.target.value }))
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Observaciones adicionales..."
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
                {saving ? "Guardando..." : "Guardar Supervision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
