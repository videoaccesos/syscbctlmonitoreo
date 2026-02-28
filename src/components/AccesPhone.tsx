'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// AccesPhone v2.0 - Softphone SIP/WebRTC para Video Accesos
// Incluye: Camaras, Controles Audio, Relays MQTT, Dialpad
// ============================================================

// --- Types ---
interface AccesPhoneProps {
  onIncomingCall?: (callerNumber: string) => void;
  onCallAnswered?: () => void;
  onCallEnded?: () => void;
}

interface SipConfig {
  wsServer: string;
  extension: string;
  password: string;
  domain: string;
}

interface VideoConfig {
  proxyUrl: string;
  refreshRate: number;
  autoShowOnCall: boolean;
  autoSnapshot: boolean;
}

interface PrivadaConfig {
  apiUrl: string;
  mqttRelayUrl: string;
  autoLookupCaller: boolean;
}

interface PrivadaCamera {
  id: number;
  alias: string;
  url: string;
  privadaId: number;
  needsProxy: boolean;
  proxyUrl: string;
}

interface PrivadaRelay {
  id: number;
  alias: string;
  dns: string;
  puerto: string;
}

interface PrivadaOption {
  id: number;
  nombre: string;
  telefono?: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'registering' | 'registered' | 'error' | 'reconnecting';
type CallState = 'idle' | 'ringing' | 'calling' | 'active';
type ActiveTab = 'dialpad' | 'cameras' | 'audio' | 'relays';

const STORAGE_KEY = 'accesphone_config';
const STORAGE_VIDEO = 'accesphone_video';
const STORAGE_PRIVADA = 'accesphone_privada';

const DEFAULT_SIP: SipConfig = {
  wsServer: 'wss://accessbotpbx.info:8089/ws',
  extension: '',
  password: '',
  domain: 'accessbotpbx.info',
};

const DEFAULT_VIDEO: VideoConfig = {
  proxyUrl: '/syscbctlmonitoreo/softphone/camera_proxy.php',
  refreshRate: 500,
  autoShowOnCall: true,
  autoSnapshot: true,
};

const DEFAULT_PRIVADA: PrivadaConfig = {
  apiUrl: '/syscbctlmonitoreo/softphone/api_privada.php',
  mqttRelayUrl: '/syscbctlmonitoreo/softphone/mqtt_relay.php',
  autoLookupCaller: true,
};

// --- DTMF Frequencies ---
const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

const DIAL_KEYS: { digit: string; letters: string }[] = [
  { digit: '1', letters: '' }, { digit: '2', letters: 'ABC' }, { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' }, { digit: '5', letters: 'JKL' }, { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' }, { digit: '8', letters: 'TUV' }, { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' }, { digit: '0', letters: '+' }, { digit: '#', letters: '' },
];

export default function AccesPhone({ onIncomingCall, onCallAnswered, onCallEnded }: AccesPhoneProps) {
  // --- UI State ---
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dialpad');
  const [phoneNumber, setPhoneNumber] = useState('');

  // --- SIP State ---
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [callState, setCallState] = useState<CallState>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [callerInfo, setCallerInfo] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  // --- Config State ---
  const [sipConfig, setSipConfig] = useState<SipConfig>(DEFAULT_SIP);
  const [videoConfig, setVideoConfig] = useState<VideoConfig>(DEFAULT_VIDEO);
  const [privadaConfig, setPrivadaConfig] = useState<PrivadaConfig>(DEFAULT_PRIVADA);

  // --- Camera State ---
  const [cameras, setCameras] = useState<PrivadaCamera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<number>(0);
  const [cameraImageUrl, setCameraImageUrl] = useState('');
  const [videoPaused, setVideoPaused] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  // --- Audio Controls State ---
  const [micVolume, setMicVolume] = useState(50);
  const [speakerVolume, setSpeakerVolume] = useState(75);
  const [ringtoneVolume, setRingtoneVolume] = useState(80);

  // --- Relay State ---
  const [relays, setRelays] = useState<PrivadaRelay[]>([]);
  const [activatingRelay, setActivatingRelay] = useState<number | null>(null);
  const [showRelays, setShowRelays] = useState(false);

  // --- Privada State ---
  const [privadas, setPrivadas] = useState<PrivadaOption[]>([]);
  const [selectedPrivada, setSelectedPrivada] = useState<number | null>(null);

  // --- Settings form (temporary) ---
  const [formSip, setFormSip] = useState<SipConfig>(DEFAULT_SIP);
  const [formVideo, setFormVideo] = useState<VideoConfig>(DEFAULT_VIDEO);
  const [formPrivada, setFormPrivada] = useState<PrivadaConfig>(DEFAULT_PRIVADA);

  // --- Refs ---
  const uaRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement>(null);
  const dtmfCtxRef = useRef<AudioContext | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const videoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveErrorsRef = useRef(0);

  // ============================================================
  // LOAD/SAVE CONFIG
  // ============================================================
  useEffect(() => {
    try {
      const sc = localStorage.getItem(STORAGE_KEY);
      if (sc) {
        const parsed = JSON.parse(sc) as SipConfig;
        setSipConfig(parsed);
        setFormSip(parsed);
      }
      const vc = localStorage.getItem(STORAGE_VIDEO);
      if (vc) {
        const parsed = JSON.parse(vc) as VideoConfig;
        setVideoConfig(parsed);
        setFormVideo(parsed);
      }
      const pc = localStorage.getItem(STORAGE_PRIVADA);
      if (pc) {
        const parsed = JSON.parse(pc) as PrivadaConfig;
        setPrivadaConfig(parsed);
        setFormPrivada(parsed);
      }
    } catch {}
  }, []);

  // Auto-connect on mount if config exists
  useEffect(() => {
    if (sipConfig.extension && sipConfig.password) {
      const t = setTimeout(() => connectSip(), 1000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load privadas on mount
  useEffect(() => {
    loadPrivadas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVideoRefresh();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (uaRef.current) {
        try { uaRef.current.stop(); } catch {}
      }
    };
  }, []);

  // ============================================================
  // SIP / JsSIP CONNECTION
  // ============================================================
  const connectSip = useCallback(() => {
    const cfg = sipConfig;
    if (!cfg.extension || !cfg.password) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');

    // Dynamically import JsSIP (browser-only)
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
          user_agent: 'AccesPhone/2.0',
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
        ua.on('registrationFailed', () => {
          setStatus('error');
        });
        ua.on('newRTCSession', (e: any) => {
          if (e.originator === 'remote') {
            handleIncomingCall(e.session);
          }
        });

        ua.start();
        uaRef.current = ua;
      } catch (err) {
        console.error('SIP connection error:', err);
        setStatus('error');
      }
    }).catch(() => {
      setStatus('error');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sipConfig]);

  const disconnectSip = useCallback(() => {
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

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) return;
    const attempt = reconnectAttemptRef.current;
    const delay = Math.min(2000 * Math.pow(2, attempt), 30000);
    reconnectAttemptRef.current = attempt + 1;
    setStatus('reconnecting');
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectSip();
    }, delay);
  }, [connectSip]);

  // ============================================================
  // CALL MANAGEMENT
  // ============================================================
  const handleIncomingCall = useCallback((session: any) => {
    sessionRef.current = session;
    const num = session.remote_identity?.uri?.user || 'Desconocido';
    setCallerInfo(num);
    setPhoneNumber(num);
    setCallState('ringing');
    setExpanded(true);

    if (onIncomingCall) onIncomingCall(num);

    // Auto-lookup privada
    lookupCallerPrivada(num);

    // Play ringtone
    try {
      if (ringtoneRef.current) {
        ringtoneRef.current.volume = ringtoneVolume / 100;
        ringtoneRef.current.play();
      }
    } catch {}

    session.on('failed', () => {
      stopRingtone();
      endCall();
    });
    session.on('ended', () => {
      stopRingtone();
      endCall();
    });
    session.on('peerconnection', (e: any) => {
      e.peerconnection.addEventListener('track', (ev: RTCTrackEvent) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = ev.streams[0];
          remoteAudioRef.current.volume = speakerVolume / 100;
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onIncomingCall, ringtoneVolume, speakerVolume]);

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
    if (onCallAnswered) onCallAnswered();

    // Auto-show video
    if (videoConfig.autoShowOnCall && cameras.length > 0) {
      setShowVideo(true);
      setActiveTab('cameras');
    }

    // Auto-snapshot
    if (videoConfig.autoSnapshot) {
      autoSnapshot();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCallAnswered, videoConfig, cameras]);

  const rejectCall = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.terminate(); } catch {}
    }
    stopRingtone();
    endCall();
  }, []);

  const makeCall = useCallback(() => {
    if (!uaRef.current || status !== 'registered' || !phoneNumber) return;

    setCallState('calling');

    let num = phoneNumber;
    if (num.length === 10 && num.startsWith('5')) num = '52' + num;

    const session = uaRef.current.call(`sip:${num}@${sipConfig.domain}`, {
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

    session.on('progress', () => setCallState('calling'));
    session.on('confirmed', () => {
      setCallState('active');
      startCallTimer();
      if (onCallAnswered) onCallAnswered();
      if (videoConfig.autoShowOnCall && cameras.length > 0) {
        setShowVideo(true);
        setActiveTab('cameras');
      }
    });
    session.on('failed', () => endCall());
    session.on('ended', () => endCall());
    session.on('peerconnection', (e: any) => {
      e.peerconnection.addEventListener('track', (ev: RTCTrackEvent) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = ev.streams[0];
          remoteAudioRef.current.volume = speakerVolume / 100;
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, phoneNumber, sipConfig, speakerVolume, videoConfig, cameras, onCallAnswered]);

  const hangupCall = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.terminate(); } catch {}
    }
    endCall();
  }, []);

  const endCall = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    sessionRef.current = null;
    callStartRef.current = null;
    localStreamRef.current = null;
    setCallState('idle');
    setCallDuration(0);
    setCallerInfo('');
    setIsMuted(false);
    setIsSpeaker(false);
    if (onCallEnded) onCallEnded();
  }, [onCallEnded]);

  const startCallTimer = () => {
    callStartRef.current = Date.now();
    callTimerRef.current = setInterval(() => {
      if (callStartRef.current) {
        setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
      }
    }, 1000);
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

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

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker(!isSpeaker);
    // Speaker mode just adjusts volume
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isSpeaker ? speakerVolume / 100 : 1.0;
    }
  }, [isSpeaker, speakerVolume]);

  // ============================================================
  // DTMF
  // ============================================================
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

  // ============================================================
  // CAMERA / VIDEO
  // ============================================================
  const startVideoRefresh = useCallback(() => {
    stopVideoRefresh();
    consecutiveErrorsRef.current = 0;
    if (cameras.length === 0) return;
    const cam = cameras[selectedCamera] || cameras[0];

    const refresh = () => {
      const feedUrl = cam.needsProxy ? cam.proxyUrl : cam.url;
      const sep = feedUrl.includes('?') ? '&' : '?';
      const url = `${feedUrl}${sep}t=${Date.now()}`;
      const img = new Image();
      img.onload = () => {
        setCameraImageUrl(url);
        consecutiveErrorsRef.current = 0;
      };
      img.onerror = () => {
        consecutiveErrorsRef.current++;
        if (consecutiveErrorsRef.current >= 5) {
          stopVideoRefresh();
          setCameraImageUrl('');
          setTimeout(() => {
            if (showVideo && !videoPaused) startVideoRefresh();
          }, 3000);
        }
      };
      img.src = url;
    };

    refresh();
    videoIntervalRef.current = setInterval(refresh, videoConfig.refreshRate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameras, selectedCamera, videoConfig.refreshRate, showVideo, videoPaused]);

  const stopVideoRefresh = () => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
  };

  // Start/stop video refresh when visibility/camera changes
  useEffect(() => {
    if (showVideo && !videoPaused && cameras.length > 0) {
      startVideoRefresh();
    } else {
      stopVideoRefresh();
    }
    return () => stopVideoRefresh();
  }, [showVideo, videoPaused, selectedCamera, cameras, startVideoRefresh]);

  const captureSnapshot = useCallback(() => {
    const cam = cameras[selectedCamera];
    if (!cam) return;
    if (cam.needsProxy && cam.privadaId) {
      const url = `${videoConfig.proxyUrl}?privada_id=${cam.privadaId}&cam=${cam.id}&save=1&t=${Date.now()}`;
      fetch(url).catch(() => {});
    }
    // Download current frame
    if (cameraImageUrl) {
      const a = document.createElement('a');
      a.href = cameraImageUrl;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `snapshot_${cam.alias.replace(/\s+/g, '_')}_${ts}.jpg`;
      a.click();
    }
  }, [cameras, selectedCamera, videoConfig.proxyUrl, cameraImageUrl]);

  const autoSnapshot = useCallback(() => {
    if (!videoConfig.autoSnapshot) return;
    cameras.forEach((cam) => {
      if (cam.needsProxy && cam.privadaId) {
        const url = `${videoConfig.proxyUrl}?privada_id=${cam.privadaId}&cam=${cam.id}&save=1&t=${Date.now()}`;
        fetch(url).catch(() => {});
      }
    });
  }, [cameras, videoConfig]);

  // ============================================================
  // PRIVADA / RELAY
  // ============================================================
  const loadPrivadas = useCallback(async () => {
    try {
      const r = await fetch(`${privadaConfig.apiUrl}?action=list_privadas`);
      const d = await r.json();
      if (d.success) setPrivadas(d.privadas || []);
    } catch {}
  }, [privadaConfig.apiUrl]);

  const onPrivadaSelected = useCallback(async (privadaId: number) => {
    setSelectedPrivada(privadaId);
    if (!privadaId) {
      setCameras([]);
      setRelays([]);
      setShowVideo(false);
      return;
    }

    try {
      const [videosRes, relaysRes] = await Promise.all([
        fetch(`${privadaConfig.apiUrl}?action=get_videos&privada_id=${privadaId}`).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`${privadaConfig.apiUrl}?action=get_relays&privada_id=${privadaId}`).then(r => r.json()).catch(() => ({ success: false })),
      ]);

      if (videosRes.success && videosRes.videos?.length > 0) {
        const cams: PrivadaCamera[] = videosRes.videos.map((v: any) => ({
          id: v.id,
          alias: v.alias,
          url: v.url,
          privadaId: v.privada_id || privadaId,
          needsProxy: v.needs_proxy || false,
          proxyUrl: v.proxy_url || v.url,
        }));
        setCameras(cams);
        setSelectedCamera(0);
      } else {
        setCameras([]);
      }

      if (relaysRes.success && relaysRes.relays?.length > 0) {
        setRelays(relaysRes.relays);
      } else {
        setRelays([]);
      }
    } catch {}
  }, [privadaConfig.apiUrl]);

  const activateRelay = useCallback(async (relay: PrivadaRelay) => {
    if (activatingRelay === relay.id) return;
    setActivatingRelay(relay.id);

    const topic = relay.dns.includes('/')
      ? relay.dns
      : `home/relays/${relay.dns}/${relay.id}/set`;

    try {
      const r = await fetch(privadaConfig.mqttRelayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mqtt_direct',
          topic,
          payload: 'PULSE',
          puerto: parseInt(relay.puerto) || 1883,
        }),
      });
      await r.json();
    } catch {}

    setTimeout(() => setActivatingRelay(null), 2500);
  }, [activatingRelay, privadaConfig.mqttRelayUrl]);

  const lookupCallerPrivada = useCallback(async (number: string) => {
    if (!privadaConfig.autoLookupCaller || !number) return;
    try {
      const r = await fetch(`${privadaConfig.apiUrl}?action=lookup_caller&telefono=${encodeURIComponent(number)}`);
      const d = await r.json();
      if (d.success && d.privada_id) {
        setSelectedPrivada(d.privada_id);
        await onPrivadaSelected(d.privada_id);
      }
    } catch {}
  }, [privadaConfig, onPrivadaSelected]);

  // ============================================================
  // AUDIO VOLUME CONTROLS
  // ============================================================
  const handleSpeakerVolume = useCallback((v: number) => {
    setSpeakerVolume(v);
    if (remoteAudioRef.current) remoteAudioRef.current.volume = v / 100;
  }, []);

  const handleRingtoneVolume = useCallback((v: number) => {
    setRingtoneVolume(v);
    if (ringtoneRef.current) ringtoneRef.current.volume = v / 100;
  }, []);

  // ============================================================
  // SETTINGS
  // ============================================================
  const openSettings = () => {
    setFormSip({ ...sipConfig });
    setFormVideo({ ...videoConfig });
    setFormPrivada({ ...privadaConfig });
    setShowSettings(true);
  };

  const saveSettings = () => {
    setSipConfig(formSip);
    setVideoConfig(formVideo);
    setPrivadaConfig(formPrivada);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formSip));
    localStorage.setItem(STORAGE_VIDEO, JSON.stringify(formVideo));
    localStorage.setItem(STORAGE_PRIVADA, JSON.stringify(formPrivada));
    setShowSettings(false);
    // Reconnect with new config
    disconnectSip();
    setTimeout(() => connectSip(), 500);
    loadPrivadas();
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const formatNumber = (n: string) => {
    if (!n) return '';
    if (n.length <= 3) return n;
    if (n.length <= 6) return `${n.slice(0, 3)} ${n.slice(3)}`;
    if (n.length <= 10) return `${n.slice(0, 2)} ${n.slice(2, 6)} ${n.slice(6)}`;
    return n;
  };

  const statusColor = status === 'registered'
    ? 'bg-green-500' : status === 'connecting' || status === 'registering' || status === 'reconnecting'
    ? 'bg-yellow-500' : status === 'error'
    ? 'bg-red-500' : 'bg-gray-400';

  const statusText = status === 'registered' ? 'Registrado'
    : status === 'connecting' ? 'Conectando...'
    : status === 'registering' ? 'Registrando...'
    : status === 'reconnecting' ? 'Reconectando...'
    : status === 'error' ? 'Error'
    : 'Desconectado';

  const fabBg = callState === 'ringing'
    ? 'bg-green-500 animate-bounce'
    : callState === 'active' || callState === 'calling'
    ? 'bg-blue-600'
    : status === 'registered'
    ? 'bg-green-600'
    : 'bg-gray-700';

  const dotColor = status === 'registered' ? 'bg-green-400' : status === 'error' ? 'bg-red-400' : 'bg-yellow-400';

  // ============================================================
  // KEYBOARD SHORTCUTS
  // ============================================================
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!expanded) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;

      if (e.key >= '0' && e.key <= '9') addDigit(e.key);
      else if (e.key === '*' || e.key === '#') addDigit(e.key);
      else if (e.key === 'Backspace') { e.preventDefault(); deleteDigit(); }
      else if (e.key === 'Enter' && phoneNumber && callState === 'idle') makeCall();
      else if (e.key === 'Escape' && callState !== 'idle') hangupCall();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expanded, addDigit, deleteDigit, phoneNumber, callState, makeCall, hangupCall]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      {/* Hidden audio elements */}
      <audio ref={remoteAudioRef} autoPlay />
      <audio ref={ringtoneRef} loop preload="auto">
        <source src="/syscbctlmonitoreo/softphone/ringtone.mp3" type="audio/mpeg" />
        <source src="/syscbctlmonitoreo/softphone/ringtone.ogg" type="audio/ogg" />
      </audio>

      {/* ====== FAB BUTTON (bottom-right) ====== */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`fixed bottom-4 right-4 z-50 rounded-full p-3.5 shadow-lg transition-all duration-300 hover:scale-110 ${fabBg}`}
      >
        {/* Phone icon */}
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        {/* Status dot */}
        <span className={`absolute top-1 right-1 h-3 w-3 rounded-full border-2 border-white ${dotColor}`} />
      </button>

      {/* ====== MAIN PANEL ====== */}
      {expanded && (
        <div className="fixed bottom-20 right-4 z-50 w-80 rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 100px)' }}>

          {/* --- Header --- */}
          <div className="bg-gray-900 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
              <span className="text-white font-bold text-sm">AccesPhone</span>
              {status === 'registered' && sipConfig.extension && (
                <span className="text-gray-400 text-xs">Ext {sipConfig.extension}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={openSettings} className="text-gray-400 hover:text-white p-1 rounded transition-colors" title="Configuracion">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button onClick={() => setExpanded(false)} className="text-gray-400 hover:text-white p-1 rounded transition-colors" title="Minimizar">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* --- Status bar --- */}
          <div className="bg-gray-800 px-4 py-1.5 text-xs flex items-center justify-between flex-shrink-0">
            <span className="text-gray-300">{statusText}</span>
            {selectedPrivada && privadas.find(p => p.id === selectedPrivada) && (
              <span className="text-green-400 text-[10px] truncate max-w-[140px]">
                {privadas.find(p => p.id === selectedPrivada)?.nombre}
              </span>
            )}
          </div>

          {/* --- Privada selector --- */}
          <div className="bg-gray-800 px-4 py-2 border-t border-gray-700 flex-shrink-0">
            <select
              value={selectedPrivada || ''}
              onChange={(e) => onPrivadaSelected(Number(e.target.value))}
              className="w-full bg-gray-700 text-white text-xs rounded-lg px-3 py-1.5 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- Seleccionar Privada --</option>
              {privadas.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* --- Scrollable content --- */}
          <div className="overflow-y-auto flex-1">

            {/* === INCOMING CALL PANEL === */}
            {callState === 'ringing' && (
              <div className="bg-green-50 border-b border-green-200 p-4 text-center">
                <div className="text-green-700 font-bold text-sm mb-1">Llamada Entrante</div>
                <div className="text-gray-900 font-mono text-lg">{formatNumber(callerInfo)}</div>
                <div className="flex gap-3 justify-center mt-3">
                  <button onClick={answerCall} className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-full text-sm font-semibold shadow transition-colors">
                    Contestar
                  </button>
                  <button onClick={rejectCall} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded-full text-sm font-semibold transition-colors">
                    Rechazar
                  </button>
                </div>
              </div>
            )}

            {/* === ACTIVE CALL PANEL === */}
            {(callState === 'active' || callState === 'calling') && (
              <div className="bg-blue-50 border-b border-blue-200 p-3 text-center">
                <div className="text-blue-700 text-xs font-medium">
                  {callState === 'calling' ? 'Llamando...' : 'En llamada'}
                </div>
                <div className="text-gray-900 font-mono text-base">{formatNumber(phoneNumber)}</div>
                {callState === 'active' && (
                  <div className="text-blue-600 font-mono text-sm">{formatDuration(callDuration)}</div>
                )}
                <div className="flex gap-2 justify-center mt-2">
                  <button
                    onClick={toggleMute}
                    className={`p-2 rounded-full text-xs font-medium transition-colors ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    title={isMuted ? 'Activar mic' : 'Silenciar'}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {isMuted ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      )}
                    </svg>
                  </button>
                  <button
                    onClick={toggleSpeaker}
                    className={`p-2 rounded-full text-xs font-medium transition-colors ${isSpeaker ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    title="Altavoz"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                  <button
                    onClick={hangupCall}
                    className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow transition-colors"
                    title="Colgar"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* === TAB BAR === */}
            <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
              {[
                { id: 'dialpad' as ActiveTab, label: 'Teclado', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' },
                { id: 'cameras' as ActiveTab, label: 'Camaras', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', badge: cameras.length || undefined },
                { id: 'audio' as ActiveTab, label: 'Audio', icon: 'M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z' },
                { id: 'relays' as ActiveTab, label: 'Relays', icon: 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z', badge: relays.length || undefined },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 text-[10px] font-medium flex flex-col items-center gap-0.5 relative transition-colors
                    ${activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                  {tab.label}
                  {tab.badge && (
                    <span className="absolute top-0.5 right-2 bg-blue-500 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* === DIALPAD TAB === */}
            {activeTab === 'dialpad' && (
              <div className="p-3">
                {/* Number display */}
                <div className="bg-gray-50 rounded-xl p-3 mb-3 text-center border border-gray-100">
                  <input
                    type="text"
                    value={formatNumber(phoneNumber)}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\s/g, ''))}
                    className="w-full text-center text-xl font-light tracking-widest bg-transparent outline-none text-gray-900 font-mono"
                    placeholder="Numero..."
                  />
                </div>

                {/* Dialpad grid */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {DIAL_KEYS.map(({ digit, letters }) => (
                    <button
                      key={digit}
                      onClick={() => addDigit(digit)}
                      className="bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border border-gray-200 rounded-xl py-3 flex flex-col items-center transition-colors"
                    >
                      <span className="text-lg font-medium text-gray-800">{digit}</span>
                      {letters && <span className="text-[8px] text-gray-400 tracking-wider">{letters}</span>}
                    </button>
                  ))}
                </div>

                {/* Action row */}
                <div className="flex gap-2 items-center justify-center">
                  <button onClick={deleteDigit} className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl p-3 transition-colors" title="Borrar">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z" />
                    </svg>
                  </button>
                  {callState === 'idle' ? (
                    <button
                      onClick={makeCall}
                      disabled={!phoneNumber || status !== 'registered'}
                      className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl py-3 font-semibold text-sm shadow transition-colors"
                    >
                      Llamar
                    </button>
                  ) : (
                    <button
                      onClick={hangupCall}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-semibold text-sm shadow transition-colors"
                    >
                      Colgar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* === CAMERAS TAB === */}
            {activeTab === 'cameras' && (
              <div className="p-3">
                {cameras.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <svg className="h-10 w-10 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Seleccione una privada para ver camaras
                  </div>
                ) : (
                  <>
                    {/* Video feed */}
                    <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-2">
                      {cameraImageUrl ? (
                        <img
                          src={cameraImageUrl}
                          alt={cameras[selectedCamera]?.alias || 'Camara'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                          {videoPaused ? 'Pausado' : 'Cargando...'}
                        </div>
                      )}
                      {/* Overlay info */}
                      <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {!videoPaused && cameraImageUrl && (
                            <span className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded animate-pulse">LIVE</span>
                          )}
                          <span className="text-white text-xs font-medium">{cameras[selectedCamera]?.alias}</span>
                        </div>
                        <span className="text-gray-300 text-[9px] font-mono">
                          {videoPaused ? 'PAUSA' : `${Math.round(1000 / videoConfig.refreshRate)} FPS`}
                        </span>
                      </div>
                      {/* Video controls */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent flex justify-end gap-1">
                        <button
                          onClick={() => setVideoPaused(!videoPaused)}
                          className="bg-white/20 hover:bg-white/30 text-white rounded-md p-1.5 text-xs transition-colors"
                          title={videoPaused ? 'Reanudar' : 'Pausar'}
                        >
                          {videoPaused ? '\u25B6' : '\u23F8'}
                        </button>
                        <button
                          onClick={captureSnapshot}
                          className="bg-white/20 hover:bg-white/30 text-white rounded-md p-1.5 text-xs transition-colors"
                          title="Capturar snapshot"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Camera selector buttons */}
                    <div className="flex gap-1.5 flex-wrap">
                      {cameras.map((cam, i) => (
                        <button
                          key={cam.id}
                          onClick={() => setSelectedCamera(i)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-colors
                            ${i === selectedCamera
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                          {cam.alias}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* === AUDIO TAB === */}
            {activeTab === 'audio' && (
              <div className="p-4 space-y-4">
                {/* Mic volume */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-700">Microfono</span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{micVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={micVolume}
                    onChange={(e) => setMicVolume(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Speaker volume */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-700">Altavoz</span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{speakerVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={speakerVolume}
                    onChange={(e) => handleSpeakerVolume(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Ringtone volume */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span className="text-xs font-medium text-gray-700">Tono de llamada</span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{ringtoneVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={ringtoneVolume}
                    onChange={(e) => handleRingtoneVolume(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Mute button */}
                <button
                  onClick={toggleMute}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors
                    ${isMuted
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {isMuted ? 'Activar Microfono' : 'Silenciar Microfono'}
                </button>
              </div>
            )}

            {/* === RELAYS TAB === */}
            {activeTab === 'relays' && (
              <div className="p-3">
                {relays.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <svg className="h-10 w-10 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Seleccione una privada para ver relays
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Apertura Remota</div>
                    {relays.map((relay) => (
                      <button
                        key={relay.id}
                        onClick={() => activateRelay(relay)}
                        disabled={activatingRelay === relay.id}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all
                          ${activatingRelay === relay.id
                            ? 'bg-green-50 border-green-300 shadow-sm'
                            : 'bg-gray-50 border-gray-200 hover:bg-orange-50 hover:border-orange-300'
                          }`}
                      >
                        <div className="text-left">
                          <div className="text-sm font-semibold text-gray-800">{relay.alias}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{relay.dns}:{relay.puerto || '1883'}</div>
                        </div>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-lg transition-colors
                          ${activatingRelay === relay.id ? 'bg-green-500' : 'bg-orange-500'}`}
                        >
                          {activatingRelay === relay.id ? '\u2713' : '\uD83D\uDD13'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --- Footer: Connect/Disconnect --- */}
          <div className="border-t border-gray-200 p-3 flex-shrink-0">
            {status === 'registered' ? (
              <button
                onClick={disconnectSip}
                className="w-full py-2 rounded-xl text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                Desconectar
              </button>
            ) : status === 'connecting' || status === 'registering' || status === 'reconnecting' ? (
              <button
                onClick={disconnectSip}
                className="w-full py-2 rounded-xl text-sm font-semibold bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors"
              >
                Cancelar conexion
              </button>
            ) : (
              <button
                onClick={connectSip}
                disabled={!sipConfig.extension || !sipConfig.password}
                className="w-full py-2 rounded-xl text-sm font-semibold bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Conectar
              </button>
            )}
          </div>
        </div>
      )}

      {/* ====== SETTINGS MODAL ====== */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gray-900 px-5 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold">Configuracion</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white text-xl">&times;</button>
            </div>
            {/* Body */}
            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
              {/* SIP */}
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Conexion SIP</div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Servidor WebSocket</label>
                  <input type="text" value={formSip.wsServer} onChange={e => setFormSip({...formSip, wsServer: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Extension</label>
                  <input type="text" value={formSip.extension} onChange={e => setFormSip({...formSip, extension: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" placeholder="103" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Contrasena</label>
                  <input type="password" value={formSip.password} onChange={e => setFormSip({...formSip, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Dominio SIP</label>
                  <input type="text" value={formSip.domain} onChange={e => setFormSip({...formSip, domain: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Video */}
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Video / Camaras</div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">URL Proxy Camaras</label>
                  <input type="text" value={formVideo.proxyUrl} onChange={e => setFormVideo({...formVideo, proxyUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Refresh (ms)</label>
                  <input type="number" value={formVideo.refreshRate} onChange={e => setFormVideo({...formVideo, refreshRate: Number(e.target.value)})}
                    min="100" max="2000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={formVideo.autoShowOnCall} onChange={e => setFormVideo({...formVideo, autoShowOnCall: e.target.checked})} className="rounded" />
                  Video automatico en llamadas
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={formVideo.autoSnapshot} onChange={e => setFormVideo({...formVideo, autoSnapshot: e.target.checked})} className="rounded" />
                  Auto-snapshot al contestar
                </label>
              </div>

              <hr className="border-gray-200" />

              {/* Privada/MQTT */}
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Privada / MQTT</div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">URL API Privada</label>
                  <input type="text" value={formPrivada.apiUrl} onChange={e => setFormPrivada({...formPrivada, apiUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">URL MQTT Relay</label>
                  <input type="text" value={formPrivada.mqttRelayUrl} onChange={e => setFormPrivada({...formPrivada, mqttRelayUrl: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={formPrivada.autoLookupCaller} onChange={e => setFormPrivada({...formPrivada, autoLookupCaller: e.target.checked})} className="rounded" />
                  Identificar privada por CallerID
                </label>
              </div>
            </div>
            {/* Footer */}
            <div className="border-t border-gray-200 p-4">
              <button onClick={saveSettings} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors">
                Guardar y Conectar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
