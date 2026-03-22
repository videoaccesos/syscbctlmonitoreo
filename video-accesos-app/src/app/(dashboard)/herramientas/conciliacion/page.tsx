"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Loader2,
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  CreditCard,
  RefreshCw,
  ShoppingCart,
  DollarSign,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ---------- tipos ---------- */
type KPIs = {
  totalVencidas: number;
  totalRenovadas: number;
  totalPendientes: number;
  tasaRenovacion: number;
  ingresoRenovaciones: number;
  ingresoPendiente: number;
  totalVentas: number;
  ingresoVentas: number;
  ventasNuevas: number;
  ventasRenovacion: number;
  vencidasVeh: number;
  vencidasPea: number;
  renovadasVeh: number;
  renovadasPea: number;
  ventasVeh: number;
  ventasPea: number;
  ingresoVentasVeh: number;
  ingresoVentasPea: number;
};

type PrivadaConc = {
  privada_id: number;
  privada: string;
  renovacion: number;
  vencidas: number;
  renovadas: number;
  pendientes: number;
  tasaRenovacion: number;
  vencidasVeh: number;
  vencidasPea: number;
  renovadasVeh: number;
  renovadasPea: number;
  ingresoRenovacion: number;
  ingresoPendiente: number;
  ventasTotal: number;
  ventasNuevas: number;
  ventasRenovacion: number;
  ingresoVentas: number;
};

type ConciliacionData = {
  fechaIni: string;
  fechaFin: string;
  kpis: KPIs;
  concentrado: PrivadaConc[];
  detalle: {
    renovadas: Array<Record<string, unknown>>;
    pendientes: Array<Record<string, unknown>>;
    ventas: Array<Record<string, unknown>>;
  };
};

type TabKey = "resumen" | "conciliacion" | "ventas" | "pendientes";

type PrivadaOption = { privada_id: number; descripcion: string };

const TAB_LABELS: Record<TabKey, string> = {
  resumen: "Dashboard KPIs",
  conciliacion: "Conciliación por Privada",
  ventas: "Detalle de Ventas",
  pendientes: "Tarjetas Pendientes",
};

const COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const fmtMoney = (v: unknown) => {
  const n = Number(v) || 0;
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

/* ================================================================ */

export default function ConciliacionPage() {
  const [fechaIni, setFechaIni] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [privadaId, setPrivadaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConciliacionData | null>(null);
  const [tab, setTab] = useState<TabKey>("resumen");
  const [privadas, setPrivadas] = useState<PrivadaOption[]>([]);

  // Cargar catálogo de privadas
  useEffect(() => {
    fetch("/api/catalogos/privadas?pageSize=500&estatusId=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) {
          setPrivadas(
            json.data.map((p: Record<string, unknown>) => ({
              privada_id: Number(p.id),
              descripcion: String(p.descripcion),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleConsultar = async () => {
    if (!fechaIni || !fechaFin) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ fechaIni, fechaFin });
      if (privadaId) params.set("privadaId", privadaId);
      const res = await fetch(`/api/herramientas/conciliacion?${params}`);
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Error al consultar");
        return;
      }
      setData(await res.json());
      setTab("resumen");
    } catch {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleExportarCSV = () => {
    if (!data) return;
    const rows = data.concentrado;
    const headers = [
      "Privada", "Vencidas", "Renovadas", "Pendientes", "Tasa Renovación %",
      "Vencidas VEH", "Vencidas PEA", "Renovadas VEH", "Renovadas PEA",
      "Ingreso Renovación", "Ingreso Pendiente",
      "Ventas Total", "Ventas Nuevas", "Ventas Renovación", "Ingreso Ventas",
    ];
    const csvRows = [headers.join(",")];
    for (const r of rows) {
      csvRows.push([
        `"${r.privada}"`, r.vencidas, r.renovadas, r.pendientes, r.tasaRenovacion.toFixed(1),
        r.vencidasVeh, r.vencidasPea, r.renovadasVeh, r.renovadasPea,
        r.ingresoRenovacion, r.ingresoPendiente,
        r.ventasTotal, r.ventasNuevas, r.ventasRenovacion, r.ingresoVentas,
      ].join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Conciliacion_${data.fechaIni}_${data.fechaFin}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-indigo-600" />
          Conciliación de Tarjetas
        </h1>
        <p className="text-sm text-gray-700 mt-1">
          Analiza el desempeño de renovaciones y ventas de tarjetas por periodo y privada
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={fechaIni}
              onChange={(e) => setFechaIni(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Privada (opcional)</label>
            <select
              value={privadaId}
              onChange={(e) => setPrivadaId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
            >
              <option value="">Todas las privadas</option>
              {privadas.map((p) => (
                <option key={p.privada_id} value={p.privada_id}>
                  {p.descripcion}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleConsultar}
            disabled={loading || !fechaIni || !fechaFin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Consultando..." : "Consultar"}
          </button>
          {data && (
            <button
              onClick={handleExportarCSV}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {/* Contenido */}
      {data && (
        <>
          {/* Tabs */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-2">
              <div className="flex gap-0">
                {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                      tab === key
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {TAB_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4">
              {tab === "resumen" && <TabResumen data={data} />}
              {tab === "conciliacion" && <TabConciliacion data={data} />}
              {tab === "ventas" && <TabVentas ventas={data.detalle.ventas} />}
              {tab === "pendientes" && <TabPendientes pendientes={data.detalle.pendientes} />}
            </div>
          </div>
        </>
      )}

      {/* Vacío */}
      {!data && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Selecciona un rango de fechas y da click en Consultar</p>
        </div>
      )}
    </div>
  );
}

/* ==================== Tab Resumen (KPIs Dashboard) ==================== */

function TabResumen({ data }: { data: ConciliacionData }) {
  const { kpis } = data;

  const pieRenovacion = [
    { name: "Renovadas", value: kpis.totalRenovadas, color: "#10b981" },
    { name: "Pendientes", value: kpis.totalPendientes, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const pieVentas = [
    { name: "Vehiculares", value: kpis.ventasVeh, color: "#8b5cf6" },
    { name: "Peatonales", value: kpis.ventasPea, color: "#06b6d4" },
  ].filter((d) => d.value > 0);

  const barData = data.concentrado
    .filter((c) => c.vencidas > 0)
    .map((c) => ({
      privada: c.privada.length > 15 ? c.privada.substring(0, 14) + "…" : c.privada,
      renovadas: c.renovadas,
      pendientes: c.pendientes,
      tasa: c.tasaRenovacion,
    }));

  return (
    <div className="space-y-6">
      {/* KPI Cards - Renovaciones */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Desempeño de Renovaciones
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Tarjetas Vencidas"
            value={kpis.totalVencidas}
            icon={<CreditCard className="h-5 w-5 text-amber-600" />}
            sub={`VEH: ${kpis.vencidasVeh} | PEA: ${kpis.vencidasPea}`}
            color="amber"
          />
          <KpiCard
            label="Renovadas"
            value={kpis.totalRenovadas}
            icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
            sub={`VEH: ${kpis.renovadasVeh} | PEA: ${kpis.renovadasPea}`}
            color="green"
          />
          <KpiCard
            label="Pendientes"
            value={kpis.totalPendientes}
            icon={<AlertCircle className="h-5 w-5 text-red-600" />}
            sub={`Ingreso pendiente: ${fmtMoney(kpis.ingresoPendiente)}`}
            color="red"
          />
          <KpiCard
            label="Tasa de Renovación"
            value={fmtPct(kpis.tasaRenovacion)}
            icon={
              kpis.tasaRenovacion >= 70 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )
            }
            sub={`Meta sugerida: 80%`}
            color={kpis.tasaRenovacion >= 70 ? "green" : "red"}
            isPercentage
          />
        </div>
      </div>

      {/* KPI Cards - Ventas */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" /> Ventas del Periodo
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Total Ventas"
            value={kpis.totalVentas}
            icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
            sub={`VEH: ${kpis.ventasVeh} | PEA: ${kpis.ventasPea}`}
            color="blue"
          />
          <KpiCard
            label="Ingreso Total Ventas"
            value={fmtMoney(kpis.ingresoVentas)}
            icon={<DollarSign className="h-5 w-5 text-green-600" />}
            sub={`VEH: ${fmtMoney(kpis.ingresoVentasVeh)} | PEA: ${fmtMoney(kpis.ingresoVentasPea)}`}
            color="green"
            isMoney
          />
          <KpiCard
            label="Ventas Nuevas"
            value={kpis.ventasNuevas}
            icon={<Target className="h-5 w-5 text-purple-600" />}
            sub="Primeras asignaciones o Folio B"
            color="purple"
          />
          <KpiCard
            label="Ventas por Renovación"
            value={kpis.ventasRenovacion}
            icon={<RefreshCw className="h-5 w-5 text-cyan-600" />}
            sub="Reposiciones, cambios y Folio H"
            color="cyan"
          />
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Renovación */}
        {pieRenovacion.length > 0 && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Renovación vs Pendientes</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieRenovacion}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {pieRenovacion.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [Number(value), "Tarjetas"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pie Ventas por tipo */}
        {pieVentas.length > 0 && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Ventas: Vehiculares vs Peatonales</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieVentas}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {pieVentas.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [Number(value), "Tarjetas"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Barra por privada */}
      {barData.length > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Renovación por Privada (solo privadas con vencimientos)
          </h4>
          <ResponsiveContainer width="100%" height={Math.max(300, barData.length * 40)}>
            <BarChart data={barData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="privada" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="renovadas" name="Renovadas" fill="#10b981" stackId="a" />
              <Bar dataKey="pendientes" name="Pendientes" fill="#ef4444" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ==================== KPI Card ==================== */

function KpiCard({
  label,
  value,
  icon,
  sub,
  color,
  isPercentage,
  isMoney,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  sub?: string;
  color: string;
  isPercentage?: boolean;
  isMoney?: boolean;
}) {
  const colorMap: Record<string, string> = {
    amber: "bg-amber-50 border-amber-200",
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
    blue: "bg-blue-50 border-blue-200",
    purple: "bg-purple-50 border-purple-200",
    cyan: "bg-cyan-50 border-cyan-200",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorMap[color] || "bg-gray-50 border-gray-200"}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {icon}
      </div>
      <p className={`font-bold ${isPercentage || isMoney ? "text-xl" : "text-2xl"} text-gray-900`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

/* ==================== Tab Conciliación por Privada ==================== */

function TabConciliacion({ data }: { data: ConciliacionData }) {
  const rows = data.concentrado.filter((c) => c.vencidas > 0 || c.ventasTotal > 0);

  if (rows.length === 0) {
    return <div className="text-center py-8 text-gray-400">No hay datos en este periodo</div>;
  }

  // Totales
  let tVenc = 0, tRen = 0, tPend = 0, tIngRen = 0, tIngPend = 0, tVtas = 0, tIngVtas = 0;
  for (const r of rows) {
    tVenc += r.vencidas;
    tRen += r.renovadas;
    tPend += r.pendientes;
    tIngRen += r.ingresoRenovacion;
    tIngPend += r.ingresoPendiente;
    tVtas += r.ventasTotal;
    tIngVtas += r.ingresoVentas;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-700 text-white">
            <th className="text-left px-3 py-2 font-medium">Privada</th>
            <th className="text-center px-3 py-2 font-medium">Renov.</th>
            <th className="text-right px-3 py-2 font-medium">Vencidas</th>
            <th className="text-right px-3 py-2 font-medium">Renovadas</th>
            <th className="text-right px-3 py-2 font-medium">Pendientes</th>
            <th className="text-right px-3 py-2 font-medium">Tasa %</th>
            <th className="text-right px-3 py-2 font-medium">Ing. Renovación</th>
            <th className="text-right px-3 py-2 font-medium">Ing. Pendiente</th>
            <th className="text-right px-3 py-2 font-medium">Ventas</th>
            <th className="text-right px-3 py-2 font-medium">Ing. Ventas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.privada}
              className={`border-b border-gray-200 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
            >
              <td className="px-3 py-2 font-medium text-gray-900">{r.privada}</td>
              <td className="px-3 py-2 text-center">
                {r.renovacion === 1 ? (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">H</span>
                ) : (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">B</span>
                )}
              </td>
              <td className="px-3 py-2 text-right text-gray-700">{r.vencidas || "-"}</td>
              <td className="px-3 py-2 text-right text-green-700 font-medium">{r.renovadas || "-"}</td>
              <td className="px-3 py-2 text-right text-red-600 font-medium">{r.pendientes || "-"}</td>
              <td className="px-3 py-2 text-right">
                {r.vencidas > 0 ? (
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      r.tasaRenovacion >= 80
                        ? "bg-green-100 text-green-700"
                        : r.tasaRenovacion >= 50
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {fmtPct(r.tasaRenovacion)}
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-3 py-2 text-right text-green-700">{r.ingresoRenovacion ? fmtMoney(r.ingresoRenovacion) : "-"}</td>
              <td className="px-3 py-2 text-right text-red-600">{r.ingresoPendiente ? fmtMoney(r.ingresoPendiente) : "-"}</td>
              <td className="px-3 py-2 text-right text-gray-700">{r.ventasTotal || "-"}</td>
              <td className="px-3 py-2 text-right text-blue-700 font-medium">{r.ingresoVentas ? fmtMoney(r.ingresoVentas) : "-"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-700 text-white">
            <td className="px-3 py-2 font-bold" colSpan={2}>TOTAL</td>
            <td className="px-3 py-2 text-right font-bold">{tVenc}</td>
            <td className="px-3 py-2 text-right font-bold">{tRen}</td>
            <td className="px-3 py-2 text-right font-bold">{tPend}</td>
            <td className="px-3 py-2 text-right font-bold">
              {tVenc > 0 ? fmtPct((tRen / tVenc) * 100) : "-"}
            </td>
            <td className="px-3 py-2 text-right font-bold">{fmtMoney(tIngRen)}</td>
            <td className="px-3 py-2 text-right font-bold">{fmtMoney(tIngPend)}</td>
            <td className="px-3 py-2 text-right font-bold">{tVtas}</td>
            <td className="px-3 py-2 text-right font-bold">{fmtMoney(tIngVtas)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ==================== Tab Ventas ==================== */

function TabVentas({ ventas }: { ventas: Array<Record<string, unknown>> }) {
  if (ventas.length === 0) {
    return <div className="text-center py-8 text-gray-400">No hay ventas en este periodo</div>;
  }

  let totalVeh = 0, totalPea = 0, numVeh = 0, numPea = 0;
  for (const v of ventas) {
    const neto = Number(v.neto) || 0;
    if (Number(v.tipo_id) === 2) { numVeh++; totalVeh += neto; }
    else { numPea++; totalPea += neto; }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-700 text-white">
            <th className="text-center px-3 py-2 font-medium w-8">No.</th>
            <th className="text-left px-3 py-2 font-medium">Fecha</th>
            <th className="text-center px-3 py-2 font-medium">Folio</th>
            <th className="text-left px-3 py-2 font-medium">Privada</th>
            <th className="text-left px-3 py-2 font-medium">Casa</th>
            <th className="text-left px-3 py-2 font-medium">Residente</th>
            <th className="text-center px-3 py-2 font-medium">Tipo</th>
            <th className="text-left px-3 py-2 font-medium">Concepto</th>
            <th className="text-right px-3 py-2 font-medium">Precio</th>
            <th className="text-right px-3 py-2 font-medium">Desc.</th>
            <th className="text-right px-3 py-2 font-medium">Neto</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-gray-200 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
            >
              <td className="text-center px-3 py-1.5 text-gray-500 text-xs font-mono">{String(row.asignacion_id || i + 1)}</td>
              <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{String(row.fecha || "-")}</td>
              <td className="px-3 py-1.5 text-center">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                  row.folio_tipo === "H" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {String(row.folio_tipo || "-")}
                </span>
              </td>
              <td className="px-3 py-1.5 text-gray-700">{String(row.privada || "-")}</td>
              <td className="px-3 py-1.5 text-gray-700">{String(row.nro_casa || "")}</td>
              <td className="px-3 py-1.5 text-gray-900 font-medium">{String(row.residente || "-")}</td>
              <td className="px-3 py-1.5 text-center">
                <span className={`text-xs font-medium ${Number(row.tipo_id) === 2 ? "text-purple-700" : "text-teal-700"}`}>
                  {Number(row.tipo_id) === 2 ? "VEH" : "PEA"}
                </span>
              </td>
              <td className="px-3 py-1.5 text-gray-600 text-xs">{String(row.concepto || "-")}</td>
              <td className="px-3 py-1.5 text-right text-gray-600">{fmtMoney(row.precio)}</td>
              <td className="px-3 py-1.5 text-right text-red-600">{Number(row.descuento) ? fmtMoney(row.descuento) : "-"}</td>
              <td className="px-3 py-1.5 text-right font-medium text-gray-900">{fmtMoney(row.neto)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-400 bg-gray-100">
            <td colSpan={8} />
            <td className="px-3 py-2 text-center text-xs font-medium text-gray-500">PEA</td>
            <td className="px-3 py-2 text-right text-sm font-medium text-gray-600">{numPea} tarjeta(s)</td>
            <td className="px-3 py-2 text-right font-bold text-gray-800">{fmtMoney(totalPea)}</td>
          </tr>
          <tr className="bg-gray-100">
            <td colSpan={8} />
            <td className="px-3 py-2 text-center text-xs font-medium text-gray-500">VEH</td>
            <td className="px-3 py-2 text-right text-sm font-medium text-gray-600">{numVeh} tarjeta(s)</td>
            <td className="px-3 py-2 text-right font-bold text-gray-800">{fmtMoney(totalVeh)}</td>
          </tr>
          <tr className="bg-slate-700 text-white">
            <td colSpan={8} />
            <td className="px-3 py-2 text-center text-sm font-bold">TOTAL</td>
            <td className="px-3 py-2 text-right text-sm font-bold">{numPea + numVeh} tarjeta(s)</td>
            <td className="px-3 py-2 text-right text-lg font-bold">{fmtMoney(totalPea + totalVeh)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ==================== Tab Pendientes ==================== */

function TabPendientes({ pendientes }: { pendientes: Array<Record<string, unknown>> }) {
  if (pendientes.length === 0) {
    return (
      <div className="bg-green-50 rounded-lg border border-green-200 p-8 text-center">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
        <p className="text-green-800 font-medium">Todas las tarjetas vencidas han sido renovadas</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800 font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {pendientes.length} tarjeta(s) vencida(s) sin renovar
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-700 text-white">
              <th className="text-center px-3 py-2 font-medium w-8">ID</th>
              <th className="text-left px-3 py-2 font-medium">Vencimiento</th>
              <th className="text-left px-3 py-2 font-medium">Privada</th>
              <th className="text-left px-3 py-2 font-medium">Casa</th>
              <th className="text-left px-3 py-2 font-medium">Residente</th>
              <th className="text-center px-3 py-2 font-medium">Tipo</th>
              <th className="text-left px-3 py-2 font-medium">Lectura</th>
              <th className="text-right px-3 py-2 font-medium">Precio Renov.</th>
            </tr>
          </thead>
          <tbody>
            {pendientes.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-gray-200 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-red-50`}
              >
                <td className="text-center px-3 py-1.5 text-gray-500 text-xs font-mono">{String(row.asignacion_id)}</td>
                <td className="px-3 py-1.5 text-red-600 font-medium whitespace-nowrap">{String(row.fecha_vencimiento || "-")}</td>
                <td className="px-3 py-1.5 text-gray-700">{String(row.privada || "-")}</td>
                <td className="px-3 py-1.5 text-gray-700">{String(row.nro_casa || "")}</td>
                <td className="px-3 py-1.5 text-gray-900 font-medium">{String(row.residente || "-")}</td>
                <td className="px-3 py-1.5 text-center">
                  <span className={`text-xs font-medium ${Number(row.tipo_id) === 2 ? "text-purple-700" : "text-teal-700"}`}>
                    {Number(row.tipo_id) === 2 ? "VEH" : "PEA"}
                  </span>
                </td>
                <td className="px-3 py-1.5 font-mono text-xs text-gray-600">{String(row.lectura || "-")}</td>
                <td className="px-3 py-1.5 text-right text-amber-700 font-medium">{fmtMoney(row.precio_renovacion)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-700 text-white">
              <td colSpan={7} className="px-3 py-2 font-bold">TOTAL PENDIENTE</td>
              <td className="px-3 py-2 text-right font-bold text-lg">
                {fmtMoney(pendientes.reduce((s, r) => s + (Number(r.precio_renovacion) || 0), 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
