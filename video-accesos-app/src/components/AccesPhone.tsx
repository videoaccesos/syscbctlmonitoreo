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
  Bell,
  BellOff,
  Zap,
  LogOut,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Auto-reconnect constants
// ---------------------------------------------------------------------------
const RECONNECT_BASE_DELAY = 2000; // 2 seconds
const RECONNECT_MAX_DELAY = 30000; // 30 seconds max
const RECONNECT_MAX_ATTEMPTS = 0;  // 0 = unlimited

// ---------------------------------------------------------------------------
// Diagnostics logger - agrega timestamps y se puede ver en consola
// ---------------------------------------------------------------------------
interface DiagEntry {
  ts: string;
  elapsed: number;
  event: string;
  detail?: string;
}
const _diagLog: DiagEntry[] = [];
const _diagStart = Date.now();

function diag(event: string, detail?: string) {
  const entry: DiagEntry = {
    ts: new Date().toISOString(),
    elapsed: Date.now() - _diagStart,
    event,
    detail,
  };
  _diagLog.push(entry);
  // Mantener maximo 200 entradas
  if (_diagLog.length > 200) _diagLog.shift();
  console.log(`[DIAG-SIP] +${entry.elapsed}ms | ${event}${detail ? ` | ${detail}` : ""}`);
}

// Exponer para acceso desde consola del browser: window.__sipDiag()
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__sipDiag = () => {
    console.table(_diagLog);
    return _diagLog;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__sipDiagSummary = () => {
    const summary = {
      totalEntries: _diagLog.length,
      firstEvent: _diagLog[0]?.ts || "none",
      lastEvent: _diagLog[_diagLog.length - 1]?.ts || "none",
      totalElapsed: _diagLog.length > 0 ? `${_diagLog[_diagLog.length - 1].elapsed}ms` : "0ms",
      events: _diagLog.map(e => `+${e.elapsed}ms ${e.event}`).join("\n"),
    };
    console.log(summary.events);
    return summary;
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccesPhoneConfig {
  wsServer: string;
  extension: string;
  sipPassword: string;
  sipDomain: string;
  displayName: string;
  micDeviceId: string; // "" = default del navegador
  autoAnswer: boolean; // auto-answer incoming calls without ringing
  ringVolume: number; // 0-100 ringtone volume
  ringTone: string; // ringtone file name
  cameraProxyUrl: string;
  cameraRefreshMs: number;
  videoAutoOnCall: boolean;
}

interface CallInfo {
  number: string;
  callerLabel?: string;
  privadaId?: number;
  direction: "incoming" | "outgoing";
  startTime: Date;
}

interface AccesPhoneProps {
  onIncomingCall?: (callerNumber: string, displayName?: string) => void;
  onCallAnswered?: (callerNumber: string) => void;
  onCallEnded?: () => void;
  privadaId?: number; // privada seleccionada en la pagina padre
}

// Default SIP config - stored in localStorage
const DEFAULT_CONFIG: AccesPhoneConfig = {
  wsServer: "wss://accessbotpbx.info:8089/ws",
  extension: "",
  sipPassword: "",
  sipDomain: "accessbotpbx.info",
  displayName: "Monitoreo",
  micDeviceId: "",
  autoAnswer: false,
  ringVolume: 70,
  ringTone: "ringtone-classic.wav",
  cameraProxyUrl: "camera_proxy.php",
  cameraRefreshMs: 500,
  videoAutoOnCall: true,
};

const RINGTONE_OPTIONS = [
  { value: "ringtone-classic.wav", label: "Clasico" },
  { value: "ringtone-phone.wav", label: "Telefono" },
  { value: "ringtone-digital.wav", label: "Digital" },
  { value: "ringtone-euro.wav", label: "Euro" },
  { value: "ringtone.wav", label: "Simple" },
];

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
  privadaId: pagePrivadaId,
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
  const [dndActive, setDndActive] = useState(false);
  const [autoAnswerActive, setAutoAnswerActive] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").autoAnswer || false; } catch { return false; }
  });
  const dndRef = useRef(false);
  const autoAnswerRef = useRef(false);

  // Keep refs in sync to avoid stale closures in SIP event handlers
  useEffect(() => { dndRef.current = dndActive; }, [dndActive]);
  useEffect(() => { autoAnswerRef.current = autoAnswerActive; }, [autoAnswerActive]);
  useEffect(() => { ringingRef.current = ringing; }, [ringing]);

  // Auto-reconnect state
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);

  // Available microphones for settings selector
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);

  // Relay buttons state: "idle" | "loading" | "success" | "error"
  const [relayStatus, setRelayStatus] = useState<Record<string, string>>({});

  // Active privadaId: from call CallerID or page-level selection
  const activePrivadaId = callInfo?.privadaId || pagePrivadaId || 0;

  const executeRelay = useCallback(async (triggerValue: string) => {
    const pId = activePrivadaId;
    if (!pId) return;
    setRelayStatus(prev => ({ ...prev, [triggerValue]: "loading" }));
    try {
      const res = await fetch("/api/relay/ejecutar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger_value: triggerValue,
          residencial_id: pId,
          source: "softphone",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRelayStatus(prev => ({ ...prev, [triggerValue]: "success" }));
        diag("RELAY_OK", `${triggerValue} privada=${pId}`);
      } else {
        setRelayStatus(prev => ({ ...prev, [triggerValue]: "error" }));
        diag("RELAY_FAIL", `${triggerValue} privada=${pId} err=${data.error}`);
      }
    } catch (err) {
      setRelayStatus(prev => ({ ...prev, [triggerValue]: "error" }));
      diag("RELAY_ERROR", `${triggerValue} ${err instanceof Error ? err.message : String(err)}`);
    }
    // Reset after 2s
    setTimeout(() => {
      setRelayStatus(prev => ({ ...prev, [triggerValue]: "idle" }));
    }, 2000);
  }, [activePrivadaId]);

  // Refs
  const uaRef = useRef<UA | null>(null);
  const sessionRef = useRef<RTCSession | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDisconnectRef = useRef(false);
  const mountedRef = useRef(true);
  const answeringRef = useRef(false);
  const answerCallRef = useRef<() => void>(() => {});
  const ringtoneAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringingRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  const reconnectInProgressRef = useRef(false);
  const connectingInProgressRef = useRef(false);

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

  // -----------------------------------------------------------
  // Unlock audio playback on first user interaction.
  // Chrome/Safari block audio.play() until the user has interacted
  // with the page (click, touch, keydown). We play a silent snippet
  // on the first gesture so subsequent ringtone plays are allowed.
  // -----------------------------------------------------------
  useEffect(() => {
    const unlock = () => {
      if (audioUnlockedRef.current) return;
      audioUnlockedRef.current = true;
      // Play & immediately pause a silent audio to unlock the policy
      const silent = new Audio("/sounds/ringtone-classic.wav");
      silent.volume = 0;
      silent.play().then(() => {
        silent.pause();
        silent.currentTime = 0;
        console.log("[AccesPhone] Audio playback unlocked by user gesture");
      }).catch(() => {});
      window.removeEventListener("click", unlock, true);
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    window.addEventListener("click", unlock, true);
    window.addEventListener("touchstart", unlock, true);
    window.addEventListener("keydown", unlock, true);
    return () => {
      window.removeEventListener("click", unlock, true);
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, []);

  // -----------------------------------------------------------
  // Ringtone using <audio> element with real WAV files
  // -----------------------------------------------------------
  const startRingtone = useCallback(() => {
    const volume = configRef.current.ringVolume;
    if (volume <= 0) return; // muted

    try {
      const tone = configRef.current.ringTone || "ringtone-classic.wav";
      const audio = new Audio(`/sounds/${tone}`);
      audio.loop = true;
      audio.volume = volume / 100;
      ringtoneAudioRef.current = audio;
      audio.play().catch((e) => {
        console.warn("[AccesPhone] Ringtone play blocked by browser:", e);
      });
    } catch (e) {
      console.error("[AccesPhone] Error starting ringtone:", e);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneAudioRef.current) {
      ringtoneAudioRef.current.pause();
      ringtoneAudioRef.current.currentTime = 0;
      ringtoneAudioRef.current = null;
    }
  }, []);

  // Start/stop ringtone when ringing state changes
  useEffect(() => {
    if (ringing) {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [ringing, startRingtone, stopRingtone]);

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
    answeringRef.current = false;
    // Stop local media stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
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
        diag("SESSION_ACCEPTED", callerNumber);
        console.log("[AccesPhone] Session accepted");
        setRinging(false);
        setInCall(true);
        // Restore remote audio volume after ringing (was muted to suppress Asterisk early media)
        if (remoteAudioRef.current) {
          remoteAudioRef.current.volume = 1.0;
          console.log("[AccesPhone] Remote audio volume restored after answer");
        }
        onCallAnsweredRef.current?.(callerNumber);
      });

      session.on("confirmed", () => {
        diag("SESSION_CONFIRMED", callerNumber);
        console.log("[AccesPhone] Session confirmed - audio should already be attached via peerconnection track event");
      });

      session.on("ended", (e) => {
        diag("SESSION_ENDED", `cause=${e?.cause || "unknown"} number=${callerNumber}`);
        console.log("[AccesPhone] Session ended:", e?.cause || "unknown cause");
        cleanupCall();
        onCallEndedRef.current?.();
      });

      session.on("failed", (e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const evt = e as any;
        const failDetail = `cause=${evt?.cause} status=${evt?.message?.status_code} reason=${evt?.message?.reason_phrase} originator=${evt?.originator}`;
        diag("SESSION_FAILED", failDetail);
        console.error("[AccesPhone] Session failed:", evt?.cause || "unknown cause");
        console.error("[AccesPhone] Session failed details:", {
          cause: evt?.cause,
          status_code: evt?.message?.status_code,
          reason_phrase: evt?.message?.reason_phrase,
          originator: evt?.originator,
        });
        if (evt?.cause === "Internal Error" || evt?.cause === "internal error") {
          diag("SESSION_INTERNAL_ERROR", "Posible problema SDP/WebRTC/media");
          console.error("[AccesPhone] INTERNAL ERROR - posible problema con SDP/WebRTC/media");
        }
        cleanupCall();
        onCallEndedRef.current?.();
      });

      // Intercept SDP to fix compatibility issues with Asterisk/FreePBX
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      session.on("sdp", (e: any) => {
        console.log("[AccesPhone] SDP event:", e?.type, "\n", e?.sdp?.substring(0, 500));

        // Fix 1: Inject missing ICE credentials in remote offers (Asterisk omits them)
        if (e?.type === "offer" && e?.sdp && !e.sdp.includes("a=ice-ufrag:")) {
          console.warn("[AccesPhone] SDP missing ice-ufrag/ice-pwd, injecting dummy ICE credentials");
          const iceAttrs = "a=ice-ufrag:astk\r\na=ice-pwd:asteriskasteriskasterisk\r\n";
          const mLineIndex = e.sdp.indexOf("\r\nm=");
          if (mLineIndex !== -1) {
            e.sdp = e.sdp.slice(0, mLineIndex) + "\r\n" + iceAttrs.trimEnd() + e.sdp.slice(mLineIndex);
          } else {
            e.sdp = e.sdp + iceAttrs;
          }
          console.log("[AccesPhone] SDP patched with ICE credentials");
        }

        // Fix 2: Strip codecs Asterisk doesn't support from LOCAL outgoing offers only
        // Chrome includes opus/red/CN and SAVPF which causes Asterisk to reject with 488
        // IMPORTANT: Only apply to outgoing calls (session.direction === "outgoing")
        // For incoming calls, the offer SDP comes from Asterisk and must NOT be modified
        if (e?.type === "offer" && e?.sdp && session.direction === "outgoing" && e.sdp.includes("opus")) {
          console.log("[AccesPhone] Stripping non-Asterisk codecs from outgoing SDP");
          let sdp = e.sdp as string;
          // Change SAVPF to SAVP (Asterisk expects SAVP)
          sdp = sdp.replace(/UDP\/TLS\/RTP\/SAVPF/g, "UDP/TLS/RTP/SAVP");
          // Detect the actual payload type Chrome assigned to telephone-event/8000
          const dtmfMatch = sdp.match(/a=rtpmap:(\d+) telephone-event\/8000/);
          const dtmfPT = dtmfMatch ? dtmfMatch[1] : "101";
          // Parse m=audio line to keep only PCMU(0), G722(9), PCMA(8), telephone-event
          sdp = sdp.replace(
            /m=audio (\d+) UDP\/TLS\/RTP\/SAVP [^\r\n]+/,
            `m=audio $1 UDP/TLS/RTP/SAVP 0 9 8 ${dtmfPT}`
          );
          // Remove rtpmap/fmtp/rtcp-fb lines for codecs we stripped
          const lines = sdp.split("\r\n");
          const filtered = lines.filter((line) => {
            // Remove opus, red, CN codec lines
            if (/^a=rtpmap:\d+ (opus|red|CN)\//.test(line)) return false;
            if (/^a=fmtp:\d+ (minptime|111)/.test(line)) return false;
            if (/^a=rtcp-fb:/.test(line)) return false;
            if (/^a=rtpmap:\d+ telephone-event\/48000/.test(line)) return false;
            if (/^a=fmtp:\d+ 0-16/.test(line) && !line.startsWith(`a=fmtp:${dtmfPT}`)) return false;
            // Remove extmap-allow-mixed (not supported by all Asterisk versions)
            if (line === "a=extmap-allow-mixed") return false;
            // Remove rtcp-rsize (not supported by Asterisk SRTP)
            if (line === "a=rtcp-rsize") return false;
            // Remove extmap lines (Asterisk may not support these header extensions)
            if (/^a=extmap:/.test(line)) return false;
            return true;
          });
          // Ensure telephone-event/8000 rtpmap is present
          if (!filtered.some((l) => l.includes("telephone-event/8000"))) {
            const midIdx = filtered.findIndex((l) => l.startsWith("a=mid:"));
            if (midIdx !== -1) {
              filtered.splice(midIdx, 0, `a=rtpmap:${dtmfPT} telephone-event/8000`, `a=fmtp:${dtmfPT} 0-16`);
            }
          }
          e.sdp = filtered.join("\r\n");
          console.log("[AccesPhone] SDP cleaned for Asterisk compatibility");
        }
      });

      session.on("peerconnection", (e) => {
        console.log("[AccesPhone] PeerConnection created");
        const pc = e.peerconnection;
        if (pc) {
          // Remote audio
          pc.addEventListener("track", (ev: RTCTrackEvent) => {
            diag("REMOTE_TRACK", `kind=${ev.track.kind} readyState=${ev.track.readyState} streams=${ev.streams?.length}`);
            console.log("[AccesPhone] Remote track received:", ev.track.kind);
            if (remoteAudioRef.current && ev.streams?.[0]) {
              remoteAudioRef.current.srcObject = ev.streams[0];
              // Mute remote audio while ringing to prevent Asterisk's early media
              // ringtone from playing on top of our local ringtone
              if (ringingRef.current) {
                remoteAudioRef.current.volume = 0;
                console.log("[AccesPhone] Remote audio muted during ringing (early media suppressed)");
              } else {
                remoteAudioRef.current.volume = speakerOn ? 1.0 : 0;
              }
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
                // Mute during ringing to suppress Asterisk early media
                if (ringingRef.current) {
                  remoteAudioRef.current.volume = 0;
                } else {
                  remoteAudioRef.current.volume = speakerOn ? 1.0 : 0;
                }
                remoteAudioRef.current.play().catch(() => {});
              }
            }
          });

          pc.oniceconnectionstatechange = () => {
            diag("ICE_STATE", pc.iceConnectionState);
            console.log("[AccesPhone] ICE connection state:", pc.iceConnectionState);
          };

          pc.onsignalingstatechange = () => {
            diag("SIGNAL_STATE", pc.signalingState);
            console.log("[AccesPhone] Signaling state:", pc.signalingState);
          };

          pc.onconnectionstatechange = () => {
            diag("CONN_STATE", pc.connectionState);
            console.log("[AccesPhone] Connection state:", pc.connectionState);
          };

          pc.onicecandidateerror = (ev) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ice = ev as any;
            diag("ICE_CANDIDATE_ERROR", `errorCode=${ice.errorCode} url=${ice.url} errorText=${ice.errorText}`);
          };

          pc.onicecandidate = (ev) => {
            if (ev.candidate) {
              diag("ICE_CANDIDATE", `type=${ev.candidate.type} protocol=${ev.candidate.protocol} address=${ev.candidate.address}`);
            } else {
              diag("ICE_GATHERING_DONE");
            }
          };

          pc.onicegatheringstatechange = () => {
            diag("ICE_GATHERING_STATE", pc.iceGatheringState);
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
      // Mark that we are intentionally reconnecting so the disconnected
      // event from ua.stop() does not schedule yet another reconnect
      reconnectInProgressRef.current = true;
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
      reconnectInProgressRef.current = false;
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
    // Prevent overlapping reconnect attempts
    if (reconnectTimerRef.current) {
      console.log('[AccesPhone] Reconnect timer pendiente, saliendo');
      return;
    }
    // Prevent concurrent connection attempts
    if (connectingInProgressRef.current) {
      console.log('[AccesPhone] Conexion ya en progreso, saliendo');
      return;
    }
    connectingInProgressRef.current = true;

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
    diag("CONNECT_START", `ext=${cfg.extension} ws=${cfg.wsServer}`);

    try {
      // Dynamic import to avoid SSR issues
      diag("JSSIP_IMPORT_START");
      const JsSIP = await import("jssip");
      diag("JSSIP_IMPORT_OK");

      // Enable JsSIP internal debug logging
      JsSIP.debug.enable('JsSIP:*');

      diag("WS_CREATE", cfg.wsServer);
      const socket = new JsSIP.WebSocketInterface(cfg.wsServer);
      const sipUri = `sip:${cfg.extension}@${cfg.sipDomain}`;
      diag("SIP_URI", sipUri);

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
        diag("WS_CONNECTED", "WebSocket transport abierto");
        console.log("[AccesPhone] WebSocket conectado");
        setStatusText("Conectado");
      });

      ua.on("disconnected", (e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const evt = e as any;
        const isError = !!evt?.error;
        const reason = isError ? `error=${evt.error}` : "clean";
        const code = evt?.code || "";
        const wsReason = evt?.reason || "";
        diag("WS_DISCONNECTED", `manual=${manualDisconnectRef.current} reason=${reason} code=${code} wsReason=${wsReason}`);
        console.log("[AccesPhone] WebSocket desconectado, manual:", manualDisconnectRef.current);
        setConnected(false);
        setConnecting(false);
        connectingInProgressRef.current = false;

        if (manualDisconnectRef.current || reconnectInProgressRef.current) {
          // Manual disconnect or planned reconnect in progress - clean up
          uaRef.current = null;
          if (manualDisconnectRef.current) {
            setStatusText("Desconectado");
          } else {
            console.log("[AccesPhone] Disconnected during planned reconnect, skipping scheduleReconnect");
          }
        } else {
          // Unexpected disconnect - let JsSIP's built-in connection recovery
          // handle the WebSocket reconnection (connection_recovery_min_interval=2s).
          // Do NOT destroy the UA or create a new one; JsSIP will auto-reconnect.
          setStatusText("Reconectando...");
          console.log("[AccesPhone] Letting JsSIP handle WebSocket reconnection automatically");
        }
      });

      ua.on("registered", () => {
        diag("SIP_REGISTERED", `ext=${cfg.extension}`);
        console.log("[AccesPhone] SIP registrado exitosamente");
        connectingInProgressRef.current = false;
        setConnected(true);
        setConnecting(false);
        setReconnecting(false);
        setReconnectAttempt(0);
        reconnectAttemptRef.current = 0;
        setStatusText("Registrado");
      });

      ua.on("unregistered", () => {
        diag("SIP_UNREGISTERED");
        console.log("[AccesPhone] SIP des-registrado");
        setConnected(false);
        setStatusText("No registrado");
      });

      ua.on("registrationFailed", (e) => {
        diag("SIP_REG_FAILED", `cause=${e.cause}`);
        console.error("[AccesPhone] Registro SIP fallido:", e.cause);
        connectingInProgressRef.current = false;
        setConnected(false);
        setConnecting(false);
        setStatusText(`Error: ${e.cause || "registro fallido"}`);

        // If registration fails but WS is connected, schedule retry
        if (!manualDisconnectRef.current && !reconnectInProgressRef.current) {
          scheduleReconnect(reconnectAttemptRef.current);
        }
      });

      ua.on("newRTCSession", (data: IncomingRTCSessionEvent | OutgoingRTCSessionEvent) => {
        const session = data.session;
        diag("NEW_RTC_SESSION", `originator=${data.originator} direction=${session.direction}`);
        console.log("[AccesPhone] newRTCSession - originator:", data.originator, "direction:", session.direction);

        if (data.originator === "remote") {
          // Incoming call
          const callerNumber = session.remote_identity?.uri?.user || "Desconocido";
          const callerDisplayName = session.remote_identity?.display_name || "";
          console.log("[AccesPhone] Incoming call from:", callerNumber, "displayName:", callerDisplayName, "session status:", session.status);

          // DND: reject immediately
          if (dndRef.current) {
            console.log("[AccesPhone] DND active, rejecting call from:", callerNumber);
            diag("DND_REJECT", `num=${callerNumber}`);
            session.terminate({ status_code: 486, reason_phrase: "Busy Here" });
            return;
          }

          sessionRef.current = session;
          setRinging(true);
          setCallInfo({
            number: callerNumber,
            direction: "incoming",
            startTime: new Date(),
          });
          setExpanded(true);

          // Lookup caller ID (privada/residencia) for visual identification + relay
          fetch(`/api/procesos/registro-accesos/buscar-por-telefono?telefono=${encodeURIComponent(callerNumber)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.found) {
                let label = "";
                let pId: number | undefined;
                if (data.matchLevel === "residencia" && data.data) {
                  const r = data.data;
                  label = `${r.privada?.descripcion || ""}${r.nroCasa ? ` - #${r.nroCasa}` : ""}${r.calle ? ` ${r.calle}` : ""}`;
                  pId = r.privadaId || r.privada?.id;
                } else if (data.privada) {
                  label = data.privada.descripcion || "";
                  pId = data.privada.id;
                }
                if (label || pId) {
                  setCallInfo(prev => prev ? {
                    ...prev,
                    ...(label ? { callerLabel: label.trim() } : {}),
                    ...(pId ? { privadaId: pId } : {}),
                  } : prev);
                  diag("CALLER_ID_FOUND", `num=${callerNumber} label=${label.trim()} privadaId=${pId || "?"}`);
                }
              }
            })
            .catch(() => { /* silently ignore lookup failures */ });

          // Notify parent about incoming call (include display name from SIP)
          onIncomingCallRef.current?.(callerNumber, callerDisplayName || undefined);

          // Setup session events
          setupSessionEvents(session, callerNumber);

          // Listen for getUserMedia failure on this session
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          session.on("getusermediafailed", (e: any) => {
            console.error("[AccesPhone] getUserMedia FAILED:", e);
          });

          // Auto-answer if enabled
          if (autoAnswerRef.current) {
            console.log("[AccesPhone] Auto-answer enabled, answering immediately");
            diag("AUTO_ANSWER", `num=${callerNumber}`);
            // Small delay to let UI update with caller info
            setTimeout(() => answerCallRef.current(), 300);
          }
          // Otherwise Asterisk's ringback tone plays via remote audio
        }
      });

      diag("UA_START");
      ua.start();
      uaRef.current = ua;
      diag("UA_STARTED", "Esperando eventos WS...");
      setStatusText("Conectando WebSocket...");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      diag("CONNECT_ERROR", errMsg);
      console.error("[AccesPhone] Error al conectar SIP:", err);
      connectingInProgressRef.current = false;
      setConnecting(false);
      setStatusText(`Error: ${errMsg}`);

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

  // Helper: try to get microphone, fallback to silent stream if not available
  const acquireMicOrFallback = useCallback(async (): Promise<MediaStream> => {
    // First, enumerate devices for diagnostics
    try {
      const devices = await navigator.mediaDevices?.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      console.log("[AccesPhone] Audio input devices found:", audioInputs.length);
      audioInputs.forEach((d, i) => {
        console.log(`[AccesPhone]   mic[${i}]: "${d.label}" id=${d.deviceId.substring(0, 8)}...`);
      });
      if (audioInputs.length === 0) {
        console.warn("[AccesPhone] NO audio input devices detected!");
      }
    } catch (enumErr) {
      console.warn("[AccesPhone] Could not enumerate devices:", enumErr);
    }

    // Try to get real microphone (use selected device if configured)
    try {
      const selectedMic = configRef.current.micDeviceId;
      const audioConstraints: MediaTrackConstraints | boolean = selectedMic
        ? { deviceId: { exact: selectedMic } }
        : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
      // Log which device was actually picked
      const usedTrack = stream.getAudioTracks()[0];
      console.log("[AccesPhone] Microphone acquired OK:", usedTrack?.label || "unknown", "settings:", JSON.stringify(usedTrack?.getSettings?.()));
      return stream;
    } catch (micErr) {
      console.warn("[AccesPhone] Microphone unavailable:", micErr);
      console.log("[AccesPhone] Creating silent audio stream as fallback (listen-only mode)");

      // Create a proper silent audio stream compatible with SIP/WebRTC
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0; // True silence via gain node
      const dst = ctx.createMediaStreamDestination();
      oscillator.connect(gainNode);
      gainNode.connect(dst);
      oscillator.start();
      console.log("[AccesPhone] Silent fallback stream created - call will be LISTEN-ONLY");
      return dst.stream;
    }
  }, []);

  const answerCall = useCallback(async () => {
    if (!sessionRef.current) {
      console.warn("[AccesPhone] No session to answer");
      return;
    }

    // Prevent multiple simultaneous answer attempts
    if (answeringRef.current) {
      console.log("[AccesPhone] Already answering, ignoring duplicate call");
      return;
    }

    // Only answer if session is waiting (status 4 = STATUS_WAITING_FOR_ANSWER)
    if (sessionRef.current.status !== 4) {
      console.warn("[AccesPhone] Session not in WAITING_FOR_ANSWER state, status:", sessionRef.current.status);
      return;
    }

    answeringRef.current = true;
    try {
      console.log("[AccesPhone] Attempting to answer call...");

      const stream = await acquireMicOrFallback();
      localStreamRef.current = stream;

      // Check session is still valid after async mic acquisition
      if (!sessionRef.current || sessionRef.current.status !== 4) {
        console.warn("[AccesPhone] Session no longer valid after mic acquisition, status:", sessionRef.current?.status);
        stream.getTracks().forEach((t) => t.stop());
        answeringRef.current = false;
        return;
      }

      sessionRef.current.answer({
        mediaConstraints: { audio: true, video: false },
        mediaStream: stream,
        rtcAnswerConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        },
      });
      console.log("[AccesPhone] answer() called successfully with provided stream");
    } catch (err) {
      console.error("[AccesPhone] Error answering call:", err);
      answeringRef.current = false;
    }
  }, [acquireMicOrFallback]);

  // Keep ref in sync for use in SIP event handlers (avoids stale closure)
  useEffect(() => {
    answerCallRef.current = answerCall;
  }, [answerCall]);

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

  const makeCall = useCallback(async () => {
    if (!dialNumber || !connected || !uaRef.current) {
      console.warn("[AccesPhone] makeCall blocked - dialNumber:", dialNumber, "connected:", connected, "ua:", !!uaRef.current);
      return;
    }

    try {
      console.log("[AccesPhone] Preparing outgoing call to:", dialNumber);
      diag("OUTGOING_CALL_START", `target=${dialNumber}`);
      const stream = await acquireMicOrFallback();
      localStreamRef.current = stream;

      const targetUri = `sip:${dialNumber}@${config.sipDomain}`;
      console.log("[AccesPhone] Calling URI:", targetUri);

      const session = uaRef.current.call(targetUri, {
        mediaConstraints: { audio: true, video: false },
        mediaStream: stream,
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        },
      });

      if (!session) {
        console.error("[AccesPhone] ua.call() returned null/undefined");
        setStatusText("Error: no se pudo iniciar llamada");
        return;
      }

      sessionRef.current = session;
      setCallInfo({
        number: dialNumber,
        direction: "outgoing",
        startTime: new Date(),
      });
      setInCall(true);
      setExpanded(true);
      setDialNumber("");

      setupSessionEvents(session, dialNumber);
      console.log("[AccesPhone] Outgoing call initiated successfully");
    } catch (err) {
      console.error("[AccesPhone] Error starting call:", err);
      setStatusText("Error al iniciar llamada");
      cleanupCall();
    }
  }, [dialNumber, connected, setupSessionEvents, acquireMicOrFallback, cleanupCall]);

  // -----------------------------------------------------------
  // Settings
  // -----------------------------------------------------------
  const saveSettings = () => {
    console.log('[AccesPhone] saveSettings - guardando configuración...');
    // Check if SIP-related settings changed (require reconnect)
    const prev = configRef.current;
    const sipChanged =
      prev.wsServer !== config.wsServer ||
      prev.extension !== config.extension ||
      prev.sipPassword !== config.sipPassword ||
      prev.sipDomain !== config.sipDomain ||
      prev.displayName !== config.displayName ||
      prev.micDeviceId !== config.micDeviceId;

    saveConfigToStorage(config);
    configRef.current = config;
    setShowSettings(false);

    // Only reconnect SIP if SIP-related settings changed
    if (sipChanged) {
      console.log('[AccesPhone] SIP settings changed, reconnecting...');
      if (uaRef.current) {
        disconnectSIP();
      }
      setTimeout(() => {
        console.log('[AccesPhone] saveSettings timeout - llamando connectSIP()');
        connectSIP();
      }, 500);
    } else {
      console.log('[AccesPhone] Only non-SIP settings changed (camera), no reconnect needed');
    }
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
  // DTMF tone generator (Web Audio API)
  // -----------------------------------------------------------
  const dtmfCtxRef = useRef<AudioContext | null>(null);

  const DTMF_FREQS: Record<string, [number, number]> = {
    "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
    "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
    "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
    "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
  };

  const getDtmfContext = useCallback(async (): Promise<AudioContext | null> => {
    try {
      if (!dtmfCtxRef.current || dtmfCtxRef.current.state === "closed") {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        dtmfCtxRef.current = new AC();
        console.log("[DTMF] AudioContext creado, state:", dtmfCtxRef.current.state);
      }
      const ctx = dtmfCtxRef.current;
      if (ctx.state === "suspended") {
        console.log("[DTMF] AudioContext suspendido, intentando resume...");
        await ctx.resume();
        console.log("[DTMF] AudioContext resume completado, state:", ctx.state);
      }
      return ctx;
    } catch (err) {
      console.error("[DTMF] Error creando/resumiendo AudioContext:", err);
      return null;
    }
  }, []);

  const playDtmfTone = useCallback(async (digit: string) => {
    const freqs = DTMF_FREQS[digit];
    if (!freqs) return;

    const ctx = await getDtmfContext();
    if (!ctx) {
      console.warn("[DTMF] No se pudo obtener AudioContext para tono", digit);
      return;
    }

    try {
      const gain = ctx.createGain();
      gain.gain.value = 0.25;
      gain.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];
      osc1.connect(gain);
      osc2.connect(gain);

      const now = ctx.currentTime;
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.2);
      osc2.stop(now + 0.2);

      // Fade out to avoid click
      gain.gain.setValueAtTime(0.25, now + 0.15);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);

      console.log("[DTMF] Tono reproducido:", digit, freqs);
    } catch (err) {
      console.error("[DTMF] Error reproduciendo tono:", digit, err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDtmfContext]);

  // -----------------------------------------------------------
  // Dialpad handler
  // -----------------------------------------------------------
  const dialpadPress = (digit: string) => {
    playDtmfTone(digit); // async but fire-and-forget
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
                  onClick={() => {
                    setShowSettings(true);
                    // Enumerate microphones when settings open
                    if (navigator.mediaDevices?.enumerateDevices) {
                      navigator.mediaDevices.enumerateDevices()
                        .then(devices => setAvailableMics(devices.filter(d => d.kind === "audioinput")))
                        .catch(() => {});
                    } else {
                      console.warn("[AccesPhone] mediaDevices no disponible (requiere HTTPS)");
                    }
                  }}
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
              reconnecting ? "bg-yellow-50 text-yellow-700" : "bg-gray-50 text-gray-700"
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
                  <div className="min-w-0 flex-1">
                    {callInfo.callerLabel && (
                      <div className="text-base font-extrabold text-green-800 truncate leading-tight">
                        {callInfo.callerLabel}
                      </div>
                    )}
                    <div className="text-sm font-semibold text-gray-900">
                      {callInfo.number}
                    </div>
                    <div className="text-xs text-gray-700">
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

            {/* Relay buttons - apertura de puertas */}
            {connected && !ringing && (
              <div className="px-3 pt-2">
                <p className="text-xs text-gray-500 text-center mb-1.5">Apertura Remota</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { trigger: "abrir_visitas_api", label: "Visita", color: "green" },
                    { trigger: "abrir_residentes_api", label: "Residente", color: "blue" },
                    { trigger: "apertura_especial_api", label: "Especial", color: "orange" },
                  ] as const).map(({ trigger, label, color }) => {
                    const st = relayStatus[trigger] || "idle";
                    const disabled = !activePrivadaId || st === "loading";
                    const colorMap = {
                      green: { idle: "bg-green-600 hover:bg-green-700", success: "bg-green-400", error: "bg-red-500" },
                      blue: { idle: "bg-blue-600 hover:bg-blue-700", success: "bg-blue-400", error: "bg-red-500" },
                      orange: { idle: "bg-orange-500 hover:bg-orange-600", success: "bg-orange-400", error: "bg-red-500" },
                    };
                    const bg = disabled && st === "idle" ? "bg-gray-300 cursor-not-allowed"
                      : st === "loading" ? colorMap[color].idle + " opacity-60"
                      : st === "success" ? colorMap[color].success
                      : st === "error" ? colorMap[color].error
                      : colorMap[color].idle;
                    return (
                      <button
                        key={trigger}
                        onClick={() => executeRelay(trigger)}
                        disabled={disabled}
                        className={`${bg} text-white rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1`}
                      >
                        {st === "loading" ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : st === "success" ? (
                          "✓"
                        ) : st === "error" ? (
                          "✗"
                        ) : null}
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dialpad - visible when connected (both idle and in-call for DTMF) */}
            {connected && !ringing && (
              <div className="p-3">
                {/* Number input and call button - only when not in call */}
                {!inCall && (
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
                )}
                {/* DTMF label when in call */}
                {inCall && (
                  <p className="text-xs text-center text-blue-600 font-medium mb-1.5">Teclado DTMF</p>
                )}
                <div className="grid grid-cols-3 gap-1">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(
                    (d) => (
                      <button
                        key={d}
                        onClick={() => dialpadPress(d)}
                        className={`rounded-lg py-2 text-sm font-medium transition ${
                          inCall
                            ? "bg-blue-50 text-blue-800 hover:bg-blue-100 active:bg-blue-200"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {d}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Action buttons: DND / AA / Disconnect */}
            <div className="px-3 pb-3">
              {connected ? (
                <div className="flex items-center gap-1.5">
                  {/* DND button */}
                  <button
                    onClick={() => {
                      setDndActive(!dndActive);
                      if (!dndActive) setAutoAnswerActive(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                      dndActive
                        ? "bg-red-600 border-red-600 text-white"
                        : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                    title="No Disponible - rechaza llamadas entrantes"
                  >
                    <BellOff className="h-3.5 w-3.5" />
                    DND
                  </button>
                  {/* AA button */}
                  <button
                    onClick={() => {
                      setAutoAnswerActive(!autoAnswerActive);
                      if (!autoAnswerActive) setDndActive(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                      autoAnswerActive
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                    title="Auto Answer - contesta automaticamente"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    AA
                  </button>
                  {/* Disconnect button */}
                  <button
                    onClick={disconnectSIP}
                    className="flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                    title="Desconectar SIP"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
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
                : dndActive
                  ? "bg-red-600"
                  : autoAnswerActive
                    ? "bg-blue-500"
                    : connected
                      ? "bg-green-600"
                      : "bg-gray-700"
          } text-white hover:scale-105`}
        >
          {ringing ? (
            <PhoneIncoming className="h-6 w-6" />
          ) : dndActive ? (
            <BellOff className="h-6 w-6" />
          ) : autoAnswerActive ? (
            <Zap className="h-6 w-6" />
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
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Configuracion SIP
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-md text-gray-600 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
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
                <label className="block text-xs font-medium text-gray-900 mb-1">
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
                <label className="block text-xs font-medium text-gray-900 mb-1">
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
                <label className="block text-xs font-medium text-gray-900 mb-1">
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

              {/* Separador - Audio */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">Audio</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  Microfono
                </label>
                <select
                  value={config.micDeviceId}
                  onChange={(e) =>
                    setConfig({ ...config, micDeviceId: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="">Default del navegador</option>
                  {availableMics.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Mic ${mic.deviceId.substring(0, 8)}`}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-700 mt-1">
                  Evite &quot;Stereo Mix&quot; - no es un microfono real
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  Volumen de timbrado
                </label>
                <div className="flex items-center gap-3">
                  {config.ringVolume > 0 ? (
                    <Bell className="h-4 w-4 text-gray-600 flex-shrink-0" />
                  ) : (
                    <BellOff className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={config.ringVolume}
                    onChange={(e) =>
                      setConfig({ ...config, ringVolume: parseInt(e.target.value) })
                    }
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-xs font-mono text-gray-600 w-8 text-right">
                    {config.ringVolume}%
                  </span>
                </div>
                <p className="text-[10px] text-gray-700 mt-1">
                  Intensidad del sonido al recibir llamadas (0 = silencio)
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
                  Tono de timbrado
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={config.ringTone}
                    onChange={(e) =>
                      setConfig({ ...config, ringTone: e.target.value })
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    {RINGTONE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      // Preview ringtone
                      const audio = new Audio(`/sounds/${config.ringTone}`);
                      audio.volume = config.ringVolume / 100;
                      audio.play().catch(() => {});
                      setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 3000);
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    title="Probar tono"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Separador - Configuracion de Video */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">Video / Camaras</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">
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
                <label className="block text-xs font-medium text-gray-900 mb-1">
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
                <label htmlFor="videoAutoOnCall" className="text-sm text-gray-900">
                  Video automatico en llamadas
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 transition"
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
