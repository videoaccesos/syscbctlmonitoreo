"use client";

import {
  Phone,
  Settings,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Unplug,
  Wifi,
  MicOff,
  Volume2,
  ShieldAlert,
} from "lucide-react";
import type { CallInfo } from "../types";
import DialpadTab from "./DialpadTab";
import IncomingCallOverlay from "./IncomingCallOverlay";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PhonePanelProps {
  // Connection state
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  reconnectAttempt: number;
  statusText: string;
  statusColor: string;
  isInsecureContext: boolean;

  // Call state
  inCall: boolean;
  callInfo: CallInfo | null;
  ringing: boolean;
  callDuration: number;
  muted: boolean;
  dialNumber: string;
  setDialNumber: (value: string) => void;

  // Mic state
  micWarning: boolean;
  micPermission: "granted" | "denied" | "prompt" | "unknown";

  // Audio controls
  speakerOn: boolean;
  toggleSpeaker: () => void;
  showAudioControls: boolean;
  setShowAudioControls: (v: boolean) => void;
  micVolume: number;
  updateMicVolume: (val: number) => void;
  speakerVolume: number;
  updateSpeakerVolume: (val: number) => void;
  ringtoneVolume: number;
  updateRingtoneVolume: (val: number) => void;

  // Actions
  connectSIP: () => void;
  disconnectSIP: () => void;
  cancelReconnect: () => void;
  setShowSettings: (v: boolean) => void;
  setMinimized: (v: boolean) => void;
  answerCall: () => void;
  rejectCall: () => void;
  hangupCall: () => void;
  toggleMute: () => void;
  makeCall: () => void;
  dialpadPress: (digit: string) => void;
  requestMicPermission: () => Promise<boolean>;
  formatDuration: (s: number) => string;
  manualDisconnectRef: React.MutableRefObject<boolean>;
}

// ---------------------------------------------------------------------------
// Component - Expanded floating panel
// ---------------------------------------------------------------------------

export default function PhonePanel({
  connected,
  connecting,
  reconnecting,
  reconnectAttempt,
  statusText,
  statusColor,
  isInsecureContext,
  inCall,
  callInfo,
  ringing,
  callDuration,
  muted,
  dialNumber,
  setDialNumber,
  micWarning,
  micPermission,
  speakerOn,
  toggleSpeaker,
  showAudioControls,
  setShowAudioControls,
  micVolume,
  updateMicVolume,
  speakerVolume,
  updateSpeakerVolume,
  ringtoneVolume,
  updateRingtoneVolume,
  connectSIP,
  disconnectSIP,
  cancelReconnect,
  setShowSettings,
  setMinimized,
  answerCall,
  rejectCall,
  hangupCall,
  toggleMute,
  makeCall,
  dialpadPress,
  requestMicPermission,
  formatDuration,
  manualDisconnectRef,
}: PhonePanelProps) {
  return (
    <div className="fixed bottom-0 left-0 z-[55] w-64">
      <div className="bg-slate-900 rounded-t-xl border-t border-x border-slate-700 shadow-2xl overflow-hidden">
        {/* Header: status + settings + minimize */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-bold text-white">AccesPhone</span>
            <span className={`h-2 w-2 rounded-full ${statusColor}`} />
            <span className="text-[10px] text-gray-400 truncate max-w-[80px]">
              {statusText}
            </span>
            {reconnectAttempt > 0 && !connected && (
              <span className="text-[10px] text-yellow-500">
                ({reconnectAttempt})
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowSettings(true)}
              className="p-1 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition"
              title="Configuracion SIP"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setMinimized(true)}
              className="p-1 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition"
              title="Minimizar"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* HTTPS security warning */}
        {isInsecureContext && (
          <div className="bg-red-900/80 border-t border-red-600 px-3 py-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-400 flex-shrink-0" />
              <div>
                <span className="text-[11px] font-bold text-red-200 block">
                  Conexion no segura (HTTP)
                </span>
                <span className="text-[10px] text-red-300 block mt-0.5">
                  El navegador bloquea el acceso al microfono en HTTP. Se requiere HTTPS para usar el softphone.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Microphone permission warning */}
        {micWarning && !isInsecureContext && (
          <div className="bg-red-900/60 border-t border-red-700/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <MicOff className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="text-[11px] text-red-200">
                Sin acceso al microfono. No te escucharan.
              </span>
            </div>
            <button
              onClick={async () => {
                const ok = await requestMicPermission();
                if (!ok) {
                  alert(
                    "No se pudo acceder al microfono.\n\n" +
                    "Para habilitarlo:\n" +
                    "1. Haz clic en el icono de candado/info en la barra de direcciones\n" +
                    "2. Busca 'Microfono' y cambialo a 'Permitir'\n" +
                    "3. Recarga la pagina"
                  );
                }
              }}
              className="mt-1.5 w-full rounded-md bg-red-700 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-600 transition"
            >
              Solicitar permiso de microfono
            </button>
          </div>
        )}

        {/* Mic permission indicator when denied but no active warning */}
        {micPermission === "denied" && !micWarning && (
          <div className="bg-yellow-900/40 border-t border-yellow-700/50 px-3 py-1">
            <div className="flex items-center gap-1.5">
              <MicOff className="h-3 w-3 text-yellow-400" />
              <span className="text-[10px] text-yellow-300">
                Microfono bloqueado
              </span>
            </div>
          </div>
        )}

        {/* Call state: ringing / in call */}
        {(ringing || inCall) && callInfo && (
          <IncomingCallOverlay
            callInfo={callInfo}
            ringing={ringing}
            inCall={inCall}
            callDuration={callDuration}
            muted={muted}
            speakerOn={speakerOn}
            answerCall={answerCall}
            rejectCall={rejectCall}
            hangupCall={hangupCall}
            toggleMute={toggleMute}
            toggleSpeaker={toggleSpeaker}
            formatDuration={formatDuration}
            variant="floating"
          />
        )}

        {/* Dialpad */}
        <DialpadTab
          dialNumber={dialNumber}
          setDialNumber={setDialNumber}
          dialpadPress={dialpadPress}
          makeCall={makeCall}
          inCall={inCall}
          ringing={ringing}
          connected={connected}
          variant="floating"
        />

        {/* Audio controls (volume sliders) */}
        {connected && (
          <div className="border-t border-gray-700/50">
            <button
              onClick={() => setShowAudioControls(!showAudioControls)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 transition"
            >
              <span className="flex items-center gap-1.5">
                <Volume2 className="h-3 w-3" />
                Controles de Audio
              </span>
              {showAudioControls ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {showAudioControls && (
              <div className="px-3 pb-2 space-y-1.5">
                {/* Mic volume */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] w-4 text-center">🎙</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={micVolume}
                    onChange={(e) => updateMicVolume(Number(e.target.value))}
                    className="flex-1 h-1 rounded-full bg-gray-600 accent-orange-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-gray-400 w-8 text-right">{micVolume}%</span>
                </div>
                {/* Speaker volume */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] w-4 text-center">🔊</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={speakerVolume}
                    onChange={(e) => updateSpeakerVolume(Number(e.target.value))}
                    className="flex-1 h-1 rounded-full bg-gray-600 accent-orange-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-gray-400 w-8 text-right">{speakerVolume}%</span>
                </div>
                {/* Ringtone volume */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] w-4 text-center">🔔</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={ringtoneVolume}
                    onChange={(e) => updateRingtoneVolume(Number(e.target.value))}
                    className="flex-1 h-1 rounded-full bg-gray-600 accent-orange-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-gray-400 w-8 text-right">{ringtoneVolume}%</span>
                </div>
              </div>
            )}
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
          ) : isInsecureContext ? (
            <div className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-900/60 px-2 py-1.5 text-[11px] font-medium text-red-300">
              <ShieldAlert className="h-3 w-3" />
              HTTPS requerido
            </div>
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
  );
}
