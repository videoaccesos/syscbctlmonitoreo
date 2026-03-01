"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Camera, CameraOff, RefreshCw, ChevronLeft, ChevronRight, X } from "lucide-react";

interface CameraInfo {
  index: number;
  alias: string;
  available: boolean;
}

interface CameraLookupResult {
  found: boolean;
  privada_id?: number;
  privada?: string;
  cameras?: CameraInfo[];
  message?: string;
}

interface CameraGridProps {
  telefono?: string;
  privadaId?: number;
  refreshMs?: number;
  active?: boolean; // controla si el refresh esta activo
  onClose?: () => void;
  compact?: boolean; // modo compacto para sidebar
}

export default function CameraGrid({
  telefono,
  privadaId,
  refreshMs = 300,
  active = true,
  onClose,
  compact = false,
}: CameraGridProps) {
  const [lookup, setLookup] = useState<CameraLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeCamTab, setActiveCamTab] = useState(0); // indice de la camara activa en modo compact
  const [paused, setPaused] = useState(false);
  const imgRefs = useRef<Map<number, HTMLImageElement>>(new Map());
  const intervalsRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const mountedRef = useRef(true);

  // Buscar camaras cuando cambia el telefono/privadaId
  const lookupCameras = useCallback(async () => {
    if (!telefono && !privadaId) return;

    setLoading(true);
    setError("");
    setLookup(null);

    try {
      const params = new URLSearchParams();
      if (privadaId) {
        params.set("privada_id", String(privadaId));
      } else if (telefono) {
        params.set("telefono", telefono);
      }

      const res = await fetch(`/api/camera-proxy/lookup?${params.toString()}`);
      if (!res.ok) {
        setError("Error al buscar camaras");
        return;
      }

      const data: CameraLookupResult = await res.json();
      if (mountedRef.current) {
        setLookup(data);
      }
    } catch {
      if (mountedRef.current) {
        setError("Error de conexion al buscar camaras");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [telefono, privadaId]);

  useEffect(() => {
    mountedRef.current = true;
    lookupCameras();
    return () => {
      mountedRef.current = false;
    };
  }, [lookupCameras]);

  // Iniciar/detener refresh de imagenes
  useEffect(() => {
    // Limpiar intervalos anteriores
    intervalsRef.current.forEach((interval) => clearInterval(interval));
    intervalsRef.current.clear();

    if (!active || paused || !lookup?.found || !lookup.cameras?.length) {
      return;
    }

    const proxyBase = "/api/camera-proxy";
    const params = new URLSearchParams();
    if (lookup.privada_id) {
      params.set("privada_id", String(lookup.privada_id));
    } else if (telefono) {
      params.set("telefono", telefono);
    }

    // Para cada camara disponible, crear un interval de refresh
    for (const cam of lookup.cameras) {
      if (!cam.available) continue;

      const refreshCamera = () => {
        const img = imgRefs.current.get(cam.index);
        if (!img) return;
        // Agregar timestamp para evitar cache
        const camParams = new URLSearchParams(params);
        camParams.set("cam", String(cam.index));
        camParams.set("t", String(Date.now()));
        img.src = `${proxyBase}?${camParams.toString()}`;
      };

      // Primer fetch inmediato
      refreshCamera();

      // Refresh periodico
      const interval = setInterval(refreshCamera, refreshMs);
      intervalsRef.current.set(cam.index, interval);
    }

    return () => {
      intervalsRef.current.forEach((interval) => clearInterval(interval));
      intervalsRef.current.clear();
    };
  }, [active, paused, lookup, telefono, refreshMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((interval) => clearInterval(interval));
      intervalsRef.current.clear();
    };
  }, []);

  // Ref callback para registrar imagenes
  const setImgRef = useCallback((index: number, el: HTMLImageElement | null) => {
    if (el) {
      imgRefs.current.set(index, el);
    } else {
      imgRefs.current.delete(index);
    }
  }, []);

  // Sin telefono/privada configurado
  if (!telefono && !privadaId) {
    return null;
  }

  // Cargando
  if (loading) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-gray-50 p-4 ${compact ? "text-xs" : ""}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Buscando camaras...</span>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 p-4 ${compact ? "text-xs" : ""}`}>
        <div className="flex items-center gap-2 text-red-600">
          <CameraOff className="h-4 w-4" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // No encontrado
  if (lookup && !lookup.found) {
    return (
      <div className={`rounded-lg border border-yellow-200 bg-yellow-50 p-3 ${compact ? "text-xs" : ""}`}>
        <div className="flex items-center gap-2 text-yellow-700">
          <CameraOff className="h-4 w-4" />
          <span>Sin camaras configuradas para este numero</span>
        </div>
      </div>
    );
  }

  // Sin camaras
  if (!lookup?.cameras?.length) {
    return null;
  }

  const availableCams = lookup.cameras.filter((c) => c.available);
  if (availableCams.length === 0) return null;

  // Determinar grid columns segun numero de camaras (solo para modo no-compact)
  const gridCols =
    availableCams.length === 1
      ? "grid-cols-1"
      : "grid-cols-2";

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 text-white">
          <Camera className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-medium">
            {lookup.privada}
          </span>
          {!compact && (
            <span className="text-xs text-gray-400">
              ({availableCams.length} camara{availableCams.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPaused(!paused)}
            className={`p-1.5 rounded text-xs transition ${
              paused
                ? "bg-yellow-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            title={paused ? "Reanudar" : "Pausar"}
          >
            {paused ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <span className="h-3.5 w-3.5 flex items-center justify-center text-[10px] font-bold">||</span>
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Paused indicator */}
      {paused && (
        <div className="bg-yellow-900/50 border-b border-yellow-700/50 px-3 py-1 text-center">
          <span className="text-xs text-yellow-400">Video pausado - clic para reanudar</span>
        </div>
      )}

      {compact ? (
        /* ============================================================
           MODO COMPACT: una camara a la vez con tabs de navegacion
           ============================================================ */
        <>
          {/* Tabs de camaras */}
          {availableCams.length > 1 && (
            <div className="flex items-center bg-gray-800/80 border-b border-gray-700">
              <button
                onClick={() => setActiveCamTab((activeCamTab - 1 + availableCams.length) % availableCams.length)}
                className="p-1.5 text-gray-400 hover:text-white transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div className="flex-1 flex justify-center gap-1">
                {availableCams.map((cam, idx) => (
                  <button
                    key={cam.index}
                    onClick={() => setActiveCamTab(idx)}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition ${
                      activeCamTab === idx
                        ? "bg-orange-500 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-700"
                    }`}
                  >
                    {cam.alias}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setActiveCamTab((activeCamTab + 1) % availableCams.length)}
                className="p-1.5 text-gray-400 hover:text-white transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Imagen de la camara activa - ocupa todo el ancho */}
          <div className="relative bg-black">
            {availableCams.map((cam, idx) => (
              <div
                key={cam.index}
                className={activeCamTab === idx ? "block" : "hidden"}
              >
                {/* Camera label (solo si hay 1 camara, si hay varias ya esta en los tabs) */}
                {availableCams.length === 1 && (
                  <div className="absolute top-1 left-1 z-10 bg-black/60 rounded px-1.5 py-0.5">
                    <span className="text-[10px] text-white font-medium">{cam.alias}</span>
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={(el) => setImgRef(cam.index, el)}
                  alt={cam.alias}
                  className="w-full object-contain bg-black"
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ============================================================
           MODO NORMAL: grid de camaras
           ============================================================ */
        <div className={`grid ${gridCols} gap-0.5 p-0.5`}>
          {availableCams.map((cam) => (
            <div key={cam.index} className="relative group bg-black">
              {/* Camera label */}
              <div className="absolute top-1 left-1 z-10 bg-black/60 rounded px-1.5 py-0.5">
                <span className="text-[10px] text-white font-medium">{cam.alias}</span>
              </div>

              {/* Camera image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={(el) => setImgRef(cam.index, el)}
                alt={cam.alias}
                className="w-full object-contain bg-black"
              />
            </div>
          ))}
        </div>
      )}

      {/* Refresh rate indicator */}
      <div className="bg-gray-800 border-t border-gray-700 px-3 py-1 flex items-center justify-between">
        <span className="text-[10px] text-gray-500">
          Refresh: {refreshMs}ms
        </span>
        {!paused && active && (
          <span className="flex items-center gap-1 text-[10px] text-green-500">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            EN VIVO
          </span>
        )}
      </div>
    </div>
  );

}
