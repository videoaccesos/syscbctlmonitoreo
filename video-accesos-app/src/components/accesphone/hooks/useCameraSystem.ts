'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { Camera, VideoConfig, PrivadaVideo } from '../types';
import { MAX_CONSECUTIVE_VIDEO_ERRORS, VIDEO_RECOVERY_DELAY, GRID_REFRESH_MULTIPLIER } from '../constants';

export function useCameraSystem(videoConfig: VideoConfig) {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState(0);
  const [cameraImage, setCameraImage] = useState('');
  const [gridImages, setGridImages] = useState<Record<string, string>>({});
  const [gridView, setGridView] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const videoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridIntervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const errorsRef = useRef(0);

  const stopVideoRefresh = useCallback(() => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
  }, []);

  const stopGridRefresh = useCallback(() => {
    Object.values(gridIntervalsRef.current).forEach(clearInterval);
    gridIntervalsRef.current = {};
  }, []);

  const startVideoRefresh = useCallback(() => {
    stopVideoRefresh();
    errorsRef.current = 0;
    setHasError(false);
    if (cameras.length === 0) return;
    const cam = cameras[selectedCamera] || cameras[0];

    const refresh = () => {
      const feedUrl = cam.needsProxy ? cam.proxyUrl : cam.url;
      const sep = feedUrl.includes('?') ? '&' : '?';
      const url = `${feedUrl}${sep}t=${Date.now()}`;
      const img = new Image();
      img.onload = () => {
        setCameraImage(url);
        setHasError(false);
        errorsRef.current = 0;
      };
      img.onerror = () => {
        errorsRef.current++;
        if (errorsRef.current >= MAX_CONSECUTIVE_VIDEO_ERRORS) {
          stopVideoRefresh();
          setHasError(true);
          setTimeout(() => {
            if (!isPaused) {
              errorsRef.current = 0;
              startVideoRefresh();
            }
          }, VIDEO_RECOVERY_DELAY);
        }
      };
      img.src = url;
    };

    refresh();
    videoIntervalRef.current = setInterval(refresh, videoConfig.refreshRate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameras, selectedCamera, videoConfig.refreshRate, isPaused, stopVideoRefresh]);

  const startGridRefresh = useCallback(() => {
    stopGridRefresh();
    cameras.forEach((cam) => {
      const refresh = () => {
        const feedUrl = cam.needsProxy ? cam.proxyUrl : cam.url;
        const sep = feedUrl.includes('?') ? '&' : '?';
        const url = `${feedUrl}${sep}t=${Date.now()}`;
        const img = new Image();
        img.onload = () => {
          setGridImages(prev => ({ ...prev, [cam.channel]: url }));
        };
        img.src = url;
      };
      refresh();
      gridIntervalsRef.current[cam.channel] = setInterval(
        refresh,
        videoConfig.refreshRate * GRID_REFRESH_MULTIPLIER
      );
    });
  }, [cameras, videoConfig.refreshRate, stopGridRefresh]);

  // Start/stop video based on state
  useEffect(() => {
    if (showVideo && !isPaused && cameras.length > 0) {
      if (gridView && cameras.length > 1) {
        stopVideoRefresh();
        startGridRefresh();
      } else {
        stopGridRefresh();
        startVideoRefresh();
      }
    } else {
      stopVideoRefresh();
      stopGridRefresh();
    }
    return () => {
      stopVideoRefresh();
      stopGridRefresh();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVideo, isPaused, selectedCamera, cameras, gridView]);

  const loadPrivadaCameras = useCallback((videos: PrivadaVideo[]) => {
    const cams: Camera[] = videos.map((v) => ({
      id: v.id,
      channel: `privada_video_${v.id}`,
      alias: v.alias,
      url: v.url,
      privadaId: v.privada_id,
      needsProxy: v.needs_proxy,
      proxyUrl: v.proxy_url,
    }));
    setCameras(cams);
    setSelectedCamera(0);
    if (cams.length > 0) {
      setShowVideo(true);
    }
  }, []);

  const selectCamera = useCallback((index: number) => {
    if (index === selectedCamera) return;
    setIsLoading(true);
    setSelectedCamera(index);
    errorsRef.current = 0;
    setTimeout(() => setIsLoading(false), 500);
  }, [selectedCamera]);

  const toggleGrid = useCallback(() => {
    setGridView(prev => !prev);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const captureSnapshot = useCallback(async (onCapture?: (info: { privadaId: number; camIndex: number; camName: string }) => void) => {
    const cam = cameras[selectedCamera];
    if (!cam) return;

    if (cam.needsProxy && cam.privadaId) {
      const url = `${videoConfig.proxyUrl}?privada_id=${cam.privadaId}&cam=${cam.id}&save=1&t=${Date.now()}`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          onCapture?.({ privadaId: cam.privadaId, camIndex: cam.id, camName: cam.alias });
        }
      } catch {}
    }

    // Download current frame
    if (cameraImage) {
      const a = document.createElement('a');
      a.href = cameraImage;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `snapshot_${cam.alias.replace(/\s+/g, '_')}_${ts}.jpg`;
      a.click();
    }
  }, [cameras, selectedCamera, videoConfig.proxyUrl, cameraImage]);

  const autoSnapshotAll = useCallback(async (onCapture?: (info: { privadaId: number; camIndex: number; camName: string }) => void) => {
    if (!videoConfig.autoSnapshot) return;
    for (const cam of cameras) {
      if (cam.needsProxy && cam.privadaId) {
        const url = `${videoConfig.proxyUrl}?privada_id=${cam.privadaId}&cam=${cam.id}&save=1&t=${Date.now()}`;
        try {
          const res = await fetch(url);
          if (res.ok) {
            onCapture?.({ privadaId: cam.privadaId, camIndex: cam.id, camName: cam.alias });
          }
        } catch {}
      }
    }
  }, [cameras, videoConfig]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopVideoRefresh();
      stopGridRefresh();
    };
  }, [stopVideoRefresh, stopGridRefresh]);

  return {
    cameras,
    selectedCamera,
    cameraImage,
    gridImages,
    gridView,
    isPaused,
    isLoading,
    hasError,
    showVideo,
    fps: Math.round(1000 / videoConfig.refreshRate),
    setShowVideo,
    selectCamera,
    toggleGrid,
    togglePause,
    captureSnapshot,
    autoSnapshotAll,
    loadPrivadaCameras,
    setCameras,
  };
}
