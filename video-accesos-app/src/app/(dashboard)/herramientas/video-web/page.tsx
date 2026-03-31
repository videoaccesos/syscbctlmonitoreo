"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Video, RefreshCw, Play, Square, Search } from "lucide-react";

interface SiteChannel {
  channel: number;
  code: string;
  alias: string;
  bytes?: number;
}

interface PrivadaOption {
  id: number;
  descripcion: string;
}

export default function VideoWebPage() {
  const [privadas, setPrivadas] = useState<PrivadaOption[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [channels, setChannels] = useState<SiteChannel[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waitingChannels, setWaitingChannels] = useState(false);
  const intervalsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const imgRefs = useRef<Map<number, HTMLImageElement>>(new Map());
  const mountedRef = useRef(true);
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (channelPollRef.current) clearInterval(channelPollRef.current);
    };
  }, []);

  const fetchChannels = useCallback(async (siteId: string): Promise<SiteChannel[]> => {
    try {
      const res = await fetch(`/api/camera-frames/channels?site_id=${siteId}`);
      const data = await res.json();
      if (data.channels && data.channels.length > 0) {
        return data.channels;
      }
    } catch {}
    return [];
  }, []);

  // Cargar canales cuando se selecciona un sitio
  const loadChannels = useCallback(async (siteId: string) => {
    if (!siteId) return;
    setLoading(true);
    const chs = await fetchChannels(siteId);
    setChannels(chs);
    setLoading(false);
  }, [fetchChannels]);

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

  const startImageRefresh = useCallback((siteId: string, chs: SiteChannel[]) => {
    // Limpiar anteriores
    intervalsRef.current.forEach((t) => clearTimeout(t));
    intervalsRef.current.clear();
    imgRefs.current.clear();

    chs.forEach((ch) => {
      const img = new Image();
      imgRefs.current.set(ch.channel, img);

      const refreshCamera = () => {
        if (!mountedRef.current) return;
        const newImg = imgRefs.current.get(ch.channel);
        if (!newImg) return;

        const url = `/api/camera-proxy?privada_id=${siteId}&cam=${ch.channel}&t=${Date.now()}`;
        newImg.onload = () => {
          if (!mountedRef.current) return;
          const container = document.getElementById(`cam-${ch.channel}`);
          if (container) {
            container.style.backgroundImage = `url(${newImg.src})`;
            container.style.backgroundSize = "cover";
            container.style.backgroundPosition = "center";
          }
          const tid = setTimeout(refreshCamera, 200);
          intervalsRef.current.set(ch.channel, tid);
        };
        newImg.onerror = () => {
          if (!mountedRef.current) return;
          const tid = setTimeout(refreshCamera, 2000);
          intervalsRef.current.set(ch.channel, tid);
        };
        newImg.src = url;
      };
      refreshCamera();
    });
  }, []);

  const startStreaming = useCallback(async () => {
    if (!selectedSiteId) return;

    // Siempre enviar start_stream primero
    sendCommand(selectedSiteId, "start_stream", "all");
    setStreaming(true);

    // Keepalive
    if (keepaliveRef.current) clearInterval(keepaliveRef.current);
    keepaliveRef.current = setInterval(() => {
      sendCommand(selectedSiteId, "start_stream", "all");
    }, 4 * 60 * 1000);

    // Si ya tenemos canales, iniciar refresh inmediatamente
    if (channels.length > 0) {
      startImageRefresh(selectedSiteId, channels);
      return;
    }

    // Si no hay canales, esperar a que el agente los reporte
    setWaitingChannels(true);
    let attempts = 0;
    const maxAttempts = 15; // 30 segundos max

    if (channelPollRef.current) clearInterval(channelPollRef.current);
    channelPollRef.current = setInterval(async () => {
      attempts++;
      if (!mountedRef.current || attempts > maxAttempts) {
        if (channelPollRef.current) clearInterval(channelPollRef.current);
        setWaitingChannels(false);
        return;
      }

      const chs = await fetchChannels(selectedSiteId);
      if (chs.length > 0) {
        if (channelPollRef.current) clearInterval(channelPollRef.current);
        setChannels(chs);
        setWaitingChannels(false);
        startImageRefresh(selectedSiteId, chs);
      }
    }, 2000);
  }, [selectedSiteId, channels, sendCommand, fetchChannels, startImageRefresh]);

  const stopStreaming = useCallback(() => {
    if (selectedSiteId) {
      sendCommand(selectedSiteId, "stop_stream");
    }
    setStreaming(false);
    setWaitingChannels(false);
    intervalsRef.current.forEach((t) => clearTimeout(t));
    intervalsRef.current.clear();
    imgRefs.current.clear();
    if (keepaliveRef.current) {
      clearInterval(keepaliveRef.current);
      keepaliveRef.current = null;
    }
    if (channelPollRef.current) {
      clearInterval(channelPollRef.current);
      channelPollRef.current = null;
    }
  }, [selectedSiteId, sendCommand]);

  const handleSiteChange = (siteId: string) => {
    if (streaming) stopStreaming();
    setSelectedSiteId(siteId);
    setChannels([]);
    if (siteId) loadChannels(siteId);
  };

  // Grid columns based on channel count
  const gridCols =
    channels.length <= 1
      ? "grid-cols-1"
      : channels.length <= 4
      ? "grid-cols-2"
      : channels.length <= 9
      ? "grid-cols-3"
      : "grid-cols-4";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-800">Video Web</h1>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Selector de privada */}
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

          {/* Info de canales */}
          <div className="text-sm text-gray-500">
            {loading && <span className="flex items-center gap-1"><RefreshCw className="h-4 w-4 animate-spin" /> Cargando...</span>}
            {waitingChannels && <span className="flex items-center gap-1 text-amber-600"><RefreshCw className="h-4 w-4 animate-spin" /> Esperando respuesta del agente...</span>}
            {!loading && !waitingChannels && channels.length > 0 && (
              <span className="text-green-600 font-medium">{channels.length} canales disponibles</span>
            )}
            {!loading && !waitingChannels && selectedSiteId && channels.length === 0 && !streaming && (
              <span className="text-amber-600">Sin canales reportados. El agente debe estar activo.</span>
            )}
          </div>

          {/* Botones */}
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
            {selectedSiteId && (
              <button
                onClick={() => loadChannels(selectedSiteId)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                title="Refrescar canales"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Camera Grid */}
      {channels.length > 0 && (
        <div className={`grid ${gridCols} gap-2`}>
          {channels.map((ch) => (
            <div key={ch.channel} className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: "4/3" }}>
              {/* Camera frame container */}
              <div
                id={`cam-${ch.channel}`}
                className="absolute inset-0 flex items-center justify-center"
                style={{ backgroundColor: "#1a1a2e" }}
              >
                {!streaming && (
                  <div className="text-center text-gray-500">
                    <Video className="h-8 w-8 mx-auto mb-1 opacity-30" />
                    <p className="text-xs">Canal {ch.channel}</p>
                  </div>
                )}
              </div>
              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white text-xs font-medium truncate">{ch.alias}</span>
                  <span className="text-gray-400 text-[10px]">Ch {ch.channel}</span>
                </div>
              </div>
              {/* Live indicator */}
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

      {/* Waiting state */}
      {waitingChannels && channels.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <RefreshCw className="h-12 w-12 mx-auto text-amber-400 mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Conectando con el agente...</h3>
          <p className="text-sm text-gray-400">Se envio el comando. Esperando que el agente reporte los canales disponibles.</p>
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
