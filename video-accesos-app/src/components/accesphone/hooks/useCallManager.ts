'use client';
import { useState, useRef, useCallback } from 'react';
import type { CallState } from '../types';
import { DTMF_FREQS } from '../constants';

interface UseCallManagerOptions {
  ua: React.MutableRefObject<any>;
  sipDomain: string;
  speakerVolume: number;
  onIncomingCall?: (callerNumber: string) => void;
  onCallAnswered?: () => void;
  onCallEnded?: () => void;
}

export function useCallManager({
  ua,
  sipDomain,
  speakerVolume,
  onIncomingCall,
  onCallAnswered,
  onCallEnded,
}: UseCallManagerOptions) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [callerInfo, setCallerInfo] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  const sessionRef = useRef<any>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartRef = useRef<number | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement>(null);
  const dtmfCtxRef = useRef<AudioContext | null>(null);

  const startCallTimer = useCallback(() => {
    callStartRef.current = Date.now();
    callTimerRef.current = setInterval(() => {
      if (callStartRef.current) {
        setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
      }
    }, 1000);
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);

  const endCall = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    const duration = callStartRef.current ? Math.floor((Date.now() - callStartRef.current) / 1000) : 0;
    const number = callerInfo || phoneNumber;
    const wasActive = callStartRef.current !== null;
    sessionRef.current = null;
    callStartRef.current = null;
    setCallState('idle');
    setCallDuration(0);
    setCallerInfo('');
    setIsMuted(false);
    onCallEnded?.();
    return { duration, number, wasActive };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCallEnded, callerInfo, phoneNumber]);

  const setupSessionAudio = useCallback((session: any) => {
    session.on('peerconnection', (e: any) => {
      e.peerconnection.addEventListener('track', (ev: RTCTrackEvent) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = ev.streams[0];
          remoteAudioRef.current.volume = speakerVolume / 100;
        }
      });
    });
  }, [speakerVolume]);

  const handleIncomingSession = useCallback((session: any) => {
    sessionRef.current = session;
    const num = session.remote_identity?.uri?.user || 'Desconocido';
    setCallerInfo(num);
    setPhoneNumber(num);
    setCallState('ringing');

    onIncomingCall?.(num);

    try {
      if (ringtoneRef.current) {
        ringtoneRef.current.volume = 0.8;
        ringtoneRef.current.play();
      }
    } catch {}

    setupSessionAudio(session);

    session.on('failed', () => {
      stopRingtone();
      endCall();
    });
    session.on('ended', () => {
      stopRingtone();
      endCall();
    });

    return num;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onIncomingCall, setupSessionAudio, stopRingtone]);

  const answerCall = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.answer({
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });
    stopRingtone();
    setCallState('active');
    startCallTimer();
    onCallAnswered?.();
  }, [stopRingtone, startCallTimer, onCallAnswered]);

  const rejectCall = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.terminate(); } catch {}
    }
    stopRingtone();
    endCall();
  }, [stopRingtone, endCall]);

  const makeCall = useCallback((number?: string) => {
    const num = number || phoneNumber;
    if (!ua.current?.isRegistered?.() || !num) return;

    setCallState('calling');
    let dialNum = num;
    if (dialNum.length === 10 && dialNum.startsWith('5')) dialNum = '52' + dialNum;

    const session = ua.current.call(`sip:${dialNum}@${sipDomain}`, {
      mediaConstraints: { audio: true, video: false },
      rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
      pcConfig: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    sessionRef.current = session;
    setupSessionAudio(session);

    session.on('progress', () => setCallState('calling'));
    session.on('confirmed', () => {
      setCallState('active');
      startCallTimer();
      onCallAnswered?.();
    });
    session.on('failed', () => endCall());
    session.on('ended', () => endCall());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ua, sipDomain, phoneNumber, setupSessionAudio, startCallTimer, onCallAnswered, endCall]);

  const hangupCall = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.terminate(); } catch {}
    }
    endCall();
  }, [endCall]);

  const toggleMute = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    try {
      const pc = session.connection;
      if (pc) {
        pc.getSenders().forEach((s: RTCRtpSender) => {
          if (s.track?.kind === 'audio') s.track.enabled = !newMuted;
        });
      }
    } catch {}
  }, [isMuted]);

  const playDTMF = useCallback((digit: string) => {
    try {
      if (!dtmfCtxRef.current) {
        dtmfCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = dtmfCtxRef.current;
      const freqs = DTMF_FREQS[digit];
      if (!freqs) return;
      const gain = ctx.createGain();
      gain.gain.value = 0.12;
      gain.connect(ctx.destination);
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];
      osc1.connect(gain);
      osc2.connect(gain);
      const now = ctx.currentTime;
      osc1.start(now);
      osc2.start(now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.stop(now + 0.12);
      osc2.stop(now + 0.12);
    } catch {}
  }, []);

  const addDigit = useCallback((digit: string) => {
    playDTMF(digit);
    setPhoneNumber(prev => prev + digit);
    if (sessionRef.current?.isEstablished?.()) {
      try { sessionRef.current.sendDTMF(digit); } catch {}
    }
  }, [playDTMF]);

  const deleteDigit = useCallback(() => {
    setPhoneNumber(prev => prev.slice(0, -1));
  }, []);

  return {
    callState,
    callDuration,
    callerInfo,
    phoneNumber,
    isMuted,
    remoteAudioRef,
    ringtoneRef,
    setPhoneNumber,
    handleIncomingSession,
    answerCall,
    rejectCall,
    makeCall,
    hangupCall,
    toggleMute,
    addDigit,
    deleteDigit,
    playDTMF,
  };
}
