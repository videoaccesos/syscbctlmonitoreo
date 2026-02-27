"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { UA, IncomingRTCSessionEvent, OutgoingRTCSessionEvent } from "jssip/lib/UA";
import type { RTCSession } from "jssip/lib/RTCSession";
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  X,
  ChevronUp,
  ChevronDown,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Auto-reconnect constants
// ---------------------------------------------------------------------------
const RECONNECT_BASE_DELAY = 2000; // 2 seconds
const RECONNECT_MAX_DELAY = 30000; // 30 seconds max
const RECONNECT_MAX_ATTEMPTS = 0;  // 0 = unlimited

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccesPhoneConfig {
  wsServer: string;
  extension: string;
  sipPassword: string;
  sipDomain: string;
  displayName: string;
  cameraProxyUrl: string;
  cameraRefreshMs: number;
  videoAutoOnCall: boolean;
}

interface CallInfo {
  number: string;
  direction: "incoming" | "outgoing";
  startTime: Date;
}

interface AccesPhoneProps {
  onIncomingCall?: (callerNumber: string) => void;
  onCallAnswered?: (callerNumber: string) => void;
  onCallEnded?: () => void;
}

// Default SIP config - stored in localStorage
const DEFAULT_CONFIG: AccesPhoneConfig = {
  wsServer: "wss://accessbotpbx.info:8089/ws",
  extension: "",
  sipPassword: "",
  sipDomain: "accessbotpbx.info",
  displayName: "Monitoreo",
  cameraProxyUrl: "camera_proxy.php",
  cameraRefreshMs: 500,
  videoAutoOnCall: true,
};

const STORAGE_KEY = "accesphone_config";

function loadConfig(): AccesPhoneConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_CONFIG;
}

function saveConfigToStorage(cfg: AccesPhoneConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccesPhone({
  onIncomingCall,
  onCallAnswered,
  onCallEnded,
}: AccesPhoneProps) {
  // State
  const [expanded, setExpanded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [ringing, setRinging] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [dialNumber, setDialNumber] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<AccesPhoneConfig>(DEFAULT_CONFIG);
  const [statusText, setStatusText] = useState("Desconectado");

  // Auto-reconnect state
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);

  // Refs
  const uaRef = useRef<UA | null>(null);
  const sessionRef = useRef<RTCSession | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDisconnectRef = useRef(false);
  const mountedRef = useRef(true);

  // Stable refs for callbacks (avoid stale closures in SIP event handlers)
  const onIncomingCallRef = useRef(onIncomingCall);
  const onCallAnsweredRef = useRef(onCallAnswered);
  const onCallEndedRef = useRef(onCallEnded);
  useEffect(() => {
    onIncomingCallRef.current = onIncomingCall;
    onCallAnsweredRef.current = onCallAnswered;
    onCallEndedRef.current = onCallEnded;
  }, [onIncomingCall, onCallAnswered, onCallEnded]);

  // Stable refs to avoid stale closures in async callbacks / timers
  const configRef = useRef<AccesPhoneConfig>(DEFAULT_CONFIG);
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    reconnectAttemptRef.current = reconnectAttempt;
  }, [reconnectAttempt]);

  // Load config on mount
  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  // Call duration timer
  useEffect(() => {
    if (inCall) {
      callTimerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      setCallDuration(0);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [inCall]);

  function formatDuration(s: number) {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
  }

  // -----------------------------------------------------------
  // Call cleanup
  // -----------------------------------------------------------
  const cleanupCall = useCallback(() => {
    setInCall(false);
    setRinging(false);
    setCallInfo(null);
    setMuted(false);
    sessionRef.current = null;
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  }, []);

  // -----------------------------------------------------------
  // Setup session event handlers
  // -----------------------------------------------------------
  const setupSessionEvents = useCallback(
    (session: RTCSession, callerNumber: string) => {
      session.on("accepted", () => {
        console.log("[AccesPhone] Session accepted");
        setRinging(false);
        setInCall(true);
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
        }
        onCallAnsweredRef.current?.(callerNumber);
      });

      session.on("confirmed", () => {
        console.log("[AccesPhone] Session confirmed - audio should already be attached via peerconnection track event");
      });

      session.on("ended", (e) => {
        console.log("[AccesPhone] Session ended:", e?.cause || "unknown cause");
        cleanupCall();
        onCallEndedRef.current?.();
      });

      session.on("failed", (e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const evt = e as any;
        console.error("[AccesPhone] Session failed:", evt?.cause || "unknown cause");
        console.error("[AccesPhone] Session failed details:", {
          cause: evt?.cause,
          status_code: evt?.message?.status_code,
          reason_phrase: evt?.message?.reason_phrase,
          originator: evt?.originator,
        });
        if (evt?.cause === "Internal Error" || evt?.cause === "internal error") {
          console.error("[AccesPhone] INTERNAL ERROR - posible problema con SDP/WebRTC/media");
        }
        cleanupCall();
        onCallEndedRef.current?.();
      });

      // Log SDP events for debugging
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session.on("sdp", (e: any) => {
        console.log("[AccesPhone] SDP event:", e?.type, "\n", e?.sdp?.substring(0, 500));
      });

      session.on("peerconnection", (e) => {
        console.log("[AccesPhone] PeerConnection created");
        const pc = e.peerconnection;
        if (pc) {
          // Remote audio - matching working softphone implementation
          pc.addEventListener("track", (ev: RTCTrackEvent) => {
            console.log("[AccesPhone] Remote track received:", ev.track.kind);
            if (remoteAudioRef.current && ev.streams?.[0]) {
              remoteAudioRef.current.srcObject = ev.streams[0];
              remoteAudioRef.current.volume = speakerOn ? 1.0 : 0;
              remoteAudioRef.current.play().catch(() => {});
            }
          });

          // Backwards compatibility for older browsers
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pc.addEventListener("addstream", (ev: any) => {
            console.log("[AccesPhone] addstream event received");
            if (ev.stream && ev.stream.getAudioTracks().length > 0) {
              if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = ev.stream;
                remoteAudioRef.current.play().catch(() => {});
              }
            }
          });

          pc.oniceconnectionstatechange = () => {
            console.log("[AccesPhone] ICE connection state:", pc.iceConnectionState);
          };

          pc.onsignalingstatechange = () => {
            console.log("[AccesPhone] Signaling state:", pc.signalingState);
          };

          pc.onconnectionstatechange = () => {
            console.log("[AccesPhone] Connection state:", pc.connectionState);
          };
        }
      });
    },
    [cleanupCall, speakerOn]
  );

  // Ref to always hold the latest connectSIPInternal (avoids stale closures in timers)
  const connectSIPInternalRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // -----------------------------------------------------------
  // Schedule auto-reconnect (exponential backoff)
  // -----------------------------------------------------------
  const scheduleReconnect = useCallback((attempt: number) => {
    if (manualDisconnectRef.current) return;
    if (!mountedRef.current) return;
    if (RECONNECT_MAX_ATTEMPTS > 0 && attempt >= RECONNECT_MAX_ATTEMPTS) {
      setStatusText("Reconexion fallida - reconecte manualmente");
      setReconnecting(false);
      return;
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, attempt),
      RECONNECT_MAX_DELAY
    );

    console.log(`[AccesPhone] Reconectando en ${delay / 1000}s (intento ${attempt + 1})...`);
    setReconnecting(true);
    setReconnectAttempt(attempt + 1);
    reconnectAttemptRef.current = attempt + 1;
    setStatusText(`Reconectando en ${Math.round(delay / 1000)}s...`);

    reconnectTimerRef.current = setTimeout(() => {
      if (!mountedRef.current || manualDisconnectRef.current) return;
      // Clean up old UA before reconnecting
      if (uaRef.current) {
        try {
          uaRef.current.stop();
        } catch {
          // ignore
        }
        uaRef.current = null;
      }
      setReconnecting(false);
      // Call via ref to always get the latest version (avoids stale closure)
      connectSIPInternalRef.current?.();
    }, delay);
  }, []);

  // -----------------------------------------------------------
  // Cancel scheduled reconnect
  // -----------------------------------------------------------
  const cancelReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    setReconnecting(false);
    setReconnectAttempt(0);
  }, []);

  // -----------------------------------------------------------
  // Connect / Disconnect SIP
  // -----------------------------------------------------------
  const connectSIPInternal = useCallback(async () => {
    if (uaRef.current) {
      console.log('[AccesPhone] Ya hay un UA activo, saliendo');
      return;
    }

    // Read config from ref, but fallback to localStorage if ref is stale
    // (React Strict Mode can cause configRef to be overwritten with defaults)
    let cfg = configRef.current;
    if (!cfg.extension || !cfg.sipPassword) {
      console.log('[AccesPhone] configRef incompleto, releyendo localStorage...');
      cfg = loadConfig();
      configRef.current = cfg;
    }

    console.log('[AccesPhone] connectSIPInternal LLAMADO', {
      extension: cfg.extension || '(vacío)',
      wsServer: cfg.wsServer || '(vacío)',
      sipDomain: cfg.sipDomain || '(vacío)',
      tienePassword: !!cfg.sipPassword,
    });

    if (!cfg.extension || !cfg.sipPassword || !cfg.wsServer || !cfg.sipDomain) {
      console.warn('[AccesPhone] Config incompleta, mostrando settings');
      setStatusText("Configure SIP primero");
      setShowSettings(true);
      return;
    }

    manualDisconnectRef.current = false;
    setConnecting(true);
    setStatusText("Conectando...");

    try {
      // Dynamic import to avoid SSR issues
      console.log('[AccesPhone] Importando JsSIP...');
      const JsSIP = await import("jssip");
      console.log('[AccesPhone] JsSIP importado OK');

      // Enable JsSIP internal debug logging
      JsSIP.debug.enable('JsSIP:*');

      console.log('[AccesPhone] Creando WebSocket hacia:', cfg.wsServer);
      const socket = new JsSIP.WebSocketInterface(cfg.wsServer);
      const sipUri = `sip:${cfg.extension}@${cfg.sipDomain}`;
      console.log('[AccesPhone] SIP URI:', sipUri);

      const ua = new JsSIP.UA({
        sockets: [socket],
        uri: sipUri,
        password: cfg.sipPassword,
        register: true,
        register_expires: 600,
        session_timers: false,
        user_agent: "Access Phone v3.1",
      });

      ua.on("connected", () => {
        console.log("[AccesPhone] WebSocket conectado");
        setStatusText("Conectado");
      });

      ua.on("disconnected", () => {
        console.log("[AccesPhone] WebSocket desconectado, manual:", manualDisconnectRef.current);
        setConnected(false);
        setConnecting(false);

        // Just clear the reference - do NOT call ua.stop() here as it can
        // fire another 'disconnected' event recursively
        uaRef.current = null;

        if (manualDisconnectRef.current) {
          setStatusText("Desconectado");
        } else {
          // Auto-reconnect - read attempt from ref to avoid stale closure
          setStatusText("Conexion perdida");
          scheduleReconnect(reconnectAttemptRef.current);
        }
      });

      ua.on("registered", () => {
        console.log("[AccesPhone] SIP registrado exitosamente");
        setConnected(true);
        setConnecting(false);
        setReconnecting(false);
        setReconnectAttempt(0);
        reconnectAttemptRef.current = 0;
        setStatusText("Registrado");
      });

      ua.on("unregistered", () => {
        console.log("[AccesPhone] SIP des-registrado");
        setConnected(false);
        setStatusText("No registrado");
      });

      ua.on("registrationFailed", (e) => {
        console.error("[AccesPhone] Registro SIP fallido:", e.cause);
        setConnected(false);
        setConnecting(false);
        setStatusText(`Error: ${e.cause || "registro fallido"}`);

        // If registration fails but WS is connected, schedule retry
        if (!manualDisconnectRef.current) {
          scheduleReconnect(reconnectAttemptRef.current);
        }
      });

      ua.on("newRTCSession", (data: IncomingRTCSessionEvent | OutgoingRTCSessionEvent) => {
        const session = data.session;
        console.log("[AccesPhone] newRTCSession - originator:", data.originator, "direction:", session.direction);

        if (data.originator === "remote") {
          // Incoming call
          const callerNumber = session.remote_identity?.uri?.user || "Desconocido";
          console.log("[AccesPhone] Incoming call from:", callerNumber, "session status:", session.status);

          sessionRef.current = session;
          setRinging(true);
          setCallInfo({
            number: callerNumber,
            direction: "incoming",
            startTime: new Date(),
          });
          setExpanded(true);

          // Notify parent about incoming call
          onIncomingCallRef.current?.(callerNumber);

          // Play ringtone
          if (ringtoneRef.current) {
            ringtoneRef.current.loop = true;
            ringtoneRef.current.play().catch(() => {});
          }

          // Setup session events
          setupSessionEvents(session, callerNumber);

          // Listen for getUserMedia failure on this session
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          session.on("getusermediafailed", (e: any) => {
            console.error("[AccesPhone] getUserMedia FAILED:", e);
          });
        }
      });

      console.log('[AccesPhone] Llamando ua.start()...');
      ua.start();
      uaRef.current = ua;
      console.log('[AccesPhone] UA iniciado, esperando eventos de conexión...');
      setStatusText("Conectando WebSocket...");
    } catch (err) {
      console.error("[AccesPhone] Error al conectar SIP:", err);
      setConnecting(false);
      setStatusText(`Error: ${err instanceof Error ? err.message : String(err)}`);

      // Schedule reconnect on connection error
      if (!manualDisconnectRef.current) {
        scheduleReconnect(reconnectAttemptRef.current);
      }
    }
  // Dependencies: only setupSessionEvents (for session handling) and scheduleReconnect
  // Config is read from configRef, reconnectAttempt from reconnectAttemptRef
  }, [setupSessionEvents, scheduleReconnect]);

  // Keep ref in sync so timers always call the latest version
  useEffect(() => {
    connectSIPInternalRef.current = connectSIPInternal;
  }, [connectSIPInternal]);

  // Public connect (resets manual disconnect flag)
  const connectSIP = useCallback(() => {
    console.log('[AccesPhone] connectSIP() llamado');
    manualDisconnectRef.current = false;
    cancelReconnect();
    if (connectSIPInternalRef.current) {
      connectSIPInternalRef.current();
    } else {
      console.error('[AccesPhone] ERROR: connectSIPInternalRef.current es undefined!');
      setStatusText('Error interno - recargue la página');
    }
  }, [cancelReconnect]);

  const disconnectSIP = useCallback(() => {
    manualDisconnectRef.current = true;
    cancelReconnect();
    if (uaRef.current) {
      uaRef.current.unregister();
      uaRef.current.stop();
      uaRef.current = null;
    }
    setConnected(false);
    setConnecting(false);
    setStatusText("Desconectado");
    cleanupCall();
  }, [cleanupCall, cancelReconnect]);

  // -----------------------------------------------------------
  // Call actions
  // -----------------------------------------------------------
  const answerCall = useCallback(() => {
    if (sessionRef.current) {
      try {
        console.log("[AccesPhone] Attempting to answer call...");
        console.log("[AccesPhone] Session status:", sessionRef.current.status);
        console.log("[AccesPhone] Session direction:", sessionRef.current.direction);
        sessionRef.current.answer({
          mediaConstraints: { audio: true, video: false },
        });
        console.log("[AccesPhone] answer() called successfully");
      } catch (err) {
        console.error("[AccesPhone] Error answering call:", err);
      }
    } else {
      console.warn("[AccesPhone] No session to answer");
    }
  }, []);

  const hangupCall = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.terminate();
    }
    cleanupCall();
    onCallEndedRef.current?.();
  }, [cleanupCall]);

  const rejectCall = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.terminate({
        status_code: 486,
        reason_phrase: "Busy Here",
      });
    }
    cleanupCall();
  }, [cleanupCall]);

  const toggleMute = useCallback(() => {
    if (!sessionRef.current) return;
    if (muted) {
      sessionRef.current.unmute();
    } else {
      sessionRef.current.mute();
    }
    setMuted(!muted);
  }, [muted]);

  const toggleSpeaker = useCallback(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = speakerOn;
    }
    setSpeakerOn(!speakerOn);
  }, [speakerOn]);

  const makeCall = useCallback(() => {
    if (!dialNumber || !connected || !uaRef.current) return;

    const session = uaRef.current.call(`sip:${dialNumber}@${config.sipDomain}`, {
      mediaConstraints: { audio: true, video: false },
      rtcOfferConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      },
    });

    sessionRef.current = session;
    setCallInfo({
      number: dialNumber,
      direction: "outgoing",
      startTime: new Date(),
    });
    setInCall(true);
    setDialNumber("");

    setupSessionEvents(session, dialNumber);
  }, [dialNumber, connected, setupSessionEvents]);

  // -----------------------------------------------------------
  // Settings
  // -----------------------------------------------------------
  const saveSettings = () => {
    console.log('[AccesPhone] saveSettings - guardando y conectando...');
    saveConfigToStorage(config);
    // Also update the ref immediately so reconnect sees the new config
    configRef.current = config;
    setShowSettings(false);
    // Always reconnect after saving (like the original "Guardar y Conectar")
    if (uaRef.current) {
      disconnectSIP();
    }
    // Use connectSIP() which properly resets manualDisconnectRef and cancelReconnect
    setTimeout(() => {
      console.log('[AccesPhone] saveSettings timeout - llamando connectSIP()');
      connectSIP();
    }, 500);
  };

  // Auto-connect on mount if credentials are saved
  useEffect(() => {
    mountedRef.current = true;
    const cfg = loadConfig();
    console.log('[AccesPhone] MONTADO - verificando credenciales:', {
      extension: cfg.extension || '(vacío)',
      tienePassword: !!cfg.sipPassword,
      wsServer: cfg.wsServer || '(vacío)',
      sipDomain: cfg.sipDomain || '(vacío)',
    });
    if (cfg.extension && cfg.sipPassword && cfg.wsServer && cfg.sipDomain) {
      console.log("[AccesPhone] Credenciales encontradas, auto-conectando en 1s...");
      // Ensure configRef has the loaded config before connecting
      configRef.current = cfg;
      // Small delay to let the component fully mount
      const t = setTimeout(() => {
        console.log('[AccesPhone] Auto-connect timer disparado:', {
          mounted: mountedRef.current,
          yaConectado: !!uaRef.current,
          refDisponible: !!connectSIPInternalRef.current,
        });
        if (mountedRef.current && !uaRef.current) {
          if (connectSIPInternalRef.current) {
            connectSIPInternalRef.current();
          } else {
            console.error('[AccesPhone] ERROR: connectSIPInternalRef undefined en auto-connect!');
            setStatusText('Error interno - recargue la página');
          }
        }
      }, 1000);
      return () => clearTimeout(t);
    } else {
      console.log('[AccesPhone] Sin credenciales completas - esperando configuración manual');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      manualDisconnectRef.current = true; // prevent reconnect after unmount
      cancelReconnect();
      if (uaRef.current) {
        uaRef.current.unregister();
        uaRef.current.stop();
        uaRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------
  // Dialpad handler
  // -----------------------------------------------------------
  const dialpadPress = (digit: string) => {
    setDialNumber((prev) => prev + digit);
    if (inCall && sessionRef.current) {
      sessionRef.current.sendDTMF(digit);
    }
  };

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  const statusColor = connected
    ? "bg-green-500"
    : connecting || reconnecting
      ? "bg-yellow-500 animate-pulse"
      : "bg-red-500";

  return (
    <>
      {/* Hidden audio elements - matching working softphone */}
      <audio ref={remoteAudioRef} autoPlay />
      <audio autoPlay muted /> {/* localAudio for local stream pipeline */}
      <audio ref={ringtoneRef} src="/sounds/ringtone.wav" preload="auto" />

      {/* Floating phone widget */}
      <div className="fixed bottom-4 right-4 z-50">
        {/* Expanded panel */}
        {expanded && (
          <div className="mb-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span className="text-sm font-semibold">AccesPhone</span>
                <span className={`h-2 w-2 rounded-full ${statusColor}`} />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-1 rounded-md hover:bg-gray-700 transition"
                  title="Configuracion"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setExpanded(false)}
                  className="p-1 rounded-md hover:bg-gray-700 transition"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Status bar */}
            <div className={`px-4 py-1.5 border-b border-gray-200 text-xs flex items-center justify-between ${
              reconnecting ? "bg-yellow-50 text-yellow-700" : "bg-gray-50 text-gray-500"
            }`}>
              <span className="flex items-center gap-1.5">
                {reconnecting && <RefreshCw className="h-3 w-3 animate-spin" />}
                {statusText}
                {reconnectAttempt > 0 && !connected && (
                  <span className="text-yellow-600 font-medium">
                    (intento {reconnectAttempt})
                  </span>
                )}
              </span>
              {reconnecting && (
                <button
                  onClick={() => {
                    cancelReconnect();
                    manualDisconnectRef.current = true;
                    setStatusText("Desconectado");
                  }}
                  className="text-yellow-600 hover:text-yellow-800 text-xs underline"
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* Call in progress / Incoming call */}
            {(inCall || ringing) && callInfo && (
              <div
                className={`px-4 py-3 ${ringing ? "bg-green-50 animate-pulse" : "bg-blue-50"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {callInfo.direction === "incoming" ? (
                    <PhoneIncoming
                      className={`h-5 w-5 ${ringing ? "text-green-600" : "text-blue-600"}`}
                    />
                  ) : (
                    <PhoneOutgoing className="h-5 w-5 text-blue-600" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {callInfo.number}
                    </div>
                    <div className="text-xs text-gray-500">
                      {ringing
                        ? "Llamada entrante..."
                        : callInfo.direction === "incoming"
                          ? "En llamada"
                          : "Llamando..."}
                      {inCall && !ringing && (
                        <span className="ml-2 font-mono">
                          {formatDuration(callDuration)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {ringing ? (
                    <>
                      <button
                        onClick={answerCall}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
                      >
                        <Phone className="h-4 w-4" />
                        Contestar
                      </button>
                      <button
                        onClick={rejectCall}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
                      >
                        <PhoneOff className="h-4 w-4" />
                        Rechazar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={toggleMute}
                        className={`rounded-lg px-3 py-2 text-sm transition ${muted ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                      >
                        {muted ? (
                          <MicOff className="h-4 w-4" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={toggleSpeaker}
                        className={`rounded-lg px-3 py-2 text-sm transition ${!speakerOn ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                      >
                        {speakerOn ? (
                          <Volume2 className="h-4 w-4" />
                        ) : (
                          <VolumeX className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={hangupCall}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
                      >
                        <PhoneOff className="h-4 w-4" />
                        Colgar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Dialpad (when not in call) */}
            {!inCall && !ringing && connected && (
              <div className="p-3">
                <div className="flex gap-1 mb-2">
                  <input
                    type="text"
                    placeholder="Numero..."
                    value={dialNumber}
                    onChange={(e) => setDialNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") makeCall();
                    }}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={makeCall}
                    disabled={!dialNumber}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-white hover:bg-green-700 disabled:opacity-40 transition"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(
                    (d) => (
                      <button
                        key={d}
                        onClick={() => dialpadPress(d)}
                        className="rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                      >
                        {d}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Connect/Disconnect button */}
            <div className="px-3 pb-3">
              {connected ? (
                <button
                  onClick={disconnectSIP}
                  className="w-full rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition"
                >
                  Desconectar
                </button>
              ) : reconnecting ? (
                <button
                  onClick={() => {
                    cancelReconnect();
                    connectSIP();
                  }}
                  className="w-full rounded-lg bg-yellow-500 px-3 py-2 text-sm font-medium text-white hover:bg-yellow-600 transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Reconectando... (clic para forzar)
                </button>
              ) : (
                <button
                  onClick={connectSIP}
                  disabled={connecting}
                  className="w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {connecting ? "Conectando..." : "Conectar SIP"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floating button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`relative rounded-full p-3.5 shadow-lg transition-all ${
            ringing
              ? "bg-green-500 animate-bounce"
              : inCall
                ? "bg-blue-600"
                : connected
                  ? "bg-green-600"
                  : "bg-gray-700"
          } text-white hover:scale-105`}
        >
          {ringing ? (
            <PhoneIncoming className="h-6 w-6" />
          ) : (
            <Phone className="h-6 w-6" />
          )}
          <span
            className={`absolute top-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white ${statusColor}`}
          />
          {!expanded && (
            <ChevronUp className="absolute -top-1 left-1/2 -translate-x-1/2 h-3 w-3 text-white/70" />
          )}
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Configuracion SIP
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Servidor WebSocket
                </label>
                <input
                  type="text"
                  value={config.wsServer}
                  onChange={(e) =>
                    setConfig({ ...config, wsServer: e.target.value })
                  }
                  placeholder="wss://accessbotpbx.info:8089/ws"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Extension
                </label>
                <input
                  type="text"
                  value={config.extension}
                  onChange={(e) =>
                    setConfig({ ...config, extension: e.target.value })
                  }
                  placeholder="103"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Contrasena
                </label>
                <input
                  type="password"
                  value={config.sipPassword}
                  onChange={(e) =>
                    setConfig({ ...config, sipPassword: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Dominio SIP
                </label>
                <input
                  type="text"
                  value={config.sipDomain}
                  onChange={(e) =>
                    setConfig({ ...config, sipDomain: e.target.value })
                  }
                  placeholder="accessbotpbx.info"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Separador - Configuracion de Video */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Video / Camaras</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  URL Proxy Camaras
                </label>
                <input
                  type="text"
                  value={config.cameraProxyUrl}
                  onChange={(e) =>
                    setConfig({ ...config, cameraProxyUrl: e.target.value })
                  }
                  placeholder="camera_proxy.php"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Refresh (ms)
                </label>
                <input
                  type="number"
                  value={config.cameraRefreshMs}
                  onChange={(e) =>
                    setConfig({ ...config, cameraRefreshMs: parseInt(e.target.value) || 500 })
                  }
                  placeholder="500"
                  min={100}
                  max={10000}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="videoAutoOnCall"
                  checked={config.videoAutoOnCall}
                  onChange={(e) =>
                    setConfig({ ...config, videoAutoOnCall: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="videoAutoOnCall" className="text-sm text-gray-700">
                  Video automatico en llamadas
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveSettings}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
              >
                Guardar y Conectar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
