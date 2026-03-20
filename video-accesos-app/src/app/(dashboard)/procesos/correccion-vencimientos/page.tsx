"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wrench,
} from "lucide-react";

type Correccion = {
  asignacion_id: number;
  tarjeta_id: string;
  observaciones: string;
  fecha: string | null;
  fecha_vencimiento_actual: string | null;
  fecha_vencimiento_correcta: string;
  baja_tarjeta: string | null;
  baja_tarjeta_estatus: string | null;
  baja_tarjeta_asignacion_id: number | null;
  motivo_baja: string;
  residente: string;
  privada: string;
  nro_casa: string;
  necesita_correccion: boolean;
};

type AnalisisData = {
  totalAnalizadas: number;
  yaCorrectas: number;
  porCorregir: number;
  correcciones: Correccion[];
};

export default function CorreccionVencimientosPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalisisData | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(new Set());

  const handleAnalizar = async () => {
    setLoading(true);
    setResultado(null);
    try {
      const res = await fetch("/api/dev/analisis-observaciones");
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "Error al analizar");
        return;
      }
      const json = await res.json();
      setData(json);
      // Seleccionar todas por defecto
      setSeleccionadas(new Set(json.correcciones.map((c: Correccion) => c.asignacion_id)));
    } catch {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleAplicar = async () => {
    if (!data || seleccionadas.size === 0) return;

    const tarjetasViejasActivas = data.correcciones.filter(
      (c) => seleccionadas.has(c.asignacion_id) && c.baja_tarjeta && c.baja_tarjeta_estatus === "ACTIVA"
    ).length;

    const msgConfirm = tarjetasViejasActivas > 0
      ? `Se corregirán ${seleccionadas.size} vencimiento(s) y se cancelarán ${tarjetasViejasActivas} tarjeta(s) vieja(s). ¿Continuar?`
      : `Se corregirá el vencimiento de ${seleccionadas.size} tarjeta(s). ¿Continuar?`;

    if (!confirm(msgConfirm)) return;

    setAplicando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/dev/analisis-observaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asignacion_ids: Array.from(seleccionadas) }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Error al aplicar correcciones");
        return;
      }
      setResultado(json.message);
      // Refrescar datos
      handleAnalizar();
    } catch {
      alert("Error de conexión");
    } finally {
      setAplicando(false);
    }
  };

  const toggleSeleccion = (id: number) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodas = () => {
    if (!data) return;
    if (seleccionadas.size === data.correcciones.length) {
      setSeleccionadas(new Set());
    } else {
      setSeleccionadas(new Set(data.correcciones.map((c) => c.asignacion_id)));
    }
  };

  const estatusBadge = (estatus: string | null) => {
    if (!estatus) return null;
    if (estatus === "ACTIVA") {
      return <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">ACTIVA (se cancelará)</span>;
    }
    if (estatus === "CANCELADA") {
      return <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">YA CANCELADA</span>;
    }
    return <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">NO ENCONTRADA</span>;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="h-7 w-7 text-blue-600" />
          Corrección de Vencimientos (Reposiciones)
        </h1>
        <p className="text-sm text-gray-700 mt-1">
          Detecta tarjetas de reposición/garantía cuyo vencimiento no coincide con la fecha indicada en observaciones, cancela la tarjeta vieja y permite corregir
        </p>
      </div>

      {/* Acciones */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleAnalizar}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Analizando..." : "Analizar Observaciones"}
          </button>

          {data && data.porCorregir > 0 && (
            <button
              onClick={handleAplicar}
              disabled={aplicando || seleccionadas.size === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {aplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {aplicando ? "Aplicando..." : `Aplicar Correcciones (${seleccionadas.size})`}
            </button>
          )}
        </div>

        {resultado && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-medium">
            {resultado}
          </div>
        )}
      </div>

      {/* Resumen */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Tarjetas con &quot;VENCE&quot; en obs.</p>
            <p className="text-2xl font-bold text-gray-900">{data.totalAnalizadas}</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <p className="text-sm text-green-600">Ya correctas</p>
            <p className="text-2xl font-bold text-green-700">{data.yaCorrectas}</p>
          </div>
          <div className={`rounded-lg border p-4 ${data.porCorregir > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
            <p className={`text-sm ${data.porCorregir > 0 ? "text-amber-600" : "text-green-600"}`}>Por corregir</p>
            <p className={`text-2xl font-bold ${data.porCorregir > 0 ? "text-amber-700" : "text-green-700"}`}>{data.porCorregir}</p>
          </div>
        </div>
      )}

      {/* Tabla de correcciones */}
      {data && data.correcciones.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-3 border-b border-gray-200 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="font-medium text-gray-900">Tarjetas que necesitan corrección</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-700 text-white">
                  <th className="px-3 py-2 text-center w-10">
                    <input
                      type="checkbox"
                      checked={seleccionadas.size === data.correcciones.length}
                      onChange={toggleTodas}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium">ID</th>
                  <th className="px-3 py-2 text-left font-medium">Tarjeta Nueva</th>
                  <th className="px-3 py-2 text-left font-medium">Residente</th>
                  <th className="px-3 py-2 text-left font-medium">Privada</th>
                  <th className="px-3 py-2 text-left font-medium">Casa</th>
                  <th className="px-3 py-2 text-left font-medium">Venc. Actual</th>
                  <th className="px-3 py-2 text-left font-medium">Venc. Correcto</th>
                  <th className="px-3 py-2 text-left font-medium">Motivo</th>
                  <th className="px-3 py-2 text-left font-medium">Tarjeta Baja</th>
                  <th className="px-3 py-2 text-left font-medium">Estatus Tarjeta Baja</th>
                </tr>
              </thead>
              <tbody>
                {data.correcciones.map((c, i) => (
                  <tr
                    key={c.asignacion_id}
                    className={`border-b border-gray-200 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
                  >
                    <td className="px-3 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={seleccionadas.has(c.asignacion_id)}
                        onChange={() => toggleSeleccion(c.asignacion_id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-1.5 font-mono text-xs text-gray-500">{c.asignacion_id}</td>
                    <td className="px-3 py-1.5 font-mono text-xs">{c.tarjeta_id}</td>
                    <td className="px-3 py-1.5 text-gray-900 font-medium">{c.residente}</td>
                    <td className="px-3 py-1.5 text-gray-700">{c.privada}</td>
                    <td className="px-3 py-1.5 text-gray-700">{c.nro_casa}</td>
                    <td className="px-3 py-1.5">
                      {c.necesita_correccion ? (
                        <span className="text-red-600 font-medium">{c.fecha_vencimiento_actual || "NULL"}</span>
                      ) : (
                        <span className="text-green-600">{c.fecha_vencimiento_actual || "NULL"}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className="text-green-700 font-bold">{c.fecha_vencimiento_correcta}</span>
                    </td>
                    <td className="px-3 py-1.5 text-xs font-medium text-gray-700">{c.motivo_baja}</td>
                    <td className="px-3 py-1.5 font-mono text-xs text-gray-500">{c.baja_tarjeta || "-"}</td>
                    <td className="px-3 py-1.5">{c.baja_tarjeta ? estatusBadge(c.baja_tarjeta_estatus) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && data.correcciones.length === 0 && (
        <div className="bg-green-50 rounded-lg border border-green-200 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
          <p className="text-green-800 font-medium">Todas las tarjetas están correctas y las bajas ya están canceladas</p>
        </div>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
          <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Da click en &quot;Analizar Observaciones&quot; para detectar tarjetas que necesitan corrección</p>
        </div>
      )}
    </div>
  );
}
