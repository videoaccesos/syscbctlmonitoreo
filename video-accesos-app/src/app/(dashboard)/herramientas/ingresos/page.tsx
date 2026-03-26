"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Home,
  FileText,
  Plus,
  Trash2,
  Loader2,
  Search,
  X,
} from "lucide-react";

/* ---------- tipos ---------- */
interface KpiConcepto {
  esperado: number;
  cobrado: number;
}

interface Kpis {
  mensualidad: KpiConcepto;
  tarjetas: KpiConcepto;
  remisiones: KpiConcepto;
  total: KpiConcepto & { avance: number };
}

interface ConcentradoRow {
  privada: string;
  mensualidadEsperado: number;
  mensualidadCobrado: number;
  tarjetaEsperado: number;
  tarjetaCobrado: number;
  totalEsperado: number;
  totalCobrado: number;
  avance: number;
}

interface DetalleMensualidad {
  privada: string;
  pagos: number;
  cobrado: number;
}

interface DetalleTarjeta {
  privada: string;
  tipo_id: number;
  folio_tipo: string;
  cantidad: number;
  cobrado: number;
}

interface DetalleRemision {
  concepto: string;
  cantidad: number;
  cobrado: number;
}

interface Remision {
  id: number;
  concepto: string;
  descripcion: string;
  total: number;
  tipoPago: number;
  fecha: string;
  observaciones: string | null;
  estatusId: number;
}

interface DashboardData {
  fechaIni: string;
  fechaFin: string;
  mesesEnRango: number;
  kpis: Kpis;
  concentrado: ConcentradoRow[];
  detalle: {
    mensualidades: DetalleMensualidad[];
    tarjetas: DetalleTarjeta[];
    remisiones: DetalleRemision[];
  };
}

/* ---------- helpers ---------- */
const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const fmtPct = (n: number) => `${Math.round(n)}%`;

const today = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const firstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

/* ---------- componente ---------- */
export default function IngresosPage() {
  const [fechaIni, setFechaIni] = useState(firstDayOfMonth());
  const [fechaFin, setFechaFin] = useState(today());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<"resumen" | "mensualidades" | "tarjetas" | "remisiones">("resumen");

  // Remisiones list & form
  const [remisionesList, setRemisionesList] = useState<Remision[]>([]);
  const [showRemisionForm, setShowRemisionForm] = useState(false);
  const [remForm, setRemForm] = useState({
    concepto: "",
    descripcion: "",
    total: "",
    tipoPago: "1",
    fecha: today(),
    observaciones: "",
  });
  const [savingRemision, setSavingRemision] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/herramientas/ingresos?fechaIni=${fechaIni}&fechaFin=${fechaFin}`
      );
      if (!res.ok) throw new Error("Error al cargar datos");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
      alert("Error al cargar el dashboard de ingresos");
    } finally {
      setLoading(false);
    }
  }, [fechaIni, fechaFin]);

  const fetchRemisiones = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/herramientas/ingresos/remisiones?fechaIni=${fechaIni}&fechaFin=${fechaFin}`
      );
      if (res.ok) {
        const json = await res.json();
        setRemisionesList(json.data || []);
      }
    } catch { /* ignore */ }
  }, [fechaIni, fechaFin]);

  useEffect(() => {
    fetchDashboard();
    fetchRemisiones();
  }, [fetchDashboard, fetchRemisiones]);

  const handleSearch = () => {
    fetchDashboard();
    fetchRemisiones();
  };

  const handleSaveRemision = async () => {
    if (!remForm.concepto || !remForm.total || !remForm.fecha) {
      alert("Concepto, total y fecha son requeridos");
      return;
    }
    setSavingRemision(true);
    try {
      const res = await fetch("/api/herramientas/ingresos/remisiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(remForm),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Error al guardar");
        return;
      }
      setShowRemisionForm(false);
      setRemForm({ concepto: "", descripcion: "", total: "", tipoPago: "1", fecha: today(), observaciones: "" });
      fetchDashboard();
      fetchRemisiones();
    } catch {
      alert("Error de conexión");
    } finally {
      setSavingRemision(false);
    }
  };

  const handleDeleteRemision = async (id: number) => {
    if (!confirm("¿Cancelar esta remisión?")) return;
    try {
      const res = await fetch(`/api/herramientas/ingresos/remisiones?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchDashboard();
        fetchRemisiones();
      }
    } catch { /* ignore */ }
  };

  const kpis = data?.kpis;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <DollarSign className="h-7 w-7 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Ingresos</h1>
        </div>
        <p className="text-sm text-gray-500">
          Ingresos esperados vs cobrados por periodo: mensualidades, tarjetas y remisiones
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Inicio</label>
          <input
            type="date"
            value={fechaIni}
            onChange={(e) => setFechaIni(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fecha Fin</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Consultar
        </button>
        {data && (
          <span className="text-xs text-gray-400">
            Periodo: {data.mesesEnRango} {data.mesesEnRango === 1 ? "mes" : "meses"}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {!loading && kpis && (
        <>
          {/* KPIs principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Total */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-500">Ingreso Total</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{fmtMoney(kpis.total.cobrado)}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">Esperado: {fmtMoney(kpis.total.esperado)}</span>
                <span className={`text-sm font-semibold ${kpis.total.avance >= 100 ? "text-green-600" : kpis.total.avance >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {fmtPct(kpis.total.avance)}
                </span>
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${kpis.total.avance >= 100 ? "bg-green-500" : kpis.total.avance >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(kpis.total.avance, 100)}%` }}
                />
              </div>
            </div>

            {/* Mensualidades */}
            <KpiCard
              icon={<Home className="h-5 w-5 text-purple-600" />}
              label="Mensualidades"
              cobrado={kpis.mensualidad.cobrado}
              esperado={kpis.mensualidad.esperado}
            />

            {/* Tarjetas */}
            <KpiCard
              icon={<CreditCard className="h-5 w-5 text-orange-600" />}
              label="Tarjetas"
              cobrado={kpis.tarjetas.cobrado}
              esperado={kpis.tarjetas.esperado}
            />

            {/* Remisiones */}
            <KpiCard
              icon={<FileText className="h-5 w-5 text-teal-600" />}
              label="Remisiones"
              cobrado={kpis.remisiones.cobrado}
              esperado={0}
              noEsperado
            />
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="flex border-b">
              {(
                [
                  ["resumen", "Concentrado por Privada"],
                  ["mensualidades", "Mensualidades"],
                  ["tarjetas", "Tarjetas"],
                  ["remisiones", "Remisiones"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* Tab: Resumen concentrado */}
              {tab === "resumen" && data && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-3 py-2 font-semibold text-gray-700">Privada</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 text-right">Mens. Esperado</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 text-right">Mens. Cobrado</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 text-right">Tarj. Esperado</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 text-right">Tarj. Cobrado</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 text-right">Total Esperado</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 text-right">Total Cobrado</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 text-center">Avance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.concentrado.map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-1.5 font-medium text-gray-900">{r.privada}</td>
                          <td className="px-3 py-1.5 text-right">{fmtMoney(r.mensualidadEsperado)}</td>
                          <td className="px-3 py-1.5 text-right">{fmtMoney(r.mensualidadCobrado)}</td>
                          <td className="px-3 py-1.5 text-right">{fmtMoney(r.tarjetaEsperado)}</td>
                          <td className="px-3 py-1.5 text-right">{fmtMoney(r.tarjetaCobrado)}</td>
                          <td className="px-3 py-1.5 text-right font-medium">{fmtMoney(r.totalEsperado)}</td>
                          <td className="px-3 py-1.5 text-right font-medium">{fmtMoney(r.totalCobrado)}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`inline-block min-w-[48px] rounded-full px-2 py-0.5 text-xs font-semibold ${
                              r.avance >= 100 ? "bg-green-100 text-green-700" :
                              r.avance >= 50 ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {fmtPct(r.avance)}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {data.concentrado.length === 0 && (
                        <tr><td colSpan={8} className="py-8 text-center text-gray-400">Sin datos en el periodo</td></tr>
                      )}
                    </tbody>
                    {data.concentrado.length > 0 && (
                      <tfoot>
                        <tr className="bg-blue-50 font-semibold">
                          <td className="px-3 py-2">TOTAL</td>
                          <td className="px-3 py-2 text-right">{fmtMoney(kpis.mensualidad.esperado)}</td>
                          <td className="px-3 py-2 text-right">{fmtMoney(kpis.mensualidad.cobrado)}</td>
                          <td className="px-3 py-2 text-right">{fmtMoney(kpis.tarjetas.esperado)}</td>
                          <td className="px-3 py-2 text-right">{fmtMoney(kpis.tarjetas.cobrado)}</td>
                          <td className="px-3 py-2 text-right">{fmtMoney(kpis.total.esperado)}</td>
                          <td className="px-3 py-2 text-right">{fmtMoney(kpis.total.cobrado)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block min-w-[48px] rounded-full px-2 py-0.5 text-xs font-semibold ${
                              kpis.total.avance >= 100 ? "bg-green-100 text-green-700" :
                              kpis.total.avance >= 50 ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {fmtPct(kpis.total.avance)}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* Tab: Mensualidades */}
              {tab === "mensualidades" && data && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-3 py-2 font-semibold text-gray-700">Privada</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 text-right">Pagos</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 text-right">Cobrado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.detalle.mensualidades.map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-1.5 font-medium text-gray-900">{r.privada}</td>
                          <td className="px-3 py-1.5 text-right">{r.pagos}</td>
                          <td className="px-3 py-1.5 text-right">{fmtMoney(r.cobrado)}</td>
                        </tr>
                      ))}
                      {data.detalle.mensualidades.length === 0 && (
                        <tr><td colSpan={3} className="py-8 text-center text-gray-400">Sin pagos de mensualidad en el periodo</td></tr>
                      )}
                    </tbody>
                    {data.detalle.mensualidades.length > 0 && (
                      <tfoot>
                        <tr className="bg-purple-50 font-semibold">
                          <td className="px-3 py-2">TOTAL</td>
                          <td className="px-3 py-2 text-right">
                            {data.detalle.mensualidades.reduce((s, r) => s + r.pagos, 0)}
                          </td>
                          <td className="px-3 py-2 text-right">{fmtMoney(kpis.mensualidad.cobrado)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* Tab: Tarjetas */}
              {tab === "tarjetas" && data && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-3 py-2 font-semibold text-gray-700">Privada</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 text-center">Tipo</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 text-center">Folio</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 text-right">Cantidad</th>
                        <th className="px-3 py-2 font-semibold text-gray-700 text-right">Cobrado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.detalle.tarjetas.map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-1.5 font-medium text-gray-900">{r.privada}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.tipo_id === 2 ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                            }`}>
                              {r.tipo_id === 2 ? "Vehicular" : "Peatonal"}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className="text-xs font-medium text-gray-500">Folio {r.folio_tipo}</span>
                          </td>
                          <td className="px-3 py-1.5 text-right">{r.cantidad}</td>
                          <td className="px-3 py-1.5 text-right">{fmtMoney(r.cobrado)}</td>
                        </tr>
                      ))}
                      {data.detalle.tarjetas.length === 0 && (
                        <tr><td colSpan={5} className="py-8 text-center text-gray-400">Sin ventas de tarjetas en el periodo</td></tr>
                      )}
                    </tbody>
                    {data.detalle.tarjetas.length > 0 && (
                      <tfoot>
                        <tr className="bg-orange-50 font-semibold">
                          <td className="px-3 py-2" colSpan={3}>TOTAL</td>
                          <td className="px-3 py-2 text-right">
                            {data.detalle.tarjetas.reduce((s, r) => s + r.cantidad, 0)}
                          </td>
                          <td className="px-3 py-2 text-right">{fmtMoney(kpis.tarjetas.cobrado)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* Tab: Remisiones */}
              {tab === "remisiones" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Remisiones registradas</h3>
                    <button
                      onClick={() => setShowRemisionForm(true)}
                      className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
                    >
                      <Plus className="h-4 w-4" /> Registrar Remisión
                    </button>
                  </div>

                  {/* Form inline */}
                  {showRemisionForm && (
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-teal-800">Nueva Remisión</h4>
                        <button onClick={() => setShowRemisionForm(false)}>
                          <X className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Concepto *</label>
                          <input
                            type="text"
                            value={remForm.concepto}
                            onChange={(e) => setRemForm({ ...remForm, concepto: e.target.value })}
                            placeholder="Ej: Renta de salón"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Total *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={remForm.total}
                            onChange={(e) => setRemForm({ ...remForm, total: e.target.value })}
                            placeholder="0.00"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
                          <input
                            type="date"
                            value={remForm.fecha}
                            onChange={(e) => setRemForm({ ...remForm, fecha: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                          <input
                            type="text"
                            value={remForm.descripcion}
                            onChange={(e) => setRemForm({ ...remForm, descripcion: e.target.value })}
                            placeholder="Detalle adicional"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Pago</label>
                          <select
                            value={remForm.tipoPago}
                            onChange={(e) => setRemForm({ ...remForm, tipoPago: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          >
                            <option value="1">Efectivo</option>
                            <option value="2">Bancos</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
                          <input
                            type="text"
                            value={remForm.observaciones}
                            onChange={(e) => setRemForm({ ...remForm, observaciones: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={handleSaveRemision}
                          disabled={savingRemision}
                          className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                        >
                          {savingRemision && <Loader2 className="h-4 w-4 animate-spin" />}
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-3 py-2 font-semibold text-gray-700">Fecha</th>
                          <th className="px-3 py-2 font-semibold text-gray-700">Concepto</th>
                          <th className="px-3 py-2 font-semibold text-gray-700">Descripción</th>
                          <th className="px-3 py-2 font-semibold text-gray-700 text-center">Pago</th>
                          <th className="px-3 py-2 font-semibold text-gray-700 text-right">Total</th>
                          <th className="px-3 py-2 font-semibold text-gray-700 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {remisionesList.map((r, i) => (
                          <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-3 py-1.5 text-gray-600">{r.fecha}</td>
                            <td className="px-3 py-1.5 font-medium text-gray-900">{r.concepto}</td>
                            <td className="px-3 py-1.5 text-gray-600">{r.descripcion}</td>
                            <td className="px-3 py-1.5 text-center">
                              <span className="text-xs">{r.tipoPago === 1 ? "Efectivo" : "Bancos"}</span>
                            </td>
                            <td className="px-3 py-1.5 text-right font-medium">{fmtMoney(r.total)}</td>
                            <td className="px-3 py-1.5 text-center">
                              <button
                                onClick={() => handleDeleteRemision(r.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Cancelar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {remisionesList.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400">
                              Sin remisiones en el periodo
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {remisionesList.length > 0 && (
                        <tfoot>
                          <tr className="bg-teal-50 font-semibold">
                            <td className="px-3 py-2" colSpan={4}>TOTAL</td>
                            <td className="px-3 py-2 text-right">
                              {fmtMoney(remisionesList.reduce((s, r) => s + r.total, 0))}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- sub-componente KPI ---------- */
function KpiCard({
  icon,
  label,
  cobrado,
  esperado,
  noEsperado,
}: {
  icon: React.ReactNode;
  label: string;
  cobrado: number;
  esperado: number;
  noEsperado?: boolean;
}) {
  const avance = esperado > 0 ? (cobrado / esperado) * 100 : 0;
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{fmtMoney(cobrado)}</div>
      {!noEsperado && esperado > 0 ? (
        <>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-400">Esperado: {fmtMoney(esperado)}</span>
            <span className={`text-sm font-semibold ${avance >= 100 ? "text-green-600" : avance >= 50 ? "text-amber-600" : "text-red-600"}`}>
              {fmtPct(avance)}
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${avance >= 100 ? "bg-green-500" : avance >= 50 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${Math.min(avance, 100)}%` }}
            />
          </div>
        </>
      ) : (
        <div className="mt-1 text-xs text-gray-400">Ingreso adicional</div>
      )}
    </div>
  );
}
