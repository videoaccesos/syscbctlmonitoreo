"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, X, DollarSign } from "lucide-react";

interface CuentaGasto {
  id: number;
  clave: string;
  descripcion: string;
}

interface Gasto {
  id: number;
  tipoGastoId: number;
  privadaId: number;
  cuentaGastoId: number;
  tipoDestino: number;
  descripcionGasto: string;
  fechaPago: string;
  comprobante: string | null;
  total: number;
  tipoPago: number;
  estatusId: number;
  tipoGasto?: { id: number; gasto: string };
  privada?: { id: number; descripcion: string };
  cuentaGasto?: { id: number; clave: string; descripcion: string } | null;
}

interface Privada {
  id: number;
  descripcion: string;
}

interface TipoGasto {
  id: number;
  gasto: string;
}

const TIPO_PAGO: Record<number, string> = {
  1: "Efectivo",
  2: "Bancos",
  3: "Caja",
};

// tipoDestino: 0=Privada, 1=General, 2=Operación, 3=Administrativo
const TIPO_DESTINO: Record<number, { label: string; color: string }> = {
  1: { label: "Gastos Generales", color: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  2: { label: "Gastos de Operación", color: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  3: { label: "Gastos Administrativos", color: "bg-purple-50 text-purple-700 ring-purple-600/20" },
};

export default function GastosPage() {
  const [data, setData] = useState<Gasto[]>([]);
  const [privadas, setPrivadas] = useState<Privada[]>([]);
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([]);
  const [cuentasGasto, setCuentasGasto] = useState<CuentaGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filtroDestino, setFiltroDestino] = useState("");
  const [filtroCuenta, setFiltroCuenta] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Gasto | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    tipoGastoId: "",
    destino: "",       // "p:<privadaId>" or "t:<tipoDestino>"
    cuentaGastoId: "",
    descripcionGasto: "",
    fechaPago: new Date().toISOString().split("T")[0],
    comprobante: "",
    total: "",
    tipoPago: "1",
  });

  // Parse destino value into privadaId + tipoDestino
  const parseDestino = (val: string) => {
    if (val.startsWith("t:")) {
      return { privadaId: 0, tipoDestino: parseInt(val.slice(2), 10) };
    }
    if (val.startsWith("p:")) {
      return { privadaId: parseInt(val.slice(2), 10), tipoDestino: 0 };
    }
    return { privadaId: 0, tipoDestino: 0 };
  };

  // Build destino value from gasto data
  const buildDestino = (gasto: Gasto) => {
    if (gasto.tipoDestino > 0) return `t:${gasto.tipoDestino}`;
    if (gasto.privadaId > 0) return `p:${gasto.privadaId}`;
    return "t:1"; // default: general
  };
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (filtroDestino) {
        if (filtroDestino.startsWith("t:")) {
          params.append("tipoDestino", filtroDestino.slice(2));
        } else if (filtroDestino.startsWith("p:")) {
          params.append("privadaId", filtroDestino.slice(2));
        }
      }
      if (filtroCuenta) params.append("cuentaGastoId", filtroCuenta);
      const res = await fetch(`/api/procesos/gastos?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.pagination?.total || 0);
    } catch {
      console.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [page, filtroDestino, filtroCuenta]);

  useEffect(() => {
    // Cargar catálogos
    fetch("/api/catalogos/privadas?pageSize=999&estatusId=1")
      .then((r) => r.json())
      .then((j) => setPrivadas(j.data || []));
    fetch("/api/catalogos/cuentas-gasto?estatus=activos")
      .then((r) => r.json())
      .then((j) => setCuentasGasto(j.data || []));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / limit);
  const sumaTotal = data.reduce((acc, g) => acc + (Number(g.total) || 0), 0);

  const openCreate = () => {
    setEditing(null);
    setForm({
      tipoGastoId: "",
      destino: "",
      cuentaGastoId: "",
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
      destino: buildDestino(gasto),
      cuentaGastoId: gasto.cuentaGastoId ? String(gasto.cuentaGastoId) : "",
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
    if (!form.destino || !form.descripcionGasto || !form.total) {
      setError("Destino, descripción y total son requeridos");
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
          tipoGastoId: form.tipoGastoId ? parseInt(form.tipoGastoId) : 1,
          ...parseDestino(form.destino),
          cuentaGastoId: form.cuentaGastoId ? parseInt(form.cuentaGastoId) : 0,
          descripcionGasto: form.descripcionGasto,
          fechaPago: form.fechaPago,
          comprobante: form.comprobante,
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
          <p className="text-gray-700 mt-1">
            Registro de gastos por privada o gastos generales
          </p>
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
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destino
            </label>
            <select
              value={filtroDestino}
              onChange={(e) => {
                setFiltroDestino(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <optgroup label="Gastos corporativos">
                {Object.entries(TIPO_DESTINO).map(([id, d]) => (
                  <option key={`t:${id}`} value={`t:${id}`}>{d.label}</option>
                ))}
              </optgroup>
              <optgroup label="Privadas">
                {privadas.map((p) => (
                  <option key={`p:${p.id}`} value={`p:${p.id}`}>{p.descripcion}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cuenta de Gasto
            </label>
            <select
              value={filtroCuenta}
              onChange={(e) => {
                setFiltroCuenta(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {cuentasGasto.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clave} - {c.descripcion}
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
                Destino
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Cuenta
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Descripcion
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">
                Total
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Pago
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-600">
                  Cargando...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-600">
                  No se encontraron gastos
                </td>
              </tr>
            ) : (
              data.map((gasto) => (
                <tr
                  key={gasto.id}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3">{gasto.fechaPago || "-"}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const td = TIPO_DESTINO[gasto.tipoDestino];
                      if (td) {
                        return (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${td.color}`}>
                            {td.label}
                          </span>
                        );
                      }
                      return gasto.privada?.descripcion || "--";
                    })()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {gasto.cuentaGasto
                      ? `${gasto.cuentaGasto.clave} - ${gasto.cuentaGasto.descripcion}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3">{gasto.descripcionGasto}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    $
                    {Number(gasto.total).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {TIPO_PAGO[gasto.tipoPago] || "--"}
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
                  $
                  {sumaTotal.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">Total: {total} registros</p>
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
                <X className="h-5 w-5 text-gray-600" />
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
                  Destino *
                </label>
                <select
                  value={form.destino}
                  onChange={(e) =>
                    setForm({ ...form, destino: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  <optgroup label="Gastos corporativos">
                    {Object.entries(TIPO_DESTINO).map(([id, d]) => (
                      <option key={`t:${id}`} value={`t:${id}`}>{d.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Privadas">
                    {privadas.map((p) => (
                      <option key={`p:${p.id}`} value={`p:${p.id}`}>{p.descripcion}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuenta de Gasto
                </label>
                <select
                  value={form.cuentaGastoId}
                  onChange={(e) =>
                    setForm({ ...form, cuentaGastoId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Sin cuenta asignada</option>
                  {cuentasGasto.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clave} - {c.descripcion}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripcion *
                </label>
                <input
                  type="text"
                  value={form.descripcionGasto}
                  onChange={(e) =>
                    setForm({ ...form, descripcionGasto: e.target.value })
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
                    type="text"
                    value={form.fechaPago}
                    onChange={(e) =>
                      setForm({ ...form, fechaPago: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="dd/mm/yyyy"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Pago
                  </label>
                  <select
                    value={form.tipoPago}
                    onChange={(e) =>
                      setForm({ ...form, tipoPago: e.target.value })
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
