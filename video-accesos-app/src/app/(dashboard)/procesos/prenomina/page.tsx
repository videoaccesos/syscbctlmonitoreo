"use client";

import { useState, useCallback } from "react";
import {
  DollarSign,
  Loader2,
  Play,
  CheckCircle,
  Banknote,
  XCircle,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PrenominaRow {
  prenomina_id: number;
  empleado_id: number;
  periodo: string;
  quincena: number;
  sueldo_base: number;
  dias_trabajados: number;
  deducciones: number;
  percepciones: number;
  total_pagar: number;
  observaciones: string | null;
  estatus_id: number;
  fecha_creacion: string;
  nombre: string;
  ape_paterno: string;
  ape_materno: string;
  puesto: string;
}

interface Kpis {
  totalEmpleados: number;
  totalNomina: number;
  totalDeducciones: number;
  totalPercepciones: number;
}

const ESTATUS_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Pendiente", color: "bg-yellow-50 text-yellow-700 ring-yellow-600/20" },
  2: { label: "Aprobada", color: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  3: { label: "Pagada", color: "bg-green-50 text-green-700 ring-green-600/20" },
  4: { label: "Cancelada", color: "bg-red-50 text-red-700 ring-red-600/20" },
};

function formatMoney(n: number): string {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PrenominaPage() {
  const now = new Date();
  const currentPeriodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentQuincena = now.getDate() <= 15 ? 1 : 2;

  const [periodo, setPeriodo] = useState(currentPeriodo);
  const [quincena, setQuincena] = useState(currentQuincena);
  const [data, setData] = useState<PrenominaRow[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [editRow, setEditRow] = useState<PrenominaRow | null>(null);
  const [editForm, setEditForm] = useState({ diasTrabajados: "", deducciones: "", percepciones: "", observaciones: "" });
  const [editSaving, setEditSaving] = useState(false);

  const fetchPrenomina = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/procesos/prenomina?periodo=${periodo}&quincena=${quincena}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al consultar");
      setData(json.data || []);
      setKpis(json.kpis || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData([]);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }, [periodo, quincena]);

  const generar = async () => {
    if (!confirm(`¿Generar prenomina para ${periodo} Quincena ${quincena}?`)) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/procesos/prenomina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodo, quincena }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al generar");
      alert(json.message);
      await fetchPrenomina();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const accionMasiva = async (accion: "aprobar" | "pagar" | "cancelar") => {
    const labels = { aprobar: "aprobar", pagar: "marcar como pagada", cancelar: "cancelar" };
    if (!confirm(`¿Desea ${labels[accion]} toda la prenomina de ${periodo} Q${quincena}?`)) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/procesos/prenomina/aprobar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodo, quincena, accion }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      alert(json.message);
      await fetchPrenomina();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (row: PrenominaRow) => {
    setEditRow(row);
    setEditForm({
      diasTrabajados: String(row.dias_trabajados),
      deducciones: String(row.deducciones),
      percepciones: String(row.percepciones),
      observaciones: row.observaciones || "",
    });
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/procesos/prenomina/${editRow.prenomina_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diasTrabajados: Number(editForm.diasTrabajados),
          deducciones: Number(editForm.deducciones),
          percepciones: Number(editForm.percepciones),
          observaciones: editForm.observaciones,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");
      setEditRow(null);
      await fetchPrenomina();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setEditSaving(false);
    }
  };

  // Navegación rápida de periodo
  const navPeriodo = (dir: -1 | 1) => {
    const [y, m] = periodo.split("-").map(Number);
    let nm = m + dir;
    let ny = y;
    if (nm > 12) { nm = 1; ny++; }
    if (nm < 1) { nm = 12; ny--; }
    setPeriodo(`${ny}-${String(nm).padStart(2, "0")}`);
  };

  // Determinar estatus global de la prenomina
  const globalEstatus = data.length > 0 ? data[0].estatus_id : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700">
          <DollarSign className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prenomina Quincenal</h1>
          <p className="text-sm text-gray-500">Generación y control de nómina quincenal por empleado.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
            <div className="flex items-center gap-1">
              <button onClick={() => navPeriodo(-1)} className="p-2 hover:bg-gray-100 rounded">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                type="month"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <button onClick={() => navPeriodo(1)} className="p-2 hover:bg-gray-100 rounded">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quincena</label>
            <select
              value={quincena}
              onChange={(e) => setQuincena(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value={1}>1ra Quincena (1-15)</option>
              <option value={2}>2da Quincena (16-fin)</option>
            </select>
          </div>
          <button
            onClick={fetchPrenomina}
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Consultar
          </button>
          <button
            onClick={generar}
            disabled={generating || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Generar Prenomina
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* KPIs */}
      {kpis && data.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Empleados</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.totalEmpleados}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Total Nómina</p>
            <p className="text-2xl font-bold text-emerald-700">{formatMoney(kpis.totalNomina)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Deducciones</p>
            <p className="text-2xl font-bold text-red-600">{formatMoney(kpis.totalDeducciones)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase">Percepciones</p>
            <p className="text-2xl font-bold text-blue-600">{formatMoney(kpis.totalPercepciones)}</p>
          </div>
        </div>
      )}

      {/* Acciones masivas */}
      {data.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {globalEstatus === 1 && (
            <>
              <button
                onClick={() => accionMasiva("aprobar")}
                disabled={actionLoading}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" /> Aprobar Toda
              </button>
              <button
                onClick={() => accionMasiva("cancelar")}
                disabled={actionLoading}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Cancelar Toda
              </button>
            </>
          )}
          {globalEstatus === 2 && (
            <button
              onClick={() => accionMasiva("pagar")}
              disabled={actionLoading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              <Banknote className="h-4 w-4" /> Marcar como Pagada
            </button>
          )}
          {actionLoading && <Loader2 className="h-5 w-5 animate-spin text-gray-500 self-center" />}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Empleado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Puesto</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Sueldo Base</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Días</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Deducciones</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Percepciones</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total a Pagar</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Estatus</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" />
                    <p className="text-gray-600 text-sm mt-2">Cargando...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500 text-sm">
                    No hay datos. Consulte un periodo o genere la prenomina.
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  const est = ESTATUS_LABELS[row.estatus_id] || { label: "?", color: "bg-gray-100 text-gray-600" };
                  return (
                    <tr key={row.prenomina_id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {row.ape_paterno} {row.ape_materno} {row.nombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.puesto}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{formatMoney(row.sueldo_base)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">{row.dias_trabajados}</td>
                      <td className="px-4 py-3 text-sm text-red-600 text-right">{row.deducciones > 0 ? `-${formatMoney(row.deducciones)}` : "-"}</td>
                      <td className="px-4 py-3 text-sm text-blue-600 text-right">{row.percepciones > 0 ? `+${formatMoney(row.percepciones)}` : "-"}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-700 text-right">{formatMoney(row.total_pagar)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${est.color}`}>
                          {est.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.estatus_id <= 2 && (
                          <button
                            onClick={() => openEdit(row)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-emerald-600 transition"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal editar registro */}
      {editRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Editar - {editRow.ape_paterno} {editRow.nombre}
              </h3>
              <button onClick={() => setEditRow(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Días Trabajados</label>
                <input
                  type="number"
                  value={editForm.diasTrabajados}
                  onChange={(e) => setEditForm({ ...editForm, diasTrabajados: e.target.value })}
                  min="0"
                  max="15"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deducciones</label>
                <input
                  type="number"
                  value={editForm.deducciones}
                  onChange={(e) => setEditForm({ ...editForm, deducciones: e.target.value })}
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Percepciones</label>
                <input
                  type="number"
                  value={editForm.percepciones}
                  onChange={(e) => setEditForm({ ...editForm, percepciones: e.target.value })}
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <input
                  type="text"
                  value={editForm.observaciones}
                  onChange={(e) => setEditForm({ ...editForm, observaciones: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setEditRow(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
