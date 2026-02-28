'use client';
import { useState, useCallback } from 'react';
import type { Relay, PrivadaConfig, PrivadaRelay } from '../types';

export function useRelayController(privadaConfig: PrivadaConfig) {
  const [relays, setRelays] = useState<Relay[]>([]);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [showRelays, setShowRelays] = useState(false);

  const loadRelays = useCallback(async (privadaId: number) => {
    try {
      const res = await fetch(`${privadaConfig.apiUrl}?action=get_relays&privada_id=${privadaId}`);
      const data = await res.json();
      if (data.success && data.relays) {
        const mapped: Relay[] = data.relays.map((r: PrivadaRelay) => ({
          id: r.id,
          alias: r.alias,
          dns: r.dns,
          puerto: r.puerto,
        }));
        setRelays(mapped);
        if (mapped.length > 0) setShowRelays(true);
      } else {
        setRelays([]);
      }
    } catch {
      setRelays([]);
    }
  }, [privadaConfig.apiUrl]);

  const activateRelay = useCallback(async (
    relay: Relay,
    onResult?: (info: { id: number; alias: string; success: boolean }) => void
  ): Promise<boolean> => {
    if (activatingId !== null) return false;
    setActivatingId(relay.id);

    const topic = relay.dns.includes('/')
      ? relay.dns
      : `home/relays/${relay.dns}/${relay.id}/set`;

    try {
      const res = await fetch(privadaConfig.mqttRelayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mqtt_direct',
          topic,
          payload: 'PULSE',
          puerto: parseInt(relay.puerto) || 1883,
        }),
      });
      const result = await res.json();
      const success = result.success === true;

      onResult?.({ id: relay.id, alias: relay.alias, success });

      // Keep visual feedback for 2.5s
      setTimeout(() => setActivatingId(null), 2500);
      return success;
    } catch {
      onResult?.({ id: relay.id, alias: relay.alias, success: false });
      setTimeout(() => setActivatingId(null), 2500);
      return false;
    }
  }, [activatingId, privadaConfig.mqttRelayUrl]);

  const clearRelays = useCallback(() => {
    setRelays([]);
    setShowRelays(false);
  }, []);

  return {
    relays,
    activatingId,
    showRelays,
    setShowRelays,
    loadRelays,
    activateRelay,
    clearRelays,
  };
}
