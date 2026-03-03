"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { RTCSession } from "jssip/lib/RTCSession";
import type { UA } from "jssip/lib/UA";
import type { CallInfo } from "../types";

// ---------------------------------------------------------------------------
// Params & Return types
// ---------------------------------------------------------------------------

export interface UseCallManagerParams {
  uaRef: React.MutableRefObject<UA | null>;
  connected: boolean;
  sipDomain: string;
  /** Called when a call is answered */
  onCallAnswered?: (callerNumber: string) => void;
  /** Called when a call ends */
  onCallEnded?: () => void;
  /** Current speaker state – used in peerconnection track handler */
  speakerOn: boolean;
  /** Variant label for log messages */
  logPrefix?: string;
}

export interface UseCallManagerReturn {
  inCall: boolean;
  callInfo: CallInfo | null;
  ringing: boolean;
  callDuration: number;
  muted: boolean;
  dialNumber: string;
  setDialNumber: React.Dispatch<React.SetStateAction<string>>;
  sessionRef: React.MutableRefObject<RTCSession | null>;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  remoteAudioRef: React.MutableRefObject<HTMLAudioElement | null>;
  ringtoneRef: React.MutableRefObject<HTMLAudioElement | null>;
  /** Set up session event handlers – must be called for incoming sessions too */
  setupSessionEvents: (session: RTCSession, callerNumber: string) => void;
  /** Register an incoming session (called from useSipConnection callback) */
  handleIncomingSession: (session: RTCSession, callerNumber: string) => void;
  answerCall: () => Promise<void>;
  hangupCall: () => void;
  rejectCall: () => void;
  toggleMute: () => void;
  makeCall: () => Promise<void>;
  dialpadPress: (digit: string) => void;
  cleanupCall: () => void;
  formatDuration: (s: number) => string;
  acquireMicOrFallback: () => Promise<MediaStream>;
  requestMicPermission: () => Promise<boolean>;
  micPermission: "granted" | "denied" | "prompt" | "unknown";
  micWarning: boolean;
  setMicWarning: React.Dispatch<React.SetStateAction<boolean>>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCallManager({
  uaRef,
  connected,
  sipDomain,
  onCallAnswered,
  onCallEnded,
  speakerOn,
  logPrefix = "AccesPhone",
}: UseCallManagerParams): UseCallManagerReturn {
  const [inCall, setInCall] = useState(false);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const [ringing, setRinging] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [dialNumber, setDialNumber] = useState("");
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const [micWarning, setMicWarning] = useState(false);

  // Refs
  const sessionRef = useRef<RTCSession | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stable refs for callbacks
  const onCallAnsweredRef = useRef(onCallAnswered);
  const onCallEndedRef = useRef(onCallEnded);
  useEffect(() => {
    onCallAnsweredRef.current = onCallAnswered;
    onCallEndedRef.current = onCallEnded;
  }, [onCallAnswered, onCallEnded]);

  // Keep speakerOn in a ref so peerconnection handler always has latest value
  const speakerOnRef = useRef(speakerOn);
  useEffect(() => {
    speakerOnRef.current = speakerOn;
  }, [speakerOn]);

  // Check microphone permission on mount
  useEffect(() => {
    async function checkMicPermission() {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
          setMicPermission(result.state as "granted" | "denied" | "prompt");
          result.addEventListener("change", () => {
            setMicPermission(result.state as "granted" | "denied" | "prompt");
            if (result.state === "granted") setMicWarning(false);
          });
        }
      } catch {
        // permissions API not available
      }
    }
    checkMicPermission();
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

  // -----------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------
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
              remoteAudioRef.current.volume = speakerOnRef.current ? 1.0 : 0;
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

  // -----------------------------------------------------------
  // Mic helpers
  // -----------------------------------------------------------
  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission("granted");
      setMicWarning(false);
      return true;
    } catch {
      setMicPermission("denied");
      setMicWarning(true);
      return false;
    }
  }, []);

  const acquireMicOrFallback = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setMicPermission("granted");
      setMicWarning(false);
      return stream;
    } catch (err) {
      console.warn(`[${logPrefix}] Microfono no disponible, modo solo-escucha:`, err);
      setMicPermission("denied");
      setMicWarning(true);
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
  }, [logPrefix]);

  // -----------------------------------------------------------
  // Handle incoming session (called from useSipConnection)
  // -----------------------------------------------------------
  const handleIncomingSession = useCallback(
    (session: RTCSession, callerNumber: string) => {
      sessionRef.current = session;
      setRinging(true);
      setCallInfo({
        number: callerNumber,
        direction: "incoming",
        startTime: new Date(),
      });

      if (ringtoneRef.current) {
        ringtoneRef.current.loop = true;
        ringtoneRef.current.play().catch(() => {});
      }

      setupSessionEvents(session, callerNumber);
    },
    [setupSessionEvents]
  );

  // -----------------------------------------------------------
  // Call actions
  // -----------------------------------------------------------
  const answerCall = useCallback(async () => {
    if (!sessionRef.current) return;
    try {
      if (!localStreamRef.current) {
        localStreamRef.current = await acquireMicOrFallback();
      }
      sessionRef.current.answer({
        mediaConstraints: { audio: true, video: false },
        mediaStream: localStreamRef.current,
      });
    } catch (err) {
      console.error(`[${logPrefix}] Error answering call:`, err);
    }
  }, [acquireMicOrFallback, logPrefix]);

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

  const makeCall = useCallback(async () => {
    if (!dialNumber || !connected || !uaRef.current) return;

    try {
      const stream = await acquireMicOrFallback();
      localStreamRef.current = stream;

      const session = uaRef.current.call(`sip:${dialNumber}@${sipDomain}`, {
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
      console.error(`[${logPrefix}] Error starting call:`, err);
    }
  }, [dialNumber, connected, uaRef, sipDomain, setupSessionEvents, acquireMicOrFallback, logPrefix]);

  // -----------------------------------------------------------
  // Dialpad handler
  // -----------------------------------------------------------
  const dialpadPress = useCallback((digit: string) => {
    setDialNumber((prev) => prev + digit);
    if (sessionRef.current) {
      sessionRef.current.sendDTMF(digit);
    }
  }, []);

  return {
    inCall,
    callInfo,
    ringing,
    callDuration,
    muted,
    dialNumber,
    setDialNumber,
    sessionRef,
    localStreamRef,
    remoteAudioRef,
    ringtoneRef,
    setupSessionEvents,
    handleIncomingSession,
    answerCall,
    hangupCall,
    rejectCall,
    toggleMute,
    makeCall,
    dialpadPress,
    cleanupCall,
    formatDuration,
    acquireMicOrFallback,
    requestMicPermission,
    micPermission,
    micWarning,
    setMicWarning,
  };
}
