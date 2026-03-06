"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Filter,
  ShieldCheck,
  ShieldX,
  Info,
  UserPlus,
  Users,
  Eye,
  PhoneIncoming,
  Headset,
  Video,
  VideoOff,
  Plus,
  RotateCcw,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";

// Softphone minimo - requires browser APIs (WebRTC, WebSocket)
const AccesPhone = dynamic(() => import("@/components/AccesPhone"), {
  ssr: false,
});
const CameraGrid = dynamic(() => import("@/components/CameraGrid"), {
  ssr: false,
});

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
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case 2:
      return "bg-red-50 text-red-700 ring-red-600/20";
    case 3:
      return "bg-sky-50 text-sky-700 ring-sky-600/20";
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
      return { label: "Activo", color: "text-emerald-700 bg-emerald-50" };
    case 2:
      return { label: "Inactivo", color: "text-amber-700 bg-amber-50" };
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

export default function MonitoristasPage() {
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

  // Video/camera state - panel lateral derecho
  const [showVideo, setShowVideo] = useState(false);

  // Form state
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

  // Incoming call notification
  const [incomingCallNumber, setIncomingCallNumber] = useState("");
  const [incomingCallResidencia, setIncomingCallResidencia] = useState<{
    id: number;
    nroCasa: string;
    calle: string;
    privada: { id: number; descripcion: string };
    observaciones: string | null;
    estatusId: number;
  } | null>(null);
  const [lookingUpCaller, setLookingUpCaller] = useState(false);

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
  // Auto-show cameras when privada is selected
  // -----------------------------------------------------------
  useEffect(() => {
    if (formPrivadaId) {
      setShowVideo(true);
    } else {
      setShowVideo(false);
    }
  }, [formPrivadaId]);

  // -----------------------------------------------------------
  // ESC key closes camera panel
  // -----------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showVideo) {
        setShowVideo(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showVideo]);

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

  // -----------------------------------------------------------
  // AccesPhone - Incoming call handler
  // -----------------------------------------------------------
  const handleIncomingCall = useCallback(
    async (callerNumber: string, displayName?: string) => {
      setIncomingCallNumber(callerNumber);
      setIncomingCallResidencia(null);
      setLookingUpCaller(true);

      try {
        const params = new URLSearchParams({ telefono: callerNumber });
        if (displayName) params.set("nombre", displayName);
        const res = await fetch(
          `/api/procesos/registro-accesos/buscar-por-telefono?${params.toString()}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.found) {
            const isResidenciaMatch = json.matchLevel === "residencia" && json.data;

            if (isResidenciaMatch) {
              // Match exacto a nivel residencia - auto-poblar todo
              setIncomingCallResidencia({
                id: json.data.id,
                nroCasa: json.data.nroCasa,
                calle: json.data.calle,
                privada: json.data.privada,
                observaciones: json.data.observaciones,
                estatusId: json.data.estatusId,
              });

              const privId = String(json.data.privada.id);
              setFormPrivadaId(privId);
              setSelectedResidencia(json.data);
              setResidencias([]);
              setResidenciaSearch("");
              setFormSolicitanteId("");
              setFormSolicitanteNombre("");
            } else if (json.matchLevel === "privada" && json.privada) {
              // Match a nivel privada - solo seleccionar la privada, dejar residencia limpia
              setIncomingCallResidencia(null);
              const privId = String(json.privada.id);
              setFormPrivadaId(privId);
              setSelectedResidencia(null);
              setResidencias([]);
              setResidenciaSearch("");
              setFormSolicitanteId("");
              setFormSolicitanteNombre("");
            }

            // Start timer
            setTimerRunning(true);
            setTimerSeconds(0);

            // Auto-show video
            setShowVideo(true);
          }
        }
      } catch {
        console.error("Error al buscar residencia por telefono");
      } finally {
        setLookingUpCaller(false);
      }
    },
    []
  );

  const handleCallAnswered = useCallback(
    (callerNumber: string) => {
      if (incomingCallResidencia) {
        if (!timerRunning) {
          setTimerRunning(true);
          setTimerSeconds(0);
        }
      }
      setIncomingCallNumber(callerNumber);
    },
    [incomingCallResidencia, timerRunning]
  );

  const handleCallEnded = useCallback(() => {
    setIncomingCallNumber("");
  }, []);

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
      {/* ================================================================= */}
      {/* HEADER + SOFTPHONE MINIMO                                          */}
      {/* ================================================================= */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
            <Headset className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Consola de Monitorista
            </h1>
            <p className="text-sm text-gray-500">
              Registro y control de accesos a privadas
            </p>
          </div>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-end gap-1">
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono transition-all ${
            timerRunning
              ? "bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg"
              : "bg-gray-100 text-gray-600"
          }`}>
            <Clock className={`h-4 w-4 ${timerRunning ? "animate-pulse" : ""}`} />
            <span className="text-lg font-bold tabular-nums">
              {formatTimer(timerSeconds)}
            </span>
          </div>
          <div className="text-[11px] text-gray-400 text-right leading-tight">
            Ultima: <span className="font-mono text-gray-500">{ultimaDuracion}</span>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* INCOMING CALL BANNER                                               */}
      {/* ================================================================= */}
      {incomingCallNumber && (
        <div className={`rounded-2xl border-2 px-5 py-4 flex items-center gap-4 transition-all ${
          incomingCallResidencia
            ? "bg-emerald-50 border-emerald-300 shadow-lg shadow-emerald-100"
            : lookingUpCaller
              ? "bg-amber-50 border-amber-300 shadow-lg shadow-amber-100"
              : "bg-orange-50 border-orange-300 shadow-lg shadow-orange-100"
        }`}>
          <div className={`flex items-center justify-center h-10 w-10 rounded-full ${
            incomingCallResidencia ? "bg-emerald-500" : "bg-orange-500"
          }`}>
            <PhoneIncoming className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-gray-900">
              Llamada entrante: <span className="font-mono">{incomingCallNumber}</span>
            </div>
            {lookingUpCaller && (
              <div className="text-xs text-amber-700 flex items-center gap-1 mt-0.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Buscando residencia...
              </div>
            )}
            {incomingCallResidencia && (
              <div className="text-xs text-emerald-700 mt-0.5">
                Identificado: <strong>{incomingCallResidencia.privada.descripcion}</strong>
                {" - "}#{incomingCallResidencia.nroCasa} {incomingCallResidencia.calle}
                {incomingCallResidencia.observaciones && (
                  <span className="text-red-600 ml-2 font-semibold">
                    NOTA: {incomingCallResidencia.observaciones}
                  </span>
                )}
              </div>
            )}
            {!lookingUpCaller && !incomingCallResidencia && (
              <div className="text-xs text-orange-700 mt-0.5">
                Numero no encontrado en el sistema
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setIncomingCallNumber("");
              setIncomingCallResidencia(null);
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/60 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* MESSAGES                                                           */}
      {/* ================================================================= */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 flex items-center justify-between shadow-sm">
          <span>{error}</span>
          <button onClick={() => setError("")} className="p-0.5 text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-sm text-emerald-700 flex items-center justify-between shadow-sm">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="p-0.5 text-emerald-400 hover:text-emerald-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* REGISTRATION FORM                                                  */}
      {/* ================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm relative z-20">
        {/* Form header with action buttons */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-3 rounded-t-2xl">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-600" />
            Nuevo Registro de Acceso
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={startNewRegistro}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Nuevo
            </button>
            <div className="w-px h-6 bg-gray-200" />
            <button
              onClick={() => guardarAcceso(1)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm shadow-emerald-200 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition-all"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Acceso
            </button>
            <button
              onClick={() => guardarAcceso(3)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm shadow-amber-200 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 transition-all"
            >
              <Info className="h-3.5 w-3.5" />
              Informo
            </button>
            <button
              onClick={() => guardarAcceso(2)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm shadow-red-200 hover:from-red-600 hover:to-red-700 disabled:opacity-50 transition-all"
            >
              <ShieldX className="h-3.5 w-3.5" />
              Rechazo
            </button>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {/* Row 1: Operador + Privada + Tipo Gestion */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                Operador
              </label>
              <input
                type="text"
                value={session?.user?.name || ""}
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
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
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
              >
                <option value="">Seleccionar privada...</option>
                {privadas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.descripcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                Tipo de Gestion
              </label>
              <select
                value={formTipoGestionId}
                onChange={(e) => setFormTipoGestionId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
              >
                {TIPO_GESTION_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Residencia + Solicitante + Observaciones */}
          <div className="grid grid-cols-3 gap-4">
            {/* Residencia */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                Residencia
              </label>
              {selectedResidencia ? (
                <div>
                  <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-2 flex items-center justify-between">
                    <div className="text-xs min-w-0">
                      <span className="font-bold text-indigo-800">
                        #{selectedResidencia.nroCasa}
                      </span>
                      <span className="text-indigo-700 ml-1">
                        {selectedResidencia.calle}
                      </span>
                      {selectedResidencia.interfon && (
                        <span className="text-indigo-500 ml-1">
                          Int: {selectedResidencia.interfon}
                        </span>
                      )}
                      {selectedResidencia.estatusId !== 1 && (
                        <span
                          className={`ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getResidenciaEstatusLabel(selectedResidencia.estatusId).color}`}
                        >
                          {getResidenciaEstatusLabel(selectedResidencia.estatusId).label}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedResidencia(null);
                        setFormSolicitanteId("");
                        setFormSolicitanteNombre("");
                      }}
                      className="text-indigo-400 hover:text-indigo-600 ml-2 flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {selectedResidencia.observaciones && (
                    <div className="mt-1 rounded-xl bg-red-50 border border-red-300 px-2.5 py-1 text-[10px] font-bold text-red-700">
                      NOTA: {selectedResidencia.observaciones}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
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
                    className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:bg-gray-100 disabled:text-gray-400 transition"
                  />
                  {residenciasLoading && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 p-3 shadow-xl">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500 mx-auto" />
                    </div>
                  )}
                  {!residenciasLoading && residencias.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-xl max-h-52 overflow-y-auto">
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
                            className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition text-sm border-b border-gray-100 last:border-b-0"
                          >
                            <span className="font-semibold">#{r.nroCasa}</span>
                            <span className="text-gray-600 ml-1">{r.calle}</span>
                            {r.estatusId !== 1 && (
                              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${estatus.color}`}>
                                {estatus.label}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Solicitante */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                Solicitante
              </label>
              {formSolicitanteNombre ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800 truncate">
                    {formSolicitanteNombre}
                  </span>
                  <button
                    onClick={() => {
                      setFormSolicitanteId("");
                      setFormSolicitanteNombre("");
                    }}
                    className="text-emerald-400 hover:text-emerald-600 ml-2 flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder={
                          selectedResidencia
                            ? "Buscar solicitante..."
                            : "Seleccione residencia"
                        }
                        value={solicitanteSearch}
                        onChange={(e) => setSolicitanteSearch(e.target.value)}
                        disabled={!selectedResidencia}
                        className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:bg-gray-100 disabled:text-gray-400 transition"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!selectedResidencia}
                      onClick={() => {
                        setRegTipo("general");
                        setShowRegGeneral(true);
                      }}
                      className="rounded-xl border border-gray-300 px-2.5 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 transition"
                      title="Registrar nueva persona"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {solicitanteSearching && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 p-3 shadow-xl">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500 mx-auto" />
                    </div>
                  )}
                  {!solicitanteSearching && solicitanteResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-xl max-h-52 overflow-y-auto">
                      {solicitanteResults.map((s) => (
                        <button
                          key={`${s.tipo}-${s.id}`}
                          type="button"
                          onClick={() => selectSolicitante(s.id, s.nombre)}
                          className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition text-sm border-b border-gray-100 last:border-b-0"
                        >
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold mr-1.5 ${
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
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                Observaciones
              </label>
              <input
                type="text"
                value={formObservaciones}
                onChange={(e) => setFormObservaciones(e.target.value)}
                placeholder="Notas adicionales..."
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cameras are now in the right-side sliding panel (see below) */}

      {/* ================================================================= */}
      {/* CONTEXT PANELS: Residentes/Visitantes                              */}
      {/* Only visible when a residencia is selected                         */}
      {/* ================================================================= */}
      {selectedResidencia && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab("residentes")}
              className={`flex-1 px-4 py-2.5 text-xs font-semibold transition ${
                activeTab === "residentes"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/40"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Users className="h-3.5 w-3.5 inline mr-1.5" />
              Residentes ({selectedResidencia.residentes.length})
            </button>
            <button
              onClick={() => setActiveTab("visitantes")}
              className={`flex-1 px-4 py-2.5 text-xs font-semibold transition ${
                activeTab === "visitantes"
                  ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50/40"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Users className="h-3.5 w-3.5 inline mr-1.5" />
              Visitantes ({selectedResidencia.visitas.length})
            </button>
          </div>

          {/* Tab content */}
          <div className="max-h-[280px] overflow-y-auto">
            {activeTab === "residentes" ? (
              <div className="divide-y divide-gray-50">
                {selectedResidencia.residentes.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">
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
                          isSelected ? "bg-indigo-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {nombre}
                          </div>
                          {r.celular && (
                            <div className="text-[10px] text-gray-500 font-mono">{r.celular}</div>
                          )}
                        </div>
                        <button
                          onClick={() => selectSolicitante(r.id, nombre)}
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ml-3 ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700"
                          }`}
                        >
                          {isSelected ? "Asignado" : "Asignar"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {selectedResidencia.visitas.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">
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
                          isSelected ? "bg-purple-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {nombre}
                          </div>
                        </div>
                        <button
                          onClick={() => selectSolicitante(v.id, nombre)}
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ml-3 ${
                            isSelected
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700"
                          }`}
                        >
                          {isSelected ? "Asignado" : "Asignar"}
                        </button>
                      </div>
                    );
                  })
                )}
                <div className="p-3">
                  <button
                    onClick={() => {
                      setRegTipo("visitante");
                      setShowRegGeneral(true);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 px-3 py-2 text-xs font-medium text-gray-400 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50/50 transition"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Agregar Visitante
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ACCESS HISTORY TABLE                                               */}
      {/* ================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-bold text-gray-700">
                Historial de Accesos
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                {total} registros
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filtroPrivadaId}
                onChange={(e) => {
                  setFiltroPrivadaId(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
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
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <span className="text-xs text-gray-400">a</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              <button
                onClick={() => {
                  setFiltroPrivadaId("");
                  setFechaDesde(todayStr());
                  setFechaHasta(todayStr());
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Fecha/Hora
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Privada
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  #Casa
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Solicitante
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Ver
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto" />
                    <p className="text-gray-400 text-xs mt-2">Cargando registros...</p>
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 text-xs">
                    No se encontraron registros para el periodo seleccionado
                  </td>
                </tr>
              ) : (
                registros.map((reg, idx) => (
                  <tr
                    key={reg.id}
                    className={`transition hover:bg-indigo-50/30 ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    }`}
                  >
                    <td className="px-4 py-2.5 text-gray-700 text-[11px] font-mono whitespace-nowrap">
                      {formatFechaHora(reg.fechaModificacion)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 text-[11px]">
                      {reg.privada?.descripcion || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-[11px]">
                      <span className="font-bold text-gray-900">
                        {reg.residencia?.nroCasa || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-700 max-w-[180px] truncate">
                      {getNombreSolicitante(reg.solicitanteId)}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-700">
                      {TIPO_GESTION_LABELS[reg.tipoGestionId] ||
                        `Tipo ${reg.tipoGestionId}`}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${getEstatusColor(reg.estatusId)}`}
                      >
                        {getEstatusLabel(reg.estatusId)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => viewDetalle(reg.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="Ver detalle"
                      >
                        <Eye className="h-3.5 w-3.5" />
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
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 px-5 py-2.5">
            <p className="text-[11px] text-gray-500">
              Mostrando {(page - 1) * limit + 1}-{Math.min(page * limit, total)} de{" "}
              {total} registros
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-3 py-1 text-[11px] font-medium text-gray-700 bg-white rounded-lg border border-gray-200">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* DETAIL MODAL                                                       */}
      {/* ================================================================= */}
      {showDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowDetalle(false);
              setDetalle(null);
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                Detalle del Registro
              </h2>
              <button
                onClick={() => {
                  setShowDetalle(false);
                  setDetalle(null);
                }}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {detalleLoading ? (
                <div className="text-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto" />
                </div>
              ) : detalle ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">ID</p>
                      <p className="text-sm font-semibold">#{detalle.id}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Fecha/Hora</p>
                      <p className="text-sm">{formatFechaHora(detalle.fechaModificacion)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Privada</p>
                      <p className="text-sm">{detalle.privada?.descripcion || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Residencia</p>
                      <p className="text-sm">
                        #{detalle.residencia?.nroCasa} - {detalle.residencia?.calle}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Solicitante</p>
                      <p className="text-sm">{getNombreSolicitante(detalle.solicitanteId)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Tipo Gestion</p>
                      <p className="text-sm">{TIPO_GESTION_LABELS[detalle.tipoGestionId]}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Estado</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${getEstatusColor(detalle.estatusId)}`}
                      >
                        {getEstatusLabel(detalle.estatusId)}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Operador</p>
                      <p className="text-sm">
                        {detalle.empleado
                          ? `${detalle.empleado.nombre} ${detalle.empleado.apePaterno} ${detalle.empleado.apeMaterno}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Duracion</p>
                      <p className="text-sm font-mono">{detalle.duracion || "-"}</p>
                    </div>
                  </div>
                  {detalle.observaciones && (
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Observaciones</p>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">
                        {detalle.observaciones}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-10">
                  No se pudo cargar el detalle
                </p>
              )}
            </div>
            <div className="flex justify-end border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => {
                  setShowDetalle(false);
                  setDetalle(null);
                }}
                className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* REGISTER PERSON MODAL                                              */}
      {/* ================================================================= */}
      {/* ================================================================= */}
      {/* FLOATING SOFTPHONE (bottom-left, after sidebar)                    */}
      {/* ================================================================= */}
      <AccesPhone
        onIncomingCall={handleIncomingCall}
        onCallAnswered={handleCallAnswered}
        onCallEnded={handleCallEnded}
      />

      {/* ================================================================= */}
      {/* CAMERA PANEL - right side sliding drawer                           */}
      {/* ================================================================= */}
      {(formPrivadaId || incomingCallNumber) && (
        <>
          {/* Toggle tab on right edge - always visible, toggles open/close */}
          <button
            onClick={() => setShowVideo((v) => !v)}
            className={`fixed top-1/2 -translate-y-1/2 z-[41] bg-gray-900 text-white rounded-l-xl px-2 py-4 shadow-lg hover:bg-gray-800 transition-all group ${
              showVideo ? "right-[340px]" : "right-0"
            }`}
            title={showVideo ? "Ocultar camaras (Esc)" : "Mostrar camaras"}
          >
            {showVideo ? (
              <PanelRightClose className="h-5 w-5 mb-2" />
            ) : (
              <PanelRightOpen className="h-5 w-5 mb-2" />
            )}
            <Video className="h-5 w-5 text-orange-400" />
          </button>

          {/* Sliding panel */}
          <div
            className={`fixed top-0 right-0 h-full z-[40] transition-transform duration-300 ease-in-out ${
              showVideo ? "translate-x-0" : "translate-x-full"
            }`}
            style={{ width: 340 }}
          >
            <div className="h-full bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col">
              {/* Panel header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700 bg-gray-800">
                <div className="flex items-center gap-2 text-white">
                  <Video className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-bold">Camaras</span>
                  {incomingCallResidencia && (
                    <span className="text-xs text-emerald-400 font-medium truncate max-w-[120px]">
                      {incomingCallResidencia.privada.descripcion}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowVideo(false)}
                  className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition"
                  title="Ocultar camaras (Esc)"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
              </div>

              {/* Camera content */}
              <div className="flex-1 overflow-y-auto p-2">
                <CameraGrid
                  telefono={incomingCallNumber || undefined}
                  privadaId={incomingCallResidencia?.privada?.id || (formPrivadaId ? Number(formPrivadaId) : undefined)}
                  refreshMs={300}
                  active={showVideo}
                  compact
                />
              </div>
            </div>
          </div>
        </>
      )}

      {showRegGeneral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRegGeneral(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                {regTipo === "visitante"
                  ? "Registrar Visitante"
                  : "Registro General"}
              </h2>
              <button
                onClick={() => setShowRegGeneral(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Type selector */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRegTipo("visitante")}
                  disabled={!selectedResidencia}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    regTipo === "visitante"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  } ${!selectedResidencia ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Visitante
                </button>
                <button
                  type="button"
                  onClick={() => setRegTipo("general")}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    regTipo === "general"
                      ? "bg-gray-800 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Registro General
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Nombre *"
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                />
                <input
                  type="text"
                  placeholder="Ap. Paterno"
                  value={regApePaterno}
                  onChange={(e) => setRegApePaterno(e.target.value)}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                />
                <input
                  type="text"
                  placeholder="Ap. Materno"
                  value={regApeMaterno}
                  onChange={(e) => setRegApeMaterno(e.target.value)}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Telefono"
                  value={regTelefono}
                  onChange={(e) => setRegTelefono(e.target.value)}
                  maxLength={14}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                />
                <input
                  type="text"
                  placeholder="Celular"
                  value={regCelular}
                  onChange={(e) => setRegCelular(e.target.value)}
                  maxLength={14}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                />
              </div>

              <input
                type="email"
                placeholder="Email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
              />

              <textarea
                placeholder="Observaciones"
                value={regObservaciones}
                onChange={(e) => setRegObservaciones(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none transition"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowRegGeneral(false)}
                className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardarNuevoRegistro}
                disabled={regSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
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
