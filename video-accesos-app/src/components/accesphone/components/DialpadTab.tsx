"use client";

import { Phone } from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DialpadTabProps {
  /** Current dial number input value */
  dialNumber: string;
  /** Update the dial number input */
  setDialNumber: (value: string) => void;
  /** Press a dialpad digit (appends to input, sends DTMF if in call) */
  dialpadPress: (digit: string) => void;
  /** Make an outgoing call */
  makeCall: () => void;
  /** Whether currently in a call */
  inCall: boolean;
  /** Whether currently ringing */
  ringing: boolean;
  /** Whether SIP is connected */
  connected: boolean;
  /** Variant: "floating" (dark theme) or "inline" (light theme) */
  variant: "floating" | "inline";
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DialpadTab({
  dialNumber,
  setDialNumber,
  dialpadPress,
  makeCall,
  inCall,
  ringing,
  connected,
  variant,
}: DialpadTabProps) {
  if (variant === "floating") {
    // --- Floating (dark theme) dialpad ---

    // Dialpad visible when connected and not in call
    if (connected && !inCall && !ringing) {
      return (
        <div className="border-t border-gray-700/50 px-3 py-2">
          <div className="flex gap-1.5 mb-2">
            <input
              type="text"
              placeholder="Numero a marcar..."
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") makeCall();
              }}
              className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm font-mono text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={makeCall}
              disabled={!dialNumber}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-white hover:bg-green-500 disabled:opacity-40 transition"
              title="Marcar"
            >
              <Phone className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {DIGITS.map((d) => (
              <button
                key={d}
                onClick={() => dialpadPress(d)}
                className="rounded-lg bg-gray-700 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-600 active:bg-gray-500 transition"
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // In-call DTMF dialpad
    if (inCall && !ringing) {
      return (
        <div className="border-t border-gray-700/50 px-3 py-2">
          <div className="grid grid-cols-3 gap-1">
            {DIGITS.map((d) => (
              <button
                key={d}
                onClick={() => dialpadPress(d)}
                className="rounded-lg bg-gray-700 py-1.5 text-sm font-semibold text-gray-200 hover:bg-gray-600 active:bg-gray-500 transition"
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return null;
  }

  // --- Inline (light theme) dialpad ---
  if (!inCall && !ringing && connected) {
    return (
      <div className="p-4">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Numero a marcar..."
            value={dialNumber}
            onChange={(e) => setDialNumber(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") makeCall();
            }}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-base font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={makeCall}
            disabled={!dialNumber}
            className="rounded-lg bg-green-600 px-4 py-2.5 text-white hover:bg-green-700 disabled:opacity-40 transition"
          >
            <Phone className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {DIGITS.map((d) => (
            <button
              key={d}
              onClick={() => dialpadPress(d)}
              className="rounded-lg bg-gray-100 py-2.5 text-base font-semibold text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition"
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // In-call DTMF dialpad (inline variant)
  if (inCall && !ringing) {
    return (
      <div className="p-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-1.5">
          {DIGITS.map((d) => (
            <button
              key={d}
              onClick={() => dialpadPress(d)}
              className="rounded-lg bg-gray-100 py-2.5 text-base font-semibold text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition"
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
