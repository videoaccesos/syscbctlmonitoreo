"use client";

import { X } from "lucide-react";
import type { AccesPhoneConfig, AccesPhoneInlineConfig } from "../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SettingsModalProps {
  config: AccesPhoneConfig | AccesPhoneInlineConfig;
  setConfig: (cfg: AccesPhoneConfig | AccesPhoneInlineConfig) => void;
  onClose: () => void;
  onSave: () => void;
  /** Variant: "floating" uses a compact layout, "inline" uses a larger layout */
  variant: "floating" | "inline";
}

// ---------------------------------------------------------------------------
// Type guard to detect inline config
// ---------------------------------------------------------------------------

function isInlineConfig(cfg: AccesPhoneConfig | AccesPhoneInlineConfig): cfg is AccesPhoneInlineConfig {
  return "cameraProxyUrl" in cfg;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsModal({
  config,
  setConfig,
  onClose,
  onSave,
  variant,
}: SettingsModalProps) {
  const updateField = (field: string, value: string | number | boolean) => {
    setConfig({ ...config, [field]: value });
  };

  if (variant === "floating") {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <h2 className="text-sm font-bold text-gray-900">
              Configuracion SIP
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded text-gray-400 hover:text-gray-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5 uppercase">
                Servidor WebSocket
              </label>
              <input
                type="text"
                value={config.wsServer}
                onChange={(e) => updateField("wsServer", e.target.value)}
                placeholder="wss://accessbotpbx.info:8089/ws"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5 uppercase">
                  Extension
                </label>
                <input
                  type="text"
                  value={config.extension}
                  onChange={(e) => updateField("extension", e.target.value)}
                  placeholder="103"
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5 uppercase">
                  Contrasena
                </label>
                <input
                  type="password"
                  value={config.sipPassword}
                  onChange={(e) => updateField("sipPassword", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5 uppercase">
                Dominio SIP
              </label>
              <input
                type="text"
                value={config.sipDomain}
                onChange={(e) => updateField("sipDomain", e.target.value)}
                placeholder="accessbotpbx.info"
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-green-700 transition"
            >
              Guardar y Conectar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Inline (light theme, larger) variant ---
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Configuracion SIP
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Servidor WebSocket
            </label>
            <input
              type="text"
              value={config.wsServer}
              onChange={(e) => updateField("wsServer", e.target.value)}
              placeholder="wss://accessbotpbx.info:8089/ws"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Extension
            </label>
            <input
              type="text"
              value={config.extension}
              onChange={(e) => updateField("extension", e.target.value)}
              placeholder="103"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Contrasena
            </label>
            <input
              type="password"
              value={config.sipPassword}
              onChange={(e) => updateField("sipPassword", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Dominio SIP
            </label>
            <input
              type="text"
              value={config.sipDomain}
              onChange={(e) => updateField("sipDomain", e.target.value)}
              placeholder="accessbotpbx.info"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Video / Camera settings (only for inline config) */}
          {isInlineConfig(config) && (
            <>
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Video / Camaras</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  URL Proxy Camaras
                </label>
                <input
                  type="text"
                  value={config.cameraProxyUrl}
                  onChange={(e) => updateField("cameraProxyUrl", e.target.value)}
                  placeholder="camera_proxy.php"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Refresh (ms)
                </label>
                <input
                  type="number"
                  value={config.cameraRefreshMs}
                  onChange={(e) => updateField("cameraRefreshMs", parseInt(e.target.value) || 500)}
                  placeholder="500"
                  min={100}
                  max={10000}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="videoAutoInline"
                  checked={config.videoAutoOnCall}
                  onChange={(e) => updateField("videoAutoOnCall", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="videoAutoInline" className="text-sm text-gray-700">
                  Video automatico en llamadas
                </label>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
          >
            Guardar y Conectar
          </button>
        </div>
      </div>
    </div>
  );
}
