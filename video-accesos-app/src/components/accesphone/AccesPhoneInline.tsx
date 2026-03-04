"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Phone,
  Settings,
  RefreshCw,
  MicOff,
  ShieldAlert,
} from "lucide-react";
import type { AccesPhoneInlineProps, AccesPhoneInlineConfig } from "./types";
import { DEFAULT_INLINE_CONFIG, loadConfig, saveConfigToStorage } from "./constants";
import { useSipConnection } from "./hooks/useSipConnection";
import { useCallManager } from "./hooks/useCallManager";
import { useAudioControls } from "./hooks/useAudioControls";
import DialpadTab from "./components/DialpadTab";
import IncomingCallOverlay from "./components/IncomingCallOverlay";
import SettingsModal from "./components/SettingsModal";

// ---------------------------------------------------------------------------
// Component - Inline softphone embebido en el layout de la pagina
// ---------------------------------------------------------------------------

export default function AccesPhoneInline({
  onIncomingCall,
  onCallAnswered,
  onCallEnded,
}: AccesPhoneInlineProps) {
  const [config, setConfig] = useState<AccesPhoneInlineConfig>(DEFAULT_INLINE_CONFIG);

  // Stable ref for onIncomingCall
  const onIncomingCallRef = useRef(onIncomingCall);
  useEffect(() => {
    onIncomingCallRef.current = onIncomingCall;
  }, [onIncomingCall]);

  // Load config on mount
  useEffect(() => {
    setConfig(loadConfig(DEFAULT_INLINE_CONFIG));
  }, []);

  // Temporary speakerOn state used to initialise useCallManager
  const [speakerOnState, setSpeakerOnState] = useState(true);

  // --- SIP Connection ---
  const sip = useSipConnection({
    defaults: DEFAULT_INLINE_CONFIG,
    userAgent: "Access Phone v3.1",
    onNewIncomingSession: useCallback(
      (session, callerNumber) => {
        handleIncomingSessionRef.current?.(session, callerNumber);
      },
      []
    ),
  });

  // --- Call Manager ---
  const callManager = useCallManager({
    uaRef: sip.uaRef,
    connected: sip.connected,
    sipDomain: config.sipDomain,
    onCallAnswered,
    onCallEnded,
    speakerOn: speakerOnState,
    logPrefix: "AccesPhoneInline",
  });

  // Wire up the incoming session handler ref
  const handleIncomingSessionRef = useRef(callManager.handleIncomingSession);
  useEffect(() => {
    handleIncomingSessionRef.current = (session, callerNumber) => {
      callManager.handleIncomingSession(session, callerNumber);
      onIncomingCallRef.current?.(callerNumber);
    };
  }, [callManager.handleIncomingSession]);

  // --- Audio Controls ---
  const audioControls = useAudioControls({
    remoteAudioRef: callManager.remoteAudioRef,
    ringtoneRef: callManager.ringtoneRef,
    localStreamRef: callManager.localStreamRef,
  });

  // Keep speakerOnState in sync with audioControls.speakerOn
  useEffect(() => {
    setSpeakerOnState(audioControls.speakerOn);
  }, [audioControls.speakerOn]);

  // Override disconnectSIP to also cleanup call
  const disconnectSIP = useCallback(() => {
    sip.disconnectSIP();
    callManager.cleanupCall();
  }, [sip, callManager]);

  // -----------------------------------------------------------
  // Settings
  // -----------------------------------------------------------
  const saveSettings = useCallback(() => {
    saveConfigToStorage(config);
    sip.configRef.current = config;
    sip.setShowSettings(false);
    if (sip.uaRef.current) {
      disconnectSIP();
    }
    setTimeout(() => {
      sip.connectSIP();
    }, 500);
  }, [config, sip, disconnectSIP]);

  // -----------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------
  const statusColor = sip.connected
    ? "bg-green-500"
    : sip.connecting || sip.reconnecting
      ? "bg-yellow-500 animate-pulse"
      : "bg-red-500";

  return (
    <>
      {/* Hidden audio elements */}
      <audio ref={callManager.remoteAudioRef} autoPlay />
      <audio autoPlay muted />
      <audio ref={callManager.ringtoneRef} src="/sounds/ringtone.wav" preload="auto" />

      {/* ============================================================= */}
      {/* INLINE SOFTPHONE - embebido en el layout de la pagina          */}
      {/* ============================================================= */}

      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          <span className="text-sm font-bold">AccesPhone</span>
          <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
        </div>
        <button
          onClick={() => sip.setShowSettings(true)}
          className="p-1.5 rounded-md hover:bg-gray-700 transition"
          title="Configuracion"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Status bar */}
      <div className={`px-4 py-1.5 border-b border-gray-200 text-xs flex items-center justify-between ${
        sip.networkOffline ? "bg-red-50 text-red-700"
        : sip.reconnectExhausted ? "bg-red-50 text-red-600"
        : sip.reconnecting ? "bg-yellow-50 text-yellow-700"
        : "bg-gray-50 text-gray-500"
      }`}>
        <span className="flex items-center gap-1.5">
          {sip.reconnecting && <RefreshCw className="h-3 w-3 animate-spin" />}
          {sip.statusText}
          {sip.reconnectAttempt > 0 && !sip.connected && (
            <span className="text-yellow-600 font-medium">
              (intento {sip.reconnectAttempt})
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {sip.reconnectExhausted && (
            <button
              onClick={sip.connectSIP}
              className="text-green-600 hover:text-green-800 text-xs underline font-medium"
            >
              Reintentar
            </button>
          )}
          {sip.reconnecting && (
            <button
              onClick={() => {
                sip.cancelReconnect();
                sip.manualDisconnectRef.current = true;
                sip.setStatusText("Desconectado");
              }}
              className="text-yellow-600 hover:text-yellow-800 text-xs underline"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* HTTPS security warning */}
      {sip.isInsecureContext && (
        <div className="bg-red-50 border-b-2 border-red-400 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">
                Conexion no segura (HTTP)
              </p>
              <p className="text-xs text-red-600">
                El navegador bloquea el microfono en conexiones HTTP. Se requiere HTTPS para usar el softphone.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Microphone permission warning */}
      {callManager.micWarning && !sip.isInsecureContext && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <MicOff className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">
                Sin acceso al microfono
              </p>
              <p className="text-xs text-red-600">
                Puedes escuchar pero no te escucharan. Permite el acceso al microfono para hablar.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              const ok = await callManager.requestMicPermission();
              if (!ok) {
                alert(
                  "No se pudo acceder al microfono.\n\n" +
                  "Para habilitarlo:\n" +
                  "1. Haz clic en el icono de candado/info en la barra de direcciones del navegador\n" +
                  "2. Busca 'Microfono' y cambialo a 'Permitir'\n" +
                  "3. Recarga la pagina (F5)"
                );
              }
            }}
            className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 transition"
          >
            Permitir acceso al microfono
          </button>
        </div>
      )}

      {/* Mic permission status when denied but warning dismissed */}
      {callManager.micPermission === "denied" && !callManager.micWarning && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2">
          <MicOff className="h-4 w-4 text-yellow-600" />
          <span className="text-xs text-yellow-700">
            Microfono bloqueado - haz clic en el candado de la barra de direcciones para habilitarlo
          </span>
        </div>
      )}

      {/* Call in progress / Incoming call */}
      {(callManager.inCall || callManager.ringing) && callManager.callInfo && (
        <IncomingCallOverlay
          callInfo={callManager.callInfo}
          ringing={callManager.ringing}
          inCall={callManager.inCall}
          callDuration={callManager.callDuration}
          muted={callManager.muted}
          speakerOn={audioControls.speakerOn}
          answerCall={callManager.answerCall}
          rejectCall={callManager.rejectCall}
          hangupCall={callManager.hangupCall}
          toggleMute={callManager.toggleMute}
          toggleSpeaker={audioControls.toggleSpeaker}
          formatDuration={callManager.formatDuration}
          variant="inline"
        />
      )}

      {/* Dialpad (when not in call) */}
      <DialpadTab
        dialNumber={callManager.dialNumber}
        setDialNumber={callManager.setDialNumber}
        dialpadPress={callManager.dialpadPress}
        makeCall={callManager.makeCall}
        inCall={callManager.inCall}
        ringing={callManager.ringing}
        connected={sip.connected}
        variant="inline"
      />

      {/* Connect/Disconnect button */}
      <div className="px-4 pb-4 pt-2">
        {sip.connected ? (
          <button
            onClick={disconnectSIP}
            className="w-full rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition"
          >
            Desconectar
          </button>
        ) : sip.networkOffline ? (
          <div className="w-full rounded-lg bg-red-100 border border-red-300 px-3 py-2.5 text-sm font-medium text-red-700 flex items-center justify-center gap-2">
            Sin conexion de red — se reconectara automaticamente
          </div>
        ) : sip.reconnectExhausted ? (
          <button
            onClick={sip.connectSIP}
            className="w-full rounded-lg bg-orange-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-orange-700 transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar conexion
          </button>
        ) : sip.reconnecting ? (
          <button
            onClick={() => {
              sip.cancelReconnect();
              sip.connectSIP();
            }}
            className="w-full rounded-lg bg-yellow-500 px-3 py-2.5 text-sm font-medium text-white hover:bg-yellow-600 transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4 animate-spin" />
            Reconectando... (clic para forzar)
          </button>
        ) : sip.isInsecureContext ? (
          <div className="w-full rounded-lg bg-red-100 border border-red-300 px-3 py-2.5 text-sm font-medium text-red-700 flex items-center justify-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            HTTPS requerido para usar el softphone
          </div>
        ) : (
          <button
            onClick={sip.connectSIP}
            disabled={sip.connecting}
            className="w-full rounded-lg bg-green-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition"
          >
            {sip.connecting ? "Conectando..." : "Conectar SIP"}
          </button>
        )}
      </div>

      {/* Settings Modal */}
      {sip.showSettings && (
        <SettingsModal
          config={config}
          setConfig={(cfg) => setConfig(cfg as AccesPhoneInlineConfig)}
          onClose={() => sip.setShowSettings(false)}
          onSave={saveSettings}
          variant="inline"
        />
      )}
    </>
  );
}
