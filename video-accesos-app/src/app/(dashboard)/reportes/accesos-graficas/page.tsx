"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3 } from "lucide-react";

/* ---------- tipos ---------- */
interface Privada {
  id: number;
  descripcion: string;
}

interface TipoGestionItem {
  tipoGestionId: number;
  label: string;
  count: number;
}

interface EstatusItem {
  estatusId: number;
  label: string;
  count: number;
}

interface DiaItem {
  fecha: string;
  count: number;
}

interface HoraItem {
  hora: number;
  count: number;
}

interface PrivadaRankingItem {
  privadaId: number;
  privadaNombre: string;
  total: number;
  porTipo: Record<number, number>;
}

interface GraficasData {
  porTipoGestion: TipoGestionItem[];
  porEstatus: EstatusItem[];
  porDia: DiaItem[];
  porHora: HoraItem[];
  porPrivada: PrivadaRankingItem[];
  total: number;
}

/* ---------- constantes ---------- */
const COLORES_TIPO = [
  "bg-blue-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-red-500",
];

const COLORES_ESTATUS: Record<number, string> = {
  1: "bg-green-500",
  2: "bg-red-500",
  3: "bg-blue-500",
};

const COLORES_ESTATUS_LIGHT: Record<number, string> = {
  1: "text-green-700 bg-green-100",
  2: "text-red-700 bg-red-100",
  3: "text-blue-700 bg-blue-100",
};

/* ---------- helpers ---------- */
function getDefaultFechaDesde(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getDefaultFechaHasta(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

function formatFechaCorta(iso: string): string {
  const parts = iso.split("-");
  return `${parts[2]}/${parts[1]}`;
}

/* ================================================================ */

export default function AccesosGraficasPage() {
  /* ---------- state ---------- */
  const [privadas, setPrivadas] = useState<Privada[]>([]);
  const [data, setData] = useState<GraficasData | null>(null);
  const [loading, setLoading] = useState(false);

  // filtros
  const [filtroPrivadaId, setFiltroPrivadaId] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(getDefaultFechaDesde);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(getDefaultFechaHasta);

  // filtros aplicados
  const [appliedFilters, setAppliedFilters] = useState({
    privadaId: "",
    fechaDesde: getDefaultFechaDesde(),
    fechaHasta: getDefaultFechaHasta(),
  });

  /* ---------- cargar privadas ---------- */
  useEffect(() => {
    async function loadPrivadas() {
      try {
        const res = await fetch("/api/catalogos/privadas?pageSize=500&estatusId=1");
        if (!res.ok) return;
        const json = await res.json();
        setPrivadas(json.data || []);
      } catch {
        console.error("Error al cargar privadas");
      }
    }
    loadPrivadas();
  }, []);

  /* ---------- fetch datos ---------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedFilters.privadaId) params.set("privadaId", appliedFilters.privadaId);
      if (appliedFilters.fechaDesde) params.set("fechaDesde", appliedFilters.fechaDesde);
      if (appliedFilters.fechaHasta) params.set("fechaHasta", appliedFilters.fechaHasta);

      const res = await fetch(`/api/reportes/accesos-graficas?${params}`);
      if (!res.ok) throw new Error("Error al obtener datos");
      const json: GraficasData = await res.json();
      setData(json);
    } catch {
      console.error("Error al cargar graficas");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- acciones ---------- */
  const handleGenerar = () => {
    setAppliedFilters({
      privadaId: filtroPrivadaId,
      fechaDesde: filtroFechaDesde,
      fechaHasta: filtroFechaHasta,
    });
  };

  /* ---------- helpers de grafica ---------- */
  const maxCount = (arr: { count: number }[]) =>
    arr.reduce((max, item) => Math.max(max, item.count), 0) || 1;

  /* ================================================================ */
  /* RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="bg-purple-100 p-2 rounded-lg">
          <BarChart3 className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accesos - Graficas</h1>
          <p className="text-sm text-gray-700">Visualizacion grafica de registros de acceso</p>
        </div>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Privada */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Privada</label>
            <select
              value={filtroPrivadaId}
              onChange={(e) => setFiltroPrivadaId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              {privadas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.descripcion}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Boton Generar */}
          <div className="flex items-end">
            <button
              onClick={handleGenerar}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              <BarChart3 className="h-4 w-4" />
              Generar
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-gray-600">Cargando datos...</div>
      )}

      {/* Graficas */}
      {data && !loading && (
        <div className="space-y-6">
          {/* Total */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-700">Total de accesos en el periodo</p>
            <p className="text-4xl font-bold text-gray-900">{data.total.toLocaleString()}</p>
          </div>

          {/* Ranking por Privada (solo cuando no hay filtro de privada) */}
          {data.porPrivada && data.porPrivada.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Ranking por Privada
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 text-gray-600 font-medium">#</th>
                      <th className="text-left py-2 px-2 text-gray-600 font-medium">Privada</th>
                      <th className="text-right py-2 px-2 text-gray-600 font-medium">Total</th>
                      <th className="text-right py-2 px-2 text-green-700 font-medium">Residentes</th>
                      <th className="text-right py-2 px-2 text-indigo-700 font-medium">Visitas</th>
                      <th className="text-right py-2 px-2 text-purple-700 font-medium">Proveedores</th>
                      <th className="text-right py-2 px-2 text-cyan-700 font-medium">Tecnicos</th>
                      <th className="text-right py-2 px-2 text-yellow-700 font-medium">Morosos</th>
                      <th className="text-right py-2 px-2 text-orange-700 font-medium">Otros</th>
                      <th className="text-left py-2 px-3 text-gray-600 font-medium w-48">Distribucion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.porPrivada.map((item, idx) => {
                      const residentes = item.porTipo[4] || 0;
                      const visitas = (item.porTipo[8] || 0) + (item.porTipo[9] || 0);
                      const proveedores = item.porTipo[3] || 0;
                      const tecnicos = item.porTipo[5] || 0;
                      const morosos = item.porTipo[2] || 0;
                      const otros = item.total - residentes - visitas - proveedores - tecnicos - morosos;
                      const maxTotal = data.porPrivada[0]?.total || 1;
                      const barPct = (item.total / maxTotal) * 100;
                      // Sub-bars within distribution
                      const resPct = item.total > 0 ? (residentes / item.total) * 100 : 0;
                      const visPct = item.total > 0 ? (visitas / item.total) * 100 : 0;
                      const prvPct = item.total > 0 ? (proveedores / item.total) * 100 : 0;
                      const tecPct = item.total > 0 ? (tecnicos / item.total) * 100 : 0;
                      const morPct = item.total > 0 ? (morosos / item.total) * 100 : 0;
                      const otrPct = item.total > 0 ? (otros / item.total) * 100 : 0;

                      return (
                        <tr key={item.privadaId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2 text-gray-500 font-mono">{idx + 1}</td>
                          <td className="py-2 px-2 font-medium text-gray-900 whitespace-nowrap">{item.privadaNombre}</td>
                          <td className="py-2 px-2 text-right font-bold text-gray-900">{item.total.toLocaleString()}</td>
                          <td className="py-2 px-2 text-right text-green-700">{residentes > 0 ? residentes.toLocaleString() : "-"}</td>
                          <td className="py-2 px-2 text-right text-indigo-700">{visitas > 0 ? visitas.toLocaleString() : "-"}</td>
                          <td className="py-2 px-2 text-right text-purple-700">{proveedores > 0 ? proveedores.toLocaleString() : "-"}</td>
                          <td className="py-2 px-2 text-right text-cyan-700">{tecnicos > 0 ? tecnicos.toLocaleString() : "-"}</td>
                          <td className="py-2 px-2 text-right text-yellow-700">{morosos > 0 ? morosos.toLocaleString() : "-"}</td>
                          <td className="py-2 px-2 text-right text-orange-700">{otros > 0 ? otros.toLocaleString() : "-"}</td>
                          <td className="py-2 px-3">
                            <div className="flex h-4 rounded-full overflow-hidden bg-gray-100" style={{ width: `${Math.max(barPct, 8)}%` }}>
                              {resPct > 0 && <div className="bg-green-500 transition-all" style={{ width: `${resPct}%` }} title={`Residentes: ${residentes}`} />}
                              {visPct > 0 && <div className="bg-indigo-500 transition-all" style={{ width: `${visPct}%` }} title={`Visitas: ${visitas}`} />}
                              {prvPct > 0 && <div className="bg-purple-500 transition-all" style={{ width: `${prvPct}%` }} title={`Proveedores: ${proveedores}`} />}
                              {tecPct > 0 && <div className="bg-cyan-500 transition-all" style={{ width: `${tecPct}%` }} title={`Tecnicos: ${tecnicos}`} />}
                              {morPct > 0 && <div className="bg-yellow-500 transition-all" style={{ width: `${morPct}%` }} title={`Morosos: ${morosos}`} />}
                              {otrPct > 0 && <div className="bg-orange-400 transition-all" style={{ width: `${otrPct}%` }} title={`Otros: ${otros}`} />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grafica: Por Tipo de Gestion (barras horizontales) */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Accesos por Tipo de Gestion
              </h3>
              {data.porTipoGestion.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-8">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {data.porTipoGestion.map((item, idx) => {
                    const max = maxCount(data.porTipoGestion);
                    const pct = (item.count / max) * 100;
                    return (
                      <div key={item.tipoGestionId}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{item.label}</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {item.count.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-5">
                          <div
                            className={`h-5 rounded-full ${COLORES_TIPO[idx % COLORES_TIPO.length]} transition-all duration-500`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Grafica: Por Resultado (tipo pie con porcentajes) */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Accesos por Resultado
              </h3>
              {data.porEstatus.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-8">Sin datos</p>
              ) : (
                <div className="space-y-4">
                  {/* Barra apilada como representacion visual */}
                  <div className="flex h-8 rounded-full overflow-hidden">
                    {data.porEstatus.map((item) => {
                      const pct = data.total > 0 ? (item.count / data.total) * 100 : 0;
                      return (
                        <div
                          key={item.estatusId}
                          className={`${COLORES_ESTATUS[item.estatusId] || "bg-gray-400"} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                          title={`${item.label}: ${item.count} (${pct.toFixed(1)}%)`}
                        />
                      );
                    })}
                  </div>

                  {/* Detalle con porcentajes */}
                  <div className="grid grid-cols-1 gap-3 mt-4">
                    {data.porEstatus.map((item) => {
                      const pct = data.total > 0 ? (item.count / data.total) * 100 : 0;
                      return (
                        <div
                          key={item.estatusId}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full ${COLORES_ESTATUS[item.estatusId] || "bg-gray-400"}`}
                            />
                            <span className="text-sm font-medium text-gray-700">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                                COLORES_ESTATUS_LIGHT[item.estatusId] || "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {pct.toFixed(1)}%
                            </span>
                            <span className="text-sm font-bold text-gray-900 w-16 text-right">
                              {item.count.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grafica: Por Dia (barras verticales) */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Accesos por Dia
            </h3>
            {data.porDia.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-8">Sin datos</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 min-w-fit" style={{ height: "200px" }}>
                  {data.porDia.map((item) => {
                    const max = maxCount(data.porDia);
                    const pct = (item.count / max) * 100;
                    return (
                      <div
                        key={item.fecha}
                        className="flex flex-col items-center flex-1 min-w-[28px]"
                        style={{ height: "100%" }}
                      >
                        {/* Valor */}
                        <span className="text-[10px] text-gray-700 mb-1">
                          {item.count > 0 ? item.count : ""}
                        </span>
                        {/* Contenedor barra */}
                        <div className="flex-1 w-full flex items-end">
                          <div
                            className="w-full bg-indigo-500 rounded-t transition-all duration-500 min-h-[2px]"
                            style={{ height: `${Math.max(pct, 1)}%` }}
                            title={`${item.fecha}: ${item.count}`}
                          />
                        </div>
                        {/* Fecha */}
                        <span className="text-[9px] text-gray-600 mt-1 rotate-[-45deg] origin-top-left whitespace-nowrap">
                          {formatFechaCorta(item.fecha)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Grafica: Distribucion por Hora (24 barras) */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Distribucion por Hora
            </h3>
            {data.porHora.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-8">Sin datos</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 min-w-fit" style={{ height: "180px" }}>
                  {data.porHora.map((item) => {
                    const max = maxCount(data.porHora);
                    const pct = max > 0 ? (item.count / max) * 100 : 0;
                    return (
                      <div
                        key={item.hora}
                        className="flex flex-col items-center flex-1 min-w-[32px]"
                        style={{ height: "100%" }}
                      >
                        {/* Valor */}
                        <span className="text-[10px] text-gray-700 mb-1">
                          {item.count > 0 ? item.count : ""}
                        </span>
                        {/* Contenedor barra */}
                        <div className="flex-1 w-full flex items-end">
                          <div
                            className="w-full bg-teal-500 rounded-t transition-all duration-500 min-h-[2px]"
                            style={{ height: `${Math.max(pct, 1)}%` }}
                            title={`${String(item.hora).padStart(2, "0")}:00 - ${item.count} accesos`}
                          />
                        </div>
                        {/* Hora */}
                        <span className="text-xs text-gray-700 mt-1">
                          {String(item.hora).padStart(2, "0")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
