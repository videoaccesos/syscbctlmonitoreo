"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Phone,
  Clock,
  Filter,
  ShieldCheck,
  ShieldX,
  Info,
  UserPlus,
  Users,
  Eye,
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
  visitas: Visita[];
}

interface Residente {
  id: string;
  nombre: string;
  apePaterno: string;
  apeMaterno: string;
  celular: string | null;
  email: string | null;
  reportarAcceso: number;
}

interface Visita {
  id: string;
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
  residencia: {
    id: number;
    nroCasa: string;
    calle: string;
    telefono?: string;
    telefono2?: string;
    interfon?: string;
    telefonoInterfon?: string;
  };
  empleado: Empleado;
}

interface SolicitanteResult {
  id: string;
  nombre: string;
  tipo: "R" | "V" | "G";
  tipoLabel: string;
  celular: string;
  observaciones: string;
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
      return "ACCESO";
    case 2:
      return "RECHAZADO";
    case 3:
      return "INFORMO";
    default:
      return "Desconocido";
  }
}

function getResidenciaEstatusLabel(estatusId: number) {
  switch (estatusId) {
    case 1:
      return { label: "Activo", color: "text-green-700 bg-green-50" };
    case 2:
      return { label: "Inactivo", color: "text-yellow-700 bg-yellow-50" };
    case 3:
      return { label: "Moroso", color: "text-red-700 bg-red-50" };
    default:
      return { label: "Desconocido", color: "text-gray-700 bg-gray-50" };
  }
}

function formatFechaHora(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return dateStr;
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

  // Nombres cache para la tabla de historial
  const [nombresCache, setNombresCache] = useState<
    Record<string, { nombre: string; tipo: string }>
  >({});

  // Filter state
  const [filtroPrivadaId, setFiltroPrivadaId] = useState("");
  const [fechaDesde, setFechaDesde] = useState(todayStr());
  const [fechaHasta, setFechaHasta] = useState(todayStr());

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDetalle, setShowDetalle] = useState(false);
  const [detalle, setDetalle] = useState<RegistroAcceso | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form state - siempre visible como panel de trabajo
  const [formPrivadaId, setFormPrivadaId] = useState("");
  const [residenciaSearch, setResidenciaSearch] = useState("");
  const [residencias, setResidencias] = useState<Residencia[]>([]);
  const [residenciasLoading, setResidenciasLoading] = useState(false);
  const [selectedResidencia, setSelectedResidencia] =
    useState<Residencia | null>(null);
  const [formTipoGestionId, setFormTipoGestionId] = useState("1");
  const [formSolicitanteId, setFormSolicitanteId] = useState("");
  const [formSolicitanteNombre, setFormSolicitanteNombre] = useState("");
  const [formObservaciones, setFormObservaciones] = useState("");

  // Solicitante search
  const [solicitanteSearch, setSolicitanteSearch] = useState("");
  const [solicitanteResults, setSolicitanteResults] = useState<
    SolicitanteResult[]
  >([]);
  const [solicitanteSearching, setSolicitanteSearching] = useState(false);
  const solicitanteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Tab residentes/visitantes
  const [activeTab, setActiveTab] = useState<"residentes" | "visitantes">(
    "residentes"
  );

  // Registro General modal
  const [showRegGeneral, setShowRegGeneral] = useState(false);
  const [regNombre, setRegNombre] = useState("");
  const [regApePaterno, setRegApePaterno] = useState("");
  const [regApeMaterno, setRegApeMaterno] = useState("");
  const [regTelefono, setRegTelefono] = useState("");
  const [regCelular, setRegCelular] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regObservaciones, setRegObservaciones] = useState("");
  const [regSaving, setRegSaving] = useState(false);
  const [regTipo, setRegTipo] = useState<"visitante" | "general">("general");

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Duracion de la ultima gestion
  const [ultimaDuracion, setUltimaDuracion] = useState("00:00:00");

  // -----------------------------------------------------------
  // Fetch privadas (for dropdown)
  // -----------------------------------------------------------
  const fetchPrivadas = useCallback(async () => {
    try {
      const res = await fetch("/api/catalogos/privadas?pageSize=200&estatusId=1");
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
      setRegistros(json.data || []);
      setTotal(json.pagination?.total || 0);
      setTotalPages(json.pagination?.totalPages || 1);

      // Resolver nombres de solicitantes
      const data = json.data || [];
      const ids = [
        ...new Set(
          data
            .map((r: RegistroAcceso) => r.solicitanteId)
            .filter((id: string) => id && id.trim() !== "")
        ),
      ] as string[];
      const missingIds = ids.filter((id) => !nombresCache[id]);
      if (missingIds.length > 0) {
        try {
          const nombresRes = await fetch(
            `/api/procesos/registro-accesos/resolver-nombre?ids=${missingIds.join(",")}`
          );
          if (nombresRes.ok) {
            const nombresJson = await nombresRes.json();
            setNombresCache((prev) => ({ ...prev, ...nombresJson.data }));
          }
        } catch {
          // silenciar error de nombres
        }
      }
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
      setResidencias(json.data || []);
    } catch {
      console.error("Error al buscar residencias");
    } finally {
      setResidenciasLoading(false);
    }
  }, [formPrivadaId, residenciaSearch]);

  // Auto-search residencias when typing
  useEffect(() => {
    if (formPrivadaId && residenciaSearch.length >= 1) {
      const timeout = setTimeout(() => buscarResidencias(), 300);
      return () => clearTimeout(timeout);
    }
  }, [residenciaSearch, formPrivadaId]);

  // -----------------------------------------------------------
  // Search solicitantes (autocomplete)
  // -----------------------------------------------------------
  const buscarSolicitantes = useCallback(
    async (q: string) => {
      if (!q || q.length < 2) {
        setSolicitanteResults([]);
        return;
      }
      setSolicitanteSearching(true);
      try {
        const params = new URLSearchParams({ q });
        if (selectedResidencia) {
          params.set("residenciaId", String(selectedResidencia.id));
        }
        const res = await fetch(
          `/api/procesos/registro-accesos/buscar-solicitante?${params}`
        );
        if (res.ok) {
          const json = await res.json();
          setSolicitanteResults(json.data || []);
        }
      } catch {
        console.error("Error al buscar solicitantes");
      } finally {
        setSolicitanteSearching(false);
      }
    },
    [selectedResidencia]
  );

  // Debounce solicitante search
  useEffect(() => {
    if (solicitanteTimeoutRef.current) {
      clearTimeout(solicitanteTimeoutRef.current);
    }
    if (solicitanteSearch.length >= 2) {
      solicitanteTimeoutRef.current = setTimeout(() => {
        buscarSolicitantes(solicitanteSearch);
      }, 300);
    } else {
      setSolicitanteResults([]);
    }
    return () => {
      if (solicitanteTimeoutRef.current) {
        clearTimeout(solicitanteTimeoutRef.current);
      }
    };
  }, [solicitanteSearch]);

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
    setSelectedResidencia(null);
    setResidenciaSearch("");
    setResidencias([]);
    setFormTipoGestionId("1");
    setFormSolicitanteId("");
    setFormSolicitanteNombre("");
    setFormObservaciones("");
    setSolicitanteSearch("");
    setSolicitanteResults([]);
    setTimerRunning(false);
    setTimerSeconds(0);
    setError("");
  };

  const startNewRegistro = () => {
    resetForm();
    setTimerRunning(true);
    setTimerSeconds(0);
  };

  const selectSolicitante = (id: string, nombre: string) => {
    setFormSolicitanteId(id);
    setFormSolicitanteNombre(nombre);
    setSolicitanteSearch("");
    setSolicitanteResults([]);
  };

  // Guardar acceso con un estatus especifico
  const guardarAcceso = async (estatusId: number) => {
    setError("");
    setSuccessMsg("");

    if (!formPrivadaId) {
      setError("Seleccione una privada.");
      return;
    }
    if (!selectedResidencia) {
      setError("Seleccione una residencia.");
      return;
    }
    if (formTipoGestionId === "1") {
      setError("Seleccione un tipo de gestion (no puede ser 'No concluida').");
      return;
    }
    if (!formSolicitanteId) {
      setError("Seleccione un solicitante.");
      return;
    }

    const user = session?.user as Record<string, unknown> | undefined;
    const empleadoId = user?.empleadoId;
    const usuarioId = user?.usuarioId;

    if (!empleadoId || !usuarioId) {
      setError(
        "No se pudo determinar el operador. Cierre sesion e ingrese nuevamente."
      );
      return;
    }

    // Detener timer
    setTimerRunning(false);
    const duracion =
      timerSeconds > 0 ? formatTimer(timerSeconds) : "00:00:00";

    setSaving(true);
    try {
      const payload = {
        empleadoId,
        privadaId: formPrivadaId,
        residenciaId: selectedResidencia.id,
        tipoGestionId: formTipoGestionId,
        solicitanteId: formSolicitanteId,
        estatusId,
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

      // Exito
      setUltimaDuracion(duracion);
      const estatusLabel = getEstatusLabel(estatusId);
      setSuccessMsg(
        `Registro guardado: ${estatusLabel} - ${formSolicitanteNombre}`
      );

      // Cache del nombre
      setNombresCache((prev) => ({
        ...prev,
        [formSolicitanteId]: {
          nombre: formSolicitanteNombre,
          tipo: "?",
        },
      }));

      // Reset para siguiente registro - mantener privada
      const keepPrivada = formPrivadaId;
      resetForm();
      setFormPrivadaId(keepPrivada);
      fetchRegistros();

      // Limpiar mensaje de exito despues de 5 segundos
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch {
      setError("Error de conexion al guardar");
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------
  // Registrar nueva persona (visitante o general)
  // -----------------------------------------------------------
  const guardarNuevoRegistro = async () => {
    if (!regNombre.trim()) {
      setError("El nombre es requerido");
      return;
    }

    setRegSaving(true);
    try {
      const endpoint =
        regTipo === "visitante"
          ? "/api/procesos/registro-accesos/registrar-visitante"
          : "/api/procesos/registro-accesos/registrar-general";

      const body: Record<string, unknown> = {
        nombre: regNombre.trim(),
        apePaterno: regApePaterno.trim(),
        apeMaterno: regApeMaterno.trim(),
        telefono: regTelefono.trim(),
        celular: regCelular.trim(),
        email: regEmail.trim(),
        observaciones: regObservaciones.trim(),
      };

      if (regTipo === "visitante" && selectedResidencia) {
        body.residenciaId = selectedResidencia.id;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al registrar persona");
        return;
      }

      const data = await res.json();
      // Asignar como solicitante
      selectSolicitante(data.id, data.nombre);

      // Reset modal
      setShowRegGeneral(false);
      setRegNombre("");
      setRegApePaterno("");
      setRegApeMaterno("");
      setRegTelefono("");
      setRegCelular("");
      setRegEmail("");
      setRegObservaciones("");

      // Recargar residencia si se agrego visitante
      if (regTipo === "visitante" && selectedResidencia) {
        buscarResidencias();
      }
    } catch {
      setError("Error de conexion al registrar persona");
    } finally {
      setRegSaving(false);
    }
  };

  // -----------------------------------------------------------
  // Get nombre from cache
  // -----------------------------------------------------------
  function getNombreSolicitante(solicitanteId: string) {
    if (!solicitanteId || solicitanteId.trim() === "") return "-";
    const cached = nombresCache[solicitanteId];
    if (cached) {
      const prefix =
        cached.tipo === "R"
          ? "R"
          : cached.tipo === "V"
            ? "V"
            : cached.tipo === "G"
              ? "G"
              : "";
      return prefix ? `[${prefix}] ${cached.nombre}` : cached.nombre;
    }
    return solicitanteId;
  }

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-blue-600" />
            Registro de Accesos
          </h1>
          <p className="text-gray-500 text-sm">
            Consola de monitoreo - Registro de accesos a privadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Timer display */}
          <div className="flex items-center gap-2 bg-gray-900 text-white rounded-lg px-4 py-2">
            <Clock className="h-4 w-4" />
            <span className="font-mono text-lg font-bold">
              {formatTimer(timerSeconds)}
            </span>
          </div>
          <div className="text-xs text-gray-500 text-right">
            <div>
              Ult: <span className="font-mono">{ultimaDuracion}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center justify-between">
          <span>{successMsg}</span>
          <button
            onClick={() => setSuccessMsg("")}
            className="text-green-400 hover:text-green-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* FORMULARIO DE REGISTRO - Panel principal de trabajo              */}
      {/* ================================================================= */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            Nuevo Registro
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={startNewRegistro}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Nuevo
            </button>
            <button
              onClick={() => guardarAcceso(1)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
            >
              <ShieldCheck className="h-4 w-4" />
              Acceso
            </button>
            <button
              onClick={() => guardarAcceso(3)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition"
            >
              <Info className="h-4 w-4" />
              Informo
            </button>
            <button
              onClick={() => guardarAcceso(2)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition"
            >
              <ShieldX className="h-4 w-4" />
              Rechazo
            </button>
          </div>
        </div>

        <div className="flex">
          {/* Columna izquierda: Formulario */}
          <div className="flex-1 p-4 space-y-3 border-r border-gray-200">
            {/* Operador */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">
                Operador
              </label>
              <input
                type="text"
                value={session?.user?.name || ""}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600"
              />
            </div>

            {/* Privada */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">
                Privada
              </label>
              <select
                value={formPrivadaId}
                onChange={(e) => {
                  setFormPrivadaId(e.target.value);
                  setSelectedResidencia(null);
                  setResidencias([]);
                  setResidenciaSearch("");
                  setFormSolicitanteId("");
                  setFormSolicitanteNombre("");
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="">Seleccionar privada...</option>
                {privadas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.descripcion}
                  </option>
                ))}
              </select>
            </div>

            {/* Residencia con autocomplete */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">
                Residencia
              </label>
              {selectedResidencia ? (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-semibold text-blue-800">
                      #{selectedResidencia.nroCasa}
                    </span>
                    <span className="text-blue-700 ml-1">
                      {selectedResidencia.calle}
                    </span>
                    {selectedResidencia.interfon && (
                      <span className="text-blue-500 ml-2 text-xs">
                        Interfon: {selectedResidencia.interfon}
                      </span>
                    )}
                    {selectedResidencia.estatusId !== 1 && (
                      <span
                        className={`ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${getResidenciaEstatusLabel(selectedResidencia.estatusId).color}`}
                      >
                        {
                          getResidenciaEstatusLabel(
                            selectedResidencia.estatusId
                          ).label
                        }
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedResidencia(null);
                      setFormSolicitanteId("");
                      setFormSolicitanteNombre("");
                    }}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={
                      formPrivadaId
                        ? "Buscar #casa o calle..."
                        : "Seleccione primero una privada"
                    }
                    value={residenciaSearch}
                    onChange={(e) => setResidenciaSearch(e.target.value)}
                    disabled={!formPrivadaId}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        buscarResidencias();
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  />
                  {/* Dropdown de resultados */}
                  {residenciasLoading && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 p-2 shadow-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500 mx-auto" />
                    </div>
                  )}
                  {!residenciasLoading && residencias.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                      {residencias.map((r) => {
                        const estatus = getResidenciaEstatusLabel(r.estatusId);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setSelectedResidencia(r);
                              setResidencias([]);
                              setResidenciaSearch("");
                              setFormSolicitanteId("");
                              setFormSolicitanteNombre("");
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 transition text-sm border-b border-gray-100 last:border-b-0"
                          >
                            <span className="font-medium">#{r.nroCasa}</span>
                            <span className="text-gray-600 ml-1">
                              {r.calle}
                            </span>
                            {r.estatusId !== 1 && (
                              <span
                                className={`ml-2 text-xs px-1 rounded ${estatus.color}`}
                              >
                                {estatus.label}
                              </span>
                            )}
                            {r.interfon && (
                              <span className="text-gray-400 text-xs ml-2">
                                Int: {r.interfon}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Info de la residencia */}
              {selectedResidencia && (
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                  {selectedResidencia.telefono1 && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {selectedResidencia.telefono1}
                    </span>
                  )}
                  {selectedResidencia.telefono2 && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {selectedResidencia.telefono2}
                    </span>
                  )}
                  {selectedResidencia.telefonoInterfon && (
                    <span>Tel Interfon: {selectedResidencia.telefonoInterfon}</span>
                  )}
                  {selectedResidencia.observaciones && (
                    <span className="text-amber-600 font-medium">
                      Nota: {selectedResidencia.observaciones}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Solicitante con autocomplete */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">
                Solicitante
              </label>
              {formSolicitanteNombre ? (
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">
                    {formSolicitanteNombre}
                  </span>
                  <button
                    onClick={() => {
                      setFormSolicitanteId("");
                      setFormSolicitanteNombre("");
                    }}
                    className="text-green-400 hover:text-green-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder={
                          selectedResidencia
                            ? "Buscar solicitante..."
                            : "Seleccione primero una residencia"
                        }
                        value={solicitanteSearch}
                        onChange={(e) => setSolicitanteSearch(e.target.value)}
                        disabled={!selectedResidencia}
                        className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!selectedResidencia}
                      onClick={() => {
                        setRegTipo("general");
                        setShowRegGeneral(true);
                      }}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 transition"
                      title="Registrar nueva persona"
                    >
                      <UserPlus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Dropdown de resultados de solicitante */}
                  {solicitanteSearching && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 p-2 shadow-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500 mx-auto" />
                    </div>
                  )}
                  {!solicitanteSearching && solicitanteResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                      {solicitanteResults.map((s) => (
                        <button
                          key={`${s.tipo}-${s.id}`}
                          type="button"
                          onClick={() => selectSolicitante(s.id, s.nombre)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 transition text-sm border-b border-gray-100 last:border-b-0"
                        >
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium mr-1.5 ${
                              s.tipo === "R"
                                ? "bg-blue-100 text-blue-700"
                                : s.tipo === "V"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {s.tipoLabel}
                          </span>
                          <span className="font-medium">{s.nombre}</span>
                          {s.celular && (
                            <span className="text-gray-400 text-xs ml-2">
                              {s.celular}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tipo de Gestion */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">
                Tipo de Gestion
              </label>
              <select
                value={formTipoGestionId}
                onChange={(e) => setFormTipoGestionId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {TIPO_GESTION_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">
                Observaciones
              </label>
              <textarea
                value={formObservaciones}
                onChange={(e) => setFormObservaciones(e.target.value)}
                rows={3}
                placeholder="Observaciones adicionales..."
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Columna derecha: Residentes y Visitantes */}
          <div className="w-[380px] flex-shrink-0">
            {selectedResidencia ? (
              <div className="h-full flex flex-col">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab("residentes")}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
                      activeTab === "residentes"
                        ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Users className="h-4 w-4 inline mr-1" />
                    Residentes ({selectedResidencia.residentes.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("visitantes")}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
                      activeTab === "visitantes"
                        ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50/50"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Users className="h-4 w-4 inline mr-1" />
                    Visitantes ({selectedResidencia.visitas.length})
                  </button>
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto max-h-[350px]">
                  {activeTab === "residentes" ? (
                    <div className="divide-y divide-gray-100">
                      {selectedResidencia.residentes.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-400">
                          No hay residentes registrados
                        </div>
                      ) : (
                        selectedResidencia.residentes.map((r) => {
                          const nombre = `${r.nombre} ${r.apePaterno} ${r.apeMaterno}`.trim();
                          const isSelected = formSolicitanteId === r.id;
                          return (
                            <div
                              key={r.id}
                              className={`px-4 py-2.5 flex items-center justify-between transition ${
                                isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                              }`}
                            >
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {nombre}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {r.celular && (
                                    <span className="mr-3">
                                      Cel: {r.celular}
                                    </span>
                                  )}
                                  {r.reportarAcceso === 1 && (
                                    <span className="text-green-600">
                                      Notificar
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  selectSolicitante(r.id, nombre)
                                }
                                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                                  isSelected
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700"
                                }`}
                              >
                                {isSelected ? "Seleccionado" : "Asignar"}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {selectedResidencia.visitas.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-400">
                          No hay visitantes registrados
                        </div>
                      ) : (
                        selectedResidencia.visitas.map((v) => {
                          const nombre = `${v.nombre} ${v.apePaterno} ${v.apeMaterno}`.trim();
                          const isSelected = formSolicitanteId === v.id;
                          return (
                            <div
                              key={v.id}
                              className={`px-4 py-2.5 flex items-center justify-between transition ${
                                isSelected
                                  ? "bg-purple-50"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {nombre}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {v.celular && (
                                    <span className="mr-3">
                                      Cel: {v.celular}
                                    </span>
                                  )}
                                  {v.observaciones && (
                                    <span className="text-amber-600">
                                      {v.observaciones.substring(0, 30)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  selectSolicitante(v.id, nombre)
                                }
                                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                                  isSelected
                                    ? "bg-purple-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700"
                                }`}
                              >
                                {isSelected ? "Seleccionado" : "Asignar"}
                              </button>
                            </div>
                          );
                        })
                      )}

                      {/* Boton para agregar visitante */}
                      <div className="p-3">
                        <button
                          onClick={() => {
                            setRegTipo("visitante");
                            setShowRegGeneral(true);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
                        >
                          <UserPlus className="h-4 w-4" />
                          Agregar Visitante
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-8 text-center text-gray-400 text-sm">
                <div>
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Seleccione una residencia para ver residentes y visitantes</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* HISTORIAL - Tabla de registros                                    */}
      {/* ================================================================= */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Filtros */}
        <div className="border-b border-gray-200 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600">
              Historial de Accesos
            </span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filtroPrivadaId}
              onChange={(e) => {
                setFiltroPrivadaId(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Todas las privadas</option>
              {privadas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.descripcion}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <span className="text-xs text-gray-400">a</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={() => {
                setFiltroPrivadaId("");
                setFechaDesde(todayStr());
                setFechaHasta(todayStr());
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 transition"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  Fecha/Hora
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  Privada
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  #Casa / Calle
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  Solicitante
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  Tipo Gestion
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  Operador
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                  Estado
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">
                  Ver
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500 mx-auto" />
                    <p className="text-gray-400 text-xs mt-1">Cargando...</p>
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-8 text-gray-400 text-sm"
                  >
                    No se encontraron registros de acceso para el periodo
                    seleccionado
                  </td>
                </tr>
              ) : (
                registros.map((reg) => (
                  <tr
                    key={reg.id}
                    className="hover:bg-gray-50 transition text-sm"
                  >
                    <td className="px-3 py-2 text-gray-700 text-xs font-mono whitespace-nowrap">
                      {formatFechaHora(reg.fechaModificacion)}
                    </td>
                    <td className="px-3 py-2 text-gray-700 text-xs">
                      {reg.privada?.descripcion || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className="font-medium text-gray-900">
                        {reg.residencia?.nroCasa || "-"}
                      </span>
                      <span className="text-gray-500 ml-1">
                        {reg.residencia?.calle || ""}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700 max-w-[200px] truncate">
                      {getNombreSolicitante(reg.solicitanteId)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {TIPO_GESTION_LABELS[reg.tipoGestionId] ||
                        `Tipo ${reg.tipoGestionId}`}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {reg.empleado
                        ? `${reg.empleado.nombre} ${reg.empleado.apePaterno}`
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getEstatusColor(reg.estatusId)}`}
                      >
                        {getEstatusLabel(reg.estatusId)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => viewDetalle(reg.id)}
                        className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
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
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-600">
              {(page - 1) * limit + 1}-{Math.min(page * limit, total)} de{" "}
              {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs text-gray-700">
                {page}/{totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
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
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowDetalle(false);
              setDetalle(null);
            }}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
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
            <div className="p-6">
              {detalleLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
                </div>
              ) : detalle ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500">ID</p>
                      <p className="text-sm font-medium">#{detalle.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Fecha/Hora
                      </p>
                      <p className="text-sm">
                        {formatFechaHora(detalle.fechaModificacion)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Privada
                      </p>
                      <p className="text-sm">
                        {detalle.privada?.descripcion || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Residencia
                      </p>
                      <p className="text-sm">
                        #{detalle.residencia?.nroCasa} -{" "}
                        {detalle.residencia?.calle}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Solicitante
                      </p>
                      <p className="text-sm">
                        {getNombreSolicitante(detalle.solicitanteId)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Tipo Gestion
                      </p>
                      <p className="text-sm">
                        {TIPO_GESTION_LABELS[detalle.tipoGestionId]}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Estado
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getEstatusColor(detalle.estatusId)}`}
                      >
                        {getEstatusLabel(detalle.estatusId)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Operador
                      </p>
                      <p className="text-sm">
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
                        Duracion
                      </p>
                      <p className="text-sm font-mono">
                        {detalle.duracion || "-"}
                      </p>
                    </div>
                  </div>
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
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">
                  No se pudo cargar el detalle
                </p>
              )}
            </div>
            <div className="flex justify-end border-t border-gray-200 px-6 py-4">
              <button
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

      {/* ================================================================= */}
      {/* Modal Registrar nueva persona                                      */}
      {/* ================================================================= */}
      {showRegGeneral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowRegGeneral(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {regTipo === "visitante"
                  ? "Registrar Visitante"
                  : "Registro General"}
              </h2>
              <button
                onClick={() => setShowRegGeneral(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {/* Tipo selector */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setRegTipo("visitante")}
                  disabled={!selectedResidencia}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    regTipo === "visitante"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  } ${!selectedResidencia ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Visitante
                </button>
                <button
                  type="button"
                  onClick={() => setRegTipo("general")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    regTipo === "general"
                      ? "bg-gray-700 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Registro General
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Nombre *"
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Ap. Paterno"
                  value={regApePaterno}
                  onChange={(e) => setRegApePaterno(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Ap. Materno"
                  value={regApeMaterno}
                  onChange={(e) => setRegApeMaterno(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Telefono"
                  value={regTelefono}
                  onChange={(e) => setRegTelefono(e.target.value)}
                  maxLength={14}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Celular"
                  value={regCelular}
                  onChange={(e) => setRegCelular(e.target.value)}
                  maxLength={14}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <input
                type="email"
                placeholder="Email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />

              <textarea
                placeholder="Observaciones"
                value={regObservaciones}
                onChange={(e) => setRegObservaciones(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowRegGeneral(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardarNuevoRegistro}
                disabled={regSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {regSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar y Asignar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
