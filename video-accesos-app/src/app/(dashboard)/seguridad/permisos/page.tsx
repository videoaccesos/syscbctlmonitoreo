"use client";

import { useEffect, useState, useCallback } from "react";
import {
  KeyRound,
  Loader2,
  Save,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GrupoUsuario {
  id: number;
  nombre: string;
  estatusId: number;
  _count: {
    detalles: number;
  };
}

interface Subproceso {
  id: number;
  procesoId: number;
  nombre: string;
  funcion: string | null;
}

interface Proceso {
  id: number;
  nombre: string;
  rutaAcceso: string | null;
  procesoPadreId: number | null;
  subprocesos: Subproceso[];
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function PermisosPage() {
  // Data state
  const [grupos, setGrupos] = useState<GrupoUsuario[]>([]);
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [selectedGrupoId, setSelectedGrupoId] = useState<string>("");
  const [subprocesoIdsSeleccionados, setSubprocesoIdsSeleccionados] = useState<
    number[]
  >([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingPermisos, setLoadingPermisos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");
  const [expandedProcesos, setExpandedProcesos] = useState<
    Record<number, boolean>
  >({});

  // -----------------------------------------------------------
  // Fetch grupos de usuarios
  // -----------------------------------------------------------
  const fetchGrupos = useCallback(async () => {
    try {
      const res = await fetch("/api/seguridad/grupos-usuarios?pageSize=1000");
      if (!res.ok) return;
      const json = await res.json();
      // Filtrar solo activos
      const activos = (json.data || []).filter(
        (g: GrupoUsuario) => g.estatusId === 1
      );
      setGrupos(activos);
    } catch {
      console.error("Error al cargar grupos");
    }
  }, []);

  useEffect(() => {
    fetchGrupos();
  }, [fetchGrupos]);

  // -----------------------------------------------------------
  // Fetch permisos del grupo seleccionado
  // -----------------------------------------------------------
  const fetchPermisos = useCallback(async (grupoId: string) => {
    if (!grupoId) {
      setProcesos([]);
      setSubprocesoIdsSeleccionados([]);
      return;
    }

    setLoadingPermisos(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(
        `/api/seguridad/permisos?grupoUsuarioId=${grupoId}`
      );
      if (!res.ok) throw new Error("Error al obtener permisos");
      const json = await res.json();

      setProcesos(json.procesos || []);
      setSubprocesoIdsSeleccionados(json.subprocesoIdsConPermiso || []);

      // Expandir todos los procesos por defecto
      const expanded: Record<number, boolean> = {};
      (json.procesos || []).forEach((p: Proceso) => {
        expanded[p.id] = true;
      });
      setExpandedProcesos(expanded);
    } catch {
      setError("Error al cargar permisos del grupo");
    } finally {
      setLoadingPermisos(false);
    }
  }, []);

  useEffect(() => {
    fetchPermisos(selectedGrupoId);
  }, [selectedGrupoId, fetchPermisos]);

  // -----------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------

  const handleGrupoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGrupoId(e.target.value);
  };

  const toggleProceso = (procesoId: number) => {
    setExpandedProcesos((prev) => ({
      ...prev,
      [procesoId]: !prev[procesoId],
    }));
  };

  const handleSubprocesoToggle = (subprocesoId: number) => {
    setSubprocesoIdsSeleccionados((prev) => {
      const exists = prev.includes(subprocesoId);
      return exists
        ? prev.filter((id) => id !== subprocesoId)
        : [...prev, subprocesoId];
    });
  };

  const handleProcesoToggle = (proceso: Proceso) => {
    const subIds = proceso.subprocesos.map((s) => s.id);
    const allChecked = subIds.every((id) =>
      subprocesoIdsSeleccionados.includes(id)
    );

    if (allChecked) {
      // Deseleccionar todos
      setSubprocesoIdsSeleccionados((prev) =>
        prev.filter((id) => !subIds.includes(id))
      );
    } else {
      // Seleccionar todos
      setSubprocesoIdsSeleccionados((prev) => {
        const newIds = new Set([...prev, ...subIds]);
        return Array.from(newIds);
      });
    }
  };

  const handleSelectAll = () => {
    const allSubIds = procesos.flatMap((p) =>
      p.subprocesos.map((s) => s.id)
    );
    setSubprocesoIdsSeleccionados(allSubIds);
  };

  const handleDeselectAll = () => {
    setSubprocesoIdsSeleccionados([]);
  };

  const handleSave = async () => {
    if (!selectedGrupoId) {
      setError("Seleccione un grupo de usuario");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/seguridad/permisos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grupoUsuarioId: parseInt(selectedGrupoId, 10),
          subprocesoIds: subprocesoIdsSeleccionados,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar permisos");
        return;
      }

      setSuccessMsg("Permisos actualizados correctamente");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setError("Error de conexion al guardar permisos");
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------

  const getProcesoCheckState = (proceso: Proceso) => {
    if (proceso.subprocesos.length === 0) return "none";
    const subIds = proceso.subprocesos.map((s) => s.id);
    const checkedCount = subIds.filter((id) =>
      subprocesoIdsSeleccionados.includes(id)
    ).length;

    if (checkedCount === 0) return "none";
    if (checkedCount === subIds.length) return "all";
    return "some";
  };

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <KeyRound className="h-7 w-7 text-blue-600" />
          Permisos de Acceso
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Configura los permisos de acceso por grupo de usuarios
        </p>
      </div>

      {/* Group selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grupo de Usuario
            </label>
            <select
              value={selectedGrupoId}
              onChange={handleGrupoChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Seleccionar grupo...</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre} ({g._count.detalles} usuarios)
                </option>
              ))}
            </select>
          </div>

          {selectedGrupoId && (
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Seleccionar Todo
              </button>
              <button
                onClick={handleDeselectAll}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Deseleccionar Todo
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar Permisos
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Permissions tree */}
      {loadingPermisos ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto" />
          <p className="text-gray-400 text-sm mt-2">Cargando permisos...</p>
        </div>
      ) : selectedGrupoId && procesos.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-700">
              Procesos y Subprocesos -{" "}
              <span className="text-blue-600">
                {subprocesoIdsSeleccionados.length} permiso{subprocesoIdsSeleccionados.length !== 1 ? "s" : ""} seleccionado{subprocesoIdsSeleccionados.length !== 1 ? "s" : ""}
              </span>
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {procesos.map((proceso) => {
              const isExpanded = expandedProcesos[proceso.id] || false;
              const checkState = getProcesoCheckState(proceso);

              return (
                <div key={proceso.id}>
                  {/* Proceso header */}
                  <div className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition">
                    <button
                      onClick={() => toggleProceso(proceso.id)}
                      className="p-0.5 text-gray-400 hover:text-gray-600"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checkState === "all"}
                        ref={(el) => {
                          if (el) el.indeterminate = checkState === "some";
                        }}
                        onChange={() => handleProcesoToggle(proceso)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={proceso.subprocesos.length === 0}
                      />
                      <span className="text-sm font-semibold text-gray-900">
                        {proceso.nombre}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({proceso.subprocesos.length} subproceso{proceso.subprocesos.length !== 1 ? "s" : ""})
                      </span>
                    </label>
                  </div>

                  {/* Subprocesos */}
                  {isExpanded && proceso.subprocesos.length > 0 && (
                    <div className="pl-12 pr-4 pb-2 space-y-1">
                      {proceso.subprocesos.map((sub) => (
                        <label
                          key={sub.id}
                          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={subprocesoIdsSeleccionados.includes(sub.id)}
                            onChange={() => handleSubprocesoToggle(sub.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {sub.nombre}
                          </span>
                          {sub.funcion && (
                            <span className="text-xs text-gray-400">
                              ({sub.funcion})
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : selectedGrupoId && procesos.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">
            No hay procesos configurados en el sistema
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <KeyRound className="h-12 w-12 text-gray-300 mx-auto" />
          <p className="text-gray-400 text-sm mt-3">
            Seleccione un grupo de usuario para ver y configurar sus permisos
          </p>
        </div>
      )}
    </div>
  );
}
