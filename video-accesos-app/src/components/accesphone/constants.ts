import type { SipConfig, VideoConfig, PrivadaConfig } from './types';

export const STORAGE_KEYS = {
  SIP: 'accesphone_pro_sip',
  VIDEO: 'accesphone_pro_video',
  PRIVADA: 'accesphone_pro_privada',
  AUDIO: 'accesphone_pro_audio',
  CONTACTS: 'accesphone_pro_contacts',
  HISTORY: 'accesphone_pro_history',
} as const;

export const DEFAULT_SIP: SipConfig = {
  wsServer: 'wss://accessbotpbx.info:8089/ws',
  extension: '',
  password: '',
  domain: 'accessbotpbx.info',
};

export const DEFAULT_VIDEO: VideoConfig = {
  proxyUrl: '/syscbctlmonitoreo/softphone/camera_proxy.php',
  refreshRate: 500,
  autoShowOnCall: true,
  autoSnapshot: true,
};

export const DEFAULT_PRIVADA: PrivadaConfig = {
  apiUrl: '/syscbctlmonitoreo/softphone/api_privada.php',
  mqttRelayUrl: '/syscbctlmonitoreo/softphone/mqtt_relay.php',
  autoLookupCaller: true,
};

export const DTMF_FREQS: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

export const DIAL_KEYS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
] as const;

export const MAX_HISTORY_ENTRIES = 100;
export const MAX_CONSECUTIVE_VIDEO_ERRORS = 5;
export const VIDEO_RECOVERY_DELAY = 3000;
export const GRID_REFRESH_MULTIPLIER = 2;
