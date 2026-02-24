"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Eye } from "lucide-react";

interface SupervisionLlamada {
  id: number;
  registroAccesoId: number;
  supervisorId: number;
  fecha: string;
  saludo: boolean;
  identificoEmpresa: boolean;
  identificoOperador: boolean;
  amable: boolean;
  gracias: boolean;
  demanda: boolean;
  asunto: boolean;
  tiempoGestion: string | null;
  observaciones: string | null;
  registroAcceso?: {
    privada: { descripcion: string };
    residencia: { nroCasa: string };
    empleado: { nombre: string; apePaterno: string };
  };
}

export default function SupervisionLlamadasPage() {
  const [data, setData] = useState<SupervisionLlamada[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [fechaHasta, setFechaHasta] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        fechaDesde,
        fechaHasta,
      });
      const res = await fetch(`/api/procesos/supervision-llamadas?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch {
      console.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [page, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  const Check = ({ value }: { value: boolean }) => (
    <span className={value ? "text-green-600 font-bold" : "text-red-400"}>
      {value ? "✓" : "✗"}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Supervisión de Llamadas
          </h1>
          <p className="text-gray-500 mt-1">
            Evaluación de calidad de atención
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => {
              setPage(1);
              fetchData();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Buscar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Fecha
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Operador
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Privada
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                Saludo
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                Empresa
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                Operador
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                Amable
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                Gracias
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                Demanda
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                Asunto
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Tiempo
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-gray-400">
                  Cargando...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-gray-400">
                  No se encontraron registros
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.id}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3">
                    {new Date(item.fecha).toLocaleDateString("es-MX")}
                  </td>
                  <td className="px-4 py-3">
                    {item.registroAcceso?.empleado
                      ? `${item.registroAcceso.empleado.nombre} ${item.registroAcceso.empleado.apePaterno}`
                      : "--"}
                  </td>
                  <td className="px-4 py-3">
                    {item.registroAcceso?.privada?.descripcion || "--"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Check value={item.saludo} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Check value={item.identificoEmpresa} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Check value={item.identificoOperador} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Check value={item.amable} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Check value={item.gracias} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Check value={item.demanda} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Check value={item.asunto} />
                  </td>
                  <td className="px-4 py-3">
                    {item.tiempoGestion || "--"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Total: {total} registros
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border text-sm disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-sm">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border text-sm disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
