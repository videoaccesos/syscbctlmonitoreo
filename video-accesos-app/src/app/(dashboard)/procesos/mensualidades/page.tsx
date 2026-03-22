"use client";

import { useState, useCallback } from "react";
import {
  Search,
  Loader2,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Building2,
  CalendarDays,
} from "lucide-react";

/* ---------- tipos ---------- */
type ResumenRow = {
  privada_id: number;
  privada: string;
  precio_mensualidad: number;
  ultimo_periodo: string | null;
  siguiente_pendiente: string | null;
  meses_adeudados: number;
  deuda_estimada: number;
  total_pagos: number;
  total_cobrado: number;
  al_corriente: boolean;
};

type KPIs = {
  totalPrivadas: number;
  alCorriente: number;
  conAdeudo: number;
  sinPagos: number;
  deudaTotal: number;
  cobradoTotal: number;
};

type PagoRow = Record<string, unknown>;

type PagosData = {
  data: PagoRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/* ---------- helpers ---------- */
const fmtMoney = (v: unknown) =>
  `$${Number(v || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MESES: Record<string, string> = {
  "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
  "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
  "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre",
};

function fmtPeriodo(p: string | null): string {
  if (!p) return "-";
  const [y, m] = p.split("-");
  return `${MESES[m] || m} ${y}`;
}

/* ================================================================ */
export default function MensualidadesPage() {
  // Tab state
  const [tab, setTab] = useState<"resumen" | "pagos" | "registrar">("resumen");

  // Resumen
  const [resumen, setResumen] = useState<{ kpis: KPIs; resumen: ResumenRow[] } | null>(null);
  const [loadingResumen, setLoadingResumen] = useState(false);

  // Pagos
  const [pagos, setPagos] = useState<PagosData | null>(null);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [pagosPage, setPagosPage] = useState(1);
  const [filterPrivada, setFilterPrivada] = useState("");
  const [filterPeriodo, setFilterPeriodo] = useState("");

  // Registrar pago
  const [privadas, setPrivadas] = useState<Array<{ privada_id: number; descripcion: string; precio_mensualidad: number }>>([]);
  const [selectedPrivada, setSelectedPrivada] = useState<number | "">("");
  const [formPeriodo, setFormPeriodo] = useState("");
  const [formTotal, setFormTotal] = useState("");
  const [formTipoPago, setFormTipoPago] = useState<1 | 2>(1);
  const [formObs, setFormObs] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [privadaInfo, setPrivadaInfo] = useState<ResumenRow | null>(null);
  const [loadingPrivadaInfo, setLoadingPrivadaInfo] = useState(false);

  // --- Fetch resumen ---
  const fetchResumen = useCallback(async () => {
    setLoadingResumen(true);
    try {
      const res = await fetch("/api/procesos/mensualidades/resumen");
      if (!res.ok) { alert("Error al consultar resumen"); return; }
      const json = await res.json();
      setResumen(json);
    } catch { alert("Error de conexión"); }
    finally { setLoadingResumen(false); }
  }, []);

  // --- Fetch pagos ---
  const fetchPagos = useCallback(async (page: number) => {
    setLoadingPagos(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filterPrivada) params.set("privadaId", filterPrivada);
      if (filterPeriodo) params.set("periodo", filterPeriodo);
      const res = await fetch(`/api/procesos/mensualidades?${params}`);
      if (!res.ok) { alert("Error al consultar pagos"); return; }
      const json: PagosData = await res.json();
      setPagos(json);
    } catch { alert("Error de conexión"); }
    finally { setLoadingPagos(false); }
  }, [filterPrivada, filterPeriodo]);

  // --- Fetch privadas para combo ---
  const fetchPrivadas = useCallback(async () => {
    try {
      const res = await fetch("/api/procesos/mensualidades/resumen");
      if (!res.ok) return;
      const json = await res.json();
      setPrivadas(
        (json.resumen as ResumenRow[]).map((r) => ({
          privada_id: r.privada_id,
          descripcion: r.privada,
          precio_mensualidad: r.precio_mensualidad,
        }))
      );
    } catch { /* ignore */ }
  }, []);

  // --- Al seleccionar privada, obtener info ---
  const handleSelectPrivada = async (pid: number) => {
    setSelectedPrivada(pid);
    setPrivadaInfo(null);
    setFormPeriodo("");
    setFormTotal("");

    if (!pid) return;

    setLoadingPrivadaInfo(true);
    try {
      const res = await fetch("/api/procesos/mensualidades/resumen");
      if (!res.ok) return;
      const json = await res.json();
      const info = (json.resumen as ResumenRow[]).find((r) => r.privada_id === pid);
      if (info) {
        setPrivadaInfo(info);
        if (info.siguiente_pendiente) {
          setFormPeriodo(info.siguiente_pendiente);
        }
        setFormTotal(String(info.precio_mensualidad));
      }
    } catch { /* ignore */ }
    finally { setLoadingPrivadaInfo(false); }
  };

  // --- Registrar pago ---
  const handleSubmit = async () => {
    if (!selectedPrivada || !formPeriodo) {
      alert("Selecciona una privada y periodo"); return;
    }
    if (!confirm(`¿Registrar pago de mensualidad ${fmtPeriodo(formPeriodo)} por ${fmtMoney(formTotal)}?`)) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/procesos/mensualidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privadaId: selectedPrivada,
          periodo: formPeriodo,
          total: Number(formTotal),
          tipoPago: formTipoPago,
          observaciones: formObs,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Error al registrar pago");
        return;
      }
      alert(json.message);
      // Limpiar y recargar info
      setFormObs("");
      if (selectedPrivada) {
        handleSelectPrivada(Number(selectedPrivada));
      }
    } catch { alert("Error de conexión"); }
    finally { setSubmitting(false); }
  };

  // --- Cancelar pago ---
  const handleCancelar = async (id: number, periodo: string) => {
    if (!confirm(`¿Cancelar el pago del periodo ${fmtPeriodo(periodo)}? Solo se permite cancelar el último pago de la privada.`)) return;
    try {
      const res = await fetch(`/api/procesos/mensualidades/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Error al cancelar");
        return;
      }
      alert(json.message);
      fetchPagos(pagosPage);
    } catch { alert("Error de conexión"); }
  };

  // --- Tab change ---
  const handleTabChange = (newTab: typeof tab) => {
    setTab(newTab);
    if (newTab === "resumen" && !resumen) fetchResumen();
    if (newTab === "pagos" && !pagos) { setPagosPage(1); fetchPagos(1); }
    if (newTab === "registrar" && privadas.length === 0) fetchPrivadas();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-green-600" />
          Pago de Mensualidades
        </h1>
        <p className="text-sm text-gray-700 mt-1">
          Control de cobro mensual por privada. Solo privadas con mensualidad activa.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          ["resumen", "Resumen por Privada"],
          ["pagos", "Historial de Pagos"],
          ["registrar", "Registrar Pago"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              tab === key
                ? "bg-white text-blue-600 border border-b-white border-gray-200 -mb-px"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Resumen */}
      {tab === "resumen" && (
        <div className="space-y-4">
          <button
            onClick={fetchResumen}
            disabled={loadingResumen}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
          >
            {loadingResumen ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loadingResumen ? "Consultando..." : "Consultar"}
          </button>

          {resumen && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KpiCard label="Privadas c/Mensualidad" value={resumen.kpis.totalPrivadas} color="blue" />
                <KpiCard label="Al Corriente" value={resumen.kpis.alCorriente} color="green" />
                <KpiCard label="Con Adeudo" value={resumen.kpis.conAdeudo} color="red" />
                <KpiCard label="Sin Pagos" value={resumen.kpis.sinPagos} color="amber" />
                <KpiCard label="Deuda Estimada" value={fmtMoney(resumen.kpis.deudaTotal)} color="red" isMoney />
                <KpiCard label="Total Cobrado" value={fmtMoney(resumen.kpis.cobradoTotal)} color="green" isMoney />
              </div>

              {/* Tabla resumen */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      <th className="text-left px-3 py-2 font-medium">Privada</th>
                      <th className="text-right px-3 py-2 font-medium">Precio Mensual</th>
                      <th className="text-center px-3 py-2 font-medium">Ultimo Pago</th>
                      <th className="text-center px-3 py-2 font-medium">Siguiente Pendiente</th>
                      <th className="text-center px-3 py-2 font-medium">Meses Adeudados</th>
                      <th className="text-right px-3 py-2 font-medium">Deuda Estimada</th>
                      <th className="text-right px-3 py-2 font-medium">Total Cobrado</th>
                      <th className="text-center px-3 py-2 font-medium">Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.resumen.map((r, i) => (
                      <tr
                        key={r.privada_id}
                        className={`border-b border-gray-200 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
                      >
                        <td className="px-3 py-1.5 font-medium text-gray-900">{r.privada}</td>
                        <td className="px-3 py-1.5 text-right text-gray-700">{fmtMoney(r.precio_mensualidad)}</td>
                        <td className="px-3 py-1.5 text-center text-gray-700">{fmtPeriodo(r.ultimo_periodo)}</td>
                        <td className="px-3 py-1.5 text-center font-medium text-amber-700">
                          {r.siguiente_pendiente ? fmtPeriodo(r.siguiente_pendiente) : "-"}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {r.meses_adeudados > 0 ? (
                            <span className="text-red-600 font-bold">{r.meses_adeudados}</span>
                          ) : r.ultimo_periodo ? (
                            <span className="text-green-600 font-medium">0</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right text-red-600 font-medium">
                          {r.deuda_estimada > 0 ? fmtMoney(r.deuda_estimada) : "-"}
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-700">{fmtMoney(r.total_cobrado)}</td>
                        <td className="px-3 py-1.5 text-center">
                          {r.al_corriente && r.ultimo_periodo ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="h-3 w-3" /> Al corriente
                            </span>
                          ) : !r.ultimo_periodo ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              <CalendarDays className="h-3 w-3" /> Sin pagos
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                              <AlertCircle className="h-3 w-3" /> Adeudo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Historial de Pagos */}
      {tab === "pagos" && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
                <input
                  type="month"
                  value={filterPeriodo}
                  onChange={(e) => setFilterPeriodo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => { setPagosPage(1); fetchPagos(1); }}
                disabled={loadingPagos}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
              >
                {loadingPagos ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Consultar
              </button>
              {(filterPrivada || filterPeriodo) && (
                <button
                  onClick={() => { setFilterPrivada(""); setFilterPeriodo(""); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <X className="h-4 w-4" /> Limpiar
                </button>
              )}
            </div>
          </div>

          {pagos && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="text-center px-3 py-2 font-medium w-8">ID</th>
                    <th className="text-left px-3 py-2 font-medium">Privada</th>
                    <th className="text-center px-3 py-2 font-medium">Periodo</th>
                    <th className="text-right px-3 py-2 font-medium">Monto</th>
                    <th className="text-center px-3 py-2 font-medium">Tipo Pago</th>
                    <th className="text-center px-3 py-2 font-medium">Fecha</th>
                    <th className="text-left px-3 py-2 font-medium">Observaciones</th>
                    <th className="text-center px-3 py-2 font-medium">Estatus</th>
                    <th className="text-center px-3 py-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.data.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-400">
                        No se encontraron pagos con los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    pagos.data.map((row, i) => (
                      <tr
                        key={String(row.asignacion_id)}
                        className={`border-b border-gray-200 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
                      >
                        <td className="text-center px-3 py-1.5 text-gray-500 text-xs font-mono">
                          {String(row.asignacion_id)}
                        </td>
                        <td className="px-3 py-1.5 font-medium text-gray-900">{String(row.privada)}</td>
                        <td className="px-3 py-1.5 text-center font-medium text-blue-700">
                          {fmtPeriodo(String(row.periodo))}
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-900 font-medium">
                          {fmtMoney(row.total)}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            Number(row.tipo_pago) === 1
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {String(row.tipo_pago_desc)}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-center text-gray-700 whitespace-nowrap">
                          {String(row.fecha || "-")}
                        </td>
                        <td className="px-3 py-1.5 text-gray-600 text-xs">{String(row.observaciones || "-")}</td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            Number(row.estatus_id) === 1
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}>
                            {String(row.estatus)}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {Number(row.estatus_id) === 1 && (
                            <button
                              onClick={() => handleCancelar(Number(row.asignacion_id), String(row.periodo))}
                              className="p-1 rounded hover:bg-red-100 text-red-500 hover:text-red-700 transition"
                              title="Cancelar pago"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Paginación */}
              {pagos.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm">
                  <span className="text-gray-600">
                    Pagina {pagos.page} de {pagos.totalPages} ({pagos.total} registros)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={pagosPage <= 1}
                      onClick={() => { setPagosPage(pagosPage - 1); fetchPagos(pagosPage - 1); }}
                      className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-3 py-1 text-sm font-medium">{pagosPage}</span>
                    <button
                      disabled={pagosPage >= pagos.totalPages}
                      onClick={() => { setPagosPage(pagosPage + 1); fetchPagos(pagosPage + 1); }}
                      className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Registrar Pago */}
      {tab === "registrar" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-green-600" />
            Registrar Pago de Mensualidad
          </h2>

          <div className="space-y-4">
            {/* Seleccionar privada */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="h-4 w-4 inline mr-1" />
                Privada
              </label>
              <select
                value={selectedPrivada}
                onChange={(e) => handleSelectPrivada(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleccionar privada --</option>
                {privadas.map((p) => (
                  <option key={p.privada_id} value={p.privada_id}>
                    {p.descripcion} ({fmtMoney(p.precio_mensualidad)}/mes)
                  </option>
                ))}
              </select>
            </div>

            {/* Info de la privada seleccionada */}
            {loadingPrivadaInfo && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando info...
              </div>
            )}

            {privadaInfo && (
              <div className={`rounded-lg border p-3 text-sm ${
                privadaInfo.al_corriente && privadaInfo.ultimo_periodo
                  ? "bg-green-50 border-green-200"
                  : privadaInfo.meses_adeudados > 0
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
              }`}>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-500">Ultimo pago:</span> <strong>{fmtPeriodo(privadaInfo.ultimo_periodo)}</strong></div>
                  <div><span className="text-gray-500">Siguiente pendiente:</span> <strong className="text-amber-700">{privadaInfo.siguiente_pendiente ? fmtPeriodo(privadaInfo.siguiente_pendiente) : "Primer pago"}</strong></div>
                  <div><span className="text-gray-500">Meses adeudados:</span> <strong className={privadaInfo.meses_adeudados > 0 ? "text-red-600" : "text-green-600"}>{privadaInfo.meses_adeudados}</strong></div>
                  <div><span className="text-gray-500">Total cobrado:</span> <strong>{fmtMoney(privadaInfo.total_cobrado)}</strong></div>
                </div>
              </div>
            )}

            {/* Periodo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periodo a pagar</label>
              <input
                type="month"
                value={formPeriodo}
                onChange={(e) => setFormPeriodo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {privadaInfo?.siguiente_pendiente && formPeriodo && formPeriodo !== privadaInfo.siguiente_pendiente && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  El siguiente periodo pendiente es {fmtPeriodo(privadaInfo.siguiente_pendiente)}. No se permiten meses salteados.
                </p>
              )}
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formTotal}
                  onChange={(e) => setFormTotal(e.target.value)}
                  className="w-full pl-7 pr-4 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Tipo de pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de pago</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio" name="tipoPago" value={1}
                    checked={formTipoPago === 1}
                    onChange={() => setFormTipoPago(1)}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Efectivo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio" name="tipoPago" value={2}
                    checked={formTipoPago === 2}
                    onChange={() => setFormTipoPago(2)}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Bancos</span>
                </label>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
              <textarea
                value={formObs}
                onChange={(e) => setFormObs(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notas adicionales..."
              />
            </div>

            {/* Botón submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedPrivada || !formPeriodo || !formTotal}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              {submitting ? "Registrando..." : "Registrar Pago"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- KPI Card ---------- */
function KpiCard({ label, value, color, isMoney }: {
  label: string;
  value: string | number;
  color: "blue" | "green" | "red" | "amber";
  isMoney?: boolean;
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className={`font-bold ${isMoney ? "text-lg" : "text-2xl"}`}>{value}</p>
    </div>
  );
}
