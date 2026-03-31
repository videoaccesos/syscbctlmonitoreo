"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Video, RefreshCw, Play, Square, Search } from "lucide-react";

interface CameraInfo {
  index: number;
  alias: string;
  available: boolean;
}

interface PrivadaOption {
  id: number;
  descripcion: string;
}

export default function VideoWebPage() {
  const [privadas, setPrivadas] = useState<PrivadaOption[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const mountedRef = useRef(true);
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cargar lista de privadas
  useEffect(() => {
    fetch("/api/privadas/list")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPrivadas(data);
        else if (data.privadas) setPrivadas(data.privadas);
      })
      .catch(() => {});
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      intervalsRef.current.forEach((t) => clearTimeout(t));
      intervalsRef.current.clear();
      if (keepaliveRef.current) clearInterval(keepaliveRef.current);
      if (cameraRefreshRef.current) clearInterval(cameraRefreshRef.current);
    };
  }, []);

  // Obtener camaras via lookup (mismo endpoint que terminal monitorista)
  const fetchCameras = useCallback(async (siteId: string): Promise<CameraInfo[]> => {
    try {
      const res = await fetch(`/api/camera-proxy/lookup?privada_id=${siteId}`);
      const data = await res.json();
      if (data.found && data.cameras) {
        return data.cameras;
      }
    } catch {}
    return [];
  }, []);

  const loadCameras = useCallback(async (siteId: string) => {
    setLoading(true);
    const cams = await fetchCameras(siteId);
    setCameras(cams);
    setLoading(false);
  }, [fetchCameras]);

  const sendCommand = useCallback(async (siteId: string, cmd: string, mode?: string) => {
    try {
      await fetch("/api/camera-frames/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          cmd,
          fps: 10,
          duration: 300,
          mode: mode || "all",
        }),
      });
    } catch {}
  }, []);

  const startImageRefresh = useCallback((siteId: string, cams: CameraInfo[]) => {
    // Limpiar anteriores
    intervalsRef.current.forEach((t) => clearTimeout(t));
    intervalsRef.current.clear();

    cams.forEach((cam) => {
      const refreshCamera = () => {
        if (!mountedRef.current) return;

        const img = new Image();
        const url = `/api/camera-proxy?privada_id=${siteId}&cam=${cam.index}&t=${Date.now()}`;
        img.onload = () => {
          if (!mountedRef.current) return;
          const container = document.getElementById(`cam-${cam.index}`);
          if (container) {
            container.style.backgroundImage = `url(${img.src})`;
            container.style.backgroundSize = "cover";
            container.style.backgroundPosition = "center";
          }
          const tid = setTimeout(refreshCamera, 200);
          intervalsRef.current.set(cam.index, tid);
        };
        img.onerror = () => {
          if (!mountedRef.current) return;
          const tid = setTimeout(refreshCamera, 2000);
          intervalsRef.current.set(cam.index, tid);
        };
        img.src = url;
      };
      refreshCamera();
    });
  }, []);

  const startStreaming = useCallback(async () => {
    if (!selectedSiteId) return;

    // Enviar start_stream al agente
    sendCommand(selectedSiteId, "start_stream", "all");
    setStreaming(true);

    // Cargar camaras disponibles
    let cams = cameras;
    if (cams.length === 0) {
      cams = await fetchCameras(selectedSiteId);
      setCameras(cams);
    }

    // Keepalive cada 4 minutos
    if (keepaliveRef.current) clearInterval(keepaliveRef.current);
    keepaliveRef.current = setInterval(() => {
      sendCommand(selectedSiteId, "start_stream", "all");
    }, 4 * 60 * 1000);

    // Re-check camaras cada 5s (por si el agente empieza a enviar nuevas)
    if (cameraRefreshRef.current) clearInterval(cameraRefreshRef.current);
    cameraRefreshRef.current = setInterval(async () => {
      if (!mountedRef.current) return;
      const updated = await fetchCameras(selectedSiteId);
      if (updated.length > cams.length) {
        cams = updated;
        setCameras(updated);
        startImageRefresh(selectedSiteId, updated);
      }
    }, 5000);

    // Iniciar refresh de imagenes
    if (cams.length > 0) {
      startImageRefresh(selectedSiteId, cams);
    }
  }, [selectedSiteId, cameras, sendCommand, fetchCameras, startImageRefresh]);

  const stopStreaming = useCallback(() => {
    if (selectedSiteId) {
      sendCommand(selectedSiteId, "stop_stream");
    }
    setStreaming(false);
    intervalsRef.current.forEach((t) => clearTimeout(t));
    intervalsRef.current.clear();
    if (keepaliveRef.current) {
      clearInterval(keepaliveRef.current);
      keepaliveRef.current = null;
    }
    if (cameraRefreshRef.current) {
      clearInterval(cameraRefreshRef.current);
      cameraRefreshRef.current = null;
    }
  }, [selectedSiteId, sendCommand]);

  const handleSiteChange = (siteId: string) => {
    if (streaming) stopStreaming();
    setSelectedSiteId(siteId);
    setCameras([]);
    const p = privadas.find((x) => String(x.id) === siteId);
    setSelectedName(p?.descripcion || "");
    if (siteId) loadCameras(siteId);
  };

  // Grid columns based on camera count
  const gridCols =
    cameras.length <= 1
      ? "grid-cols-1"
      : cameras.length <= 4
      ? "grid-cols-2"
      : cameras.length <= 9
      ? "grid-cols-3"
      : "grid-cols-4";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Video className="h-6 w-6 text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-800">Video Web</h1>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Privada</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <select
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                value={selectedSiteId}
                onChange={(e) => handleSiteChange(e.target.value)}
              >
                <option value="">Seleccionar privada...</option>
                {privadas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.descripcion}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            {loading && <span className="flex items-center gap-1"><RefreshCw className="h-4 w-4 animate-spin" /> Cargando...</span>}
            {!loading && cameras.length > 0 && (
              <span className="text-green-600 font-medium">{cameras.length} camaras</span>
            )}
            {!loading && selectedSiteId && cameras.length === 0 && !streaming && (
              <span className="text-amber-600">Sin camaras configuradas para esta privada.</span>
            )}
          </div>

          <div className="flex gap-2">
            {!streaming ? (
              <button
                onClick={startStreaming}
                disabled={!selectedSiteId}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Play className="h-4 w-4" />
                Ver camaras
              </button>
            ) : (
              <button
                onClick={stopStreaming}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                <Square className="h-4 w-4" />
                Detener
              </button>
            )}
            {selectedSiteId && !streaming && (
              <button
                onClick={() => loadCameras(selectedSiteId)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                title="Refrescar"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Camera Grid */}
      {cameras.length > 0 && (
        <div className={`grid ${gridCols} gap-2`}>
          {cameras.map((cam) => (
            <div key={cam.index} className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
              <div
                id={`cam-${cam.index}`}
                className="absolute inset-0 flex items-center justify-center"
                style={{ backgroundColor: "#1a1a2e" }}
              >
                {!streaming && (
                  <div className="text-center text-gray-500">
                    <Video className="h-8 w-8 mx-auto mb-1 opacity-30" />
                    <p className="text-xs">{cam.alias}</p>
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white text-xs font-medium truncate">{cam.alias}</span>
                  <span className="text-gray-400 text-[10px]">Ch {cam.index}</span>
                </div>
              </div>
              {streaming && (
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-red-600/90 rounded px-1.5 py-0.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-[10px] font-bold">LIVE</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Streaming without cameras yet */}
      {streaming && cameras.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <RefreshCw className="h-12 w-12 mx-auto text-amber-400 mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Esperando video de {selectedName}...</h3>
          <p className="text-sm text-gray-400">Se envio el comando al agente. Las camaras apareceran cuando empiece a transmitir.</p>
        </div>
      )}

      {/* Empty state */}
      {!selectedSiteId && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Video className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">Selecciona una privada</h3>
          <p className="text-sm text-gray-400">Elige una privada para ver las camaras disponibles del DVR</p>
        </div>
      )}
    </div>
  );
}
