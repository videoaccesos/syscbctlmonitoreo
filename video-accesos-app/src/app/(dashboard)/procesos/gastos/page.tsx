"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Pencil, Trash2, X, DollarSign } from "lucide-react";

interface Gasto {
  id: number;
  tipoGastoId: number;
  privadaId: number;
  descripcionGasto: string;
  fechaPago: string;
  comprobante: string | null;
  total: number;
  tipoPago: number;
  estatusId: number;
  tipoGasto?: { descripcion: string };
  privada?: { descripcion: string };
}

interface Privada {
  id: number;
  descripcion: string;
}

interface TipoGasto {
  id: number;
  descripcion: string;
}

const TIPO_PAGO: Record<number, string> = {
  1: "Efectivo",
  2: "Bancos",
  3: "Caja",
};

export default function GastosPage() {
  const [data, setData] = useState<Gasto[]>([]);
  const [privadas, setPrivadas] = useState<Privada[]>([]);
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtroPrivada, setFiltroPrivada] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Gasto | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    tipoGastoId: "",
    privadaId: "",
    descripcionGasto: "",
    fechaPago: new Date().toISOString().split("T")[0],
    comprobante: "",
    total: "",
    tipoPago: "1",
  });
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (filtroPrivada) params.append("privadaId", filtroPrivada);
      const res = await fetch(`/api/procesos/gastos?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } catch {
      console.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [page, filtroPrivada]);

  useEffect(() => {
    fetch("/api/catalogos/privadas?pageSize=999")
      .then((r) => r.json())
      .then((j) => setPrivadas(j.data || []));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  const sumaTotal = data.reduce(
    (acc, g) => acc + (Number(g.total) || 0),
    0
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      tipoGastoId: "",
      privadaId: "",
      descripcionGasto: "",
      fechaPago: new Date().toISOString().split("T")[0],
      comprobante: "",
      total: "",
      tipoPago: "1",
    });
    setError("");
    setShowModal(true);
  };

  const openEdit = (gasto: Gasto) => {
    setEditing(gasto);
    setForm({
      tipoGastoId: String(gasto.tipoGastoId),
      privadaId: String(gasto.privadaId),
      descripcionGasto: gasto.descripcionGasto,
      fechaPago: gasto.fechaPago || "",
      comprobante: gasto.comprobante || "",
      total: String(gasto.total),
      tipoPago: String(gasto.tipoPago),
    });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.tipoGastoId || !form.privadaId || !form.descripcionGasto || !form.total) {
      setError("Todos los campos requeridos deben llenarse");
      return;
    }
    try {
      const url = editing
        ? `/api/procesos/gastos/${editing.id}`
        : "/api/procesos/gastos";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tipoGastoId: parseInt(form.tipoGastoId),
          privadaId: parseInt(form.privadaId),
          total: parseFloat(form.total),
          tipoPago: parseInt(form.tipoPago),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Error al guardar");
        return;
      }
      setShowModal(false);
      fetchData();
    } catch {
      setError("Error de conexión");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    await fetch(`/api/procesos/gastos/${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="text-gray-500 mt-1">Registro de gastos por privada</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Privada
            </label>
            <select
              value={filtroPrivada}
              onChange={(e) => {
                setFiltroPrivada(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {privadas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.descripcion}
                </option>
              ))}
            </select>
          </div>
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
                Privada
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Tipo
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Descripción
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                Total
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Pago
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                Aut.
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                Pagado
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Cargando...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  No se encontraron gastos
                </td>
              </tr>
            ) : (
              data.map((gasto) => (
                <tr
                  key={gasto.id}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3">
                    {new Date(gasto.fechaPago).toLocaleDateString("es-MX")}
                  </td>
                  <td className="px-4 py-3">
                    {gasto.privada?.descripcion || "--"}
                  </td>
                  <td className="px-4 py-3">
                    {gasto.tipoGasto?.descripcion || "--"}
                  </td>
                  <td className="px-4 py-3">{gasto.descripcion}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${Number(gasto.total).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {TIPO_PAGO[gasto.tipoPagoId] || "--"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        gasto.autorizado
                          ? "text-green-600 font-bold"
                          : "text-gray-400"
                      }
                    >
                      {gasto.autorizado ? "✓" : "✗"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        gasto.pagado
                          ? "text-green-600 font-bold"
                          : "text-gray-400"
                      }
                    >
                      {gasto.pagado ? "✓" : "✗"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => openEdit(gasto)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(gasto.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot className="bg-gray-50 border-t-2">
              <tr>
                <td colSpan={4} className="px-4 py-3 font-bold text-right">
                  Total:
                </td>
                <td className="px-4 py-3 text-right font-bold text-green-700">
                  ${sumaTotal.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Total: {total} registros</p>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                {editing ? "Editar Gasto" : "Nuevo Gasto"}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            {error && (
              <p className="text-red-600 text-sm mb-3 bg-red-50 p-2 rounded">
                {error}
              </p>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Privada *
                </label>
                <select
                  value={form.privadaId}
                  onChange={(e) =>
                    setForm({ ...form, privadaId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {privadas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.descripcion}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción *
                </label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  maxLength={100}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.total}
                    onChange={(e) =>
                      setForm({ ...form, total: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Pago
                  </label>
                  <input
                    type="date"
                    value={form.fechaPago}
                    onChange={(e) =>
                      setForm({ ...form, fechaPago: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Pago
                  </label>
                  <select
                    value={form.tipoPagoId}
                    onChange={(e) =>
                      setForm({ ...form, tipoPagoId: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="1">Efectivo</option>
                    <option value="2">Bancos</option>
                    <option value="3">Caja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comprobante
                  </label>
                  <input
                    type="text"
                    value={form.comprobante}
                    onChange={(e) =>
                      setForm({ ...form, comprobante: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    maxLength={50}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                {editing ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
