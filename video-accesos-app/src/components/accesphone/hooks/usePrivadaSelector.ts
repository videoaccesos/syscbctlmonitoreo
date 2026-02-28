'use client';
import { useState, useEffect, useCallback } from 'react';
import type { PrivadaOption, PrivadaConfig, PrivadaLookupResult } from '../types';

export function usePrivadaSelector(privadaConfig: PrivadaConfig) {
  const [privadas, setPrivadas] = useState<PrivadaOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [privadaInfo, setPrivadaInfo] = useState('');

  const loadPrivadas = useCallback(async () => {
    try {
      const res = await fetch(`${privadaConfig.apiUrl}?action=list_privadas`);
      const data = await res.json();
      if (data.success && data.privadas) {
        setPrivadas(data.privadas);
      }
    } catch {}
  }, [privadaConfig.apiUrl]);

  useEffect(() => {
    loadPrivadas();
  }, [loadPrivadas]);

  const selectPrivada = useCallback(async (id: number) => {
    setSelectedId(id);
    setIsLoading(true);
    try {
      const [videosRes, relaysRes] = await Promise.all([
        fetch(`${privadaConfig.apiUrl}?action=get_videos&privada_id=${id}`).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`${privadaConfig.apiUrl}?action=get_relays&privada_id=${id}`).then(r => r.json()).catch(() => ({ success: false })),
      ]);
      setIsLoading(false);
      const privada = privadas.find(p => p.id === id);
      if (privada) setPrivadaInfo(privada.nombre);
      return {
        videos: videosRes.success ? videosRes.videos || [] : [],
        relays: relaysRes.success ? relaysRes.relays || [] : [],
      };
    } catch {
      setIsLoading(false);
      return { videos: [], relays: [] };
    }
  }, [privadaConfig.apiUrl, privadas]);

  const lookupByCaller = useCallback(async (phone: string): Promise<PrivadaLookupResult | null> => {
    if (!privadaConfig.autoLookupCaller || !phone) return null;
    try {
      const res = await fetch(`${privadaConfig.apiUrl}?action=lookup_caller&telefono=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.success) {
        setSelectedId(data.privada_id);
        setPrivadaInfo(`${data.nombre} - ${data.contacto || ''}`);
        return data as PrivadaLookupResult;
      }
    } catch {}
    return null;
  }, [privadaConfig]);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setPrivadaInfo('');
  }, []);

  return {
    privadas,
    selectedId,
    isLoading,
    privadaInfo,
    loadPrivadas,
    selectPrivada,
    lookupByCaller,
    clearSelection,
  };
}
