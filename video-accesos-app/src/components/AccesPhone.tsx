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
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccesPhoneConfig {
  sipUri: string;
  sipPassword: string;
  wsServer: string;
  displayName: string;
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
  sipUri: "1001@accessbotpbx.info",
  sipPassword: "",
  wsServer: "wss://accessbotpbx.info:8089/ws",
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

  // Refs
  const uaRef = useRef<UA | null>(null);
  const sessionRef = useRef<RTCSession | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stable refs for callbacks (avoid stale closures in SIP event handlers)
  const onIncomingCallRef = useRef(onIncomingCall);
  const onCallAnsweredRef = useRef(onCallAnswered);
  const onCallEndedRef = useRef(onCallEnded);
  useEffect(() => {
    onIncomingCallRef.current = onIncomingCall;
    onCallAnsweredRef.current = onCallAnswered;
    onCallEndedRef.current = onCallEnded;
  }, [onIncomingCall, onCallAnswered, onCallEnded]);

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
  // Attach remote audio from RTCSession
  // -----------------------------------------------------------
  const attachRemoteAudio = useCallback((session: RTCSession) => {
    const pc = session.connection;
    if (pc && remoteAudioRef.current) {
      const receivers = pc.getReceivers();
      if (receivers.length > 0) {
        const stream = new MediaStream();
        receivers.forEach((receiver) => {
          stream.addTrack(receiver.track);
        });
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(() => {});
      }
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
        attachRemoteAudio(session);
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
          pc.ontrack = (event: RTCTrackEvent) => {
            if (!remoteAudioRef.current) return;
            if (event.streams?.[0]) {
              remoteAudioRef.current.srcObject = event.streams[0];
            } else {
              // Fallback: some browsers don't populate streams
              const stream = new MediaStream([event.track]);
              remoteAudioRef.current.srcObject = stream;
            }
            remoteAudioRef.current.play().catch(() => {});
          };
        }
      });
    },
    [attachRemoteAudio, cleanupCall]
  );

  // -----------------------------------------------------------
  // Connect / Disconnect SIP
  // -----------------------------------------------------------
  const connectSIP = useCallback(async () => {
    if (uaRef.current) return;
    if (!config.sipUri || !config.sipPassword || !config.wsServer) {
      setStatusText("Configure SIP primero");
      setShowSettings(true);
      return;
    }

    setConnecting(true);
    setStatusText("Conectando...");

    try {
      // Dynamic import to avoid SSR issues
      const JsSIP = await import("jssip");

      const socket = new JsSIP.WebSocketInterface(config.wsServer);
      const uriParts = config.sipUri.split("@");
      const sipDomain = uriParts[1] || "accessbotpbx.info";

      const ua = new JsSIP.UA({
        sockets: [socket],
        uri: `sip:${config.sipUri}`,
        password: config.sipPassword,
        display_name: config.displayName,
        realm: sipDomain,
        register: true,
        register_expires: 300,
        session_timers: false,
      });

      ua.on("connected", () => {
        setStatusText("Conectado");
      });

      ua.on("disconnected", () => {
        setConnected(false);
        setConnecting(false);
        setStatusText("Desconectado");
      });

      ua.on("registered", () => {
        setConnected(true);
        setConnecting(false);
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
      });

      ua.on("newRTCSession", (data: IncomingRTCSessionEvent | OutgoingRTCSessionEvent) => {
        const session = data.session;

        if (data.originator === "remote") {
          // Incoming call
          const callerNumber = session.remote_identity?.uri?.user || "Desconocido";

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
        }
      });

      ua.start();
      uaRef.current = ua;
    } catch (err) {
      console.error("Error al conectar SIP:", err);
      setConnecting(false);
      setStatusText("Error al conectar");
    }
  }, [config, setupSessionEvents]);

  const disconnectSIP = useCallback(() => {
    if (uaRef.current) {
      uaRef.current.unregister();
      uaRef.current.stop();
      uaRef.current = null;
    }
    setConnected(false);
    setConnecting(false);
    setStatusText("Desconectado");
    cleanupCall();
  }, [cleanupCall]);

  // -----------------------------------------------------------
  // Call actions
  // -----------------------------------------------------------
  const answerCall = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.answer({
        mediaConstraints: { audio: true, video: false },
        pcConfig: {
          iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
        },
      });
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

    const session = uaRef.current.call(dialNumber, {
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
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
    saveConfigToStorage(config);
    setShowSettings(false);
    if (uaRef.current) {
      disconnectSIP();
      setTimeout(() => connectSIP(), 500);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (uaRef.current) {
        uaRef.current.unregister();
        uaRef.current.stop();
        uaRef.current = null;
      }
    };
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
    : connecting
      ? "bg-yellow-500 animate-pulse"
      : "bg-red-500";

  return (
    <>
      {/* Hidden audio elements */}
      <audio ref={remoteAudioRef} autoPlay />
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
            <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
              {statusText}
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
                  URI SIP (usuario@dominio)
                </label>
                <input
                  type="text"
                  value={config.sipUri}
                  onChange={(e) =>
                    setConfig({ ...config, sipUri: e.target.value })
                  }
                  placeholder="1001@accessbotpbx.info"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Contrasena SIP
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
                  Nombre para mostrar
                </label>
                <input
                  type="text"
                  value={config.displayName}
                  onChange={(e) =>
                    setConfig({ ...config, displayName: e.target.value })
                  }
                  placeholder="Monitoreo"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
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
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
