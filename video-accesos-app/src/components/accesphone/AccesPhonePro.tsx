'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AccesPhoneProProps, ActiveTab, VideoConfig, PrivadaConfig } from './types';
import { DEFAULT_VIDEO, DEFAULT_PRIVADA, DIAL_KEYS, STORAGE_KEYS } from './constants';
import { useSipConnection } from './hooks/useSipConnection';
import { useCallManager } from './hooks/useCallManager';
import { useCameraSystem } from './hooks/useCameraSystem';
import { useRelayController } from './hooks/useRelayController';
import { useAudioControls } from './hooks/useAudioControls';
import { useCallHistory } from './hooks/useCallHistory';
import { useContactsManager } from './hooks/useContactsManager';
import { usePrivadaSelector } from './hooks/usePrivadaSelector';

export default function AccesPhonePro({
  onIncomingCall,
  onCallAnswered,
  onCallEnded,
  onPrivadaIdentified,
  onRelayActivated,
  onSnapshotCaptured,
}: AccesPhoneProProps) {
  // --- UI State ---
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dialpad');
  const [showSettings, setShowSettings] = useState(false);
  const [secondaryView, setSecondaryView] = useState<'history' | 'contacts' | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: string }[]>([]);

  // --- Config State ---
  const [videoConfig, setVideoConfig] = useState<VideoConfig>(DEFAULT_VIDEO);
  const [privadaConfig, setPrivadaConfig] = useState<PrivadaConfig>(DEFAULT_PRIVADA);

  // Load configs
  useEffect(() => {
    try {
      const vc = localStorage.getItem(STORAGE_KEYS.VIDEO);
      if (vc) setVideoConfig(JSON.parse(vc));
      const pc = localStorage.getItem(STORAGE_KEYS.PRIVADA);
      if (pc) setPrivadaConfig(JSON.parse(pc));
    } catch {}
  }, []);

  // --- Hooks ---
  const sip = useSipConnection();
  const audio = useAudioControls();
  const callHistory = useCallHistory();
  const contacts = useContactsManager();
  const cameraSystem = useCameraSystem(videoConfig);
  const relayController = useRelayController(privadaConfig);
  const privadaSelector = usePrivadaSelector(privadaConfig);

  const call = useCallManager({
    ua: sip.ua,
    sipDomain: sip.sipConfig.domain,
    speakerVolume: audio.speakerVolume,
    onIncomingCall,
    onCallAnswered,
    onCallEnded,
  });

  // --- Toast helper ---
  const showToast = useCallback((msg: string, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // --- Wire up SIP incoming sessions ---
  useEffect(() => {
    sip.setOnNewSession((session: any) => {
      const num = call.handleIncomingSession(session);
      setExpanded(true);

      // Lookup privada by CallerID
      privadaSelector.lookupByCaller(num).then(async (result) => {
        if (result) {
          onPrivadaIdentified?.({
            id: result.privada_id,
            nombre: result.nombre,
            contacto: result.contacto,
            telefono: result.telefono,
          });
          showToast(`Privada: ${result.nombre}`, 'success');

          // Load cameras and relays
          if (result.videos?.length > 0) {
            cameraSystem.loadPrivadaCameras(result.videos);
            setActiveTab('cameras');
          }
          if (result.relays?.length > 0) {
            relayController.loadRelays(result.privada_id);
          }
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sip.setOnNewSession, call.handleIncomingSession, privadaSelector.lookupByCaller]);

  // --- Handle privada selection from dropdown ---
  const handlePrivadaSelect = useCallback(async (id: number) => {
    if (!id) {
      privadaSelector.clearSelection();
      cameraSystem.setCameras([]);
      relayController.clearRelays();
      return;
    }
    const result = await privadaSelector.selectPrivada(id);
    if (result.videos.length > 0) {
      cameraSystem.loadPrivadaCameras(result.videos);
      showToast(`${result.videos.length} camara(s) cargadas`, 'success');
    }
    if (result.relays.length > 0) {
      relayController.loadRelays(id);
      showToast(`${result.relays.length} relay(s) cargados`, 'success');
    }
  }, [privadaSelector, cameraSystem, relayController, showToast]);

  // --- Handle answer with auto-snapshot ---
  const handleAnswer = useCallback(() => {
    call.answerCall();
    if (videoConfig.autoSnapshot) {
      cameraSystem.autoSnapshotAll((info) => {
        onSnapshotCaptured?.(info);
        showToast(`Snapshot: ${info.camName}`, 'success');
      });
    }
  }, [call, videoConfig.autoSnapshot, cameraSystem, onSnapshotCaptured, showToast]);

  // --- Handle relay activation ---
  const handleRelayActivate = useCallback(async (relay: typeof relayController.relays[0]) => {
    const success = await relayController.activateRelay(relay, (info) => {
      onRelayActivated?.(info);
    });
    showToast(
      success ? `Relay activado: ${relay.alias}` : `Error relay: ${relay.alias}`,
      success ? 'success' : 'error'
    );
  }, [relayController, onRelayActivated, showToast]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!expanded) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.key >= '0' && e.key <= '9') call.addDigit(e.key);
      else if (e.key === '*' || e.key === '#') call.addDigit(e.key);
      else if (e.key === 'Backspace') { e.preventDefault(); call.deleteDigit(); }
      else if (e.key === 'Enter' && call.phoneNumber) call.makeCall();
      else if (e.key === 'Escape' && call.callState !== 'idle') call.hangupCall();
      else if (e.key.toLowerCase() === 'v') { cameraSystem.setShowVideo(prev => !prev); setActiveTab('cameras'); }
      else if (e.key.toLowerCase() === 'r') relayController.setShowRelays(prev => !prev);
      else if (e.key.toLowerCase() === 'm' && call.callState === 'active') call.toggleMute();
      else if (e.key.toLowerCase() === 'g') cameraSystem.toggleGrid();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expanded, call, cameraSystem, relayController]);

  // --- Settings save ---
  const handleSaveSettings = useCallback((sipCfg: typeof sip.sipConfig, vidCfg: VideoConfig, privCfg: PrivadaConfig) => {
    sip.saveConfig(sipCfg);
    setVideoConfig(vidCfg);
    setPrivadaConfig(privCfg);
    localStorage.setItem(STORAGE_KEYS.VIDEO, JSON.stringify(vidCfg));
    localStorage.setItem(STORAGE_KEYS.PRIVADA, JSON.stringify(privCfg));
    setShowSettings(false);
    sip.connect();
    privadaSelector.loadPrivadas?.();
    showToast('Configuracion guardada', 'success');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sip, showToast]);

  // --- Format helpers ---
  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const formatPhone = (n: string) => {
    if (!n) return '';
    if (n.length <= 3) return n;
    if (n.length <= 6) return `${n.slice(0, 3)} ${n.slice(3)}`;
    if (n.length <= 10) return `${n.slice(0, 2)} ${n.slice(2, 6)} ${n.slice(6)}`;
    return n;
  };

  // --- Status helpers ---
  const statusColor = sip.status === 'registered' ? 'bg-green-500'
    : sip.status === 'connecting' || sip.status === 'registering' || sip.status === 'reconnecting' ? 'bg-yellow-500'
    : sip.status === 'error' ? 'bg-red-500' : 'bg-gray-500';

  const statusText = {
    disconnected: 'Desconectado',
    connecting: 'Conectando...',
    registering: 'Registrando...',
    registered: 'Conectado',
    error: 'Error',
    reconnecting: 'Reconectando...',
  }[sip.status];

  const buttonColor = call.callState === 'active' ? 'bg-blue-600 hover:bg-blue-700'
    : call.callState === 'ringing' ? 'bg-green-500 animate-bounce'
    : call.callState === 'calling' ? 'bg-yellow-600'
    : sip.status === 'registered' ? 'bg-green-600 hover:bg-green-700'
    : 'bg-gray-700 hover:bg-gray-600';

  // ==============================
  // RENDER
  // ==============================
  return (
    <>
      {/* Toast Notifications */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10003] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg animate-in slide-in-from-top ${
            t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-gray-800'
          }`}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`fixed bottom-4 right-4 z-50 rounded-full p-3.5 shadow-lg transition-all ${buttonColor} text-white`}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
        <span className={`absolute top-0 right-0 h-3 w-3 rounded-full border-2 border-white ${statusColor}`} />
        {call.callState === 'ringing' && (
          <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            {formatPhone(call.callerInfo).slice(0, 8)}
          </span>
        )}
      </button>

      {/* Incoming Call Overlay */}
      {call.callState === 'ringing' && (
        <div className="fixed top-5 right-5 z-[10001] min-w-[320px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top">
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-5 text-center">
            <p className="text-xs font-medium mb-2 opacity-90">Llamada Entrante</p>
            <p className="text-2xl font-bold">{formatPhone(call.callerInfo)}</p>
            {privadaSelector.privadaInfo && (
              <p className="mt-2 text-sm bg-white/20 inline-block px-3 py-1 rounded-lg">
                {privadaSelector.privadaInfo}
              </p>
            )}
          </div>
          <div className="flex gap-3 p-4 bg-gray-50">
            <button onClick={handleAnswer}
              className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-all">
              Contestar
            </button>
            <button onClick={call.rejectCall}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-xl font-bold text-sm transition-all">
              Rechazar
            </button>
          </div>
        </div>
      )}

      {/* Main Panel */}
      {expanded && (
        <div className="fixed bottom-20 right-4 z-50 w-[380px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-950 to-indigo-800 text-white p-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-400 rounded-lg flex items-center justify-center text-xs font-extrabold">
                  AP
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-wide">ACCESS PHONE PRO</h1>
                  <span className="text-[9px] opacity-70 uppercase tracking-wider">Monitoreo v3.0</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setShowSettings(true)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-xs transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button onClick={() => setExpanded(false)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-xs transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between bg-white/10 px-2.5 py-1 rounded-full">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${statusColor} ${sip.status === 'registered' ? 'shadow-[0_0_6px_rgba(16,185,129,0.5)]' : ''}`} />
                <span className="text-[10px]">{statusText}</span>
              </div>
              <span className="text-[9px] bg-white/15 px-2 py-0.5 rounded-full font-semibold">
                {sip.sipConfig.extension ? `Ext ${sip.sipConfig.extension}` : '--'}
              </span>
            </div>
          </div>

          {/* Privada Selector */}
          <div className="bg-gray-900 px-3 py-2 flex items-center gap-2 flex-shrink-0">
            <span className="text-gray-400 text-[10px] font-bold uppercase whitespace-nowrap tracking-wide">Privada:</span>
            <select
              value={privadaSelector.selectedId || ''}
              onChange={(e) => handlePrivadaSelect(Number(e.target.value))}
              className="flex-1 bg-white/10 border border-white/15 text-white text-[11px] px-2 py-1 rounded-lg outline-none"
            >
              <option value="" className="bg-gray-800">-- Seleccionar --</option>
              {privadaSelector.privadas.map(p => (
                <option key={p.id} value={p.id} className="bg-gray-800">{p.nombre}</option>
              ))}
            </select>
          </div>
          {privadaSelector.privadaInfo && (
            <div className="bg-green-50 px-3 py-1.5 flex items-center justify-between border-b border-green-200 flex-shrink-0">
              <span className="text-green-700 text-[10px] font-semibold">{privadaSelector.privadaInfo}</span>
              <span className="text-gray-500 text-[9px]">{cameraSystem.cameras.length} cam(s)</span>
            </div>
          )}

          {/* Active Call Banner */}
          {call.callState === 'active' && (
            <div className="bg-blue-50 border-b border-blue-200 px-3 py-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-blue-700 text-xs font-semibold">En llamada</span>
                <span className="text-blue-600 text-xs font-mono">{formatTime(call.callDuration)}</span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={call.toggleMute}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${call.isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                  {call.isMuted ? 'MIC OFF' : 'MIC'}
                </button>
                <button onClick={call.hangupCall}
                  className="px-2 py-1 rounded bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 transition-all">
                  COLGAR
                </button>
              </div>
            </div>
          )}

          {/* Calling Banner */}
          {call.callState === 'calling' && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-3 py-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-yellow-700 text-xs font-semibold">Llamando... {formatPhone(call.phoneNumber)}</span>
              </div>
              <button onClick={call.hangupCall}
                className="px-2 py-1 rounded bg-red-500 text-white text-[10px] font-bold hover:bg-red-600 transition-all">
                CANCELAR
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex bg-gray-50 border-b border-gray-200 flex-shrink-0">
            {([
              { id: 'dialpad' as const, icon: '📱', label: 'Teclado' },
              { id: 'cameras' as const, icon: '📹', label: 'Camaras' },
              { id: 'audio' as const, icon: '🎵', label: 'Audio' },
              { id: 'relays' as const, icon: '🔓', label: 'Relays' },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSecondaryView(null); }}
                className={`flex-1 py-2 text-center text-[10px] font-medium transition-all relative ${
                  activeTab === tab.id && !secondaryView ? 'text-orange-500 font-bold' : 'text-gray-500'
                }`}
              >
                <span className="text-sm block">{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab === tab.id && !secondaryView && (
                  <span className="absolute bottom-0 left-[10%] right-[10%] h-0.5 bg-orange-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0">

            {/* DIALPAD TAB */}
            {activeTab === 'dialpad' && !secondaryView && (
              <div>
                {/* Display */}
                <div className="px-4 py-3 bg-gradient-to-b from-gray-50 to-gray-100 border-b border-gray-200 text-center min-h-[48px] flex items-center justify-center">
                  <span className="text-2xl font-light tracking-[3px] font-mono text-gray-800">
                    {formatPhone(call.phoneNumber) || '\u00A0'}
                  </span>
                </div>
                {/* Dialpad Grid */}
                <div className="grid grid-cols-3 gap-1.5 p-3">
                  {DIAL_KEYS.map(k => (
                    <button key={k.digit} onClick={() => call.addDigit(k.digit)}
                      className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl py-3 text-xl font-medium text-gray-800 transition-all active:scale-95 flex flex-col items-center gap-0.5">
                      {k.digit}
                      {k.letters && <span className="text-[8px] text-gray-400 uppercase tracking-wider">{k.letters}</span>}
                    </button>
                  ))}
                </div>
                {/* Action buttons */}
                <div className="flex items-center justify-center gap-3 px-4 py-2 bg-gray-50">
                  <button onClick={call.deleteDigit}
                    className="w-12 h-10 rounded-xl bg-gray-500 hover:bg-gray-600 text-white flex items-center justify-center transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                    </svg>
                  </button>
                  {call.callState === 'idle' ? (
                    <button onClick={() => call.makeCall()}
                      className="w-12 h-10 rounded-xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                    </button>
                  ) : (
                    <button onClick={call.hangupCall}
                      className="w-12 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all">
                      <svg className="w-5 h-5 rotate-[135deg]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* CAMERAS TAB */}
            {activeTab === 'cameras' && !secondaryView && (
              <div className="p-2 bg-gray-950">
                {cameraSystem.cameras.length === 0 ? (
                  <div className="text-center text-gray-500 py-10 text-sm">
                    Seleccione una privada para ver camaras
                  </div>
                ) : cameraSystem.gridView && cameraSystem.cameras.length > 1 ? (
                  /* Grid View */
                  <div className="grid grid-cols-2 gap-1.5">
                    {cameraSystem.cameras.map((cam, i) => (
                      <div key={cam.channel}
                        onClick={() => { cameraSystem.selectCamera(i); cameraSystem.toggleGrid(); }}
                        className={`relative aspect-video bg-black rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                          i === cameraSystem.selectedCamera ? 'border-orange-500' : 'border-transparent hover:border-orange-300'
                        }`}>
                        {cameraSystem.gridImages[cam.channel] ? (
                          <img src={cameraSystem.gridImages[cam.channel]} alt={cam.alias} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">Sin senal</div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
                          <span className="text-white text-[9px] font-semibold">{cam.alias}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Single Camera View */
                  <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                    {cameraSystem.cameraImage ? (
                      <img src={cameraSystem.cameraImage} alt="Camara"
                        className={`w-full h-full object-cover transition-opacity ${cameraSystem.isLoading ? 'opacity-30' : 'opacity-100'}`} />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                        <span className="text-4xl mb-2 opacity-50">📹</span>
                        <span className="text-xs">{cameraSystem.hasError ? 'Sin senal' : 'Cargando...'}</span>
                      </div>
                    )}
                    {/* Overlay controls */}
                    <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/70 to-transparent flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {!cameraSystem.isPaused && !cameraSystem.hasError && (
                          <span className="bg-red-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded animate-pulse tracking-wider">LIVE</span>
                        )}
                        <span className="text-white text-[11px] font-semibold">
                          {cameraSystem.cameras[cameraSystem.selectedCamera]?.alias || 'Camara'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={cameraSystem.togglePause}
                          className={`w-6 h-6 rounded text-white text-[10px] flex items-center justify-center transition-all ${cameraSystem.isPaused ? 'bg-orange-500' : 'bg-white/15 hover:bg-white/30'}`}>
                          {cameraSystem.isPaused ? '▶' : '⏸'}
                        </button>
                        <button onClick={() => cameraSystem.captureSnapshot(onSnapshotCaptured)}
                          className="w-6 h-6 rounded bg-white/15 hover:bg-white/30 text-white text-[10px] flex items-center justify-center transition-all">
                          📸
                        </button>
                        {cameraSystem.cameras.length > 1 && (
                          <button onClick={cameraSystem.toggleGrid}
                            className="w-6 h-6 rounded bg-white/15 hover:bg-white/30 text-white text-[10px] flex items-center justify-center transition-all">
                            ⊞
                          </button>
                        )}
                      </div>
                    </div>
                    {/* FPS indicator */}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-gray-300 text-[9px] px-2 py-0.5 rounded font-mono">
                      {cameraSystem.isPaused ? 'PAUSADO' : cameraSystem.hasError ? 'ERROR' : `${cameraSystem.fps} FPS`}
                    </div>
                  </div>
                )}
                {/* Camera selector buttons */}
                {cameraSystem.cameras.length > 1 && !cameraSystem.gridView && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {cameraSystem.cameras.map((cam, i) => (
                      <button key={cam.channel}
                        onClick={() => cameraSystem.selectCamera(i)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                          i === cameraSystem.selectedCamera
                            ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white border-transparent'
                            : 'bg-white/10 text-white border-white/15 hover:border-white/30'
                        }`}>
                        {cam.alias}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AUDIO TAB */}
            {activeTab === 'audio' && !secondaryView && (
              <div className="p-4 space-y-4">
                {[
                  { label: 'Microfono', icon: '🎤', value: audio.micVolume, onChange: audio.updateMicVolume },
                  { label: 'Parlante', icon: '🔊', value: audio.speakerVolume, onChange: audio.updateSpeakerVolume },
                  { label: 'Ringtone', icon: '🔔', value: audio.ringtoneVolume, onChange: audio.updateRingtoneVolume },
                ].map(ctrl => (
                  <div key={ctrl.label} className="flex items-center gap-3">
                    <span className="text-sm min-w-[24px] text-center">{ctrl.icon}</span>
                    <input type="range" min={0} max={100} value={ctrl.value}
                      onChange={(e) => ctrl.onChange(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-200 rounded-full outline-none appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(255,107,53,0.3)]" />
                    <span className="text-[10px] text-gray-500 min-w-[32px] text-right font-mono">{ctrl.value}%</span>
                  </div>
                ))}
                {call.callState === 'active' && (
                  <button onClick={call.toggleMute}
                    className={`w-full py-2 rounded-lg font-semibold text-sm transition-all ${
                      call.isMuted ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
                    }`}>
                    {call.isMuted ? '🔇 Activar Microfono' : '🎤 Silenciar Microfono'}
                  </button>
                )}
                {sip.status === 'disconnected' && (
                  <button onClick={sip.connect}
                    className="w-full py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-all">
                    Conectar SIP
                  </button>
                )}
                {sip.status === 'registered' && (
                  <button onClick={sip.disconnect}
                    className="w-full py-2 rounded-lg bg-gray-400 hover:bg-gray-500 text-white font-semibold text-sm transition-all">
                    Desconectar SIP
                  </button>
                )}
              </div>
            )}

            {/* RELAYS TAB */}
            {activeTab === 'relays' && !secondaryView && (
              <div className="p-3">
                {relayController.relays.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-sm">
                    Seleccione una privada para ver relays
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                      🔓 Relays / Apertura Remota
                    </div>
                    {relayController.relays.map(relay => (
                      <button key={relay.id}
                        onClick={() => handleRelayActivate(relay)}
                        disabled={relayController.activatingId !== null}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                          relayController.activatingId === relay.id
                            ? 'bg-green-50 border-green-300'
                            : 'bg-gray-50 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                        }`}>
                        <div className="text-left">
                          <div className="text-sm font-semibold text-gray-800">{relay.alias}</div>
                          <div className="text-[9px] text-gray-400 font-mono">{relay.dns}:{relay.puerto || '1883'}</div>
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${
                          relayController.activatingId === relay.id
                            ? 'bg-green-500 text-white'
                            : 'bg-gradient-to-br from-orange-500 to-orange-400 text-white'
                        }`}>
                          {relayController.activatingId === relay.id ? '✓' : '🔓'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HISTORY VIEW */}
            {secondaryView === 'history' && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700">Historial de llamadas</h3>
                  {callHistory.history.length > 0 && (
                    <button onClick={callHistory.clearHistory} className="text-[10px] text-red-500 hover:underline">Limpiar</button>
                  )}
                </div>
                {callHistory.history.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-sm">No hay llamadas registradas</div>
                ) : (
                  <div className="space-y-1.5">
                    {callHistory.history.map(entry => (
                      <div key={entry.id}
                        onClick={() => { call.setPhoneNumber(entry.number); setActiveTab('dialpad'); setSecondaryView(null); }}
                        className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100 hover:border-orange-300 cursor-pointer transition-all">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${
                          entry.type === 'incoming' ? 'bg-green-50 text-green-500'
                          : entry.type === 'outgoing' ? 'bg-blue-50 text-blue-500'
                          : 'bg-red-50 text-red-500'
                        }`}>
                          {entry.type === 'incoming' ? '📞↓' : entry.type === 'outgoing' ? '📞→' : '📞✗'}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-gray-800">
                            {entry.contactName || formatPhone(entry.number)}
                          </div>
                          {entry.privadaName && (
                            <div className="text-[9px] text-gray-400">{entry.privadaName}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-gray-400">
                            {new Date(entry.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {entry.duration && entry.duration > 0 && (
                            <div className="text-[10px] text-gray-500">{formatTime(entry.duration)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CONTACTS VIEW */}
            {secondaryView === 'contacts' && (
              <div className="p-3">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Contactos</h3>
                {contacts.contacts.length === 0 ? (
                  <div className="text-center text-gray-400 py-10 text-sm">Sin contactos</div>
                ) : (
                  <div className="space-y-1.5">
                    {contacts.contacts.map(c => (
                      <div key={c.id}
                        onClick={() => { call.setPhoneNumber(c.number); setActiveTab('dialpad'); setSecondaryView(null); }}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 hover:border-orange-300 cursor-pointer transition-all">
                        <div>
                          <div className="text-xs font-semibold text-gray-800">{c.name}</div>
                          <div className="text-[11px] text-gray-500">{formatPhone(c.number)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                            c.type === 'vip' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'
                          }`}>{c.type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer: History & Contacts links */}
          <div className="flex border-t border-gray-200 flex-shrink-0">
            <button
              onClick={() => setSecondaryView(secondaryView === 'history' ? null : 'history')}
              className={`flex-1 py-2 text-[10px] font-medium transition-all ${
                secondaryView === 'history' ? 'text-orange-500 bg-orange-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              📋 Historial ({callHistory.history.length})
            </button>
            <button
              onClick={() => setSecondaryView(secondaryView === 'contacts' ? null : 'contacts')}
              className={`flex-1 py-2 text-[10px] font-medium transition-all ${
                secondaryView === 'contacts' ? 'text-orange-500 bg-orange-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              👥 Contactos ({contacts.contacts.length})
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          sipConfig={sip.sipConfig}
          videoConfig={videoConfig}
          privadaConfig={privadaConfig}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Hidden audio elements */}
      <audio ref={call.remoteAudioRef} autoPlay />
      <audio ref={call.ringtoneRef} loop>
        <source src="/syscbctlmonitoreo/softphone/ringtone.mp3" type="audio/mpeg" />
      </audio>
    </>
  );
}

// ============================================================
// Settings Modal (inline component)
// ============================================================
function SettingsModal({
  sipConfig,
  videoConfig,
  privadaConfig,
  onSave,
  onClose,
}: {
  sipConfig: any;
  videoConfig: VideoConfig;
  privadaConfig: PrivadaConfig;
  onSave: (sip: any, video: VideoConfig, privada: PrivadaConfig) => void;
  onClose: () => void;
}) {
  const [sip, setSip] = useState({ ...sipConfig });
  const [video, setVideo] = useState({ ...videoConfig });
  const [privada, setPrivada] = useState({ ...privadaConfig });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-start justify-center pt-12"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-[92%] max-w-[400px] rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-indigo-950 to-indigo-800 text-white px-5 py-4 flex justify-between items-center">
          <h2 className="text-base font-semibold">Configuracion</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-sm">
            ×
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Conexion SIP</div>
          {[
            { label: 'Servidor WebSocket', key: 'wsServer', placeholder: 'wss://accessbotpbx.info:8089/ws' },
            { label: 'Extension', key: 'extension', placeholder: '103' },
            { label: 'Contrasena', key: 'password', placeholder: 'Contrasena SIP', type: 'password' },
            { label: 'Dominio SIP', key: 'domain', placeholder: 'accessbotpbx.info' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={(sip as any)[f.key] || ''}
                onChange={(e) => setSip({ ...sip, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-orange-400 focus:bg-white outline-none transition-all"
              />
            </div>
          ))}

          <hr className="border-gray-200" />
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Video</div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">URL Proxy Camaras</label>
            <input type="text" value={video.proxyUrl}
              onChange={(e) => setVideo({ ...video, proxyUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-orange-400 focus:bg-white outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Refresh Rate (ms)</label>
            <input type="number" value={video.refreshRate} min={100} max={2000}
              onChange={(e) => setVideo({ ...video, refreshRate: Number(e.target.value) || 500 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-orange-400 focus:bg-white outline-none transition-all" />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={video.autoShowOnCall}
              onChange={(e) => setVideo({ ...video, autoShowOnCall: e.target.checked })} />
            Video automatico en llamadas
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={video.autoSnapshot}
              onChange={(e) => setVideo({ ...video, autoSnapshot: e.target.checked })} />
            Auto-snapshot al contestar
          </label>

          <hr className="border-gray-200" />
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">MQTT / Relays</div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">URL API Privada</label>
            <input type="text" value={privada.apiUrl}
              onChange={(e) => setPrivada({ ...privada, apiUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-orange-400 focus:bg-white outline-none transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">URL MQTT Relay</label>
            <input type="text" value={privada.mqttRelayUrl}
              onChange={(e) => setPrivada({ ...privada, mqttRelayUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:border-orange-400 focus:bg-white outline-none transition-all" />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={privada.autoLookupCaller}
              onChange={(e) => setPrivada({ ...privada, autoLookupCaller: e.target.checked })} />
            Identificar privada por CallerID
          </label>

          <button onClick={() => onSave(sip, video, privada)}
            className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all">
            Guardar y Conectar
          </button>
        </div>
      </div>
    </div>
  );
}
