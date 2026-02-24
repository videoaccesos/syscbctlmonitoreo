"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  Plus,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Phone,
  Clock,
  Filter,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Privada {
  id: number;
  descripcion: string;
}

interface Residencia {
  id: number;
  nroCasa: string;
  calle: string;
  telefono1: string | null;
  telefono2: string | null;
  interfon: string | null;
  telefonoInterfon: string | null;
  observaciones: string | null;
  estatusId: number;
  residentes: Residente[];
  visitantes: Visitante[];
}

interface Residente {
  id: number;
  nombre: string;
  apePaterno: string;
  apeMaterno: string;
  celular: string | null;
  email: string | null;
  reportarAcceso: boolean;
}

interface Visitante {
  id: number;
  nombre: string;
  apePaterno: string;
  apeMaterno: string;
  telefono: string | null;
  celular: string | null;
  observaciones: string | null;
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
  empleadoId: number;
  privadaId: number;
  residenciaId: number;
  tipoGestionId: number;
  solicitanteId: string;
  observaciones: string | null;
  duracion: string | null;
  ocr: string | null;
  imagen: string | null;
  estatusId: number;
  usuarioId: number;
  fechaModificacion: string;
  privada: { id: number; descripcion: string };
  residencia: { id: number; nroCasa: string; calle: string; telefono1?: string; telefono2?: string; interfon?: string; telefonoInterfon?: string };
  empleado: Empleado;
}

interface RegistroDetalle extends RegistroAcceso {
  usuario: {
    id: number;
    usuario: string;
    empleado: { nombre: string; apePaterno: string } | null;
  } | null;
  supervisionLlamada: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIPO_GESTION_LABELS: Record<number, string> = {
  1: "No concluida",
  2: "Moroso",
  3: "Proveedor",
  4: "Residente",
  5: "Tecnico",
  6: "Trab. Obra",
  7: "Trab. Servicio",
  8: "Visita",
  9: "Visita Morosos",
};

const TIPO_GESTION_OPTIONS = [
  { id: 1, label: "No concluida" },
  { id: 2, label: "Moroso" },
  { id: 3, label: "Proveedor" },
  { id: 4, label: "Residente" },
  { id: 5, label: "Tecnico" },
  { id: 6, label: "Trabajador de Obra" },
  { id: 7, label: "Trabajador de Servicio" },
  { id: 8, label: "Visita" },
  { id: 9, label: "Visita de Morosos" },
];

const ESTATUS_OPTIONS = [
  { id: 1, label: "Acceso" },
  { id: 2, label: "Rechazado" },
  { id: 3, label: "Informo" },
];

function getEstatusColor(estatusId: number) {
  switch (estatusId) {
    case 1:
      return "bg-green-50 text-green-700 ring-green-600/20";
    case 2:
      return "bg-red-50 text-red-700 ring-red-600/20";
    case 3:
      return "bg-blue-50 text-blue-700 ring-blue-600/20";
    default:
      return "bg-gray-50 text-gray-700 ring-gray-600/20";
  }
}

function getEstatusLabel(estatusId: number) {
  switch (estatusId) {
    case 1:
      return "Acceso";
    case 2:
      return "Rechazado";
    case 3:
      return "Informo";
    default:
      return "Desconocido";
  }
}

function formatHora(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function RegistroAccesosPage() {
  const { data: session } = useSession();

  // Data state
  const [registros, setRegistros] = useState<RegistroAcceso[]>([]);
  const [privadas, setPrivadas] = useState<Privada[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Filter state
  const [filtroPrivadaId, setFiltroPrivadaId] = useState("");
  const [fechaDesde, setFechaDesde] = useState(todayStr());
  const [fechaHasta, setFechaHasta] = useState(todayStr());

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetalle, setShowDetalle] = useState(false);
  const [detalle, setDetalle] = useState<RegistroDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [formPrivadaId, setFormPrivadaId] = useState("");
  const [residenciaSearch, setResidenciaSearch] = useState("");
  const [residencias, setResidencias] = useState<Residencia[]>([]);
  const [residenciasLoading, setResidenciasLoading] = useState(false);
  const [selectedResidencia, setSelectedResidencia] =
    useState<Residencia | null>(null);
  const [formTipoGestionId, setFormTipoGestionId] = useState("");
  const [formSolicitanteId, setFormSolicitanteId] = useState("");
  const [formSolicitanteNombre, setFormSolicitanteNombre] = useState("");
  const [formEstatusId, setFormEstatusId] = useState("1");
  const [formObservaciones, setFormObservaciones] = useState("");
  const [formDuracion, setFormDuracion] = useState("");

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -----------------------------------------------------------
  // Fetch privadas (for dropdown)
  // -----------------------------------------------------------
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

  // -----------------------------------------------------------
  // Fetch registros
  // -----------------------------------------------------------
  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (filtroPrivadaId) params.set("privadaId", filtroPrivadaId);
      if (fechaDesde) params.set("fechaDesde", fechaDesde);
      if (fechaHasta) params.set("fechaHasta", fechaHasta);

      const res = await fetch(
        `/api/procesos/registro-accesos?${params}`
      );
      if (!res.ok) throw new Error("Error al obtener registros");
      const json = await res.json();
      setRegistros(json.data);
      setTotal(json.pagination.total);
      setTotalPages(json.pagination.totalPages);
    } catch {
      console.error("Error al cargar registros de acceso");
    } finally {
      setLoading(false);
    }
  }, [page, filtroPrivadaId, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchPrivadas();
  }, [fetchPrivadas]);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  // -----------------------------------------------------------
  // Timer logic
  // -----------------------------------------------------------
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  function formatTimer(seconds: number) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  // -----------------------------------------------------------
  // Search residencias
  // -----------------------------------------------------------
  const buscarResidencias = useCallback(async () => {
    if (!formPrivadaId) {
      setResidencias([]);
      return;
    }
    setResidenciasLoading(true);
    try {
      const params = new URLSearchParams({ privadaId: formPrivadaId });
      if (residenciaSearch) params.set("search", residenciaSearch);

      const res = await fetch(
        `/api/procesos/registro-accesos/buscar-residencia?${params}`
      );
      if (!res.ok) throw new Error("Error al buscar residencias");
      const json = await res.json();
      setResidencias(json.data);
    } catch {
      console.error("Error al buscar residencias");
    } finally {
      setResidenciasLoading(false);
    }
  }, [formPrivadaId, residenciaSearch]);

  // -----------------------------------------------------------
  // View detail
  // -----------------------------------------------------------
  const viewDetalle = async (id: number) => {
    setDetalleLoading(true);
    setShowDetalle(true);
    try {
      const res = await fetch(`/api/procesos/registro-accesos/${id}`);
      if (!res.ok) throw new Error("Error al obtener detalle");
      const json = await res.json();
      setDetalle(json);
    } catch {
      console.error("Error al obtener detalle del registro");
    } finally {
      setDetalleLoading(false);
    }
  };

  // -----------------------------------------------------------
  // Form handlers
  // -----------------------------------------------------------
  const resetForm = () => {
    setFormPrivadaId("");
    setResidenciaSearch("");
    setResidencias([]);
    setSelectedResidencia(null);
    setFormTipoGestionId("");
    setFormSolicitanteId("");
    setFormSolicitanteNombre("");
    setFormEstatusId("1");
    setFormObservaciones("");
    setFormDuracion("");
    setTimerRunning(false);
    setTimerSeconds(0);
    setError("");
  };

  const openForm = () => {
    resetForm();
    setShowForm(true);
  };

  const selectSolicitante = (
    _tipo: "R" | "V",
    id: number,
    nombre: string
  ) => {
    setFormSolicitanteId(String(id));
    setFormSolicitanteNombre(nombre);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formPrivadaId) {
      setError("Seleccione una privada.");
      return;
    }
    if (!selectedResidencia) {
      setError("Seleccione una residencia.");
      return;
    }
    if (!formTipoGestionId) {
      setError("Seleccione un tipo de gestion.");
      return;
    }
    if (!formSolicitanteId) {
      setError("Seleccione o ingrese un solicitante.");
      return;
    }
    if (!formEstatusId) {
      setError("Seleccione un estatus.");
      return;
    }

    // Obtener datos de sesion del operador
    const user = session?.user as Record<string, unknown> | undefined;
    const empleadoId = user?.empleadoId;
    const usuarioId = user?.usuarioId;

    if (!empleadoId || !usuarioId) {
      setError(
        "No se pudo determinar el operador. Cierre sesion e ingrese nuevamente."
      );
      return;
    }

    // Determinar duracion: usar timer si se uso, o el valor manual
    const duracion =
      timerSeconds > 0 ? formatTimer(timerSeconds) : formDuracion || null;

    setSaving(true);
    try {
      const payload = {
        empleadoId,
        privadaId: formPrivadaId,
        residenciaId: selectedResidencia.id,
        tipoGestionId: formTipoGestionId,
        solicitanteId: formSolicitanteId,
        estatusId: formEstatusId,
        usuarioId,
        observaciones: formObservaciones || null,
        duracion,
      };

      const res = await fetch("/api/procesos/registro-accesos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al crear registro de acceso");
        return;
      }

      setShowForm(false);
      resetForm();
      fetchRegistros();
    } catch {
      setError("Error de conexion al guardar");
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
            <ClipboardList className="h-7 w-7 text-blue-600" />
            Registro de Accesos
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Registro y consulta de accesos a privadas
          </p>
        </div>
        <button
          onClick={openForm}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo Registro
        </button>
      </div>

      {/* ================================================================= */}
      {/* Filters Section                                                    */}
      {/* ================================================================= */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Privada
            </label>
            <select
              value={filtroPrivadaId}
              onChange={(e) => {
                setFiltroPrivadaId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Todas las privadas</option>
              {privadas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.descripcion}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFiltroPrivadaId("");
                setFechaDesde(todayStr());
                setFechaHasta(todayStr());
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition w-full"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Registration Form                                                  */}
      {/* ================================================================= */}
      {showForm && (
        <div className="bg-white rounded-lg border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Nuevo Registro de Acceso
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Paso 1: Seleccionar Privada */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                1. Privada <span className="text-red-500">*</span>
              </label>
              <select
                value={formPrivadaId}
                onChange={(e) => {
                  setFormPrivadaId(e.target.value);
                  setSelectedResidencia(null);
                  setResidencias([]);
                  setResidenciaSearch("");
                  setFormSolicitanteId("");
                  setFormSolicitanteTipo("");
                  setFormSolicitanteNombre("");
                }}
                className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Seleccionar privada...</option>
                {privadas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.descripcion}
                  </option>
                ))}
              </select>
            </div>

            {/* Paso 2: Buscar/Seleccionar Residencia */}
            {formPrivadaId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  2. Residencia <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por #casa o calle..."
                      value={residenciaSearch}
                      onChange={(e) => setResidenciaSearch(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={buscarResidencias}
                    className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                  >
                    <Search className="h-4 w-4" />
                    Buscar
                  </button>
                </div>

                {/* Residencia seleccionada */}
                {selectedResidencia && (
                  <div className="mb-2 rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium text-blue-800">
                        Casa #{selectedResidencia.nroCasa}
                      </span>
                      <span className="text-blue-600 ml-2">
                        {selectedResidencia.calle}
                      </span>
                      {selectedResidencia.interfon && (
                        <span className="text-blue-500 ml-2">
                          | Interfon: {selectedResidencia.interfon}
                        </span>
                      )}
                      {selectedResidencia.telefono1 && (
                        <span className="text-blue-500 ml-2">
                          | Tel: {selectedResidencia.telefono1}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedResidencia(null);
                        setFormSolicitanteId("");
                        setFormSolicitanteTipo("");
                        setFormSolicitanteNombre("");
                      }}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Tabla de resultados */}
                {residenciasLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500 mx-auto" />
                    <p className="text-xs text-gray-400 mt-1">Buscando...</p>
                  </div>
                ) : residencias.length > 0 && !selectedResidencia ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                            #Casa
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                            Calle
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                            Interfon
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                            Telefono
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                            Estado
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">
                            Accion
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {residencias.map((r) => (
                          <tr
                            key={r.id}
                            className="hover:bg-blue-50 cursor-pointer transition"
                            onClick={() => {
                              setSelectedResidencia(r);
                              setFormSolicitanteId("");
                              setFormSolicitanteTipo("");
                              setFormSolicitanteNombre("");
                            }}
                          >
                            <td className="px-3 py-2 font-medium">
                              {r.nroCasa}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {r.calle}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {r.interfon || "-"}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {r.telefono1 || "-"}
                            </td>
                            <td className="px-3 py-2">
                              {r.estatusId === 3 ? (
                                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/20 ring-inset">
                                  Moroso
                                </span>
                              ) : r.estatusId === 2 ? (
                                <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-yellow-600/20 ring-inset">
                                  Sin Interfon
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
                                  Activo
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                              >
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            )}

            {/* Paso 3: Tipo de Gestion */}
            {selectedResidencia && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  3. Tipo de Gestion <span className="text-red-500">*</span>
                </label>
                <select
                  value={formTipoGestionId}
                  onChange={(e) => setFormTipoGestionId(e.target.value)}
                  className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">Seleccionar tipo...</option>
                  {TIPO_GESTION_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Paso 4: Solicitante */}
            {selectedResidencia && formTipoGestionId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  4. Solicitante <span className="text-red-500">*</span>
                </label>

                {formSolicitanteNombre && (
                  <div className="mb-2 rounded-lg bg-green-50 border border-green-200 p-2 flex items-center justify-between">
                    <span className="text-sm text-green-800 font-medium">
                      {formSolicitanteTipo === "R"
                        ? "Residente"
                        : "Visitante"}
                      : {formSolicitanteNombre}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormSolicitanteId("");
                        setFormSolicitanteTipo("");
                        setFormSolicitanteNombre("");
                      }}
                      className="text-green-500 hover:text-green-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Residentes de la casa */}
                {selectedResidencia.residentes.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Residentes:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedResidencia.residentes.map((r) => {
                        const nombreCompleto = `${r.nombre} ${r.apePaterno} ${r.apeMaterno}`;
                        const isSelected =
                          formSolicitanteTipo === "R" &&
                          formSolicitanteId === String(r.id);
                        return (
                          <button
                            key={`r-${r.id}`}
                            type="button"
                            onClick={() =>
                              selectSolicitante("R", r.id, nombreCompleto)
                            }
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                            }`}
                          >
                            {nombreCompleto}
                            {r.celular && (
                              <Phone className="h-3 w-3 ml-1 opacity-60" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Visitantes de la casa */}
                {selectedResidencia.visitantes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Visitantes:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedResidencia.visitantes.map((v) => {
                        const nombreCompleto = `${v.nombre} ${v.apePaterno} ${v.apeMaterno}`;
                        const isSelected =
                          formSolicitanteTipo === "V" &&
                          formSolicitanteId === String(v.id);
                        return (
                          <button
                            key={`v-${v.id}`}
                            type="button"
                            onClick={() =>
                              selectSolicitante("V", v.id, nombreCompleto)
                            }
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
                              isSelected
                                ? "bg-purple-600 text-white"
                                : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                            }`}
                          >
                            {nombreCompleto}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedResidencia.residentes.length === 0 &&
                  selectedResidencia.visitantes.length === 0 && (
                    <p className="text-xs text-gray-400 italic">
                      No hay residentes ni visitantes registrados para esta
                      casa.
                    </p>
                  )}
              </div>
            )}

            {/* Paso 5: Estatus */}
            {selectedResidencia && formTipoGestionId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  5. Estatus <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {ESTATUS_OPTIONS.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setFormEstatusId(String(e.id))}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        formEstatusId === String(e.id)
                          ? e.id === 1
                            ? "bg-green-600 text-white"
                            : e.id === 2
                              ? "bg-red-600 text-white"
                              : "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Paso 6: Observaciones */}
            {selectedResidencia && formTipoGestionId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  6. Observaciones
                </label>
                <textarea
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  rows={3}
                  placeholder="Observaciones adicionales..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            )}

            {/* Paso 7: Duracion de llamada */}
            {selectedResidencia && formTipoGestionId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  7. Duracion de llamada
                </label>
                <div className="flex items-center gap-3">
                  {/* Auto-timer */}
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-mono text-sm text-gray-700 min-w-[60px]">
                      {formatTimer(timerSeconds)}
                    </span>
                    {!timerRunning ? (
                      <button
                        type="button"
                        onClick={() => setTimerRunning(true)}
                        className="rounded bg-green-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-green-600 transition"
                      >
                        Iniciar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTimerRunning(false)}
                        className="rounded bg-red-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-600 transition"
                      >
                        Detener
                      </button>
                    )}
                    {timerSeconds > 0 && !timerRunning && (
                      <button
                        type="button"
                        onClick={() => setTimerSeconds(0)}
                        className="rounded bg-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-400 transition"
                      >
                        Reiniciar
                      </button>
                    )}
                  </div>

                  <span className="text-xs text-gray-400">o</span>

                  {/* Manual */}
                  <input
                    type="text"
                    value={formDuracion}
                    onChange={(e) => setFormDuracion(e.target.value)}
                    placeholder="HH:MM:SS"
                    maxLength={8}
                    disabled={timerSeconds > 0}
                    className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            {selectedResidencia && formTipoGestionId && (
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Registrar Acceso
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* Records Table                                                      */}
      {/* ================================================================= */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Hora
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Privada
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  #Casa
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Solicitante
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tipo Gestion
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Duracion
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Acciones
                </th>
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
              ) : registros.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-gray-400 text-sm"
                  >
                    No se encontraron registros de acceso
                  </td>
                </tr>
              ) : (
                registros.map((reg) => (
                  <tr
                    key={reg.id}
                    className="hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => viewDetalle(reg.id)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                      {formatHora(reg.fechaModificacion)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {reg.privada?.descripcion || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {reg.residencia?.nroCasa || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {reg.solicitanteId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {TIPO_GESTION_LABELS[reg.tipoGestionId] ||
                        `Tipo ${reg.tipoGestionId}`}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getEstatusColor(reg.estatusId)}`}
                      >
                        {getEstatusLabel(reg.estatusId)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                      {reg.duracion || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewDetalle(reg.id);
                        }}
                        className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
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
              <span className="font-medium">{(page - 1) * limit + 1}</span> -{" "}
              <span className="font-medium">
                {Math.min(page * limit, total)}
              </span>{" "}
              de <span className="font-medium">{total}</span> registros
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
      {/* Detail Modal                                                       */}
      {/* ================================================================= */}
      {showDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowDetalle(false);
              setDetalle(null);
            }}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Detalle del Registro
              </h2>
              <button
                onClick={() => {
                  setShowDetalle(false);
                  setDetalle(null);
                }}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6">
              {detalleLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                  <p className="text-gray-400 text-sm mt-2">Cargando detalle...</p>
                </div>
              ) : detalle ? (
                <div className="space-y-4">
                  {/* Info principal */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        ID Registro
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        #{detalle.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Fecha/Hora
                      </p>
                      <p className="text-sm text-gray-900">
                        {new Date(detalle.fechaModificacion).toLocaleString("es-MX")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Privada
                      </p>
                      <p className="text-sm text-gray-900">
                        {detalle.privada?.descripcion || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Residencia
                      </p>
                      <p className="text-sm text-gray-900">
                        Casa #{detalle.residencia?.nroCasa || "-"} -{" "}
                        {detalle.residencia?.calle || ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Tipo de Gestion
                      </p>
                      <p className="text-sm text-gray-900">
                        {TIPO_GESTION_LABELS[detalle.tipoGestionId] ||
                          `Tipo ${detalle.tipoGestionId}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Estatus
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getEstatusColor(detalle.estatusId)}`}
                      >
                        {getEstatusLabel(detalle.estatusId)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Solicitante
                      </p>
                      <p className="text-sm text-gray-900">
                        {detalle.solicitanteId}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Duracion
                      </p>
                      <p className="text-sm text-gray-900 font-mono">
                        {detalle.duracion || "-"}
                      </p>
                    </div>
                  </div>

                  {/* Operador */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Operador (Empleado)
                        </p>
                        <p className="text-sm text-gray-900">
                          {detalle.empleado
                            ? `${detalle.empleado.nombre} ${detalle.empleado.apePaterno} ${detalle.empleado.apeMaterno}`
                            : "-"}
                          {detalle.empleado?.nroOperador && (
                            <span className="text-xs text-gray-400 ml-1">
                              (Op. {detalle.empleado.nroOperador})
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Usuario
                        </p>
                        <p className="text-sm text-gray-900">
                          {detalle.usuario?.usuario || "-"}
                          {detalle.usuario?.empleado && (
                            <span className="text-xs text-gray-400 ml-1">
                              ({detalle.usuario.empleado.nombre}{" "}
                              {detalle.usuario.empleado.apePaterno})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Observaciones */}
                  {detalle.observaciones && (
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Observaciones
                      </p>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                        {detalle.observaciones}
                      </p>
                    </div>
                  )}

                  {/* Quejas */}
                  {detalle.quejas && (
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Quejas / Sugerencias
                      </p>
                      <p className="text-sm text-gray-700 bg-yellow-50 rounded-lg p-3">
                        {detalle.quejas}
                      </p>
                    </div>
                  )}

                  {/* Residencia details */}
                  {detalle.residencia && (
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">
                        Datos de la Residencia
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-3">
                        {detalle.residencia.telefono1 && (
                          <div>
                            <span className="text-gray-500">Tel 1: </span>
                            <span className="text-gray-900">
                              {detalle.residencia.telefono1}
                            </span>
                          </div>
                        )}
                        {detalle.residencia.telefono2 && (
                          <div>
                            <span className="text-gray-500">Tel 2: </span>
                            <span className="text-gray-900">
                              {detalle.residencia.telefono2}
                            </span>
                          </div>
                        )}
                        {detalle.residencia.interfon && (
                          <div>
                            <span className="text-gray-500">Interfon: </span>
                            <span className="text-gray-900">
                              {detalle.residencia.interfon}
                            </span>
                          </div>
                        )}
                        {detalle.residencia.telefonoInterfon && (
                          <div>
                            <span className="text-gray-500">
                              Tel. Interfon:{" "}
                            </span>
                            <span className="text-gray-900">
                              {detalle.residencia.telefonoInterfon}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">
                  No se pudo cargar el detalle
                </p>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex justify-end border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setShowDetalle(false);
                  setDetalle(null);
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
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
