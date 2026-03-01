"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { UA, IncomingRTCSessionEvent, OutgoingRTCSessionEvent } from "jssip/lib/UA";
import type { RTCSession } from "jssip/lib/RTCSession";
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Settings,
  X,
  RefreshCw,
  Unplug,
  Wifi,
  DoorOpen,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Auto-reconnect constants
// ---------------------------------------------------------------------------
const RECONNECT_BASE_DELAY = 2000;
const RECONNECT_MAX_DELAY = 30000;
const RECONNECT_MAX_ATTEMPTS = 0; // 0 = unlimited

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccesPhoneConfig {
  wsServer: string;
  extension: string;
  sipPassword: string;
  sipDomain: string;
  displayName: string;
}

interface CallInfo {
  number: string;
  direction: "incoming" | "outgoing";
  startTime: Date;
}

interface AccesPhoneProps {
  onIncomingCall?: (callerNumber: string, displayName?: string) => void;
  onCallAnswered?: (callerNumber: string) => void;
  onCallEnded?: () => void;
  /** DTMF digit to send when "Abrir" button is pressed during a call */
  openDtmf?: string;
}

// Default SIP config - stored in localStorage
const DEFAULT_CONFIG: AccesPhoneConfig = {
  wsServer: "wss://accessbotpbx.info:8089/ws",
  extension: "",
  sipPassword: "",
  sipDomain: "accessbotpbx.info",
  displayName: "Monitoreo",
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
// Component - Softphone flotante esquina inferior izquierda
// ---------------------------------------------------------------------------

export default function AccesPhone({
  onIncomingCall,
  onCallAnswered,
  onCallEnded,
  openDtmf = "1",
}: AccesPhoneProps) {
  // State
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [ringing, setRinging] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<AccesPhoneConfig>(DEFAULT_CONFIG);
  const [statusText, setStatusText] = useState("Desconectado");
  const [dtmfSent, setDtmfSent] = useState(false);

  // Audio controls
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  // Dial input
  const [dialNumber, setDialNumber] = useState("");

  // Auto-reconnect state
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);

  // Refs
  const uaRef = useRef<UA | null>(null);
  const sessionRef = useRef<RTCSession | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDisconnectRef = useRef(false);
  const mountedRef = useRef(true);

  // Stable refs for callbacks
  const onIncomingCallRef = useRef(onIncomingCall);
  const onCallAnsweredRef = useRef(onCallAnswered);
  const onCallEndedRef = useRef(onCallEnded);
  useEffect(() => {
    onIncomingCallRef.current = onIncomingCall;
    onCallAnsweredRef.current = onCallAnswered;
    onCallEndedRef.current = onCallEnded;
  }, [onIncomingCall, onCallAnswered, onCallEnded]);

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
    setDtmfSent(false);
    setMuted(false);
    sessionRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
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
        setRinging(false);
        setInCall(true);
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
        }
        onCallAnsweredRef.current?.(callerNumber);
      });

      session.on("confirmed", () => {
        // audio attached via peerconnection track event
      });

      session.on("ended", () => {
        cleanupCall();
        onCallEndedRef.current?.();
      });

      session.on("failed", () => {
        cleanupCall();
        onCallEndedRef.current?.();
      });

      session.on("peerconnection", (e) => {
        const pc = e.peerconnection;
        if (pc) {
          pc.addEventListener("track", (ev: RTCTrackEvent) => {
            if (remoteAudioRef.current && ev.streams?.[0]) {
              remoteAudioRef.current.srcObject = ev.streams[0];
              remoteAudioRef.current.volume = 1.0;
              remoteAudioRef.current.play().catch(() => {});
            }
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pc.addEventListener("addstream", (ev: any) => {
            if (ev.stream && ev.stream.getAudioTracks().length > 0) {
              if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = ev.stream;
                remoteAudioRef.current.play().catch(() => {});
              }
            }
          });
        }
      });
    },
    [cleanupCall]
  );

  const connectSIPInternalRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // -----------------------------------------------------------
  // Schedule auto-reconnect
  // -----------------------------------------------------------
  const scheduleReconnect = useCallback((attempt: number) => {
    if (manualDisconnectRef.current) return;
    if (!mountedRef.current) return;
    if (RECONNECT_MAX_ATTEMPTS > 0 && attempt >= RECONNECT_MAX_ATTEMPTS) {
      setStatusText("Reconexion fallida");
      setReconnecting(false);
      return;
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, attempt),
      RECONNECT_MAX_DELAY
    );

    setReconnecting(true);
    setReconnectAttempt(attempt + 1);
    reconnectAttemptRef.current = attempt + 1;
    setStatusText(`Reconectando en ${Math.round(delay / 1000)}s...`);

    reconnectTimerRef.current = setTimeout(() => {
      if (!mountedRef.current || manualDisconnectRef.current) return;
      if (uaRef.current) {
        try { uaRef.current.stop(); } catch { /* ignore */ }
        uaRef.current = null;
      }
      setReconnecting(false);
      connectSIPInternalRef.current?.();
    }, delay);
  }, []);

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
    if (uaRef.current) return;

    let cfg = configRef.current;
    if (!cfg.extension || !cfg.sipPassword) {
      cfg = loadConfig();
      configRef.current = cfg;
    }

    if (!cfg.extension || !cfg.sipPassword || !cfg.wsServer || !cfg.sipDomain) {
      setStatusText("Configure SIP primero");
      setShowSettings(true);
      return;
    }

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
        user_agent: "AccesPhone Mini v1.0",
      });

      ua.on("connected", () => {
        setStatusText("Conectado");
      });

      ua.on("disconnected", () => {
        setConnected(false);
        setConnecting(false);
        uaRef.current = null;

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
        setReconnecting(false);
        setReconnectAttempt(0);
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
        setStatusText(`Error: ${e.cause || "registro fallido"}`);
        if (!manualDisconnectRef.current) {
          scheduleReconnect(reconnectAttemptRef.current);
        }
      });

      ua.on("newRTCSession", (data: IncomingRTCSessionEvent | OutgoingRTCSessionEvent) => {
        const session = data.session;

        if (data.originator === "remote") {
          const callerNumber = session.remote_identity?.uri?.user || "Desconocido";

          sessionRef.current = session;
          setRinging(true);
          setDtmfSent(false);
          setCallInfo({
            number: callerNumber,
            direction: "incoming",
            startTime: new Date(),
          });

          onIncomingCallRef.current?.(callerNumber);

          if (ringtoneRef.current) {
            ringtoneRef.current.loop = true;
            ringtoneRef.current.play().catch(() => {});
          }

          setupSessionEvents(session, callerNumber);
        }
      });

      ua.start();
      uaRef.current = ua;
      setStatusText("Conectando WebSocket...");
    } catch (err) {
      setConnecting(false);
      setStatusText(`Error: ${err instanceof Error ? err.message : String(err)}`);
      if (!manualDisconnectRef.current) {
        scheduleReconnect(reconnectAttemptRef.current);
      }
    }
  }, [setupSessionEvents, scheduleReconnect]);

  useEffect(() => {
    connectSIPInternalRef.current = connectSIPInternal;
  }, [connectSIPInternal]);

  const connectSIP = useCallback(() => {
    manualDisconnectRef.current = false;
    cancelReconnect();
    connectSIPInternalRef.current?.();
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
  const acquireMicOrFallback = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      return stream;
    } catch {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      oscillator.connect(dst);
      oscillator.start();
      const silentStream = dst.stream;
      silentStream.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
      return silentStream;
    }
  }, []);

  const answerCall = useCallback(async () => {
    if (!sessionRef.current) return;
    try {
      const stream = await acquireMicOrFallback();
      localStreamRef.current = stream;
      sessionRef.current.answer({
        mediaConstraints: { audio: true, video: false },
        mediaStream: stream,
      });
    } catch (err) {
      console.error("[AccesPhone] Error answering call:", err);
    }
  }, [acquireMicOrFallback]);

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

  /** Send DTMF to open gate/door */
  const sendOpenDtmf = useCallback(() => {
    if (!sessionRef.current || !inCall) return;
    sessionRef.current.sendDTMF(openDtmf);
    setDtmfSent(true);
    setTimeout(() => setDtmfSent(false), 2000);
  }, [inCall, openDtmf]);

  /** Toggle microphone mute */
  const toggleMute = useCallback(() => {
    if (!sessionRef.current) return;
    if (muted) {
      sessionRef.current.unmute();
    } else {
      sessionRef.current.mute();
    }
    setMuted(!muted);
  }, [muted]);

  /** Toggle speaker */
  const toggleSpeaker = useCallback(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = speakerOn;
    }
    setSpeakerOn(!speakerOn);
  }, [speakerOn]);

  /** Make outgoing call */
  const makeCall = useCallback(async () => {
    if (!dialNumber || !connected || !uaRef.current) return;

    try {
      const stream = await acquireMicOrFallback();
      localStreamRef.current = stream;

      const cfg = configRef.current;
      const session = uaRef.current.call(`sip:${dialNumber}@${cfg.sipDomain}`, {
        mediaConstraints: { audio: true, video: false },
        mediaStream: stream,
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
    } catch (err) {
      console.error("[AccesPhone] Error starting call:", err);
      setStatusText("Error al iniciar llamada");
    }
  }, [dialNumber, connected, setupSessionEvents, acquireMicOrFallback]);

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
  // Settings
  // -----------------------------------------------------------
  const saveSettings = () => {
    saveConfigToStorage(config);
    configRef.current = config;
    setShowSettings(false);
    if (uaRef.current) {
      disconnectSIP();
    }
    setTimeout(() => {
      connectSIP();
    }, 500);
  };

  // Auto-connect on mount if credentials are saved
  useEffect(() => {
    mountedRef.current = true;
    const cfg = loadConfig();
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
      if (uaRef.current) {
        uaRef.current.unregister();
        uaRef.current.stop();
        uaRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {/* Hidden audio elements */}
      <audio ref={remoteAudioRef} autoPlay />
      <audio ref={ringtoneRef} src="/sounds/ringtone.wav" preload="auto" />

      {/* ============================================================= */}
      {/* FLOATING SOFTPHONE - esquina inferior izquierda (despues del sidebar) */}
      {/* ============================================================= */}
      <div className="fixed bottom-4 left-[17rem] z-[55]">
        <div className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-72 overflow-hidden">
          {/* Header: status + settings */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-bold text-white">AccesPhone</span>
              <span className={`h-2 w-2 rounded-full ${statusColor}`} />
              <span className="text-[10px] text-gray-400 truncate max-w-[100px]">
                {statusText}
              </span>
              {reconnectAttempt > 0 && !connected && (
                <span className="text-[10px] text-yellow-500">
                  ({reconnectAttempt})
                </span>
              )}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition"
              title="Configuracion SIP"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Call state: ringing */}
          {ringing && callInfo && (
            <div className="bg-green-900/50 border-t border-green-700/50 px-3 py-2">
              <div className="flex items-center gap-2 mb-2">
                <PhoneIncoming className="h-4 w-4 text-green-400 animate-bounce" />
                <span className="text-sm font-bold text-green-300 font-mono">
                  {callInfo.number}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={answerCall}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-green-500 transition"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Contestar
                </button>
                <button
                  onClick={rejectCall}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition"
                >
                  <PhoneOff className="h-3.5 w-3.5" />
                  Rechazar
                </button>
              </div>
            </div>
          )}

          {/* Call state: in call */}
          {inCall && callInfo && !ringing && (
            <div className="bg-blue-900/40 border-t border-blue-700/50 px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {callInfo.direction === "incoming" ? (
                    <PhoneIncoming className="h-3.5 w-3.5 text-blue-400" />
                  ) : (
                    <PhoneOutgoing className="h-3.5 w-3.5 text-blue-400" />
                  )}
                  <span className="text-sm font-bold text-blue-300 font-mono">
                    {callInfo.number}
                  </span>
                </div>
                <span className="text-sm font-mono font-bold text-blue-200">
                  {formatDuration(callDuration)}
                </span>
              </div>

              {/* Audio controls + Abrir + Colgar */}
              <div className="flex gap-1.5">
                <button
                  onClick={toggleMute}
                  className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                    muted
                      ? "bg-red-700 text-red-200"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                  title={muted ? "Activar microfono" : "Silenciar microfono"}
                >
                  {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={toggleSpeaker}
                  className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                    !speakerOn
                      ? "bg-red-700 text-red-200"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                  title={speakerOn ? "Silenciar altavoz" : "Activar altavoz"}
                >
                  {speakerOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={sendOpenDtmf}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold transition ${
                    dtmfSent
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                  }`}
                  title={`Enviar DTMF "${openDtmf}" para abrir acceso`}
                >
                  <DoorOpen className="h-3.5 w-3.5" />
                  {dtmfSent ? "Enviado!" : "Abrir"}
                </button>
                <button
                  onClick={hangupCall}
                  className="flex items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition"
                >
                  <PhoneOff className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Dialpad: visible when connected and not in call */}
          {connected && !inCall && !ringing && (
            <div className="border-t border-gray-700/50 px-3 py-2">
              <div className="flex gap-1.5 mb-2">
                <input
                  type="text"
                  placeholder="Numero a marcar..."
                  value={dialNumber}
                  onChange={(e) => setDialNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") makeCall();
                  }}
                  className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm font-mono text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={makeCall}
                  disabled={!dialNumber}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-white hover:bg-green-500 disabled:opacity-40 transition"
                  title="Marcar"
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
                      className="rounded-lg bg-gray-700 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-600 active:bg-gray-500 transition"
                    >
                      {d}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* In-call dialpad for DTMF */}
          {inCall && !ringing && (
            <div className="border-t border-gray-700/50 px-3 py-2">
              <div className="grid grid-cols-3 gap-1">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(
                  (d) => (
                    <button
                      key={d}
                      onClick={() => dialpadPress(d)}
                      className="rounded-lg bg-gray-700 py-1.5 text-sm font-semibold text-gray-200 hover:bg-gray-600 active:bg-gray-500 transition"
                    >
                      {d}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Bottom: Connect / Disconnect */}
          <div className="border-t border-gray-700/50 px-3 py-1.5 flex gap-1.5">
            {connected ? (
              <button
                onClick={disconnectSIP}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-gray-700 px-2 py-1.5 text-[11px] font-medium text-red-400 hover:bg-gray-600 hover:text-red-300 transition"
              >
                <Unplug className="h-3 w-3" />
                Desconectar
              </button>
            ) : reconnecting ? (
              <button
                onClick={() => {
                  cancelReconnect();
                  connectSIP();
                }}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-yellow-600 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-yellow-500 transition"
              >
                <RefreshCw className="h-3 w-3 animate-spin" />
                Reconectando...
              </button>
            ) : (
              <button
                onClick={connectSIP}
                disabled={connecting}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-700 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-green-600 disabled:opacity-50 transition"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Wifi className="h-3 w-3" />
                    Conectar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* Settings Modal                                                */}
      {/* ============================================================= */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h2 className="text-sm font-bold text-gray-900">
                Configuracion SIP
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5 uppercase">
                  Servidor WebSocket
                </label>
                <input
                  type="text"
                  value={config.wsServer}
                  onChange={(e) => setConfig({ ...config, wsServer: e.target.value })}
                  placeholder="wss://accessbotpbx.info:8089/ws"
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5 uppercase">
                    Extension
                  </label>
                  <input
                    type="text"
                    value={config.extension}
                    onChange={(e) => setConfig({ ...config, extension: e.target.value })}
                    placeholder="103"
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5 uppercase">
                    Contrasena
                  </label>
                  <input
                    type="password"
                    value={config.sipPassword}
                    onChange={(e) => setConfig({ ...config, sipPassword: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5 uppercase">
                  Dominio SIP
                </label>
                <input
                  type="text"
                  value={config.sipDomain}
                  onChange={(e) => setConfig({ ...config, sipDomain: e.target.value })}
                  placeholder="accessbotpbx.info"
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveSettings}
                className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-green-700 transition"
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
