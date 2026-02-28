'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * AccesPhone - Softphone SIP/WebRTC integrado para Video Accesos v2
 *
 * Embebe el softphone completo (softphone/index.html) via iframe.
 * Incluye: Camaras, Controles de Audio, Relays MQTT, Historial, Contactos.
 *
 * Comunicacion iframe <-> parent via postMessage:
 *   softphone -> parent: open, close, incoming, callEnded, registered, unregistered
 *   parent -> softphone: open
 */

interface AccesPhoneProps {
  /** URL base del sistema (ej: "/syscbctlmonitoreo/" o "/") */
  basePath?: string;
  /** Callback cuando se identifica una llamada entrante con privada */
  onIncomingCall?: (caller: string) => void;
  /** Callback cuando el softphone se registra/desregistra */
  onRegistrationChange?: (registered: boolean) => void;
  /** Callback cuando termina una llamada */
  onCallEnded?: () => void;
}

export default function AccesPhone({
  basePath = '/',
  onIncomingCall,
  onRegistrationChange,
  onCallEnded,
}: AccesPhoneProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Escuchar mensajes del softphone (iframe)
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || e.data.type !== 'softphone') return;

      switch (e.data.action) {
        case 'open':
          setIsOpen(true);
          break;
        case 'close':
          setIsOpen(false);
          break;
        case 'incoming':
          setIsOpen(true);
          setIsRinging(true);
          if (onIncomingCall && e.data.caller) {
            onIncomingCall(e.data.caller);
          }
          break;
        case 'callEnded':
          setIsRinging(false);
          if (onCallEnded) onCallEnded();
          break;
        case 'registered':
          setIsRegistered(true);
          if (onRegistrationChange) onRegistrationChange(true);
          break;
        case 'unregistered':
          setIsRegistered(false);
          if (onRegistrationChange) onRegistrationChange(false);
          break;
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onIncomingCall, onRegistrationChange, onCallEnded]);

  // Abrir/cerrar softphone
  const togglePhone = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'parent', action: 'open' },
        '*'
      );
    }
  }, [isOpen]);

  // Construir URL del softphone
  const softphoneUrl = `${basePath}softphone/index.html`.replace(/\/\//g, '/');

  return (
    <>
      {/* FAB - Boton flotante para abrir/cerrar */}
      {!isOpen && (
        <button
          onClick={togglePhone}
          aria-label="Abrir Access Phone"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            zIndex: 9997,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            transition: 'all 0.3s ease',
            animation: isRinging ? 'fabRing 0.8s ease-in-out infinite' : 'none',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1.1)';
            (e.target as HTMLElement).style.boxShadow =
              '0 6px 25px rgba(16, 185, 129, 0.5)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.transform = 'scale(1)';
            (e.target as HTMLElement).style.boxShadow =
              '0 4px 20px rgba(16, 185, 129, 0.4)';
          }}
        >
          {/* Phone icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
          </svg>
          {/* Status indicator */}
          <span
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              border: '2px solid white',
              background: isRegistered ? '#10b981' : '#ef4444',
              boxShadow: isRegistered
                ? '0 0 6px rgba(16,185,129,0.6)'
                : 'none',
            }}
          />
        </button>
      )}

      {/* Tab lateral derecho (visible cuando esta cerrado) */}
      {!isOpen && (
        <div
          onClick={togglePhone}
          style={{
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '48px',
            height: '120px',
            zIndex: 9997,
            cursor: 'pointer',
            background: isRinging
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #FF6B35 0%, #FFA500 100%)',
            borderRadius: '14px 0 0 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: isRinging
              ? '-4px 0 20px rgba(239, 68, 68, 0.5)'
              : '-4px 0 20px rgba(255, 107, 53, 0.3)',
            transition: 'all 0.3s ease',
            animation: isRinging
              ? 'tabPulse 0.8s ease-in-out infinite'
              : 'none',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.width = '54px';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.width = '48px';
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
          </svg>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isRegistered
                ? '#10b981'
                : 'rgba(255,255,255,0.4)',
              border: isRegistered
                ? '1px solid #10b981'
                : '1px solid rgba(255,255,255,0.6)',
              boxShadow: isRegistered
                ? '0 0 6px rgba(16,185,129,0.7)'
                : 'none',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: 'white',
              fontSize: '8px',
              fontWeight: 800,
              textTransform: 'uppercase' as const,
              writingMode: 'vertical-rl' as const,
              letterSpacing: '2px',
            }}
          >
            ACCESS
          </span>
        </div>
      )}

      {/* Iframe del softphone (siempre montado, visible cuando abierto) */}
      <iframe
        ref={iframeRef}
        src={softphoneUrl}
        allow="microphone; camera; autoplay; display-capture"
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: isOpen ? '420px' : '0px',
          height: '100vh',
          border: 'none',
          zIndex: 9998,
          background: 'transparent',
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: isOpen ? 'auto' : 'none',
          opacity: isOpen ? 1 : 0,
        }}
      />

      {/* Animaciones CSS */}
      <style>{`
        @keyframes fabRing {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(-8deg); }
          50% { transform: scale(1.05) rotate(0deg); }
          75% { transform: scale(1.1) rotate(8deg); }
        }
        @keyframes tabPulse {
          0%, 100% { transform: translateY(-50%) scale(1); }
          50% { transform: translateY(-50%) scale(1.06); }
        }
      `}</style>
    </>
  );
}
