"use client";

import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { CallInfo } from "../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface IncomingCallOverlayProps {
  callInfo: CallInfo;
  ringing: boolean;
  inCall: boolean;
  callDuration: number;
  muted: boolean;
  speakerOn: boolean;
  answerCall: () => void;
  rejectCall: () => void;
  hangupCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  formatDuration: (s: number) => string;
  /** Variant: "floating" (dark theme) or "inline" (light theme) */
  variant: "floating" | "inline";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IncomingCallOverlay({
  callInfo,
  ringing,
  inCall,
  callDuration,
  muted,
  speakerOn,
  answerCall,
  rejectCall,
  hangupCall,
  toggleMute,
  toggleSpeaker,
  formatDuration,
  variant,
}: IncomingCallOverlayProps) {
  if (variant === "floating") {
    return (
      <>
        {/* Call state: ringing */}
        {ringing && (
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
        {inCall && !ringing && (
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

            {/* Mute + Speaker + Colgar */}
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
                onClick={hangupCall}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition"
              >
                <PhoneOff className="h-3.5 w-3.5" />
                Colgar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // --- Inline (light theme) variant ---
  return (
    <div
      className={`px-4 py-4 ${ringing ? "bg-green-50 animate-pulse" : "bg-blue-50"}`}
    >
      <div className="flex items-center gap-3 mb-3">
        {callInfo.direction === "incoming" ? (
          <PhoneIncoming
            className={`h-8 w-8 ${ringing ? "text-green-600" : "text-blue-600"}`}
          />
        ) : (
          <PhoneOutgoing className="h-8 w-8 text-blue-600" />
        )}
        <div>
          <div className="text-lg font-bold text-gray-900">
            {callInfo.number}
          </div>
          <div className="text-sm text-gray-500">
            {ringing
              ? "Llamada entrante..."
              : callInfo.direction === "incoming"
                ? "En llamada"
                : "Llamando..."}
            {inCall && !ringing && (
              <span className="ml-2 font-mono text-lg font-bold text-blue-700">
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
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 transition"
            >
              <Phone className="h-5 w-5" />
              Contestar
            </button>
            <button
              onClick={rejectCall}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 transition"
            >
              <PhoneOff className="h-5 w-5" />
              Rechazar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`rounded-lg px-4 py-3 text-sm font-medium transition ${muted ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              title={muted ? "Activar microfono" : "Silenciar"}
            >
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <button
              onClick={toggleSpeaker}
              className={`rounded-lg px-4 py-3 text-sm font-medium transition ${!speakerOn ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              title={speakerOn ? "Silenciar altavoz" : "Activar altavoz"}
            >
              {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
            <button
              onClick={hangupCall}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 transition"
            >
              <PhoneOff className="h-5 w-5" />
              Colgar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
