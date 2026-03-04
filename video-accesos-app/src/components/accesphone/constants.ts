import type { AccesPhoneConfig, AccesPhoneInlineConfig } from "./types";

// ---------------------------------------------------------------------------
// Auto-reconnect constants
// ---------------------------------------------------------------------------
export const RECONNECT_BASE_DELAY = 3000;   // 3s initial delay
export const RECONNECT_MAX_DELAY = 60000;   // 60s max between retries
export const RECONNECT_MAX_ATTEMPTS = 12;   // stop after 12 attempts (~5 min total)

// ---------------------------------------------------------------------------
// Default SIP config - stored in localStorage
// ---------------------------------------------------------------------------
export const DEFAULT_CONFIG: AccesPhoneConfig = {
  wsServer: "wss://accessbotpbx.info:8089/ws",
  extension: "",
  sipPassword: "",
  sipDomain: "accessbotpbx.info",
  displayName: "Monitoreo",
};

export const DEFAULT_INLINE_CONFIG: AccesPhoneInlineConfig = {
  ...DEFAULT_CONFIG,
  cameraProxyUrl: "camera_proxy.php",
  cameraRefreshMs: 500,
  videoAutoOnCall: true,
};

export const STORAGE_KEY = "accesphone_config";

export function loadConfig<T extends AccesPhoneConfig>(defaults: T): T {
  if (typeof window === "undefined") return defaults;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaults, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return defaults;
}

export function saveConfigToStorage(cfg: AccesPhoneConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}
