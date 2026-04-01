"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Camera, CameraOff, RefreshCw, ChevronLeft, ChevronRight, X, Maximize2, Minimize2, Loader2, AlertTriangle, Wifi, WifiOff } from "lucide-react";

// ---------------------------------------------------------------------------
// Diagnostics logger
// ---------------------------------------------------------------------------
const _camDiagLog: Array<{ ts: string; elapsed: number; cam: number; event: string; detail?: string }> = [];
const _camDiagStart = Date.now();

function camDiag(cam: number, event: string, detail?: string) {
  const entry = {
    ts: new Date().toISOString(),
    elapsed: Date.now() - _camDiagStart,
    cam,
    event,
    detail,
  };
  _camDiagLog.push(entry);
  if (_camDiagLog.length > 300) _camDiagLog.shift();
  console.log(`[CameraGrid] +${entry.elapsed}ms | cam${cam} | ${event}${detail ? ` | ${detail}` : ""}`);
}

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__camDiag = () => { console.table(_camDiagLog); return _camDiagLog; };
}

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
  active?: boolean;
  onClose?: () => void;
  compact?: boolean;
}

type GridStatus = "idle" | "connecting" | "streaming" | "no-cameras" | "error";

export default function CameraGrid({
  telefono,
  privadaId,
  refreshMs = 300,
  active = true,
  onClose,
  compact = false,
}: CameraGridProps) {
  const [lookup, setLookup] = useState<CameraLookupResult | null>(null);
  const [status, setStatus] = useState<GridStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [paused, setPaused] = useState(false);
  const [enlargedCam, setEnlargedCam] = useState<number | null>(null);
  const imgRefs = useRef<Map<number, HTMLImageElement>>(new Map());
  const intervalsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const mountedRef = useRef(true);
  const prevPrivadaRef = useRef<number | string | undefined>(undefined);
  const relookupTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lookupAttemptRef = useRef(0);

  // ------------------------------------------------------------------
  // Limpiar TODO al cambiar de privada o desmontar
  // ------------------------------------------------------------------
  const cleanupAll = useCallback(() => {
    // Detener todos los timers de refresh de imagenes
    intervalsRef.current.forEach((timer) => clearTimeout(timer));
    intervalsRef.current.clear();
    // Limpiar handlers de imagenes
    imgRefs.current.forEach((img) => {
      img.onload = null;
      img.onerror = null;
      img.src = ""; // cortar fetch en vuelo
    });
    imgRefs.current.clear();
    // Detener re-lookup
    if (relookupTimerRef.current) {
      clearInterval(relookupTimerRef.current);
      relookupTimerRef.current = null;
    }
    // Cerrar vista ampliada
    setEnlargedCam(null);
  }, []);

  // ------------------------------------------------------------------
  // Detectar cambio de privada -> corte limpio
  // ------------------------------------------------------------------
  useEffect(() => {
    const currentKey = privadaId || telefono;
    const prevKey = prevPrivadaRef.current;

    if (currentKey !== prevKey) {
      camDiag(0, "PRIVADA_CHANGE", `${prevKey} -> ${currentKey}`);
      // Corte limpio: detener todo lo anterior
      cleanupAll();
      // Reset estado
      setLookup(null);
      setStatus("idle");
      setStatusMsg("");
      lookupAttemptRef.current = 0;
      prevPrivadaRef.current = currentKey;
    }
  }, [privadaId, telefono, cleanupAll]);

  // ------------------------------------------------------------------
  // Lookup de camaras
  // ------------------------------------------------------------------
  // Enviar start_stream para activar la transmision del agente
  const triggerStartStream = useCallback(async (siteId: number) => {
    try {
      await fetch("/api/camera-frames/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: String(siteId),
          cmd: "start_stream",
          fps: 25,
          duration: 0,
          mode: "all",
        }),
      });
      camDiag(0, "START_STREAM_SENT", `site=${siteId}`);
    } catch (e) {
      camDiag(0, "START_STREAM_ERROR", e instanceof Error ? e.message : "unknown");
    }
  }, []);

  const lookupCameras = useCallback(async (silent = false): Promise<CameraLookupResult | null> => {
    if (!telefono && !privadaId) return null;

    if (!silent) {
      setStatus("connecting");
      setStatusMsg("Buscando camaras...");
    }

    try {
      const params = new URLSearchParams();
      if (privadaId) params.set("privada_id", String(privadaId));
      else if (telefono) params.set("telefono", telefono);

      const url = `/api/camera-proxy/lookup?${params.toString()}`;
      camDiag(0, "LOOKUP", `${url} ${silent ? "(silent)" : ""}`);

      const res = await fetch(url);
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try { const e = await res.json(); detail = e.detail || e.error || detail; } catch {}
        if (!silent) {
          setStatus("error");
          setStatusMsg(`Error al buscar camaras: ${detail}`);
        }
        return null;
      }

      const data: CameraLookupResult = await res.json();
      camDiag(0, "LOOKUP_RESULT", `found=${data.found} cameras=${data.cameras?.length || 0}`);

      if (!mountedRef.current) return null;
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "desconocido";
      if (!silent) {
        setStatus("error");
        setStatusMsg(`Error de conexion: ${msg}`);
      }
      return null;
    }
  }, [telefono, privadaId]);

  // ------------------------------------------------------------------
  // Efecto principal: lookup inicial + re-lookups
  // ------------------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true;
    if (!telefono && !privadaId) return;

    let cancelled = false;

    const doInitialLookup = async () => {
      lookupAttemptRef.current++;
      const data = await lookupCameras(false);
      if (cancelled) return;

      if (!data || !data.found) {
        setLookup(data);
        setStatus("no-cameras");
        setStatusMsg(data?.found === false
          ? "Privada no encontrada en el sistema."
          : "No se pudo conectar al servidor de video.");
        return;
      }

      if (!data.cameras?.length) {
        setLookup(data);
        setStatus("connecting");
        setStatusMsg(
          `Conectando con ${data.privada}... El agente de captura esta iniciando la transmision. ` +
          `Esto puede tomar unos segundos si el DVR acaba de conectarse.`
        );
        // No hay camaras aun, los re-lookups las detectaran
        return;
      }

      // Tenemos camaras - activar transmision
      setLookup(data);
      setStatus("streaming");
      setStatusMsg("");
      if (data.privada_id) triggerStartStream(data.privada_id);
    };

    doInitialLookup();

    // Re-lookup periodico: detecta nuevas camaras del agente
    relookupTimerRef.current = setInterval(async () => {
      if (cancelled || !mountedRef.current) return;
      const data = await lookupCameras(true);
      if (cancelled || !mountedRef.current || !data) return;

      // Actualizar lookup si hay cambios
      const oldCount = lookup?.cameras?.length || 0;
      const newCount = data.cameras?.length || 0;

      if (data.found) {
        setLookup(data);
        if (newCount > 0) {
          setStatus("streaming");
          setStatusMsg("");
          // Enviar start_stream si es la primera vez que aparecen camaras
          if (oldCount === 0 && data.privada_id) triggerStartStream(data.privada_id);
        } else if (newCount === 0 && oldCount === 0) {
          lookupAttemptRef.current++;
          const attempt = lookupAttemptRef.current;
          if (attempt <= 3) {
            setStatus("connecting");
            setStatusMsg(
              `Esperando video de ${data.privada}... El agente de captura esta preparando la transmision.`
            );
          } else if (attempt <= 10) {
            setStatus("connecting");
            setStatusMsg(
              `Aun sin video de ${data.privada}. Posibles causas:\n` +
              `- El agente de captura no esta corriendo en la PC de la caseta\n` +
              `- La PC no tiene conexion a internet\n` +
              `- El DVR esta apagado o desconectado`
            );
          } else {
            setStatus("no-cameras");
            setStatusMsg(
              `Sin video disponible para ${data.privada}. Verifique que:\n` +
              `1. La PC de la caseta esta encendida y conectada a internet\n` +
              `2. La tarea VideoAccesos-CaptureAgent esta corriendo\n` +
              `3. El DVR esta encendido y accesible en la red local`
            );
          }
        }
      }
    }, 5000);

    return () => {
      cancelled = true;
      cleanupAll();
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telefono, privadaId, lookupCameras, cleanupAll]);

  // ------------------------------------------------------------------
  // Refresh de imagenes cuando hay camaras
  // ------------------------------------------------------------------
  useEffect(() => {
    // Limpiar timers anteriores
    intervalsRef.current.forEach((timer) => clearTimeout(timer));
    intervalsRef.current.clear();
    imgRefs.current.forEach((img) => {
      img.onload = null;
      img.onerror = null;
    });

    if (!active || paused || !lookup?.found || !lookup.cameras?.length) {
      return;
    }

    camDiag(0, "REFRESH_INIT", `${lookup.cameras.length} camaras, refreshMs=${refreshMs}`);

    const proxyBase = "/api/camera-proxy";
    const params = new URLSearchParams();
    if (lookup.privada_id) params.set("privada_id", String(lookup.privada_id));
    else if (telefono) params.set("telefono", telefono);

    for (const cam of lookup.cameras) {
      if (!cam.available) continue;

      let loadCount = 0;
      let errorCount = 0;
      let consecutiveErrors = 0;

      const refreshCamera = () => {
        const img = imgRefs.current.get(cam.index);
        if (!img || !mountedRef.current) return;

        const camParams = new URLSearchParams(params);
        camParams.set("cam", String(cam.index));
        camParams.set("t", String(Date.now()));

        const fetchStart = Date.now();

        img.onload = () => {
          if (!mountedRef.current) return;
          loadCount++;
          consecutiveErrors = 0;
          const dur = Date.now() - fetchStart;
          if (loadCount <= 3 || loadCount % 50 === 0) {
            camDiag(cam.index, "IMG_LOADED", `#${loadCount} ${img.naturalWidth}x${img.naturalHeight} ${dur}ms`);
          }
          const tid = setTimeout(refreshCamera, refreshMs);
          intervalsRef.current.set(cam.index, tid);
        };
        img.onerror = () => {
          if (!mountedRef.current) return;
          errorCount++;
          consecutiveErrors++;
          const dur = Date.now() - fetchStart;
          if (errorCount <= 5 || errorCount % 20 === 0 || consecutiveErrors === 1) {
            camDiag(cam.index, "IMG_ERROR", `#${errorCount} consecutive=${consecutiveErrors} ${dur}ms`);
          }
          const tid = setTimeout(refreshCamera, Math.max(refreshMs * 3, 3000));
          intervalsRef.current.set(cam.index, tid);
        };

        const imgUrl = `${proxyBase}?${camParams.toString()}`;
        if (loadCount === 0) {
          camDiag(cam.index, "FIRST_FETCH", imgUrl.substring(0, 150));
        }
        img.src = imgUrl;
      };

      camDiag(cam.index, "START_REFRESH", `alias=${cam.alias}`);
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
    if (el) imgRefs.current.set(index, el);
    else imgRefs.current.delete(index);
  }, []);

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

  // Sin privada/telefono seleccionado
  if (!telefono && !privadaId) return null;

  // Estado: conectando (spinner)
  if (status === "connecting") {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 text-orange-400 animate-spin" />
          <div className="space-y-1">
            <p className="text-sm text-white font-medium">Conectando video...</p>
            {statusMsg.split("\n").map((line, i) => (
              <p key={i} className="text-xs text-gray-400">{line}</p>
            ))}
          </div>
          {lookup?.privada && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
              <Wifi className="h-3 w-3 animate-pulse" />
              <span>{lookup.privada}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Estado: error
  if (status === "error") {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950 p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <p className="text-sm text-red-300 font-medium">Error de video</p>
          <p className="text-xs text-red-400/80">{statusMsg}</p>
        </div>
      </div>
    );
  }

  // Estado: no hay camaras (despues de varios intentos)
  if (status === "no-cameras") {
    return (
      <div className="rounded-lg border border-yellow-800 bg-yellow-950 p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <WifiOff className="h-6 w-6 text-yellow-400" />
          <p className="text-sm text-yellow-300 font-medium">Sin video disponible</p>
          {statusMsg.split("\n").map((line, i) => (
            <p key={i} className="text-xs text-yellow-400/80">{line}</p>
          ))}
          <button
            onClick={() => {
              lookupAttemptRef.current = 0;
              setStatus("connecting");
              setStatusMsg("Reintentando conexion...");
              lookupCameras(false).then((data) => {
                if (data?.found && data.cameras?.length) {
                  setLookup(data);
                  setStatus("streaming");
                  setStatusMsg("");
                }
              });
            }}
            className="mt-2 px-3 py-1 rounded bg-yellow-800 text-yellow-200 text-xs hover:bg-yellow-700 transition flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Sin lookup aun (estado idle)
  if (!lookup?.cameras?.length) return null;

  const availableCams = lookup.cameras.filter((c) => c.available);
  if (availableCams.length === 0) return null;

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-gray-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2 text-white">
            <Camera className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-medium">{lookup.privada}</span>
            <span className="text-xs text-gray-500">
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

        {paused && (
          <div className="bg-yellow-900/50 border-b border-yellow-700/50 px-3 py-1 text-center">
            <span className="text-xs text-yellow-400">Video pausado</span>
          </div>
        )}

        {/* Camera thumbnails */}
        <div className="space-y-0.5 p-0.5">
          {availableCams.map((cam) => (
            <div key={cam.index} className="relative group bg-black">
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

        {/* Footer */}
        <div className="bg-gray-800 border-t border-gray-700 px-3 py-1 flex items-center justify-between">
          <span className="text-[10px] text-gray-700">
            {refreshMs}ms
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
      {enlargedCam !== null &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl mx-4">
              <div className="flex items-center justify-between bg-gray-900 rounded-t-xl px-4 py-2 border-b border-gray-700">
                <div className="flex items-center gap-2 text-white">
                  <Camera className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium">
                    {lookup.privada} - {availableCams.find(c => c.index === enlargedCam)?.alias}
                  </span>
                </div>
                <div className="flex items-center gap-2">
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
              <div className="bg-black rounded-b-xl overflow-hidden">
                {availableCams.map((cam) => (
                  <div key={cam.index} className={enlargedCam === cam.index ? "block" : "hidden"}>
                    <EnlargedCameraView camIndex={cam.index} imgRefs={imgRefs} />
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 -z-10" onClick={() => setEnlargedCam(null)} />
          </div>,
          document.body
        )}
    </>
  );
}

function EnlargedCameraView({
  camIndex,
  imgRefs,
}: {
  camIndex: number;
  imgRefs: React.RefObject<Map<number, HTMLImageElement>>;
}) {
  const enlargedImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
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
