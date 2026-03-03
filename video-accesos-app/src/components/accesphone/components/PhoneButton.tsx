"use client";

import {
  Phone,
  PhoneIncoming,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PhoneButtonProps {
  ringing: boolean;
  inCall: boolean;
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  statusText: string;
  statusColor: string;
  onClick: () => void;
}

// ---------------------------------------------------------------------------
// Component - Floating circular phone button (minimized state)
// ---------------------------------------------------------------------------

export default function PhoneButton({
  ringing,
  inCall,
  connected,
  connecting,
  reconnecting,
  statusText,
  statusColor,
  onClick,
}: PhoneButtonProps) {
  // Floating button colors based on state
  const fabBg = ringing
    ? "bg-red-500 animate-bounce"
    : inCall
      ? "bg-blue-500 animate-pulse"
      : connected
        ? "bg-green-500"
        : connecting || reconnecting
          ? "bg-yellow-500 animate-pulse"
          : "bg-gray-500";

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-4 left-4 z-[55] flex items-center justify-center w-14 h-14 rounded-full shadow-lg ${fabBg} text-white hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer`}
      title={`AccesPhone - ${statusText}`}
    >
      {ringing ? (
        <PhoneIncoming className="h-7 w-7" />
      ) : inCall ? (
        <Phone className="h-7 w-7" />
      ) : (
        <Phone className="h-7 w-7" />
      )}
      {/* Small status dot */}
      <span className={`absolute top-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white ${statusColor}`} />
    </button>
  );
}
