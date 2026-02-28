'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// SSR-safe import (JsSIP requires browser APIs)
const AccesPhonePro = dynamic(() => import('@/components/accesphone/AccesPhonePro'), {
  ssr: false,
});

// ============================================================
// Types for this page
// ============================================================
interface Privada {
  privada_id: number;
  descripcion: string;
}

interface Residencia {
  residencia_id: number;
  num_interior: string;
  propietario: string;
  telefono?: string;
}

interface IncomingCallBanner {
  number: string;
  privadaName?: string;
  contacto?: string;
  residenciaId?: number;
}

type TipoAcceso = 'visita' | 'delivery' | 'servicio' | 'residente' | 'emergencia';

// ============================================================
// Page Component
// ============================================================
export default function MonitoristasPage() {
  // --- Privada / Residencia selection ---
  const [privadas] = useState<Privada[]>([]);
  const [selectedPrivada, setSelectedPrivada] = useState<number | null>(null);
  const [residencias, setResidencias] = useState<Residencia[]>([]);
  const [selectedResidencia, setSelectedResidencia] = useState<number | null>(null);

  // --- Call banner ---
  const [callBanner, setCallBanner] = useState<IncomingCallBanner | null>(null);
  const [callActive, setCallActive] = useState(false);

  // --- Registro form ---
  const [tipoAcceso, setTipoAcceso] = useState<TipoAcceso>('visita');
  const [visitanteName, setVisitanteName] = useState('');
  const [visitanteVehiculo, setVisitanteVehiculo] = useState('');
  const [notas, setNotas] = useState('');
  const [registroExitoso, setRegistroExitoso] = useState(false);

  // --- Event log ---
  const [eventLog, setEventLog] = useState<{ time: string; msg: string; type: string }[]>([]);

  const addEvent = useCallback((msg: string, type = 'info') => {
    const time = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setEventLog(prev => [{ time, msg, type }, ...prev].slice(0, 50));
  }, []);

  // --- Load residencias when privada selected ---
  const handlePrivadaChange = useCallback(async (privadaId: number) => {
    setSelectedPrivada(privadaId);
    setSelectedResidencia(null);
    if (!privadaId) { setResidencias([]); return; }

    try {
      const res = await fetch(`/syscbctlmonitoreo/softphone/api_privada.php?action=get_residencias&privada_id=${privadaId}`);
      const data = await res.json();
      if (data.success) setResidencias(data.residencias || []);
    } catch {
      setResidencias([]);
    }
  }, []);

  // --- Softphone Callbacks ---
  const handleIncomingCall = useCallback((callerNumber: string) => {
    setCallBanner({ number: callerNumber });
    setCallActive(true);
    addEvent(`Llamada entrante: ${callerNumber}`, 'call');

    // Search by phone number to auto-identify
    fetch(`/syscbctlmonitoreo/softphone/api_privada.php?action=lookup_caller&telefono=${encodeURIComponent(callerNumber)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setCallBanner(prev => prev ? {
            ...prev,
            privadaName: data.nombre,
            contacto: data.contacto,
          } : prev);
          setSelectedPrivada(data.privada_id);
          addEvent(`Identificado: ${data.nombre} - ${data.contacto || ''}`, 'success');
        }
      })
      .catch(() => {});
  }, [addEvent]);

  const handleCallAnswered = useCallback(() => {
    addEvent('Llamada contestada', 'success');
  }, [addEvent]);

  const handleCallEnded = useCallback(() => {
    setCallActive(false);
    setCallBanner(null);
    addEvent('Llamada finalizada', 'info');
  }, [addEvent]);

  const handlePrivadaIdentified = useCallback((privada: { id: number; nombre: string; contacto: string; telefono: string }) => {
    setSelectedPrivada(privada.id);
    setCallBanner(prev => prev ? {
      ...prev,
      privadaName: privada.nombre,
      contacto: privada.contacto,
    } : prev);
    addEvent(`Privada auto-identificada: ${privada.nombre}`, 'success');
  }, [addEvent]);

  const handleRelayActivated = useCallback((relay: { id: number; alias: string; success: boolean }) => {
    addEvent(
      relay.success ? `Relay activado: ${relay.alias}` : `Error relay: ${relay.alias}`,
      relay.success ? 'success' : 'error'
    );
  }, [addEvent]);

  const handleSnapshotCaptured = useCallback((snapshot: { privadaId: number; camIndex: number; camName: string }) => {
    addEvent(`Snapshot: ${snapshot.camName}`, 'success');
  }, [addEvent]);

  // --- Submit registro ---
  const handleSubmitRegistro = useCallback(async () => {
    if (!selectedPrivada || !visitanteName.trim()) return;

    addEvent(`Registrando acceso: ${visitanteName} (${tipoAcceso})`, 'info');

    // In production this would POST to the actual API
    // For now, simulate success
    setRegistroExitoso(true);
    addEvent(`Acceso registrado exitosamente`, 'success');
    setTimeout(() => setRegistroExitoso(false), 3000);

    // Reset form
    setVisitanteName('');
    setVisitanteVehiculo('');
    setNotas('');
  }, [selectedPrivada, visitanteName, tipoAcceso, addEvent]);

  // ==============================
  // RENDER
  // ==============================
  return (
    <div className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT COLUMN: Registro de Accesos */}
        <div className="lg:col-span-2 space-y-4">

          {/* Incoming Call Banner */}
          {callBanner && (
            <div className={`rounded-xl overflow-hidden shadow-lg transition-all ${callActive ? 'ring-2 ring-green-500' : ''}`}>
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-pulse">📞</span>
                  <div>
                    <p className="text-lg font-bold">{callBanner.number}</p>
                    {callBanner.privadaName && (
                      <p className="text-sm opacity-90">{callBanner.privadaName} - {callBanner.contacto || ''}</p>
                    )}
                  </div>
                </div>
                {callActive && (
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold animate-pulse">
                    En llamada
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {registroExitoso && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <span className="text-green-700 font-semibold">Acceso registrado exitosamente</span>
            </div>
          )}

          {/* Registration Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-950 to-indigo-800 text-white px-4 py-3">
              <h2 className="text-base font-bold">Registro de Accesos</h2>
              <p className="text-[11px] opacity-70">Monitoristas - Registro de visitantes y accesos</p>
            </div>

            <div className="p-4 space-y-4">
              {/* Privada & Residencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Privada / Residencial</label>
                  <select
                    value={selectedPrivada || ''}
                    onChange={(e) => handlePrivadaChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none transition-all"
                  >
                    <option value="">-- Seleccionar Privada --</option>
                    {privadas.map(p => (
                      <option key={p.privada_id} value={p.privada_id}>{p.descripcion}</option>
                    ))}
                  </select>
                  {callBanner?.privadaName && (
                    <p className="mt-1 text-[10px] text-green-600 font-semibold">
                      Auto-identificada: {callBanner.privadaName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Residencia / Lote</label>
                  <select
                    value={selectedResidencia || ''}
                    onChange={(e) => setSelectedResidencia(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none transition-all"
                    disabled={!selectedPrivada}
                  >
                    <option value="">-- Seleccionar Residencia --</option>
                    {residencias.map(r => (
                      <option key={r.residencia_id} value={r.residencia_id}>
                        {r.num_interior} - {r.propietario}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tipo de Acceso */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Tipo de Acceso</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'visita' as const, label: 'Visita', icon: '👤', color: 'blue' },
                    { value: 'delivery' as const, label: 'Paqueteria', icon: '📦', color: 'yellow' },
                    { value: 'servicio' as const, label: 'Servicio', icon: '🔧', color: 'purple' },
                    { value: 'residente' as const, label: 'Residente', icon: '🏠', color: 'green' },
                    { value: 'emergencia' as const, label: 'Emergencia', icon: '🚨', color: 'red' },
                  ]).map(tipo => (
                    <button key={tipo.value}
                      onClick={() => setTipoAcceso(tipo.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        tipoAcceso === tipo.value
                          ? `bg-${tipo.color}-50 border-${tipo.color}-300 text-${tipo.color}-700 ring-1 ring-${tipo.color}-300`
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      <span>{tipo.icon}</span>
                      {tipo.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visitor Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre del Visitante</label>
                  <input type="text"
                    value={visitanteName}
                    onChange={(e) => setVisitanteName(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Vehiculo (opcional)</label>
                  <input type="text"
                    value={visitanteVehiculo}
                    onChange={(e) => setVisitanteVehiculo(e.target.value)}
                    placeholder="Placas / Modelo / Color"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none transition-all" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notas</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones del acceso..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none transition-all resize-none" />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmitRegistro}
                disabled={!visitanteName.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Registrar Acceso
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Event Log */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center">
              <p className="text-2xl font-bold text-indigo-900">0</p>
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Accesos Hoy</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center">
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Llamadas</p>
            </div>
          </div>

          {/* Event Log */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider">Bitacora de Eventos</h3>
              <span className="text-[9px] bg-white/15 px-2 py-0.5 rounded-full">{eventLog.length}</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {eventLog.length === 0 ? (
                <div className="text-center text-gray-400 py-8 text-sm">
                  Sin eventos recientes
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {eventLog.map((ev, i) => (
                    <div key={i} className="px-3 py-2 flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        ev.type === 'success' ? 'bg-green-500'
                        : ev.type === 'error' ? 'bg-red-500'
                        : ev.type === 'call' ? 'bg-blue-500'
                        : 'bg-gray-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 break-words">{ev.msg}</p>
                        <p className="text-[9px] text-gray-400 font-mono">{ev.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Keyboard Shortcuts Reference */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Atajos de teclado (softphone)</h3>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-600">
              <span><kbd className="bg-gray-100 px-1 rounded">V</kbd> Video</span>
              <span><kbd className="bg-gray-100 px-1 rounded">R</kbd> Relays</span>
              <span><kbd className="bg-gray-100 px-1 rounded">M</kbd> Mute</span>
              <span><kbd className="bg-gray-100 px-1 rounded">G</kbd> Grid</span>
              <span><kbd className="bg-gray-100 px-1 rounded">Enter</kbd> Llamar</span>
              <span><kbd className="bg-gray-100 px-1 rounded">Esc</kbd> Colgar</span>
            </div>
          </div>
        </div>
      </div>

      {/* AccesPhone Pro Softphone Widget */}
      <AccesPhonePro
        onIncomingCall={handleIncomingCall}
        onCallAnswered={handleCallAnswered}
        onCallEnded={handleCallEnded}
        onPrivadaIdentified={handlePrivadaIdentified}
        onRelayActivated={handleRelayActivated}
        onSnapshotCaptured={handleSnapshotCaptured}
      />
    </div>
  );
}
