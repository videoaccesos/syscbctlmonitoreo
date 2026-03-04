"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { UA, IncomingRTCSessionEvent, OutgoingRTCSessionEvent } from "jssip/lib/UA";
import type { RTCSession } from "jssip/lib/RTCSession";
import type { AccesPhoneConfig, CallInfo } from "../types";
import {
  RECONNECT_BASE_DELAY,
  RECONNECT_MAX_DELAY,
  RECONNECT_MAX_ATTEMPTS,
  loadConfig,
} from "../constants";

// ---------------------------------------------------------------------------
// Params & Return types
// ---------------------------------------------------------------------------

export interface UseSipConnectionParams<T extends AccesPhoneConfig> {
  defaults: T;
  userAgent: string;
  /** Called when an incoming RTC session arrives */
  onNewIncomingSession: (session: RTCSession, callerNumber: string) => void;
}

export interface UseSipConnectionReturn {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  reconnectAttempt: number;
  reconnectExhausted: boolean;
  networkOffline: boolean;
  statusText: string;
  setStatusText: React.Dispatch<React.SetStateAction<string>>;
  isInsecureContext: boolean;
  uaRef: React.MutableRefObject<UA | null>;
  mountedRef: React.MutableRefObject<boolean>;
  manualDisconnectRef: React.MutableRefObject<boolean>;
  configRef: React.MutableRefObject<AccesPhoneConfig>;
  connectSIP: () => void;
  disconnectSIP: () => void;
  cancelReconnect: () => void;
  /** Exposed so callers can trigger settings-required UI */
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  showSettings: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSipConnection<T extends AccesPhoneConfig>({
  defaults,
  userAgent,
  onNewIncomingSession,
}: UseSipConnectionParams<T>): UseSipConnectionReturn {
  // Connection state
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnectExhausted, setReconnectExhausted] = useState(false);
  const [networkOffline, setNetworkOffline] = useState(false);
  const [statusText, setStatusText] = useState("Desconectado");
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const uaRef = useRef<UA | null>(null);
  const mountedRef = useRef(true);
  const manualDisconnectRef = useRef(false);
  const configRef = useRef<AccesPhoneConfig>(defaults);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectSIPInternalRef = useRef<(() => Promise<void>) | undefined>(undefined);
  /** Guards against overlapping connect attempts */
  const connectingLockRef = useRef(false);

  // Stable ref for the incoming-session callback
  const onNewIncomingSessionRef = useRef(onNewIncomingSession);
  useEffect(() => {
    onNewIncomingSessionRef.current = onNewIncomingSession;
  }, [onNewIncomingSession]);

  useEffect(() => {
    reconnectAttemptRef.current = reconnectAttempt;
  }, [reconnectAttempt]);

  // -----------------------------------------------------------------
  // Network status detection
  // -----------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOffline = () => {
      setNetworkOffline(true);
      setStatusText("Sin conexion de red");
    };

    const handleOnline = () => {
      setNetworkOffline(false);
      // If we were waiting to reconnect, try now
      if (
        !manualDisconnectRef.current &&
        !uaRef.current &&
        mountedRef.current
      ) {
        setStatusText("Red disponible, reconectando...");
        // Reset attempt counter when network comes back
        reconnectAttemptRef.current = 0;
        setReconnectAttempt(0);
        setReconnectExhausted(false);
        // Small delay to let the network stabilize
        setTimeout(() => {
          if (mountedRef.current && !manualDisconnectRef.current) {
            connectSIPInternalRef.current?.();
          }
        }, 2000);
      }
    };

    // Check initial state
    if (!navigator.onLine) {
      setNetworkOffline(true);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // -----------------------------------------------------------------
  // Force-close the UA and its underlying WebSocket transport
  // -----------------------------------------------------------------
  const forceCloseUA = useCallback(() => {
    const ua = uaRef.current;
    if (!ua) return;
    try {
      ua.terminateSessions();
    } catch { /* ignore */ }
    try {
      ua.unregister();
    } catch { /* ignore */ }
    try {
      ua.stop();
    } catch { /* ignore */ }
    uaRef.current = null;
  }, []);

  // -----------------------------------------------------------------
  // Schedule auto-reconnect
  // -----------------------------------------------------------------
  const scheduleReconnect = useCallback((attempt: number) => {
    if (manualDisconnectRef.current) return;
    if (!mountedRef.current) return;

    // If network is offline, don't schedule — the "online" listener will handle it
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatusText("Sin conexion de red");
      setNetworkOffline(true);
      setReconnecting(false);
      return;
    }

    if (RECONNECT_MAX_ATTEMPTS > 0 && attempt >= RECONNECT_MAX_ATTEMPTS) {
      setStatusText("Reconexion fallida — limite alcanzado");
      setReconnecting(false);
      setReconnectExhausted(true);
      return;
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, attempt),
      RECONNECT_MAX_DELAY
    );

    setReconnecting(true);
    setReconnectExhausted(false);
    setReconnectAttempt(attempt + 1);
    reconnectAttemptRef.current = attempt + 1;
    setStatusText(`Reconectando en ${Math.round(delay / 1000)}s... (${attempt + 1}/${RECONNECT_MAX_ATTEMPTS})`);

    reconnectTimerRef.current = setTimeout(() => {
      if (!mountedRef.current || manualDisconnectRef.current) return;

      // Ensure previous UA is fully torn down before reconnecting
      forceCloseUA();

      setReconnecting(false);
      connectSIPInternalRef.current?.();
    }, delay);
  }, [forceCloseUA]);

  const cancelReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setReconnecting(false);
    setReconnectAttempt(0);
    reconnectAttemptRef.current = 0;
  }, []);

  // -----------------------------------------------------------------
  // Connect SIP internal
  // -----------------------------------------------------------------
  const connectSIPInternal = useCallback(async () => {
    // Prevent overlapping connection attempts
    if (connectingLockRef.current) return;
    if (uaRef.current) return;

    // Don't attempt if network is offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatusText("Sin conexion de red");
      setNetworkOffline(true);
      return;
    }

    let cfg = configRef.current;
    if (!cfg.extension || !cfg.sipPassword) {
      cfg = loadConfig(defaults);
      configRef.current = cfg;
    }

    if (!cfg.extension || !cfg.sipPassword || !cfg.wsServer || !cfg.sipDomain) {
      setStatusText("Configure SIP primero");
      setShowSettings(true);
      return;
    }

    connectingLockRef.current = true;
    manualDisconnectRef.current = false;
    setConnecting(true);
    setStatusText("Conectando...");

    try {
      const JsSIP = await import("jssip");
      const socket = new JsSIP.WebSocketInterface(cfg.wsServer);
      const sipUri = `sip:${cfg.extension}@${cfg.sipDomain}`;

      const ua = new JsSIP.UA({
        sockets: [socket],
        uri: sipUri,
        password: cfg.sipPassword,
        register: true,
        register_expires: 600,
        session_timers: false,
        user_agent: userAgent,
      });

      ua.on("connected", () => {
        setStatusText("Conectado");
      });

      ua.on("disconnected", () => {
        setConnected(false);
        setConnecting(false);
        connectingLockRef.current = false;

        // Ensure the disconnected UA is fully cleaned up
        forceCloseUA();

        if (manualDisconnectRef.current) {
          setStatusText("Desconectado");
        } else {
          setStatusText("Conexion perdida");
          scheduleReconnect(reconnectAttemptRef.current);
        }
      });

      ua.on("registered", () => {
        setConnected(true);
        setConnecting(false);
        connectingLockRef.current = false;
        setReconnecting(false);
        setReconnectAttempt(0);
        setReconnectExhausted(false);
        reconnectAttemptRef.current = 0;
        setStatusText("Registrado");
      });

      ua.on("unregistered", () => {
        setConnected(false);
        setStatusText("No registrado");
      });

      ua.on("registrationFailed", (e) => {
        setConnected(false);
        setConnecting(false);
        connectingLockRef.current = false;
        setStatusText(`Error: ${e.cause || "registro fallido"}`);
        if (!manualDisconnectRef.current) {
          scheduleReconnect(reconnectAttemptRef.current);
        }
      });

      ua.on("newRTCSession", (data: IncomingRTCSessionEvent | OutgoingRTCSessionEvent) => {
        const session = data.session;

        if (data.originator === "remote") {
          const callerNumber = session.remote_identity?.uri?.user || "Desconocido";
          onNewIncomingSessionRef.current(session, callerNumber);
        }
      });

      ua.start();
      uaRef.current = ua;
      setStatusText("Conectando WebSocket...");
    } catch (err) {
      setConnecting(false);
      connectingLockRef.current = false;
      setStatusText(`Error: ${err instanceof Error ? err.message : String(err)}`);
      if (!manualDisconnectRef.current) {
        scheduleReconnect(reconnectAttemptRef.current);
      }
    }
  }, [defaults, userAgent, scheduleReconnect, forceCloseUA]);

  // Keep the ref in sync so the reconnect timer can call the latest version
  useEffect(() => {
    connectSIPInternalRef.current = connectSIPInternal;
  }, [connectSIPInternal]);

  // -----------------------------------------------------------------
  // Public connect / disconnect
  // -----------------------------------------------------------------
  const [isInsecureContext, setIsInsecureContext] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isSecure =
        window.isSecureContext ||
        window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      setIsInsecureContext(!isSecure);
    }
  }, []);

  const connectSIP = useCallback(() => {
    if (isInsecureContext) {
      setStatusText("HTTPS requerido");
      return;
    }
    manualDisconnectRef.current = false;
    cancelReconnect();
    setReconnectExhausted(false);
    reconnectAttemptRef.current = 0;
    setReconnectAttempt(0);
    connectSIPInternalRef.current?.();
  }, [cancelReconnect, isInsecureContext]);

  const disconnectSIP = useCallback(() => {
    manualDisconnectRef.current = true;
    cancelReconnect();
    forceCloseUA();
    setConnected(false);
    setConnecting(false);
    connectingLockRef.current = false;
    setReconnectExhausted(false);
    setStatusText("Desconectado");
  }, [cancelReconnect, forceCloseUA]);

  // -----------------------------------------------------------------
  // Auto-connect on mount if credentials are saved
  // -----------------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true;
    const cfg = loadConfig(defaults);
    if (cfg.extension && cfg.sipPassword && cfg.wsServer && cfg.sipDomain) {
      configRef.current = cfg;
      const t = setTimeout(() => {
        if (mountedRef.current && !uaRef.current) {
          connectSIPInternalRef.current?.();
        }
      }, 1000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      manualDisconnectRef.current = true;
      cancelReconnect();
      forceCloseUA();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    connected,
    connecting,
    reconnecting,
    reconnectAttempt,
    reconnectExhausted,
    networkOffline,
    statusText,
    setStatusText,
    isInsecureContext,
    uaRef,
    mountedRef,
    manualDisconnectRef,
    configRef,
    connectSIP,
    disconnectSIP,
    cancelReconnect,
    setShowSettings,
    showSettings,
  };
}
