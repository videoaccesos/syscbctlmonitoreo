'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { SipConfig, ConnectionStatus } from '../types';
import { DEFAULT_SIP, STORAGE_KEYS } from '../constants';

export function useSipConnection() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [sipConfig, setSipConfig] = useState<SipConfig>(DEFAULT_SIP);
  const uaRef = useRef<any>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const onNewSessionRef = useRef<((session: any) => void) | null>(null);

  // Load config from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SIP);
      if (saved) setSipConfig(JSON.parse(saved));
    } catch {}
  }, []);

  const saveConfig = useCallback((config: SipConfig) => {
    setSipConfig(config);
    localStorage.setItem(STORAGE_KEYS.SIP, JSON.stringify(config));
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) return;
    const attempt = reconnectAttemptRef.current;
    const delay = Math.min(2000 * Math.pow(2, attempt), 30000);
    reconnectAttemptRef.current = attempt + 1;
    setStatus('reconnecting');
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect();
    }, delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(() => {
    const cfg = sipConfig;
    if (!cfg.extension || !cfg.password) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');

    import('jssip').then((JsSIP) => {
      try {
        if (uaRef.current) {
          try { uaRef.current.stop(); } catch {}
          uaRef.current = null;
        }

        const socket = new JsSIP.WebSocketInterface(cfg.wsServer);
        const ua = new JsSIP.UA({
          sockets: [socket],
          uri: `sip:${cfg.extension}@${cfg.domain}`,
          password: cfg.password,
          register: true,
          register_expires: 600,
          session_timers: false,
          user_agent: 'AccesPhonePro/3.0',
        });

        ua.on('connected', () => setStatus('registering'));
        ua.on('disconnected', () => {
          setStatus('disconnected');
          scheduleReconnect();
        });
        ua.on('registered', () => {
          setStatus('registered');
          reconnectAttemptRef.current = 0;
        });
        ua.on('unregistered', () => {
          setStatus('disconnected');
          scheduleReconnect();
        });
        ua.on('registrationFailed', () => setStatus('error'));
        ua.on('newRTCSession', (e: any) => {
          if (e.originator === 'remote' && onNewSessionRef.current) {
            onNewSessionRef.current(e.session);
          }
        });

        ua.start();
        uaRef.current = ua;
      } catch (err) {
        console.error('SIP error:', err);
        setStatus('error');
      }
    }).catch(() => setStatus('error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sipConfig, scheduleReconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    if (uaRef.current) {
      try { uaRef.current.stop(); } catch {}
      uaRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const setOnNewSession = useCallback((handler: (session: any) => void) => {
    onNewSessionRef.current = handler;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (sipConfig.extension && sipConfig.password) {
      const t = setTimeout(() => connect(), 1000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (uaRef.current) {
        try { uaRef.current.stop(); } catch {}
      }
    };
  }, []);

  return {
    status,
    sipConfig,
    ua: uaRef,
    saveConfig,
    connect,
    disconnect,
    setOnNewSession,
  };
}
