// ============================================================
// AccesPhone Pro v3.0 - Type Definitions
// ============================================================

export interface SipConfig {
  wsServer: string;
  extension: string;
  password: string;
  domain: string;
}

export interface VideoConfig {
  proxyUrl: string;
  refreshRate: number;
  autoShowOnCall: boolean;
  autoSnapshot: boolean;
}

export interface PrivadaConfig {
  apiUrl: string;
  mqttRelayUrl: string;
  autoLookupCaller: boolean;
}

export interface Camera {
  id: number;
  channel: string;
  alias: string;
  url: string;
  privadaId: number;
  needsProxy: boolean;
  proxyUrl: string;
}

export interface Relay {
  id: number;
  alias: string;
  dns: string;
  puerto: string;
}

export interface Contact {
  id: number;
  name: string;
  number: string;
  type: 'normal' | 'vip';
}

export interface CallHistoryEntry {
  id: number;
  type: 'incoming' | 'outgoing' | 'missed';
  number: string;
  contactName?: string;
  privadaName?: string;
  duration?: number;
  timestamp: string;
}

export interface PrivadaOption {
  id: number;
  nombre: string;
  telefono?: string;
}

export interface PrivadaLookupResult {
  privada_id: number;
  nombre: string;
  contacto: string;
  telefono: string;
  videos: PrivadaVideo[];
  relays: PrivadaRelay[];
}

export interface PrivadaVideo {
  id: number;
  url: string;
  alias: string;
  privada_id: number;
  needs_proxy: boolean;
  proxy_url: string;
}

export interface PrivadaRelay {
  id: number;
  dns: string;
  puerto: string;
  alias: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'registering' | 'registered' | 'error' | 'reconnecting';
export type CallState = 'idle' | 'ringing' | 'calling' | 'active';
export type ActiveTab = 'dialpad' | 'cameras' | 'audio' | 'relays';

export interface AccesPhoneProProps {
  onIncomingCall?: (callerNumber: string) => void;
  onCallAnswered?: () => void;
  onCallEnded?: () => void;
  onPrivadaIdentified?: (privada: {
    id: number;
    nombre: string;
    contacto: string;
    telefono: string;
  }) => void;
  onRelayActivated?: (relay: {
    id: number;
    alias: string;
    success: boolean;
  }) => void;
  onSnapshotCaptured?: (snapshot: {
    privadaId: number;
    camIndex: number;
    camName: string;
  }) => void;
}
