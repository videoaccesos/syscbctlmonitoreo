"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Camera, CameraOff, RefreshCw, ChevronLeft, ChevronRight, X, Maximize2, Minimize2 } from "lucide-react";

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
  const [enlargedCam, setEnlargedCam] = useState<number | null>(null); // indice de camara agrandada
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
  // Usa carga secuencial: espera a que la imagen termine de cargar antes de pedir la siguiente
  // Esto evita acumular requests concurrentes que saturan las conexiones del DVR
  useEffect(() => {
    // Limpiar timers y handlers anteriores
    intervalsRef.current.forEach((timer) => clearTimeout(timer));
    intervalsRef.current.clear();
    imgRefs.current.forEach((img) => {
      img.onload = null;
      img.onerror = null;
    });

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

    // Para cada camara disponible, cargar secuencialmente
    // Solo pide el siguiente snapshot cuando el actual termina (onload/onerror)
    for (const cam of lookup.cameras) {
      if (!cam.available) continue;

      const refreshCamera = () => {
        const img = imgRefs.current.get(cam.index);
        if (!img || !mountedRef.current) return;

        const camParams = new URLSearchParams(params);
        camParams.set("cam", String(cam.index));
        camParams.set("t", String(Date.now()));

        // Programar siguiente refresh solo cuando esta imagen termine de cargar
        img.onload = () => {
          if (!mountedRef.current) return;
          const tid = setTimeout(refreshCamera, refreshMs);
          intervalsRef.current.set(cam.index, tid);
        };
        img.onerror = () => {
          if (!mountedRef.current) return;
          // En error, esperar mas para no saturar la camara
          const tid = setTimeout(refreshCamera, Math.max(refreshMs, 2000));
          intervalsRef.current.set(cam.index, tid);
        };

        img.src = `${proxyBase}?${camParams.toString()}`;
      };

      // Primer fetch inmediato
      refreshCamera();
    }

    return () => {
      intervalsRef.current.forEach((timer) => clearTimeout(timer));
      intervalsRef.current.clear();
      imgRefs.current.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [active, paused, lookup, telefono, refreshMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((timer) => clearTimeout(timer));
      intervalsRef.current.clear();
      imgRefs.current.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
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

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-gray-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2 text-white">
            <Camera className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-medium">
              {lookup.privada}
            </span>
            <span className="text-xs text-gray-400">
              ({availableCams.length} cam{availableCams.length !== 1 ? "s" : ""})
            </span>
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

        {/* Camera thumbnails - stacked vertically */}
        <div className="space-y-0.5 p-0.5">
          {availableCams.map((cam) => (
            <div key={cam.index} className="relative group bg-black">
              {/* Camera label + enlarge button */}
              <div className="absolute top-1 left-1 z-10 bg-black/60 rounded px-1.5 py-0.5">
                <span className="text-[10px] text-white font-medium">{cam.alias}</span>
              </div>
              <button
                onClick={() => setEnlargedCam(cam.index)}
                className="absolute top-1 right-1 z-10 bg-black/60 rounded p-1 text-white/70 hover:text-white hover:bg-black/80 transition opacity-0 group-hover:opacity-100"
                title="Agrandar"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>

              {/* Camera image - small thumbnail */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={(el) => setImgRef(cam.index, el)}
                alt={cam.alias}
                className="w-full object-contain bg-black cursor-pointer"
                style={{ minHeight: compact ? 140 : 180 }}
                onClick={() => setEnlargedCam(cam.index)}
              />
            </div>
          ))}
        </div>

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

      {/* Enlarged camera overlay */}
      {enlargedCam !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl mx-4">
            {/* Header */}
            <div className="flex items-center justify-between bg-gray-900 rounded-t-xl px-4 py-2 border-b border-gray-700">
              <div className="flex items-center gap-2 text-white">
                <Camera className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-medium">
                  {lookup.privada} - {availableCams.find(c => c.index === enlargedCam)?.alias}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Navigation between cameras */}
                {availableCams.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        const idx = availableCams.findIndex(c => c.index === enlargedCam);
                        const prev = (idx - 1 + availableCams.length) % availableCams.length;
                        setEnlargedCam(availableCams[prev].index);
                      }}
                      className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        const idx = availableCams.findIndex(c => c.index === enlargedCam);
                        const next = (idx + 1) % availableCams.length;
                        setEnlargedCam(availableCams[next].index);
                      }}
                      className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setEnlargedCam(null)}
                  className="p-1.5 rounded bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white transition"
                  title="Cerrar"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Enlarged image - uses the same img ref that's already refreshing */}
            <div className="bg-black rounded-b-xl overflow-hidden">
              {availableCams.map((cam) => (
                <div
                  key={cam.index}
                  className={enlargedCam === cam.index ? "block" : "hidden"}
                >
                  {/* The image ref is already set on the thumbnail img element,
                      so we show a clone that reads from the same src */}
                  <EnlargedCameraView camIndex={cam.index} imgRefs={imgRefs} />
                </div>
              ))}
            </div>
          </div>
          {/* Click outside to close */}
          <div
            className="absolute inset-0 -z-10"
            onClick={() => setEnlargedCam(null)}
          />
        </div>
      )}
    </>
  );
}

/** Shows an enlarged copy of a camera that syncs with the thumbnail's src */
function EnlargedCameraView({
  camIndex,
  imgRefs,
}: {
  camIndex: number;
  imgRefs: React.RefObject<Map<number, HTMLImageElement>>;
}) {
  const enlargedImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Sync the enlarged image src from the thumbnail
    const syncSrc = () => {
      const srcImg = imgRefs.current?.get(camIndex);
      if (srcImg && enlargedImgRef.current && srcImg.src) {
        enlargedImgRef.current.src = srcImg.src;
      }
    };

    syncSrc();
    const interval = setInterval(syncSrc, 200);
    return () => clearInterval(interval);
  }, [camIndex, imgRefs]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={enlargedImgRef}
      alt="Camera enlarged"
      className="w-full object-contain bg-black"
      style={{ maxHeight: "80vh" }}
    />
  );
}
