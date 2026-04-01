"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Video, RefreshCw, Play, Square, Search, X, Maximize2, GripVertical, Save, Check, Shield, ShieldAlert, ShieldCheck, ShieldOff, Crosshair } from "lucide-react";

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
  const [expandedCam, setExpandedCam] = useState<CameraInfo | null>(null);
  const [reordering, setReordering] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const intervalsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const mountedRef = useRef(true);
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamingRef = useRef(false);

  // Gate monitor state
  const [gateMonitorCam, setGateMonitorCam] = useState<CameraInfo | null>(null);
  const [gateROI, setGateROI] = useState<{x:number;y:number;width:number;height:number} | null>(null);
  const [gateDrawing, setGateDrawing] = useState(false);
  const [gateDrawStart, setGateDrawStart] = useState<{x:number;y:number} | null>(null);
  const [gateStatuses, setGateStatuses] = useState<Array<{siteId:string;camId:number;alias:string;state:string;currentDiff:number;alertSent:boolean}>>([]);
  const [gateSaving, setGateSaving] = useState(false);
  const [gateAlias, setGateAlias] = useState("");
  const [gateThreshold, setGateThreshold] = useState(30);
  const [gateConsecutive, setGateConsecutive] = useState(4);

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

  // Polling de estado de portones
  useEffect(() => {
    const poll = () => {
      fetch("/api/gate-monitor/status").then(r => r.json()).then(data => {
        if (data.statuses) setGateStatuses(data.statuses);
      }).catch(() => {});
    };
    poll();
    const iv = setInterval(poll, 5000);
    return () => clearInterval(iv);
  }, []);

  const openGateMonitor = (cam: CameraInfo) => {
    setGateMonitorCam(cam);
    setGateROI(null);
    setGateDrawing(false);
    setGateAlias(`Porton ${cam.alias}`);
    setGateThreshold(30);
    setGateConsecutive(4);
    // Cargar config existente
    if (selectedSiteId) {
      fetch(`/api/gate-monitor/config?site_id=${selectedSiteId}&cam_id=${cam.index}`)
        .then(r => r.json()).then(data => {
          if (data.config) {
            setGateROI(data.config.roi);
            setGateAlias(data.config.alias || `Porton ${cam.alias}`);
            setGateThreshold(Math.round((data.config.threshold || 0.3) * 100));
            setGateConsecutive(data.config.consecutiveThreshold || 4);
          }
        }).catch(() => {});
    }
  };

  const handleGateCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setGateDrawStart({ x, y });
    setGateDrawing(true);
  };

  const handleGateCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gateDrawing || !gateDrawStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setGateROI({
      x: Math.min(gateDrawStart.x, x),
      y: Math.min(gateDrawStart.y, y),
      width: Math.abs(x - gateDrawStart.x),
      height: Math.abs(y - gateDrawStart.y),
    });
  };

  const handleGateCanvasMouseUp = () => {
    setGateDrawing(false);
    setGateDrawStart(null);
  };

  const saveGateMonitor = async () => {
    if (!selectedSiteId || !gateMonitorCam || !gateROI) return;
    setGateSaving(true);
    try {
      // Guardar config
      await fetch("/api/gate-monitor/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: selectedSiteId,
          cam_id: gateMonitorCam.index,
          roi: gateROI,
          alias: gateAlias,
          threshold: gateThreshold / 100,
          consecutive_threshold: gateConsecutive,
          enabled: true,
        }),
      });
      // Capturar referencia
      await fetch(`/api/gate-monitor/reference?site_id=${selectedSiteId}&cam_id=${gateMonitorCam.index}`, {
        method: "POST",
      });
      setGateMonitorCam(null);
    } catch {}
    setGateSaving(false);
  };

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
          duration: 0,
          mode: mode || "all",
        }),
      });
    } catch {}
  }, []);

  // Refresh de imagen sin parpadeo: preload en Image oculto, swap solo cuando carga
  const startImageRefresh = useCallback((siteId: string, cams: CameraInfo[]) => {
    intervalsRef.current.forEach((t) => clearTimeout(t));
    intervalsRef.current.clear();

    cams.forEach((cam) => {
      const refreshCamera = () => {
        if (!mountedRef.current || !streamingRef.current) return;

        const preloader = new Image();
        const url = `/api/camera-proxy?privada_id=${siteId}&cam=${cam.index}&t=${Date.now()}`;

        preloader.onload = () => {
          if (!mountedRef.current || !streamingRef.current) return;

          // Actualizar img en grid
          const imgEl = document.getElementById(`cam-img-${cam.index}`) as HTMLImageElement | null;
          if (imgEl) {
            imgEl.src = preloader.src;
            imgEl.style.display = "block";
          }

          // Actualizar img en modal expandido
          const modalEl = document.getElementById("cam-img-expanded") as HTMLImageElement | null;
          if (modalEl && modalEl.dataset.camIndex === String(cam.index)) {
            modalEl.src = preloader.src;
          }

          const tid = setTimeout(refreshCamera, 200);
          intervalsRef.current.set(cam.index, tid);
        };

        preloader.onerror = () => {
          if (!mountedRef.current || !streamingRef.current) return;
          const tid = setTimeout(refreshCamera, 2000);
          intervalsRef.current.set(cam.index, tid);
        };

        preloader.src = url;
      };
      refreshCamera();
    });
  }, []);

  const startStreaming = useCallback(async () => {
    if (!selectedSiteId) return;

    sendCommand(selectedSiteId, "start_stream", "all");
    setStreaming(true);
    streamingRef.current = true;
    setReordering(false);

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

    // Re-check camaras cada 5s
    if (cameraRefreshRef.current) clearInterval(cameraRefreshRef.current);
    cameraRefreshRef.current = setInterval(async () => {
      if (!mountedRef.current || !streamingRef.current) return;
      const updated = await fetchCameras(selectedSiteId);
      if (updated.length > cams.length) {
        cams = updated;
        setCameras(updated);
        startImageRefresh(selectedSiteId, updated);
      }
    }, 5000);

    if (cams.length > 0) {
      startImageRefresh(selectedSiteId, cams);
    }
  }, [selectedSiteId, cameras, sendCommand, fetchCameras, startImageRefresh]);

  const stopStreaming = useCallback(() => {
    if (selectedSiteId) {
      sendCommand(selectedSiteId, "stop_stream");
    }
    setStreaming(false);
    streamingRef.current = false;
    setExpandedCam(null);
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
    setExpandedCam(null);
    setReordering(false);
    setOrderSaved(false);
    const p = privadas.find((x) => String(x.id) === siteId);
    setSelectedName(p?.descripcion || "");
    if (siteId) loadCameras(siteId);
  };

  // -----------------------------------------------------------------------
  // Drag & drop reorder
  // -----------------------------------------------------------------------
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newCams = [...cameras];
    const [moved] = newCams.splice(dragIdx, 1);
    newCams.splice(idx, 0, moved);
    setCameras(newCams);
    setDragIdx(null);
    setDragOverIdx(null);
    setOrderSaved(false);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const saveOrder = async () => {
    if (!selectedSiteId) return;
    const order = cameras.map((c) => c.index);
    try {
      await fetch("/api/camera-proxy/order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privada_id: selectedSiteId, order }),
      });
      setOrderSaved(true);
      setTimeout(() => setOrderSaved(false), 3000);
    } catch {}
  };

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
            {selectedSiteId && !streaming && cameras.length > 1 && (
              <button
                onClick={() => setReordering((r) => !r)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                  reordering
                    ? "bg-orange-100 text-orange-700 border border-orange-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title="Ordenar camaras"
              >
                <GripVertical className="h-4 w-4" />
                {reordering ? "Ordenando..." : "Ordenar"}
              </button>
            )}
            {reordering && (
              <button
                onClick={saveOrder}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  orderSaved
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {orderSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {orderSaved ? "Guardado" : "Guardar orden"}
              </button>
            )}
            {selectedSiteId && !streaming && !reordering && (
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
        {reordering && (
          <p className="mt-2 text-xs text-orange-600">
            Arrastra las camaras para cambiar el orden. Este orden se usara tambien en la Consola Monitorista.
          </p>
        )}
      </div>

      {/* Camera Grid */}
      {cameras.length > 0 && (
        <div className={`grid ${gridCols} gap-2`}>
          {cameras.map((cam, idx) => (
            <div
              key={cam.index}
              draggable={reordering}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={`relative bg-gray-900 rounded-lg overflow-hidden group transition-all ${
                reordering ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
              } ${
                dragOverIdx === idx && dragIdx !== idx
                  ? "ring-2 ring-orange-400 scale-[1.02]"
                  : ""
              } ${
                dragIdx === idx ? "opacity-40" : ""
              }`}
              style={{ aspectRatio: "4/3" }}
              onClick={() => !reordering && streaming && setExpandedCam(cam)}
            >
              {/* Drag handle indicator */}
              {reordering && (
                <div className="absolute top-1.5 left-1.5 z-20 bg-orange-500/90 rounded p-1">
                  <GripVertical className="h-4 w-4 text-white" />
                </div>
              )}
              {/* Position number */}
              {reordering && (
                <div className="absolute top-1.5 right-1.5 z-20 bg-orange-500 rounded-full w-6 h-6 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{idx + 1}</span>
                </div>
              )}
              {/* Placeholder cuando no hay imagen */}
              <div className="absolute inset-0 flex items-center justify-center z-0" style={{ backgroundColor: "#1a1a2e" }}>
                {!streaming && (
                  <div className="text-center text-gray-500">
                    <Video className="h-8 w-8 mx-auto mb-1 opacity-30" />
                    <p className="text-xs">{cam.alias}</p>
                  </div>
                )}
              </div>
              {/* Imagen real - encima del placeholder */}
              <img
                id={`cam-img-${cam.index}`}
                alt={cam.alias}
                className="absolute inset-0 w-full h-full object-cover z-[1]"
                style={{ display: "none" }}
              />
              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 z-10">
                <div className="flex items-center justify-between">
                  <span className="text-white text-xs font-medium truncate">{cam.alias}</span>
                  <span className="text-gray-400 text-[10px]">Ch {cam.index}</span>
                </div>
              </div>
              {/* Live + expand indicator */}
              {streaming && !reordering && (
                <>
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                    {/* Gate status indicator */}
                    {(() => {
                      const gs = gateStatuses.find(s => s.siteId === selectedSiteId && s.camId === cam.index);
                      if (!gs) return null;
                      return (
                        <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 mr-1 ${
                          gs.state === "open" ? "bg-red-600/90" : gs.state === "closed" ? "bg-green-600/90" : "bg-gray-600/90"
                        }`}>
                          {gs.state === "open" ? <ShieldAlert className="h-3 w-3 text-white" /> : <ShieldCheck className="h-3 w-3 text-white" />}
                          <span className="text-white text-[10px] font-bold">{gs.state === "open" ? "ABIERTO" : "CERRADO"}</span>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-1 bg-red-600/90 rounded px-1.5 py-0.5">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span className="text-white text-[10px] font-bold">LIVE</span>
                    </div>
                  </div>
                  {/* Monitor button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openGateMonitor(cam); }}
                    className="absolute bottom-8 right-1.5 z-10 bg-black/60 rounded p-1 text-white/60 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition"
                    title="Monitorear porton"
                  >
                    <Shield className="h-4 w-4" />
                  </button>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-[5] flex items-center justify-center">
                    <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-70 transition-opacity" />
                  </div>
                </>
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

      {/* Gate Monitor Dashboard */}
      {gateStatuses.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-orange-500" />
            <h2 className="font-semibold text-gray-800">Monitor de Portones</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {gateStatuses.map((gs) => (
              <div
                key={`${gs.siteId}:${gs.camId}`}
                className={`rounded-lg p-3 border ${
                  gs.state === "open"
                    ? "bg-red-50 border-red-200"
                    : gs.state === "closed"
                    ? "bg-green-50 border-green-200"
                    : gs.state === "no-signal"
                    ? "bg-gray-50 border-gray-200"
                    : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {gs.state === "open" ? (
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                  ) : gs.state === "closed" ? (
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <ShieldOff className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-xs font-medium truncate">{gs.alias}</span>
                </div>
                <div className="text-[10px] text-gray-500">
                  {gs.state === "open" ? (
                    <span className="text-red-600 font-semibold">ABIERTO {gs.alertSent ? "(alertado)" : ""}</span>
                  ) : gs.state === "closed" ? (
                    <span className="text-green-600">Cerrado</span>
                  ) : gs.state === "no-signal" ? (
                    <span className="text-gray-400">Sin señal</span>
                  ) : (
                    <span className="text-yellow-600">Verificando...</span>
                  )}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Diff: {Math.round(gs.currentDiff * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gate Monitor Setup Modal */}
      {gateMonitorCam && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setGateMonitorCam(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold">Configurar Monitor - {gateMonitorCam.alias}</h3>
              </div>
              <button onClick={() => setGateMonitorCam(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Instrucciones */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <div className="flex items-center gap-2 mb-1">
                  <Crosshair className="h-4 w-4" />
                  <span className="font-medium">Marca la zona del porton</span>
                </div>
                <p className="text-xs">Dibuja un rectangulo sobre el porton en la imagen. El sistema comparara esa zona contra la referencia para detectar cambios.</p>
              </div>

              {/* Imagen con canvas para ROI */}
              <div
                className="relative bg-black rounded-lg overflow-hidden cursor-crosshair select-none"
                style={{ aspectRatio: "4/3" }}
                onMouseDown={handleGateCanvasMouseDown}
                onMouseMove={handleGateCanvasMouseMove}
                onMouseUp={handleGateCanvasMouseUp}
                onMouseLeave={handleGateCanvasMouseUp}
              >
                <img
                  src={`/api/camera-proxy?privada_id=${selectedSiteId}&cam=${gateMonitorCam.index}&t=${Date.now()}`}
                  alt={gateMonitorCam.alias}
                  className="w-full h-full object-contain"
                  draggable={false}
                />
                {/* ROI overlay */}
                {gateROI && (
                  <div
                    className="absolute border-2 border-orange-500 bg-orange-500/20"
                    style={{
                      left: `${gateROI.x * 100}%`,
                      top: `${gateROI.y * 100}%`,
                      width: `${gateROI.width * 100}%`,
                      height: `${gateROI.height * 100}%`,
                    }}
                  >
                    <span className="absolute -top-5 left-0 text-[10px] bg-orange-500 text-white px-1 rounded">
                      ROI
                    </span>
                  </div>
                )}
              </div>

              {/* Config fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Alias del porton</label>
                  <input
                    type="text"
                    value={gateAlias}
                    onChange={e => setGateAlias(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    placeholder="Ej: Porton principal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Umbral de cambio (%)</label>
                  <input
                    type="number"
                    value={gateThreshold}
                    onChange={e => setGateThreshold(parseInt(e.target.value) || 30)}
                    min={5} max={90}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lecturas consecutivas para alertar</label>
                  <input
                    type="number"
                    value={gateConsecutive}
                    onChange={e => setGateConsecutive(parseInt(e.target.value) || 4)}
                    min={2} max={20}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-gray-400">
                    {gateROI
                      ? `ROI: ${Math.round(gateROI.x*100)}%, ${Math.round(gateROI.y*100)}% - ${Math.round(gateROI.width*100)}%x${Math.round(gateROI.height*100)}%`
                      : "Dibuja el ROI en la imagen"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  onClick={() => setGateMonitorCam(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveGateMonitor}
                  disabled={!gateROI || gateSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition"
                >
                  {gateSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  {gateSaving ? "Guardando..." : "Activar monitoreo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de camara expandida */}
      {expandedCam && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setExpandedCam(null)}
        >
          <div className="relative w-full h-full max-w-[90vw] max-h-[90vh] m-4" onClick={(e) => e.stopPropagation()}>
            {/* Imagen expandida */}
            <img
              id="cam-img-expanded"
              data-cam-index={expandedCam.index}
              alt={expandedCam.alias}
              className="w-full h-full object-contain"
            />
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-red-600/90 rounded px-2 py-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-xs font-bold">LIVE</span>
                </div>
                <span className="text-white font-medium">{expandedCam.alias}</span>
                <span className="text-gray-400 text-sm">Ch {expandedCam.index} - {selectedName}</span>
              </div>
              <button
                onClick={() => setExpandedCam(null)}
                className="text-white hover:text-gray-300 bg-black/50 rounded-full p-2 transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            {/* Thumbnails de otras camaras */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <div className="flex gap-2 overflow-x-auto">
                {cameras.map((cam) => (
                  <button
                    key={cam.index}
                    onClick={() => setExpandedCam(cam)}
                    className={`flex-shrink-0 rounded overflow-hidden border-2 transition ${
                      expandedCam.index === cam.index ? "border-orange-500" : "border-transparent hover:border-white/50"
                    }`}
                    style={{ width: 120, height: 90 }}
                  >
                    <img
                      src={document.getElementById(`cam-img-${cam.index}`)?.getAttribute("src") || ""}
                      alt={cam.alias}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1">
                      <span className="text-white text-[10px]">{cam.alias}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
