// ---------------------------------------------------------------------------
// Shared types for AccesPhone components
// ---------------------------------------------------------------------------

export interface AccesPhoneConfig {
  wsServer: string;
  extension: string;
  sipPassword: string;
  sipDomain: string;
  displayName: string;
}

/**
 * Extended config used by AccesPhoneInline which includes camera-related fields.
 */
export interface AccesPhoneInlineConfig extends AccesPhoneConfig {
  cameraProxyUrl: string;
  cameraRefreshMs: number;
  videoAutoOnCall: boolean;
}

export interface CallInfo {
  number: string;
  direction: "incoming" | "outgoing";
  startTime: Date;
}

export interface AccesPhoneProps {
  onIncomingCall?: (callerNumber: string, displayName?: string) => void;
  onCallAnswered?: (callerNumber: string) => void;
  onCallEnded?: () => void;
}

export interface AccesPhoneInlineProps {
  onIncomingCall?: (callerNumber: string) => void;
  onCallAnswered?: (callerNumber: string) => void;
  onCallEnded?: () => void;
}

export type MicPermission = "granted" | "denied" | "prompt" | "unknown";
