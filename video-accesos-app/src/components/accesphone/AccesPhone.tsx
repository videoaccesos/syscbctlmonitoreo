"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { AccesPhoneProps } from "./types";
import { DEFAULT_CONFIG, loadConfig, saveConfigToStorage } from "./constants";
import { useSipConnection } from "./hooks/useSipConnection";
import { useCallManager } from "./hooks/useCallManager";
import { useAudioControls } from "./hooks/useAudioControls";
import PhoneButton from "./components/PhoneButton";
import PhonePanel from "./components/PhonePanel";
import SettingsModal from "./components/SettingsModal";
import type { AccesPhoneConfig } from "./types";

// ---------------------------------------------------------------------------
// Component - Softphone flotante esquina inferior izquierda
// ---------------------------------------------------------------------------

export default function AccesPhone({
  onIncomingCall,
  onCallAnswered,
  onCallEnded,
}: AccesPhoneProps) {
  const [minimized, setMinimized] = useState(true);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const [config, setConfig] = useState<AccesPhoneConfig>(DEFAULT_CONFIG);

  // Stable ref for onIncomingCall
  const onIncomingCallRef = useRef(onIncomingCall);
  useEffect(() => {
    onIncomingCallRef.current = onIncomingCall;
  }, [onIncomingCall]);

  // Load config on mount
  useEffect(() => {
    setConfig(loadConfig(DEFAULT_CONFIG));
  }, []);

  // We need speakerOn before creating useCallManager, but useAudioControls
  // needs refs from useCallManager. To break this circular dependency, we
  // create a simple speakerOn state that audio controls will manage.
  // We'll wire it up via useAudioControls after useCallManager provides refs.

  // --- Temporary speakerOn state used to initialise useCallManager ---
  const [speakerOnState, setSpeakerOnState] = useState(true);

  // --- SIP Connection ---
  const sip = useSipConnection({
    defaults: DEFAULT_CONFIG,
    userAgent: "AccesPhone Mini v1.0",
    onNewIncomingSession: useCallback(
      (session, callerNumber) => {
        // This will be wired up via callManager.handleIncomingSession
        // We use a ref to avoid stale closures
        handleIncomingSessionRef.current?.(session, callerNumber);
      },
      []
    ),
  });

  // --- Call Manager ---
  const callManager = useCallManager({
    uaRef: sip.uaRef,
    connected: sip.connected,
    sipDomain: sip.configRef.current.sipDomain,
    onCallAnswered,
    onCallEnded,
    speakerOn: speakerOnState,
    logPrefix: "AccesPhone",
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

  // Pre-acquire microphone when a call starts ringing so answering is instant
  useEffect(() => {
    if (callManager.ringing && !callManager.localStreamRef.current) {
      callManager.acquireMicOrFallback()
        .then((stream) => {
          callManager.localStreamRef.current = stream;
        })
        .catch(() => {
          // will be retried in answerCall if needed
        });
    }
  }, [callManager.ringing, callManager.acquireMicOrFallback, callManager.localStreamRef]);

  // Override disconnectSIP to also cleanup call
  const disconnectSIP = useCallback(() => {
    sip.disconnectSIP();
    callManager.cleanupCall();
  }, [sip, callManager]);

  // Auto-expand when ringing
  useEffect(() => {
    if (callManager.ringing) {
      setMinimized(false);
    }
  }, [callManager.ringing]);

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
      <audio ref={callManager.ringtoneRef} src="/sounds/ringtone.wav" preload="auto" />

      {/* MINIMIZED: Circular floating phone button */}
      {minimized && (
        <PhoneButton
          ringing={callManager.ringing}
          inCall={callManager.inCall}
          connected={sip.connected}
          connecting={sip.connecting}
          reconnecting={sip.reconnecting}
          statusText={sip.statusText}
          statusColor={statusColor}
          onClick={() => setMinimized(false)}
        />
      )}

      {/* EXPANDED: Full softphone panel */}
      {!minimized && (
        <PhonePanel
          connected={sip.connected}
          connecting={sip.connecting}
          reconnecting={sip.reconnecting}
          reconnectAttempt={sip.reconnectAttempt}
          statusText={sip.statusText}
          statusColor={statusColor}
          isInsecureContext={sip.isInsecureContext}
          inCall={callManager.inCall}
          callInfo={callManager.callInfo}
          ringing={callManager.ringing}
          callDuration={callManager.callDuration}
          muted={callManager.muted}
          dialNumber={callManager.dialNumber}
          setDialNumber={callManager.setDialNumber}
          micWarning={callManager.micWarning}
          micPermission={callManager.micPermission}
          speakerOn={audioControls.speakerOn}
          toggleSpeaker={audioControls.toggleSpeaker}
          showAudioControls={showAudioControls}
          setShowAudioControls={setShowAudioControls}
          micVolume={audioControls.micVolume}
          updateMicVolume={audioControls.updateMicVolume}
          speakerVolume={audioControls.speakerVolume}
          updateSpeakerVolume={audioControls.updateSpeakerVolume}
          ringtoneVolume={audioControls.ringtoneVolume}
          updateRingtoneVolume={audioControls.updateRingtoneVolume}
          connectSIP={sip.connectSIP}
          disconnectSIP={disconnectSIP}
          cancelReconnect={sip.cancelReconnect}
          setShowSettings={(v) => sip.setShowSettings(v)}
          setMinimized={setMinimized}
          answerCall={callManager.answerCall}
          rejectCall={callManager.rejectCall}
          hangupCall={callManager.hangupCall}
          toggleMute={callManager.toggleMute}
          makeCall={callManager.makeCall}
          dialpadPress={callManager.dialpadPress}
          requestMicPermission={callManager.requestMicPermission}
          formatDuration={callManager.formatDuration}
          manualDisconnectRef={sip.manualDisconnectRef}
        />
      )}

      {/* Settings Modal */}
      {sip.showSettings && (
        <SettingsModal
          config={config}
          setConfig={setConfig}
          onClose={() => sip.setShowSettings(false)}
          onSave={saveSettings}
          variant="floating"
        />
      )}
    </>
  );
}
